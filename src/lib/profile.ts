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

  // 3. Gender (validated when present in payload or form)
  if (profile.gender !== undefined && profile.gender !== null && profile.gender !== "") {
    const gender = typeof profile.gender === "string" ? profile.gender.trim().toLowerCase() : "";
    if (!["male", "female", "other"].includes(gender)) return false;
  }

  // 4. Degree / Course: must be non-empty
  const course = typeof profile.course === "string" ? profile.course.trim() : "";
  if (!course) return false;

  // 5. Department / Branch: must be non-empty
  const department = typeof profile.department === "string" ? profile.department.trim() : "";
  if (!department) return false;

  // 6. Year of Study: 1 to 5
  const yearOfStudy = Number(profile.year_of_study);
  if (isNaN(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 5) return false;

  // 7. Role-Specific Validations: Strictly distinguish Internal vs External delegates
  const userEmail = typeof profile.email === "string" ? profile.email.toLowerCase().trim() : "";
  const pType = typeof profile.participant_type === "string" ? profile.participant_type.toLowerCase().trim() : "";

  // Internal KARE student check:
  // Must have participant_type === 'internal' OR (participant_type is not 'external' AND email ends with @klu.ac.in)
  const isInternal = pType === "internal" || (pType !== "external" && userEmail.endsWith("@klu.ac.in"));

  if (isInternal) {
    // Internal KARE Student: Register Number & School are required
    const regNo = typeof profile.register_number === "string" ? profile.register_number.trim() : "";
    if (regNo.length < 4) return false;

    const school = typeof profile.school === "string" ? profile.school.trim() : "";
    if (!school) return false;

    return true;
  } else {
    // External Delegate:
    // - College Name is strictly required (minimum 2 characters)
    // - Register Number & School are NOT required (external participants do not have them)
    const collegeName = typeof profile.college_name === "string" ? profile.college_name.trim() : "";
    if (collegeName.length < 2) return false;

    // Validate city if present
    if (profile.city !== undefined && profile.city !== null && typeof profile.city === "string") {
      const city = profile.city.trim();
      if (city.length > 0 && city.length < 2) return false;
    }

    // Validate pincode if present
    if (profile.pincode !== undefined && profile.pincode !== null && typeof profile.pincode === "string") {
      const rawPincode = profile.pincode.replace(/\D/g, "");
      if (rawPincode.length > 0 && rawPincode.length !== 6) return false;
    }

    return true;
  }
}
