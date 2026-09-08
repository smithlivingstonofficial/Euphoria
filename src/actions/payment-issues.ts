"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCallerAuthInfo } from "@/actions/admin";
import { checkEasebuzzTransactionStatus } from "@/lib/payments/easebuzz";
import { revalidatePath, revalidateTag } from "next/cache";

export interface StudentPaymentIssue {
  id: string;
  ticketNumber: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  orderNumber?: string | null;
  transactionId: string;
  amount: number;
  passTier: "standard_pass" | "pro_pass";
  selectedEventIds: string[];
  selectedEvents?: Array<{
    id: string;
    name: string;
    isProEvent: boolean;
    schoolOrDept?: string;
  }>;
  paymentMethod: string;
  paymentDate: string;
  issueType: string;
  description: string;
  status: "pending" | "under_review" | "resolved" | "rejected";
  gatewayVerified: boolean;
  gatewayResponse?: Record<string, any>;
  adminNotes?: string | null;
  issuedPassId?: string | null;
  issuedPassCode?: string | null;
  createdAt: string;
  updatedAt?: string;
  userProfile?: {
    collegeName?: string;
    registerNumber?: string;
    department?: string;
    participantType?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET STUDENT PAYMENT ISSUE CONTEXT (For the Landing Page Popup Form)
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserPaymentIssueContext(): Promise<{
  isAuthenticated: boolean;
  userRole?: string;
  isAdminOrCoordinator?: boolean;
  hasActivePass?: boolean;
  activePassCode?: string;
  activePassTier?: string;
  existingRegisteredEvents?: Array<{ id: string; name: string; isProEvent: boolean }>;
  existingTicket?: StudentPaymentIssue | null;
  userProfile?: {
    fullName: string;
    email: string;
    mobileNumber: string;
    registerNumber?: string;
    collegeName?: string;
    department?: string;
  } | null;
  availableEvents?: Array<{
    id: string;
    name: string;
    isProEvent: boolean;
    schoolOrDept: string;
    eventDate: string;
    participantLimit?: number;
    currentRegs?: number;
    isFull?: boolean;
  }>;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isAuthenticated: false };
    }

    let adminClient;
    try {
      adminClient = await createAdminClient();
    } catch {
      adminClient = supabase;
    }

    // 1. Check User Role
    const { data: roleAss } = await adminClient
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id);

    const roles = (roleAss || []).map((r: any) => r.role_id);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    const isCoordinator =
      roles.includes("staff_coordinator") ||
      roles.includes("student_coordinator") ||
      roles.includes("coordinator") ||
      roles.includes("faculty");

    // 2. Fetch User Profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email, mobile_number, register_number, college_name, department")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Check for Active Pass
    const { data: pass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code, pass_tier, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let existingRegisteredEvents: Array<{ id: string; name: string; isProEvent: boolean }> = [];
    if (pass) {
      const { data: regRows } = await adminClient
        .from("event_registrations")
        .select("event:events (id, name, is_pro_event)")
        .eq("user_id", user.id);

      existingRegisteredEvents = (regRows || [])
        .map((r: any) => r.event)
        .filter(Boolean);
    }

    // 4. Check for Existing Submitted Ticket
    let existingTicket: StudentPaymentIssue | null = null;
    try {
      const { data: ticketRow } = await adminClient
        .from("payment_issues")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticketRow) {
        // Resolve event names for selected_event_ids
        let selectedEvents: any[] = [];
        if (ticketRow.selected_event_ids && ticketRow.selected_event_ids.length > 0) {
          const { data: evs } = await adminClient
            .from("events")
            .select("id, name, is_pro_event, school_or_dept")
            .in("id", ticketRow.selected_event_ids);
          selectedEvents = evs || [];
        }

        existingTicket = {
          id: ticketRow.id,
          ticketNumber: ticketRow.ticket_number,
          userId: ticketRow.user_id,
          fullName: ticketRow.full_name,
          email: ticketRow.email,
          phone: ticketRow.phone,
          orderNumber: ticketRow.order_number,
          transactionId: ticketRow.transaction_id,
          amount: Number(ticketRow.amount),
          passTier: ticketRow.pass_tier,
          selectedEventIds: ticketRow.selected_event_ids || [],
          selectedEvents,
          paymentMethod: ticketRow.payment_method,
          paymentDate: ticketRow.payment_date,
          issueType: ticketRow.issue_type,
          description: ticketRow.description,
          status: ticketRow.status,
          gatewayVerified: Boolean(ticketRow.gateway_verified),
          gatewayResponse: ticketRow.gateway_response,
          adminNotes: ticketRow.admin_notes,
          issuedPassId: ticketRow.issued_pass_id,
          issuedPassCode: ticketRow.issued_pass_code,
          createdAt: ticketRow.created_at,
          updatedAt: ticketRow.updated_at,
        };
      }
    } catch {
      // Fallback: check payment_audit_logs if payment_issues table is not yet migrated
      try {
        const { data: logRow } = await adminClient
          .from("payment_audit_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("event_type", "student_payment_dispute")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (logRow && logRow.payload) {
          existingTicket = logRow.payload as StudentPaymentIssue;
        }
      } catch {
        // Safe fallback
      }
    }

    // 5. Fetch Public Events Catalog for in-modal event selector with capacity
    const { data: eventsList } = await adminClient
      .from("events")
      .select("id, name, is_pro_event, school_or_dept, event_date, participant_limit, registrations:event_registrations(id)")
      .eq("status", "published")
      .order("name", { ascending: true });

    return {
      isAuthenticated: true,
      userRole: isAdmin ? "admin" : isCoordinator ? "coordinator" : "participant",
      isAdminOrCoordinator: isAdmin || isCoordinator,
      hasActivePass: Boolean(pass),
      activePassCode: pass?.pass_code,
      activePassTier: pass?.pass_tier,
      existingRegisteredEvents,
      existingTicket,
      userProfile: profile
        ? {
            fullName: profile.full_name,
            email: profile.email,
            mobileNumber: profile.mobile_number || "",
            registerNumber: profile.register_number || "",
            collegeName: profile.college_name || "",
            department: profile.department || "",
          }
        : null,
      availableEvents: (eventsList || []).map((e: any) => {
        const regCount = (e.registrations || []).length;
        const limit = Number(e.participant_limit || 100);
        return {
          id: e.id,
          name: e.name,
          isProEvent: Boolean(e.is_pro_event),
          schoolOrDept: e.school_or_dept || "General",
          eventDate: e.event_date || "Day 1 & 2",
          participantLimit: limit,
          currentRegs: regCount,
          isFull: regCount >= limit,
        };
      }),
    };
  } catch (err) {
    console.error("Error in getUserPaymentIssueContext:", err);
    return { isAuthenticated: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUBMIT PAYMENT ISSUE (Student Only, No Image Uploads)
// ─────────────────────────────────────────────────────────────────────────────
export async function submitPaymentIssue(formData: {
  transactionId: string;
  amount: number;
  passTier: "standard_pass" | "pro_pass";
  selectedEventIds: string[];
  paymentMethod: string;
  paymentDate: string;
  issueType: string;
  description: string;
  orderNumber?: string;
}): Promise<{
  success: boolean;
  ticketNumber?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Please sign in to submit a payment issue." };
    }

    let adminClient;
    try {
      adminClient = await createAdminClient();
    } catch {
      adminClient = supabase;
    }

    // 1. Role Check: Students/Participants Only
    const { data: roleAss } = await adminClient
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id);

    const roles = (roleAss || []).map((r: any) => r.role_id);
    if (roles.includes("admin") || roles.includes("super_admin")) {
      return {
        success: false,
        error: "Admins cannot submit participant payment issues. Please use the Admin Payment Requests panel.",
      };
    }

    // 2. Check if student already has an active pass
    const { data: activePass } = await adminClient
      .from("delegate_passes")
      .select("pass_code")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (activePass) {
      return {
        success: false,
        error: `You already have an active Festival Pass (${activePass.pass_code}). If you need help with events, please contact support.`,
      };
    }

    // 3. Validate Mandatory Text Fields
    const txnId = (formData.transactionId || "").trim();
    if (!txnId || txnId.length < 5) {
      return { success: false, error: "Please enter a valid Transaction ID / Bank UTR Number (min 5 characters)." };
    }

    const amount = Number(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Please enter a valid payment amount (e.g., 200 or 300)." };
    }

    const paymentMethod = (formData.paymentMethod || "").trim();
    if (!paymentMethod) {
      return { success: false, error: "Please select the Payment App or Method used." };
    }

    const paymentDate = (formData.paymentDate || "").trim();
    if (!paymentDate) {
      return { success: false, error: "Please specify the payment date and approximate time." };
    }

    const issueType = (formData.issueType || "").trim();
    if (!issueType) {
      return { success: false, error: "Please select the issue category." };
    }

    const description = (formData.description || "").trim();
    if (!description || description.length < 5) {
      return { success: false, error: "Please enter a detailed description or remarks (min 5 characters)." };
    }

    const passTier = formData.passTier === "pro_pass" ? "pro_pass" : "standard_pass";
    const selectedEventIds = Array.isArray(formData.selectedEventIds) ? formData.selectedEventIds : [];

    // 4. Validate Event Selection Limits
    if (selectedEventIds.length > 0) {
      if (selectedEventIds.length > 2) {
        return { success: false, error: "A festival pass includes a maximum of 2 competition slots." };
      }

      const { data: chosenEvents } = await adminClient
        .from("events")
        .select("id, name, is_pro_event")
        .in("id", selectedEventIds);

      const proCount = (chosenEvents || []).filter((e: any) => e.is_pro_event).length;

      if (passTier === "standard_pass" && proCount > 0) {
        return {
          success: false,
          error: "Standard Pass (₹200) only includes Regular events. For Flagship events, select Pro Pass (₹300).",
        };
      }

      if (passTier === "pro_pass" && proCount > 1) {
        return {
          success: false,
          error: "Pro Pass (₹300) includes a maximum of 1 Flagship competition + 1 Regular competition.",
        };
      }

      // Check slot capacity for all selected events
      for (const eid of selectedEventIds) {
        const { data: evtData } = await adminClient
          .from("events")
          .select("id, name, participant_limit")
          .eq("id", eid)
          .single();

        if (evtData) {
          const limit = Number(evtData.participant_limit || 100);
          const { count: currentRegs } = await adminClient
            .from("event_registrations")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eid)
            .eq("status", "confirmed");

          if ((currentRegs || 0) >= limit) {
            return {
              success: false,
              error: `The competition "${evtData.name}" has reached maximum participant capacity. Please select an available competition.`,
            };
          }
        }
      }
    }

    // 5. Fetch Profile info for snapshot
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email, mobile_number, register_number, college_name, department")
      .eq("id", user.id)
      .maybeSingle();

    const fullName = profile?.full_name || user.user_metadata?.full_name || "Student Participant";
    const email = profile?.email || user.email || "";
    const phone = profile?.mobile_number || "N/A";

    // 6. Generate Unique Ticket Number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `EUPH-PAY-${randomSuffix}`;

    // 7. Insert into payment_issues table
    let insertSuccess = false;
    try {
      const { error: insertErr } = await adminClient.from("payment_issues").insert({
        ticket_number: ticketNumber,
        user_id: user.id,
        full_name: fullName,
        email: email,
        phone: phone,
        order_number: formData.orderNumber || null,
        transaction_id: txnId,
        amount: amount,
        pass_tier: passTier,
        selected_event_ids: selectedEventIds,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        issue_type: issueType,
        description: description,
        status: "pending",
        gateway_verified: false,
        created_at: new Date().toISOString(),
      });

      if (!insertErr) {
        insertSuccess = true;
      } else {
        console.warn("Notice: payment_issues insert error, attempting fail-safe dual-write:", insertErr);
      }
    } catch (e) {
      console.warn("Notice: payment_issues table may not be migrated yet. Using fail-safe audit log:", e);
    }

    // Dual-write / Fail-safe write to payment_audit_logs so no ticket is lost
    const ticketPayload = {
      id: crypto.randomUUID(),
      ticketNumber,
      userId: user.id,
      fullName,
      email,
      phone,
      orderNumber: formData.orderNumber || null,
      transactionId: txnId,
      amount,
      passTier,
      selectedEventIds,
      paymentMethod,
      paymentDate,
      issueType,
      description,
      status: "pending",
      gatewayVerified: false,
      createdAt: new Date().toISOString(),
      userProfile: {
        collegeName: profile?.college_name,
        registerNumber: profile?.register_number,
        department: profile?.department,
      },
    };

    try {
      await adminClient.from("payment_audit_logs").insert({
        user_id: user.id,
        txnid: txnId,
        event_type: "student_payment_dispute",
        payload: ticketPayload,
        status: "pending",
        amount: amount,
        created_at: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn("Audit log notice:", auditErr);
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/payment-requests", "page");

    return {
      success: true,
      ticketNumber,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit payment issue.";
    console.error("submitPaymentIssue error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN: GET PAYMENT ISSUES WITH METRICS & FILTERING
// ─────────────────────────────────────────────────────────────────────────────
export async function getPaymentIssuesAdmin(params?: {
  statusFilter?: string;
  searchQuery?: string;
}): Promise<{
  success: boolean;
  issues: StudentPaymentIssue[];
  metrics: {
    total: number;
    pending: number;
    underReview: number;
    resolved: number;
    rejected: number;
    autoVerified: number;
  };
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return {
        success: false,
        error: "Unauthorized: Admin access required.",
        issues: [],
        metrics: { total: 0, pending: 0, underReview: 0, resolved: 0, rejected: 0, autoVerified: 0 },
      };
    }

    const adminClient = await createAdminClient();

    let rawIssues: any[] = [];
    let isTableQueried = false;

    // Try primary payment_issues table
    try {
      let query = adminClient
        .from("payment_issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (params?.statusFilter && params.statusFilter !== "all") {
        query = query.eq("status", params.statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        rawIssues = data;
        isTableQueried = true;
      }
    } catch {
      // Ignore and fallback to audit logs
    }

    // Fallback if table does not exist or is empty while audit logs exist
    if (!isTableQueried || rawIssues.length === 0) {
      try {
        const { data: auditRows } = await adminClient
          .from("payment_audit_logs")
          .select("*")
          .eq("event_type", "student_payment_dispute")
          .order("created_at", { ascending: false });

        if (auditRows && auditRows.length > 0) {
          rawIssues = auditRows.map((row) => {
            const p = row.payload || {};
            return {
              id: p.id || row.id,
              ticket_number: p.ticketNumber || `EUPH-PAY-${row.id.substring(0, 4)}`,
              user_id: p.userId || row.user_id,
              full_name: p.fullName || "Student",
              email: p.email || "",
              phone: p.phone || "",
              order_number: p.orderNumber,
              transaction_id: p.transactionId || row.txnid,
              amount: p.amount || row.amount || 200,
              pass_tier: p.passTier || "standard_pass",
              selected_event_ids: p.selectedEventIds || [],
              payment_method: p.paymentMethod || "UPI",
              payment_date: p.paymentDate || row.created_at,
              issue_type: p.issueType || "Payment issue",
              description: p.description || "",
              status: p.status || row.status || "pending",
              gateway_verified: Boolean(p.gatewayVerified),
              gateway_response: p.gatewayResponse || {},
              admin_notes: p.adminNotes || null,
              issued_pass_id: p.issuedPassId || null,
              issued_pass_code: p.issuedPassCode || null,
              created_at: p.createdAt || row.created_at,
            };
          });

          if (params?.statusFilter && params.statusFilter !== "all") {
            rawIssues = rawIssues.filter((i) => i.status === params.statusFilter);
          }
        }
      } catch {
        // Safe fallback
      }
    }

    // Fetch related Profiles and Events for enrichment
    const userIds = Array.from(new Set(rawIssues.map((i) => i.user_id).filter(Boolean)));
    const allEventIds = Array.from(
      new Set(rawIssues.flatMap((i) => i.selected_event_ids || []).filter(Boolean))
    );

    const [{ data: profiles }, { data: eventsList }] = await Promise.all([
      userIds.length > 0
        ? adminClient
            .from("profiles")
            .select("id, full_name, email, mobile_number, register_number, college_name, department, participant_type")
            .in("id", userIds)
        : Promise.resolve({ data: [] }),
      allEventIds.length > 0
        ? adminClient
            .from("events")
            .select("id, name, is_pro_event, school_or_dept")
            .in("id", allEventIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

    const eventMap = new Map<string, any>();
    (eventsList || []).forEach((e: any) => eventMap.set(e.id, e));

    const enrichedIssues: StudentPaymentIssue[] = rawIssues.map((row) => {
      const p = profileMap.get(row.user_id);
      const chosenEvents = (row.selected_event_ids || [])
        .map((eid: string) => eventMap.get(eid))
        .filter(Boolean);

      return {
        id: row.id,
        ticketNumber: row.ticket_number || `EUPH-PAY-${row.id.substring(0, 4)}`,
        userId: row.user_id,
        fullName: row.full_name || p?.full_name || "Student Participant",
        email: row.email || p?.email || "",
        phone: row.phone || p?.mobile_number || "N/A",
        orderNumber: row.order_number,
        transactionId: row.transaction_id,
        amount: Number(row.amount || 200),
        passTier: row.pass_tier || "standard_pass",
        selectedEventIds: row.selected_event_ids || [],
        selectedEvents: chosenEvents,
        paymentMethod: row.payment_method || "UPI",
        paymentDate: row.payment_date || row.created_at,
        issueType: row.issue_type || "Payment Issue",
        description: row.description || "",
        status: row.status || "pending",
        gatewayVerified: Boolean(row.gateway_verified),
        gatewayResponse: row.gateway_response || {},
        adminNotes: row.admin_notes || null,
        issuedPassId: row.issued_pass_id || null,
        issuedPassCode: row.issued_pass_code || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userProfile: p
          ? {
              collegeName: p.college_name,
              registerNumber: p.register_number,
              department: p.department,
              participantType: p.participant_type,
            }
          : undefined,
      };
    });

    // Compute Metrics across all issues
    const total = enrichedIssues.length;
    const pending = enrichedIssues.filter((i) => i.status === "pending").length;
    const underReview = enrichedIssues.filter((i) => i.status === "under_review").length;
    const resolved = enrichedIssues.filter((i) => i.status === "resolved").length;
    const rejected = enrichedIssues.filter((i) => i.status === "rejected").length;
    const autoVerified = enrichedIssues.filter((i) => i.gatewayVerified).length;

    // Apply Search Query Filtering
    let filteredIssues = enrichedIssues;
    if (params?.searchQuery) {
      const q = params.searchQuery.toLowerCase().trim();
      filteredIssues = filteredIssues.filter((item) => {
        return (
          item.ticketNumber.toLowerCase().includes(q) ||
          item.fullName.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.transactionId.toLowerCase().includes(q) ||
          (item.orderNumber && item.orderNumber.toLowerCase().includes(q)) ||
          (item.userProfile?.registerNumber && item.userProfile.registerNumber.toLowerCase().includes(q)) ||
          (item.userProfile?.collegeName && item.userProfile.collegeName.toLowerCase().includes(q))
        );
      });
    }

    return {
      success: true,
      issues: filteredIssues,
      metrics: {
        total,
        pending,
        underReview,
        resolved,
        rejected,
        autoVerified,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load payment requests.";
    console.error("getPaymentIssuesAdmin error:", err);
    return {
      success: false,
      error: msg,
      issues: [],
      metrics: { total: 0, pending: 0, underReview: 0, resolved: 0, rejected: 0, autoVerified: 0 },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN: AUTO-VERIFY WITH EASEBUZZ GATEWAY
// ─────────────────────────────────────────────────────────────────────────────
export async function autoVerifyPaymentIssueAdmin(issueId: string): Promise<{
  success: boolean;
  verified: boolean;
  gatewayStatus?: string;
  gatewayData?: any;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, verified: false, error: "Unauthorized: Admin access required." };
    }

    const adminClient = await createAdminClient();

    // Fetch the ticket
    let ticket: any = null;
    try {
      const { data } = await adminClient
        .from("payment_issues")
        .select("*")
        .eq("id", issueId)
        .maybeSingle();
      ticket = data;
    } catch {
      // Fallback: check audit logs
      const { data: auditRow } = await adminClient
        .from("payment_audit_logs")
        .select("*")
        .eq("id", issueId)
        .maybeSingle();
      if (auditRow) ticket = auditRow.payload;
    }

    if (!ticket) {
      return { success: false, verified: false, error: "Payment request record not found." };
    }

    const txnid = (ticket.transaction_id || ticket.transactionId || "").trim();
    if (!txnid) {
      return { success: false, verified: false, error: "Transaction ID is missing on this ticket." };
    }

    // Live Query Easebuzz v2 API
    const liveStatus = await checkEasebuzzTransactionStatus({ txnid });
    let isPaid = false;
    let ebzMsg: any = null;

    if (liveStatus?.status && liveStatus.msg) {
      ebzMsg = liveStatus.msg;
      isPaid = (ebzMsg.status || "").toLowerCase() === "success";
    } else if (ticket.order_number || ticket.orderNumber) {
      // Fallback: try checking with order_number if UTR wasn't the easebuzz txnid
      const orderTxn = ticket.order_number || ticket.orderNumber;
      const secondCheck = await checkEasebuzzTransactionStatus({ txnid: orderTxn });
      if (secondCheck?.status && secondCheck.msg) {
        ebzMsg = secondCheck.msg;
        isPaid = (ebzMsg.status || "").toLowerCase() === "success";
      }
    }

    const gatewayStatus = ebzMsg?.status || liveStatus?.msg || "Not Found on Gateway";

    // Update the record with verification telemetry
    try {
      await adminClient
        .from("payment_issues")
        .update({
          gateway_verified: isPaid,
          gateway_response: ebzMsg || { error: gatewayStatus },
          status: isPaid ? "under_review" : ticket.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    } catch {
      // Fail-safe audit log update
      try {
        await adminClient.from("payment_audit_logs").insert({
          user_id: ticket.user_id || ticket.userId,
          txnid: txnid,
          event_type: "gateway_verification_check",
          payload: { issueId, isPaid, gatewayStatus, ebzMsg },
          status: isPaid ? "verified" : "unverified",
          created_at: new Date().toISOString(),
        });
      } catch {
        // Safe
      }
    }

    revalidatePath("/admin/payment-requests", "page");

    return {
      success: true,
      verified: isPaid,
      gatewayStatus,
      gatewayData: ebzMsg,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to auto-verify with gateway.";
    console.error("autoVerifyPaymentIssueAdmin error:", err);
    return { success: false, verified: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN: APPROVE PAYMENT & ATOMICALLY ISSUE PASS
// ─────────────────────────────────────────────────────────────────────────────
export async function approveAndIssuePassAdmin(
  issueId: string,
  adminNotes?: string
): Promise<{
  success: boolean;
  passCode?: string;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Admin access required." };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch the ticket
    let ticket: any = null;
    try {
      const { data } = await adminClient
        .from("payment_issues")
        .select("*")
        .eq("id", issueId)
        .maybeSingle();
      ticket = data;
    } catch {
      const { data: auditRow } = await adminClient
        .from("payment_audit_logs")
        .select("*")
        .eq("id", issueId)
        .maybeSingle();
      if (auditRow) ticket = auditRow.payload;
    }

    if (!ticket) {
      return { success: false, error: "Payment request record not found." };
    }

    const userId = ticket.user_id || ticket.userId;
    const txnid = ticket.transaction_id || ticket.transactionId || `TXN-ADM-${Date.now()}`;
    const amount = Number(ticket.amount || 200);
    const selectedEventIds = ticket.selected_event_ids || ticket.selectedEventIds || [];

    // 2. Check if user already has an active pass
    const { data: existingPass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingPass) {
      // User already has pass, just mark ticket resolved
      try {
        await adminClient
          .from("payment_issues")
          .update({
            status: "resolved",
            issued_pass_id: existingPass.id,
            issued_pass_code: existingPass.pass_code,
            admin_notes: adminNotes || "User already has active pass.",
            resolved_by: authInfo.user.id,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", issueId);
      } catch {
        // Safe
      }

      revalidatePath("/", "layout");
      revalidatePath("/admin/payment-requests", "page");
      revalidatePath("/dashboard/passes", "page");

      return {
        success: true,
        passCode: existingPass.pass_code,
      };
    }

    // 3. Resolve target events for pass generation
    let targetEvents: string[] = selectedEventIds;
    if (targetEvents.length === 0) {
      // Fallback to two published regular events if none selected
      const { data: defaultEvs } = await adminClient
        .from("events")
        .select("id")
        .eq("is_pro_event", false)
        .eq("status", "published")
        .limit(2);

      if (defaultEvs && defaultEvs.length > 0) {
        targetEvents = defaultEvs.map((e: any) => e.id);
      }
    }

    if (targetEvents.length === 0) {
      return {
        success: false,
        error: "Cannot issue pass: No events could be resolved. Please select 2 events for this student.",
      };
    }

    // 4. Atomically Checkout Pass via fn_checkout_pass_atomic RPC
    const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: userId,
        p_event_ids: targetEvents,
        p_payment_provider: "easebuzz",
        p_order_metadata: {
          easebuzz_txnid: txnid,
          amount_paid: amount,
          source: "admin_dispute_approval",
          approved_by_admin: authInfo.user.email,
          admin_notes: adminNotes || null,
          ticket_number: ticket.ticket_number || ticket.ticketNumber,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (checkoutError || !checkoutData?.success) {
      console.error("fn_checkout_pass_atomic failed:", checkoutError || checkoutData);
      return {
        success: false,
        error: checkoutError?.message || checkoutData?.error || "Pass generation RPC failed.",
      };
    }

    const passCode = checkoutData.pass_code;
    const passId = checkoutData.pass_id;

    // 5. Update Payment Issue Status to Resolved
    try {
      await adminClient
        .from("payment_issues")
        .update({
          status: "resolved",
          issued_pass_id: passId,
          issued_pass_code: passCode,
          admin_notes: adminNotes || `Approved and pass issued by ${authInfo.user.email}.`,
          resolved_by: authInfo.user.id,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    } catch (updateErr) {
      console.warn("Notice: payment_issues update error:", updateErr);
    }

    // Record in payment audit logs
    try {
      await adminClient.from("payment_audit_logs").insert({
        user_id: userId,
        txnid: txnid,
        event_type: "admin_dispute_pass_issued",
        payload: {
          issueId,
          passCode,
          passId,
          adminEmail: authInfo.user.email,
          adminNotes,
          amount,
        },
        status: "resolved",
        amount: amount,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Safe
    }

    revalidateTag("public-events");
    revalidatePath("/", "layout");
    revalidatePath("/admin/payment-requests", "page");
    revalidatePath("/admin/payments", "page");
    revalidatePath("/dashboard/passes", "page");

    return {
      success: true,
      passCode,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve payment and issue pass.";
    console.error("approveAndIssuePassAdmin error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN: REJECT PAYMENT ISSUE WITH REASON
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectPaymentIssueAdmin(
  issueId: string,
  adminNotes: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Admin access required." };
    }

    const notes = (adminNotes || "").trim();
    if (!notes || notes.length < 3) {
      return { success: false, error: "Please enter a reason for rejection (visible to student)." };
    }

    const adminClient = await createAdminClient();

    try {
      await adminClient
        .from("payment_issues")
        .update({
          status: "rejected",
          admin_notes: notes,
          resolved_by: authInfo.user.id,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    } catch {
      // Fail-safe audit log
      try {
        await adminClient.from("payment_audit_logs").insert({
          event_type: "admin_dispute_rejected",
          payload: { issueId, adminNotes: notes, rejectedBy: authInfo.user.email },
          status: "rejected",
          created_at: new Date().toISOString(),
        });
      } catch {
        // Safe
      }
    }

    revalidatePath("/admin/payment-requests", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reject payment issue.";
    console.error("rejectPaymentIssueAdmin error:", err);
    return { success: false, error: msg };
  }
}
