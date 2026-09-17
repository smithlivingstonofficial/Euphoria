"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Filter,
  QrCode,
  ArrowRight,
  X,
  Building,
  ChevronDown,
  Star,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  FileText,
  UserCheck,
  Coins,
  DollarSign,
} from "lucide-react";
import {
  CashRegistrationRequest,
  approveCashRequestAdmin,
  rejectCashRequestAdmin,
} from "@/actions/cash-registration";
import { formatDate, formatTime } from "@/lib/utils";

interface CashRequestsClientProps {
  initialRequests: CashRegistrationRequest[];
  initialMetrics: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalCashCollected: number;
  };
  availableEvents: Array<{
    id: string;
    name: string;
    isProEvent: boolean;
    schoolOrDept?: string;
  }>;
}

export function CashRequestsClient({
  initialRequests,
  initialMetrics,
  availableEvents,
}: CashRequestsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [requests, setRequests] = useState<CashRegistrationRequest[]>(initialRequests);
  const [metrics, setMetrics] = useState(initialMetrics);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "standard_pass" | "pro_pass">("all");
  const [participantTypeFilter, setParticipantTypeFilter] = useState<"all" | "internal" | "external">("all");

  // Approval Modal State
  const [selectedForApproval, setSelectedForApproval] = useState<CashRegistrationRequest | null>(null);
  const [cashConfirmedCheckbox, setCashConfirmedCheckbox] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Rejection Modal State
  const [selectedForRejection, setSelectedForRejection] = useState<CashRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("Did not report to cash desk");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Feedback State
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return requests.filter((r) => {
      // 1. Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // 2. Tier filter
      if (tierFilter !== "all" && r.passTier !== tierFilter) return false;

      // 3. Participant Type filter
      if (participantTypeFilter !== "all" && r.participantType !== participantTypeFilter) return false;

      // 4. Text search
      if (q) {
        const textTarget = `${r.requestCode} ${r.fullName} ${r.email} ${r.phone} ${
          r.registerNumber || ""
        } ${r.department || ""} ${r.collegeName || ""} ${
          r.selectedEvents ? r.selectedEvents.map((e) => e.name).join(" ") : ""
        }`.toLowerCase();
        if (!textTarget.includes(q)) return false;
      }

      return true;
    });
  }, [requests, statusFilter, tierFilter, participantTypeFilter, searchQuery]);

  // Execute Approval
  const handleConfirmApproval = async () => {
    if (!selectedForApproval) return;
    if (!cashConfirmedCheckbox) {
      setFeedbackMessage({
        type: "error",
        text: "Please confirm that you have received physical cash in hand before issuing the pass.",
      });
      return;
    }

    setIsApproving(true);
    setFeedbackMessage(null);

    try {
      const res = await approveCashRequestAdmin(selectedForApproval.id, approvalNotes);

      if (!res.success) {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to approve cash request.",
        });
        setIsApproving(false);
        return;
      }

      // Success! Update local state
      const passCode = res.passCode || "CONFIRMED";
      setRequests((prev) =>
        prev.map((item) =>
          item.id === selectedForApproval.id
            ? {
                ...item,
                status: "approved",
                issuedPassCode: passCode,
                adminNotes: approvalNotes || item.adminNotes,
                approvedAt: new Date().toISOString(),
              }
            : item
        )
      );

      setMetrics((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1,
        totalCashCollected: prev.totalCashCollected + Number(selectedForApproval.totalAmount || 200),
      }));

      setFeedbackMessage({
        type: "success",
        text: `Approved! Cash of ₹${selectedForApproval.totalAmount} verified and Festival Pass ${passCode} issued for ${selectedForApproval.fullName}.`,
      });

      setSelectedForApproval(null);
      setCashConfirmedCheckbox(false);
      setApprovalNotes("");

      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error approving request";
      setFeedbackMessage({ type: "error", text: msg });
    } finally {
      setIsApproving(false);
    }
  };

  // Execute Rejection
  const handleConfirmRejection = async () => {
    if (!selectedForRejection) return;

    setIsRejecting(true);
    setFeedbackMessage(null);

    try {
      const res = await rejectCashRequestAdmin(
        selectedForRejection.id,
        rejectionReason,
        rejectionNotes
      );

      if (!res.success) {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to reject request.",
        });
        setIsRejecting(false);
        return;
      }

      // Success! Update local state
      setRequests((prev) =>
        prev.map((item) =>
          item.id === selectedForRejection.id
            ? {
                ...item,
                status: "rejected",
                rejectionReason,
                adminNotes: rejectionNotes || item.adminNotes,
              }
            : item
        )
      );

      setMetrics((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1,
      }));

      setFeedbackMessage({
        type: "success",
        text: `Request ${selectedForRejection.requestCode} has been rejected.`,
      });

      setSelectedForRejection(null);
      setRejectionReason("Did not report to cash desk");
      setRejectionNotes("");

      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error rejecting request";
      setFeedbackMessage({ type: "error", text: msg });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & METRICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Admin
            </Link>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Finance & Registrations
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
              <Banknote className="h-5 w-5" />
            </span>
            Cash On Hand Approvals & Pass Issuance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Verify physical cash collected from participants and immediately activate festival passes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              router.refresh();
            });
          }}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Requests */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All-time requests</div>
        </div>

        {/* Pending Verification */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950">{metrics.pending}</div>
          <div className="text-[11px] text-amber-800/80 mt-0.5 font-medium">Awaiting Cash Payment</div>
        </div>

        {/* Approved & Passes Issued */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-950">{metrics.approved}</div>
          <div className="text-[11px] text-emerald-800/80 mt-0.5 font-medium">Passes Issued</div>
        </div>

        {/* Rejected / Cancelled */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
            <XCircle className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-700">{metrics.rejected}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Declined requests</div>
        </div>

        {/* Cash Collected in Hand */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-emerald-100">
            <span className="text-xs font-bold uppercase tracking-wider">Cash Collected</span>
            <Coins className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            ₹{metrics.totalCashCollected.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-emerald-100/90 mt-0.5 font-medium">From approved passes</div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMessage && (
        <div
          className={`rounded-2xl p-4 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          {[
            { id: "all", label: "All Requests", count: metrics.total },
            { id: "pending", label: "Pending Verification", count: metrics.pending },
            { id: "approved", label: "Approved", count: metrics.approved },
            { id: "rejected", label: "Rejected", count: metrics.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200/70 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, code (CASH-26-...), email, phone, reg no, department..."
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Dropdowns */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Pass Tier Dropdown */}
            <div className="relative w-full sm:w-[155px] shrink-0">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as any)}
                className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all cursor-pointer"
              >
                <option value="all">All Pass Tiers</option>
                <option value="standard_pass">Standard (₹200)</option>
                <option value="pro_pass">Flagship (₹300)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Participant Type Dropdown */}
            <div className="relative w-full sm:w-[155px] shrink-0">
              <select
                value={participantTypeFilter}
                onChange={(e) => setParticipantTypeFilter(e.target.value as any)}
                className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all cursor-pointer"
              >
                <option value="all">All Delegates</option>
                <option value="internal">Internal (KLU)</option>
                <option value="external">External</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. REQUESTS LIST / TABLE */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Banknote className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Cash Requests Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing filters or search query to see other requests."
                : "No student cash registration requests have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Request Code</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Selected Competitions</th>
                  <th className="py-3 px-4">Pass Tier & Cash</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => {
                  const isPendingStatus = req.status === "pending";
                  const isApprovedStatus = req.status === "approved";
                  const isRejectedStatus = req.status === "rejected";

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* 1. Request Code & Timestamp */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 font-mono font-black text-slate-900 text-xs">
                          <span>{req.requestCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(req.requestCode)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Copy code"
                          >
                            {copiedCode === req.requestCode ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(req.createdAt)}
                        </div>
                      </td>

                      {/* 2. Participant Info */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{req.fullName}</span>
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                              req.participantType === "internal"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {req.participantType === "internal" ? "KARE" : "External"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {req.email} • {req.phone}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                          {req.participantType === "internal"
                            ? `${req.registerNumber || "No Reg"} • ${req.department || "General"}`
                            : req.collegeName || "External College"}
                        </div>
                      </td>

                      {/* 3. Selected Competitions */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5 max-w-[280px]">
                          {req.selectedEvents && req.selectedEvents.length > 0 ? (
                            req.selectedEvents.map((evt, idx) => (
                              <div
                                key={evt.id}
                                className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 text-[11px]"
                              >
                                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                  <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-indigo-100 text-indigo-800">
                                    Slot {idx + 1}
                                  </span>
                                  <span className="truncate">{evt.name}</span>
                                  {evt.isProEvent && (
                                    <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                                      Flagship
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  {evt.schoolOrDept || "General"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              {req.selectedEventIds.length} competitions requested
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Pass Tier & Cash Amount */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-black text-sm text-emerald-700">
                          ₹{req.totalAmount}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            req.passTier === "pro_pass"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {req.passTier === "pro_pass" ? "Flagship Pass" : "Standard Pass"}
                        </span>
                      </td>

                      {/* 5. Status Badge */}
                      <td className="py-3.5 px-4 align-top">
                        {isPendingStatus && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            Pending Cash
                          </span>
                        )}
                        {isApprovedStatus && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Approved
                            </span>
                            {req.issuedPassCode && (
                              <div className="font-mono text-[11px] font-bold text-slate-700">
                                Pass: {req.issuedPassCode}
                              </div>
                            )}
                          </div>
                        )}
                        {isRejectedStatus && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                              <XCircle className="h-3 w-3" />
                              Rejected
                            </span>
                            {req.rejectionReason && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {req.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                        {req.status === "cancelled" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            Cancelled by User
                          </span>
                        )}
                      </td>

                      {/* 6. Action Buttons */}
                      <td className="py-3.5 px-4 align-top text-right">
                        {isPendingStatus && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForApproval(req);
                                setCashConfirmedCheckbox(false);
                                setApprovalNotes("");
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition-colors cursor-pointer"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              <span>Verify & Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForRejection(req);
                                setRejectionReason("Did not report to cash desk");
                                setRejectionNotes("");
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 text-rose-700 px-2.5 py-1.5 text-xs font-bold hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Reject request"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {isApprovedStatus && req.issuedPassCode && (
                          <Link
                            href="/admin/registrations"
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <QrCode className="h-3 w-3" />
                            <span>View in Pass Scanner</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. VERIFY & APPROVE MODAL */}
      {selectedForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Verify Cash & Issue Festival Pass
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedForApproval.requestCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForApproval(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Student & Cash Summary Card */}
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950">
                    {selectedForApproval.fullName}
                  </span>
                  <div className="text-[11px] text-emerald-800">
                    {selectedForApproval.email} • {selectedForApproval.phone}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {selectedForApproval.collegeName || "College Participant"}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Cash to Collect
                  </span>
                  <span className="text-2xl font-black text-emerald-950">
                    ₹{selectedForApproval.totalAmount}
                  </span>
                </div>
              </div>

              {/* Selected Events List */}
              <div className="border-t border-emerald-200/80 pt-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Events to be Confirmed:
                </span>
                {selectedForApproval.selectedEvents?.map((evt, idx) => (
                  <div
                    key={evt.id}
                    className="text-xs font-semibold text-emerald-950 flex items-center justify-between"
                  >
                    <span>
                      Slot {idx + 1}: {evt.name}
                    </span>
                    {evt.isProEvent && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                        Flagship
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Notes Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Admin / Counter Notes (Optional)
              </label>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="e.g. Verified by Counter 1, Cash received by Staff"
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Physical Cash Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={cashConfirmedCheckbox}
                onChange={(e) => setCashConfirmedCheckbox(e.target.checked)}
                className="mt-0.5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div className="text-xs">
                <strong className="text-emerald-950 block">
                  I confirm that physical cash of ₹{selectedForApproval.totalAmount} has been received in hand.
                </strong>
                <span className="text-emerald-800 text-[11px]">
                  This will generate an official order with provider &quot;cash&quot;, activate the festival pass, and lock the participant&apos;s event seats.
                </span>
              </div>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForApproval(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={!cashConfirmedCheckbox || isApproving}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all cursor-pointer ${
                  !cashConfirmedCheckbox || isApproving
                    ? "bg-slate-300 cursor-not-allowed text-slate-500"
                    : "bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-700/20"
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>{isApproving ? "Issuing Pass..." : "Verify & Issue Pass"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. REJECT MODAL */}
      {selectedForRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <XCircle className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900">
                  Reject Cash Registration Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForRejection(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Rejecting request <strong className="font-mono text-slate-800">{selectedForRejection.requestCode}</strong> for participant <strong>{selectedForRejection.fullName}</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Reason for Rejection
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="Did not report to cash desk">Did not report to cash desk</option>
                <option value="Duplicate request">Duplicate request</option>
                <option value="Event seats full">Selected event seats filled</option>
                <option value="Student requested cancellation">Student requested cancellation</option>
                <option value="Incorrect amount provided">Incorrect amount provided</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Internal Admin Notes (Optional)
              </label>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Add any additional details..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForRejection(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isRejecting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
