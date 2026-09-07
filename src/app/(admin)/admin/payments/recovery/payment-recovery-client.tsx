"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  User,
  CreditCard,
  Building2,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Zap,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  checkEasebuzzLiveStatusAction,
  resolvePaymentAndIssuePassAction,
  batchReconcileAttemptedOrdersAction,
  searchParticipantForPaymentReconcile,
} from "@/actions/admin";

interface PaymentIssue {
  id: string;
  orderNumber: string;
  txnid: string;
  easebuzzPayId?: string | null;
  amount: number;
  status: string;
  issueType: "paid_without_pass" | "attempted_checkout" | "failed_payment" | "abandoned_duplicate_attempt";
  severity: "critical" | "warning" | "info";
  createdAt: string;
  eventNames: string;
  metadata?: Record<string, any>;
  user: {
    id: string;
    fullName: string;
    email: string;
    mobileNumber: string;
    registerNumber: string;
    collegeName: string;
    department: string;
  };
  pass?: {
    passCode: string;
    passTier: string;
  } | null;
  userOtherPass?: {
    passCode: string;
    passTier: string;
    otherOrderNumber?: string | null;
  } | null;
}

interface PaymentRecoveryClientProps {
  initialIssues: PaymentIssue[];
  initialStats: {
    totalIssues?: number;
    paidMissingPassCount?: number;
    attemptedPendingCount?: number;
    failedCount?: number;
    duplicateAttemptCount?: number;
    totalPassesIssued?: number;
  };
}

export default function PaymentRecoveryClient({
  initialIssues = [],
  initialStats = {},
}: PaymentRecoveryClientProps) {
  const [activeTab, setActiveTab] = useState<"issues" | "verifier" | "search">("issues");
  const [issues, setIssues] = useState<PaymentIssue[]>(initialIssues);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  // Live Verifier State
  const [verifyTxnid, setVerifyTxnid] = useState("EUPH26-REG-MTQQMX6E-691C");
  const [liveGatewayData, setLiveGatewayData] = useState<any | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Resolution Action State
  const [resolutionSuccess, setResolutionSuccess] = useState<string | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Batch Reconcile State
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Participant Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualTxnid, setManualTxnid] = useState("");
  const [manualEasepayid, setManualEasepayid] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Copied state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. Live Query Easebuzz Gateway API v2
  const handleLiveQuery = async (customTxnId?: string) => {
    const idToQuery = (customTxnId || verifyTxnid).trim();
    if (!idToQuery) return;

    setIsVerifying(true);
    setLiveError(null);
    setLiveGatewayData(null);
    setResolutionSuccess(null);
    setResolutionError(null);

    try {
      const res = await checkEasebuzzLiveStatusAction(idToQuery);
      if (res.success && res.data) {
        setLiveGatewayData(res.data);
      } else {
        setLiveError(res.error || "No transaction found on Easebuzz gateway.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error querying Easebuzz";
      setLiveError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. One-Click Resolve & Issue Pass
  const handleResolveAndIssue = async (params: {
    userId: string;
    txnid: string;
    easepayid?: string;
    amount?: number;
    eventIds?: string[];
    forceBypass?: boolean;
  }) => {
    setIsResolving(true);
    setResolutionSuccess(null);
    setResolutionError(null);

    try {
      const res = await resolvePaymentAndIssuePassAction({
        userId: params.userId,
        txnid: params.txnid,
        easepayid: params.easepayid,
        amount: params.amount,
        eventIds: params.eventIds,
        forceBypassGatewayCheck: Boolean(params.forceBypass),
      });

      if (res.success) {
        setResolutionSuccess(res.message || "Pass issued successfully!");
        // Remove from issues list
        setIssues((prev) => prev.filter((i) => i.txnid !== params.txnid));
        setStats((prev) => ({
          ...prev,
          totalIssues: Math.max(0, (prev.totalIssues || 1) - 1),
          paidMissingPassCount: Math.max(0, (prev.paidMissingPassCount || 1) - 1),
        }));
      } else {
        setResolutionError(res.error || "Failed to resolve payment.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Resolution failed";
      setResolutionError(msg);
    } finally {
      setIsResolving(false);
    }
  };

  // 3. Batch Reconcile All Attempted Orders
  const handleBatchReconcile = async () => {
    setIsBatchRunning(true);
    setBatchResult(null);
    setResolutionError(null);

    try {
      const res = await batchReconcileAttemptedOrdersAction();
      if (res.success) {
        setBatchResult(res.message || `Scanned ${res.scannedCount} orders. Resolved ${res.resolvedCount}.`);
        if (res.resolvedCount && res.resolvedCount > 0) {
          // Refresh issues list
          const resolvedIds = new Set((res.resolvedOrders || []).map((o: any) => o.txnid));
          setIssues((prev) => prev.filter((i) => !resolvedIds.has(i.txnid)));
        }
      } else {
        setResolutionError(res.error || "Batch reconciliation encountered an error.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Batch error";
      setResolutionError(msg);
    } finally {
      setIsBatchRunning(false);
    }
  };

  // 4. Participant Manual Search
  const handleParticipantSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await searchParticipantForPaymentReconcile(searchQuery.trim());
      if (res.success) {
        setSearchResults(res.participants || []);
        if (res.availableEvents) {
          setAvailableEvents(res.availableEvents);
        }
      }
    } catch (err: unknown) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-display">
              Payment Issues &amp; Recovery Hub
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-sans">
            Real-time Easebuzz gateway telemetry inspector, orphaned transaction recovery, and fail-safe pass generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <span>All Payments</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>

          <button
            onClick={handleBatchReconcile}
            disabled={isBatchRunning}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isBatchRunning ? "animate-spin" : ""}`} />
            <span>{isBatchRunning ? "Scanning Easebuzz..." : "Auto-Reconcile All (Last 7 Days)"}</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>Critical Missing Passes</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-900">
            {stats.paidMissingPassCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Paid on gateway, pass unissued</div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Attempted / Pending</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900">
            {stats.attemptedPendingCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Checkout started, awaiting UPI/return</div>
        </div>

        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Total Active Passes</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-900">
            {stats.totalPassesIssued || 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">Successfully confirmed passes</div>
        </div>

        <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
            <span>Easebuzz API v2</span>
            <Zap className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-lg font-black font-mono text-indigo-900">
            Direct SHA-512
          </div>
          <div className="mt-1 text-[11px] text-indigo-700">Live Gateway Retrieve Active</div>
        </div>
      </div>

      {/* Global Alerts / Toasts */}
      {batchResult && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{batchResult}</span>
          </div>
          <button onClick={() => setBatchResult(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">✕</button>
        </div>
      )}

      {resolutionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{resolutionSuccess}</span>
          </div>
          <button onClick={() => setResolutionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">✕</button>
        </div>
      )}

      {resolutionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{resolutionError}</span>
          </div>
          <button onClick={() => setResolutionError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-px">
        <button
          onClick={() => setActiveTab("issues")}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === "issues"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Unresolved Issues Queue</span>
          {issues.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-black">
              {issues.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("verifier")}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === "verifier"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            <span>Live Easebuzz Gateway Inspector</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === "search"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>Manual Participant Search &amp; Link</span>
          </span>
        </button>
      </div>

      {/* TAB 1: UNRESOLVED ISSUES QUEUE */}
      {activeTab === "issues" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Transactions Requiring Attention
                </h2>
                <p className="text-[11px] text-slate-500">
                  Orders flagged as attempted or paid without an active festival pass issued.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-sans">
                  Showing <strong>{issues.length}</strong> flagged records
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/90 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Participant</th>
                    <th className="py-3 px-4 font-bold">Txn ID / Order #</th>
                    <th className="py-3 px-4 font-bold">Selected Events</th>
                    <th className="py-3 px-4 font-bold">Amount</th>
                    <th className="py-3 px-4 font-bold">DB Status</th>
                    <th className="py-3 px-4 font-bold">Initiated</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {issues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="font-bold text-slate-700">All clean! No payment discrepancies detected.</p>
                        <p className="text-[11px] text-slate-400">All completed payments have active festival passes.</p>
                      </td>
                    </tr>
                  ) : (
                    issues.map((iss) => {
                      const isPaidMissing = iss.issueType === "paid_without_pass";
                      const isAttempted = iss.issueType === "attempted_checkout";

                      return (
                        <tr key={iss.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Participant */}
                          <td className="py-3.5 px-4 font-sans">
                            <div className="font-bold text-slate-900">{iss.user.fullName}</div>
                            <div className="text-[11px] text-slate-500">{iss.user.email}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Reg: {iss.user.registerNumber} | Tel: {iss.user.mobileNumber}
                            </div>
                          </td>

                          {/* Txn ID */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-800">{iss.txnid}</span>
                              <button
                                onClick={() => copyToClipboard(iss.txnid)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                title="Copy Txn ID"
                              >
                                {copiedText === iss.txnid ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            {iss.easebuzzPayId && (
                              <div className="text-[10px] text-emerald-700 font-semibold">
                                Easepay: {iss.easebuzzPayId}
                              </div>
                            )}
                          </td>

                          {/* Selected Events */}
                          <td className="py-3.5 px-4 font-sans max-w-[200px] truncate" title={iss.eventNames}>
                            <span className="text-slate-800 font-medium">{iss.eventNames || "None specified"}</span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {formatCurrency(iss.amount)}
                          </td>

                          {/* DB Status Badge */}
                          <td className="py-3.5 px-4 font-sans">
                            {isPaidMissing ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-black">
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                <span>PAID (NO PASS)</span>
                              </span>
                            ) : iss.issueType === "abandoned_duplicate_attempt" ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
                                  <span>{iss.status.toUpperCase()}</span>
                                </span>
                                {iss.userOtherPass && (
                                  <div className="text-[9px] font-bold text-emerald-700">
                                    ✓ Active: {iss.userOtherPass.passCode}
                                  </div>
                                )}
                              </div>
                            ) : isAttempted ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>ATTEMPTED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
                                <span>{iss.status.toUpperCase()}</span>
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-500 font-sans text-[11px]">
                            {formatDate(iss.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setVerifyTxnid(iss.txnid);
                                  setActiveTab("verifier");
                                  handleLiveQuery(iss.txnid);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                              >
                                Check Gateway
                              </button>

                              <button
                                onClick={() =>
                                  handleResolveAndIssue({
                                    userId: iss.user.id,
                                    txnid: iss.txnid,
                                    amount: iss.amount,
                                    easepayid: iss.easebuzzPayId || undefined,
                                  })
                                }
                                disabled={isResolving}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                Resolve &amp; Issue Pass
                              </button>
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
        </div>
      )}

      {/* TAB 2: LIVE EASEBUZZ GATEWAY INSPECTOR */}
      {activeTab === "verifier" && (
        <div className="space-y-6">
          {/* Query Bar */}
          <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Live Gateway Transaction Inspector
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Direct SHA-512 authenticated check with Easebuzz Production API v2 (retrieves verified banking receipt, payment source, customer name, and status).
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={verifyTxnid}
                  onChange={(e) => setVerifyTxnid(e.target.value)}
                  placeholder="Enter Transaction ID (e.g. EUPH26-REG-MTQQMX6E-691C)..."
                  className="w-full pl-3.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <button
                onClick={() => handleLiveQuery()}
                disabled={isVerifying || !verifyTxnid.trim()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs shrink-0"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Querying Gateway...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    <span>Fetch Official Status</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick pre-fill for the affected transaction */}
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span>Quick Test:</span>
              <button
                onClick={() => {
                  setVerifyTxnid("EUPH26-REG-MTQQMX6E-691C");
                  handleLiveQuery("EUPH26-REG-MTQQMX6E-691C");
                }}
                className="font-mono text-primary font-bold hover:underline cursor-pointer"
              >
                EUPH26-REG-MTQQMX6E-691C (Nandyala Jashwanth Reddy)
              </button>
            </div>
          </div>

          {/* Query Error */}
          {liveError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs shadow-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Easebuzz Gateway Query Notice</span>
              </div>
              <p>{liveError}</p>
            </div>
          )}

          {/* Live Data Card */}
          {liveGatewayData && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Header with verified status */}
              <div className={`p-4 border-b flex items-center justify-between ${
                liveGatewayData.status === "success"
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-rose-50/70 border-rose-200"
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                    liveGatewayData.status === "success"
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}>
                    {liveGatewayData.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 font-display">
                        Official Easebuzz Gateway Result: {liveGatewayData.rawStatus?.toUpperCase() || "SUCCESS"}
                      </h3>
                      <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        HMAC Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Easebuzz ID: {liveGatewayData.easepayid} | Txn ID: {liveGatewayData.txnid}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black font-mono text-slate-900">
                    {formatCurrency(liveGatewayData.amount)}
                  </div>
                  <div className="text-[10px] text-slate-500">Collected via {liveGatewayData.mode}</div>
                </div>
              </div>

              {/* Active Pass Cross-Reference Context */}
              {liveGatewayData.existingUserPass && (
                <div className="mx-5 mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/80 border border-emerald-200 text-emerald-950 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Participant Already Holds an Active Festival Pass!</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-800 font-sans leading-relaxed">
                    Participant <strong>{liveGatewayData.existingUserPass.userName}</strong> holds active Pass{" "}
                    <strong className="font-mono bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300">
                      {liveGatewayData.existingUserPass.passCode}
                    </strong>
                    {liveGatewayData.existingUserPass.orderNumber ? (
                      <> confirmed via Order <strong className="font-mono">{liveGatewayData.existingUserPass.orderNumber}</strong>.</>
                    ) : (
                      <> confirmed in the database.</>
                    )}
                    {liveGatewayData.status !== "success" ? (
                      <span className="block mt-1 text-slate-600 font-medium">
                        ℹ️ This transaction attempt (<code>{liveGatewayData.txnid}</code>) was cancelled or abandoned. The participant is already confirmed, so no administrative recovery or manual pass issuance is required.
                      </span>
                    ) : null}
                  </p>
                </div>
              )}

              {/* Data Grid */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-slate-400 font-semibold text-[10px] uppercase">Customer Details</div>
                  <div className="mt-1 font-bold text-slate-900">{liveGatewayData.customerName}</div>
                  <div className="text-slate-600 text-[11px]">{liveGatewayData.customerEmail}</div>
                  <div className="text-slate-500 font-mono text-[11px]">Tel: {liveGatewayData.customerPhone}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-slate-400 font-semibold text-[10px] uppercase">Payment Instrument</div>
                  <div className="mt-1 font-bold text-slate-900">{liveGatewayData.mode} {liveGatewayData.upiVa ? `(${liveGatewayData.upiVa})` : ""}</div>
                  <div className="text-slate-600 font-mono text-[11px]">Bank Ref: {liveGatewayData.bankRefNum}</div>
                  <div className="text-slate-500 text-[11px]">Timestamp: {liveGatewayData.addedOn}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-slate-400 font-semibold text-[10px] uppercase">Auditor UDFs</div>
                  <div className="mt-1 text-slate-800 text-[11px]">Regn / ID: <strong className="font-mono">{liveGatewayData.udf6_regnNo || "N/A"}</strong></div>
                  <div className="text-slate-800 text-[11px]">Events: <strong>{liveGatewayData.udf3_events || "N/A"}</strong></div>
                  <div className="text-slate-800 text-[11px]">Product: <strong>{liveGatewayData.productInfo}</strong></div>
                </div>
              </div>

              {/* Action Bar */}
              {liveGatewayData.status === "success" && (
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 font-sans">
                    Payment is confirmed. Click to execute atomic pass issuance and event slot allocation.
                  </div>

                  <button
                    onClick={() =>
                      handleResolveAndIssue({
                        userId: liveGatewayData.udf1_userId,
                        txnid: liveGatewayData.txnid,
                        easepayid: liveGatewayData.easepayid,
                        amount: liveGatewayData.amount,
                      })
                    }
                    disabled={isResolving}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {isResolving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Issuing Pass in Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Issue Festival Pass &amp; Allocate Slots</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MANUAL PARTICIPANT SEARCH & LINK */}
      {activeTab === "search" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Search Participant &amp; Link Payment
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Search for any participant by register number, phone number, email, or name to inspect their pass state and link an Easebuzz payment receipt manually.
            </p>

            <form onSubmit={handleParticipantSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student email (e.g. 9924005115@klu.ac.in) or phone (9032451765)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((res) => {
                const hasActivePass = Boolean(res.pass && res.pass.status === "active");

                return (
                  <div
                    key={res.profile.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {res.profile.full_name}
                          </h3>
                          {hasActivePass ? (
                            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold">
                              Pass Active ({res.pass.pass_code})
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold">
                              No Pass Issued
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-sans mt-0.5">
                          {res.profile.email} | Tel: {res.profile.mobile_number} | Reg: {res.profile.register_number}
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <span>{res.profile.college_name || "KARE"}</span>
                        <div className="text-[11px] text-slate-400">{res.profile.department}</div>
                      </div>
                    </div>

                    {/* Show existing order attempts if any */}
                    {res.orders && res.orders.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 mb-2">Order History</h4>
                        <div className="space-y-1.5">
                          {res.orders.map((o: any) => (
                            <div
                              key={o.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-mono"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{o.order_number}</span>
                                <span className="text-slate-400 ml-2">({formatDate(o.created_at)})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{formatCurrency(o.amount)}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  o.status === "paid"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : o.status === "attempted"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-200 text-slate-700"
                                }`}>
                                  {o.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action to issue pass if no pass */}
                    {!hasActivePass && (
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="text-xs text-slate-600">
                          Provide transaction ID and click resolve to generate this participant&apos;s pass.
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Easebuzz Txn ID (e.g. EUPH26-REG-...)"
                            value={manualTxnid}
                            onChange={(e) => setManualTxnid(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono w-60"
                          />
                          <button
                            onClick={() =>
                              handleResolveAndIssue({
                                userId: res.profile.id,
                                txnid: manualTxnid || `EUPH26-MANUAL-${Date.now()}`,
                                easepayid: manualEasepayid || undefined,
                                forceBypass: true,
                              })
                            }
                            disabled={isResolving}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            Force Issue Pass
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
