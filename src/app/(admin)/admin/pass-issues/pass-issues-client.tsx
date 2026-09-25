"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Ticket,
  Calendar,
  UserCheck,
  Download,
  Clock,
  Sparkles,
  ArrowUpDown,
  Check,
  X,
  ChevronRight,
  PlusCircle,
  Wrench,
  ShieldAlert,
  ExternalLink,
  Layers,
  CreditCard,
  Copy,
  AlertCircle,
  HelpCircle,
  Building,
  GraduationCap,
  Phone,
  Mail,
  Zap,
} from "lucide-react";
import {
  PassDiscrepancyItem,
  PassDiscrepancyMetrics,
  getPassDiscrepanciesAdminAction,
  adminQuickEnrollStudentAction,
  adminSyncPassSlotsAction,
  adminBatchSyncAllSlotsAction,
  adminGeneratePassForPaidOrderAction,
} from "@/actions/pass-issues-admin";
import { AdminEventSimpleItem } from "@/actions/admin";
import { cn } from "@/lib/utils";

interface PassIssuesClientProps {
  initialItems: PassDiscrepancyItem[];
  initialMetrics: PassDiscrepancyMetrics;
  availableEvents: AdminEventSimpleItem[];
  currentUserRole: any;
}

export function PassIssuesClient({
  initialItems,
  initialMetrics,
  availableEvents,
  currentUserRole,
}: PassIssuesClientProps) {
  const [items, setItems] = useState<PassDiscrepancyItem[]>(initialItems);
  const [metrics, setMetrics] = useState<PassDiscrepancyMetrics>(initialMetrics);
  const [eventsList] = useState<AdminEventSimpleItem[]>(availableEvents);
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [activeTab, setActiveTab] = useState<
    "all" | "unenrolled" | "partially_enrolled" | "slot_desync" | "paid_without_pass"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [participantTypeFilter, setParticipantTypeFilter] = useState<"all" | "internal" | "external">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "standard_pass" | "pro_pass">("all");

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Quick Enroll Modal State
  const [enrollModalTarget, setEnrollModalTarget] = useState<PassDiscrepancyItem | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<1 | 2>(1);
  const [overrideCapacity, setOverrideCapacity] = useState(false);
  const [overrideInstitution, setOverrideInstitution] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);

  // Batch Sync Modal State
  const [isBatchSyncModalOpen, setIsBatchSyncModalOpen] = useState(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);

  // Single Action Loading IDs
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`Copied ${text} to clipboard!`, "info");
  };

  // Live Refresh
  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getPassDiscrepanciesAdminAction();
      if (res.success) {
        setItems(res.items);
        setMetrics(res.metrics);
        showToast("Telemetry & discrepancy ledger refreshed successfully.");
      } else {
        showToast(res.error || "Failed to refresh data", "error");
      }
    });
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Tab filter
      if (activeTab !== "all" && item.type !== activeTab) {
        return false;
      }

      // 2. Participant type filter
      if (participantTypeFilter !== "all" && item.participantType !== participantTypeFilter) {
        return false;
      }

      // 3. Pass tier filter
      if (tierFilter !== "all" && item.pass?.passTier !== tierFilter) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesEmail = item.email.toLowerCase().includes(q);
        const matchesReg = (item.registerNumber || "").toLowerCase().includes(q);
        const matchesPhone = (item.mobileNumber || "").toLowerCase().includes(q);
        const matchesPass = (item.pass?.passCode || "").toLowerCase().includes(q);
        const matchesOrder = (item.order?.orderNumber || "").toLowerCase().includes(q);
        const matchesCollege = (item.collegeName || "").toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesReg && !matchesPhone && !matchesPass && !matchesOrder && !matchesCollege) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeTab, participantTypeFilter, tierFilter, searchQuery]);

  // Open Quick Enroll Modal
  const openEnrollModal = (item: PassDiscrepancyItem) => {
    setEnrollModalTarget(item);
    setSelectedEventId("");
    setEventSearch("");
    setOverrideCapacity(false);
    setOverrideInstitution(false);
    setAdminNotes(`Enrolled via Admin Pass Issues Hub by ${currentUserRole?.user?.email || "Admin"}`);

    // If student already has 1 registration, default slot to 2
    if (item.registrations.length === 1) {
      const existingSlot = item.registrations[0].slotNumber;
      setSelectedSlotNumber(existingSlot === 1 ? 2 : 1);
    } else {
      setSelectedSlotNumber(1);
    }
  };

  // Submit Quick Enroll
  const handleSubmitEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollModalTarget || !selectedEventId) {
      showToast("Please choose a competition to assign.", "error");
      return;
    }

    if (!enrollModalTarget.pass) {
      showToast("Student does not have an active pass.", "error");
      return;
    }

    setIsSubmittingEnroll(true);
    try {
      const res = await adminQuickEnrollStudentAction({
        passId: enrollModalTarget.pass.id,
        userId: enrollModalTarget.userId,
        eventId: selectedEventId,
        slotNumber: selectedSlotNumber,
        overrideCapacity,
        overrideInstitution,
        notes: adminNotes,
      });

      if (res.success) {
        showToast(res.message || "Enrolled successfully!", "success");
        setEnrollModalTarget(null);
        handleRefresh();
      } else {
        showToast(res.error || "Enrollment failed", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing enrollment";
      showToast(msg, "error");
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  // Sync Single Pass Slots
  const handleSyncSlots = async (item: PassDiscrepancyItem) => {
    if (!item.pass) return;
    setActionLoadingId(item.id);
    try {
      const res = await adminSyncPassSlotsAction({
        passId: item.pass.id,
        userId: item.userId,
      });
      if (res.success) {
        showToast(res.message || "Pass slots synchronized!", "success");
        handleRefresh();
      } else {
        showToast(res.error || "Failed to sync slots", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error syncing slots";
      showToast(msg, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Generate Pass for Paid Order
  const handleGeneratePass = async (item: PassDiscrepancyItem) => {
    if (!item.order) return;
    setActionLoadingId(item.id);
    try {
      const res = await adminGeneratePassForPaidOrderAction({
        orderId: item.order.id,
        userId: item.userId,
        passTier: "standard_pass",
      });

      if (res.success) {
        showToast(res.message || `Generated pass ${res.passCode}!`, "success");
        handleRefresh();
      } else {
        showToast(res.error || "Failed to generate pass", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating pass";
      showToast(msg, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Batch Auto-Sync All Slots
  const handleBatchSync = async () => {
    setIsBatchSyncing(true);
    try {
      const res = await adminBatchSyncAllSlotsAction();
      if (res.success) {
        showToast(res.message || `Repaired ${res.repairedCount} passes!`, "success");
        setIsBatchSyncModalOpen(false);
        handleRefresh();
      } else {
        showToast(res.error || "Batch sync failed", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error during batch sync";
      showToast(msg, "error");
    } finally {
      setIsBatchSyncing(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      showToast("No records to export.", "info");
      return;
    }

    const headers = [
      "Student Name",
      "Email",
      "Phone",
      "Register Number",
      "Type",
      "College",
      "Department",
      "Pass Code",
      "Pass Tier",
      "Slots Recorded",
      "Actual Events Enrolled",
      "Discrepancy Category",
      "Discrepancy Details",
      "Event 1 Name",
      "Event 2 Name",
    ];

    const csvRows = filteredItems.map((item) => {
      const e1 = item.registrations.find((r) => r.slotNumber === 1)?.event?.name || "None";
      const e2 = item.registrations.find((r) => r.slotNumber === 2)?.event?.name || "None";

      return [
        `"${item.studentName.replace(/"/g, '""')}"`,
        `"${item.email}"`,
        `"${item.mobileNumber || ""}"`,
        `"${item.registerNumber || ""}"`,
        `"${item.participantType}"`,
        `"${(item.collegeName || "").replace(/"/g, '""')}"`,
        `"${(item.department || "").replace(/"/g, '""')}"`,
        `"${item.pass?.passCode || item.order?.orderNumber || "N/A"}"`,
        `"${item.pass?.passTier || "N/A"}"`,
        item.pass?.slotsUsed ?? 0,
        item.registrations.length,
        `"${item.type}"`,
        `"${item.discrepancyDescription.replace(/"/g, '""')}"`,
        `"${e1.replace(/"/g, '""')}"`,
        `"${e2.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `euphoria_pass_discrepancies_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredItems.length} records to CSV!`, "success");
  };

  // Filtered events in modal
  const modalFilteredEvents = useMemo(() => {
    if (!enrollModalTarget) return [];
    const studentIsInternal =
      enrollModalTarget.participantType === "internal" ||
      enrollModalTarget.email.toLowerCase().endsWith("@klu.ac.in");

    const alreadyRegisteredIds = new Set(enrollModalTarget.registrations.map((r) => r.event.id));

    return eventsList.filter((evt) => {
      // Don't show already enrolled event
      if (alreadyRegisteredIds.has(evt.id)) return false;

      if (eventSearch.trim()) {
        const q = eventSearch.toLowerCase().trim();
        const matchesName = evt.name.toLowerCase().includes(q);
        const matchesDept = (evt.schoolOrDept || "").toLowerCase().includes(q);
        const matchesCat = (evt.categoryName || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDept && !matchesCat) return false;
      }

      return true;
    });
  }, [eventsList, enrollModalTarget, eventSearch]);

  const selectedEventObj = useMemo(() => {
    return eventsList.find((e) => e.id === selectedEventId) || null;
  }, [eventsList, selectedEventId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold border backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300",
            toastMessage.type === "success" && "bg-emerald-950/90 text-emerald-100 border-emerald-500/40",
            toastMessage.type === "error" && "bg-rose-950/90 text-rose-100 border-rose-500/40",
            toastMessage.type === "info" && "bg-slate-900/90 text-cyan-100 border-cyan-500/40"
          )}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastMessage.type === "info" && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-slate-700/50">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              Live Audit & Resolution Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Pass & Slot Discrepancy Manager
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
              Detects students generated with festival passes who haven&apos;t enrolled into competitions, repairs desynced
              pass slots, and resolves orphaned payment orders with 1-click tools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isPending && "animate-spin text-cyan-400")} />
              Refresh Telemetry
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            {currentUserRole?.roleLevel >= 3 && (
              <button
                onClick={() => setIsBatchSyncModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-lg shadow-amber-900/30 transition active:scale-95"
              >
                <Wrench className="w-4 h-4" />
                Batch Auto-Sync All Slots
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Issues */}
        <div
          onClick={() => setActiveTab("all")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden",
            activeTab === "all"
              ? "bg-slate-900 text-white border-slate-700 shadow-md ring-2 ring-indigo-500/40"
              : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", activeTab === "all" ? "text-slate-300" : "text-slate-500")}>
              Total Queries
            </span>
            <AlertCircle className={cn("w-4 h-4", activeTab === "all" ? "text-indigo-400" : "text-slate-400")} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">{metrics.total}</div>
          <p className={cn("text-[11px] mt-1 font-medium", activeTab === "all" ? "text-slate-400" : "text-slate-500")}>
            Across all categories
          </p>
        </div>

        {/* Unenrolled (Pass Active, 0 Events) */}
        <div
          onClick={() => setActiveTab("unenrolled")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden",
            activeTab === "unenrolled"
              ? "bg-rose-950 text-white border-rose-700 shadow-md ring-2 ring-rose-500/50"
              : "bg-white text-slate-900 border-rose-200 hover:border-rose-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold uppercase tracking-wider", activeTab === "unenrolled" ? "text-rose-200" : "text-rose-600")}>
              Unenrolled (0 Events)
            </span>
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-rose-500">{metrics.unenrolled}</div>
          <p className={cn("text-[11px] mt-1 font-medium", activeTab === "unenrolled" ? "text-rose-300" : "text-slate-500")}>
            Pass issued, 0 events enrolled
          </p>
        </div>

        {/* Partially Enrolled (1/2 Events) */}
        <div
          onClick={() => setActiveTab("partially_enrolled")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden",
            activeTab === "partially_enrolled"
              ? "bg-amber-950 text-white border-amber-700 shadow-md ring-2 ring-amber-500/50"
              : "bg-white text-slate-900 border-amber-200 hover:border-amber-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold uppercase tracking-wider", activeTab === "partially_enrolled" ? "text-amber-200" : "text-amber-600")}>
              Partially Enrolled
            </span>
            <Clock className={cn("w-4 h-4", activeTab === "partially_enrolled" ? "text-amber-400" : "text-amber-500")} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-amber-500">{metrics.partiallyEnrolled}</div>
          <p className={cn("text-[11px] mt-1 font-medium", activeTab === "partially_enrolled" ? "text-amber-300" : "text-slate-500")}>
            1 event claimed, 1 slot open
          </p>
        </div>

        {/* Slot Desyncs */}
        <div
          onClick={() => setActiveTab("slot_desync")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden",
            activeTab === "slot_desync"
              ? "bg-indigo-950 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/50"
              : "bg-white text-slate-900 border-indigo-200 hover:border-indigo-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold uppercase tracking-wider", activeTab === "slot_desync" ? "text-indigo-200" : "text-indigo-600")}>
              Slot Desyncs
            </span>
            <ArrowUpDown className={cn("w-4 h-4", activeTab === "slot_desync" ? "text-indigo-400" : "text-indigo-500")} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-indigo-500">{metrics.slotDesync}</div>
          <p className={cn("text-[11px] mt-1 font-medium", activeTab === "slot_desync" ? "text-indigo-300" : "text-slate-500")}>
            slots_used ≠ actual registrations
          </p>
        </div>

        {/* Paid Without Pass */}
        <div
          onClick={() => setActiveTab("paid_without_pass")}
          className={cn(
            "col-span-2 lg:col-span-1 p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative overflow-hidden",
            activeTab === "paid_without_pass"
              ? "bg-purple-950 text-white border-purple-700 shadow-md ring-2 ring-purple-500/50"
              : "bg-white text-slate-900 border-purple-200 hover:border-purple-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold uppercase tracking-wider", activeTab === "paid_without_pass" ? "text-purple-200" : "text-purple-600")}>
              Paid No Pass
            </span>
            <CreditCard className={cn("w-4 h-4", activeTab === "paid_without_pass" ? "text-purple-400" : "text-purple-500")} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-purple-500">{metrics.paidWithoutPass}</div>
          <p className={cn("text-[11px] mt-1 font-medium", activeTab === "paid_without_pass" ? "text-purple-300" : "text-slate-500")}>
            Paid order with no pass
          </p>
        </div>
      </div>

      {/* Navigation Filter Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Top Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition",
              activeTab === "all"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            All Queries ({metrics.total})
          </button>
          <button
            onClick={() => setActiveTab("unenrolled")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5",
              activeTab === "unenrolled"
                ? "bg-rose-600 text-white shadow"
                : "text-rose-700 hover:bg-rose-50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Unenrolled Students ({metrics.unenrolled})
          </button>
          <button
            onClick={() => setActiveTab("partially_enrolled")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5",
              activeTab === "partially_enrolled"
                ? "bg-amber-600 text-white shadow"
                : "text-amber-700 hover:bg-amber-50"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Partially Enrolled ({metrics.partiallyEnrolled})
          </button>
          <button
            onClick={() => setActiveTab("slot_desync")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5",
              activeTab === "slot_desync"
                ? "bg-indigo-600 text-white shadow"
                : "text-indigo-700 hover:bg-indigo-50"
            )}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Slot Desyncs ({metrics.slotDesync})
          </button>
          <button
            onClick={() => setActiveTab("paid_without_pass")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5",
              activeTab === "paid_without_pass"
                ? "bg-purple-600 text-white shadow"
                : "text-purple-700 hover:bg-purple-50"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Paid Without Pass ({metrics.paidWithoutPass})
          </button>
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, email, register #, phone, pass code, or order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Delegate Type Filter */}
          <div className="lg:col-span-3">
            <select
              value={participantTypeFilter}
              onChange={(e) => setParticipantTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Delegate Types</option>
              <option value="internal">Kalasalingam (Internal)</option>
              <option value="external">External Delegates</option>
            </select>
          </div>

          {/* Pass Tier Filter */}
          <div className="lg:col-span-3">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Pass Tiers</option>
              <option value="standard_pass">Standard Pass</option>
              <option value="pro_pass">Pro Pass</option>
            </select>
          </div>
        </div>

        {/* Results Counter & Active Query Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-900">{filteredItems.length}</strong> of{" "}
              <strong className="text-slate-900">{items.length}</strong> queries
            </span>
            {(searchQuery || participantTypeFilter !== "all" || tierFilter !== "all" || activeTab !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setParticipantTypeFilter("all");
                  setTierFilter("all");
                  setActiveTab("all");
                }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold underline text-xs ml-2"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Click &apos;Quick Enroll&apos; to assign events immediately</span>
          </div>
        </div>
      </div>

      {/* Discrepancies Ledger */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Zero Discrepancies Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery || activeTab !== "all" || participantTypeFilter !== "all"
              ? "No queries match your current filter parameters. Try adjusting or clearing search terms."
              : "All active festival passes are fully enrolled into events and synchronized with the ledger! Excellent state."}
          </p>
          {(searchQuery || activeTab !== "all" || participantTypeFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
                setParticipantTypeFilter("all");
                setTierFilter("all");
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isLoadingThis = actionLoadingId === item.id;
            const regCount = item.registrations.length;
            const isUnenrolled = item.type === "unenrolled";
            const isDesync = item.type === "slot_desync";
            const isPaidWithoutPass = item.type === "paid_without_pass";
            const isPartiallyEnrolled = item.type === "partially_enrolled";

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden",
                  isUnenrolled && "border-rose-200 hover:border-rose-300 ring-1 ring-rose-100",
                  isDesync && "border-indigo-200 hover:border-indigo-300 ring-1 ring-indigo-100",
                  isPaidWithoutPass && "border-purple-200 hover:border-purple-300 ring-1 ring-purple-100",
                  isPartiallyEnrolled && "border-amber-200 hover:border-amber-300 ring-1 ring-amber-100"
                )}
              >
                {/* Status Bar */}
                <div
                  className={cn(
                    "px-4 sm:px-6 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 border-b",
                    isUnenrolled && "bg-rose-50 text-rose-800 border-rose-100",
                    isDesync && "bg-indigo-50 text-indigo-800 border-indigo-100",
                    isPaidWithoutPass && "bg-purple-50 text-purple-800 border-purple-100",
                    isPartiallyEnrolled && "bg-amber-50 text-amber-800 border-amber-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isUnenrolled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" /> Unenrolled Pass (0 Events)
                      </span>
                    )}
                    {isDesync && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider">
                        <ArrowUpDown className="w-3 h-3" /> Slot Count Desync
                      </span>
                    )}
                    {isPaidWithoutPass && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-extrabold uppercase tracking-wider">
                        <CreditCard className="w-3 h-3" /> Paid Order Without Pass
                      </span>
                    )}
                    {isPartiallyEnrolled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-extrabold uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> Partially Enrolled (1/2 Slots)
                      </span>
                    )}

                    <span className="text-slate-600 font-medium text-[11px] hidden sm:inline">
                      {item.discrepancyDescription}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      User ID:{" "}
                      <span className="font-mono text-slate-700">{item.userId.substring(0, 8)}...</span>
                    </span>
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(item.email)}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Inspect User
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Main Card Content */}
                <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Student Details (4 cols) */}
                  <div className="lg:col-span-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 tracking-tight">{item.studentName}</h4>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            item.participantType === "internal"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          )}
                        >
                          {item.participantType === "internal" ? "KLU Internal" : "External Delegate"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </div>

                      {item.mobileNumber && (
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.mobileNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                      {item.registerNumber && (
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Reg No: <strong className="text-slate-800 font-mono">{item.registerNumber}</strong>
                          </span>
                        </div>
                      )}
                      {(item.department || item.course) && (
                        <div className="text-[11px] text-slate-600">
                          {item.department || item.course} {item.yearOfStudy ? `· Year ${item.yearOfStudy}` : ""}
                        </div>
                      )}
                      {item.collegeName && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.collegeName}</span>
                        </div>
                      )}
                    </div>

                    {/* Pass Telemetry */}
                    {item.pass ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Pass Code:</span>
                          <button
                            onClick={() => copyToClipboard(item.pass!.passCode, item.pass!.id)}
                            className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 hover:text-indigo-600 transition"
                          >
                            {item.pass.passCode}
                            {copiedId === item.pass.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Tier & Price:</span>
                          <span className="font-semibold text-slate-800">
                            {item.pass.passTier === "pro_pass" ? "PRO Pass" : "Standard Pass"} · ₹
                            {item.pass.amountPaid}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Pass Slots Counter:</span>
                          <span
                            className={cn(
                              "font-bold px-2 py-0.5 rounded text-[11px]",
                              item.pass.slotsUsed !== regCount
                                ? "bg-rose-100 text-rose-800 font-mono"
                                : "bg-slate-200 text-slate-800"
                            )}
                          >
                            {item.pass.slotsUsed} / {item.pass.totalSlots} Slots Claimed
                          </span>
                        </div>
                      </div>
                    ) : item.order ? (
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-700 font-medium">Order Number:</span>
                          <span className="font-mono font-bold text-purple-900">{item.order.orderNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-purple-700 font-medium">Amount Paid:</span>
                          <span className="font-bold text-purple-900">₹{item.order.amount}</span>
                        </div>
                        <div className="text-[11px] text-purple-600">
                          Payment Status: <strong className="uppercase">PAID</strong> (Pass missing)
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Middle Column: Current Event Registrations (Slot 1 & Slot 2) (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Event Slots Status ({regCount}/2 Enrolled)
                      </h5>
                      {item.pass && item.pass.slotsUsed !== regCount && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Counter Desync: DB says {item.pass.slotsUsed}
                        </span>
                      )}
                    </div>

                    {/* Slot 1 Box */}
                    {(() => {
                      const reg1 = item.registrations.find((r) => r.slotNumber === 1) || item.registrations[0];
                      if (reg1 && reg1.slotNumber === 1) {
                        return (
                          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Slot #1: {reg1.event.name}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  reg1.isAttended
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                )}
                              >
                                {reg1.isAttended ? "Attended" : "Registered"}
                              </span>
                            </div>
                            <div className="text-slate-600 text-[11px] flex items-center gap-2">
                              <span>Code: <strong className="font-mono">{reg1.registrationCode}</strong></span>
                              {reg1.event.venue && <span>· Venue: {reg1.event.venue}</span>}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            Slot #1: Not Enrolled (Empty Slot)
                          </span>
                          {item.pass && (
                            <button
                              onClick={() => {
                                setSelectedSlotNumber(1);
                                openEnrollModal(item);
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                            >
                              + Assign Event
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Slot 2 Box */}
                    {(() => {
                      const reg2 = item.registrations.find((r) => r.slotNumber === 2) || (item.registrations.length > 1 ? item.registrations[1] : null);
                      if (reg2) {
                        return (
                          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Slot #2: {reg2.event.name}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  reg2.isAttended
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                )}
                              >
                                {reg2.isAttended ? "Attended" : "Registered"}
                              </span>
                            </div>
                            <div className="text-slate-600 text-[11px] flex items-center gap-2">
                              <span>Code: <strong className="font-mono">{reg2.registrationCode}</strong></span>
                              {reg2.event.venue && <span>· Venue: {reg2.event.venue}</span>}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            Slot #2: Not Enrolled (Empty Slot)
                          </span>
                          {item.pass && (
                            <button
                              onClick={() => {
                                setSelectedSlotNumber(2);
                                openEnrollModal(item);
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                            >
                              + Assign Event
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Instant Action Buttons (3 cols) */}
                  <div className="lg:col-span-3 flex flex-col gap-2.5 pt-2 lg:pt-0 lg:border-l lg:border-slate-100 lg:pl-6">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Resolution Actions
                    </span>

                    {/* Quick Enroll Button */}
                    {item.pass && regCount < 2 && (
                      <button
                        onClick={() => openEnrollModal(item)}
                        className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-95"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Quick Enroll in Event
                      </button>
                    )}

                    {/* 1-Click Sync Slots Button */}
                    {item.pass && (
                      <button
                        onClick={() => handleSyncSlots(item)}
                        disabled={isLoadingThis}
                        className={cn(
                          "w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 disabled:opacity-50",
                          item.pass.slotsUsed !== regCount
                            ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        <ArrowUpDown className={cn("w-3.5 h-3.5", isLoadingThis && "animate-spin")} />
                        {isLoadingThis ? "Syncing..." : "Recalculate & Sync Slots"}
                      </button>
                    )}

                    {/* Issue Pass Button for Paid Orders */}
                    {item.order && !item.pass && (
                      <button
                        onClick={() => handleGeneratePass(item)}
                        disabled={isLoadingThis}
                        className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        {isLoadingThis ? "Issuing..." : "Issue & Activate Pass"}
                      </button>
                    )}

                    {/* User Profile Deep Link */}
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(item.email)}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      View in User Accounts
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK ENROLL MODAL */}
      {enrollModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-indigo-400" />
                  Quick Enroll Student in Competition
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Assigning event slot for <strong className="text-white">{enrollModalTarget.studentName}</strong>
                </p>
              </div>
              <button
                onClick={() => setEnrollModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitEnroll} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Student Summary Banner */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Student:</span>{" "}
                  <strong className="text-slate-900">{enrollModalTarget.studentName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span>{" "}
                  <span className="text-slate-700 truncate">{enrollModalTarget.email}</span>
                </div>
                <div>
                  <span className="text-slate-500">Type:</span>{" "}
                  <strong className="text-slate-900 uppercase">
                    {enrollModalTarget.participantType === "internal" ? "KLU Internal" : "External"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Pass Code:</span>{" "}
                  <strong className="font-mono text-indigo-600">{enrollModalTarget.pass?.passCode}</strong>
                </div>
              </div>

              {/* Slot Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Slot Number
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSlotNumber(1)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition",
                      selectedSlotNumber === 1
                        ? "bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Slot #1</span>
                    {enrollModalTarget.registrations.some((r) => r.slotNumber === 1) && (
                      <span className="text-[10px] text-amber-600 font-semibold">(Occupied)</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSlotNumber(2)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition",
                      selectedSlotNumber === 2
                        ? "bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Slot #2</span>
                    {enrollModalTarget.registrations.some((r) => r.slotNumber === 2) && (
                      <span className="text-[10px] text-amber-600 font-semibold">(Occupied)</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Search & Select Competition */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Competition / Event
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search competition catalog..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {modalFilteredEvents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No competitions found matching &quot;{eventSearch}&quot;.
                    </div>
                  ) : (
                    modalFilteredEvents.map((evt) => {
                      const isSelected = selectedEventId === evt.id;
                      const isPro = Boolean(evt.isProEvent);
                      const isFull = evt.isTotalFull;
                      const isKluBlocked = evt.isKluBlocked;

                      return (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEventId(evt.id)}
                          className={cn(
                            "p-2.5 text-xs cursor-pointer flex items-center justify-between gap-3 transition",
                            isSelected
                              ? "bg-indigo-50/80 text-indigo-950 font-semibold"
                              : "hover:bg-slate-50 text-slate-800"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{evt.name}</span>
                              {isPro && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  PRO
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {evt.categoryName || "General"} · {evt.schoolOrDept || "Campus"}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded",
                                isFull
                                  ? "bg-rose-100 text-rose-700"
                                  : isKluBlocked
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              )}
                            >
                              {isFull ? "FULL" : isKluBlocked ? "KLU Quota Full" : "Available"}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {evt.totalRegistered}/{evt.participantLimit} Seats
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected Event Details Warning */}
              {selectedEventObj && (
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-1">
                  <div className="font-bold text-indigo-950 flex items-center justify-between">
                    <span>{selectedEventObj.name}</span>
                    <span className="text-slate-500 font-normal">
                      Seats: {selectedEventObj.totalRegistered} / {selectedEventObj.participantLimit}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Internal Limit: {selectedEventObj.internalLimit} (Registered: {selectedEventObj.internalRegistered})
                  </div>
                </div>
              )}

              {/* Administrative Overrides */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Admin Overrides
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideCapacity}
                    onChange={(e) => setOverrideCapacity(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Force Override Capacity &amp; PRO tier checks if limits reached</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideInstitution}
                    onChange={(e) => setOverrideInstitution(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Force Override Institution (Internal / External restriction)</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Audit Notes / Reason
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Reason for manual assignment..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEnrollModalTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedEventId || isSubmittingEnroll}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingEnroll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Enrolling Student...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm Registration
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH AUTO-SYNC MODAL */}
      {isBatchSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Run Batch Auto-Sync All Slots</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This utility scans all active delegate passes and verified event registrations in the database. Any pass
                where recorded <code className="text-slate-800 font-mono">slots_used</code> differs from actual
                confirmed events will be automatically corrected to match reality.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Detected Candidates: {metrics.slotDesync} desynced passes
              </div>
              <p className="text-[11px] text-amber-800">
                Safe and idempotent. Only the slots_used counter will be repaired. No registrations will be modified or
                deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchSyncModalOpen(false)}
                disabled={isBatchSyncing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchSync}
                disabled={isBatchSyncing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {isBatchSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Synchronizing System...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Execute Batch Sync
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
