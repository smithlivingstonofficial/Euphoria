"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  ShoppingBag,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Building,
  Star,
  Zap,
  Info,
} from "lucide-react";
import { useCart } from "@/context/cart-context";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { batchRegisterEvents } from "@/actions/events";

export function CartDrawer({
  user,
}: {
  user?: {
    id: string;
    email: string;
    fullName?: string;
    participantType?: "internal" | "external" | null;
  } | null;
}) {
  const {
    selectedEvents,
    isCartOpen,
    closeCart,
    removeEvent,
    clearCart,
    calculatePricing,
    firstSelectedEvent,
    hasProEventSelected,
    maxEventsLimit,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    masterCode: string;
    totalRegistered: number;
    totalPayable: number;
  } | null>(null);

  const pricing = calculatePricing(user?.participantType);

  // Time overlap conflict detection
  const timeConflicts = (() => {
    const conflicts: string[] = [];
    for (let i = 0; i < selectedEvents.length; i++) {
      for (let j = i + 1; j < selectedEvents.length; j++) {
        const e1 = selectedEvents[i];
        const e2 = selectedEvents[j];
        if (e1.event_date === e2.event_date && e1.event_date) {
          if (e1.start_time && e2.start_time && e1.start_time === e2.start_time) {
            conflicts.push(
              `"${e1.name}" and "${e2.name}" both start at ${formatTime(e1.start_time)} on ${formatDate(e1.event_date)}.`
            );
          }
        }
      }
    }
    return conflicts;
  })();

  const handleBatchRegister = async () => {
    if (!user) {
      window.location.href = `/login?redirect=/events`;
      return;
    }

    if (selectedEvents.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    const eventIds = selectedEvents.map((e) => e.id);
    const res = await batchRegisterEvents(eventIds);

    if (!res.success) {
      if (res.redirect) {
        window.location.href = res.redirect;
      } else {
        setErrorMessage(res.error || "Failed to register events");
      }
    } else {
      setSuccessResult({
        masterCode: res.masterCode || "CONFIRMED",
        totalRegistered: res.totalRegistered || eventIds.length,
        totalPayable: res.totalPayable || 0,
      });
      clearCart();
    }
    setIsSubmitting(false);
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end sm:justify-center">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Sheet Container: Bottom Sheet on Mobile (<640px), Slide-Over Drawer on Desktop (>=640px) */}
      <div className="relative z-10 w-full sm:fixed sm:inset-y-0 sm:right-0 sm:max-w-md flex flex-col bg-white shadow-2xl rounded-t-3xl sm:rounded-none max-h-[92vh] sm:max-h-full overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex items-center justify-center">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 py-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Pass Selection ({selectedEvents.length}/{maxEventsLimit})
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                {user?.participantType === "external"
                  ? "External Delegate Pass"
                  : "KARE Internal Delegate Pass"}
              </p>
            </div>
          </div>

          <button
            onClick={closeCart}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Close pass drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Success View */}
            {successResult ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-4 my-auto">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-emerald-950">
                    Registration Confirmed!
                  </h3>
                  <p className="text-xs text-emerald-800">
                    You have successfully registered for {successResult.totalRegistered} events.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 border border-emerald-100 shadow-xs space-y-2 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Master Registration Code
                  </span>
                  <span className="text-lg font-mono font-black text-emerald-900 tracking-wider block">
                    {successResult.masterCode}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Total Amount: <strong>{formatCurrency(successResult.totalPayable)}</strong>
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/dashboard"
                    onClick={closeCart}
                    className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>View Digital Pass &amp; Schedule</span>
                  </Link>
                </div>
              </div>
            ) : selectedEvents.length === 0 ? (
              /* Empty Cart View */
              <div className="text-center py-16 space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Your Pass is Empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Explore our technical competitions. You can select up to 2 events per pass (1 Pro + 1 Normal, or 2 Normal).
                </p>
                <button
                  onClick={closeCart}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              /* Selected Events List */
              <>
                {/* Combination Status Banner */}
                <div className="rounded-2xl border p-3.5 text-xs space-y-1 bg-slate-50 border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
                      Pass Configuration
                    </span>
                    <span className="font-mono text-[11px] font-bold text-primary">
                      {selectedEvents.length} / {maxEventsLimit} Slots
                    </span>
                  </div>

                  {selectedEvents.length === 2 && hasProEventSelected && (
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs pt-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                      <span>1 Pro Event + 1 Normal Event (Valid Pass)</span>
                    </div>
                  )}

                  {selectedEvents.length === 2 && !hasProEventSelected && (
                    <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs pt-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>2 Normal Events (Valid Pass)</span>
                    </div>
                  )}

                  {selectedEvents.length === 1 && firstSelectedEvent?.is_pro_event && (
                    <div className="flex items-center gap-1.5 text-amber-900 text-xs pt-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                      <span>Slot 1: Pro Event chosen. 1 Normal Event slot available.</span>
                    </div>
                  )}

                  {selectedEvents.length === 1 && !firstSelectedEvent?.is_pro_event && (
                    <div className="flex items-center gap-1.5 text-slate-700 text-xs pt-1">
                      <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Slot 1: Normal Event chosen. 1 Normal Event slot available (Pro locked).</span>
                    </div>
                  )}
                </div>

                {/* Time Conflict Warnings */}
                {timeConflicts.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Schedule Timing Notice</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-amber-800 list-disc list-inside">
                      {timeConflicts.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Event Cards */}
                <div className="space-y-3">
                  {selectedEvents.map((evt, index) => {
                    const isPro = Boolean(evt.is_pro_event);
                    return (
                      <div
                        key={evt.id}
                        className={`group relative rounded-2xl border p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-start justify-between gap-3 ${
                          isPro
                            ? "bg-amber-50/40 border-amber-200"
                            : "bg-white border-slate-200/90"
                        }`}
                      >
                        <div className="space-y-1 flex-1 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                              Slot #{index + 1}
                            </span>
                            {isPro ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                <span>PRO EVENT</span>
                              </span>
                            ) : (
                              <span className="rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px] font-semibold">
                                Normal Event
                              </span>
                            )}
                            <span className="rounded-md bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                              {evt.category?.name || "Track"}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                            {evt.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {evt.event_date ? formatDate(evt.event_date) : ""} •{" "}
                              {evt.start_time ? formatTime(evt.start_time) : ""}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeEvent(evt.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove event from pass"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Breakdown Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-slate-800">Delegate Pass Type</span>
                    <span className="font-extrabold text-primary">
                      {pricing.isProPass ? "⭐ Pro Delegate Pass" : "📌 Normal Delegate Pass"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>
                        {pricing.isProPass
                          ? "Pro Pass (covers 1 Pro + 1 Normal event)"
                          : "Standard Pass (covers up to 2 Normal events)"}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(pricing.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Slots Used</span>
                      <span className="font-bold text-slate-900">
                        {selectedEvents.length} of {maxEventsLimit} Slots Filled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                    <span>Total Pass Payable</span>
                    <span className="text-base text-primary">
                      {formatCurrency(pricing.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Drawer Footer */}
          {!successResult && selectedEvents.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white space-y-2.5">
              <button
                onClick={handleBatchRegister}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Generating Passes...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>
                      Register Pass ({selectedEvents.length} {selectedEvents.length === 1 ? "Event" : "Events"}) • {formatCurrency(pricing.totalAmount)}
                    </span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <button
                  onClick={clearCart}
                  className="hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
                <span>Instant QR Pass issued</span>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
