"use client";

import { useState, useMemo } from "react";
import {
  UserCheck,
  AlertCircle,
  ArrowRight,
  Phone,
  Building,
  School,
  User,
  ShieldCheck,
  MapPin,
  Map,
  ChevronDown,
  Lock,
  GraduationCap,
} from "lucide-react";
import { saveParticipantProfile } from "@/actions/auth";
import { SearchableSelect } from "@/components/ui/searchable-select";

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

export interface KareSchool {
  id: string;
  shortName: string;
  name: string;
}

export const KARE_SCHOOLS: KareSchool[] = [
  {
    id: "SoC",
    shortName: "SoC / SCSE",
    name: "School of Computing (SoC)",
  },
  {
    id: "SEET",
    shortName: "SEET",
    name: "School of Electronics, Electrical and Biomedical Technology (SEET)",
  },
  {
    id: "SMACE",
    shortName: "SMACE",
    name: "School of Mechanical, Aero, Auto and Civil Engineering (SMACE)",
  },
  {
    id: "SBCE",
    shortName: "SBCE",
    name: "School of Bio, Chemical and Processing Engineering (SBCE)",
  },
  {
    id: "SAS",
    shortName: "SAS",
    name: "School of Advanced Sciences (SAS)",
  },
  {
    id: "KBS",
    shortName: "KBS / SoM",
    name: "Kalasalingam Business School (KBS)",
  },
  {
    id: "KSAH",
    shortName: "KSAH",
    name: "Kalasalingam School of Agriculture and Horticulture (KSAH)",
  },
  {
    id: "KSoA",
    shortName: "KSoA",
    name: "Kalasalingam School of Architecture (KSoA)",
  },
  {
    id: "KSoL",
    shortName: "KSoL / KSL",
    name: "Kalasalingam School of Law (KSoL)",
  },
  {
    id: "SLASE",
    shortName: "SLASE / SLATE",
    name: "School of Liberal Arts and Special Education (SLASE)",
  },
  {
    id: "KSAHS",
    shortName: "KSAHS",
    name: "Kalasalingam School of Allied and Health Sciences (KSAHS)",
  },
  {
    id: "KSP",
    shortName: "KSP",
    name: "Kalasalingam School of Physiotherapy (KSP)",
  },
  {
    id: "CoN",
    shortName: "CoN",
    name: "College of Nursing (CoN)",
  },
  {
    id: "SCHM",
    shortName: "SCHM",
    name: "School of Catering and Hotel Management (SCHM)",
  },
];

export const KARE_SCHOOL_OPTIONS = KARE_SCHOOLS.map((s) => s.name);

export interface DegreeGroup {
  category: string;
  options: string[];
}

export const STANDALONE_DEGREE_CATEGORIES: DegreeGroup[] = [
  {
    category: "Undergraduate (UG)",
    options: [
      "B.Tech (Bachelor of Technology)",
      "BCA (Bachelor of Computer Applications)",
      "B.Sc (Bachelor of Science)",
      "B.Sc (Hons) Agriculture / Horticulture",
      "B.Sc Allied Health Sciences (AHS)",
      "B.Arch (Bachelor of Architecture)",
      "B.Com (Bachelor of Commerce)",
      "BBA (Bachelor of Business Administration)",
      "Law (B.A. LL.B / B.Com LL.B / LL.B)",
      "BPT (Bachelor of Physiotherapy)",
      "B.Sc Nursing",
      "B.A. (Bachelor of Arts)",
      "B.Ed (Special Education / General)",
      "B.E. (Bachelor of Engineering)",
      "B.Des (Bachelor of Design)",
      "B.Pharm (Bachelor of Pharmacy)",
      "B.Voc (Bachelor of Vocation)",
    ],
  },
  {
    category: "Postgraduate (PG)",
    options: [
      "MCA (Master of Computer Applications)",
      "M.Tech (Master of Technology)",
      "MBA (Master of Business Administration)",
      "M.Sc (Master of Science)",
      "M.Arch (Habitat Design)",
      "M.Com (Master of Commerce)",
      "MSW (Master of Social Work)",
      "M.A. (Master of Arts)",
      "MPT (Master of Physiotherapy)",
      "M.Sc Nursing",
      "LL.M (Master of Laws)",
      "M.E. (Master of Engineering)",
      "M.Des (Master of Design)",
      "M.Pharm (Master of Pharmacy)",
      "PGDM (Post Graduate Diploma in Management)",
    ],
  },
  {
    category: "Integrated Degrees (5 Years)",
    options: [
      "Integrated M.Tech (5 Years)",
      "Integrated MCA (5 Years)",
      "Integrated M.Sc (5 Years)",
      "Integrated MBA (5 Years)",
    ],
  },
  {
    category: "Research, Diploma & Other",
    options: [
      "Ph.D / Doctoral Research",
      "Diploma / Polytechnic",
      "Other",
    ],
  },
];

export const DEPARTMENTS_BY_DEGREE: Record<string, string[]> = {
  "B.Tech (Bachelor of Technology)": [
    "Computer Science & Engineering (CSE)",
    "Information Technology (IT)",
    "Artificial Intelligence & Machine Learning (AI/ML)",
    "Artificial Intelligence & Data Science (AI/DS)",
    "Computer Science & Business Systems (CSBS)",
    "Computer Science & Design (CSD)",
    "Cyber Security & Digital Forensics",
    "Cloud Computing & IoT",
    "Software Engineering",
    "Electronics & Communication Engineering (ECE)",
    "Electrical & Electronics Engineering (EEE)",
    "Electronics & Instrumentation Engineering (EIE)",
    "Mechanical Engineering",
    "Mechatronics Engineering",
    "Robotics & Automation Engineering",
    "Civil Engineering",
    "Aerospace Engineering",
    "Aeronautical Engineering",
    "Automobile Engineering",
    "Biomedical Engineering",
    "Biotechnology",
    "Chemical Engineering",
    "Food Technology & Processing",
    "Agricultural Engineering",
    "Marine Engineering",
    "Textile & Fashion Technology",
    "Material Science & Metallurgy",
    "Other",
  ],
  "B.E. (Bachelor of Engineering)": [
    "Computer Science & Engineering (CSE)",
    "Information Technology (IT)",
    "Artificial Intelligence & Machine Learning (AI/ML)",
    "Electronics & Communication Engineering (ECE)",
    "Electrical & Electronics Engineering (EEE)",
    "Electronics & Instrumentation Engineering (EIE)",
    "Mechanical Engineering",
    "Mechatronics Engineering",
    "Civil Engineering",
    "Aeronautical Engineering",
    "Automobile Engineering",
    "Biomedical Engineering",
    "Biotechnology",
    "Other",
  ],
  "BCA (Bachelor of Computer Applications)": [
    "Computer Applications (General)",
    "Cloud Computing & Cybersecurity",
    "Data Analytics & Big Data",
    "Artificial Intelligence & Machine Learning",
    "Web & Mobile Application Development",
    "Software Engineering & Testing",
    "UI/UX & Multimedia Design",
    "Other",
  ],
  "MCA (Master of Computer Applications)": [
    "Computer Applications (General)",
    "Cloud Computing & DevOps",
    "Artificial Intelligence & Data Analytics",
    "Cyber Security & Ethical Hacking",
    "Full Stack Web Development",
    "Mobile Application Development",
    "Software Systems & Architecture",
    "Other",
  ],
  "M.Tech (Master of Technology)": [
    "Computer Science & Engineering (CSE)",
    "Artificial Intelligence & Data Science",
    "Cyber Security & Digital Forensics",
    "VLSI Design & Embedded Systems",
    "Communication Systems & Networks",
    "Power Electronics & Power Systems",
    "Thermal Engineering & Energy Systems",
    "CAD / CAM & Manufacturing",
    "Robotics & Mechatronics",
    "Structural Engineering & Construction",
    "Environmental Engineering",
    "Biotechnology & Biochemical Engineering",
    "Other",
  ],
  "M.E. (Master of Engineering)": [
    "Computer Science & Engineering (CSE)",
    "VLSI Design & Embedded Systems",
    "Communication Systems",
    "Power Electronics",
    "Thermal Engineering",
    "CAD / CAM",
    "Structural Engineering",
    "Other",
  ],
  "B.Sc (Bachelor of Science)": [
    "Computer Science",
    "Information Technology",
    "Data Science & Artificial Intelligence",
    "Mathematics",
    "Physics / Applied Physics",
    "Chemistry / Applied Chemistry",
    "Biotechnology",
    "Microbiology",
    "Biochemistry",
    "Forensic Science",
    "Visual Communication & Electronic Media",
    "Electronics",
    "Statistics",
    "Psychology",
    "Agriculture / Horticulture",
    "Fashion Technology & Costume Design",
    "Other",
  ],
  "M.Sc (Master of Science)": [
    "Computer Science",
    "Information Technology",
    "Data Science & Big Data",
    "Mathematics / Applied Mathematics",
    "Physics / Applied Physics",
    "Chemistry / Applied Chemistry",
    "Biotechnology",
    "Microbiology",
    "Biochemistry",
    "Forensic Science",
    "Environmental Sciences",
    "Visual Communication",
    "Other",
  ],
  "BBA (Bachelor of Business Administration)": [
    "General Business Administration",
    "Marketing Management",
    "Finance & Financial Services",
    "Human Resource Management (HRM)",
    "Digital Marketing & E-Commerce",
    "Logistics & Supply Chain Management",
    "International Business",
    "Business Analytics",
    "Aviation & Hospitality Management",
    "Other",
  ],
  "MBA (Master of Business Administration)": [
    "Business Analytics & Big Data",
    "Marketing Management & Brand Strategy",
    "Financial Management & Banking",
    "Human Resource Management (HRM)",
    "Operations & Supply Chain Management",
    "Information Systems / IT Management",
    "International Business & Trade",
    "Digital Marketing & Growth",
    "Healthcare & Hospital Administration",
    "Entrepreneurship & Innovation",
    "Other",
  ],
  "PGDM (Post Graduate Diploma in Management)": [
    "General Management",
    "Marketing Management",
    "Finance & Banking",
    "Human Resource Management (HRM)",
    "Operations & Supply Chain",
    "Business Analytics",
    "Other",
  ],
  "B.Com (Bachelor of Commerce)": [
    "General Commerce",
    "Computer Applications (B.Com CA)",
    "Professional Accounting (PA)",
    "Accounting & Finance (A&F)",
    "Corporate Secretaryship (CS)",
    "Banking, Financial Services & Insurance (BFSI)",
    "Financial Technology (FinTech)",
    "Honours",
    "Other",
  ],
  "M.Com (Master of Commerce)": [
    "General Commerce",
    "Accounting & Finance",
    "Banking & Insurance",
    "Computer Applications in Business",
    "International Business & Trade",
    "Other",
  ],
  "B.Arch (Bachelor of Architecture)": [
    "Architecture & Building Design",
    "Landscape Architecture",
    "Urban Planning & Design",
    "Interior Architecture",
    "Sustainable & Green Architecture",
    "Other",
  ],
  "M.Arch (Master of Architecture)": [
    "Urban Design & Planning",
    "Landscape Architecture",
    "Sustainable Architecture",
    "Interior Architecture",
    "Other",
  ],
  "B.Des (Bachelor of Design)": [
    "UI/UX & Interaction Design",
    "Communication & Graphic Design",
    "Industrial & Product Design",
    "Fashion & Textile Design",
    "Animation & Game Design",
    "Interior & Spatial Design",
    "Other",
  ],
  "M.Des (Master of Design)": [
    "UI/UX & Interaction Design",
    "Industrial Design",
    "Visual Communication",
    "Animation & Digital Design",
    "Other",
  ],
  "B.Pharm (Bachelor of Pharmacy)": [
    "Pharmacy (General)",
    "Pharmaceutics",
    "Pharmacology",
    "Pharmaceutical Chemistry",
    "Pharmacognosy",
    "Pharmacy Practice & Clinical",
    "Other",
  ],
  "M.Pharm (Master of Pharmacy)": [
    "Pharmaceutics",
    "Pharmacology",
    "Pharmaceutical Chemistry",
    "Pharmaceutical Analysis & Quality Assurance",
    "Pharmacy Practice",
    "Other",
  ],
  "Law (B.A. LL.B / B.Com LL.B / LL.B)": [
    "B.A. LL.B. (Hons) - 5 Years",
    "B.Com. LL.B. (Hons) - 5 Years",
    "LL.B. (Hons) - 3 Years",
    "Constitutional & Administrative Law",
    "Corporate & Commercial Law",
    "Criminal Law & Cyber Law",
    "Intellectual Property Rights (IPR)",
    "General Legal Studies",
    "Other",
  ],
  "B.Sc (Hons) Agriculture / Horticulture": [
    "Agriculture (Honours)",
    "Horticulture (Honours)",
    "Agronomy & Crop Science",
    "Soil Science & Agricultural Chemistry",
    "Genetics & Plant Breeding",
    "Agricultural Entomology & Pathology",
    "Other",
  ],
  "B.Sc Allied Health Sciences (AHS)": [
    "Cardiac Technology",
    "Radiology & Imaging Technology",
    "Operation Theatre & Anaesthesia Technology",
    "Medical Laboratory Technology (MLT)",
    "Physician Assistant",
    "Dialysis Technology",
    "Respiratory Therapy",
    "Optometry Technology",
    "Other",
  ],
  "BPT (Bachelor of Physiotherapy)": [
    "Physiotherapy (General)",
    "Orthopaedics & Sports Physiotherapy",
    "Neurological Physiotherapy",
    "Cardio-Respiratory Physiotherapy",
    "Paediatric Physiotherapy",
    "Community Rehabilitation",
    "Other",
  ],
  "MPT (Master of Physiotherapy)": [
    "Orthopaedics Physiotherapy",
    "Neurological Physiotherapy",
    "Sports Physiotherapy",
    "Cardio-Pulmonary Physiotherapy",
    "Paediatric Physiotherapy",
    "Other",
  ],
  "B.Sc Nursing": [
    "Basic B.Sc Nursing",
    "Post Basic B.Sc Nursing",
    "Other",
  ],
  "M.Sc Nursing": [
    "Medical Surgical Nursing",
    "Child Health (Paediatric) Nursing",
    "Obstetrics & Gynaecological Nursing",
    "Community Health Nursing",
    "Psychiatric (Mental Health) Nursing",
    "Other",
  ],
  "M.Arch (Habitat Design)": [
    "Habitat Design",
    "Sustainable Urban Habitat",
    "Housing & Environmental Planning",
    "Smart Cities & Urban Design",
    "Other",
  ],
  "B.Ed (Special Education / General)": [
    "Special Education (Hearing Impairment)",
    "Mathematics Education",
    "Physical Science Education",
    "Biological Science Education",
    "English Education",
    "Other",
  ],
  "LL.M (Master of Laws)": [
    "Corporate & Commercial Law",
    "Constitutional Law",
    "Cyber Law & Digital Rights",
    "Criminal Law",
    "IPR & Technology Law",
    "Other",
  ],
  "B.A. (Bachelor of Arts)": [
    "English Literature",
    "Economics",
    "Journalism & Mass Communication",
    "Tamil / Regional Languages",
    "Psychology",
    "Political Science & Public Administration",
    "History & Tourism",
    "Sociology",
    "Other",
  ],
  "M.A. (Master of Arts)": [
    "English Literature",
    "Economics",
    "Journalism & Mass Communication",
    "Tamil / Regional Languages",
    "Psychology",
    "Political Science",
    "Other",
  ],
  "MSW (Master of Social Work)": [
    "Community Development",
    "Human Resource Management (HRM)",
    "Medical & Psychiatric Social Work",
    "Other",
  ],
  "B.Voc (Bachelor of Vocation)": [
    "Software Development",
    "Digital Media & Animation",
    "Food Processing & Quality Control",
    "Medical Laboratory Technology",
    "Banking & Financial Services",
    "Renewable Energy Technology",
    "Other",
  ],
  "Integrated M.Tech (5 Years)": [
    "Computer Science & Engineering (CSE)",
    "Artificial Intelligence & Machine Learning",
    "Data Science & Analytics",
    "Software Engineering",
    "Electronics & Communication Engineering",
    "Mechanical Engineering",
    "Other",
  ],
  "Integrated MCA (5 Years)": [
    "Computer Applications & Software Development",
    "Cloud Computing & Data Science",
    "Cyber Security",
    "Other",
  ],
  "Integrated M.Sc (5 Years)": [
    "Computer Science & Data Science",
    "Mathematics & Computing",
    "Physics & Materials",
    "Chemistry & Nanotechnology",
    "Biotechnology",
    "Other",
  ],
  "Integrated MBA (5 Years)": [
    "Business Analytics & Data Science",
    "Marketing & E-Commerce",
    "Finance & FinTech",
    "Human Resource Management",
    "Other",
  ],
  "Ph.D / Doctoral Research": [
    "Computer Science & Engineering",
    "Electronics & Communication",
    "Electrical & Electronics",
    "Mechanical Engineering",
    "Civil Engineering",
    "Mathematics & Data Science",
    "Physics & Applied Sciences",
    "Chemistry & Chemical Sciences",
    "Biotechnology & Life Sciences",
    "Management Studies",
    "Commerce & Finance",
    "Humanities & Languages",
    "Other",
  ],
  "Diploma / Polytechnic": [
    "Computer Engineering",
    "Information Technology",
    "Electronics & Communication Engineering",
    "Electrical & Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Automobile Engineering",
    "Mechatronics",
    "Chemical Engineering",
    "Other",
  ],
  "Other": [
    "Engineering & Technology",
    "Computer Applications & IT",
    "Pure & Applied Sciences",
    "Management & Business",
    "Commerce & Finance",
    "Arts, Humanities & Social Sciences",
    "Design, Media & Architecture",
    "Medical, Health & Pharmacy",
    "Law & Legal Studies",
    "Other",
  ],
};

export function getDepartmentsForDegree(degreeName: string): string[] {
  if (DEPARTMENTS_BY_DEGREE[degreeName]) {
    return DEPARTMENTS_BY_DEGREE[degreeName];
  }
  return DEPARTMENTS_BY_DEGREE["Other"] || ["Other"];
}

export interface YearOption {
  value: string;
  label: string;
  badge?: string;
}

export function getYearOptionsForDegree(degreeName: string): YearOption[] {
  const d = (degreeName || "").toLowerCase();

  // 1. 2-Year Postgraduate Degrees (MCA, MBA, M.Tech, M.Sc, M.Arch, M.Com, MSW, M.A., MPT, M.Sc Nursing, LL.M, PGDM, M.E., M.Des, M.Pharm, B.Ed)
  if (
    d.includes("mca") ||
    d.includes("mba") ||
    d.includes("m.tech") ||
    d.includes("m.sc") ||
    d.includes("m.arch") ||
    d.includes("m.com") ||
    d.includes("msw") ||
    d.includes("m.a.") ||
    d.includes("mpt") ||
    (d.includes("nursing") && d.includes("m.sc")) ||
    d.includes("pgdm") ||
    d.includes("ll.m") ||
    d.includes("m.e.") ||
    d.includes("m.des") ||
    d.includes("m.pharm") ||
    d.includes("b.ed")
  ) {
    return [
      { value: "1", label: "1st Year" },
      { value: "2", label: "2nd Year (Final Year)" },
    ];
  }

  // 2. 5-Year Integrated / Professional Degrees (B.Arch, Integrated M.Tech/MCA/M.Sc/MBA, 5-Year Law)
  if (
    d.includes("integrated") ||
    d.includes("b.arch") ||
    d.includes("5 years") ||
    d.includes("b.a. ll.b") ||
    d.includes("b.com. ll.b") ||
    d.includes("b.b.a. ll.b")
  ) {
    return [
      { value: "1", label: "1st Year" },
      { value: "2", label: "2nd Year" },
      { value: "3", label: "3rd Year" },
      { value: "4", label: "4th Year" },
      { value: "5", label: "5th Year (Final Year)" },
    ];
  }

  // 3. 4-Year Undergraduate Degrees (B.Tech, B.E., B.Pharm, BPT Physiotherapy, B.Sc Nursing, B.Des, B.Sc Hons Agriculture)
  if (
    d.includes("b.tech") ||
    d.includes("b.e.") ||
    d.includes("b.pharm") ||
    d.includes("bpt") ||
    (d.includes("nursing") && !d.includes("m.sc")) ||
    d.includes("b.des") ||
    d.includes("agriculture") ||
    d.includes("horticulture")
  ) {
    return [
      { value: "1", label: "1st Year" },
      { value: "2", label: "2nd Year" },
      { value: "3", label: "3rd Year" },
      { value: "4", label: "4th Year (Final Year)" },
    ];
  }

  // 4. Ph.D / Doctoral Research
  if (d.includes("ph.d") || d.includes("doctoral") || d.includes("research")) {
    return [
      { value: "1", label: "1st Year (Coursework)" },
      { value: "2", label: "2nd Year (Research)" },
      { value: "3", label: "3rd Year (Pre-Synopsis)" },
      { value: "4", label: "4th+ Year (Thesis Submission)" },
    ];
  }

  // 5. Default 3-Year Undergraduate Degrees (BCA, B.Sc, BBA, B.Com, B.A., B.Voc, Diploma, 3-Year LL.B, Other)
  return [
    { value: "1", label: "1st Year" },
    { value: "2", label: "2nd Year" },
    { value: "3", label: "3rd Year (Final Year)" },
  ];
}

export function inferYearFromRegisterNumber(regNo: string, degree: string): string | null {
  if (!regNo || regNo.length < 4) return null;
  const match = regNo.trim().match(/^99(\d{2})/);
  if (!match) return null;
  const joinYear = parseInt(match[1], 10);
  const currentAcademicYear = 26; // Euphoria '26 Academic Cycle
  const diff = currentAcademicYear - joinYear;
  if (diff >= 1 && diff <= 5) {
    const yearOpts = getYearOptionsForDegree(degree);
    const maxYear = Number(yearOpts[yearOpts.length - 1].value);
    const clamped = Math.min(Math.max(diff, 1), maxYear);
    return String(clamped);
  }
  return null;
}

export const normalizeSchoolId = (s?: string | null): string => {
  if (!s) return "SoC";
  const upper = s.toUpperCase().trim();
  if (upper === "SCSE" || upper.includes("COMPUT") || upper === "SOC") return "SoC";
  if (upper === "SEEE" || upper.includes("ELECTR") || upper === "SEET" || upper.includes("BIOMED")) return "SEET";
  if (upper === "SMEC" || upper.includes("MECH") || upper.includes("AERO") || upper === "SMACE" || upper.includes("CIVIL")) return "SMACE";
  if (upper === "SOM" || upper.includes("BUSINESS") || upper === "KBS" || upper.includes("COMMERCE") || upper.includes("MANAGEMENT")) return "KBS";
  if (upper.includes("ADVANCED") || upper === "SAS") return "SAS";
  if (upper.includes("AGRI") || upper.includes("HORTI") || upper === "KSAH") return "KSAH";
  if (upper.includes("ARCH") || upper === "KSOA") return "KSoA";
  if (upper.includes("LAW") || upper === "KSOL" || upper === "KSL" || upper.includes("LL.B") || upper.includes("LLB")) return "KSoL";
  if (upper.includes("LIBERAL") || upper.includes("SPECIAL") || upper === "SLASE" || upper === "SLATE") return "SLASE";
  if (upper.includes("ALLIED") || upper.includes("HEALTH") || upper === "KSAHS") return "KSAHS";
  if (upper.includes("PHYSIO") || upper === "KSP" || upper.includes("BPT") || upper.includes("MPT")) return "KSP";
  if (upper.includes("NURS") || upper === "CON") return "CoN";
  if (upper.includes("CATER") || upper.includes("HOTEL") || upper === "SCHM") return "SCHM";
  if (upper.includes("BIO") || upper.includes("CHEM") || upper === "SBCE") return "SBCE";
  return s;
};

export function suggestSchoolForDept(dept: string, course: string): string {
  const text = `${course} ${dept}`.toLowerCase();

  // 1. Kalasalingam School of Agriculture and Horticulture (KSAH)
  if (text.includes("agri") || text.includes("horti")) {
    return "KSAH";
  }

  // 2. Kalasalingam School of Architecture (KSoA)
  if (text.includes("arch") || text.includes("habitat")) {
    return "KSoA";
  }

  // 3. Kalasalingam School of Law (KSoL)
  if (text.includes("law") || text.includes("ll.b") || text.includes("llb") || text.includes("legal")) {
    return "KSoL";
  }

  // 4. Kalasalingam School of Physiotherapy (KSP)
  if (text.includes("physio") || text.includes("bpt") || text.includes("mpt")) {
    return "KSP";
  }

  // 5. College of Nursing (CoN)
  if (text.includes("nurs")) {
    return "CoN";
  }

  // 6. Kalasalingam School of Allied and Health Sciences (KSAHS)
  if (
    text.includes("allied") ||
    text.includes("health") ||
    text.includes("cardiac") ||
    text.includes("radiology") ||
    text.includes("imaging") ||
    text.includes("anaesthesia") ||
    text.includes("dialysis") ||
    text.includes("medical lab")
  ) {
    return "KSAHS";
  }

  // 7. School of Catering and Hotel Management (SCHM)
  if (text.includes("catering") || text.includes("hotel") || text.includes("hospitality")) {
    return "SCHM";
  }

  // 8. School of Bio, Chemical and Processing Engineering (SBCE)
  if (
    text.includes("biotech") ||
    text.includes("chemical") ||
    text.includes("food tech") ||
    text.includes("processing")
  ) {
    return "SBCE";
  }

  // 9. School of Mechanical, Aero, Auto and Civil Engineering (SMACE)
  if (
    text.includes("mech") ||
    text.includes("aero") ||
    text.includes("auto") ||
    text.includes("civil") ||
    text.includes("safety") ||
    text.includes("structural") ||
    text.includes("manufacturing")
  ) {
    return "SMACE";
  }

  // 10. School of Electronics, Electrical and Biomedical Technology (SEET)
  if (
    text.includes("electronics") ||
    text.includes("electrical") ||
    text.includes("ece") ||
    text.includes("eee") ||
    text.includes("vlsi") ||
    text.includes("biomedical") ||
    text.includes("renewable energy")
  ) {
    return "SEET";
  }

  // 11. Kalasalingam Business School (KBS)
  if (
    text.includes("mba") ||
    text.includes("bba") ||
    text.includes("commerce") ||
    text.includes("b.com") ||
    text.includes("m.com") ||
    text.includes("management") ||
    text.includes("finance") ||
    text.includes("marketing") ||
    text.includes("social work") ||
    text.includes("msw")
  ) {
    return "KBS";
  }

  // 12. School of Advanced Sciences (SAS)
  if (
    text.includes("math") ||
    text.includes("physic") ||
    text.includes("chemist") ||
    text.includes("forensic")
  ) {
    return "SAS";
  }

  // 13. School of Liberal Arts and Special Education (SLASE)
  if (
    text.includes("english") ||
    text.includes("visual com") ||
    text.includes("viscom") ||
    text.includes("special education") ||
    text.includes("b.ed") ||
    text.includes("b.a.") ||
    text.includes("m.a.")
  ) {
    return "SLASE";
  }

  // 14. School of Computing (SoC)
  if (
    text.includes("mca") ||
    text.includes("bca") ||
    text.includes("computer") ||
    text.includes("cse") ||
    text.includes("it") ||
    text.includes("software") ||
    text.includes("artificial intelligence") ||
    text.includes("ai/ml") ||
    text.includes("data science") ||
    text.includes("cyber") ||
    text.includes("cloud") ||
    text.includes("blockchain")
  ) {
    return "SoC";
  }

  return "SoC";
}

// Backward-compatibility exports
export const DEGREE_CATEGORIES = STANDALONE_DEGREE_CATEGORIES;
export const DEPARTMENT_CATEGORIES = [
  {
    category: "Departments",
    options: DEPARTMENTS_BY_DEGREE["Other"],
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

  // Resolve initial course and detect custom course if legacy or other
  const initialCourseResolved = useMemo(() => {
    if (initialProfile?.course) {
      for (const cat of STANDALONE_DEGREE_CATEGORIES) {
        if (cat.options.includes(initialProfile.course)) {
          return { course: initialProfile.course, customCourse: "" };
        }
      }
      const upper = initialProfile.course.toUpperCase();
      if (upper.includes("MCA")) return { course: "MCA (Master of Computer Applications)", customCourse: "" };
      if (upper.includes("B.TECH") || upper.includes("BTECH")) return { course: "B.Tech (Bachelor of Technology)", customCourse: "" };
      if (upper.includes("M.TECH") || upper.includes("MTECH")) return { course: "M.Tech (Master of Technology)", customCourse: "" };
      if (upper.includes("BCA")) return { course: "BCA (Bachelor of Computer Applications)", customCourse: "" };
      if (upper.includes("MBA")) return { course: "MBA (Master of Business Administration)", customCourse: "" };
      if (upper.includes("B.SC") || upper.includes("BSC")) return { course: "B.Sc (Bachelor of Science)", customCourse: "" };
      return { course: "Other", customCourse: initialProfile.course };
    }

    const nameUpper = (user.fullName || "").toUpperCase();
    if (nameUpper.includes("MCA")) return { course: "MCA (Master of Computer Applications)", customCourse: "" };
    if (nameUpper.includes("B.TECH") || nameUpper.includes("BTECH")) return { course: "B.Tech (Bachelor of Technology)", customCourse: "" };
    if (nameUpper.includes("M.TECH") || nameUpper.includes("MTECH")) return { course: "M.Tech (Master of Technology)", customCourse: "" };
    if (nameUpper.includes("BCA")) return { course: "BCA (Bachelor of Computer Applications)", customCourse: "" };
    if (nameUpper.includes("MBA")) return { course: "MBA (Master of Business Administration)", customCourse: "" };
    if (nameUpper.includes("B.SC") || nameUpper.includes("BSC")) return { course: "B.Sc (Bachelor of Science)", customCourse: "" };
    return { course: "B.Tech (Bachelor of Technology)", customCourse: "" };
  }, [initialProfile?.course, user.fullName]);

  // Resolve initial department
  const initialDeptResolved = useMemo(() => {
    const activeCourse = initialCourseResolved.course;
    const availableDepts = getDepartmentsForDegree(activeCourse);
    if (initialProfile?.department) {
      if (availableDepts.includes(initialProfile.department)) {
        return { department: initialProfile.department, customDepartment: "" };
      }
      return { department: "Other", customDepartment: initialProfile.department };
    }
    return { department: availableDepts[0] || "Other", customDepartment: "" };
  }, [initialCourseResolved, initialProfile?.department]);

  // Common Profile State
  const [fullName, setFullName] = useState(user.fullName || initialProfile?.full_name || "");
  const [gender, setGender] = useState<string>(initialProfile?.gender || "male");
  const [mobileNumber, setMobileNumber] = useState(initialProfile?.mobile_number || "");

  // Internal KARE Student Fields
  const [registerNumber, setRegisterNumber] = useState(defaultRegisterNo);
  const [school, setSchool] = useState<string>(() => {
    const raw = initialProfile?.school;
    return raw
      ? normalizeSchoolId(raw)
      : suggestSchoolForDept(initialDeptResolved.department, initialCourseResolved.course);
  });

  // Active School Object resolved from 14 KARE Schools
  const currentSchoolObj = useMemo(() => {
    return (
      KARE_SCHOOLS.find(
        (s) => s.id === school || s.name === school || s.id === normalizeSchoolId(school)
      ) || KARE_SCHOOLS[0]
    );
  }, [school]);

  // Course & Year
  const [course, setCourse] = useState(initialCourseResolved.course);
  const [customCourse, setCustomCourse] = useState(initialCourseResolved.customCourse);
  const [yearOfStudy, setYearOfStudy] = useState<string>(() => {
    if (initialProfile?.year_of_study) return String(initialProfile.year_of_study);
    if (user.participantType === "internal" && defaultRegisterNo) {
      const inferred = inferYearFromRegisterNumber(defaultRegisterNo, initialCourseResolved.course);
      if (inferred) return inferred;
    }
    return "2";
  });

  // Year options dynamically computed based on selected degree
  const yearOptions = useMemo(() => {
    return getYearOptionsForDegree(course);
  }, [course]);

  // Department
  const [department, setDepartment] = useState(initialDeptResolved.department);
  const [customDepartment, setCustomDepartment] = useState(initialDeptResolved.customDepartment);

  // Available departments dynamically filtered by selected course
  const availableDepartments = useMemo(() => {
    return getDepartmentsForDegree(course);
  }, [course]);

  // Course change handler with auto-filter, auto-school, and auto-clamped year
  const handleCourseChange = (newCourse: string) => {
    setCourse(newCourse);
    if (newCourse !== "Other") {
      setCustomCourse("");
    }
    const newDepts = getDepartmentsForDegree(newCourse);
    if (department !== "Other" && !newDepts.includes(department)) {
      const defaultDept = newDepts[0] || "Other";
      setDepartment(defaultDept);
      if (user.participantType === "internal") {
        setSchool(suggestSchoolForDept(defaultDept, newCourse));
      }
    } else if (user.participantType === "internal") {
      setSchool(suggestSchoolForDept(department, newCourse));
    }

    // Auto-clamp yearOfStudy to valid range for the new degree
    const newYearOpts = getYearOptionsForDegree(newCourse);
    const maxYear = Number(newYearOpts[newYearOpts.length - 1].value);
    if (Number(yearOfStudy) > maxYear) {
      setYearOfStudy(String(maxYear));
    }
  };

  // Register number change handler with auto-year inference
  const handleRegisterNumberChange = (newVal: string) => {
    const upper = newVal.toUpperCase();
    setRegisterNumber(upper);
    const inferred = inferYearFromRegisterNumber(upper, course);
    if (inferred) {
      setYearOfStudy(inferred);
    }
  };

  // Department change handler with auto-sync for KARE School
  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    if (newDept !== "Other") {
      setCustomDepartment("");
      if (user.participantType === "internal") {
        setSchool(suggestSchoolForDept(newDept, course));
      }
    }
  };

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

    if (course === "Other" && !customCourse.trim()) {
      setErrorMessage("Please specify your Degree / Course name.");
      return;
    }
    if (department === "Other" && !customDepartment.trim()) {
      setErrorMessage("Please specify your Department / Branch name.");
      return;
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
        window.location.href = "/events";
        return;
      }

      // Fallback to API route
      const apiRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (apiRes.ok) {
        window.location.href = "/events";
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
      {/* Executive Single-Page Card with Glassmorphism & Shadow Depth */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xl shadow-slate-300/40 ring-1 ring-slate-900/5 transition-all">
        {/* Compact Header Bar */}
        <div className="rounded-t-2xl sm:rounded-t-3xl border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-indigo-50/20 to-purple-50/20 px-3.5 py-3 sm:px-7 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0">
              Complete Profile
            </h1>

            {/* Google Verified Identity Chip */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2 py-1 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-emerald-900 shadow-2xs min-w-0 shrink max-w-[58%] sm:max-w-none">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border border-emerald-300 shrink-0"
                />
              ) : (
                <div className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-800 text-[8px] sm:text-[9px]">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <span className="truncate">
                {user.email}
              </span>
              <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 shrink-0" />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-3.5 mt-3 sm:mx-7 sm:mt-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Form Body - 2 Column Grid on Desktop, Fluid Stack on Mobile */}
        <form
          action="/api/profile"
          method="POST"
          onSubmit={handleSubmit}
          className="p-3.5 sm:p-6 md:p-7 space-y-4 sm:space-y-5"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="userEmail" value={user.email} />
          <input type="hidden" name="participantType" value={user.participantType} />
          <input type="hidden" name="course" value={course === "Other" ? customCourse : course} />
          <input type="hidden" name="department" value={department === "Other" ? customDepartment : department} />
          <input type="hidden" name="school" value={school} />
          <input type="hidden" name="yearOfStudy" value={yearOfStudy} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
            {/* COLUMN 1: Personal & Contact Information */}
            <div className="space-y-3.5 sm:space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 shadow-xs" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    1. Personal Information
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Required</span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500 transition-colors group-focus-within:text-indigo-600" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Smith Livingston"
                    className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs transition-all ${
                      fullName.length > 0 && !isNameValid
                        ? "border-rose-300 ring-4 ring-rose-500/10 focus:border-rose-500"
                        : "border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none"
                    }`}
                  />
                </div>
              </div>

              {/* Gender & WhatsApp Side-by-Side */}
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
                {/* Gender Dropdown (2 cols) */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="gender"
                      value={gender}
                      required
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none appearance-none pr-7 shadow-2xs transition-all cursor-pointer"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Mobile Number (3 cols) */}
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    WhatsApp Number <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className={`flex rounded-xl border bg-white overflow-hidden shadow-2xs transition-all ${
                      mobileNumber.length > 0 && !isMobileValid
                        ? "border-rose-300 ring-4 ring-rose-500/10"
                        : mobileNumber.length === 10 && isMobileValid
                        ? "border-emerald-500 ring-4 ring-emerald-500/15"
                        : "border-slate-200 hover:border-slate-300 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/15"
                    }`}
                  >
                    <div className="flex items-center px-2.5 sm:px-3 bg-slate-100/90 border-r border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 select-none shrink-0">
                      +91
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
                      className="w-full bg-transparent px-2.5 sm:px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Internal Specific: Student Register Number */}
              {user.participantType === "internal" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Student Register / Roll Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="registerNumber"
                      required
                      value={registerNumber}
                      onChange={(e) => handleRegisterNumberChange(e.target.value)}
                      placeholder="9922004001"
                      className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 uppercase tracking-wide focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none shadow-2xs transition-all"
                    />
                  </div>
                </div>
              )}

              {/* External Specific: City & Postal Pincode (2 cols) */}
              {user.participantType === "external" && (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      City / Town <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-rose-500 transition-colors group-focus-within:text-rose-600" />
                      <input
                        type="text"
                        name="city"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Sivakasi"
                        className={`w-full rounded-xl border bg-white pl-9 pr-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs transition-all ${
                          city.length > 0 && !isCityValid
                            ? "border-rose-300 ring-4 ring-rose-500/10 focus:border-rose-500"
                            : "border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Postal Pincode <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <Map className="absolute left-3 top-3 h-4 w-4 text-purple-500 transition-colors group-focus-within:text-purple-600" />
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
                        className={`w-full rounded-xl border bg-white pl-9 pr-3 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs transition-all ${
                          pincode.length > 0 && !isPincodeValid
                            ? "border-rose-300 ring-4 ring-rose-500/10 focus:border-rose-500"
                            : pincode.length === 6 && isPincodeValid
                            ? "border-emerald-500 ring-4 ring-emerald-500/15 focus:border-emerald-600"
                            : "border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: Academic Record & Program */}
            <div className="space-y-3.5 sm:space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-600 shadow-xs" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    2. Academic Record
                  </h2>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider shadow-2xs ${
                    user.participantType === "internal"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-purple-50 text-purple-800 border-purple-200"
                  }`}
                >
                  {user.participantType === "internal" ? "KARE Student" : "External Delegate"}
                </span>
              </div>

              {/* INTERNAL KARE FLOW */}
              {user.participantType === "internal" ? (
                <>
                  {/* Organizing School (Full Width Searchable Combobox for 14 KARE Schools) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-800">
                        Organizing School <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        14 KARE Schools
                      </span>
                    </div>
                    <SearchableSelect
                      value={currentSchoolObj.name}
                      onChange={(selectedSchoolName) => {
                        const found = KARE_SCHOOLS.find(
                          (s) => s.name === selectedSchoolName || s.id === selectedSchoolName
                        );
                        setSchool(found ? found.id : selectedSchoolName);
                      }}
                      options={KARE_SCHOOL_OPTIONS}
                      placeholder="Search & select from 14 KARE schools..."
                      searchPlaceholder="Search school (e.g. Computing, SEET, Law, SMACE)..."
                      icon={<School className="h-4 w-4" />}
                    />
                  </div>

                  {/* Degree / Program (Full Width) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Degree / Program <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={course}
                      onChange={handleCourseChange}
                      options={STANDALONE_DEGREE_CATEGORIES}
                      placeholder="Search & select degree..."
                      searchPlaceholder="Search degree (e.g. B.Tech, MCA, B.Sc)..."
                      icon={<GraduationCap className="h-4 w-4" />}
                    />
                  </div>

                  {/* Custom Degree Input if Other */}
                  {course === "Other" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Specify Degree / Program <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative group">
                        <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-purple-500 transition-colors group-focus-within:text-purple-600" />
                        <input
                          type="text"
                          required
                          value={customCourse}
                          onChange={(e) => setCustomCourse(e.target.value)}
                          placeholder="e.g. Dual Degree BS-MS, etc."
                          className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Department / Discipline (Full Width) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Department / Discipline <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={department}
                      onChange={handleDepartmentChange}
                      options={availableDepartments}
                      placeholder="Search & select department..."
                      searchPlaceholder="Search department (e.g. CSE, AI/ML)..."
                      icon={<Building className="h-4 w-4" />}
                    />
                  </div>

                  {/* Custom Department Input if Other */}
                  {department === "Other" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Specify Department / Discipline <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative group">
                        <Building className="absolute left-3.5 top-3 h-4 w-4 text-sky-500 transition-colors group-focus-within:text-sky-600" />
                        <input
                          type="text"
                          required
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          placeholder="e.g. Cyber Physical Systems, Nanotechnology..."
                          className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Year of Study */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Year of Study <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="yearOfStudy"
                        value={yearOfStudy}
                        onChange={(e) => setYearOfStudy(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none appearance-none pr-8 shadow-2xs transition-all cursor-pointer"
                      >
                        {yearOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-indigo-500" />
                    </div>
                  </div>
                </>
              ) : (
                /* EXTERNAL PARTICIPANT FLOW */
                <>
                  {/* College / University Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      College / University Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <Building className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500 transition-colors group-focus-within:text-indigo-600" />
                      <input
                        type="text"
                        name="collegeName"
                        required
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g. Sri Kaliswari College"
                        className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs transition-all ${
                          collegeName.length > 0 && !isCollegeValid
                            ? "border-rose-300 ring-4 ring-rose-500/10 focus:border-rose-500"
                            : "border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Degree / Course (Full Width) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Degree / Course <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={course}
                      onChange={handleCourseChange}
                      options={STANDALONE_DEGREE_CATEGORIES}
                      placeholder="Search & select degree..."
                      searchPlaceholder="Search degree (e.g. B.Tech, MCA, B.Sc)..."
                      icon={<GraduationCap className="h-4 w-4" />}
                    />
                  </div>

                  {/* Custom Degree Input if Other */}
                  {course === "Other" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Specify Degree / Course <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative group">
                        <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-purple-500 transition-colors group-focus-within:text-purple-600" />
                        <input
                          type="text"
                          required
                          value={customCourse}
                          onChange={(e) => setCustomCourse(e.target.value)}
                          placeholder="e.g. Dual Degree BS-MS, etc."
                          className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Department / Branch (Full Width) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Department / Branch <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={department}
                      onChange={handleDepartmentChange}
                      options={availableDepartments}
                      placeholder="Search & select department..."
                      searchPlaceholder="Search department (e.g. CSE, AI/ML)..."
                      icon={<Building className="h-4 w-4" />}
                    />
                  </div>

                  {/* Custom Department Input if Other */}
                  {department === "Other" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Specify Department / Branch <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative group">
                        <Building className="absolute left-3.5 top-3 h-4 w-4 text-sky-500 transition-colors group-focus-within:text-sky-600" />
                        <input
                          type="text"
                          required
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          placeholder="e.g. Cyber Physical Systems, Nanotechnology..."
                          className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Year of Study */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Year of Study <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="yearOfStudy"
                        value={yearOfStudy}
                        onChange={(e) => setYearOfStudy(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none appearance-none pr-8 shadow-2xs transition-all cursor-pointer"
                      >
                        {yearOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-indigo-500" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-500 order-2 sm:order-1 text-center sm:text-left">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 shrink-0">
                <Lock className="h-3 w-3" />
              </div>
              <span className="font-medium">Official Academic Verification • KARE Euphoria 2026</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-7 py-3 text-xs sm:text-sm shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer min-h-[44px] order-1 sm:order-2 shrink-0"
            >
              {isLoading ? (
                <span>Verifying &amp; Saving Profile...</span>
              ) : (
                <>
                  <span>Save Profile &amp; Open Portal</span>
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
