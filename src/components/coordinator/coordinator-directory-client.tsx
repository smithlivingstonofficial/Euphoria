"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CoordinatorEventItem } from "@/actions/coordinator";
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  Sparkles,
  ArrowRight,
  UserCheck,
  Zap,
  FileText,
  X,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Star,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Globe,
  Download,
  AlertTriangle,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { CustomReportModal } from "./custom-report-modal";
import { exportOverallEventsSummaryCSVAction } from "@/actions/coordinator";

interface CoordinatorDirectoryClientProps {
  events: CoordinatorEventItem[];
  primaryRole?: "admin" | "staff" | "student" | "overall_coordinator" | string;
  isAdmin: boolean;
  isOverallCoordinator?: boolean;
  isReadOnly?: boolean;
}

export function CoordinatorDirectoryClient({
  events,
  primaryRole,
  isAdmin,
  isOverallCoordinator = false,
  isReadOnly = false,
}: CoordinatorDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "flagship" | "regular" | "with_delegates" | "today" | "pending"
  >("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "most_registered" | "schedule" | "name_asc" | "highest_attendance" | "first_slot"
  >("most_registered");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  // Custom Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportInitialEventId, setReportInitialEventId] = useState<string | undefined>(undefined);
  const [isExportingMasterCSV, setIsExportingMasterCSV] = useState(false);
  const [isConfirmMasterExportOpen, setIsConfirmMasterExportOpen] = useState(false);

  const handleConfirmExportMasterCSV = async () => {
    try {
      setIsExportingMasterCSV(true);
      const res = await exportOverallEventsSummaryCSVAction();
      if (!res.success || !res.csvContent) {
        alert(res.error || "Failed to generate master summary CSV");
        return;
      }
      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        res.filename || `euphoria_2026_all_events_summary_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsConfirmMasterExportOpen(false);
    } catch (err) {
      console.error("Master CSV Export Error:", err);
      alert("An error occurred while exporting master CSV.");
    } finally {
      setIsExportingMasterCSV(false);
    }
  };

  const itemsPerPage = 20;

  // Current date in IST format (YYYY-MM-DD)
  const todayIST = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }, []);

  // Unique schools with event counts
  const schoolOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const sch = e.school_or_dept?.trim() || "General";
      counts[sch] = (counts[sch] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // Quick tab counts
  const tabCounts = useMemo(() => {
    return {
      all: events.length,
      flagship: events.filter((e) => e.is_pro_event).length,
      regular: events.filter((e) => !e.is_pro_event).length,
      with_delegates: events.filter((e) => e.totalRegistrations > 0).length,
      today: events.filter((e) => e.event_date === todayIST).length,
      pending: events.filter(
        (e) => e.totalRegistrations > 0 && e.totalAttended < e.totalRegistrations
      ).length,
    };
  }, [events, todayIST]);

  // Filtered and Sorted Events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.school_or_dept?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.category?.name?.toLowerCase().includes(q)
      );
    }

    // 2. Active Tab Filter
    if (activeTab === "flagship") {
      result = result.filter((e) => e.is_pro_event);
    } else if (activeTab === "regular") {
      result = result.filter((e) => !e.is_pro_event);
    } else if (activeTab === "with_delegates") {
      result = result.filter((e) => e.totalRegistrations > 0);
    } else if (activeTab === "today") {
      result = result.filter((e) => e.event_date === todayIST);
    } else if (activeTab === "pending") {
      result = result.filter(
        (e) => e.totalRegistrations > 0 && e.totalAttended < e.totalRegistrations
      );
    }

    // 3. School Filter
    if (selectedSchool !== "all") {
      result = result.filter((e) => (e.school_or_dept?.trim() || "General") === selectedSchool);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === "most_registered") {
        return b.totalRegistrations - a.totalRegistrations;
      }
      if (sortBy === "highest_attendance") {
        const rateA = a.totalRegistrations > 0 ? a.totalAttended / a.totalRegistrations : 0;
        const rateB = b.totalRegistrations > 0 ? b.totalAttended / b.totalRegistrations : 0;
        return rateB - rateA || b.totalAttended - a.totalAttended;
      }
      if (sortBy === "schedule") {
        const dateA = `${a.event_date || "9999"} ${a.start_time || "99:99"}`;
        const dateB = `${b.event_date || "9999"} ${b.start_time || "99:99"}`;
        return dateA.localeCompare(dateB);
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "first_slot") {
        return (b.firstSlotCount || 0) - (a.firstSlotCount || 0);
      }
      return 0;
    });

    return result;
  }, [events, searchQuery, activeTab, selectedSchool, sortBy, todayIST]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    if (showAll) return filteredEvents;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage, showAll]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleSchoolChange = (val: string) => {
    setSelectedSchool(val);
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSelectedSchool("all");
    setSortBy("most_registered");
    setCurrentPage(1);
  };

  const isFilterActive =
    searchQuery.trim() !== "" || activeTab !== "all" || selectedSchool !== "all";
  const renderStatusSelect = (className?: string) => (
    <div className={`relative min-w-0 ${className || "w-full"}`}>
      <select
        value={activeTab}
        onChange={(e) => handleTabChange(e.target.value as any)}
        className={`w-full h-10 appearance-none rounded-xl border pl-3 pr-7 sm:pr-8 text-xs font-bold transition-all cursor-pointer truncate ${
          activeTab !== "all"
            ? activeTab === "flagship"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : activeTab === "regular"
              ? "border-indigo-300 bg-indigo-50 text-indigo-900"
              : activeTab === "with_delegates"
              ? "border-sky-300 bg-sky-50 text-sky-900"
              : activeTab === "today"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-rose-300 bg-rose-50 text-rose-900"
            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
        } focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20`}
      >
        <option value="all">All Assigned ({tabCounts.all})</option>
        <option value="flagship">⭐ Flagship ({tabCounts.flagship})</option>
        <option value="regular">⚡ Regular ({tabCounts.regular})</option>
        <option value="with_delegates">👥 Has Delegates ({tabCounts.with_delegates})</option>
        <option value="today">🟢 Happening Today ({tabCounts.today})</option>
        <option value="pending">⏳ Pending Check-Ins ({tabCounts.pending})</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
    </div>
  );

  const renderSchoolSelect = (className?: string) => (
    <div className={`relative min-w-0 ${className || "w-full"}`}>
      <select
        value={selectedSchool}
        onChange={(e) => handleSchoolChange(e.target.value)}
        title={selectedSchool !== "all" ? selectedSchool : "All Departments"}
        className={`w-full h-10 appearance-none rounded-xl border pl-3 pr-7 sm:pr-8 text-xs font-bold transition-all cursor-pointer truncate ${
          selectedSchool !== "all"
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
        } focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20`}
      >
        <option value="all">All Depts ({events.length})</option>
        {schoolOptions.map((sch) => (
          <option key={sch.name} value={sch.name}>
            {sch.name} ({sch.count})
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
    </div>
  );

  const renderSortSelect = (className?: string) => (
    <div className={`relative min-w-0 ${className || "w-full"}`}>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as any)}
        className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 sm:pr-8 text-xs font-bold text-slate-700 hover:bg-slate-100 focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer truncate"
      >
        <option value="most_registered">Most Registered</option>
        <option value="highest_attendance">Highest Turnout %</option>
        <option value="schedule">Schedule (Date)</option>
        <option value="name_asc">Name (A → Z)</option>
        {primaryRole !== "student" && (
          <option value="first_slot">1st Choice Count</option>
        )}
      </select>
      <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-3.5">
      {/* Controls & Search Toolbar */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-xs space-y-2 sm:space-y-2.5">
        {/* Row 1: Search & Desktop Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-2.5">
          {/* Search Input (Expands gracefully to occupy primary focus) */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by competition name, department, venue..."
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Controls (Inline on desktop >= lg) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {renderStatusSelect("w-[175px]")}
            {renderSchoolSelect("w-[175px]")}
            {renderSortSelect("w-[155px]")}

            {/* Reset button */}
            {isFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                title="Reset all filters"
                className="h-10 inline-flex items-center justify-center gap-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Reset</span>
              </button>
            )}

            {/* Custom Report Generator Button */}
            <button
              type="button"
              onClick={() => {
                setReportInitialEventId(undefined);
                setIsReportModalOpen(true);
              }}
              title="Generate Custom CSV Report with Selected Filters & Columns"
              className="h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Custom Report</span>
            </button>

            {/* Master 61-Events Summary Export (Overall Coordinator / Admin) */}
            {(isOverallCoordinator || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsConfirmMasterExportOpen(true)}
                disabled={isExportingMasterCSV}
                title="Export University-Wide 61-Events Summary CSV"
                className="h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100 text-xs font-bold text-indigo-900 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isExportingMasterCSV ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : (
                  <Download className="h-4 w-4 text-indigo-600" />
                )}
                <span className="hidden xl:inline">Master Summary CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile / Tablet Controls (< lg screens) */}
        {/* Row 2 on mobile: Status & Department side-by-side */}
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          {renderStatusSelect("w-full")}
          {renderSchoolSelect("w-full")}
        </div>

        {/* Row 3 on mobile: Sort & Action Buttons */}
        <div className="flex lg:hidden items-center gap-2">
          {renderSortSelect("flex-1")}

          <button
            type="button"
            onClick={() => {
              setReportInitialEventId(undefined);
              setIsReportModalOpen(true);
            }}
            title="Generate Custom CSV Report"
            className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer truncate"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Custom Report</span>
          </button>

          {(isOverallCoordinator || isAdmin) && (
            <button
              type="button"
              onClick={() => setIsConfirmMasterExportOpen(true)}
              disabled={isExportingMasterCSV}
              title="Export University-Wide 61-Events Summary CSV"
              className="h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100 text-xs font-bold text-indigo-900 shadow-2xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isExportingMasterCSV ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <Download className="h-3.5 w-3.5 text-indigo-600" />
              )}
              <span className="hidden sm:inline">Master CSV</span>
            </button>
          )}

          {isFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              title="Reset all filters"
              className="h-10 inline-flex items-center justify-center gap-1 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Header Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="font-semibold">
          Showing{" "}
          <strong className="text-slate-900">
            {showAll ? filteredEvents.length : paginatedEvents.length}
          </strong>{" "}
          of <strong className="text-slate-900">{filteredEvents.length}</strong> matching competitions{" "}
          {filteredEvents.length !== events.length && (
            <span className="text-slate-400">({events.length} total assigned)</span>
          )}
        </div>
        {filteredEvents.length > itemsPerPage && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            {showAll ? "Paginate Results" : `View All (${filteredEvents.length})`}
          </button>
        )}
      </div>

      {/* Competitions Display */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">No competitions found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No assigned competitions matched your search query or active filters. Try adjusting your
              search term or clearing filters.
            </p>
          </div>
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Filters &amp; Search</span>
          </button>
        </div>
      ) : (
        <>
          {/* MOBILE CARDS VIEW (< md screens) */}
          <div className="md:hidden space-y-2.5">
            {paginatedEvents.map((evt) => {
              const fillPct =
                evt.totalRegistrations > 0
                  ? Math.round((evt.totalAttended / evt.totalRegistrations) * 100)
                  : 0;
              const isLiveToday = evt.event_date === todayIST;

              return (
                <div
                  key={evt.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden space-y-2.5"
                >
                  {/* Top Badges & Turnout Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {evt.is_pro_event ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] px-2 py-0.5 shadow-2xs uppercase tracking-wider">
                          <Star className="h-2.5 w-2.5 fill-white" />
                          <span>Flagship</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold text-[9px] px-2 py-0.5 uppercase tracking-wider">
                          <Zap className="h-2.5 w-2.5 text-indigo-500" />
                          <span>Regular</span>
                        </span>
                      )}
                      {isLiveToday && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          <span>Today</span>
                        </span>
                      )}
                    </div>

                    {/* Turnout Pill */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                        fillPct > 0
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-2xs"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {fillPct}% Turnout
                    </span>
                  </div>

                  {/* Title & Department */}
                  <div>
                    <Link
                      href={`/coordinator/${evt.id}`}
                      className="font-extrabold text-slate-900 hover:text-primary text-sm leading-snug line-clamp-2 block"
                    >
                      {evt.name}
                    </Link>
                    <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                      {evt.school_or_dept || "Euphoria Competition"}
                    </p>
                  </div>

                  {/* Schedule & Venue row */}
                  <div className="flex items-center justify-between gap-2 text-xs py-2 border-y border-slate-100">
                    <div className="inline-flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>{evt.event_date ? formatDate(evt.event_date) : "Date TBA"}</span>
                      {evt.start_time && (
                        <span className="text-indigo-600 font-mono text-[10px]">
                          • {formatTime(evt.start_time)}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 truncate max-w-[150px]">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate" title={evt.venue || "Venue TBA"}>
                        {evt.venue || "Venue TBA"}
                      </span>
                    </div>
                  </div>

                  {/* Delegates & Progress Meter */}
                  <div className="space-y-1.5 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/90">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {evt.totalRegistrations}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">delegates</span>
                        {evt.firstSlotCount !== undefined && evt.firstSlotCount > 0 && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200/80 px-1.5 py-0.2 rounded">
                            ★ {evt.firstSlotCount} 1st
                          </span>
                        )}
                      </div>
                      <div className="text-right text-[11px] font-mono">
                        <span className="font-black text-emerald-950">{evt.totalAttended}</span>
                        <span className="text-slate-400"> / {evt.totalRegistrations} checked in</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-slate-200/90 overflow-hidden border border-emerald-100/80 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-sm shadow-emerald-500/40 transition-all duration-500"
                        style={{ width: `${Math.min(100, fillPct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                      <span>{Math.max(0, evt.totalRegistrations - evt.totalAttended)} remaining</span>
                      {fillPct === 100 && evt.totalRegistrations > 0 && (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> All Present
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <Link
                      href={`/coordinator/${evt.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    >
                      <span>{isReadOnly ? "View Roster" : "Open Roster"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    {!isReadOnly && !isOverallCoordinator && (
                      <Link
                        href={`/coordinator/scanner?event=${evt.id}`}
                        title="Launch Scanner"
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary hover:text-white text-primary font-bold text-xs py-2 px-3 transition-all cursor-pointer shadow-2xs"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Scan</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReportInitialEventId(evt.id);
                        setIsReportModalOpen(true);
                      }}
                      title="Custom CSV Report"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </button>

                    {evt.brochureUrl && (
                      <a
                        href={evt.brochureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Brochure PDF"
                        className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (>= md screens) */}
          <div className="hidden md:block rounded-2xl sm:rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Competition</th>
                    <th className="py-3.5 px-4">Schedule &amp; Venue</th>
                    <th className="py-3.5 px-4">Registrations</th>
                    <th className="py-3.5 px-4">Live Attendance</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEvents.map((evt) => {
                    const fillPct =
                      evt.totalRegistrations > 0
                        ? Math.round((evt.totalAttended / evt.totalRegistrations) * 100)
                        : 0;
                    const isLiveToday = evt.event_date === todayIST;

                    return (
                      <tr
                        key={evt.id}
                        className="hover:bg-gradient-to-r hover:from-slate-50/90 hover:via-indigo-50/20 hover:to-transparent transition-all duration-150 group"
                      >
                        {/* Name, Tier Badge & School */}
                        <td className="py-3.5 px-4 max-w-[320px]">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            {evt.is_pro_event ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] px-2 py-0.5 shadow-2xs uppercase tracking-wider">
                                <Star className="h-2.5 w-2.5 fill-white" />
                                <span>Flagship</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold text-[9px] px-2 py-0.5 uppercase tracking-wider">
                                <Zap className="h-2.5 w-2.5 text-indigo-500" />
                                <span>Regular</span>
                              </span>
                            )}
                            {isLiveToday && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span>Happening Today</span>
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/coordinator/${evt.id}`}
                            className="font-extrabold text-slate-900 hover:text-primary transition-colors text-sm line-clamp-1 block group-hover:translate-x-0.5 transition-transform"
                            title={evt.name}
                          >
                            {evt.name}
                          </Link>
                          <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5" title={evt.school_or_dept || "Euphoria Competition"}>
                            {evt.school_or_dept || "Euphoria Competition"}
                          </p>
                        </td>

                        {/* Schedule & Venue */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50/70 border border-indigo-100 text-indigo-950 font-bold text-[11px]">
                            <Calendar className="h-3 w-3 text-indigo-600 shrink-0" />
                            <span>{evt.event_date ? formatDate(evt.event_date) : "Date TBA"}</span>
                            {evt.start_time && (
                              <span className="text-indigo-600 font-mono text-[10px]">
                                • {formatTime(evt.start_time)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mt-1 max-w-[200px]">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate" title={evt.venue || "Venue TBA"}>
                              {evt.venue || "Venue TBA"}
                            </span>
                          </div>
                        </td>

                        {/* Delegates */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono font-black text-slate-900 text-base tracking-tight">
                              {evt.totalRegistrations}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              delegates
                            </span>
                          </div>
                          {evt.firstSlotCount !== undefined && evt.firstSlotCount > 0 ? (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-900">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              <span>{evt.firstSlotCount} (1st choice)</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                              0 first choice
                            </div>
                          )}
                        </td>

                        {/* Live Attendance Progress */}
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex items-baseline justify-between mb-1">
                            <div className="text-[11px] font-mono">
                              <span className="font-black text-emerald-950">
                                {evt.totalAttended}
                              </span>
                              <span className="text-slate-400 font-medium">
                                {" "}/ {evt.totalRegistrations}
                              </span>
                            </div>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border ${
                                fillPct > 0
                                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-2xs"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {fillPct}%
                            </span>
                          </div>
                          {/* Glowing Progress Bar */}
                          <div className="h-2 w-full rounded-full bg-slate-200/90 overflow-hidden border border-emerald-100/80 p-0.5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-sm shadow-emerald-500/40 transition-all duration-500"
                              style={{ width: `${Math.min(100, fillPct)}%` }}
                            />
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 mt-1 flex items-center justify-between">
                            <span>
                              {Math.max(0, evt.totalRegistrations - evt.totalAttended)} pending
                            </span>
                            {fillPct === 100 && evt.totalRegistrations > 0 && (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Complete
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/coordinator/${evt.id}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group-hover:scale-105"
                            >
                              <span>{isReadOnly ? "View Roster" : "Roster"}</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>

                            {/* Quick Custom Report Button for this specific event */}
                            <button
                              type="button"
                              onClick={() => {
                                setReportInitialEventId(evt.id);
                                setIsReportModalOpen(true);
                              }}
                              title={`Generate Custom CSV Report for ${evt.name}`}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2 transition-all cursor-pointer shadow-2xs"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                            </button>

                            {/* Scanner CTA: Available for staff/student/admin, restricted in read-only/overall coordinator mode */}
                            {!isReadOnly && !isOverallCoordinator && (
                              <Link
                                href={`/coordinator/scanner?event=${evt.id}`}
                                title="Open Scanner for this competition"
                                className="rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white text-primary p-2 transition-all cursor-pointer shadow-2xs"
                              >
                                <QrCode className="h-3.5 w-3.5" />
                              </Link>
                            )}

                            {evt.brochureUrl && (
                              <a
                                href={evt.brochureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Official Brochure PDF"
                                className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 transition-all cursor-pointer shadow-2xs"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination Footer */}
      {!showAll && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
          <p className="text-xs text-slate-500 font-medium">
            Page <strong className="text-slate-900">{currentPage}</strong> of{" "}
            <strong className="text-slate-900">{totalPages}</strong>
          </p>
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, index, array) => {
                  const prev = array[index - 1];
                  const hasGap = prev && p - prev > 1;

                  return (
                    <div key={p} className="flex items-center gap-1">
                      {hasGap && <span className="text-xs text-slate-400 px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentPage === p
                            ? "bg-primary text-white shadow-xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Reusable Custom CSV Report Modal with Granular Filters & Column Picker */}
      <CustomReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        roleType={(isOverallCoordinator ? "overall_coordinator" : primaryRole) as any}
        assignedEvent={
          events.length === 1
            ? { id: events[0].id, name: events[0].name, department: events[0].school_or_dept }
            : null
        }
        allEvents={events.map((e) => ({
          id: e.id,
          name: e.name,
          school_or_dept: e.school_or_dept,
        }))}
        initialEventId={reportInitialEventId}
      />

      {/* Master 61-Events Summary Export Confirmation Modal (Prevents Accidental Egress Spikes) */}
      {isConfirmMasterExportOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header Icon & Close */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0 shadow-2xs">
                <Download className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={() => !isExportingMasterCSV && setIsConfirmMasterExportOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                Download Master Summary Report?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to export university-wide telemetry aggregating registration counts and live check-in turnout across all{" "}
                <strong className="text-slate-800 font-bold">{events.length} competitions</strong>.
              </p>
            </div>

            {/* Egress Protection Warning Notice */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 sm:p-3.5 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Database Egress Optimization</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This query scans across all registration and attendance records in the database. Confirmation is required to prevent accidental mass downloads and save egress bandwidth.
              </p>
            </div>

            {/* Scope Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scope</span>
                <span className="font-black text-slate-900 text-xs mt-0.5 block">{events.length} Competitions</span>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Format</span>
                <span className="font-black text-slate-900 text-xs mt-0.5 block">Excel / CSV File</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmMasterExportOpen(false)}
                disabled={isExportingMasterCSV}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmExportMasterCSV}
                disabled={isExportingMasterCSV}
                className="flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingMasterCSV ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Querying &amp; Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Confirm Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
