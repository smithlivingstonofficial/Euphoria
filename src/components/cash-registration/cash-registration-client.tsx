"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  QrCode,
  ArrowRight,
  X,
  Building,
  ChevronDown,
  Star,
  Zap,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Info,
  GraduationCap,
  Layers,
  ArrowLeft,
  Trash2,
  UserCheck,
  Ticket,
  ChevronRight,
  Flame,
  Award,
} from "lucide-react";
import {
  CashRegistrationRequest,
  PublicEventForCash,
  submitCashRegistrationRequest,
  cancelCashRegistrationRequest,
} from "@/actions/cash-registration";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

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
  initialEvents,
  categories,
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

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "pro" | "normal">("all");

  // Sticky dock visibility observer
  const slotBuilderRef = useRef<HTMLDivElement>(null);
  const [showFloatingDock, setShowFloatingDock] = useState(false);

  // Submission & Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isInternal = Boolean(
    profile?.participant_type === "internal" ||
    profile?.email?.toLowerCase()?.endsWith("@klu.ac.in")
  );

  // Scroll listener for floating bottom dock
  useEffect(() => {
    const handleScroll = () => {
      if (!slotBuilderRef.current) return;
      const rect = slotBuilderRef.current.getBoundingClientRect();
      // When the bottom of the slot builder card scrolls off the top of screen
      if (rect.bottom < 120) {
        setShowFloatingDock(true);
      } else {
        setShowFloatingDock(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Copy helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Pricing calculations
  const hasPro = Boolean(slot1Event?.is_pro_event || slot2Event?.is_pro_event);
  const calculatedTier: "standard_pass" | "pro_pass" = hasPro ? "pro_pass" : "standard_pass";
  const calculatedFee = hasPro ? 300 : 200;

  // Selected count
  const selectedCount = (slot1Event ? 1 : 0) + (slot2Event ? 1 : 0);

  // Detect time conflicts between Slot 1 and Slot 2
  const timeConflictMessage = useMemo(() => {
    if (!slot1Event || !slot2Event) return null;
    if (
      slot1Event.event_date === slot2Event.event_date &&
      slot1Event.event_date &&
      slot1Event.start_time &&
      slot2Event.start_time &&
      slot1Event.start_time === slot2Event.start_time
    ) {
      return `Timing Alert: "${slot1Event.name}" and "${slot2Event.name}" both begin at ${formatTime(
        slot1Event.start_time
      )} on ${formatDate(slot1Event.event_date)}. Please verify you can participate in both.`;
    }
    return null;
  }, [slot1Event, slot2Event]);

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

  // Filtered events
  const filteredEvents = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();

    return initialEvents.filter((evt) => {
      // 1. Text search
      if (rawQuery) {
        const textTarget = `${evt.name} ${evt.school_or_dept} ${evt.venue} ${
          evt.category?.name || ""
        } ${evt.short_description || ""} ${evt.description || ""}`.toLowerCase();
        if (!textTarget.includes(rawQuery)) return false;
      }

      // 2. Date Filter
      if (selectedDate !== "all") {
        if (selectedDate === "2026-09-25" && evt.event_date !== "2026-09-25") return false;
        if (selectedDate === "2026-09-26" && evt.event_date !== "2026-09-26") return false;
      }

      // 3. School Filter
      if (selectedSchool !== "all" && evt.school_or_dept !== selectedSchool) {
        return false;
      }

      // 4. Tier Filter
      if (selectedTier === "pro" && !evt.is_pro_event) return false;
      if (selectedTier === "normal" && evt.is_pro_event) return false;

      return true;
    });
  }, [initialEvents, searchQuery, selectedDate, selectedSchool, selectedTier]);

  // Event Slot Assignment Handlers
  const handleAssignToSlot1 = (event: PublicEventForCash) => {
    setErrorMessage(null);

    // If currently in slot 2, remove from slot 2
    if (slot2Event?.id === event.id) {
      setSlot2Event(null);
    }
    setSlot1Event(event);
  };

  const handleAssignToSlot2 = (event: PublicEventForCash) => {
    setErrorMessage(null);

    // Rule: Slot 2 cannot be Pro
    if (event.is_pro_event) {
      setErrorMessage(`"${event.name}" is a Flagship competition. Flagship competitions must be assigned to Slot 1.`);
      return;
    }

    // Rule: Slot 2 cannot be first_preference_only
    if (event.first_preference_only) {
      setErrorMessage(
        `"${event.name}" is designated as 1st preference only and cannot be assigned to Slot 2. Please choose it for Slot 1.`
      );
      return;
    }

    // If currently in slot 1, remove from slot 1
    if (slot1Event?.id === event.id) {
      setSlot1Event(null);
    }
    setSlot2Event(event);
  };

  const handleToggleEvent = (event: PublicEventForCash) => {
    setErrorMessage(null);

    // If already in slot 1 -> remove
    if (slot1Event?.id === event.id) {
      setSlot1Event(null);
      return;
    }

    // If already in slot 2 -> remove
    if (slot2Event?.id === event.id) {
      setSlot2Event(null);
      return;
    }

    // Not selected yet. Determine target slot
    // If Pro event or First Preference Only -> MUST be Slot 1
    if (event.is_pro_event || event.first_preference_only) {
      setSlot1Event(event);
      return;
    }

    // Regular event: Put into empty slot 1 first, otherwise slot 2
    if (!slot1Event) {
      setSlot1Event(event);
    } else if (!slot2Event) {
      setSlot2Event(event);
    } else {
      // Both slots full -> replace Slot 2 by default
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

      // Successfully submitted! Refresh page data
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
    <div className="space-y-6 pb-20">
      {/* 1. HERO BANNER & PARTICIPANT CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-white">
        {/* Ambient Glowing Blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Breadcrumb & Live Portal Badge */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-xs transition-all border border-white/10"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
              <span className="text-slate-500 text-xs">•</span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Campus Desk Registration Portal</span>
              </div>
            </div>

            {/* Title & Tagline */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25">
                  <Banknote className="h-6 w-6" />
                </span>
                <span>Cash On Hand Registration</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-normal mt-2 leading-relaxed max-w-xl">
                Select your 2 festival competitions, generate your unique cash reference voucher, and complete payment directly at the Euphoria Help Counter on campus.
              </p>
            </div>

            {/* 3-Step Process Indicator */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-semibold text-slate-300">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                  1
                </span>
                <span className="truncate">Select 2 Events</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-400 text-slate-950 text-[10px] font-black">
                  2
                </span>
                <span className="truncate">Get Cash Code</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  3
                </span>
                <span className="truncate">Pay at Counter</span>
              </div>
            </div>
          </div>

          {/* Participant Profile Badge */}
          <div className="relative z-10 flex items-center gap-3.5 p-4 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl shrink-0 shadow-lg">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-lg shadow-md">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "P"}
            </div>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-white truncate max-w-[170px]">
                  {profile?.full_name}
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              </div>
              <div className="text-xs text-slate-300 font-medium truncate mt-0.5">
                {isInternal ? "Kalasalingam Student (KARE)" : profile?.college_name || "External Delegate"}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {isInternal ? "Internal Pass Eligible" : "External Delegate"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR ALERT */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. CASE A: USER ALREADY HAS ACTIVE PASS */}
      {hasActivePass && activePass && (
        <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50 p-6 sm:p-10 shadow-lg text-center space-y-5">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">
              You Already Possess an Active Festival Pass!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
              Your official pass code is <strong className="font-mono font-bold bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">{activePass.passCode}</strong>. You have confirmed {activePass.slotsUsed} of {activePass.totalSlots} event slots. You do not need to register via cash.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/passes"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-emerald-800 transition-all cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>View Digital Pass & QR Code</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. CASE B: USER HAS EXISTING PENDING CASH REQUEST (Ticket Voucher Style) */}
      {!hasActivePass && existingRequest && existingRequest.status === "pending" && (
        <div className="rounded-3xl border-2 border-amber-300 bg-white shadow-xl overflow-hidden">
          {/* Voucher Header Strip */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs text-white shadow-inner">
                <Ticket className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 bg-white/90 px-2.5 py-0.5 rounded-full">
                    Awaiting Cash Verification
                  </span>
                  <span className="text-xs text-amber-100 font-medium">
                    Requested on {formatDate(existingRequest.createdAt)}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  Cash on Hand Registration Voucher Queued
                </h2>
              </div>
            </div>

            {/* Monospace Reference Code Box */}
            <div className="flex items-center gap-3 bg-white/95 text-slate-900 px-4 py-2.5 rounded-2xl shadow-md border border-amber-200 self-start sm:self-auto">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Counter Reference Code
                </div>
                <div className="font-mono text-base sm:text-xl font-black text-slate-900 tracking-wider">
                  {existingRequest.requestCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(existingRequest.requestCode)}
                className="p-2 text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                title="Copy Request Code"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Voucher Body Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Cash Due Card */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-orange-50/50 p-5 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Total Amount to Pay
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
                    ₹{existingRequest.totalAmount}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-amber-200 px-2.5 py-1 rounded-lg mt-2">
                    {existingRequest.passTier === "pro_pass" ? (
                      <>
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>Flagship Pass Tier (₹300)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>Standard Pass Tier (₹200)</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="text-xs text-slate-600 mt-4 pt-3 border-t border-amber-200/60 flex items-center gap-2 font-medium">
                  <Banknote className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Exact cash to hand over at counter</span>
                </div>
              </div>

              {/* Chosen Events Grid */}
              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Chosen Competitions ({existingRequest.selectedEvents?.length || existingRequest.selectedEventIds.length}/2)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {existingRequest.selectedEvents && existingRequest.selectedEvents.length > 0 ? (
                    existingRequest.selectedEvents.map((evt, idx) => (
                      <div
                        key={evt.id}
                        className="rounded-2xl border border-slate-200/90 p-3.5 bg-white shadow-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                            Slot #{idx + 1}
                          </span>
                          {evt.isProEvent && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              Flagship
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                          {evt.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                          <span>{evt.schoolOrDept || "General"}</span>
                          {evt.eventDate && <span>• {formatDate(evt.eventDate)}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500">
                      {existingRequest.selectedEventIds.length} competitions selected.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Next Step Instructions Card */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm mt-0.5">
                  <Info className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">
                    How to verify payment and activate your pass:
                  </h4>
                  <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside leading-relaxed font-medium">
                    <li>Visit the <strong>Euphoria Registration Desk / Help Counter on campus</strong>.</li>
                    <li>Quote your Reference Code: <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-slate-900">{existingRequest.requestCode}</code></li>
                    <li>Pay the exact cash amount of <strong>₹{existingRequest.totalAmount}</strong>.</li>
                    <li>The coordinator will mark your payment verified and your <strong>Digital Pass with QR code</strong> will activate immediately!</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  disabled={isCancelling}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isCancelling ? "Cancelling..." : "Cancel & Re-select"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CASE C: EVENT SELECTION & CASH REGISTRATION BUILDER */}
      {!hasActivePass && (!existingRequest || existingRequest.status !== "pending") && (
        <>
          {/* SLOT BUILDER TOP CARD */}
          <div
            ref={slotBuilderRef}
            className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Festival Pass Slot Builder
                  </h2>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedCount}/2 Slots Filled
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your pass includes up to 2 competitions. Select your Slot 1 and Slot 2 below.
                </p>
              </div>

              {/* Dynamic Price Tag */}
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl self-start sm:self-auto shadow-2xs">
                <div className="text-right">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                    {calculatedTier === "pro_pass" ? "Flagship Pass Tier" : "Standard Pass Tier"}
                  </div>
                  <div className="text-lg font-black text-emerald-950 leading-none">
                    ₹{calculatedFee} <span className="text-xs font-medium text-emerald-700">(Cash)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Visual Target Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SLOT 1 TARGET CARD */}
              <div
                className={`relative rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200 ${
                  slot1Event
                    ? "border-indigo-500 bg-gradient-to-br from-indigo-50/60 via-white to-indigo-50/40 shadow-sm"
                    : "border-dashed border-indigo-200 bg-indigo-50/20 hover:border-indigo-300 hover:bg-indigo-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shadow-xs">
                      1
                    </span>
                    <div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                        Slot 1 • 1st Preference
                      </span>
                      <span className="text-[10px] text-indigo-700 font-semibold">
                        Flagship or Regular Competition
                      </span>
                    </div>
                  </div>
                </div>

                {slot1Event ? (
                  <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {slot1Event.name}
                          </h3>
                          {slot1Event.is_pro_event && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-200">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              Flagship (+₹100)
                            </span>
                          )}
                          {slot1Event.first_preference_only && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                              1st Pref Only
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                          <span className="text-indigo-900 font-semibold">{slot1Event.school_or_dept}</span>
                          <span>•</span>
                          <span>{formatDate(slot1Event.event_date)} at {formatTime(slot1Event.start_time)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSlot1Event(null)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove from Slot 1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center rounded-xl border border-dashed border-indigo-200/80 bg-white/60">
                    <Sparkles className="h-5 w-5 text-indigo-400 mx-auto mb-1 opacity-70" />
                    <p className="text-xs text-slate-600 font-bold">Slot 1 is Empty</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;Slot 1&quot; on any competition below to fill this slot.
                    </p>
                  </div>
                )}
              </div>

              {/* SLOT 2 TARGET CARD */}
              <div
                className={`relative rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200 ${
                  slot2Event
                    ? "border-teal-500 bg-gradient-to-br from-teal-50/60 via-white to-teal-50/40 shadow-sm"
                    : "border-dashed border-teal-200 bg-teal-50/20 hover:border-teal-300 hover:bg-teal-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-600 text-white font-black text-xs shadow-xs">
                      2
                    </span>
                    <div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                        Slot 2 • 2nd Preference
                      </span>
                      <span className="text-[10px] text-teal-700 font-semibold">
                        Regular Competitions (Included at ₹0)
                      </span>
                    </div>
                  </div>
                </div>

                {slot2Event ? (
                  <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {slot2Event.name}
                          </h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                            Regular
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                          <span className="text-teal-900 font-semibold">{slot2Event.school_or_dept}</span>
                          <span>•</span>
                          <span>{formatDate(slot2Event.event_date)} at {formatTime(slot2Event.start_time)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSlot2Event(null)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove from Slot 2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center rounded-xl border border-dashed border-teal-200/80 bg-white/60">
                    <Layers className="h-5 w-5 text-teal-400 mx-auto mb-1 opacity-70" />
                    <p className="text-xs text-slate-600 font-bold">Slot 2 is Empty</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;Slot 2&quot; on any regular competition below.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Time Conflict Alert */}
            {timeConflictMessage && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 flex items-center gap-2.5 font-medium shadow-2xs animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{timeConflictMessage}</span>
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs">
                {selectedCount === 0 ? (
                  <span className="text-slate-500">
                    Select at least 1 competition from the catalog below to proceed.
                  </span>
                ) : selectedCount === 1 ? (
                  <span className="text-indigo-700 font-semibold">
                    1 of 2 slots selected. You can add 1 more competition to your festival pass for ₹0!
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Both slots filled! Ready to submit cash registration request.</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedCount === 0 || isSubmitting}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer ${
                  selectedCount === 0
                    ? "bg-slate-300 cursor-not-allowed text-slate-500 shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-600/25"
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Submit Cash Registration (₹{calculatedFee})</span>
                <ArrowRight className="h-4 w-4 ml-0.5" />
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS CONTROLS */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            {/* Top row: Search Bar & Department Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search competitions by name, department, venue..."
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Department Dropdown */}
              <div className="relative w-full sm:w-[220px] shrink-0">
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full h-11 appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all cursor-pointer truncate"
                >
                  <option value="all">All 14 Departments</option>
                  {schoolsData.map((sch) => (
                    <option key={sch.name} value={sch.name}>
                      {sch.name} ({sch.count})
                    </option>
                  ))}
                </select>
                <GraduationCap className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Bottom row: Filter Pills for Tiers and Dates */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Filter:
                </span>

                {/* Tier Pills */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTier("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTier === "all"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Tiers ({initialEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTier("pro")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      selectedTier === "pro"
                        ? "bg-white text-amber-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span>Flagship</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTier("normal")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTier === "normal"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Regular
                  </button>
                </div>

                {/* Date Pills */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDate("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedDate === "all"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate("2026-09-25")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedDate === "2026-09-25"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Day 1 • Sep 25
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate("2026-09-26")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedDate === "2026-09-26"
                        ? "bg-white text-indigo-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Day 2 • Sep 26
                  </button>
                </div>
              </div>

              {/* Reset link */}
              {(searchQuery || selectedDate !== "all" || selectedSchool !== "all" || selectedTier !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDate("all");
                    setSelectedSchool("all");
                    setSelectedTier("all");
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline self-end sm:self-auto"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* EVENTS CATALOG GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <span>Showing {filteredEvents.length} competitions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((event) => {
                const isSlot1 = slot1Event?.id === event.id;
                const isSlot2 = slot2Event?.id === event.id;
                const isSelected = isSlot1 || isSlot2;

                const isBlockedKlu = isInternal && event.allow_internal === false;
                const isBlockedExternal = !isInternal && event.allow_external === false;
                const isCapacityFull = event.is_total_full;
                const isQuotaFull = isInternal && event.is_internal_full;
                const isLocked = isBlockedKlu || isBlockedExternal || isCapacityFull || isQuotaFull;

                const isPro = event.is_pro_event;
                const isFirstPrefOnly = event.first_preference_only;

                const limit = event.participant_limit || 100;
                const registered = event.total_registered || 0;
                const occupancyPercent = Math.min(100, Math.round((registered / limit) * 100));

                return (
                  <div
                    key={event.id}
                    className={`group relative rounded-3xl border bg-white p-5 flex flex-col justify-between transition-all duration-200 ${
                      isSelected
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg -translate-y-0.5"
                        : "border-slate-200/90 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1"
                    } ${isLocked ? "opacity-60 bg-slate-50/60" : ""}`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges & Status */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl truncate max-w-[180px]">
                          {event.school_or_dept}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isPro && (
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center gap-1 shadow-2xs">
                              <Star className="h-2.5 w-2.5 fill-white text-white" />
                              Flagship
                            </span>
                          )}
                          {isFirstPrefOnly && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-200">
                              1st Pref
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Event Title & Description */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                          {event.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                          {event.short_description || event.description || "Official Euphoria 2026 technical competition."}
                        </p>
                      </div>

                      {/* Meta Info: Date, Time, Venue */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate font-medium">{formatDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate font-medium">{formatTime(event.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate font-medium">{event.venue || "Campus Venue"}</span>
                        </div>
                      </div>

                      {/* Capacity Meter / Seats Status */}
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-slate-500">
                            {registered}/{limit} seats filled
                          </span>
                          {isCapacityFull ? (
                            <span className="text-rose-600 font-bold">Seats Full</span>
                          ) : isQuotaFull ? (
                            <span className="text-amber-700 font-bold">KLU Quota Full</span>
                          ) : occupancyPercent > 80 ? (
                            <span className="text-amber-600 font-bold">Filling Fast</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Available</span>
                          )}
                        </div>
                        {/* Mini progress bar */}
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCapacityFull
                                ? "bg-rose-500"
                                : occupancyPercent > 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Selection Buttons */}
                    <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                      {isLocked ? (
                        <div className="w-full py-2.5 text-center text-xs font-bold text-slate-400 bg-slate-100 rounded-xl">
                          {isCapacityFull
                            ? "Capacity Full"
                            : isQuotaFull
                            ? "KLU Quota Full"
                            : "Not Available for your Role"}
                        </div>
                      ) : isSelected ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleEvent(event)}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                              isSlot1 ? "bg-indigo-600 hover:bg-indigo-700" : "bg-teal-600 hover:bg-teal-700"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{isSlot1 ? "Assigned to Slot 1" : "Assigned to Slot 2"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEvent(event)}
                            className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {/* Assign Slot 1 Button */}
                          <button
                            type="button"
                            onClick={() => handleAssignToSlot1(event)}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              slot1Event
                                ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                                : "border-indigo-300 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 font-extrabold shadow-2xs"
                            }`}
                          >
                            <span>Slot 1</span>
                          </button>

                          {/* Assign Slot 2 Button */}
                          <button
                            type="button"
                            disabled={isPro || isFirstPrefOnly}
                            onClick={() => handleAssignToSlot2(event)}
                            title={
                              isPro
                                ? "Flagship events must be Slot 1"
                                : isFirstPrefOnly
                                ? "1st preference only"
                                : "Assign to Slot 2"
                            }
                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isPro || isFirstPrefOnly
                                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                : slot2Event
                                ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50/50"
                                : "border-teal-300 bg-teal-50 text-teal-950 hover:bg-teal-100 font-extrabold shadow-2xs"
                            }`}
                          >
                            <span>{isPro ? "No Slot 2" : isFirstPrefOnly ? "Slot 1 Only" : "Slot 2"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. STICKY FLOATING BOTTOM DOCK (Appears on Scroll) */}
          {showFloatingDock && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[calc(100%-2rem)] bg-slate-950/95 text-white backdrop-blur-md border border-white/15 rounded-2xl p-3 sm:px-5 sm:py-3 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Slot 1 Mini Chip */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold truncate max-w-[120px] sm:max-w-[170px] ${
                    slot1Event ? "bg-indigo-600 text-white" : "bg-white/10 text-slate-400 border border-white/10"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">S1:</span>
                  <span className="truncate">{slot1Event ? slot1Event.name : "Empty"}</span>
                </div>

                {/* Slot 2 Mini Chip */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold truncate max-w-[120px] sm:max-w-[170px] ${
                    slot2Event ? "bg-teal-600 text-white" : "bg-white/10 text-slate-400 border border-white/10"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">S2:</span>
                  <span className="truncate">{slot2Event ? slot2Event.name : "Empty"}</span>
                </div>

                {/* Total Cash Price */}
                <div className="hidden sm:block text-xs font-black text-emerald-400">
                  ₹{calculatedFee}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={selectedCount === 0 || isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedCount === 0
                      ? "bg-white/10 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md font-extrabold"
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  <span>Submit ({selectedCount}/2)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 6. CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-sm">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Confirm Cash Registration Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review your selected events and cash amount
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

            {/* Participant Profile Check */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{profile?.full_name}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {isInternal ? "Internal KARE" : "External Delegate"}
                </span>
              </div>
              <div className="text-slate-600">
                {profile?.email} {profile?.mobile_number ? `• ${profile.mobile_number}` : ""}
              </div>
              <div className="text-slate-500 font-medium">
                {isInternal
                  ? `Reg: ${profile?.register_number || "N/A"} • ${profile?.department || "Department"}`
                  : profile?.college_name || "External College"}
              </div>
            </div>

            {/* Selected Events Summary */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block">
                Selected Festival Events ({selectedCount})
              </span>

              {slot1Event && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3.5 text-xs flex items-center justify-between">
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
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                      Flagship (+₹100)
                    </span>
                  )}
                </div>
              )}

              {slot2Event && (
                <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-3.5 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-teal-900">Slot 2:</span>
                      <span className="font-bold text-slate-900">{slot2Event.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {slot2Event.school_or_dept} • {formatDate(slot2Event.event_date)}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-200">
                    Regular (₹0)
                  </span>
                </div>
              )}
            </div>

            {/* Accommodation Toggle for External Delegates */}
            {!isInternal && (
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
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
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                  Total Cash Payable at Counter
                </span>
                <p className="text-[11px] text-emerald-800">
                  {calculatedTier === "pro_pass" ? "Flagship Festival Pass" : "Standard Festival Pass"}
                </p>
              </div>
              <div className="text-2xl font-black text-emerald-950">
                ₹{calculatedFee}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
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
