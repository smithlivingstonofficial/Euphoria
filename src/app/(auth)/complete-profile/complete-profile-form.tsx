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
  ChevronDown,
  Sparkles,
  Lock,
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
  { id: "SCSE", name: "SCSE", desc: "Computing & AI" },
  { id: "SEEE", name: "SEEE", desc: "Electrical & ECE" },
  { id: "SMEC", name: "SMEC", desc: "Mech & Civil" },
  { id: "SAS", name: "SAS", desc: "Sciences" },
  { id: "SoM", name: "SoM", desc: "Management" },
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

  // Auto-detect register number from email
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

  // Auto-detect course from full name
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
  const [gender, setGender] = useState<"male" | "female" | "other">(
    (initialProfile?.gender as "male" | "female" | "other") || "male"
  );
  const [mobileNumber, setMobileNumber] = useState(initialProfile?.mobile_number || "");

  // Internal KARE Student Fields
  const [registerNumber, setRegisterNumber] = useState(defaultRegisterNo);
  const [school, setSchool] = useState(initialProfile?.school || "SCSE");
  const [department, setDepartment] = useState(
    initialProfile?.department || "Computer Applications (MCA / BCA)"
  );
  const [customDepartment, setCustomDepartment] = useState("");

  // Course & Year
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
    e.preventDefault();

    if (!isNameValid) {
      setErrorMessage("Please enter your full name (minimum 2 characters).");
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

      // Fallback to API route
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
    <div className="w-full">
      {/* Main Executive Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="border-b border-slate-100 bg-white px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Euphoria &apos;26 Delegate Registration
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Complete Participant Profile
              </h1>
              <p className="text-xs text-slate-500">
                Verify your personal and academic credentials to issue your official entry pass.
              </p>
            </div>

            {/* Google Verified Identity Pill */}
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 shrink-0 self-start sm:self-auto">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-5 w-5 rounded-full border border-slate-200 shrink-0"
                />
              ) : (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700 text-[10px]">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]">
                {user.email}
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-5 sm:mx-8 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Form Content */}
        <form
          action="/api/profile"
          method="POST"
          onSubmit={handleSubmit}
          className="p-6 sm:p-8 space-y-7"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="userEmail" value={user.email} />
          <input type="hidden" name="participantType" value={user.participantType} />

          {/* SECTION 1: Personal Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                1. Personal Details
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">All fields required</span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Smith Livingston"
                  className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                    fullName.length > 0 && !isNameValid
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-slate-900"
                  }`}
                />
              </div>
            </div>

            {/* Gender & WhatsApp Mobile - 2 Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gender Segmented Control */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 text-xs font-semibold capitalize rounded-lg transition-all cursor-pointer ${
                        gender === g
                          ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="gender" value={gender} />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  WhatsApp Contact Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 border-r border-slate-200 pr-2.5">
                    <span>+91</span>
                  </div>
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
                    className={`w-full rounded-xl border bg-white pl-18 pr-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                      mobileNumber.length > 0 && !isMobileValid
                        ? "border-rose-300 focus:border-rose-500"
                        : mobileNumber.length === 10 && isMobileValid
                        ? "border-emerald-400 focus:border-emerald-500"
                        : "border-slate-200 focus:border-slate-900"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Academic Record */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                2. Academic Institution &amp; Program
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                  user.participantType === "internal"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {user.participantType === "internal" ? "KARE Student" : "External Delegate"}
              </span>
            </div>

            {/* INTERNAL KARE FLOW */}
            {user.participantType === "internal" ? (
              <div className="space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Register Number */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Student Register Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="registerNumber"
                      required
                      value={registerNumber}
                      onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                      placeholder="9922004001"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 uppercase focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Year of Study Segmented Chips */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Year of Study <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 p-1 bg-slate-200/70 rounded-xl border border-slate-200">
                      {[
                        { id: "1", label: "1st" },
                        { id: "2", label: "2nd" },
                        { id: "3", label: "3rd" },
                        { id: "4", label: "4th" },
                        { id: "5", label: "Final" },
                      ].map((y) => (
                        <button
                          key={y.id}
                          type="button"
                          onClick={() => setYearOfStudy(y.id)}
                          className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            yearOfStudy === y.id
                              ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {y.label}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name="yearOfStudy" value={yearOfStudy} />
                  </div>
                </div>

                {/* School Selector Grid */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Organizing School <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {KARE_SCHOOLS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSchool(s.id)}
                        className={`rounded-xl p-2.5 text-center border transition-all cursor-pointer ${
                          school === s.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs font-bold">{s.name}</div>
                        <div className="text-[10px] opacity-75 truncate">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="school" value={school} />
                </div>

                {/* Degree / Program */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Degree / Academic Program <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-slate-900 focus:outline-none appearance-none pr-8"
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
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Department / Discipline <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-slate-900 focus:outline-none appearance-none pr-8"
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
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            ) : (
              /* EXTERNAL PARTICIPANT FLOW */
              <div className="space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    College / University Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="collegeName"
                      required
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="e.g. Sri Kaliswari College"
                      className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                        collegeName.length > 0 && !isCollegeValid
                          ? "border-rose-300 focus:border-rose-500"
                          : "border-slate-200 focus:border-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* City & Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Institution City / Town <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="city"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Sivakasi"
                        className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                          city.length > 0 && !isCityValid
                            ? "border-rose-300 focus:border-rose-500"
                            : "border-slate-200 focus:border-slate-900"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Postal Pincode <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Map className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
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
                        className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                          pincode.length > 0 && !isPincodeValid
                            ? "border-rose-300 focus:border-rose-500"
                            : pincode.length === 6 && isPincodeValid
                            ? "border-emerald-400 focus:border-emerald-500"
                            : "border-slate-200 focus:border-slate-900"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Year of Study Chips */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Year of Study <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 p-1 bg-slate-200/70 rounded-xl border border-slate-200">
                    {[
                      { id: "1", label: "1st Year" },
                      { id: "2", label: "2nd Year" },
                      { id: "3", label: "3rd Year" },
                      { id: "4", label: "4th Year" },
                      { id: "5", label: "PG / Final" },
                    ].map((y) => (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => setYearOfStudy(y.id)}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          yearOfStudy === y.id
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {y.label}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="yearOfStudy" value={yearOfStudy} />
                </div>

                {/* Degree */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Degree / Course <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-slate-900 focus:outline-none appearance-none pr-8"
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
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Department / Discipline <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-slate-900 focus:outline-none appearance-none pr-8"
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
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-3 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 px-5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer min-h-[48px]"
            >
              {isLoading ? (
                <span>Verifying &amp; Generating Pass...</span>
              ) : (
                <>
                  <span>Save Profile &amp; Open Event Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="h-3 w-3 text-slate-400" />
              <span>Official Delegate Verification • Kalasalingam University Euphoria 2026</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
