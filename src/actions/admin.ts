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

  return { authorized: !!roleAssignment, user };
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
      { data: registrations },
      { count: totalAttendance },
      { data: categories },
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
      adminClient.from("events").select("id, name, registration_fee, participant_limit, status, category_id"),
      adminClient.from("event_registrations").select("id, status, payment_status, event_id"),
      adminClient.from("attendance").select("*", { count: "exact", head: true }),
      adminClient.from("event_categories").select("id, name"),
    ]);

    // Calculate revenue
    let totalRevenue = 0;
    const eventMap = new Map((events || []).map((e) => [e.id, e]));

    (registrations || []).forEach((reg) => {
      if (reg.payment_status === "paid") {
        const evt = eventMap.get(reg.event_id);
        if (evt && evt.registration_fee) {
          totalRevenue += Number(evt.registration_fee);
        }
      }
    });

    return {
      success: true,
      data: {
        totalParticipants: totalParticipants || 0,
        internalParticipants: internalParticipants || 0,
        externalParticipants: externalParticipants || 0,
        totalRegistrations: totalRegistrations || 0,
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
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

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
  rules: string[];
  schoolOrDept: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  registrationFee: number;
  participantLimit: number;
  minTeamSize: number;
  maxTeamSize: number;
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

    const newEvent = {
      category_id: formData.categoryId,
      name: formData.name.trim(),
      slug,
      short_description: formData.shortDescription.trim(),
      description: formData.description.trim(),
      rules: formData.rules,
      school_or_dept: formData.schoolOrDept.trim(),
      venue: formData.venue.trim(),
      event_date: formData.eventDate,
      start_time: formData.startTime,
      end_time: formData.endTime,
      registration_fee: formData.registrationFee,
      participant_limit: formData.participantLimit,
      min_team_size: formData.minTeamSize,
      max_team_size: formData.maxTeamSize,
      status: formData.status,
      allow_internal: true,
      allow_external: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await adminClient.from("events").insert(newEvent).select().single();

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
    rules?: string[];
    schoolOrDept?: string;
    venue?: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    registrationFee?: number;
    participantLimit?: number;
    minTeamSize?: number;
    maxTeamSize?: number;
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
    if (formData.rules !== undefined) updates.rules = formData.rules;
    if (formData.schoolOrDept !== undefined) updates.school_or_dept = formData.schoolOrDept;
    if (formData.venue !== undefined) updates.venue = formData.venue;
    if (formData.eventDate !== undefined) updates.event_date = formData.eventDate;
    if (formData.startTime !== undefined) updates.start_time = formData.startTime;
    if (formData.endTime !== undefined) updates.end_time = formData.endTime;
    if (formData.registrationFee !== undefined) updates.registration_fee = formData.registrationFee;
    if (formData.participantLimit !== undefined) updates.participant_limit = formData.participantLimit;
    if (formData.minTeamSize !== undefined) updates.min_team_size = formData.minTeamSize;
    if (formData.maxTeamSize !== undefined) updates.max_team_size = formData.maxTeamSize;
    if (formData.status !== undefined) updates.status = formData.status;

    const { data, error } = await adminClient
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

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
        registration_code,
        status,
        payment_status,
        created_at,
        qr_secret_nonce,
        user:profiles (
          id,
          full_name,
          email,
          mobile_number,
          gender,
          participant_type,
          college_name,
          department,
          year_of_study,
          register_number
        ),
        event:events (
          id,
          name,
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
  internal_base_fee: number;
  internal_max_events_included: number;
  internal_extra_event_fee: number;
  external_base_fee: number;
  external_max_events_included: number;
  external_extra_event_fee: number;
  is_registration_active: boolean;
  updated_at: string;
}

const DEFAULT_PRICING: RegistrationPricingPolicy = {
  internal_base_fee: 300,
  internal_max_events_included: 3,
  internal_extra_event_fee: 100,
  external_base_fee: 500,
  external_max_events_included: 2,
  external_extra_event_fee: 150,
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
      internal_base_fee: Number(payload.internal_base_fee ?? current.internal_base_fee),
      internal_max_events_included: Number(payload.internal_max_events_included ?? current.internal_max_events_included),
      internal_extra_event_fee: Number(payload.internal_extra_event_fee ?? current.internal_extra_event_fee),
      external_base_fee: Number(payload.external_base_fee ?? current.external_base_fee),
      external_max_events_included: Number(payload.external_max_events_included ?? current.external_max_events_included),
      external_extra_event_fee: Number(payload.external_extra_event_fee ?? current.external_extra_event_fee),
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

