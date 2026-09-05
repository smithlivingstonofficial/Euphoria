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
  is_pro_event?: boolean;
  category?: {
    name: string;
  } | null;
  totalRegistrations: number;
  totalAttended: number;
  firstSlotCount?: number;
  roleType: "staff" | "student" | "admin";
}

export interface CoordinatorAttendeeItem {
  id: string;
  slot_number: number;
  registration_code: string;
  status: string;
  payment_status: string;
  registered_at: string;
  pass?: {
    id?: string;
    pass_code?: string;
    pass_tier?: string;
    amount_paid?: number;
    slots_used?: number;
  } | null;
  isAttended: boolean;
  scanned_at?: string | null;
  scan_method?: string | null;
  user: {
    id: string;
    full_name: string;
    email: string;
    mobile_number?: string;
    register_number?: string;
    college_name?: string;
    department?: string;
    course?: string;
    year_of_study?: number;
    participant_type: "internal" | "external";
  };
}

// Helper: Determine coordinator's specific role for an event
export async function getCoordinatorRoleForEvent(userId: string, eventId?: string): Promise<"staff" | "student" | "admin" | "unauthorized"> {
  const adminClient = await createAdminClient();

  const { data: userProfile } = await adminClient
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const userEmail = (userProfile?.email || "").toLowerCase().trim();
  const isRootSuperAdmin = userEmail === "smithlivingston2005@gmail.com";

  // 1. Fetch user roles from user_role_assignments
  const { data: roleAssignments } = await adminClient
    .from("user_role_assignments")
    .select("role_id")
    .eq("user_id", userId);

  const assignedRoles = new Set((roleAssignments || []).map((r) => r.role_id));

  // 2. First check if Admin or Super Admin (Level >= 3)
  if (
    isRootSuperAdmin ||
    assignedRoles.has("super_admin") ||
    assignedRoles.has("admin") ||
    (userEmail &&
      (userEmail.includes("admin") ||
        userEmail.includes("smith") ||
        userEmail === process.env.ADMIN_EMAIL))
  ) {
    return "admin";
  }

  // 3. If specific eventId is provided, check event-specific DB assignments
  if (eventId) {
    // Check Staff Event Assignment table
    const { data: staffAssign } = await adminClient
      .from("staff_event_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (staffAssign) return "staff";

    // Check Student Coordinator Assignment table
    const { data: studentAssign } = await adminClient
      .from("student_coordinator_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (studentAssign) return "student";

    // Check event coordinator_emails column or description tag for coordinator emails
    if (userEmail) {
      const { data: evt } = await adminClient
        .from("events")
        .select("id, description, coordinator_emails")
        .eq("id", eventId)
        .maybeSingle();

      if (evt) {
        let isMatch = false;
        if (evt.coordinator_emails) {
          const directEmails = evt.coordinator_emails.split(/,|&|\//).map((e: string) => e.trim().toLowerCase());
          if (directEmails.includes(userEmail)) {
            isMatch = true;
          }
        }
        if (!isMatch && evt.description && evt.description.includes("[COORDINATOR_EMAILS:")) {
          const match = evt.description.match(/\[COORDINATOR_EMAILS:\s*([^\]]+)\]/);
          if (match) {
            const emails = match[1].split(/,|&|\//).map((e: string) => e.trim().toLowerCase());
            if (emails.includes(userEmail)) isMatch = true;
          }
        }

        if (isMatch) {
          // Auto-heal DB assignment so future queries hit staff_event_assignments directly
          await adminClient.from("staff_event_assignments").upsert(
            { user_id: userId, event_id: eventId },
            { onConflict: "user_id,event_id" }
          );
          return "staff";
        }
      }
    }

    // Strict Enforcement: If eventId was specified and user is not assigned to it, access is denied.
    // Coordinators are restricted ONLY to their single assigned event.
    return "unauthorized";
  }

  // 4. If NO specific eventId was passed (e.g. general role inquiry), return general role if assigned
  if (assignedRoles.has("staff_coordinator") || assignedRoles.has("faculty")) return "staff";
  if (assignedRoles.has("student_coordinator") || assignedRoles.has("coordinator")) return "student";

  return "unauthorized";
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
              is_pro_event,
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
    let allAssignedIds = Array.from(new Set([...Array.from(staffEventIds), ...Array.from(studentEventIds)]));
    const userEmail = (user.email || "").toLowerCase().trim();

    // If not admin and no explicit assignments found in tables, check if assigned via event metadata/email
    if (!isAdmin && allAssignedIds.length === 0 && userEmail) {
      const { data: eventsList } = await adminClient
        .from("events")
        .select("id, description, coordinator_emails");

      if (eventsList) {
        for (const evt of eventsList) {
          let matched = false;
          if (evt.coordinator_emails) {
            const directEmails = evt.coordinator_emails.split(/,|&|\//).map((e: string) => e.trim().toLowerCase());
            if (directEmails.includes(userEmail)) {
              matched = true;
            }
          }
          if (!matched && evt.description && evt.description.includes("[COORDINATOR_EMAILS:")) {
            const match = evt.description.match(/\[COORDINATOR_EMAILS:\s*([^\]]+)\]/);
            if (match) {
              const emails = match[1].split(/,|&|\//).map((e: string) => e.trim().toLowerCase());
              if (emails.includes(userEmail)) {
                matched = true;
              }
            }
          }

          if (matched) {
            // Auto-heal DB assignment and ensure staff role in DB
            await adminClient.from("staff_event_assignments").upsert(
              { user_id: user.id, event_id: evt.id },
              { onConflict: "user_id,event_id" }
            );
            if (!roles.includes("staff_coordinator")) {
              await adminClient.from("user_role_assignments").upsert(
                { user_id: user.id, role_id: "staff_coordinator" },
                { onConflict: "user_id,role_id" }
              );
              roles.push("staff_coordinator");
            }
            staffEventIds.add(evt.id);
            allAssignedIds.push(evt.id);
            // Strictly single-event bound: coordinators manage 1 competition
            break;
          }
        }
      }
    }

    const hasAnyRole = roles.includes("staff_coordinator") || roles.includes("student_coordinator") || roles.includes("faculty") || roles.includes("coordinator");
    if (!isAdmin && !hasAnyRole && allAssignedIds.length === 0) {
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
          is_pro_event,
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
        primaryRole: isAdmin ? "admin" : isStaff ? "staff" : "student",
        roles,
        isAdmin,
      };
    }

    const eventIds = eventsData.map((e) => e.id);

    // Fetch registration and attendance counts safely
    let registrations: { id: string; event_id: string; slot_number?: number }[] = [];
    let attendances: { id: string; event_id: string }[] = [];

    try {
      const [regRes, attRes] = await Promise.all([
        adminClient
          .from("event_registrations")
          .select("id, event_id, slot_number")
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
    const firstSlotCountMap: Record<string, number> = {};
    registrations.forEach((r) => {
      regCountMap[r.event_id] = (regCountMap[r.event_id] || 0) + 1;
      if (r.slot_number === 1) {
        firstSlotCountMap[r.event_id] = (firstSlotCountMap[r.event_id] || 0) + 1;
      }
    });

    const attendCountMap: Record<string, number> = {};
    attendances.forEach((a) => {
      attendCountMap[a.event_id] = (attendCountMap[a.event_id] || 0) + 1;
    });

    const formattedEvents: CoordinatorEventItem[] = eventsData.map((evt) => {
      let roleType: "staff" | "student" | "admin" = "staff";
      if (staffEventIds.has(evt.id)) {
        roleType = "staff";
      } else if (studentEventIds.has(evt.id)) {
        roleType = "student";
      } else if (isAdmin) {
        roleType = "admin";
      } else if (isStaff) {
        roleType = "staff";
      } else {
        roleType = "student";
      }

      const isStudent = roleType === "student";

      return {
        ...evt,
        totalRegistrations: regCountMap[evt.id] || 0,
        totalAttended: attendCountMap[evt.id] || 0,
        firstSlotCount: isStudent ? undefined : (firstSlotCountMap[evt.id] || 0),
        roleType,
      };
    });

    const primaryRole = isAdmin ? "admin" : isStaff ? "staff" : "student";

    return {
      success: true,
      events: formattedEvents,
      primaryRole,
      roles,
      isAdmin,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load coordinator workspace";
    return { success: false, error: msg, events: [] };
  }
}

// 2. Get Event Attendees Roster for Coordinator (With Role-Based Privacy Masking)
export async function getEventAttendeesForCoordinator(eventId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in.", attendees: [] };
    }

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType === "unauthorized") {
      return {
        success: false,
        error: "Access denied. You are not assigned to coordinate this event.",
        attendees: [],
      };
    }

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
          slot_number,
          registration_code,
          status,
          payment_status,
          created_at,
          pass:delegate_passes (
            id,
            pass_code,
            pass_tier,
            amount_paid,
            slots_used
          ),
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

    const isStudentCoord = roleType === "student";

    const attendees: CoordinatorAttendeeItem[] = (registrations || []).map((r) => {
      const isAttended = Array.isArray(r.attendance)
        ? r.attendance.length > 0
        : Boolean(r.attendance);
      const attendanceRecord = Array.isArray(r.attendance)
        ? r.attendance[0]
        : r.attendance;

      const userObj = Array.isArray(r.user) ? r.user[0] : r.user;

      // PRIVACY MASKING FOR STUDENT COORDINATORS
      // Redact phone number and mask personal email for student volunteers
      const sanitizedUser = {
        ...userObj,
        mobile_number: isStudentCoord ? undefined : userObj?.mobile_number,
        email: isStudentCoord && userObj?.email
          ? userObj.email.replace(/(.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + "*".repeat(b.length))
          : userObj?.email,
      };

      return {
        id: r.id,
        slot_number: r.slot_number || 1,
        registration_code: r.registration_code,
        status: r.status,
        payment_status: r.payment_status,
        registered_at: r.created_at,
        pass: Array.isArray(r.pass) ? r.pass[0] : r.pass,
        isAttended,
        scanned_at: attendanceRecord?.scanned_at || null,
        scan_method: attendanceRecord?.scan_method || null,
        user: sanitizedUser,
      };
    });

    const firstSlotCount = isStudentCoord
      ? undefined
      : attendees.filter((a) => a.slot_number === 1).length;

    return {
      success: true,
      roleType,
      event,
      attendees,
      totalCount: attendees.length,
      attendedCount: attendees.filter((a) => a.isAttended).length,
      firstSlotCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch event attendees";
    return { success: false, error: msg, attendees: [] };
  }
}

export type RecordAttendanceResponse =
  | {
      success: true;
      alreadyCheckedIn: boolean;
      message: string;
      student?: any;
      event?: any;
      slotNumber?: number;
      registrationCode: string;
      scannedAt?: string;
    }
  | {
      success: false;
      error: string;
    };

// 3. Mark Attendance for Participant (Tamper-Proof Verification)
export async function recordAttendanceCoordinator({
  eventId,
  registrationCode,
  scanMethod = "manual_code_entry",
}: {
  eventId?: string;
  registrationCode: string;
  scanMethod?: "qr_camera" | "manual_code_entry" | "staff_override";
}): Promise<RecordAttendanceResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Coordinator session expired. Please log in." };
    }

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType === "unauthorized") {
      return { success: false, error: "Unauthorized. You are not assigned to this event." };
    }

    const adminClient = await createAdminClient();
    let cleanCode = registrationCode.trim();
    let scannedUid: string | null = null;

    // Handle JSON QR Code Payload
    if (cleanCode.startsWith("{") && cleanCode.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.code) cleanCode = String(parsed.code).trim().toUpperCase();
        if (parsed.uid) scannedUid = String(parsed.uid).trim();
      } catch {
        // Fallback to raw string
      }
    } else {
      cleanCode = cleanCode.toUpperCase();
    }

    // Find registration with multi-criteria fallback
    let regQuery = adminClient
      .from("event_registrations")
      .select(`
        id,
        event_id,
        user_id,
        slot_number,
        registration_code,
        user:profiles (
          id,
          full_name,
          email,
          mobile_number,
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
      `);

    if (eventId) {
      regQuery = regQuery.eq("event_id", eventId);
    }

    // Match by registration code, prefix, or pass code, or user_id
    if (scannedUid) {
      regQuery = regQuery.eq("user_id", scannedUid);
    } else {
      regQuery = regQuery.or(
        `registration_code.eq.${cleanCode},registration_code.ilike.${cleanCode}%`
      );
    }

    const { data: matches, error: findError } = await regQuery;

    if (findError || !matches || matches.length === 0) {
      // Secondary check: look up by delegate pass code
      const { data: passMatches } = await adminClient
        .from("delegate_passes")
        .select("id, user_id, pass_code")
        .eq("pass_code", cleanCode)
        .maybeSingle();

      if (passMatches) {
        let passRegQuery = adminClient
          .from("event_registrations")
          .select(`
            id,
            event_id,
            user_id,
            slot_number,
            registration_code,
            user:profiles (
              id,
              full_name,
              email,
              mobile_number,
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
          .eq("user_id", passMatches.user_id);

        if (eventId) {
          passRegQuery = passRegQuery.eq("event_id", eventId);
        }

        const { data: passRegs } = await passRegQuery;
        if (passRegs && passRegs.length > 0) {
          return processAttendanceRecord(passRegs[0], user.id, scanMethod, roleType, eventId);
        }
      }

      return {
        success: false,
        error: `No registered participant found for pass code "${cleanCode}" in this competition.`,
      };
    }

    return processAttendanceRecord(matches[0], user.id, scanMethod, roleType, eventId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Attendance check-in failed";
    return { success: false, error: msg };
  }
}

// Helper to record attendance row
async function processAttendanceRecord(
  targetReg: any,
  coordinatorUserId: string,
  scanMethod: string,
  roleType: string,
  eventId?: string
): Promise<RecordAttendanceResponse> {
  const adminClient = await createAdminClient();
  const rawStudent = Array.isArray(targetReg.user) ? targetReg.user[0] : targetReg.user;
  const eventDetails = Array.isArray(targetReg.event) ? targetReg.event[0] : targetReg.event;

  // Sanitize student preview for student volunteers
  const studentProfile = {
    ...rawStudent,
    mobile_number: roleType === "student" ? undefined : rawStudent?.mobile_number,
    email: roleType === "student" && rawStudent?.email
      ? rawStudent.email.replace(/(.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + "*".repeat(b.length))
      : rawStudent?.email,
  };

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
      slotNumber: targetReg.slot_number || 1,
      registrationCode: targetReg.registration_code,
    };
  }

  // Insert attendance record
  const { data: newAttendance, error: insertError } = await adminClient
    .from("attendance")
    .insert({
      registration_id: targetReg.id,
      event_id: targetReg.event_id,
      scanned_by: coordinatorUserId,
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
    message: "Verified! Attendance recorded successfully.",
    student: studentProfile,
    event: eventDetails,
    slotNumber: targetReg.slot_number || 1,
    registrationCode: targetReg.registration_code,
    scannedAt: newAttendance.scanned_at,
  };
}

// 4. Revoke Attendance (Faculty Staff / Admin Only)
export async function revokeAttendanceCoordinator({
  registrationId,
  eventId,
}: {
  registrationId: string;
  eventId: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType !== "staff" && roleType !== "admin") {
      return {
        success: false,
        error: "Access denied. Only Faculty Staff Coordinators or Administrators can revoke attendance.",
      };
    }

    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from("attendance")
      .delete()
      .eq("registration_id", registrationId);

    if (error) throw error;

    revalidatePath("/coordinator", "page");
    revalidatePath(`/coordinator/${eventId}`, "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke attendance";
    return { success: false, error: msg };
  }
}

// 5. Update Event Operational Settings (Venue, Brochure Link, Rules & Guidelines - Staff & Admin)
export async function updateEventOperationsStaff(
  eventId: string,
  payload: {
    venue?: string;
    brochureUrl?: string;
    rules?: string | string[];
    status?: string;
  }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType !== "staff" && roleType !== "admin") {
      return {
        success: false,
        error: "Access denied. Only Faculty Staff Coordinators or Admins can update event configuration.",
      };
    }

    const adminClient = await createAdminClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.venue !== undefined) {
      updatePayload.venue = payload.venue.trim();
    }

    if (payload.rules !== undefined) {
      updatePayload.rules = Array.isArray(payload.rules)
        ? payload.rules.map((r) => r.trim()).filter(Boolean).join("\n")
        : payload.rules.trim();
    }

    // Status can strictly ONLY be changed by Admin, NOT staff coordinators
    if (roleType === "admin" && payload.status) {
      updatePayload.status = payload.status;
    }

    // Update brochure link in description if provided
    if (payload.brochureUrl !== undefined) {
      const { data: eventData } = await adminClient
        .from("events")
        .select("description")
        .eq("id", eventId)
        .single();

      if (eventData) {
        let cleanDesc = (eventData.description || "")
          .replace(/\[(BROCHURE_URL|BROCHURE_LINK):\s*[^\]]+\]/g, "")
          .trim();

        if (payload.brochureUrl.trim()) {
          cleanDesc += `\n[BROCHURE_URL: ${payload.brochureUrl.trim()}]`;
        }
        updatePayload.description = cleanDesc;
      }
    }

    const { error } = await adminClient
      .from("events")
      .update(updatePayload)
      .eq("id", eventId);

    if (error) throw error;

    revalidatePath("/coordinator", "page");
    revalidatePath(`/coordinator/${eventId}`, "page");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update event operations";
    return { success: false, error: msg };
  }
}

// 6. Update WhatsApp & Brochure Links (Staff & Admin)
export async function updateEventLinksStaff(
  eventId: string,
  whatsappLink: string,
  brochureUrl: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType !== "admin" && roleType !== "staff") {
      return {
        success: false,
        error: "Forbidden: Only Assigned Coordinators and Administrators have permission to modify event brochure and WhatsApp links.",
      };
    }

    const adminClient = await createAdminClient();

    // Fetch existing description
    const { data: eventData, error: fetchErr } = await adminClient
      .from("events")
      .select("description")
      .eq("id", eventId)
      .single();

    if (fetchErr || !eventData) throw new Error("Event not found");

    let cleanDesc = (eventData.description || "")
      .replace(/\[WHATSAPP_LINK:\s*[^\]]+\]/g, "")
      .replace(/\[(BROCHURE_URL|BROCHURE_LINK):\s*([^\]]+)\]/g, "")
      .trim();

    if (whatsappLink.trim()) {
      cleanDesc += `\n[WHATSAPP_LINK: ${whatsappLink.trim()}]`;
    }
    if (brochureUrl.trim()) {
      cleanDesc += `\n[BROCHURE_URL: ${brochureUrl.trim()}]`;
    }

    const { error: updateErr } = await adminClient
      .from("events")
      .update({
        description: cleanDesc,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (updateErr) throw updateErr;

    revalidatePath(`/coordinator/${eventId}`, "page");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update links";
    return { success: false, error: msg };
  }
}

// 7. Assign Student Coordinator for an Event (Faculty Staff & Admin Only)
export async function assignStudentCoordinatorStaff(
  eventId: string,
  targetUserId: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType !== "staff" && roleType !== "admin") {
      return {
        success: false,
        error: "Forbidden: Only Faculty Staff Coordinators or Administrators can add Student Coordinators.",
      };
    }

    const adminClient = await createAdminClient();

    // 1. Insert assignment into student_coordinator_assignments
    const { error: assignErr } = await adminClient
      .from("student_coordinator_assignments")
      .upsert(
        {
          event_id: eventId,
          user_id: targetUserId,
          assigned_by: user.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "event_id,user_id" }
      );

    if (assignErr) throw assignErr;

    // 2. Grant student_coordinator role
    await adminClient.from("user_role_assignments").upsert(
      {
        user_id: targetUserId,
        role_id: "student_coordinator",
        assigned_by: user.id,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,role_id" }
    );

    revalidatePath(`/coordinator/${eventId}`, "page");
    revalidatePath("/admin/coordinators", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign student coordinator";
    return { success: false, error: msg };
  }
}

// 8. Revoke Student Coordinator for an Event (Faculty Staff & Admin Only)
export async function revokeStudentCoordinatorStaff(
  eventId: string,
  targetUserId: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType !== "staff" && roleType !== "admin") {
      return {
        success: false,
        error: "Forbidden: Only Faculty Staff Coordinators or Administrators can remove Student Coordinators.",
      };
    }

    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("student_coordinator_assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", targetUserId);

    if (error) throw error;

    revalidatePath(`/coordinator/${eventId}`, "page");
    revalidatePath("/admin/coordinators", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke student coordinator";
    return { success: false, error: msg };
  }
}

// 9. Fetch Event Staff Control Details (Links & Assigned Student Coordinators)
export async function getEventStaffDetails(eventId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType !== "staff" && roleType !== "admin") {
      return { success: false, error: "Forbidden" };
    }

    const adminClient = await createAdminClient();

    const [
      { data: eventData },
      { data: studentAssigns },
      { data: profilesData }
    ] = await Promise.all([
      adminClient.from("events").select("id, name, description").eq("id", eventId).single(),
      adminClient.from("student_coordinator_assignments").select(`
        id,
        user_id,
        created_at,
        user:profiles!student_coordinator_assignments_user_id_fkey (id, full_name, email, mobile_number, register_number, department)
      `).eq("event_id", eventId),
      adminClient.from("profiles").select("id, full_name, email, mobile_number, register_number, department").order("full_name"),
    ]);

    const desc = eventData?.description || "";
    const whatsappMatch = desc.match(/\[WHATSAPP_LINK:\s*([^\]]+)\]/);
    const brochureMatch = desc.match(/\[(BROCHURE_URL|BROCHURE_LINK):\s*([^\]]+)\]/);

    const studentCoordinators = (studentAssigns || []).map((s: any) => {
      const u = Array.isArray(s.user) ? s.user[0] : s.user;
      return {
        id: s.id,
        userId: s.user_id,
        fullName: u?.full_name || "Volunteer",
        email: u?.email || "",
        mobileNumber: u?.mobile_number || "",
        registerNumber: u?.register_number || "",
        department: u?.department || "",
      };
    });

    return {
      success: true,
      roleType,
      whatsappLink: whatsappMatch ? whatsappMatch[1].trim() : "",
      brochureUrl: brochureMatch ? brochureMatch[2].trim() : "",
      studentCoordinators,
      allProfiles: profilesData || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch event staff details";
    return { success: false, error: msg };
  }
}
