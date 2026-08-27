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
  GraduationCap,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  ChevronDown,
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

  // Auto-detect course from full name if present
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
    <div className="w-full max-w-lg mx-auto pb-12">
      <div className="rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header with Verified Google Badge */}
        <div className="border-b border-white/10 bg-slate-950/40 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight truncate">
                  Complete Participant Profile
                </h1>
                <p className="text-[11px] text-slate-400 truncate">
                  Euphoria &apos;26 Digital Delegate Pass
                </p>
              </div>
            </div>

            {/* Google Verified Account Badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-4 w-4 rounded-full border border-white/20 shrink-0"
                />
              ) : (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/30 font-bold text-primary text-[9px]">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-200 max-w-[100px] sm:max-w-[150px] truncate">
                {user.email}
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form
          action="/api/profile"
          method="POST"
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-5"
        >
          {/* Hidden identity fields */}
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="userEmail" value={user.email} />
          <input type="hidden" name="participantType" value={user.participantType} />

          {/* SECTION 1: Personal Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-black">
                1
              </span>
              <span>Personal Information</span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Smith Livingston"
                  className={`w-full rounded-2xl border bg-white/5 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all ${
                    fullName.length > 0 && !isNameValid
                      ? "border-rose-500/50 focus:border-rose-500"
                      : "border-white/10 focus:border-primary focus:bg-white/10"
                  }`}
                />
              </div>
            </div>

            {/* Gender Segmented Switcher */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Gender <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["male", "female", "other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-2xl py-2 px-3 text-xs font-bold capitalize transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      gender === g
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{g === "male" ? "👨 Male" : g === "female" ? "👩 Female" : "✨ Other"}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" name="gender" value={gender} />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mobile Number (WhatsApp) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-2.5 flex items-center gap-1 text-xs font-bold text-slate-400 border-r border-white/10 pr-2">
                  <span>🇮🇳</span>
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
                  className={`w-full rounded-2xl border bg-white/5 pl-20 pr-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none transition-all ${
                    mobileNumber.length > 0 && !isMobileValid
                      ? "border-rose-500/50 focus:border-rose-500"
                      : mobileNumber.length === 10 && isMobileValid
                      ? "border-emerald-500/50 focus:border-emerald-500"
                      : "border-white/10 focus:border-primary focus:bg-white/10"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Academic Details */}
          <div className="pt-3 border-t border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-black">
                  2
                </span>
                <span>Academic Record</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border uppercase tracking-wider ${
                  user.participantType === "internal"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                }`}
              >
                {user.participantType === "internal" ? "⭐ KARE Student" : "External Delegate"}
              </span>
            </div>

            {/* INTERNAL KARE FLOW */}
            {user.participantType === "internal" ? (
              <div className="space-y-3.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:p-4">
                {/* Register Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Student Register / Roll No <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="registerNumber"
                    required
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                    placeholder="9922004001"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 pl-3.5 pr-3.5 py-2.5 text-xs font-mono font-bold text-white uppercase focus:border-primary focus:outline-none"
                  />
                </div>

                {/* School Selector Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Organizing School <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {KARE_SCHOOLS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSchool(s.id)}
                        className={`rounded-2xl p-2.5 text-left border transition-all cursor-pointer ${
                          school === s.id
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                            : "bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div className="text-xs font-black">{s.name}</div>
                        <div className="text-[10px] opacity-80 truncate">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="school" value={school} />
                </div>

                {/* Year of Study Chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Year of Study <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: "1", label: "1st Yr" },
                      { id: "2", label: "2nd Yr" },
                      { id: "3", label: "3rd Yr" },
                      { id: "4", label: "4th Yr" },
                      { id: "5", label: "PG/Final" },
                    ].map((y) => (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => setYearOfStudy(y.id)}
                        className={`rounded-xl py-2 px-1 text-center text-xs font-bold transition-all cursor-pointer border ${
                          yearOfStudy === y.id
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                            : "bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {y.label}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="yearOfStudy" value={yearOfStudy} />
                </div>

                {/* Degree / Program Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Degree / Program <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-semibold focus:border-primary focus:outline-none appearance-none pr-8"
                    >
                      {DEGREE_CATEGORIES.map((cat) => (
                        <optgroup key={cat.category} label={cat.category} className="bg-slate-900 text-slate-200">
                          {cat.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-slate-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Department / Discipline <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-semibold focus:border-primary focus:outline-none appearance-none pr-8"
                    >
                      {DEPARTMENT_CATEGORIES.map((cat) => (
                        <optgroup key={cat.category} label={cat.category} className="bg-slate-900 text-slate-200">
                          {cat.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-slate-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            ) : (
              /* EXTERNAL PARTICIPANT FLOW */
              <div className="space-y-3.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:p-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    College / University Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      name="collegeName"
                      required
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="e.g. Sri Kaliswari College"
                      className={`w-full rounded-2xl border bg-slate-900 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all ${
                        collegeName.length > 0 && !isCollegeValid
                          ? "border-rose-500/50 focus:border-rose-500"
                          : "border-white/10 focus:border-primary"
                      }`}
                    />
                  </div>
                </div>

                {/* City & Pincode */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      City / Town <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        name="city"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Sivakasi"
                        className={`w-full rounded-2xl border bg-slate-900 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all ${
                          city.length > 0 && !isCityValid
                            ? "border-rose-500/50 focus:border-rose-500"
                            : "border-white/10 focus:border-primary"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Pincode <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Map className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
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
                        className={`w-full rounded-2xl border bg-slate-900 pl-9 pr-3 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none transition-all ${
                          pincode.length > 0 && !isPincodeValid
                            ? "border-rose-500/50 focus:border-rose-500"
                            : pincode.length === 6 && isPincodeValid
                            ? "border-emerald-500/50 focus:border-emerald-500"
                            : "border-white/10 focus:border-primary"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Year of Study Chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Year of Study <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: "1", label: "1st Yr" },
                      { id: "2", label: "2nd Yr" },
                      { id: "3", label: "3rd Yr" },
                      { id: "4", label: "4th Yr" },
                      { id: "5", label: "PG/Final" },
                    ].map((y) => (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => setYearOfStudy(y.id)}
                        className={`rounded-xl py-2 px-1 text-center text-xs font-bold transition-all cursor-pointer border ${
                          yearOfStudy === y.id
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                            : "bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800"
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
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Degree / Course <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-semibold focus:border-primary focus:outline-none appearance-none pr-8"
                    >
                      {DEGREE_CATEGORIES.map((cat) => (
                        <optgroup key={cat.category} label={cat.category} className="bg-slate-900 text-slate-200">
                          {cat.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-slate-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Department / Branch <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-semibold focus:border-primary focus:outline-none appearance-none pr-8"
                    >
                      {DEPARTMENT_CATEGORIES.map((cat) => (
                        <optgroup key={cat.category} label={cat.category} className="bg-slate-900 text-slate-200">
                          {cat.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-slate-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer min-h-[48px]"
            >
              {isLoading ? (
                <span>Saving Profile &amp; Opening Dashboard...</span>
              ) : (
                <>
                  <span>Save Profile &amp; Open Event Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
