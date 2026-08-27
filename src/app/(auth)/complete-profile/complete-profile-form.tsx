"use client";

import { useState, useMemo } from "react";
import {
  UserCheck,
  AlertCircle,
  ArrowRight,
  Phone,
  Building,
  User,
  ShieldCheck,
  MapPin,
  Map,
} from "lucide-react";
import { saveParticipantProfile } from "@/actions/auth";

interface CompleteProfileFormProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    participantType: "internal" | "external";
  };
  initialProfile?: {
    full_name?: string | null;
    mobile_number?: string | null;
    gender?: "male" | "female" | "other" | null;
    register_number?: string | null;
    school?: string | null;
    department?: string | null;
    year_of_study?: number | null;
    college_name?: string | null;
    city?: string | null;
    pincode?: string | null;
    course?: string | null;
  } | null;
}

export const KARE_SCHOOLS = [
  { id: "SCSE", name: "SCSE (Computing)" },
  { id: "SEEE", name: "SEEE (Electrical/ECE)" },
  { id: "SMEC", name: "SMEC (Mech/Civil)" },
  { id: "SAS", name: "SAS (Sciences)" },
  { id: "SoM", name: "SoM (Management)" },
];

export const DEGREE_CATEGORIES = [
  {
    category: "Undergraduate (UG) - Engineering & Technology",
    options: [
      "B.Tech (Bachelor of Technology)",
      "B.E. (Bachelor of Engineering)",
      "B.Arch (Bachelor of Architecture)",
      "B.Des (Bachelor of Design)",
      "B.Plan (Bachelor of Planning)",
      "B.S. (Bachelor of Science - 4 Year Tech)",
    ],
  },
  {
    category: "Undergraduate (UG) - Computing, Sciences & Management",
    options: [
      "BCA (Bachelor of Computer Applications)",
      "B.Sc Computer Science",
      "B.Sc Information Technology",
      "B.Sc Data Science & AI",
      "B.Sc (Physics / Chem / Maths / Bio)",
      "BBA (Bachelor of Business Administration)",
      "B.Com (Bachelor of Commerce / Hons)",
      "B.Pharm (Bachelor of Pharmacy)",
      "B.A. (Bachelor of Arts)",
      "B.Voc (Bachelor of Vocation)",
    ],
  },
  {
    category: "Postgraduate (PG) - Engineering & Computing",
    options: [
      "MCA (Master of Computer Applications)",
      "M.Tech (Master of Technology)",
      "M.E. (Master of Engineering)",
      "M.S. (Master of Science by Research)",
      "M.Sc Computer Science / IT / Data Science",
    ],
  },
  {
    category: "Postgraduate (PG) - Management, Sciences & Arts",
    options: [
      "MBA (Master of Business Administration)",
      "PGDM (Post Graduate Diploma in Management)",
      "M.Sc (Sciences & Mathematics)",
      "M.Com (Master of Commerce)",
      "M.Des (Master of Design)",
      "M.Arch (Master of Architecture)",
      "M.Pharm (Master of Pharmacy)",
      "M.A. (Master of Arts)",
      "M.Plan (Master of Planning)",
    ],
  },
  {
    category: "Integrated Degrees (5 Years)",
    options: [
      "Integrated M.Tech (5 Years)",
      "Integrated M.Sc (5 Years)",
      "Integrated MCA (5 Years)",
      "Integrated MBA (5 Years)",
    ],
  },
  {
    category: "Research, Diploma & Other",
    options: [
      "Ph.D (Doctor of Philosophy)",
      "Diploma / Polytechnic",
      "Other",
    ],
  },
];

export const DEPARTMENT_CATEGORIES = [
  {
    category: "Computing & Information Technology",
    options: [
      "Computer Science & Engineering (CSE)",
      "Information Technology (IT)",
      "Artificial Intelligence & Machine Learning (AI/ML)",
      "Artificial Intelligence & Data Science (AI/DS)",
      "Computer Science & Business Systems (CSBS)",
      "Computer Science & Design (CSD)",
      "Cyber Security & Digital Forensics",
      "Cloud Computing & IoT",
      "Software Engineering",
      "Computer Applications (MCA / BCA)",
      "Data Science & Analytics",
    ],
  },
  {
    category: "Electrical & Electronics",
    options: [
      "Electronics & Communication Engineering (ECE)",
      "Electrical & Electronics Engineering (EEE)",
      "Electronics & Instrumentation Engineering (EIE)",
      "VLSI Design & Embedded Systems",
      "Robotics & Automation Engineering",
      "Biomedical Engineering",
      "Mechatronics Engineering",
    ],
  },
  {
    category: "Mechanical, Civil & Aerospace",
    options: [
      "Mechanical Engineering",
      "Civil Engineering",
      "Aerospace / Aeronautical Engineering",
      "Automobile Engineering",
      "Industrial & Production Engineering",
      "Marine Engineering",
      "Mining Engineering",
    ],
  },
  {
    category: "Chemical, Bio & Materials",
    options: [
      "Biotechnology & Bioinformatics",
      "Chemical Engineering",
      "Food Technology & Processing",
      "Agricultural Engineering",
      "Textile & Fashion Technology",
      "Material Science & Metallurgy",
    ],
  },
  {
    category: "Sciences, Management & Commerce",
    options: [
      "Mathematics & Statistics",
      "Physics / Applied Physics",
      "Chemistry / Applied Chemistry",
      "Management Studies (MBA / BBA)",
      "Commerce, Finance & Accounts",
      "Humanities & Social Sciences",
      "Other",
    ],
  },
];

export function CompleteProfileForm({
  user,
  initialProfile,
}: CompleteProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-detect register number from email (e.g. 9925151021@klu.ac.in -> 9925151021)
  const defaultRegisterNo = useMemo(() => {
    if (initialProfile?.register_number) return initialProfile.register_number;
    if (user.participantType === "internal" && user.email) {
      const prefix = user.email.split("@")[0];
      if (/^\d{5,15}$/.test(prefix) || /^[0-9a-zA-Z]{5,15}$/.test(prefix)) {
        return prefix;
      }
    }
    return "";
  }, [initialProfile?.register_number, user.participantType, user.email]);

  // Auto-detect course from full name if present (e.g. "SMITH LIVINGSTON S 2025-MCA" -> MCA)
  const defaultCourse = useMemo(() => {
    if (initialProfile?.course) return initialProfile.course;
    const nameUpper = (user.fullName || "").toUpperCase();
    if (nameUpper.includes("MCA")) return "MCA (Master of Computer Applications)";
    if (nameUpper.includes("B.TECH") || nameUpper.includes("BTECH")) return "B.Tech (Bachelor of Technology)";
    if (nameUpper.includes("M.TECH") || nameUpper.includes("MTECH")) return "M.Tech (Master of Technology)";
    if (nameUpper.includes("BCA")) return "BCA (Bachelor of Computer Applications)";
    if (nameUpper.includes("MBA")) return "MBA (Master of Business Administration)";
    if (nameUpper.includes("B.SC") || nameUpper.includes("BSC")) return "B.Sc Computer Science";
    return "MCA (Master of Computer Applications)";
  }, [initialProfile?.course, user.fullName]);

  // Common Profile State
  const [fullName, setFullName] = useState(user.fullName || initialProfile?.full_name || "");
  const [gender, setGender] = useState<string>(initialProfile?.gender || "male");
  const [mobileNumber, setMobileNumber] = useState(initialProfile?.mobile_number || "");

  // Internal KARE Student Fields
  const [registerNumber, setRegisterNumber] = useState(defaultRegisterNo);
  const [school, setSchool] = useState(initialProfile?.school || "SCSE");
  const [department, setDepartment] = useState(
    initialProfile?.department || "Computer Applications (MCA / BCA)"
  );
  const [customDepartment, setCustomDepartment] = useState("");

  // Course / Degree & Year
  const [course, setCourse] = useState(defaultCourse);
  const [customCourse, setCustomCourse] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState(
    initialProfile?.year_of_study ? String(initialProfile.year_of_study) : "2"
  );

  // External Student Fields
  const [collegeName, setCollegeName] = useState(initialProfile?.college_name || "");
  const [city, setCity] = useState(initialProfile?.city || "");
  const [pincode, setPincode] = useState(initialProfile?.pincode || "");

  // Validations
  const isMobileValid = useMemo(() => /^[6-9]\d{9}$/.test(mobileNumber), [mobileNumber]);
  const isPincodeValid = useMemo(() => (user.participantType === "internal" ? true : /^\d{6}$/.test(pincode)), [user.participantType, pincode]);
  const isCityValid = useMemo(() => (user.participantType === "internal" ? true : city.trim().length >= 2), [user.participantType, city]);
  const isNameValid = useMemo(() => fullName.trim().length >= 2, [fullName]);
  const isGenderValid = useMemo(() => gender === "male" || gender === "female" || gender === "other", [gender]);
  const isCollegeValid = useMemo(() => (user.participantType === "internal" ? true : collegeName.trim().length >= 3), [user.participantType, collegeName]);
  const isRegisterNumberValid = useMemo(() => (user.participantType === "external" ? true : registerNumber.trim().length >= 4), [user.participantType, registerNumber]);

  // Strict Keyboard Filters
  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Tab", "Delete", "ArrowLeft", "ArrowRight", "Enter", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    if (mobileNumber.length >= 10 && !((e.currentTarget.selectionEnd ?? 0) - (e.currentTarget.selectionStart ?? 0) > 0)) {
      e.preventDefault();
    }
  };

  const handlePincodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Tab", "Delete", "ArrowLeft", "ArrowRight", "Enter", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    if (pincode.length >= 6 && !((e.currentTarget.selectionEnd ?? 0) - (e.currentTarget.selectionStart ?? 0) > 0)) {
      e.preventDefault();
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleMobilePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setMobileNumber(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 10));
  };

  const handlePincodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setPincode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Unconditionally prevent default native reload

    if (!isNameValid) {
      setErrorMessage("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!isGenderValid) {
      setErrorMessage("Please select your gender.");
      return;
    }
    if (!isMobileValid) {
      setErrorMessage("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
      return;
    }
    if (user.participantType === "internal" && !isRegisterNumberValid) {
      setErrorMessage("Please enter your student register / roll number.");
      return;
    }
    if (user.participantType === "external") {
      if (!isCollegeValid) {
        setErrorMessage("Please enter your college / university name.");
        return;
      }
      if (!isCityValid) {
        setErrorMessage("Please enter your institution city / town.");
        return;
      }
      if (!isPincodeValid) {
        setErrorMessage("Please enter a valid 6-digit postal pincode.");
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);

    const resolvedDepartment = department === "Other" ? customDepartment.trim() : department;
    const resolvedCourse = course === "Other" ? customCourse.trim() : course;

    const payload = {
      userId: user.id,
      userEmail: user.email,
      fullName: fullName.trim(),
      gender,
      mobileNumber: mobileNumber.trim(),
      participantType: user.participantType,
      registerNumber: user.participantType === "internal" ? registerNumber.trim() : null,
      school: user.participantType === "internal" ? school : null,
      collegeName:
        user.participantType === "external"
          ? collegeName.trim()
          : "Kalasalingam Academy of Research and Education",
      city: user.participantType === "external" ? city.trim() : "Krishnankoil",
      pincode: user.participantType === "external" ? pincode.trim() : "626126",
      course: resolvedCourse,
      department: resolvedDepartment,
      yearOfStudy: parseInt(yearOfStudy, 10) || 1,
    };

    try {
      const result = await saveParticipantProfile(payload);

      if (result?.success) {
        window.location.href = "/dashboard";
        return;
      }

      // Secondary fallback to API route
      const apiRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (apiRes.ok) {
        window.location.href = "/dashboard";
        return;
      }

      setErrorMessage(result?.error || "Failed to save profile. Please try again.");
      setIsLoading(false);
    } catch (err: unknown) {
      try {
        const fallbackRes = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (fallbackRes.ok) {
          window.location.href = "/dashboard";
          return;
        }
      } catch {
        // ignore
      }

      const msg = err instanceof Error ? err.message : "Failed to save profile.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Unified Compact Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                  Complete Profile
                </h1>
                <p className="text-[11px] text-slate-500 truncate">
                  Euphoria &apos;26 Participant Pass
                </p>
              </div>
            </div>

            {/* Google Verified Account Badge */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-4 w-4 rounded-full border border-slate-200 shrink-0"
                />
              ) : (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-[9px]">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <span className="text-[11px] font-semibold text-slate-700 max-w-[110px] sm:max-w-[160px] truncate">
                {user.email}
              </span>
              <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Form Body - Supports both JavaScript and Native Form POST */}
        <form
          action="/api/profile"
          method="POST"
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-3.5"
        >
          {/* Hidden identity fields */}
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="userEmail" value={user.email} />
          <input type="hidden" name="participantType" value={user.participantType} />

          {/* SECTION 1: Personal Details */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                1
              </span>
              <span>Personal Details</span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Smith Livingston"
                  className={`w-full rounded-lg border bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none ${
                    fullName.length > 0 && !isNameValid
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-200 focus:border-primary"
                  }`}
                />
              </div>
            </div>

            {/* Gender & Mobile Number Side-by-Side */}
            <div className="grid grid-cols-5 gap-2.5">
              {/* Gender (2 cols) */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  name="gender"
                  value={gender}
                  required
                  onChange={(e) => setGender(e.target.value)}
                  className={`w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-slate-900 focus:outline-none ${
                    gender ? "border-slate-200 focus:border-primary" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Mobile Number (3 cols) */}
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-semibold border-r border-slate-200 pr-1">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="mobileNumber"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={mobileNumber}
                    onKeyDown={handleMobileKeyDown}
                    onPaste={handleMobilePaste}
                    onChange={handleMobileChange}
                    placeholder="9876543210"
                    className={`w-full rounded-lg border bg-white pl-11 pr-2 py-1.5 text-xs text-slate-900 font-mono focus:outline-none ${
                      mobileNumber.length > 0 && !isMobileValid
                        ? "border-rose-400 focus:border-rose-500"
                        : mobileNumber.length === 10 && isMobileValid
                        ? "border-emerald-400 focus:border-emerald-500"
                        : "border-slate-200 focus:border-primary"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Academic Details */}
          <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                  2
                </span>
                <span>Academic Record</span>
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${
                  user.participantType === "internal"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {user.participantType === "internal" ? "KARE Internal" : "External"}
              </span>
            </div>

            {/* INTERNAL KARE FLOW */}
            {user.participantType === "internal" ? (
              <div className="space-y-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Register No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="registerNumber"
                      required
                      value={registerNumber}
                      onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                      placeholder="9922004001"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 uppercase focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      School <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="school"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    >
                      {KARE_SCHOOLS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Degree / Program & Year */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Degree / Program <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    >
                      {DEGREE_CATEGORIES.map((cat) => (
                        <optgroup key={cat.category} label={cat.category}>
                          {cat.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Year of Study <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="yearOfStudy"
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">PG / Final Year</option>
                    </select>
                  </div>
                </div>

                {course === "Other" && (
                  <div>
                    <input
                      type="text"
                      name="customCourse"
                      required
                      value={customCourse}
                      onChange={(e) => setCustomCourse(e.target.value)}
                      placeholder="Specify degree name (e.g. MCA, M.Tech)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    />
                  </div>
                )}

                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department / Discipline <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                  >
                    {DEPARTMENT_CATEGORIES.map((cat) => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {department === "Other" && (
                  <div>
                    <input
                      type="text"
                      name="customDepartment"
                      required
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="Enter department name"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* EXTERNAL PARTICIPANT FLOW */
              <div className="space-y-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College / University <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      name="collegeName"
                      required
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="e.g. Sri Kaliswari College"
                      className={`w-full rounded-lg border bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none ${
                        collegeName.length > 0 && !isCollegeValid
                          ? "border-rose-400 focus:border-rose-500"
                          : "border-slate-200 focus:border-primary"
                      }`}
                    />
                  </div>
                </div>

                {/* City & Pincode */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City / Town <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        name="city"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Sivakasi"
                        className={`w-full rounded-lg border bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none ${
                          city.length > 0 && !isCityValid
                            ? "border-rose-400 focus:border-rose-500"
                            : "border-slate-200 focus:border-primary"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pincode <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Map className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        name="pincode"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={pincode}
                        onKeyDown={handlePincodeKeyDown}
                        onPaste={handlePincodePaste}
                        onChange={handlePincodeChange}
                        placeholder="626189"
                        className={`w-full rounded-lg border bg-white pl-9 pr-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none ${
                          pincode.length > 0 && !isPincodeValid
                            ? "border-rose-400 focus:border-rose-500"
                            : pincode.length === 6 && isPincodeValid
                            ? "border-emerald-400 focus:border-emerald-500"
                            : "border-slate-200 focus:border-primary"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Degree & Year */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Degree <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    >
                      {DEGREE_CATEGORIES.map((cat) => (
                        <optgroup key={cat.category} label={cat.category}>
                          {cat.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Year <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="yearOfStudy"
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">PG / Masters</option>
                    </select>
                  </div>
                </div>

                {course === "Other" && (
                  <div>
                    <input
                      type="text"
                      name="customCourse"
                      required
                      value={customCourse}
                      onChange={(e) => setCustomCourse(e.target.value)}
                      placeholder="Specify degree name"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    />
                  </div>
                )}

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department / Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                  >
                    {DEPARTMENT_CATEGORIES.map((cat) => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {department === "Other" && (
                    <input
                      type="text"
                      name="customDepartment"
                      required
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="Enter department name"
                      className="w-full mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Saving Profile & Opening Dashboard...</span>
              ) : (
                <>
                  <span>Save Profile & Open Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
