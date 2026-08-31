import Link from "next/link";
import {
  Users,
  Calendar,
  CreditCard,
  QrCode,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Megaphone,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  Building,
} from "lucide-react";
import { getAdminOverviewMetrics, getAllRegistrationsAdmin } from "@/actions/admin";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metricsRes, registrationsRes] = await Promise.all([
    getAdminOverviewMetrics(),
    getAllRegistrationsAdmin(),
  ]);

  const metrics = metricsRes.data || {
    totalParticipants: 0,
    internalParticipants: 0,
    externalParticipants: 0,
    totalRegistrations: 0,
    totalEvents: 0,
    activeEvents: 0,
    totalRevenue: 0,
    totalAttendance: 0,
  };

  const recentRegistrations = (registrationsRes.registrations || []).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Executive Event Operations
            </h1>
            <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              Live System
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics, registrations roster, financial telemetry & pass verification
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </Link>
          <Link
            href="/admin/announcements"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Megaphone className="h-4 w-4 text-slate-500" />
            <span>Broadcast Alert</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Participants */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Participants Registered</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {metrics.totalParticipants}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>KARE: <strong className="text-slate-800 font-semibold">{metrics.internalParticipants}</strong></span>
            <span>External: <strong className="text-slate-800 font-semibold">{metrics.externalParticipants}</strong></span>
          </div>
        </div>

        {/* Card 2: Total Registrations */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Event Registrations</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {metrics.totalRegistrations}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Active Events: <strong className="text-slate-800 font-semibold">{metrics.activeEvents}</strong></span>
            <span>Total: <strong className="text-slate-800 font-semibold">{metrics.totalEvents}</strong></span>
          </div>
        </div>

        {/* Card 3: Total Revenue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Revenue Collected</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Settlement: <strong className="text-emerald-700 font-semibold">100% Settled</strong></span>
            <span>Zero-Cost Sandbox</span>
          </div>
        </div>

        {/* Card 4: Attendance Check-ins */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Attendance Scanned</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {metrics.totalAttendance}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Pass Scans: <strong className="text-slate-800 font-semibold">Live Scanner</strong></span>
            <Link href="/admin/registrations" className="text-primary font-semibold hover:underline">
              View All
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Access Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/users"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Users &amp; Passes
                </h3>
                <p className="text-[11px] text-slate-500">Profiles, pass codes &amp; slots</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-purple-600 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/events"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">
                  61 Competitions
                </h3>
                <p className="text-[11px] text-slate-500">Schedules, venues &amp; capacity</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-primary transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/registrations"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Event Check-Ins
                </h3>
                <p className="text-[11px] text-slate-500">Search directory &amp; attendance</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Export Reports
                </h3>
                <p className="text-[11px] text-slate-500">Attendance &amp; accounting CSVs</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/payments"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                  Payment Audit
                </h3>
                <p className="text-[11px] text-slate-500">Razorpay Txn IDs &amp; revenue</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-cyan-600 transition-all" />
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
