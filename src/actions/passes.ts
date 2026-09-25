"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/actions/auth";

export interface UserPassSummary {
  hasPass: boolean;
  passId?: string;
  passCode?: string;
  passTier?: "standard_pass" | "pro_pass";
  amountPaid?: number;
  totalSlots: number;
  slotsUsed: number;
  remainingSlots: number;
  passStatus?: string;
  registeredEvents: Array<{
    registrationId: string;
    slotNumber: number;
    eventId: string;
    name: string;
    slug: string;
    isProEvent: boolean;
    schoolOrDept: string;
    venue: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }>;
}

// 1. Get Current User's Active Festival Pass & Registered Events
export async function getUserPassSummary(): Promise<{
  success: boolean;
  data: UserPassSummary | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: true,
        data: {
          hasPass: false,
          totalSlots: 2,
          slotsUsed: 0,
          remainingSlots: 2,
          registeredEvents: [],
        },
      };
    }

    const { data, error } = await supabase
      .from("view_user_pass_summary")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // Fallback direct query if view isn't cached yet
      const { data: passData } = await supabase
        .from("delegate_passes")
        .select("id, pass_code, pass_tier, amount_paid, total_slots, slots_used, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      const { data: regs } = await supabase
        .from("event_registrations")
        .select(`
          id,
          slot_number,
          event_id,
          status,
          payment_status,
          created_at,
          event:events (
            id,
            name,
            slug,
            is_pro_event,
            school_or_dept,
            venue,
            event_date,
            start_time,
            end_time
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .order("slot_number", { ascending: true });

      const mappedEvents = (regs || []).map((r: any) => ({
        registrationId: r.id,
        slotNumber: r.slot_number || 1,
        eventId: r.event?.id || r.event_id,
        name: r.event?.name || "Event",
        slug: r.event?.slug || "",
        isProEvent: Boolean(r.event?.is_pro_event),
        schoolOrDept: r.event?.school_or_dept || "",
        venue: r.event?.venue || "",
        eventDate: r.event?.event_date || "",
        startTime: r.event?.start_time || "",
        endTime: r.event?.end_time || "",
        status: r.status,
        paymentStatus: r.payment_status,
        createdAt: r.created_at,
      }));

      const slotsUsed = passData?.slots_used ?? mappedEvents.length;

      return {
        success: true,
        data: {
          hasPass: Boolean(passData || mappedEvents.length > 0),
          passId: passData?.id,
          passCode: passData?.pass_code || (mappedEvents[0] ? `EUPH-26-${user.id.substring(0, 6).toUpperCase()}` : undefined),
          passTier: passData?.pass_tier || (mappedEvents.some((e: any) => e.isProEvent) ? "pro_pass" : "standard_pass"),
          amountPaid: Number(passData?.amount_paid || 0),
          totalSlots: 2,
          slotsUsed: slotsUsed,
          remainingSlots: Math.max(0, 2 - slotsUsed),
          passStatus: passData?.status || (mappedEvents.length > 0 ? "active" : undefined),
          registeredEvents: mappedEvents,
        },
      };
    }

    const regEvents = (data?.registered_events || []).map((e: any) => ({
      registrationId: e.registration_id,
      slotNumber: e.slot_number || 1,
      eventId: e.event_id,
      name: e.name,
      slug: e.slug,
      isProEvent: Boolean(e.is_pro_event),
      schoolOrDept: e.school_or_dept,
      venue: e.venue,
      eventDate: e.event_date,
      startTime: e.start_time,
      endTime: e.end_time,
      status: e.status,
      paymentStatus: e.payment_status,
      createdAt: e.created_at,
    }));

    const slotsUsed = data?.slots_used ?? regEvents.length;

    return {
      success: true,
      data: {
        hasPass: Boolean(data?.pass_id || regEvents.length > 0),
        passId: data?.pass_id,
        passCode: data?.pass_code,
        passTier: data?.pass_tier,
        amountPaid: Number(data?.amount_paid || 0),
        totalSlots: Number(data?.total_slots || 2),
        slotsUsed: Number(slotsUsed),
        remainingSlots: Math.max(0, 2 - Number(slotsUsed)),
        passStatus: data?.pass_status,
        registeredEvents: regEvents,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load pass summary";
    return { success: false, data: null, error: msg };
  }
}

// 2. Atomic Checkout Pass Action (For 1 or 2 events upfront)
export async function checkoutPassAction(
  eventIds: string[],
  paymentProvider = "mock"
) {
  try {
    if (!eventIds || eventIds.length === 0) {
      return { success: false, error: "No events selected." };
    }

    if (eventIds.length > 2) {
      return { success: false, error: "A festival pass allows at most 2 events." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Please log in to purchase your festival pass.", redirect: "/login" };
    }

    // Check user's current confirmed registrations
    const { data: confirmedRegs } = await supabase
      .from("event_registrations")
      .select("id, event_id")
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    const activeRegs = confirmedRegs || [];
    if (activeRegs.length >= 2) {
      return { success: false, error: "You have already registered for the maximum limit of 2 events per pass." };
    }

    if (activeRegs.some((r) => eventIds.includes(r.event_id))) {
      return { success: false, error: "You are already registered and confirmed for one or more of the selected events." };
    }

    // Call atomic PostgreSQL function
    const { data, error } = await supabase.rpc("fn_checkout_pass_atomic", {
      p_user_id: user.id,
      p_event_ids: eventIds,
      p_payment_provider: paymentProvider,
      p_order_metadata: {
        source: "web_cart_checkout",
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      console.error("Atomic pass checkout RPC error:", error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.message || data?.error || "Pass checkout failed",
      };
    }

    revalidatePath("/events", "page");
    revalidatePath("/dashboard", "page");
    revalidatePath("/dashboard/passes", "page");

    return {
      success: true,
      passId: data.pass_id,
      passCode: data.pass_code,
      passTier: data.pass_tier,
      amountPaid: data.amount_paid,
      slotsUsed: data.slots_used,
      totalSlots: data.total_slots,
      orderId: data.order_id,
      orderNumber: data.order_number,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to checkout pass";
    return { success: false, error: msg };
  }
}

// 3. Atomic Claim Second Slot Action (Claim remaining included slot for ₹0)
export async function claimSecondSlotAction(eventId: string) {
  try {
    if (!eventId) {
      return { success: false, error: "No event specified." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Please log in to claim your 2nd event.", redirect: "/login" };
    }

    // Check if user is already registered for this event or has 2 events
    const { data: confirmedRegs } = await supabase
      .from("event_registrations")
      .select("id, event_id")
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    const activeRegs = confirmedRegs || [];
    if (activeRegs.length >= 2) {
      return { success: false, error: "You have already claimed both 2 event slots under your pass." };
    }
    if (activeRegs.some((r) => r.event_id === eventId)) {
      return { success: false, error: "You are already registered for this event." };
    }

    // Fetch user profile to verify participant type
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, participant_type")
      .eq("id", user.id)
      .maybeSingle();

    const isInternalUser = profile?.participant_type === "internal" || (user.email || "").toLowerCase().endsWith("@klu.ac.in");

    // Verify slot 2 event capacity before claiming
    let targetEvent: any = null;
    const { data: eventWithCol, error: evtColErr } = await supabase
      .from("events")
      .select("id, name, participant_limit, internal_limit, allow_internal, allow_external, first_preference_only, status")
      .eq("id", eventId)
      .single();

    if (evtColErr) {
      const { data: eventFallback } = await supabase
        .from("events")
        .select("id, name, participant_limit, internal_limit, allow_internal, allow_external, status")
        .eq("id", eventId)
        .single();
      targetEvent = eventFallback;
    } else {
      targetEvent = eventWithCol;
    }

    if (targetEvent) {
      if (Boolean(targetEvent.first_preference_only)) {
        return {
          success: false,
          error: `Claim Blocked: "${targetEvent.name}" is restricted to First Preference only and cannot be claimed as a 2nd event slot.`,
        };
      }

      if (isInternalUser && targetEvent.allow_internal === false) {
        return {
          success: false,
          error: `Claim Blocked: "${targetEvent.name}" is closed for Kalasalingam University students. Remaining slots are reserved exclusively for external delegates.`,
        };
      }

      if (!isInternalUser && targetEvent.allow_external === false) {
        return {
          success: false,
          error: `Claim Blocked: "${targetEvent.name}" is not open to external delegates.`,
        };
      }

      if (isInternalUser && targetEvent.internal_limit !== null && targetEvent.internal_limit !== undefined) {
        const { data: intRegs } = await supabase
          .from("event_registrations")
          .select(`
            id,
            user:profiles (
              email,
              participant_type
            )
          `)
          .eq("event_id", eventId)
          .eq("status", "confirmed");

        let currentInternalCount = 0;
        (intRegs || []).forEach((r: any) => {
          const userObj = Array.isArray(r.user) ? r.user[0] : r.user;
          const email = (userObj?.email || "").toLowerCase();
          if (userObj?.participant_type === "internal" || email.endsWith("@klu.ac.in")) {
            currentInternalCount++;
          }
        });

        if (currentInternalCount >= Number(targetEvent.internal_limit)) {
          return {
            success: false,
            error: `Claim Blocked: The Kalasalingam student quota for "${targetEvent.name}" is full (${currentInternalCount}/${targetEvent.internal_limit} seats taken). Remaining slots are reserved exclusively for external delegates.`,
          };
        }
      }

      const limit = Number(targetEvent.participant_limit || 100);
      const { count: regCount } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      if ((regCount || 0) >= limit) {
        return {
          success: false,
          error: `Claim Blocked: "${targetEvent.name}" has reached full capacity (${regCount}/${limit} seats filled). Please choose another competition.`,
        };
      }
    }

    // Call atomic PostgreSQL function
    const { data, error } = await supabase.rpc("fn_claim_second_slot_atomic", {
      p_user_id: user.id,
      p_event_id: eventId,
    });

    if (error || !data?.success) {
      console.warn("Notice: fn_claim_second_slot_atomic returned error, applying service-role direct claim fallback:", error || data);

      const adminClient = await createAdminClient();

      // Fetch user's active pass
      const { data: pass } = await adminClient
        .from("delegate_passes")
        .select("id, pass_code, pass_tier, slots_used, total_slots")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!pass) {
        return { success: false, error: "Active delegate pass not found." };
      }

      // Fetch user's confirmed registrations
      const { data: existingRegs } = await adminClient
        .from("event_registrations")
        .select("id, slot_number, event_id")
        .eq("user_id", user.id)
        .eq("status", "confirmed");

      const activeRegs = existingRegs || [];
      if (activeRegs.some((r) => r.event_id === eventId)) {
        return {
          success: true,
          passCode: pass.pass_code,
          passTier: pass.pass_tier,
          slotsUsed: 2,
          totalSlots: 2,
          eventName: targetEvent?.name || "Competition",
        };
      }

      if (activeRegs.length >= 2) {
        return { success: false, error: "Both event slots are already registered on your pass." };
      }

      // Determine open slot
      const usedSlots = new Set(activeRegs.map((r) => r.slot_number));
      const targetSlot = usedSlots.has(2) ? 1 : 2;
      const regCode = `${pass.pass_code}-S${targetSlot}`;

      const { data: newReg, error: regErr } = await adminClient
        .from("event_registrations")
        .insert({
          pass_id: pass.id,
          event_id: eventId,
          user_id: user.id,
          slot_number: targetSlot,
          registration_code: regCode,
          status: "confirmed",
          payment_status: "paid",
          qr_secret_nonce: Math.random().toString(36).substring(2),
        })
        .select("id")
        .single();

      if (regErr || !newReg) {
        return {
          success: false,
          error: data?.message || data?.error || error?.message || "Failed to claim 2nd slot",
        };
      }

      // Update pass slots_used to 2
      await adminClient
        .from("delegate_passes")
        .update({ slots_used: 2 })
        .eq("id", pass.id);

      revalidateTag("public-events");
      revalidateTag("admin-users");
      revalidatePath("/events", "page");
      revalidatePath("/dashboard", "page");
      revalidatePath("/dashboard/passes", "page");

      return {
        success: true,
        passCode: pass.pass_code,
        passTier: pass.pass_tier,
        slotsUsed: 2,
        totalSlots: 2,
        eventName: targetEvent?.name || "Competition",
      };
    }

    revalidateTag("public-events");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard", "page");
    revalidatePath("/dashboard/passes", "page");

    return {
      success: true,
      passCode: data.pass_code,
      passTier: data.pass_tier,
      slotsUsed: data.slots_used,
      totalSlots: data.total_slots,
      eventName: data.event_name,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to claim 2nd slot";
    return { success: false, error: msg };
  }
}

// 4. Unified Session Bundle for App Providers (Cuts 3 client-to-Supabase PostgREST queries down to 1 cached server bundle)
export async function getAppUserSessionBundle() {
  try {
    const authState = await getCurrentUser();
    if (!authState || !authState.user) {
      return {
        success: true,
        user: null,
        userPass: undefined,
        confirmedEvents: [],
      };
    }

    const { user, profile, roles, isAdmin, isStaff, isCoordinator } = authState;

    const isSuperAdmin = roles.includes("super_admin");
    const isOverall = roles.includes("overall_coordinator");
    const isStaffCoord = isStaff;
    const isStudentCoord = roles.includes("student_coordinator") || isCoordinator;

    const resolvedRole = isSuperAdmin
      ? "super_admin"
      : isAdmin
      ? "admin"
      : isOverall
      ? "overall_coordinator"
      : isStaffCoord
      ? "staff_coordinator"
      : isStudentCoord
      ? "student_coordinator"
      : "participant";

    const loadedUser = {
      id: user.id,
      email: user.email || "",
      fullName: profile?.full_name || undefined,
      participantType: (profile?.participant_type as "internal" | "external") || null,
      isProfileCompleted: Boolean(profile?.is_profile_completed),
      role: resolvedRole as any,
    };

    const passRes = await getUserPassSummary();
    let loadedPass = undefined;
    let loadedEvents: Array<{
      id: string;
      eventId: string;
      name: string;
      isProEvent: boolean;
      slotNumber: number;
      registrationCode: string;
    }> = [];

    if (passRes.success && passRes.data) {
      loadedPass = {
        hasPass: passRes.data.hasPass,
        passCode: passRes.data.passCode,
        passTier: passRes.data.passTier,
        amountPaid: passRes.data.amountPaid,
        totalSlots: passRes.data.totalSlots,
        slotsUsed: passRes.data.slotsUsed,
        remainingSlots: passRes.data.remainingSlots,
      };

      loadedEvents = (passRes.data.registeredEvents || []).map((r: any) => ({
        id: r.registrationId,
        eventId: r.eventId,
        name: r.name,
        isProEvent: r.isProEvent,
        slotNumber: r.slotNumber,
        registrationCode: passRes.data?.passCode || "",
      }));
    }

    return {
      success: true,
      user: loadedUser,
      userPass: loadedPass,
      confirmedEvents: loadedEvents,
    };
  } catch (err) {
    console.error("getAppUserSessionBundle error:", err);
    return {
      success: false,
      user: null,
      userPass: undefined,
      confirmedEvents: [],
    };
  }
}

