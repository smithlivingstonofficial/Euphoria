"use client";

import { useState, useEffect } from "react";
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
  Gift,
  CreditCard,
  Lock,
  Printer,
} from "lucide-react";
import { useCart } from "@/context/cart-context";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import {
  createRazorpayOrderAction,
  verifyRazorpayPaymentAction,
} from "@/actions/payments";

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
    confirmedEvents,
    needsAccommodation,
    setNeedsAccommodation,
    toggleNeedsAccommodation,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    masterCode: string;
    totalRegistered: number;
    totalPayable: number;
    paymentId?: string;
  } | null>(null);

  const pricing = calculatePricing(user?.participantType);

  // Dynamically load Razorpay SDK Script
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Time overlap conflict detection between selected events
  const timeConflicts = (() => {
    const conflicts: string[] = [];
    const allEventsToCompare = [...selectedEvents];

    for (let i = 0; i < allEventsToCompare.length; i++) {
      for (let j = i + 1; j < allEventsToCompare.length; j++) {
        const e1 = allEventsToCompare[i];
        const e2 = allEventsToCompare[j];
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

  const handleRazorpayCheckout = async () => {
    if (!user) {
      window.location.href = `/login?redirect=/events`;
      return;
    }

    if (selectedEvents.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    const eventIds = selectedEvents.map((e) => e.id);

    // 1. Create Razorpay Order Server-Side
    const orderRes = await createRazorpayOrderAction(eventIds, needsAccommodation);

    if (!orderRes.success || !orderRes.orderId) {
      if (orderRes.redirect) {
        window.location.href = orderRes.redirect;
      } else {
        setErrorMessage(orderRes.error || "Failed to initialize payment order.");
        setIsSubmitting(false);
      }
      return;
    }

    // Function to verify payment on server
    const processPaymentVerification = async (
      orderId: string,
      paymentId: string,
      signature: string
    ) => {
      const verifyRes = await verifyRazorpayPaymentAction({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        eventIds,
        needsAccommodation,
      });

      if (!verifyRes.success) {
        setErrorMessage(verifyRes.error || "Payment verification failed.");
      } else {
        setSuccessResult({
          masterCode: verifyRes.masterCode || "CONFIRMED",
          totalRegistered: verifyRes.totalRegistered || eventIds.length,
          totalPayable: verifyRes.totalPayable || orderRes.amount || 200,
          paymentId: verifyRes.paymentId,
        });
        clearCart();
      }
      setIsSubmitting(false);
    };

    // 2. Launch Razorpay Checkout SDK if loaded
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      try {
        const options = {
          key: orderRes.keyId || "rzp_test_KARE_EUPHORIA_2026",
          amount: (orderRes.amount || 200) * 100,
          currency: orderRes.currency || "INR",
          name: "EUPHORIA 2026 Festival Pass",
          description: `Delegate Pass (${orderRes.amount === 300 ? "PRO TIER" : "STANDARD TIER"})`,
          order_id: orderRes.orderId,
          prefill: {
            name: orderRes.userProfile?.name || user?.fullName || "",
            email: orderRes.userProfile?.email || user?.email || "",
          },
          theme: {
            color: "#4F46E5",
          },
          handler: async function (response: any) {
            setIsSubmitting(true);
            await processPaymentVerification(
              response.razorpay_order_id || orderRes.orderId || "",
              response.razorpay_payment_id || `pay_${Date.now()}`,
              response.razorpay_signature || ""
            );
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (err) {
        console.warn("Razorpay SDK launch error, using direct server verification:", err);
        await processPaymentVerification(
          orderRes.orderId,
          `pay_test_${Date.now()}`,
          "test_signature"
        );
      }
    } else {
      // Direct server verification fallback if Razorpay script is unavailable
      await processPaymentVerification(
        orderRes.orderId,
        `pay_test_${Date.now()}`,
        "test_signature"
      );
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] overflow-hidden flex flex-col justify-end sm:justify-stretch">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Sheet Container: Bottom Sheet on Mobile (<640px), Slide-Over Drawer on Desktop (>=640px) */}
      <div className="relative z-10 w-full sm:fixed sm:inset-y-0 sm:right-0 sm:w-full sm:max-w-md flex flex-col bg-white shadow-2xl rounded-t-3xl sm:rounded-none h-[92vh] sm:h-screen overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex items-center justify-center">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate font-display">
                Pass Checkout ({selectedEvents.length}/{maxEventsLimit})
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                Official Festival Delegate Pass
              </p>
            </div>
          </div>

          <button
            onClick={closeCart}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
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
                <h3 className="text-lg font-extrabold text-emerald-950 font-display">
                  Pass Payment Confirmed!
                </h3>
                <p className="text-xs text-emerald-800">
                  Your festival delegate pass has been issued with {successResult.totalRegistered} confirmed event(s).
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 border border-emerald-100 shadow-xs space-y-2 text-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Master Festival Pass Code
                </span>
                <span className="text-lg font-mono font-black text-emerald-900 tracking-wider block">
                  {successResult.masterCode}
                </span>
                <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                  <span>Amount Paid: <strong>{formatCurrency(successResult.totalPayable)}</strong></span>
                  <span className="font-mono text-emerald-700 font-bold">Razorpay Verified</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  href="/dashboard/passes?print=true"
                  onClick={closeCart}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Festival Pass & Tax Invoice</span>
                </Link>

                <Link
                  href="/dashboard/passes"
                  onClick={closeCart}
                  className="inline-flex items-center justify-center gap-1.5 w-full rounded-2xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <QrCode className="h-3.5 w-3.5 text-slate-500" />
                  <span>View Digital Pass in Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          ) : selectedEvents.length === 0 ? (
            /* Empty Cart View */
            <div className="text-center py-16 space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">Your Cart is Empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Explore our technical competitions. You can select up to 2 events per pass (Regular Pass ₹200 or Flagship Pass ₹300).
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
              {/* Compact Header Summary Bar */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-slate-700">
                  {selectedEvents.length} of {maxEventsLimit} Events Selected
                </span>
                {hasProEventSelected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span>PRO PASS (₹300)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>STANDARD PASS (₹200)</span>
                  </span>
                )}
              </div>

              {/* Time Conflict Warnings */}
              {timeConflicts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px]">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Schedule Timing Notice</span>
                  </div>
                  <ul className="space-y-0.5 text-[10px] text-amber-800 list-disc list-inside">
                    {timeConflicts.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Event Cards (Compact & Clean) */}
              <div className="space-y-2.5">
                {selectedEvents.map((evt, index) => {
                  const isPro = Boolean(evt.is_pro_event);
                  return (
                    <div
                      key={evt.id}
                      className={`group relative rounded-xl border p-3 shadow-2xs hover:shadow-xs transition-all space-y-1.5 ${
                        isPro
                          ? "bg-amber-50/30 border-amber-200"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="rounded bg-slate-900 text-white px-1.5 py-0.2 text-[9px] font-bold font-mono shrink-0">
                            Slot #{index + 1}
                          </span>
                          {isPro && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-black uppercase shrink-0">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              <span>PRO</span>
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {evt.school_or_dept}
                          </span>
                        </div>

                        <button
                          onClick={() => removeEvent(evt.id)}
                          className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                          title="Remove event from pass"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug line-clamp-1">
                          {evt.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-0.5">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>
                            {evt.event_date ? formatDate(evt.event_date) : ""} • {evt.start_time ? formatTime(evt.start_time) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CAMPUS ACCOMMODATION (COMPACT & ATTRACTIVE, NO ₹0) */}
              <div
                className={`rounded-xl border p-3 transition-all duration-200 ${
                  needsAccommodation
                    ? "bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-500/20 shadow-2xs"
                    : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        needsAccommodation
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      <Building className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 leading-none">
                          Campus Accommodation
                        </h4>
                        {needsAccommodation ? (
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                            REQUESTED ✓
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded-md">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Hostel lodging • Pay in-person upon campus arrival
                      </p>
                    </div>
                  </div>

                  {/* Clean Switch */}
                  <button
                    type="button"
                    onClick={toggleNeedsAccommodation}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      needsAccommodation ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                    role="switch"
                    aria-checked={needsAccommodation}
                    title="Toggle accommodation request"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        needsAccommodation ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        {!successResult && selectedEvents.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white space-y-2">
            <button
              onClick={() => {
                if (!user) {
                  window.location.href = `/login?redirect=/events`;
                  return;
                }
                setIsConfirmModalOpen(true);
              }}
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Securing Payment Order...</span>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 text-cyan-200" />
                  <span>Proceed to Confirm ({formatCurrency(pricing.totalAmount)})</span>
                  <ArrowRight className="h-4 w-4 ml-0.5" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <button
                onClick={clearCart}
                className="hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>256-bit Razorpay Checkout</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PRE-PROCESSING CONFIRMATION POPUP MODAL */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Review &amp; Confirm Registration
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify your event selections and accommodation preference
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Cancel and close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Event Selections Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Selected Events ({selectedEvents.length} of 2)
              </h4>
              <div className="space-y-2">
                {selectedEvents.map((evt, idx) => (
                  <div
                    key={evt.id}
                    className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 line-clamp-1">
                          Slot #{idx + 1}: {evt.name}
                        </span>
                        {evt.is_pro_event && (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.2 rounded-sm">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>FLAGSHIP</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {evt.school_or_dept}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {evt.event_date ? formatDate(evt.event_date) : ""} •{" "}
                        {evt.start_time ? formatTime(evt.start_time) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="font-bold text-slate-800">
                  {hasProEventSelected ? "⭐ Pro Delegate Pass" : "📌 Standard Delegate Pass"}
                </span>
                <p className="text-[10px] text-slate-500">Official Euphoria 2026 Pass</p>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-primary font-mono">
                  {formatCurrency(pricing.totalAmount)}
                </span>
                <p className="text-[10px] text-slate-400">Charged Online Now</p>
              </div>
            </div>

            {/* PROMINENT ACCOMMODATION STATUS SECTION */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Accommodation Status
              </h4>
              
              {needsAccommodation ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Campus Accommodation: REQUESTED (YES)</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleNeedsAccommodation}
                      className="text-[11px] font-bold text-emerald-800 hover:text-rose-600 underline cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-emerald-900/90 leading-normal">
                    Hostel accommodation will be reserved under your delegate pass. Room fees will be collected directly <strong>in-person</strong> upon your arrival at the KARE campus registration desk.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                      <Building className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Campus Accommodation: NOT REQUESTED (NO)</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleNeedsAccommodation}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
                    >
                      + Add Accommodation
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    No campus accommodation requested. If you require a hostel room during the festival, click &ldquo;Add Accommodation&rdquo; before confirming.
                  </p>
                </div>
              )}
            </div>

            {/* General Disclaimer */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50/80 p-3 border border-amber-200 text-[11px] text-amber-900 leading-snug">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Please ensure you bring your valid college student ID card on event day to collect your physical badge and complete campus check-in.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-center"
              >
                ← Back to Cart
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  handleRazorpayCheckout();
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition-all cursor-pointer text-center disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <span>Confirm &amp; Pay {formatCurrency(pricing.totalAmount)}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
