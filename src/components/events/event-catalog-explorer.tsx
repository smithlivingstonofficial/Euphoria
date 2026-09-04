"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
  Trophy,
  SlidersHorizontal,
  GraduationCap,
  ArrowLeft,
  BookOpen,
  LayoutGrid,
  Phone,
  Mail,
  ExternalLink,
  FileText,
  MessageSquare,
} from "lucide-react";
import { formatCurrency, formatDate, formatTime, formatEventTimeRange } from "@/lib/utils";
import { getEventSchedule } from "@/lib/schedule";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";
import { claimSecondSlotAction } from "@/actions/passes";

export interface PublicEvent {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  rules?: string | string[];
  school_or_dept: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  registration_fee: number;
  participant_limit: number;
  min_team_size?: number;
  max_team_size?: number;
  is_pro_event: boolean;
  brochure_url?: string;
  status: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  registrations?: Array<{
    id: string;
    status: string;
  }>;
}

export function parseEventMetadata(event: PublicEvent) {
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
    brochureUrl: event.brochure_url || (brochureMatch ? brochureMatch[2].trim() : null),
    cleanDescription,
    namesList,
    mobilesList,
    emailsList,
    coordinators,
  };
}

// Normalizes text for forgiving search (strips punctuation, lowercases)
function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Category visual styling helper
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
  // 1. Architecture
  "Kalasalingam School of Architecture (KSoA)":
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
  // 2. Law
  "Kalasalingam School of Law (KSoL)":
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
  // 3. Bio, Chemical & Processing
  "School of Bio, Chemical and Processing Engineering":
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80",
  // 4. Mechanical, Aero, Auto & Civil
  "School of Mechanical, Aero, Auto and Civil Engineering":
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
  // 5. Computing
  "School of Computing (SoC)":
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
  // 6. Electronics, Electrical & Biomedical
  "School of Electronics, Electrical and Biomedical Technology (SEET)":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  // 7. Business School
  "Kalasalingam Business School (KBS)":
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80",
  // 8. Advanced Sciences
  "School of Advanced Sciences (SAS)":
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  // 9. Liberal Arts & Special Education
  "School of Liberal Arts and Special Education (SLASE)":
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
  // 10. Allied & Health Sciences
  "Kalasalingam School of Allied And Health Sciences":
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
  // 11. Agriculture & Horticulture
  "Kalasalingam School of Agriculture and Horticulture (KSAH)":
    "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80",
  // 12. First Year Engineering & Foundation
  "First Year Engineering & Foundation (FE)":
    "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80",
  // 13. Research Programmes
  "Research Programmes":
    "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80",
};

function getSchoolCoverImage(schoolName: string): string {
  if (!schoolName) {
    return "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80";
  }

  // 1. Direct exact match
  if (EXACT_SCHOOL_COVERS[schoolName]) {
    return EXACT_SCHOOL_COVERS[schoolName];
  }

  const upper = schoolName.toUpperCase();

  // 2. Exact token keyword checks
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

export function EventCatalogExplorer({
  initialEvents = [],
  categories = [],
  initialTrack = "",
  initialQuery = "",
  user,
}: {
  initialEvents: PublicEvent[];
  categories: Array<{ id: string; name: string; slug: string }>;
  initialTrack?: string;
  initialQuery?: string;
  user?: { id: string; email: string; fullName?: string } | null;
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const router = useRouter();
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "pro" | "normal">("all");
  const [showSchoolCards, setShowSchoolCards] = useState<boolean>(true);
  const [activeModalEvent, setActiveModalEvent] = useState<PublicEvent | null>(null);

  // Dedicated Slot #2 Claim Modal State
  const [claimingSlot2Event, setClaimingSlot2Event] = useState<PublicEvent | null>(null);
  const [isSubmittingSlot2, setIsSubmittingSlot2] = useState<boolean>(false);
  const [slot2Error, setSlot2Error] = useState<string | null>(null);
  const [slot2Success, setSlot2Success] = useState<{
    eventName: string;
    passCode: string;
  } | null>(null);

  // Cart Context Hook
  const {
    isEventSelected,
    isEventConfirmed,
    toggleEvent,
    canSelectEvent,
    openCart,
    clearCart,
    selectedEvents,
    hasProEventSelected,
    maxEventsLimit,
    confirmedEvents,
    userPass,
    setUserPassState,
  } = useCart();

  const totalConfirmedCount = confirmedEvents.length;
  const isPassFull = totalConfirmedCount >= 2;
  const isIncrementalSlotClaim = totalConfirmedCount === 1;

  const handleConfirmSlot2 = async () => {
    if (!claimingSlot2Event) return;

    setIsSubmittingSlot2(true);
    setSlot2Error(null);

    try {
      const res = await claimSecondSlotAction(claimingSlot2Event.id);

      if (!res.success) {
        setSlot2Error(res.error || "Failed to confirm 2nd event slot.");
        setIsSubmittingSlot2(false);
        return;
      }

      // Success! Clear any lingering cart items so cart count becomes 0
      clearCart();

      // Immediately update local cart context pass state so UI updates
      const updatedConfirmed = [
        ...confirmedEvents,
        {
          id: claimingSlot2Event.id,
          eventId: claimingSlot2Event.id,
          name: claimingSlot2Event.name,
          isProEvent: Boolean(claimingSlot2Event.is_pro_event),
          slotNumber: 2,
          registrationCode: res.passCode || userPass?.passCode || "CONFIRMED",
        },
      ];

      setUserPassState(
        {
          ...userPass,
          slotsUsed: 2,
          remainingSlots: 0,
          passCode: res.passCode || userPass?.passCode,
        },
        updatedConfirmed
      );

      setSlot2Success({
        eventName: claimingSlot2Event.name,
        passCode: res.passCode || userPass?.passCode || "CONFIRMED",
      });

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to claim 2nd slot";
      setSlot2Error(msg);
    } finally {
      setIsSubmittingSlot2(false);
    }
  };

  const passTotalAmount = useMemo(() => {
    if (isIncrementalSlotClaim) return 0;
    return hasProEventSelected ? 300 : 200;
  }, [hasProEventSelected, isIncrementalSlotClaim]);

  // Unique list of schools with event counts
  const schoolsData = useMemo(() => {
    const countsMap: Record<string, number> = {};
    initialEvents.forEach((e) => {
      if (e.school_or_dept) {
        countsMap[e.school_or_dept] = (countsMap[e.school_or_dept] || 0) + 1;
      }
    });

    return Object.entries(countsMap)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [initialEvents]);

  const schoolsList = useMemo(() => {
    return schoolsData.map((s) => s.name).sort();
  }, [schoolsData]);

  // Pro and Normal event counts
  const proCount = useMemo(
    () => initialEvents.filter((e) => Boolean(e.is_pro_event)).length,
    [initialEvents]
  );
  const normalCount = useMemo(
    () => initialEvents.filter((e) => !e.is_pro_event).length,
    [initialEvents]
  );

  // Date counts (Two-day events appear on both Day 1 and Day 2)
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

      // 4. Tier Filter (Pro vs Normal)
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

  // Determine if we are in School Directory mode (Level 1: Cards only) or Event Grid mode (Level 2)
  const isSchoolDirectoryLevel = showSchoolCards && selectedSchool === "all";

  return (
    <div className="space-y-6">

      {/* PASS STATUS ALERT BANNERS */}
      {isPassFull ? (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-emerald-950 font-display">
                Festival Pass Fully Active • 2 of 2 Events Confirmed
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                You have claimed the maximum limit of 2 events. Access your pass details, schedules, and entry QR code anytime in your dashboard.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/passes"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-800 active:scale-95 transition-all shrink-0"
          >
            <QrCode className="h-4 w-4" />
            <span>View Digital Pass</span>
          </Link>
        </div>
      ) : isIncrementalSlotClaim ? (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-display">
                1 Slot Remaining on Your Active Pass (+₹0 Extra)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Slot #1 is confirmed ({confirmedEvents[0]?.name}). Select 1 more normal event from the list below to claim your 2nd included slot!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCart}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-primary-hover active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Pass Selection ({selectedEvents.length}/1)</span>
          </button>
        </div>
      ) : null}

      {/* SEARCH & FILTER CONTROLS BAR */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs space-y-3">
        {/* Desktop Single-Row & Mobile Multi-Row Responsive Layout */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-3.5">
          {/* 1. Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competitions by title, department, or venue..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 2. Filter Segment Chips (Tier & Days) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
            {/* Tier Filters */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTier("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedTier === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({initialEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier(selectedTier === "pro" ? "all" : "pro")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedTier === "pro"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-amber-800 hover:bg-amber-100/60"
                }`}
              >
                <Star className="h-3 w-3 fill-current" />
                <span>Flagship ({proCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier(selectedTier === "normal" ? "all" : "normal")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedTier === "normal"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Regular ({normalCount})
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 shrink-0" />

            {/* Date Filters */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDate("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedDate === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Days
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(selectedDate === "2026-09-25" ? "all" : "2026-09-25")
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedDate === "2026-09-25"
                    ? "bg-indigo-600 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Day 1 ({day1Count})
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(selectedDate === "2026-09-26" ? "all" : "2026-09-26")
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedDate === "2026-09-26"
                    ? "bg-indigo-600 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Day 2 ({day2Count})
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(selectedDate === "both" ? "all" : "both")
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDate === "both"
                    ? "bg-purple-600 text-white shadow-2xs font-bold"
                    : "text-purple-700 hover:bg-purple-100/60"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Both Days ({bothDaysCount})</span>
              </button>
            </div>
          </div>

          {/* 3. School / Department Dropdown (Only visible when School Directory mode is OFF) */}
          {!showSchoolCards && (
            <div className="relative shrink-0 min-w-[190px] lg:max-w-[220px]">
              <GraduationCap className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none appearance-none truncate cursor-pointer shadow-2xs"
              >
                <option value="all">All 14 Schools &amp; Depts</option>
                {schoolsList.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          )}

          {/* 4. Modern View Mode Segmented Slider Toggle */}
          <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shrink-0">
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
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>All Events</span>
            </button>
          </div>

          {/* Reset Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shrink-0 cursor-pointer"
              title="Reset all active filters"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Result Stats Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Showing <strong className="text-slate-900 font-bold">{filteredEvents.length}</strong> of{" "}
            {initialEvents.length} competitions
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Clear filters ({filteredEvents.length} matches)
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 1: SCHOOL DIRECTORY CARDS VIEW (Displayed when showSchoolCards is ON & no school selected) */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* LEVEL 2: ACTIVE SCHOOL BREADCRUMB HEADER (Displayed when a School is selected) */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* EVENTS GRID (Displayed when NOT in Directory Level 1)                      */}
      {/* ========================================================================= */}
      {!isSchoolDirectoryLevel && (
        filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 animate-in fade-in duration-300">
            {filteredEvents.map((evt) => {
              const isPro = Boolean(evt.is_pro_event);
              const theme = getCategoryTheme(evt.category?.name, isPro);
              const regCount = (evt.registrations || []).length;
              const limit = evt.participant_limit || 100;
              const isSelected = isEventSelected(evt.id);
              const isConfirmed = isEventConfirmed(evt.id);
              const validation = canSelectEvent(evt);
              const sched = getEventSchedule(evt);

              return (
                <div
                  key={evt.id}
                  className={`group relative rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isConfirmed
                      ? "border-emerald-300 bg-gradient-to-b from-emerald-50/40 via-white to-white"
                      : isPro
                      ? "border-amber-300 bg-gradient-to-b from-amber-50/30 via-white to-white"
                      : "border-slate-200/90"
                  } ${theme.cardBorder} flex flex-col justify-between overflow-hidden`}
                >
                  {/* Top Ambient Accent Bar */}
                  <div
                    className={`h-1.5 w-full bg-gradient-to-r ${
                      isConfirmed
                        ? "from-emerald-500 to-teal-500"
                        : theme.accent
                    }`}
                  />

                  <div className="p-5 space-y-3.5">
                    {/* Card Badges Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>ON YOUR PASS</span>
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

                  {/* Card Footer: Seats & Actions */}
                  <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      {/* Seats indicator */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          <strong className="text-slate-800 font-bold">{regCount}</strong> / {limit} Seats
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* View Details Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => setActiveModalEvent(evt)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                          title="View event guidelines & details"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3 ml-1 text-slate-400" />
                        </button>

                        {/* Select / Confirmed / Locked Button */}
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Confirmed</span>
                          </span>
                        ) : isSelected ? (
                          <button
                            type="button"
                            onClick={() => toggleEvent(evt)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Selected</span>
                          </button>
                        ) : validation.allowed ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isIncrementalSlotClaim) {
                                setClaimingSlot2Event(evt);
                              } else {
                                toggleEvent(evt);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                              isIncrementalSlotClaim
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                                : isPro
                                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                            }`}
                          >
                            {isIncrementalSlotClaim ? (
                              <Gift className="h-3.5 w-3.5" />
                            ) : (
                              <ShoppingBag className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {isIncrementalSlotClaim ? "Select (+₹0)" : "Select"}
                            </span>
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

                    {/* Inline notice when locked */}
                    {!isConfirmed && !isSelected && !validation.allowed && validation.reason && (
                      <p className="text-[10px] text-amber-800 font-medium flex items-center gap-1 leading-tight">
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
          /* Empty State */
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

      {/* EVENT DETAILS MODAL */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 pt-16 sm:pt-20 pb-4 overflow-hidden animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[calc(100vh-5.5rem)] sm:max-h-[calc(100vh-6rem)] rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* 1. FIXED TOP HEADER */}
            <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-white shrink-0 overflow-hidden border-b border-slate-800">
              {/* Background Ambient Glow Orbs */}
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

              {/* Top Badges Row */}
              <div className="flex items-center gap-2 flex-wrap pr-10 mb-2.5 z-10 relative">
                {isEventConfirmed(activeModalEvent.id) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-md">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>ON YOUR PASS</span>
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

              {/* Grid of Key Information Metric Cards (Dual Dates for 2-Day Events) */}
              {(() => {
                const modalSched = getEventSchedule(activeModalEvent);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    {modalSched.isTwoDay ? (
                      <>
                        {/* Metric 1: Starts At */}
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

                        {/* Metric 2: Ends At */}
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
                        {/* Metric 1: Date & Day */}
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

                        {/* Metric 2: Timings */}
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

                    {/* Metric 3: Venue */}
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

                    {/* Metric 4: Capacity */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        Target Capacity
                      </span>
                      <span className="font-extrabold text-slate-900 block text-xs sm:text-sm leading-snug">
                        {activeModalEvent.participant_limit || 100} Seats
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 block font-mono font-bold">
                        Registration Open
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Extended Metadata: WhatsApp Group & Coordinator Info */}
              {(() => {
                const meta = parseEventMetadata(activeModalEvent);
                return (
                  <div className="space-y-4">
                    {/* Official Event Brochure PDF Card - Premium Redesign */}
                    {meta.brochureUrl && (
                      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950/95 to-slate-900 p-4 text-white shadow-xl shadow-indigo-950/20 backdrop-blur-xl group hover:border-indigo-400/50 transition-all duration-300">
                        {/* Decorative Background Accent */}
                        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white font-bold shrink-0 shadow-lg shadow-indigo-500/25 border border-white/20">
                              <FileText className="h-5 w-5 text-white" />
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-extrabold font-display tracking-wide text-white">
                                  Official Event Brochure PDF
                                </h4>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-widest">
                                  OFFICIAL PDF
                                </span>
                              </div>
                              <p className="text-[11px] text-indigo-200/90 font-medium leading-relaxed">
                                Complete problem statement, rules, rubrics, judge guidelines &amp; schedule
                              </p>
                            </div>
                          </div>

                          <a
                            href={meta.brochureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer self-end sm:self-center border border-white/20"
                          >
                            <span>View Brochure PDF</span>
                            <ExternalLink className="h-3.5 w-3.5 text-white/90" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Official WhatsApp Participant Group Notice - Premium Redesign */}
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 p-4 text-emerald-950 shadow-sm shadow-emerald-500/5 backdrop-blur-md">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0 font-bold">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-extrabold text-emerald-950 font-display tracking-wide uppercase">
                                Official WhatsApp Group Link
                              </h5>
                            </div>
                            <p className="text-[11px] text-emerald-800/90 font-medium leading-normal">
                              Direct WhatsApp invitation link unlocks automatically on your <strong className="text-emerald-950 font-bold">Digital Festival Pass</strong> in your dashboard after registration confirmation.
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 border border-emerald-300/80 px-3 py-1.5 text-[10px] font-extrabold text-emerald-800 shrink-0 self-end sm:self-center tracking-wide uppercase shadow-2xs">
                          <Lock className="h-3 w-3 text-emerald-700" />
                          <span>Unlocks Post-Registration</span>
                        </span>
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

                    {/* Event Coordinators Contact Grid */}
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
                              className="rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200/80 space-y-2.5 flex flex-col justify-between shadow-2xs hover:border-indigo-200 transition-all"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-700 font-extrabold text-xs shrink-0 border border-indigo-200/60">
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
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-slate-200 font-mono font-bold text-[11px] text-slate-800 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-2xs"
                                    title={`Call ${c.name}`}
                                  >
                                    <Phone className="h-3 w-3 text-indigo-600 shrink-0" />
                                    <span>{c.mobile}</span>
                                  </a>
                                )}
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-slate-200 text-[11px] font-medium text-indigo-600 hover:underline hover:bg-indigo-50/50 transition-all shadow-2xs max-w-full truncate"
                                    title={`Email ${c.name}`}
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

              {/* Competition Rules & Format */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] block">
                  Rules &amp; Competition Format
                </span>
                <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-200/70">
                  <ul className="space-y-2 text-xs text-slate-700">
                    {activeModalEvent.rules ? (
                      (typeof activeModalEvent.rules === "string"
                        ? activeModalEvent.rules.split(";")
                        : Array.isArray(activeModalEvent.rules)
                        ? activeModalEvent.rules
                        : []
                      ).map((r, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{r.trim()}</span>
                        </li>
                      ))
                    ) : (
                      <>
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
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* 3. MODAL ACTION FOOTER BAR */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider hidden sm:inline">
                  Pass Tier:
                </span>
                <span className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs">
                  {activeModalEvent.is_pro_event ? "Flagship (Included in ₹300 Pass)" : "Regular (Included in ₹200 Pass)"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isEventConfirmed(activeModalEvent.id) ? (
                  <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>On Active Pass</span>
                  </span>
                ) : isEventSelected(activeModalEvent.id) ? (
                  <button
                    type="button"
                    onClick={() => toggleEvent(activeModalEvent)}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Selected (Remove)</span>
                  </button>
                ) : canSelectEvent(activeModalEvent).allowed ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isIncrementalSlotClaim) {
                        const target = activeModalEvent;
                        setActiveModalEvent(null);
                        setClaimingSlot2Event(target);
                      } else {
                        toggleEvent(activeModalEvent);
                        setActiveModalEvent(null);
                        openCart();
                      }
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                      isIncrementalSlotClaim
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {isIncrementalSlotClaim ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      <ShoppingBag className="h-4 w-4" />
                    )}
                    <span>
                      {isIncrementalSlotClaim
                        ? "Claim 2nd Event (+₹0)"
                        : "Add to Pass"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
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
      )}

      {/* ========================================================================= */}
      {/* SLOT #2 CONFIRMATION & PERMANENT LOCKING MODAL */}
      {/* ========================================================================= */}
      {claimingSlot2Event && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {slot2Success ? (
              /* Success Celebration State */
              <div className="text-center py-4 space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                    Pass Complete • 2/2 Slots Locked
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 font-display">
                    Slot #2 Confirmed!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    <strong>{slot2Success.eventName}</strong> has been confirmed and locked as your 2nd event under your delegate pass.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                    Master Festival Pass Code
                  </span>
                  <span className="text-base font-mono font-black text-emerald-900 tracking-wider block">
                    {slot2Success.passCode}
                  </span>
                  <p className="text-[11px] text-emerald-800 pt-1">
                    Both competition slots are fully registered. No further payment or registration is required!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Link
                    href="/dashboard/passes"
                    onClick={() => {
                      setClaimingSlot2Event(null);
                      setSlot2Success(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <span>View Pass in Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setClaimingSlot2Event(null);
                      setSlot2Success(null);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close &amp; Browse
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation Screen */
              <>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 font-display">
                        Confirm Slot #2 Registration
                      </h3>
                      <p className="text-xs font-semibold text-emerald-700">
                        Included with your active Festival Pass (+₹0 Extra Fee)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setClaimingSlot2Event(null);
                      setSlot2Error(null);
                    }}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {slot2Error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{slot2Error}</span>
                  </div>
                )}

                {/* Event Summary Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      SLOT #2 SELECTION
                    </span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                      +₹0 (Included)
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {claimingSlot2Event.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {claimingSlot2Event.school_or_dept}
                    </p>
                  </div>

                  {(() => {
                    const slot2Sched = claimingSlot2Event ? getEventSchedule(claimingSlot2Event) : null;
                    return (
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {slot2Sched?.isTwoDay
                              ? "25 Sep - 26 Sep (Day 1 & 2)"
                              : slot2Sched?.startDate === "2026-09-25"
                              ? "25 Sep 2026 (Day 1)"
                              : "26 Sep 2026 (Day 2)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {slot2Sched?.isTwoDay
                              ? `${slot2Sched.startTime} → ${slot2Sched.endTime}`
                              : formatEventTimeRange(claimingSlot2Event.start_time, claimingSlot2Event.end_time)}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{claimingSlot2Event.venue || "Campus Venue"}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Locking Warning (Critical User Requirement) */}
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-1 text-xs text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Permanent Pass Locking Notice</span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Are you sure you want to add <strong>{claimingSlot2Event.name}</strong> to your 2nd slot? Once confirmed, your festival delegate pass will be <strong>permanently locked (2/2 slots used)</strong> and you will not be able to change, swap, or add any other events.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClaimingSlot2Event(null);
                      setSlot2Error(null);
                    }}
                    disabled={isSubmittingSlot2}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 text-center cursor-pointer"
                  >
                    Cancel / Choose Another
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSlot2}
                    disabled={isSubmittingSlot2}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 text-center cursor-pointer"
                  >
                    {isSubmittingSlot2 ? (
                      <span>Confirming &amp; Locking...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirm &amp; Lock Slot #2 (+₹0)</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
