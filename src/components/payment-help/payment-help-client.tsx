"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Lock,
  RefreshCw,
  Zap,
  Building,
  Check,
  X,
  Clock,
  ShieldCheck,
  Info,
  ChevronRight,
  ChevronDown,
  Filter,
  HelpCircle,
  Calendar,
  Hash,
  Star,
  User,
} from "lucide-react";
import {
  submitPaymentIssue,
  StudentPaymentIssue,
  getUserPaymentIssueContext,
  getStudentTicketStatusAction,
} from "@/actions/payment-issues";
import { formatCurrency } from "@/lib/utils";

export type PaymentHelpContext = Awaited<ReturnType<typeof getUserPaymentIssueContext>>;

interface PaymentHelpClientProps {
  initialContext: PaymentHelpContext;
}

export function PaymentHelpClient({ initialContext }: PaymentHelpClientProps) {
  const [context, setContext] = useState<PaymentHelpContext>(initialContext);
  const [isPending, startTransition] = useTransition();

  const [forceShowForm, setForceShowForm] = useState(false);

  // Form State
  const [passTier, setPassTier] = useState<"standard_pass" | "pro_pass">("standard_pass");
  const [amount, setAmount] = useState<number>(200);
  const [transactionId, setTransactionId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Google Pay");
  const [paymentDate, setPaymentDate] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [showOrderField, setShowOrderField] = useState(false);
  const [issueType, setIssueType] = useState(
    "Amount debited from bank, but pass was not generated"
  );
  const [description, setDescription] = useState("");
  const [showUtrHelp, setShowUtrHelp] = useState(false);

  // 2-Slot Event Selection State
  const [slot1Id, setSlot1Id] = useState<string>("");
  const [slot2Id, setSlot2Id] = useState<string>("");
  const [selectedFilterDept, setSelectedFilterDept] = useState<string>("All");

  // Feedback State
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<StudentPaymentIssue | null>(
    initialContext.existingTicket || null
  );
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Poll ticket status every 20 seconds while under review or pending
  const checkStatus = async () => {
    if (!activeTicket?.ticketNumber) return;
    setIsRefreshingStatus(true);
    try {
      const res = await getStudentTicketStatusAction(activeTicket.ticketNumber);
      if (res.success && res.ticket) {
        setActiveTicket(res.ticket);
        if (res.hasActivePass) {
          setContext((prev) => ({
            ...prev,
            hasActivePass: true,
            activePassCode: res.activePassCode,
          }));
        }
      }
    } catch {
      // Background poll failure ignore
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    if (!activeTicket || activeTicket.status === "resolved" || activeTicket.status === "rejected") {
      return;
    }

    const interval = setInterval(() => {
      checkStatus();
    }, 20000);

    return () => clearInterval(interval);
  }, [activeTicket?.status, activeTicket?.ticketNumber]);

  const availableEvents = useMemo(() => context.availableEvents || [], [context.availableEvents]);

  // Derived lists
  const flagshipEvents = useMemo(
    () => availableEvents.filter((e) => e.isProEvent),
    [availableEvents]
  );
  const regularEvents = useMemo(
    () => availableEvents.filter((e) => !e.isProEvent),
    [availableEvents]
  );

  // Distinct department list for filtering
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    availableEvents.forEach((e) => {
      if (e.schoolOrDept) depts.add(e.schoolOrDept);
    });
    return Array.from(depts).sort();
  }, [availableEvents]);

  const slot1Event = useMemo(
    () => availableEvents.find((e) => e.id === slot1Id),
    [availableEvents, slot1Id]
  );
  const slot2Event = useMemo(
    () => availableEvents.find((e) => e.id === slot2Id),
    [availableEvents, slot2Id]
  );

  const isSlotsComplete = Boolean(slot1Id && slot2Id);
  const chosenCount = (slot1Id ? 1 : 0) + (slot2Id ? 1 : 0);

  // Handle tier switch
  const handleTierChange = (newTier: "standard_pass" | "pro_pass") => {
    setPassTier(newTier);
    setAmount(newTier === "pro_pass" ? 300 : 200);
    setSubmitError(null);

    // Reset Slot 1 if changing between tiers so rule is maintained
    if (newTier === "standard_pass" && slot1Event?.isProEvent) {
      setSlot1Id("");
    } else if (newTier === "pro_pass" && slot1Event && !slot1Event.isProEvent) {
      setSlot1Id("");
    }
  };

  const handleRemoveSlot = (slotNum: 1 | 2) => {
    if (slotNum === 1) {
      setSlot1Id("");
    } else {
      setSlot2Id("");
    }
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setPaymentDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    setSubmitError(null);
  };

  const handleAddRemarkTemplate = (template: string) => {
    setDescription((prev) => (prev ? `${prev} ${template}` : template));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!slot1Id || !slot2Id) {
      setSubmitError(
        passTier === "standard_pass"
          ? "Please choose both regular competitions on the left before submitting."
          : "Please choose 1 Flagship and 1 Regular competition on the left before submitting."
      );
      return;
    }

    if (!transactionId.trim()) {
      setSubmitError("Please enter your 12-digit Bank Reference or Transaction ID.");
      return;
    }

    if (!paymentDate) {
      setSubmitError("Please enter the approximate date and time of payment.");
      return;
    }

    if (!description.trim()) {
      setSubmitError("Please provide a brief note describing what happened.");
      return;
    }

    startTransition(async () => {
      const res = await submitPaymentIssue({
        transactionId: transactionId.trim(),
        amount,
        passTier,
        selectedEventIds: [slot1Id, slot2Id].filter(Boolean),
        paymentMethod,
        paymentDate,
        issueType,
        description: description.trim(),
        orderNumber: orderNumber.trim() || undefined,
      });

      if (res.success && res.ticketNumber) {
        setActiveTicket({
          id: res.ticketNumber,
          ticketNumber: res.ticketNumber,
          userId: "",
          fullName: context.userProfile?.fullName || "Student",
          email: context.userProfile?.email || "",
          phone: context.userProfile?.mobileNumber || "",
          orderNumber: orderNumber.trim() || null,
          transactionId: transactionId.trim(),
          amount,
          passTier,
          selectedEventIds: [slot1Id, slot2Id].filter(Boolean),
          selectedEvents: [slot1Event, slot2Event]
            .filter(Boolean)
            .map((ev) => ({
              id: ev!.id,
              name: ev!.name,
              isProEvent: ev!.isProEvent,
              schoolOrDept: ev!.schoolOrDept,
            })),
          paymentMethod,
          paymentDate,
          issueType,
          description,
          status: "pending",
          gatewayVerified: false,
          createdAt: new Date().toISOString(),
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSubmitError(res.error || "Failed to submit request. Please try again.");
      }
    });
  };

  return (
    <div className="w-full max-w-full lg:max-w-6xl mx-auto space-y-3.5 min-w-0 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. ULTRA-COMPACT UNIFIED HEADER RIBBON
          ───────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────
          1. ULTRA-COMPACT UNIFIED HEADER RIBBON
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-2 sm:p-3 shadow-2xs relative overflow-hidden">
        {/* Subtle decorative gradient top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight font-display truncate">
                  Payment Help &amp; Pass Activation
                </h1>
                {context.isAdmin && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-black uppercase shrink-0">
                    <Zap className="h-2 w-2 text-amber-600" /> Admin
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate leading-tight mt-0.2">
                Choose 2 events &amp; verify bank UTR to issue pass
              </p>
            </div>
          </div>

          {/* User info & Desk link */}
          <div className="flex items-center gap-1.5 shrink-0">
            {context.userProfile && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/90 text-slate-700 text-[11px] shadow-2xs max-w-[120px] sm:max-w-none">
                <div className="h-3.5 w-3.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                  {context.userProfile.fullName ? context.userProfile.fullName.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="font-bold text-slate-900 truncate">{context.userProfile.fullName}</span>
              </div>
            )}

            {context.isAdmin && (
              <Link
                href="/admin/payment-requests"
                target="_blank"
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold transition-colors shadow-2xs shrink-0"
              >
                <span>Desk</span>
                <ExternalLink className="h-2.5 w-2.5 text-amber-700" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STATE 1: NOT AUTHENTICATED
          ───────────────────────────────────────────────────────────── */}
      {!context.isAuthenticated ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center space-y-5 shadow-xs max-w-xl mx-auto my-6">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shadow-2xs">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">Student Sign-In Required</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              To match your payment with your student account and automatically issue your official
              festival pass, please sign in with your student credentials.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?redirect=/payment-help"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 transition-all cursor-pointer"
            >
              <span>Sign In with Student Account</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Create New Account
            </Link>
          </div>
        </div>
      ) : !context.isAdmin && context.isAdminOrCoordinator && !forceShowForm ? (
        /* ─────────────────────────────────────────────────────────────
           STATE 2: COORDINATOR NOTICE
           ───────────────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-amber-200 p-5 sm:p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Staff Coordinator Session Detected
              </h2>
              <p className="text-xs text-amber-800">
                You are signed in as a coordinator (<strong>{context.userRole}</strong>). This form
                is reserved for student participants to resolve their payment receipts.
              </p>
            </div>
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/payment-requests"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Go to Admin Payment Requests Desk</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setForceShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <span>Preview / Test Form</span>
            </button>
          </div>
        </div>
      ) : !context.isAdmin && context.hasActivePass && !activeTicket && !forceShowForm ? (
        /* ─────────────────────────────────────────────────────────────
           STATE 3: PASS ALREADY ACTIVE
           ───────────────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Active Festival Pass Found
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                You already have an active festival pass!
              </h2>
              <p className="text-xs text-slate-600">
                Pass Code: <strong className="font-mono text-emerald-700">{context.activePassCode}</strong> (
                {context.activePassTier === "pro_pass" ? "FLAGSHIP PASS" : "STANDARD PASS"})
              </p>
            </div>
          </div>

          {context.existingRegisteredEvents && context.existingRegisteredEvents.length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Your Registered Competitions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {context.existingRegisteredEvents.map((ev, i) => (
                  <span
                    key={ev.id || i}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 px-2.5 py-1 text-xs font-semibold shadow-2xs"
                  >
                    <span>{ev.name}</span>
                    {ev.isProEvent && (
                      <span className="bg-amber-400 text-amber-950 text-[9px] px-1 py-0.2 rounded font-black">
                        FLAGSHIP
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/passes"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Open My Digital QR Gate Pass</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setForceShowForm(true)}
              className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>I Paid for a Different Pass / Report Issue</span>
            </button>
          </div>
        </div>
      ) : activeTicket && !forceShowForm ? (
        /* ─────────────────────────────────────────────────────────────
           STATE 4: REAL-TIME TICKET TRACKER & VERIFICATION STATUS
           ───────────────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 space-y-4 shadow-2xs">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800">
                Ticket #{activeTicket.ticketNumber}
              </span>
              <span
                className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  activeTicket.status === "resolved"
                    ? "bg-emerald-600 text-white"
                    : activeTicket.status === "rejected"
                    ? "bg-rose-600 text-white"
                    : activeTicket.status === "under_review" || activeTicket.gatewayVerified
                    ? "bg-indigo-600 text-white"
                    : "bg-amber-500 text-slate-950"
                }`}
              >
                {activeTicket.status === "resolved"
                  ? "✓ Pass Issued & Resolved"
                  : activeTicket.status === "rejected"
                  ? "✕ Declined"
                  : activeTicket.status === "under_review" || activeTicket.gatewayVerified
                  ? "⚡ Gateway Verified (In Review)"
                  : "⏳ Queued for Verification"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={checkStatus}
                disabled={isRefreshingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                title="Check latest status from server"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshingStatus ? "animate-spin text-primary" : ""}`} />
                <span>{isRefreshingStatus ? "Checking..." : "Refresh Status"}</span>
              </button>
            </div>
          </div>

          {/* 3-Step Visual Progress Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            {/* Step 1: Submitted */}
            <div className="flex items-center gap-2.5 p-2 sm:p-1 rounded-xl bg-white sm:bg-transparent border sm:border-0 border-slate-200/60 shadow-2xs sm:shadow-none">
              <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                ✓
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">1. Submitted</div>
                <div className="text-[10px] text-slate-500 truncate">Details Received</div>
              </div>
            </div>

            {/* Step 2: Gateway & Admin Review */}
            <div className="flex items-center gap-2.5 p-2 sm:p-1 rounded-xl bg-white sm:bg-transparent border sm:border-0 border-slate-200/60 shadow-2xs sm:shadow-none">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                  activeTicket.status === "resolved" || activeTicket.gatewayVerified
                    ? "bg-emerald-500 text-white"
                    : activeTicket.status === "rejected"
                    ? "bg-rose-500 text-white"
                    : "bg-amber-500 text-white animate-pulse"
                }`}
              >
                {activeTicket.status === "resolved" || activeTicket.gatewayVerified
                  ? "✓"
                  : activeTicket.status === "rejected"
                  ? "✕"
                  : "2"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">2. Verification</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {activeTicket.gatewayVerified
                    ? "Easebuzz Matched"
                    : activeTicket.status === "rejected"
                    ? "Verification Failed"
                    : "Matching UTR..."}
                </div>
              </div>
            </div>

            {/* Step 3: Pass Activated */}
            <div className="flex items-center gap-2.5 p-2 sm:p-1 rounded-xl bg-white sm:bg-transparent border sm:border-0 border-slate-200/60 shadow-2xs sm:shadow-none">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                  activeTicket.status === "resolved"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {activeTicket.status === "resolved" ? "✓" : "3"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">3. Pass Issued</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {activeTicket.status === "resolved" ? "Gate Pass Ready" : "Awaiting Approval"}
                </div>
              </div>
            </div>
          </div>

          {/* Primary Status Banner */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
              activeTicket.status === "resolved"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                : activeTicket.status === "rejected"
                ? "bg-rose-50/90 border-rose-200 text-rose-950"
                : activeTicket.status === "under_review" || activeTicket.gatewayVerified
                ? "bg-indigo-50/90 border-indigo-200 text-indigo-950"
                : "bg-amber-50/90 border-amber-200 text-amber-950"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {activeTicket.status === "resolved" ? (
                <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : activeTicket.status === "rejected" ? (
                <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Clock className="h-5 w-5 animate-spin" />
                </div>
              )}

              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {activeTicket.status === "resolved"
                    ? "Festival Pass Successfully Activated!"
                    : activeTicket.status === "rejected"
                    ? "Payment Request Requires Attention"
                    : activeTicket.status === "under_review" || activeTicket.gatewayVerified
                    ? "Payment Verified on Gateway — Under Admin Final Review"
                    : "Your Payment Request is Queued for Verification"}
                </h3>
                <span className="text-[11px] text-slate-600 block">
                  Submitted on {new Date(activeTicket.createdAt).toLocaleDateString()} at{" "}
                  {new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
              {activeTicket.status === "resolved" ? (
                <>
                  Your payment has been verified and your official festival pass (
                  <strong className="font-mono text-emerald-800">{activeTicket.issuedPassCode || "Active"}</strong>)
                  has been activated. Your 2 chosen competitions are confirmed.
                </>
              ) : activeTicket.status === "rejected" ? (
                <>
                  <strong className="text-rose-800 block mb-0.5">Admin Remarks / Reason:</strong>
                  <span className="bg-white/80 p-2.5 rounded-xl border border-rose-200 block text-rose-900 font-medium text-xs">
                    {activeTicket.adminNotes ||
                      "Verification failed. The bank reference or transaction ID could not be matched with gateway logs."}
                  </span>
                </>
              ) : activeTicket.status === "under_review" || activeTicket.gatewayVerified ? (
                <>
                  Easebuzz gateway confirmed your payment of <strong>{formatCurrency(activeTicket.amount)}</strong>.
                  Our festival desk is finalizing your pass registration and allocating competition slots.
                </>
              ) : (
                <>
                  Our team and automated gateway check are matching your bank reference ID (
                  <strong className="font-mono">{activeTicket.transactionId}</strong>) against the payment gateway logs.
                  You do not need to submit again.
                </>
              )}
            </p>

            {/* Resolved Action: Open QR Pass */}
            {activeTicket.status === "resolved" && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open Digital QR Gate Pass</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Rejected Action: Resubmit Button */}
            {activeTicket.status === "rejected" && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForceShowForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Resubmit with Correct Bank Reference</span>
                </button>
              </div>
            )}
          </div>

          {/* Submitted Request Snapshot */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 space-y-3 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Submitted Payment Snapshot:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px]">Bank Reference (UTR):</span>
                <strong className="font-mono text-slate-900 break-all">{activeTicket.transactionId}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Amount &amp; Tier:</span>
                <strong className="text-slate-900">
                  {formatCurrency(activeTicket.amount)} ({activeTicket.passTier === "pro_pass" ? "Flagship" : "Standard"})
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Payment App:</span>
                <span className="text-slate-800 font-semibold">{activeTicket.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Payment Time:</span>
                <span className="text-slate-800 font-semibold">{activeTicket.paymentDate}</span>
              </div>
            </div>

            {activeTicket.selectedEvents && activeTicket.selectedEvents.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Your Chosen Competitions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeTicket.selectedEvents.map((ev, i) => (
                    <span
                      key={ev.id || i}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{ev.name}</span>
                      {ev.isProEvent ? (
                        <span className="text-[9px] bg-amber-100 text-amber-900 px-1 rounded font-black">
                          FLAGSHIP
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-bold">
                          REGULAR
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom links */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>

            {context.isAdmin && (
              <button
                type="button"
                onClick={() => setForceShowForm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Admin: Test Blank Form</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           STATE 5: ULTRA-COMPACT ATTRACTIVE 2-COLUMN LAYOUT
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-3">
          {submitError && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 shadow-2xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-start w-full min-w-0">
            {/* ═════════════════════════════════════════════════════════
                LEFT COLUMN: PASS & COMPETITIONS (Equal 1st Col)
            ═════════════════════════════════════════════════════════ */}
            <div className="w-full min-w-0 space-y-2.5">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3 relative overflow-hidden">
                {/* Top decorative accent line matching Step 2 */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white text-xs font-black shadow-xs">
                      1
                    </span>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">
                      Choose Your Pass &amp; 2 Competitions
                    </h2>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                      isSlotsComplete
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : chosenCount === 1
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {isSlotsComplete ? "✓ 2 of 2 Ready" : `${chosenCount} of 2 Chosen`}
                  </span>
                </div>

                {/* Dual Pass Cards (Compact 2-Col Grid) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
                  {/* Standard Pass */}
                  <button
                    type="button"
                    onClick={() => handleTierChange("standard_pass")}
                    className={`group relative p-2 sm:p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      passTier === "standard_pass"
                        ? "border-primary bg-gradient-to-b from-indigo-50/90 to-white ring-2 ring-primary/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all shrink-0 ${
                          passTier === "standard_pass"
                            ? "border-primary bg-primary text-white shadow-2xs"
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        }`}
                      >
                        {passTier === "standard_pass" && <Check className="h-2 w-2 stroke-[3]" />}
                      </span>
                      <span className="font-mono font-black text-xs text-primary bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                        ₹200
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <div className="font-extrabold text-xs text-slate-900 leading-tight">
                        Standard Pass
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        2 Regular Events
                      </p>
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-slate-100/90 flex items-center gap-1 text-[9px] font-semibold text-slate-600">
                      <CheckCircle2 className={`h-2.5 w-2.5 shrink-0 ${passTier === "standard_pass" ? "text-primary" : "text-slate-400"}`} />
                      <span className="truncate">Across any depts</span>
                    </div>
                  </button>

                  {/* Flagship Pass */}
                  <button
                    type="button"
                    onClick={() => handleTierChange("pro_pass")}
                    className={`group relative p-2 sm:p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      passTier === "pro_pass"
                        ? "border-amber-500 bg-gradient-to-b from-amber-50/90 to-white ring-2 ring-amber-400/25 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all shrink-0 ${
                          passTier === "pro_pass"
                            ? "border-amber-600 bg-amber-500 text-white shadow-2xs"
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        }`}
                      >
                        {passTier === "pro_pass" && <Check className="h-2 w-2 stroke-[3]" />}
                      </span>
                      <span className="font-mono font-black text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                        ₹300
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <div className="font-extrabold text-xs text-slate-900 leading-tight flex items-center gap-0.5">
                        <span>⭐ Flagship Pass</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        1 Star + 1 Regular
                      </p>
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-slate-100/90 flex items-center gap-1 text-[9px] font-semibold text-slate-600">
                      <Star className={`h-2.5 w-2.5 shrink-0 ${passTier === "pro_pass" ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                      <span className="truncate">1 Star Flagship Incl.</span>
                    </div>
                  </button>
                </div>

                {/* Compact Department Filter Strip */}
                <div className="flex items-center gap-1.5 bg-slate-50/90 px-2.5 py-1 rounded-lg border border-slate-200/80 text-xs shadow-2xs w-full max-w-full">
                  <div className="flex items-center gap-1 text-slate-500 font-bold text-[10px] shrink-0">
                    <Filter className="h-3 w-3 text-slate-400" />
                    <span>Dept:</span>
                  </div>
                  <select
                    value={selectedFilterDept}
                    onChange={(e) => setSelectedFilterDept(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer truncate max-w-full py-0.5"
                  >
                    <option value="All">All Departments ({availableEvents.length} events)</option>
                    {passTier === "pro_pass" && (
                      <option value="Flagship">⭐ Flagship Events Only ({flagshipEvents.length})</option>
                    )}
                    {allDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2 Competition Slots (Compact Side-by-Side or Stacked) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full">
                  {/* Slot 1 Box */}
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl border space-y-1.5 transition-all w-full max-w-full overflow-hidden ${
                      slot1Id
                        ? "bg-indigo-50/40 border-indigo-200/90 shadow-2xs"
                        : "bg-slate-50/70 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                            passTier === "pro_pass"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-indigo-100 text-indigo-900 border border-indigo-200"
                          }`}
                        >
                          {passTier === "pro_pass" ? "⭐ FLAGSHIP" : "REGULAR"}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-900 truncate">
                          Slot 1 <span className="text-rose-500">*</span>
                        </span>
                      </span>
                      {slot1Event && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(1)}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer shrink-0"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <select
                      value={slot1Id}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSlot1Id(id);
                        setSubmitError(null);
                      }}
                      className="w-full max-w-full h-8.5 px-2.5 py-1 text-xs bg-white border border-slate-200 hover:border-slate-300 focus:border-primary rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer shadow-2xs transition-all truncate"
                    >
                      <option value="">
                        -- Choose {passTier === "pro_pass" ? "⭐ Flagship Event" : "Slot 1 Event"} --
                      </option>
                      {(passTier === "pro_pass" ? flagshipEvents : regularEvents)
                        .filter((ev) => {
                          if (selectedFilterDept === "Flagship") return ev.isProEvent;
                          if (selectedFilterDept !== "All") return ev.schoolOrDept === selectedFilterDept;
                          return true;
                        })
                        .map((ev) => (
                          <option key={ev.id} value={ev.id} disabled={ev.isFull || ev.id === slot2Id}>
                            {ev.isProEvent ? "⭐ " : ""}{ev.name} • {ev.schoolOrDept} {ev.isFull ? "(FULL)" : ""}
                          </option>
                        ))}
                    </select>

                    {slot1Event && (
                      <div className="flex items-center justify-between gap-1 text-[10px] text-emerald-900 bg-emerald-50/90 border border-emerald-200 rounded-lg px-2 py-0.5 animate-in fade-in duration-100 max-w-full overflow-hidden">
                        <span className="font-bold truncate flex items-center gap-1 min-w-0 flex-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{slot1Event.name}</span>
                        </span>
                        <span className="text-emerald-700 shrink-0 font-medium text-[9px] truncate max-w-[95px] bg-white/80 px-1 py-0.2 rounded border border-emerald-200">
                          {slot1Event.schoolOrDept}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Slot 2 Box */}
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl border space-y-1.5 transition-all w-full max-w-full overflow-hidden ${
                      slot2Id
                        ? "bg-indigo-50/40 border-indigo-200/90 shadow-2xs"
                        : "bg-slate-50/70 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200 shrink-0">
                          REGULAR
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-900 truncate">
                          Slot 2 <span className="text-rose-500">*</span>
                        </span>
                      </span>
                      {slot2Event && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(2)}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer shrink-0"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <select
                      value={slot2Id}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSlot2Id(id);
                        setSubmitError(null);
                      }}
                      className="w-full max-w-full h-8.5 px-2.5 py-1 text-xs bg-white border border-slate-200 hover:border-slate-300 focus:border-primary rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer shadow-2xs transition-all truncate"
                    >
                      <option value="">
                        -- Choose Slot 2 Regular Event --
                      </option>
                      {regularEvents
                        .filter((ev) => {
                          if (selectedFilterDept !== "All" && selectedFilterDept !== "Flagship") {
                            return ev.schoolOrDept === selectedFilterDept;
                          }
                          return true;
                        })
                        .map((ev) => (
                          <option key={ev.id} value={ev.id} disabled={ev.isFull || ev.id === slot1Id}>
                            {ev.name} • {ev.schoolOrDept} {ev.isFull ? "(FULL)" : ""}
                          </option>
                        ))}
                    </select>

                    {slot2Event && (
                      <div className="flex items-center justify-between gap-1 text-[10px] text-emerald-900 bg-emerald-50/90 border border-emerald-200 rounded-lg px-2 py-0.5 animate-in fade-in duration-100 max-w-full overflow-hidden">
                        <span className="font-bold truncate flex items-center gap-1 min-w-0 flex-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{slot2Event.name}</span>
                        </span>
                        <span className="text-emerald-700 shrink-0 font-medium text-[9px] truncate max-w-[95px] bg-white/80 px-1 py-0.2 rounded border border-emerald-200">
                          {slot2Event.schoolOrDept}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pass Package Confirmation or Guidelines (Symmetrically balances Step 1 with Step 2) */}
                {isSlotsComplete ? (
                  <div className="rounded-xl bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border border-emerald-200/90 p-2.5 sm:p-3 space-y-2 animate-in fade-in duration-150 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Package Configured — Ready to Activate</span>
                      </span>
                      <span className="text-[11px] font-mono font-black text-emerald-800 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between bg-white/80 px-2 py-1 rounded-lg border border-emerald-100 text-slate-700">
                        <span className="truncate font-semibold flex items-center gap-1 min-w-0">
                          <span className="text-slate-400 font-mono text-[10px]">#1</span>
                          <span className="truncate">{slot1Event?.name}</span>
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded shrink-0 ml-1">
                          {slot1Event?.isProEvent ? "⭐ Flagship" : "Regular"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white/80 px-2 py-1 rounded-lg border border-emerald-100 text-slate-700">
                        <span className="truncate font-semibold flex items-center gap-1 min-w-0">
                          <span className="text-slate-400 font-mono text-[10px]">#2</span>
                          <span className="truncate">{slot2Event?.name}</span>
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded shrink-0 ml-1">
                          Regular
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-800 font-medium leading-tight">
                      👉 Next: Enter your 12-digit Bank UTR in Step 2 on the right to match your transaction.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-2.5 sm:p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span className="flex items-center gap-1 text-slate-800">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Festival Pass Inclusions &amp; Guarantee</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">Euphoria &apos;26</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                      <div className="flex items-start gap-1">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">All pro-shows &amp; cultural night stage access</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">Automatic reservation of both competition slots</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">Instant verification directly with Easebuzz logs</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">Digital QR Gate Pass issued to your student portal</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════
                RIGHT COLUMN: PAYMENT VERIFICATION FORM (Equal 2nd Col)
            ═════════════════════════════════════════════════════════ */}
            <div className="w-full min-w-0 space-y-2.5">
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3 relative overflow-hidden"
              >
                {/* Top decorative accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white text-xs font-black shadow-xs">
                      2
                    </span>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">
                      Verify Bank Payment
                    </h2>
                  </div>

                  <span className="font-mono font-black text-xs text-primary bg-indigo-50/90 border border-indigo-200/90 px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1">
                    <span>Amount:</span>
                    <span>{formatCurrency(amount)}</span>
                  </span>
                </div>

                {/* 1. Bank Reference ID (UTR) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800 flex items-center gap-1 text-[11px] sm:text-xs">
                      <Hash className="h-3 w-3 text-primary" />
                      <span>Bank Reference / UTR ID <span className="text-rose-500">*</span></span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowUtrHelp(!showUtrHelp)}
                      className="text-[10px] font-bold text-primary bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="h-2.5 w-2.5" />
                      <span>{showUtrHelp ? "Hide guide" : "Where to find UTR?"}</span>
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => {
                        setTransactionId(e.target.value);
                        setSubmitError(null);
                      }}
                      placeholder="e.g. 408123456789 or TXN98765432"
                      className="w-full h-9 pl-3 pr-20 text-xs sm:text-sm font-mono tracking-wider bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:border-primary rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                    />
                    {transactionId.trim().length >= 12 && (
                      <span className="absolute right-2 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 pointer-events-none animate-in fade-in duration-150">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                        <span>12 Digits</span>
                      </span>
                    )}
                  </div>

                  {/* Expandable UTR Helper Accordion */}
                  {showUtrHelp && (
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/90 to-purple-50/40 border border-indigo-200/90 text-xs text-slate-700 space-y-1.5 animate-in fade-in duration-150 shadow-2xs">
                      <div className="font-bold text-indigo-950 flex items-center gap-1 text-[11px]">
                        <Info className="h-3 w-3 text-primary shrink-0" />
                        <span>Where to find your 12-digit UTR on your payment app:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                          <strong className="text-emerald-700 block">Google Pay</strong>
                          <span className="text-slate-600">UPI Transaction ID</span>
                        </div>
                        <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                          <strong className="text-purple-700 block">PhonePe</strong>
                          <span className="text-slate-600">UTR in History</span>
                        </div>
                        <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                          <strong className="text-sky-700 block">Paytm</strong>
                          <span className="text-slate-600">UPI Ref Number</span>
                        </div>
                        <div className="bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                          <strong className="text-amber-800 block">Bank SMS</strong>
                          <span className="text-slate-600">12-digit Ref in SMS</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!showUtrHelp && (
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Found in your bank debit SMS or UPI receipt (12-digit UTR / Ref ID).
                    </p>
                  )}
                </div>

                {/* 2. Payment Method & Date (2 cols) */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="space-y-0.5 w-full min-w-0">
                    <label className="text-[11px] font-bold text-slate-800">
                      Payment App <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full max-w-full h-9 px-2 text-xs bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:border-primary rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs truncate transition-all"
                    >
                      <option value="Google Pay">Google Pay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                      <option value="BHIM UPI">BHIM UPI</option>
                      <option value="Cred">Cred</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Debit/Credit Card">Card</option>
                      <option value="Other">Other UPI</option>
                    </select>
                  </div>

                  <div className="space-y-0.5 w-full min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">Payment Time <span className="text-rose-500">*</span></span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSetCurrentTime}
                        className="text-[9px] font-bold text-primary hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.2 rounded transition-colors cursor-pointer"
                        title="Set to current date and time"
                      >
                        ⚡ Now
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full max-w-full h-9 px-2 text-xs bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:border-primary rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* 3. Issue Type */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold text-slate-800">
                    What happened? <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full max-w-full h-9 px-2.5 text-xs bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:border-primary rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs truncate transition-all"
                  >
                    <option value="Amount debited from bank, but pass was not generated">
                      Money deducted, but pass not generated
                    </option>
                    <option value="Payment failed on screen, but money was deducted">
                      Screen showed failed, but money deducted
                    </option>
                    <option value="Double payment / multiple debits for single pass">
                      Money debited more than once (double payment)
                    </option>
                    <option value="Events not linked to my payment">
                      Payment success, but competitions missing
                    </option>
                    <option value="Other payment dispute">Other payment problem</option>
                  </select>
                </div>

                {/* 4. Notes Textarea */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800">
                      Brief Note / Remarks <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Quick details</span>
                  </div>
                  <textarea
                    required
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Paid ₹200 on GPay, money deducted from bank, pass not generated."
                    className="w-full p-2.5 text-xs bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:border-primary rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none shadow-2xs transition-all"
                  />

                  {/* Quick suggestion tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Quick chips:</span>
                    <button
                      type="button"
                      onClick={() => handleAddRemarkTemplate("Amount debited from bank.")}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                    >
                      + Debited
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddRemarkTemplate("GPay success receipt attached.")}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                    >
                      + GPay Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddRemarkTemplate("Double debited from account.")}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                    >
                      + Double Paid
                    </button>
                  </div>
                </div>

                {/* Optional Order Number Link */}
                <div className="pt-0.5">
                  {!showOrderField ? (
                    <button
                      type="button"
                      onClick={() => setShowOrderField(true)}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>+ Add Website Order Number (Optional)</span>
                    </button>
                  ) : (
                    <div className="space-y-0.5 animate-in fade-in duration-100">
                      <label className="text-[10px] font-bold text-slate-700 flex items-center justify-between">
                        <span>Website Order Number / Merchant Ref</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowOrderField(false);
                            setOrderNumber("");
                          }}
                          className="text-[9px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      </label>
                      <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="e.g. EUPH-ORD-12345"
                        className="w-full h-8.5 px-2.5 text-xs font-mono bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Submission Action */}
                <div className="pt-1.5 space-y-2 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isPending}
                    className={`w-full h-10 sm:h-11 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !isSlotsComplete
                        ? "bg-slate-100 text-slate-500 border border-slate-200/80 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-primary via-indigo-600 to-purple-600 hover:from-primary-hover hover:via-indigo-700 hover:to-purple-700 text-white shadow-primary/25 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying with Payment Gateway...</span>
                      </>
                    ) : !isSlotsComplete ? (
                      <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {chosenCount === 0
                            ? "Select 2 Competitions in Step 1 (0/2)"
                            : "Choose 1 More Competition in Step 1 (1/2)"}
                        </span>
                      </span>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>Submit Pass Request ({formatCurrency(amount)})</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Verified directly against gateway transaction records</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
