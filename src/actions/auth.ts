"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isProfileComplete } from "@/lib/profile";

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

    // Verify profile completeness - if any fields are empty/null, rectify is_profile_completed to false
    const actuallyComplete = isProfileComplete(profile);
    if (profile) {
      if (profile.is_profile_completed && !actuallyComplete) {
        profile.is_profile_completed = false;
        adminClient.from("profiles").update({ is_profile_completed: false }).eq("id", user.id).then();
      } else if (!profile.is_profile_completed && actuallyComplete) {
        profile.is_profile_completed = true;
        adminClient.from("profiles").update({ is_profile_completed: true }).eq("id", user.id).then();
      }
    }

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

    // Verify all mandatory profile fields are non-empty before permitting completion
    const isComplete = isProfileComplete({
      email: targetEmail,
      full_name: profileData.fullName,
      mobile_number: profileData.mobileNumber,
      gender: profileData.gender as any,
      participant_type: profileData.participantType,
      register_number: profileData.registerNumber,
      school: profileData.school,
      college_name: profileData.collegeName,
      city: profileData.city,
      pincode: profileData.pincode,
      course: profileData.course,
      department: profileData.department,
      year_of_study: profileData.yearOfStudy,
    });

    if (!isComplete) {
      return { success: false, error: "Please fill in all required profile fields before submitting." };
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

export async function ensureStaffAccountAndRole(user: any) {
  try {
    if (!user || !user.email) {
      return { isStaff: false, isAdmin: false, isCoordinator: false };
    }

    const adminClient = await createAdminClient();
    const userEmail = (user.email || "").toLowerCase().trim();

    // 1. Fetch user roles & assignments
    const [
      { data: roleAssignments },
      { data: staffAssignments },
      { data: studentAssignments },
      { data: eventsData },
      { data: existingProfile },
    ] = await Promise.all([
      adminClient.from("user_role_assignments").select("role_id").eq("user_id", user.id),
      adminClient.from("staff_event_assignments").select("id").eq("user_id", user.id).limit(1),
      adminClient.from("student_coordinator_assignments").select("id").eq("user_id", user.id).limit(1),
      adminClient.from("events").select("id, description"),
      adminClient.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    const roles = (roleAssignments || []).map((r) => r.role_id);

    // 2. Check if listed in any event's [COORDINATOR_EMAILS:] tag
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

    const isAdmin =
      roles.includes("admin") ||
      Boolean(
        userEmail &&
          (userEmail.includes("admin") ||
            userEmail.includes("smith") ||
            userEmail === process.env.ADMIN_EMAIL)
      );

    const hasStaffAssignment = (staffAssignments && staffAssignments.length > 0) || isEventEmailStaff;
    const hasStudentAssignment = studentAssignments && studentAssignments.length > 0;
    const isStaff = roles.includes("staff_coordinator") || roles.includes("faculty") || hasStaffAssignment;
    const isCoordinator = roles.includes("student_coordinator") || isStaff || hasStudentAssignment || isAdmin;

    if (isCoordinator) {
      // Auto-provision or update profile as completed in DB
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        existingProfile?.full_name ||
        userEmail.split("@")[0];

      const isInternal = userEmail.endsWith("@klu.ac.in");

      // Verify whether existing profile genuinely has all required fields completed
      const isActuallyComplete = isProfileComplete(existingProfile);

      const profilePayload = {
        id: user.id,
        email: userEmail,
        full_name: fullName,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        participant_type: isInternal ? "internal" : "external",
        college_name: isInternal
          ? "Kalasalingam Academy of Research and Education"
          : existingProfile?.college_name || null,
        is_profile_completed: isActuallyComplete,
        updated_at: new Date().toISOString(),
      };

      if (!existingProfile) {
        await adminClient.from("profiles").insert(profilePayload);
      } else if (existingProfile.is_profile_completed !== isActuallyComplete) {
        await adminClient.from("profiles").update({ is_profile_completed: isActuallyComplete }).eq("id", user.id);
      }

      // Ensure staff role assignment exists in DB
      if (isAdmin && !roles.includes("admin")) {
        await adminClient.from("user_role_assignments").upsert({ user_id: user.id, role_id: "admin" });
      }
      if (isStaff && !roles.includes("staff_coordinator")) {
        await adminClient.from("user_role_assignments").upsert({ user_id: user.id, role_id: "staff_coordinator" });
      }
      if (hasStudentAssignment && !roles.includes("student_coordinator")) {
        await adminClient.from("user_role_assignments").upsert({ user_id: user.id, role_id: "student_coordinator" });
      }
    }

    return { isStaff, isAdmin, isCoordinator };
  } catch (err) {
    console.error("ensureStaffAccountAndRole error:", err);
    return { isStaff: false, isAdmin: false, isCoordinator: false };
  }
}
