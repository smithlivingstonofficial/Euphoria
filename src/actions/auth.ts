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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: roleAssignments } = await supabase
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", user.id);

    const roles = (roleAssignments || []).map((r) => r.role_id);

    return {
      user,
      profile,
      roles,
      isAdmin: roles.includes("admin"),
      isStaff: roles.includes("staff_coordinator"),
      isCoordinator: roles.includes("student_coordinator"),
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
