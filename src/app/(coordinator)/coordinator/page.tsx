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
  Lock,
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
  const externalOnlyCount = events.filter((e) => e.isKluBlocked || e.allow_internal === false).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar
        user={{
          email: data.userName || "coordinator@klu.ac.in",
          role: data.primaryRole === "admin" ? "admin" : "staff_coordinator",
        }}
      />

      <main className="flex-1 pt-18 sm:pt-20 pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-4 sm:space-y-4.5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-display">
              Coordinator Hub
            </h1>

            {/* Live Indicator */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Check-In</span>
            </span>

            {/* Role Badge */}
            {data.primaryRole === "staff" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-900">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-700" />
                <span>Faculty Staff</span>
              </span>
            ) : data.primaryRole === "admin" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <span>Super Admin</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
                <span>Student Coordinator</span>
              </span>
            )}

            {/* External-Only Events Banner */}
            {externalOnlyCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                <Lock className="h-3 w-3 text-amber-600" />
                <span>{externalOnlyCount} External-Only Mode</span>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {data.isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                <span>Admin Console</span>
              </Link>
            )}

            <Link
              href="/coordinator/scanner"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 hover:from-primary-hover hover:to-indigo-700 transition-all cursor-pointer shrink-0"
            >
              <QrCode className="h-4 w-4" />
              <span>Launch Live Scanner</span>
            </Link>
          </div>
        </div>

        {/* 4 Vibrant Telemetry Cards (Themed, Shiny & High-Impact) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Assigned Events (Indigo / Purple Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-500/[0.09] via-purple-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25 shrink-0">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800/90 block">
                  Assigned Events
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                    {events.length}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100/90 border border-indigo-200/90 px-1.5 py-0.5 rounded-md">
                    Total
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-indigo-200/80 text-[10px] sm:text-[11px] font-bold text-indigo-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <span>{flagshipCount} Flagship • {regularCount} Regular</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Delegates Enrolled (Cyan / Sky Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-500/[0.09] via-sky-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-cyan-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/25 shrink-0">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-800/90 block">
                  Delegates Enrolled
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                    {totalRegistrations}
                  </span>
                  <span className="text-[11px] font-bold text-cyan-800 bg-cyan-100/90 border border-cyan-200/90 px-1.5 py-0.5 rounded-md">
                    Passes
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-cyan-200/80 text-[10px] sm:text-[11px] font-bold text-cyan-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  <span>{totalKluRegistrations} KLU • {totalExternalRegistrations} Externals</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Verified Check-Ins (Emerald / Mint Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/[0.09] via-teal-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25 shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/90 block">
                  Verified Check-Ins
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight font-mono">
                    {totalAttended}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200/90 px-1.5 py-0.5 rounded-md">
                    Present
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-emerald-200/80 text-[10px] sm:text-[11px] font-bold text-emerald-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gate verified attendees</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Attendance Rate (Amber / Orange Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-500/[0.09] via-orange-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25 shrink-0">
                <UserCheck className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800/90 block">
                  Attendance Rate
                </span>
                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                  <span className="text-xs sm:text-sm font-black text-amber-950 truncate">
                    {Math.max(0, totalRegistrations - totalAttended)} Pending
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono border ${
                      avgAttendancePct > 0
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-2xs"
                        : "bg-amber-100 text-amber-900 border-amber-200"
                    }`}
                  >
                    {avgAttendancePct}%
                  </span>
                </div>
                {/* Glowing Gradient Progress Bar */}
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-200/90 overflow-hidden border border-amber-100/90 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 shadow-sm shadow-amber-500/40 transition-all duration-500"
                    style={{ width: `${Math.min(100, avgAttendancePct)}%` }}
                  />
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-amber-200/80 text-[10px] sm:text-[11px] font-bold text-amber-950 shadow-2xs truncate max-w-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{totalRegistrations > 0 ? `${avgAttendancePct}% verified turnout` : "No delegates yet"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Competitions Directory Component */}
        <div className="pt-0.5">
          <CoordinatorDirectoryClient
            events={events}
            primaryRole={(data.primaryRole as "admin" | "staff" | "student") || "student"}
            isAdmin={Boolean(data.isAdmin)}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
