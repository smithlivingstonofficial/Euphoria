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
  ChevronRight,
  ChevronDown,
  Cpu,
  Bot,
  Plane,
  Dna,
  Briefcase,
  FlaskConical,
  Compass,
  Scale,
  ShieldCheck,
  Tag,
  RefreshCw,
  ShoppingBag,
  Star,
  Lock,
  Zap,
  Info,
  Gift,
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
      badge: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
      accent: "from-amber-500 to-amber-600",
      cardBorder: "border-amber-200/90 hover:border-amber-400 hover:shadow-amber-500/10",
      icon: Star,
    };
  }

  return {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    accent: "from-slate-700 to-slate-900",
    cardBorder: "border-slate-200/90 hover:border-slate-300 hover:shadow-slate-200/50",
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
    firstSelectedEvent,
    maxEventsLimit,
    confirmedEvents,
    userPass,
  } = useCart();

  const totalConfirmedCount = confirmedEvents.length;
  const isPassFull = totalConfirmedCount >= 2;
  const isIncrementalSlotClaim = totalConfirmedCount === 1;

  const passTotalAmount = useMemo(() => {
    if (isIncrementalSlotClaim) return 0;
    return hasProEventSelected ? 300 : 200;
  }, [hasProEventSelected, isIncrementalSlotClaim]);

  // Unique list of schools
  const schoolsList = useMemo(() => {
    const set = new Set<string>();
    initialEvents.forEach((e) => {
      if (e.school_or_dept) set.add(e.school_or_dept);
    });
    return Array.from(set).sort();
  }, [initialEvents]);

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

  return (
    <div className="space-y-6">
      {/* 1. PASS STATUS ALERT BANNERS */}
      {isPassFull ? (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-emerald-950">
                Festival Pass Active • 2 of 2 Events Confirmed
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                You have reached the maximum allowed limit of 2 events. You can view your pass, timings, and QR code in your dashboard.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/passes"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors shrink-0"
          >
            <QrCode className="h-4 w-4" />
            <span>View Festival Pass</span>
          </Link>
        </div>
      ) : isIncrementalSlotClaim ? (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                1 Slot Remaining on Your Active Pass (+₹0 Included)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Slot #1 is confirmed ({confirmedEvents[0]?.name}). Choose 1 more eligible normal event below to claim your 2nd included slot at no extra charge!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCart}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors shrink-0 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Open Pass Selection ({selectedEvents.length}/1)</span>
          </button>
        </div>
      ) : null}

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs space-y-2.5">
        {/* Mobile Filter View */}
        <div className="lg:hidden space-y-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competitions, topics, or venues..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Horizontal Scrolling Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {/* Days Chips */}
            <button
              type="button"
              onClick={() => setSelectedDate("all")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedDate === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Days
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(selectedDate === "2026-09-25" ? "all" : "2026-09-25")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedDate === "2026-09-25"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Day 1 ({day1Count})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(selectedDate === "2026-09-26" ? "all" : "2026-09-26")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedDate === "2026-09-26"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Day 2 ({day2Count})
            </button>

            <span className="text-slate-300">|</span>

            {/* Tier Chips */}
            <button
              type="button"
              onClick={() => setSelectedTier("all")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTier === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({initialEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier(selectedTier === "pro" ? "all" : "pro")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTier === "pro"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <Star className="h-3 w-3 fill-current" />
              <span>Pro ({proCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier(selectedTier === "normal" ? "all" : "normal")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTier === "normal"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Standard ({normalCount})
            </button>
          </div>

          {/* School Select Pill */}
          <div className="relative">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 focus:outline-none appearance-none pr-8 truncate cursor-pointer shadow-2xs"
            >
              <option value="all">All 14 Schools &amp; Departments</option>
              {schoolsList.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Desktop Single-Row Layout */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* 1. Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competitions by title, topic, school, or venue..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                title="Clear search"
                className="absolute right-2.5 top-2 p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Tier Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedTier("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedTier === "all"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({initialEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier(selectedTier === "pro" ? "all" : "pro")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                selectedTier === "pro"
                  ? "bg-amber-500 text-white shadow-xs font-bold"
                  : "text-amber-800 hover:text-amber-950"
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
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Normal ({normalCount})
            </button>
          </div>

          {/* 3. Day Selector Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDate("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedDate === "all"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
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
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
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
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Day 2 ({day2Count})
            </button>
          </div>

          {/* 4. School Dropdown */}
          <div className="relative shrink-0 min-w-[190px]">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none appearance-none pr-8 truncate cursor-pointer shadow-2xs"
            >
              <option value="all">All 14 Schools &amp; Depts</option>
              {schoolsList.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 rotate-90" />
          </div>

          {/* 5. Reset Filter Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              title="Reset all filters"
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/80 px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shrink-0 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active Filter Results Counter */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="text-slate-500">
              Showing <strong className="text-slate-900 font-bold">{filteredEvents.length}</strong> of{" "}
              {initialEvents.length} competitions
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
            >
              Clear filters ({filteredEvents.length} matches)
            </button>
          </div>
        )}
      </div>

      {/* 3. EVENTS GRID */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                className={`group relative rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isConfirmed
                    ? "border-emerald-300/90 bg-gradient-to-b from-emerald-50/30 via-white to-white"
                    : isPro
                    ? "border-amber-300/90 bg-gradient-to-b from-amber-50/20 via-white to-white"
                    : "border-slate-200/90"
                } ${theme.cardBorder} flex flex-col justify-between overflow-hidden`}
              >
                {/* Top Accent Gradient Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    isConfirmed
                      ? "from-emerald-500 to-teal-600"
                      : theme.accent
                  }`}
                />

                <div className="space-y-3">
                  {/* Card Header: Category Badge & Tier */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>ON YOUR PASS</span>
                        </span>
                      ) : isPro ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                          <Star className="h-3 w-3 fill-current" />
                          <span>PRO EVENT</span>
                        </span>
                      ) : null}

                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${theme.badge} truncate max-w-[170px]`}
                      >
                        {evt.category?.name || "Technical"}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-semibold text-slate-400 shrink-0">
                      Day {evt.event_date?.includes("2026-09-25") ? "1 (Sept 25)" : "2 (Sept 26)"}
                    </span>
                  </div>

                  {/* Event Title & Department */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      {evt.name}
                    </h3>
                    <p className="text-xs font-normal text-slate-500 mt-1 line-clamp-1">
                      {evt.school_or_dept}
                    </p>
                  </div>

                  {/* Schedule & Location Box */}
                  <div className="space-y-1.5 rounded-xl bg-slate-50/70 p-2.5 sm:p-3 text-xs text-slate-700 border border-slate-100">
                    <div className="flex items-center gap-2 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>
                        {evt.event_date ? formatDate(evt.event_date) : "TBA"} •{" "}
                        {formatEventTimeRange(evt.start_time, evt.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500 font-medium">
                      <span className="font-bold text-slate-800">{regCount}</span> /{" "}
                      {limit} Seats
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Event Selection States */}
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Confirmed</span>
                        </span>
                      ) : isSelected ? (
                        <button
                          type="button"
                          onClick={() => toggleEvent(evt)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Selected</span>
                        </button>
                      ) : validation.allowed ? (
                        <button
                          type="button"
                          onClick={() => toggleEvent(evt)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            isIncrementalSlotClaim
                              ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300 font-extrabold shadow-2xs"
                              : isPro
                              ? "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 shadow-2xs font-extrabold"
                              : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {isIncrementalSlotClaim ? (
                            <Gift className="h-3.5 w-3.5 text-emerald-600" />
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
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border border-slate-200 cursor-not-allowed opacity-75"
                        >
                          <Lock className="h-3 w-3 text-slate-400" />
                          <span>Locked</span>
                        </button>
                      )}

                      {/* View Details Button */}
                      <button
                        type="button"
                        onClick={() => setActiveModalEvent(evt)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                        title="View details"
                      >
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3 ml-1 text-slate-400" />
                      </button>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-xs">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Events Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No technical competitions match your current search query or tier filters.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* 4. MOBILE FLOATING PASS STICKY DOCK */}
      {selectedEvents.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 sm:hidden">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/70 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
            <div className="min-w-0 flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shrink-0 shadow-md ${
                  isIncrementalSlotClaim ? "bg-emerald-600" : "bg-primary"
                }`}
              >
                {isIncrementalSlotClaim ? (
                  <Gift className="h-4 w-4" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-extrabold text-white flex items-center gap-1.5 truncate">
                  <span>
                    {totalConfirmedCount + selectedEvents.length}/2 Slots
                  </span>
                  {isIncrementalSlotClaim ? (
                    <span className="rounded bg-emerald-500 text-slate-950 font-black text-[9px] px-1 py-0.2">
                      CLAIM SLOT 2 (+₹0)
                    </span>
                  ) : hasProEventSelected ? (
                    <span className="rounded bg-amber-500 text-slate-950 font-black text-[9px] px-1 py-0.2">
                      ⭐ PRO PASS
                    </span>
                  ) : (
                    <span className="rounded bg-indigo-600 text-white font-bold text-[9px] px-1 py-0.2">
                      NORMAL PASS
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-slate-300">
                  Payable: {formatCurrency(passTotalAmount)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openCart}
              className="rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-slate-900 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              Review Pass →
            </button>
          </div>
        </div>
      )}

      {/* 5. EVENT DETAILS MODAL */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 my-8">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalEvent(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                {isEventConfirmed(activeModalEvent.id) && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>CONFIRMED ON PASS</span>
                  </span>
                )}
                {activeModalEvent.is_pro_event && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                    <Star className="h-3 w-3 fill-current" />
                    <span>PRO EVENT</span>
                  </span>
                )}
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                  {activeModalEvent.category?.name || "Track"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-600 border border-slate-200">
                  Day {activeModalEvent.event_date?.includes("2026-09-25") ? "1 (Sept 25)" : "2 (Sept 26)"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {activeModalEvent.name}
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {activeModalEvent.school_or_dept}
              </p>
            </div>

            {/* Schedule & Venue Box */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 rounded-xl bg-slate-50 p-3 sm:p-3.5 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Date &amp; Time
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block">
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
                <span className="font-bold text-slate-900 mt-0.5 block truncate">
                  {activeModalEvent.venue}
                </span>
                <span className="text-[11px] text-slate-500">
                  Kalasalingam Main Campus
                </span>
              </div>
            </div>

            {/* Event Overview */}
            {activeModalEvent.description && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Event Overview
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {activeModalEvent.description}
                </p>
              </div>
            )}

            {/* Rules & Guidelines */}
            {activeModalEvent.rules && (
              <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Rules &amp; Guidelines
                </span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {(typeof activeModalEvent.rules === "string"
                    ? activeModalEvent.rules.split(";")
                    : Array.isArray(activeModalEvent.rules)
                    ? activeModalEvent.rules
                    : []
                  ).map((r, i) => (
                    <li key={i} className="leading-normal">
                      {r.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2.5">
              {isEventConfirmed(activeModalEvent.id) ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Already on Your Pass</span>
                </span>
              ) : isEventSelected(activeModalEvent.id) ? (
                <button
                  type="button"
                  onClick={() => toggleEvent(activeModalEvent)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
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
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
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
                      ? "Claim as 2nd Event (+₹0)"
                      : "Add to Pass"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400 border border-slate-200 cursor-not-allowed opacity-75"
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

      {/* Mobile Floating Cart Bar (Fixed at bottom on mobile < 640px) */}
      {selectedEvents.length > 0 && (
        <div className="fixed bottom-3 inset-x-3 z-40 sm:hidden">
          <div className="rounded-2xl border-2 border-indigo-500 bg-slate-950 p-3 text-white shadow-2xl flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-black text-xs shadow-xs">
                {selectedEvents.length}/2
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-white truncate">
                  {selectedEvents.length === 1 ? "1 Event Selected" : "2 Events (Pass Full)"}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono font-bold">
                  {isIncrementalSlotClaim ? "2nd Event Claim • ₹0" : `Total: ${formatCurrency(passTotalAmount)}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openCart}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-black text-white shadow-md hover:bg-primary-hover active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span>Review Pass</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
