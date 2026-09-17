"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCallerAuthInfo } from "@/actions/admin";
import { isProfileComplete } from "@/lib/profile";
import { revalidatePath } from "next/cache";

export interface CashRegistrationRequest {
  id: string;
  requestCode: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  collegeName?: string;
  registerNumber?: string;
  department?: string;
  participantType: "internal" | "external";
  selectedEventIds: string[];
  selectedEvents?: Array<{
    id: string;
    name: string;
    isProEvent: boolean;
    schoolOrDept?: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    venue?: string;
    firstPreferenceOnly?: boolean;
  }>;
  passTier: "standard_pass" | "pro_pass";
  totalAmount: number;
  needsAccommodation: boolean;
  status: "pending" | "approved" | "rejected" | "cancelled";
  rejectionReason?: string | null;
  adminNotes?: string | null;
  issuedPassId?: string | null;
  issuedPassCode?: string | null;
  issuedOrderId?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicEventForCash {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  school_or_dept: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  registration_fee: number;
  participant_limit: number;
  internal_limit?: number | null;
  allow_internal?: boolean;
  allow_external?: boolean;
  first_preference_only?: boolean;
  is_pro_event: boolean;
  status: string;
  total_registered: number;
  internal_registered: number;
  external_registered: number;
  is_total_full: boolean;
  is_internal_full: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET CASH REGISTRATION PAGE DATA (Participant Side)
// ─────────────────────────────────────────────────────────────────────────────
export async function getCashRegistrationPageData(): Promise<{
  success: boolean;
  error?: string;
  redirectUrl?: string;
  profile?: any;
  hasActivePass?: boolean;
  activePass?: {
    id: string;
    passCode: string;
    passTier: string;
    slotsUsed: number;
    totalSlots: number;
  } | null;
  existingRequest?: CashRegistrationRequest | null;
  events?: PublicEventForCash[];
  categories?: Array<{ id: string; name: string; slug: string }>;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "UNAUTHENTICATED",
        redirectUrl: "/login?redirect=/cash-registration",
      };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_profile_completed || !isProfileComplete(profile)) {
      return {
        success: false,
        error: "PROFILE_INCOMPLETE",
        redirectUrl: "/complete-profile?redirect=/cash-registration",
      };
    }

    // 2. Check for active pass
    const { data: activePass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code, pass_tier, slots_used, total_slots")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (activePass) {
      return {
        success: true,
        profile,
        hasActivePass: true,
        activePass: {
          id: activePass.id,
          passCode: activePass.pass_code,
          passTier: activePass.pass_tier,
          slotsUsed: activePass.slots_used,
          totalSlots: activePass.total_slots,
        },
      };
    }

    // 3. Check for existing pending/active cash registration request
    let existingRequest: CashRegistrationRequest | null = null;

    try {
      const { data: reqRow } = await adminClient
        .from("cash_registration_requests")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reqRow) {
        existingRequest = mapCashRequestRow(reqRow);
      }
    } catch {
      // If table not present yet, check payment_audit_logs
      const { data: auditRows } = await adminClient
        .from("payment_audit_logs")
        .select("payload, created_at, status")
        .eq("user_id", user.id)
        .eq("event_type", "cash_registration_request")
        .order("created_at", { ascending: false })
        .limit(1);

      if (auditRows && auditRows.length > 0) {
        const payload = auditRows[0].payload as any;
        if (payload && (payload.status === "pending" || payload.status === "approved")) {
          existingRequest = {
            id: payload.id,
            requestCode: payload.requestCode,
            userId: user.id,
            fullName: payload.fullName,
            email: payload.email,
            phone: payload.phone,
            collegeName: payload.collegeName,
            registerNumber: payload.registerNumber,
            department: payload.department,
            participantType: payload.participantType,
            selectedEventIds: payload.selectedEventIds || [],
            passTier: payload.passTier || "standard_pass",
            totalAmount: Number(payload.totalAmount || 200),
            needsAccommodation: Boolean(payload.needsAccommodation),
            status: payload.status,
            rejectionReason: payload.rejectionReason,
            adminNotes: payload.adminNotes,
            issuedPassId: payload.issuedPassId,
            issuedPassCode: payload.issuedPassCode,
            createdAt: payload.createdAt || auditRows[0].created_at,
          };
        }
      }
    }

    // 4. Fetch published events & categories
    const [eventsRes, catsRes, regsRes] = await Promise.all([
      adminClient
        .from("events")
        .select(`
          id,
          name,
          slug,
          short_description,
          description,
          school_or_dept,
          venue,
          event_date,
          start_time,
          end_time,
          registration_fee,
          participant_limit,
          internal_limit,
          allow_internal,
          allow_external,
          first_preference_only,
          is_pro_event,
          status,
          category:event_categories (
            id,
            name,
            slug
          )
        `)
        .in("status", ["published", "registration_open"])
        .order("name", { ascending: true }),
      adminClient.from("event_categories").select("id, name, slug").order("name"),
      adminClient
        .from("event_registrations")
        .select(`
          event_id,
          status,
          user:profiles (
            email,
            participant_type
          )
        `)
        .eq("status", "confirmed"),
    ]);

    const registrations = regsRes.data || [];
    const isUserInternal = Boolean(
      profile.participant_type === "internal" ||
      profile.email?.toLowerCase().endsWith("@klu.ac.in")
    );

    // Compute live registration stats for each event
    const enrichedEvents: PublicEventForCash[] = (eventsRes.data || []).map((ev: any) => {
      const evRegs = registrations.filter((r: any) => r.event_id === ev.id);
      const totalRegistered = evRegs.length;
      const internalRegistered = evRegs.filter((r: any) => {
        const u = r.user as any;
        return (
          u?.participant_type === "internal" ||
          u?.email?.toLowerCase()?.endsWith("@klu.ac.in")
        );
      }).length;
      const externalRegistered = totalRegistered - internalRegistered;

      const partLimit = Number(ev.participant_limit || 100);
      const intLimit = ev.internal_limit !== null && ev.internal_limit !== undefined
        ? Number(ev.internal_limit)
        : null;

      const isTotalFull = totalRegistered >= partLimit;
      const isInternalFull = intLimit !== null ? internalRegistered >= intLimit : false;

      return {
        id: ev.id,
        name: ev.name,
        slug: ev.slug,
        short_description: ev.short_description || "",
        description: ev.description || "",
        school_or_dept: ev.school_or_dept || "General",
        venue: ev.venue || "Campus",
        event_date: ev.event_date || "2026-09-25",
        start_time: ev.start_time || "09:00:00",
        end_time: ev.end_time || "17:00:00",
        registration_fee: Number(ev.registration_fee || 0),
        participant_limit: partLimit,
        internal_limit: intLimit,
        allow_internal: ev.allow_internal !== false,
        allow_external: ev.allow_external !== false,
        first_preference_only: Boolean(ev.first_preference_only),
        is_pro_event: Boolean(ev.is_pro_event),
        status: ev.status,
        total_registered: totalRegistered,
        internal_registered: internalRegistered,
        external_registered: externalRegistered,
        is_total_full: isTotalFull,
        is_internal_full: isInternalFull,
        category: ev.category || null,
      };
    });

    // If existing request has event IDs, enrich the event details
    if (existingRequest && existingRequest.selectedEventIds.length > 0) {
      existingRequest.selectedEvents = existingRequest.selectedEventIds
        .map((id) => {
          const matched = enrichedEvents.find((e) => e.id === id);
          if (!matched) return null;
          return {
            id: matched.id,
            name: matched.name,
            isProEvent: matched.is_pro_event,
            schoolOrDept: matched.school_or_dept,
            eventDate: matched.event_date,
            startTime: matched.start_time,
            endTime: matched.end_time,
            venue: matched.venue,
            firstPreferenceOnly: matched.first_preference_only,
          };
        })
        .filter(Boolean) as any;
    }

    return {
      success: true,
      profile,
      hasActivePass: false,
      existingRequest,
      events: enrichedEvents,
      categories: catsRes.data || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load cash registration page data.";
    console.error("getCashRegistrationPageData error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUBMIT CASH REGISTRATION REQUEST (Participant Side)
// ─────────────────────────────────────────────────────────────────────────────
export async function submitCashRegistrationRequest(payload: {
  selectedEventIds: string[];
  needsAccommodation?: boolean;
}): Promise<{
  success: boolean;
  requestCode?: string;
  error?: string;
  requestId?: string;
}> {
  try {
    const { selectedEventIds, needsAccommodation = false } = payload;

    if (!selectedEventIds || selectedEventIds.length === 0) {
      return { success: false, error: "Please select at least 1 event for your pass." };
    }

    if (selectedEventIds.length > 2) {
      return { success: false, error: "A festival pass allows a maximum of 2 events." };
    }

    if (selectedEventIds.length === 2 && selectedEventIds[0] === selectedEventIds[1]) {
      return { success: false, error: "Cannot select the same competition twice." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Please log in to submit your cash registration request." };
    }

    const adminClient = await createAdminClient();

    // 1. Check Profile completeness
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_profile_completed || !isProfileComplete(profile)) {
      return { success: false, error: "Please complete your participant profile before submitting." };
    }

    const isUserInternal = Boolean(
      profile.participant_type === "internal" ||
      profile.email?.toLowerCase().endsWith("@klu.ac.in")
    );

    // 2. Check if user already has an active festival pass
    const { data: existingPass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingPass) {
      return {
        success: false,
        error: `You already possess an active Festival Pass (${existingPass.pass_code}).`,
      };
    }

    // 3. Check if user already has a pending cash registration request
    try {
      const { data: pendingReq } = await adminClient
        .from("cash_registration_requests")
        .select("id, request_code")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingReq) {
        return {
          success: false,
          error: `You already have an active pending cash registration request (${pendingReq.request_code}). Please visit the campus cash desk or cancel it to make a new request.`,
        };
      }
    } catch {
      // Table may not exist yet; check audit log
      const { data: auditRow } = await adminClient
        .from("payment_audit_logs")
        .select("payload")
        .eq("user_id", user.id)
        .eq("event_type", "cash_registration_request")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (auditRow && auditRow.payload?.status === "pending") {
        return {
          success: false,
          error: `You already have an active pending cash registration request (${auditRow.payload.requestCode}). Please visit the campus cash desk or cancel it.`,
        };
      }
    }

    // 4. Fetch and validate candidate events in order (Slot 1, Slot 2)
    const { data: eventRecords } = await adminClient
      .from("events")
      .select(`
        id,
        name,
        is_pro_event,
        first_preference_only,
        allow_internal,
        allow_external,
        internal_limit,
        participant_limit,
        status,
        event_date,
        start_time,
        end_time,
        school_or_dept,
        venue
      `)
      .in("id", selectedEventIds);

    if (!eventRecords || eventRecords.length !== selectedEventIds.length) {
      return { success: false, error: "One or more selected competitions were not found." };
    }

    // Keep events in selected order (Slot 1 first, Slot 2 second)
    const slot1Event = eventRecords.find((e) => e.id === selectedEventIds[0])!;
    const slot2Event = selectedEventIds.length > 1
      ? eventRecords.find((e) => e.id === selectedEventIds[1])!
      : null;

    let proCount = 0;

    // Validate Slot 1
    if (slot1Event.status !== "published" && slot1Event.status !== "registration_open") {
      return { success: false, error: `Registrations are closed for "${slot1Event.name}".` };
    }
    if (isUserInternal && !slot1Event.allow_internal) {
      return { success: false, error: `Registrations for "${slot1Event.name}" are closed for Kalasalingam University students.` };
    }
    if (!isUserInternal && !slot1Event.allow_external) {
      return { success: false, error: `"${slot1Event.name}" is not open to external delegates.` };
    }
    if (slot1Event.is_pro_event) {
      proCount++;
    }

    // Validate Slot 2 (if present)
    if (slot2Event) {
      if (slot2Event.status !== "published" && slot2Event.status !== "registration_open") {
        return { success: false, error: `Registrations are closed for "${slot2Event.name}".` };
      }
      if (isUserInternal && !slot2Event.allow_internal) {
        return { success: false, error: `Registrations for "${slot2Event.name}" are closed for Kalasalingam University students.` };
      }
      if (!isUserInternal && !slot2Event.allow_external) {
        return { success: false, error: `"${slot2Event.name}" is not open to external delegates.` };
      }

      // FIRST PREFERENCE ONLY RESTRICTION: Event 2 cannot have first_preference_only
      if (slot2Event.first_preference_only) {
        return {
          success: false,
          error: `"${slot2Event.name}" is restricted to 1st preference only and cannot be selected as Slot 2. Please choose a different event for Slot 2.`,
        };
      }

      // PRO RESTRICTIONS:
      // If Slot 2 is Pro, that's strictly disallowed because Pro MUST be Slot 1
      if (slot2Event.is_pro_event) {
        return {
          success: false,
          error: `Flagship / Pro competitions must be selected as your 1st event choice (Slot 1). Slot 2 can only accept regular competitions.`,
        };
      }
    }

    // Determine Pass Tier & Fee
    const passTier: "standard_pass" | "pro_pass" = proCount > 0 ? "pro_pass" : "standard_pass";
    const totalAmount = proCount > 0 ? 300.00 : 200.00;

    // 5. Generate unique Request Code: CASH-26-XXXXXX
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const requestCode = `CASH-26-${randomHex}`;
    const requestId = crypto.randomUUID();

    const requestPayload = {
      id: requestId,
      request_code: requestCode,
      user_id: user.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.mobile_number || "N/A",
      college_name: profile.college_name || (isUserInternal ? "Kalasalingam Academy of Research and Education" : "External College"),
      register_number: profile.register_number || null,
      department: profile.department || null,
      participant_type: isUserInternal ? "internal" : "external",
      selected_event_ids: selectedEventIds,
      pass_tier: passTier,
      total_amount: totalAmount,
      needs_accommodation: needsAccommodation,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Primary write to cash_registration_requests table
    let tableInserted = false;
    try {
      const { error: insertErr } = await adminClient
        .from("cash_registration_requests")
        .insert(requestPayload);

      if (!insertErr) {
        tableInserted = true;
      } else {
        console.warn("Notice: cash_registration_requests insert error:", insertErr);
      }
    } catch (e) {
      console.warn("Notice: cash_registration_requests table insert caught:", e);
    }

    // Dual-write to payment_audit_logs to guarantee zero data loss
    try {
      await adminClient.from("payment_audit_logs").insert({
        user_id: user.id,
        txnid: requestCode,
        event_type: "cash_registration_request",
        payload: {
          ...requestPayload,
          requestCode,
          userId: user.id,
          fullName: profile.full_name,
          collegeName: profile.college_name,
          registerNumber: profile.register_number,
          department: profile.department,
          participantType: isUserInternal ? "internal" : "external",
          selectedEventIds,
          passTier,
          totalAmount,
          needsAccommodation,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        status: "pending",
        amount: totalAmount,
        created_at: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn("Notice: audit log insert error:", auditErr);
    }

    revalidatePath("/cash-registration");
    revalidatePath("/dashboard");
    revalidatePath("/admin/cash-requests");

    return {
      success: true,
      requestCode,
      requestId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit cash registration request.";
    console.error("submitCashRegistrationRequest error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CANCEL CASH REGISTRATION REQUEST (Participant Side)
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelCashRegistrationRequest(requestId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const adminClient = await createAdminClient();

    // 1. Update cash_registration_requests
    try {
      await adminClient
        .from("cash_registration_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("user_id", user.id)
        .eq("status", "pending");
    } catch {
      // Safe fallback
    }

    // 2. Update audit log if used
    try {
      const { data: auditRow } = await adminClient
        .from("payment_audit_logs")
        .select("id, payload")
        .eq("user_id", user.id)
        .eq("event_type", "cash_registration_request")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (auditRow && auditRow.payload?.status === "pending") {
        await adminClient
          .from("payment_audit_logs")
          .update({
            status: "cancelled",
            payload: {
              ...auditRow.payload,
              status: "cancelled",
              cancelledAt: new Date().toISOString(),
            },
          })
          .eq("id", auditRow.id);
      }
    } catch {
      // Safe
    }

    revalidatePath("/cash-registration");
    revalidatePath("/dashboard");
    revalidatePath("/admin/cash-requests");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel request.";
    console.error("cancelCashRegistrationRequest error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN: GET CASH REGISTRATION REQUESTS & METRICS
// ─────────────────────────────────────────────────────────────────────────────
export async function getCashRequestsAdmin(params?: {
  statusFilter?: string;
  searchQuery?: string;
}): Promise<{
  success: boolean;
  requests: CashRegistrationRequest[];
  metrics: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalCashCollected: number;
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
        error: "Unauthorized: Administrator privileges required.",
        requests: [],
        metrics: { total: 0, pending: 0, approved: 0, rejected: 0, totalCashCollected: 0 },
      };
    }

    const adminClient = await createAdminClient();

    let allRequests: CashRegistrationRequest[] = [];

    // 1. Fetch from cash_registration_requests table
    try {
      const { data: reqRows, error: reqErr } = await adminClient
        .from("cash_registration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!reqErr && reqRows) {
        allRequests = reqRows.map(mapCashRequestRow);
      }
    } catch {
      // Table may not exist yet
    }

    // 2. Fetch from payment_audit_logs for dual-write persistence
    try {
      const { data: auditRows } = await adminClient
        .from("payment_audit_logs")
        .select("id, payload, created_at, status, amount")
        .eq("event_type", "cash_registration_request")
        .order("created_at", { ascending: false });

      if (auditRows && auditRows.length > 0) {
        const existingCodes = new Set(allRequests.map((r) => r.requestCode));

        for (const row of auditRows) {
          const p = row.payload as any;
          if (p && p.requestCode && !existingCodes.has(p.requestCode)) {
            allRequests.push({
              id: p.id || row.id,
              requestCode: p.requestCode,
              userId: p.userId || p.user_id,
              fullName: p.fullName || p.full_name || "Student Participant",
              email: p.email || "",
              phone: p.phone || "N/A",
              collegeName: p.collegeName || p.college_name,
              registerNumber: p.registerNumber || p.register_number,
              department: p.department,
              participantType: p.participantType || p.participant_type || "external",
              selectedEventIds: p.selectedEventIds || p.selected_event_ids || [],
              passTier: p.passTier || p.pass_tier || "standard_pass",
              totalAmount: Number(p.totalAmount || p.total_amount || row.amount || 200),
              needsAccommodation: Boolean(p.needsAccommodation || p.needs_accommodation),
              status: (p.status || row.status || "pending") as any,
              rejectionReason: p.rejectionReason || p.rejection_reason,
              adminNotes: p.adminNotes || p.admin_notes,
              issuedPassId: p.issuedPassId || p.issued_pass_id,
              issuedPassCode: p.issuedPassCode || p.issued_pass_code,
              issuedOrderId: p.issuedOrderId || p.issued_order_id,
              approvedBy: p.approvedBy || p.approved_by,
              approvedAt: p.approvedAt || p.approved_at,
              createdAt: p.createdAt || row.created_at,
            });
            existingCodes.add(p.requestCode);
          }
        }
      }
    } catch {
      // Safe
    }

    // 3. Fetch all events for event title resolution
    const { data: allEvents } = await adminClient
      .from("events")
      .select("id, name, is_pro_event, school_or_dept, event_date, start_time, end_time, venue, first_preference_only")
      .order("name", { ascending: true });

    const eventMap = new Map((allEvents || []).map((e: any) => [e.id, e]));

    // Enrich requests with event details
    const enrichedRequests = allRequests.map((req) => {
      const selectedEvents = req.selectedEventIds
        .map((eid) => {
          const ev = eventMap.get(eid);
          if (!ev) return null;
          return {
            id: ev.id,
            name: ev.name,
            isProEvent: Boolean(ev.is_pro_event),
            schoolOrDept: ev.school_or_dept,
            eventDate: ev.event_date,
            startTime: ev.start_time,
            endTime: ev.end_time,
            venue: ev.venue,
            firstPreferenceOnly: Boolean(ev.first_preference_only),
          };
        })
        .filter(Boolean) as any;

      return {
        ...req,
        selectedEvents,
      };
    });

    // 4. Calculate KPI Metrics
    const total = enrichedRequests.length;
    const pending = enrichedRequests.filter((r) => r.status === "pending").length;
    const approved = enrichedRequests.filter((r) => r.status === "approved").length;
    const rejected = enrichedRequests.filter((r) => r.status === "rejected").length;
    const totalCashCollected = enrichedRequests
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

    // 5. Apply Status Filter
    let filtered = enrichedRequests;
    if (params?.statusFilter && params.statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === params.statusFilter);
    }

    // 6. Apply Search Query Filter
    if (params?.searchQuery) {
      const q = params.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        return (
          r.requestCode.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          (r.registerNumber && r.registerNumber.toLowerCase().includes(q)) ||
          (r.collegeName && r.collegeName.toLowerCase().includes(q)) ||
          (r.department && r.department.toLowerCase().includes(q)) ||
          (r.selectedEvents && r.selectedEvents.some((e: any) => e.name.toLowerCase().includes(q)))
        );
      });
    }

    return {
      success: true,
      requests: filtered,
      metrics: {
        total,
        pending,
        approved,
        rejected,
        totalCashCollected,
      },
      availableEvents: (allEvents || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        isProEvent: Boolean(e.is_pro_event),
        schoolOrDept: e.school_or_dept || "General",
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load cash requests.";
    console.error("getCashRequestsAdmin error:", err);
    return {
      success: false,
      error: msg,
      requests: [],
      metrics: { total: 0, pending: 0, approved: 0, rejected: 0, totalCashCollected: 0 },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN: VERIFY & APPROVE CASH REQUEST (Issues Festival Pass Atomically)
// ─────────────────────────────────────────────────────────────────────────────
export async function approveCashRequestAdmin(
  requestId: string,
  adminNotes?: string
): Promise<{
  success: boolean;
  passCode?: string;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Administrator privileges required." };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch Request
    let request: any = null;
    try {
      const { data } = await adminClient
        .from("cash_registration_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
      request = data;
    } catch {
      // Check audit log
      const { data: auditRow } = await adminClient
        .from("payment_audit_logs")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
      if (auditRow) request = auditRow.payload;
    }

    if (!request) {
      // Try searching audit log by txnid/requestCode
      const { data: auditByCode } = await adminClient
        .from("payment_audit_logs")
        .select("*")
        .eq("txnid", requestId)
        .maybeSingle();
      if (auditByCode) request = auditByCode.payload;
    }

    if (!request) {
      return { success: false, error: "Cash registration request record not found." };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        error: `Request is already ${request.status}. Only pending requests can be approved.`,
      };
    }

    const userId = request.user_id || request.userId;
    const selectedEventIds = request.selected_event_ids || request.selectedEventIds || [];
    const requestCode = request.request_code || request.requestCode;
    const totalAmount = Number(request.total_amount || request.totalAmount || 200);

    // 2. Check if user already acquired a pass in the interim
    const { data: existingPass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingPass) {
      // Mark request approved with existing pass
      await updateCashRequestStatus(adminClient, requestId, requestCode, {
        status: "approved",
        issued_pass_id: existingPass.id,
        issued_pass_code: existingPass.pass_code,
        approved_by: authInfo.user.id,
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes || "User already has an active festival pass.",
      });

      revalidatePath("/cash-registration");
      revalidatePath("/dashboard");
      revalidatePath("/admin/cash-requests");

      return {
        success: true,
        passCode: existingPass.pass_code,
      };
    }

    if (!selectedEventIds || selectedEventIds.length === 0) {
      return {
        success: false,
        error: "Cannot issue pass: No events were selected in this request.",
      };
    }

    // 3. Atomically Checkout Pass via fn_checkout_pass_atomic RPC
    const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: userId,
        p_event_ids: selectedEventIds,
        p_payment_provider: "cash",
        p_order_metadata: {
          cash_request_id: requestId,
          cash_request_code: requestCode,
          amount_paid: totalAmount,
          approved_by_admin: authInfo.user.email,
          admin_notes: adminNotes || null,
          source: "cash_on_hand_counter",
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (checkoutError || !checkoutData?.success) {
      console.error("fn_checkout_pass_atomic cash approval failed:", checkoutError || checkoutData);
      return {
        success: false,
        error: checkoutError?.message || checkoutData?.message || checkoutData?.error || "Pass checkout failed. Check seat capacity or duplicate registration.",
      };
    }

    const passCode = checkoutData.pass_code;
    const passId = checkoutData.pass_id;
    const orderId = checkoutData.order_id;

    // 4. Update Cash Request Status to Approved
    await updateCashRequestStatus(adminClient, requestId, requestCode, {
      status: "approved",
      issued_pass_id: passId,
      issued_pass_code: passCode,
      issued_order_id: orderId,
      approved_by: authInfo.user.id,
      approved_at: new Date().toISOString(),
      admin_notes: adminNotes || `Cash verified & pass issued by ${authInfo.user.email}.`,
    });

    revalidatePath("/cash-registration");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/passes");
    revalidatePath("/admin/cash-requests");
    revalidatePath("/admin/registrations");
    revalidatePath("/admin/payments");

    return {
      success: true,
      passCode,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve cash registration request.";
    console.error("approveCashRequestAdmin error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN: REJECT CASH REGISTRATION REQUEST
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectCashRequestAdmin(
  requestId: string,
  reason: string,
  adminNotes?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Administrator privileges required." };
    }

    const adminClient = await createAdminClient();

    // Update status to rejected
    await updateCashRequestStatus(adminClient, requestId, null, {
      status: "rejected",
      rejection_reason: reason,
      admin_notes: adminNotes || null,
      approved_by: authInfo.user.id,
      approved_at: new Date().toISOString(),
    });

    revalidatePath("/cash-registration");
    revalidatePath("/dashboard");
    revalidatePath("/admin/cash-requests");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reject request.";
    console.error("rejectCashRequestAdmin error:", err);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function mapCashRequestRow(row: any): CashRegistrationRequest {
  return {
    id: row.id,
    requestCode: row.request_code,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    collegeName: row.college_name,
    registerNumber: row.register_number,
    department: row.department,
    participantType: row.participant_type,
    selectedEventIds: row.selected_event_ids || [],
    passTier: row.pass_tier,
    totalAmount: Number(row.total_amount || 200),
    needsAccommodation: Boolean(row.needs_accommodation),
    status: row.status,
    rejectionReason: row.rejection_reason,
    adminNotes: row.admin_notes,
    issuedPassId: row.issued_pass_id,
    issuedPassCode: row.issued_pass_code,
    issuedOrderId: row.issued_order_id,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function updateCashRequestStatus(
  adminClient: any,
  requestId: string,
  requestCode: string | null,
  updateFields: Record<string, any>
) {
  // Update in cash_registration_requests table
  try {
    await adminClient
      .from("cash_registration_requests")
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
  } catch (e) {
    console.warn("Notice: cash_registration_requests update caught:", e);
  }

  // Update in payment_audit_logs
  try {
    let query = adminClient
      .from("payment_audit_logs")
      .select("id, payload")
      .eq("event_type", "cash_registration_request");

    if (requestCode) {
      query = query.eq("txnid", requestCode);
    } else {
      query = query.eq("id", requestId);
    }

    const { data: rows } = await query.limit(1);

    if (rows && rows.length > 0) {
      const row = rows[0];
      await adminClient
        .from("payment_audit_logs")
        .update({
          status: updateFields.status,
          payload: {
            ...row.payload,
            status: updateFields.status,
            issuedPassId: updateFields.issued_pass_id || row.payload?.issuedPassId,
            issuedPassCode: updateFields.issued_pass_code || row.payload?.issuedPassCode,
            issuedOrderId: updateFields.issued_order_id || row.payload?.issuedOrderId,
            rejectionReason: updateFields.rejection_reason || row.payload?.rejectionReason,
            adminNotes: updateFields.admin_notes || row.payload?.adminNotes,
            approvedBy: updateFields.approved_by || row.payload?.approvedBy,
            approvedAt: updateFields.approved_at || row.payload?.approvedAt,
            updatedAt: new Date().toISOString(),
          },
        })
        .eq("id", row.id);
    }
  } catch (auditErr) {
    console.warn("Notice: audit log status update caught:", auditErr);
  }
}
