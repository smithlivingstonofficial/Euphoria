"use client";

import { useState, useTransition } from "react";
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  Layers,
  X,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronRight,
  User,
  AlertTriangle,
  FileText,
  Eye,
  RotateCcw,
  QrCode,
  Sparkles,
  ChevronDown,
  Building,
  Phone,
  Mail,
  Calendar,
  Check,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  StudentPaymentIssue,
  autoVerifyPaymentIssueAdmin,
  approveAndIssuePassAdmin,
  rejectPaymentIssueAdmin,
  reopenPaymentIssueAdmin,
  updatePaymentIssueEventsAdmin,
  getPaymentIssuesAdmin,
} from "@/actions/payment-issues";

interface AvailableEvent {
  id: string;
  name: string;
  isProEvent: boolean;
  schoolOrDept?: string;
}

export function PaymentRequestsClient({
  initialIssues = [],
  initialMetrics,
  availableEvents = [],
}: {
  initialIssues: StudentPaymentIssue[];
  initialMetrics: {
    total: number;
    pending: number;
    underReview: number;
    resolved: number;
    rejected: number;
    autoVerified: number;
  };
  availableEvents?: AvailableEvent[];
}) {
  const [issues, setIssues] = useState<StudentPaymentIssue[]>(initialIssues);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Loading state per item for auto-verify
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isBatchVerifying, setIsBatchVerifying] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // MODAL STATES
  // ═══════════════════════════════════════════════════════════════
  // 1. Inspect / Deep Telemetry Modal
  const [inspectTarget, setInspectTarget] = useState<StudentPaymentIssue | null>(null);
  const [inspectSlot1, setInspectSlot1] = useState<string>("");
  const [inspectSlot2, setInspectSlot2] = useState<string>("");
  const [isSavingEvents, setIsSavingEvents] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // 2. Approve Modal
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<StudentPaymentIssue | null>(null);
  const [approveAdminNotes, setApproveAdminNotes] = useState("");
  const [approveSlot1, setApproveSlot1] = useState<string>("");
  const [approveSlot2, setApproveSlot2] = useState<string>("");
  const [approveEventError, setApproveEventError] = useState<string | null>(null);

  // 3. Reject Modal
  const [rejectConfirmTarget, setRejectConfirmTarget] = useState<StudentPaymentIssue | null>(null);
  const [rejectAdminNotes, setRejectAdminNotes] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  // 4. Re-Open Modal
  const [reopenConfirmTarget, setReopenConfirmTarget] = useState<StudentPaymentIssue | null>(null);
  const [reopenAdminNotes, setReopenAdminNotes] = useState("");

  // Refresh Table Data
  const refreshData = async () => {
    startTransition(async () => {
      const res = await getPaymentIssuesAdmin({
        statusFilter,
        searchQuery: searchQuery.trim() || undefined,
      });
      if (res.success) {
        setIssues(res.issues);
        setMetrics(res.metrics);
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 1. AUTO-VERIFY ACTION
  // ─────────────────────────────────────────────────────────────
  const handleAutoVerify = async (issue: StudentPaymentIssue) => {
    setVerifyingId(issue.id);
    setActionNotice(null);

    try {
      const result = await autoVerifyPaymentIssueAdmin(issue.id);
      if (result.success) {
        setActionNotice({
          type: result.verified ? "success" : result.verdict === "GATEWAY_FAILED" ? "error" : "info",
          message:
            result.verdictMessage ||
            (result.verified
              ? `Gateway Verified! 100% Match on Easebuzz for ${issue.fullName}.`
              : `Auto-verification check completed for ${issue.transactionId}.`),
        });

        // Update item in place
        const updatedIssue = {
          ...issue,
          gatewayVerified: result.verified,
          gatewayResponse: result.report || {
            verdict: result.verdict,
            verdictMessage: result.verdictMessage,
          },
          status: (result.verified && issue.status === "pending" ? "under_review" : issue.status) as any,
        };

        setIssues((prev) => prev.map((i) => (i.id === issue.id ? updatedIssue : i)));

        // If currently open in inspect modal, update it too
        if (inspectTarget?.id === issue.id) {
          setInspectTarget(updatedIssue);
        }
      } else {
        setActionNotice({
          type: "error",
          message: result.error || "Auto-verification query failed.",
        });
      }
    } catch {
      setActionNotice({
        type: "error",
        message: "Failed to connect to gateway verification endpoint.",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  // Batch Auto-Verify All Pending/Unverified
  const handleBatchAutoVerify = async () => {
    const candidates = issues.filter(
      (i) => (i.status === "pending" || i.status === "under_review") && !i.gatewayVerified
    );

    if (candidates.length === 0) {
      setActionNotice({
        type: "info",
        message: "All active tickets are already verified.",
      });
      return;
    }

    setIsBatchVerifying(true);
    setBatchProgress({ done: 0, total: candidates.length });

    let verifiedCount = 0;
    for (let index = 0; index < candidates.length; index++) {
      const target = candidates[index];
      try {
        const res = await autoVerifyPaymentIssueAdmin(target.id);
        if (res.success && res.verified) {
          verifiedCount++;
        }
        setIssues((prev) =>
          prev.map((i) =>
            i.id === target.id
              ? {
                  ...i,
                  gatewayVerified: res.verified,
                  gatewayResponse: res.report || {
                    verdict: res.verdict,
                    verdictMessage: res.verdictMessage,
                  },
                  status: (res.verified && i.status === "pending" ? "under_review" : i.status) as any,
                }
              : i
          )
        );
      } catch (err) {
        console.warn("Batch verify error for", target.ticketNumber, err);
      }
      setBatchProgress({ done: index + 1, total: candidates.length });
    }

    setIsBatchVerifying(false);
    setBatchProgress(null);
    setActionNotice({
      type: "success",
      message: `Batch verification finished: ${verifiedCount} of ${candidates.length} ticket(s) verified on gateway.`,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 2. APPROVE & ISSUE PASS ACTION
  // ─────────────────────────────────────────────────────────────
  const openApproveModal = (issue: StudentPaymentIssue) => {
    setApproveConfirmTarget(issue);
    setApproveAdminNotes("");
    setApproveEventError(null);

    // Pre-populate slots from existing events if available
    const ev1 = issue.selectedEvents?.[0]?.id || issue.selectedEventIds?.[0] || "";
    const ev2 = issue.selectedEvents?.[1]?.id || issue.selectedEventIds?.[1] || "";
    setApproveSlot1(ev1);
    setApproveSlot2(ev2);
  };

  const handleConfirmApprove = async () => {
    if (!approveConfirmTarget) return;

    const target = approveConfirmTarget;

    // If student had no events chosen, check if admin selected events in the modal
    let assignedEventIds: string[] | undefined = undefined;
    if ((!target.selectedEvents || target.selectedEvents.length === 0) && (approveSlot1 || approveSlot2)) {
      const chosen = [approveSlot1, approveSlot2].filter(Boolean);
      if (chosen.length > 0) {
        // Validate duplicates
        if (chosen.length === 2 && chosen[0] === chosen[1]) {
          setApproveEventError("Slot 1 and Slot 2 cannot be the same competition.");
          return;
        }
        assignedEventIds = chosen;
      }
    }

    startTransition(async () => {
      setApproveConfirmTarget(null);

      const result = await approveAndIssuePassAdmin(
        target.id,
        approveAdminNotes.trim() || undefined,
        assignedEventIds
      );

      if (result.success && result.passCode) {
        setActionNotice({
          type: "success",
          message: `Success! Pass ${result.passCode} issued to ${target.fullName}. Dispute resolved.`,
        });
        setApproveAdminNotes("");

        // Refresh issue in table
        setIssues((prev) =>
          prev.map((i) =>
            i.id === target.id
              ? {
                  ...i,
                  status: "resolved",
                  issuedPassCode: result.passCode,
                  adminNotes: approveAdminNotes.trim() || "Approved and pass issued by admin.",
                  selectedEventIds: assignedEventIds || i.selectedEventIds,
                }
              : i
          )
        );

        // Update metrics
        setMetrics((m) => ({
          ...m,
          pending: Math.max(0, m.pending - 1),
          resolved: m.resolved + 1,
        }));

        if (inspectTarget?.id === target.id) {
          setInspectTarget(null);
        }
      } else {
        setActionNotice({
          type: "error",
          message: result.error || "Failed to approve payment request.",
        });
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 3. REJECT REQUEST ACTION
  // ─────────────────────────────────────────────────────────────
  const handleConfirmReject = async () => {
    if (!rejectConfirmTarget) return;

    if (!rejectAdminNotes.trim() || rejectAdminNotes.trim().length < 3) {
      setRejectError("Please provide a reason for rejection (this will be shown to the student).");
      return;
    }

    startTransition(async () => {
      const target = rejectConfirmTarget;
      setRejectConfirmTarget(null);
      setRejectError(null);

      const result = await rejectPaymentIssueAdmin(target.id, rejectAdminNotes.trim());
      if (result.success) {
        setActionNotice({
          type: "info",
          message: `Dispute for ${target.fullName} marked as Rejected. Student notified.`,
        });
        setRejectAdminNotes("");

        setIssues((prev) =>
          prev.map((i) =>
            i.id === target.id
              ? {
                  ...i,
                  status: "rejected",
                  adminNotes: rejectAdminNotes.trim(),
                }
              : i
          )
        );

        setMetrics((m) => ({
          ...m,
          pending: Math.max(0, m.pending - 1),
          rejected: m.rejected + 1,
        }));

        if (inspectTarget?.id === target.id) {
          setInspectTarget((prev) =>
            prev ? { ...prev, status: "rejected", adminNotes: rejectAdminNotes.trim() } : null
          );
        }
      } else {
        setActionNotice({
          type: "error",
          message: result.error || "Failed to reject payment request.",
        });
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 4. RE-OPEN REJECTED DISPUTE ACTION
  // ─────────────────────────────────────────────────────────────
  const handleConfirmReopen = async () => {
    if (!reopenConfirmTarget) return;

    startTransition(async () => {
      const target = reopenConfirmTarget;
      setReopenConfirmTarget(null);

      const result = await reopenPaymentIssueAdmin(
        target.id,
        reopenAdminNotes.trim() || undefined
      );

      if (result.success) {
        const note = reopenAdminNotes.trim() || "Dispute re-opened for review and event allocation.";
        setActionNotice({
          type: "success",
          message: `Ticket #${target.ticketNumber} re-opened to Under Review! You can now assign events or approve pass.`,
        });
        setReopenAdminNotes("");

        setIssues((prev) =>
          prev.map((i) =>
            i.id === target.id
              ? {
                  ...i,
                  status: "under_review",
                  adminNotes: note,
                }
              : i
          )
        );

        setMetrics((m) => ({
          ...m,
          rejected: Math.max(0, m.rejected - 1),
          underReview: m.underReview + 1,
        }));

        if (inspectTarget?.id === target.id) {
          setInspectTarget((prev) =>
            prev ? { ...prev, status: "under_review", adminNotes: note } : null
          );
        }
      } else {
        setActionNotice({
          type: "error",
          message: result.error || "Failed to re-open dispute.",
        });
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 5. UPDATE EVENTS DIRECTLY FROM INSPECT MODAL
  // ─────────────────────────────────────────────────────────────
  const handleSaveEventsInInspect = async () => {
    if (!inspectTarget) return;

    const eventIds = [inspectSlot1, inspectSlot2].filter(Boolean);
    if (eventIds.length === 0) {
      setActionNotice({ type: "error", message: "Please select at least 1 competition." });
      return;
    }
    if (eventIds.length === 2 && eventIds[0] === eventIds[1]) {
      setActionNotice({ type: "error", message: "Slot 1 and Slot 2 cannot be the same competition." });
      return;
    }

    setIsSavingEvents(true);
    try {
      const res = await updatePaymentIssueEventsAdmin(inspectTarget.id, eventIds);
      if (res.success && res.events) {
        setActionNotice({
          type: "success",
          message: "Competitions updated successfully for this dispute.",
        });

        // Update inspectTarget & issues list
        const updatedTarget = {
          ...inspectTarget,
          selectedEventIds: eventIds,
          selectedEvents: res.events,
        };
        setInspectTarget(updatedTarget);
        setIssues((prev) => prev.map((i) => (i.id === inspectTarget.id ? updatedTarget : i)));
      } else {
        setActionNotice({ type: "error", message: res.error || "Failed to save competitions." });
      }
    } catch {
      setActionNotice({ type: "error", message: "Error updating competitions." });
    } finally {
      setIsSavingEvents(false);
    }
  };

  // Filter list by status & search
  const displayedIssues = issues.filter((issue) => {
    if (statusFilter !== "all" && issue.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        issue.ticketNumber.toLowerCase().includes(q) ||
        issue.fullName.toLowerCase().includes(q) ||
        issue.email.toLowerCase().includes(q) ||
        issue.transactionId.toLowerCase().includes(q) ||
        (issue.orderNumber && issue.orderNumber.toLowerCase().includes(q)) ||
        (issue.userProfile?.registerNumber && issue.userProfile.registerNumber.toLowerCase().includes(q)) ||
        (issue.userProfile?.collegeName && issue.userProfile.collegeName.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const pendingOrReviewCount = issues.filter(
    (i) => (i.status === "pending" || i.status === "under_review") && !i.gatewayVerified
  ).length;

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-sans tracking-tight">
              Student Payment Requests &amp; Disputes
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review submitted student receipts, live-verify with Easebuzz gateway, assign competitions, and atomically issue festival passes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingOrReviewCount > 0 && (
            <button
              type="button"
              onClick={handleBatchAutoVerify}
              disabled={isBatchVerifying || isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Automatically reconcile all pending tickets with Easebuzz gateway"
            >
              {isBatchVerifying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  <span>
                    Verifying ({batchProgress?.done}/{batchProgress?.total})...
                  </span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>Auto-Verify All ({pendingOrReviewCount})</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={refreshData}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Status Toast Notice ── */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : actionNotice.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-indigo-50 border-indigo-200 text-indigo-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : actionNotice.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            )}
            <span className="font-medium">{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Metrics Cards Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Requests
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
            {metrics.total}
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            Pending Review
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono mt-1">
            {metrics.pending}
          </div>
        </div>

        {/* Gateway Verified */}
        <div className="bg-white p-3.5 rounded-2xl border border-indigo-200/80 shadow-2xs bg-indigo-50/20">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
            Gateway Verified
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 font-mono mt-1">
            {metrics.autoVerified}
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Pass Issued (Resolved)
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">
            {metrics.resolved}
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs bg-rose-50/20 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Rejected
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-1">
            {metrics.rejected}
          </div>
        </div>
      </div>

      {/* ── Toolbar: Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, email, register #, UTR, or ticket #..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-white/60"
            }`}
          >
            All ({metrics.total})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "pending" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-amber-50"
            }`}
          >
            Pending ({metrics.pending})
          </button>
          <button
            onClick={() => setStatusFilter("under_review")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "under_review" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-indigo-50"
            }`}
          >
            Under Review ({metrics.underReview})
          </button>
          <button
            onClick={() => setStatusFilter("resolved")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "resolved" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-emerald-50"
            }`}
          >
            Resolved ({metrics.resolved})
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "rejected" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:bg-rose-50"
            }`}
          >
            Rejected ({metrics.rejected})
          </button>
        </div>
      </div>

      {/* ── Requests Table ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Ticket # &amp; Date</th>
                <th className="py-3 px-4 font-bold">Student Participant</th>
                <th className="py-3 px-4 font-bold">UTR &amp; Payment Details</th>
                <th className="py-3 px-4 font-bold">Selected Competitions</th>
                <th className="py-3 px-4 font-bold">Gateway Verification</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {displayedIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 font-sans">
                    No payment requests match the current criteria.
                  </td>
                </tr>
              ) : (
                displayedIssues.map((issue) => {
                  const isResolved = issue.status === "resolved";
                  const isRejected = issue.status === "rejected";
                  const isPendingReview = issue.status === "pending" || issue.status === "under_review";
                  const isPro = issue.passTier === "pro_pass";

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Ticket # & Date */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {issue.ticketNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {formatDate(issue.createdAt)}
                        </span>
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-900">{issue.fullName}</div>
                        <div className="text-[10px] text-slate-500">{issue.email}</div>
                        <div className="text-[10px] text-slate-400">
                          {issue.phone}
                          {issue.userProfile?.registerNumber && ` • Reg: ${issue.userProfile.registerNumber}`}
                        </div>
                        {issue.userProfile?.collegeName && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {issue.userProfile.collegeName}
                          </div>
                        )}
                      </td>

                      {/* UTR & Transaction Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(issue.amount)}{" "}
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                              isPro ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isPro ? "FLAGSHIP PASS" : "STD PASS"}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 text-[10px] block">Bank UTR / Txn:</span>
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] break-all inline-block">
                            {issue.transactionId}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Via {issue.paymentMethod} • {issue.paymentDate}
                        </div>
                        {issue.description && (
                          <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 max-w-xs">
                            &ldquo;{issue.description}&rdquo;
                          </div>
                        )}
                      </td>

                      {/* Selected Competitions */}
                      <td className="py-3.5 px-4">
                        {issue.selectedEvents && issue.selectedEvents.length > 0 ? (
                          <div className="space-y-1">
                            {issue.selectedEvents.map((ev, idx) => (
                              <div
                                key={ev.id || idx}
                                className="flex items-center gap-1.5 rounded bg-slate-50 border border-slate-200/80 px-2 py-0.5 text-[10px] text-slate-800"
                              >
                                <span className="truncate max-w-[140px] font-medium">{ev.name}</span>
                                {ev.isProEvent ? (
                                  <span className="text-[8px] bg-amber-400 text-amber-950 px-1 rounded font-black">
                                    FLAGSHIP
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-slate-200 text-slate-700 px-1 rounded">
                                    REG
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-amber-700 font-semibold text-[10px] block">
                              No events chosen
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInspectTarget(issue);
                                setInspectSlot1(issue.selectedEventIds?.[0] || "");
                                setInspectSlot2(issue.selectedEventIds?.[1] || "");
                              }}
                              className="text-[9px] text-primary hover:underline font-bold cursor-pointer"
                            >
                              + Assign Competitions
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Gateway Verification & Reconciliation Report */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {issue.gatewayVerified ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>100% Match (Easebuzz)</span>
                              </span>
                              {issue.gatewayResponse?.gatewayMatch?.easepayid && (
                                <div className="text-[9px] font-mono text-slate-400">
                                  PayID: {issue.gatewayResponse.gatewayMatch.easepayid}
                                </div>
                              )}
                              {issue.gatewayResponse?.gatewayMatch?.bankRefNum && (
                                <div className="text-[9px] font-mono text-emerald-700 font-semibold">
                                  UTR: {issue.gatewayResponse.gatewayMatch.bankRefNum}
                                </div>
                              )}
                            </div>
                          ) : issue.gatewayResponse?.verdict === "PARTIAL_MATCH" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                <span>Partial Match</span>
                              </span>
                              <p className="text-[9px] text-amber-700 line-clamp-2 max-w-[170px] leading-tight">
                                {issue.gatewayResponse.verdictMessage}
                              </p>
                            </div>
                          ) : issue.gatewayResponse?.verdict === "GATEWAY_FAILED" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
                                <AlertCircle className="h-3 w-3 text-rose-600" />
                                <span>Gateway Failed</span>
                              </span>
                              <p className="text-[9px] text-rose-600 line-clamp-1 max-w-[170px]">
                                {issue.gatewayResponse.verdictMessage}
                              </p>
                            </div>
                          ) : issue.gatewayResponse?.verdict === "NOT_FOUND" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-medium">
                                <span>Not Found</span>
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-medium">
                              <span>Unverified</span>
                            </span>
                          )}

                          {/* Auto-Verify Button */}
                          {isPendingReview && (
                            <button
                              type="button"
                              onClick={() => handleAutoVerify(issue)}
                              disabled={verifyingId === issue.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-primary border border-indigo-200 text-[10px] font-bold transition-colors cursor-pointer block"
                            >
                              {verifyingId === issue.id ? (
                                <>
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  <span>Checking Gateway...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="h-2.5 w-2.5 text-amber-500" />
                                  <span>{issue.gatewayResponse ? "⚡ Re-Verify" : "⚡ Auto-Verify"}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isResolved ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>RESOLVED</span>
                            </span>
                            {issue.issuedPassCode && (
                              <span className="font-mono font-bold text-primary block text-[10px] mt-0.5">
                                Pass: {issue.issuedPassCode}
                              </span>
                            )}
                          </div>
                        ) : isRejected ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold">
                              <AlertCircle className="h-3 w-3 text-rose-600" />
                              <span>REJECTED</span>
                            </span>
                            {issue.adminNotes && (
                              <div className="text-[10px] text-rose-700 italic mt-0.5 max-w-xs line-clamp-2">
                                Note: {issue.adminNotes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold">
                            <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
                            <span>{issue.status === "under_review" ? "UNDER REVIEW" : "PENDING"}</span>
                          </span>
                        )}
                      </td>

                      {/* ── Actions Column (Always Active!) ── */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Inspect Button (Available for EVERY row) */}
                          <button
                            type="button"
                            onClick={() => {
                              setInspectTarget(issue);
                              setInspectSlot1(issue.selectedEvents?.[0]?.id || issue.selectedEventIds?.[0] || "");
                              setInspectSlot2(issue.selectedEvents?.[1]?.id || issue.selectedEventIds?.[1] || "");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Inspect complete verification telemetry and dispute details"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            <span>Inspect</span>
                          </button>

                          {/* 2. Pending / Under Review Actions */}
                          {isPendingReview && (
                            <>
                              <button
                                type="button"
                                onClick={() => openApproveModal(issue)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                                title="Approve and atomically issue festival pass"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectConfirmTarget(issue);
                                  setRejectAdminNotes("");
                                  setRejectError(null);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                                title="Reject request with student remarks"
                              >
                                <X className="h-3 w-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* 3. Rejected State Actions */}
                          {isRejected && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setReopenConfirmTarget(issue);
                                  setReopenAdminNotes("");
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] transition-colors cursor-pointer"
                                title="Re-open this dispute to under_review for reconsideration"
                              >
                                <RotateCcw className="h-3 w-3 text-amber-700" />
                                <span>Re-Open</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openApproveModal(issue)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                                title="Override rejection and issue festival pass"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Approve</span>
                              </button>
                            </>
                          )}

                          {/* 4. Resolved State Action */}
                          {isResolved && issue.issuedPassCode && (
                            <a
                              href="/dashboard/passes"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] transition-colors"
                              title="View issued pass in Delegate Passes"
                            >
                              <QrCode className="h-3 w-3 text-emerald-600" />
                              <span>Pass View</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: COMPLETE TICKET INSPECTION & TELEMETRY DRAWER
      ═══════════════════════════════════════════════════════════════ */}
      {inspectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 font-mono">
                      {inspectTarget.ticketNumber}
                    </h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        inspectTarget.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800"
                          : inspectTarget.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {inspectTarget.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dispute filed on {formatDate(inspectTarget.createdAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-slate-700">
              {/* 1. Student Profile Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Student Participant Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Full Name &amp; Email</span>
                    <strong className="text-slate-900 text-xs block">{inspectTarget.fullName}</strong>
                    <span className="text-slate-600 text-[11px]">{inspectTarget.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Mobile &amp; Register Number</span>
                    <span className="font-mono text-slate-900 font-bold block">{inspectTarget.phone}</span>
                    <span className="text-slate-600 text-[11px]">
                      {inspectTarget.userProfile?.registerNumber
                        ? `Reg: ${inspectTarget.userProfile.registerNumber}`
                        : "No register number"}
                    </span>
                  </div>
                  {inspectTarget.userProfile?.collegeName && (
                    <div className="sm:col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 text-[10px] block">College / Institution</span>
                      <span className="text-slate-800 font-medium">{inspectTarget.userProfile.collegeName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Dispute Details & Submitted Receipt */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Submitted Dispute &amp; Bank Receipt
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Amount Paid</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(inspectTarget.amount)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Requested Pass</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {inspectTarget.passTier === "pro_pass" ? "Flagship (₹300)" : "Standard (₹200)"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Payment App / Mode</span>
                    <span className="font-medium text-slate-800 text-xs">{inspectTarget.paymentMethod}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Payment Timestamp</span>
                    <span className="text-slate-800 text-xs">{inspectTarget.paymentDate}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 text-[10px] block">Bank Reference / UTR Number:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 text-xs inline-block">
                    {inspectTarget.transactionId}
                  </span>
                </div>

                {inspectTarget.description && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] block mb-1">Student Description / Statement:</span>
                    <p className="text-slate-800 italic leading-relaxed">
                      &ldquo;{inspectTarget.description}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Easebuzz Gateway Telemetry & Reconciled Database Orders */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Gateway &amp; Database Multi-Point Reconciliation
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleAutoVerify(inspectTarget)}
                    disabled={verifyingId === inspectTarget.id}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    {verifyingId === inspectTarget.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 text-amber-500" />
                    )}
                    <span>Re-Check Live Gateway</span>
                  </button>
                </div>

                {/* Verdict Banner */}
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    inspectTarget.gatewayVerified
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                      : inspectTarget.gatewayResponse?.verdict === "PARTIAL_MATCH"
                      ? "bg-amber-50 border-amber-300 text-amber-950"
                      : inspectTarget.gatewayResponse?.verdict === "GATEWAY_FAILED"
                      ? "bg-rose-50 border-rose-200 text-rose-950"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  {inspectTarget.gatewayVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : inspectTarget.gatewayResponse?.verdict === "PARTIAL_MATCH" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <strong className="font-bold text-xs block">
                      {inspectTarget.gatewayVerified
                        ? "100% Easebuzz Gateway Confirmed"
                        : inspectTarget.gatewayResponse?.verdict === "PARTIAL_MATCH"
                        ? "Partial Match Discrepancy"
                        : inspectTarget.gatewayResponse?.verdict === "GATEWAY_FAILED"
                        ? "Easebuzz Gateway Status: Failed"
                        : "Unverified / Not Located on Gateway"}
                    </strong>
                    <p className="text-[11px] leading-relaxed">
                      {inspectTarget.gatewayResponse?.verdictMessage ||
                        "Auto-verification has not verified this bank reference on the payment gateway yet."}
                    </p>
                  </div>
                </div>

                {/* Gateway Match Attributes */}
                {inspectTarget.gatewayResponse?.gatewayMatch && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Easebuzz Pay ID</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {inspectTarget.gatewayResponse.gatewayMatch.easepayid || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Gateway Bank Ref (UTR)</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        {inspectTarget.gatewayResponse.gatewayMatch.bankRefNum || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Gateway Amount</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{inspectTarget.gatewayResponse.gatewayMatch.amount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Gateway Status</span>
                      <span className="font-bold uppercase text-emerald-700">
                        {inspectTarget.gatewayResponse.gatewayMatch.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Payment Source / Mode</span>
                      <span className="text-slate-800">
                        {inspectTarget.gatewayResponse.gatewayMatch.paymentMode || "UPI"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Added On</span>
                      <span className="text-slate-600">
                        {inspectTarget.gatewayResponse.gatewayMatch.addedOn || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Database Orders Table */}
                {inspectTarget.gatewayResponse?.matchedDbOrders &&
                  inspectTarget.gatewayResponse.matchedDbOrders.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Matched System Orders (`orders` table):
                      </span>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-2">Order #</th>
                              <th className="p-2">Amount</th>
                              <th className="p-2">Status</th>
                              <th className="p-2">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {inspectTarget.gatewayResponse.matchedDbOrders.map((o: any, idx: number) => (
                              <tr key={o.id || idx}>
                                <td className="p-2 font-mono">{o.orderNumber}</td>
                                <td className="p-2 font-mono">₹{o.amount}</td>
                                <td className="p-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                                      o.status === "paid"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {o.status}
                                  </span>
                                </td>
                                <td className="p-2 text-slate-500">{formatDate(o.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Collapsible Raw JSON Telemetry */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showRawJson ? "Hide Raw Gateway JSON" : "View Raw Gateway JSON Response"}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${showRawJson ? "rotate-180" : ""}`} />
                  </button>
                  {showRawJson && (
                    <pre className="mt-2 p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-48">
                      {JSON.stringify(inspectTarget.gatewayResponse, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {/* 4. Competition Allocation & Assignment Desk */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Competition Allocation (2 Slots)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {inspectTarget.passTier === "pro_pass"
                        ? "Flagship Pass includes: 1 Flagship Event + 1 Regular Event (or 2 Regulars)."
                        : "Standard Pass includes: 2 Regular Events."}
                    </p>
                  </div>
                </div>

                {/* Slot Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Slot 1 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">
                      Competition Slot 1{" "}
                      {inspectTarget.passTier === "pro_pass" && (
                        <span className="text-amber-600 font-semibold">(Can be Flagship or Regular)</span>
                      )}
                    </label>
                    <select
                      value={inspectSlot1}
                      onChange={(e) => setInspectSlot1(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Choose Competition Slot 1 --</option>
                      {availableEvents
                        .filter((ev) => inspectTarget.passTier === "pro_pass" || !ev.isProEvent)
                        .map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.isProEvent ? "★ [FLAGSHIP] " : "[REGULAR] "}
                            {ev.name} ({ev.schoolOrDept || "General"})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Slot 2 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">
                      Competition Slot 2{" "}
                      <span className="text-slate-400 font-normal">(Regular Competition)</span>
                    </label>
                    <select
                      value={inspectSlot2}
                      onChange={(e) => setInspectSlot2(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Choose Competition Slot 2 --</option>
                      {availableEvents
                        .filter((ev) => !ev.isProEvent)
                        .map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            [REGULAR] {ev.name} ({ev.schoolOrDept || "General"})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Assigning competitions allows you to approve and issue passes without student delay.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveEventsInInspect}
                    disabled={isSavingEvents || (!inspectSlot1 && !inspectSlot2)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEvents ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    <span>Save Assigned Events</span>
                  </button>
                </div>
              </div>

              {/* 5. Admin Notes / Audit Trail */}
              {inspectTarget.adminNotes && (
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-1">
                  <h3 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Previous Admin Action / Rejection Note
                  </h3>
                  <p className="text-amber-950 font-medium leading-relaxed">
                    {inspectTarget.adminNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {/* Re-Open Button if rejected */}
                {inspectTarget.status === "rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectTarget;
                      setInspectTarget(null);
                      setReopenConfirmTarget(target);
                      setReopenAdminNotes("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                    <span>Re-Open Dispute</span>
                  </button>
                )}

                {/* Reject Button if not resolved and not rejected */}
                {inspectTarget.status !== "resolved" && inspectTarget.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectTarget;
                      setInspectTarget(null);
                      setRejectConfirmTarget(target);
                      setRejectAdminNotes("");
                      setRejectError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                )}

                {/* Approve Button if not resolved */}
                {inspectTarget.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectTarget;
                      setInspectTarget(null);
                      openApproveModal(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve &amp; Issue Pass</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: ADMIN CONFIRMATION FOR "APPROVE & ISSUE PASS"
      ═══════════════════════════════════════════════════════════════ */}
      {approveConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Pass Issuance &amp; Approval
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket #{approveConfirmTarget.ticketNumber} • {approveConfirmTarget.fullName}
                </p>
              </div>
            </div>

            {approveEventError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{approveEventError}</span>
              </div>
            )}

            {/* Summary Box */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <strong className="text-slate-900">{approveConfirmTarget.fullName} ({approveConfirmTarget.email})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bank UTR / Txn:</span>
                <strong className="font-mono text-slate-900">{approveConfirmTarget.transactionId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount &amp; Pass Tier:</span>
                <strong className="text-emerald-700">
                  {formatCurrency(approveConfirmTarget.amount)} ({approveConfirmTarget.passTier === "pro_pass" ? "FLAGSHIP PASS" : "STANDARD PASS"})
                </strong>
              </div>

              {/* Verified Gateway Telemetry */}
              <div className="flex justify-between border-t border-slate-200/80 pt-2">
                <span className="text-slate-400">Gateway Status:</span>
                <span className="font-bold text-slate-800">
                  {approveConfirmTarget.gatewayVerified ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>100% Verified on Easebuzz</span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">⚠️ Manual Admin Verification</span>
                  )}
                </span>
              </div>

              {approveConfirmTarget.gatewayResponse?.gatewayMatch?.easepayid && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Easepay ID:</span>
                  <span className="font-mono text-slate-700">{approveConfirmTarget.gatewayResponse.gatewayMatch.easepayid}</span>
                </div>
              )}

              {/* Competitions Section */}
              {approveConfirmTarget.selectedEvents && approveConfirmTarget.selectedEvents.length > 0 ? (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Pass will be issued with these chosen competitions:
                  </span>
                  <div className="space-y-1">
                    {approveConfirmTarget.selectedEvents.map((ev, i) => (
                      <div key={ev.id || i} className="font-semibold text-slate-800 flex items-center gap-1">
                        <span>• {ev.name}</span>
                        {ev.isProEvent && (
                          <span className="text-[9px] bg-amber-400 text-amber-950 px-1 rounded font-black">
                            FLAGSHIP
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 text-[11px]">
                    <strong>⚠️ Student has not chosen 2 competitions.</strong>
                    <p className="mt-0.5 text-amber-900">
                      Assign competitions now before issuing the pass (or leave blank to assign festival defaults):
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Slot 1:</span>
                      <select
                        value={approveSlot1}
                        onChange={(e) => setApproveSlot1(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- Choose Slot 1 --</option>
                        {availableEvents
                          .filter((ev) => approveConfirmTarget.passTier === "pro_pass" || !ev.isProEvent)
                          .map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.isProEvent ? "★ [FLAGSHIP] " : "[REG] "}
                              {ev.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Slot 2:</span>
                      <select
                        value={approveSlot2}
                        onChange={(e) => setApproveSlot2(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- Choose Slot 2 --</option>
                        {availableEvents
                          .filter((ev) => !ev.isProEvent)
                          .map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              [REG] {ev.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Admin Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Admin Notes <span className="text-slate-400 font-normal">(Optional audit log)</span>
              </label>
              <input
                type="text"
                value={approveAdminNotes}
                onChange={(e) => setApproveAdminNotes(e.target.value)}
                placeholder="e.g. Verified against gateway records and bank statement"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              This action will execute <code className="bg-slate-100 px-1 rounded">fn_checkout_pass_atomic</code>, register chosen competitions, and atomically create the festival pass.
            </p>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setApproveConfirmTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Confirm &amp; Issue Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: ADMIN CONFIRMATION FOR "REJECT REQUEST"
      ═══════════════════════════════════════════════════════════════ */}
      {rejectConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Request Rejection
                </h3>
                <p className="text-xs text-slate-500">
                  Student: {rejectConfirmTarget.fullName} (Ticket #{rejectConfirmTarget.ticketNumber})
                </p>
              </div>
            </div>

            {rejectError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            {/* Verification summary for rejection context */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Submitted UTR:</span>
                <span className="font-mono text-slate-900 font-bold">{rejectConfirmTarget.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway Verdict:</span>
                <span className="font-semibold text-rose-700">
                  {rejectConfirmTarget.gatewayResponse?.verdictMessage || "Not verified on gateway"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Reason for Rejection <span className="text-rose-500">* (Visible to the student)</span>
              </label>

              {/* Quick pre-fill chips */}
              <div className="flex flex-wrap gap-1 pb-1">
                {[
                  "Bank reference (UTR) not found in Easebuzz payment gateway records.",
                  "Payment was failed or cancelled by bank / gateway.",
                  "Amount paid does not match the requested pass tier.",
                  "Payment was refunded back to original source account.",
                ].map((reasonText) => (
                  <button
                    key={reasonText}
                    type="button"
                    onClick={() => setRejectAdminNotes(reasonText)}
                    className="text-[10px] bg-slate-100 hover:bg-rose-50 hover:text-rose-800 border border-slate-200 rounded-lg px-2 py-0.5 transition-colors cursor-pointer text-slate-600"
                  >
                    + {reasonText.slice(0, 35)}...
                  </button>
                ))}
              </div>

              <textarea
                required
                rows={3}
                value={rejectAdminNotes}
                onChange={(e) => setRejectAdminNotes(e.target.value)}
                placeholder="e.g. Bank Reference / UTR not found in Easebuzz gateway records. Please verify your receipt and re-submit."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRejectConfirmTarget(null);
                  setRejectError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 4: ADMIN CONFIRMATION FOR "RE-OPEN DISPUTE"
      ═══════════════════════════════════════════════════════════════ */}
      {reopenConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Re-Open Payment Dispute
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket #{reopenConfirmTarget.ticketNumber} • {reopenConfirmTarget.fullName}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5">
              <p className="font-semibold">
                This will move the dispute status back to <span className="underline">Under Review</span>.
              </p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                You will be able to assign competitions for the student, re-verify with Easebuzz gateway, or approve and issue their festival pass.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Re-Opening Notes <span className="text-slate-400 font-normal">(Optional audit trail)</span>
              </label>
              <input
                type="text"
                value={reopenAdminNotes}
                onChange={(e) => setReopenAdminNotes(e.target.value)}
                placeholder="e.g. Re-opened for event allocation and pass issuance"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReopenConfirmTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                <span>Confirm &amp; Re-Open</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
