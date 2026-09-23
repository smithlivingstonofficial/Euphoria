import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoordinatorWorkspaceData } from "@/actions/coordinator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CoordinatorDirectoryClient } from "@/components/coordinator/coordinator-directory-client";
import {
  ShieldCheck,
  Calendar,
  Users,
  QrCode,
  CheckCircle2,
  UserCheck,
  GraduationCap,
  LayoutDashboard,
  Globe,
} from "lucide-react";

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

  const flagshipCount = events.filter((e) => e.is_pro_event).length;
  const regularCount = events.length - flagshipCount;
  const totalKluRegistrations = events.reduce((acc, e) => acc + (e.kluRegistrations || 0), 0);
  const totalExternalRegistrations = events.reduce((acc, e) => acc + (e.externalRegistrations || 0), 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar
        user={{
          email: data.userName || "coordinator@klu.ac.in",
          role: data.primaryRole === "admin" ? "admin" : "staff_coordinator",
        }}
      />

      <main className="flex-1 pt-20 sm:pt-24 pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-3.5 sm:space-y-4.5">
        {/* Streamlined Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Coordinator Hub
              </h1>

              {/* Minimal Pulsing Live Status Dot */}
              <span className="relative flex h-2.5 w-2.5" title="Live Turnout System Active">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>

              {/* Role Badge */}
              {data.isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                  <ShieldCheck className="h-3 w-3 text-amber-400" />
                  <span>Admin</span>
                </span>
              ) : data.isOverallCoordinator || data.primaryRole === "overall_coordinator" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-900 shadow-2xs">
                  <Globe className="h-3 w-3 text-sky-600" />
                  <span>Overall Coordinator</span>
                </span>
              ) : data.primaryRole === "staff" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-900 shadow-2xs">
                  <ShieldCheck className="h-3 w-3 text-purple-700" />
                  <span>Faculty Staff</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs">
                  <GraduationCap className="h-3 w-3 text-amber-600" />
                  <span>Student Coordinator</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live delegate check-in &amp; competition attendance telemetry
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {data.isAdmin && (
              <Link
                href="/admin"
                className="flex-1 sm:flex-initial h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                <span>Admin Console</span>
              </Link>
            )}

            {data.isOverallCoordinator ? (
              <div className="flex-1 sm:flex-initial h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-4 text-xs font-bold text-sky-800 shadow-2xs">
                <Globe className="h-3.5 w-3.5 text-sky-600" />
                <span>Global Oversight</span>
              </div>
            ) : (
              <Link
                href="/coordinator/scanner"
                className="flex-1 sm:flex-initial h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-primary/20 hover:from-primary-hover hover:to-indigo-700 transition-all cursor-pointer shrink-0"
              >
                <QrCode className="h-4 w-4" />
                <span>Launch Live Scanner</span>
              </Link>
            )}
          </div>
        </div>

        {/* Overall Coordinator Oversight Banner */}
        {data.isOverallCoordinator && (
          <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-white p-3 sm:p-3.5 text-xs text-sky-950 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-white shrink-0 shadow-xs">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <p className="font-extrabold text-sky-950">
                  Global Oversight Active • All 61 Competitions (Read-Only)
                </p>
                <p className="text-[11px] text-sky-800">
                  You have campus-wide read visibility across all 61 competitions to review rosters, real-time telemetry, and generate custom Excel/CSV reports. Live check-in scanner and event modifications are restricted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4 Vibrant Telemetry Cards (Compact 2x2 Grid on Mobile, 4-Col on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Card 1: Assigned Events (Indigo / Purple Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-500/[0.09] via-purple-500/[0.04] to-white p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xs sm:shadow-sm shadow-indigo-500/25 shrink-0">
                <Calendar className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-indigo-800/90 block truncate">
                  Assigned Events
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                    {events.length}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-bold text-indigo-800 bg-indigo-100/90 border border-indigo-200/90 px-1 sm:px-1.5 py-0.2 rounded">
                    Total
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-white/95 border border-indigo-200/80 text-[9px] sm:text-[11px] font-bold text-indigo-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="truncate">{flagshipCount} Flag • {regularCount} Reg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Delegates Enrolled (Cyan / Sky Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-500/[0.09] via-sky-500/[0.04] to-white p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-cyan-300 transition-all">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xs sm:shadow-sm shadow-cyan-500/25 shrink-0">
                <Users className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-cyan-800/90 block truncate">
                  Delegates
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                    {totalRegistrations}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-bold text-cyan-800 bg-cyan-100/90 border border-cyan-200/90 px-1 sm:px-1.5 py-0.2 rounded">
                    Passes
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-white/95 border border-cyan-200/80 text-[9px] sm:text-[11px] font-bold text-cyan-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />
                  <span className="truncate">{totalKluRegistrations} KLU • {totalExternalRegistrations} Ext</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Verified Check-Ins (Emerald / Mint Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/[0.09] via-teal-500/[0.04] to-white p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs sm:shadow-sm shadow-emerald-500/25 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/90 block truncate">
                  Check-Ins
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base sm:text-xl font-black text-emerald-950 tracking-tight font-mono">
                    {totalAttended}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200/90 px-1 sm:px-1.5 py-0.2 rounded">
                    Present
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-white/95 border border-emerald-200/80 text-[9px] sm:text-[11px] font-bold text-emerald-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">Gate verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Attendance Rate (Amber / Orange Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-500/[0.09] via-orange-500/[0.04] to-white p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs sm:shadow-sm shadow-amber-500/25 shrink-0">
                <UserCheck className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-800/90 block truncate">
                  Turnout
                </span>
                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                  <span className="text-xs sm:text-sm font-black text-amber-950 truncate">
                    {Math.max(0, totalRegistrations - totalAttended)} Pend
                  </span>
                  <span
                    className={`px-1 sm:px-1.5 py-0.2 rounded text-[10px] sm:text-[11px] font-bold font-mono border ${
                      avgAttendancePct > 0
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-2xs"
                        : "bg-amber-100 text-amber-900 border-amber-200"
                    }`}
                  >
                    {avgAttendancePct}%
                  </span>
                </div>
                {/* Glowing Gradient Progress Bar */}
                <div className="mt-1 sm:mt-1.5 h-1.5 sm:h-2 w-full rounded-full bg-slate-200/90 overflow-hidden border border-amber-100/90 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 shadow-sm shadow-amber-500/40 transition-all duration-500"
                    style={{ width: `${Math.min(100, avgAttendancePct)}%` }}
                  />
                </div>
                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-white/95 border border-amber-200/80 text-[9px] sm:text-[11px] font-bold text-amber-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="truncate">{totalRegistrations > 0 ? `${avgAttendancePct}% rate` : "No delegates"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Competitions Directory Component */}
        <div className="pt-0.5">
          <CoordinatorDirectoryClient
            events={events}
            primaryRole={
              data.primaryRole || (data.isOverallCoordinator ? "overall_coordinator" : "student")
            }
            isAdmin={Boolean(data.isAdmin)}
            isOverallCoordinator={Boolean(data.isOverallCoordinator)}
            isReadOnly={Boolean(data.isReadOnly)}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
