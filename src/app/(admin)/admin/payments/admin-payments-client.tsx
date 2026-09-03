"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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
}

export function AdminPaymentsClient({
  initialOrders = [],
}: {
  initialOrders: EnrichedOrder[];
}) {
  const [orders, setOrders] = useState<EnrichedOrder[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all");

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Status filter
      if (statusFilter !== "all" && ord.status !== statusFilter) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const nameMatch = ord.user.fullName.toLowerCase().includes(q);
      const emailMatch = ord.user.email.toLowerCase().includes(q);
      const orderMatch = ord.orderNumber.toLowerCase().includes(q);
      const passMatch = ord.pass?.passCode?.toLowerCase().includes(q);
      const easebuzzPayId = (ord.metadata?.easebuzz_pay_id || ord.metadata?.gateway_payment_id || ord.metadata?.payment_id || "").toLowerCase();
      const easebuzzTxnId = (ord.metadata?.easebuzz_txnid || ord.metadata?.gateway_order_id || ord.orderNumber || "").toLowerCase();

      return (
        nameMatch ||
        emailMatch ||
        orderMatch ||
        Boolean(passMatch) ||
        easebuzzPayId.includes(q) ||
        easebuzzTxnId.includes(q)
      );
    });
  }, [orders, searchQuery, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalRev = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    orders.forEach((o) => {
      if (o.status === "paid") {
        totalRev += Number(o.amount || 0);
        paidCount++;
      } else if (o.status === "pending") {
        pendingCount++;
      } else if (o.status === "failed") {
        failedCount++;
      }
    });

    return { totalRev, paidCount, pendingCount, failedCount, totalCount: orders.length };
  }, [orders]);

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

        <div className="shrink-0 flex items-center">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/90 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Easebuzz Active</span>
          </span>
        </div>
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
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
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
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No payment transaction records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
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
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Pending Pass</span>
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
    </div>
  );
}

export default AdminPaymentsClient;
