"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
        .select("*")
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

    revalidatePath("/", "layout");
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

    // Call atomic PostgreSQL function
    const { data, error } = await supabase.rpc("fn_claim_second_slot_atomic", {
      p_user_id: user.id,
      p_event_id: eventId,
    });

    if (error) {
      console.error("Atomic claim second slot RPC error:", error);
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.message || data?.error || "Failed to claim 2nd event slot",
      };
    }

    revalidatePath("/", "layout");
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
