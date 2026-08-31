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
} from "lucide-react";
import { formatCurrency, formatDate, formatTime, formatEventTimeRange } from "@/lib/utils";
import { useCart } from "@/context/cart-context";

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
  is_pro_event?: boolean;
  status: string;
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
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "pro" | "normal">("all");
  const [showSchoolCards, setShowSchoolCards] = useState<boolean>(true);
  const [activeModalEvent, setActiveModalEvent] = useState<PublicEvent | null>(null);

  // Cart Context Hook
  const {
    isEventSelected,
    isEventConfirmed,
    toggleEvent,
    canSelectEvent,
    openCart,
    selectedEvents,
    hasProEventSelected,
    maxEventsLimit,
    confirmedEvents,
  } = useCart();

  const totalConfirmedCount = confirmedEvents.length;
  const isPassFull = totalConfirmedCount >= 2;
  const isIncrementalSlotClaim = totalConfirmedCount === 1;

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

  // Date counts
  const day1Count = useMemo(
    () =>
      initialEvents.filter(
        (e) =>
          e.event_date &&
          (e.event_date.startsWith("2026-09-25") || e.event_date.includes("-09-25"))
      ).length,
    [initialEvents]
  );
  const day2Count = useMemo(
    () =>
      initialEvents.filter(
        (e) =>
          e.event_date &&
          (e.event_date.startsWith("2026-09-26") || e.event_date.includes("-09-26"))
      ).length,
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
        const dateStr = String(evt.event_date || "");
        if (selectedDate === "2026-09-25") {
          if (!dateStr.includes("-09-25") && !dateStr.includes("2026-09-25")) return false;
        } else if (selectedDate === "2026-09-26") {
          if (!dateStr.includes("-09-26") && !dateStr.includes("2026-09-26")) return false;
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
                Slot #1 is confirmed ({confirmedEvents[0]?.name}). Select 1 more normal event from the list below to claim your 2nd included slot for free!
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
                <span>Pro ({proCount})</span>
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
                Standard ({normalCount})
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
              14 Departments
            </span>
          </div>

          {/* School Directory Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {schoolsData.map((school) => (
              <button
                key={school.name}
                type="button"
                onClick={() => setSelectedSchool(school.name)}
                className="group p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between space-y-3 cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-indigo-700 group-hover:bg-primary group-hover:text-white transition-colors">
                    <GraduationCap className="h-4 w-4" />
                  </div>

                  <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 group-hover:bg-primary group-hover:text-white transition-colors">
                    {school.count} {school.count === 1 ? "Event" : "Events"}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors font-display line-clamp-2">
                    {school.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold group-hover:text-slate-700">
                    <span>View competitions</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>
              </button>
            ))}
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
                            <span>PRO EVENT</span>
                          </span>
                        ) : null}

                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] border ${theme.badge} truncate max-w-[150px]`}
                        >
                          {evt.category?.name || "Technical"}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        Day {evt.event_date?.includes("2026-09-25") ? "1" : "2"}
                      </span>
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
                        <span>
                          {evt.event_date ? formatDate(evt.event_date) : "Sept 25, 2026"} •{" "}
                          {formatEventTimeRange(evt.start_time, evt.end_time)}
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
                            onClick={() => toggleEvent(evt)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            {/* Close Modal Button */}
            <button
              type="button"
              onClick={() => setActiveModalEvent(null)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                {isEventConfirmed(activeModalEvent.id) && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>CONFIRMED ON PASS</span>
                  </span>
                )}
                {activeModalEvent.is_pro_event && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <Star className="h-3 w-3 fill-current" />
                    <span>PRO EVENT</span>
                  </span>
                )}
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                  {activeModalEvent.category?.name || "Track"}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 border border-slate-200">
                  Day {activeModalEvent.event_date?.includes("2026-09-25") ? "1 (Sept 25)" : "2 (Sept 26)"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 leading-snug">
                {activeModalEvent.name}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                {activeModalEvent.school_or_dept}
              </p>
            </div>

            {/* Schedule & Venue Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Date &amp; Schedule
                </span>
                <span className="font-bold text-slate-900 mt-1 block text-xs sm:text-sm">
                  {formatDate(activeModalEvent.event_date)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {formatEventTimeRange(activeModalEvent.start_time, activeModalEvent.end_time)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Venue Location
                </span>
                <span className="font-bold text-slate-900 mt-1 block text-xs sm:text-sm truncate">
                  {activeModalEvent.venue}
                </span>
                <span className="text-[11px] text-slate-500">
                  KARE Main Campus
                </span>
              </div>
            </div>

            {/* Description */}
            {activeModalEvent.description && (
              <div className="space-y-1.5 text-xs sm:text-sm">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Event Description
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {activeModalEvent.description}
                </p>
              </div>
            )}

            {/* Rules & Guidelines List */}
            {activeModalEvent.rules && (
              <div className="space-y-2 text-xs sm:text-sm border-t border-slate-100 pt-4">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Rules &amp; Competition Format
                </span>
                <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                  {(typeof activeModalEvent.rules === "string"
                    ? activeModalEvent.rules.split(";")
                    : Array.isArray(activeModalEvent.rules)
                    ? activeModalEvent.rules
                    : []
                  ).map((r, i) => (
                    <li key={i} className="leading-relaxed">
                      {r.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
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
                    toggleEvent(activeModalEvent);
                    setActiveModalEvent(null);
                    openCart();
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
