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
} from "lucide-react";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { registerForEvent } from "@/actions/events";
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
function getCategoryTheme(catName?: string) {
  const c = (catName || "").toLowerCase();
  if (c.includes("comput") || c.includes("ai") || c.includes("code")) {
    return {
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      accent: "from-blue-600 to-indigo-600",
      cardBorder: "hover:border-blue-300 hover:shadow-blue-500/10",
      icon: Cpu,
      lightBg: "bg-blue-50/40",
    };
  }
  if (c.includes("electr") || c.includes("robot") || c.includes("iot")) {
    return {
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      accent: "from-amber-500 to-orange-600",
      cardBorder: "hover:border-amber-300 hover:shadow-amber-500/10",
      icon: Bot,
      lightBg: "bg-amber-50/40",
    };
  }
  if (c.includes("mech") || c.includes("civil") || c.includes("aero")) {
    return {
      badge: "bg-sky-50 text-sky-700 border-sky-200",
      accent: "from-sky-500 to-cyan-600",
      cardBorder: "hover:border-sky-300 hover:shadow-sky-500/10",
      icon: Plane,
      lightBg: "bg-sky-50/40",
    };
  }
  if (c.includes("bio") || c.includes("chem")) {
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accent: "from-emerald-500 to-teal-600",
      cardBorder: "hover:border-emerald-300 hover:shadow-emerald-500/10",
      icon: Dna,
      lightBg: "bg-emerald-50/40",
    };
  }
  if (c.includes("manage") || c.includes("business") || c.includes("commerce")) {
    return {
      badge: "bg-purple-50 text-purple-700 border-purple-200",
      accent: "from-purple-500 to-violet-600",
      cardBorder: "hover:border-purple-300 hover:shadow-purple-500/10",
      icon: Briefcase,
      lightBg: "bg-purple-50/40",
    };
  }
  if (c.includes("scienc") || c.includes("math")) {
    return {
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      accent: "from-rose-500 to-pink-600",
      cardBorder: "hover:border-rose-300 hover:shadow-rose-500/10",
      icon: FlaskConical,
      lightBg: "bg-rose-50/40",
    };
  }
  if (c.includes("arch") || c.includes("design")) {
    return {
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      accent: "from-indigo-500 to-primary",
      cardBorder: "hover:border-indigo-300 hover:shadow-indigo-500/10",
      icon: Compass,
      lightBg: "bg-indigo-50/40",
    };
  }
  if (c.includes("law")) {
    return {
      badge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
      accent: "from-fuchsia-500 to-purple-600",
      cardBorder: "hover:border-fuchsia-300 hover:shadow-fuchsia-500/10",
      icon: Scale,
      lightBg: "bg-fuchsia-50/40",
    };
  }
  return {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    accent: "from-slate-600 to-slate-800",
    cardBorder: "hover:border-primary/50 hover:shadow-indigo-500/10",
    icon: Sparkles,
    lightBg: "bg-slate-50/60",
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
  // Determine initial category from prop
  const initialCategoryName = useMemo(() => {
    if (!initialTrack) return "all";
    const found = categories.find(
      (c) =>
        c.name.toLowerCase().includes(initialTrack.toLowerCase()) ||
        c.slug.toLowerCase().includes(initialTrack.toLowerCase())
    );
    return found ? found.name : "all";
  }, [initialTrack, categories]);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryName);
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [activeModalEvent, setActiveModalEvent] = useState<PublicEvent | null>(null);

  // Cart Context Hook
  const { isEventSelected, toggleEvent, openCart } = useCart();

  // Registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccessCode, setRegSuccessCode] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Unique list of schools
  const schoolsList = useMemo(() => {
    const set = new Set<string>();
    initialEvents.forEach((e) => {
      if (e.school_or_dept) set.add(e.school_or_dept);
    });
    return Array.from(set).sort();
  }, [initialEvents]);

  // Category event counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialEvents.forEach((e) => {
      const c = e.category?.name || "Other";
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [initialEvents]);

  // Date counts
  const day1Count = useMemo(
    () => initialEvents.filter((e) => e.event_date?.includes("2026-09-25")).length,
    [initialEvents]
  );
  const day2Count = useMemo(
    () => initialEvents.filter((e) => e.event_date?.includes("2026-09-26")).length,
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
          `${evt.name} ${evt.school_or_dept} ${evt.venue} ${evt.category?.name || ""} ${evt.short_description || ""} ${evt.description || ""}`
        );

        const allTokensMatch = queryTokens.every((token) =>
          eventSearchTarget.includes(token)
        );

        if (!allTokensMatch) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== "all") {
        const catName = evt.category?.name?.toLowerCase().trim() || "";
        const targetCat = selectedCategory.toLowerCase().trim();
        if (catName !== targetCat) return false;
      }

      // 3. Date Filter
      if (selectedDate !== "all") {
        if (!evt.event_date || !evt.event_date.includes(selectedDate)) {
          return false;
        }
      }

      // 4. School Filter
      if (selectedSchool !== "all") {
        if (evt.school_or_dept !== selectedSchool) return false;
      }

      return true;
    });
  }, [initialEvents, searchQuery, selectedCategory, selectedDate, selectedSchool]);

  // Global search matches to show count across all categories if 0 found in active filter
  const globalSearchMatchCount = useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return initialEvents.length;
    const queryTokens = normalizeText(rawQuery).split(" ").filter((t) => t.length > 0);

    return initialEvents.filter((evt) => {
      const eventSearchTarget = normalizeText(
        `${evt.name} ${evt.school_or_dept} ${evt.venue} ${evt.category?.name || ""} ${evt.short_description || ""} ${evt.description || ""}`
      );
      return queryTokens.every((token) => eventSearchTarget.includes(token));
    }).length;
  }, [initialEvents, searchQuery]);

  const handleRegister = async (eventId: string) => {
    if (!user) {
      window.location.href = `/login?redirect=/events`;
      return;
    }

    setIsRegistering(true);
    setRegError(null);
    setRegSuccessCode(null);

    const res = await registerForEvent(eventId);

    if (!res.success) {
      if (res.redirect) {
        window.location.href = res.redirect;
      } else {
        setRegError(res.error || "Registration failed");
      }
    } else {
      setRegSuccessCode(res.registrationCode || "CONFIRMED");
    }
    setIsRegistering(false);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    selectedDate !== "all" ||
    selectedSchool !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedDate("all");
    setSelectedSchool("all");
  };

  return (
    <div className="space-y-5">
      {/* Search & Multi-Filter Control Panel */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Row 1: Search Bar & Day Switcher */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title, keyword, school, or venue (e.g. Fusion, AI, Drone, CAD, Quiz, Archathon)..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                title="Clear search"
                className="absolute right-3 top-2.5 p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Day Filter Tabs */}
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80 shrink-0">
            <button
              onClick={() => setSelectedDate("all")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDate === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Days ({initialEvents.length})
            </button>
            <button
              onClick={() => setSelectedDate("2026-09-25")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDate === "2026-09-25"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Day 1 • Sept 25 ({day1Count})
            </button>
            <button
              onClick={() => setSelectedDate("2026-09-26")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDate === "2026-09-26"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Day 2 • Sept 26 ({day2Count})
            </button>
          </div>
        </div>

        {/* Row 2: School Filter Dropdown & Category Track Scroll */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 border-t border-slate-100">
          {/* School Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Building className="h-4 w-4 text-slate-400" />
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-2xs max-w-[260px] truncate cursor-pointer"
            >
              <option value="all">All 14 Schools &amp; Departments</option>
              {schoolsList.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>

          {/* Category Track Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-xl px-3 py-1 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              All Tracks ({initialEvents.length})
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              const count = categoryCounts[cat.name] || 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`rounded-xl px-3 py-1 text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Tags Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-primary font-medium">
                Keyword: &quot;{searchQuery}&quot;
                <button onClick={() => setSearchQuery("")} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-primary font-medium">
                Track: {selectedCategory}
                <button onClick={() => setSelectedCategory("all")} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedDate !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-primary font-medium">
                Date: {selectedDate === "2026-09-25" ? "Day 1 (Sept 25)" : "Day 2 (Sept 26)"}
                <button onClick={() => setSelectedDate("all")} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedSchool !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-primary font-medium">
                School: {selectedSchool}
                <button onClick={() => setSelectedSchool("all")} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-rose-600 font-bold hover:underline ml-auto cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Result Status Counter & Cross-Track Discovery Banner */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-900 font-bold">{filteredEvents.length}</strong> of{" "}
            {initialEvents.length} official competitions
          </div>
        </div>

        {/* Cross-track helpful alert */}
        {filteredEvents.length === 0 && globalSearchMatchCount > 0 && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-primary flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Found <strong>{globalSearchMatchCount}</strong> matching events in other tracks or dates.
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedDate("all");
                setSelectedSchool("all");
              }}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover transition-colors shrink-0 cursor-pointer"
            >
              Show All {globalSearchMatchCount} Matches
            </button>
          </div>
        )}
      </div>

      {/* Events Grid with Visual Depth */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((evt) => {
            const theme = getCategoryTheme(evt.category?.name);
            const Icon = theme.icon;
            const regCount = (evt.registrations || []).length;
            const limit = evt.participant_limit || 100;

            return (
              <div
                key={evt.id}
                className={`group relative rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${theme.cardBorder} flex flex-col justify-between overflow-hidden`}
              >
                {/* Top Accent Gradient Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.accent}`}
                />

                <div className="space-y-3">
                  {/* Top Metadata Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg border ${theme.badge}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${theme.badge} truncate max-w-[200px]`}
                      >
                        {evt.category?.name || "Technical"}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      Day {evt.event_date?.includes("2026-09-25") ? "1" : "2"}
                    </span>
                  </div>

                  {/* Title & Department */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      {evt.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1 line-clamp-1">
                      {evt.school_or_dept}
                    </p>
                  </div>

                  {/* Schedule & Venue Specs */}
                  <div className="space-y-1.5 rounded-2xl bg-slate-50/80 p-3 text-xs text-slate-700 border border-slate-100">
                    <div className="flex items-center gap-2 font-semibold">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        {evt.event_date ? formatDate(evt.event_date) : "TBA"} •{" "}
                        {evt.start_time ? formatTime(evt.start_time) : ""} -{" "}
                        {evt.end_time ? formatTime(evt.end_time) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-800">{regCount}</span> /{" "}
                    {limit} Seats
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Multi-Event Select Toggle Button */}
                    <button
                      onClick={() => toggleEvent(evt)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        isEventSelected(evt.id)
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-indigo-50 text-primary hover:bg-indigo-100 border border-indigo-100"
                      }`}
                    >
                      {isEventSelected(evt.id) ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Select</span>
                        </>
                      )}
                    </button>

                    {/* View Details Modal Trigger */}
                    <button
                      onClick={() => {
                        setRegSuccessCode(null);
                        setRegError(null);
                        setActiveModalEvent(evt);
                      }}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer"
                      title="View full event details"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Events Match Your Filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No technical competitions match your current search query or filters.
          </p>
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Quick Registration & Event Details Modal */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            {/* Close Button */}
            <button
              onClick={() => setActiveModalEvent(null)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-primary border border-indigo-100">
                  {activeModalEvent.category?.name || "Track"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 border border-slate-200">
                  Day {activeModalEvent.event_date?.includes("2026-09-25") ? "1 (Sept 25)" : "2 (Sept 26)"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {activeModalEvent.name}
              </h2>
              <p className="text-xs font-bold text-slate-500">
                {activeModalEvent.school_or_dept}
              </p>
            </div>

            {/* Schedule & Venue Box */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Date &amp; Time
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {formatDate(activeModalEvent.event_date)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {formatTime(activeModalEvent.start_time)} -{" "}
                  {formatTime(activeModalEvent.end_time)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
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
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
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
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
                  Rules &amp; Eligibility
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

            {/* Success Alert */}
            {regSuccessCode && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Registration Confirmed!</span>
                </div>
                <p className="text-[11px]">
                  Your pass has been generated:{" "}
                  <strong className="font-mono text-emerald-950 font-bold">
                    {regSuccessCode}
                  </strong>
                </p>
                <div className="pt-1">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>View Digital Pass in Dashboard</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {regError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{regError}</span>
              </div>
            )}

            {/* Modal Action CTA */}
            {!regSuccessCode && (
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    toggleEvent(activeModalEvent);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    isEventSelected(activeModalEvent.id)
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  {isEventSelected(activeModalEvent.id) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>In Selection (Remove)</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      <span>Add to Selection</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveModalEvent(null)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleRegister(activeModalEvent.id)}
                    disabled={isRegistering}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isRegistering ? (
                      <span>Issuing Pass...</span>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Register Solo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
