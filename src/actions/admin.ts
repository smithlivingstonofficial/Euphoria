"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { fetchAllSupabasePages } from "@/lib/supabase/paginate";
import {
  checkEasebuzzTransactionStatus,
  resolveEventIds,
  getEasebuzzCredentials,
} from "@/lib/payments/easebuzz";

const SUPER_ADMIN_EMAIL = "smithlivingston2005@gmail.com";

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  overall_coordinator: 2,
  staff_coordinator: 2,
  student_coordinator: 1,
  participant: 0,
};

import { isKluParticipant } from "@/lib/profile";
import { formatSectionLabel } from "@/lib/utils";



export interface CallerAuthInfo {
  user: {
    id: string;
    email?: string;
  };
  roleId: "super_admin" | "admin" | "overall_coordinator" | "staff_coordinator" | "student_coordinator" | "participant";
  roleLevel: number;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isOverallCoordinator: boolean;
  isStaff: boolean;
  isCoordinator: boolean;
}

/**
 * Resolves the authenticated caller's identity and highest hierarchical role
 */
export async function getCallerAuthInfo(): Promise<CallerAuthInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const normalizedEmail = user.email.toLowerCase().trim();
  const isRootSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;

  const adminClient = await createAdminClient();
  const { data: assignments } = await adminClient
    .from("user_role_assignments")
    .select("role_id")
    .eq("user_id", user.id);

  const assignedRoles = new Set((assignments || []).map((a) => a.role_id));

  // Determine highest active role level
  let highestLevel = 0;
  let highestRole: CallerAuthInfo["roleId"] = "participant";

  if (isRootSuperAdmin || assignedRoles.has("super_admin")) {
    highestLevel = 4;
    highestRole = "super_admin";
  } else if (assignedRoles.has("admin")) {
    highestLevel = 3;
    highestRole = "admin";
  } else if (assignedRoles.has("overall_coordinator")) {
    highestLevel = 2;
    highestRole = "overall_coordinator";
  } else if (assignedRoles.has("staff_coordinator")) {
    highestLevel = 2;
    highestRole = "staff_coordinator";
  } else if (assignedRoles.has("student_coordinator")) {
    highestLevel = 1;
    highestRole = "student_coordinator";
  }

  const isOverallCoordinator = assignedRoles.has("overall_coordinator") || highestRole === "overall_coordinator";

  return {
    user: { id: user.id, email: user.email },
    roleId: highestRole,
    roleLevel: highestLevel,
    isSuperAdmin: highestLevel >= 4,
    isAdmin: highestLevel >= 3,
    isOverallCoordinator,
    isStaff: highestLevel >= 2,
    isCoordinator: highestLevel >= 1,
  };
}

/**
 * Public Server Action to fetch current user's role profile for UI layout and badges
 */
export async function getCurrentUserRoleInfo(): Promise<CallerAuthInfo | null> {
  return await getCallerAuthInfo();
}

/**
 * Verifies admin or super_admin session (Level >= 3)
 */
export async function verifyAdminSession() {
  const authInfo = await getCallerAuthInfo();
  if (!authInfo || authInfo.roleLevel < 3) {
    return {
      authorized: false,
      user: null,
      roleLevel: 0,
      isSuperAdmin: false,
      roleId: "participant" as const,
    };
  }

  return {
    authorized: true,
    user: authInfo.user,
    roleLevel: authInfo.roleLevel,
    isSuperAdmin: authInfo.isSuperAdmin,
    roleId: authInfo.roleId,
  };
}

/**
 * Verifies super_admin exclusive session (Level 4: smithlivingston2005@gmail.com)
 */
export async function verifySuperAdminSession() {
  const authInfo = await getCallerAuthInfo();
  if (!authInfo || authInfo.roleLevel < 4) {
    return { authorized: false, user: null };
  }

  return { authorized: true, user: authInfo.user };
}

/**
 * Verifies staff coordinator or above session (Level >= 2)
 */
export async function verifyStaffSession() {
  const authInfo = await getCallerAuthInfo();
  if (!authInfo || authInfo.roleLevel < 2) {
    return { authorized: false, user: null };
  }

  return { authorized: true, user: authInfo.user, roleLevel: authInfo.roleLevel };
}

interface CachedFinancialTelemetry {
  timestamp: number;
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
}

let cachedFinancialTelemetry: CachedFinancialTelemetry | null = null;
const FINANCIAL_CACHE_TTL_MS = 60 * 1000; // 60s in-memory cache to maintain zero extra egress overhead

export async function invalidateFinancialTelemetryCache() {
  cachedFinancialTelemetry = null;
}

export async function getAdminFinancialTelemetry(forceRefresh = false): Promise<{
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
}> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedFinancialTelemetry &&
    now - cachedFinancialTelemetry.timestamp < FINANCIAL_CACHE_TTL_MS
  ) {
    return cachedFinancialTelemetry;
  }

  const adminClient = await createAdminClient();

  const [
    { count: totalOrders },
    { count: paidOrders },
    { count: pendingOrders },
    { count: failedOrders },
    { count: paid200Count },
    { count: paid300Count },
    otherPaidOrdersRes,
  ] = await Promise.all([
    adminClient.from("orders").select("*", { count: "exact", head: true }),
    adminClient.from("orders").select("*", { count: "exact", head: true }).eq("status", "paid"),
    adminClient
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "created", "attempted"]),
    adminClient
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["failed", "cancelled"]),
    adminClient
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "paid")
      .eq("amount", 200),
    adminClient
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "paid")
      .eq("amount", 300),
    adminClient
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .not("amount", "in", "(200,300)"),
  ]);

  let otherRevenue = 0;
  ((otherPaidOrdersRes?.data || []) as Array<{ amount?: number }>).forEach((r) => {
    otherRevenue += Number(r.amount || 0);
  });

  const totalRevenue =
    ((paid200Count || 0) * 200) +
    ((paid300Count || 0) * 300) +
    otherRevenue;

  cachedFinancialTelemetry = {
    timestamp: now,
    totalRevenue,
    totalOrders: totalOrders || 0,
    paidOrders: paidOrders || 0,
    pendingOrders: pendingOrders || 0,
    failedOrders: failedOrders || 0,
  };

  return cachedFinancialTelemetry;
}

// 1. Overview Metrics (30s Vercel Data Cache shield to eliminate Supabase queries per visit)
async function fetchAdminOverviewMetricsRaw() {
  try {
    const adminClient = await createAdminClient();

    // Fetch parallel statistics using exact counts to prevent PostgREST 1000-row truncation
    const [
      { count: totalParticipants },
      { count: internalParticipants },
      { count: totalRegistrations },
      { data: events },
      { count: totalAttendance },
      { data: categories },
      { count: totalPassesCount },
      { count: totalProPassesCount },
      finances,
      { data: eventStats },
    ] = await Promise.all([
      adminClient.from("profiles").select("*", { count: "exact", head: true }),
      adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("participant_type", "internal"),
      adminClient
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed"),
      adminClient.from("events").select("id, name, registration_fee, participant_limit, status, category_id, is_pro_event"),
      adminClient.from("attendance").select("*", { count: "exact", head: true }),
      adminClient.from("event_categories").select("id, name"),
      adminClient
        .from("delegate_passes")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      adminClient
        .from("delegate_passes")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .in("pass_tier", ["pro_pass", "flagship_pass"]),
      getAdminFinancialTelemetry(true),
      adminClient.from("vw_public_events_stats").select("event_id, total_registered, internal_registered"),
    ]);

    const passCount = totalPassesCount || 0;
    const proPassCount = totalProPassesCount || 0;
    const standardPassCount = Math.max(0, passCount - proPassCount);
    const partCount = totalParticipants || 0;
    const internalCount = internalParticipants || 0;
    const externalCount = Math.max(0, partCount - internalCount);

    const proPassRevenue = proPassCount * 300;
    const standardPassRevenue = standardPassCount * 200;

    // Use finances total revenue or fall back to passes revenue
    let totalRevenue = finances.totalRevenue;
    if (totalRevenue === 0) {
      totalRevenue = proPassRevenue + standardPassRevenue;
    }

    // Process top competitions and capacity saturation
    const statsMap = new Map<string, { total: number; internal: number }>();
    (eventStats || []).forEach((s: any) => {
      statsMap.set(s.event_id, {
        total: Number(s.total_registered || 0),
        internal: Number(s.internal_registered || 0),
      });
    });

    const enrichedEvents = (events || []).map((e: any) => {
      const stat = statsMap.get(e.id) || { total: 0, internal: 0 };
      const limit = Number(e.participant_limit || 100);
      const saturationPct = limit > 0 ? Math.min(100, Math.round((stat.total / limit) * 100)) : 0;
      return {
        id: e.id,
        name: e.name,
        categoryId: e.category_id,
        limit,
        registered: stat.total,
        internal: stat.internal,
        external: Math.max(0, stat.total - stat.internal),
        saturationPct,
        isPro: Boolean(e.is_pro_event),
      };
    });

    enrichedEvents.sort((a, b) => b.registered - a.registered);
    const topEvents = enrichedEvents.slice(0, 8);

    // Event category breakdown
    const categoryMap = new Map<string, { id: string; name: string; eventCount: number; registrationCount: number }>();
    (categories || []).forEach((c: any) => {
      categoryMap.set(c.id, { id: c.id, name: c.name, eventCount: 0, registrationCount: 0 });
    });
    enrichedEvents.forEach((e) => {
      if (e.categoryId && categoryMap.has(e.categoryId)) {
        const item = categoryMap.get(e.categoryId)!;
        item.eventCount++;
        item.registrationCount += e.registered;
      }
    });
    const categoryStats = Array.from(categoryMap.values()).filter((c) => c.eventCount > 0);

    const passConversionRate = partCount > 0 ? Math.round((passCount / partCount) * 100) : 0;
    const proPassPct = passCount > 0 ? Math.round((proPassCount / passCount) * 100) : 0;
    const standardPassPct = 100 - proPassPct;

    const internalPct = partCount > 0 ? Math.round((internalCount / partCount) * 100) : 0;
    const externalPct = 100 - internalPct;

    const orderMetrics = {
      totalOrders: finances.totalOrders,
      paidOrders: finances.paidOrders,
      pendingOrders: finances.pendingOrders,
      failedOrders: finances.failedOrders,
      totalRevenue: finances.totalRevenue,
      paidPercentage: finances.totalOrders > 0 ? Math.round((finances.paidOrders / finances.totalOrders) * 100) : 0,
      pendingPercentage: finances.totalOrders > 0 ? Math.round((finances.pendingOrders / finances.totalOrders) * 100) : 0,
      failedPercentage: finances.totalOrders > 0 ? Math.round((finances.failedOrders / finances.totalOrders) * 100) : 0,
    };

    return {
      success: true,
      data: {
        totalParticipants: partCount,
        internalParticipants: internalCount,
        externalParticipants: externalCount,
        internalPercentage: internalPct,
        externalPercentage: externalPct,
        totalRegistrations: totalRegistrations || 0,
        totalPasses: passCount,
        totalProPasses: proPassCount,
        totalStandardPasses: standardPassCount,
        proPassPercentage: proPassPct,
        standardPassPercentage: standardPassPct,
        proPassRevenue,
        standardPassRevenue,
        passConversionRate,
        totalEvents: (events || []).length,
        activeEvents: (events || []).filter((e) => e.status === "registration_open" || e.status === "published").length,
        totalRevenue,
        totalAttendance: totalAttendance || 0,
        categories: categories || [],
        categoryStats,
        topEvents,
        orderMetrics,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch metrics";
    return { success: false, error: msg };
  }
}

const getCachedAdminOverviewMetrics = unstable_cache(
  fetchAdminOverviewMetricsRaw,
  ["admin-overview-metrics-cache-v2"],
  { revalidate: 30, tags: ["admin-metrics"] }
);

export async function getAdminOverviewMetrics(forceRefresh = false) {
  if (forceRefresh) {
    return fetchAdminOverviewMetricsRaw();
  }
  return getCachedAdminOverviewMetrics();
}

// 2. Fetch All Events for Admin (Cached with 60s TTL and pre-aggregated stats to prevent multi-page table scans)
async function fetchAllEventsAdminRaw() {
  try {
    const adminClient = await createAdminClient();

    const [eventsResult, statsResult] = await Promise.all([
      adminClient
        .from("events")
        .select(`
          *,
          category:event_categories (
            id,
            name,
            slug
          )
        `)
        .order("created_at", { ascending: false }),
      adminClient
        .from("vw_public_events_stats")
        .select("event_id, total_registered, internal_registered"),
    ]);

    if (eventsResult.error) throw eventsResult.error;

    const statsMap = new Map<string, { total: number; internal: number }>();
    (statsResult.data || []).forEach((s: any) => {
      statsMap.set(s.event_id, {
        total: Number(s.total_registered || 0),
        internal: Number(s.internal_registered || 0),
      });
    });

    const enrichedEvents = (eventsResult.data || []).map((evt: any) => {
      const stat = statsMap.get(evt.id) || { total: 0, internal: 0 };
      // Provide lightweight registration stubs so that (evt.registrations || []).filter(r => r.status === "confirmed").length evaluates accurately
      const confirmedStubs = Array.from({ length: stat.total }, (_, i) => ({
        id: `reg-${evt.id}-${i}`,
        status: "confirmed",
        payment_status: "paid",
        slot_number: 1,
      }));

      return {
        ...evt,
        total_registered: stat.total,
        internal_registered: stat.internal,
        external_registered: Math.max(0, stat.total - stat.internal),
        registrations: confirmedStubs,
      };
    });

    return { success: true, events: enrichedEvents };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch events";
    return { success: false, error: msg, events: [] };
  }
}

const getCachedAllEventsAdmin = unstable_cache(
  fetchAllEventsAdminRaw,
  ["admin-all-events-cache"],
  { revalidate: 60, tags: ["admin-events", "public-events"] }
);

export async function getAllEventsAdmin() {
  return getCachedAllEventsAdmin();
}

// 3. Create Event
export async function createEventAdmin(formData: {
  categoryId: string;
  name: string;
  shortDescription: string;
  description: string;
  rules: string[] | string;
  schoolOrDept: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  registrationFee: number;
  participantLimit: number;
  minTeamSize?: number;
  maxTeamSize?: number;
  isProEvent?: boolean;
  status: string;
  prizePool?: { first?: number; second?: number; third?: number };
  brochureUrl?: string;
}) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized. Admin privileges required." };

    const adminClient = await createAdminClient();

    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const rulesFormatted = Array.isArray(formData.rules)
      ? formData.rules.join("\n")
      : (formData.rules || "");

    const newEvent: Record<string, unknown> = {
      category_id: formData.categoryId,
      name: formData.name.trim(),
      slug,
      short_description: formData.shortDescription.trim(),
      description: formData.description.trim(),
      rules: rulesFormatted,
      school_or_dept: formData.schoolOrDept.trim(),
      venue: formData.venue.trim(),
      event_date: formData.eventDate,
      start_time: formData.startTime,
      end_time: formData.endTime,
      registration_start: `${formData.eventDate}T00:00:00Z`,
      registration_end: `${formData.eventDate}T23:59:59Z`,
      registration_fee: formData.registrationFee,
      participant_limit: formData.participantLimit,
      is_pro_event: Boolean(formData.isProEvent),
      status: formData.status,
      allow_internal: true,
      allow_external: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (formData.brochureUrl !== undefined) {
      const cleanBrochure = formData.brochureUrl.trim() || null;
      newEvent.brochure_url = cleanBrochure;
      const descStr = String(newEvent.description || "");
      if (cleanBrochure && !descStr.includes("[BROCHURE_URL:")) {
        newEvent.description = descStr.trim() + `\n[BROCHURE_URL: ${cleanBrochure}]`;
      }
    }

    let { data, error } = await adminClient.from("events").insert(newEvent).select().single();

    // Fallback if is_pro_event or brochure_url column doesn't exist on older DB schema
    if (error && (error.message.includes("is_pro_event") || error.message.includes("brochure_url"))) {
      if (error.message.includes("is_pro_event")) delete newEvent.is_pro_event;
      if (error.message.includes("brochure_url")) delete newEvent.brochure_url;
      const retry = await adminClient.from("events").insert(newEvent).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    revalidateTag("public-events");
    revalidatePath("/events", "page");
    revalidatePath("/admin/events", "page");
    revalidatePath("/coordinator", "page");

    return { success: true, event: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create event";
    return { success: false, error: msg };
  }
}

// 4. Update Event
export async function updateEventAdmin(
  eventId: string,
  formData: {
    categoryId?: string;
    name?: string;
    shortDescription?: string;
    description?: string;
    rules?: string[] | string;
    schoolOrDept?: string;
    venue?: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    registrationFee?: number;
    participantLimit?: number;
    minTeamSize?: number;
    maxTeamSize?: number;
    isProEvent?: boolean;
    status?: string;
    brochureUrl?: string;
  }
) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized. Admin privileges required." };

    const adminClient = await createAdminClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.categoryId) updates.category_id = formData.categoryId;
    if (formData.name) {
      updates.name = formData.name.trim();
      updates.slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (formData.shortDescription !== undefined) updates.short_description = formData.shortDescription;
    if (formData.description !== undefined) updates.description = formData.description;
    if (formData.rules !== undefined) {
      updates.rules = Array.isArray(formData.rules)
        ? formData.rules.join("\n")
        : (formData.rules || "");
    }
    if (formData.schoolOrDept !== undefined) updates.school_or_dept = formData.schoolOrDept;
    if (formData.venue !== undefined) updates.venue = formData.venue;
    if (formData.eventDate !== undefined) updates.event_date = formData.eventDate;
    if (formData.startTime !== undefined) updates.start_time = formData.startTime;
    if (formData.endTime !== undefined) updates.end_time = formData.endTime;
    if (formData.registrationFee !== undefined) updates.registration_fee = formData.registrationFee;
    if (formData.participantLimit !== undefined) updates.participant_limit = formData.participantLimit;
    if (formData.isProEvent !== undefined) updates.is_pro_event = Boolean(formData.isProEvent);
    if (formData.status !== undefined) updates.status = formData.status;
    if (formData.brochureUrl !== undefined) {
      const cleanBrochure = formData.brochureUrl.trim() || null;
      updates.brochure_url = cleanBrochure;

      // Keep [BROCHURE_URL: ...] synchronized in description
      let currentDesc = formData.description;
      if (currentDesc === undefined) {
        const { data: existingEvt } = await adminClient
          .from("events")
          .select("description")
          .eq("id", eventId)
          .single();
        currentDesc = existingEvt?.description || "";
      }
      let cleanDesc = (currentDesc || "")
        .replace(/\[(BROCHURE_URL|BROCHURE_LINK):\s*[^\]]+\]/g, "")
        .trim();
      if (cleanBrochure) {
        cleanDesc += `\n[BROCHURE_URL: ${cleanBrochure}]`;
      }
      updates.description = cleanDesc;
    }

    let { data, error } = await adminClient
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    // Fallback if is_pro_event or brochure_url column doesn't exist on older DB schema
    if (error && (error.message.includes("is_pro_event") || error.message.includes("brochure_url"))) {
      if (error.message.includes("is_pro_event")) delete updates.is_pro_event;
      if (error.message.includes("brochure_url")) delete updates.brochure_url;
      const retry = await adminClient
        .from("events")
        .update(updates)
        .eq("id", eventId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    revalidateTag("public-events");
    revalidatePath("/events", "page");
    revalidatePath("/admin/events", "page");
    revalidatePath("/coordinator", "page");
    revalidatePath(`/coordinator/${eventId}`, "page");

    return { success: true, event: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update event";
    return { success: false, error: msg };
  }
}

// 5. Delete Event
export async function deleteEventAdmin(eventId: string) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized. Admin privileges required." };

    const adminClient = await createAdminClient();
    const { error } = await adminClient.from("events").delete().eq("id", eventId);

    if (error) throw error;

    revalidateTag("public-events");
    revalidatePath("/events", "page");
    revalidatePath("/admin/events", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete event";
    return { success: false, error: msg };
  }
}

// 6. Fetch Master Registrations
export async function getAllRegistrationsAdmin(eventId?: string) {
  try {
    const adminClient = await createAdminClient();

    const data = await fetchAllSupabasePages((from, to) => {
      let q = adminClient
        .from("event_registrations")
        .select(`
          id,
          slot_number,
          registration_code,
          status,
          payment_status,
          created_at,
          qr_secret_nonce,
          pass:delegate_passes (
            id,
            pass_code,
            pass_tier,
            amount_paid,
            slots_used,
            status
          ),
          user:profiles (
            id,
            full_name,
            email,
            mobile_number,
            gender,
            participant_type,
            college_name,
            department,
            course,
            year_of_study,
            register_number,
            city,
            needs_accommodation,
            pincode,
            school,
            is_profile_completed
          ),
          event:events (
            id,
            name,
            slug,
            school_or_dept,
            venue,
            event_date,
            start_time,
            end_time,
            is_pro_event,
            registration_fee,
            category:event_categories (
              name
            )
          ),
          attendance (
            id,
            scanned_at,
            scan_method
          )
        `)
        .order("created_at", { ascending: false });

      if (eventId && eventId !== "all") {
        q = q.eq("event_id", eventId);
      }

      return q.range(from, to);
    });

    // Check orders and profiles for accommodation requests
    const userIds = Array.from(new Set((data || []).map((r: any) => r.user?.id).filter(Boolean)));
    const accommodationMap = new Map<string, boolean>();

    if (userIds.length > 0) {
      try {
        const chunkSize = 500;
        for (let i = 0; i < userIds.length; i += chunkSize) {
          const slice = userIds.slice(i, i + chunkSize);
          const { data: userOrders } = await adminClient
            .from("orders")
            .select("user_id, metadata")
            .in("user_id", slice)
            .eq("status", "paid");

          (userOrders || []).forEach((ord: any) => {
            if (ord.metadata?.needs_accommodation === true || ord.metadata?.needs_accommodation === "true") {
              accommodationMap.set(ord.user_id, true);
            }
          });
        }
      } catch (ordErr) {
        console.warn("Accommodation orders fetch notice:", ordErr);
      }
    }

    const enriched = (data || []).map((r: any) => {
      const needsAcc = Boolean(
        r.user?.needs_accommodation ||
        (r.user?.id && accommodationMap.get(r.user.id))
      );
      const isInternal = r.user ? isKluParticipant(r.user) : false;
      const user = r.user
        ? {
            ...r.user,
            participant_type: isInternal ? "internal" : (r.user.participant_type || "external"),
            college_name: isInternal
              ? (r.user.college_name || "Kalasalingam Academy of Research and Education")
              : r.user.college_name,
          }
        : r.user;

      return {
        ...r,
        user,
        needs_accommodation: needsAcc,
      };
    });

    return { success: true, registrations: enriched };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch registrations";
    return { success: false, error: msg, registrations: [] };
  }
}

// 6b. Fetch Lightweight Recent Registrations for Admin Overview (High-Efficiency Limit)
export async function getRecentRegistrationsAdmin(limit = 8) {
  try {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from("event_registrations")
      .select(`
        id,
        registration_code,
        payment_status,
        created_at,
        user:profiles (
          full_name,
          email,
          participant_type,
          college_name
        ),
        event:events (
          name,
          school_or_dept
        ),
        attendance (
          id
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    const enriched = (data || []).map((r: any) => {
      if (!r.user) return r;
      const isInternal = isKluParticipant(r.user);
      return {
        ...r,
        user: {
          ...r.user,
          participant_type: isInternal ? "internal" : (r.user.participant_type || "external"),
          college_name: isInternal
            ? (r.user.college_name || "Kalasalingam Academy of Research and Education")
            : r.user.college_name,
        },
      };
    });
    return { success: true, registrations: enriched };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch recent registrations";
    return { success: false, error: msg, registrations: [] };
  }
}

export interface AdminRegistrationsMetrics {
  totalBookings: number;
  proAllocations: number;
  standardAllocations: number;
  verifiedAttendance: number;
  needsAccommodation: number;
}

export interface AdminRegistrationListItem {
  id: string;
  slot_number?: number;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  qr_secret_nonce?: string;
  needs_accommodation?: boolean;
  pass?: {
    id?: string;
    pass_code?: string;
    pass_tier?: string;
    amount_paid?: number;
    slots_used?: number;
    status?: string;
  } | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    mobile_number?: string;
    gender?: string;
    participant_type: "internal" | "external";
    college_name?: string;
    department?: string;
    course?: string;
    year_of_study?: number;
    register_number?: string;
    city?: string;
    needs_accommodation?: boolean;
    school?: string;
    is_profile_completed?: boolean;
  } | null;
  event?: {
    id: string;
    name: string;
    slug?: string;
    school_or_dept?: string;
    venue?: string;
    event_date?: string;
    start_time?: string;
    end_time?: string;
    is_pro_event?: boolean;
    registration_fee?: number;
    category?: {
      name?: string;
    } | null;
  } | null;
  attendance?: Array<{
    id: string;
    scanned_at: string;
    scan_method: string;
  }> | { id: string; scanned_at: string; scan_method: string } | null;
}

export interface GetAdminRegistrationsParams {
  page?: number;
  limit?: number;
  search?: string;
  eventId?: string;
  tier?: "all" | "pro_pass" | "standard_pass";
  slot?: "all" | "1" | "2";
  type?: "all" | "internal" | "external";
  attendance?: "all" | "attended" | "pending";
  accommodation?: "all" | "requested" | "none";
}

export interface GetAdminRegistrationsResult {
  success: boolean;
  error?: string;
  registrations: AdminRegistrationListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: AdminRegistrationsMetrics;
}

/**
 * 6c. Zero-Egress Cached Registration Metrics using Supabase HTTP HEAD (count: exact, head: true)
 * Cached on Vercel Data Cache for 2 minutes to eliminate Supabase bandwidth.
 */
async function fetchAdminRegistrationsMetricsRaw(): Promise<AdminRegistrationsMetrics> {
  const adminClient = await createAdminClient();
  const [
    { count: totalBookings },
    { count: verifiedAttendance },
    { count: proAllocations },
    { count: needsAccommodation },
  ] = await Promise.all([
    adminClient.from("event_registrations").select("id", { count: "exact", head: true }),
    adminClient.from("attendance").select("id", { count: "exact", head: true }),
    adminClient
      .from("event_registrations")
      .select("id, pass:delegate_passes!inner(id)", { count: "exact", head: true })
      .eq("pass.pass_tier", "pro_pass"),
    adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("needs_accommodation", true),
  ]);

  const total = totalBookings || 0;
  const pro = proAllocations || 0;
  const std = Math.max(0, total - pro);

  return {
    totalBookings: total,
    proAllocations: pro,
    standardAllocations: std,
    verifiedAttendance: verifiedAttendance || 0,
    needsAccommodation: needsAccommodation || 0,
  };
}

export const getAdminRegistrationsMetricsCached = unstable_cache(
  fetchAdminRegistrationsMetricsRaw,
  ["admin-registrations-metrics-cache"],
  { revalidate: 120, tags: ["admin-registrations"] }
);

/**
 * 6d. High-Efficiency Paginated Registrations Query with Vercel Egress Guard
 * Only fetches the requested page (e.g. 50 items) instead of all 10,700+ rows,
 * reducing Supabase bandwidth from ~25MB to ~25KB per query (99.9% reduction).
 */
export async function getAdminRegistrationsPaginatedAction(
  params?: GetAdminRegistrationsParams
): Promise<GetAdminRegistrationsResult> {
  try {
    const adminClient = await createAdminClient();
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(10, params?.limit || 50));
    const search = params?.search?.trim();
    const eventId = params?.eventId || "all";
    const tier = params?.tier || "all";
    const slot = params?.slot || "all";
    const type = params?.type || "all";
    const attendance = params?.attendance || "all";
    const accommodation = params?.accommodation || "all";

    // 1. Fetch zero-egress cached metrics for KPI cards
    const metrics = await getAdminRegistrationsMetricsCached();

    // 2. Build PostgREST query with lean projection
    let query = adminClient
      .from("event_registrations")
      .select(
        `
        id,
        slot_number,
        registration_code,
        status,
        payment_status,
        created_at,
        qr_secret_nonce,
        user_id,
        event_id,
        pass_id,
        pass:delegate_passes${tier !== "all" ? "!inner" : ""} (
          id,
          pass_code,
          pass_tier,
          amount_paid,
          slots_used,
          status
        ),
        user:profiles${type !== "all" || accommodation === "requested" ? "!inner" : ""} (
          id,
          full_name,
          email,
          mobile_number,
          gender,
          participant_type,
          college_name,
          department,
          course,
          year_of_study,
          register_number,
          city,
          needs_accommodation,
          school,
          is_profile_completed
        ),
        event:events (
          id,
          name,
          slug,
          school_or_dept,
          venue,
          event_date,
          start_time,
          end_time,
          is_pro_event,
          registration_fee,
          category:event_categories (
            name
          )
        ),
        attendance${attendance === "attended" ? "!inner" : ""} (
          id,
          scanned_at,
          scan_method
        )
      `,
        { count: "exact" }
      );

    // Filter by Event
    if (eventId !== "all") {
      query = query.eq("event_id", eventId);
    }

    // Filter by Slot Number
    if (slot !== "all") {
      query = query.eq("slot_number", Number(slot));
    }

    // Filter by Pass Tier
    if (tier !== "all") {
      query = query.eq("pass.pass_tier", tier);
    }

    // Filter by Participant Type
    if (type !== "all") {
      query = query.eq("user.participant_type", type);
    }

    // Filter by Accommodation
    if (accommodation === "requested") {
      query = query.eq("user.needs_accommodation", true);
    } else if (accommodation === "none") {
      query = query.eq("user.needs_accommodation", false);
    }

    // Filter by Attendance (Pending)
    if (attendance === "pending") {
      const { data: attendedRows } = await adminClient
        .from("attendance")
        .select("registration_id")
        .limit(1000);
      const attendedIds = Array.from(new Set((attendedRows || []).map((a) => a.registration_id).filter(Boolean)));
      if (attendedIds.length > 0) {
        query = query.not("id", "in", `(${attendedIds.slice(0, 1000).join(",")})`);
      }
    }

    // Multi-dimensional search across registration code, pass code, student name, email, register no, mobile, college, and event
    if (search) {
      const [profRes, passRes, eventRes] = await Promise.all([
        adminClient
          .from("profiles")
          .select("id")
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,register_number.ilike.%${search}%,mobile_number.ilike.%${search}%,college_name.ilike.%${search}%`)
          .limit(100),
        adminClient
          .from("delegate_passes")
          .select("id")
          .ilike("pass_code", `%${search}%`)
          .limit(100),
        adminClient
          .from("events")
          .select("id")
          .ilike("name", `%${search}%`)
          .limit(50),
      ]);

      const userIds = (profRes.data || []).map((p) => p.id);
      const passIds = (passRes.data || []).map((p) => p.id);
      const eventIds = (eventRes.data || []).map((e) => e.id);

      const orConditions = [`registration_code.ilike.%${search}%`];
      if (userIds.length > 0) orConditions.push(`user_id.in.(${userIds.join(",")})`);
      if (passIds.length > 0) orConditions.push(`pass_id.in.(${passIds.join(",")})`);
      if (eventIds.length > 0) orConditions.push(`event_id.in.(${eventIds.join(",")})`);

      query = query.or(orConditions.join(","));
    }

    // Apply Pagination Range and Order
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Accommodation enrichment for ONLY the items on the active page (zero whole-db egress)
    const pageUserIds = Array.from(new Set((data || []).map((r: any) => r.user?.id).filter(Boolean)));
    const accommodationMap = new Map<string, boolean>();
    if (pageUserIds.length > 0) {
      try {
        const { data: userOrders } = await adminClient
          .from("orders")
          .select("user_id, metadata")
          .in("user_id", pageUserIds)
          .eq("status", "paid");
        (userOrders || []).forEach((ord: any) => {
          if (ord.metadata?.needs_accommodation === true || ord.metadata?.needs_accommodation === "true") {
            accommodationMap.set(ord.user_id, true);
          }
        });
      } catch (ordErr) {
        console.warn("Notice: order accommodation check:", ordErr);
      }
    }

    const enriched: AdminRegistrationListItem[] = (data || []).map((r: any) => {
      const user = Array.isArray(r.user) ? r.user[0] : r.user;
      const event = Array.isArray(r.event) ? r.event[0] : r.event;
      const pass = Array.isArray(r.pass) ? r.pass[0] : r.pass;

      const needsAcc = Boolean(
        user?.needs_accommodation ||
        (user?.id && accommodationMap.get(user.id))
      );
      const isInternal = user ? isKluParticipant(user) : false;
      const enrichedUser = user
        ? {
            ...user,
            participant_type: isInternal ? "internal" : (user.participant_type || "external"),
            college_name: isInternal
              ? (user.college_name || "Kalasalingam Academy of Research and Education")
              : user.college_name,
          }
        : user;

      return {
        ...r,
        pass,
        event,
        user: enrichedUser,
        needs_accommodation: needsAcc,
      };
    });

    return {
      success: true,
      registrations: enriched,
      totalCount,
      page,
      limit,
      totalPages,
      metrics,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch registrations";
    return {
      success: false,
      error: msg,
      registrations: [],
      totalCount: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      metrics: {
        totalBookings: 0,
        proAllocations: 0,
        standardAllocations: 0,
        verifiedAttendance: 0,
        needsAccommodation: 0,
      },
    };
  }
}

/**
 * 6e. Cached Page 1 loader with 2-minute TTL on Vercel Data Cache
 * Instantaneous initial load for /admin/registrations with 0 Supabase DB queries.
 */
const fetchRegistrationsPageOneDefaultRaw = async () => {
  return await getAdminRegistrationsPaginatedAction({ page: 1, limit: 50 });
};

export const getAdminRegistrationsPageOneCached = unstable_cache(
  fetchRegistrationsPageOneDefaultRaw,
  ["admin-registrations-page-1-cache"],
  { revalidate: 120, tags: ["admin-registrations"] }
);

/**
 * 6f. Manual cache purge action for registrations
 */
export async function refreshAdminRegistrationsCacheAction() {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };
    revalidateTag("admin-registrations");
    revalidatePath("/admin/registrations", "page");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

/**
 * 6g. On-demand CSV Export action for filtered registrations
 */
export async function exportAdminRegistrationsCsvAction(params?: GetAdminRegistrationsParams) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    const data = await fetchAllSupabasePages((from, to) => {
      let q = adminClient
        .from("event_registrations")
        .select(`
          registration_code,
          slot_number,
          created_at,
          pass:delegate_passes (
            pass_code,
            pass_tier
          ),
          user:profiles (
            full_name,
            email,
            mobile_number,
            gender,
            participant_type,
            register_number,
            college_name,
            department,
            course,
            year_of_study,
            needs_accommodation
          ),
          event:events (
            name,
            venue,
            event_date,
            is_pro_event
          ),
          attendance (
            scanned_at
          )
        `)
        .order("created_at", { ascending: false });

      if (params?.eventId && params.eventId !== "all") {
        q = q.eq("event_id", params.eventId);
      }
      if (params?.slot && params.slot !== "all") {
        q = q.eq("slot_number", Number(params.slot));
      }
      return q.range(from, to);
    });

    const headers = [
      "Sl No",
      "Registration Code",
      "Master Pass Code",
      "Pass Tier",
      "Slot Number",
      "Student Name",
      "Gender",
      "Email",
      "Mobile",
      "Register No",
      "Participant Type",
      "College / Dept",
      "Course & Year",
      "Competition",
      "Is Pro Event",
      "Date & Venue",
      "Accommodation Required",
      "Attendance Status",
      "Scanned At",
      "Registration Date",
    ];

    const rows = (data || []).map((r: any, idx: number) => {
      const user = Array.isArray(r.user) ? r.user[0] : r.user;
      const event = Array.isArray(r.event) ? r.event[0] : r.event;
      const pass = Array.isArray(r.pass) ? r.pass[0] : r.pass;
      const attendance = Array.isArray(r.attendance) ? r.attendance[0] : r.attendance;

      const isAttended = Boolean(attendance?.scanned_at);
      const scannedAt = attendance?.scanned_at;
      const passTier = pass?.pass_tier === "pro_pass" || event?.is_pro_event ? "Pro Pass" : "Standard Pass";
      const isInternal = user ? isKluParticipant(user) : false;
      const college = isInternal ? (user?.college_name || "Kalasalingam Academy") : (user?.college_name || "");

      return [
        idx + 1,
        `"${r.registration_code || ""}"`,
        `"${pass?.pass_code || r.registration_code || ""}"`,
        `"${passTier}"`,
        r.slot_number || 1,
        `"${(user?.full_name || "").replace(/"/g, '""')}"`,
        `"${user?.gender ? user.gender.toUpperCase() : "N/A"}"`,
        `"${user?.email || ""}"`,
        `"${user?.mobile_number || ""}"`,
        `"${user?.register_number || ""}"`,
        `"${isInternal ? "KARE Internal" : "External"}"`,
        `"${college.replace(/"/g, '""')}"`,
        `"${user?.course || ""} Year ${user?.year_of_study || ""}"`,
        `"${(event?.name || "").replace(/"/g, '""')}"`,
        event?.is_pro_event ? "Yes" : "No",
        `"${event?.event_date || ""} - ${event?.venue || ""}"`,
        user?.needs_accommodation ? "Yes (Hostel)" : "No",
        `"${isAttended ? "Present" : "Pending"}"`,
        `"${scannedAt ? new Date(scannedAt).toLocaleString() : ""}"`,
        `"${new Date(r.created_at).toLocaleString()}"`,
      ].join(",");
    });

    const csvString = [headers.join(","), ...rows].join("\n");
    return {
      success: true,
      csvString,
      filename: `euphoria_2026_registrations_${new Date().toISOString().split("T")[0]}.csv`,
    };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

// 7. Manual Attendance Check-In
export async function manualAttendanceCheckIn(registrationId: string) {
  try {
    const { authorized, user } = await verifyAdminSession();
    if (!authorized || !user) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    // Check registration
    const { data: reg, error: regError } = await adminClient
      .from("event_registrations")
      .select("id, event_id")
      .eq("id", registrationId)
      .single();

    if (regError || !reg) return { success: false, error: "Registration record not found" };

    // Insert attendance
    const { error: attError } = await adminClient.from("attendance").insert({
      registration_id: reg.id,
      event_id: reg.event_id,
      scanned_by: user.id,
      scan_method: "manual_search",
      scanned_at: new Date().toISOString(),
    });

    if (attError) {
      if (attError.code === "23505") {
        return { success: false, error: "Participant is already checked in." };
      }
      throw attError;
    }

    revalidateTag("admin-registrations");
    revalidatePath("/admin/registrations", "page");
    revalidatePath("/admin", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Check-in failed";
    return { success: false, error: msg };
  }
}

// 8. Update Payment/Registration Status
export async function updateRegistrationStatus(
  registrationId: string,
  status: "pending" | "confirmed" | "cancelled" | "waitlisted",
  paymentStatus: "not_required" | "pending" | "paid" | "failed" | "refunded"
) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("event_registrations")
      .update({
        status,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);

    if (error) throw error;

    revalidatePath("/admin/registrations", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update status";
    return { success: false, error: msg };
  }
}

// 9. Coordinator Management (Strict Single-Event Scoping with 60s Cache Shield)
async function fetchAllCoordinatorsAdminRaw() {
  try {
    const adminClient = await createAdminClient();

    const [
      { data: staffAssignments },
      { data: studentAssignments },
      { data: userRoles },
      { data: profiles },
      { data: events },
    ] = await Promise.all([
      adminClient.from("staff_event_assignments").select(`
        id,
        event_id,
        user_id,
        created_at,
        user:profiles!staff_event_assignments_user_id_fkey (id, full_name, email, mobile_number, department),
        event:events (id, name, school_or_dept, venue, event_date, start_time, end_time)
      `),
      adminClient.from("student_coordinator_assignments").select(`
        id,
        event_id,
        user_id,
        created_at,
        user:profiles!student_coordinator_assignments_user_id_fkey (id, full_name, email, mobile_number, register_number, department),
        event:events (id, name, school_or_dept, venue, event_date, start_time, end_time)
      `),
      adminClient.from("user_role_assignments").select(`
        id,
        role_id,
        user_id,
        created_at,
        user:profiles!user_role_assignments_user_id_fkey (id, full_name, email, mobile_number, department)
      `),
      adminClient.from("profiles").select("id, full_name, email, mobile_number, department, participant_type").eq("participant_type", "internal"),
      adminClient.from("events").select("id, name, coordinator_names, coordinator_mobiles, coordinator_emails, school_or_dept, venue, event_date, start_time, end_time, status").order("name", { ascending: true }),
    ]);

    const profileMapByEmail = new Map();
    const profileMapById = new Map();
    (profiles || []).forEach((p: any) => {
      if (p.email) profileMapByEmail.set(p.email.toLowerCase().trim(), p);
      if (p.id) profileMapById.set(p.id, p);
    });

    // 1. Strict single-event mapping for Staff Coordinators (keyed by user_id or email)
    const staffMap = new Map<string, any>();
    const assignedStaffUserIds = new Set<string>();

    // Priority A: Explicit DB staff assignments (definitive single-event source)
    (staffAssignments || []).forEach((s: any) => {
      const u = Array.isArray(s.user) ? s.user[0] : s.user;
      const e = Array.isArray(s.event) ? s.event[0] : s.event;
      if (u && e && !staffMap.has(s.user_id)) {
        staffMap.set(s.user_id, {
          id: s.id,
          event_id: s.event_id,
          user_id: s.user_id,
          created_at: s.created_at,
          user: u,
          event: e,
          isDbRecord: true,
          isUnassigned: false,
        });
        assignedStaffUserIds.add(s.user_id);
        if (u.email) assignedStaffUserIds.add(u.email.toLowerCase().trim());
      }
    });

    // Priority B: Event metadata assignments (using dedicated coordinator columns, 0 description egress)
    (events || []).forEach((evt: any) => {
      let emails: string[] = [];
      let names: string[] = [];
      let mobiles: string[] = [];

      if (evt.coordinator_emails) {
        emails = evt.coordinator_emails.split(/,|&|\//).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      }
      if (evt.coordinator_names) {
        names = evt.coordinator_names.split(/,|&|\//).map((s: string) => s.trim()).filter(Boolean);
      }
      if (evt.coordinator_mobiles) {
        mobiles = evt.coordinator_mobiles.split(/,|&|\//).map((s: string) => s.trim()).filter(Boolean);
      }

      if (emails.length > 0) {
        emails.forEach((email: string, idx: number) => {
          const userProf = profileMapByEmail.get(email);
          const userId = userProf ? userProf.id : `email_${email}`;

          // Check if this coordinator is already assigned in Priority A
          if (assignedStaffUserIds.has(userId) || assignedStaffUserIds.has(email) || staffMap.has(userId)) {
            return;
          }

          staffMap.set(userId, {
            id: `sheet_${evt.id}_${email}`,
            event_id: evt.id,
            user_id: userId,
            created_at: new Date().toISOString(),
            user: userProf || {
              id: userId,
              full_name: names[idx] || email.split("@")[0],
              email,
              mobile_number: mobiles[idx] || undefined,
              department: evt.school_or_dept,
            },
            event: {
              id: evt.id,
              name: evt.name,
              school_or_dept: evt.school_or_dept,
              venue: evt.venue,
              event_date: evt.event_date,
              start_time: evt.start_time,
              end_time: evt.end_time,
            },
            isDbRecord: false,
            isSheetRecord: true,
            isUnassigned: false,
          });
          assignedStaffUserIds.add(userId);
          assignedStaffUserIds.add(email);
        });
      }
    });

    // Priority C: Users with role staff_coordinator who have NO event assignment yet.
    // Returned cleanly as Unassigned / Pending Assignment (NEVER "All Competitions"!)
    (userRoles || []).forEach((r: any) => {
      if (r.role_id === "staff_coordinator" && !staffMap.has(r.user_id) && !assignedStaffUserIds.has(r.user_id)) {
        const u = (Array.isArray(r.user) ? r.user[0] : r.user) || profileMapById.get(r.user_id);
        if (u) {
          staffMap.set(r.user_id, {
            id: r.id,
            event_id: null,
            user_id: r.user_id,
            created_at: r.created_at || new Date().toISOString(),
            user: u,
            event: null,
            isDbRecord: true,
            isUnassigned: true,
          });
          assignedStaffUserIds.add(r.user_id);
        }
      }
    });

    // 2. Strict single-event mapping for Student Coordinators (keyed by user_id)
    const studentMap = new Map<string, any>();
    const assignedStudentUserIds = new Set<string>();

    (studentAssignments || []).forEach((s: any) => {
      const u = Array.isArray(s.user) ? s.user[0] : s.user;
      const e = Array.isArray(s.event) ? s.event[0] : s.event;
      if (u && e && !studentMap.has(s.user_id)) {
        studentMap.set(s.user_id, {
          id: s.id,
          event_id: s.event_id,
          user_id: s.user_id,
          created_at: s.created_at,
          user: u,
          event: e,
          isDbRecord: true,
          isUnassigned: false,
        });
        assignedStudentUserIds.add(s.user_id);
      }
    });

    (userRoles || []).forEach((r: any) => {
      if (r.role_id === "student_coordinator" && !studentMap.has(r.user_id) && !assignedStudentUserIds.has(r.user_id)) {
        const u = (Array.isArray(r.user) ? r.user[0] : r.user) || profileMapById.get(r.user_id);
        if (u) {
          studentMap.set(r.user_id, {
            id: r.id,
            event_id: null,
            user_id: r.user_id,
            created_at: r.created_at || new Date().toISOString(),
            user: u,
            event: null,
            isDbRecord: true,
            isUnassigned: true,
          });
          assignedStudentUserIds.add(r.user_id);
        }
      }
    });

    // 3. Mapping for Overall Coordinators (Global Read-Only Scope across all 61 competitions)
    const overallMap = new Map<string, any>();
    (userRoles || []).forEach((r: any) => {
      if (r.role_id === "overall_coordinator" && !overallMap.has(r.user_id)) {
        const u = (Array.isArray(r.user) ? r.user[0] : r.user) || profileMapById.get(r.user_id);
        if (u) {
          overallMap.set(r.user_id, {
            id: r.id,
            event_id: "all_events",
            user_id: r.user_id,
            created_at: r.created_at || new Date().toISOString(),
            user: u,
            event: {
              id: "all_events",
              name: "All 61 Competitions",
              school_or_dept: "Global Scope (Read-Only)",
              venue: "Central Oversight",
            },
            isDbRecord: true,
            isUnassigned: false,
          });
        }
      }
    });

    return {
      success: true,
      staffAssignments: Array.from(staffMap.values()),
      studentAssignments: Array.from(studentMap.values()),
      overallAssignments: Array.from(overallMap.values()),
      allProfiles: profiles || [],
      allEvents: events || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch coordinators";
    return { success: false, error: msg };
  }
}

const getCachedAllCoordinatorsAdmin = unstable_cache(
  fetchAllCoordinatorsAdminRaw,
  ["admin-all-coordinators-cache"],
  { revalidate: 60, tags: ["admin-coordinators"] }
);

export async function getAllCoordinatorsAdmin() {
  const { authorized } = await verifyAdminSession();
  if (!authorized) {
    return {
      success: false,
      error: "Unauthorized",
      staffAssignments: [],
      studentAssignments: [],
      overallAssignments: [],
      allProfiles: [],
      allEvents: [],
    };
  }
  return getCachedAllCoordinatorsAdmin();
}

export async function assignCoordinatorAdmin(
  type: "staff" | "student",
  eventId: string,
  userId: string
) {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 2) {
      return { success: false, error: "Unauthorized: Insufficient coordinator privileges" };
    }

    // Strict Hierarchy Check:
    // To assign a staff coordinator: caller must be Level >= 3 (Admin or Super Admin)
    // To assign a student coordinator: caller must be Level >= 2 (Staff Coordinator, Admin, or Super Admin)
    if (type === "staff" && authInfo.roleLevel < 3) {
      return { success: false, error: "Hierarchy Violation: Only Administrators or Super Admin can assign Staff Coordinators." };
    }

    if (type === "student" && authInfo.roleLevel < 2) {
      return { success: false, error: "Hierarchy Violation: Only Staff Coordinators or higher can assign Student Coordinators." };
    }

    if (!eventId || eventId === "global") {
      return { success: false, error: "Invalid competition. Coordinators must be assigned to a specific single event." };
    }

    const adminClient = await createAdminClient();

    // STRICT 1-EVENT ENFORCEMENT:
    // A coordinator can ONLY be assigned to ONE event.
    // Atomically clear any existing event assignments for this user across both coordinator assignment tables
    await Promise.all([
      adminClient.from("staff_event_assignments").delete().eq("user_id", userId),
      adminClient.from("student_coordinator_assignments").delete().eq("user_id", userId),
    ]);

    if (type === "staff") {
      // 1. Assign in staff_event_assignments
      const { error: insertErr } = await adminClient.from("staff_event_assignments").insert({
        event_id: eventId,
        user_id: userId,
        assigned_by: authInfo.user.id,
      });
      if (insertErr) throw insertErr;

      // 2. Grant role
      await adminClient.from("user_role_assignments").upsert(
        {
          user_id: userId,
          role_id: "staff_coordinator",
          assigned_by: authInfo.user.id,
        },
        { onConflict: "user_id,role_id" }
      );
    } else {
      // 1. Assign in student_coordinator_assignments
      const { error: insertErr } = await adminClient.from("student_coordinator_assignments").insert({
        event_id: eventId,
        user_id: userId,
        assigned_by: authInfo.user.id,
      });
      if (insertErr) throw insertErr;

      // 2. Grant role
      await adminClient.from("user_role_assignments").upsert(
        {
          user_id: userId,
          role_id: "student_coordinator",
          assigned_by: authInfo.user.id,
        },
        { onConflict: "user_id,role_id" }
      );
    }

    revalidateTag("admin-coordinators");
    revalidatePath("/admin/coordinators", "page");
    revalidatePath("/coordinator", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign coordinator";
    return { success: false, error: msg };
  }
}

export async function revokeCoordinatorAdmin(
  type: "staff" | "student",
  assignmentId: string,
  userId: string
) {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 2) {
      return { success: false, error: "Unauthorized: Insufficient coordinator privileges" };
    }

    if (type === "staff" && authInfo.roleLevel < 3) {
      return { success: false, error: "Hierarchy Violation: Only Administrators or Super Admin can revoke Staff Coordinators." };
    }

    if (type === "student" && authInfo.roleLevel < 2) {
      return { success: false, error: "Hierarchy Violation: Only Staff Coordinators or higher can revoke Student Coordinators." };
    }

    const adminClient = await createAdminClient();

    if (assignmentId.startsWith("sheet_")) {
      // It's a sheet coordinator extracted from event description:
      // Pattern: "sheet_{eventId}_{email}"
      const parts = assignmentId.split("_");
      const eventId = parts[1];
      const emailToRemove = parts.slice(2).join("_").toLowerCase();
      if (eventId && emailToRemove) {
        const { data: evt } = await adminClient.from("events").select("description").eq("id", eventId).maybeSingle();
        if (evt?.description && evt.description.includes("[COORDINATOR_EMAILS:")) {
          const emailMatch = evt.description.match(/\[COORDINATOR_EMAILS:\s*([^\]]+)\]/);
          const nameMatch = evt.description.match(/\[COORDINATOR_NAMES:\s*([^\]]+)\]/);
          const mobileMatch = evt.description.match(/\[COORDINATOR_MOBILES:\s*([^\]]+)\]/);

          if (emailMatch) {
            const emails = emailMatch[1].split(/,|&|\//).map((s: string) => s.trim());
            const names = nameMatch ? nameMatch[1].split(/,|&|\//).map((s: string) => s.trim()) : [];
            const mobiles = mobileMatch ? mobileMatch[1].split(/,|&|\//).map((s: string) => s.trim()) : [];

            const keepIdxs: number[] = [];
            emails.forEach((em: string, idx: number) => {
              if (em.toLowerCase() !== emailToRemove) keepIdxs.push(idx);
            });

            const newEmails = keepIdxs.map((i: number) => emails[i]).join(", ");
            const newNames = keepIdxs.map((i: number) => names[i] || "").join(", ");
            const newMobiles = keepIdxs.map((i: number) => mobiles[i] || "").join(", ");

            const newDesc = evt.description
              .replace(/\[COORDINATOR_EMAILS:\s*[^\]]+\]/, newEmails ? `[COORDINATOR_EMAILS: ${newEmails}]` : "")
              .replace(/\[COORDINATOR_NAMES:\s*[^\]]+\]/, newNames ? `[COORDINATOR_NAMES: ${newNames}]` : "")
              .replace(/\[COORDINATOR_MOBILES:\s*[^\]]+\]/, newMobiles ? `[COORDINATOR_MOBILES: ${newMobiles}]` : "");

            await adminClient.from("events").update({ description: newDesc }).eq("id", eventId);
          }
        }
      }
    } else {
      if (type === "staff") {
        await adminClient.from("staff_event_assignments").delete().eq("id", assignmentId);
      } else {
        await adminClient.from("student_coordinator_assignments").delete().eq("id", assignmentId);
      }
    }

    // Clean up role if user has no remaining coordinator assignments and is not admin
    if (userId && !userId.startsWith("email_")) {
      const [{ data: staffLeft }, { data: studLeft }] = await Promise.all([
        adminClient.from("staff_event_assignments").select("id").eq("user_id", userId).limit(1),
        adminClient.from("student_coordinator_assignments").select("id").eq("user_id", userId).limit(1),
      ]);
      if ((!staffLeft || staffLeft.length === 0) && (!studLeft || studLeft.length === 0)) {
        await adminClient
          .from("user_role_assignments")
          .delete()
          .eq("user_id", userId)
          .in("role_id", ["staff_coordinator", "student_coordinator"]);
      }
    }

    revalidateTag("admin-coordinators");
    revalidatePath("/admin/coordinators", "page");
    revalidatePath("/coordinator", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke coordinator";
    return { success: false, error: msg };
  }
}

// 10. Announcements
export async function getAllAnnouncementsAdmin() {
  try {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from("announcements")
      .select(`
        *,
        event:events (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, announcements: data || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch announcements";
    return { success: false, error: msg, announcements: [] };
  }
}

export async function createAnnouncementAdmin(data: {
  title: string;
  content: string;
  urgency: "info" | "warning" | "urgent";
  eventId?: string | null;
}) {
  try {
    const { authorized, user } = await verifyAdminSession();
    if (!authorized || !user) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();
    const { error } = await adminClient.from("announcements").insert({
      title: data.title.trim(),
      content: data.content.trim(),
      urgency: data.urgency,
      event_id: data.eventId && data.eventId !== "global" ? data.eventId : null,
      created_by: user.id,
      is_published: true,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    revalidatePath("/announcements", "page");
    revalidatePath("/admin/announcements", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create announcement";
    return { success: false, error: msg };
  }
}

export async function deleteAnnouncementAdmin(id: string) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();
    const { error } = await adminClient.from("announcements").delete().eq("id", id);

    if (error) throw error;

    revalidatePath("/announcements", "page");
    revalidatePath("/admin/announcements", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete announcement";
    return { success: false, error: msg };
  }
}

// 11. Bulk Upload Events Server Action
export async function bulkUploadEventsAdmin(eventsData: Array<{
  name: string;
  school: string;
  category: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  registration_fee?: number | string;
  participant_limit?: number | string;
  min_team_size?: number | string;
  max_team_size?: number | string;
  is_pro_event?: boolean | string;
  short_description?: string;
  rules?: string | string[];
  status?: string;
}>) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized. Admin privileges required." };

    const adminClient = await createAdminClient();

    // 1. Fetch existing categories
    const { data: existingCategories } = await adminClient
      .from("event_categories")
      .select("id, name, slug");

    const categoryMap = new Map<string, string>();
    (existingCategories || []).forEach((c) => {
      categoryMap.set(c.name.toLowerCase().trim(), c.id);
      categoryMap.set(c.slug.toLowerCase().trim(), c.id);
    });

    const SCHOOL_TO_CATEGORY_SLUG: Record<string, string> = {
      "Kalasalingam School of Agriculture and Horticulture (KSAH)": "agriculture-horticulture",
      "Kalasalingam School of Architecture (KSoA)": "architecture-design",
      "School of Mechanical, Aero, Auto and Civil Engineering": "mechanical-civil",
      "School of Bio, Chemical and Processing Engineering": "biotechnology-chemical",
      "School of Computing (SoC)": "computing-ai",
      "School of Electronics, Electrical and Biomedical Technology (SEET)": "electrical-electronics",
      "School of Advanced Sciences (SAS)": "sciences-mathematics",
      "Kalasalingam Business School (KBS)": "management-commerce",
      "School of Liberal Arts and Special Education (SLASE)": "arts-media-literature",
      "Kalasalingam School of Allied And Health Sciences": "allied-health-sciences",
      "Kalasalingam School of Law (KSoL)": "law-debating",
      "First Year Engineering & Foundation (FE)": "first-year-engineering",
    };

    let insertedCount = 0;
    const errors: string[] = [];

    for (const evt of eventsData) {
      if (!evt.name || !evt.name.trim()) continue;

      const categoryName = (evt.category || "Technical Competitions").trim();
      let categoryId = categoryMap.get(categoryName.toLowerCase());

      // If not directly matched, check if school maps to an existing category
      if (!categoryId && evt.school && SCHOOL_TO_CATEGORY_SLUG[evt.school]) {
        categoryId = categoryMap.get(SCHOOL_TO_CATEGORY_SLUG[evt.school]);
      }

      // If category still doesn't exist, create it
      if (!categoryId) {
        const catSlug = categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const { data: newCat, error: catErr } = await adminClient
          .from("event_categories")
          .insert({
            id: `cat_${catSlug}`,
            name: categoryName,
            slug: catSlug,
            description: `${categoryName} events and challenges at Euphoria 2026`,
            display_order: categoryMap.size + 1,
          })
          .select("id")
          .single();

        if (newCat) {
          categoryId = newCat.id;
          categoryMap.set(categoryName.toLowerCase(), newCat.id);
        } else if (catErr) {
          // fallback to first category
          categoryId = existingCategories?.[0]?.id || "cat_computing";
        }
      }

      const slug = evt.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const rulesArray = Array.isArray(evt.rules)
        ? evt.rules
        : typeof evt.rules === "string"
        ? evt.rules.split(";").map((r) => r.trim()).filter((r) => r.length > 0)
        : [
            "Valid College ID Card / Euphoria QR Pass mandatory",
            "Bring your own equipment/laptops where applicable",
            "Decision of judges is final and binding",
          ];

      const isPro =
        typeof evt.is_pro_event === "boolean"
          ? evt.is_pro_event
          : typeof evt.is_pro_event === "string"
          ? evt.is_pro_event.toLowerCase() === "true" || evt.is_pro_event.toLowerCase() === "yes" || evt.is_pro_event === "1"
          : false;

      const payload = {
        category_id: categoryId,
        name: evt.name.trim(),
        slug: `${slug}-${Math.floor(Math.random() * 1000)}`, // unique slug suffix
        short_description:
          evt.short_description ||
          `${evt.name} organized by ${evt.school || "KARE"} as part of Euphoria 2026.`,
        description:
          evt.short_description ||
          `${evt.name} is a premier technical symposium event hosted by ${evt.school || "KARE"} during Euphoria 2026.`,
        rules: rulesArray,
        school_or_dept: evt.school || "Kalasalingam Academy of Research and Education",
        venue: evt.venue || "Main Campus Hall",
        event_date: evt.event_date || "2026-09-25",
        start_time: evt.start_time || "09:30",
        end_time: evt.end_time || "16:30",
        registration_fee: Number(evt.registration_fee || 0),
        participant_limit: Number(evt.participant_limit || 100),
        min_team_size: Number(evt.min_team_size || 1),
        max_team_size: Number(evt.max_team_size || 1),
        is_pro_event: isPro,
        status: evt.status || "registration_open",
        allow_internal: true,
        allow_external: true,
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await adminClient
        .from("events")
        .insert(payload);

      if (insertErr) {
        errors.push(`${evt.name}: ${insertErr.message}`);
      } else {
        insertedCount++;
      }
    }

    revalidatePath("/admin/events", "page");

    return {
      success: true,
      count: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bulk upload failed";
    return { success: false, error: msg };
  }
}

// 14. Fetch All Payment Orders for Admin Payments Dashboard
export async function getAllOrdersAdmin() {
  try {
    const adminClient = await createAdminClient();

    const [orders, profiles, passes, registrations] = await Promise.all([
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("profiles")
          .select("id, full_name, email, mobile_number, gender, participant_type, college_name, department, register_number, city, needs_accommodation")
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("delegate_passes")
          .select("id, user_id, order_id, pass_code, pass_tier, amount_paid, status")
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("event_registrations")
          .select(`
            id,
            user_id,
            slot_number,
            status,
            event:events (
              id,
              name,
              school_or_dept,
              venue
            )
          `)
          .range(from, to)
      ),
    ]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p) => profileMap.set(p.id, p));

    const userRegsMap = new Map<string, any[]>();
    (registrations || []).forEach((reg: any) => {
      if (!reg.user_id) return;
      const list = userRegsMap.get(reg.user_id) || [];
      list.push(reg);
      userRegsMap.set(reg.user_id, list);
    });

    // Map passes primarily by order_id to prevent cancelled attempts from inheriting passes
    const passByOrderIdMap = new Map<string, any>();
    const userActivePassMap = new Map<string, any>();
    (passes || []).forEach((p) => {
      if (p.order_id) {
        passByOrderIdMap.set(p.order_id, p);
      }
      if (p.status === "active") {
        userActivePassMap.set(p.user_id, p);
      }
    });

    const orderByIdMap = new Map<string, any>();
    (orders || []).forEach((ord) => orderByIdMap.set(ord.id, ord));

    const enrichedOrders = (orders || []).map((ord) => {
      const userProf = profileMap.get(ord.user_id);
      
      // Direct pass generated specifically by this order
      let directPass = passByOrderIdMap.get(ord.id);
      // Legacy fallback: if pass has no order_id set, only associate it if this order is paid
      if (!directPass && ord.status === "paid") {
        const candidatePass = userActivePassMap.get(ord.user_id);
        if (candidatePass && !candidatePass.order_id) {
          directPass = candidatePass;
        }
      }

      // If this order did not generate a pass, check if user already has an active pass from another order
      const otherPass = !directPass ? userActivePassMap.get(ord.user_id) : null;
      const otherOrder = otherPass?.order_id ? orderByIdMap.get(otherPass.order_id) : null;

      // Extract user metadata fallbacks if profile row is missing or incomplete
      const meta = ord.metadata || {};
      const fallbackName = meta.user_name || meta.customer_name || meta.name || meta.udf6_candidate_id || "Participant";
      const fallbackEmail = meta.email || meta.customer_email || meta.user_email || "";
      const fallbackPhone = meta.phone || meta.customer_phone || meta.user_phone || "";
      const fallbackRegn = meta.register_number || meta.candidate_regn || meta.udf6 || "";

      return {
        id: ord.id,
        orderNumber: ord.order_number,
        amount: Number(ord.amount || 0),
        status: ord.status as "paid" | "pending" | "failed" | "refunded",
        provider: ord.provider || "easebuzz",
        createdAt: ord.created_at,
        metadata: meta,
        user: {
          id: ord.user_id,
          fullName: userProf?.full_name || fallbackName,
          email: userProf?.email || fallbackEmail,
          mobileNumber: userProf?.mobile_number || fallbackPhone,
          gender: userProf?.gender || meta.gender || undefined,
          participantType: isKluParticipant(userProf) ? "internal" : (userProf?.participant_type || "external"),
          collegeName: userProf?.college_name || (isKluParticipant(userProf) ? "KARE" : ""),
          department: userProf?.department || "",
          registerNumber: userProf?.register_number || fallbackRegn,
          city: userProf?.city || meta.city || "",
          needsAccommodation: Boolean(
            userProf?.needs_accommodation ||
            meta.needs_accommodation === true ||
            meta.needs_accommodation === "true" ||
            meta.accommodation_requested
          ),
          registeredEvents: (userRegsMap.get(ord.user_id) || []).map((r) => {
            const evt = Array.isArray(r.event) ? r.event[0] : r.event;
            return {
              slotNumber: r.slot_number || 1,
              eventName: evt?.name || "Event",
              schoolOrDept: evt?.school_or_dept || "KARE",
              venue: evt?.venue || "",
            };
          }),
        },
        pass: directPass
          ? {
              passCode: directPass.pass_code,
              passTier: directPass.pass_tier,
              status: directPass.status,
            }
          : null,
        userOtherPass: otherPass
          ? {
              passCode: otherPass.pass_code,
              passTier: otherPass.pass_tier,
              status: otherPass.status,
              otherOrderNumber: otherOrder?.order_number || null,
            }
          : null,
      };
    });

    return { success: true, orders: enrichedOrders };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch payment orders";
    return { success: false, error: msg, orders: [] };
  }
}

export interface AdminPaymentMetrics {
  totalRev: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  totalCount: number;
}

export interface PaginatedOrdersResult {
  success: boolean;
  error?: string;
  orders: any[];
  totalFilteredCount: number;
  metrics: AdminPaymentMetrics;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 14b. Fetch Paginated Payment Orders (Strictly 10 per page, High Performance)
export async function getPaginatedOrdersAdmin(params: {
  page?: number;
  pageSize?: number;
  statusFilter?: "all" | "paid" | "pending" | "failed";
  searchQuery?: string;
} = {}): Promise<PaginatedOrdersResult> {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) {
      return {
        success: false,
        error: "Unauthorized. Admin privileges required.",
        orders: [],
        totalFilteredCount: 0,
        metrics: { totalRev: 0, paidCount: 0, pendingCount: 0, failedCount: 0, totalCount: 0 },
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };
    }

    const adminClient = await createAdminClient();
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 10));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Financial Telemetry summary (exact counts & paging across all orders)
    const finances = await getAdminFinancialTelemetry();

    const metrics: AdminPaymentMetrics = {
      totalRev: finances.totalRevenue,
      paidCount: finances.paidOrders,
      pendingCount: finances.pendingOrders,
      failedCount: finances.failedOrders,
      totalCount: finances.totalOrders,
    };

    // 2. Build Paginated Orders Query
    let query = adminClient
      .from("orders")
      .select(`
        id,
        order_number,
        amount,
        currency,
        status,
        provider,
        gateway_order_id,
        gateway_payment_id,
        metadata,
        created_at,
        user_id
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply status filter
    if (params.statusFilter === "paid") {
      query = query.eq("status", "paid");
    } else if (params.statusFilter === "failed") {
      query = query.eq("status", "failed");
    } else if (params.statusFilter === "pending") {
      query = query.in("status", ["pending", "attempted", "created"]);
    }

    // Apply search query
    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.trim();

      const [profilesRes, passesRes] = await Promise.all([
        adminClient
          .from("profiles")
          .select("id")
          .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,register_number.ilike.%${q}%`)
          .limit(50),
        adminClient
          .from("delegate_passes")
          .select("id, order_id, user_id")
          .ilike("pass_code", `%${q}%`)
          .limit(50),
      ]);

      const matchedUserIds = Array.from(
        new Set([
          ...(profilesRes.data || []).map((p) => p.id),
          ...(passesRes.data || []).map((p) => p.user_id).filter(Boolean),
        ])
      );
      const matchedOrderIds = (passesRes.data || []).map((p) => p.order_id).filter(Boolean);

      const orClauses: string[] = [
        `order_number.ilike.%${q}%`,
        `gateway_order_id.ilike.%${q}%`,
        `gateway_payment_id.ilike.%${q}%`,
      ];

      if (matchedUserIds.length > 0) {
        orClauses.push(`user_id.in.(${matchedUserIds.join(",")})`);
      }
      if (matchedOrderIds.length > 0) {
        orClauses.push(`id.in.(${matchedOrderIds.join(",")})`);
      }

      query = query.or(orClauses.join(","));
    }

    // 3. Execute Range Query for strictly 10 items
    const { data: rawOrders, count, error: ordersErr } = await query.range(from, to);
    if (ordersErr) throw ordersErr;

    const totalFilteredCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

    // 4. Targeted fetch of profiles & passes ONLY for the 10 retrieved orders
    const userIds = Array.from(new Set((rawOrders || []).map((o) => o.user_id).filter(Boolean)));
    const orderIds = (rawOrders || []).map((o) => o.id);

    const profilesMap = new Map<string, any>();
    const passByOrderIdMap = new Map<string, any>();
    const userActivePassMap = new Map<string, any>();

    if (userIds.length > 0 || orderIds.length > 0) {
      const [profilesRes, passesRes] = await Promise.all([
        userIds.length > 0
          ? adminClient
              .from("profiles")
              .select("id, full_name, email, mobile_number, participant_type, college_name, department, register_number")
              .in("id", userIds)
          : Promise.resolve({ data: [] }),
        adminClient
          .from("delegate_passes")
          .select("id, user_id, order_id, pass_code, pass_tier, amount_paid, status")
          .or(`order_id.in.(${orderIds.join(",") || "00000000-0000-0000-0000-000000000000"}),user_id.in.(${userIds.join(",") || "00000000-0000-0000-0000-000000000000"})`),
      ]);

      (profilesRes.data || []).forEach((p) => profilesMap.set(p.id, p));

      (passesRes.data || []).forEach((p) => {
        if (p.order_id) {
          passByOrderIdMap.set(p.order_id, p);
        }
        if (p.status === "active") {
          userActivePassMap.set(p.user_id, p);
        }
      });
    }

    // Secondary pass mapping: resolve other order numbers if user has an active pass from another order
    const otherOrderIds = Array.from(
      new Set(
        Array.from(userActivePassMap.values())
          .map((p) => p.order_id)
          .filter((oid) => Boolean(oid) && !orderIds.includes(oid))
      )
    );

    const otherOrdersMap = new Map<string, any>();
    if (otherOrderIds.length > 0) {
      const { data: otherOrderRows } = await adminClient
        .from("orders")
        .select("id, order_number")
        .in("id", otherOrderIds);
      (otherOrderRows || []).forEach((o) => otherOrdersMap.set(o.id, o));
    }

    // Enrich the 10 orders
    const enrichedOrders = (rawOrders || []).map((ord) => {
      const userProf = profilesMap.get(ord.user_id);

      let directPass = passByOrderIdMap.get(ord.id);
      if (!directPass && ord.status === "paid") {
        const candidatePass = userActivePassMap.get(ord.user_id);
        if (candidatePass && !candidatePass.order_id) {
          directPass = candidatePass;
        }
      }

      const otherPass = !directPass ? userActivePassMap.get(ord.user_id) : null;
      const otherOrder = otherPass?.order_id
        ? otherOrdersMap.get(otherPass.order_id) || (orderIds.includes(otherPass.order_id) ? ord : null)
        : null;

      const meta = (ord.metadata as Record<string, any>) || {};
      const fallbackName = meta.user_name || meta.customer_name || meta.name || meta.udf6_candidate_id || "Participant";
      const fallbackEmail = meta.email || meta.customer_email || meta.user_email || "";
      const fallbackPhone = meta.phone || meta.customer_phone || meta.user_phone || "";
      const fallbackRegn = meta.register_number || meta.candidate_regn || meta.udf6 || "";

      return {
        id: ord.id,
        orderNumber: ord.order_number,
        amount: Number(ord.amount || 0),
        status: ord.status as "paid" | "pending" | "failed" | "refunded",
        provider: ord.provider || "easebuzz",
        createdAt: ord.created_at,
        metadata: meta,
        user: {
          id: ord.user_id,
          fullName: userProf?.full_name || fallbackName,
          email: userProf?.email || fallbackEmail,
          mobileNumber: userProf?.mobile_number || fallbackPhone,
          participantType: isKluParticipant(userProf) ? "internal" : (userProf?.participant_type || "external"),
          collegeName: userProf?.college_name || (isKluParticipant(userProf) ? "KARE" : ""),
          department: userProf?.department || "",
          registerNumber: userProf?.register_number || fallbackRegn,
        },
        pass: directPass
          ? {
              passCode: directPass.pass_code,
              passTier: directPass.pass_tier,
              status: directPass.status,
            }
          : null,
        userOtherPass: otherPass
          ? {
              passCode: otherPass.pass_code,
              passTier: otherPass.pass_tier,
              status: otherPass.status,
              otherOrderNumber: otherOrder?.order_number || null,
            }
          : null,
      };
    });

    return {
      success: true,
      orders: enrichedOrders,
      totalFilteredCount,
      metrics,
      page,
      pageSize,
      totalPages,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch paginated payment orders";
    return {
      success: false,
      error: msg,
      orders: [],
      totalFilteredCount: 0,
      metrics: { totalRev: 0, paidCount: 0, pendingCount: 0, failedCount: 0, totalCount: 0 },
      page: 1,
      pageSize: 10,
      totalPages: 0,
    };
  }
}

// 12. Load Server Master CSV Preset
export async function getMasterEventsPreset() {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const filePath = path.join(process.cwd(), "data", "euphoria_2026_events_master.csv");
    const fileContent = await fs.readFile(filePath, "utf-8");

    const lines = fileContent.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return { success: false, error: "Master CSV is empty", events: [] };

    const headers = lines[0].split(",").map((h) => h.trim());
    const events = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV row splitter handling quoted strings
      const row: string[] = [];
      let inQuotes = false;
      let curVal = "";

      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          row.push(curVal.trim());
          curVal = "";
        } else {
          curVal += char;
        }
      }
      row.push(curVal.trim());

      if (row.length >= 2 && row[0]) {
        const item: Record<string, string> = {};
        headers.forEach((h, idx) => {
          item[h] = row[idx] || "";
        });
        events.push(item);
      }
    }

    return { success: true, events, count: events.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load master CSV";
    return { success: false, error: msg, events: [] };
  }
}

// 13. Pricing & Tier Settings Admin Actions
export interface RegistrationPricingPolicy {
  pro_pass_fee?: number;
  normal_pass_fee?: number;
  internal_base_fee: number;
  internal_max_events_included: number;
  internal_extra_event_fee: number;
  external_base_fee: number;
  external_max_events_included: number;
  external_extra_event_fee: number;
  pro_event_surcharge: number;
  max_pro_events_allowed: number;
  require_pro_first: boolean;
  is_registration_active: boolean;
  updated_at: string;
}

const DEFAULT_PRICING: RegistrationPricingPolicy = {
  pro_pass_fee: 300,
  normal_pass_fee: 200,
  internal_base_fee: 200,
  internal_max_events_included: 2,
  internal_extra_event_fee: 0,
  external_base_fee: 200,
  external_max_events_included: 2,
  external_extra_event_fee: 0,
  pro_event_surcharge: 100,
  max_pro_events_allowed: 1,
  require_pro_first: true,
  is_registration_active: true,
  updated_at: new Date().toISOString(),
};

export async function getPricingSettingsAdmin(): Promise<RegistrationPricingPolicy> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "pricing_settings.json");

    try {
      const data = await fs.readFile(filePath, "utf-8");
      return { ...DEFAULT_PRICING, ...JSON.parse(data) };
    } catch {
      await fs.writeFile(filePath, JSON.stringify(DEFAULT_PRICING, null, 2), "utf-8");
      return DEFAULT_PRICING;
    }
  } catch {
    return DEFAULT_PRICING;
  }
}

export async function updatePricingSettingsAdmin(payload: Partial<RegistrationPricingPolicy>) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized. Admin privileges required." };

    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "pricing_settings.json");

    const current = await getPricingSettingsAdmin();
    const updated: RegistrationPricingPolicy = {
      ...current,
      ...payload,
      pro_pass_fee: Number(payload.pro_pass_fee ?? current.pro_pass_fee ?? 300),
      normal_pass_fee: Number(payload.normal_pass_fee ?? current.normal_pass_fee ?? 200),
      internal_base_fee: Number(payload.internal_base_fee ?? current.internal_base_fee ?? 200),
      internal_max_events_included: Number(payload.internal_max_events_included ?? current.internal_max_events_included ?? 2),
      internal_extra_event_fee: Number(payload.internal_extra_event_fee ?? current.internal_extra_event_fee ?? 0),
      external_base_fee: Number(payload.external_base_fee ?? current.external_base_fee ?? 200),
      external_max_events_included: Number(payload.external_max_events_included ?? current.external_max_events_included ?? 2),
      external_extra_event_fee: Number(payload.external_extra_event_fee ?? current.external_extra_event_fee ?? 0),
      pro_event_surcharge: Number(payload.pro_event_surcharge ?? current.pro_event_surcharge ?? 100),
      max_pro_events_allowed: Number(payload.max_pro_events_allowed ?? current.max_pro_events_allowed ?? 1),
      require_pro_first: payload.require_pro_first !== undefined ? Boolean(payload.require_pro_first) : current.require_pro_first ?? true,
      is_registration_active: payload.is_registration_active ?? current.is_registration_active,
      updated_at: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), "utf-8");

    revalidateTag("public-pricing-settings");
    revalidatePath("/admin/pricing", "page");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard", "page");

    return { success: true, settings: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update pricing settings";
    return { success: false, error: msg };
  }
}

// 12. Fetch All Registered Users & Pass Holders for Admin
export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  gender?: string;
  participantType: "internal" | "external";
  registerNumber?: string;
  collegeName?: string;
  department?: string;
  course?: string;
  yearOfStudy?: number;
  city?: string;
  pincode?: string;
  needsAccommodation?: boolean;
  isProfileCompleted: boolean;
  createdAt: string;
  roles: string[];
  pass?: {
    id: string;
    passCode: string;
    passTier: "standard_pass" | "pro_pass";
    amountPaid: number;
    slotsUsed: number;
    totalSlots: number;
    status: string;
    createdAt: string;
  } | null;
  registrations: Array<{
    id: string;
    slotNumber: number;
    registrationCode: string;
    status: string;
    paymentStatus: string;
    isAttended: boolean;
    scannedAt?: string | null;
    event: {
      id: string;
      name: string;
      slug: string;
      schoolOrDept?: string;
      isProEvent?: boolean;
      venue: string;
      eventDate: string;
      startTime: string;
      category?: string;
    };
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    amount: number;
    status: string;
    provider: string;
    createdAt: string;
  }>;
}

export interface AdminUsersMetrics {
  totalUsers: number;
  completedProfiles: number;
  totalPasses: number;
  proPasses: number;
  standardPasses: number;
}

export interface GetAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  passFilter?: "all" | "pro_pass" | "standard_pass" | "no_pass";
  slotFilter?: "all" | "0" | "1" | "2";
  typeFilter?: "all" | "internal" | "external";
  profileFilter?: "all" | "completed" | "incomplete";
  roleFilter?: "all" | "super_admin" | "admin" | "overall_coordinator" | "staff_coordinator" | "student_coordinator" | "participant";
}

export interface GetAdminUsersResult {
  success: boolean;
  error?: string;
  users: AdminUserListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: AdminUsersMetrics;
}

/**
 * High-efficiency cached metrics query using HTTP HEAD exact counts (0 row egress)
 */
async function fetchAdminUsersMetricsRaw(): Promise<AdminUsersMetrics> {
  const adminClient = await createAdminClient();
  const [
    { count: totalUsers },
    { count: completedProfiles },
    { count: totalPasses },
    { count: proPasses },
  ] = await Promise.all([
    adminClient.from("profiles").select("id", { count: "exact", head: true }),
    adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("is_profile_completed", true),
    adminClient.from("delegate_passes").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminClient.from("delegate_passes").select("id", { count: "exact", head: true }).eq("status", "active").eq("pass_tier", "pro_pass"),
  ]);

  const activePasses = totalPasses || 0;
  const proCount = proPasses || 0;
  const standardCount = Math.max(0, activePasses - proCount);

  return {
    totalUsers: totalUsers || 0,
    completedProfiles: completedProfiles || 0,
    totalPasses: activePasses,
    proPasses: proCount,
    standardPasses: standardCount,
  };
}

export const getAdminUsersMetricsCached = unstable_cache(
  fetchAdminUsersMetricsRaw,
  ["admin-users-metrics-cache"],
  { revalidate: 300, tags: ["admin-users"] }
);

/**
 * 12a. High-Performance Paginated Admin Users Query with Egress Guard
 * Only fetches the requested batch (e.g. 50 users) and fetches related passes, registrations, and roles
 * ONLY for those 50 users (dropping Supabase network transfer by 99.8%).
 */
export async function getAdminUsersPaginatedAction(params?: GetAdminUsersParams): Promise<GetAdminUsersResult> {
  try {
    const adminClient = await createAdminClient();
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(10, params?.limit || 50));
    const search = params?.search?.trim();
    const passFilter = params?.passFilter || "all";
    const slotFilter = params?.slotFilter || "all";
    const typeFilter = params?.typeFilter || "all";
    const profileFilter = params?.profileFilter || "all";
    const roleFilter = params?.roleFilter || "all";

    // 1. Fetch cached metrics for KPI cards
    const metrics = await getAdminUsersMetricsCached();

    // 2. Build profile query with column projection
    let query = adminClient
      .from("profiles")
      .select("id, email, full_name, mobile_number, gender, participant_type, register_number, college_name, department, course, year_of_study, city, pincode, needs_accommodation, is_profile_completed, created_at", { count: "exact" });

    // Handle role filtering
    if (roleFilter !== "all") {
      if (roleFilter === "participant") {
        const { data: assigned } = await adminClient.from("user_role_assignments").select("user_id");
        const assignedIds = Array.from(new Set((assigned || []).map((a) => a.user_id)));
        if (assignedIds.length > 0) {
          query = query.not("id", "in", `(${assignedIds.slice(0, 1000).join(",")})`);
        }
      } else {
        const { data: roleUsers } = await adminClient
          .from("user_role_assignments")
          .select("user_id")
          .eq("role_id", roleFilter);
        const roleUserIds = (roleUsers || []).map((r) => r.user_id);
        if (roleUserIds.length === 0) {
          return {
            success: true,
            users: [],
            totalCount: 0,
            page,
            limit,
            totalPages: 0,
            metrics,
          };
        }
        query = query.in("id", roleUserIds);
      }
    }

    // Handle pass tier filtering
    if (passFilter !== "all") {
      if (passFilter === "no_pass") {
        const { data: passUsers } = await adminClient
          .from("delegate_passes")
          .select("user_id")
          .eq("status", "active");
        const passUserIds = Array.from(new Set((passUsers || []).map((p) => p.user_id)));
        if (passUserIds.length > 0) {
          query = query.not("id", "in", `(${passUserIds.slice(0, 1000).join(",")})`);
        }
      } else {
        const { data: passUsers } = await adminClient
          .from("delegate_passes")
          .select("user_id")
          .eq("status", "active")
          .eq("pass_tier", passFilter);
        const passUserIds = (passUsers || []).map((p) => p.user_id);
        if (passUserIds.length === 0) {
          return {
            success: true,
            users: [],
            totalCount: 0,
            page,
            limit,
            totalPages: 0,
            metrics,
          };
        }
        query = query.in("id", passUserIds);
      }
    }

    // Handle slot usage filtering
    if (slotFilter !== "all") {
      const slotNum = Number(slotFilter);
      const { data: slotPasses } = await adminClient
        .from("delegate_passes")
        .select("user_id")
        .eq("status", "active")
        .eq("slots_used", slotNum);
      const slotUserIds = (slotPasses || []).map((p) => p.user_id);
      if (slotUserIds.length === 0) {
        return {
          success: true,
          users: [],
          totalCount: 0,
          page,
          limit,
          totalPages: 0,
          metrics,
        };
      }
      query = query.in("id", slotUserIds);
    }

    // Handle participant type filter
    if (typeFilter !== "all") {
      query = query.eq("participant_type", typeFilter);
    }

    // Handle profile completion status
    if (profileFilter === "completed") {
      query = query.eq("is_profile_completed", true);
    } else if (profileFilter === "incomplete") {
      query = query.eq("is_profile_completed", false);
    }

    // Handle search query
    if (search) {
      if (search.toUpperCase().includes("EUP") || search.toUpperCase().includes("PRO") || search.toUpperCase().includes("STD")) {
        const { data: matchingPasses } = await adminClient
          .from("delegate_passes")
          .select("user_id")
          .ilike("pass_code", `%${search}%`)
          .limit(50);
        const passIds = (matchingPasses || []).map((p) => p.user_id);
        if (passIds.length > 0) {
          query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,register_number.ilike.%${search}%,mobile_number.ilike.%${search}%,college_name.ilike.%${search}%,id.in.(${passIds.join(",")})`);
        } else {
          query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,register_number.ilike.%${search}%,mobile_number.ilike.%${search}%,college_name.ilike.%${search}%`);
        }
      } else {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,register_number.ilike.%${search}%,mobile_number.ilike.%${search}%,college_name.ilike.%${search}%`);
      }
    }

    // Apply pagination range and ordering
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: profiles, count, error: profileErr } = await query;
    if (profileErr) throw profileErr;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        users: [],
        totalCount,
        page,
        limit,
        totalPages,
        metrics,
      };
    }

    // 3. For ONLY the returned user IDs (at most 50 users!), fetch passes, registrations, and roles
    const userIds = profiles.map((p) => p.id);

    const [passesRes, regsRes, rolesRes] = await Promise.all([
      adminClient
        .from("delegate_passes")
        .select("id, user_id, pass_code, pass_tier, amount_paid, slots_used, total_slots, status, created_at")
        .in("user_id", userIds)
        .eq("status", "active"),
      adminClient
        .from("event_registrations")
        .select(`
          id,
          user_id,
          slot_number,
          registration_code,
          status,
          payment_status,
          event:events (
            id,
            name,
            slug,
            school_or_dept,
            is_pro_event,
            venue,
            event_date,
            start_time,
            category:event_categories (name)
          ),
          attendance (
            id,
            scanned_at
          )
        `)
        .in("user_id", userIds),
      adminClient
        .from("user_role_assignments")
        .select("user_id, role_id")
        .in("user_id", userIds),
    ]);

    const passes = passesRes.data || [];
    const registrations = regsRes.data || [];
    const roleAssignments = rolesRes.data || [];

    const passMap = new Map<string, any>();
    passes.forEach((pass) => passMap.set(pass.user_id, pass));

    const regMap = new Map<string, any[]>();
    registrations.forEach((reg) => {
      const list = regMap.get(reg.user_id) || [];
      list.push(reg);
      regMap.set(reg.user_id, list);
    });

    const roleMap = new Map<string, string[]>();
    roleAssignments.forEach((ra) => {
      const list = roleMap.get(ra.user_id) || [];
      list.push(ra.role_id);
      roleMap.set(ra.user_id, list);
    });

    // 4. Assemble the unified user records
    const users: AdminUserListItem[] = profiles.map((prof) => {
      const pass = passMap.get(prof.id);
      const userRegs = regMap.get(prof.id) || [];
      const userRoles = roleMap.get(prof.id) || [];

      return {
        id: prof.id,
        fullName: prof.full_name || "Participant",
        email: prof.email || "",
        mobileNumber: prof.mobile_number || undefined,
        gender: prof.gender || undefined,
        participantType: (isKluParticipant(prof) ? "internal" : (prof.participant_type || "external")) as "internal" | "external",
        registerNumber: prof.register_number || undefined,
        collegeName: isKluParticipant(prof)
          ? (prof.college_name || "Kalasalingam Academy of Research and Education")
          : (prof.college_name || undefined),
        department: prof.department || undefined,
        course: prof.course || undefined,
        yearOfStudy: prof.year_of_study || undefined,
        city: prof.city || undefined,
        pincode: prof.pincode || undefined,
        needsAccommodation: Boolean(prof.needs_accommodation),
        isProfileCompleted: Boolean(prof.is_profile_completed),
        createdAt: prof.created_at,
        roles: userRoles,
        pass: pass
          ? {
              id: pass.id,
              passCode: pass.pass_code,
              passTier: pass.pass_tier,
              amountPaid: Number(pass.amount_paid || 0),
              slotsUsed: Number(pass.slots_used || userRegs.length),
              totalSlots: Number(pass.total_slots || 2),
              status: pass.status,
              createdAt: pass.created_at,
            }
          : null,
        registrations: userRegs.map((r) => {
          const isAttended = Array.isArray(r.attendance)
            ? r.attendance.length > 0
            : Boolean(r.attendance);
          const scannedAt = Array.isArray(r.attendance)
            ? r.attendance[0]?.scanned_at
            : (r.attendance as any)?.scanned_at;
          const evt = Array.isArray(r.event) ? r.event[0] : r.event;

          return {
            id: r.id,
            slotNumber: r.slot_number || 1,
            registrationCode: r.registration_code,
            status: r.status,
            paymentStatus: r.payment_status,
            isAttended,
            scannedAt,
            event: {
              id: evt?.id || "",
              name: evt?.name || "Competition",
              slug: evt?.slug || "",
              schoolOrDept: evt?.school_or_dept || "KARE",
              isProEvent: Boolean(evt?.is_pro_event),
              venue: evt?.venue || "Main Auditorium",
              eventDate: evt?.event_date || "",
              startTime: evt?.start_time || "",
              category: evt?.category?.name || "Track",
            },
          };
        }),
        orders: [],
      };
    });

    return {
      success: true,
      users,
      totalCount,
      page,
      limit,
      totalPages,
      metrics,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch users";
    return {
      success: false,
      error: msg,
      users: [],
      totalCount: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      metrics: {
        totalUsers: 0,
        completedProfiles: 0,
        totalPasses: 0,
        proPasses: 0,
        standardPasses: 0,
      },
    };
  }
}

/**
 * Cached Page 1 loader with 3-minute TTL for instantaneous landing page renders
 */
const fetchPageOneDefaultRaw = async () => {
  return await getAdminUsersPaginatedAction({ page: 1, limit: 50 });
};

export const getAdminUsersPageOneCached = unstable_cache(
  fetchPageOneDefaultRaw,
  ["admin-users-page-1-cache"],
  { revalidate: 180, tags: ["admin-users"] }
);

/**
 * On-demand order fetcher for single user inspection in modal (0 full-table egress)
 */
export async function getUserOrdersAdmin(userId: string) {
  try {
    const adminClient = await createAdminClient();
    const { data: orders, error } = await adminClient
      .from("orders")
      .select("id, order_number, amount, status, provider, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return {
      success: true,
      orders: (orders || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        amount: Number(o.amount || 0),
        status: o.status,
        provider: o.provider,
        createdAt: o.created_at,
      })),
    };
  } catch (err: unknown) {
    return { success: false, error: String(err), orders: [] };
  }
}

/**
 * Admin cache refresh action
 */
export async function refreshAdminUsersCacheAction() {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };
    revalidateTag("admin-users");
    revalidatePath("/admin/users", "page");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

/**
 * Dedicated CSV Export Server Action (only transfers full data when requested by user)
 */
export async function exportAdminUsersCsvAction(params?: GetAdminUsersParams) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    // Fetch all profiles, passes, and registrations in pages
    const [profiles, passes, registrations, roleAssignments] = await Promise.all([
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("profiles")
          .select("id, email, full_name, mobile_number, participant_type, register_number, college_name, department, course, year_of_study, is_profile_completed, created_at")
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("delegate_passes")
          .select("id, user_id, pass_code, pass_tier, amount_paid, slots_used, status")
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("event_registrations")
          .select("id, user_id, slot_number, event:events(name), attendance(scanned_at)")
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("user_role_assignments")
          .select("user_id, role_id")
          .range(from, to)
      ),
    ]);

    const passMap = new Map<string, any>();
    (passes || []).forEach((p) => passMap.set(p.user_id, p));

    const regMap = new Map<string, any[]>();
    (registrations || []).forEach((r) => {
      const list = regMap.get(r.user_id) || [];
      list.push(r);
      regMap.set(r.user_id, list);
    });

    const roleMap = new Map<string, string[]>();
    (roleAssignments || []).forEach((ra) => {
      const list = roleMap.get(ra.user_id) || [];
      list.push(ra.role_id);
      roleMap.set(ra.user_id, list);
    });

    const headers = [
      "S.No",
      "Full Name",
      "Email",
      "Mobile",
      "Type",
      "Register No",
      "College / Dept",
      "Department",
      "Course & Year",
      "Profile Completed",
      "Pass Code",
      "Pass Tier",
      "Slots Used",
      "Amount Paid (INR)",
      "Slot 1 Event",
      "Slot 1 Attended",
      "Slot 2 Event",
      "Slot 2 Attended",
      "Roles",
      "Registered On",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [];
    (profiles || []).forEach((prof, idx) => {
      const pass = passMap.get(prof.id);
      const userRegs = regMap.get(prof.id) || [];
      const userRoles = roleMap.get(prof.id) || [];

      const slot1 = userRegs.find((r) => r.slot_number === 1);
      const slot2 = userRegs.find((r) => r.slot_number === 2);

      const slot1Attended = Array.isArray(slot1?.attendance) ? slot1.attendance.length > 0 : Boolean(slot1?.attendance);
      const slot2Attended = Array.isArray(slot2?.attendance) ? slot2.attendance.length > 0 : Boolean(slot2?.attendance);

      const row = [
        idx + 1,
        escapeCsv(prof.full_name || "Participant"),
        escapeCsv(prof.email || ""),
        escapeCsv(prof.mobile_number || ""),
        escapeCsv(prof.participant_type || "external"),
        escapeCsv(prof.register_number || ""),
        escapeCsv(prof.college_name || ""),
        escapeCsv(prof.department || ""),
        escapeCsv(`${prof.course || ""} Yr ${prof.year_of_study || ""}`),
        escapeCsv(prof.is_profile_completed ? "Yes" : "No"),
        escapeCsv(pass?.pass_code || "N/A"),
        escapeCsv(pass ? (pass.pass_tier === "pro_pass" ? "Pro Pass" : "Standard Pass") : "No Pass"),
        pass ? pass.slots_used : userRegs.length,
        pass ? pass.amount_paid : 0,
        escapeCsv((Array.isArray(slot1?.event) ? slot1?.event[0]?.name : slot1?.event?.name) || "None"),
        slot1 ? (slot1Attended ? "Yes" : "No") : "N/A",
        escapeCsv((Array.isArray(slot2?.event) ? slot2?.event[0]?.name : slot2?.event?.name) || "None"),
        slot2 ? (slot2Attended ? "Yes" : "No") : "N/A",
        escapeCsv(userRoles.join(", ") || "Participant"),
        escapeCsv(new Date(prof.created_at).toLocaleDateString()),
      ];
      rows.push(row.join(","));
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    return {
      success: true,
      csvContent,
      count: profiles?.length || 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to export CSV";
    return { success: false, error: msg, csvContent: "", count: 0 };
  }
}

/**
 * 12. Legacy User & Pass Query for Reports Page (Optimized: Orders omitted)
 */
export async function getAllUsersAndPassesAdmin() {
  try {
    const adminClient = await createAdminClient();

    // Fetch all profiles, passes, registrations, and roles in parallel (Omit orders)
    const [profiles, passes, registrations, roleAssignments] = await Promise.all([
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("delegate_passes")
          .select("*")
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("event_registrations")
          .select(`
            id,
            user_id,
            slot_number,
            registration_code,
            status,
            payment_status,
            event:events (
              id,
              name,
              slug,
              school_or_dept,
              is_pro_event,
              venue,
              event_date,
              start_time,
              category:event_categories (name)
            ),
            attendance (
              id,
              scanned_at
            )
          `)
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("user_role_assignments")
          .select("user_id, role_id")
          .range(from, to)
      ),
    ]);

    // Index related data by user_id
    const passMap = new Map<string, any>();
    (passes || []).forEach((pass) => {
      passMap.set(pass.user_id, pass);
    });

    const regMap = new Map<string, any[]>();
    (registrations || []).forEach((reg) => {
      const list = regMap.get(reg.user_id) || [];
      list.push(reg);
      regMap.set(reg.user_id, list);
    });

    const roleMap = new Map<string, string[]>();
    (roleAssignments || []).forEach((ra) => {
      const list = roleMap.get(ra.user_id) || [];
      list.push(ra.role_id);
      roleMap.set(ra.user_id, list);
    });

    // Assemble unified user list
    const users: AdminUserListItem[] = (profiles || []).map((prof) => {
      const pass = passMap.get(prof.id);
      const userRegs = regMap.get(prof.id) || [];
      const userRoles = roleMap.get(prof.id) || [];

      return {
        id: prof.id,
        fullName: prof.full_name || "Participant",
        email: prof.email || "",
        mobileNumber: prof.mobile_number || undefined,
        gender: prof.gender || undefined,
        participantType: (isKluParticipant(prof) ? "internal" : (prof.participant_type || "external")) as "internal" | "external",
        registerNumber: prof.register_number || undefined,
        collegeName: isKluParticipant(prof)
          ? (prof.college_name || "Kalasalingam Academy of Research and Education")
          : (prof.college_name || undefined),
        department: prof.department || undefined,
        course: prof.course || undefined,
        yearOfStudy: prof.year_of_study || undefined,
        city: prof.city || undefined,
        pincode: prof.pincode || undefined,
        needsAccommodation: Boolean(prof.needs_accommodation),
        isProfileCompleted: Boolean(prof.is_profile_completed),
        createdAt: prof.created_at,
        roles: userRoles,
        pass: pass
          ? {
              id: pass.id,
              passCode: pass.pass_code,
              passTier: pass.pass_tier,
              amountPaid: Number(pass.amount_paid || 0),
              slotsUsed: Number(pass.slots_used || userRegs.length),
              totalSlots: Number(pass.total_slots || 2),
              status: pass.status,
              createdAt: pass.created_at,
            }
          : null,
        registrations: userRegs.map((r) => {
          const isAttended = Array.isArray(r.attendance)
            ? r.attendance.length > 0
            : Boolean(r.attendance);
          const scannedAt = Array.isArray(r.attendance)
            ? r.attendance[0]?.scanned_at
            : (r.attendance as any)?.scanned_at;
          const evt = Array.isArray(r.event) ? r.event[0] : r.event;

          return {
            id: r.id,
            slotNumber: r.slot_number || 1,
            registrationCode: r.registration_code,
            status: r.status,
            paymentStatus: r.payment_status,
            isAttended,
            scannedAt,
            event: {
              id: evt?.id || "",
              name: evt?.name || "Competition",
              slug: evt?.slug || "",
              schoolOrDept: evt?.school_or_dept || "KARE",
              isProEvent: Boolean(evt?.is_pro_event),
              venue: evt?.venue || "Main Auditorium",
              eventDate: evt?.event_date || "",
              startTime: evt?.start_time || "",
              category: evt?.category?.name || "Track",
            },
          };
        }),
        orders: [],
      };
    });

    return { success: true, users };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch users";
    return { success: false, error: msg, users: [] };
  }
}

// 12b. Fetch All Cash Registration Requests for Admin
export async function getAllCashRequestsAdmin() {
  try {
    const adminClient = await createAdminClient();
    const data = await fetchAllSupabasePages((from, to) =>
      adminClient
        .from("cash_registration_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to)
    );
    return { success: true, cashRequests: data || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch cash registration requests";
    return { success: false, error: msg, cashRequests: [] };
  }
}

// 13. Update User Profile by Admin
export async function updateUserProfileAdmin(
  userId: string,
  data: {
    fullName?: string;
    gender?: string;
    mobileNumber?: string;
    registerNumber?: string;
    collegeName?: string;
    department?: string;
    course?: string;
    yearOfStudy?: number;
    participantType?: "internal" | "external";
  }
) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (data.fullName !== undefined) updatePayload.full_name = data.fullName;
    if (data.gender !== undefined) updatePayload.gender = data.gender ? data.gender.toLowerCase() : null;
    if (data.mobileNumber !== undefined) updatePayload.mobile_number = data.mobileNumber;
    if (data.registerNumber !== undefined) updatePayload.register_number = data.registerNumber;
    if (data.collegeName !== undefined) updatePayload.college_name = data.collegeName;
    if (data.department !== undefined) updatePayload.department = data.department;
    if (data.course !== undefined) updatePayload.course = data.course;
    if (data.yearOfStudy !== undefined) updatePayload.year_of_study = data.yearOfStudy;
    if (data.participantType !== undefined) updatePayload.participant_type = data.participantType;

    const { error } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (error) throw error;

    revalidateTag("admin-users");
    revalidatePath("/admin/users", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    return { success: false, error: msg };
  }
}

// 14. Assign or Revoke Role by Admin (Strict RBAC Hierarchy Enforced)
export async function updateUserRoleAdmin(
  userId: string,
  roleId: "admin" | "overall_coordinator" | "staff_coordinator" | "student_coordinator",
  action: "assign" | "revoke"
) {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 2) {
      return { success: false, error: "Unauthorized: Insufficient role assignment privileges" };
    }

    const adminClient = await createAdminClient();

    // Fetch target user's details & existing roles
    const [{ data: targetProfile }, { data: targetRoles }] = await Promise.all([
      adminClient.from("profiles").select("email, full_name").eq("id", userId).maybeSingle(),
      adminClient.from("user_role_assignments").select("role_id").eq("user_id", userId),
    ]);

    const isTargetSuperAdmin =
      targetProfile?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL ||
      (targetRoles || []).some((r) => r.role_id === "super_admin");

    // Rule 1: Super Admin is completely protected & immutable
    if (isTargetSuperAdmin) {
      return {
        success: false,
        error: "Security Restriction: Super Admin privileges are immutable and cannot be altered.",
      };
    }

    // Rule 2: Hierarchy Delegation Constraints
    // - Only Super Admin (Level 4) can assign/revoke 'admin' (Level 3)
    if (roleId === "admin" && authInfo.roleLevel < 4) {
      return {
        success: false,
        error: "Hierarchy Restriction: Only Super Admin (smithlivingston2005@gmail.com) can create or revoke Platform Administrators.",
      };
    }

    // - Only Admin or above (Level >= 3) can assign/revoke 'overall_coordinator' (Level 2)
    if (roleId === "overall_coordinator" && authInfo.roleLevel < 3) {
      return {
        success: false,
        error: "Hierarchy Restriction: Only Administrators or Super Admin can assign or revoke Overall Coordinators.",
      };
    }

    // - Only Admin or above (Level >= 3) can assign/revoke 'staff_coordinator' (Level 2)
    if (roleId === "staff_coordinator" && authInfo.roleLevel < 3) {
      return {
        success: false,
        error: "Hierarchy Restriction: Only Administrators or Super Admin can assign or revoke Staff Coordinators.",
      };
    }

    // - Only Staff Coordinator or above (Level >= 2) can assign/revoke 'student_coordinator' (Level 1)
    if (roleId === "student_coordinator" && authInfo.roleLevel < 2) {
      return {
        success: false,
        error: "Hierarchy Restriction: Only Staff Coordinators or above can assign or revoke Student Coordinators.",
      };
    }

    // Rule 3: Cannot modify a user whose highest role is equal to or higher than caller's level (unless Super Admin)
    const targetHighestLevel = Math.max(
      0,
      ...(targetRoles || []).map((r) => ROLE_HIERARCHY[r.role_id] || 0)
    );

    if (!authInfo.isSuperAdmin && targetHighestLevel >= authInfo.roleLevel) {
      return {
        success: false,
        error: "Hierarchy Restriction: Cannot modify roles for an account with equal or higher authority.",
      };
    }

    if (action === "assign") {
      const { error } = await adminClient
        .from("user_role_assignments")
        .upsert(
          {
            user_id: userId,
            role_id: roleId,
            assigned_by: authInfo.user.id,
          },
          { onConflict: "user_id,role_id" }
        );

      if (error) throw error;
    } else {
      const { error } = await adminClient
        .from("user_role_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", roleId);

      if (error) throw error;
    }

    revalidateTag("admin-users");
    revalidatePath("/admin/users", "page");
    revalidatePath("/admin/coordinators", "page");
    revalidatePath("/coordinator", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update role";
    return { success: false, error: msg };
  }
}

// 15. Quick Helpers for Overall Coordinator
export async function assignOverallCoordinatorAdmin(userId: string) {
  return updateUserRoleAdmin(userId, "overall_coordinator", "assign");
}

export async function revokeOverallCoordinatorAdmin(userId: string) {
  return updateUserRoleAdmin(userId, "overall_coordinator", "revoke");
}

// 16. Super Admin Telemetry & Dashboard Data
export async function getSuperAdminDashboardData() {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || !authInfo.isSuperAdmin) {
      return { success: false, error: "Unauthorized: Super Admin access required." };
    }

    const adminClient = await createAdminClient();

    // Fetch all admins, profiles, events, and telemetry
    const [
      { data: adminAssignments, error: aErr },
      { data: profiles, error: pErr },
      { count: eventsCount },
      { count: categoriesCount },
      { count: passesCount },
      finances,
    ] = await Promise.all([
      adminClient
        .from("user_role_assignments")
        .select("id, user_id, role_id, created_at, assigned_by")
        .in("role_id", ["admin", "super_admin"]),
      adminClient
        .from("profiles")
        .select("id, email, full_name, mobile_number, department, participant_type")
        .order("full_name", { ascending: true }),
      adminClient.from("events").select("*", { count: "exact", head: true }),
      adminClient.from("event_categories").select("*", { count: "exact", head: true }),
      adminClient.from("delegate_passes").select("*", { count: "exact", head: true }),
      getAdminFinancialTelemetry(),
    ]);

    if (aErr) {
      console.error("Super Admin adminAssignments error:", aErr);
      throw aErr;
    }
    if (pErr) {
      console.error("Super Admin profiles error:", pErr);
      throw pErr;
    }

    const totalRevenue = finances.totalRevenue;
    const ordersCount = finances.totalOrders;

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p) => {
      profileMap.set(p.id, p);
    });

    // Format admin list
    const admins = (adminAssignments || []).map((ra: any) => {
      const p = profileMap.get(ra.user_id);
      return {
        id: ra.id,
        userId: ra.user_id,
        roleId: ra.role_id,
        isRootSuperAdmin: p?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL,
        assignedAt: ra.created_at,
        email: p?.email || "",
        fullName: p?.full_name || "Admin",
        mobileNumber: p?.mobile_number || "",
        department: p?.department || "Operations",
        participantType: p?.participant_type || "internal",
      };
    });

    return {
      success: true,
      data: {
        superAdminEmail: SUPER_ADMIN_EMAIL,
        admins,
        allProfiles: profiles || [],
        telemetry: {
          eventsCount: eventsCount || 0,
          categoriesCount: categoriesCount || 0,
          usersCount: profiles?.length || 0,
          passesCount: passesCount || 0,
          ordersCount: ordersCount || 0,
          totalRevenue,
          paymentProvider: process.env.PAYMENT_PROVIDER || "easebuzz",
          easebuzzEnv: process.env.EASEBUZZ_ENV || "prod",
          easebuzzSubMerchantId: process.env.EASEBUZZ_SUB_MERCHANT_ID || "S123588RE82",
          baseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://euphoria.kalasalingam.ac.in",
        },
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Super Admin Dashboard Load Error:", err);
    return { success: false, error: msg };
  }
}

// 17. Super Admin Emergency Data Purge Action
export async function purgeDatabaseTestDataAdmin(confirmationPhrase: string) {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || !authInfo.isSuperAdmin) {
      return { success: false, error: "Unauthorized: Super Admin access required." };
    }

    if (confirmationPhrase !== `PURGE-TEST-DATA-${SUPER_ADMIN_EMAIL}`) {
      return { success: false, error: "Invalid confirmation phrase." };
    }

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient.rpc("fn_purge_test_data_preserve_events");

    if (error) throw error;

    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidatePath("/super-admin", "page");
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database purge failed";
    return { success: false, error: msg };
  }
}

// 18. Live Query Easebuzz Gateway Transaction Status
export async function checkEasebuzzLiveStatusAction(txnid: string) {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Admin access required." };
    }

    const cleanTxnid = (txnid || "").trim();
    if (!cleanTxnid) {
      return { success: false, error: "Transaction ID is required." };
    }

    const result = await checkEasebuzzTransactionStatus({ txnid: cleanTxnid });
    if (!result?.status || !result.msg) {
      return {
        success: false,
        error: result?.msg || "Transaction record not found on Easebuzz gateway.",
        raw: result,
      };
    }

    const m = result.msg;

    // Cross-reference database to check if user already possesses an active pass or another paid order
    let existingUserPass: {
      hasPass: boolean;
      passCode: string;
      passTier: string;
      orderNumber: string | null;
      userName: string;
    } | null = null;

    try {
      const adminClient = await createAdminClient();
      // Try to find user by order number (txnid)
      const { data: dbOrder } = await adminClient
        .from("orders")
        .select("id, user_id, order_number")
        .eq("order_number", cleanTxnid)
        .maybeSingle();

      let targetUserId = dbOrder?.user_id || m.udf1;

      // If user ID not found, try matching by email
      if (!targetUserId && m.email) {
        const { data: profByEmail } = await adminClient
          .from("profiles")
          .select("id, full_name")
          .eq("email", m.email)
          .maybeSingle();
        if (profByEmail) targetUserId = profByEmail.id;
      }

      if (targetUserId) {
        const [{ data: userPass }, { data: userProfile }, { data: userPaidOrders }] = await Promise.all([
          adminClient
            .from("delegate_passes")
            .select("id, pass_code, pass_tier, order_id, status")
            .eq("user_id", targetUserId)
            .eq("status", "active")
            .maybeSingle(),
          adminClient
            .from("profiles")
            .select("full_name")
            .eq("id", targetUserId)
            .maybeSingle(),
          adminClient
            .from("orders")
            .select("order_number")
            .eq("user_id", targetUserId)
            .eq("status", "paid")
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        if (userPass) {
          existingUserPass = {
            hasPass: true,
            passCode: userPass.pass_code,
            passTier: userPass.pass_tier,
            orderNumber: userPaidOrders?.[0]?.order_number || null,
            userName: userProfile?.full_name || m.firstname || "Participant",
          };
        }
      }
    } catch (crossRefErr) {
      console.error("Error cross-referencing user pass in checkEasebuzzLiveStatusAction:", crossRefErr);
    }

    return {
      success: true,
      data: {
        txnid: m.txnid || cleanTxnid,
        easepayid: m.easepayid || "N/A",
        status: (m.status || "").toLowerCase(),
        rawStatus: m.status,
        amount: Number(m.amount || 0),
        currency: "INR",
        customerName: m.firstname || "Participant",
        customerEmail: m.email || "N/A",
        customerPhone: m.phone || "N/A",
        mode: m.mode || "UPI",
        bankRefNum: m.bank_ref_num || "N/A",
        upiVa: m.upi_va || null,
        addedOn: m.addedon || "N/A",
        productInfo: m.productinfo || "Euphoria Pass",
        errorDesc: m.error_Message || m.error || "None",
        udf1_userId: m.udf1 || null,
        udf2_passTier: m.udf2 || null,
        udf3_events: m.udf3 || null,
        udf4_accommodation: m.udf4 || null,
        udf6_regnNo: m.udf6 || null,
        udf7_auditKey: m.udf7 || null,
        existingUserPass,
      },
      raw: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to query Easebuzz gateway";
    return { success: false, error: msg };
  }
}

// 19. Fetch Payment Issues, Discrepancies, and Orphaned Transactions
export async function getPaymentIssuesAndDiscrepanciesAdmin() {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized", issues: [], stats: {} };
    }

    const adminClient = await createAdminClient();

    const [allOrders, passes, profiles, { data: events }] = await Promise.all([
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("delegate_passes")
          .select("id, user_id, order_id, pass_code, pass_tier, amount_paid, status")
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("profiles")
          .select("id, full_name, email, mobile_number, register_number, college_name, department, participant_type, is_profile_completed")
          .range(from, to)
      ),
      adminClient.from("events").select("id, name, is_pro_event"),
    ]);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p) => profileMap.set(p.id, p));

    const passByOrderIdMap = new Map<string, any>();
    const userActivePassMap = new Map<string, any>();
    (passes || []).forEach((p) => {
      if (p.order_id) passByOrderIdMap.set(p.order_id, p);
      if (p.status === "active") userActivePassMap.set(p.user_id, p);
    });

    const orderByIdMap = new Map<string, any>();
    (allOrders || []).forEach((ord) => orderByIdMap.set(ord.id, ord));

    const eventMap = new Map<string, any>();
    (events || []).forEach((e) => eventMap.set(e.id, e));

    const issues: any[] = [];
    let paidMissingPassCount = 0;
    let attemptedPendingCount = 0;
    let failedCount = 0;
    let duplicateAttemptCount = 0;

    for (const ord of allOrders || []) {
      const user = profileMap.get(ord.user_id);
      let directPass = passByOrderIdMap.get(ord.id);
      const isPaid = ord.status === "paid";
      const isAttempted = ord.status === "attempted" || ord.status === "pending" || ord.status === "created";
      const isFailed = ord.status === "failed";

      // Fallback for legacy passes without order_id: only associate if order is paid
      if (!directPass && isPaid) {
        const candidate = userActivePassMap.get(ord.user_id);
        if (candidate && !candidate.order_id) {
          directPass = candidate;
        }
      }

      const otherPass = !directPass ? userActivePassMap.get(ord.user_id) : null;
      const otherOrder = otherPass?.order_id ? orderByIdMap.get(otherPass.order_id) : null;

      let issueType: "paid_without_pass" | "attempted_checkout" | "failed_payment" | "abandoned_duplicate_attempt" | null = null;
      let severity: "critical" | "warning" | "info" = "info";

      if (isPaid && !directPass && !otherPass) {
        issueType = "paid_without_pass";
        severity = "critical";
        paidMissingPassCount++;
      } else if (isAttempted) {
        if (otherPass) {
          issueType = "abandoned_duplicate_attempt";
          severity = "info";
          duplicateAttemptCount++;
        } else {
          issueType = "attempted_checkout";
          severity = "warning";
          attemptedPendingCount++;
        }
      } else if (isFailed) {
        if (otherPass) {
          issueType = "abandoned_duplicate_attempt";
          severity = "info";
          duplicateAttemptCount++;
        } else {
          issueType = "failed_payment";
          severity = "info";
          failedCount++;
        }
      }

      if (issueType) {
        // Resolve event titles for display
        const rawEventIds = ord.metadata?.event_ids || [];
        const eventNames = Array.isArray(rawEventIds)
          ? rawEventIds.map((eid: string) => eventMap.get(eid)?.name || eid).join(", ")
          : (ord.metadata?.event_names || ord.metadata?.udf3 || "Not specified");

        const meta = ord.metadata || {};
        const fallbackName = meta.user_name || meta.customer_name || meta.name || meta.udf6_candidate_id || "Participant";
        const fallbackEmail = meta.email || meta.customer_email || meta.user_email || "N/A";
        const fallbackPhone = meta.phone || meta.customer_phone || meta.user_phone || "N/A";
        const fallbackRegn = meta.register_number || meta.candidate_regn || meta.udf6 || "N/A";

        issues.push({
          id: ord.id,
          orderNumber: ord.order_number,
          txnid: ord.order_number,
          easebuzzPayId: ord.metadata?.easebuzz_pay_id || ord.gateway_payment_id || null,
          amount: Number(ord.amount || 0),
          status: ord.status,
          issueType,
          severity,
          createdAt: ord.created_at,
          eventNames,
          metadata: meta,
          user: {
            id: ord.user_id,
            fullName: user?.full_name || fallbackName,
            email: user?.email || fallbackEmail,
            mobileNumber: user?.mobile_number || fallbackPhone,
            registerNumber: user?.register_number || fallbackRegn,
            collegeName: user?.college_name || "KARE",
            department: user?.department || "N/A",
          },
          pass: directPass || null,
          userOtherPass: otherPass
            ? {
                passCode: otherPass.pass_code,
                passTier: otherPass.pass_tier,
                otherOrderNumber: otherOrder?.order_number || null,
              }
            : null,
        });
      }
    }

    return {
      success: true,
      issues,
      stats: {
        totalIssues: issues.length,
        paidMissingPassCount,
        attemptedPendingCount,
        failedCount,
        duplicateAttemptCount,
        totalPassesIssued: passes?.length || 0,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load payment issues";
    console.error("getPaymentIssuesAndDiscrepanciesAdmin error:", msg);
    return { success: false, error: msg, issues: [], stats: {} };
  }
}

// 20. Admin Action: One-Click Resolve Payment and Issue Pass
export async function resolvePaymentAndIssuePassAction(params: {
  userId: string;
  txnid: string;
  easepayid?: string;
  amount?: number;
  eventIds?: string[];
  forceBypassGatewayCheck?: boolean;
  adminNote?: string;
}) {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const { userId, txnid, easepayid, amount, eventIds, forceBypassGatewayCheck, adminNote } = params;

    if (!userId || !txnid) {
      return { success: false, error: "User ID and Transaction ID (txnid) are required." };
    }

    const adminClient = await createAdminClient();

    // Verify user profile exists
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: "Participant profile not found in database." };
    }

    // Check if user already has an active pass
    const { data: existingPass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingPass) {
      return {
        success: false,
        error: `User already possesses an active festival pass (${existingPass.pass_code}).`,
      };
    }

    // Find any existing order with this txnid
    const { data: existingOrder } = await adminClient
      .from("orders")
      .select("*")
      .eq("order_number", txnid)
      .maybeSingle();

    let verifiedAmount = Number(amount || existingOrder?.amount || 200);
    let verifiedEasepayid = easepayid || existingOrder?.metadata?.easebuzz_pay_id || existingOrder?.gateway_payment_id || null;
    let verifiedBankRef = existingOrder?.metadata?.bank_ref_num || null;
    let verifiedMode = existingOrder?.metadata?.mode || "UPI";

    // Gateway verification check (unless forced bypass by super admin)
    if (!forceBypassGatewayCheck) {
      const liveCheck = await checkEasebuzzTransactionStatus({ txnid });
      if (!liveCheck?.status || !liveCheck.msg) {
        return {
          success: false,
          error: `Easebuzz API Verification Failed: ${liveCheck?.msg || "Transaction record not found on Easebuzz."} To force issue, enable admin override.`,
        };
      }

      const ebz = liveCheck.msg;
      const statusLower = (ebz.status || "").toLowerCase();
      if (statusLower !== "success") {
        return {
          success: false,
          error: `Easebuzz Gateway reports status: "${ebz.status || "Failed"}". Payment has not succeeded at gateway.`,
        };
      }

      verifiedAmount = Number(ebz.amount || verifiedAmount);
      verifiedEasepayid = ebz.easepayid || verifiedEasepayid;
      verifiedBankRef = ebz.bank_ref_num || verifiedBankRef;
      verifiedMode = ebz.mode || verifiedMode;
    }

    // Resolve event IDs: provided > order metadata > live udf3 > fallback
    let targetEvents: string[] = [];
    if (eventIds && eventIds.length > 0) {
      targetEvents = await resolveEventIds(eventIds, adminClient);
    } else if (existingOrder?.metadata?.event_ids) {
      targetEvents = await resolveEventIds(existingOrder.metadata.event_ids, adminClient);
    } else if (existingOrder?.metadata?.event_names) {
      targetEvents = await resolveEventIds(existingOrder.metadata.event_names, adminClient);
    }

    // If still no events resolved, fetch 2 popular/open non-pro events as fallback so pass can be issued
    if (targetEvents.length === 0) {
      const { data: fallbackEvents } = await adminClient
        .from("events")
        .select("id")
        .eq("is_pro_event", false)
        .eq("status", "published")
        .limit(2);

      if (fallbackEvents && fallbackEvents.length > 0) {
        targetEvents = fallbackEvents.map((e) => e.id);
      }
    }

    if (targetEvents.length === 0) {
      return {
        success: false,
        error: "Cannot resolve event slots for pass. Please select 2 events in the resolution form.",
      };
    }

    const needsAccomm = Boolean(existingOrder?.metadata?.needs_accommodation);

    // Call atomic checkout RPC
    const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: userId,
        p_event_ids: targetEvents,
        p_payment_provider: "easebuzz",
        p_order_metadata: {
          easebuzz_pay_id: verifiedEasepayid,
          easebuzz_txnid: txnid,
          bank_ref_num: verifiedBankRef,
          mode: verifiedMode,
          source: "admin_resolution_hub",
          resolved_by: authInfo.user.email,
          admin_note: adminNote || "Admin resolved payment issue",
          actual_amount_paid: verifiedAmount,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (checkoutError || !checkoutData?.success) {
      return {
        success: false,
        error: checkoutData?.message || checkoutError?.message || "Atomic pass generation failed.",
      };
    }

    // Clean up previous attempted order row with this txnid to keep exactly 1 order row
    if (existingOrder?.id && existingOrder.id !== checkoutData.order_id) {
      try {
        await adminClient.from("orders").delete().eq("id", existingOrder.id);
      } catch (delErr) {
        console.warn("Notice: cleaning prior order row:", delErr);
      }
    }

    // Update official order with exact transaction keys
    await adminClient.from("orders").update({
      order_number: txnid,
      gateway_order_id: txnid,
      gateway_payment_id: verifiedEasepayid,
      amount: verifiedAmount,
      status: "paid",
      metadata: {
        ...existingOrder?.metadata,
        easebuzz_pay_id: verifiedEasepayid,
        easebuzz_txnid: txnid,
        bank_ref_num: verifiedBankRef,
        mode: verifiedMode,
        source: "admin_resolution_hub",
        resolved_by: authInfo.user.email,
        admin_note: adminNote || "Manually resolved by Admin",
        timestamp: new Date().toISOString(),
      },
    }).eq("id", checkoutData.order_id);

    if (needsAccomm) {
      await adminClient.from("profiles").update({ needs_accommodation: true }).eq("id", userId);
    }

    await invalidateFinancialTelemetryCache();
    revalidateTag("public-events");
    revalidatePath("/admin/payments", "page");
    revalidatePath("/admin/users", "page");
    revalidatePath("/dashboard", "page");
    revalidatePath("/dashboard/passes", "page");

    return {
      success: true,
      passCode: checkoutData.pass_code,
      passTier: checkoutData.pass_tier,
      message: `Pass ${checkoutData.pass_code} issued successfully for ${profile.full_name}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resolve payment and issue pass";
    console.error("resolvePaymentAndIssuePassAction error:", msg);
    return { success: false, error: msg };
  }
}

// 21. Admin Action: Batch Reconcile All Attempted Orders
export async function batchReconcileAttemptedOrdersAction() {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const adminClient = await createAdminClient();

    // Find all attempted / pending orders from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: attemptedOrders } = await adminClient
      .from("orders")
      .select("*")
      .in("status", ["attempted", "pending", "created"])
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false });

    if (!attemptedOrders || attemptedOrders.length === 0) {
      return {
        success: true,
        scannedCount: 0,
        resolvedCount: 0,
        stillPendingCount: 0,
        message: "No pending or attempted checkout orders found in the last 7 days.",
      };
    }

    let resolvedCount = 0;
    let stillPendingCount = 0;
    const resolvedDetails: any[] = [];

    for (const ord of attemptedOrders) {
      const txnid = ord.order_number;
      if (!txnid) continue;

      // Check live status on Easebuzz v2 API
      const checkRes = await checkEasebuzzTransactionStatus({ txnid });
      if (!checkRes?.status || !checkRes.msg) {
        stillPendingCount++;
        continue;
      }

      const ebz = checkRes.msg;
      const isSuccess = (ebz.status || "").toLowerCase() === "success";

      if (isSuccess) {
        // Resolve event IDs
        const rawEvents = ord.metadata?.event_ids || ord.metadata?.event_names || ebz.udf3;
        const resolvedEventIds = await resolveEventIds(rawEvents, adminClient);

        if (resolvedEventIds.length > 0) {
          const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
            "fn_checkout_pass_atomic",
            {
              p_user_id: ord.user_id,
              p_event_ids: resolvedEventIds,
              p_payment_provider: "easebuzz",
              p_order_metadata: {
                easebuzz_pay_id: ebz.easepayid,
                easebuzz_txnid: txnid,
                bank_ref_num: ebz.bank_ref_num,
                mode: ebz.mode,
                source: "admin_batch_reconciler",
                resolved_by: authInfo.user.email,
                actual_amount_paid: Number(ebz.amount || ord.amount || 200),
                timestamp: new Date().toISOString(),
              },
            }
          );

          if (!checkoutError && checkoutData?.success && checkoutData.order_id) {
            // Clean up attempted row
            try {
              await adminClient.from("orders").delete().eq("id", ord.id);
            } catch (delErr) {
              console.warn("Notice: cleaning attempted row:", delErr);
            }

            await adminClient.from("orders").update({
              order_number: txnid,
              gateway_order_id: txnid,
              gateway_payment_id: ebz.easepayid || null,
              amount: Number(ebz.amount || ord.amount || 200),
              status: "paid",
              metadata: {
                ...ord.metadata,
                easebuzz_pay_id: ebz.easepayid,
                easebuzz_txnid: txnid,
                bank_ref_num: ebz.bank_ref_num,
                mode: ebz.mode,
                source: "admin_batch_reconciler",
                timestamp: new Date().toISOString(),
              },
            }).eq("id", checkoutData.order_id);

            resolvedCount++;
            resolvedDetails.push({
              txnid,
              easepayid: ebz.easepayid,
              userId: ord.user_id,
              passCode: checkoutData.pass_code,
              amount: ebz.amount,
            });
          }
        }
      } else if (
        (ebz.status || "").toLowerCase() === "failed" ||
        (ebz.status || "").toLowerCase() === "usercancelled"
      ) {
        await adminClient.from("orders").update({
          status: "failed",
          metadata: { ...ord.metadata, easebuzz_status: ebz.status, updated_at: new Date().toISOString() },
        }).eq("id", ord.id);
      } else {
        stillPendingCount++;
      }
    }

    await invalidateFinancialTelemetryCache();
    revalidateTag("public-events");
    revalidatePath("/admin/payments", "page");
    revalidatePath("/admin/users", "page");

    return {
      success: true,
      scannedCount: attemptedOrders.length,
      resolvedCount,
      stillPendingCount,
      resolvedOrders: resolvedDetails,
      message: `Scanned ${attemptedOrders.length} attempted orders. Successfully auto-reconciled and issued ${resolvedCount} passes!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Batch reconciliation error";
    console.error("batchReconcileAttemptedOrdersAction error:", msg);
    return { success: false, error: msg };
  }
}

// 22. Search Participant with Profiles, Passes, Registrations & Orders for Manual Reconcile
export async function searchParticipantForPaymentReconcile(query: string) {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || (!authInfo.isAdmin && !authInfo.isSuperAdmin)) {
      return { success: false, error: "Unauthorized", participants: [] };
    }

    const cleanQ = (query || "").trim();
    if (!cleanQ) return { success: true, participants: [] };

    const adminClient = await createAdminClient();

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("*")
      .or(`email.ilike.%${cleanQ}%,full_name.ilike.%${cleanQ}%,mobile_number.ilike.%${cleanQ}%,register_number.ilike.%${cleanQ}%`)
      .limit(10);

    if (!profiles || profiles.length === 0) {
      return { success: true, participants: [] };
    }

    const userIds = profiles.map((p) => p.id);

    const [
      { data: passes },
      { data: orders },
      { data: registrations },
      { data: allEvents },
    ] = await Promise.all([
      adminClient.from("delegate_passes").select("*").in("user_id", userIds),
      adminClient.from("orders").select("*").in("user_id", userIds).order("created_at", { ascending: false }),
      adminClient.from("event_registrations").select("*, events(name, is_pro_event)").in("user_id", userIds),
      adminClient.from("events").select("id, name, is_pro_event").eq("status", "published"),
    ]);

    const passMap = new Map<string, any>();
    (passes || []).forEach((p) => passMap.set(p.user_id, p));

    const ordersByUser = new Map<string, any[]>();
    (orders || []).forEach((o) => {
      const list = ordersByUser.get(o.user_id) || [];
      list.push(o);
      ordersByUser.set(o.user_id, list);
    });

    const regsByUser = new Map<string, any[]>();
    (registrations || []).forEach((r) => {
      const list = regsByUser.get(r.user_id) || [];
      list.push(r);
      regsByUser.set(r.user_id, list);
    });

    const results = profiles.map((p) => ({
      profile: p,
      pass: passMap.get(p.id) || null,
      orders: ordersByUser.get(p.id) || [],
      registrations: regsByUser.get(p.id) || [],
    }));

    return {
      success: true,
      participants: results,
      availableEvents: (allEvents || []).map((e) => ({ id: e.id, name: e.name, isPro: e.is_pro_event })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return { success: false, error: msg, participants: [] };
  }
}

export interface AdminEventSlotControlItem {
  id: string;
  name: string;
  slug: string;
  school_or_dept: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  participant_limit: number;
  internal_limit: number | null;
  allow_internal: boolean;
  allow_external: boolean;
  first_preference_only: boolean;
  is_pro_event: boolean;
  status: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  total_confirmed: number;
  internal_confirmed: number;
  external_confirmed: number;
  is_total_full: boolean;
  is_internal_full: boolean;
  is_klu_blocked: boolean;
  remaining_total_slots: number;
  remaining_internal_slots: number | null;
  remaining_external_reserved: number;
}

async function fetchEventsSlotControlAdminRaw() {
  const adminClient = await createAdminClient();

  // 1. Fetch all events with categories (resilient to first_preference_only column presence)
  let allEventsList: any[] = [];
  const { data: eventsWithCol, error: colErr } = await adminClient
    .from("events")
    .select(`
      id,
      name,
      slug,
      school_or_dept,
      venue,
      event_date,
      start_time,
      end_time,
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
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })
    .order("name", { ascending: true });

  if (colErr) {
    // Graceful fallback if migration column is not yet executed in Supabase
    const { data: eventsFallback, error: fallbackErr } = await adminClient
      .from("events")
      .select(`
        id,
        name,
        slug,
        school_or_dept,
        venue,
        event_date,
        start_time,
        end_time,
        participant_limit,
        internal_limit,
        allow_internal,
        allow_external,
        is_pro_event,
        status,
        category:event_categories (
          id,
          name,
          slug
        )
      `)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true })
      .order("name", { ascending: true });

    if (fallbackErr) throw fallbackErr;
    allEventsList = eventsFallback || [];
  } else {
    allEventsList = eventsWithCol || [];
  }
  const eventIds = allEventsList.map((e) => e.id);

  // 2. Fetch pre-aggregated event stats directly from DB view (Zero-Egress Overhead)
  const { data: statsList } = await adminClient
    .from("vw_public_events_stats")
    .select("event_id, total_registered, internal_registered")
    .in("event_id", eventIds);

  // Aggregate counts per event
  const internalCounts: Record<string, number> = {};
  const totalCounts: Record<string, number> = {};

  (statsList || []).forEach((s: any) => {
    totalCounts[s.event_id] = Number(s.total_registered || 0);
    internalCounts[s.event_id] = Number(s.internal_registered || 0);
  });

  let kluBlockedCount = 0;
  let fullCapacityCount = 0;
  let totalCapSum = 0;
  let totalConfirmedSum = 0;
  let totalInternalSum = 0;
  let totalExternalSum = 0;

  const formattedEvents: AdminEventSlotControlItem[] = allEventsList.map((evt) => {
    const totalConfirmed = totalCounts[evt.id] || 0;
    const internalConfirmed = internalCounts[evt.id] || 0;
    const externalConfirmed = Math.max(0, totalConfirmed - internalConfirmed);

    const partLimit = Number(evt.participant_limit || 100);
    const intLimit = evt.internal_limit !== null && evt.internal_limit !== undefined ? Number(evt.internal_limit) : null;
    const allowInt = evt.allow_internal !== false;
    const allowExt = evt.allow_external !== false;

    const isTotalFull = totalConfirmed >= partLimit;
    const isIntFull = intLimit !== null ? internalConfirmed >= intLimit : false;
    const isKluBlocked = !allowInt || isIntFull;

    const remainingTotal = Math.max(0, partLimit - totalConfirmed);
    const remainingInternal = intLimit !== null ? Math.max(0, intLimit - internalConfirmed) : null;
    const remainingExternal = isKluBlocked ? remainingTotal : remainingTotal;

    if (isKluBlocked) kluBlockedCount++;
    if (isTotalFull) fullCapacityCount++;
    totalCapSum += partLimit;
    totalConfirmedSum += totalConfirmed;
    totalInternalSum += internalConfirmed;
    totalExternalSum += externalConfirmed;

    const catObj = Array.isArray(evt.category) ? evt.category[0] : evt.category;

    return {
      id: evt.id,
      name: evt.name,
      slug: evt.slug,
      school_or_dept: evt.school_or_dept,
      venue: evt.venue,
      event_date: evt.event_date,
      start_time: evt.start_time,
      end_time: evt.end_time,
      participant_limit: partLimit,
      internal_limit: intLimit,
      allow_internal: allowInt,
      allow_external: allowExt,
      first_preference_only: Boolean(evt.first_preference_only),
      is_pro_event: Boolean(evt.is_pro_event),
      status: evt.status,
      category: catObj || null,
      total_confirmed: totalConfirmed,
      internal_confirmed: internalConfirmed,
      external_confirmed: externalConfirmed,
      is_total_full: isTotalFull,
      is_internal_full: isIntFull,
      is_klu_blocked: isKluBlocked,
      remaining_total_slots: remainingTotal,
      remaining_internal_slots: remainingInternal,
      remaining_external_reserved: remainingExternal,
    };
  });

  return {
    success: true,
    events: formattedEvents,
    stats: {
      totalEvents: formattedEvents.length,
      kluBlockedEvents: kluBlockedCount,
      fullCapacityEvents: fullCapacityCount,
      totalCapacity: totalCapSum,
      totalConfirmed: totalConfirmedSum,
      totalInternalConfirmed: totalInternalSum,
      totalExternalConfirmed: totalExternalSum,
    },
  };
}

const getCachedEventsSlotControlRaw = unstable_cache(
  async () => fetchEventsSlotControlAdminRaw(),
  ["admin-events-slot-control-cache-v1"],
  {
    revalidate: 30, // 30s cache
    tags: ["admin-slot-controls", "admin-events", "public-events"],
  }
);

/**
 * Fetches all events with detailed slot capacity, KLU vs External breakdown, and quota status
 */
export async function getEventsSlotControlAdmin(): Promise<{
  success: boolean;
  error?: string;
  events: AdminEventSlotControlItem[];
  stats: {
    totalEvents: number;
    kluBlockedEvents: number;
    fullCapacityEvents: number;
    totalCapacity: number;
    totalConfirmed: number;
    totalInternalConfirmed: number;
    totalExternalConfirmed: number;
  };
}> {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return {
        success: false,
        error: "Unauthorized. Admin privileges required.",
        events: [],
        stats: {
          totalEvents: 0,
          kluBlockedEvents: 0,
          fullCapacityEvents: 0,
          totalCapacity: 0,
          totalConfirmed: 0,
          totalInternalConfirmed: 0,
          totalExternalConfirmed: 0,
        },
      };
    }

    return await getCachedEventsSlotControlRaw();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load event slot controls";
    return {
      success: false,
      error: msg,
      events: [],
      stats: {
        totalEvents: 0,
        kluBlockedEvents: 0,
        fullCapacityEvents: 0,
        totalCapacity: 0,
        totalConfirmed: 0,
        totalInternalConfirmed: 0,
        totalExternalConfirmed: 0,
      },
    };
  }
}

/**
 * Updates slot limits and KLU/External eligibility toggles for an event
 */
export async function updateEventSlotControlAdmin(params: {
  eventId: string;
  participant_limit?: number;
  internal_limit?: number | null;
  allow_internal?: boolean;
  allow_external?: boolean;
  first_preference_only?: boolean;
  autoBlockInternalOnExpand?: boolean;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  updatedEvent?: any;
}> {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch current event
    const { data: currentEvent, error: currentErr } = await adminClient
      .from("events")
      .select("id, name, participant_limit, internal_limit, allow_internal, allow_external")
      .eq("id", params.eventId)
      .single();

    if (currentErr || !currentEvent) {
      return { success: false, error: "Event not found" };
    }

    const updates: Record<string, any> = {};

    if (params.participant_limit !== undefined) {
      const newLimit = Math.max(1, Math.min(1000, Number(params.participant_limit)));
      updates.participant_limit = newLimit;

      // If expanding slots and admin chose to reserve expanded slots for externals:
      if (params.autoBlockInternalOnExpand) {
        // Query current confirmed internal count for this event
        const { data: internalRegs } = await adminClient
          .from("event_registrations")
          .select(`
            id,
            user:profiles (
              email,
              participant_type
            )
          `)
          .eq("event_id", params.eventId)
          .eq("status", "confirmed");

        let currentInternalCount = 0;
        (internalRegs || []).forEach((r: any) => {
          const userObj = Array.isArray(r.user) ? r.user[0] : r.user;
          const email = (userObj?.email || "").toLowerCase();
          if (userObj?.participant_type === "internal" || email.endsWith("@klu.ac.in")) {
            currentInternalCount++;
          }
        });

        // Set internal_limit to current internal count
        updates.internal_limit = currentInternalCount;
      }
    }

    if (params.internal_limit !== undefined) {
      updates.internal_limit = params.internal_limit === null ? null : Math.max(0, Number(params.internal_limit));
    }

    if (params.allow_internal !== undefined) {
      updates.allow_internal = Boolean(params.allow_internal);
    }

    if (params.allow_external !== undefined) {
      updates.allow_external = Boolean(params.allow_external);
    }

    if (params.first_preference_only !== undefined) {
      updates.first_preference_only = Boolean(params.first_preference_only);
    }

    // 2. Perform DB update
    const { data: updated, error: updateErr } = await adminClient
      .from("events")
      .update(updates)
      .eq("id", params.eventId)
      .select()
      .single();

    if (updateErr) {
      if (updateErr.message?.includes("first_preference_only") || updateErr.code === "PGRST204") {
        return {
          success: false,
          error: "Database migration pending: Please execute migration '20260915000011_add_first_preference_only.sql' in your Supabase SQL Editor to enable this column.",
        };
      }
      throw updateErr;
    }

    // 3. Multi-role Cache Invalidation to guarantee atomic UI updates across users, coordinators, and admins
    revalidateTag("admin-slot-controls");
    revalidateTag("admin-events");
    revalidateTag("public-events");
    revalidatePath("/events");
    revalidatePath("/coordinator");
    revalidatePath(`/coordinator/${params.eventId}`);
    revalidatePath("/admin/events");
    revalidatePath("/admin/events/slots");

    return {
      success: true,
      message: `Slot control updated for "${currentEvent.name}".`,
      updatedEvent: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update slot controls";
    return { success: false, error: msg };
  }
}

/**
 * Bulk updates slot controls across multiple events
 */
export async function bulkUpdateEventSlotControlAdmin(params: {
  eventIds: string[];
  action: "reserve_for_externals" | "unblock_klu" | "block_klu" | "increase_capacity" | "enable_first_pref" | "disable_first_pref";
  increaseBy?: number;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  affectedCount?: number;
}> {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    if (!params.eventIds || params.eventIds.length === 0) {
      return { success: false, error: "No events selected." };
    }

    const adminClient = await createAdminClient();

    if (params.action === "block_klu") {
      const { error } = await adminClient
        .from("events")
        .update({ allow_internal: false })
        .in("id", params.eventIds);

      if (error) throw error;
    } else if (params.action === "unblock_klu") {
      const { error } = await adminClient
        .from("events")
        .update({ allow_internal: true, internal_limit: null })
        .in("id", params.eventIds);

      if (error) throw error;
    } else if (params.action === "enable_first_pref") {
      const { error } = await adminClient
        .from("events")
        .update({ first_preference_only: true })
        .in("id", params.eventIds);

      if (error) throw error;
    } else if (params.action === "disable_first_pref") {
      const { error } = await adminClient
        .from("events")
        .update({ first_preference_only: false })
        .in("id", params.eventIds);

      if (error) throw error;
    } else if (params.action === "reserve_for_externals") {
      // For each event, set internal_limit to current internal registration count from pre-aggregated view
      const { data: statsList } = await adminClient
        .from("vw_public_events_stats")
        .select("event_id, internal_registered")
        .in("event_id", params.eventIds);

      const internalCounts: Record<string, number> = {};
      (statsList || []).forEach((s: any) => {
        internalCounts[s.event_id] = Number(s.internal_registered || 0);
      });

      for (const eId of params.eventIds) {
        const currentIntCount = internalCounts[eId] || 0;
        await adminClient
          .from("events")
          .update({ internal_limit: currentIntCount })
          .eq("id", eId);
      }
    } else if (params.action === "increase_capacity") {
      const delta = Math.max(1, params.increaseBy || 10);
      const { data: evts } = await adminClient
        .from("events")
        .select("id, participant_limit")
        .in("id", params.eventIds);

      for (const e of evts || []) {
        await adminClient
          .from("events")
          .update({ participant_limit: (e.participant_limit || 100) + delta })
          .eq("id", e.id);
      }
    }

    revalidateTag("admin-slot-controls");
    revalidateTag("admin-events");
    revalidateTag("public-events");
    revalidatePath("/events");
    revalidatePath("/coordinator");
    revalidatePath("/admin/events");
    revalidatePath("/admin/events/slots");

    return {
      success: true,
      message: `Successfully updated ${params.eventIds.length} event(s).`,
      affectedCount: params.eventIds.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bulk slot update failed";
    return { success: false, error: msg };
  }
}

// ==============================================================================
// SCANNER MANAGEMENT & SECTION-BASED ATTENDANCE CONTROLS
// ==============================================================================

export interface EventScannerItem {
  id: string;
  name: string;
  slug: string;
  school_or_dept: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  is_two_day: boolean;
  total_registered: number;
  scanner_status: "active" | "paused" | "closed";
  total_sections: number;
  current_section: number;
  section_labels: string[];
  allow_staff_switch: boolean;
  allow_early_scan?: boolean;
  section_counts: Record<number, number>;
}

export interface ScannerOverviewData {
  masterEnabled: boolean;
  operatingMode: "open_all" | "section_managed" | "locked";
  globalDateBypass?: boolean;
  events: EventScannerItem[];
  metrics: {
    totalEvents: number;
    activeScanners: number;
    pausedScanners: number;
    closedScanners: number;
    twoDayEventsCount: number;
    totalAttendanceRecords: number;
    morningAttendanceTotal: number;
    afternoonAttendanceTotal: number;
  };
}

// Known 2-day events
const TWO_DAY_EVENT_SLUGS = new Set([
  "archathon-24",
  "skyforge-2026-revolutionizing-the-industry-with-smart-uavs",
  "smart-city-innovation-for-a-sustainable-future",
  "bot-velocity-engineered-to-race",
  "draft-kings-a-cad-contest",
  "wonders-of-ai-40",
  "hack-odyssey-40",
  "chipcraft-30",
  "qnx-world",
  "accfinthon",
  "biogrant-x-from-problems-to-proposals",
  "techdetective-20",
]);

// In-memory fallback cache for scanner controls if table is not yet migrated in Supabase
const memoryScannerControlsCache: Map<string, {
  current_section: number;
  scanner_status: "active" | "paused" | "closed";
  total_sections: number;
  section_labels: string[];
  allow_staff_switch: boolean;
  allow_early_scan?: boolean;
}> = new Map();

let memoryGlobalScannerMaster = true;
let memoryGlobalOperatingMode: "open_all" | "section_managed" | "locked" = "section_managed";
let memoryGlobalDateBypass = false;

/**
 * Low-level Raw Fetch for Scanner Overview (Optimized Egress Guard)
 */
async function fetchAdminScannerOverviewRaw(): Promise<ScannerOverviewData> {
  const adminClient = await createAdminClient();

  // 1. Fetch cached master events (0 DB queries if already in Vercel Data Cache)
  const { events: rawEvents } = await getCachedAllEventsAdmin();
  const allEvents = rawEvents || [];

  // 2. Fetch scanner controls (with table fallback)
  let controlsMap: Record<string, any> = {};
  try {
    const { data: controls } = await adminClient
      .from("event_scanner_controls")
      .select("event_id, scanner_status, total_sections, current_section, section_labels, allow_staff_switch, allow_early_scan");
    if (controls) {
      controls.forEach((c: any) => {
        controlsMap[c.event_id] = c;
      });
    }
  } catch {
    // Table not created yet, will use memory / default
  }

  // 3. Fetch global scanner settings
  let masterEnabled = memoryGlobalScannerMaster;
  let operatingMode = memoryGlobalOperatingMode;
  let globalDateBypass = memoryGlobalDateBypass;
  try {
    const { data: globalSettings } = await adminClient
      .from("global_scanner_settings")
      .select("master_scanner_enabled, operating_mode, test_mode_bypass")
      .eq("id", "global_config")
      .maybeSingle();
    if (globalSettings) {
      masterEnabled = globalSettings.master_scanner_enabled ?? true;
      operatingMode = globalSettings.operating_mode || "section_managed";
      globalDateBypass = Boolean(globalSettings.test_mode_bypass || operatingMode === "open_all" || memoryGlobalDateBypass);
    }
  } catch {
    // fallback
  }

  // 4. Fetch lightweight attendance records across all pages (un-truncated)
  const { count: totalAttendanceExact } = await adminClient
    .from("attendance")
    .select("*", { count: "exact", head: true });

  const pageSize = 1000;
  const totalRecs = totalAttendanceExact || 0;
  const pageCount = Math.max(1, Math.ceil(totalRecs / pageSize));
  const attendanceQueries = [];
  for (let i = 0; i < pageCount; i++) {
    const from = i * pageSize;
    const to = from + pageSize - 1;
    attendanceQueries.push(
      adminClient
        .from("attendance")
        .select("event_id, section_number, scan_method")
        .range(from, to)
    );
  }

  const attendanceBatchResults = await Promise.all(attendanceQueries);
  const attendanceRows = attendanceBatchResults.flatMap((r) => r.data || []);

  // Map attendance to event & section
  const eventAttendanceMap: Record<string, Record<number, number>> = {};
  let totalAttendanceCount = 0;
  let morningTotal = 0;
  let afternoonTotal = 0;

  attendanceRows.forEach((row: any) => {
    totalAttendanceCount++;
    const eId = row.event_id;
    if (!eId) return;
    if (!eventAttendanceMap[eId]) {
      eventAttendanceMap[eId] = { 1: 0, 2: 0, 3: 0, 4: 0 };
    }

    let secNum = 1;
    if (row.section_number && typeof row.section_number === "number") {
      secNum = row.section_number;
    } else if (typeof row.scan_method === "string") {
      const match = row.scan_method.match(/sec_(\d+)/);
      if (match) {
        secNum = parseInt(match[1], 10);
      }
    }

    eventAttendanceMap[eId][secNum] = (eventAttendanceMap[eId][secNum] || 0) + 1;

    if (secNum === 1 || secNum === 3) morningTotal++;
    else if (secNum === 2 || secNum === 4) afternoonTotal++;
  });

  // 5. Lean Registration Count via Pre-Aggregated View (61 rows instead of 10,761 rows!)
  const regCounts: Record<string, number> = {};
  try {
    const { data: viewStats } = await adminClient
      .from("vw_public_events_stats")
      .select("event_id, total_registered");
    if (viewStats && viewStats.length > 0) {
      viewStats.forEach((s: any) => {
        regCounts[s.event_id] = Number(s.total_registered || 0);
      });
    }
  } catch {
    // Fallback if view is pending
  }

  // 6. Build enriched event scanner items
  let activeScannersCount = 0;
  let pausedScannersCount = 0;
  let closedScannersCount = 0;
  let twoDayCount = 0;

  const enrichedEvents: EventScannerItem[] = allEvents.map((evt: any) => {
    const isTwoDay = TWO_DAY_EVENT_SLUGS.has(evt.slug) || evt.rules?.toLowerCase().includes("2-day") || evt.description?.toLowerCase().includes("24-hour");
    if (isTwoDay) twoDayCount++;

    const dbCtrl = controlsMap[evt.id];
    const memCtrl = memoryScannerControlsCache.get(evt.id);

    const totalSec = dbCtrl?.total_sections ?? memCtrl?.total_sections ?? (isTwoDay ? 4 : 2);
    const currSec = dbCtrl?.current_section ?? memCtrl?.current_section ?? 1;
    const status: "active" | "paused" | "closed" = dbCtrl?.scanner_status ?? memCtrl?.scanner_status ?? "active";
    const allowStaff = dbCtrl?.allow_staff_switch ?? memCtrl?.allow_staff_switch ?? true;
    const allowEarly = Boolean(dbCtrl?.allow_early_scan ?? memCtrl?.allow_early_scan ?? false);

    let labels: string[] = isTwoDay
      ? ["1st Section", "2nd Section", "3rd Section", "4th Section"]
      : ["1st Section", "2nd Section"];

    if (Array.isArray(dbCtrl?.section_labels) && dbCtrl.section_labels.length > 0) {
      labels = dbCtrl.section_labels.map((l: string, i: number) => formatSectionLabel(i + 1, l));
    } else if (Array.isArray(memCtrl?.section_labels) && memCtrl.section_labels.length > 0) {
      labels = memCtrl.section_labels.map((l: string, i: number) => formatSectionLabel(i + 1, l));
    }

    if (status === "active") activeScannersCount++;
    else if (status === "paused") pausedScannersCount++;
    else closedScannersCount++;

    return {
      id: evt.id,
      name: evt.name,
      slug: evt.slug,
      school_or_dept: evt.school_or_dept,
      venue: evt.venue,
      event_date: evt.event_date,
      start_time: evt.start_time,
      end_time: evt.end_time,
      is_two_day: isTwoDay,
      total_registered: regCounts[evt.id] || 0,
      scanner_status: status,
      total_sections: totalSec,
      current_section: currSec,
      section_labels: labels.slice(0, totalSec),
      allow_staff_switch: allowStaff,
      allow_early_scan: allowEarly,
      section_counts: eventAttendanceMap[evt.id] || { 1: 0, 2: 0, 3: 0, 4: 0 },
    };
  });

  return {
    masterEnabled,
    operatingMode,
    globalDateBypass,
    events: enrichedEvents,
    metrics: {
      totalEvents: enrichedEvents.length,
      activeScanners: activeScannersCount,
      pausedScanners: pausedScannersCount,
      closedScanners: closedScannersCount,
      twoDayEventsCount: twoDayCount,
      totalAttendanceRecords: totalAttendanceCount,
      morningAttendanceTotal: morningTotal,
      afternoonAttendanceTotal: afternoonTotal,
    },
  };
}

/**
 * Cached Scanner Overview on Vercel Data Cache (Zero DB Egress on repeat visits)
 */
export const getCachedAdminScannerOverview = unstable_cache(
  async () => fetchAdminScannerOverviewRaw(),
  ["admin-scanner-overview-cache-v2"],
  {
    revalidate: 30, // 30s background refresh
    tags: ["admin-scanner", "admin-registrations"],
  }
);

/**
 * 1. Get Scanner Overview for all events with attendance counts per section
 */
export async function getAdminScannerOverviewAction(forceRefresh = false): Promise<ScannerOverviewData> {
  const { authorized } = await verifyAdminSession();
  if (!authorized) {
    throw new Error("Unauthorized: Admin privileges required.");
  }

  if (forceRefresh) {
    return fetchAdminScannerOverviewRaw();
  }
  return getCachedAdminScannerOverview();
}

/**
 * Force purge scanner cache on-demand
 */
export async function refreshAdminScannerCacheAction() {
  const { authorized } = await verifyAdminSession();
  if (!authorized) return { success: false, error: "Unauthorized" };

  revalidateTag("admin-scanner");
  revalidatePath("/admin/scanner", "page");
  return { success: true };
}

/**
 * 2. Update active section & status for a single event
 * (Activating Section 2 automatically locks Section 1)
 */
export async function updateEventScannerSectionAction(params: {
  eventId: string;
  targetSection: number;
  scannerStatus?: "active" | "paused" | "closed";
}) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();
    const status = params.scannerStatus || "active";

    // 1. Update in-memory fallback
    const prev = memoryScannerControlsCache.get(params.eventId) || {
      total_sections: 2,
      section_labels: ["1st Section", "2nd Section"],
      allow_staff_switch: true,
      current_section: 1,
      scanner_status: "active",
    };

    memoryScannerControlsCache.set(params.eventId, {
      ...prev,
      current_section: params.targetSection,
      scanner_status: status,
    });

    // 2. Persist to DB table if exists
    try {
      await adminClient.from("event_scanner_controls").upsert(
        {
          event_id: params.eventId,
          current_section: params.targetSection,
          scanner_status: status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );
    } catch {
      // Ignore if table pending SQL execution
    }

    revalidateTag("admin-scanner");
    revalidatePath("/admin/scanner", "page");
    revalidatePath("/coordinator", "page");
    revalidatePath(`/coordinator/${params.eventId}`, "page");

    return {
      success: true,
      message: `Section ${params.targetSection} activated! Previous sections are now closed.`,
      currentSection: params.targetSection,
      scannerStatus: status,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update scanner section";
    return { success: false, error: msg };
  }
}

/**
 * 3. Configure Event Scanner (Section count, custom labels, coordinator switch permissions)
 */
export async function configureEventScannerAction(params: {
  eventId: string;
  totalSections: number;
  currentSection: number;
  sectionLabels: string[];
  allowStaffSwitch: boolean;
  scannerStatus: "active" | "paused" | "closed";
}) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    // In-memory fallback
    memoryScannerControlsCache.set(params.eventId, {
      total_sections: params.totalSections,
      current_section: params.currentSection,
      section_labels: params.sectionLabels,
      allow_staff_switch: params.allowStaffSwitch,
      scanner_status: params.scannerStatus,
    });

    // DB Table
    try {
      await adminClient.from("event_scanner_controls").upsert(
        {
          event_id: params.eventId,
          total_sections: params.totalSections,
          current_section: params.currentSection,
          section_labels: params.sectionLabels,
          allow_staff_switch: params.allowStaffSwitch,
          scanner_status: params.scannerStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );
    } catch {
      // Table may be pending migration
    }

    revalidateTag("admin-scanner");
    revalidatePath("/admin/scanner", "page");
    revalidatePath(`/coordinator/${params.eventId}`, "page");

    return { success: true, message: "Scanner configuration saved successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to configure scanner";
    return { success: false, error: msg };
  }
}

/**
 * 4. Bulk Update Scanner Sections (e.g. Set all events to Section 2 - Afternoon)
 */
export async function bulkUpdateScannerSectionAction(params: {
  eventIds: string[];
  targetSection?: number;
  scannerStatus?: "active" | "paused" | "closed";
  allowStaffSwitch?: boolean;
}) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    for (const eId of params.eventIds) {
      const prev = memoryScannerControlsCache.get(eId) || {
        total_sections: 2,
        section_labels: ["1st Section", "2nd Section"],
        allow_staff_switch: true,
        current_section: 1,
        scanner_status: "active",
      };

      const updated = {
        ...prev,
        current_section: params.targetSection !== undefined ? params.targetSection : prev.current_section,
        scanner_status: params.scannerStatus || prev.scanner_status,
        allow_staff_switch: params.allowStaffSwitch !== undefined ? params.allowStaffSwitch : prev.allow_staff_switch,
      };

      memoryScannerControlsCache.set(eId, updated);

      try {
        await adminClient.from("event_scanner_controls").upsert(
          {
            event_id: eId,
            current_section: updated.current_section,
            scanner_status: updated.scanner_status,
            allow_staff_switch: updated.allow_staff_switch,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "event_id" }
        );
      } catch {
        // Table fallback
      }
    }

    revalidateTag("admin-scanner");
    revalidatePath("/admin/scanner", "page");
    revalidatePath("/coordinator", "page");

    return {
      success: true,
      message: `Updated scanner controls for ${params.eventIds.length} event(s).`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bulk update failed";
    return { success: false, error: msg };
  }
}

/**
 * 5. Toggle Global Master Scanner Switch
 */
export async function toggleGlobalScannerMasterAction(params: {
  masterEnabled: boolean;
  operatingMode?: "open_all" | "section_managed" | "locked";
}) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    memoryGlobalScannerMaster = params.masterEnabled;
    if (params.operatingMode) {
      memoryGlobalOperatingMode = params.operatingMode;
    }

    try {
      await adminClient.from("global_scanner_settings").upsert(
        {
          id: "global_config",
          master_scanner_enabled: params.masterEnabled,
          operating_mode: params.operatingMode || memoryGlobalOperatingMode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {
      // Table fallback
    }

    revalidateTag("admin-scanner");
    revalidatePath("/admin/scanner", "page");
    revalidatePath("/coordinator/scanner", "page");

    return {
      success: true,
      masterEnabled: params.masterEnabled,
      operatingMode: params.operatingMode || memoryGlobalOperatingMode,
      message: params.masterEnabled
        ? "Master scanner system is LIVE."
        : "Master scanner system is LOCKED. Gate scanners will reject new check-ins.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle global scanner";
    return { success: false, error: msg };
  }
}

/**
 * 6. Toggle Global Date Lock Bypass (Open All Events Globally Ahead of Date)
 */
export async function toggleGlobalDateBypassAction(params: {
  bypassEnabled: boolean;
}) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();
    memoryGlobalDateBypass = params.bypassEnabled;

    try {
      await adminClient.from("global_scanner_settings").upsert(
        {
          id: "global_config",
          test_mode_bypass: params.bypassEnabled,
          operating_mode: params.bypassEnabled ? "open_all" : "section_managed",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {
      // Table fallback
    }

    revalidateTag("admin-scanner");
    revalidatePath("/admin/scanner", "page");
    revalidatePath("/coordinator/scanner", "page");

    return {
      success: true,
      bypassEnabled: params.bypassEnabled,
      message: params.bypassEnabled
        ? "Global Date Lock Bypassed! All gate scanners across campus are unlocked for pre-event check-ins."
        : "Strict Calendar Mode re-engaged. Desks will lock until official competition dates.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle date lock bypass";
    return { success: false, error: msg };
  }
}

/**
 * 7. Toggle Event-Specific Early Scan Action (Single Event Date Bypass)
 */
export async function toggleEventEarlyScanAction(params: {
  eventId: string;
  allowEarlyScan: boolean;
}) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    // Update in-memory fallback
    const mem = memoryScannerControlsCache.get(params.eventId);
    if (mem) {
      memoryScannerControlsCache.set(params.eventId, {
        ...mem,
        allow_early_scan: params.allowEarlyScan,
      });
    }

    try {
      await adminClient.from("event_scanner_controls").upsert(
        {
          event_id: params.eventId,
          allow_early_scan: params.allowEarlyScan,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );
    } catch {
      // Table fallback
    }

    revalidateTag("admin-scanner");
    revalidateTag(`scanner-ctrl-${params.eventId}`);
    revalidatePath("/admin/scanner", "page");
    revalidatePath("/coordinator/scanner", "page");
    revalidatePath(`/coordinator/${params.eventId}`, "page");

    return {
      success: true,
      eventId: params.eventId,
      allowEarlyScan: params.allowEarlyScan,
      message: params.allowEarlyScan
        ? "Early scanning unlocked for this competition. Gate desks can now check in attendees."
        : "Early scanning disabled. Scanner will lock until competition date.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle early scanning";
    return { success: false, error: msg };
  }
}

/**
 * 8. Get Section Attendance Breakdown Roster for an Event
 */
export async function getEventSectionRosterAction(eventId: string) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    // 1. Fetch participants
    const { data: regs, error: regErr } = await adminClient
      .from("event_registrations")
      .select(`
        id,
        registration_code,
        slot_number,
        user:profiles (
          id,
          full_name,
          email,
          mobile_number,
          college_name,
          register_number
        )
      `)
      .eq("event_id", eventId);

    if (regErr) throw regErr;

    // 2. Fetch attendance for this event
    const { data: attendances, error: attErr } = await adminClient
      .from("attendance")
      .select("id, registration_id, section_number, scan_method, scanned_at")
      .eq("event_id", eventId);

    if (attErr) throw attErr;

    // 3. Map attendances per registration
    const attendanceByReg: Record<string, { sections: number[]; times: Record<number, string> }> = {};
    (attendances || []).forEach((att: any) => {
      if (!attendanceByReg[att.registration_id]) {
        attendanceByReg[att.registration_id] = { sections: [], times: {} };
      }

      let secNum = 1;
      if (att.section_number && typeof att.section_number === "number") {
        secNum = att.section_number;
      } else if (typeof att.scan_method === "string") {
        const match = att.scan_method.match(/sec_(\d+)/);
        if (match) secNum = parseInt(match[1], 10);
      }

      if (!attendanceByReg[att.registration_id].sections.includes(secNum)) {
        attendanceByReg[att.registration_id].sections.push(secNum);
      }
      attendanceByReg[att.registration_id].times[secNum] = att.scanned_at;
    });

    const roster = (regs || []).map((r: any) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const att = attendanceByReg[r.id];
      const sections = att?.sections || [];
      return {
        registrationId: r.id,
        registrationCode: r.registration_code,
        studentName: u?.full_name || "Unknown",
        email: u?.email || "",
        phone: u?.mobile_number || "",
        collegeName: u?.college_name || "KARE",
        registerNumber: u?.register_number || "",
        sectionsAttended: sections.sort((a, b) => a - b),
        scannedTimes: att?.times || {},
        status: sections.length > 0 ? "attended" : "absent",
      };
    });

    return { success: true, roster };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load section roster";
    return { success: false, error: msg };
  }
}

// 26. Admin Simple Events List for Swapping / Modifying User Registrations
export interface AdminEventSimpleItem {
  id: string;
  name: string;
  slug: string;
  schoolOrDept?: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  participantLimit: number;
  internalLimit: number | null;
  allowInternal: boolean;
  allowExternal: boolean;
  isProEvent: boolean;
  categoryName: string;
  totalRegistered: number;
  internalRegistered: number;
  isTotalFull: boolean;
  isInternalFull: boolean;
  isKluBlocked: boolean;
  status: string;
}

export async function getAdminEventsListSimpleAction(): Promise<{
  success: boolean;
  events: AdminEventSimpleItem[];
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 1) {
      return { success: false, error: "Unauthorized access", events: [] };
    }

    const adminClient = await createAdminClient();

    let allEventsList: any[] = [];
    const { data: eventsWithCol, error: colErr } = await adminClient
      .from("events")
      .select(`
        id,
        name,
        slug,
        school_or_dept,
        venue,
        event_date,
        start_time,
        end_time,
        participant_limit,
        internal_limit,
        allow_internal,
        allow_external,
        is_pro_event,
        status,
        category:event_categories (
          id,
          name,
          slug
        )
      `)
      .neq("status", "draft")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true })
      .order("name", { ascending: true });

    if (colErr) {
      const { data: fallbackEvents, error: fbErr } = await adminClient
        .from("events")
        .select(`
          id,
          name,
          slug,
          school_or_dept,
          venue,
          event_date,
          start_time,
          end_time,
          participant_limit,
          allow_internal,
          allow_external,
          is_pro_event,
          status,
          category:event_categories (
            id,
            name,
            slug
          )
        `)
        .neq("status", "draft")
        .order("name", { ascending: true });

      if (fbErr) throw fbErr;
      allEventsList = fallbackEvents || [];
    } else {
      allEventsList = eventsWithCol || [];
    }

    const eventIds = allEventsList.map((e) => e.id);

    // Fetch stats view or count
    const { data: statsList } = await adminClient
      .from("vw_public_events_stats")
      .select("event_id, total_registered, internal_registered")
      .in("event_id", eventIds);

    const internalCounts: Record<string, number> = {};
    const totalCounts: Record<string, number> = {};

    (statsList || []).forEach((s: any) => {
      totalCounts[s.event_id] = Number(s.total_registered || 0);
      internalCounts[s.event_id] = Number(s.internal_registered || 0);
    });

    const formattedEvents: AdminEventSimpleItem[] = allEventsList.map((evt) => {
      const totalReg = totalCounts[evt.id] || 0;
      const internalReg = internalCounts[evt.id] || 0;
      const partLimit = Number(evt.participant_limit || 100);
      const intLimit = evt.internal_limit !== null && evt.internal_limit !== undefined ? Number(evt.internal_limit) : null;
      const allowInt = evt.allow_internal !== false;
      const allowExt = evt.allow_external !== false;

      const isTotalFull = totalReg >= partLimit;
      const isIntFull = intLimit !== null ? internalReg >= intLimit : false;
      const isKluBlocked = !allowInt || isIntFull;

      const catObj = Array.isArray(evt.category) ? evt.category[0] : evt.category;

      return {
        id: evt.id,
        name: evt.name,
        slug: evt.slug,
        schoolOrDept: evt.school_or_dept || "",
        venue: evt.venue || "Campus Venue",
        eventDate: evt.event_date || "",
        startTime: evt.start_time || "",
        endTime: evt.end_time || "",
        participantLimit: partLimit,
        internalLimit: intLimit,
        allowInternal: allowInt,
        allowExternal: allowExt,
        isProEvent: Boolean(evt.is_pro_event),
        categoryName: catObj?.name || "General",
        totalRegistered: totalReg,
        internalRegistered: internalReg,
        isTotalFull,
        isInternalFull: isIntFull,
        isKluBlocked,
        status: evt.status || "active",
      };
    });

    return { success: true, events: formattedEvents };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load events";
    return { success: false, error: msg, events: [] };
  }
}

// 27. Change / Swap Event for a User's Registration (Admin & Super Admin)
export async function adminChangeEventForUserAction({
  registrationId,
  userId,
  newEventId,
  overrideCapacity = false,
  resetAttendance = true,
  reason,
}: {
  registrationId: string;
  userId: string;
  newEventId: string;
  overrideCapacity?: boolean;
  resetAttendance?: boolean;
  reason?: string;
}): Promise<{
  success: boolean;
  updatedRegistration?: any;
  message?: string;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 3) {
      return { success: false, error: "Unauthorized: Level 3+ Admin privileges required to swap events." };
    }

    if (!registrationId || !userId || !newEventId) {
      return { success: false, error: "Missing required parameters for event swap." };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch current registration
    const { data: reg, error: regErr } = await adminClient
      .from("event_registrations")
      .select(`
        id,
        user_id,
        event_id,
        slot_number,
        registration_code,
        status,
        payment_status,
        event:events (
          id,
          name
        )
      `)
      .eq("id", registrationId)
      .single();

    if (regErr || !reg) {
      return { success: false, error: "Registration record not found." };
    }

    if (reg.user_id !== userId) {
      return { success: false, error: "Registration does not belong to the target user." };
    }

    if (reg.event_id === newEventId) {
      return { success: false, error: "The user is already registered for this event in this slot." };
    }

    // 2. Check if user is registered for target event in another slot
    const { data: otherSlot } = await adminClient
      .from("event_registrations")
      .select("id, slot_number")
      .eq("user_id", userId)
      .eq("event_id", newEventId)
      .neq("id", registrationId)
      .eq("status", "confirmed")
      .maybeSingle();

    if (otherSlot) {
      return {
        success: false,
        error: `User is already registered for this competition in Slot #${otherSlot.slot_number}. A participant cannot register for the same competition twice.`,
      };
    }

    // 3. Fetch target new event details
    const { data: newEvent, error: newEvtErr } = await adminClient
      .from("events")
      .select(`
        id,
        name,
        slug,
        school_or_dept,
        venue,
        event_date,
        start_time,
        end_time,
        participant_limit,
        internal_limit,
        allow_internal,
        allow_external,
        is_pro_event,
        status,
        category:event_categories (
          id,
          name,
          slug
        )
      `)
      .eq("id", newEventId)
      .single();

    if (newEvtErr || !newEvent) {
      return { success: false, error: "Target event not found in database." };
    }

    // 4. Fetch User Profile and Pass details for policy validation
    const [{ data: userProfile }, { data: userPass }] = await Promise.all([
      adminClient.from("profiles").select("participant_type, email").eq("id", userId).maybeSingle(),
      adminClient.from("delegate_passes").select("id, pass_tier").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const isInternal = userProfile?.participant_type === "internal" || (userProfile?.email || "").toLowerCase().endsWith("@klu.ac.in");

    // 5. Policy & Capacity Validation (Bypassable with overrideCapacity)
    if (!overrideCapacity) {
      // Pro Pass check
      if (newEvent.is_pro_event && userPass?.pass_tier !== "pro_pass") {
        return {
          success: false,
          error: `"${newEvent.name}" is a PRO event, but the user holds a Standard Pass. Enable Force Override if you wish to bypass.`,
        };
      }

      // University domain restriction
      if (isInternal && newEvent.allow_internal === false) {
        return {
          success: false,
          error: `"${newEvent.name}" is restricted and closed for Kalasalingam University students. Enable Force Override if you wish to bypass.`,
        };
      }
      if (!isInternal && newEvent.allow_external === false) {
        return {
          success: false,
          error: `"${newEvent.name}" is restricted to Kalasalingam students only. Enable Force Override if you wish to bypass.`,
        };
      }

      // Total capacity check
      const { count: totalRegs } = await adminClient
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", newEventId)
        .eq("status", "confirmed");

      const limit = Number(newEvent.participant_limit || 100);
      if ((totalRegs || 0) >= limit) {
        return {
          success: false,
          error: `"${newEvent.name}" has reached full capacity (${totalRegs}/${limit} seats). Enable Force Override if you wish to bypass.`,
        };
      }

      // Internal student limit check
      if (isInternal && newEvent.internal_limit !== null && newEvent.internal_limit !== undefined) {
        const { data: intRegs } = await adminClient
          .from("event_registrations")
          .select(`
            id,
            user:profiles!event_registrations_user_id_fkey (
              email,
              participant_type
            )
          `)
          .eq("event_id", newEventId)
          .eq("status", "confirmed");

        let intCount = 0;
        (intRegs || []).forEach((r: any) => {
          const u = Array.isArray(r.user) ? r.user[0] : r.user;
          if (u?.participant_type === "internal" || (u?.email || "").toLowerCase().endsWith("@klu.ac.in")) {
            intCount++;
          }
        });

        if (intCount >= Number(newEvent.internal_limit)) {
          return {
            success: false,
            error: `"${newEvent.name}" internal student quota is full (${intCount}/${newEvent.internal_limit} seats). Enable Force Override if you wish to bypass.`,
          };
        }
      }
    }

    // 6. Update registration record with new event
    const { error: updateErr } = await adminClient
      .from("event_registrations")
      .update({
        event_id: newEventId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);

    if (updateErr) throw updateErr;

    // 7. Reset attendance if requested
    if (resetAttendance) {
      await adminClient
        .from("attendance")
        .delete()
        .eq("registration_id", registrationId);
    }

    // 8. Log audit record
    try {
      const oldEventName = (reg.event as any)?.name || "Previous Event";
      await adminClient.from("payment_audit_logs").insert({
        issue_id: null,
        admin_id: authInfo.user.id,
        action_taken: "event_changed",
        previous_status: reg.event_id,
        new_status: newEventId,
        notes: `Admin ${authInfo.user.email} changed Slot #${reg.slot_number} from "${oldEventName}" to "${newEvent.name}" for user ${userId}. Override: ${overrideCapacity}. Reason: ${reason || "Admin user inspect change"}`,
      });
    } catch {
      // Non-fatal if table not present
    }

    // 9. Revalidate cache tags and pages
    revalidateTag("admin-users");
    revalidateTag("public-events");
    revalidateTag("admin-events");
    revalidateTag("admin-slot-controls");
    revalidatePath("/admin/users", "page");
    revalidatePath("/dashboard", "page");
    revalidatePath("/dashboard/passes", "page");
    revalidatePath("/events", "page");

    const categoryName = Array.isArray(newEvent.category)
      ? newEvent.category[0]?.name
      : (newEvent.category as any)?.name;

    return {
      success: true,
      message: `Successfully changed Slot #${reg.slot_number} to "${newEvent.name}".`,
      updatedRegistration: {
        id: reg.id,
        slotNumber: reg.slot_number,
        registrationCode: reg.registration_code,
        status: reg.status,
        paymentStatus: reg.payment_status,
        isAttended: false,
        scannedAt: null,
        event: {
          id: newEvent.id,
          name: newEvent.name,
          slug: newEvent.slug,
          schoolOrDept: newEvent.school_or_dept,
          isProEvent: Boolean(newEvent.is_pro_event),
          venue: newEvent.venue,
          eventDate: newEvent.event_date,
          startTime: newEvent.start_time,
          category: categoryName,
        },
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to change event";
    return { success: false, error: msg };
  }
}

// 28. Assign New Event to an Open Slot (Admin & Super Admin)
export async function adminAssignEventForUserAction({
  userId,
  newEventId,
  overrideCapacity = false,
}: {
  userId: string;
  newEventId: string;
  overrideCapacity?: boolean;
}): Promise<{
  success: boolean;
  newRegistration?: any;
  message?: string;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 3) {
      return { success: false, error: "Unauthorized: Level 3+ Admin privileges required to assign events." };
    }

    if (!userId || !newEventId) {
      return { success: false, error: "Missing required parameters for event assignment." };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch user pass & existing registrations
    const [{ data: userPass }, { data: existingRegs }] = await Promise.all([
      adminClient.from("delegate_passes").select("id, pass_code, pass_tier, slots_used, total_slots, status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      adminClient.from("event_registrations").select("id, slot_number, event_id").eq("user_id", userId).eq("status", "confirmed"),
    ]);

    const activeRegs = existingRegs || [];
    if (activeRegs.length >= 2) {
      return { success: false, error: "User already has both 2 event slots allocated. Use 'Change Event' to replace an existing event." };
    }

    if (activeRegs.some((r) => r.event_id === newEventId)) {
      return { success: false, error: "User is already registered for this competition." };
    }

    // 2. Fetch new event details
    const { data: newEvent, error: newEvtErr } = await adminClient
      .from("events")
      .select(`
        id,
        name,
        slug,
        school_or_dept,
        venue,
        event_date,
        start_time,
        end_time,
        participant_limit,
        internal_limit,
        allow_internal,
        allow_external,
        is_pro_event,
        status,
        category:event_categories (
          id,
          name,
          slug
        )
      `)
      .eq("id", newEventId)
      .single();

    if (newEvtErr || !newEvent) {
      return { success: false, error: "Target event not found in database." };
    }

    // 3. User profile check
    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("participant_type, email")
      .eq("id", userId)
      .maybeSingle();

    const isInternal = userProfile?.participant_type === "internal" || (userProfile?.email || "").toLowerCase().endsWith("@klu.ac.in");

    // 4. Policy checks
    if (!overrideCapacity) {
      if (newEvent.is_pro_event && userPass?.pass_tier !== "pro_pass") {
        return {
          success: false,
          error: `"${newEvent.name}" is a PRO event, but the user holds a Standard Pass. Enable Force Override to proceed.`,
        };
      }

      if (isInternal && newEvent.allow_internal === false) {
        return {
          success: false,
          error: `"${newEvent.name}" is closed for Kalasalingam University students. Enable Force Override to proceed.`,
        };
      }
      if (!isInternal && newEvent.allow_external === false) {
        return {
          success: false,
          error: `"${newEvent.name}" is restricted to Kalasalingam students only. Enable Force Override to proceed.`,
        };
      }

      const { count: totalRegs } = await adminClient
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", newEventId)
        .eq("status", "confirmed");

      const limit = Number(newEvent.participant_limit || 100);
      if ((totalRegs || 0) >= limit) {
        return {
          success: false,
          error: `"${newEvent.name}" has reached full capacity (${totalRegs}/${limit} seats). Enable Force Override to proceed.`,
        };
      }

      if (isInternal && newEvent.internal_limit !== null && newEvent.internal_limit !== undefined) {
        const { data: intRegs } = await adminClient
          .from("event_registrations")
          .select(`
            id,
            user:profiles!event_registrations_user_id_fkey (
              email,
              participant_type
            )
          `)
          .eq("event_id", newEventId)
          .eq("status", "confirmed");

        let intCount = 0;
        (intRegs || []).forEach((r: any) => {
          const u = Array.isArray(r.user) ? r.user[0] : r.user;
          if (u?.participant_type === "internal" || (u?.email || "").toLowerCase().endsWith("@klu.ac.in")) {
            intCount++;
          }
        });

        if (intCount >= Number(newEvent.internal_limit)) {
          return {
            success: false,
            error: `"${newEvent.name}" internal student quota is full (${intCount}/${newEvent.internal_limit} seats). Enable Force Override to proceed.`,
          };
        }
      }
    }

    // 5. Determine slot number
    const usedSlotNumbers = new Set(activeRegs.map((r) => r.slot_number));
    const nextSlot = !usedSlotNumbers.has(1) ? 1 : 2;
    const passCode = userPass?.pass_code || "EUPH";
    const regCode = `${passCode}-S${nextSlot}`;

    // 6. Insert new registration
    const { data: newReg, error: insErr } = await adminClient
      .from("event_registrations")
      .insert({
        pass_id: userPass?.id || null,
        user_id: userId,
        event_id: newEventId,
        slot_number: nextSlot,
        registration_code: regCode,
        status: "confirmed",
        payment_status: "paid",
        qr_secret_nonce: Math.random().toString(36).substring(2),
      })
      .select("id, slot_number, registration_code, status, payment_status")
      .single();

    if (insErr || !newReg) throw insErr || new Error("Failed to insert registration");

    // 7. Update delegate pass slots_used if present
    if (userPass) {
      await adminClient
        .from("delegate_passes")
        .update({
          slots_used: Math.min(2, activeRegs.length + 1),
        })
        .eq("id", userPass.id);
    }

    // 8. Revalidate caches
    revalidateTag("admin-users");
    revalidateTag("public-events");
    revalidateTag("admin-events");
    revalidateTag("admin-slot-controls");
    revalidatePath("/admin/users", "page");
    revalidatePath("/dashboard", "page");
    revalidatePath("/dashboard/passes", "page");
    revalidatePath("/events", "page");

    const categoryName = Array.isArray(newEvent.category)
      ? newEvent.category[0]?.name
      : (newEvent.category as any)?.name;

    return {
      success: true,
      message: `Successfully assigned "${newEvent.name}" to Slot #${nextSlot}.`,
      newRegistration: {
        id: newReg.id,
        slotNumber: newReg.slot_number,
        registrationCode: newReg.registration_code,
        status: newReg.status,
        paymentStatus: newReg.payment_status,
        isAttended: false,
        scannedAt: null,
        event: {
          id: newEvent.id,
          name: newEvent.name,
          slug: newEvent.slug,
          schoolOrDept: newEvent.school_or_dept,
          isProEvent: Boolean(newEvent.is_pro_event),
          venue: newEvent.venue,
          eventDate: newEvent.event_date,
          startTime: newEvent.start_time,
          category: categoryName,
        },
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign event";
    return { success: false, error: msg };
  }
}

// 29. Remove Registration Slot for User (Admin & Super Admin)
export async function adminRemoveRegistrationAction({
  registrationId,
  userId,
}: {
  registrationId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 3) {
      return { success: false, error: "Unauthorized: Level 3+ Admin privileges required." };
    }

    const adminClient = await createAdminClient();

    // Verify registration belongs to target user
    const { data: reg, error: regErr } = await adminClient
      .from("event_registrations")
      .select("id, user_id, pass_id")
      .eq("id", registrationId)
      .single();

    if (regErr || !reg || reg.user_id !== userId) {
      return { success: false, error: "Registration not found or unauthorized." };
    }

    // Delete attendance records
    await adminClient.from("attendance").delete().eq("registration_id", registrationId);

    // Delete event registration
    const { error: delErr } = await adminClient
      .from("event_registrations")
      .delete()
      .eq("id", registrationId);

    if (delErr) throw delErr;

    // Decrement slots_used if pass exists
    if (reg.pass_id) {
      const { data: pass } = await adminClient
        .from("delegate_passes")
        .select("id, slots_used")
        .eq("id", reg.pass_id)
        .single();

      if (pass && pass.slots_used > 0) {
        await adminClient
          .from("delegate_passes")
          .update({ slots_used: Math.max(0, pass.slots_used - 1) })
          .eq("id", pass.id);
      }
    }

    revalidateTag("admin-users");
    revalidateTag("public-events");
    revalidateTag("admin-events");
    revalidateTag("admin-slot-controls");
    revalidatePath("/admin/users", "page");
    revalidatePath("/dashboard", "page");
    revalidatePath("/dashboard/passes", "page");
    revalidatePath("/events", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove registration";
    return { success: false, error: msg };
  }
}

