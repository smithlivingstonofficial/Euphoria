"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  AdminEventSlotControlItem,
  updateEventSlotControlAdmin,
  bulkUpdateEventSlotControlAdmin,
  getEventsSlotControlAdmin,
} from "@/actions/admin";
import {
  Search,
  Users,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  TrendingUp,
  Plus,
  Minus,
  Check,
  X,
  Pencil,
  Trash2,
  Building,
  Calendar,
  Clock,
  Star,
  Zap,
  Info,
  ChevronDown,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface SlotsControlClientProps {
  initialEvents: AdminEventSlotControlItem[];
  initialStats: {
    totalEvents: number;
    kluBlockedEvents: number;
    fullCapacityEvents: number;
    totalCapacity: number;
    totalConfirmed: number;
    totalInternalConfirmed: number;
    totalExternalConfirmed: number;
  };
  initialError?: string;
  isSuperAdmin?: boolean;
}

// ============================================================================
// 1. OVERALL CAPACITY INLINE CELL (Scroll-Proof & Ergonomic)
// ============================================================================
function OverallCapacityCell({
  evt,
  isPending,
  onUpdateLimit,
}: {
  evt: AdminEventSlotControlItem;
  isPending: boolean;
  onUpdateLimit: (evt: AdminEventSlotControlItem, newLimit: number) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(evt.participant_limit));

  useEffect(() => {
    setDraftValue(String(evt.participant_limit));
  }, [evt.participant_limit]);

  const handleSave = () => {
    const num = parseInt(draftValue, 10);
    if (!isNaN(num) && num >= 1) {
      onUpdateLimit(evt, num);
      setIsEditing(false);
    } else {
      setDraftValue(String(evt.participant_limit));
      setIsEditing(false);
    }
  };

  const handleStep = (delta: number) => {
    const next = Math.max(evt.total_confirmed, evt.participant_limit + delta);
    onUpdateLimit(evt, next);
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1 rounded-xl border border-indigo-300 bg-white p-1 shadow-xs animate-in fade-in">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draftValue}
          autoFocus
          onChange={(e) => {
            const clean = e.target.value.replace(/[^0-9]/g, "");
            setDraftValue(clean);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setDraftValue(String(evt.participant_limit));
              setIsEditing(false);
            }
          }}
          onWheel={(e) => {
            e.preventDefault();
            e.currentTarget.blur();
          }}
          className="w-14 text-center text-xs font-black font-mono bg-slate-50 rounded-lg border border-slate-200 py-1 text-slate-900 focus:outline-hidden focus:border-indigo-600"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          title="Save Capacity"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraftValue(String(evt.participant_limit));
            setIsEditing(false);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          title="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 shadow-2xs hover:border-slate-300 transition-colors">
      <button
        type="button"
        onClick={() => handleStep(-10)}
        disabled={evt.participant_limit <= evt.total_confirmed || isPending}
        className="px-1.5 py-1 text-[10px] font-black font-mono text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer transition-colors rounded-lg hover:bg-slate-200/60"
        title={`Decrease by 10 (min ${evt.total_confirmed})`}
      >
        -10
      </button>
      <button
        type="button"
        onClick={() => {
          setDraftValue(String(evt.participant_limit));
          setIsEditing(true);
        }}
        className="px-2 py-1 text-xs font-black font-mono text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
        title="Click to manually edit capacity"
      >
        <span>{evt.participant_limit}</span>
        <Pencil className="h-2.5 w-2.5 text-slate-400 opacity-60" />
      </button>
      <button
        type="button"
        onClick={() => handleStep(+10)}
        disabled={isPending}
        className="px-1.5 py-1 text-[10px] font-black font-mono text-slate-500 hover:text-slate-800 cursor-pointer transition-colors rounded-lg hover:bg-slate-200/60"
        title="Increase by 10"
      >
        +10
      </button>
    </div>
  );
}

// ============================================================================
// 2. INTERNAL QUOTA CAP INLINE CELL (Scroll-Proof, Clear & Ergonomic)
// ============================================================================
function InternalQuotaCapCell({
  evt,
  isPending,
  onUpdateInternalLimit,
}: {
  evt: AdminEventSlotControlItem;
  isPending: boolean;
  onUpdateInternalLimit: (evt: AdminEventSlotControlItem, newInternalLimit: number | null) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(
    evt.internal_limit !== null ? String(evt.internal_limit) : ""
  );

  useEffect(() => {
    setDraftValue(evt.internal_limit !== null ? String(evt.internal_limit) : "");
  }, [evt.internal_limit]);

  const handleSave = () => {
    if (draftValue.trim() === "") {
      onUpdateInternalLimit(evt, null);
      setIsEditing(false);
      return;
    }
    const num = parseInt(draftValue, 10);
    if (!isNaN(num) && num >= 0) {
      onUpdateInternalLimit(evt, num);
      setIsEditing(false);
    }
  };

  const handleClear = () => {
    onUpdateInternalLimit(evt, null);
    setIsEditing(false);
  };

  const handleCapCurrent = () => {
    onUpdateInternalLimit(evt, evt.internal_confirmed);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="w-[195px] space-y-1.5 p-2 rounded-2xl bg-white border border-amber-300 shadow-md ring-2 ring-amber-100/70 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between text-[11px] font-black text-amber-950">
          <span>Cap KLU Quota:</span>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stepper row: strictly type="text" inputMode="numeric", wheel scroll intercepted */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const current = parseInt(draftValue, 10) || 0;
              setDraftValue(String(Math.max(0, current - 5)));
            }}
            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-mono text-[10px] flex items-center justify-center transition-colors cursor-pointer"
            title="Minus 5"
          >
            -5
          </button>
          <button
            type="button"
            onClick={() => {
              const current = parseInt(draftValue, 10) || 0;
              setDraftValue(String(Math.max(0, current - 1)));
            }}
            className="h-7 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors cursor-pointer"
            title="Minus 1"
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draftValue}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9]/g, "");
              setDraftValue(clean);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onWheel={(e) => {
              e.preventDefault();
              e.currentTarget.blur();
            }}
            placeholder="Max KLU"
            autoFocus
            className="h-7 w-16 text-center text-xs font-black font-mono rounded-lg border border-slate-300 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 text-slate-900 bg-white"
          />
          <button
            type="button"
            onClick={() => {
              const current = parseInt(draftValue, 10) || 0;
              setDraftValue(String(current + 1));
            }}
            className="h-7 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors cursor-pointer"
            title="Plus 1"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              const current = parseInt(draftValue, 10) || 0;
              setDraftValue(String(current + 5));
            }}
            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-mono text-[10px] flex items-center justify-center transition-colors cursor-pointer"
            title="Plus 5"
          >
            +5
          </button>
        </div>

        {/* Quick action bar */}
        <div className="flex items-center justify-between gap-1 pt-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setDraftValue(String(evt.internal_confirmed))}
            className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
            title={`Fill current confirmed KLU (${evt.internal_confirmed})`}
          >
            Fill: {evt.internal_confirmed}
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] shadow-xs flex items-center gap-0.5 cursor-pointer"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not in editing mode:
  if (evt.internal_limit === null) {
    return (
      <div className="space-y-1.5 min-w-[155px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
            <Unlock className="h-3 w-3 text-slate-400" />
            No Cap (Open)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCapCurrent}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-900 border border-amber-300/80 px-2 py-1 text-[10px] font-extrabold shadow-2xs transition-colors cursor-pointer"
            title={`Cap at current confirmed KLU students (${evt.internal_confirmed})`}
          >
            <Zap className="h-2.5 w-2.5 text-amber-700 fill-amber-700" />
            Cap @ {evt.internal_confirmed}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftValue(String(evt.internal_confirmed));
              setIsEditing(true);
            }}
            disabled={isPending}
            className="inline-flex items-center gap-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-1 text-[10px] font-bold transition-colors cursor-pointer"
            title="Set custom KLU cap"
          >
            <Pencil className="h-2.5 w-2.5" />
            Set
          </button>
        </div>
      </div>
    );
  }

  // Capped state:
  const isFull = (evt.remaining_internal_slots ?? 0) <= 0;
  return (
    <div className="space-y-1 min-w-[155px]">
      <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 shadow-2xs">
        <span className="font-mono font-black text-xs text-amber-950 flex items-center gap-1">
          <Lock className="h-3 w-3 text-amber-700" />
          Max {evt.internal_limit}
        </span>
        <div className="flex items-center gap-0.5 border-l border-amber-300/80 pl-1.5 ml-0.5">
          <button
            type="button"
            onClick={() => {
              setDraftValue(String(evt.internal_limit));
              setIsEditing(true);
            }}
            disabled={isPending}
            className="p-1 rounded-md text-amber-800 hover:text-amber-950 hover:bg-amber-200/60 transition-colors cursor-pointer"
            title="Edit KLU quota limit"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="p-1 rounded-md text-rose-600 hover:text-rose-800 hover:bg-rose-100/70 transition-colors cursor-pointer"
            title="Clear quota cap (allow all KLU)"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="text-[10px] font-mono leading-tight">
        {isFull ? (
          <span className="text-rose-600 font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            0 left (KLU Full)
          </span>
        ) : (
          <span className="text-slate-500 font-medium">
            {evt.remaining_internal_slots} slot{evt.remaining_internal_slots === 1 ? "" : "s"} left
          </span>
        )}
      </div>
    </div>
  );
}

export function SlotsControlClient({
  initialEvents,
  initialStats,
  initialError,
  isSuperAdmin,
}: SlotsControlClientProps) {
  const [events, setEvents] = useState<AdminEventSlotControlItem[]>(initialEvents);
  const [stats, setStats] = useState(initialStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "pro" | "normal">("all");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "klu_blocked" | "klu_allowed" | "full">("all");

  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State for "Expand Slots & Reserve for Externals"
  const [expandModalEvent, setExpandModalEvent] = useState<AdminEventSlotControlItem | null>(null);
  const [expandedNewLimit, setExpandedNewLimit] = useState<number>(100);
  const [isAutoBlockChecked, setIsAutoBlockChecked] = useState<boolean>(true);

  // Department list for dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.school_or_dept) set.add(e.school_or_dept);
    });
    return Array.from(set).sort();
  }, [events]);

  // Refresh data from server
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedback(null);
    try {
      const res = await getEventsSlotControlAdmin();
      if (res.success) {
        setEvents(res.events);
        setStats(res.stats);
        setFeedback({ type: "success", message: "Slot telemetry refreshed successfully." });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to refresh slot data." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error refreshing slot data." });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((evt) => {
      if (q) {
        const matchesName = evt.name.toLowerCase().includes(q);
        const matchesDept = evt.school_or_dept.toLowerCase().includes(q);
        const matchesVenue = (evt.venue || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDept && !matchesVenue) return false;
      }

      if (selectedSchool !== "all" && evt.school_or_dept !== selectedSchool) {
        return false;
      }

      if (selectedTier === "pro" && !evt.is_pro_event) return false;
      if (selectedTier === "normal" && evt.is_pro_event) return false;

      if (selectedFilter === "klu_blocked" && !evt.is_klu_blocked) return false;
      if (selectedFilter === "klu_allowed" && evt.is_klu_blocked) return false;
      if (selectedFilter === "full" && !evt.is_total_full) return false;

      return true;
    });
  }, [events, searchQuery, selectedSchool, selectedTier, selectedFilter]);

  // Quick 1-click toggle Allow KLU
  const handleToggleAllowKlu = async (evt: AdminEventSlotControlItem) => {
    const newAllowInternal = !evt.allow_internal;
    startTransition(async () => {
      const res = await updateEventSlotControlAdmin({
        eventId: evt.id,
        allow_internal: newAllowInternal,
      });

      if (res.success) {
        setEvents((prev) =>
          prev.map((item) =>
            item.id === evt.id
              ? {
                  ...item,
                  allow_internal: newAllowInternal,
                  is_klu_blocked: !newAllowInternal || (item.internal_limit !== null && item.internal_confirmed >= item.internal_limit),
                }
              : item
          )
        );
        setFeedback({
          type: "success",
          message: newAllowInternal
            ? `KLU students unblocked for "${evt.name}".`
            : `KLU students blocked for "${evt.name}". Reserved for externals.`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update toggle." });
      }
    });
  };

  // Quick 1-click toggle Allow External
  const handleToggleAllowExternal = async (evt: AdminEventSlotControlItem) => {
    const newAllowExternal = !evt.allow_external;
    startTransition(async () => {
      const res = await updateEventSlotControlAdmin({
        eventId: evt.id,
        allow_external: newAllowExternal,
      });

      if (res.success) {
        setEvents((prev) =>
          prev.map((item) =>
            item.id === evt.id ? { ...item, allow_external: newAllowExternal } : item
          )
        );
        setFeedback({
          type: "success",
          message: `External delegate access updated for "${evt.name}".`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update toggle." });
      }
    });
  };

  // Inline update participant limit
  const handleUpdateParticipantLimit = async (evt: AdminEventSlotControlItem, newLimit: number) => {
    if (newLimit < 1) return;
    startTransition(async () => {
      const res = await updateEventSlotControlAdmin({
        eventId: evt.id,
        participant_limit: newLimit,
      });

      if (res.success) {
        setEvents((prev) =>
          prev.map((item) =>
            item.id === evt.id
              ? {
                  ...item,
                  participant_limit: newLimit,
                  is_total_full: item.total_confirmed >= newLimit,
                  remaining_total_slots: Math.max(0, newLimit - item.total_confirmed),
                  remaining_external_reserved: item.is_klu_blocked
                    ? Math.max(0, newLimit - item.total_confirmed)
                    : Math.max(0, newLimit - item.total_confirmed),
                }
              : item
          )
        );
        setFeedback({ type: "success", message: `Capacity updated to ${newLimit} for "${evt.name}".` });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update limit." });
      }
    });
  };

  // Inline update internal limit
  const handleUpdateInternalLimit = async (evt: AdminEventSlotControlItem, newInternalLimit: number | null) => {
    startTransition(async () => {
      const res = await updateEventSlotControlAdmin({
        eventId: evt.id,
        internal_limit: newInternalLimit,
      });

      if (res.success) {
        const isIntFull = newInternalLimit !== null ? evt.internal_confirmed >= newInternalLimit : false;
        const isKluBlocked = !evt.allow_internal || isIntFull;
        setEvents((prev) =>
          prev.map((item) =>
            item.id === evt.id
              ? {
                  ...item,
                  internal_limit: newInternalLimit,
                  is_internal_full: isIntFull,
                  is_klu_blocked: isKluBlocked,
                  remaining_internal_slots: newInternalLimit !== null ? Math.max(0, newInternalLimit - item.internal_confirmed) : null,
                }
              : item
          )
        );
        setFeedback({
          type: "success",
          message:
            newInternalLimit === null
              ? `Internal quota removed for "${evt.name}".`
              : `Internal quota capped at ${newInternalLimit} for "${evt.name}".`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update quota." });
      }
    });
  };

  // Open Expand Modal
  const openExpandModal = (evt: AdminEventSlotControlItem) => {
    setExpandModalEvent(evt);
    setExpandedNewLimit(Math.max(evt.participant_limit + 20, evt.total_confirmed + 10));
    setIsAutoBlockChecked(true);
  };

  // Confirm Expand Slots with Auto Internal Lock
  const handleConfirmExpandSlots = async () => {
    if (!expandModalEvent) return;

    startTransition(async () => {
      const res = await updateEventSlotControlAdmin({
        eventId: expandModalEvent.id,
        participant_limit: expandedNewLimit,
        autoBlockInternalOnExpand: isAutoBlockChecked,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Expanded "${expandModalEvent.name}" to ${expandedNewLimit} slots${
            isAutoBlockChecked
              ? ` and capped KLU students at ${expandModalEvent.internal_confirmed} (Remaining reserved for externals).`
              : "."
          }`,
        });
        setExpandModalEvent(null);
        handleRefresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to expand event slots." });
      }
    });
  };

  // Bulk: Reserve all 100% full events for externals
  const handleBulkReserveFullEvents = async () => {
    const fullEventIds = events.filter((e) => e.is_total_full).map((e) => e.id);
    if (fullEventIds.length === 0) {
      alert("No events are currently 100% full.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to cap KLU students on all ${fullEventIds.length} currently full events? Future capacity expansions will be reserved exclusively for external delegates.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await bulkUpdateEventSlotControlAdmin({
        eventIds: fullEventIds,
        action: "reserve_for_externals",
      });

      if (res.success) {
        setFeedback({ type: "success", message: res.message || "All full events capped for KLU." });
        handleRefresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Bulk action failed." });
      }
    });
  };

  // Toggle selection for bulk actions
  const toggleSelectAll = () => {
    if (selectedEventIds.length === filteredEvents.length) {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Events &amp; Staff</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Slot &amp; Quota Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2.5">
            <span>Slot &amp; Quota Control Center</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-800 px-2.5 py-0.5 text-xs font-bold font-mono">
              Live Gateway Sync
            </span>
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Control event seat caps, Kalasalingam University student quotas, and external delegate slot
            reservations. Real-time atomic enforcement prevents overbooking across web, app, and payment gateways.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Telemetry"}</span>
          </button>

          <Link
            href="/events"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
          >
            <span>View Public Catalog</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 border flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : "bg-rose-50 border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 4 HIGH-IMPACT TELEMETRY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Competitions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Competitions
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {stats.totalEvents}
            </span>
            <span className="text-xs text-slate-500 font-medium">All 14 Schools</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{stats.fullCapacityEvents} Events At 100% Capacity</span>
          </div>
        </div>

        {/* Card 2: KLU Blocked / Capped Events */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              External-Only / Capped
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Lock className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950 font-mono">
              {stats.kluBlockedEvents}
            </span>
            <span className="text-xs text-amber-800 font-bold">
              {Math.round((stats.kluBlockedEvents / Math.max(1, stats.totalEvents)) * 100)}% of Catalog
            </span>
          </div>
          <div className="text-[11px] text-amber-800 flex items-center gap-1.5 pt-1 border-t border-amber-100 font-medium">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span>KLU students blocked • Reserved for externals</span>
          </div>
        </div>

        {/* Card 3: Capacity Utilization */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Seat Utilization
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {stats.totalConfirmed}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ {stats.totalCapacity} Total Seats</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full"
              style={{
                width: `${Math.min(100, Math.round((stats.totalConfirmed / Math.max(1, stats.totalCapacity)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: KLU vs External Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Attendee Demographics
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <span className="text-base font-black text-emerald-700 font-mono">
                {stats.totalInternalConfirmed}
              </span>
              <span className="text-[10px] text-slate-500 block">KLU Students</span>
            </div>
            <span className="text-slate-300 font-light">|</span>
            <div>
              <span className="text-base font-black text-purple-700 font-mono">
                {stats.totalExternalConfirmed}
              </span>
              <span className="text-[10px] text-slate-500 block">External Delegates</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            {stats.totalConfirmed > 0
              ? `${Math.round((stats.totalExternalConfirmed / stats.totalConfirmed) * 100)}% External Participation`
              : "Ready for registrations"}
          </div>
        </div>
      </div>

      {/* QUICK GLOBAL ACTIONS BAR */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 font-display">
              Automated Slot Expansion &amp; External Reservation Rule
            </h3>
            <p className="text-[11px] text-slate-600">
              When an event fills to 100%, expand total capacity and automatically lock KLU quota to reserve all new
              seats exclusively for external delegates.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBulkReserveFullEvents}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-800 transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Lock Full Events for Externals</span>
        </button>
      </div>

      {/* SEARCH, FILTER & BATCH CONTROLS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title, department, venue..."
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Controls Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Department Dropdown */}
            <div className="relative w-full sm:w-[170px]">
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-hidden cursor-pointer truncate"
              >
                <option value="all">All 14 Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Tier Filter */}
            <div className="relative w-full sm:w-[130px]">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as "all" | "pro" | "normal")}
                className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Tiers</option>
                <option value="pro">Flagship (Pro)</option>
                <option value="normal">Regular</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Quota Eligibility Filter */}
            <div className="relative w-full sm:w-[170px]">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-hidden cursor-pointer truncate"
              >
                <option value="all">All Slot States</option>
                <option value="klu_blocked">KLU Blocked / Capped</option>
                <option value="klu_allowed">KLU Open</option>
                <option value="full">100% Full</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Selected Batch Counter and Batch Actions Bar */}
        {selectedEventIds.length > 0 && (
          <div className="rounded-xl bg-slate-900 text-white p-2.5 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <span className="font-bold">
              {selectedEventIds.length} Event{selectedEventIds.length > 1 ? "s" : ""} Selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Block KLU students on ${selectedEventIds.length} selected events?`)) {
                    await bulkUpdateEventSlotControlAdmin({
                      eventIds: selectedEventIds,
                      action: "block_klu",
                    });
                    setSelectedEventIds([]);
                    handleRefresh();
                  }
                }}
                className="rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                Block KLU for Selected
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Unblock KLU students on ${selectedEventIds.length} selected events?`)) {
                    await bulkUpdateEventSlotControlAdmin({
                      eventIds: selectedEventIds,
                      action: "unblock_klu",
                    });
                    setSelectedEventIds([]);
                    handleRefresh();
                  }
                }}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                Unblock KLU for Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedEventIds([])}
                className="text-slate-400 hover:text-white text-[11px] px-2 py-1"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MAIN EVENTS CONTROL TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={filteredEvents.length > 0 && selectedEventIds.length === filteredEvents.length}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Event &amp; Department</th>
                <th className="px-4 py-3.5">Live Breakdown</th>
                <th className="px-4 py-3.5">Overall Capacity</th>
                <th className="px-4 py-3.5">Internal Quota Cap</th>
                <th className="px-4 py-3.5">KLU Access</th>
                <th className="px-4 py-3.5">External Access</th>
                <th className="px-4 py-3.5 text-right">Quick Expansion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => {
                  const pct = Math.min(100, Math.round((evt.total_confirmed / Math.max(1, evt.participant_limit)) * 100));

                  return (
                    <tr
                      key={evt.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        evt.is_klu_blocked ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3.5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEventIds.includes(evt.id)}
                          onChange={() => toggleSelectEvent(evt.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Event & Department */}
                      <td className="px-4 py-4 min-w-[240px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{evt.name}</span>
                            {evt.is_pro_event && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-extrabold px-1.5 py-0.2 text-[9px]">
                                <Star className="h-2.5 w-2.5 fill-amber-500" />
                                <span>PRO</span>
                              </span>
                            )}
                            {evt.is_klu_blocked ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-950 font-black px-1.5 py-0.2 text-[9px] border border-amber-300">
                                <Lock className="h-2.5 w-2.5 text-amber-700" />
                                <span>KLU BLOCKED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 font-extrabold px-1.5 py-0.2 text-[9px] border border-emerald-200">
                                <span>KLU OPEN</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Building className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]">{evt.school_or_dept}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            <span>
                              {evt.event_date ? formatDate(evt.event_date) : "TBA"} • {evt.venue || "Venue TBA"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Live Breakdown Progress */}
                      <td className="px-4 py-4 min-w-[180px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900 font-mono">
                              {evt.total_confirmed} / {evt.participant_limit}
                            </span>
                            <span
                              className={`font-black font-mono text-[10px] ${
                                evt.is_total_full ? "text-rose-600" : "text-slate-500"
                              }`}
                            >
                              {pct}% {evt.is_total_full && "(FULL)"}
                            </span>
                          </div>

                          {/* Progress Multi-Bar */}
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                            <div
                              title={`KLU Internal: ${evt.internal_confirmed}`}
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${Math.min(100, (evt.internal_confirmed / Math.max(1, evt.participant_limit)) * 100)}%`,
                              }}
                            />
                            <div
                              title={`External: ${evt.external_confirmed}`}
                              className="h-full bg-purple-500"
                              style={{
                                width: `${Math.min(100, (evt.external_confirmed / Math.max(1, evt.participant_limit)) * 100)}%`,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span className="text-emerald-700 font-bold">{evt.internal_confirmed} KLU</span>
                            <span className="text-purple-700 font-bold">{evt.external_confirmed} Ext</span>
                            <span className="text-slate-400">
                              {evt.remaining_total_slots} left
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Overall Capacity Inline Input (Scroll-Proof & Ergonomic) */}
                      <td className="px-4 py-4 min-w-[140px]">
                        <OverallCapacityCell
                          evt={evt}
                          isPending={isPending}
                          onUpdateLimit={handleUpdateParticipantLimit}
                        />
                      </td>

                      {/* Internal Limit Quota Inline Input (Scroll-Proof & Ergonomic) */}
                      <td className="px-4 py-4 min-w-[170px]">
                        <InternalQuotaCapCell
                          evt={evt}
                          isPending={isPending}
                          onUpdateInternalLimit={handleUpdateInternalLimit}
                        />
                      </td>

                      {/* Allow KLU Switch */}
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAllowKlu(evt)}
                          disabled={isPending}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            evt.allow_internal ? "bg-emerald-600" : "bg-slate-300"
                          }`}
                          role="switch"
                          aria-checked={evt.allow_internal}
                          title={evt.allow_internal ? "KLU students allowed. Click to block." : "KLU students blocked. Click to allow."}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              evt.allow_internal ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Allow External Switch */}
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAllowExternal(evt)}
                          disabled={isPending}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            evt.allow_external ? "bg-purple-600" : "bg-slate-300"
                          }`}
                          role="switch"
                          aria-checked={evt.allow_external}
                          title={evt.allow_external ? "External delegates allowed." : "External delegates blocked."}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              evt.allow_external ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Action: Expand & Reserve for Externals */}
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openExpandModal(evt)}
                          className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200/90 text-indigo-700 px-3 py-1.5 text-xs font-bold hover:bg-indigo-600 hover:text-white shadow-2xs transition-all cursor-pointer"
                          title="Expand capacity and lock KLU quota"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Expand Slots</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">
                    No competitions match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPAND CAPACITY & RESERVE FOR EXTERNALS POPUP MODAL                       */}
      {/* ========================================================================= */}
      {expandModalEvent && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">
                    Expand Event Slots &amp; Reserve Quota
                  </h3>
                  <p className="text-xs text-slate-500">Automated External Delegate Reservation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandModalEvent(null)}
                className="rounded-xl p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Event Overview Pill */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 space-y-1 text-xs">
              <span className="font-extrabold text-slate-900 block text-sm">
                {expandModalEvent.name}
              </span>
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <span>Current Total: <strong>{expandModalEvent.participant_limit} Seats</strong></span>
                <span>•</span>
                <span>Confirmed: <strong>{expandModalEvent.total_confirmed}</strong></span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">KLU: {expandModalEvent.internal_confirmed}</span>
              </div>
            </div>

            {/* New Limit Input (Scroll-Proof & Ergonomic) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                New Overall Participant Limit:
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExpandedNewLimit((prev) => Math.max(expandModalEvent.total_confirmed, prev - 10))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                  title="Decrease by 10"
                >
                  -10
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={expandedNewLimit}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, "");
                    setExpandedNewLimit(Math.max(expandModalEvent.total_confirmed, Number(clean) || 0));
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-black font-mono text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 text-center"
                />
                <button
                  type="button"
                  onClick={() => setExpandedNewLimit((prev) => prev + 10)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                  title="Add 10 seats"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedNewLimit((prev) => prev + 25)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                  title="Add 25 seats"
                >
                  +25
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedNewLimit((prev) => prev + 50)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                  title="Add 50 seats"
                >
                  +50
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Adding {Math.max(0, expandedNewLimit - expandModalEvent.participant_limit)} additional seats to this competition.
              </p>
            </div>

            {/* Checkbox: Automatically Lock KLU to current count */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoBlockChecked}
                  onChange={(e) => setIsAutoBlockChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-amber-950 block">
                    Lock Kalasalingam student quota to current attendees ({expandModalEvent.internal_confirmed})
                  </span>
                  <span className="text-[11px] text-amber-800 leading-snug block mt-0.5">
                    Recommended: Prevents internal students from claiming the expanded slots. All {Math.max(0, expandedNewLimit - expandModalEvent.internal_confirmed)} remaining slots will be reserved strictly for external delegates.
                  </span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setExpandModalEvent(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExpandSlots}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? <span>Saving...</span> : <span>Apply &amp; Reserve Slots</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
