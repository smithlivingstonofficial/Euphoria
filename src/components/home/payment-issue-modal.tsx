"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  ExternalLink,
  Lock,
  RefreshCw,
  HelpCircle,
  Zap,
} from "lucide-react";
import {
  getUserPaymentIssueContext,
  submitPaymentIssue,
  StudentPaymentIssue,
} from "@/actions/payment-issues";
import { formatCurrency } from "@/lib/utils";

interface PaymentIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentIssueModal({ isOpen, onClose }: PaymentIssueModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  // Context State from Server
  const [context, setContext] = useState<{
    isAuthenticated: boolean;
    userRole?: string;
    isAdminOrCoordinator?: boolean;
    hasActivePass?: boolean;
    activePassCode?: string;
    activePassTier?: string;
    existingRegisteredEvents?: Array<{ id: string; name: string; isProEvent: boolean }>;
    existingTicket?: StudentPaymentIssue | null;
    userProfile?: {
      fullName: string;
      email: string;
      mobileNumber: string;
      registerNumber?: string;
      collegeName?: string;
      department?: string;
    } | null;
    availableEvents?: Array<{
      id: string;
      name: string;
      isProEvent: boolean;
      schoolOrDept: string;
      eventDate: string;
      participantLimit?: number;
      currentRegs?: number;
      isFull?: boolean;
    }>;
  }>({
    isAuthenticated: false,
  });

  // Form State (Text-Based Only)
  const [passTier, setPassTier] = useState<"standard_pass" | "pro_pass">("standard_pass");
  const [amount, setAmount] = useState<number>(200);
  const [transactionId, setTransactionId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Google Pay");
  const [paymentDate, setPaymentDate] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [issueType, setIssueType] = useState("Amount debited from bank, but pass was not generated");
  const [description, setDescription] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Event search within the modal
  const [eventSearch, setEventSearch] = useState("");
  const [eventCategoryFilter, setEventCategoryFilter] = useState<"all" | "regular" | "pro">("all");

  // Submission Feedback
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<StudentPaymentIssue | null>(null);

  // Load Context on Modal Open
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingContext(true);
    setSubmitError(null);

    async function loadData() {
      try {
        const ctx = await getUserPaymentIssueContext();
        setContext(ctx);
        if (ctx.existingTicket) {
          setActiveTicket(ctx.existingTicket);
        }
      } catch (err) {
        console.error("Failed to load payment context:", err);
      } finally {
        setIsLoadingContext(false);
      }
    }

    loadData();
  }, [isOpen]);

  // Sync amount with pass tier button
  const handleTierChange = (tier: "standard_pass" | "pro_pass") => {
    setPassTier(tier);
    setAmount(tier === "pro_pass" ? 300 : 200);
    // If standard pass, clear any pro event from selection
    if (tier === "standard_pass" && context.availableEvents) {
      const proIds = new Set(context.availableEvents.filter((e) => e.isProEvent).map((e) => e.id));
      setSelectedEventIds((prev) => prev.filter((id) => !proIds.has(id)));
    }
  };

  // Event selection handling
  const toggleEventSelection = (eventId: string, isPro: boolean, isFull?: boolean) => {
    if (selectedEventIds.includes(eventId)) {
      setSelectedEventIds((prev) => prev.filter((id) => id !== eventId));
      return;
    }

    if (isFull) {
      alert("This competition's slots are completely full! Please select another competition.");
      return;
    }

    if (selectedEventIds.length >= 2) {
      alert("A Festival Pass covers a maximum of 2 competitions. Please unselect one first.");
      return;
    }

    if (passTier === "standard_pass" && isPro) {
      alert("Flagship / Pro competitions require a Pro Pass (₹300). Switch to Pro Pass above.");
      return;
    }

    if (passTier === "pro_pass" && isPro) {
      const currentProCount = selectedEventIds.filter(
        (id) => context.availableEvents?.find((e) => e.id === id)?.isProEvent
      ).length;
      if (currentProCount >= 1) {
        alert("Pro Pass includes exactly 1 Flagship competition + 1 Regular competition.");
        return;
      }
    }

    setSelectedEventIds((prev) => [...prev, eventId]);
  };

  // Filter available events for selection
  const filteredEvents = useMemo(() => {
    if (!context.availableEvents) return [];
    return context.availableEvents.filter((ev) => {
      const matchesSearch =
        ev.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
        ev.schoolOrDept.toLowerCase().includes(eventSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (eventCategoryFilter === "regular") return !ev.isProEvent;
      if (eventCategoryFilter === "pro") return ev.isProEvent;
      return true;
    });
  }, [context.availableEvents, eventSearch, eventCategoryFilter]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!transactionId.trim() || transactionId.trim().length < 5) {
      setSubmitError("Please enter a valid Bank Reference / UTR Number (min 5 characters).");
      return;
    }

    if (!paymentDate.trim()) {
      setSubmitError("Please provide the approximate payment date and time.");
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setSubmitError("Please explain what happened in the description box.");
      return;
    }

    startTransition(async () => {
      const res = await submitPaymentIssue({
        transactionId,
        amount,
        passTier,
        selectedEventIds,
        paymentMethod,
        paymentDate,
        issueType,
        description,
        orderNumber: orderNumber.trim() || undefined,
      });

      if (res.success && res.ticketNumber) {
        // Resolve chosen event objects for immediate status screen
        const chosen = (context.availableEvents || []).filter((e) =>
          selectedEventIds.includes(e.id)
        );

        setActiveTicket({
          id: res.ticketNumber,
          ticketNumber: res.ticketNumber,
          userId: "",
          fullName: context.userProfile?.fullName || "Student",
          email: context.userProfile?.email || "",
          phone: context.userProfile?.mobileNumber || "",
          transactionId,
          amount,
          passTier,
          selectedEventIds,
          selectedEvents: chosen,
          paymentMethod,
          paymentDate,
          issueType,
          description,
          status: "pending",
          gatewayVerified: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        setSubmitError(res.error || "Failed to submit request. Please try again.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Payment Resolution Desk
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Official Euphoria 2026 Student Dispute &amp; Pass Recovery Form
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {isLoadingContext ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Connecting to payment service...</p>
            </div>
          ) : !context.isAuthenticated ? (
            /* ═══════════════════════════════════════════════════════════════
               STATE 1: NOT LOGGED IN (AUTH GATE)
            ═══════════════════════════════════════════════════════════════ */
            <div className="py-6 text-center space-y-4 max-w-md mx-auto">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shadow-xs">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900">
                  Student Login Required
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  To securely match your bank UTR transaction with your student account and automatically issue your festival pass, you must sign in to Euphoria.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-stretch gap-2.5 justify-center">
                <Link
                  href="/login?returnUrl=/?openPaymentIssue=true"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer"
                >
                  <span>Sign In with Student Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Create New Account
                </Link>
              </div>
            </div>
          ) : context.isAdminOrCoordinator ? (
            /* ═══════════════════════════════════════════════════════════════
               STATE 2: ADMIN / COORDINATOR NOTICE
            ═══════════════════════════════════════════════════════════════ */
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span>Administrator / Staff Coordinator Session Detected</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                You are currently signed in with elevated privileges (<strong>{context.userRole}</strong>). This form is reserved exclusively for student participants to submit payment receipts.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/payment-requests"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-xs hover:bg-amber-700 transition-colors"
                >
                  <span>Go to Admin Payment Requests Desk</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : context.hasActivePass && !activeTicket ? (
            /* ═══════════════════════════════════════════════════════════════
               STATE 3: PASS ALREADY ACTIVE (NO ISSUE NEEDED)
            ═══════════════════════════════════════════════════════════════ */
            <div className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50/80 text-emerald-950 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    Festival Pass Already Active!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Pass Code: <strong className="font-mono">{context.activePassCode}</strong> ({context.activePassTier === "pro_pass" ? "PRO PASS" : "STANDARD PASS"})
                  </p>
                </div>
              </div>

              {context.existingRegisteredEvents && context.existingRegisteredEvents.length > 0 && (
                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Linked Competitions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {context.existingRegisteredEvents.map((ev, i) => (
                      <span
                        key={ev.id || i}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-100/80 text-emerald-800 px-2.5 py-1 text-xs font-semibold"
                      >
                        <span>{ev.name}</span>
                        {ev.isProEvent && (
                          <span className="bg-amber-400 text-amber-950 text-[9px] px-1 rounded font-black">
                            PRO
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1 flex gap-2">
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <span>Open My Digital QR Gate Pass</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : activeTicket ? (
            /* ═══════════════════════════════════════════════════════════════
               STATE 4: LIVE STATUS DASHBOARD (POST-SUBMIT & RE-OPEN)
            ═══════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              {/* Status Header Banner */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border ${
                  activeTicket.status === "resolved"
                    ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                    : activeTicket.status === "rejected"
                    ? "bg-rose-50/90 border-rose-200 text-rose-950"
                    : "bg-amber-50/90 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        activeTicket.status === "resolved"
                          ? "bg-emerald-100 text-emerald-700"
                          : activeTicket.status === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {activeTicket.status === "resolved" ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : activeTicket.status === "rejected" ? (
                        <AlertCircle className="h-6 w-6" />
                      ) : (
                        <Clock className="h-6 w-6 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-2xs">
                          {activeTicket.ticketNumber}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            activeTicket.status === "resolved"
                              ? "bg-emerald-600 text-white"
                              : activeTicket.status === "rejected"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {activeTicket.status === "resolved"
                            ? "Approved & Resolved"
                            : activeTicket.status === "rejected"
                            ? "Rejected"
                            : activeTicket.status === "under_review"
                            ? "Gateway Verified / Under Review"
                            : "Pending Admin Review"}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                        {activeTicket.status === "resolved"
                          ? "Festival Pass Successfully Issued!"
                          : activeTicket.status === "rejected"
                          ? "Payment Request Requires Attention"
                          : "Request Under Verification"}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs mt-2.5 opacity-90 leading-relaxed">
                  {activeTicket.status === "resolved" ? (
                    <>
                      Your payment was verified. Your pass (
                      <strong className="font-mono">{activeTicket.issuedPassCode || "Active"}</strong>) has been generated with your chosen competitions.
                    </>
                  ) : activeTicket.status === "rejected" ? (
                    <>
                      <strong>Admin Remarks:</strong> {activeTicket.adminNotes || "Verification failed. Please ensure your Bank Reference UTR matches your debit statement."}
                    </>
                  ) : (
                    <>
                      Our finance desk is matching your Bank UTR (<strong className="font-mono">{activeTicket.transactionId}</strong>) with Easebuzz gateway capture records.
                    </>
                  )}
                </p>

                {activeTicket.status === "resolved" && (
                  <div className="pt-3">
                    <Link
                      href="/dashboard/passes"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>View &amp; Download Digital QR Pass</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Submitted Details Snapshot */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Submitted Request Details:
                </span>
                <div className="grid grid-cols-2 gap-2 font-medium">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bank UTR / Txn ID:</span>
                    <strong className="font-mono text-slate-900 break-all">{activeTicket.transactionId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Amount &amp; Tier:</span>
                    <strong className="text-slate-900">{formatCurrency(activeTicket.amount)} ({activeTicket.passTier === "pro_pass" ? "Pro Pass" : "Standard Pass"})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Payment Method:</span>
                    <span>{activeTicket.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Payment Date / Time:</span>
                    <span>{activeTicket.paymentDate}</span>
                  </div>
                </div>

                {activeTicket.selectedEvents && activeTicket.selectedEvents.length > 0 && (
                  <div className="pt-1 border-t border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Selected Competitions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeTicket.selectedEvents.map((ev, i) => (
                        <span
                          key={ev.id || i}
                          className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-800"
                        >
                          <span className="truncate max-w-[180px]">{ev.name}</span>
                          {ev.isProEvent ? (
                            <span className="text-[9px] bg-amber-100 text-amber-900 px-1 rounded font-bold">PRO</span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded">REG</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activeTicket.status === "rejected" && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTicket(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Submit a New / Corrected Request</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════════
               STATE 5: DISPUTE SUBMISSION FORM (100% TEXT-BASED + EVENT PICKER)
            ═══════════════════════════════════════════════════════════════ */
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Student Identity Card (Pre-filled) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Student Account
                  </span>
                  <div className="font-bold text-slate-900">
                    {context.userProfile?.fullName || "Student Participant"}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {context.userProfile?.email} • {context.userProfile?.mobileNumber || "No Phone"}
                  </div>
                </div>
                {context.userProfile?.collegeName && (
                  <div className="sm:text-right text-[11px] text-slate-500 font-medium truncate max-w-xs">
                    {context.userProfile.collegeName}
                    {context.userProfile.registerNumber && (
                      <span className="block font-mono text-[10px] text-slate-400">
                        Reg: {context.userProfile.registerNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Pass Tier & Amount Selection (Dynamic Event Rules) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Pass Tier &amp; Amount Paid <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Choose tier matching your payment</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTierChange("standard_pass")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      passTier === "standard_pass"
                        ? "border-primary bg-indigo-50/50 ring-2 ring-primary/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Standard Pass</span>
                      <span className="font-mono font-extrabold text-sm text-primary">₹200</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Includes 2 Regular Competitions across all schools
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTierChange("pro_pass")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      passTier === "pro_pass"
                        ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <span>⭐ Pro Pass</span>
                      </span>
                      <span className="font-mono font-extrabold text-sm text-amber-600">₹300</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Includes 1 Flagship Event + 1 Regular Event
                    </p>
                  </button>
                </div>
              </div>

              {/* In-Modal Event Selector (Conditional if events not selected) */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>Select Your 2 Competitions</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
                    {selectedEventIds.length} / 2 Selected
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Select the competitions you paid for so the admin team can immediately issue your pass with them.
                </p>

                {/* Search & Filter Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Search competitions or department..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex rounded-xl bg-slate-200/80 p-0.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEventCategoryFilter("all")}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        eventCategoryFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventCategoryFilter("regular")}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        eventCategoryFilter === "regular" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventCategoryFilter("pro")}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        eventCategoryFilter === "pro" ? "bg-white text-amber-900 shadow-2xs" : "text-slate-600"
                      }`}
                    >
                      Pro
                    </button>
                  </div>
                </div>

                {/* Event Chips List */}
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {filteredEvents.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-slate-400">
                      No matching competitions found.
                    </div>
                  ) : (
                    filteredEvents.map((ev) => {
                      const isSelected = selectedEventIds.includes(ev.id);
                      const isFull = Boolean(ev.isFull);
                      const isLocked = (passTier === "standard_pass" && ev.isProEvent) || isFull;

                      return (
                        <div
                          key={ev.id}
                          onClick={() => !isLocked && toggleEventSelection(ev.id, ev.isProEvent, ev.isFull)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all border ${
                            isFull
                              ? "opacity-60 bg-rose-50/40 border-rose-200 cursor-not-allowed"
                              : isLocked
                              ? "opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed"
                              : isSelected
                              ? "bg-indigo-50 border-primary text-slate-900 shadow-2xs cursor-pointer"
                              : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 cursor-pointer"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-slate-900 truncate text-[11px] flex items-center gap-1">
                              <span>{ev.name}</span>
                              {isFull && (
                                <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-black uppercase">
                                  FULL
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {ev.schoolOrDept}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isFull ? (
                              <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" /> Full
                              </span>
                            ) : ev.isProEvent ? (
                              <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black uppercase">
                                PRO (₹300)
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                Regular
                              </span>
                            )}
                            <div
                              className={`h-4 w-4 rounded-md border flex items-center justify-center text-[10px] ${
                                isFull
                                  ? "border-rose-300 bg-rose-50 text-rose-500 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-primary border-primary text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isFull ? "✕" : isSelected ? "✓" : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Mandatory Transaction Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* UTR / Transaction ID */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Bank UTR / Easebuzz Txn ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 428912345678 or EUPH-..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Found in your Google Pay, PhonePe, or bank SMS
                  </span>
                </div>

                {/* Payment Method / App */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Payment Method / App <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="Google Pay">Google Pay (UPI)</option>
                    <option value="PhonePe">PhonePe (UPI)</option>
                    <option value="Paytm">Paytm (UPI)</option>
                    <option value="BHIM UPI / Other UPI">BHIM UPI / Other UPI</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="College Registration Counter">College Registration Counter</option>
                  </select>
                </div>

                {/* Payment Date & Time */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Date &amp; Approximate Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    placeholder="e.g. Today, 2:30 PM or 08 Sep 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Order ID (Optional) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Euphoria Order ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. EUPH-ORD-XXXX (if known)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              {/* Issue Category Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Issue Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Amount debited from bank, but pass was not generated">
                    Amount debited from bank, but pass was not generated
                  </option>
                  <option value="Transaction failed or timed out during payment">
                    Transaction failed or timed out during payment
                  </option>
                  <option value="Charged multiple times / double debit">
                    Charged multiple times / double debit
                  </option>
                  <option value="Events not linked to my payment">
                    Events not linked to my payment
                  </option>
                  <option value="Other payment dispute">
                    Other payment dispute
                  </option>
                </select>
              </div>

              {/* Description / Remarks Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Detailed Explanation / Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what happened (e.g. Paid ₹200 via GPay at 2:15 PM, money debited with UTR 4289..., but site showed timeout screen)."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Payment Issue</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
