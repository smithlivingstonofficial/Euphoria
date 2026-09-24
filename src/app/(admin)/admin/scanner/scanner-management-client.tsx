"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ScannerOverviewData,
  EventScannerItem,
  updateEventScannerSectionAction,
  configureEventScannerAction,
  bulkUpdateScannerSectionAction,
  toggleGlobalScannerMasterAction,
  toggleGlobalDateBypassAction,
  toggleEventEarlyScanAction,
  getEventSectionRosterAction,
  refreshAdminScannerCacheAction,
} from "@/actions/admin";
import {
  QrCode,
  Radio,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Calendar,
  CalendarClock,
  Sparkles,
  Layers,
  Lock,
  Unlock,
  RefreshCw,
  Users,
  Building,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Settings,
  Eye,
  Sun,
  Moon,
  Loader2,
  Play,
  Pause,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastState {
  type: "success" | "error";
  text: string;
}

type PendingAction =
  | {
      type: "switch_section";
      eventId: string;
      eventName: string;
      currentSection: number;
      targetSection: number;
      currentLabel: string;
      targetLabel: string;
    }
  | {
      type: "bulk_switch";
      targetSection: number;
      targetLabel: string;
      count: number;
    }
  | {
      type: "emergency_lock";
      nextMaster: boolean;
    }
  | {
      type: "toggle_status";
      eventId: string;
      eventName: string;
      newStatus: "active" | "paused" | "closed";
    }
  | {
      type: "toggle_date_bypass";
      nextBypass: boolean;
    }
  | {
      type: "toggle_event_early_scan";
      eventId: string;
      eventName: string;
      nextAllow: boolean;
    };

export function ScannerManagementClient({
  initialData,
}: {
  initialData: ScannerOverviewData;
}) {
  const [data, setData] = useState<ScannerOverviewData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastState | null>(null);

  // Fail-safe Confirmation Dialog State
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<"all" | "2026-09-25" | "2026-09-26">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "paused" | "closed">("all");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<"all" | "single_day" | "two_day">("all");
  const [selectedDept, setSelectedDept] = useState("all");

  // Selection for bulk actions
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Roster inspection modal
  const [inspectingEvent, setInspectingEvent] = useState<EventScannerItem | null>(null);
  const [rosterData, setRosterData] = useState<any[] | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState<"all" | "morning_only" | "afternoon_only" | "both" | "absent">("all");

  // Configure modal
  const [configuringEvent, setConfiguringEvent] = useState<EventScannerItem | null>(null);
  const [configTotalSections, setConfigTotalSections] = useState(2);
  const [configSectionLabels, setConfigSectionLabels] = useState<string[]>(["Morning Section", "Afternoon Section"]);
  const [configAllowStaff, setConfigAllowStaff] = useState(true);
  const [configStatus, setConfigStatus] = useState<"active" | "paused" | "closed">("active");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Manual Cache Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAdminScannerCacheAction();
      showToast("Refreshed scanner cache successfully.");
    } catch {
      showToast("Failed to refresh scanner cache", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Distinct departments
  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    data.events.forEach((e) => {
      if (e.school_or_dept) set.add(e.school_or_dept);
    });
    return Array.from(set).sort();
  }, [data.events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return data.events.filter((evt) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = evt.name.toLowerCase().includes(q);
        const matchesDept = evt.school_or_dept.toLowerCase().includes(q);
        const matchesVenue = evt.venue.toLowerCase().includes(q);
        if (!matchesName && !matchesDept && !matchesVenue) return false;
      }

      if (selectedDate !== "all" && evt.event_date !== selectedDate) return false;
      if (selectedStatus !== "all" && evt.scanner_status !== selectedStatus) return false;
      if (selectedSectionFilter === "two_day" && !evt.is_two_day) return false;
      if (selectedSectionFilter === "single_day" && evt.is_two_day) return false;
      if (selectedDept !== "all" && evt.school_or_dept !== selectedDept) return false;

      return true;
    });
  }, [data.events, searchQuery, selectedDate, selectedStatus, selectedSectionFilter, selectedDept]);

  // Request Section Switch (Opens Fail-Safe Modal)
  const requestSectionSwitch = (evt: EventScannerItem, targetSection: number) => {
    if (evt.current_section === targetSection && evt.scanner_status === "active") {
      return; // Already active on this section
    }

    const currentLabel = evt.section_labels[evt.current_section - 1] || `Section ${evt.current_section}`;
    const targetLabel = evt.section_labels[targetSection - 1] || `Section ${targetSection}`;

    setPendingAction({
      type: "switch_section",
      eventId: evt.id,
      eventName: evt.name,
      currentSection: evt.current_section,
      targetSection,
      currentLabel,
      targetLabel,
    });
  };

  // Request Bulk Section Switch (Opens Fail-Safe Modal)
  const requestBulkSwitch = (targetSection: number) => {
    const targetIds = selectedEventIds.length > 0 ? selectedEventIds : filteredEvents.map((e) => e.id);
    if (targetIds.length === 0) return;

    const label = targetSection === 1 ? "Morning Section (1)" : "Afternoon Section (2)";

    setPendingAction({
      type: "bulk_switch",
      targetSection,
      targetLabel: label,
      count: targetIds.length,
    });
  };

  // Request Master Lock/Unlock (Opens Fail-Safe Modal)
  const requestToggleMaster = () => {
    setPendingAction({
      type: "emergency_lock",
      nextMaster: !data.masterEnabled,
    });
  };

  // Request Global Date Lock Bypass (Opens Fail-Safe Modal)
  const requestToggleGlobalDateBypass = () => {
    setPendingAction({
      type: "toggle_date_bypass",
      nextBypass: !data.globalDateBypass,
    });
  };

  // Request Per-Event Early Scan (Opens Fail-Safe Modal)
  const requestToggleEventEarlyScan = (evt: EventScannerItem) => {
    setPendingAction({
      type: "toggle_event_early_scan",
      eventId: evt.id,
      eventName: evt.name,
      nextAllow: !evt.allow_early_scan,
    });
  };

  // Request Pause/Resume (Opens Fail-Safe Modal)
  const requestToggleStatus = (evt: EventScannerItem) => {
    const newStatus = evt.scanner_status === "active" ? "paused" : "active";
    setPendingAction({
      type: "toggle_status",
      eventId: evt.id,
      eventName: evt.name,
      newStatus,
    });
  };

  // Execute Confirmed Fail-Safe Action
  const executePendingAction = () => {
    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);

    if (action.type === "switch_section") {
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) => {
          if (e.id === action.eventId) {
            return {
              ...e,
              current_section: action.targetSection,
              scanner_status: "active",
            };
          }
          return e;
        }),
      }));

      startTransition(async () => {
        const res = await updateEventScannerSectionAction({
          eventId: action.eventId,
          targetSection: action.targetSection,
          scannerStatus: "active",
        });

        if (res.success) {
          showToast(`Activated ${action.targetLabel} for "${action.eventName}". Previous sections locked.`);
        } else {
          showToast(res.error || "Failed to switch section", "error");
        }
      });
    } else if (action.type === "bulk_switch") {
      const targetIds = selectedEventIds.length > 0 ? selectedEventIds : filteredEvents.map((e) => e.id);

      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) => {
          if (targetIds.includes(e.id)) {
            return {
              ...e,
              current_section: Math.min(action.targetSection, e.total_sections),
              scanner_status: "active",
            };
          }
          return e;
        }),
      }));

      startTransition(async () => {
        const res = await bulkUpdateScannerSectionAction({
          eventIds: targetIds,
          targetSection: action.targetSection,
          scannerStatus: "active",
        });

        if (res.success) {
          showToast(`Switched ${targetIds.length} event(s) to ${action.targetLabel}!`);
          setSelectedEventIds([]);
        } else {
          showToast(res.error || "Bulk switch failed", "error");
        }
      });
    } else if (action.type === "emergency_lock") {
      setData((prev) => ({
        ...prev,
        masterEnabled: action.nextMaster,
      }));

      startTransition(async () => {
        const res = await toggleGlobalScannerMasterAction({
          masterEnabled: action.nextMaster,
        });

        if (res.success) {
          showToast(res.message || "Master scanner system updated");
        } else {
          showToast(res.error || "Failed to toggle master switch", "error");
        }
      });
    } else if (action.type === "toggle_status") {
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) => {
          if (e.id === action.eventId) {
            return { ...e, scanner_status: action.newStatus };
          }
          return e;
        }),
      }));

      startTransition(async () => {
        const res = await updateEventScannerSectionAction({
          eventId: action.eventId,
          targetSection: data.events.find((e) => e.id === action.eventId)?.current_section || 1,
          scannerStatus: action.newStatus,
        });

        if (res.success) {
          showToast(`Scanner for "${action.eventName}" is now ${action.newStatus.toUpperCase()}.`);
        } else {
          showToast(res.error || "Failed to update status", "error");
        }
      });
    } else if (action.type === "toggle_date_bypass") {
      setData((prev) => ({
        ...prev,
        globalDateBypass: action.nextBypass,
      }));

      startTransition(async () => {
        const res = await toggleGlobalDateBypassAction({
          bypassEnabled: action.nextBypass,
        });

        if (res.success) {
          showToast(res.message || "Global date bypass updated.");
        } else {
          showToast(res.error || "Failed to update global date bypass", "error");
        }
      });
    } else if (action.type === "toggle_event_early_scan") {
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) => {
          if (e.id === action.eventId) {
            return { ...e, allow_early_scan: action.nextAllow };
          }
          return e;
        }),
      }));

      startTransition(async () => {
        const res = await toggleEventEarlyScanAction({
          eventId: action.eventId,
          allowEarlyScan: action.nextAllow,
        });

        if (res.success) {
          showToast(res.message || `Early scan for "${action.eventName}" updated.`);
        } else {
          showToast(res.error || "Failed to update early scan", "error");
        }
      });
    }
  };

  // Inspect Event Roster
  const handleOpenRoster = async (evt: EventScannerItem) => {
    setInspectingEvent(evt);
    setIsLoadingRoster(true);
    setRosterData(null);
    setRosterSearch("");
    setRosterFilter("all");

    const res = await getEventSectionRosterAction(evt.id);
    if (res.success && res.roster) {
      setRosterData(res.roster);
    } else {
      showToast(res.error || "Failed to load roster", "error");
    }
    setIsLoadingRoster(false);
  };

  // Open Configure Modal
  const handleOpenConfigure = (evt: EventScannerItem) => {
    setConfiguringEvent(evt);
    setConfigTotalSections(evt.total_sections);
    setConfigSectionLabels([...evt.section_labels]);
    setConfigAllowStaff(evt.allow_staff_switch);
    setConfigStatus(evt.scanner_status);
  };

  // Save Configure Modal
  const handleSaveConfigure = () => {
    if (!configuringEvent) return;

    const labels = configSectionLabels.slice(0, configTotalSections);

    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id === configuringEvent.id) {
          return {
            ...e,
            total_sections: configTotalSections,
            section_labels: labels,
            allow_staff_switch: configAllowStaff,
            scanner_status: configStatus,
          };
        }
        return e;
      }),
    }));

    startTransition(async () => {
      const res = await configureEventScannerAction({
        eventId: configuringEvent.id,
        totalSections: configTotalSections,
        currentSection: configuringEvent.current_section > configTotalSections ? 1 : configuringEvent.current_section,
        sectionLabels: labels,
        allowStaffSwitch: configAllowStaff,
        scannerStatus: configStatus,
      });

      if (res.success) {
        showToast(`Saved configuration for "${configuringEvent.name}".`);
        setConfiguringEvent(null);
      } else {
        showToast(res.error || "Failed to save configuration", "error");
      }
    });
  };

  // Export Section Attendance CSV
  const handleExportRosterCSV = () => {
    if (!inspectingEvent || !rosterData) return;

    const headers = ["Registration Code", "Participant Name", "College", "Email", "Phone", "Sections Attended", "Overall Status"];
    const rows = rosterData.map((r) => [
      r.registrationCode,
      `"${(r.studentName || "").replace(/"/g, '""')}"`,
      `"${(r.collegeName || "").replace(/"/g, '""')}"`,
      r.email,
      r.phone,
      r.sectionsAttended.length > 0 ? r.sectionsAttended.map((s: number) => `Section ${s}`).join("; ") : "None",
      r.status === "attended" ? "Present" : "Absent",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_${inspectingEvent.slug}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded section attendance roster CSV!");
  };

  // Filtered Roster Rows
  const filteredRoster = useMemo(() => {
    if (!rosterData) return [];
    return rosterData.filter((r) => {
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase();
        const matchesCode = (r.registrationCode || "").toLowerCase().includes(q);
        const matchesName = (r.studentName || "").toLowerCase().includes(q);
        const matchesCollege = (r.collegeName || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesCollege) return false;
      }

      if (rosterFilter === "morning_only") {
        return r.sectionsAttended.includes(1) && !r.sectionsAttended.includes(2);
      }
      if (rosterFilter === "afternoon_only") {
        return !r.sectionsAttended.includes(1) && r.sectionsAttended.includes(2);
      }
      if (rosterFilter === "both") {
        return r.sectionsAttended.includes(1) && r.sectionsAttended.includes(2);
      }
      if (rosterFilter === "absent") {
        return r.sectionsAttended.length === 0;
      }
      return true;
    });
  }, [rosterData, rosterFilter, rosterSearch]);

  // Compact section label helper
  const getCompactLabel = (label: string) => {
    const clean = label.trim();
    if (clean === "Morning Section") return "Morning";
    if (clean === "Afternoon Section") return "Afternoon";
    if (clean.startsWith("Day 1 - Morning")) return "D1 Morning";
    if (clean.startsWith("Day 1 - Afternoon")) return "D1 Afternoon";
    if (clean.startsWith("Day 2 - Morning")) return "D2 Morning";
    if (clean.startsWith("Day 2 - Afternoon")) return "D2 Afternoon";
    if (clean.length > 15) {
      return clean.replace(/Section/i, "").trim();
    }
    return clean;
  };

  // Select all / Deselect all
  const isAllSelected = filteredEvents.length > 0 && selectedEventIds.length === filteredEvents.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(filteredEvents.map((e) => e.id));
    }
  };

  const toggleSelectEvent = (id: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-3.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-lg border text-xs font-semibold backdrop-blur-md",
              toastMessage.type === "success"
                ? "bg-slate-900/95 text-emerald-300 border-slate-700"
                : "bg-rose-950/95 text-rose-200 border-rose-800"
            )}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 rounded-md p-0.5 hover:bg-white/10 text-white/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4 KPI Cards - Scanner Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Master Gate Scanner */}
        <div
          className={cn(
            "rounded-2xl border p-3.5 shadow-xs transition-all flex flex-col justify-between",
            data.masterEnabled
              ? "border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30"
              : "border-rose-200/90 bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Master Gate Scanner
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                data.masterEnabled
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-rose-100 text-rose-800 border border-rose-200"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  data.masterEnabled ? "bg-emerald-600 animate-ping" : "bg-rose-600"
                )}
              />
              {data.masterEnabled ? "Online" : "Locked"}
            </span>
          </div>

          <div className="my-2">
            <div
              className={cn(
                "text-xl font-black font-display tracking-tight flex items-center gap-2",
                data.masterEnabled ? "text-emerald-950" : "text-rose-950"
              )}
            >
              {data.masterEnabled ? "Live & Scanning" : "Emergency Lockout"}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data.masterEnabled ? "All camera desks operational" : "Check-ins blocked campus-wide"}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                Gate Power:
              </span>
              <button
                type="button"
                onClick={requestToggleMaster}
                disabled={isPending}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 inline-flex items-center gap-1",
                  data.masterEnabled
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                {data.masterEnabled ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span>{data.masterEnabled ? "Emergency Lock" : "Activate All"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
              <span className="text-[11px] font-medium text-slate-500">
                Calendar Lock:
              </span>
              <button
                type="button"
                onClick={requestToggleGlobalDateBypass}
                disabled={isPending}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 inline-flex items-center gap-1",
                  data.globalDateBypass
                    ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                )}
                title="Bypass calendar restrictions to open all gate scanners early"
              >
                <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                <span>{data.globalDateBypass ? "Date Bypass ON" : "Enforce Dates"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Active Scanners */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Scanners
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight flex items-baseline gap-1.5">
              <span>{data.metrics.activeScanners}</span>
              <span className="text-xs font-normal text-slate-500 font-sans">
                of {data.metrics.totalEvents} events active
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data.metrics.twoDayEventsCount} two-day events (4 rounds)
            </div>
          </div>
          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <span>Paused: <strong className="text-slate-700">{data.metrics.pausedScanners}</strong></span>
            <span className="font-semibold text-indigo-600">61 Registered Desks</span>
          </div>
        </div>

        {/* Card 3: Morning Section Turnout */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-3.5 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Morning Sections
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Sun className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-950 font-mono tracking-tight">
                {data.metrics.morningAttendanceTotal.toLocaleString()}
              </span>
              <span className="text-xs text-amber-800 font-bold">Checked In</span>
            </div>
            <div className="text-[11px] text-amber-800/80 mt-0.5">
              Section 1 scan records
            </div>
          </div>
          <div className="pt-2 text-[11px] text-amber-800 border-t border-amber-100/80 font-medium flex items-center justify-between">
            <span>Stage: Prelims</span>
            <span className="font-bold text-amber-900">Morning Session</span>
          </div>
        </div>

        {/* Card 4: Afternoon Section Turnout */}
        <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 p-3.5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
              Afternoon Sections
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Moon className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-purple-950 font-mono tracking-tight">
                {data.metrics.afternoonAttendanceTotal.toLocaleString()}
              </span>
              <span className="text-xs text-purple-800 font-bold">Checked In</span>
            </div>
            <div className="text-[11px] text-purple-800/80 mt-0.5">
              Section 2 scan records
            </div>
          </div>
          <div className="pt-2 text-[11px] text-purple-800 border-t border-purple-100/80 font-medium flex items-center justify-between">
            <span>Stage: Finals</span>
            <span className="font-bold text-purple-900">Afternoon Session</span>
          </div>
        </div>
      </div>

      {/* Unified Search, Filter & Bulk Command Toolbar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs space-y-2.5">
        {/* Row 1: Search & Bulk Action Shortcuts */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Search Box - Perfect h-10 Height */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event name, venue, department..."
              className="w-full h-10 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-medium shadow-2xs"
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

          {/* Quick Bulk Action Buttons & Tools */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Segmented Bulk Shift Control */}
            <div className="h-10 flex items-center gap-1 bg-slate-100/90 px-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-600 px-1 hidden sm:inline">
                {selectedEventIds.length > 0 ? `Shift (${selectedEventIds.length}):` : "Bulk Shift:"}
              </span>
              <button
                type="button"
                onClick={() => requestBulkSwitch(1)}
                disabled={isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-amber-900 border border-amber-200/70 shadow-2xs hover:bg-amber-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Activate Morning Section (1) for matching events"
              >
                <Sun className="h-3.5 w-3.5 text-amber-600" />
                <span>Morning (Sec 1)</span>
              </button>
              <button
                type="button"
                onClick={() => requestBulkSwitch(2)}
                disabled={isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-purple-900 border border-purple-200/70 shadow-2xs hover:bg-purple-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Activate Afternoon Section (2) for matching events and seal morning"
              >
                <Moon className="h-3.5 w-3.5 text-purple-600" />
                <span>Afternoon (Sec 2)</span>
              </button>
            </div>

            {/* Global Date Bypass / Rehearsal Mode Toggle Button */}
            <button
              type="button"
              onClick={requestToggleGlobalDateBypass}
              disabled={isPending}
              className={cn(
                "h-10 px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50",
                data.globalDateBypass
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/40"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90"
              )}
              title="Toggle Global Date Lock Bypass for pre-fest rehearsal & drills"
            >
              <CalendarClock className={cn("h-4 w-4", data.globalDateBypass ? "text-white animate-pulse" : "text-amber-600")} />
              <span>{data.globalDateBypass ? "⚡ Date Bypass: ON" : "Date Lock: STRICT"}</span>
            </button>

            {/* Refresh Cache Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 px-3 h-10 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              title="Refresh Vercel edge scanner cache"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", isRefreshing && "animate-spin text-indigo-600")} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
            </button>

            {/* Scanner Link */}
            <Link
              href="/coordinator/scanner"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 px-3.5 h-10 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98]"
              title="Open Live Scanner Desk"
            >
              <QrCode className="h-3.5 w-3.5 text-indigo-600" />
              <span>Scanner Desk</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Filter Selectors (Flex Containers - Guaranteed Zero Overlap) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2.5 border-t border-slate-100">
          {/* Date Filter */}
          <div
            className={cn(
              "relative flex items-center h-10 rounded-xl border shadow-2xs transition-all",
              selectedDate !== "all"
                ? "border-indigo-400 bg-indigo-50/60"
                : "border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300"
            )}
          >
            <label htmlFor="filter-date" className="pl-3 pr-2 flex items-center cursor-pointer shrink-0">
              <Calendar className={cn("h-4 w-4", selectedDate !== "all" ? "text-indigo-600" : "text-slate-400")} />
            </label>
            <select
              id="filter-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value as any)}
              className={cn(
                "w-full h-full bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-8 appearance-none truncate",
                selectedDate !== "all" ? "text-indigo-950 font-bold" : "text-slate-700"
              )}
            >
              <option value="all">All Dates (25 &amp; 26 Sep)</option>
              <option value="2026-09-25">Day 1 — 25 Sep 2026</option>
              <option value="2026-09-26">Day 2 — 26 Sep 2026</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
          </div>

          {/* Section Model */}
          <div
            className={cn(
              "relative flex items-center h-10 rounded-xl border shadow-2xs transition-all",
              selectedSectionFilter !== "all"
                ? "border-indigo-400 bg-indigo-50/60"
                : "border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300"
            )}
          >
            <label htmlFor="filter-format" className="pl-3 pr-2 flex items-center cursor-pointer shrink-0">
              <Layers className={cn("h-4 w-4", selectedSectionFilter !== "all" ? "text-indigo-600" : "text-slate-400")} />
            </label>
            <select
              id="filter-format"
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value as any)}
              className={cn(
                "w-full h-full bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-8 appearance-none truncate",
                selectedSectionFilter !== "all" ? "text-indigo-950 font-bold" : "text-slate-700"
              )}
            >
              <option value="all">All Event Formats</option>
              <option value="single_day">Single Day (2 Sections: M/A)</option>
              <option value="two_day">2-Day Events (4 Sections)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
          </div>

          {/* Status Filter */}
          <div
            className={cn(
              "relative flex items-center h-10 rounded-xl border shadow-2xs transition-all",
              selectedStatus !== "all"
                ? "border-indigo-400 bg-indigo-50/60"
                : "border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300"
            )}
          >
            <label htmlFor="filter-status" className="pl-3 pr-2 flex items-center cursor-pointer shrink-0">
              <Radio className={cn("h-4 w-4", selectedStatus !== "all" ? "text-indigo-600" : "text-slate-400")} />
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className={cn(
                "w-full h-full bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-8 appearance-none truncate",
                selectedStatus !== "all" ? "text-indigo-950 font-bold" : "text-slate-700"
              )}
            >
              <option value="all">All Scanner States</option>
              <option value="active">Active Scanners Only</option>
              <option value="paused">Paused Scanners</option>
              <option value="closed">Closed Scanners</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
          </div>

          {/* Department Filter */}
          <div
            className={cn(
              "relative flex items-center h-10 rounded-xl border shadow-2xs transition-all",
              selectedDept !== "all"
                ? "border-indigo-400 bg-indigo-50/60"
                : "border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300"
            )}
          >
            <label htmlFor="filter-dept" className="pl-3 pr-2 flex items-center cursor-pointer shrink-0">
              <Building className={cn("h-4 w-4", selectedDept !== "all" ? "text-indigo-600" : "text-slate-400")} />
            </label>
            <select
              id="filter-dept"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className={cn(
                "w-full h-full bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-8 appearance-none truncate",
                selectedDept !== "all" ? "text-indigo-950 font-bold" : "text-slate-700"
              )}
            >
              <option value="all">All Departments ({allDepartments.length})</option>
              {allDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
          </div>
        </div>
      </div>

      {/* Global Date Bypass Notice Banner */}
      {data.globalDateBypass && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 p-3 sm:p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-200/90 border border-amber-300 flex items-center justify-center shrink-0 text-amber-900 shadow-2xs">
              <Sparkles className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>Campus-wide Date Lock Bypass Active</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-amber-200 text-amber-900 border border-amber-300">
                  Rehearsal Mode
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                All 61 event gate scanners are accessible to volunteers today regardless of scheduled calendar dates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestToggleGlobalDateBypass}
            disabled={isPending}
            className="h-8 px-3 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs transition-colors self-start sm:self-auto"
          >
            Re-enable Date Lock
          </button>
        </div>
      )}

      {/* Events Scanner Ledger Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              title="Select all filtered events"
            />
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">
                Event Section Controllers ({filteredEvents.length} of {data.events.length})
              </span>
              {selectedEventIds.length > 0 && (
                <span className="rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">
                  {selectedEventIds.length} Selected
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Protected with fail-safe confirmation to prevent accidental round closures.
          </div>
        </div>

        {/* Event Rows */}
        <div className="divide-y divide-slate-100">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No events found matching current search and filter criteria.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isSelected = selectedEventIds.includes(evt.id);

              return (
                <div
                  key={evt.id}
                  className={cn(
                    "p-3 sm:p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col xl:flex-row xl:items-center justify-between gap-3",
                    isSelected && "bg-indigo-50/30"
                  )}
                >
                  {/* Left Column: Selection & Event Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectEvent(evt.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />

                    <div className="flex-1">
                      {/* Event Title & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 font-display">
                          {evt.name}
                        </span>
                        {evt.is_two_day && (
                          <span className="rounded-md bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            2-Day (4 Secs)
                          </span>
                        )}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            evt.scanner_status === "active"
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                              : evt.scanner_status === "paused"
                              ? "bg-amber-50 border border-amber-200 text-amber-700"
                              : "bg-slate-100 border border-slate-200 text-slate-600"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              evt.scanner_status === "active"
                                ? "bg-emerald-500"
                                : evt.scanner_status === "paused"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            )}
                          />
                          {evt.scanner_status}
                        </span>
                        {evt.allow_early_scan && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 shadow-2xs">
                            <Sparkles className="h-3 w-3 text-amber-600 fill-amber-500" />
                            <span>Early Scan Open</span>
                          </span>
                        )}
                      </div>

                      {/* Clean Subtitle Metadata */}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-medium text-slate-600 truncate max-w-[220px]" title={evt.school_or_dept}>
                          {evt.school_or_dept}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="truncate max-w-[180px]" title={evt.venue}>
                          {evt.venue}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="whitespace-nowrap">{evt.event_date}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-700 whitespace-nowrap">
                          {evt.total_registered} Registered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Sleek Segmented Section Controller */}
                  <div className="shrink-0 flex items-center">
                    <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs gap-1">
                      {evt.section_labels.map((label, idx) => {
                        const secNum = idx + 1;
                        const isActive = evt.current_section === secNum && evt.scanner_status === "active";
                        const isPast = evt.current_section > secNum;
                        const attendeesCount = evt.section_counts[secNum] || 0;
                        const compactLabel = getCompactLabel(label);
                        const isMorning = label.toLowerCase().includes("morning") || secNum % 2 !== 0;

                        return (
                          <button
                            key={secNum}
                            type="button"
                            onClick={() => requestSectionSwitch(evt, secNum)}
                            disabled={isPending}
                            title={
                              isActive
                                ? `${label} is currently active and scanning!`
                                : `Click to activate ${label} (will prompt for confirmation)`
                            }
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
                              isActive
                                ? "bg-emerald-600 text-white font-bold shadow-xs ring-1 ring-emerald-400/40"
                                : isPast
                                ? "bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/50"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                            )}
                          >
                            {isActive ? (
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                              </span>
                            ) : isPast ? (
                              <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                            ) : isMorning ? (
                              <Sun className="h-3 w-3 text-amber-500 shrink-0" />
                            ) : (
                              <Moon className="h-3 w-3 text-purple-500 shrink-0" />
                            )}

                            <span className="whitespace-nowrap">{compactLabel}</span>

                            <span
                              className={cn(
                                "rounded px-1.5 py-0.2 text-[10px] font-mono leading-tight",
                                isActive
                                  ? "bg-white/20 text-white font-bold"
                                  : isPast
                                  ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/50"
                                  : "bg-slate-200/70 text-slate-600 font-medium"
                              )}
                            >
                              {attendeesCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Actions (Status Toggle, Inspect Roster, Configure) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status Toggle (Play/Pause) */}
                    <button
                      type="button"
                      onClick={() => requestToggleStatus(evt)}
                      className={cn(
                        "h-8 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs",
                        evt.scanner_status === "active"
                          ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      )}
                      title={evt.scanner_status === "active" ? "Pause Scanner" : "Resume Scanner"}
                    >
                      {evt.scanner_status === "active" ? (
                        <>
                          <Pause className="h-3.5 w-3.5 text-amber-600" />
                          <span className="hidden sm:inline">Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Resume</span>
                        </>
                      )}
                    </button>

                    {/* Early Scan Toggle Button */}
                    <button
                      type="button"
                      onClick={() => requestToggleEventEarlyScan(evt)}
                      disabled={isPending}
                      className={cn(
                        "h-8 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                        evt.allow_early_scan
                          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 font-bold hover:bg-amber-100"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                      )}
                      title={
                        evt.allow_early_scan
                          ? "Early scan is ENABLED. Click to revert to strict date locking."
                          : "Strict date lock active. Click to allow early scanning before event date."
                      }
                    >
                      <Sparkles
                        className={cn(
                          "h-3.5 w-3.5",
                          evt.allow_early_scan ? "text-amber-600 fill-amber-500" : "text-slate-400"
                        )}
                      />
                      <span className="hidden sm:inline">Early Scan</span>
                      <span
                        className={cn(
                          "px-1 py-0.2 rounded text-[9px] font-mono uppercase font-bold",
                          evt.allow_early_scan
                            ? "bg-amber-200 text-amber-950 border border-amber-300"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {evt.allow_early_scan ? "ON" : "OFF"}
                      </span>
                    </button>

                    {/* View Roster Breakdown */}
                    <button
                      type="button"
                      onClick={() => handleOpenRoster(evt)}
                      className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Inspect who attended Morning vs Afternoon"
                    >
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Roster</span>
                    </button>

                    {/* Configure Sections Modal */}
                    <button
                      type="button"
                      onClick={() => handleOpenConfigure(evt)}
                      className="h-8 w-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      title="Configure sections &amp; labels"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAIL-SAFE CONFIRMATION DIALOG (Protects against accidental section clicks) */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  pendingAction.type === "emergency_lock"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-slate-900 font-display">
                  {pendingAction.type === "switch_section" && "Confirm Section Activation"}
                  {pendingAction.type === "bulk_switch" && "Confirm Bulk Section Shift"}
                  {pendingAction.type === "emergency_lock" && (pendingAction.nextMaster ? "Activate Master Scanner?" : "Emergency Lockout Confirmation")}
                  {pendingAction.type === "toggle_status" && "Confirm Scanner State Change"}
                  {pendingAction.type === "toggle_date_bypass" && (pendingAction.nextBypass ? "Enable Global Date Lock Bypass?" : "Re-enable Strict Date Lock?")}
                  {pendingAction.type === "toggle_event_early_scan" && (pendingAction.nextAllow ? "Allow Early Pass Scanning?" : "Enforce Standard Date Lock?")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fail-Safe Check: Please confirm before switching live gate scanning.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body with Detailed Warnings */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2 text-xs">
              {pendingAction.type === "switch_section" && (
                <>
                  <div className="font-semibold text-slate-900">
                    Event: <span className="font-bold text-indigo-700">{pendingAction.eventName}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="rounded-md bg-slate-200 px-2 py-0.5 font-medium text-slate-700 line-through">
                      {pendingAction.currentLabel}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                      {pendingAction.targetLabel}
                    </span>
                  </div>
                  <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Coordinators scanning at gates will immediately record check-ins under <strong>{pendingAction.targetLabel}</strong>.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">⚠️</span>
                      <span><strong>{pendingAction.currentLabel}</strong> will be locked. New participants joining now will only be marked present for the afternoon.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-slate-500 font-bold">•</span>
                      <span>Participants who already scanned in the morning will keep their attendance and can scan again for afternoon entry.</span>
                    </p>
                  </div>
                </>
              )}

              {pendingAction.type === "bulk_switch" && (
                <>
                  <div className="font-semibold text-slate-900">
                    Switching <span className="font-bold text-purple-700">{pendingAction.count} event(s)</span> to:
                  </div>
                  <div className="rounded-md bg-purple-100 px-2.5 py-1 font-bold text-purple-900 inline-block">
                    {pendingAction.targetLabel}
                  </div>
                  <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                    <p className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">⚠️</span>
                      <span>This affects all active gate volunteers across campus for the selected competitions.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Previous sections will be safely sealed and closed.</span>
                    </p>
                  </div>
                </>
              )}

              {pendingAction.type === "emergency_lock" && (
                <div className="text-[11px] text-slate-600 space-y-2">
                  {pendingAction.nextMaster ? (
                    <p>All camera scanners across campus will be unlocked and able to record verified delegate attendance.</p>
                  ) : (
                    <p className="font-bold text-rose-700">
                      EMERGENCY ACTION: All gate scanners will immediately reject passes and show "LOCKED". No attendance check-ins will be allowed until re-activated.
                    </p>
                  )}
                </div>
              )}

              {pendingAction.type === "toggle_status" && (
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p>
                    Event: <strong>{pendingAction.eventName}</strong>
                  </p>
                  <p>
                    Target State: <strong className="uppercase">{pendingAction.newStatus}</strong>
                  </p>
                </div>
              )}

              {pendingAction.type === "toggle_date_bypass" && (
                <div className="text-[11px] text-slate-600 space-y-2">
                  {pendingAction.nextBypass ? (
                    <>
                      <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                        <span>Pre-Fest Rehearsal &amp; Drill Mode</span>
                      </div>
                      <p className="leading-relaxed">
                        Enabling <strong>Global Date Lock Bypass</strong> unlocks scanner camera desks across all 61 competitions campus-wide, regardless of whether each event is scheduled for today (Sep 25) or tomorrow (Sep 26).
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Student coordinators and gate volunteers can immediately test and scan participant QR passes.</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">⚠️</span>
                        <span>Remember to re-enable strict date locking after your rehearsals are complete.</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">
                        Re-enabling Strict Calendar Date Locking
                      </p>
                      <p className="leading-relaxed">
                        Gate scanners will strictly enforce competition dates. Coordinators can only scan participants on their event's official calendar day (unless early scanning is enabled individually for specific events).
                      </p>
                    </>
                  )}
                </div>
              )}

              {pendingAction.type === "toggle_event_early_scan" && (
                <div className="text-[11px] text-slate-600 space-y-2">
                  <div className="font-semibold text-slate-900">
                    Event: <span className="font-bold text-indigo-700">{pendingAction.eventName}</span>
                  </div>
                  {pendingAction.nextAllow ? (
                    <>
                      <p className="leading-relaxed">
                        Authorizing <strong>Early Scan</strong> allows volunteer coordinators to open the camera scanner desk and verify delegate passes right now, even before the scheduled competition date.
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Ideal for pre-event kit distribution, early badge verification, and preliminary desk setup.</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-slate-500 font-bold">•</span>
                        <span>Other competitions remain safely locked to their designated dates.</span>
                      </p>
                    </>
                  ) : (
                    <p className="leading-relaxed">
                      Reverting to <strong>Standard Calendar Lock</strong>. Volunteers will only be able to scan participants on the official competition date.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel (Esc)
              </button>
              <button
                type="button"
                onClick={executePendingAction}
                disabled={isPending}
                className={cn(
                  "px-4 py-2 rounded-xl text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50",
                  pendingAction.type === "emergency_lock" && !pendingAction.nextMaster
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Applying...</span>
                  </span>
                ) : (
                  <span>
                    {pendingAction.type === "switch_section" && `Yes, Activate ${pendingAction.targetLabel}`}
                    {pendingAction.type === "bulk_switch" && "Yes, Switch All Events"}
                    {pendingAction.type === "emergency_lock" && (pendingAction.nextMaster ? "Yes, Activate All Gates" : "Yes, Lock All Gates")}
                    {pendingAction.type === "toggle_status" && "Confirm Status Change"}
                    {pendingAction.type === "toggle_date_bypass" && (pendingAction.nextBypass ? "Yes, Unlock All Scanners" : "Yes, Enforce Strict Dates")}
                    {pendingAction.type === "toggle_event_early_scan" && (pendingAction.nextAllow ? "Yes, Allow Early Scan" : "Yes, Enforce Date Lock")}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Inspection Modal - High-Capacity Premium Table */}
      {inspectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="relative w-[96vw] max-w-5xl rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-2xs shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900 font-display truncate">
                      {inspectingEvent.name}
                    </h3>
                    <span className="rounded-md bg-indigo-100/80 text-indigo-800 px-2 py-0.5 text-[10px] font-bold shrink-0">
                      Attendance Ledger
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {inspectingEvent.venue} • {inspectingEvent.event_date} • <strong className="text-slate-700">{inspectingEvent.total_registered} Registered Participants</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportRosterCSV}
                  disabled={!rosterData || rosterData.length === 0}
                  className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Export Attendance Ledger to CSV"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingEvent(null)}
                  className="h-8.5 w-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs bg-white">
              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mr-1 shrink-0">
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setRosterFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs",
                    rosterFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  )}
                >
                  All ({rosterData?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilter("both")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs",
                    rosterFilter === "both"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 border border-emerald-200/80"
                  )}
                >
                  Full Day (Both Secs)
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilter("morning_only")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs",
                    rosterFilter === "morning_only"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200/80"
                  )}
                >
                  Morning Only
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilter("afternoon_only")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs",
                    rosterFilter === "afternoon_only"
                      ? "bg-purple-600 text-white"
                      : "bg-purple-50 text-purple-800 hover:bg-purple-100/80 border border-purple-200/80"
                  )}
                >
                  Afternoon Only
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilter("absent")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs",
                    rosterFilter === "absent"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-800 hover:bg-rose-100/80 border border-rose-200/80"
                  )}
                >
                  Absent
                </button>
              </div>

              {/* Roster Search Input */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search code, participant, college..."
                  className="w-full h-8 rounded-lg border border-slate-200/90 pl-8 pr-7 text-xs text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
                />
                {rosterSearch && (
                  <button
                    type="button"
                    onClick={() => setRosterSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Content Table Container */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingRoster ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-semibold">Loading verified section records...</span>
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 font-medium">
                  No records match the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50/80 font-bold">
                        <th className="py-2.5 px-3.5 font-bold w-40">Pass Code</th>
                        <th className="py-2.5 px-3.5 font-bold min-w-[200px]">Participant</th>
                        <th className="py-2.5 px-3.5 font-bold min-w-[180px]">College</th>
                        <th className="py-2.5 px-3.5 font-bold text-center w-36">Section 1 (Morning)</th>
                        <th className="py-2.5 px-3.5 font-bold text-center w-36">Section 2 (Afternoon)</th>
                        <th className="py-2.5 px-3.5 font-bold text-center w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredRoster.map((item) => {
                        const hasSec1 = item.sectionsAttended.includes(1);
                        const hasSec2 = item.sectionsAttended.includes(2);

                        return (
                          <tr key={item.registrationId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {item.registrationCode}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <div className="font-semibold text-slate-900">{item.studentName}</div>
                              <div className="text-[10px] text-slate-500">{item.email}</div>
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-600 truncate max-w-[200px]" title={item.collegeName}>
                              {item.collegeName}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              {hasSec1 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                  <Check className="h-3 w-3" />
                                  <span>Checked In</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs font-mono">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              {hasSec2 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                  <Check className="h-3 w-3" />
                                  <span>Checked In</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs font-mono">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                                  item.status === "attended"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {item.status === "attended" ? "PRESENT" : "ABSENT"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configure Sections Modal - Premium Pro Settings */}
      {configuringEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-2xs shrink-0">
                  <SlidersHorizontal className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">
                    Configure Round Sections
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                    {configuringEvent.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Quick Format Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Round Structure
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfigTotalSections(2);
                      setConfigSectionLabels(["Morning Section", "Afternoon Section"]);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs",
                      configTotalSections === 2
                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">2 Sections</span>
                      {configTotalSections === 2 && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Morning &amp; Afternoon</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfigTotalSections(4);
                      setConfigSectionLabels(["Day 1 - Morning", "Day 1 - Afternoon", "Day 2 - Morning", "Day 2 - Afternoon"]);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs",
                      configTotalSections === 4
                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">4 Sections</span>
                      {configTotalSections === 4 && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">2-Day Prelims &amp; Finals</p>
                  </button>
                </div>
              </div>

              {/* Custom Section Labels */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Section Display Names
                </label>
                <div className="space-y-2">
                  {Array.from({ length: configTotalSections }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center rounded-xl border border-slate-200/90 bg-slate-50/50 overflow-hidden focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono font-bold text-slate-600 bg-slate-100/80 border-r border-slate-200/80 shrink-0">
                        {idx % 2 === 0 ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3 text-purple-500" />}
                        <span>Sec {idx + 1}</span>
                      </div>
                      <input
                        type="text"
                        value={configSectionLabels[idx] || ""}
                        onChange={(e) => {
                          const newLabels = [...configSectionLabels];
                          newLabels[idx] = e.target.value;
                          setConfigSectionLabels(newLabels);
                        }}
                        placeholder={`Section ${idx + 1} Name`}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Coordinator Permission - Styled Toggle Card */}
              <div
                onClick={() => setConfigAllowStaff(!configAllowStaff)}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer select-none"
              >
                <div className="pr-3">
                  <div className="font-bold text-slate-900 text-xs">Staff Coordinator Switch Access</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Allow coordinators to advance to Section 2 from gate scanner app
                  </div>
                </div>
                <div
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                    configAllowStaff ? "bg-indigo-600" : "bg-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transform ring-0 transition duration-200 ease-in-out",
                      configAllowStaff ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfiguringEvent(null)}
                className="h-8.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfigure}
                disabled={isPending}
                className="h-8.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
