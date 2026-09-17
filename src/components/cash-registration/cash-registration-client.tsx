"use client";

import { useState, useMemo, useTransition } from "react";
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

  // Filters state (identical to user side event page)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "pro" | "normal">("all");

  // Submission & Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isInternal = Boolean(
    profile?.participant_type === "internal" ||
    profile?.email?.toLowerCase()?.endsWith("@klu.ac.in")
  );

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
      return `Timing Warning: "${slot1Event.name}" and "${slot2Event.name}" both begin at ${formatTime(
        slot1Event.start_time
      )} on ${formatDate(slot1Event.event_date)}. Ensure you can participate in both.`;
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
      setErrorMessage(`"${event.name}" is a Flagship event. Flagship events must be selected as Slot 1.`);
      return;
    }

    // Rule: Slot 2 cannot be first_preference_only
    if (event.first_preference_only) {
      setErrorMessage(
        `"${event.name}" is designated as 1st preference only and cannot be assigned to Slot 2. Please select it for Slot 1.`
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
      setErrorMessage("Please select at least 1 event to register.");
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
    if (!confirm("Are you sure you want to cancel this cash registration request? You can select different events after cancelling.")) {
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
    <div className="space-y-6">
      {/* 1. HEADER & VERIFIED USER BAR */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Cash on Hand Registration
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
              <Banknote className="h-5 w-5" />
            </span>
            Cash On Hand Event Selection
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Select your 2 festival competitions (Slot 1 and Slot 2). Submit your cash request and complete payment at the registration desk on campus.
          </p>
        </div>

        {/* Verified Participant Badge Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 shrink-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-xs">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "P"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                {profile?.full_name}
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate">
              {isInternal ? "KARE Student" : profile?.college_name || "External Delegate"}
            </div>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-1.5 py-0.2 rounded">
              Verified Profile
            </span>
          </div>
        </div>
      </div>

      {/* ERROR ALERT */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. CASE A: USER ALREADY HAS ACTIVE PASS */}
      {hasActivePass && activePass && (
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-emerald-950">
              You Already Possess an Active Festival Pass!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-800 max-w-lg mx-auto">
              Your pass code is <strong className="font-mono">{activePass.passCode}</strong>. You have confirmed {activePass.slotsUsed} of {activePass.totalSlots} event slots. You do not need to register via cash.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/passes"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-800 transition-all cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>View Digital Pass & QR Code</span>
            </Link>
          </div>
        </div>
      )}

      {/* 3. CASE B: USER HAS EXISTING PENDING CASH REQUEST */}
      {!hasActivePass && existingRequest && existingRequest.status === "pending" && (
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-amber-50/60 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/80 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <Banknote className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/60 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Pending Cash Verification
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Requested on {formatDate(existingRequest.createdAt)}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                  Cash on Hand Registration Request Queued
                </h2>
              </div>
            </div>

            {/* Request Code Pill */}
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-amber-200 shadow-xs">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Request Reference Code
                </div>
                <div className="font-mono text-base sm:text-lg font-black text-slate-900">
                  {existingRequest.requestCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(existingRequest.requestCode)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
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

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount Due Card */}
            <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Cash to Pay
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                  ₹{existingRequest.totalAmount}
                </div>
                <span className="inline-block text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1">
                  {existingRequest.passTier === "pro_pass" ? "Flagship Pass (₹300)" : "Standard Pass (₹200)"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                <span>Exact cash to hand over at counter</span>
              </div>
            </div>

            {/* Selected Events (Slot 1 & Slot 2) */}
            <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-white p-4 shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Selected Competitions ({existingRequest.selectedEvents?.length || existingRequest.selectedEventIds.length}/2)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {existingRequest.selectedEvents && existingRequest.selectedEvents.length > 0 ? (
                  existingRequest.selectedEvents.map((evt, idx) => (
                    <div
                      key={evt.id}
                      className="rounded-xl border border-slate-200 p-3 bg-slate-50/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                          Slot #{idx + 1}
                        </span>
                        {evt.isProEvent && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Star className="h-2.5 w-2.5 fill-amber-500" />
                            Flagship
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                        {evt.name}
                      </h4>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
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

          {/* Action & Verification Guidance Box */}
          <div className="rounded-2xl bg-amber-100/60 border border-amber-300 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed">
                <strong>Next Step:</strong> Please visit the <strong>Euphoria Registration Desk / Help Counter on campus</strong> with cash amount of <strong>₹{existingRequest.totalAmount}</strong>. Quote your reference code <code className="font-mono font-bold bg-white/80 px-1 py-0.5 rounded">{existingRequest.requestCode}</code>. The coordinator/admin will verify payment and your Digital Pass will become active immediately!
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={isCancelling}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isCancelling ? "Cancelling..." : "Cancel & Re-select"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CASE C: EVENT SELECTION & CASH REGISTRATION FORM */}
      {!hasActivePass && (!existingRequest || existingRequest.status !== "pending") && (
        <>
          {/* SLOT TARGETS OVERVIEW CARD (Top Fixed Summary) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Festival Pass Slots ({selectedCount}/2 Selected)
                </h2>
                <p className="text-xs text-slate-500">
                  Select your Slot 1 and Slot 2 competitions from the catalog below.
                </p>
              </div>

              {/* Price Pill */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                <span className="text-xs font-bold text-emerald-800">
                  {calculatedTier === "pro_pass" ? "Flagship Pass" : "Standard Pass"}:
                </span>
                <span className="text-sm font-black text-emerald-950">
                  ₹{calculatedFee} (Cash)
                </span>
              </div>
            </div>

            {/* Two Target Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* SLOT 1 TARGET */}
              <div
                className={`rounded-2xl border-2 p-4 transition-all ${
                  slot1Event
                    ? "border-indigo-400 bg-indigo-50/40"
                    : "border-dashed border-slate-300 bg-slate-50/50 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">
                      1
                    </span>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Slot 1 • 1st Preference
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Flagship or Regular
                  </span>
                </div>

                {slot1Event ? (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {slot1Event.name}
                          </h3>
                          {slot1Event.is_pro_event && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 flex items-center gap-1">
                              <Star className="h-2.5 w-2.5 fill-amber-500" />
                              Flagship (+₹100)
                            </span>
                          )}
                          {slot1Event.first_preference_only && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-purple-100 text-purple-900">
                              1st Pref Only
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                          {slot1Event.school_or_dept} • {formatDate(slot1Event.event_date)} at {formatTime(slot1Event.start_time)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSlot1Event(null)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove from Slot 1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2.5 text-center text-xs text-slate-400 font-medium">
                    Click &quot;Assign Slot 1&quot; on any competition below to fill this slot.
                  </div>
                )}
              </div>

              {/* SLOT 2 TARGET */}
              <div
                className={`rounded-2xl border-2 p-4 transition-all ${
                  slot2Event
                    ? "border-indigo-400 bg-indigo-50/40"
                    : "border-dashed border-slate-300 bg-slate-50/50 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">
                      2
                    </span>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Slot 2 • 2nd Preference
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Regular Competitions Only
                  </span>
                </div>

                {slot2Event ? (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {slot2Event.name}
                          </h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900">
                            Regular
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                          {slot2Event.school_or_dept} • {formatDate(slot2Event.event_date)} at {formatTime(slot2Event.start_time)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSlot2Event(null)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove from Slot 2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2.5 text-center text-xs text-slate-400 font-medium">
                    Click &quot;Assign Slot 2&quot; on any regular competition below.
                  </div>
                )}
              </div>
            </div>

            {/* Time Conflict Warning */}
            {timeConflictMessage && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{timeConflictMessage}</span>
              </div>
            )}

            {/* Submit Action Strip */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {selectedCount === 0 ? (
                  <span>Select at least 1 competition to proceed with cash registration.</span>
                ) : selectedCount === 1 ? (
                  <span className="text-indigo-700 font-medium">
                    1 of 2 slots selected. You can add 1 more competition to your festival pass at no additional pass fee!
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold">
                    ✓ Both slots selected! Ready to submit cash registration request.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedCount === 0 || isSubmitting}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer ${
                  selectedCount === 0
                    ? "bg-slate-300 cursor-not-allowed text-slate-500 shadow-none"
                    : "bg-emerald-700 hover:bg-emerald-800 active:scale-95 shadow-emerald-700/20"
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Submit Cash Registration (₹{calculatedFee})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS CONTROLS (Identical UX to /events page) */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3 shadow-xs space-y-2.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-2.5">
              {/* 1. Search Box */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search competitions by title, department, venue..."
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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

              {/* 2. Tier Dropdown */}
              <div className="relative w-full sm:w-[155px] shrink-0">
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as any)}
                  className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-bold text-slate-700 focus:border-primary focus:bg-white focus:outline-hidden transition-all cursor-pointer"
                >
                  <option value="all">All Tiers ({initialEvents.length})</option>
                  <option value="pro">Flagship</option>
                  <option value="normal">Regular</option>
                </select>
                <Star className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* 3. Date Dropdown */}
              <div className="relative w-full sm:w-[155px] shrink-0">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-bold text-slate-700 focus:border-primary focus:bg-white focus:outline-hidden transition-all cursor-pointer"
                >
                  <option value="all">All Dates</option>
                  <option value="2026-09-25">Day 1 • Sep 25</option>
                  <option value="2026-09-26">Day 2 • Sep 26</option>
                </select>
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* 4. Department Dropdown */}
              <div className="relative w-full sm:w-[190px] shrink-0">
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-bold text-slate-700 focus:border-primary focus:bg-white focus:outline-hidden transition-all cursor-pointer truncate"
                >
                  <option value="all">All 14 Departments</option>
                  {schoolsData.map((sch) => (
                    <option key={sch.name} value={sch.name}>
                      {sch.name} ({sch.count})
                    </option>
                  ))}
                </select>
                <GraduationCap className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* EVENTS CATALOG GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
              <span>Showing {filteredEvents.length} competitions</span>
              {(searchQuery || selectedDate !== "all" || selectedSchool !== "all" || selectedTier !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDate("all");
                    setSelectedSchool("all");
                    setSelectedTier("all");
                  }}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                return (
                  <div
                    key={event.id}
                    className={`rounded-2xl border bg-white p-4.5 flex flex-col justify-between transition-all shadow-xs ${
                      isSelected
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                        : "border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
                    } ${isLocked ? "opacity-60 bg-slate-50/50" : ""}`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg truncate max-w-[170px]">
                          {event.school_or_dept}
                        </span>

                        <div className="flex items-center gap-1">
                          {isPro && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-200">
                              <Star className="h-2.5 w-2.5 fill-amber-500" />
                              Flagship
                            </span>
                          )}
                          {isFirstPrefOnly && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                              1st Pref Only
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Event Title & Description */}
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                          {event.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                          {event.short_description || event.description || "Exciting festival competition."}
                        </p>
                      </div>

                      {/* Meta Info: Date, Time, Venue, Seats */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{formatDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{formatTime(event.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{event.venue || "Campus Venue"}</span>
                        </div>
                      </div>

                      {/* Quota / Seat status */}
                      <div className="flex items-center justify-between text-[11px] font-medium pt-1">
                        <span className="text-slate-500">
                          {event.total_registered}/{event.participant_limit} seats filled
                        </span>
                        {isCapacityFull ? (
                          <span className="text-rose-600 font-bold">Seats Full</span>
                        ) : isQuotaFull ? (
                          <span className="text-amber-700 font-bold">KLU Quota Full</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Available</span>
                        )}
                      </div>
                    </div>

                    {/* Action Selection Buttons */}
                    <div className="pt-4 border-t border-slate-100 mt-3 space-y-2">
                      {isLocked ? (
                        <div className="w-full py-2 text-center text-xs font-bold text-slate-400 bg-slate-100 rounded-xl">
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
                            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{isSlot1 ? "Slot 1 Assigned" : "Slot 2 Assigned"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEvent(event)}
                            className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
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
                                : "border-indigo-300 bg-indigo-50/80 text-indigo-900 hover:bg-indigo-100 font-black"
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
                                ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                                : "border-indigo-300 bg-indigo-50/80 text-indigo-900 hover:bg-indigo-100 font-black"
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
        </>
      )}

      {/* 5. CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
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
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Participant Profile Check */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">{profile.full_name}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {isInternal ? "Internal KARE" : "External Delegate"}
                </span>
              </div>
              <div className="text-slate-500">
                {profile.email} • {profile.mobile_number}
              </div>
              <div className="text-slate-500 font-medium">
                {isInternal ? `Reg: ${profile.register_number} • ${profile.department}` : profile.college_name}
              </div>
            </div>

            {/* Selected Events Summary */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Selected Festival Events ({selectedCount})
              </span>

              {slot1Event && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs flex items-center justify-between">
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
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      Flagship
                    </span>
                  )}
                </div>
              )}

              {slot2Event && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-indigo-900">Slot 2:</span>
                      <span className="font-bold text-slate-900">{slot2Event.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {slot2Event.school_or_dept} • {formatDate(slot2Event.event_date)}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900">
                    Regular
                  </span>
                </div>
              )}
            </div>

            {/* Accommodation Toggle for External Delegates */}
            {!isInternal && (
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsAccommodation}
                  onChange={(e) => setNeedsAccommodation(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">I require hostel accommodation</span>
                  <p className="text-slate-500 text-[11px]">Subject to availability on campus.</p>
                </div>
              </label>
            )}

            {/* Total Payable Box */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900">Total Cash Payable at Counter</span>
                <p className="text-[11px] text-emerald-800">
                  {calculatedTier === "pro_pass" ? "Flagship Pass Tier" : "Standard Pass Tier"}
                </p>
              </div>
              <div className="text-2xl font-black text-emerald-950">
                ₹{calculatedFee}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
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
