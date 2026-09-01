"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache";

// Raw query with column projection to reduce egress bandwidth
async function fetchPublicEventsRaw() {
  try {
    let supabase;
    try {
      supabase = await createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const [{ data: events, error: eventsError }, { data: categories }] =
      await Promise.all([
        supabase
          .from("events")
          .select(`
            id,
            name,
            slug,
            short_description,
            description,
            rules,
            school_or_dept,
            venue,
            event_date,
            start_time,
            end_time,
            registration_fee,
            participant_limit,
            is_pro_event,
            brochure_url,
            status,
            category_id,
            category:event_categories (
              id,
              name,
              slug
            ),
            registrations:event_registrations (
              id,
              status
            )
          `)
          .order("event_date", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("event_categories")
          .select("id, name, slug")
          .order("display_order", { ascending: true }),
      ]);

    if (eventsError) throw eventsError;

    return {
      success: true,
      events: events || [],
      categories: categories || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load events";
    return { success: false, error: msg, events: [], categories: [] };
  }
}

// 1. Cached Public Events with Tag-Based Revalidation & Egress Control
export const getPublicEvents = unstable_cache(
  fetchPublicEventsRaw,
  ["public-events-catalog-cache"],
  { revalidate: 60, tags: ["public-events"] }
);

// Raw query for single event detail
async function fetchEventBySlugRaw(slug: string) {
  try {
    const supabase = await createClient();

    const { data: event, error } = await supabase
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
          user_id
        ),
        staff_coordinators:staff_event_assignments (
          user:profiles (id, full_name, email, mobile_number)
        ),
        student_coordinators:student_coordinator_assignments (
          user:profiles (id, full_name, email, mobile_number)
        )
      `)
      .eq("slug", slug)
      .single();

    if (error || !event) return { success: false, error: "Event not found", event: null };

    return { success: true, event };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load event";
    return { success: false, error: msg, event: null };
  }
}

// 2. Fetch Single Event by Slug with Cache
export async function getEventBySlug(slug: string) {
  return unstable_cache(
    () => fetchEventBySlugRaw(slug),
    [`event-detail-${slug}`],
    { revalidate: 60, tags: ["public-events", `event-${slug}`] }
  )();
}

// 3. Register for an Event
export async function registerForEvent(eventId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Please sign in with Google to register." };
    }

    // Verify profile is completed
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_profile_completed, full_name, mobile_number")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_profile_completed) {
      return {
        success: false,
        error: "Please complete your participant profile before registering.",
        redirect: "/complete-profile",
      };
    }

    // Check if already registered
    const { data: existingReg } = await supabase
      .from("event_registrations")
      .select("id, registration_code, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReg) {
      return {
        success: true,
        alreadyRegistered: true,
        registrationCode: existingReg.registration_code,
        message: "You are already registered for this event.",
      };
    }

    // Check capacity and event data
    const { data: eventData } = await supabase
      .from("events")
      .select("id, name, participant_limit, registration_fee, is_pro_event, status")
      .eq("id", eventId)
      .single();

    if (!eventData || eventData.status === "registration_closed" || eventData.status === "completed") {
      return { success: false, error: "Registrations for this event are currently closed." };
    }

    // Check user's current total registrations to enforce 2-event limit & Pro rules
    const { data: userRegistrations } = await supabase
      .from("event_registrations")
      .select("id, event:events(id, name, is_pro_event), created_at")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });

    const activeRegs = userRegistrations || [];
    if (activeRegs.length >= 2) {
      return {
        success: false,
        error: "You have reached the maximum limit of 2 events per pass.",
      };
    }

    if (activeRegs.length === 1) {
      const firstEvt = (activeRegs[0] as unknown as { event?: { is_pro_event?: boolean } })?.event;
      const isFirstPro = Boolean(firstEvt?.is_pro_event);
      const isCandidatePro = Boolean(eventData.is_pro_event);

      if (isFirstPro && isCandidatePro) {
        return {
          success: false,
          error: "You can only select at most 1 Pro event per delegate pass.",
        };
      }

      if (!isFirstPro && isCandidatePro) {
        return {
          success: false,
          error: "Pro events can only be selected as your first event choice.",
        };
      }
    }

    const adminClient = await createAdminClient();
    const { count: currentRegCount } = await adminClient
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (eventData.participant_limit && (currentRegCount || 0) >= eventData.participant_limit) {
      return { success: false, error: "Event capacity has been reached." };
    }

    // Generate unique Pass Registration Code: EUPH-26-XXXXXX
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const registrationCode = `EUPH-26-${randomHex}`;
    const qrNonce = Math.random().toString(36).substring(2, 12);

    // If user is registering 2nd event under existing pass or event fee is 0, no additional payment needed
    const isFree = Number(eventData.registration_fee || 0) === 0 || activeRegs.length > 0;

    const { data: newReg, error: insertError } = await adminClient
      .from("event_registrations")
      .insert({
        event_id: eventId,
        user_id: user.id,
        registration_code: registrationCode,
        status: "confirmed",
        payment_status: isFree ? "not_required" : "pending",
        qr_secret_nonce: qrNonce,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: true, alreadyRegistered: true, message: "Already registered." };
      }
      throw insertError;
    }

    revalidateTag("public-events");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/events", "page");

    return {
      success: true,
      registrationCode,
      registration: newReg,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register";
    return { success: false, error: msg };
  }
}

// Raw Schedule Fetcher
async function fetchFestivalScheduleRaw() {
  try {
    const supabase = await createClient();

    const { data: events, error } = await supabase
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
        is_pro_event,
        status,
        category:event_categories (
          id,
          name,
          slug
        )
      `)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    const day1Events = (events || []).filter((e) => e.event_date === "2026-09-25");
    const day2Events = (events || []).filter((e) => e.event_date === "2026-09-26");
    const otherEvents = (events || []).filter(
      (e) => e.event_date !== "2026-09-25" && e.event_date !== "2026-09-26"
    );

    return {
      success: true,
      day1: day1Events,
      day2: day2Events,
      other: otherEvents,
      totalCount: (events || []).length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load schedule";
    return { success: false, error: msg, day1: [], day2: [], other: [], totalCount: 0 };
  }
}

// 4. Fetch Festival Schedule (Grouped by Day 1 & Day 2) with Cache
export const getFestivalSchedule = unstable_cache(
  fetchFestivalScheduleRaw,
  ["festival-schedule-cache"],
  { revalidate: 60, tags: ["public-events"] }
);

// Raw Announcements Fetcher
async function fetchPublicAnnouncementsRaw() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("announcements")
      .select(`
        id,
        title,
        content,
        urgency,
        created_at,
        event:events (
          id,
          name
        )
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map((ann: any) => ({
      ...ann,
      event: Array.isArray(ann.event) ? ann.event[0] : ann.event,
    }));

    return { success: true, announcements: mapped };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load announcements";
    return { success: false, error: msg, announcements: [] };
  }
}

// 5. Fetch Public Announcements with Cache
export const getPublicAnnouncements = unstable_cache(
  fetchPublicAnnouncementsRaw,
  ["public-announcements-cache"],
  { revalidate: 60, tags: ["public-announcements"] }
);

// 6. Fetch Public Registration Pricing Settings
export async function getPublicPricingSettings() {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "pricing_settings.json");

    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return {
        internal_base_fee: 300,
        internal_max_events_included: 2,
        internal_extra_event_fee: 100,
        external_base_fee: 400,
        external_max_events_included: 2,
        external_extra_event_fee: 150,
        pro_event_surcharge: 0,
        max_pro_events_allowed: 1,
        require_pro_first: true,
        is_registration_active: true,
      };
    }
  } catch {
    return {
      internal_base_fee: 300,
      internal_max_events_included: 2,
      internal_extra_event_fee: 100,
      external_base_fee: 400,
      external_max_events_included: 2,
      external_extra_event_fee: 150,
      pro_event_surcharge: 0,
      max_pro_events_allowed: 1,
      require_pro_first: true,
      is_registration_active: true,
    };
  }
}

// 7. Batch Register / Checkout for Events (Atomic Pass Engine)
export async function batchRegisterEvents(eventIds: string[]) {
  try {
    if (!eventIds || eventIds.length === 0) {
      return { success: false, error: "No events selected for registration." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Please log in to register.", redirect: "/login" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_profile_completed) {
      return {
        success: false,
        error: "Please complete your participant profile before registering for events.",
        redirect: "/complete-profile",
      };
    }

    // 1. Fetch user's existing confirmed registrations
    const { data: confirmedRegs } = await supabase
      .from("event_registrations")
      .select("id, event_id, status")
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    const activeRegs = confirmedRegs || [];

    // Rule: Total limit of 2 events
    if (activeRegs.length >= 2) {
      return {
        success: false,
        error: "You have already registered for the maximum limit of 2 events per pass.",
      };
    }

    if (activeRegs.length + eventIds.length > 2) {
      return {
        success: false,
        error: `You can only register for up to ${2 - activeRegs.length} more event(s).`,
      };
    }

    // Rule: Duplicate registration check
    const duplicateEvent = activeRegs.find((r) => eventIds.includes(r.event_id));
    if (duplicateEvent) {
      return {
        success: false,
        error: "You are already registered and confirmed for one or more of the selected events.",
      };
    }

    // 2. Check if user already has an active pass
    const { data: existingPass } = await supabase
      .from("delegate_passes")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingPass && existingPass.slots_used >= 2) {
      return {
        success: false,
        error: "You have already claimed both event slots under your active Festival Pass.",
      };
    }

    // If user already has an active pass with 1 slot used and is now submitting 1 event
    if (existingPass && existingPass.slots_used === 1 && eventIds.length === 1) {
      const { data: claimData, error: claimError } = await supabase.rpc(
        "fn_claim_second_slot_atomic",
        {
          p_user_id: user.id,
          p_event_id: eventIds[0],
        }
      );

      if (claimError || !claimData?.success) {
        return {
          success: false,
          error: claimData?.message || claimError?.message || "Failed to claim 2nd slot",
        };
      }

      revalidateTag("public-events");
      revalidatePath("/", "layout");
      revalidatePath("/dashboard", "page");
      revalidatePath("/events", "page");
      revalidatePath("/dashboard/passes", "page");

      return {
        success: true,
        masterCode: claimData.pass_code,
        totalRegistered: 2,
        totalPayable: 0,
        baseFee: 0,
        extraFee: 0,
        participantType: profile.participant_type,
        isIncrementalClaim: true,
      };
    }

    // Otherwise, perform full atomic pass checkout
    const { data: checkoutData, error: checkoutError } = await supabase.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: user.id,
        p_event_ids: eventIds,
        p_payment_provider: "mock",
        p_order_metadata: {
          participant_type: profile.participant_type,
          source: "web_cart_drawer",
        },
      }
    );

    if (checkoutError || !checkoutData?.success) {
      return {
        success: false,
        error: checkoutData?.message || checkoutError?.message || "Checkout failed",
      };
    }

    revalidateTag("public-events");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard/passes", "page");

    return {
      success: true,
      masterCode: checkoutData.pass_code,
      passTier: checkoutData.pass_tier,
      totalRegistered: checkoutData.slots_used,
      totalPayable: checkoutData.amount_paid,
      baseFee: checkoutData.amount_paid,
      extraFee: 0,
      participantType: profile.participant_type,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Batch registration failed";
    return { success: false, error: msg };
  }
}
