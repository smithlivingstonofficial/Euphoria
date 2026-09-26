"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Sparkles,
  PieChart,
  BarChart3,
  Flame,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface TopEventStat {
  id: string;
  name: string;
  categoryId?: string;
  limit: number;
  registered: number;
  internal: number;
  external: number;
  saturationPct: number;
  isPro: boolean;
}

export interface CategoryStat {
  id: string;
  name: string;
  eventCount: number;
  registrationCount: number;
}

export interface OrderTelemetry {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  totalRevenue: number;
  paidPercentage: number;
  pendingPercentage: number;
  failedPercentage: number;
}

interface AdminDashboardVisualsProps {
  metrics: {
    totalParticipants: number;
    internalParticipants: number;
    externalParticipants: number;
    internalPercentage?: number;
    externalPercentage?: number;
    totalPasses: number;
    totalProPasses: number;
    totalStandardPasses: number;
    proPassPercentage?: number;
    standardPassPercentage?: number;
    proPassRevenue?: number;
    standardPassRevenue?: number;
    passConversionRate?: number;
    totalRevenue: number;
    topEvents?: TopEventStat[];
    categoryStats?: CategoryStat[];
    orderMetrics?: OrderTelemetry;
  };
}

export function AdminDashboardVisuals({ metrics }: AdminDashboardVisualsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "saturation" | "funnel">("overview");

  // Donut SVG Calculations for Passes (Standard vs Pro)
  const passCircumference = 2 * Math.PI * 40; // r = 40 => circumference ≈ 251.3
  const proPassPct =
    metrics.proPassPercentage ??
    (metrics.totalPasses > 0 ? Math.round((metrics.totalProPasses / metrics.totalPasses) * 100) : 0);
  const stdPassPct = 100 - proPassPct;
  const proPassOffset = passCircumference - (proPassPct / 100) * passCircumference;

  // Donut SVG Calculations for Demographics (Internal KARE vs External)
  const demoCircumference = 2 * Math.PI * 40;
  const internalPct =
    metrics.internalPercentage ??
    (metrics.totalParticipants > 0 ? Math.round((metrics.internalParticipants / metrics.totalParticipants) * 100) : 0);
  const externalPct = 100 - internalPct;
  const internalOffset = demoCircumference - (internalPct / 100) * demoCircumference;

  const topEvents = metrics.topEvents || [];
  const defaultTotalOrders = metrics.orderMetrics?.totalOrders ?? metrics.totalPasses;
  const orderMetrics = metrics.orderMetrics || {
    totalOrders: defaultTotalOrders,
    paidOrders: metrics.totalPasses,
    pendingOrders: 0,
    failedOrders: 0,
    totalRevenue: metrics.totalRevenue,
    paidPercentage: defaultTotalOrders > 0 ? Math.round((metrics.totalPasses / defaultTotalOrders) * 100) : 0,
    pendingPercentage: 0,
    failedPercentage: 0,
  };

  return (
    <div className="space-y-6">
      {/* Visual Analytics Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-primary">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Executive Telemetry &amp; Visual Analytics</span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Live Stream
              </span>
            </h2>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pass &amp; Demographics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saturation")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "saturation"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Competition Saturation</span>
            {topEvents.some((e) => e.saturationPct >= 90) && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("funnel")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "funnel"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Checkout Funnel
          </button>
        </div>
      </div>

      {/* TAB 1: PASS & DEMOGRAPHICS DUAL DONUTS */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Graph 1: Festival Pass Tier Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Pass Tier Mix &amp; Revenue Share</h3>
                  <p className="text-[11px] text-slate-500">Pro Pass vs Standard Pass issuance ratio</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {metrics.totalPasses} Active Passes
              </span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
              {/* Circular SVG Donut */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Background Track (Standard Pass) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-indigo-600 stroke-current"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Foreground Arc (Pro Pass) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-amber-500 stroke-current transition-all duration-700 ease-out"
                    strokeWidth="12"
                    strokeDasharray={passCircumference}
                    strokeDashoffset={proPassOffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold font-mono text-slate-900">
                    {proPassPct}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Pro Share
                  </span>
                </div>
              </div>

              {/* Legend & Telemetry */}
              <div className="flex-1 w-full space-y-3">
                {/* Standard Pass Metric */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full bg-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-indigo-950">Standard Festival Pass</div>
                      <div className="text-[11px] text-indigo-700">
                        ₹200 / pass ({formatCurrency(metrics.standardPassRevenue ?? (metrics.totalStandardPasses * 200))} gross)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-indigo-950">
                      {metrics.totalStandardPasses}
                    </div>
                    <div className="text-[10px] font-semibold text-indigo-600">{stdPassPct}%</div>
                  </div>
                </div>

                {/* Pro Pass Metric */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-950 flex items-center gap-1">
                        <span>Pro Pass (VIP Access)</span>
                        <Sparkles className="h-3 w-3 text-amber-500" />
                      </div>
                      <div className="text-[11px] text-amber-800">
                        ₹300 / pass ({formatCurrency(metrics.proPassRevenue ?? (metrics.totalProPasses * 300))} gross)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-amber-950">
                      {metrics.totalProPasses}
                    </div>
                    <div className="text-[10px] font-bold text-amber-700">{proPassPct}%</div>
                  </div>
                </div>

                {/* Conversion Banner */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
                  <span>Registered User Conversion:</span>
                  <strong className="text-emerald-700 font-bold">
                    {metrics.passConversionRate ?? (metrics.totalParticipants > 0 ? Math.round((metrics.totalPasses / metrics.totalParticipants) * 100) : 0)}% converted to passes
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Graph 2: Participant Demographics (KARE vs External) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Institution &amp; Demographic Ratio</h3>
                  <p className="text-[11px] text-slate-500">Internal host university vs external colleges</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {metrics.totalParticipants} Profiles
              </span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
              {/* Circular SVG Donut */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Background Track (External) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-violet-500 stroke-current"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Foreground Arc (Internal KARE) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-emerald-500 stroke-current transition-all duration-700 ease-out"
                    strokeWidth="12"
                    strokeDasharray={demoCircumference}
                    strokeDashoffset={internalOffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold font-mono text-slate-900">
                    {internalPct}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    KARE Internal
                  </span>
                </div>
              </div>

              {/* Legend & Telemetry */}
              <div className="flex-1 w-full space-y-3">
                {/* KARE Internal Metric */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950">Kalasalingam (KARE)</div>
                      <div className="text-[11px] text-emerald-700">Internal university participants</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-emerald-950">
                      {metrics.internalParticipants}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700">{internalPct}%</div>
                  </div>
                </div>

                {/* External Metric */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-50/60 border border-violet-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full bg-violet-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-violet-950">External Institutions</div>
                      <div className="text-[11px] text-violet-700">Other colleges &amp; universities</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-violet-950">
                      {metrics.externalParticipants}
                    </div>
                    <div className="text-[10px] font-bold text-violet-700">{externalPct}%</div>
                  </div>
                </div>

                {/* Demographic Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${internalPct}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${externalPct}%` }} className="bg-violet-500 h-full" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Host University Ratio</span>
                    <span>External Delegate Ratio</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITION SLOT SATURATION LEADERBOARD */}
      {activeTab === "saturation" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-500" />
                <span>High-Demand Competitions &amp; Slot Saturation</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time tracking of capacity utilization across premier festival events
              </p>
            </div>
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>Manage Slot Controls</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {topEvents.map((evt) => {
              const isCritical = evt.saturationPct >= 90;
              const isWarning = evt.saturationPct >= 70 && evt.saturationPct < 90;
              const barColor = isCritical
                ? "bg-rose-500"
                : isWarning
                ? "bg-amber-500"
                : "bg-emerald-500";

              return (
                <div
                  key={evt.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCritical
                      ? "bg-rose-50/40 border-rose-200/90"
                      : "bg-slate-50/50 border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {evt.name}
                        </span>
                        {evt.isPro && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {evt.internal} KARE &bull; {evt.external} External
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-900">
                        {evt.registered} / {evt.limit}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isCritical
                            ? "bg-rose-100 text-rose-700"
                            : isWarning
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {evt.saturationPct}% Full
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="mt-2.5">
                    <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                        style={{ width: `${evt.saturationPct}%` }}
                      />
                    </div>
                  </div>

                  {isCritical && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-700">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Near maximum capacity ({evt.limit - evt.registered} slots remaining)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL CHECKOUT FUNNEL & PIPELINE */}
      {activeTab === "funnel" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>Easebuzz Gateway Checkout Funnel &amp; Settlement Flow</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Financial pipeline tracking transactions from initiation to completed settlement
              </p>
            </div>
            <Link
              href="/admin/payments/recovery"
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
            >
              <span>Gateway Recovery Hub</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Segmented Flow Bar */}
          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${orderMetrics.paidPercentage}%` }}
                className="bg-emerald-500 h-full hover:brightness-105 transition-all"
                title={`Paid: ${orderMetrics.paidPercentage}%`}
              />
              <div
                style={{ width: `${orderMetrics.pendingPercentage}%` }}
                className="bg-amber-400 h-full hover:brightness-105 transition-all"
                title={`Pending: ${orderMetrics.pendingPercentage}%`}
              />
              <div
                style={{ width: `${orderMetrics.failedPercentage}%` }}
                className="bg-rose-400 h-full hover:brightness-105 transition-all"
                title={`Failed: ${orderMetrics.failedPercentage}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
              <span>Total Orders Tracked: <strong className="text-slate-800">{orderMetrics.totalOrders}</strong></span>
              <span>Overall Gateway Success Rate: <strong className="text-emerald-700 font-bold">{orderMetrics.paidPercentage}%</strong></span>
            </div>
          </div>

          {/* 3 Step Funnel Stages */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Step 1: Paid & Settled */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">Successful &amp; Settled</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-emerald-950">
                  {formatCurrency(orderMetrics.totalRevenue)}
                </div>
                <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  {orderMetrics.paidOrders} Completed Orders ({orderMetrics.paidPercentage}%)
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-emerald-200/80 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>HMAC Verified &amp; Pass Issued</span>
              </div>
            </div>

            {/* Step 2: Pending Checkout */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950">Awaiting Checkout</span>
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-amber-950">
                  {orderMetrics.pendingOrders}
                </div>
                <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                  Cart orders initiated ({orderMetrics.pendingPercentage}%)
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-200/80 text-[10px] text-amber-700 font-semibold">
                Participant cart sessions awaiting payment
              </div>
            </div>

            {/* Step 3: Failed / Dismissed */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-950">Failed / Dismissed</span>
                  <XCircle className="h-4 w-4 text-rose-600" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-rose-950">
                  {orderMetrics.failedOrders}
                </div>
                <div className="text-[11px] text-rose-800 font-medium mt-0.5">
                  Declined or canceled ({orderMetrics.failedPercentage}%)
                </div>
              </div>
              <Link
                href="/admin/payments/recovery"
                className="mt-3 pt-2 border-t border-rose-200/80 text-[10px] text-rose-700 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Recover orphaned payments &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
