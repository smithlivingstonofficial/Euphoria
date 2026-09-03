import { Profile } from "@/types/database";

/**
 * Validates whether all mandatory profile fields are non-empty and correctly formatted.
 * If ANY mandatory field is missing, empty, or invalid, returns false.
 */
export function isProfileComplete(
  profile: Partial<Profile> | Record<string, unknown> | null | undefined
): boolean {
  if (!profile) return false;

  // 1. Full Name: at least 2 characters
  const fullName = typeof profile.full_name === "string" ? profile.full_name.trim() : "";
  if (fullName.length < 2) return false;

  // 2. Mobile Number: exactly 10 digits
  const rawMobile = typeof profile.mobile_number === "string" ? profile.mobile_number.replace(/\D/g, "") : "";
  if (rawMobile.length !== 10) return false;

  // 3. Gender: must be specified ("male" | "female" | "other")
  const gender = typeof profile.gender === "string" ? profile.gender.trim().toLowerCase() : "";
  if (!gender || !["male", "female", "other"].includes(gender)) return false;

  // 4. Degree / Course: must be non-empty
  const course = typeof profile.course === "string" ? profile.course.trim() : "";
  if (!course) return false;

  // 5. Department / Branch: must be non-empty
  const department = typeof profile.department === "string" ? profile.department.trim() : "";
  if (!department) return false;

  // 6. Year of Study: 1 to 5
  const yearOfStudy = Number(profile.year_of_study);
  if (isNaN(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 5) return false;

  // 7. Role-Specific Validations
  const userEmail = typeof profile.email === "string" ? profile.email.toLowerCase() : "";
  const isInternal =
    profile.participant_type === "internal" ||
    userEmail.endsWith("@klu.ac.in");

  if (isInternal) {
    // Internal KARE Student: Register Number & School are required
    const regNo = typeof profile.register_number === "string" ? profile.register_number.trim() : "";
    if (regNo.length < 4) return false;

    const school = typeof profile.school === "string" ? profile.school.trim() : "";
    if (!school) return false;

    return true;
  } else {
    // External Delegate: College Name, City, and 6-digit Pincode are required
    const collegeName = typeof profile.college_name === "string" ? profile.college_name.trim() : "";
    if (collegeName.length < 2) return false;

    const city = typeof profile.city === "string" ? profile.city.trim() : "";
    if (city.length < 2) return false;

    const rawPincode = typeof profile.pincode === "string" ? profile.pincode.replace(/\D/g, "") : "";
    if (rawPincode.length !== 6) return false;

    return true;
  }
}
