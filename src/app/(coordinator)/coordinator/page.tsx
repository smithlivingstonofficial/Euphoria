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
  Zap,
  FileText,
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
      <Navbar
        user={{
          email: data.userName || "coordinator@klu.ac.in",
          role: data.primaryRole === "admin" ? "admin" : "staff_coordinator",
        }}
      />

      <main className="flex-1 pt-16 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {data.primaryRole === "staff" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-0.5 text-xs font-bold text-purple-900 shadow-2xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-700" />
                  <span>Faculty Staff Coordinator</span>
                </span>
              ) : data.primaryRole === "admin" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 px-3 py-0.5 text-xs font-bold text-white shadow-2xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  <span>Super Administrator</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-900 shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>Student Coordinator</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Event Management &amp; Check-In Hub
            </h1>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href="/coordinator/scanner"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary-hover active:scale-[0.99] transition-all cursor-pointer w-full sm:w-auto text-center"
            >
              <QrCode className="h-4 w-4" />
              <span>Launch Live QR Scanner</span>
            </Link>
          </div>
        </div>

        {/* Metrics Overview Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Assigned Events</span>
              <Calendar className="h-4 w-4 text-primary shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {events.length}
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Delegates</span>
              <Users className="h-4 w-4 text-indigo-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {totalRegistrations}
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Checked-In</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {totalAttended}
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Attendance Rate</span>
              <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {avgAttendancePct}%
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${avgAttendancePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Assigned Competitions Directory */}
        <div className="space-y-3 sm:space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Your Assigned Competitions ({events.length})
            </h2>
          </div>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {events.map((evt) => {
                const fillPct =
                  evt.totalRegistrations > 0
                    ? Math.round((evt.totalAttended / evt.totalRegistrations) * 100)
                    : 0;

                return (
                  <div
                    key={evt.id}
                    className="group relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {evt.is_pro_event ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                            <Sparkles className="h-3 w-3 fill-current" />
                            <span>Flagship</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 text-slate-600 border border-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            <Zap className="h-3 w-3 text-indigo-500" />
                            <span>Regular</span>
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {evt.roleType === "staff"
                            ? "Staff Coordinator"
                            : evt.roleType === "admin"
                            ? "Super Administrator"
                            : "Student Coordinator"}
                        </span>
                      </div>

                      {/* Event Name */}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {evt.name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">
                          {evt.school_or_dept}
                        </p>
                      </div>

                      {/* Schedule & Venue Specs */}
                      <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-100">
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

                      {/* 1st Slot Choice Metric (Staff & Admin Only) */}
                      {evt.firstSlotCount !== undefined && (
                        <div className="flex items-center justify-between text-xs font-semibold rounded-xl bg-indigo-50/80 border border-indigo-100/80 px-3 py-1.5 text-indigo-950">
                          <span className="text-indigo-700 text-[11px] font-medium">1st Preference:</span>
                          <span className="font-bold font-mono text-indigo-900">
                            {evt.firstSlotCount} {evt.firstSlotCount === 1 ? "delegate" : "delegates"}
                          </span>
                        </div>
                      )}

                      {/* Attendance Progress Meter */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500">Attendance:</span>
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
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/coordinator/${evt.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline py-1 truncate"
                      >
                        <span>Manage Roster &amp; Attendance</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </Link>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {evt.brochureUrl ? (
                          <a
                            href={evt.brochureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Quick View Official Brochure (PDF)"
                            aria-label={`View brochure for ${evt.name}`}
                            className="rounded-xl bg-indigo-50 border border-indigo-200/80 p-2.5 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : null}

                        <Link
                          href={`/coordinator/scanner?event=${evt.id}`}
                          title="Open Scanner for this event"
                          className="rounded-xl bg-slate-100 p-2.5 text-slate-700 hover:bg-primary hover:text-white transition-colors"
                        >
                          <QrCode className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-3">
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
