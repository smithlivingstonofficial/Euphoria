"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  QrCode,
  Layers,
  X,
  Building,
  ChevronDown,
  RefreshCw,
  ShoppingBag,
  Star,
  Lock,
  Zap,
  Info,
  Gift,
  GraduationCap,
  ArrowLeft,
  LayoutGrid,
  Phone,
  Mail,
  ExternalLink,
  FileText,
  MessageSquare,
  Banknote,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  Ticket,
} from "lucide-react";
import { formatCurrency, formatDate, formatTime, formatEventTimeRange } from "@/lib/utils";
import { getEventSchedule } from "@/lib/schedule";
import {
  CashRegistrationRequest,
  PublicEventForCash,
  submitCashRegistrationRequest,
  cancelCashRegistrationRequest,
} from "@/actions/cash-registration";

// Category visual styling helper (Exact match with EventCatalogExplorer)
function getCategoryTheme(catName?: string, isPro?: boolean) {
  if (isPro) {
    return {
      badge: "bg-amber-500/10 text-amber-800 border-amber-300 font-bold",
      accent: "from-amber-500 via-amber-400 to-yellow-500",
      cardBorder: "border-amber-300/80 hover:border-amber-400 hover:shadow-amber-500/15",
      headerBg: "bg-amber-50/40",
      icon: Star,
    };
  }

  return {
    badge: "bg-slate-100 text-slate-700 border-slate-200 font-semibold",
    accent: "from-indigo-600 via-sky-500 to-teal-400",
    cardBorder: "border-slate-200/90 hover:border-indigo-300 hover:shadow-indigo-500/10",
    headerBg: "bg-slate-50/50",
    icon: Sparkles,
  };
}

const EXACT_SCHOOL_COVERS: Record<string, string> = {
  "Kalasalingam School of Architecture (KSoA)":
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
  "Kalasalingam School of Law (KSoL)":
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
  "School of Bio, Chemical and Processing Engineering":
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80",
  "School of Mechanical, Aero, Auto and Civil Engineering":
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
  "School of Computing (SoC)":
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
  "School of Electronics, Electrical and Biomedical Technology (SEET)":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  "Kalasalingam Business School (KBS)":
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80",
  "School of Advanced Sciences (SAS)":
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  "School of Liberal Arts and Special Education (SLASE)":
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
  "Kalasalingam School of Allied And Health Sciences":
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
  "Kalasalingam School of Agriculture and Horticulture (KSAH)":
    "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80",
  "First Year Engineering & Foundation (FE)":
    "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80",
  "Research Programmes":
    "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80",
};

function getSchoolCoverImage(schoolName: string): string {
  if (!schoolName) {
    return "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80";
  }

  if (EXACT_SCHOOL_COVERS[schoolName]) {
    return EXACT_SCHOOL_COVERS[schoolName];
  }

  const upper = schoolName.toUpperCase();

  if (upper.includes("LAW") || upper.includes("KSOL") || upper.includes("KSL")) {
    return EXACT_SCHOOL_COVERS["Kalasalingam School of Law (KSoL)"];
  }
  if (upper.includes("ARCHITECT") || upper.includes("KSOA") || upper.includes("KSA")) {
    return EXACT_SCHOOL_COVERS["Kalasalingam School of Architecture (KSoA)"];
  }
  if (upper.includes("BIO") || upper.includes("CHEM") || upper.includes("PROCESS") || upper.includes("SBCE")) {
    return EXACT_SCHOOL_COVERS["School of Bio, Chemical and Processing Engineering"];
  }
  if (upper.includes("MECH") || upper.includes("AERO") || upper.includes("AUTO") || upper.includes("CIVIL") || upper.includes("SMACE")) {
    return EXACT_SCHOOL_COVERS["School of Mechanical, Aero, Auto and Civil Engineering"];
  }
  if (upper.includes("COMPUT") || upper.includes("SOC") || upper.includes("SCSE") || upper.includes("CODE")) {
    return EXACT_SCHOOL_COVERS["School of Computing (SoC)"];
  }
  if (upper.includes("ELECTR") || upper.includes("SEET") || upper.includes("BIOMED")) {
    return EXACT_SCHOOL_COVERS["School of Electronics, Electrical and Biomedical Technology (SEET)"];
  }
  if (upper.includes("BUSINESS") || upper.includes("KBS") || upper.includes("COMMERCE") || upper.includes("MANAGEMENT")) {
    return EXACT_SCHOOL_COVERS["Kalasalingam Business School (KBS)"];
  }
  if (upper.includes("ADVANCED") || upper.includes("SCIENCE") || upper.includes("SAS") || upper.includes("MATH")) {
    return EXACT_SCHOOL_COVERS["School of Advanced Sciences (SAS)"];
  }
  if (upper.includes("LIBERAL") || upper.includes("ARTS") || upper.includes("SLASE") || upper.includes("SPECIAL")) {
    return EXACT_SCHOOL_COVERS["School of Liberal Arts and Special Education (SLASE)"];
  }
  if (upper.includes("AGRICULT") || upper.includes("HORTICULT") || upper.includes("KSAH")) {
    return EXACT_SCHOOL_COVERS["Kalasalingam School of Agriculture and Horticulture (KSAH)"];
  }
  if (upper.includes("ALLIED") || upper.includes("HEALTH") || upper.includes("AHS") || upper.includes("NURS") || upper.includes("PHYSIO")) {
    return EXACT_SCHOOL_COVERS["Kalasalingam School of Allied And Health Sciences"];
  }
  if (upper.includes("FIRST YEAR") || upper.includes("FOUNDATION") || upper.includes("FE")) {
    return EXACT_SCHOOL_COVERS["First Year Engineering & Foundation (FE)"];
  }
  if (upper.includes("RESEARCH")) {
    return EXACT_SCHOOL_COVERS["Research Programmes"];
  }

  return "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80";
}

function parseEventMetadata(event: PublicEventForCash) {
  const description = event?.description || "";

  const whatsappMatch = description.match(/\[WHATSAPP_LINK:\s*([^\]]+)\]/);
  const namesMatch = description.match(/\[COORDINATOR_NAMES:\s*([^\]]+)\]/);
  const mobilesMatch = description.match(/\[COORDINATOR_MOBILES:\s*([^\]]+)\]/);
  const emailsMatch = description.match(/\[COORDINATOR_EMAILS:\s*([^\]]+)\]/);
  const brochureMatch = description.match(/\[(BROCHURE_URL|BROCHURE_LINK):\s*([^\]]+)\]/);

  let cleanDescription = description.replace(/\[[A-Z_]+:\s*[^\]]+\]/g, "").trim();

  if (!cleanDescription || cleanDescription.length < 15) {
    cleanDescription = `${event.name} is an official technical competition organized by ${event.school_or_dept} during Euphoria 2026 at Kalasalingam Academy of Research and Education. Registered participants will compete for cash prizes, institutional awards, and verified national digital credentials.`;
  }

  const namesList = namesMatch
    ? namesMatch[1]
        .split(/,|&|\//)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const mobilesList = mobilesMatch
    ? mobilesMatch[1]
        .split(/,|&|\//)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const emailsList = emailsMatch
    ? emailsMatch[1]
        .split(/,|&|\//)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const coordinators: Array<{ name: string; mobile?: string; email?: string }> = [];
  const maxLen = Math.max(namesList.length, mobilesList.length, emailsList.length);
  for (let i = 0; i < maxLen; i++) {
    if (namesList[i] || mobilesList[i] || emailsList[i]) {
      coordinators.push({
        name: namesList[i] || `Staff Coordinator ${i + 1}`,
        mobile: mobilesList[i] || undefined,
        email: emailsList[i] || undefined,
      });
    }
  }

  return {
    whatsappLink: whatsappMatch ? whatsappMatch[1].trim() : null,
    names: namesMatch ? namesMatch[1].trim() : null,
    mobiles: mobilesMatch ? mobilesMatch[1].trim() : null,
    emails: emailsMatch ? emailsMatch[1].trim() : null,
    brochureUrl: (brochureMatch ? brochureMatch[2].trim() : null) || null,
    cleanDescription,
    coordinators,
  };
}

function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface CashRegistrationClientProps {
  profile: any;
  hasActivePass: boolean;
  activePass: {
    id: string;
    passCode: string;
    passTier: string;
    slotsUsed: number;
    totalSlots: number;
  } | null;
  initialExistingRequest: CashRegistrationRequest | null;
  initialEvents: PublicEventForCash[];
  categories: Array<{ id: string; name: string; slug: string }>;
}

export function CashRegistrationClient({
  profile,
  hasActivePass,
  activePass,
  initialExistingRequest,
  initialEvents = [],
  categories = [],
}: CashRegistrationClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Existing request state
  const [existingRequest, setExistingRequest] = useState<CashRegistrationRequest | null>(
    initialExistingRequest
  );
  const [copiedCode, setCopiedCode] = useState(false);

  // Slot 1 & Slot 2 selection state
  const [slot1Event, setSlot1Event] = useState<PublicEventForCash | null>(null);
  const [slot2Event, setSlot2Event] = useState<PublicEventForCash | null>(null);
  const [needsAccommodation, setNeedsAccommodation] = useState(false);

  // Filter state (Identical to EventCatalogExplorer)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "pro" | "normal">("all");
  const [showSchoolCards, setShowSchoolCards] = useState<boolean>(true);

  // Event Details Modal State
  const [activeModalEvent, setActiveModalEvent] = useState<PublicEventForCash | null>(null);

  // Submission & Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isInternal = Boolean(
    profile?.participant_type === "internal" ||
    profile?.email?.toLowerCase()?.endsWith("@klu.ac.in")
  );

  // Pricing calculations
  const hasPro = Boolean(slot1Event?.is_pro_event || slot2Event?.is_pro_event);
  const calculatedTier: "standard_pass" | "pro_pass" = hasPro ? "pro_pass" : "standard_pass";
  const calculatedFee = hasPro ? 300 : 200;
  const selectedCount = (slot1Event ? 1 : 0) + (slot2Event ? 1 : 0);

  // Copy helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Unique list of schools with event counts
  const schoolsData = useMemo(() => {
    const countsMap: Record<string, number> = {};
    initialEvents.forEach((e) => {
      if (e.school_or_dept) {
        countsMap[e.school_or_dept] = (countsMap[e.school_or_dept] || 0) + 1;
      }
    });

    return Object.entries(countsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [initialEvents]);

  // Counts for filter dropdowns
  const proCount = useMemo(
    () => initialEvents.filter((e) => Boolean(e.is_pro_event)).length,
    [initialEvents]
  );
  const normalCount = useMemo(
    () => initialEvents.filter((e) => !e.is_pro_event).length,
    [initialEvents]
  );
  const day1Count = useMemo(
    () =>
      initialEvents.filter((e) => {
        const sched = getEventSchedule(e);
        return sched.isTwoDay || sched.startDate === "2026-09-25";
      }).length,
    [initialEvents]
  );
  const day2Count = useMemo(
    () =>
      initialEvents.filter((e) => {
        const sched = getEventSchedule(e);
        return sched.isTwoDay || sched.endDate === "2026-09-26";
      }).length,
    [initialEvents]
  );
  const bothDaysCount = useMemo(
    () => initialEvents.filter((e) => getEventSchedule(e).isTwoDay).length,
    [initialEvents]
  );

  // =========================================================================
  // SELECTION VALIDATION ENGINE (Exact match with /events canSelectEvent)
  // =========================================================================
  const canSelectEvent = (event: PublicEventForCash): { allowed: boolean; reason?: string } => {
    // 0. Check event participant limit capacity (lock if full)
    const regCount = Number(event.total_registered ?? 0);
    const limit = Number(event.participant_limit || 100);
    if (regCount >= limit || event.is_total_full) {
      return {
        allowed: false,
        reason: `Slot limit full (${regCount}/${limit} seats filled)`,
      };
    }

    // 0b. Check Kalasalingam University (@klu.ac.in) vs External Quotas
    const isEventKluBlocked = Boolean(
      event.is_klu_blocked ||
      event.allow_internal === false ||
      (isInternal && event.is_internal_full)
    );
    if (isEventKluBlocked) {
      if (!profile) {
        return {
          allowed: false,
          reason: "External Delegates Only (Sign in with external email to unlock)",
        };
      }
      if (isInternal) {
        return {
          allowed: false,
          reason: "KLU student quota full. Remaining seats reserved exclusively for external delegates.",
        };
      }
    }

    if (event.allow_external === false && !isInternal) {
      return {
        allowed: false,
        reason: "Reserved exclusively for Kalasalingam University students.",
      };
    }

    // 1. Check if already selected (clicking allowed to unselect)
    if (slot1Event?.id === event.id || slot2Event?.id === event.id) {
      return { allowed: true };
    }

    // 2. Both slots full
    if (slot1Event && slot2Event) {
      return {
        allowed: false,
        reason: "Pass full (Max 2 events: 2 selected. Deselect one to choose another)",
      };
    }

    const isCandidatePro = Boolean(event.is_pro_event);
    const isCandidateFirstPrefOnly = Boolean(event.first_preference_only);

    // If Slot 1 is empty (0 events selected) -> Candidate allowed even if first_preference_only
    if (!slot1Event) {
      return { allowed: true };
    }

    // If Slot 1 is filled and Slot 2 is empty:
    if (slot1Event && !slot2Event) {
      // Rule: Candidate cannot be first_preference_only for 2nd slot
      if (isCandidateFirstPrefOnly) {
        return {
          allowed: false,
          reason: "1st preference only (Cannot be selected as 2nd slot)",
        };
      }

      // Rule: If Slot 1 is PRO -> Slot 2 MUST be NORMAL
      if (slot1Event.is_pro_event && isCandidatePro) {
        return {
          allowed: false,
          reason: "Only 1 Flagship event allowed per Pass (choose a regular event for slot 2)",
        };
      }

      // Rule: If Slot 1 is NORMAL -> Slot 2 CANNOT be PRO
      if (!slot1Event.is_pro_event && isCandidatePro) {
        return {
          allowed: false,
          reason: "Flagship events must be selected as your 1st choice",
        };
      }
    }

    return { allowed: true };
  };

  // Filter events with real-time multi-token search
  const filteredEvents = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const queryTokens = normalizeText(rawQuery).split(" ").filter((t) => t.length > 0);

    return initialEvents.filter((evt) => {
      // 1. Text Search matching across all tokens
      if (queryTokens.length > 0) {
        const eventSearchTarget = normalizeText(
          `${evt.name || ""} ${evt.school_or_dept || ""} ${evt.venue || ""} ${
            evt.category?.name || ""
          } ${evt.short_description || ""} ${evt.description || ""}`
        );

        const allTokensMatch = queryTokens.every((token) =>
          eventSearchTarget.includes(token)
        );

        if (!allTokensMatch) return false;
      }

      // 2. Date Filter
      if (selectedDate !== "all") {
        const sched = getEventSchedule(evt);
        if (selectedDate === "2026-09-25") {
          if (!sched.isTwoDay && sched.startDate !== "2026-09-25") return false;
        } else if (selectedDate === "2026-09-26") {
          if (!sched.isTwoDay && sched.endDate !== "2026-09-26") return false;
        } else if (selectedDate === "both") {
          if (!sched.isTwoDay) return false;
        }
      }

      // 3. School Filter
      if (selectedSchool !== "all") {
        if (evt.school_or_dept !== selectedSchool) return false;
      }

      // 4. Tier Filter
      if (selectedTier === "pro" && !evt.is_pro_event) return false;
      if (selectedTier === "normal" && evt.is_pro_event) return false;

      return true;
    });
  }, [initialEvents, searchQuery, selectedDate, selectedSchool, selectedTier]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedDate !== "all" ||
    selectedSchool !== "all" ||
    selectedTier !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedDate("all");
    setSelectedSchool("all");
    setSelectedTier("all");
  };

  const isSchoolDirectoryLevel =
    showSchoolCards &&
    selectedSchool === "all" &&
    searchQuery.trim() === "" &&
    selectedTier === "all" &&
    selectedDate === "all";

  // Event Selection Toggle Handler (Respects Validation Rules)
  const handleToggleEvent = (event: PublicEventForCash) => {
    setErrorMessage(null);

    // If already in Slot 1 -> remove (and shift Slot 2 into Slot 1 if present)
    if (slot1Event?.id === event.id) {
      if (slot2Event) {
        setSlot1Event(slot2Event);
        setSlot2Event(null);
      } else {
        setSlot1Event(null);
      }
      return;
    }

    // If already in Slot 2 -> remove
    if (slot2Event?.id === event.id) {
      setSlot2Event(null);
      return;
    }

    // Validate if allowed
    const validation = canSelectEvent(event);
    if (!validation.allowed) {
      setErrorMessage(validation.reason || "This competition cannot be selected.");
      return;
    }

    // Candidate is valid for selection:
    if (!slot1Event) {
      setSlot1Event(event);
    } else if (!slot2Event) {
      setSlot2Event(event);
    }
  };

  // Submit cash request
  const handleSubmitRequest = async () => {
    if (!slot1Event && !slot2Event) {
      setErrorMessage("Please select at least 1 competition to register.");
      return;
    }

    const eventIds = [slot1Event?.id, slot2Event?.id].filter(Boolean) as string[];

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitCashRegistrationRequest({
        selectedEventIds: eventIds,
        needsAccommodation,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to submit cash registration request.");
        setIsSubmitting(false);
        return;
      }

      setShowConfirmModal(false);

      startTransition(() => {
        router.refresh();
      });

      setExistingRequest({
        id: res.requestId || crypto.randomUUID(),
        requestCode: res.requestCode || "CASH-26-PENDING",
        userId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.mobile_number || "N/A",
        collegeName: profile.college_name,
        registerNumber: profile.register_number,
        department: profile.department,
        participantType: isInternal ? "internal" : "external",
        selectedEventIds: eventIds,
        selectedEvents: [slot1Event, slot2Event].filter(Boolean).map((e) => ({
          id: e!.id,
          name: e!.name,
          isProEvent: e!.is_pro_event,
          schoolOrDept: e!.school_or_dept,
          eventDate: e!.event_date,
          startTime: e!.start_time,
          endTime: e!.end_time,
          venue: e!.venue,
          firstPreferenceOnly: e!.first_preference_only,
        })),
        passTier: calculatedTier,
        totalAmount: calculatedFee,
        needsAccommodation,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting request";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel existing pending request
  const handleCancelRequest = async () => {
    if (!existingRequest) return;
    if (
      !confirm(
        "Are you sure you want to cancel this cash registration request? You can select different events after cancelling."
      )
    ) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage(null);

    try {
      const res = await cancelCashRegistrationRequest(existingRequest.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to cancel request.");
        setIsCancelling(false);
        return;
      }

      setExistingRequest(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      setErrorMessage(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PASS STATUS ALERT BANNERS (Case A: Active Pass) */}
      {hasActivePass && activePass && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-emerald-950 font-display">
                Festival Pass Fully Active • {activePass.slotsUsed} of {activePass.totalSlots} Slots Confirmed
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                Your pass code is <strong className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">{activePass.passCode}</strong>. You do not need to register via cash. Access your pass details, schedules, and entry QR code anytime in your dashboard.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/passes"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-800 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <QrCode className="h-4 w-4" />
            <span>View Digital Pass</span>
          </Link>
        </div>
      )}

      {/* 2. CASE B: PENDING CASH REQUEST BANNER */}
      {!hasActivePass && existingRequest && existingRequest.status === "pending" && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                  Cash Verification Pending
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Reference: <strong className="font-mono text-slate-900">{existingRequest.requestCode}</strong>
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-display mt-0.5">
                Cash Registration Request Queued (₹{existingRequest.totalAmount})
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                Visit the <strong>Euphoria Registration Desk / Help Counter on campus</strong> with cash ₹{existingRequest.totalAmount} and quote reference <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-200">{existingRequest.requestCode}</code> to activate your pass!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleCopyCode(existingRequest.requestCode)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-amber-50 transition-all shadow-2xs cursor-pointer"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={isCancelling}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-all shadow-2xs cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isCancelling ? "Cancelling..." : "Cancel Request"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CASE C: ACTIVE PASS SELECTION ALERT BANNER (When selecting events for cash registration) */}
      {!hasActivePass && (!existingRequest || existingRequest.status !== "pending") && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/50 to-indigo-50/90 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 bg-indigo-200/80 px-2 py-0.5 rounded-full border border-indigo-300">
                  Cash on Hand Portal
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {isInternal ? "KARE Student" : profile?.college_name || "External Delegate"}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-display mt-0.5">
                Cash Registration Pass Selection ({selectedCount}/2 Slots Filled)
              </h3>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                {slot1Event ? (
                  <span className="inline-flex items-center gap-1 bg-indigo-100/80 text-indigo-950 font-bold px-2.5 py-0.5 rounded-md border border-indigo-200">
                    <span>Slot 1: {slot1Event.name}</span>
                    <button
                      type="button"
                      onClick={() => setSlot1Event(null)}
                      className="hover:text-rose-600 ml-1 cursor-pointer"
                      title="Remove Slot 1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Slot 1: Empty</span>
                )}

                {slot2Event ? (
                  <span className="inline-flex items-center gap-1 bg-teal-100/80 text-teal-950 font-bold px-2.5 py-0.5 rounded-md border border-teal-200">
                    <span>Slot 2: {slot2Event.name}</span>
                    <button
                      type="button"
                      onClick={() => setSlot2Event(null)}
                      className="hover:text-rose-600 ml-1 cursor-pointer"
                      title="Remove Slot 2"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Slot 2: Empty</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
            <div className="text-right mr-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {calculatedTier === "pro_pass" ? "Flagship Pass" : "Standard Pass"}
              </div>
              <div className="text-base font-black text-slate-900">
                ₹{calculatedFee} <span className="text-[11px] font-bold text-emerald-700">(Cash)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={selectedCount === 0 || isSubmitting}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                selectedCount === 0
                  ? "bg-slate-300 cursor-not-allowed text-slate-500 shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              }`}
            >
              <Banknote className="h-4 w-4" />
              <span>Submit Cash Request</span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* ERROR ALERT */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4. SEARCH & FILTER CONTROLS BAR (Identical to EventCatalogExplorer) */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-2.5">
          {/* 1. Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competitions by title, department, venue..."
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Controls Group */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* 2. Tier Dropdown */}
            <div className="relative w-full sm:w-[155px] shrink-0">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as "all" | "pro" | "normal")}
                className={`w-full h-10 appearance-none rounded-xl border pl-8 pr-7 text-xs font-bold transition-all cursor-pointer truncate ${
                  selectedTier !== "all"
                    ? selectedTier === "pro"
                      ? "border-amber-400 bg-amber-50/90 text-amber-950 ring-1 ring-amber-300"
                      : "border-indigo-400 bg-indigo-50/90 text-indigo-950 ring-1 ring-indigo-300"
                    : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                } focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20`}
              >
                <option value="all">All Tiers ({initialEvents.length})</option>
                <option value="pro">Flagship ({proCount})</option>
                <option value="normal">Regular ({normalCount})</option>
              </select>
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                {selectedTier === "pro" ? (
                  <Star className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                ) : selectedTier === "normal" ? (
                  <Zap className="h-3.5 w-3.5 text-indigo-600" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                )}
              </span>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* 3. Schedule / Days Dropdown */}
            <div className="relative w-full sm:w-[155px] shrink-0">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`w-full h-10 appearance-none rounded-xl border pl-8 pr-7 text-xs font-bold transition-all cursor-pointer truncate ${
                  selectedDate !== "all"
                    ? selectedDate === "both"
                      ? "border-purple-400 bg-purple-50/90 text-purple-950 ring-1 ring-purple-300"
                      : "border-indigo-400 bg-indigo-50/90 text-indigo-950 ring-1 ring-indigo-300"
                    : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                } focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20`}
              >
                <option value="all">All Dates ({initialEvents.length})</option>
                <option value="2026-09-25">Day 1 • Sep 25 ({day1Count})</option>
                <option value="2026-09-26">Day 2 • Sep 26 ({day2Count})</option>
                <option value="both">Both Days ({bothDaysCount})</option>
              </select>
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* 4. School / Department Dropdown */}
            <div className="relative w-full sm:w-[190px] shrink-0">
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                title={selectedSchool !== "all" ? selectedSchool : "All 14 Departments"}
                className={`w-full h-10 appearance-none rounded-xl border pl-8 pr-7 text-xs font-bold transition-all cursor-pointer truncate ${
                  selectedSchool !== "all"
                    ? "border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/20"
                    : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                } focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20`}
              >
                <option value="all">All 14 Departments</option>
                {schoolsData.map((sch) => (
                  <option key={sch.name} value={sch.name}>
                    {sch.name} ({sch.count})
                  </option>
                ))}
              </select>
              <GraduationCap className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* 5. View Mode Switcher: By School vs All Events */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 h-10 items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowSchoolCards(true);
                  setSelectedSchool("all");
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  showSchoolCards
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Browse by School directory"
              >
                <Building className="h-3.5 w-3.5" />
                <span>By School</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSchoolCards(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !showSchoolCards
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="View all events list"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>All Events</span>
              </button>
            </div>

            {/* 6. Quick Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="h-10 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/90 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
                title="Reset all filters"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filters & Counter Sub-bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Showing <strong className="text-slate-900 font-bold">{filteredEvents.length}</strong> of{" "}
              {initialEvents.length} competitions
            </span>

            {selectedTier !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                <span>{selectedTier === "pro" ? "⭐ Flagship" : "⚡ Regular"}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTier("all")}
                  className="hover:text-amber-700 ml-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedDate !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-900">
                <span>
                  {selectedDate === "2026-09-25"
                    ? "Day 1 (Sep 25)"
                    : selectedDate === "2026-09-26"
                    ? "Day 2 (Sep 26)"
                    : "Both Days"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate("all")}
                  className="hover:text-indigo-700 ml-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedSchool !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary max-w-[220px] truncate">
                <span className="truncate">{selectedSchool}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSchool("all")}
                  className="hover:text-primary-hover ml-0.5 cursor-pointer shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() !== "" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                <span>&ldquo;{searchQuery.trim()}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-slate-900 ml-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer text-xs"
            >
              Clear all filters ({filteredEvents.length} results)
            </button>
          )}
        </div>
      </div>

      {/* 5. LEVEL 1: SCHOOL DIRECTORY CARDS VIEW (Exact Match with EventCatalogExplorer) */}
      {isSchoolDirectoryLevel && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-display leading-tight">
                  Schools &amp; Academic Departments Directory
                </h3>
                <p className="text-xs text-slate-500">
                  Select a school below to navigate into its competition events list
                </p>
              </div>
            </div>

            <span className="rounded-full bg-indigo-50 text-primary border border-indigo-200 px-3 py-1 text-xs font-bold font-mono">
              {schoolsData.length} Schools &amp; Departments
            </span>
          </div>

          {/* School Directory Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {schoolsData.map((school) => {
              const coverImg = getSchoolCoverImage(school.name);
              return (
                <button
                  key={school.name}
                  type="button"
                  onClick={() => setSelectedSchool(school.name)}
                  className="group rounded-3xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xl transition-all duration-300 text-left flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  {/* Cover Image Banner */}
                  <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImg}
                      alt={school.name}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Event Count Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 border border-white/40 text-xs font-black shadow-md font-mono">
                        <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400" />
                        <span>{school.count} {school.count === 1 ? "Event" : "Events"}</span>
                      </span>
                    </div>

                    {/* School Title Overlay */}
                    <div className="absolute bottom-3 inset-x-3.5 z-10">
                      <h4 className="text-sm sm:text-base font-extrabold text-white font-display leading-tight group-hover:text-cyan-200 transition-colors line-clamp-2 drop-shadow-sm">
                        {school.name}
                      </h4>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:bg-indigo-50/50 group-hover:text-primary transition-colors">
                    <span className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 group-hover:text-indigo-700">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>Browse competitions</span>
                    </span>
                    <div className="flex items-center gap-1 text-primary">
                      <span>Explore</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 2: ACTIVE SCHOOL BREADCRUMB HEADER */}
      {showSchoolCards && selectedSchool !== "all" && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSchool("all")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-extrabold text-primary shadow-2xs hover:bg-primary hover:text-white transition-all cursor-pointer shrink-0"
              title="Return to School Directory Cards"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to All Schools</span>
            </button>

            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Selected Department
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-display truncate leading-tight">
                {selectedSchool}
              </h3>
            </div>
          </div>

          <span className="rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 px-3 py-1 text-xs font-extrabold font-mono shrink-0 self-start sm:self-auto">
            {filteredEvents.length} Competitions
          </span>
        </div>
      )}

      {/* FILTER/SEARCH MATCHES BREADCRUMB */}
      {showSchoolCards && selectedSchool === "all" && hasActiveFilters && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-extrabold text-primary shadow-2xs hover:bg-primary hover:text-white transition-all cursor-pointer shrink-0"
              title="Return to School Directory Cards"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Schools Directory</span>
            </button>

            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Search &amp; Filter Results
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-display truncate leading-tight">
                Matching Competitions across All Departments
              </h3>
            </div>
          </div>

          <span className="rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 px-3 py-1 text-xs font-extrabold font-mono shrink-0 self-start sm:self-auto">
            {filteredEvents.length} Matches Found
          </span>
        </div>
      )}

      {/* 6. EVENTS GRID (Identical to EventCatalogExplorer with Lock States & Reasons) */}
      {!isSchoolDirectoryLevel && (
        filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 animate-in fade-in duration-300">
            {filteredEvents.map((evt) => {
              const isPro = Boolean(evt.is_pro_event);
              const theme = getCategoryTheme(evt.category?.name, isPro);
              const regCount = evt.total_registered ?? 0;
              const limit = evt.participant_limit || 100;
              const isSlotFull = regCount >= limit || evt.is_total_full;
              const isKluQuotaBlocked = Boolean(
                evt.is_klu_blocked ||
                evt.allow_internal === false ||
                (isInternal && evt.is_internal_full)
              );

              const isSlot1 = slot1Event?.id === evt.id;
              const isSlot2 = slot2Event?.id === evt.id;
              const isSelected = isSlot1 || isSlot2;

              const validation = canSelectEvent(evt);
              const sched = getEventSchedule(evt);
              const meta = parseEventMetadata(evt);

              return (
                <div
                  key={evt.id}
                  className={`group relative rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isSelected
                      ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                      : isSlotFull
                      ? "border-rose-200 bg-slate-50/60"
                      : isPro
                      ? "border-amber-300 bg-gradient-to-b from-amber-50/30 via-white to-white"
                      : "border-slate-200/90"
                  } ${theme.cardBorder} flex flex-col justify-between overflow-hidden`}
                >
                  {/* Top Ambient Accent Bar */}
                  <div
                    className={`h-1.5 w-full bg-gradient-to-r ${
                      isSelected
                        ? "from-indigo-600 to-teal-500"
                        : isSlotFull
                        ? "from-rose-500 to-rose-600"
                        : theme.accent
                    }`}
                  />

                  <div className="p-5 space-y-3.5">
                    {/* Card Badges Row (Exact match to /events) */}
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isSlot1 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>ON YOUR PASS (Slot 1)</span>
                          </span>
                        ) : isSlot2 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-600 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>ON YOUR PASS (Slot 2)</span>
                          </span>
                        ) : isSlotFull ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <Lock className="h-3 w-3" />
                            <span>SLOT FULL</span>
                          </span>
                        ) : isKluQuotaBlocked && isInternal ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <Lock className="h-3 w-3 text-amber-700" />
                            <span>EXTERNALS ONLY (KLU Full)</span>
                          </span>
                        ) : isPro ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <Star className="h-3 w-3 fill-current" />
                            <span>FLAGSHIP EVENT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 text-slate-600 border border-slate-200/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                            <Zap className="h-3 w-3 text-indigo-500" />
                            <span>REGULAR EVENT</span>
                          </span>
                        )}

                        {evt.first_preference_only && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 text-violet-800 border border-violet-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs">
                            <Layers className="h-2.5 w-2.5 text-violet-600" />
                            <span>1ST PREF ONLY</span>
                          </span>
                        )}
                      </div>

                      {sched.isTwoDay ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold text-indigo-700 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-md shrink-0 shadow-2xs">
                          <Sparkles className="h-3 w-3 text-indigo-600" />
                          <span>Day 1 &amp; 2</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          Day {sched.startDate === "2026-09-25" ? "1" : "2"}
                        </span>
                      )}
                    </div>

                    {/* Title & Department */}
                    <div className="space-y-1.5">
                      <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {evt.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.school_or_dept}</span>
                      </div>
                    </div>

                    {/* Date, Time & Location Card Info */}
                    <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100/80">
                      <div className="flex items-center gap-2 font-medium">
                        <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="leading-snug">
                          {sched.isTwoDay ? (
                            <span className="text-indigo-950 font-bold">
                              {sched.displaySchedule}
                            </span>
                          ) : (
                            <span>
                              {formatDate(sched.startDate)} •{" "}
                              {formatEventTimeRange(evt.start_time, evt.end_time)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Seats & Action Buttons (Exact match with /events) */}
                  <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      {/* Seats indicator */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          <strong className={isSlotFull ? "text-rose-600 font-black" : "text-slate-800 font-bold"}>
                            {regCount}
                          </strong> / {limit} Seats {isSlotFull && <span className="text-rose-600 font-black text-[10px] ml-1">(FULL)</span>}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Quick View Event Brochure */}
                        {meta.brochureUrl ? (
                          <a
                            href={meta.brochureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/80 p-2 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-900 transition-all cursor-pointer shadow-2xs shrink-0"
                            title="Quick View Official Brochure (PDF)"
                          >
                            <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          </a>
                        ) : null}

                        {/* View Details Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => setActiveModalEvent(evt)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                          title="View event guidelines & details"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3 ml-1 text-slate-400" />
                        </button>

                        {/* Select / Locked / Full Button (Exact Match) */}
                        {isSlotFull ? (
                          <button
                            type="button"
                            disabled
                            title="Competition slot limit reached. Registration closed."
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed opacity-90 shadow-2xs"
                          >
                            <Lock className="h-3.5 w-3.5 text-rose-500" />
                            <span>Slot Full</span>
                          </button>
                        ) : isKluQuotaBlocked && isInternal ? (
                          <button
                            type="button"
                            disabled
                            title="Kalasalingam student quota is full. Remaining seats are reserved exclusively for external delegates."
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 cursor-not-allowed shadow-2xs"
                          >
                            <Lock className="h-3.5 w-3.5 text-amber-600" />
                            <span>KLU Full</span>
                          </button>
                        ) : isSelected ? (
                          <button
                            type="button"
                            onClick={() => handleToggleEvent(evt)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Selected</span>
                          </button>
                        ) : validation.allowed ? (
                          <button
                            type="button"
                            onClick={() => handleToggleEvent(evt)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                              isPro
                                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                            }`}
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Select</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title={validation.reason}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 border border-slate-200 cursor-not-allowed opacity-75"
                          >
                            <Lock className="h-3 w-3 text-slate-400" />
                            <span>Locked</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline notice when locked (Exact match with /events) */}
                    {!isSelected && !validation.allowed && validation.reason && (
                      <p className="text-[10px] text-amber-800 font-medium flex items-center gap-1 leading-tight pt-0.5">
                        <Info className="h-3 w-3 shrink-0 text-amber-600" />
                        <span>{validation.reason}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-slate-900">No Competitions Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                No technical events match your active search terms or selected department filters.
              </p>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )
      )}

      {/* 7. EVENT DETAILS MODAL (Exact match with EventCatalogExplorer) */}
      {activeModalEvent && (() => {
        const isSlotFull = ((activeModalEvent.total_registered ?? 0) >= (activeModalEvent.participant_limit || 100)) || Boolean(activeModalEvent.is_total_full);
        const isKluQuotaBlocked = Boolean(
          activeModalEvent.is_klu_blocked ||
          activeModalEvent.allow_internal === false ||
          (isInternal && activeModalEvent.is_internal_full)
        );
        const isSelectedModal = slot1Event?.id === activeModalEvent.id || slot2Event?.id === activeModalEvent.id;
        const modalValidation = canSelectEvent(activeModalEvent);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 pt-16 sm:pt-20 pb-4 overflow-hidden animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[calc(100vh-5.5rem)] sm:max-h-[calc(100vh-6rem)] rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden flex flex-col my-auto">
              {/* 1. FIXED TOP HEADER */}
              <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-white shrink-0 overflow-hidden border-b border-slate-800">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

                {/* Top Badges Row */}
                <div className="flex items-center gap-2 flex-wrap pr-10 mb-2.5 z-10 relative">
                  {isSelectedModal && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-md">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>ON YOUR CASH PASS</span>
                    </span>
                  )}
                  {activeModalEvent.is_pro_event ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-xs">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>FLAGSHIP COMPETITION</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600/90 text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-md">
                      <Zap className="h-3.5 w-3.5" />
                      <span>REGULAR COMPETITION</span>
                    </span>
                  )}
                  {activeModalEvent.first_preference_only && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-md border border-violet-400/40">
                      <Layers className="h-3 w-3" />
                      <span>1ST PREFERENCE ONLY</span>
                    </span>
                  )}
                  {(() => {
                    const modalSched = getEventSchedule(activeModalEvent);
                    return modalSched.isTwoDay ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xs px-3 py-1 text-[10px] font-mono font-extrabold uppercase tracking-wide border border-indigo-300/40">
                        <Sparkles className="h-3 w-3" />
                        <span>{modalSched.modalBadgeText}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-mono font-semibold">
                        Day {modalSched.startDate === "2026-09-25" ? "1 (Sept 25)" : "2 (Sept 26)"}
                      </span>
                    );
                  })()}
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveModalEvent(null)}
                  className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Title & Department Subtitle */}
                <div className="space-y-1 z-10 relative">
                  <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight leading-tight">
                    {activeModalEvent.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200/90">
                    <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="leading-normal">Organized by: {activeModalEvent.school_or_dept}</span>
                  </div>
                </div>
              </div>

              {/* 2. INNER SCROLLABLE CONTENT BODY */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* 2-Day Highlight Alert Banner */}
                {(() => {
                  const modalSched = getEventSchedule(activeModalEvent);
                  if (!modalSched.isTwoDay) return null;
                  return (
                    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 p-4 text-indigo-950 shadow-xs flex items-start sm:items-center gap-3.5 animate-in fade-in duration-200">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold font-display text-indigo-950">
                            2-Day Continuous Competition / Hackathon
                          </h4>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-200/80 text-indigo-800 tracking-wider">
                            Day 1 &amp; 2
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-900/90 font-medium leading-relaxed">
                          This event spans across both <strong>Festival Day 1 (Friday, 25 Sep)</strong> and <strong>Festival Day 2 (Saturday, 26 Sep)</strong>. Registered participants must attend and compete across both days according to the phase schedule below.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Grid of Key Information Metric Cards */}
                {(() => {
                  const modalSched = getEventSchedule(activeModalEvent);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                      {modalSched.isTwoDay ? (
                        <>
                          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 text-xs space-y-1">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              Starts At (Day 1)
                            </span>
                            <span className="font-extrabold text-indigo-950 block text-xs sm:text-sm leading-snug">
                              {modalSched.startsAtFormatted}
                            </span>
                            <span className="text-[11px] font-semibold text-indigo-600/90 block">
                              Festival Day 1 • Kickoff &amp; Phase 1
                            </span>
                          </div>

                          <div className="rounded-2xl border border-purple-200/80 bg-purple-50/50 p-3.5 text-xs space-y-1">
                            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              Ends At (Day 2)
                            </span>
                            <span className="font-extrabold text-purple-950 block text-xs sm:text-sm leading-snug">
                              {modalSched.endsAtFormatted}
                            </span>
                            <span className="text-[11px] font-semibold text-purple-600/90 block">
                              Festival Day 2 • Phase 2 &amp; Evaluation
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              Date &amp; Schedule
                            </span>
                            <span className="font-extrabold text-slate-900 block text-xs sm:text-sm leading-snug">
                              {formatDate(modalSched.startDate)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 block">
                              Festival Day {modalSched.startDate === "2026-09-25" ? "1 (Friday)" : "2 (Saturday)"}
                            </span>
                          </div>

                          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              Time Window
                            </span>
                            <span className="font-extrabold text-slate-900 block text-xs sm:text-sm leading-snug break-words">
                              {formatEventTimeRange(activeModalEvent.start_time, activeModalEvent.end_time)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 block">
                              Competition Duration
                            </span>
                          </div>
                        </>
                      )}

                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          Venue Location
                        </span>
                        <span className="font-extrabold text-slate-900 block text-xs sm:text-sm leading-snug break-words">
                          {activeModalEvent.venue || "Campus Labs & Spec Centers"}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          KARE Main Campus, Krishnankoil
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          Target Capacity
                        </span>
                        <span className="font-extrabold text-slate-900 block text-xs sm:text-sm leading-snug">
                          {activeModalEvent.participant_limit || 100} Seats
                        </span>
                        {isSlotFull ? (
                          <span className="text-[11px] font-semibold text-rose-600 block font-mono font-bold flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Slot Limit Full
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-600 block font-mono font-bold">
                            Registration Open
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Extended Metadata: WhatsApp Group & Coordinator Info */}
                {(() => {
                  const meta = parseEventMetadata(activeModalEvent);
                  return (
                    <div className="space-y-4">
                      {/* Official Brochure */}
                      {meta.brochureUrl && (
                        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950/95 to-slate-900 p-4 text-white shadow-xl">
                          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-bold shrink-0 shadow-lg">
                                <FileText className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-extrabold text-white">
                                  Official Event Brochure PDF
                                </h4>
                                <p className="text-[11px] text-indigo-200/90 font-medium">
                                  Complete problem statement, rules, rubrics &amp; schedule
                                </p>
                              </div>
                            </div>

                            <a
                              href={meta.brochureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all shrink-0 cursor-pointer"
                            >
                              <span>View Brochure PDF</span>
                              <ExternalLink className="h-3.5 w-3.5 text-white/90" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* WhatsApp Notice */}
                      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 p-4 text-emerald-950 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shrink-0">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div>
                            <h5 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                              Official WhatsApp Group Link
                            </h5>
                            <p className="text-[11px] text-emerald-800/90 font-medium leading-normal">
                              Direct WhatsApp invitation link unlocks automatically on your <strong>Digital Festival Pass</strong> in your dashboard after registration confirmation.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Description */}
                      <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 space-y-2 text-xs sm:text-sm">
                        <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] block">
                          Competition Overview &amp; Details
                        </span>
                        <p className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                          {meta.cleanDescription}
                        </p>
                      </div>

                      {/* Event Coordinators */}
                      {meta.coordinators && meta.coordinators.length > 0 && (
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
                              Event Coordinators &amp; Contact
                            </span>
                            <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              {meta.coordinators.length} Staff Assigned
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {meta.coordinators.map((c, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200/80 space-y-2.5 flex flex-col justify-between shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-700 font-extrabold text-xs shrink-0">
                                    👤
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug truncate">
                                      {c.name}
                                    </h5>
                                    <span className="text-[10px] text-slate-500 font-semibold block">
                                      Staff Coordinator
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200/60">
                                  {c.mobile && (
                                    <a
                                      href={`tel:${c.mobile}`}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-slate-200 font-mono font-bold text-[11px] text-slate-800 hover:text-indigo-600 transition-all shadow-2xs"
                                    >
                                      <Phone className="h-3 w-3 text-indigo-600 shrink-0" />
                                      <span>{c.mobile}</span>
                                    </a>
                                  )}
                                  {c.email && (
                                    <a
                                      href={`mailto:${c.email}`}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-slate-200 text-[11px] font-medium text-indigo-600 hover:underline transition-all shadow-2xs truncate"
                                    >
                                      <Mail className="h-3 w-3 text-indigo-600 shrink-0" />
                                      <span className="truncate">{c.email}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Competition Rules */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] block">
                    Rules &amp; Competition Format
                  </span>
                  <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-200/70">
                    <ul className="space-y-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Participants must bring valid college ID cards for campus entry at Kalasalingam University.</span>
                      </li>
                      <li className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Reporting time is 15 minutes before the competition start time at the designated venue.</span>
                      </li>
                      <li className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Verified digital credentials and cash awards will be presented during the valedictory ceremony.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. MODAL ACTION FOOTER BAR */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Pass Tier:
                  </span>
                  <span className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs">
                    {activeModalEvent.is_pro_event ? "Flagship (Included in ₹300 Pass)" : "Regular (Included in ₹200 Pass)"}
                  </span>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {isSlotFull ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2.5 text-xs font-bold cursor-not-allowed shadow-2xs"
                    >
                      <Lock className="h-4 w-4 text-rose-500" />
                      <span>Slot Full / Capacity Reached</span>
                    </button>
                  ) : isKluQuotaBlocked && isInternal ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 px-4 py-2.5 text-xs font-bold cursor-not-allowed shadow-2xs"
                    >
                      <Lock className="h-4 w-4 text-amber-600" />
                      <span>Locked for KLU (Reserved for Externals)</span>
                    </button>
                  ) : isSelectedModal ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleEvent(activeModalEvent);
                        setActiveModalEvent(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Selected (Remove)</span>
                    </button>
                  ) : modalValidation.allowed ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleEvent(activeModalEvent);
                        setActiveModalEvent(null);
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                        activeModalEvent.is_pro_event
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-slate-900 hover:bg-slate-800"
                      }`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Add to Pass</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={modalValidation.reason}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400 border border-slate-200 cursor-not-allowed opacity-75"
                    >
                      <Lock className="h-4 w-4 text-slate-400" />
                      <span>Selection Locked</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveModalEvent(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. FLOATING CASH PASS PILL (Exact match to FloatingCartPill on user events page) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="group flex items-center gap-3 rounded-full bg-slate-900 pl-4 pr-5 py-3 text-white shadow-xl shadow-slate-900/30 hover:bg-emerald-600 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-white/10"
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 group-hover:bg-white text-white group-hover:text-emerald-700 transition-colors">
              <Banknote className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                {selectedCount}
              </span>
            </div>

            <div className="text-left">
              <div className="text-xs font-extrabold leading-none">
                {selectedCount} {selectedCount === 1 ? "Event" : "Events"} Selected
              </div>
              <div className="text-[10px] text-slate-300 group-hover:text-white/90 font-medium mt-0.5">
                Pass Total: ₹{calculatedFee} (Cash)
              </div>
            </div>

            <ArrowRight className="h-4 w-4 ml-1 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* 9. CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">
                    Confirm Cash Registration Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review your chosen festival competitions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Check */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">{profile?.full_name}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {isInternal ? "Kalasalingam Student" : "External Delegate"}
                </span>
              </div>
              <div className="text-slate-500">
                {profile?.email} {profile?.mobile_number ? `• ${profile.mobile_number}` : ""}
              </div>
            </div>

            {/* Selected Events Summary */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Selected Events ({selectedCount})
              </span>

              {slot1Event && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-indigo-900">Slot 1:</span>
                      <span className="font-bold text-slate-900">{slot1Event.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {slot1Event.school_or_dept} • {formatDate(slot1Event.event_date)}
                    </div>
                  </div>
                  {slot1Event.is_pro_event && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                      Flagship
                    </span>
                  )}
                </div>
              )}

              {slot2Event && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-teal-900">Slot 2:</span>
                      <span className="font-bold text-slate-900">{slot2Event.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {slot2Event.school_or_dept} • {formatDate(slot2Event.event_date)}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                    Regular (₹0)
                  </span>
                </div>
              )}
            </div>

            {/* Accommodation Toggle for External Delegates */}
            {!isInternal && (
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={needsAccommodation}
                  onChange={(e) => setNeedsAccommodation(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900">I require hostel accommodation on campus</span>
                  <p className="text-slate-500 text-[11px]">Subject to campus hostel availability.</p>
                </div>
              </label>
            )}

            {/* Total Payable Box */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                  Total Cash Payable at Counter
                </span>
                <p className="text-[11px] text-emerald-800">
                  {calculatedTier === "pro_pass" ? "Flagship Pass Tier (Includes Flagship + Regular)" : "Standard Pass Tier (Includes 2 Regular)"}
                </p>
              </div>
              <div className="text-2xl font-black text-emerald-950">
                ₹{calculatedFee}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                <Banknote className="h-4 w-4" />
                <span>{isSubmitting ? "Submitting Request..." : "Confirm & Submit Request"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
