import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isProfileComplete } from "@/lib/profile";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    let targetUserId = sessionUser?.id;
    let targetEmail = sessionUser?.email;

    let fullName = "";
    let gender = "";
    let mobileNumber = "";
    let participantType = "external";
    let registerNumber = "";
    let school = "";
    let collegeName = "";
    let city = "";
    let pincode = "";
    let course = "";
    let department = "";
    let yearOfStudy = 1;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      targetUserId = targetUserId || body.userId;
      targetEmail = targetEmail || body.userEmail;
      fullName = body.fullName || "";
      gender = body.gender || "";
      mobileNumber = body.mobileNumber || "";
      participantType = body.participantType || "external";
      registerNumber = body.registerNumber || "";
      school = body.school || "";
      collegeName = body.collegeName || "";
      city = body.city || "";
      pincode = body.pincode || "";
      course = body.course || "";
      department = body.department || "";
      yearOfStudy = parseInt(body.yearOfStudy, 10) || 1;
    } else {
      // Standard Form Data (application/x-www-form-urlencoded or multipart/form-data)
      const formData = await request.formData();
      targetUserId = targetUserId || (formData.get("userId") as string);
      targetEmail = targetEmail || (formData.get("userEmail") as string);
      fullName = (formData.get("fullName") as string) || "";
      gender = (formData.get("gender") as string) || "";
      mobileNumber = (formData.get("mobileNumber") as string) || "";
      participantType = (formData.get("participantType") as string) || "external";
      registerNumber = (formData.get("registerNumber") as string) || "";
      school = (formData.get("school") as string) || "";
      collegeName = (formData.get("collegeName") as string) || "";
      city = (formData.get("city") as string) || "";
      pincode = (formData.get("pincode") as string) || "";
      course = (formData.get("course") as string) || "";
      department = (formData.get("department") as string) || "";
      yearOfStudy = parseInt(formData.get("yearOfStudy") as string, 10) || 1;
    }

    if (!targetUserId || !targetEmail) {
      return NextResponse.redirect(new URL("/register?error=session_expired", request.url), 303);
    }

    // Verify all required fields are non-empty before setting profile completed
    const completenessCheck = isProfileComplete({
      email: targetEmail,
      full_name: fullName,
      mobile_number: mobileNumber,
      gender: gender as "male" | "female" | "other",
      participant_type: participantType as "internal" | "external",
      register_number: registerNumber,
      school: school,
      college_name: collegeName,
      city: city,
      pincode: pincode,
      course: course,
      department: department,
      year_of_study: yearOfStudy,
    });

    if (!completenessCheck) {
      if (contentType.includes("application/json")) {
        return NextResponse.json(
          { success: false, error: "Please fill in all required profile fields before submitting." },
          { status: 400 }
        );
      }
      return NextResponse.redirect(new URL("/complete-profile?error=incomplete_fields", request.url), 303);
    }

    const payload: Record<string, unknown> = {
      id: targetUserId,
      email: targetEmail,
      full_name: fullName.trim(),
      mobile_number: mobileNumber.trim(),
      participant_type: participantType,
      register_number:
        participantType === "internal"
          ? registerNumber.trim().toUpperCase()
          : (registerNumber ? registerNumber.trim().toUpperCase() : null),
      school: participantType === "internal" ? school : null,
      college_name:
        participantType === "external"
          ? collegeName.trim()
          : "Kalasalingam Academy of Research and Education",
      course: course ? course.trim() : null,
      department: department.trim(),
      year_of_study: yearOfStudy,
      is_profile_completed: true,
      updated_at: new Date().toISOString(),
    };

    // Try saving with extra columns (gender, city, pincode)
    const payloadWithExtras = {
      ...payload,
      gender: gender || null,
      city:
        participantType === "internal"
          ? (city ? city.trim() : "Krishnankoil")
          : (city ? city.trim() : null),
      pincode:
        participantType === "internal"
          ? (pincode ? pincode.trim() : "626126")
          : (pincode ? pincode.trim() : null),
    };

    // Use admin client to guarantee DB update
    const adminClient = await createAdminClient();

    // Check if profile exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();

    if (existingProfile) {
      const { error } = await adminClient
        .from("profiles")
        .update(payloadWithExtras)
        .eq("id", targetUserId);

      if (error) {
        await adminClient.from("profiles").update(payload).eq("id", targetUserId);
      }
    } else {
      const { error } = await adminClient.from("profiles").insert(payloadWithExtras);
      if (error) {
        await adminClient.from("profiles").insert(payload);
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/complete-profile", "page");

    if (contentType.includes("application/json")) {
      return NextResponse.json({ success: true, redirect: "/events" });
    }

    // Redirect natively to /events for HTML form submissions
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(new URL("/events", origin), 303);
  } catch (err) {
    console.error("Profile API error:", err);
    if (request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ success: false, error: "Failed to save profile." }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/complete-profile?error=save_failed", request.url), 303);
  }
}
