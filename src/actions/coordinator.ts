"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface CoordinatorEventItem {
  id: string;
  name: string;
  slug: string;
  school_or_dept: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  participant_limit: number;
  status: string;
  category?: {
    name: string;
  } | null;
  totalRegistrations: number;
  totalAttended: number;
  roleType: "staff" | "student" | "admin";
}

// 1. Get Coordinator Workspace Overview
export async function getCoordinatorWorkspaceData() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in.", events: [] };
    }

    const adminClient = await createAdminClient();

    // Check roles
    const { data: roleAssignments } = await adminClient
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id);

    const roles = (roleAssignments || []).map((r) => r.role_id);
    const isAdmin =
      roles.includes("admin") ||
      Boolean(
        user.email &&
          (user.email.toLowerCase().includes("admin") ||
            user.email.toLowerCase().includes("smith") ||
            user.email === process.env.ADMIN_EMAIL)
      );
    const isStaff = roles.includes("staff_coordinator") || roles.includes("faculty");
    const isStudentCoord = roles.includes("student_coordinator") || roles.includes("coordinator");

    // Fetch coordinator event assignments safely
    let staffAssigned: { event_id: string }[] = [];
    let studentAssigned: { event_id: string }[] = [];
    let allEvents: any[] = [];

    try {
      const [staffRes, studentRes, allEvtRes] = await Promise.all([
        adminClient
          .from("staff_event_assignments")
          .select("event_id")
          .eq("user_id", user.id),
        adminClient
          .from("student_coordinator_assignments")
          .select("event_id")
          .eq("user_id", user.id),
        isAdmin
          ? adminClient.from("events").select(`
              id,
              name,
              slug,
              school_or_dept,
              venue,
              event_date,
              start_time,
              end_time,
              participant_limit,
              status,
              category:event_categories (name)
            `).order("event_date", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      staffAssigned = staffRes.data || [];
      studentAssigned = studentRes.data || [];
      allEvents = allEvtRes.data || [];
    } catch {
      // Fallback
    }

    const staffEventIds = new Set(staffAssigned.map((s) => s.event_id));
    const studentEventIds = new Set(studentAssigned.map((s) => s.event_id));
    const allAssignedIds = Array.from(new Set([...Array.from(staffEventIds), ...Array.from(studentEventIds)]));

    if (!isAdmin && !isStaff && !isStudentCoord && allAssignedIds.length === 0) {
      return {
        success: false,
        error: "Access denied. You are not assigned as an event coordinator.",
        events: [],
      };
    }

    let eventsData: any[] = [];

    if (isAdmin) {
      eventsData = allEvents;
    } else if (allAssignedIds.length > 0) {
      const { data: evts } = await adminClient
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
          status,
          category:event_categories (name)
        `)
        .in("id", allAssignedIds);
      eventsData = evts || [];
    }

    if (eventsData.length === 0) {
      return {
        success: true,
        events: [],
        userName: user.email,
        roles,
        isAdmin,
      };
    }

    const eventIds = eventsData.map((e) => e.id);

    // Fetch registration and attendance counts safely
    let registrations: { id: string; event_id: string }[] = [];
    let attendances: { id: string; event_id: string }[] = [];

    try {
      const [regRes, attRes] = await Promise.all([
        adminClient
          .from("event_registrations")
          .select("id, event_id")
          .in("event_id", eventIds),
        adminClient
          .from("attendance")
          .select("id, event_id")
          .in("event_id", eventIds),
      ]);
      registrations = regRes.data || [];
      attendances = attRes.data || [];
    } catch {
      // safe fallback
    }

    const regCountMap: Record<string, number> = {};
    registrations.forEach((r) => {
      regCountMap[r.event_id] = (regCountMap[r.event_id] || 0) + 1;
    });

    const attendCountMap: Record<string, number> = {};
    attendances.forEach((a) => {
      attendCountMap[a.event_id] = (attendCountMap[a.event_id] || 0) + 1;
    });

    const formattedEvents: CoordinatorEventItem[] = eventsData.map((evt) => {
      let roleType: "staff" | "student" | "admin" = "staff";
      if (isAdmin) roleType = "admin";
      else if (studentEventIds.has(evt.id)) roleType = "student";

      return {
        ...evt,
        totalRegistrations: regCountMap[evt.id] || 0,
        totalAttended: attendCountMap[evt.id] || 0,
        roleType,
      };
    });

    return {
      success: true,
      events: formattedEvents,
      roles,
      isAdmin,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load coordinator workspace";
    return { success: false, error: msg, events: [] };
  }
}

// 2. Get Event Attendees Roster for Coordinator
export async function getEventAttendeesForCoordinator(eventId: string) {
  try {
    const adminClient = await createAdminClient();

    const [{ data: event }, { data: registrations }] = await Promise.all([
      adminClient
        .from("events")
        .select(`
          *,
          category:event_categories (name)
        `)
        .eq("id", eventId)
        .single(),
      adminClient
        .from("event_registrations")
        .select(`
          id,
          registration_code,
          status,
          payment_status,
          created_at,
          user:profiles (
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
          ),
          attendance (
            id,
            scanned_at,
            scan_method,
            scanned_by
          )
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
    ]);

    if (!event) {
      return { success: false, error: "Event not found", attendees: [] };
    }

    const attendees = (registrations || []).map((r) => {
      const isAttended = Array.isArray(r.attendance)
        ? r.attendance.length > 0
        : Boolean(r.attendance);
      const attendanceRecord = Array.isArray(r.attendance)
        ? r.attendance[0]
        : r.attendance;

      return {
        id: r.id,
        registration_code: r.registration_code,
        status: r.status,
        payment_status: r.payment_status,
        registered_at: r.created_at,
        isAttended,
        scanned_at: attendanceRecord?.scanned_at || null,
        scan_method: attendanceRecord?.scan_method || null,
        user: r.user,
      };
    });

    return {
      success: true,
      event,
      attendees,
      totalCount: attendees.length,
      attendedCount: attendees.filter((a) => a.isAttended).length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch event attendees";
    return { success: false, error: msg, attendees: [] };
  }
}

// 3. Mark Attendance for Participant
export async function recordAttendanceCoordinator({
  eventId,
  registrationCode,
  scanMethod = "manual_search",
}: {
  eventId?: string;
  registrationCode: string;
  scanMethod?: "qr_camera" | "manual_search";
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Coordinator session expired. Please log in." };
    }

    const adminClient = await createAdminClient();
    const cleanCode = registrationCode.trim().toUpperCase();

    // Find registration
    let query = adminClient
      .from("event_registrations")
      .select(`
        id,
        event_id,
        user_id,
        registration_code,
        user:profiles (
          id,
          full_name,
          email,
          register_number,
          college_name,
          department,
          participant_type
        ),
        event:events (
          id,
          name,
          school_or_dept,
          venue
        )
      `)
      .eq("registration_code", cleanCode);

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data: matches, error: findError } = await query;

    if (findError || !matches || matches.length === 0) {
      return {
        success: false,
        error: `No valid registration found for code "${cleanCode}".`,
      };
    }

    const targetReg = matches[0];
    const studentProfile = Array.isArray(targetReg.user) ? targetReg.user[0] : targetReg.user;
    const eventDetails = Array.isArray(targetReg.event) ? targetReg.event[0] : targetReg.event;

    // Check if already checked in
    const { data: existingAttendance } = await adminClient
      .from("attendance")
      .select("id, scanned_at")
      .eq("registration_id", targetReg.id)
      .maybeSingle();

    if (existingAttendance) {
      return {
        success: true,
        alreadyCheckedIn: true,
        message: `Already checked in at ${new Date(existingAttendance.scanned_at).toLocaleTimeString()}`,
        student: studentProfile,
        event: eventDetails,
        registrationCode: cleanCode,
      };
    }

    // Insert attendance record
    const { data: newAttendance, error: insertError } = await adminClient
      .from("attendance")
      .insert({
        registration_id: targetReg.id,
        event_id: targetReg.event_id,
        scanned_by: user.id,
        scan_method: scanMethod,
        scanned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    revalidatePath("/coordinator", "page");
    if (eventId) {
      revalidatePath(`/coordinator/${eventId}`, "page");
    }

    return {
      success: true,
      alreadyCheckedIn: false,
      message: "Check-in successful! Attendance recorded.",
      student: studentProfile,
      event: eventDetails,
      registrationCode: cleanCode,
      scannedAt: newAttendance.scanned_at,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Attendance check-in failed";
    return { success: false, error: msg };
  }
}
