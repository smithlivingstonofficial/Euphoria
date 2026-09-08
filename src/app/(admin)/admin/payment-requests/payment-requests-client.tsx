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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  StudentPaymentIssue,
  autoVerifyPaymentIssueAdmin,
  approveAndIssuePassAdmin,
  rejectPaymentIssueAdmin,
  getPaymentIssuesAdmin,
} from "@/actions/payment-issues";

export function PaymentRequestsClient({
  initialIssues = [],
  initialMetrics,
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
}) {
  const [issues, setIssues] = useState<StudentPaymentIssue[]>(initialIssues);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Loading state per item for auto-verify
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // CONFIRMATION POPUP STATES (MANDATORY POPUP FOR EVERY ACTION)
  // ═══════════════════════════════════════════════════════════════
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<StudentPaymentIssue | null>(null);
  const [approveAdminNotes, setApproveAdminNotes] = useState("");

  const [rejectConfirmTarget, setRejectConfirmTarget] = useState<StudentPaymentIssue | null>(null);
  const [rejectAdminNotes, setRejectAdminNotes] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

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

  // 1. AUTO-VERIFY ACTION
  const handleAutoVerify = async (issue: StudentPaymentIssue) => {
    setVerifyingId(issue.id);
    setActionNotice(null);

    try {
      const result = await autoVerifyPaymentIssueAdmin(issue.id);
      if (result.success) {
        setActionNotice({
          type: result.verified ? "success" : "info",
          message: result.verified
            ? `Gateway Verified! Easebuzz confirms transaction (${result.gatewayStatus}) for ${issue.fullName}.`
            : `Gateway Check Result: ${result.gatewayStatus} on Easebuzz for ${issue.transactionId}.`,
        });
        // Update item in place
        setIssues((prev) =>
          prev.map((i) =>
            i.id === issue.id
              ? {
                  ...i,
                  gatewayVerified: result.verified,
                  gatewayResponse: result.gatewayData || { status: result.gatewayStatus },
                  status: result.verified ? "under_review" : i.status,
                }
              : i
          )
        );
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

  // 2. APPROVE & ISSUE PASS ACTION (Triggered after confirmation modal)
  const handleConfirmApprove = async () => {
    if (!approveConfirmTarget) return;

    startTransition(async () => {
      const target = approveConfirmTarget;
      setApproveConfirmTarget(null);

      const result = await approveAndIssuePassAdmin(target.id, approveAdminNotes.trim() || undefined);
      if (result.success && result.passCode) {
        setActionNotice({
          type: "success",
          message: `Success! Pass ${result.passCode} issued to ${target.fullName}. Request marked as Resolved.`,
        });
        setApproveAdminNotes("");
        // Update local list
        setIssues((prev) =>
          prev.map((i) =>
            i.id === target.id
              ? {
                  ...i,
                  status: "resolved",
                  issuedPassCode: result.passCode,
                  adminNotes: approveAdminNotes.trim() || `Approved by admin.`,
                }
              : i
          )
        );
        // Refresh metrics
        setMetrics((m) => ({
          ...m,
          pending: Math.max(0, m.pending - 1),
          resolved: m.resolved + 1,
        }));
      } else {
        setActionNotice({
          type: "error",
          message: result.error || "Failed to approve payment request.",
        });
      }
    });
  };

  // 3. REJECT REQUEST ACTION (Triggered after confirmation modal)
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
          message: `Request for ${target.fullName} marked as Rejected. Reason recorded.`,
        });
        setRejectAdminNotes("");
        // Update local list
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
      } else {
        setActionNotice({
          type: "error",
          message: result.error || "Failed to reject payment request.",
        });
      }
    });
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
            Review submitted student receipts, live-verify with Easebuzz gateway, and atomically issue festival passes with chosen competitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                            {isPro ? "PRO PASS" : "STD PASS"}
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
                                    PRO
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
                          <span className="text-slate-400 italic text-[10px]">
                            No events chosen (Admin fallback will apply)
                          </span>
                        )}
                      </td>

                      {/* Gateway Verification */}
                      <td className="py-3.5 px-4">
                        {issue.gatewayVerified ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Verified on Gateway</span>
                            </span>
                            {issue.gatewayResponse?.easepayid && (
                              <div className="text-[9px] font-mono text-slate-400">
                                EasepayID: {issue.gatewayResponse.easepayid}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-medium">
                              <span>Unverified</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAutoVerify(issue)}
                              disabled={verifyingId === issue.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-primary border border-indigo-200 text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              {verifyingId === issue.id ? (
                                <>
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  <span>Checking...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="h-2.5 w-2.5 text-amber-500" />
                                  <span>⚡ Auto-Verify</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
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
                              <div className="text-[10px] text-rose-700 italic mt-0.5 max-w-xs">
                                Note: {issue.adminNotes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold">
                            <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* Actions with Confirmation Modals */}
                      <td className="py-3.5 px-4 text-right">
                        {isPendingReview && (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Approve & Issue Pass Button (Opens Confirmation Modal) */}
                            <button
                              type="button"
                              onClick={() => {
                                setApproveConfirmTarget(issue);
                                setApproveAdminNotes("");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                              title="Approve and atomically issue pass"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Approve</span>
                            </button>

                            {/* Reject Button (Opens Confirmation Modal) */}
                            <button
                              type="button"
                              onClick={() => {
                                setRejectConfirmTarget(issue);
                                setRejectAdminNotes("");
                                setRejectError(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Reject request with remarks"
                            >
                              <X className="h-3 w-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
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
          POPUP 1: ADMIN CONFIRMATION FOR "APPROVE & ISSUE PASS"
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
                  Ticket #{approveConfirmTarget.ticketNumber}
                </p>
              </div>
            </div>

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
                <span className="text-slate-400">Amount &amp; Tier:</span>
                <strong className="text-emerald-700">
                  {formatCurrency(approveConfirmTarget.amount)} ({approveConfirmTarget.passTier === "pro_pass" ? "PRO PASS" : "STANDARD PASS"})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway Status:</span>
                <span className="font-bold text-slate-800">
                  {approveConfirmTarget.gatewayVerified ? "✅ Verified on Easebuzz" : "⚠️ Manual Admin Confirmation"}
                </span>
              </div>

              {approveConfirmTarget.selectedEvents && approveConfirmTarget.selectedEvents.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Pass will be issued with these competitions:
                  </span>
                  <div className="space-y-1">
                    {approveConfirmTarget.selectedEvents.map((ev, i) => (
                      <div key={ev.id || i} className="font-semibold text-slate-800 flex items-center gap-1">
                        <span>• {ev.name}</span>
                        {ev.isProEvent && <span className="text-[9px] bg-amber-400 text-amber-950 px-1 rounded font-black">PRO</span>}
                      </div>
                    ))}
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
                placeholder="e.g. Verified in HDFC bank statement at 3:10 PM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              This action will execute <code className="bg-slate-100 px-1 rounded">fn_checkout_pass_atomic</code>, create the active QR Gate Pass, and resolve the ticket.
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
          POPUP 2: ADMIN CONFIRMATION FOR "REJECT REQUEST"
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

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Reason for Rejection <span className="text-rose-500">* (Visible to the student in popup)</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectAdminNotes}
                onChange={(e) => setRejectAdminNotes(e.target.value)}
                placeholder="e.g. Bank Reference / UTR not found in bank statement. Please verify your transaction receipt and re-submit."
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
    </div>
  );
}
