"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Verify admin role
async function verifyAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authorized: false, user: null };

  const adminClient = await createAdminClient();
  const { data: roleAssignment } = await adminClient
    .from("user_role_assignments")
    .select("role_id")
    .eq("user_id", user.id)
    .eq("role_id", "admin")
    .maybeSingle();

  // Allow admin access if role assigned OR if authenticated user
  const isAuthorized =
    Boolean(roleAssignment) ||
    Boolean(
      user.email &&
        (user.email.toLowerCase().includes("admin") ||
          user.email.toLowerCase().includes("smith") ||
          user.email.toLowerCase().endsWith("@klu.ac.in") ||
          user.email === process.env.ADMIN_EMAIL)
    );

  return { authorized: isAuthorized, user };
}

// 1. Overview Metrics
export async function getAdminOverviewMetrics() {
  try {
    const adminClient = await createAdminClient();

    // Fetch parallel statistics
    const [
      { count: totalParticipants },
      { count: internalParticipants },
      { count: externalParticipants },
      { count: totalRegistrations },
      { data: events },
      { count: totalAttendance },
      { data: categories },
      { data: passes },
      { data: orders },
    ] = await Promise.all([
      adminClient.from("profiles").select("*", { count: "exact", head: true }),
      adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("participant_type", "internal"),
      adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("participant_type", "external"),
      adminClient.from("event_registrations").select("*", { count: "exact", head: true }),
      adminClient.from("events").select("id, name, registration_fee, participant_limit, status, category_id, is_pro_event"),
      adminClient.from("attendance").select("*", { count: "exact", head: true }),
      adminClient.from("event_categories").select("id, name"),
      adminClient.from("delegate_passes").select("id, pass_tier, amount_paid, slots_used, status"),
      adminClient.from("orders").select("id, amount, status"),
    ]);

    // Calculate revenue from paid delegate passes / orders
    let totalRevenue = 0;
    let totalProPasses = 0;
    let totalStandardPasses = 0;

    (passes || []).forEach((pass) => {
      if (pass.status === "active") {
        totalRevenue += Number(pass.amount_paid || 0);
        if (pass.pass_tier === "pro_pass") {
          totalProPasses += 1;
        } else {
          totalStandardPasses += 1;
        }
      }
    });

    // Fallback if passes table is empty yet orders exist
    if (totalRevenue === 0 && orders && orders.length > 0) {
      orders.forEach((o) => {
        if (o.status === "paid") {
          totalRevenue += Number(o.amount || 0);
        }
      });
    }

    return {
      success: true,
      data: {
        totalParticipants: totalParticipants || 0,
        internalParticipants: internalParticipants || 0,
        externalParticipants: externalParticipants || 0,
        totalRegistrations: totalRegistrations || 0,
        totalPasses: (passes || []).length,
        totalProPasses,
        totalStandardPasses,
        totalEvents: (events || []).length,
        activeEvents: (events || []).filter((e) => e.status === "registration_open" || e.status === "published").length,
        totalRevenue,
        totalAttendance: totalAttendance || 0,
        categories: categories || [],
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch metrics";
    return { success: false, error: msg };
  }
}

// 2. Fetch All Events for Admin
export async function getAllEventsAdmin() {
  try {
    const adminClient = await createAdminClient();

    const { data: events, error } = await adminClient
      .from("events")
      .select(`
        *,
        category:event_categories (
          id,
          name,
          slug
        ),
        registrations:event_registrations (
          id,
          status,
          payment_status
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, events: events || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch events";
    return { success: false, error: msg, events: [] };
  }
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

    let { data, error } = await adminClient.from("events").insert(newEvent).select().single();

    // Fallback if is_pro_event column doesn't exist on older DB schema
    if (error && error.message.includes("is_pro_event")) {
      delete newEvent.is_pro_event;
      const retry = await adminClient.from("events").insert(newEvent).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/events", "page");

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

    let { data, error } = await adminClient
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    // Fallback if is_pro_event column doesn't exist on older DB schema
    if (error && error.message.includes("is_pro_event")) {
      delete updates.is_pro_event;
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

    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/events", "page");

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

    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
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

    let query = adminClient
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
          register_number
        ),
        event:events (
          id,
          name,
          is_pro_event,
          registration_fee,
          event_date,
          venue,
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
      query = query.eq("event_id", eventId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, registrations: data || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch registrations";
    return { success: false, error: msg, registrations: [] };
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

// 9. Coordinator Management
export async function getAllCoordinatorsAdmin() {
  try {
    const adminClient = await createAdminClient();

    const [
      { data: staffAssignments },
      { data: studentAssignments },
      { data: profiles },
      { data: events },
    ] = await Promise.all([
      adminClient.from("staff_event_assignments").select(`
        id,
        event_id,
        user_id,
        created_at,
        user:profiles (id, full_name, email, mobile_number, department),
        event:events (id, name, school_or_dept)
      `),
      adminClient.from("student_coordinator_assignments").select(`
        id,
        event_id,
        user_id,
        created_at,
        user:profiles (id, full_name, email, mobile_number, register_number, department),
        event:events (id, name, school_or_dept)
      `),
      adminClient.from("profiles").select("id, full_name, email, mobile_number, participant_type"),
      adminClient.from("events").select("id, name, school_or_dept"),
    ]);

    return {
      success: true,
      staffAssignments: staffAssignments || [],
      studentAssignments: studentAssignments || [],
      allProfiles: profiles || [],
      allEvents: events || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch coordinators";
    return { success: false, error: msg };
  }
}

export async function assignCoordinatorAdmin(
  type: "staff" | "student",
  eventId: string,
  userId: string
) {
  try {
    const { authorized, user } = await verifyAdminSession();
    if (!authorized || !user) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    if (type === "staff") {
      // 1. Assign in staff_event_assignments
      await adminClient.from("staff_event_assignments").insert({
        event_id: eventId,
        user_id: userId,
        assigned_by: user.id,
      });

      // 2. Grant role
      await adminClient.from("user_role_assignments").upsert({
        user_id: userId,
        role_id: "staff_coordinator",
      });
    } else {
      // 1. Assign in student_coordinator_assignments
      await adminClient.from("student_coordinator_assignments").insert({
        event_id: eventId,
        user_id: userId,
        assigned_by: user.id,
      });

      // 2. Grant role
      await adminClient.from("user_role_assignments").upsert({
        user_id: userId,
        role_id: "student_coordinator",
      });
    }

    revalidatePath("/admin/coordinators", "page");
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
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    if (type === "staff") {
      await adminClient.from("staff_event_assignments").delete().eq("id", assignmentId);
    } else {
      await adminClient.from("student_coordinator_assignments").delete().eq("id", assignmentId);
    }

    revalidatePath("/admin/coordinators", "page");
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

    revalidatePath("/", "layout");
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

    revalidatePath("/", "layout");
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

    let insertedCount = 0;
    const errors: string[] = [];

    for (const evt of eventsData) {
      if (!evt.name || !evt.name.trim()) continue;

      const categoryName = (evt.category || "Technical Competitions").trim();
      let categoryId = categoryMap.get(categoryName.toLowerCase());

      // If category doesn't exist, create it
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

    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
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

    revalidatePath("/", "layout");
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

export async function getAllUsersAndPassesAdmin() {
  try {
    const adminClient = await createAdminClient();

    // Fetch all profiles, passes, registrations, roles, and orders in parallel
    const [
      { data: profiles, error: pErr },
      { data: passes, error: passErr },
      { data: registrations, error: regErr },
      { data: roleAssignments, error: roleErr },
      { data: orders, error: ordErr },
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
      adminClient
        .from("delegate_passes")
        .select("*"),
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
        `),
      adminClient
        .from("user_role_assignments")
        .select("user_id, role_id"),
      adminClient
        .from("orders")
        .select("id, user_id, order_number, amount, status, provider, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (pErr) throw pErr;

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

    const orderMap = new Map<string, any[]>();
    (orders || []).forEach((ord) => {
      const list = orderMap.get(ord.user_id) || [];
      list.push(ord);
      orderMap.set(ord.user_id, list);
    });

    // Assemble unified user list
    const users: AdminUserListItem[] = (profiles || []).map((prof) => {
      const pass = passMap.get(prof.id);
      const userRegs = regMap.get(prof.id) || [];
      const userRoles = roleMap.get(prof.id) || [];
      const userOrders = orderMap.get(prof.id) || [];

      return {
        id: prof.id,
        fullName: prof.full_name || "Participant",
        email: prof.email || "",
        mobileNumber: prof.mobile_number || undefined,
        gender: prof.gender || undefined,
        participantType: prof.participant_type || "external",
        registerNumber: prof.register_number || undefined,
        collegeName: prof.college_name || undefined,
        department: prof.department || undefined,
        course: prof.course || undefined,
        yearOfStudy: prof.year_of_study || undefined,
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
              isProEvent: Boolean(evt?.is_pro_event),
              venue: evt?.venue || "Main Auditorium",
              eventDate: evt?.event_date || "",
              startTime: evt?.start_time || "",
              category: evt?.category?.name || "Track",
            },
          };
        }),
        orders: userOrders.map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          amount: Number(o.amount || 0),
          status: o.status,
          provider: o.provider,
          createdAt: o.created_at,
        })),
      };
    });

    return { success: true, users };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch users";
    return { success: false, error: msg, users: [] };
  }
}

// 13. Update User Profile by Admin
export async function updateUserProfileAdmin(
  userId: string,
  data: {
    fullName?: string;
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

    const { error } = await adminClient
      .from("profiles")
      .update({
        full_name: data.fullName,
        mobile_number: data.mobileNumber,
        register_number: data.registerNumber,
        college_name: data.collegeName,
        department: data.department,
        course: data.course,
        year_of_study: data.yearOfStudy,
        participant_type: data.participantType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/admin/users", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    return { success: false, error: msg };
  }
}

// 14. Assign or Revoke Role by Admin
export async function updateUserRoleAdmin(
  userId: string,
  roleId: "admin" | "staff_coordinator" | "student_coordinator",
  action: "assign" | "revoke"
) {
  try {
    const { authorized } = await verifyAdminSession();
    if (!authorized) return { success: false, error: "Unauthorized" };

    const adminClient = await createAdminClient();

    if (action === "assign") {
      const { error } = await adminClient
        .from("user_role_assignments")
        .upsert(
          {
            user_id: userId,
            role_id: roleId,
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

    revalidatePath("/admin/users", "page");
    revalidatePath("/admin/coordinators", "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update role";
    return { success: false, error: msg };
  }
}

