import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoordinatorWorkspaceData } from "@/actions/coordinator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  ShieldCheck,
  Calendar,
  Users,
  QrCode,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  UserCheck,
  FileSpreadsheet,
  AlertCircle,
  Building,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoordinatorDashboardPage() {
  const data = await getCoordinatorWorkspaceData();

  if (!data.success && (data.error?.includes("Unauthorized") || data.error?.includes("log in"))) {
    redirect("/login?redirect=/coordinator");
  }

  if (!data.success) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1 py-16 px-4 max-w-lg mx-auto flex items-center justify-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Coordinator Access Required</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {data.error ||
                "You are currently logged in as a participant. If you are an assigned event coordinator, please contact the Euphoria administrator."}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
              >
                Go to Participant Pass
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const events = data.events || [];
  const totalRegistrations = events.reduce((acc, e) => acc + e.totalRegistrations, 0);
  const totalAttended = events.reduce((acc, e) => acc + e.totalAttended, 0);
  const avgAttendancePct =
    totalRegistrations > 0
      ? Math.round((totalAttended / totalRegistrations) * 100)
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-xs font-bold text-primary shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Coordinator Control Center</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Event Management &amp; Check-In Hub
            </h1>
            <p className="text-xs text-slate-500">
              Manage participant rosters, scan entry QR passes, and record attendance for your assigned competitions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/coordinator/scanner"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary-hover active:scale-[0.99] transition-all cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>Launch Live QR Scanner</span>
            </Link>
          </div>
        </div>

        {/* Metrics Overview Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Assigned Events</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {events.length}
            </div>
            <p className="text-[11px] text-slate-500">Competitions under your oversight</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Registered Delegates</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalRegistrations}
            </div>
            <p className="text-[11px] text-slate-500">Total verified participant registrations</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Checked-In</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {totalAttended}
            </div>
            <p className="text-[11px] text-slate-500">Scanned &amp; marked present</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Attendance Rate</span>
              <UserCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {avgAttendancePct}%
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${avgAttendancePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Assigned Competitions Directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Your Assigned Competitions ({events.length})
            </h2>
            <span className="text-xs text-slate-500">
              Click &quot;View Roster&quot; to manage participant check-ins
            </span>
          </div>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((evt) => {
                const fillPct =
                  evt.totalRegistrations > 0
                    ? Math.round((evt.totalAttended / evt.totalRegistrations) * 100)
                    : 0;

                return (
                  <div
                    key={evt.id}
                    className="group relative rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {evt.category?.name || "Track"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {evt.roleType === "staff" ? "Staff Coordinator" : "Student Coordinator"}
                        </span>
                      </div>

                      {/* Event Name */}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {evt.name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-1 line-clamp-1">
                          {evt.school_or_dept}
                        </p>
                      </div>

                      {/* Schedule & Venue Specs */}
                      <div className="space-y-1 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                        <div className="flex items-center gap-2 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
                            {evt.event_date ? formatDate(evt.event_date) : "TBA"} •{" "}
                            {evt.start_time ? formatTime(evt.start_time) : ""} -{" "}
                            {evt.end_time ? formatTime(evt.end_time) : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{evt.venue}</span>
                        </div>
                      </div>

                      {/* Attendance Progress Meter */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500">Check-in Attendance:</span>
                          <span className="text-slate-900">
                            <strong>{evt.totalAttended}</strong> / {evt.totalRegistrations} Checked In
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Link Footer */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/coordinator/${evt.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Manage Roster &amp; Attendance</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      <Link
                        href={`/coordinator/scanner?event=${evt.id}`}
                        title="Open Scanner for this event"
                        className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-primary hover:text-white transition-colors"
                      >
                        <QrCode className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Events Assigned Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You currently do not have any competitions assigned. Please contact the platform administrator to assign you as a coordinator.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
