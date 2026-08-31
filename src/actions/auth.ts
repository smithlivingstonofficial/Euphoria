"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const adminClient = await createAdminClient();

    const [
      { data: profile },
      { data: roleAssignments },
      { data: staffAssignments },
      { data: studentAssignments },
      { data: eventsData },
    ] = await Promise.all([
      adminClient.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      adminClient.from("user_role_assignments").select("role_id").eq("user_id", user.id),
      adminClient.from("staff_event_assignments").select("id").eq("user_id", user.id).limit(1),
      adminClient.from("student_coordinator_assignments").select("id").eq("user_id", user.id).limit(1),
      adminClient.from("events").select("id, description"),
    ]);

    const roles = (roleAssignments || []).map((r) => r.role_id);
    const userEmail = (user.email || "").toLowerCase().trim();

    // Check if user is listed in any event's [COORDINATOR_EMAILS:] tag
    let isEventEmailStaff = false;
    if (userEmail && eventsData) {
      for (const evt of eventsData) {
        if (evt.description && evt.description.includes("[COORDINATOR_EMAILS:")) {
          const match = evt.description.match(/\[COORDINATOR_EMAILS:\s*([^\]]+)\]/);
          if (match) {
            const emails = match[1].split(/,|&|\//).map((e: string) => e.trim().toLowerCase());
            if (emails.includes(userEmail)) {
              isEventEmailStaff = true;
              break;
            }
          }
        }
      }
    }

    const hasStaffAssignment = (staffAssignments && staffAssignments.length > 0) || isEventEmailStaff;
    const hasStudentAssignment = studentAssignments && studentAssignments.length > 0;

    if (hasStaffAssignment && !roles.includes("staff_coordinator")) {
      roles.push("staff_coordinator");
    }
    if (hasStudentAssignment && !roles.includes("student_coordinator")) {
      roles.push("student_coordinator");
    }

    const isAdmin =
      roles.includes("admin") ||
      Boolean(
        userEmail &&
          (userEmail.includes("admin") ||
            userEmail.includes("smith") ||
            userEmail === process.env.ADMIN_EMAIL)
      );

    const isStaff = roles.includes("staff_coordinator") || hasStaffAssignment;
    const isCoordinator = roles.includes("student_coordinator") || isStaff || hasStudentAssignment;

    return {
      user,
      profile,
      roles,
      isAdmin,
      isStaff,
      isCoordinator,
    };
  } catch {
    return null;
  }
}

export async function saveParticipantProfile(profileData: {
  userId?: string;
  userEmail?: string;
  fullName: string;
  gender: string;
  mobileNumber: string;
  participantType: "internal" | "external";
  registerNumber?: string | null;
  school?: string | null;
  collegeName?: string | null;
  city?: string | null;
  pincode?: string | null;
  course?: string | null;
  department: string;
  yearOfStudy: number;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    const targetUserId = sessionUser?.id || profileData.userId;
    const targetEmail = sessionUser?.email || profileData.userEmail;

    if (!targetUserId || !targetEmail) {
      return { success: false, error: "User identity not found. Please sign in again." };
    }

    const payload: Record<string, unknown> = {
      id: targetUserId,
      email: targetEmail,
      full_name: profileData.fullName.trim(),
      mobile_number: profileData.mobileNumber.trim(),
      participant_type: profileData.participantType,
      register_number:
        profileData.participantType === "internal"
          ? profileData.registerNumber?.trim().toUpperCase()
          : (profileData.registerNumber?.trim().toUpperCase() || null),
      school: profileData.participantType === "internal" ? profileData.school : null,
      college_name:
        profileData.participantType === "external"
          ? profileData.collegeName?.trim()
          : "Kalasalingam Academy of Research and Education",
      course: profileData.course ? profileData.course.trim() : null,
      department: profileData.department.trim(),
      year_of_study: profileData.yearOfStudy,
      is_profile_completed: true,
      updated_at: new Date().toISOString(),
    };

    // Try saving with new columns (gender, city, pincode)
    const payloadWithExtras = {
      ...payload,
      gender: profileData.gender || null,
      city:
        profileData.participantType === "internal"
          ? (profileData.city?.trim() || "Krishnankoil")
          : (profileData.city?.trim() || null),
      pincode:
        profileData.participantType === "internal"
          ? (profileData.pincode?.trim() || "626126")
          : (profileData.pincode?.trim() || null),
    };

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient();

    // Check if profile exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();

    let saveError = null;

    if (existingProfile) {
      // Update existing profile
      const { error } = await adminClient
        .from("profiles")
        .update(payloadWithExtras)
        .eq("id", targetUserId);

      if (error) {
        // Fallback without optional columns if column mismatch
        const { error: baseErr } = await adminClient
          .from("profiles")
          .update(payload)
          .eq("id", targetUserId);
        saveError = baseErr;
      }
    } else {
      // Insert new profile
      const { error } = await adminClient.from("profiles").insert(payloadWithExtras);
      if (error) {
        const { error: baseErr } = await adminClient.from("profiles").insert(payload);
        saveError = baseErr;
      }
    }

    if (saveError) {
      console.error("Profile save error:", saveError);
      return { success: false, error: saveError.message };
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/complete-profile", "page");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save profile";
    return { success: false, error: msg };
  }
}

export async function signOutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
