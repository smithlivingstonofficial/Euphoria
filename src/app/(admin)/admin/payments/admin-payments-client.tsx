"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPaginatedOrdersAdmin, AdminPaymentMetrics } from "@/actions/admin";

export interface EnrichedOrder {
  id: string;
  orderNumber: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  provider: string;
  createdAt: string;
  metadata?: Record<string, any>;
  user: {
    id: string;
    fullName: string;
    email: string;
    mobileNumber?: string;
    participantType: "internal" | "external";
  };
  pass?: {
    passCode: string;
    passTier: string;
    status: string;
  } | null;
  userOtherPass?: {
    passCode: string;
    passTier: string;
    status: string;
    otherOrderNumber?: string | null;
  } | null;
}

export function AdminPaymentsClient({
  initialOrders = [],
  initialTotalFilteredCount,
  initialMetrics,
}: {
  initialOrders: EnrichedOrder[];
  initialTotalFilteredCount?: number;
  initialMetrics?: AdminPaymentMetrics;
}) {
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState<number>(
    initialTotalFilteredCount ?? initialOrders.length
  );
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);

  const [orders, setOrders] = useState<EnrichedOrder[]>(initialOrders);
  const [metrics, setMetrics] = useState<AdminPaymentMetrics>(
    initialMetrics || {
      totalRev: 0,
      paidCount: 0,
      pendingCount: 0,
      failedCount: 0,
      totalCount: initialOrders.length,
    }
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all");

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  // In-Memory Page Cache to eliminate redundant network roundtrips
  const pageCache = useRef<
    Record<string, { orders: EnrichedOrder[]; totalFilteredCount: number; metrics: AdminPaymentMetrics }>
  >({
    "1___all": {
      orders: initialOrders,
      totalFilteredCount: initialTotalFilteredCount ?? initialOrders.length,
      metrics: initialMetrics || {
        totalRev: 0,
        paidCount: 0,
        pendingCount: 0,
        failedCount: 0,
        totalCount: initialOrders.length,
      },
    },
  });

  // Fetch a page with specific query & filter options
  const fetchPage = async (
    targetPage: number,
    search: string,
    status: "all" | "paid" | "pending" | "failed"
  ) => {
    const cacheKey = `${targetPage}_${search.trim()}_${status}`;
    if (pageCache.current[cacheKey]) {
      const cached = pageCache.current[cacheKey];
      setOrders(cached.orders);
      setTotalFilteredCount(cached.totalFilteredCount);
      if (cached.metrics) setMetrics(cached.metrics);
      setCurrentPage(targetPage);
      return;
    }

    setIsLoadingPage(true);
    const res = await getPaginatedOrdersAdmin({
      page: targetPage,
      pageSize,
      searchQuery: search,
      statusFilter: status,
    });
    setIsLoadingPage(false);

    if (res.success) {
      pageCache.current[cacheKey] = {
        orders: res.orders,
        totalFilteredCount: res.totalFilteredCount,
        metrics: res.metrics,
      };
      setOrders(res.orders);
      setTotalFilteredCount(res.totalFilteredCount);
      if (res.metrics) setMetrics(res.metrics);
      setCurrentPage(targetPage);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || isLoadingPage) return;
    fetchPage(newPage, searchQuery, statusFilter);
  };

  // Debounce search and filter updates to trigger page 1 fetch
  useEffect(() => {
    const isDefault = searchQuery === "" && statusFilter === "all" && currentPage === 1;
    if (isDefault) return;

    const timer = setTimeout(() => {
      fetchPage(1, searchQuery, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Pagination page numbers generator (compact with ellipsis)
  const paginationPageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display">
            Payments Audit
          </h1>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Link
            href="/admin/payments/recovery"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200/90 shadow-2xs hover:bg-amber-100 transition-colors"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Payment Resolution Hub</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/90 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Easebuzz Active</span>
          </span>
        </div>
      </div>

      {/* Recovery Quick Alert Banner */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-orange-50/70 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 shrink-0">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs font-bold text-amber-950">
              Payment Resolution &amp; Gateway Recovery Active
            </div>
            <div className="text-[11px] text-amber-800 font-sans">
              Have participants whose UPI payment went through but pass wasn&apos;t generated? Inspect Easebuzz live &amp; resolve with 1 click.
            </div>
          </div>
        </div>

        <Link
          href="/admin/payments/recovery"
          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs shrink-0 transition-colors inline-flex items-center gap-1"
        >
          <span>Open Recovery Hub</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Light Theme Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Revenue Collected</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalRev)}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Pass Orders: <strong className="text-slate-800 font-semibold">{metrics.paidCount} Paid</strong></span>
            <span className="text-emerald-700 font-bold">100% Settled</span>
          </div>
        </div>

        {/* Successful Payments */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Successful Payments</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metrics.paidCount}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Passes Issued: <strong className="text-slate-800 font-semibold">{metrics.paidCount}</strong></span>
            <span className="text-indigo-700 font-bold">HMAC Verified</span>
          </div>
        </div>

        {/* Pending Checkout */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pending Checkout</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metrics.pendingCount}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Cart Orders: <strong className="text-amber-800 font-semibold">Initialized</strong></span>
            <span>Awaiting Payment</span>
          </div>
        </div>

        {/* Failed Transactions */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Failed / Dismissed</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metrics.failedCount}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Canceled Orders: <strong className="text-rose-700 font-semibold">{metrics.failedCount}</strong></span>
            <span>No Pass Issued</span>
          </div>
        </div>
      </div>

      {/* Light Theme Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 rounded-2xl shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by participant name, email, pass code, or Easebuzz Txn ID..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
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

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 text-xs shrink-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            All ({metrics.totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "paid"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50"
            }`}
          >
            Paid ({metrics.paidCount})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-amber-700 hover:bg-amber-50/50"
            }`}
          >
            Pending ({metrics.pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("failed")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "failed"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-rose-700 hover:bg-rose-50/50"
            }`}
          >
            Failed ({metrics.failedCount})
          </button>
        </div>
      </div>

      {/* Light Theme Transactions Audit Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Order #</th>
                <th className="py-3 px-4 font-bold">Participant</th>
                <th className="py-3 px-4 font-bold">Pass Code &amp; Tier</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Easebuzz Txn ID</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Date</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 text-[11px] transition-opacity duration-200 ${isLoadingPage ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No payment transaction records match the selected filter.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const payId = ord.metadata?.easebuzz_pay_id || ord.metadata?.easebuzz_txnid || ord.metadata?.gateway_payment_id || "N/A";
                  const isPaid = ord.status === "paid";
                  const isPending = ord.status === "pending";
                  const isPro = ord.pass?.passTier === "pro_pass";

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>

                      {/* Participant */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-900">{ord.user.fullName}</div>
                        <div className="text-[11px] text-slate-500">{ord.user.email}</div>
                        {Boolean(ord.metadata?.needs_accommodation) && (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.2 text-[9px] font-extrabold">
                              🏡 Accommodation Requested
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Pass Code & Tier */}
                      <td className="py-3.5 px-4 font-sans">
                        {ord.pass ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-primary block">
                              {ord.pass.passCode}
                            </span>
                            {isPro ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 text-[9px] font-black uppercase">
                                <Star className="h-2.5 w-2.5 fill-current text-amber-600" />
                                <span>PRO PASS</span>
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[9px] font-bold">
                                STANDARD PASS
                              </span>
                            )}
                          </div>
                        ) : ord.userOtherPass ? (
                          <div className="space-y-1">
                            <span className="text-slate-400 italic text-[10px] block">
                              {ord.status === "failed" ? "Cancelled Attempt" : "No Pass for this Attempt"}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 text-[9px] font-bold"
                              title={`User already paid and holds pass ${ord.userOtherPass.passCode}${ord.userOtherPass.otherOrderNumber ? ` via Order ${ord.userOtherPass.otherOrderNumber}` : ""}`}
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Pass Active ({ord.userOtherPass.passCode})</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">
                            {ord.status === "failed" ? "No Pass Issued" : "Pending Pass"}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900 text-xs">
                        {formatCurrency(ord.amount)}
                      </td>

                      {/* Easebuzz Txn ID */}
                      <td className="py-3.5 px-4 font-mono">
                        {payId !== "N/A" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-800 px-2 py-0.5 border border-slate-200/90 font-bold text-[10px]">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span>{payId}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">N/A</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 font-sans">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 px-2.5 py-0.5 text-[10px] font-extrabold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>PAID</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 px-2.5 py-0.5 text-[10px] font-extrabold">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>PENDING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/90 px-2.5 py-0.5 text-[10px] font-extrabold">
                            <AlertCircle className="h-3 w-3 text-rose-600" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-right text-slate-500 font-sans text-[11px]">
                        {formatDate(ord.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bento Pagination Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Summary text */}
        <div className="text-xs text-slate-500 font-medium">
          {totalFilteredCount > 0 ? (
            <>
              Showing <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, totalFilteredCount)}</span> to{" "}
              <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalFilteredCount)}</span> of{" "}
              <span className="font-bold text-slate-800">{totalFilteredCount}</span> orders
            </>
          ) : (
            <span>No payment transaction records found</span>
          )}
          {isLoadingPage && (
            <span className="ml-2.5 inline-flex items-center gap-1.5 text-primary animate-pulse font-semibold">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </span>
          )}
        </div>

        {/* Right: Page Navigation Buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* Prev Button */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoadingPage}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Prev</span>
            </button>

            {/* Page Number Pills */}
            {paginationPageNumbers.map((pageItem, idx) => {
              if (pageItem === "...") {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-bold">
                    ...
                  </span>
                );
              }
              const pageNum = pageItem as number;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isLoadingPage}
                  className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-white shadow-xs scale-105"
                      : "border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoadingPage}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
              aria-label="Next Page"
            >
              <span className="hidden xs:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPaymentsClient;
