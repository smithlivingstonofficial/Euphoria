"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Fetch Public Events with Categories & Registrations
export async function getPublicEvents() {
  try {
    const supabase = await createClient();

    const [{ data: events, error: eventsError }, { data: categories }] =
      await Promise.all([
        supabase
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
              status
            )
          `)
          .in("status", ["registration_open", "published", "ongoing", "registration_closed"])
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

// 2. Fetch Single Event by Slug
export async function getEventBySlug(slug: string) {
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

// 4. Fetch Festival Schedule (Grouped by Day 1 & Day 2)
export async function getFestivalSchedule() {
  try {
    const supabase = await createClient();

    const { data: events, error } = await supabase
      .from("events")
      .select(`
        *,
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

// 5. Fetch Public Announcements
export async function getPublicAnnouncements() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("announcements")
      .select(`
        *,
        event:events (
          id,
          name
        )
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, announcements: data || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load announcements";
    return { success: false, error: msg, announcements: [] };
  }
}

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

// 7. Batch Register for Multiple Events (Cart Checkout)
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

    if (eventIds.length > 2) {
      return { success: false, error: "You can register for a maximum of 2 events per pass." };
    }

    const adminClient = await createAdminClient();

    // Fetch and validate event tiers
    const { data: selectedEventsData, error: fetchEventsError } = await adminClient
      .from("events")
      .select("id, name, is_pro_event, status, participant_limit, registration_fee")
      .in("id", eventIds);

    if (fetchEventsError || !selectedEventsData) {
      return { success: false, error: "Failed to validate selected events." };
    }

    const eventMap = new Map(selectedEventsData.map((e) => [e.id, e]));
    const proEventsCount = selectedEventsData.filter((e) => Boolean(e.is_pro_event)).length;

    if (proEventsCount > 1) {
      return { success: false, error: "You can only select at most 1 Pro event per delegate pass." };
    }

    // Order constraint: If first event was normal, second cannot be pro
    if (eventIds.length === 2) {
      const firstEvent = eventMap.get(eventIds[0]);
      const secondEvent = eventMap.get(eventIds[1]);

      if (firstEvent && secondEvent) {
        if (!firstEvent.is_pro_event && secondEvent.is_pro_event) {
          return {
            success: false,
            error: "Pro events must be selected as your first event choice.",
          };
        }
      }
    }

    // Check prior confirmed registrations
    const { data: priorRegistrations } = await adminClient
      .from("event_registrations")
      .select("id, event:events(id, is_pro_event), payment_status")
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    const priorCount = (priorRegistrations || []).length;
    if (priorCount + eventIds.length > 2) {
      return { success: false, error: "You can register for a maximum of 2 events per pass." };
    }

    const pricing = await getPublicPricingSettings();
    const hasPro =
      selectedEventsData.some((e) => Boolean(e.is_pro_event)) ||
      (priorRegistrations || []).some((r) =>
        Boolean((r.event as unknown as { is_pro_event?: boolean })?.is_pro_event)
      );

    const proPassFee = Number(pricing.pro_pass_fee ?? 300);
    const normalPassFee = Number(pricing.normal_pass_fee ?? 200);

    // If user is adding a 2nd event to an existing pass, additional fee is ₹0
    const totalPayable = priorCount > 0 ? 0 : hasPro ? proPassFee : normalPassFee;

    // Generate shared master batch Pass code
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const masterCode = `EUPH-26-${randomHex}`;

    // Register all events
    const insertedRegistrations = [];
    for (const eventId of eventIds) {
      const qrNonce = Math.random().toString(36).substring(2, 12);
      const { data: reg, error: insertError } = await adminClient
        .from("event_registrations")
        .insert({
          event_id: eventId,
          user_id: user.id,
          registration_code: masterCode,
          status: "confirmed",
          payment_status: totalPayable === 0 ? "not_required" : "pending",
          qr_secret_nonce: qrNonce,
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (insertError) {
        // If already registered, ignore duplicate conflict
        if (insertError.code !== "23505") {
          console.error("Batch reg insert error:", insertError);
        }
      } else if (reg) {
        insertedRegistrations.push(reg);
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/events", "page");

    return {
      success: true,
      masterCode,
      totalRegistered: eventIds.length,
      totalPayable,
      baseFee: totalPayable,
      extraFee: 0,
      participantType: profile.participant_type,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Batch registration failed";
    return { success: false, error: msg };
  }
}

