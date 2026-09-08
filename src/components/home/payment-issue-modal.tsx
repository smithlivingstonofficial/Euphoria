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
    isAdmin?: boolean;
    isCoordinator?: boolean;
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

  const [forceShowForm, setForceShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form State (Text-Based Only)
  const [passTier, setPassTier] = useState<"standard_pass" | "pro_pass">("standard_pass");
  const [amount, setAmount] = useState<number>(200);
  const [transactionId, setTransactionId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Google Pay");
  const [paymentDate, setPaymentDate] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [issueType, setIssueType] = useState("Amount debited from bank, but pass was not generated");
  const [description, setDescription] = useState("");

  // 2-Slot Event Selection State
  const [slot1Id, setSlot1Id] = useState<string>("");
  const [slot2Id, setSlot2Id] = useState<string>("");
  const [openSlotPicker, setOpenSlotPicker] = useState<1 | 2 | null>(null);
  const [slotSearch, setSlotSearch] = useState<string>("");

  const selectedEventIds = useMemo(
    () => [slot1Id, slot2Id].filter(Boolean),
    [slot1Id, slot2Id]
  );

  // Submission Feedback
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<StudentPaymentIssue | null>(null);

  // Load Context on Modal Open
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingContext(true);
    setSubmitError(null);
    setForceShowForm(false);
    setCurrentStep(1);
    setSlot1Id("");
    setSlot2Id("");
    setOpenSlotPicker(null);
    setSlotSearch("");

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

  const availableEvents = useMemo(() => context.availableEvents || [], [context.availableEvents]);
  const flagshipEvents = useMemo(
    () => availableEvents.filter((e) => e.isProEvent),
    [availableEvents]
  );
  const regularEvents = useMemo(
    () => availableEvents.filter((e) => !e.isProEvent),
    [availableEvents]
  );

  const slot1Event = useMemo(
    () => availableEvents.find((e) => e.id === slot1Id),
    [availableEvents, slot1Id]
  );
  const slot2Event = useMemo(
    () => availableEvents.find((e) => e.id === slot2Id),
    [availableEvents, slot2Id]
  );

  // Check if step 1 requirements are satisfied (both slots filled)
  const isStep1Complete = Boolean(slot1Id && slot2Id);

  const step1ValidationMessage = useMemo(() => {
    if (passTier === "standard_pass") {
      if (!slot1Id && !slot2Id) return "Please choose your 2 regular competitions.";
      if (!slot1Id || !slot2Id) return "Please choose 1 more regular competition.";
      return null;
    } else {
      if (!slot1Id && !slot2Id) return "Please choose 1 Flagship and 1 Regular competition.";
      if (!slot1Id) return "Please choose your Flagship competition.";
      if (!slot2Id) return "Please choose your Regular competition.";
      return null;
    }
  }, [passTier, slot1Id, slot2Id]);

  const handleContinueToStep2 = () => {
    if (!isStep1Complete) {
      setSubmitError(step1ValidationMessage || "Please select both competitions to continue.");
      return;
    }
    setSubmitError(null);
    setOpenSlotPicker(null);
    setCurrentStep(2);
  };

  // Sync amount with pass tier button and adjust event availability
  const handleTierChange = (tier: "standard_pass" | "pro_pass") => {
    setPassTier(tier);
    setAmount(tier === "pro_pass" ? 300 : 200);
    setSubmitError(null);
    setOpenSlotPicker(null);
    setSlotSearch("");

    if (tier === "standard_pass") {
      // If slot 1 was a flagship event, clear it
      if (slot1Event?.isProEvent) {
        setSlot1Id("");
      }
    } else {
      // Switching to Flagship pass: if slot 1 was regular, clear it so user selects flagship
      if (slot1Event && !slot1Event.isProEvent) {
        setSlot1Id("");
      }
    }
  };

  const getFilteredSlotEvents = (slotNum: 1 | 2) => {
    let list: typeof availableEvents = [];
    if (passTier === "standard_pass") {
      list = slotNum === 1
        ? regularEvents.filter((e) => e.id !== slot2Id)
        : regularEvents.filter((e) => e.id !== slot1Id);
    } else {
      list = slotNum === 1 ? flagshipEvents : regularEvents;
    }

    if (!slotSearch.trim()) return list;
    const q = slotSearch.toLowerCase();
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.schoolOrDept.toLowerCase().includes(q)
    );
  };

  // Form Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitError(null);

    if (!transactionId.trim() || transactionId.trim().length < 5) {
      setSubmitError("Please enter a valid Bank Reference or Transaction ID (min 5 characters).");
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

  const isShowingForm =
    !isLoadingContext &&
    context.isAuthenticated &&
    (context.isAdmin || (!context.isAdminOrCoordinator && !context.hasActivePass) || forceShowForm) &&
    (!activeTicket || forceShowForm);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[82vh] sm:max-h-[76vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header Ribbon */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  Payment Help &amp; Pass Request
                </h2>
                {context.isAdmin && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[9px] uppercase">
                    <Zap className="h-2.5 w-2.5 text-amber-600" /> Admin Test
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {context.userProfile?.fullName
                  ? `For ${context.userProfile.fullName} (${context.userProfile.email})`
                  : "Enter your transaction details to issue your festival pass"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {context.isAdmin && (
              <Link
                href="/admin/payment-requests"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 hover:text-amber-950 underline px-2 py-0.5 rounded-md hover:bg-amber-50 transition-colors"
                title="Open Admin Requests List in new tab"
              >
                <span>Requests Desk</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Ultra-Compact Stepper Bar */}
        {isShowingForm && (
          <div className="px-4 sm:px-5 py-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between gap-2 max-w-xs sm:max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setCurrentStep(1);
                }}
                className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 1 ? "text-primary" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    currentStep === 1
                      ? "bg-primary text-white shadow-xs"
                      : isStep1Complete
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isStep1Complete && currentStep === 2 ? "✓" : "1"}
                </span>
                <span>Pass &amp; Events</span>
              </button>

              <div className="flex-1 h-0.5 bg-slate-200 mx-2" />

              <button
                type="button"
                onClick={() => {
                  if (isStep1Complete) {
                    setSubmitError(null);
                    setCurrentStep(2);
                  } else {
                    setSubmitError(step1ValidationMessage);
                  }
                }}
                className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 2 ? "text-primary" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    currentStep === 2 ? "bg-primary text-white shadow-xs" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  2
                </span>
                <span>Payment Details</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
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
                  To match your payment with your student account and automatically issue your festival pass, please sign in to Euphoria.
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
          ) : !context.isAdmin && context.isAdminOrCoordinator && !forceShowForm ? (
            /* ═══════════════════════════════════════════════════════════════
               STATE 2: COORDINATOR NOTICE
            ═══════════════════════════════════════════════════════════════ */
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span>Staff Coordinator Session Detected</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                You are currently signed in as a coordinator (<strong>{context.userRole}</strong>). This form is reserved exclusively for student participants to submit payment receipts.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/payment-requests"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-xs hover:bg-amber-700 transition-colors"
                >
                  <span>Go to Admin Payment Requests Desk</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setForceShowForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-600" />
                  <span>Preview / Test Form</span>
                </button>
              </div>
            </div>
          ) : !context.isAdmin && context.hasActivePass && !activeTicket && !forceShowForm ? (
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
                    Pass Code: <strong className="font-mono">{context.activePassCode}</strong> ({context.activePassTier === "pro_pass" ? "FLAGSHIP PASS" : "STANDARD PASS"})
                  </p>
                </div>
              </div>

              {context.existingRegisteredEvents && context.existingRegisteredEvents.length > 0 && (
                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Your Registered Events:
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
                            FLAGSHIP
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
          ) : activeTicket && !forceShowForm ? (
            /* ═══════════════════════════════════════════════════════════════
               STATE 4: LIVE STATUS DASHBOARD (POST-SUBMIT & RE-OPEN)
            ═══════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              {/* Admin Test Mode Controls in State 4 */}
              {context.isAdmin && (
                <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50/90 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Admin Testing Mode Active</span>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded">
                          TEST ACTIVE
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-tight mt-0.5">
                        Viewing ticket status screen. You can submit another test request at any time.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTicket(null);
                      setForceShowForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Submit Another Test Request</span>
                  </button>
                </div>
              )}
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
                      <strong>Admin Remarks:</strong> {activeTicket.adminNotes || "Verification failed. Please ensure your transaction reference number matches your bank statement."}
                    </>
                  ) : (
                    <>
                      Our team is matching your transaction number (<strong className="font-mono">{activeTicket.transactionId}</strong>) with payment records to issue your pass.
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
                    <span className="text-slate-400 block text-[10px]">Bank Reference ID:</span>
                    <strong className="font-mono text-slate-900 break-all">{activeTicket.transactionId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Amount &amp; Pass:</span>
                    <strong className="text-slate-900">{formatCurrency(activeTicket.amount)} ({activeTicket.passTier === "pro_pass" ? "Flagship Pass" : "Standard Pass"})</strong>
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
                      Selected Events:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeTicket.selectedEvents.map((ev, i) => (
                        <span
                          key={ev.id || i}
                          className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-800"
                        >
                          <span className="truncate max-w-[180px]">{ev.name}</span>
                          {ev.isProEvent ? (
                            <span className="text-[9px] bg-amber-100 text-amber-900 px-1 rounded font-extrabold">FLAGSHIP</span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-bold">REGULAR</span>
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
               STATE 5: DISPUTE SUBMISSION FORM (2-STEP COMPACT FLOW)
            ═══════════════════════════════════════════════════════════════ */
            <div className="space-y-3">
              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: SELECT PASS TIER & 2-SLOT EVENTS
                  ───────────────────────────────────────────────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  {/* Pass Tier & Amount Selection (Compact Cards) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Select the pass you paid for <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Choose pass matching your payment
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTierChange("standard_pass")}
                        className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          passTier === "standard_pass"
                            ? "border-primary bg-indigo-50/50 ring-2 ring-primary/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">Standard Pass</span>
                          <span className="font-mono font-extrabold text-xs text-primary">₹200</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          2 regular competitions across any dept
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTierChange("pro_pass")}
                        className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          passTier === "pro_pass"
                            ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                            <span>⭐ Flagship Pass</span>
                          </span>
                          <span className="font-mono font-extrabold text-xs text-amber-600">₹300</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          1 Flagship Event + 1 Regular Event
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* The 2-Slot Event Selector */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {passTier === "standard_pass"
                            ? "Select Your 2 Competitions (Regular)"
                            : "Select 1 Flagship + 1 Regular Competition"}
                        </span>
                      </label>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                          isStep1Complete
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isStep1Complete
                          ? "✓ 2 of 2 Selected"
                          : `${(slot1Id ? 1 : 0) + (slot2Id ? 1 : 0)} of 2 Selected`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Slot 1 */}
                      <div className="relative">
                        {slot1Event ? (
                          <div className="p-2 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-1.5 shadow-2xs">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider ${
                                    slot1Event.isProEvent
                                      ? "bg-amber-400 text-amber-950 shadow-2xs"
                                      : "bg-indigo-100 text-indigo-900"
                                  }`}
                                >
                                  {slot1Event.isProEvent ? "⭐ FLAGSHIP" : "REGULAR"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">Slot 1</span>
                              </div>
                              <div className="font-bold text-xs text-slate-900 truncate" title={slot1Event.name}>
                                {slot1Event.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {slot1Event.schoolOrDept}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSlot1Id("");
                                setOpenSlotPicker(1);
                                setSlotSearch("");
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/60 transition-colors shrink-0 cursor-pointer"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenSlotPicker(openSlotPicker === 1 ? null : 1);
                              setSlotSearch("");
                            }}
                            className={`w-full p-2.5 rounded-xl border-2 border-dashed text-left transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                              openSlotPicker === 1
                                ? "border-primary bg-indigo-50/50 ring-2 ring-primary/20"
                                : !slot1Id && submitError
                                ? "border-rose-300 bg-rose-50/30 hover:border-rose-400"
                                : "border-slate-200 hover:border-primary/60 bg-slate-50/50 hover:bg-indigo-50/30"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                                    passTier === "pro_pass" ? "bg-amber-100 text-amber-900 font-black" : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {passTier === "pro_pass" ? "⭐ FLAGSHIP" : "REGULAR"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">Slot 1</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-600 group-hover:text-primary truncate">
                                + Choose {passTier === "pro_pass" ? "Flagship Competition" : "1st Competition"}
                              </div>
                            </div>
                            <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary shrink-0 shadow-2xs">
                              <Search className="h-3 w-3" />
                            </div>
                          </button>
                        )}

                        {/* Dropdown Popover for Slot 1 */}
                        {openSlotPicker === 1 && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border border-slate-300 bg-white shadow-xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="relative">
                              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                autoFocus
                                value={slotSearch}
                                onChange={(e) => setSlotSearch(e.target.value)}
                                placeholder={
                                  passTier === "pro_pass"
                                    ? "Search 10 Flagship events..."
                                    : "Search regular competitions..."
                                }
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary"
                              />
                              {slotSearch && (
                                <button
                                  type="button"
                                  onClick={() => setSlotSearch("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                              {getFilteredSlotEvents(1).length === 0 ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                  No matching competitions
                                </div>
                              ) : (
                                getFilteredSlotEvents(1).map((ev) => (
                                  <div
                                    key={ev.id}
                                    onClick={() => {
                                      if (!ev.isFull) {
                                        setSlot1Id(ev.id);
                                        setOpenSlotPicker(null);
                                        setSlotSearch("");
                                        setSubmitError(null);
                                        if (!slot2Id) setOpenSlotPicker(2);
                                      }
                                    }}
                                    className={`p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-1.5 ${
                                      ev.isFull
                                        ? "opacity-50 bg-slate-50 cursor-not-allowed"
                                        : "hover:bg-indigo-50/80 cursor-pointer text-slate-800"
                                    }`}
                                  >
                                    <div className="min-w-0 pr-1">
                                      <div className="font-semibold truncate text-[11px] text-slate-900">{ev.name}</div>
                                      <div className="text-[10px] text-slate-400 truncate">{ev.schoolOrDept}</div>
                                    </div>
                                    {ev.isFull ? (
                                      <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                                        Full
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-primary font-bold shrink-0">
                                        Select
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="pt-1 border-t border-slate-100 flex items-center justify-between px-1">
                              <span className="text-[10px] text-slate-400">
                                {getFilteredSlotEvents(1).length} options available
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpenSlotPicker(null)}
                                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 cursor-pointer"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Slot 2 */}
                      <div className="relative">
                        {slot2Event ? (
                          <div className="p-2 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-1.5 shadow-2xs">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider bg-indigo-100 text-indigo-900">
                                  REGULAR
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">Slot 2</span>
                              </div>
                              <div className="font-bold text-xs text-slate-900 truncate" title={slot2Event.name}>
                                {slot2Event.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {slot2Event.schoolOrDept}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSlot2Id("");
                                setOpenSlotPicker(2);
                                setSlotSearch("");
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/60 transition-colors shrink-0 cursor-pointer"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenSlotPicker(openSlotPicker === 2 ? null : 2);
                              setSlotSearch("");
                            }}
                            className={`w-full p-2.5 rounded-xl border-2 border-dashed text-left transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                              openSlotPicker === 2
                                ? "border-primary bg-indigo-50/50 ring-2 ring-primary/20"
                                : !slot2Id && submitError
                                ? "border-rose-300 bg-rose-50/30 hover:border-rose-400"
                                : "border-slate-200 hover:border-primary/60 bg-slate-50/50 hover:bg-indigo-50/30"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider bg-slate-200 text-slate-700">
                                  REGULAR
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">Slot 2</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-600 group-hover:text-primary truncate">
                                + Choose {passTier === "pro_pass" ? "Regular Competition" : "2nd Competition"}
                              </div>
                            </div>
                            <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary shrink-0 shadow-2xs">
                              <Search className="h-3 w-3" />
                            </div>
                          </button>
                        )}

                        {/* Dropdown Popover for Slot 2 */}
                        {openSlotPicker === 2 && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border border-slate-300 bg-white shadow-xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="relative">
                              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                autoFocus
                                value={slotSearch}
                                onChange={(e) => setSlotSearch(e.target.value)}
                                placeholder="Search regular competitions..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary"
                              />
                              {slotSearch && (
                                <button
                                  type="button"
                                  onClick={() => setSlotSearch("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                              {getFilteredSlotEvents(2).length === 0 ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                  No matching competitions
                                </div>
                              ) : (
                                getFilteredSlotEvents(2).map((ev) => (
                                  <div
                                    key={ev.id}
                                    onClick={() => {
                                      if (!ev.isFull) {
                                        setSlot2Id(ev.id);
                                        setOpenSlotPicker(null);
                                        setSlotSearch("");
                                        setSubmitError(null);
                                      }
                                    }}
                                    className={`p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-1.5 ${
                                      ev.isFull
                                        ? "opacity-50 bg-slate-50 cursor-not-allowed"
                                        : "hover:bg-indigo-50/80 cursor-pointer text-slate-800"
                                    }`}
                                  >
                                    <div className="min-w-0 pr-1">
                                      <div className="font-semibold truncate text-[11px] text-slate-900">{ev.name}</div>
                                      <div className="text-[10px] text-slate-400 truncate">{ev.schoolOrDept}</div>
                                    </div>
                                    {ev.isFull ? (
                                      <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                                        Full
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-primary font-bold shrink-0">
                                        Select
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="pt-1 border-t border-slate-100 flex items-center justify-between px-1">
                              <span className="text-[10px] text-slate-400">
                                {getFilteredSlotEvents(2).length} options available
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpenSlotPicker(null)}
                                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 cursor-pointer"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: PAYMENT TRANSACTION DETAILS
                  ───────────────────────────────────────────────────────────── */}
              {currentStep === 2 && (
                <form onSubmit={handleSubmit} className="space-y-2.5 animate-in fade-in duration-150">
                  {/* Selected Summary Card */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-indigo-50 via-slate-50 to-amber-50/40 border border-slate-200 text-xs">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {passTier === "pro_pass" ? "⭐ Flagship Pass" : "Standard Pass"}
                        </span>
                        <span className="font-mono font-extrabold text-xs text-primary">₹{amount}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {slot1Event && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-2xs">
                            <span className="truncate max-w-[120px]">{slot1Event.name}</span>
                            {slot1Event.isProEvent ? (
                              <span className="text-[8px] bg-amber-100 text-amber-900 font-extrabold px-1 rounded">FLAGSHIP</span>
                            ) : (
                              <span className="text-[8px] bg-slate-100 text-slate-600 font-bold px-1 rounded">REGULAR</span>
                            )}
                          </span>
                        )}
                        {slot2Event && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-2xs">
                            <span className="truncate max-w-[120px]">{slot2Event.name}</span>
                            <span className="text-[8px] bg-slate-100 text-slate-600 font-bold px-1 rounded">REGULAR</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-2 py-1 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-primary font-bold text-[11px] shrink-0 cursor-pointer shadow-2xs transition-colors"
                    >
                      Change Events
                    </button>
                  </div>

                  {submitError && (
                    <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      <span className="font-medium">{submitError}</span>
                    </div>
                  )}

                  {/* 2-Column Grid of Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Bank Reference / Transaction ID */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800">
                        Bank Reference ID / Transaction Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 428912345678 (12 digits)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        Found in Google Pay, PhonePe, Paytm, or bank SMS
                      </span>
                    </div>

                    {/* Payment Method / App */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800">
                        Payment App or Method <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary cursor-pointer"
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
                      <span className="text-[10px] text-slate-400 block">
                        App or service used to pay
                      </span>
                    </div>

                    {/* Payment Date & Time */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800">
                        Date &amp; Approximate Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        placeholder="e.g. Today, 2:30 PM"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        When was money deducted?
                      </span>
                    </div>

                    {/* Order ID (Optional) */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800">
                        Order Number <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="e.g. EUPH-ORD-XXXX"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary font-mono"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        If shown on your screen
                      </span>
                    </div>
                  </div>

                  {/* Issue Category Dropdown */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800">
                      What happened with your payment? <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="Amount debited from bank, but pass was not generated">
                        Money was deducted from my bank, but pass was not generated
                      </option>
                      <option value="Transaction failed or timed out during payment">
                        Payment timed out or showed failed, but money was deducted
                      </option>
                      <option value="Charged multiple times / double debit">
                        Money was deducted more than once (double payment)
                      </option>
                      <option value="Events not linked to my payment">
                        Payment went through, but my competitions are missing
                      </option>
                      <option value="Other payment dispute">
                        Other payment problem
                      </option>
                    </select>
                  </div>

                  {/* Description / Remarks Textarea */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800">
                      Tell us what happened <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief note (e.g. Paid ₹200 on Google Pay at 2:30 PM, money was deducted, but the pass didn't generate)."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer Bar for Form (Always visible, never overlaps content) */}
        {isShowingForm && (
          <div className="shrink-0 px-3.5 sm:px-5 py-2.5 bg-slate-50/95 border-t border-slate-100 flex items-center justify-between gap-2">
            {currentStep === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {!isStep1Complete && (
                    <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                      {step1ValidationMessage}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleContinueToStep2}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 cursor-pointer transition-all"
                  >
                    <span>Continue to Payment Details</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError(null);
                    setCurrentStep(1);
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white transition-colors cursor-pointer"
                >
                  <span>← Back to Events</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Payment Help Request</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
