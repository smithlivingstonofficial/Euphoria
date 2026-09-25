"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCallerAuthInfo, getAdminEventsListSimpleAction, AdminEventSimpleItem } from "./admin";
import { revalidatePath, revalidateTag } from "next/cache";

export interface PassDiscrepancyItem {
  id: string; // Unique identifier for table row (passId, orderId, or composite)
  type: "unenrolled" | "partially_enrolled" | "slot_desync" | "paid_without_pass";
  userId: string;
  studentName: string;
  email: string;
  mobileNumber?: string;
  registerNumber?: string;
  collegeName?: string;
  department?: string;
  course?: string;
  yearOfStudy?: number;
  participantType: "internal" | "external";
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
  order?: {
    id: string;
    orderNumber: string;
    amount: number;
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
    event: {
      id: string;
      name: string;
      schoolOrDept?: string;
      venue?: string;
      eventDate?: string;
      startTime?: string;
      isProEvent?: boolean;
      categoryName?: string;
    };
  }>;
  discrepancyDescription: string;
  severity: "critical" | "warning" | "info";
}

export interface PassDiscrepancyMetrics {
  total: number;
  unenrolled: number; // Pass issued, 0 events
  partiallyEnrolled: number; // 1 event, slot 2 open
  slotDesync: number; // pass.slots_used != actual count
  paidWithoutPass: number; // Paid order, no pass record
}

/**
 * 1. Fetch all pass discrepancies, unenrolled students, and queries
 */
export async function getPassDiscrepanciesAdminAction(): Promise<{
  success: boolean;
  items: PassDiscrepancyItem[];
  metrics: PassDiscrepancyMetrics;
  availableEvents: AdminEventSimpleItem[];
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 2) {
      return {
        success: false,
        error: "Unauthorized: Administrator privileges required.",
        items: [],
        metrics: { total: 0, unenrolled: 0, partiallyEnrolled: 0, slotDesync: 0, paidWithoutPass: 0 },
        availableEvents: [],
      };
    }

    const adminClient = await createAdminClient();

    // Fetch active passes, confirmed registrations, paid orders, and events catalog in parallel
    const [
      { data: passes, error: passErr },
      { data: registrations, error: regErr },
      { data: paidOrders, error: ordErr },
      eventsRes,
    ] = await Promise.all([
      adminClient
        .from("delegate_passes")
        .select(`
          id,
          user_id,
          pass_code,
          pass_tier,
          amount_paid,
          total_slots,
          slots_used,
          status,
          created_at,
          user:profiles!delegate_passes_user_id_fkey (
            id,
            full_name,
            email,
            mobile_number,
            register_number,
            college_name,
            department,
            course,
            year_of_study,
            participant_type
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false }),

      adminClient
        .from("event_registrations")
        .select(`
          id,
          user_id,
          event_id,
          pass_id,
          slot_number,
          registration_code,
          status,
          payment_status,
          is_attended:attendance(id),
          event:events (
            id,
            name,
            slug,
            school_or_dept,
            venue,
            event_date,
            start_time,
            is_pro_event,
            category:event_categories (
              id,
              name
            )
          )
        `)
        .eq("status", "confirmed")
        .order("slot_number", { ascending: true }),

      adminClient
        .from("orders")
        .select(`
          id,
          user_id,
          order_number,
          amount,
          status,
          created_at,
          user:profiles!orders_user_id_fkey (
            id,
            full_name,
            email,
            mobile_number,
            register_number,
            college_name,
            department,
            participant_type
          )
        `)
        .eq("status", "paid")
        .order("created_at", { ascending: false }),

      getAdminEventsListSimpleAction(),
    ]);

    if (passErr) throw passErr;
    if (regErr) throw regErr;

    // Group registrations by user_id
    const regsByUser: Record<string, any[]> = {};
    (registrations || []).forEach((reg: any) => {
      const uId = reg.user_id;
      if (!regsByUser[uId]) regsByUser[uId] = [];
      const catObj = Array.isArray(reg.event?.category) ? reg.event.category[0] : reg.event?.category;
      const isAttended = Array.isArray(reg.is_attended) ? reg.is_attended.length > 0 : Boolean(reg.is_attended);

      regsByUser[uId].push({
        id: reg.id,
        slotNumber: reg.slot_number || 1,
        registrationCode: reg.registration_code,
        status: reg.status,
        paymentStatus: reg.payment_status,
        isAttended,
        event: {
          id: reg.event?.id || reg.event_id,
          name: reg.event?.name || "Competition",
          schoolOrDept: reg.event?.school_or_dept || "",
          venue: reg.event?.venue || "Campus Venue",
          eventDate: reg.event?.event_date || "",
          startTime: reg.event?.start_time || "",
          isProEvent: Boolean(reg.event?.is_pro_event),
          categoryName: catObj?.name || "General",
        },
      });
    });

    const items: PassDiscrepancyItem[] = [];
    const userPassMap = new Set<string>();

    let unenrolledCount = 0;
    let partiallyEnrolledCount = 0;
    let slotDesyncCount = 0;
    let paidWithoutPassCount = 0;

    // A. Analyze Delegate Passes for unenrolled students & slot desyncs
    (passes || []).forEach((p: any) => {
      const user = Array.isArray(p.user) ? p.user[0] : p.user;
      if (!user) return;

      userPassMap.add(p.user_id);
      const userRegs = regsByUser[p.user_id] || [];
      const actualCount = userRegs.length;
      const recordedSlotsUsed = Number(p.slots_used || 0);

      // Condition 1: Generated with pass, but 0 events enrolled!
      if (actualCount === 0) {
        unenrolledCount++;
        items.push({
          id: `unenrolled-${p.id}`,
          type: "unenrolled",
          userId: user.id,
          studentName: user.full_name || "Unknown Delegate",
          email: user.email || "",
          mobileNumber: user.mobile_number,
          registerNumber: user.register_number,
          collegeName: user.college_name,
          department: user.department,
          course: user.course,
          yearOfStudy: user.year_of_study,
          participantType: user.participant_type || "external",
          pass: {
            id: p.id,
            passCode: p.pass_code,
            passTier: p.pass_tier,
            amountPaid: Number(p.amount_paid || 0),
            slotsUsed: recordedSlotsUsed,
            totalSlots: Number(p.total_slots || 2),
            status: p.status,
            createdAt: p.created_at,
          },
          order: null,
          registrations: [],
          discrepancyDescription: "Pass is generated and active, but the student is NOT enrolled in any event.",
          severity: "critical",
        });
      }
      // Condition 2: Slot Count Desync (recorded slotsUsed != actual count of confirmed events)
      else if (recordedSlotsUsed !== actualCount) {
        slotDesyncCount++;
        items.push({
          id: `desync-${p.id}`,
          type: "slot_desync",
          userId: user.id,
          studentName: user.full_name || "Unknown Delegate",
          email: user.email || "",
          mobileNumber: user.mobile_number,
          registerNumber: user.register_number,
          collegeName: user.college_name,
          department: user.department,
          course: user.course,
          yearOfStudy: user.year_of_study,
          participantType: user.participant_type || "external",
          pass: {
            id: p.id,
            passCode: p.pass_code,
            passTier: p.pass_tier,
            amountPaid: Number(p.amount_paid || 0),
            slotsUsed: recordedSlotsUsed,
            totalSlots: Number(p.total_slots || 2),
            status: p.status,
            createdAt: p.created_at,
          },
          order: null,
          registrations: userRegs,
          discrepancyDescription: `Pass record states ${recordedSlotsUsed} slots used, but database contains ${actualCount} confirmed registrations.`,
          severity: "warning",
        });
      }
      // Condition 3: Partially enrolled (Only 1 event enrolled, Slot 2 unclaimed)
      else if (actualCount === 1) {
        partiallyEnrolledCount++;
        items.push({
          id: `partial-${p.id}`,
          type: "partially_enrolled",
          userId: user.id,
          studentName: user.full_name || "Unknown Delegate",
          email: user.email || "",
          mobileNumber: user.mobile_number,
          registerNumber: user.register_number,
          collegeName: user.college_name,
          department: user.department,
          course: user.course,
          yearOfStudy: user.year_of_study,
          participantType: user.participant_type || "external",
          pass: {
            id: p.id,
            passCode: p.pass_code,
            passTier: p.pass_tier,
            amountPaid: Number(p.amount_paid || 0),
            slotsUsed: recordedSlotsUsed,
            totalSlots: Number(p.total_slots || 2),
            status: p.status,
            createdAt: p.created_at,
          },
          order: null,
          registrations: userRegs,
          discrepancyDescription: "1 of 2 event slots assigned. Student is eligible to register 1 more event for ₹0.",
          severity: "info",
        });
      }
    });

    // B. Analyze Paid Orders without a delegate pass record
    (paidOrders || []).forEach((ord: any) => {
      if (!userPassMap.has(ord.user_id)) {
        paidWithoutPassCount++;
        const u = Array.isArray(ord.user) ? ord.user[0] : ord.user;
        items.push({
          id: `paid-no-pass-${ord.id}`,
          type: "paid_without_pass",
          userId: ord.user_id,
          studentName: u?.full_name || "Unknown User",
          email: u?.email || "",
          mobileNumber: u?.mobile_number,
          registerNumber: u?.register_number,
          collegeName: u?.college_name,
          department: u?.department,
          participantType: u?.participant_type || "external",
          pass: null,
          order: {
            id: ord.id,
            orderNumber: ord.order_number,
            amount: Number(ord.amount || 0),
            status: ord.status,
            createdAt: ord.created_at,
          },
          registrations: regsByUser[ord.user_id] || [],
          discrepancyDescription: `Order #${ord.order_number} is PAID, but no festival delegate pass was created in database.`,
          severity: "critical",
        });
      }
    });

    // Sort items: critical first, then warning, then info; then newest
    const severityWeight: Record<string, number> = { critical: 3, warning: 2, info: 1 };
    items.sort((a, b) => {
      const diff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (diff !== 0) return diff;
      const dateA = a.pass?.createdAt || a.order?.createdAt || "";
      const dateB = b.pass?.createdAt || b.order?.createdAt || "";
      return dateB.localeCompare(dateA);
    });

    return {
      success: true,
      items,
      metrics: {
        total: items.length,
        unenrolled: unenrolledCount,
        partiallyEnrolled: partiallyEnrolledCount,
        slotDesync: slotDesyncCount,
        paidWithoutPass: paidWithoutPassCount,
      },
      availableEvents: eventsRes.success ? eventsRes.events : [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load pass discrepancies";
    console.error("getPassDiscrepanciesAdminAction error:", err);
    return {
      success: false,
      error: msg,
      items: [],
      metrics: { total: 0, unenrolled: 0, partiallyEnrolled: 0, slotDesync: 0, paidWithoutPass: 0 },
      availableEvents: [],
    };
  }
}

/**
 * 2. Quick Enroll Student into Competition Slot
 */
export async function adminQuickEnrollStudentAction({
  passId,
  userId,
  eventId,
  slotNumber,
  overrideCapacity = false,
  overrideInstitution = false,
  notes,
}: {
  passId: string;
  userId: string;
  eventId: string;
  slotNumber: number;
  overrideCapacity?: boolean;
  overrideInstitution?: boolean;
  notes?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  registration?: any;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 3) {
      return { success: false, error: "Unauthorized: Level 3+ Admin privileges required to enroll student." };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch pass
    const { data: pass, error: passErr } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code, pass_tier, slots_used, status")
      .eq("id", passId)
      .single();

    if (passErr || !pass) {
      return { success: false, error: "Delegate pass record not found." };
    }

    // 2. Check if already registered for this event
    const { data: existingRegs } = await adminClient
      .from("event_registrations")
      .select("id, slot_number, event_id")
      .eq("user_id", userId)
      .eq("status", "confirmed");

    const activeRegs = existingRegs || [];
    if (activeRegs.some((r) => r.event_id === eventId)) {
      return { success: false, error: "Student is already registered for this competition in another slot." };
    }

    // Check if slotNumber is already taken, if so, pick alternate
    const usedSlots = new Set(activeRegs.map((r) => r.slot_number));
    let targetSlot = slotNumber;
    if (usedSlots.has(targetSlot)) {
      targetSlot = targetSlot === 1 ? 2 : 1;
      if (usedSlots.has(targetSlot)) {
        return { success: false, error: "Both Slot #1 and Slot #2 are already registered." };
      }
    }

    // 3. Fetch event details
    const { data: targetEvent, error: evtErr } = await adminClient
      .from("events")
      .select(`
        id,
        name,
        venue,
        event_date,
        start_time,
        participant_limit,
        internal_limit,
        allow_internal,
        allow_external,
        is_pro_event,
        category:event_categories(name)
      `)
      .eq("id", eventId)
      .single();

    if (evtErr || !targetEvent) {
      return { success: false, error: "Target competition not found." };
    }

    // 4. Policy checks
    const { data: profile } = await adminClient
      .from("profiles")
      .select("participant_type, email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const isInternal = profile?.participant_type === "internal" || (profile?.email || "").toLowerCase().endsWith("@klu.ac.in");

    if (!overrideCapacity) {
      if (targetEvent.is_pro_event && pass.pass_tier !== "pro_pass") {
        return {
          success: false,
          error: `"${targetEvent.name}" is a PRO event, but the student holds a Standard Pass. Enable Force Override to enroll.`,
        };
      }

      if (!overrideInstitution) {
        if (isInternal && targetEvent.allow_internal === false) {
          return {
            success: false,
            error: `"${targetEvent.name}" is closed for Kalasalingam University students. Enable Force Override to enroll.`,
          };
        }
        if (!isInternal && targetEvent.allow_external === false) {
          return {
            success: false,
            error: `"${targetEvent.name}" is restricted to Kalasalingam students only. Enable Force Override to enroll.`,
          };
        }
      }

      const { count: totalRegs } = await adminClient
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      const limit = Number(targetEvent.participant_limit || 100);
      if ((totalRegs || 0) >= limit) {
        return {
          success: false,
          error: `"${targetEvent.name}" has reached full capacity (${totalRegs}/${limit} seats). Enable Force Override to enroll.`,
        };
      }
    }

    // 5. Insert event registration
    const regCode = `${pass.pass_code}-S${targetSlot}`;
    const { data: newReg, error: insErr } = await adminClient
      .from("event_registrations")
      .insert({
        pass_id: pass.id,
        user_id: userId,
        event_id: eventId,
        slot_number: targetSlot,
        registration_code: regCode,
        status: "confirmed",
        payment_status: "paid",
        qr_secret_nonce: Math.random().toString(36).substring(2),
      })
      .select("id, slot_number, registration_code, status, payment_status")
      .single();

    if (insErr || !newReg) throw insErr || new Error("Failed to insert event registration");

    // 6. Update delegate pass slots_used to match exact confirmed count
    const updatedCount = Math.min(2, activeRegs.length + 1);
    await adminClient
      .from("delegate_passes")
      .update({ slots_used: updatedCount })
      .eq("id", pass.id);

    // 7. Audit log
    try {
      await adminClient.from("payment_audit_logs").insert({
        issue_id: null,
        admin_id: authInfo.user.id,
        action_taken: "slot_enrolled",
        previous_status: "unenrolled",
        new_status: eventId,
        notes: `Admin ${authInfo.user.email} enrolled student ${profile?.full_name || userId} into "${targetEvent.name}" (Slot #${targetSlot}). Code: ${regCode}. Override: ${overrideCapacity}`,
      });
    } catch {
      // Non-fatal
    }

    // 8. Revalidate
    revalidateTag("admin-users");
    revalidateTag("public-events");
    revalidateTag("admin-events");
    revalidatePath("/admin/pass-issues", "page");
    revalidatePath("/admin/users", "page");
    revalidatePath("/dashboard", "page");

    return {
      success: true,
      message: `Successfully enrolled ${profile?.full_name || "student"} into "${targetEvent.name}" for Slot #${targetSlot}!`,
      registration: {
        id: newReg.id,
        slotNumber: targetSlot,
        registrationCode: regCode,
        status: newReg.status,
        paymentStatus: newReg.payment_status,
        isAttended: false,
        event: {
          id: targetEvent.id,
          name: targetEvent.name,
          venue: targetEvent.venue || "",
          eventDate: targetEvent.event_date || "",
          startTime: targetEvent.start_time || "",
          isProEvent: Boolean(targetEvent.is_pro_event),
          categoryName: Array.isArray(targetEvent.category) ? targetEvent.category[0]?.name : (targetEvent.category as any)?.name,
        },
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to enroll student into event";
    return { success: false, error: msg };
  }
}

/**
 * 3. Repair / Sync Desynced Pass Slots for Single User
 */
export async function adminSyncPassSlotsAction({
  passId,
  userId,
}: {
  passId: string;
  userId: string;
}): Promise<{
  success: boolean;
  newSlotCount?: number;
  message?: string;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 3) {
      return { success: false, error: "Unauthorized: Level 3+ Admin privileges required." };
    }

    const adminClient = await createAdminClient();

    // Count actual confirmed event registrations for this user
    const { count: actualCount, error: countErr } = await adminClient
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "confirmed");

    if (countErr) throw countErr;

    const targetSlots = Math.min(2, Math.max(0, actualCount || 0));

    // Update delegate_passes
    const { error: updErr } = await adminClient
      .from("delegate_passes")
      .update({ slots_used: targetSlots })
      .eq("id", passId);

    if (updErr) throw updErr;

    revalidateTag("admin-users");
    revalidatePath("/admin/pass-issues", "page");
    revalidatePath("/admin/users", "page");

    return {
      success: true,
      newSlotCount: targetSlots,
      message: `Pass slots successfully synchronized to ${targetSlots} based on confirmed registrations.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to sync pass slots";
    return { success: false, error: msg };
  }
}

/**
 * 4. Batch Repair All Desynced Pass Slots in One Click
 */
export async function adminBatchSyncAllSlotsAction(): Promise<{
  success: boolean;
  repairedCount: number;
  message?: string;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 3) {
      return { success: false, error: "Unauthorized: Level 3+ Admin privileges required.", repairedCount: 0 };
    }

    const adminClient = await createAdminClient();

    // 1. Fetch all active passes and registrations
    const [{ data: passes }, { data: registrations }] = await Promise.all([
      adminClient.from("delegate_passes").select("id, user_id, slots_used").eq("status", "active"),
      adminClient.from("event_registrations").select("id, user_id").eq("status", "confirmed"),
    ]);

    const regCountByUser: Record<string, number> = {};
    (registrations || []).forEach((r) => {
      regCountByUser[r.user_id] = (regCountByUser[r.user_id] || 0) + 1;
    });

    let repaired = 0;
    const updatePromises: Promise<any>[] = [];

    (passes || []).forEach((p) => {
      const actual = Math.min(2, regCountByUser[p.user_id] || 0);
      const recorded = Number(p.slots_used || 0);
      if (actual !== recorded) {
        repaired++;
        updatePromises.push(
          Promise.resolve(
            adminClient
              .from("delegate_passes")
              .update({ slots_used: actual })
              .eq("id", p.id)
          )
        );
      }
    });

    await Promise.all(updatePromises);

    revalidateTag("admin-users");
    revalidatePath("/admin/pass-issues", "page");
    revalidatePath("/admin/users", "page");

    return {
      success: true,
      repairedCount: repaired,
      message: `Batch complete: Synchronized and repaired ${repaired} passes.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to batch repair slots";
    return { success: false, error: msg, repairedCount: 0 };
  }
}

/**
 * 5. Generate and Issue Pass for Orphaned Paid Order
 */
export async function adminGeneratePassForPaidOrderAction({
  orderId,
  userId,
  passTier = "standard_pass",
}: {
  orderId: string;
  userId: string;
  passTier?: "standard_pass" | "pro_pass";
}): Promise<{
  success: boolean;
  passCode?: string;
  message?: string;
  error?: string;
}> {
  try {
    const authInfo = await getCallerAuthInfo();
    if (!authInfo || authInfo.roleLevel < 3) {
      return { success: false, error: "Unauthorized: Level 3+ Admin privileges required." };
    }

    const adminClient = await createAdminClient();

    // Verify order
    const { data: order, error: ordErr } = await adminClient
      .from("orders")
      .select("id, amount, status, user_id")
      .eq("id", orderId)
      .single();

    if (ordErr || !order || order.status !== "paid") {
      return { success: false, error: "Order is not paid or not found." };
    }

    // Check existing pass
    const { data: existingPass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingPass) {
      return { success: false, error: `Student already has pass ${existingPass.pass_code}.` };
    }

    // Generate unique pass code
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const passCode = `EUPH-26-${randomSuffix}`;

    const { data: newPass, error: insErr } = await adminClient
      .from("delegate_passes")
      .insert({
        user_id: userId,
        pass_code: passCode,
        pass_tier: passTier,
        amount_paid: Number(order.amount || 0),
        total_slots: 2,
        slots_used: 0,
        status: "active",
        qr_secret_nonce: Math.random().toString(36).substring(2),
      })
      .select("id, pass_code")
      .single();

    if (insErr || !newPass) throw insErr || new Error("Failed to insert delegate pass");

    // Audit log
    try {
      await adminClient.from("payment_audit_logs").insert({
        issue_id: null,
        admin_id: authInfo.user.id,
        action_taken: "pass_generated_for_order",
        previous_status: "no_pass",
        new_status: passCode,
        notes: `Admin ${authInfo.user.email} generated pass ${passCode} for paid order #${orderId} (User: ${userId}).`,
      });
    } catch {
      // Non-fatal
    }

    revalidateTag("admin-users");
    revalidatePath("/admin/pass-issues", "page");
    revalidatePath("/admin/users", "page");

    return {
      success: true,
      passCode,
      message: `Pass ${passCode} successfully generated and activated! You can now enroll the student into events.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate pass for order";
    return { success: false, error: msg };
  }
}
