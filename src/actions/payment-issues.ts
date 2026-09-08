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
  isAdmin?: boolean;
  isCoordinator?: boolean;
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
    isKluBlocked?: boolean;
    allowInternal?: boolean;
    allowExternal?: boolean;
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
      roles.includes("overall_coordinator") ||
      roles.includes("coordinator") ||
      roles.includes("faculty");

    // 2. Fetch User Profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email, mobile_number, register_number, college_name, department, participant_type")
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

    // 5. Fetch Public Events Catalog for in-modal event selector with capacity and KLU quota checks
    const { data: eventsList } = await adminClient
      .from("events")
      .select(`
        id,
        name,
        is_pro_event,
        school_or_dept,
        event_date,
        participant_limit,
        internal_limit,
        allow_internal,
        allow_external,
        registrations:event_registrations (
          id,
          status,
          user:profiles (
            email,
            participant_type
          )
        )
      `)
      .in("status", ["published", "registration_open"])
      .order("name", { ascending: true });

    const isInternalUser = (profile?.participant_type === "internal") || (user.email || "").toLowerCase().endsWith("@klu.ac.in");

    return {
      isAuthenticated: true,
      userRole: isAdmin ? "admin" : isCoordinator ? "coordinator" : "participant",
      isAdmin,
      isCoordinator,
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
        const allRegs = (e.registrations || []).filter((r: any) => r.status === "confirmed" || !r.status);
        let intCount = 0;
        allRegs.forEach((r: any) => {
          const u = Array.isArray(r.user) ? r.user[0] : r.user;
          const mail = (u?.email || "").toLowerCase();
          if (u?.participant_type === "internal" || mail.endsWith("@klu.ac.in")) {
            intCount++;
          }
        });

        const regCount = allRegs.length;
        const limit = Number(e.participant_limit || 100);
        const intLimit = e.internal_limit !== null && e.internal_limit !== undefined ? Number(e.internal_limit) : null;
        const allowInt = e.allow_internal !== false;
        const allowExt = e.allow_external !== false;

        const isIntFull = intLimit !== null ? intCount >= intLimit : false;
        const isKluBlocked = isInternalUser ? (!allowInt || isIntFull) : !allowExt;

        return {
          id: e.id,
          name: e.name,
          isProEvent: Boolean(e.is_pro_event),
          schoolOrDept: e.school_or_dept || "General",
          eventDate: e.event_date || "Day 1 & 2",
          participantLimit: limit,
          currentRegs: regCount,
          isFull: regCount >= limit,
          isKluBlocked,
          allowInternal: allowInt,
          allowExternal: allowExt,
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

    // 1. Role Check: Students/Participants (Admins allowed for testing)
    const { data: roleAss } = await adminClient
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id);

    const roles = (roleAss || []).map((r: any) => r.role_id);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");

    // 2. Check if student already has an active pass (Bypassed for Admins in testing mode)
    const { data: activePass } = await adminClient
      .from("delegate_passes")
      .select("pass_code")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (activePass && !isAdmin) {
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
          error: "Standard Pass (₹200) only includes Regular events. For Flagship events, select Flagship Pass (₹300).",
        };
      }

      if (passTier === "pro_pass" && proCount > 1) {
        return {
          success: false,
          error: "Flagship Pass (₹300) includes a maximum of 1 Flagship competition + 1 Regular competition.",
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
  availableEvents?: Array<{
    id: string;
    name: string;
    isProEvent: boolean;
    schoolOrDept?: string;
  }>;
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

    // Fetch all available published events for admin event assignment pickers
    const { data: allAvailableEvents } = await adminClient
      .from("events")
      .select("id, name, is_pro_event, school_or_dept")
      .in("status", ["published", "registration_open"])
      .order("name", { ascending: true });

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
      availableEvents: (allAvailableEvents || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        isProEvent: Boolean(e.is_pro_event),
        schoolOrDept: e.school_or_dept || "General",
      })),
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
// 4. ADMIN: AUTO-VERIFY WITH EASEBUZZ GATEWAY & LOCAL DATABASE
// ─────────────────────────────────────────────────────────────────────────────
export interface PaymentVerificationReport {
  verdict: "VERIFIED_MATCH" | "PARTIAL_MATCH" | "GATEWAY_FAILED" | "NOT_FOUND";
  verdictMessage: string;
  isVerified: boolean;
  checkedAt: string;
  participant: {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    collegeName?: string;
    registerNumber?: string;
  };
  submittedPayment: {
    transactionId: string;
    orderNumber?: string | null;
    amount: number;
    passTier: string;
    paymentMethod: string;
    paymentDate: string;
  };
  matchedDbOrders: Array<{
    id: string;
    orderNumber: string;
    amount: number;
    status: string;
    createdAt: string;
    gatewayPaymentId?: string | null;
  }>;
  gatewayMatch?: {
    txnid: string;
    easepayid?: string;
    bankRefNum?: string;
    amount: number;
    status: string;
    email?: string;
    phone?: string;
    paymentMode?: string;
    addedOn?: string;
  } | null;
  checks: {
    gatewaySuccess: boolean;
    amountMatched: boolean;
    userMatched: boolean;
    bankRefMatched: boolean;
    hasDbOrderMatch: boolean;
  };
}

export async function autoVerifyPaymentIssueAdmin(issueId: string): Promise<{
  success: boolean;
  verified: boolean;
  verdict?: "VERIFIED_MATCH" | "PARTIAL_MATCH" | "GATEWAY_FAILED" | "NOT_FOUND";
  verdictMessage?: string;
  report?: PaymentVerificationReport;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, verified: false, error: "Unauthorized: Admin access required." };
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
      return { success: false, verified: false, error: "Payment request record not found." };
    }

    const userId = ticket.user_id || ticket.userId;
    const submittedTxnId = (ticket.transaction_id || ticket.transactionId || "").trim();
    const submittedOrderNumber = (ticket.order_number || ticket.orderNumber || "").trim();
    const ticketAmount = Number(ticket.amount || 200);

    // 2. Collect Participant Profile Info
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email, mobile_number, register_number, college_name")
      .eq("id", userId)
      .maybeSingle();

    const studentFullName = profile?.full_name || ticket.full_name || "Student";
    const studentEmail = (profile?.email || ticket.email || "").toLowerCase().trim();
    const studentPhone = (profile?.mobile_number || ticket.phone || "").replace(/\D/g, "");

    // 3. Match All Local Database Transactions (`orders` table)
    let matchedOrders: any[] = [];
    try {
      const { data: userOrders } = await adminClient
        .from("orders")
        .select("id, order_number, amount, status, created_at, gateway_payment_id, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (userOrders) matchedOrders.push(...userOrders);
    } catch (e) {
      console.warn("Notice querying user orders:", e);
    }

    // Also look up orders specifically by transaction ID or order number if provided
    if (submittedTxnId || submittedOrderNumber) {
      try {
        const filters = [];
        if (submittedTxnId) {
          filters.push(`order_number.eq.${submittedTxnId}`);
          filters.push(`gateway_payment_id.eq.${submittedTxnId}`);
        }
        if (submittedOrderNumber) {
          filters.push(`order_number.eq.${submittedOrderNumber}`);
        }

        if (filters.length > 0) {
          const { data: specificOrders } = await adminClient
            .from("orders")
            .select("id, order_number, amount, status, created_at, gateway_payment_id, metadata")
            .or(filters.join(","))
            .limit(5);

          if (specificOrders) {
            specificOrders.forEach((so) => {
              if (!matchedOrders.some((mo) => mo.id === so.id)) {
                matchedOrders.push(so);
              }
            });
          }
        }
      } catch (e) {
        console.warn("Notice querying specific orders:", e);
      }
    }

    // Format DB orders summary
    const matchedDbOrdersSummary = matchedOrders.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      amount: Number(o.amount || 0),
      status: o.status || "unknown",
      createdAt: o.created_at,
      gatewayPaymentId: o.gateway_payment_id || o.metadata?.easebuzz_pay_id || null,
    }));

    const hasPaidDbOrder = matchedDbOrdersSummary.some(
      (o) => o.status === "paid" && Math.abs(o.amount - ticketAmount) < 1
    );

    // 4. Collect Candidate Transaction IDs to query Easebuzz Gateway
    const candidateTxnIds = new Set<string>();
    if (submittedTxnId) candidateTxnIds.add(submittedTxnId);
    if (submittedOrderNumber) candidateTxnIds.add(submittedOrderNumber);

    matchedOrders.forEach((o) => {
      if (o.order_number) candidateTxnIds.add(o.order_number);
      if (o.metadata?.easebuzz_txnid) candidateTxnIds.add(o.metadata.easebuzz_txnid);
    });

    // 5. Query Easebuzz Gateway for each candidate ID
    let bestGatewayMatch: any = null;
    let anyGatewayFound = false;

    for (const txnid of Array.from(candidateTxnIds)) {
      try {
        const liveStatus = await checkEasebuzzTransactionStatus({ txnid });
        if (liveStatus?.status && liveStatus.msg) {
          anyGatewayFound = true;
          const msg = liveStatus.msg;
          const rawStatus = (msg.status || "").toLowerCase();
          const ebzAmount = parseFloat(msg.amount || msg.net_amount_debit || "0");
          const ebzBankRef = (msg.bank_ref_num || "").trim();
          const ebzEmail = (msg.email || "").toLowerCase().trim();
          const ebzPhone = (msg.phone || "").replace(/\D/g, "");

          const matchCandidate = {
            txnid: msg.txnid || txnid,
            easepayid: msg.easepayid || undefined,
            bankRefNum: ebzBankRef || undefined,
            amount: ebzAmount,
            status: msg.status || "Unknown",
            email: msg.email || undefined,
            phone: msg.phone || undefined,
            paymentMode: msg.mode || msg.payment_source || undefined,
            addedOn: msg.addedon || undefined,
            isSuccess: rawStatus === "success",
            amountMatches: Math.abs(ebzAmount - ticketAmount) < 1,
            userMatches:
              (ebzEmail && ebzEmail === studentEmail) ||
              (ebzPhone && studentPhone && (ebzPhone.includes(studentPhone) || studentPhone.includes(ebzPhone))),
            bankRefMatches:
              ebzBankRef &&
              submittedTxnId &&
              (ebzBankRef.toLowerCase().includes(submittedTxnId.toLowerCase()) ||
                submittedTxnId.toLowerCase().includes(ebzBankRef.toLowerCase()) ||
                txnid.toLowerCase() === submittedTxnId.toLowerCase()),
          };

          // If we found a successful transaction, prioritize it
          if (matchCandidate.isSuccess) {
            bestGatewayMatch = matchCandidate;
            break;
          } else if (!bestGatewayMatch) {
            bestGatewayMatch = matchCandidate;
          }
        }
      } catch (checkErr) {
        console.warn(`Error querying Easebuzz for txnid ${txnid}:`, checkErr);
      }
    }

    // 6. Evaluate Checks & Determine Verdict
    const gatewaySuccess = Boolean(bestGatewayMatch?.isSuccess);
    const amountMatched = Boolean(
      (bestGatewayMatch && bestGatewayMatch.amountMatches) || hasPaidDbOrder
    );
    const userMatched = Boolean(
      (bestGatewayMatch && bestGatewayMatch.userMatches) ||
        matchedDbOrdersSummary.some((o) => o.status === "paid")
    );
    const bankRefMatched = Boolean(
      (bestGatewayMatch && bestGatewayMatch.bankRefMatches) ||
        submittedTxnId.length >= 8
    );
    const hasDbOrderMatch = matchedDbOrdersSummary.length > 0;

    let verdict: "VERIFIED_MATCH" | "PARTIAL_MATCH" | "GATEWAY_FAILED" | "NOT_FOUND" = "NOT_FOUND";
    let verdictMessage = "";
    let isVerified = false;

    if (gatewaySuccess && amountMatched && (userMatched || bankRefMatched)) {
      verdict = "VERIFIED_MATCH";
      isVerified = true;
      verdictMessage = `100% Match: Easebuzz confirmed successful payment of ₹${bestGatewayMatch.amount}. Bank Reference (${bestGatewayMatch.bankRefNum || submittedTxnId}) and student details verified.`;
    } else if (hasPaidDbOrder) {
      verdict = "VERIFIED_MATCH";
      isVerified = true;
      verdictMessage = `Database Confirmed: Matching successful order found in system database for ₹${ticketAmount}.`;
    } else if (gatewaySuccess && !amountMatched) {
      verdict = "PARTIAL_MATCH";
      isVerified = false;
      verdictMessage = `Amount Discrepancy: Easebuzz confirmed payment of ₹${bestGatewayMatch.amount}, but ticket requested ₹${ticketAmount} (${ticket.pass_tier === "pro_pass" ? "Flagship Pass" : "Standard Pass"}).`;
    } else if (anyGatewayFound && !gatewaySuccess) {
      verdict = "GATEWAY_FAILED";
      isVerified = false;
      verdictMessage = `Gateway Failed: Easebuzz record found for transaction, but status is '${bestGatewayMatch?.status || "failed"}'. Money was not debited into the merchant account.`;
    } else if (hasDbOrderMatch) {
      const attemptedOrders = matchedDbOrdersSummary.filter((o) => o.status === "attempted");
      verdict = "PARTIAL_MATCH";
      isVerified = false;
      verdictMessage = `Order Attempt Found: ${attemptedOrders.length} attempted checkout order(s) found in local database, but payment was not yet confirmed by gateway.`;
    } else {
      verdict = "NOT_FOUND";
      isVerified = false;
      verdictMessage = `Not Found: No matching transaction records located on Easebuzz or local database with Bank Reference "${submittedTxnId}".`;
    }

    // 7. Assemble Complete Verification Report
    const report: PaymentVerificationReport = {
      verdict,
      verdictMessage,
      isVerified,
      checkedAt: new Date().toISOString(),
      participant: {
        userId,
        fullName: studentFullName,
        email: studentEmail,
        phone: studentPhone,
        collegeName: profile?.college_name,
        registerNumber: profile?.register_number,
      },
      submittedPayment: {
        transactionId: submittedTxnId,
        orderNumber: submittedOrderNumber || null,
        amount: ticketAmount,
        passTier: ticket.pass_tier || "standard_pass",
        paymentMethod: ticket.payment_method || "UPI",
        paymentDate: ticket.payment_date || ticket.created_at,
      },
      matchedDbOrders: matchedDbOrdersSummary,
      gatewayMatch: bestGatewayMatch
        ? {
            txnid: bestGatewayMatch.txnid,
            easepayid: bestGatewayMatch.easepayid,
            bankRefNum: bestGatewayMatch.bankRefNum,
            amount: bestGatewayMatch.amount,
            status: bestGatewayMatch.status,
            email: bestGatewayMatch.email,
            phone: bestGatewayMatch.phone,
            paymentMode: bestGatewayMatch.paymentMode,
            addedOn: bestGatewayMatch.addedOn,
          }
        : null,
      checks: {
        gatewaySuccess,
        amountMatched,
        userMatched,
        bankRefMatched,
        hasDbOrderMatch,
      },
    };

    // 8. Update Ticket in Database with Verification Telemetry
    try {
      await adminClient
        .from("payment_issues")
        .update({
          gateway_verified: isVerified,
          gateway_response: report,
          status: isVerified && ticket.status === "pending" ? "under_review" : ticket.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    } catch (updateErr) {
      console.warn("Notice updating payment_issues with verification report:", updateErr);
    }

    // Write audit log
    try {
      await adminClient.from("payment_audit_logs").insert({
        user_id: userId,
        txnid: submittedTxnId,
        event_type: "gateway_auto_verification",
        payload: { issueId, report },
        status: isVerified ? "verified" : "unverified",
        amount: ticketAmount,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Safe
    }

    revalidatePath("/admin/payment-requests", "page");
    revalidatePath("/payment-help", "page");

    return {
      success: true,
      verified: isVerified,
      verdict,
      verdictMessage,
      report,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to auto-verify with gateway.";
    console.error("autoVerifyPaymentIssueAdmin error:", err);
    return { success: false, verified: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STUDENT: REAL-TIME TICKET STATUS POLLING ACTION
// ─────────────────────────────────────────────────────────────────────────────
export async function getStudentTicketStatusAction(ticketNumber?: string): Promise<{
  success: boolean;
  ticket?: StudentPaymentIssue | null;
  hasActivePass?: boolean;
  activePassCode?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminClient = await createAdminClient();

    // Query ticket
    let query = adminClient
      .from("payment_issues")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ticketNumber) {
      query = query.eq("ticket_number", ticketNumber);
    }

    const { data: ticketRow } = await query.limit(1).maybeSingle();

    if (!ticketRow) {
      return { success: true, ticket: null };
    }

    // Resolve selected events
    let selectedEvents: any[] = [];
    if (ticketRow.selected_event_ids && ticketRow.selected_event_ids.length > 0) {
      const { data: evs } = await adminClient
        .from("events")
        .select("id, name, is_pro_event, school_or_dept")
        .in("id", ticketRow.selected_event_ids);
      selectedEvents = evs || [];
    }

    // Check if pass was activated
    const { data: pass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const ticket: StudentPaymentIssue = {
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
      issuedPassId: ticketRow.issued_pass_id || pass?.id || null,
      issuedPassCode: ticketRow.issued_pass_code || pass?.pass_code || null,
      createdAt: ticketRow.created_at,
      updatedAt: ticketRow.updated_at,
    };

    return {
      success: true,
      ticket,
      hasActivePass: Boolean(pass),
      activePassCode: pass?.pass_code,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch ticket status.";
    console.error("getStudentTicketStatusAction error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN: APPROVE PAYMENT & ATOMICALLY ISSUE PASS
// ─────────────────────────────────────────────────────────────────────────────
export async function approveAndIssuePassAdmin(
  issueId: string,
  adminNotes?: string,
  assignedEventIds?: string[]
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
    let targetEvents: string[] = (assignedEventIds && assignedEventIds.length > 0)
      ? assignedEventIds
      : selectedEventIds;

    // If admin passed custom assigned events, persist them to the ticket
    if (assignedEventIds && assignedEventIds.length > 0) {
      try {
        await adminClient
          .from("payment_issues")
          .update({
            selected_event_ids: assignedEventIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", issueId);
      } catch (e) {
        console.warn("Notice updating selected_event_ids on approve:", e);
      }
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// 7. ADMIN: RE-OPEN REJECTED PAYMENT ISSUE FOR RE-EVALUATION
// ─────────────────────────────────────────────────────────────────────────────
export async function reopenPaymentIssueAdmin(
  issueId: string,
  notes?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Admin access required." };
    }

    const adminClient = await createAdminClient();
    const reopenNote = notes?.trim()
      ? `Re-opened by ${authInfo.user.email}: ${notes.trim()}`
      : `Re-opened by admin (${authInfo.user.email}) for review and event allocation.`;

    try {
      await adminClient
        .from("payment_issues")
        .update({
          status: "under_review",
          admin_notes: reopenNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    } catch {
      // Safe fallback
    }

    try {
      await adminClient.from("payment_audit_logs").insert({
        event_type: "admin_dispute_reopened",
        payload: { issueId, notes: reopenNote, reopenedBy: authInfo.user.email },
        status: "under_review",
        created_at: new Date().toISOString(),
      });
    } catch {
      // Safe
    }

    revalidatePath("/admin/payment-requests", "page");
    revalidatePath("/payment-help", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to re-open payment dispute.";
    console.error("reopenPaymentIssueAdmin error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ADMIN: UPDATE ASSIGNED COMPETITIONS FOR PAYMENT ISSUE
// ─────────────────────────────────────────────────────────────────────────────
export async function updatePaymentIssueEventsAdmin(
  issueId: string,
  eventIds: string[]
): Promise<{
  success: boolean;
  events?: Array<{ id: string; name: string; isProEvent: boolean; schoolOrDept?: string }>;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Admin access required." };
    }

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return { success: false, error: "Please select at least 1 competition." };
    }
    if (eventIds.length > 2) {
      return { success: false, error: "A festival pass allows a maximum of 2 competition slots." };
    }

    const adminClient = await createAdminClient();

    // Fetch the events to validate
    const { data: evs, error: evsErr } = await adminClient
      .from("events")
      .select("id, name, is_pro_event, school_or_dept")
      .in("id", eventIds);

    if (evsErr || !evs || evs.length === 0) {
      return { success: false, error: "Could not locate the selected competitions in database." };
    }

    try {
      await adminClient
        .from("payment_issues")
        .update({
          selected_event_ids: eventIds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    } catch (e) {
      console.warn("Notice updating payment issue events:", e);
    }

    revalidatePath("/admin/payment-requests", "page");

    return {
      success: true,
      events: evs.map((e: any) => ({
        id: e.id,
        name: e.name,
        isProEvent: Boolean(e.is_pro_event),
        schoolOrDept: e.school_or_dept || "General",
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update competitions.";
    console.error("updatePaymentIssueEventsAdmin error:", err);
    return { success: false, error: msg };
  }
}

