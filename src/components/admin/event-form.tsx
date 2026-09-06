"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Trophy,
  ListChecks,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Star,
  FileText,
  Phone,
  Mail,
  ExternalLink,
  Link as LinkIcon,
  Check,
  Copy,
  Plus,
  Trash2,
  Eye,
  Building,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sliders,
  ChevronRight,
  Loader2,
  Info,
  HelpCircle,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { createEventAdmin, updateEventAdmin } from "@/actions/admin";

interface Category {
  id: string;
  name: string;
}

interface CoordinatorItem {
  id: string;
  name: string;
  mobile: string;
  email: string;
}

interface EventFormData {
  id?: string;
  slug?: string;
  categoryId: string;
  name: string;
  shortDescription: string;
  description: string;
  rules: string;
  schoolOrDept: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  registrationFee: number;
  participantLimit: number;
  minTeamSize: number;
  maxTeamSize: number;
  isProEvent?: boolean;
  status: string;
  brochureUrl?: string;
  registrationCount?: number;
}

// 7 Official Kalasalingam University (KARE) Schools
const KARE_SCHOOLS = [
  { code: "SEET", name: "School of Electronics, Electrical and Biomedical Technology (SEET)" },
  { code: "SCSE", name: "School of Computing (SCSE)" },
  { code: "SMCE", name: "School of Mechanical, Civil and Energy (SMCE)" },
  { code: "SBCT", name: "School of Bio and Chemical Technology (SBCT)" },
  { code: "SACS", name: "School of Agricultural and Commercial Sciences (SACS)" },
  { code: "SLSS", name: "School of Law and Social Sciences (SLSS)" },
  { code: "DPE", name: "Directorate of Physical Education" },
];

// Official Euphoria 2026 Competition Dates
const FESTIVAL_DATES = [
  { id: "day1", label: "Day 1 • 25 Sep 2026 (Friday)", date: "2026-09-25" },
  { id: "day2", label: "Day 2 • 26 Sep 2026 (Saturday)", date: "2026-09-26" },
];

// Common Campus Lab & Auditorium Venues
const VENUE_PRESETS = [
  "Main Auditorium",
  "Seminar Hall 1",
  "Seminar Hall 2",
  "DSPSD Lab, 3rd Block",
  "CSE Central Lab",
  "Mech Block Lab 3",
  "Civil Block CAD Lab",
  "Online / Virtual",
];

// Status metadata & styling configuration
const STATUS_CONFIGS: Record<
  string,
  { label: string; badgeBg: string; border: string; text: string; dot: string; desc: string }
> = {
  registration_open: {
    label: "Registration Open",
    badgeBg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    desc: "Active in public catalog & accepting participant registrations",
  },
  published: {
    label: "Published (Upcoming)",
    badgeBg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-800",
    dot: "bg-sky-500",
    desc: "Visible in catalog for browsing before registration opens",
  },
  registration_closed: {
    label: "Registration Closed",
    badgeBg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    dot: "bg-amber-500",
    desc: "Seat capacity reached or deadline passed",
  },
  ongoing: {
    label: "Ongoing (Live Today)",
    badgeBg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-800",
    dot: "bg-purple-500",
    desc: "Competition currently running during festival day",
  },
  completed: {
    label: "Completed",
    badgeBg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    dot: "bg-slate-500",
    desc: "Event concluded; scores and results archived",
  },
  draft: {
    label: "Draft (Hidden)",
    badgeBg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-800",
    dot: "bg-rose-500",
    desc: "Hidden from public participants; under configuration",
  },
};

function parseFormInitialMetadata(rawDesc?: string) {
  const desc = rawDesc || "";
  const whatsappMatch = desc.match(/\[WHATSAPP_LINK:\s*([^\]]+)\]/);
  const namesMatch = desc.match(/\[COORDINATOR_NAMES:\s*([^\]]+)\]/);
  const mobilesMatch = desc.match(/\[COORDINATOR_MOBILES:\s*([^\]]+)\]/);
  const emailsMatch = desc.match(/\[COORDINATOR_EMAILS:\s*([^\]]+)\]/);
  const brochureMatch = desc.match(/\[(BROCHURE_URL|BROCHURE_LINK):\s*([^\]]+)\]/);

  const cleanDescription = desc
    .replace(/\[[A-Z_]+:\s*[^\]]+\]/g, "")
    .trim();

  const namesList = namesMatch
    ? namesMatch[1].split(/,|&|\//).map((s) => s.trim()).filter(Boolean)
    : [];
  const mobilesList = mobilesMatch
    ? mobilesMatch[1].split(/,|&|\//).map((s) => s.trim()).filter(Boolean)
    : [];
  const emailsList = emailsMatch
    ? emailsMatch[1].split(/,|&|\//).map((s) => s.trim()).filter(Boolean)
    : [];

  const maxLen = Math.max(namesList.length, mobilesList.length, emailsList.length);
  const coordinators: CoordinatorItem[] = [];

  for (let i = 0; i < maxLen; i++) {
    coordinators.push({
      id: `coord_${i + 1}`,
      name: namesList[i] || "",
      mobile: mobilesList[i] || "",
      email: emailsList[i] || "",
    });
  }

  if (coordinators.length === 0) {
    coordinators.push({
      id: "coord_1",
      name: "",
      mobile: "",
      email: "",
    });
  }

  return {
    cleanDescription,
    whatsappLink: whatsappMatch ? whatsappMatch[1].trim() : "",
    brochureUrl: brochureMatch ? brochureMatch[2].trim() : "",
    coordinators,
  };
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "TBA";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDisplayTime(timeStr: string) {
  if (!timeStr) return "";
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function getCategoryThemeGradient(categoryName?: string, isPro?: boolean) {
  if (isPro) return "from-amber-400 via-amber-500 to-yellow-500";
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("comput") || cat.includes("scse") || cat.includes("ai") || cat.includes("code")) {
    return "from-cyan-500 via-blue-500 to-indigo-600";
  }
  if (cat.includes("electr") || cat.includes("seet") || cat.includes("circuit") || cat.includes("robot")) {
    return "from-emerald-500 via-teal-500 to-cyan-600";
  }
  if (cat.includes("mech") || cat.includes("civil") || cat.includes("smce")) {
    return "from-orange-500 via-amber-500 to-red-500";
  }
  if (cat.includes("bio") || cat.includes("chem") || cat.includes("sbct")) {
    return "from-lime-500 via-emerald-500 to-teal-600";
  }
  if (cat.includes("game") || cat.includes("esport")) {
    return "from-purple-500 via-violet-600 to-indigo-600";
  }
  return "from-indigo-500 via-purple-500 to-pink-500";
}

export function EventForm({
  categories,
  initialData,
  isEdit = false,
}: {
  categories: Category[];
  initialData?: Partial<EventFormData>;
  isEdit?: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Quick Section Navigation Tab
  const [activeTab, setActiveTab] = useState<"all" | "general" | "schedule" | "rules" | "staff">("all");

  const initialMeta = parseFormInitialMetadata(initialData?.description);

  // Form Fields
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || "");
  const [name, setName] = useState(initialData?.name || "");
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || "");
  const [description, setDescription] = useState(initialMeta.cleanDescription || initialData?.description || "");
  const [whatsappLink, setWhatsappLink] = useState(initialMeta.whatsappLink);
  const [brochureUrl, setBrochureUrl] = useState(initialData?.brochureUrl || initialMeta.brochureUrl);
  const [coordinators, setCoordinators] = useState<CoordinatorItem[]>(initialMeta.coordinators);

  const [rulesText, setRulesText] = useState(
    initialData?.rules ||
      "1. Valid physical College ID card is mandatory for campus entry and competition verification.\n2. Participants must report to the venue 15 minutes prior to the scheduled start time.\n3. Decisions rendered by the jury and evaluation committee are final and binding."
  );
  const [schoolOrDept, setSchoolOrDept] = useState(
    initialData?.schoolOrDept || "School of Electronics, Electrical and Biomedical Technology (SEET)"
  );
  const [venue, setVenue] = useState(initialData?.venue || "Main Auditorium");
  const [eventDate, setEventDate] = useState(initialData?.eventDate || "2026-09-25");
  const [startTime, setStartTime] = useState(initialData?.startTime || "09:30");
  const [endTime, setEndTime] = useState(initialData?.endTime || "11:00");
  const [registrationFee, setRegistrationFee] = useState<number>(initialData?.registrationFee ?? 0);
  const [participantLimit, setParticipantLimit] = useState<number>(initialData?.participantLimit ?? 100);
  const [minTeamSize, setMinTeamSize] = useState<number>(initialData?.minTeamSize ?? 1);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(initialData?.maxTeamSize ?? 1);
  const [isProEvent, setIsProEvent] = useState<boolean>(initialData?.isProEvent ?? false);
  const [status, setStatus] = useState(initialData?.status || "registration_open");

  // Selected Category Object
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || categories[0];
  }, [categories, categoryId]);

  // Keyboard shortcut support: Ctrl+S or Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const formEl = document.getElementById("admin-event-form") as HTMLFormElement;
        if (formEl) formEl.requestSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Coordinator Manager Helpers
  const handleAddCoordinator = () => {
    setCoordinators((prev) => [
      ...prev,
      { id: `coord_${Date.now()}`, name: "", mobile: "", email: "" },
    ]);
  };

  const handleRemoveCoordinator = (index: number) => {
    if (coordinators.length <= 1) {
      setCoordinators([{ id: "coord_1", name: "", mobile: "", email: "" }]);
      return;
    }
    setCoordinators((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCoordinator = (index: number, field: keyof CoordinatorItem, val: string) => {
    setCoordinators((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: val } : c))
    );
  };

  // Rule insertion helpers
  const handleInsertNextRuleNumber = () => {
    const lines = rulesText.split("\n").filter((l) => l.trim().length > 0);
    const nextNum = lines.length + 1;
    setRulesText((prev) => (prev.trim() ? `${prev.trim()}\n${nextNum}. ` : `${nextNum}. `));
  };

  const handleInsertStandardRules = () => {
    const standard = [
      "1. Valid physical College ID card is mandatory for campus entry and competition verification.",
      "2. Participants must report to the venue 15 minutes prior to the scheduled start time.",
      "3. All necessary development environments and workstations will be provided; participants may also bring their personal laptops.",
      "4. Decisions rendered by the jury and evaluation committee are final and binding.",
    ].join("\n");
    if (!rulesText.trim()) {
      setRulesText(standard);
    } else {
      setRulesText((prev) => `${prev.trim()}\n${standard}`);
    }
  };

  // Copy ID
  const handleCopyId = () => {
    if (initialData?.id) {
      navigator.clipboard.writeText(initialData.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessToast(null);

    const rulesArray = rulesText
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const names = coordinators.map((c) => c.name.trim()).filter(Boolean).join(", ");
    const mobiles = coordinators.map((c) => c.mobile.trim()).filter(Boolean).join(", ");
    const emails = coordinators.map((c) => c.email.trim()).filter(Boolean).join(", ");

    let finalDescription = description.trim();
    if (whatsappLink.trim()) {
      finalDescription += `\n[WHATSAPP_LINK: ${whatsappLink.trim()}]`;
    }
    if (names) {
      finalDescription += `\n[COORDINATOR_NAMES: ${names}]`;
    }
    if (mobiles) {
      finalDescription += `\n[COORDINATOR_MOBILES: ${mobiles}]`;
    }
    if (emails) {
      finalDescription += `\n[COORDINATOR_EMAILS: ${emails}]`;
    }
    if (brochureUrl.trim()) {
      finalDescription += `\n[BROCHURE_URL: ${brochureUrl.trim()}]`;
    }

    const payload = {
      categoryId,
      name,
      shortDescription,
      description: finalDescription,
      rules: rulesArray,
      schoolOrDept,
      venue,
      eventDate,
      startTime,
      endTime,
      registrationFee: Number(registrationFee),
      participantLimit: Number(participantLimit),
      minTeamSize: Number(minTeamSize),
      maxTeamSize: Number(maxTeamSize),
      isProEvent,
      status,
    };

    let res;
    if (isEdit && initialData?.id) {
      res = await updateEventAdmin(initialData.id, payload);
    } else {
      res = await createEventAdmin(payload);
    }

    if (!res.success) {
      setErrorMessage(res.error || "Failed to save event configuration.");
      setIsLoading(false);
    } else {
      setSuccessToast("Event configuration updated successfully!");
      setTimeout(() => {
        router.push("/admin/events");
        router.refresh();
      }, 700);
    }
  };

  const statusConfig = STATUS_CONFIGS[status] || STATUS_CONFIGS.registration_open;
  const gradientTheme = getCategoryThemeGradient(currentCategory?.name, isProEvent);
  const rulesCount = rulesText.split("\n").filter((l) => l.trim().length > 0).length;

  return (
    <form id="admin-event-form" onSubmit={handleSubmit} className="space-y-6 pb-20">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & STICKY ACTION BAR                                         */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {/* Breadcrumbs Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Events &amp; Competitions</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="font-semibold text-slate-800">
              {isEdit ? "Edit Event Configuration" : "New Competition"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Keyboard: <strong className="text-slate-700">Ctrl + S</strong> to save
            </span>
          </div>
        </div>

        {/* Title, Badges & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Track Badge */}
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                <Tag className="h-3 w-3" />
                <span>{currentCategory?.name}</span>
              </span>

              {/* Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-extrabold border ${statusConfig.badgeBg} ${statusConfig.border} ${statusConfig.text}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusConfig.dot} animate-pulse`} />
                <span>{statusConfig.label}</span>
              </span>

              {/* Flagship Star Badge */}
              {isProEvent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-xs font-black text-amber-900 shadow-2xs">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-600" />
                  <span>FLAGSHIP EVENT</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-display truncate">
              {name || <span className="text-slate-400 italic">Untitled Event</span>}
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl truncate">
              {schoolOrDept} • {venue}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto">
            {isEdit && (
              <a
                href={`/events?search=${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
                title="Open public festival card preview in new tab"
              >
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">View Public Card</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            )}

            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-primary px-5 py-2.5 text-xs font-black text-white shadow-md hover:shadow-primary/25 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Event...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>{isEdit ? "Update Event" : "Publish Event"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section Quick Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
          {[
            { id: "all", label: "All Sections", icon: Layers },
            { id: "general", label: "General & Dept", icon: Sliders },
            { id: "schedule", label: "Schedule & Venue", icon: Calendar },
            { id: "rules", label: "Rules & Overview", icon: ListChecks },
            { id: "staff", label: "Staff & Documents", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isCurrent
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error / Success Feedback Banners */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successToast && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DUAL-COLUMN PRO LAYOUT                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: EDITABLE CONFIGURATION FORM (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: GENERAL & BASIC INFORMATION */}
          {(activeTab === "all" || activeTab === "general") && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-primary border border-indigo-100">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      1. General &amp; Department Information
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Core event naming, category track, host department &amp; flagship status
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Name & Category Track */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Event Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chipcraft 3.0"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Category Track <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-primary focus:outline-none cursor-pointer transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Short Tagline / Teaser */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-800">
                    Short Tagline / Teaser <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {shortDescription.length} characters
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="e.g. High-speed VLSI architecture and digital system design showdown"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none transition-all"
                />
              </div>

              {/* Organizing School / Dept with Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Organizing School / Dept <span className="text-rose-500">*</span>
                </label>

                {/* Quick Preset Chips for 7 KARE Schools */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Quick Select:
                  </span>
                  {KARE_SCHOOLS.map((school) => {
                    const isSelected = schoolOrDept.includes(school.code);
                    return (
                      <button
                        key={school.code}
                        type="button"
                        onClick={() => setSchoolOrDept(school.name)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-2xs"
                            : "bg-slate-100/90 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                        title={school.name}
                      >
                        {school.code}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  required
                  value={schoolOrDept}
                  onChange={(e) => setSchoolOrDept(e.target.value)}
                  placeholder="e.g. School of Electronics, Electrical and Biomedical Technology (SEET)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none transition-all"
                />
              </div>

              {/* Lifecycle Status Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  Lifecycle Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIGS).map(([key, cfg]) => {
                    const isCurrent = status === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStatus(key)}
                        className={`rounded-2xl p-3 border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          isCurrent
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                            : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${cfg.dot}`} />
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {cfg.label}
                          </span>
                          <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">
                            {cfg.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Glowing Flagship Event Card */}
              <div
                className={`rounded-2xl border p-4 transition-all duration-300 ${
                  isProEvent
                    ? "border-amber-300 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-yellow-50/60 shadow-md shadow-amber-500/10"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                        isProEvent
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      <Star className={`h-5 w-5 ${isProEvent ? "fill-white" : ""}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          Mark as Flagship Competition
                        </h4>
                        {isProEvent && (
                          <span className="rounded-full bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
                            Active Flagship
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed max-w-lg mt-0.5">
                        Flagship Events are tier-1 headline competitions. Participants can select at most 1 Flagship Event per pass, and it MUST be selected as their 1st priority event choice.
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isProEvent}
                    onClick={() => setIsProEvent(!isProEvent)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isProEvent ? "bg-amber-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isProEvent ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SCHEDULE, VENUE & CAPACITY */}
          {(activeTab === "all" || activeTab === "schedule") && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      2. Schedule, Venue &amp; Fees
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Festival competition date, reporting time, lab location &amp; participant limits
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Date with Quick Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Event Date <span className="text-rose-500">*</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {FESTIVAL_DATES.map((fDate) => {
                    const isSelected = eventDate === fDate.date;
                    return (
                      <button
                        key={fDate.id}
                        type="button"
                        onClick={() => setEventDate(fDate.date)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{fDate.label}</span>
                      </button>
                    );
                  })}
                </div>

                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                />
              </div>

              {/* Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    End Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Campus Venue with Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Campus Venue / Lab Room <span className="text-rose-500">*</span>
                </label>

                {/* Venue Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Presets:
                  </span>
                  {VENUE_PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVenue(v)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border ${
                        venue === v
                          ? "bg-purple-100 text-purple-900 border-purple-300 font-bold"
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. DSPSD Lab, 3rd Block, KARE"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Registration Fee, Max Capacity, Team Size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Registration Fee (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      required
                      value={registrationFee}
                      onChange={(e) => setRegistrationFee(Number(e.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Enter 0 for pass-inclusive free entry</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Max Seat Capacity <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      required
                      value={participantLimit}
                      onChange={(e) => setParticipantLimit(Number(e.target.value))}
                      placeholder="100"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Total participants permitted</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Team Size (Min - Max)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={minTeamSize}
                      onChange={(e) => setMinTeamSize(Number(e.target.value))}
                      placeholder="1"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-mono font-bold text-slate-900 text-center focus:bg-white focus:border-primary focus:outline-none"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input
                      type="number"
                      min={minTeamSize}
                      value={maxTeamSize}
                      onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                      placeholder="1"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-mono font-bold text-slate-900 text-center focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">1 for individual participation</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: RULES & FULL DESCRIPTION */}
          {(activeTab === "all" || activeTab === "rules") && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <ListChecks className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      3. Description &amp; Competition Rules
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Detailed event problem statements, evaluation rubrics &amp; instructions
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Event Description &amp; Overview <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed breakdown of the technical competition rounds, evaluation parameters, and tools permitted..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none leading-relaxed transition-all"
                />
              </div>

              {/* Rules & Guidelines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800">
                      Rules &amp; Guidelines (One per line) <span className="text-rose-500">*</span>
                    </label>
                    <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold">
                      {rulesCount} Rules
                    </span>
                  </div>

                  {/* Rule Helpers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleInsertNextRuleNumber}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      + Add Rule #{rulesCount + 1}
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertStandardRules}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-indigo-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      Insert Standard Template
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  required
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder="1. Valid ID is mandatory.&#10;2. Bring your own laptops with required IDEs installed.&#10;3. Decisions of the jury are final."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none leading-relaxed transition-all"
                />
                <p className="text-[10px] text-slate-400">
                  Each line is automatically rendered as a distinct bullet point with verified checkmarks on the public student pass and website.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 4: STAFF COORDINATORS, WHATSAPP & BROCHURE */}
          {(activeTab === "all" || activeTab === "staff") && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      4. Staff Coordinators &amp; Official Documents
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Faculty coordinators, official WhatsApp delegate link &amp; event brochure PDF
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Community Link with Live Tester */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Official WhatsApp Group Join Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  {whatsappLink.trim() && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shrink-0 shadow-2xs"
                      title="Test WhatsApp Group Link"
                    >
                      <span>Test Group</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Displayed on confirmed delegate pass and participant dashboard for emergency announcements.
                </p>
              </div>

              {/* Event PDF Brochure Link with Live Tester */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Official Event Brochure PDF Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      value={brochureUrl}
                      onChange={(e) => setBrochureUrl(e.target.value)}
                      placeholder="https://domain.com/brochure.pdf or Google Drive link"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  {brochureUrl.trim() && (
                    <a
                      href={brochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors shrink-0 shadow-2xs"
                      title="Test Event Brochure PDF Link"
                    >
                      <FileText className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Test PDF</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Surfaced as the 1-click Brochure quick-view button on the public catalog and coordinator hub.
                </p>
              </div>

              {/* Structured Staff Coordinators Manager */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Assigned Faculty Staff Coordinators
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Enter staff members with their official KARE email IDs to grant event workspace login access.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCoordinator}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-primary text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Coordinator</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {coordinators.map((coord, idx) => (
                    <div
                      key={coord.id || idx}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-800">
                            {idx + 1}
                          </span>
                          <span>Faculty Coordinator #{idx + 1}</span>
                        </span>

                        {coordinators.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCoordinator(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove this coordinator"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={coord.name}
                            onChange={(e) => handleUpdateCoordinator(idx, "name", e.target.value)}
                            placeholder="e.g. Dr. K. Jeyaprakash"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Mobile Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="tel"
                              value={coord.mobile}
                              onChange={(e) => handleUpdateCoordinator(idx, "mobile", e.target.value)}
                              placeholder="e.g. 9788962100"
                              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Official Email ID
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="email"
                              value={coord.email}
                              onChange={(e) => handleUpdateCoordinator(idx, "email", e.target.value)}
                              placeholder="k.jeyaprakash@klu.ac.in"
                              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STICKY LIVE PREVIEW & CONTROLS (4 Cols) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
          {/* LIVE PARTICIPANT CARD PREVIEW WIDGET */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Live Public Preview
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                Real-Time
              </span>
            </div>

            {/* Replicated Public Event Card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col justify-between transition-all">
              {/* Top Accent Gradient Line */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${gradientTheme}`} />

              <div className="p-4 space-y-3">
                {/* Badges Row */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  {isProEvent ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                      <Star className="h-3 w-3 fill-current" />
                      <span>FLAGSHIP EVENT</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      <Zap className="h-3 w-3 text-indigo-500" />
                      <span>REGULAR EVENT</span>
                    </span>
                  )}

                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {eventDate === "2026-09-25" ? "Day 1" : eventDate === "2026-09-26" ? "Day 2" : "Special"}
                  </span>
                </div>

                {/* Title & Department */}
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {name || "Untitled Competition"}
                  </h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                    <Building className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{schoolOrDept}</span>
                  </p>
                </div>

                {/* Schedule & Venue Box */}
                <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-700 border border-slate-100">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {formatDisplayDate(eventDate)} • {formatDisplayTime(startTime)} - {formatDisplayTime(endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{venue}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Mockup */}
              <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 font-medium">
                  <strong className="text-slate-900 font-bold">
                    {initialData?.registrationCount || 0}
                  </strong>{" "}
                  / {participantLimit} Seats
                </div>

                <div className="flex items-center gap-1.5">
                  {brochureUrl ? (
                    <span
                      title="Quick View Official Brochure (PDF)"
                      className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/80 p-1.5 text-indigo-700 shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    </span>
                  ) : null}

                  <span className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 shadow-2xs">
                    Details
                  </span>

                  <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white shadow-2xs">
                    Select
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight text-center">
              Preview updates automatically as you modify titles, dates, limits, and venue fields.
            </p>
          </div>

          {/* QUICK CONTROLS & METADATA CARD */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Event Metadata &amp; ID
            </h3>

            {/* Event UUID Copy */}
            {initialData?.id && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Database Event ID
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <span className="truncate">{initialData.id}</span>
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                  )}
                </button>
              </div>
            )}

            {/* Quick Registration Stat */}
            {initialData?.registrationCount !== undefined && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-950">Active Registrations:</span>
                <span className="font-mono font-black text-primary text-sm">
                  {initialData.registrationCount} Delegates
                </span>
              </div>
            )}

            {/* Quick Save Card Button */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-primary py-3 px-4 text-xs font-black text-white shadow-md hover:shadow-primary/25 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Event...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>{isEdit ? "Save Configuration" : "Publish Event"}</span>
                  </>
                )}
              </button>

              <Link
                href="/admin/events"
                className="w-full inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Discard Changes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
