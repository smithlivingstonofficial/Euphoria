"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  getAdminRegistrationsPaginatedAction,
  manualAttendanceCheckIn,
  refreshAdminRegistrationsCacheAction,
  exportAdminRegistrationsCsvAction,
  AdminRegistrationListItem,
  AdminRegistrationsMetrics,
} from "@/actions/admin";
import {
  Search,
  CheckCircle2,
  Users,
  Calendar,
  Building,
  FileSpreadsheet,
  QrCode,
  Clock,
  Check,
  Filter,
  RefreshCw,
  X,
  ExternalLink,
  Star,
  Layers,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Copy,
  Eye,
  Phone,
  Mail,
  Download,
  AlertCircle,
  CheckCheck,
} from "lucide-react";
import { formatTime, cn } from "@/lib/utils";

interface EventItem {
  id: string;
  name: string;
  school_or_dept: string;
  venue?: string;
  event_date?: string;
}

export function MasterRegistrationsClient({
  initialRegistrations,
  initialTotalCount,
  initialMetrics,
  allEvents,
}: {
  initialRegistrations: AdminRegistrationListItem[];
  initialTotalCount: number;
  initialMetrics?: AdminRegistrationsMetrics;
  allEvents: EventItem[];
}) {
  const [registrations, setRegistrations] = useState<AdminRegistrationListItem[]>(initialRegistrations);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [metrics, setMetrics] = useState<AdminRegistrationsMetrics>(
    initialMetrics || {
      totalBookings: initialTotalCount,
      proAllocations: 0,
      standardAllocations: initialTotalCount,
      verifiedAttendance: 0,
      needsAccommodation: 0,
    }
  );

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [jumpPage, setJumpPage] = useState<string>("");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "pro_pass" | "standard_pass">("all");
  const [selectedSlot, setSelectedSlot] = useState<"all" | "1" | "2">("all");
  const [selectedType, setSelectedType] = useState<"all" | "internal" | "external">("all");
  const [selectedAttendance, setSelectedAttendance] = useState<"all" | "attended" | "pending">("all");
  const [selectedAccommodation, setSelectedAccommodation] = useState<"all" | "requested" | "none">("all");

  // Loading & Action States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal & Inspector State
  const [selectedDossier, setSelectedDossier] = useState<AdminRegistrationListItem | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isInitialMount = useRef(true);

  // Search debounce (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Generate QR on modal open
  useEffect(() => {
    if (selectedDossier) {
      const codeToEncode = selectedDossier.pass?.pass_code || selectedDossier.registration_code;
      QRCode.toDataURL(codeToEncode, {
        width: 200,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(null));
    } else {
      setQrCodeDataUrl(null);
    }
  }, [selectedDossier]);

  // Data Fetcher
  const loadData = useCallback(
    async (
      targetPage: number,
      limit: number,
      search: string,
      eventId: string,
      tier: typeof selectedTier,
      slot: typeof selectedSlot,
      type: typeof selectedType,
      attendance: typeof selectedAttendance,
      accommodation: typeof selectedAccommodation
    ) => {
      setIsLoading(true);
      try {
        const res = await getAdminRegistrationsPaginatedAction({
          page: targetPage,
          limit,
          search,
          eventId,
          tier,
          slot,
          type,
          attendance,
          accommodation,
        });

        if (res.success) {
          setRegistrations(res.registrations);
          setTotalCount(res.totalCount);
          setPage(res.page);
          if (res.metrics) setMetrics(res.metrics);
        } else {
          setToastMessage({ type: "error", text: res.error || "Failed to load registrations." });
        }
      } catch {
        setToastMessage({ type: "error", text: "Network error loading data." });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadData(
      page,
      pageSize,
      debouncedSearch,
      selectedEventId,
      selectedTier,
      selectedSlot,
      selectedType,
      selectedAttendance,
      selectedAccommodation
    );
  }, [
    page,
    pageSize,
    debouncedSearch,
    selectedEventId,
    selectedTier,
    selectedSlot,
    selectedType,
    selectedAttendance,
    selectedAccommodation,
    loadData,
  ]);

  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setPage(1);
  };

  const applyPreset = (preset: string) => {
    setPage(1);
    switch (preset) {
      case "all":
        setSelectedEventId("all");
        setSelectedTier("all");
        setSelectedSlot("all");
        setSelectedType("all");
        setSelectedAttendance("all");
        setSelectedAccommodation("all");
        break;
      case "pro":
        setSelectedTier(selectedTier === "pro_pass" ? "all" : "pro_pass");
        break;
      case "pending":
        setSelectedAttendance(selectedAttendance === "pending" ? "all" : "pending");
        break;
      case "attended":
        setSelectedAttendance(selectedAttendance === "attended" ? "all" : "attended");
        break;
      case "accommodation":
        setSelectedAccommodation(selectedAccommodation === "requested" ? "all" : "requested");
        break;
      case "internal":
        setSelectedType(selectedType === "internal" ? "all" : "internal");
        break;
      case "external":
        setSelectedType(selectedType === "external" ? "all" : "external");
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedEventId("all");
    setSelectedTier("all");
    setSelectedSlot("all");
    setSelectedType("all");
    setSelectedAttendance("all");
    setSelectedAccommodation("all");
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedEventId !== "all" ||
    selectedTier !== "all" ||
    selectedSlot !== "all" ||
    selectedType !== "all" ||
    selectedAttendance !== "all" ||
    selectedAccommodation !== "all";

  // Manual Check-In
  const handleManualCheckIn = async (regId: string) => {
    const targetReg = registrations.find((r) => r.id === regId);
    const studentName = targetReg?.user?.full_name || "Participant";

    setProcessingId(regId);

    // Optimistic UI update
    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === regId
          ? {
              ...r,
              attendance: {
                id: "temp-" + Date.now(),
                scanned_at: new Date().toISOString(),
                scan_method: "manual_search",
              },
            }
          : r
      )
    );
    setMetrics((prev) => ({
      ...prev,
      verifiedAttendance: prev.verifiedAttendance + 1,
    }));

    if (selectedDossier && selectedDossier.id === regId) {
      setSelectedDossier((prev) =>
        prev
          ? {
              ...prev,
              attendance: {
                id: "temp-" + Date.now(),
                scanned_at: new Date().toISOString(),
                scan_method: "manual_search",
              },
            }
          : null
      );
    }

    try {
      const res = await manualAttendanceCheckIn(regId);
      if (res.success) {
        setToastMessage({
          type: "success",
          text: `Checked in ${studentName} successfully!`,
        });
      } else {
        setToastMessage({ type: "error", text: res.error || "Check-in failed" });
        loadData(
          page,
          pageSize,
          debouncedSearch,
          selectedEventId,
          selectedTier,
          selectedSlot,
          selectedType,
          selectedAttendance,
          selectedAccommodation
        );
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error during check-in" });
    } finally {
      setProcessingId(null);
    }
  };

  // Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAdminRegistrationsCacheAction();
      await loadData(
        page,
        pageSize,
        debouncedSearch,
        selectedEventId,
        selectedTier,
        selectedSlot,
        selectedType,
        selectedAttendance,
        selectedAccommodation
      );
      setToastMessage({
        type: "success",
        text: "Data refreshed successfully.",
      });
    } catch {
      setToastMessage({ type: "error", text: "Failed to refresh data." });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export page to CSV
  const handleExportCurrentPage = () => {
    const headers = [
      "Sl No",
      "Registration Code",
      "Pass Code",
      "Pass Tier",
      "Slot",
      "Name",
      "Gender",
      "Email",
      "Mobile",
      "Register No",
      "College Type",
      "College / Dept",
      "Course & Year",
      "Event",
      "Venue",
      "Hostel Required",
      "Attendance",
      "Time",
      "Date",
    ];

    const rows = registrations.map((r, idx) => {
      const isAttended = Array.isArray(r.attendance) ? r.attendance.length > 0 : Boolean(r.attendance);
      const scannedAt = Array.isArray(r.attendance) ? r.attendance[0]?.scanned_at : (r.attendance as any)?.scanned_at;
      const passTier = r.pass?.pass_tier === "pro_pass" || r.event?.is_pro_event ? "Pro Pass" : "Standard Pass";

      return [
        (page - 1) * pageSize + idx + 1,
        `"${r.registration_code}"`,
        `"${r.pass?.pass_code || r.registration_code}"`,
        `"${passTier}"`,
        r.slot_number || 1,
        `"${(r.user?.full_name || "").replace(/"/g, '""')}"`,
        `"${r.user?.gender ? r.user.gender.toUpperCase() : "N/A"}"`,
        `"${r.user?.email || ""}"`,
        `"${r.user?.mobile_number || ""}"`,
        `"${r.user?.register_number || ""}"`,
        `"${r.user?.participant_type === "internal" ? "KARE" : "External"}"`,
        `"${(r.user?.college_name || r.user?.department || "").replace(/"/g, '""')}"`,
        `"${r.user?.course || ""} Year ${r.user?.year_of_study || ""}"`,
        `"${(r.event?.name || "").replace(/"/g, '""')}"`,
        `"${r.event?.venue || ""}"`,
        r.needs_accommodation ? "Yes" : "No",
        `"${isAttended ? "Present" : "Pending"}"`,
        `"${scannedAt ? new Date(scannedAt).toLocaleTimeString() : ""}"`,
        `"${new Date(r.created_at).toLocaleDateString()}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registrations_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export all matching to CSV
  const handleExportFullCSV = async () => {
    setIsExporting(true);
    try {
      const res = await exportAdminRegistrationsCsvAction({
        eventId: selectedEventId,
        tier: selectedTier,
        slot: selectedSlot,
        type: selectedType,
      });

      if (res.success && res.csvString) {
        const blob = new Blob([res.csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename || "all_registrations.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setToastMessage({ type: "success", text: "CSV exported successfully!" });
      } else {
        setToastMessage({ type: "error", text: res.error || "Failed to export CSV." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Error downloading CSV file." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalCount);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const proRatio = metrics.totalBookings > 0
    ? Math.round((metrics.proAllocations / metrics.totalBookings) * 100)
    : 0;

  const attendanceRatio = metrics.totalBookings > 0
    ? Math.round((metrics.verifiedAttendance / metrics.totalBookings) * 100)
    : 0;

  return (
    <div className="space-y-3.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in duration-200">
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 shadow-lg border text-xs font-semibold backdrop-blur-md",
              toastMessage.type === "success"
                ? "bg-slate-900/95 text-emerald-300 border-slate-700"
                : "bg-rose-950/95 text-rose-200 border-rose-800"
            )}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-1.5 rounded-md p-0.5 hover:bg-white/10 text-white/70"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}


      {/* 4 Compact Cards - Simple English */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Bookings */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Bookings</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {metrics.totalBookings.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 flex items-center justify-between">
            <span>Across 61 events</span>
            <span className="font-semibold text-indigo-600">Slot 1 &amp; 2</span>
          </div>
        </div>

        {/* Card 2: Pro Passes */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-3 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Pro Passes</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Star className="h-4 w-4 fill-amber-500" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950 font-mono tracking-tight">
              {metrics.proAllocations.toLocaleString()}
            </span>
            <span className="text-xs text-amber-800 font-bold">{proRatio}% of total</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-800 border-t border-amber-100/80 pt-1.5 font-medium flex items-center justify-between">
            <span>₹300 pass holders</span>
            <span className="font-bold">Pro</span>
          </div>
        </div>

        {/* Card 3: Checked In */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Checked In</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {metrics.verifiedAttendance.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-700 font-bold">{attendanceRatio}% present</span>
          </div>
          <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, attendanceRatio))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Hostel Requests */}
        <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 p-3 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Hostel Requests</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-950 font-mono tracking-tight">
              {metrics.needsAccommodation.toLocaleString()}
            </span>
            <span className="text-xs text-purple-800 font-bold">Needs room</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-800 border-t border-purple-100/80 pt-1.5 font-medium flex items-center justify-between">
            <span>Pay on arrival</span>
            <span className="font-semibold text-purple-900">Hostel Desk</span>
          </div>
        </div>
      </div>

      {/* Search & Filters Toolbar with Integrated Actions */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs space-y-3">
        {/* Row 1: Search Bar & Action Buttons Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, pass code, email, college, event..."
              className="w-full h-9 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons & Page Size */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Show Limit */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 h-9 text-xs text-slate-600 font-bold shadow-2xs">
              <span className="text-slate-400 text-[11px] font-medium">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer pr-0.5"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Reset Filters (Only when filters are active) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 h-9 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 px-3 h-9 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              title="Refresh latest registrations"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", isRefreshing && "animate-spin text-indigo-600")} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {/* Scan QR Button */}
            <Link
              href="/coordinator/scanner"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 px-3 h-9 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98]"
              title="Open Camera QR Scanner desk"
            >
              <QrCode className="h-3.5 w-3.5 text-indigo-600" />
              <span>Scan QR</span>
            </Link>

            {/* Export CSV Split Button */}
            <div className="relative inline-flex items-center rounded-xl bg-slate-900 text-white shadow-xs overflow-hidden h-9 text-xs font-bold">
              <button
                type="button"
                onClick={handleExportCurrentPage}
                className="inline-flex items-center gap-1.5 px-3 h-full hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Download CSV for current ${registrations.length} rows`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export Page ({registrations.length})</span>
              </button>
              <div className="w-[1px] h-4 bg-white/20" />
              <button
                type="button"
                onClick={handleExportFullCSV}
                disabled={isExporting}
                className="inline-flex items-center gap-1 px-2.5 h-full hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                title="Download full CSV of all matching records"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-slate-300" />
                )}
                <span className="hidden sm:inline">All ({totalCount.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: 5 Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => handleFilterChange(setSelectedEventId, e.target.value)}
            className={`h-9 rounded-xl border px-2.5 text-xs font-medium focus:outline-none cursor-pointer truncate transition-all shadow-2xs ${
              selectedEventId !== "all"
                ? "border-indigo-400 bg-indigo-50/60 text-indigo-950 font-bold"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <option value="all">All 61 Events</option>
            {allEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name} ({evt.school_or_dept})
              </option>
            ))}
          </select>

          {/* Pass Tier */}
          <select
            value={selectedTier}
            onChange={(e) => handleFilterChange(setSelectedTier, e.target.value as any)}
            className={`h-9 rounded-xl border px-2.5 text-xs font-medium focus:outline-none cursor-pointer transition-all shadow-2xs ${
              selectedTier !== "all"
                ? "border-indigo-400 bg-indigo-50/60 text-indigo-950 font-bold"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <option value="all">All Passes</option>
            <option value="pro_pass">⭐ Pro Pass (₹300)</option>
            <option value="standard_pass">📌 Standard Pass (₹200)</option>
          </select>

          {/* Slot */}
          <select
            value={selectedSlot}
            onChange={(e) => handleFilterChange(setSelectedSlot, e.target.value as any)}
            className={`h-9 rounded-xl border px-2.5 text-xs font-medium focus:outline-none cursor-pointer transition-all shadow-2xs ${
              selectedSlot !== "all"
                ? "border-indigo-400 bg-indigo-50/60 text-indigo-950 font-bold"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <option value="all">All Slots</option>
            <option value="1">Slot 1</option>
            <option value="2">Slot 2</option>
          </select>

          {/* Attendance */}
          <select
            value={selectedAttendance}
            onChange={(e) => handleFilterChange(setSelectedAttendance, e.target.value as any)}
            className={`h-9 rounded-xl border px-2.5 text-xs font-medium focus:outline-none cursor-pointer transition-all shadow-2xs ${
              selectedAttendance !== "all"
                ? "border-indigo-400 bg-indigo-50/60 text-indigo-950 font-bold"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <option value="all">All Attendance</option>
            <option value="attended">Present</option>
            <option value="pending">Not Checked In</option>
          </select>

          {/* Hostel */}
          <select
            value={selectedAccommodation}
            onChange={(e) => handleFilterChange(setSelectedAccommodation, e.target.value as any)}
            className={`h-9 rounded-xl border px-2.5 text-xs font-medium focus:outline-none cursor-pointer transition-all col-span-2 sm:col-span-1 shadow-2xs ${
              selectedAccommodation !== "all"
                ? "border-indigo-400 bg-indigo-50/60 text-indigo-950 font-bold"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <option value="all">All Hostel</option>
            <option value="requested">Needs Hostel ({metrics.needsAccommodation})</option>
            <option value="none">No Hostel</option>
          </select>
        </div>

        {/* Row 3: Quick Filter Chips (Simple English) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 text-[11px] no-scrollbar">
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px]",
              !hasActiveFilters
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All ({metrics.totalBookings.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => applyPreset("pro")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] flex items-center gap-1",
              selectedTier === "pro_pass"
                ? "bg-amber-500 text-white shadow-2xs"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80"
            )}
          >
            <Star className="h-2.5 w-2.5 fill-current" />
            <span>Pro ({metrics.proAllocations.toLocaleString()})</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("attended")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] flex items-center gap-1",
              selectedAttendance === "attended"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/80"
            )}
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            <span>Checked In ({metrics.verifiedAttendance.toLocaleString()})</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("pending")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] flex items-center gap-1",
              selectedAttendance === "pending"
                ? "bg-slate-800 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <Clock className="h-2.5 w-2.5" />
            <span>Pending</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("accommodation")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] flex items-center gap-1",
              selectedAccommodation === "requested"
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200/80"
            )}
          >
            <Building className="h-2.5 w-2.5" />
            <span>Hostel ({metrics.needsAccommodation.toLocaleString()})</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("internal")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px]",
              selectedType === "internal"
                ? "bg-teal-600 text-white shadow-2xs"
                : "bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200/80"
            )}
          >
            KARE Students
          </button>
          <button
            type="button"
            onClick={() => applyPreset("external")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px]",
              selectedType === "external"
                ? "bg-violet-600 text-white shadow-2xs"
                : "bg-violet-50 text-violet-900 hover:bg-violet-100 border border-violet-200/80"
            )}
          >
            Other Colleges
          </button>
        </div>
      </div>

      {/* Table Ledger - Compact, Clear English */}
      <div className="relative rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-xs transition-opacity">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-md text-xs font-bold text-slate-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              <span>Loading records...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/90">
              <tr>
                <th className="px-3.5 py-2.5">Pass &amp; Slot</th>
                <th className="px-3.5 py-2.5">Participant</th>
                <th className="px-3.5 py-2.5">College</th>
                <th className="px-3.5 py-2.5">Event &amp; Venue</th>
                <th className="px-3.5 py-2.5">Hostel</th>
                <th className="px-3.5 py-2.5">Attendance</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {registrations.length > 0 ? (
                registrations.map((row) => {
                  const isAttended = Array.isArray(row.attendance)
                    ? row.attendance.length > 0
                    : Boolean(row.attendance);
                  const attendanceData = Array.isArray(row.attendance)
                    ? row.attendance[0]
                    : (row.attendance as any);
                  const isPro = row.pass?.pass_tier === "pro_pass" || row.event?.is_pro_event;
                  const studentName = row.user?.full_name || "Participant";

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Pass Code & Slot */}
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                              {row.registration_code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(row.registration_code)}
                              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-0.5"
                              title="Copy code"
                            >
                              {copiedCode === row.registration_code ? (
                                <CheckCheck className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {isPro ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300/80 font-black px-1.5 py-0.2 text-[9px]">
                                <Star className="h-2 w-2 fill-amber-500 text-amber-500" />
                                <span>PRO</span>
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[9px] font-bold">
                                STD
                              </span>
                            )}
                            <span className="rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.2 text-[9px] font-bold">
                              Slot #{row.slot_number || 1}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Participant */}
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200/80">
                            {getInitials(studentName)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1 truncate max-w-[180px]">
                              <span className="truncate">{studentName}</span>
                              {row.user?.gender && (
                                <span className="text-[10px] text-slate-400 font-medium uppercase shrink-0">
                                  ({row.user.gender[0]})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                              {row.user?.email || "No email"}
                            </div>
                            {row.user?.mobile_number && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                <span>{row.user.mobile_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* College */}
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="space-y-0.5 max-w-[180px]">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-bold border",
                              row.user?.participant_type === "internal"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-purple-50 text-purple-800 border-purple-200"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                row.user?.participant_type === "internal" ? "bg-emerald-500" : "bg-purple-500"
                              )}
                            />
                            <span>
                              {row.user?.participant_type === "internal" ? "KARE" : "External"}
                            </span>
                          </span>
                          <div
                            className="font-semibold text-slate-800 truncate text-[11px]"
                            title={row.user?.college_name || "Kalasalingam"}
                          >
                            {row.user?.college_name || row.user?.department || "Kalasalingam"}
                          </div>
                          {row.user?.register_number && (
                            <div className="text-[10px] font-mono text-slate-500">
                              {row.user.register_number}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Event */}
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="space-y-0.5 max-w-[190px]">
                          <div
                            className="font-bold text-slate-900 truncate text-xs"
                            title={row.event?.name}
                          >
                            {row.event?.name || "Event"}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{row.event?.venue || "Campus"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Hostel */}
                      <td className="px-3.5 py-2.5 align-middle">
                        {row.needs_accommodation ? (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                            <Building className="h-3 w-3 text-purple-600" />
                            <span>Requested</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="px-3.5 py-2.5 align-middle">
                        {isAttended ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Present</span>
                            </span>
                            {attendanceData?.scanned_at && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {formatTime(attendanceData.scanned_at.split("T")[1] || "")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDossier(row)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {!isAttended ? (
                            <button
                              type="button"
                              onClick={() => handleManualCheckIn(row.id)}
                              disabled={processingId === row.id}
                              className="inline-flex items-center gap-1 h-7 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                              title="Mark present"
                            >
                              {processingId === row.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              <span>Check In</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600 pr-1">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Filter className="h-4 w-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">No matching registrations</div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Compact Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/90 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-600">
          <div className="font-medium">
            Showing <span className="font-bold text-slate-900">{startItem.toLocaleString()}</span> to{" "}
            <span className="font-bold text-slate-900">{endItem.toLocaleString()}</span> of{" "}
            <span className="font-bold text-slate-900">{totalCount.toLocaleString()}</span> entries
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page <= 1 || isLoading}
              className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>Prev</span>
            </button>

            <div className="flex items-center px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800">
              <span>{page}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-slate-500">{totalPages}</span>
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || isLoading}
              className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>

            {/* Jump Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = parseInt(jumpPage, 10);
                if (!isNaN(p) && p >= 1 && p <= totalPages) {
                  setPage(p);
                  setJumpPage("");
                }
              }}
              className="flex items-center gap-1 ml-0.5"
            >
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                placeholder="Go"
                className="w-12 h-7 rounded-lg border border-slate-200 bg-white px-1 text-xs text-center font-bold text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Participant Details Modal - Simple & Clean */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-4.5 shadow-2xl border border-slate-200 space-y-3.5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {selectedDossier.registration_code}
                  </span>
                  {selectedDossier.pass?.pass_tier === "pro_pass" || selectedDossier.event?.is_pro_event ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-extrabold px-1.5 py-0.2 text-[9px]">
                      <Star className="h-2.5 w-2.5 fill-amber-500" />
                      <span>PRO PASS</span>
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[9px] font-bold">
                      STANDARD
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Participant details and pass status
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Code and Quick Check-in Banner */}
            <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
              <div className="bg-white p-1 rounded-lg border border-slate-200 shrink-0 shadow-2xs">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Pass QR"
                    className="h-20 w-20 object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center bg-slate-100 text-slate-400">
                    <QrCode className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {Array.isArray(selectedDossier.attendance)
                      ? selectedDossier.attendance.length > 0
                        ? "Present"
                        : "Not Checked In"
                      : selectedDossier.attendance
                      ? "Present"
                      : "Not Checked In"}
                  </div>
                </div>

                {!(
                  Array.isArray(selectedDossier.attendance)
                    ? selectedDossier.attendance.length > 0
                    : Boolean(selectedDossier.attendance)
                ) ? (
                  <button
                    type="button"
                    onClick={() => handleManualCheckIn(selectedDossier.id)}
                    disabled={processingId === selectedDossier.id}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {processingId === selectedDossier.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    <span>Check In Now</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-xs font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Checked In</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="space-y-2 text-xs">
              <div className="rounded-xl border border-slate-200 p-2.5 space-y-1.5 bg-slate-50/40 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="font-bold text-slate-900">{selectedDossier.user?.full_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-slate-700">{selectedDossier.user?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mobile:</span>
                  <span className="font-mono text-slate-700">{selectedDossier.user?.mobile_number || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Register No:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDossier.user?.register_number || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">College:</span>
                  <span className="font-medium text-slate-800">{selectedDossier.user?.college_name || "Kalasalingam"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Event:</span>
                  <span className="font-bold text-slate-900">{selectedDossier.event?.name || "Event"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Venue:</span>
                  <span className="font-medium text-slate-700">{selectedDossier.event?.venue || "Campus"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Slot:</span>
                  <span className="font-bold text-indigo-700">Slot #{selectedDossier.slot_number || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hostel:</span>
                  <span className="font-bold text-purple-700">{selectedDossier.needs_accommodation ? "Requested" : "No"}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => handleCopyCode(selectedDossier.registration_code)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedCode === selectedDossier.registration_code ? "Copied!" : "Copy Code"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
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
