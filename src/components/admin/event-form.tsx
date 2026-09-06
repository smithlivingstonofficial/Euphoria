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
  ListChecks,
  ArrowLeft,
  Star,
  Sliders,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Building,
  Tag,
  ChevronDown,
  Activity,
  Type,
  User,
  Phone,
  Mail,
  HelpCircle,
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

const STATUS_OPTIONS = [
  {
    value: "registration_open",
    label: "Registration Open",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  {
    value: "published",
    label: "Published (Upcoming)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  {
    value: "registration_closed",
    label: "Registration Closed",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  {
    value: "ongoing",
    label: "Ongoing (Live)",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  {
    value: "completed",
    label: "Completed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-500",
  },
  {
    value: "draft",
    label: "Draft (Hidden)",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
];

function parseMetadataFromDescription(rawDesc?: string) {
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

  const initialMeta = parseMetadataFromDescription(initialData?.description);

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
      "1. Valid physical College ID card is mandatory for campus entry and verification.\n2. Participants must report to the venue 15 minutes prior to scheduled start.\n3. Decisions rendered by the evaluation committee are final."
  );
  const [schoolOrDept, setSchoolOrDept] = useState(
    initialData?.schoolOrDept || "School of Computing (SCSE)"
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

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
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

  // Coordinator Handlers
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

  // Submit Handler
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
      brochureUrl: brochureUrl.trim(),
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
      setSuccessToast("Event saved successfully!");
      setTimeout(() => {
        router.push("/admin/events");
        router.refresh();
      }, 600);
    }
  };

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || categories[0];
  }, [categories, categoryId]);

  const currentStatusConfig =
    STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="w-full space-y-2.5 pb-4">
      {/* ========================================================================= */}
      {/* 1. TOP COMPACT HEADER BAR                                                 */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
              title="Back to Events"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Events</span>
            </Link>

            <span className="h-4 w-px bg-slate-200" />

            <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[340px] md:max-w-md">
              {name.trim() ? name : isEdit ? "Edit Event" : "Create New Event"}
            </h1>

            <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
              <Tag className="h-2.5 w-2.5" />
              {currentCategory?.name || "Category"}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${currentStatusConfig.badgeClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentStatusConfig.dotClass}`} />
              <span>{currentStatusConfig.label}</span>
            </span>

            {isProEvent && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                Flagship
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden xl:inline text-[11px] font-mono text-slate-400 mr-1">
              Ctrl+S to save
            </span>

            <Link
              href="/admin/events"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => {
                const formEl = document.getElementById("admin-event-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isEdit ? "Update Event" : "Create Event"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-rose-800 flex items-center gap-2 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-semibold">Error:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successToast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-emerald-800 flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ATTRACTIVE, COMPACT 2-COLUMN BALANCED GRID                             */}
      {/* ========================================================================= */}
      <form id="admin-event-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* ===================================================================== */}
          {/* LEFT COLUMN: Basic Info + Schedule, Venue & Fees                      */}
          {/* ===================================================================== */}
          <div className="space-y-3">
            {/* CARD 1: Basic Information */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                    <Sliders className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Basic Information
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Step 1 of 4</span>
              </div>

              <div className="space-y-2">
                {/* Event Title */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Event Title <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Type className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Chipcraft 3.0"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                </div>

                {/* Category & Status (2 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Category Track <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Tag className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-7 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 h-3 w-3 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lifecycle Status <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Activity className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-7 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 h-3 w-3 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Organizing School or Dept */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Organizing School / Department <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Building className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={schoolOrDept}
                      onChange={(e) => setSchoolOrDept(e.target.value)}
                      placeholder="e.g. School of Electronics, Electrical and Biomedical Technology (SEET)"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                </div>

                {/* Short Tagline / Teaser */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Short Tagline / Teaser
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="e.g. Algorithmic VLSI & Circuit Design Challenge"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                </div>

                {/* Flagship Event Toggle (Proper Toggle Slide Switch) */}
                <div
                  onClick={() => setIsProEvent(!isProEvent)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer select-none ${
                    isProEvent
                      ? "border-amber-300/90 bg-amber-50/70 shadow-xs ring-1 ring-amber-400/20"
                      : "border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        isProEvent
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <Star className={`h-3.5 w-3.5 ${isProEvent ? "fill-white text-white" : "text-slate-500"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Flagship Competition</span>
                        {isProEvent && (
                          <span className="rounded bg-amber-200/80 border border-amber-300 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-900 tracking-wider">
                            FEATURED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        Showcase prominently on festival homepage hero banner
                      </p>
                    </div>
                  </div>

                  {/* Proper Toggle Slide Switch */}
                  <div
                    role="switch"
                    aria-checked={isProEvent}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                      isProEvent ? "bg-amber-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
                        isProEvent ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Schedule, Venue & Fees */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Schedule, Venue &amp; Fees
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Step 2 of 4</span>
              </div>

              <div className="space-y-2">
                {/* Date & Timings (3 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Event Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Calendar className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Start Time <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Clock className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      End Time <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Clock className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Venue & Capacity (3 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Campus Venue <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <MapPin className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="e.g. DSPSD Lab, 3rd Block"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Fee (₹)
                    </label>
                    <div className="relative flex items-center">
                      <span className="pointer-events-none absolute left-2.5 text-xs font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={registrationFee}
                        onChange={(e) => setRegistrationFee(Number(e.target.value))}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-6 pr-2 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Seats
                    </label>
                    <div className="relative flex items-center">
                      <Users className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        value={participantLimit}
                        onChange={(e) => setParticipantLimit(Number(e.target.value))}
                        placeholder="100"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-7 pr-2 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Team Sizes (2 Cols) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Min Team Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={minTeamSize}
                      onChange={(e) => setMinTeamSize(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Max Team Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={maxTeamSize}
                      onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT COLUMN: Description & Rules + Links & Coordinators               */}
          {/* ===================================================================== */}
          <div className="space-y-3">
            {/* CARD 3: Description & Rules */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <ListChecks className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Description &amp; Rules
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Step 3 of 4</span>
              </div>

              <div className="space-y-2">
                {/* Event Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Event Overview
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the competition objectives, round structure, and evaluation..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Rules Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Rules &amp; Guidelines
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">One rule per line</span>
                  </div>
                  <textarea
                    rows={4}
                    value={rulesText}
                    onChange={(e) => setRulesText(e.target.value)}
                    placeholder="1. Valid ID card is mandatory.&#10;2. Participants must report 15 mins early.&#10;3. Decisions of jury are final."
                    className="w-full font-mono text-[11px] rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* CARD 4: Links & Staff Coordinators */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Links &amp; Staff Coordinators
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Step 4 of 4</span>
              </div>

              <div className="space-y-2">
                {/* WhatsApp & Brochure Links (2 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      WhatsApp Group Link
                    </label>
                    <div className="relative flex items-center">
                      <MessageSquare className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-emerald-500" />
                      <input
                        type="url"
                        value={whatsappLink}
                        onChange={(e) => setWhatsappLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Brochure Link (PDF / Drive)
                    </label>
                    <div className="relative flex items-center">
                      <FileText className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-indigo-500" />
                      <input
                        type="url"
                        value={brochureUrl}
                        onChange={(e) => setBrochureUrl(e.target.value)}
                        placeholder="https://drive.google.com/... or PDF"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Staff Coordinators Section */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Faculty / Staff Coordinators
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCoordinator}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Coordinator</span>
                    </button>
                  </div>

                  <div className="max-h-[135px] overflow-y-auto space-y-1.5 pr-0.5">
                    {coordinators.map((coord, idx) => (
                      <div
                        key={coord.id}
                        className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center gap-1.5 hover:border-slate-300 transition-all"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 flex-1 min-w-0">
                          <div className="relative flex items-center">
                            <User className="pointer-events-none absolute left-2 h-3 w-3 text-slate-400" />
                            <input
                              type="text"
                              value={coord.name}
                              onChange={(e) => handleUpdateCoordinator(idx, "name", e.target.value)}
                              placeholder="Name"
                              className="w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="relative flex items-center">
                            <Phone className="pointer-events-none absolute left-2 h-3 w-3 text-slate-400" />
                            <input
                              type="tel"
                              value={coord.mobile}
                              onChange={(e) => handleUpdateCoordinator(idx, "mobile", e.target.value)}
                              placeholder="Mobile"
                              className="w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="relative flex items-center">
                            <Mail className="pointer-events-none absolute left-2 h-3 w-3 text-slate-400" />
                            <input
                              type="email"
                              value={coord.email}
                              onChange={(e) => handleUpdateCoordinator(idx, "email", e.target.value)}
                              placeholder="Email"
                              className="w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {coordinators.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCoordinator(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 shrink-0"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
