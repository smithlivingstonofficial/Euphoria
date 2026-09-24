"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { formatSectionLabel } from "@/lib/utils";

const SUPER_ADMIN_EMAIL = "smithlivingstonofficial@gmail.com";

export interface HelpdeskAuthInfo {
  user: {
    id: string;
    email: string;
  };
  profile: {
    fullName: string;
    email: string;
    department?: string | null;
    collegeName?: string | null;
  } | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHelpdesk: boolean;
}

export interface HelpdeskOperatorItem {
  id: string; // assignment id
  userId: string;
  email: string;
  fullName: string;
  mobileNumber?: string | null;
  registerNumber?: string | null;
  department?: string | null;
  collegeName?: string | null;
  assignedAt: string;
  assignedByName?: string | null;
}

export interface StudentSearchHit {
  studentId: string;
  fullName: string;
  email: string;
  mobileNumber?: string | null;
  registerNumber?: string | null;
  collegeName?: string | null;
  department?: string | null;
  participantType?: string | null;
  passCode?: string | null;
  passTier?: string | null;
  matchedBy: "name" | "email" | "phone" | "pass_code" | "reg_code" | "register_no";
}

export interface StudentFullDossier {
  profile: {
    id: string;
    fullName: string;
    email: string;
    mobileNumber?: string | null;
    gender?: string | null;
    participantType: "internal" | "external";
    registerNumber?: string | null;
    collegeName?: string | null;
    department?: string | null;
    course?: string | null;
    yearOfStudy?: number | null;
    avatarUrl?: string | null;
    needsAccommodation: boolean;
    createdAt: string;
  };
  pass?: {
    id: string;
    passCode: string;
    passTier: string;
    status: string;
    amountPaid: number;
    totalSlots: number;
    slotsUsed: number;
    createdAt: string;
  } | null;
  events: Array<{
    registrationId: string;
    registrationCode: string;
    slotNumber: number;
    status: string;
    paymentStatus: string;
    event: {
      id: string;
      name: string;
      schoolOrDept: string;
      venue: string;
      eventDate: string;
      startTime: string;
      endTime: string;
      status: string;
    };
    attendance: Array<{
      id: string;
      sectionNumber: number;
      sectionName?: string | null;
      scannedAt: string;
      scanMethod?: string | null;
    }>;
  }>;
}

/**
 * 1. Check Caller Auth & Helpdesk Permissions
 */
export async function getHelpdeskAuthInfo(): Promise<HelpdeskAuthInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const normalizedEmail = user.email.toLowerCase().trim();
  const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL;

  const adminClient = await createAdminClient();

  const [{ data: assignments }, { data: profile }] = await Promise.all([
    adminClient
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id),
    adminClient
      .from("profiles")
      .select("full_name, email, department, college_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const assignedRoles = new Set((assignments || []).map((a) => a.role_id));
  const isSuperAdmin = isSuperAdminEmail || assignedRoles.has("super_admin");
  const isAdmin = isSuperAdmin || assignedRoles.has("admin");
  const isHelpdesk = isAdmin || assignedRoles.has("helpdesk");

  return {
    user: { id: user.id, email: user.email },
    profile: profile
      ? {
          fullName: profile.full_name || "Help Desk Operator",
          email: profile.email || user.email,
          department: profile.department,
          collegeName: profile.college_name,
        }
      : null,
    isAdmin,
    isSuperAdmin,
    isHelpdesk,
  };
}

/**
 * 2. Get All Help Desk Operators (Admin Only)
 */
export async function getHelpdeskOperatorsAction(): Promise<{
  success: boolean;
  operators?: HelpdeskOperatorItem[];
  error?: string;
}> {
  try {
    const auth = await getHelpdeskAuthInfo();
    if (!auth || !auth.isAdmin) {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    const adminClient = await createAdminClient();

    const { data: assignments, error } = await adminClient
      .from("user_role_assignments")
      .select(`
        id,
        user_id,
        created_at,
        assigned_by,
        user:profiles!user_role_assignments_user_id_fkey (
          id,
          full_name,
          email,
          mobile_number,
          register_number,
          department,
          college_name
        )
      `)
      .eq("role_id", "helpdesk")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching helpdesk operators:", error);
      return { success: false, error: "Failed to load helpdesk operators." };
    }

    // Get assigner profiles
    const assignerIds = Array.from(
      new Set(
        (assignments || [])
          .map((a: any) => a.assigned_by)
          .filter(Boolean)
      )
    );

    let assignerMap = new Map<string, string>();
    if (assignerIds.length > 0) {
      const { data: assigners } = await adminClient
        .from("profiles")
        .select("id, full_name, email")
        .in("id", assignerIds);

      (assigners || []).forEach((p: any) => {
        assignerMap.set(p.id, p.full_name || p.email);
      });
    }

    const operators: HelpdeskOperatorItem[] = (assignments || []).map((a: any) => {
      const userProfile = a.user || {};
      return {
        id: a.id,
        userId: a.user_id,
        email: userProfile.email || "Unknown Email",
        fullName: userProfile.full_name || "Unknown Name",
        mobileNumber: userProfile.mobile_number,
        registerNumber: userProfile.register_number,
        department: userProfile.department,
        collegeName: userProfile.college_name,
        assignedAt: a.created_at,
        assignedByName: a.assigned_by ? assignerMap.get(a.assigned_by) || "Admin" : "System Admin",
      };
    });

    return { success: true, operators };
  } catch (err: any) {
    console.error("Error in getHelpdeskOperatorsAction:", err);
    return { success: false, error: err.message || "Failed to load operators." };
  }
}

/**
 * 3. Assign Student Mail to Help Desk (Admin Only)
 */
export async function assignHelpdeskOperatorAction(emailInput: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await getHelpdeskAuthInfo();
    if (!auth || !auth.isAdmin) {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please provide a valid email address." };
    }

    const adminClient = await createAdminClient();

    // 1. Look up profile by email
    const { data: profile, error: profErr } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (profErr || !profile) {
      return {
        success: false,
        error: `No registered student found with email "${cleanEmail}". The student must first sign in or register on Euphoria '26.`,
      };
    }

    // 2. Check if already assigned
    const { data: existing } = await adminClient
      .from("user_role_assignments")
      .select("id")
      .eq("user_id", profile.id)
      .eq("role_id", "helpdesk")
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `"${profile.full_name || cleanEmail}" is already assigned to the Help Desk.`,
      };
    }

    // 3. Insert assignment
    const { error: insertErr } = await adminClient
      .from("user_role_assignments")
      .insert({
        user_id: profile.id,
        role_id: "helpdesk",
        assigned_by: auth.user.id,
      });

    if (insertErr) {
      console.error("Error assigning helpdesk operator:", insertErr);
      return { success: false, error: "Failed to assign Help Desk access." };
    }

    revalidatePath("/admin/helpdesk");
    revalidatePath("/helpdesk");

    return {
      success: true,
      message: `Help Desk access granted to ${profile.full_name || cleanEmail} successfully!`,
    };
  } catch (err: any) {
    console.error("Error in assignHelpdeskOperatorAction:", err);
    return { success: false, error: err.message || "Failed to grant access." };
  }
}

/**
 * 4. Revoke Help Desk Access (Admin Only)
 */
export async function revokeHelpdeskOperatorAction(userId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await getHelpdeskAuthInfo();
    if (!auth || !auth.isAdmin) {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }

    if (!userId) {
      return { success: false, error: "User ID is required." };
    }

    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from("user_role_assignments")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", "helpdesk");

    if (error) {
      console.error("Error revoking helpdesk access:", error);
      return { success: false, error: "Failed to revoke Help Desk access." };
    }

    revalidatePath("/admin/helpdesk");
    revalidatePath("/helpdesk");

    return { success: true, message: "Help Desk access revoked successfully." };
  } catch (err: any) {
    console.error("Error in revokeHelpdeskOperatorAction:", err);
    return { success: false, error: err.message || "Failed to revoke access." };
  }
}

/**
 * 5. Search Students for Help Desk (Admin or Helpdesk Operators)
 */
export async function searchStudentsHelpdeskAction(rawQuery: string): Promise<{
  success: boolean;
  results?: StudentSearchHit[];
  error?: string;
}> {
  try {
    const auth = await getHelpdeskAuthInfo();
    if (!auth || !auth.isHelpdesk) {
      return { success: false, error: "Unauthorized. Help Desk access required." };
    }

    let q = rawQuery.trim();
    if (!q || q.length < 2) {
      return { success: true, results: [] };
    }

    // Sanitize if a QR payload or URL was scanned
    if (q.includes("/")) {
      const parts = q.split("/");
      q = parts[parts.length - 1] || q;
    }
    if (q.includes("?code=")) {
      const match = q.match(/code=([^&]+)/);
      if (match) q = decodeURIComponent(match[1]);
    }
    q = q.trim();

    const adminClient = await createAdminClient();
    const hitsMap = new Map<string, StudentSearchHit>();

    // A. Search by Registration Code / Pass Code
    const isCodeFormat = q.toUpperCase().startsWith("EUPH-");

    if (isCodeFormat || q.length >= 4) {
      // 1. Check event registrations
      const { data: regHits } = await adminClient
        .from("event_registrations")
        .select(`
          user_id,
          registration_code,
          user:profiles!event_registrations_user_id_fkey (
            id, full_name, email, mobile_number, register_number, college_name, department, participant_type
          )
        `)
        .ilike("registration_code", `%${q}%`)
        .limit(10);

      (regHits || []).forEach((r: any) => {
        const u = r.user;
        if (u && !hitsMap.has(u.id)) {
          hitsMap.set(u.id, {
            studentId: u.id,
            fullName: u.full_name || "Unknown Name",
            email: u.email || "",
            mobileNumber: u.mobile_number,
            registerNumber: u.register_number,
            collegeName: u.college_name,
            department: u.department,
            participantType: u.participant_type,
            matchedBy: "reg_code",
          });
        }
      });

      // 2. Check delegate passes
      const { data: passHits } = await adminClient
        .from("delegate_passes")
        .select(`
          user_id,
          pass_code,
          pass_tier,
          user:profiles!delegate_passes_user_id_fkey (
            id, full_name, email, mobile_number, register_number, college_name, department, participant_type
          )
        `)
        .ilike("pass_code", `%${q}%`)
        .limit(10);

      (passHits || []).forEach((p: any) => {
        const u = p.user;
        if (u && !hitsMap.has(u.id)) {
          hitsMap.set(u.id, {
            studentId: u.id,
            fullName: u.full_name || "Unknown Name",
            email: u.email || "",
            mobileNumber: u.mobile_number,
            registerNumber: u.register_number,
            collegeName: u.college_name,
            department: u.department,
            participantType: u.participant_type,
            passCode: p.pass_code,
            passTier: p.pass_tier,
            matchedBy: "pass_code",
          });
        }
      });
    }

    // B. Search by Profile fields (Name, Email, Mobile, Register Number)
    const { data: profileHits } = await adminClient
      .from("profiles")
      .select("id, full_name, email, mobile_number, register_number, college_name, department, participant_type")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,mobile_number.ilike.%${q}%,register_number.ilike.%${q}%`)
      .limit(15);

    (profileHits || []).forEach((u: any) => {
      if (!hitsMap.has(u.id)) {
        let matchedBy: StudentSearchHit["matchedBy"] = "name";
        if (u.email && u.email.toLowerCase().includes(q.toLowerCase())) matchedBy = "email";
        else if (u.mobile_number && u.mobile_number.includes(q)) matchedBy = "phone";
        else if (u.register_number && u.register_number.toLowerCase().includes(q.toLowerCase())) matchedBy = "register_no";

        hitsMap.set(u.id, {
          studentId: u.id,
          fullName: u.full_name || "Unknown Name",
          email: u.email || "",
          mobileNumber: u.mobile_number,
          registerNumber: u.register_number,
          collegeName: u.college_name,
          department: u.department,
          participantType: u.participant_type,
          matchedBy,
        });
      }
    });

    const results = Array.from(hitsMap.values());
    return { success: true, results };
  } catch (err: any) {
    console.error("Error in searchStudentsHelpdeskAction:", err);
    return { success: false, error: err.message || "Failed to search students." };
  }
}

/**
 * 6. Get Comprehensive Student Dossier (Profile, Pass, Events, Attendance)
 */
export async function getStudentFullDossierHelpdeskAction(params: {
  studentId?: string;
  codeQuery?: string;
}): Promise<{
  success: boolean;
  dossier?: StudentFullDossier;
  error?: string;
}> {
  try {
    const auth = await getHelpdeskAuthInfo();
    if (!auth || !auth.isHelpdesk) {
      return { success: false, error: "Unauthorized. Help Desk access required." };
    }

    const adminClient = await createAdminClient();
    let targetUserId = params.studentId;

    // If query code provided instead of ID, resolve student ID
    if (!targetUserId && params.codeQuery) {
      let code = params.codeQuery.trim();
      if (code.includes("/")) {
        const parts = code.split("/");
        code = parts[parts.length - 1] || code;
      }

      // Check delegate passes
      const { data: passHit } = await adminClient
        .from("delegate_passes")
        .select("user_id")
        .ilike("pass_code", code)
        .maybeSingle();

      if (passHit?.user_id) {
        targetUserId = passHit.user_id;
      } else {
        // Check event registrations
        const { data: regHit } = await adminClient
          .from("event_registrations")
          .select("user_id")
          .ilike("registration_code", code)
          .maybeSingle();

        if (regHit?.user_id) {
          targetUserId = regHit.user_id;
        }
      }
    }

    if (!targetUserId) {
      return { success: false, error: "Student not found." };
    }

    // 1. Fetch Profile, Pass, Registrations, and Attendance concurrently
    const [
      { data: profile, error: profErr },
      { data: pass },
      { data: registrations },
      { data: attendanceRecords },
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single(),
      adminClient
        .from("delegate_passes")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("event_registrations")
        .select(`
          id,
          registration_code,
          slot_number,
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
            status
          )
        `)
        .eq("user_id", targetUserId)
        .order("slot_number", { ascending: true }),
      adminClient
        .from("attendance")
        .select("id, registration_id, event_id, section_number, section_name, scanned_at, scan_method")
        .eq("user_id", targetUserId),
    ]);

    if (profErr || !profile) {
      return { success: false, error: "Student profile not found." };
    }

    // Map attendance by registration_id
    const attendanceByRegId = new Map<string, any[]>();
    (attendanceRecords || []).forEach((att: any) => {
      const regId = att.registration_id;
      if (!attendanceByRegId.has(regId)) {
        attendanceByRegId.set(regId, []);
      }
      attendanceByRegId.get(regId)!.push({
        id: att.id,
        sectionNumber: att.section_number,
        sectionName: formatSectionLabel(att.section_number, att.section_name),
        scannedAt: att.scanned_at,
        scanMethod: att.scan_method,
      });
    });

    const mappedEvents = (registrations || []).map((r: any) => {
      const evt = r.event || {};
      const attList = attendanceByRegId.get(r.id) || [];
      attList.sort((a, b) => a.sectionNumber - b.sectionNumber);

      return {
        registrationId: r.id,
        registrationCode: r.registration_code,
        slotNumber: r.slot_number || 1,
        status: r.status,
        paymentStatus: r.payment_status,
        event: {
          id: evt.id,
          name: evt.name || "Untitled Event",
          schoolOrDept: evt.school_or_dept || "",
          venue: evt.venue || "TBA",
          eventDate: evt.event_date || "",
          startTime: evt.start_time || "",
          endTime: evt.end_time || "",
          status: evt.status || "draft",
        },
        attendance: attList,
      };
    });

    const dossier: StudentFullDossier = {
      profile: {
        id: profile.id,
        fullName: profile.full_name || "Unnamed Student",
        email: profile.email || "",
        mobileNumber: profile.mobile_number,
        gender: profile.gender,
        participantType: profile.participant_type || "internal",
        registerNumber: profile.register_number,
        collegeName: profile.college_name || "Kalasalingam Academy of Research and Education",
        department: profile.department,
        course: profile.course,
        yearOfStudy: profile.year_of_study,
        avatarUrl: profile.avatar_url,
        needsAccommodation: Boolean(profile.needs_accommodation),
        createdAt: profile.created_at,
      },
      pass: pass
        ? {
            id: pass.id,
            passCode: pass.pass_code,
            passTier: pass.pass_tier,
            status: pass.status,
            amountPaid: pass.amount_paid || 0,
            totalSlots: pass.total_slots || 2,
            slotsUsed: pass.slots_used || 0,
            createdAt: pass.created_at,
          }
        : null,
      events: mappedEvents,
    };

    return { success: true, dossier };
  } catch (err: any) {
    console.error("Error in getStudentFullDossierHelpdeskAction:", err);
    return { success: false, error: err.message || "Failed to load student dossier." };
  }
}
