"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { fetchAllSupabasePages } from "@/lib/supabase/paginate";

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
  description?: string;
  brochure_url?: string;
  brochureUrl?: string | null;
  category?: {
    name: string;
  } | null;
  totalRegistrations: number;
  totalAttended: number;
  firstSlotCount?: number;
  roleType: "staff" | "student" | "admin" | "overall_coordinator";
  internal_limit?: number | null;
  allow_internal?: boolean;
  allow_external?: boolean;
  kluRegistrations?: number;
  externalRegistrations?: number;
  isKluBlocked?: boolean;
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
  isInternal?: boolean;
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
export async function getCoordinatorRoleForEvent(userId: string, eventId?: string): Promise<"staff" | "student" | "admin" | "overall_coordinator" | "unauthorized"> {
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

  // 2.5 Check if Overall Coordinator (Central Read-Only oversight across all 61 competitions)
  if (assignedRoles.has("overall_coordinator")) {
    return "overall_coordinator";
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
    const isOverallCoordinator = roles.includes("overall_coordinator");
    const hasGlobalAccess = isAdmin || isOverallCoordinator;
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
        hasGlobalAccess
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
              internal_limit,
              allow_internal,
              allow_external,
              status,
              is_pro_event,
              description,
              brochure_url,
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

    const hasAnyRole = hasGlobalAccess || roles.includes("staff_coordinator") || roles.includes("student_coordinator") || roles.includes("faculty") || roles.includes("coordinator");
    if (!hasGlobalAccess && !hasAnyRole && allAssignedIds.length === 0) {
      return {
        success: false,
        error: "Access denied. You are not assigned as an event coordinator.",
        events: [],
      };
    }

    let eventsData: any[] = [];

    if (hasGlobalAccess) {
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
          internal_limit,
          allow_internal,
          allow_external,
          status,
          is_pro_event,
          description,
          brochure_url,
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
    let registrations: { id: string; event_id: string; slot_number?: number; user?: any }[] = [];
    let attendances: { id: string; event_id: string }[] = [];

    try {
      const [regRes, attRes] = await Promise.all([
        fetchAllSupabasePages((from, to) =>
          adminClient
            .from("event_registrations")
            .select(`
              id,
              event_id,
              slot_number,
              status,
              user:profiles (
                email,
                participant_type
              )
            `)
            .in("event_id", eventIds)
            .eq("status", "confirmed")
            .range(from, to)
        ),
        fetchAllSupabasePages((from, to) =>
          adminClient
            .from("attendance")
            .select("id, event_id")
            .in("event_id", eventIds)
            .range(from, to)
        ),
      ]);
      registrations = regRes || [];
      attendances = attRes || [];
    } catch {
      // safe fallback
    }

    const regCountMap: Record<string, number> = {};
    const firstSlotCountMap: Record<string, number> = {};
    const kluCountMap: Record<string, number> = {};
    const externalCountMap: Record<string, number> = {};

    registrations.forEach((r: any) => {
      regCountMap[r.event_id] = (regCountMap[r.event_id] || 0) + 1;
      if (r.slot_number === 1) {
        firstSlotCountMap[r.event_id] = (firstSlotCountMap[r.event_id] || 0) + 1;
      }

      const userObj = Array.isArray(r.user) ? r.user[0] : r.user;
      const email = (userObj?.email || "").toLowerCase().trim();
      const isInternal = userObj?.participant_type === "internal" || email.endsWith("@klu.ac.in");
      if (isInternal) {
        kluCountMap[r.event_id] = (kluCountMap[r.event_id] || 0) + 1;
      } else {
        externalCountMap[r.event_id] = (externalCountMap[r.event_id] || 0) + 1;
      }
    });

    const attendCountMap: Record<string, number> = {};
    attendances.forEach((a) => {
      attendCountMap[a.event_id] = (attendCountMap[a.event_id] || 0) + 1;
    });

    const formattedEvents: CoordinatorEventItem[] = eventsData.map((evt) => {
      let roleType: "staff" | "student" | "admin" | "overall_coordinator" = "staff";
      if (isOverallCoordinator) {
        roleType = "overall_coordinator";
      } else if (staffEventIds.has(evt.id)) {
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
      const desc = evt.description || "";
      const brochureMatch = desc.match(/\[(BROCHURE_URL|BROCHURE_LINK):\s*([^\]]+)\]/);
      const brochureUrl = (brochureMatch ? brochureMatch[2].trim() : null) || evt.brochure_url || null;

      const kluRegs = kluCountMap[evt.id] || 0;
      const extRegs = externalCountMap[evt.id] || 0;
      const allowInt = evt.allow_internal !== false;
      const allowExt = evt.allow_external !== false;
      const intLimit = evt.internal_limit !== null && evt.internal_limit !== undefined ? Number(evt.internal_limit) : null;
      const isKluBlocked = !allowInt || (intLimit !== null && kluRegs >= intLimit);

      return {
        ...evt,
        brochureUrl: brochureUrl || null,
        totalRegistrations: regCountMap[evt.id] || 0,
        totalAttended: attendCountMap[evt.id] || 0,
        firstSlotCount: isStudent ? undefined : (firstSlotCountMap[evt.id] || 0),
        roleType,
        internal_limit: intLimit,
        allow_internal: allowInt,
        allow_external: allowExt,
        kluRegistrations: kluRegs,
        externalRegistrations: extRegs,
        isKluBlocked,
      };
    });

    const primaryRole: "admin" | "overall_coordinator" | "staff" | "student" =
      isOverallCoordinator ? "overall_coordinator" : (isAdmin ? "admin" : (isStaff ? "staff" : "student"));

    return {
      success: true,
      events: formattedEvents,
      primaryRole,
      roles,
      isAdmin,
      isOverallCoordinator: Boolean(isOverallCoordinator),
      isReadOnly: Boolean(isOverallCoordinator),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load coordinator workspace";
    return { success: false, error: msg, events: [] };
  }
}

// 2. Get Event Attendees Initial Data & Telemetry for Coordinator (Low-Egress Slicing)
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

    // Fetch event metadata, exact counts (head: true), and first 10 attendees in parallel
    const [
      { data: event },
      { count: totalCount },
      { count: attendedCount },
      { count: firstSlotCountRaw },
      { data: registrations },
    ] = await Promise.all([
      adminClient
        .from("events")
        .select(`*, category:event_categories (name)`)
        .eq("id", eventId)
        .single(),
      adminClient
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed"),
      adminClient
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
      adminClient
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("slot_number", 1)
        .eq("status", "confirmed"),
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
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .range(0, 9), // Strictly first 10 for Page 1!
    ]);

    if (!event) {
      return { success: false, error: "Event not found", attendees: [] };
    }

    const isStudentCoord = roleType === "student";

    const attendees: CoordinatorAttendeeItem[] = (registrations || []).map((r: any) => {
      const isAttended = Array.isArray(r.attendance)
        ? r.attendance.length > 0
        : Boolean(r.attendance);
      const attendanceRecord = Array.isArray(r.attendance)
        ? r.attendance[0]
        : r.attendance;

      const userObj = Array.isArray(r.user) ? r.user[0] : r.user;

      const sanitizedUser = {
        ...userObj,
        mobile_number: isStudentCoord ? undefined : userObj?.mobile_number,
        email: isStudentCoord && userObj?.email
          ? userObj.email.replace(/(.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + "*".repeat(b.length))
          : userObj?.email,
      };

      const isInternal = userObj?.participant_type === "internal" || (userObj?.email && userObj.email.toLowerCase().endsWith("@klu.ac.in"));

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
        isInternal: Boolean(isInternal),
      };
    });

    const firstSlotCount = isStudentCoord ? undefined : (firstSlotCountRaw ?? 0);

    const allowInt = event.allow_internal !== false;
    const allowExt = event.allow_external !== false;
    const intLimit = event.internal_limit !== null && event.internal_limit !== undefined ? Number(event.internal_limit) : null;

    return {
      success: true,
      roleType,
      event: {
        ...event,
        allow_internal: allowInt,
        allow_external: allowExt,
        internal_limit: intLimit,
      },
      attendees, // 10 items for Page 1
      totalCount: totalCount ?? 0,
      attendedCount: attendedCount ?? 0,
      firstSlotCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch event attendees";
    return { success: false, error: msg, attendees: [] };
  }
}

// 2b. Fetch Paginated Attendees with Filters (10 per page, Low Bandwidth Egress)
export async function getPaginatedEventAttendees(
  eventId: string,
  options: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    filterTab?: "all" | "attended" | "pending";
    tierFilter?: "all" | "pro_pass" | "standard_pass";
  } = {}
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in.", attendees: [], totalCount: 0, totalPages: 0 };
    }

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType === "unauthorized") {
      return {
        success: false,
        error: "Access denied. You are not assigned to coordinate this event.",
        attendees: [],
        totalCount: 0,
        totalPages: 0,
      };
    }

    const adminClient = await createAdminClient();
    const page = Math.max(1, options.page || 1);
    const pageSize = options.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = adminClient
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
      `, { count: "exact" })
      .eq("event_id", eventId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    // 1. Filter by Pass Tier if specified
    if (options.tierFilter && options.tierFilter !== "all") {
      const { data: matchedPasses } = await adminClient
        .from("delegate_passes")
        .select("id")
        .eq("pass_tier", options.tierFilter);
      const passIds = (matchedPasses || []).map((p) => p.id);
      if (passIds.length > 0) {
        query = query.in("pass_id", passIds);
      } else {
        return { success: true, attendees: [], totalCount: 0, totalPages: 0, page, pageSize };
      }
    }

    // 2. Filter by Attendance Status if specified
    if (options.filterTab === "attended" || options.filterTab === "pending") {
      const { data: attendanceList } = await adminClient
        .from("attendance")
        .select("registration_id")
        .eq("event_id", eventId);
      const attendedRegIds = Array.from(
        new Set((attendanceList || []).map((a) => a.registration_id).filter(Boolean))
      );

      if (options.filterTab === "attended") {
        if (attendedRegIds.length > 0) {
          query = query.in("id", attendedRegIds);
        } else {
          return { success: true, attendees: [], totalCount: 0, totalPages: 0, page, pageSize };
        }
      } else if (options.filterTab === "pending") {
        if (attendedRegIds.length > 0) {
          query = query.not("id", "in", `(${attendedRegIds.join(",")})`);
        }
      }
    }

    // 3. Filter by Search Query if specified
    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim();

      const [profilesRes, passesRes] = await Promise.all([
        adminClient
          .from("profiles")
          .select("id")
          .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,register_number.ilike.%${q}%,college_name.ilike.%${q}%`)
          .limit(100),
        adminClient
          .from("delegate_passes")
          .select("id")
          .ilike("pass_code", `%${q}%`)
          .limit(50),
      ]);

      const matchedUserIds = (profilesRes.data || []).map((p) => p.id);
      const matchedPassIds = (passesRes.data || []).map((p) => p.id);

      const orConditions = [`registration_code.ilike.%${q}%`];
      if (matchedUserIds.length > 0) {
        orConditions.push(`user_id.in.(${matchedUserIds.join(",")})`);
      }
      if (matchedPassIds.length > 0) {
        orConditions.push(`pass_id.in.(${matchedPassIds.join(",")})`);
      }

      query = query.or(orConditions.join(","));
    }

    // 4. Apply range for pagination (strictly 10 per page)
    const { data: registrations, count, error } = await query.range(from, to);
    if (error) throw error;

    const isStudentCoord = roleType === "student";
    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const attendees: CoordinatorAttendeeItem[] = (registrations || []).map((r: any) => {
      const isAttended = Array.isArray(r.attendance)
        ? r.attendance.length > 0
        : Boolean(r.attendance);
      const attendanceRecord = Array.isArray(r.attendance)
        ? r.attendance[0]
        : r.attendance;

      const userObj = Array.isArray(r.user) ? r.user[0] : r.user;

      const sanitizedUser = {
        ...userObj,
        mobile_number: isStudentCoord ? undefined : userObj?.mobile_number,
        email: isStudentCoord && userObj?.email
          ? userObj.email.replace(/(.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + "*".repeat(b.length))
          : userObj?.email,
      };

      const isInternal = userObj?.participant_type === "internal" || (userObj?.email && userObj.email.toLowerCase().endsWith("@klu.ac.in"));

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
        isInternal: Boolean(isInternal),
      };
    });

    return {
      success: true,
      attendees,
      totalCount,
      totalPages,
      page,
      pageSize,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch paginated attendees";
    return { success: false, error: msg, attendees: [], totalCount: 0, totalPages: 0 };
  }
}

// 2c. On-Demand CSV Export for Event Attendees (Fetched Only When Coordinator Clicks Export)
export async function exportEventAttendeesCSVAction(eventId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const roleType = await getCoordinatorRoleForEvent(user.id, eventId);
    if (roleType === "unauthorized") {
      return { success: false, error: "Access denied." };
    }

    const adminClient = await createAdminClient();

    const [{ data: event }, { data: registrations }] = await Promise.all([
      adminClient.from("events").select("name").eq("id", eventId).single(),
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
            pass_code,
            pass_tier
          ),
          user:profiles (
            full_name,
            email,
            mobile_number,
            register_number,
            college_name,
            department,
            course,
            year_of_study
          ),
          attendance (
            scanned_at,
            scan_method
          )
        `)
        .eq("event_id", eventId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false }),
    ]);

    const isStudentCoord = roleType === "student";
    const headers = [
      "Registration Code",
      "Pass Code",
      "Pass Tier",
      "Slot",
      "Full Name",
      "Email",
      "Mobile",
      "Register No",
      "College",
      "Department",
      "Course",
      "Year",
      "Attendance Status",
      "Scanned At",
      "Scan Method",
      "Registered At",
    ];

    const rows = (registrations || []).map((r: any) => {
      const isAttended = Array.isArray(r.attendance)
        ? r.attendance.length > 0
        : Boolean(r.attendance);
      const attRecord = Array.isArray(r.attendance) ? r.attendance[0] : r.attendance;
      const userObj = Array.isArray(r.user) ? r.user[0] : r.user;
      const passObj = Array.isArray(r.pass) ? r.pass[0] : r.pass;

      return [
        r.registration_code || "",
        passObj?.pass_code || "",
        passObj?.pass_tier || "standard_pass",
        r.slot_number ? `Slot #${r.slot_number}` : "Slot #1",
        userObj?.full_name || "",
        isStudentCoord && userObj?.email
          ? userObj.email.replace(/(.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + "*".repeat(b.length))
          : userObj?.email || "",
        isStudentCoord ? "[REDACTED]" : userObj?.mobile_number || "",
        userObj?.register_number || "",
        userObj?.college_name || "",
        userObj?.department || "",
        userObj?.course || "",
        userObj?.year_of_study || "",
        isAttended ? "PRESENT" : "PENDING",
        attRecord?.scanned_at ? new Date(attRecord.scanned_at).toLocaleString() : "",
        attRecord?.scan_method || "",
        r.created_at ? new Date(r.created_at).toLocaleString() : "",
      ].map((field) => `"${String(field).replace(/"/g, '""')}"`);
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const safeEventName = (event?.name || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${safeEventName}-roster-${new Date().toISOString().split("T")[0]}.csv`;

    return {
      success: true,
      csvContent,
      filename,
      totalCount: rows.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate CSV export";
    return { success: false, error: msg };
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
    if (roleType === "overall_coordinator") {
      return {
        success: false,
        error: "Read-Only Access: Overall Coordinators cannot mark attendance. Attendance check-in is restricted to assigned event coordinators.",
      };
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
          venue,
          event_date
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
              venue,
              event_date
            )
          `)
          .eq("user_id", passMatches.user_id);

        if (eventId) {
          passRegQuery = passRegQuery.eq("event_id", eventId);
        }

        const { data: passRegs } = await passRegQuery;
        if (passRegs && passRegs.length > 0) {
          return processAttendanceRecord(passRegs[0], user.id, scanMethod, roleType, cleanCode, eventId);
        }
      }

      return {
        success: false,
        error: `No registered participant found for pass code "${cleanCode}" in this competition.`,
      };
    }

    return processAttendanceRecord(matches[0], user.id, scanMethod, roleType, cleanCode, eventId);
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
  cleanCode: string,
  eventId?: string
): Promise<RecordAttendanceResponse> {
  const adminClient = await createAdminClient();
  const rawStudent = Array.isArray(targetReg.user) ? targetReg.user[0] : targetReg.user;
  const eventDetails = Array.isArray(targetReg.event) ? targetReg.event[0] : targetReg.event;

  // 1. EVENT DAY ENFORCEMENT:
  // Scanning is active ONLY on the day of the competition (Indian Standard Time Asia/Kolkata)
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const eventDate = eventDetails?.event_date;
  const isSuperOrPlatformAdmin = roleType === "admin";

  // If scan is attempted on a non-event day by coordinators (staff or student):
  if (!isSuperOrPlatformAdmin && scanMethod !== "staff_override") {
    if (eventDate && eventDate !== todayIST) {
      return {
        success: false,
        error: `Attendance scanning for "${eventDetails?.name || "this competition"}" is locked. Scanning opens exclusively on the day of the event (${eventDate}).`,
      };
    }
  }

  // 2. SUPERVISOR MANUAL OVERRIDE VALIDATION:
  // Must verify that the typed code matches the participant's unique pass ID
  if (scanMethod === "staff_override") {
    const rawTargetCode = (targetReg.registration_code || "").trim().toUpperCase();
    if (cleanCode && cleanCode !== rawTargetCode) {
      return {
        success: false,
        error: `Pass verification mismatch: Typed code "${cleanCode}" does not match delegate pass ID "${rawTargetCode}".`,
      };
    }
  }

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

    // Update brochure link in description AND brochure_url column if provided
    if (payload.brochureUrl !== undefined) {
      const cleanUrl = payload.brochureUrl.trim() || null;
      updatePayload.brochure_url = cleanUrl;

      const { data: eventData } = await adminClient
        .from("events")
        .select("description")
        .eq("id", eventId)
        .single();

      if (eventData) {
        let cleanDesc = (eventData.description || "")
          .replace(/\[(BROCHURE_URL|BROCHURE_LINK):\s*[^\]]+\]/g, "")
          .trim();

        if (cleanUrl) {
          cleanDesc += `\n[BROCHURE_URL: ${cleanUrl}]`;
        }
        updatePayload.description = cleanDesc;
      }
    }

    const { error } = await adminClient
      .from("events")
      .update(updatePayload)
      .eq("id", eventId);

    if (error) throw error;

    revalidateTag("public-events");
    revalidatePath("/coordinator", "page");
    revalidatePath(`/coordinator/${eventId}`, "page");
    revalidatePath("/events", "page");
    revalidatePath("/events", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/admin/events", "page");

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
    const cleanBrochure = brochureUrl.trim() || null;
    if (cleanBrochure) {
      cleanDesc += `\n[BROCHURE_URL: ${cleanBrochure}]`;
    }

    const { error: updateErr } = await adminClient
      .from("events")
      .update({
        description: cleanDesc,
        brochure_url: cleanBrochure,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (updateErr) throw updateErr;

    revalidateTag("public-events");
    revalidatePath("/coordinator", "page");
    revalidatePath(`/coordinator/${eventId}`, "page");
    revalidatePath("/events", "page");
    revalidatePath("/events", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/admin/events", "page");

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
      adminClient.from("events").select("id, name, description, brochure_url").eq("id", eventId).single(),
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
      brochureUrl: (brochureMatch ? brochureMatch[2].trim() : null) || eventData?.brochure_url || "",
      studentCoordinators,
      allProfiles: profilesData || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch event staff details";
    return { success: false, error: msg };
  }
}

// ============================================================================
// 10. EXPORT OVERALL EVENTS SUMMARY CSV (Master Analytics across all 61 events)
// ============================================================================
export async function exportOverallEventsSummaryCSVAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const adminClient = await createAdminClient();
    const { data: roleAssignments } = await adminClient
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id);
    const roles = new Set((roleAssignments || []).map((r) => r.role_id));
    const userEmail = (user.email || "").toLowerCase().trim();
    const isRootSuperAdmin = userEmail === "smithlivingston2005@gmail.com";

    const isAdmin =
      isRootSuperAdmin ||
      roles.has("admin") ||
      roles.has("super_admin") ||
      (userEmail &&
        (userEmail.includes("admin") ||
          userEmail.includes("smith") ||
          userEmail === process.env.ADMIN_EMAIL));
    const isOverall = roles.has("overall_coordinator");

    if (!isAdmin && !isOverall) {
      return {
        success: false,
        error: "Access Denied: Master summary export requires Overall Coordinator or Administrator privileges.",
      };
    }

    const [{ data: events }, registrations, attendances] = await Promise.all([
      adminClient
        .from("events")
        .select(`
          id,
          name,
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
          category:event_categories (name)
        `)
        .order("school_or_dept", { ascending: true }),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("event_registrations")
          .select(`
            event_id,
            slot_number,
            status,
            user:profiles (email, participant_type)
          `)
          .eq("status", "confirmed")
          .range(from, to)
      ),
      fetchAllSupabasePages((from, to) =>
        adminClient
          .from("attendance")
          .select("event_id")
          .range(from, to)
      ),
    ]);

    // Build counts
    const regMap: Record<string, { total: number; klu: number; external: number; slot1: number; slot2: number }> = {};
    (registrations || []).forEach((r: any) => {
      if (!regMap[r.event_id]) {
        regMap[r.event_id] = { total: 0, klu: 0, external: 0, slot1: 0, slot2: 0 };
      }
      regMap[r.event_id].total++;
      if (r.slot_number === 1) regMap[r.event_id].slot1++;
      if (r.slot_number === 2) regMap[r.event_id].slot2++;

      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const email = (u?.email || "").toLowerCase();
      const isKlu = u?.participant_type === "internal" || email.endsWith("@klu.ac.in");
      if (isKlu) regMap[r.event_id].klu++;
      else regMap[r.event_id].external++;
    });

    const attMap: Record<string, number> = {};
    (attendances || []).forEach((a) => {
      attMap[a.event_id] = (attMap[a.event_id] || 0) + 1;
    });

    // Build CSV lines
    const headers = [
      "Event Name",
      "Department / School",
      "Category Tier",
      "Date",
      "Start Time",
      "End Time",
      "Venue",
      "Total Capacity",
      "Internal KLU Cap",
      "KLU Allowed?",
      "External Allowed?",
      "Total Confirmed",
      "KLU Registrations",
      "External Registrations",
      "Primary Slot (Slot 1)",
      "Secondary Slot (Slot 2)",
      "Total Attended (Checked In)",
      "Attendance Rate (%)",
      "Slots Remaining",
      "Status",
    ];

    const rows = (events || []).map((evt) => {
      const counts = regMap[evt.id] || { total: 0, klu: 0, external: 0, slot1: 0, slot2: 0 };
      const attended = attMap[evt.id] || 0;
      const attRate = counts.total > 0 ? Math.round((attended / counts.total) * 100) : 0;
      const remaining = Math.max(0, evt.participant_limit - counts.total);

      return [
        `"${(evt.name || "").replace(/"/g, '""')}"`,
        `"${(evt.school_or_dept || "").replace(/"/g, '""')}"`,
        evt.is_pro_event ? "Pro (Flagship)" : "Regular",
        evt.event_date || "TBA",
        evt.start_time || "TBA",
        evt.end_time || "TBA",
        `"${(evt.venue || "TBA").replace(/"/g, '""')}"`,
        evt.participant_limit,
        evt.internal_limit !== null && evt.internal_limit !== undefined ? evt.internal_limit : "Unlimited",
        evt.allow_internal !== false ? "Yes" : "Blocked",
        evt.allow_external !== false ? "Yes" : "Blocked",
        counts.total,
        counts.klu,
        counts.external,
        counts.slot1,
        counts.slot2,
        attended,
        `${attRate}%`,
        remaining,
        evt.status || "active",
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const filename = `Euphoria_2026_Overall_Events_Summary_${new Date().toISOString().split("T")[0]}.csv`;

    return {
      success: true,
      csvContent,
      filename,
      totalEvents: events?.length || 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to export summary";
    return { success: false, error: msg };
  }
}

// ============================================================================
// 11. GENERATE CUSTOM REPORT ACTION (Role-Scoped & Secure)
// ============================================================================
export interface CustomReportParams {
  scope: "all" | "department" | "event";
  eventId?: string;
  department?: string;
  affiliation?: "all" | "internal" | "external";
  attendanceStatus?: "all" | "attended" | "absent";
  passTier?: "all" | "pro_pass" | "standard_pass";
  slotType?: "all" | 1 | 2;
  selectedColumns?: string[];
}

export async function generateCustomReportAction(params: CustomReportParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const adminClient = await createAdminClient();
    const { data: roleAssignments } = await adminClient
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id);

    const roles = new Set((roleAssignments || []).map((r) => r.role_id));
    const userEmail = (user.email || "").toLowerCase().trim();
    const isRootSuperAdmin = userEmail === "smithlivingston2005@gmail.com";
    const isAdmin =
      isRootSuperAdmin ||
      roles.has("admin") ||
      roles.has("super_admin") ||
      (userEmail &&
        (userEmail.includes("admin") ||
          userEmail.includes("smith") ||
          userEmail === process.env.ADMIN_EMAIL));
    const isOverallCoordinator = roles.has("overall_coordinator");
    const isStaff = roles.has("staff_coordinator") || roles.has("faculty");

    // STRICT SECURITY & SCOPING ENFORCEMENT:
    // Staff coordinators can ONLY query their assigned event.
    // Overall coordinators and Admins have global query access.
    if (!isAdmin && !isOverallCoordinator) {
      if (!isStaff) {
        return {
          success: false,
          error: "Access Denied: You must be an authorized coordinator or administrator to generate reports.",
        };
      }

      // Check DB assignment
      const { data: staffAssign } = await adminClient
        .from("staff_event_assignments")
        .select("event_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!staffAssign || !staffAssign.event_id) {
        return {
          success: false,
          error: "Access Denied: You are not assigned to any competition as staff coordinator.",
        };
      }

      if (params.scope !== "event" || params.eventId !== staffAssign.event_id) {
        return {
          success: false,
          error: "Security Restriction: Staff Coordinators are strictly permitted to generate custom reports only for their own assigned competition.",
        };
      }
    }

    const rawRegistrations = await fetchAllSupabasePages((from, to) => {
      let q = adminClient
        .from("event_registrations")
        .select(`
          id,
          event_id,
          slot_number,
          registration_code,
          status,
          payment_status,
          created_at,
          event:events (
            id,
            name,
            school_or_dept,
            venue,
            event_date,
            start_time,
            end_time,
            is_pro_event
          ),
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
            scan_method
          )
        `)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });

      if (params.scope === "event" && params.eventId) {
        q = q.eq("event_id", params.eventId);
      }

      return q.range(from, to);
    });

    let filtered = rawRegistrations || [];

    // Filter by Department (if scope === "department" and department specified)
    if (params.scope === "department" && params.department && params.department !== "all") {
      filtered = filtered.filter((r: any) => {
        const evt = Array.isArray(r.event) ? r.event[0] : r.event;
        return evt?.school_or_dept === params.department;
      });
    }

    // Filter by Affiliation
    if (params.affiliation && params.affiliation !== "all") {
      filtered = filtered.filter((r: any) => {
        const u = Array.isArray(r.user) ? r.user[0] : r.user;
        const email = (u?.email || "").toLowerCase().trim();
        const isKlu = u?.participant_type === "internal" || email.endsWith("@klu.ac.in");
        return params.affiliation === "internal" ? isKlu : !isKlu;
      });
    }

    // Filter by Attendance Status
    if (params.attendanceStatus && params.attendanceStatus !== "all") {
      filtered = filtered.filter((r: any) => {
        const isAttended = Array.isArray(r.attendance) ? r.attendance.length > 0 : Boolean(r.attendance?.id);
        return params.attendanceStatus === "attended" ? isAttended : !isAttended;
      });
    }

    // Filter by Pass Tier
    if (params.passTier && params.passTier !== "all") {
      filtered = filtered.filter((r: any) => {
        const p = Array.isArray(r.pass) ? r.pass[0] : r.pass;
        return p?.pass_tier === params.passTier;
      });
    }

    // Filter by Slot Type
    if (params.slotType && params.slotType !== "all") {
      filtered = filtered.filter((r: any) => r.slot_number === Number(params.slotType));
    }

    // Determine Columns
    const defaultCols = [
      "regCode",
      "name",
      "email",
      "mobile",
      "regNo",
      "college",
      "department",
      "affiliation",
      "eventName",
      "passCode",
      "passTier",
      "slotNumber",
      "attendance",
      "scanTime",
    ];
    const cols = params.selectedColumns && params.selectedColumns.length > 0 ? params.selectedColumns : defaultCols;

    const columnHeaderMap: Record<string, string> = {
      regCode: "Registration Code",
      name: "Delegate Full Name",
      email: "Email Address",
      mobile: "Mobile Number",
      regNo: "Register Number",
      college: "College / Institution",
      department: "Academic Department",
      course: "Course / Degree",
      year: "Year of Study",
      affiliation: "Affiliation (KLU / External)",
      eventName: "Competition Name",
      eventDept: "Event Department",
      passCode: "Pass Code",
      passTier: "Pass Tier",
      amount: "Amount Paid (INR)",
      slotNumber: "Slot Number",
      status: "Registration Status",
      attendance: "Attendance Status",
      scanTime: "Check-in Timestamp",
      scanMethod: "Check-in Method",
    };

    const headers = cols.map((c) => columnHeaderMap[c] || c);

    const rows = filtered.map((r: any) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const evt = Array.isArray(r.event) ? r.event[0] : r.event;
      const p = Array.isArray(r.pass) ? r.pass[0] : r.pass;
      const att = Array.isArray(r.attendance) ? r.attendance[0] : r.attendance;
      const isAttended = Boolean(att?.id || (Array.isArray(r.attendance) && r.attendance.length > 0));
      const email = (u?.email || "").toLowerCase().trim();
      const isInternal = u?.participant_type === "internal" || email.endsWith("@klu.ac.in");

      const colVal = (colKey: string): string => {
        switch (colKey) {
          case "regCode":
            return r.registration_code || "N/A";
          case "name":
            return u?.full_name || "N/A";
          case "email":
            return u?.email || "N/A";
          case "mobile":
            return u?.mobile_number || "N/A";
          case "regNo":
            return u?.register_number || "N/A";
          case "college":
            return u?.college_name || (isInternal ? "Kalasalingam University (KLU)" : "N/A");
          case "department":
            return u?.department || "N/A";
          case "course":
            return u?.course || "N/A";
          case "year":
            return u?.year_of_study ? `Year ${u.year_of_study}` : "N/A";
          case "affiliation":
            return isInternal ? "KLU Internal Student" : "External Delegate";
          case "eventName":
            return evt?.name || "N/A";
          case "eventDept":
            return evt?.school_or_dept || "N/A";
          case "passCode":
            return p?.pass_code || "N/A";
          case "passTier":
            return p?.pass_tier === "pro_pass" ? "Pro Pass (₹300)" : "Standard Pass (₹200)";
          case "amount":
            return p?.amount_paid ? `₹${p.amount_paid}` : "₹0";
          case "slotNumber":
            return `Slot ${r.slot_number || 1}`;
          case "status":
            return r.status || "confirmed";
          case "attendance":
            return isAttended ? "Checked-In" : "Pending / Absent";
          case "scanTime":
            return att?.scanned_at ? new Date(att.scanned_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Not Checked-In";
          case "scanMethod":
            return att?.scan_method || "N/A";
          default:
            return "";
        }
      };

      return cols.map((c) => `"${String(colVal(c)).replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const filename = `Euphoria_2026_Custom_Report_${params.scope}_${new Date().toISOString().split("T")[0]}.csv`;

    return {
      success: true,
      csvContent,
      filename,
      totalCount: filtered.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate custom report";
    return { success: false, error: msg };
  }
}
