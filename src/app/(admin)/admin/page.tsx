import Link from "next/link";
import {
  Users,
  Calendar,
  CreditCard,
  QrCode,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  Building,
  Ticket,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { getAdminOverviewMetrics, getRecentRegistrationsAdmin } from "@/actions/admin";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { AdminDashboardVisuals } from "@/components/admin/admin-dashboard-visuals";
import { MetricInfoTooltip } from "@/components/admin/metric-info-tooltip";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metricsRes, registrationsRes] = await Promise.all([
    getAdminOverviewMetrics(),
    getRecentRegistrationsAdmin(8),
  ]);

  const metrics = metricsRes.data || {
    totalParticipants: 0,
    internalParticipants: 0,
    externalParticipants: 0,
    internalPercentage: 0,
    externalPercentage: 0,
    totalRegistrations: 0,
    totalPasses: 0,
    totalProPasses: 0,
    totalStandardPasses: 0,
    proPassPercentage: 0,
    standardPassPercentage: 0,
    proPassRevenue: 0,
    standardPassRevenue: 0,
    passConversionRate: 0,
    totalEvents: 0,
    activeEvents: 0,
    totalRevenue: 0,
    totalAttendance: 0,
    categories: [],
    categoryStats: [],
    topEvents: [],
    orderMetrics: {
      totalOrders: 0,
      paidOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      totalRevenue: 0,
      paidPercentage: 0,
      pendingPercentage: 0,
      failedPercentage: 0,
    },
  };

  const recentRegistrations = registrationsRes.registrations || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid - 5 Executive Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Revenue Collected */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-500">Total Revenue</span>
                <MetricInfoTooltip
                  title="Total Revenue Collected"
                  description="Gross settled revenue collected in INR from successful delegate pass transactions."
                  subMetrics={[
                    {
                      label: "Settled: 100% Easebuzz",
                      explanation: "100% of payments were captured and settled through the Easebuzz payment gateway without manual offline reconciliation.",
                    },
                    {
                      label: "Live Gateway",
                      explanation: "Production webhooks automatically verify each order and issue the delegate pass.",
                    },
                  ]}
                  contextNote="Only confirmed 'paid' orders are counted. Pending, attempted, and cancelled checkouts are excluded."
                  align="left"
                />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalRevenue)}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Settled: <strong className="text-emerald-700 font-bold">100% Easebuzz</strong></span>
            <span className="text-[10px] text-slate-400">Live Gateway</span>
          </div>
        </div>

        {/* Card 2: Festival Passes Issued */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-500">Passes Issued</span>
                <MetricInfoTooltip
                  title="Festival Passes Issued"
                  description="Total active delegate passes issued to participants who completed checkout."
                  subMetrics={[
                    {
                      label: "Pro Pass",
                      value: metrics.totalProPasses,
                      explanation: "Tier offering access to pro shows, guest events, flagship competitions, and workshops.",
                    },
                    {
                      label: "Standard Pass",
                      value: metrics.totalStandardPasses,
                      explanation: "Tier granting campus fest entry and participation in standard competitions.",
                    },
                  ]}
                  contextNote="A delegate pass is required to participate in events. Each pass has a unique QR ticket for campus check-in."
                  align="left"
                />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Ticket className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metrics.totalPasses}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Pro: <strong className="text-amber-700 font-bold">{metrics.totalProPasses}</strong></span>
            <span>Std: <strong className="text-indigo-700 font-bold">{metrics.totalStandardPasses}</strong></span>
          </div>
        </div>

        {/* Card 3: Participants Registered */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-500">Total Participants</span>
                <MetricInfoTooltip
                  title="Total Registered Participants"
                  description="Total unique user accounts and student profiles created on the Euphoria portal."
                  subMetrics={[
                    {
                      label: "KARE (Internal)",
                      value: metrics.internalParticipants,
                      explanation: "Students registered with Kalasalingam Academy internal student credentials.",
                    },
                    {
                      label: "External (Ext)",
                      value: metrics.externalParticipants,
                      explanation: "Participants registered from other universities, engineering colleges, and schools.",
                    },
                  ]}
                  contextNote="Why higher than Passes? Some students registered an account on the portal but haven't finished paying for their delegate pass yet."
                  align="center"
                />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-primary">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metrics.totalParticipants}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>KARE: <strong className="text-slate-800 font-semibold">{metrics.internalParticipants}</strong></span>
            <span>Ext: <strong className="text-slate-800 font-semibold">{metrics.externalParticipants}</strong></span>
          </div>
        </div>

        {/* Card 4: Event Registrations */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-500">Event Registrations</span>
                <MetricInfoTooltip
                  title="Event Slot Registrations"
                  description="Cumulative total of competition seats and slots booked across all festival events."
                  subMetrics={[
                    {
                      label: "Active Events",
                      value: metrics.activeEvents,
                      explanation: "Competitions currently open with published slots accepting registrations.",
                    },
                    {
                      label: "Total Events",
                      value: metrics.totalEvents,
                      explanation: "Total competitions and activities listed across the festival catalog.",
                    },
                  ]}
                  contextNote="Why higher than Passes? One pass holder can register for multiple events (averaging ~1.7 competition slots per participant)."
                  align="right"
                />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metrics.totalRegistrations}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Active: <strong className="text-slate-800 font-semibold">{metrics.activeEvents}</strong></span>
            <span>Total: <strong className="text-slate-800 font-semibold">{metrics.totalEvents}</strong></span>
          </div>
        </div>

        {/* Card 5: Attendance Check-ins */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-500">Attendance Scans</span>
                <MetricInfoTooltip
                  title="Venue Attendance Scans"
                  description="Total physical check-ins recorded on-ground by coordinators scanning participant QR codes at gates or halls."
                  subMetrics={[
                    {
                      label: "Scanner: Active",
                      explanation: "The QR check-in camera scanner is operational for coordinators and staff.",
                    },
                    {
                      label: "Scanner → Link",
                      explanation: "Direct shortcut to launch the camera scanning tool for ticket validation.",
                    },
                  ]}
                  contextNote="Shows 0 before the festival begins. Increments in real-time as coordinators scan QR passes at the entrance gates."
                  align="right"
                />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <QrCode className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {metrics.totalAttendance}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Scanner: <strong className="text-slate-800 font-semibold">Active</strong></span>
            <Link href="/admin/registrations" className="text-primary font-bold hover:underline text-[10px]">
              Scanner &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Visual Graphs & Data Analytics Section */}
      <AdminDashboardVisuals metrics={metrics} />

      {/* Quick Access Matrix - 6 Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Link
          href="/admin/users"
          className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                  Users &amp; Passes
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Profiles &amp; slots</p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/events"
          className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-primary shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                  {metrics.totalEvents || 61} Competitions
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Schedules &amp; venues</p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/registrations"
          className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                  Event Check-Ins
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Live scanner desk</p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                  Export Reports
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Excel &amp; CSV audits</p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/payments"
          className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 transition-colors truncate">
                  Payment Audit
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Easebuzz Txn IDs</p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/payments/recovery"
          className="group rounded-2xl border border-amber-200/90 bg-amber-50/40 p-3.5 shadow-xs hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-amber-950 group-hover:text-amber-700 transition-colors truncate">
                  Recovery Hub
                </h3>
                <p className="text-[10px] text-amber-800 truncate">Resolve failed UPI</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Registrations Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Participant Registrations</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live stream of event pass issuances</p>
          </div>
          <Link
            href="/admin/registrations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>View Full Directory</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentRegistrations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Pass Code</th>
                  <th className="px-5 py-3">Participant</th>
                  <th className="px-5 py-3">Institution</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentRegistrations.map((reg) => {
                  const user = Array.isArray(reg.user) ? reg.user[0] : reg.user;
                  const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
                  const isCheckedIn = (reg.attendance || []).length > 0;

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">
                        {reg.registration_code}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{user?.full_name || "Participant"}</div>
                        <div className="text-[11px] text-slate-500">{user?.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                            user?.participant_type === "internal"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {user?.participant_type === "internal" ? "KARE" : user?.college_name || "External"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {event?.name || "Event"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                            reg.payment_status === "paid" || reg.payment_status === "not_required"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {reg.payment_status === "paid" ? "Paid" : reg.payment_status === "not_required" ? "Free" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                            isCheckedIn
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isCheckedIn ? "Checked In" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No registrations recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
