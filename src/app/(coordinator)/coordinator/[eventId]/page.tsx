import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  getEventAttendeesForCoordinator,
  getEventStaffDetails,
} from "@/actions/coordinator";
import { Navbar } from "@/components/navbar";
import { EventRosterClient } from "./roster-client";
import { StaffControlsClient } from "./staff-controls-client";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Building,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoordinatorEventRosterPage({
  params,
}: {
  params: { eventId: string };
}) {
  const data = await getEventAttendeesForCoordinator(params.eventId);

  if (!data.success || !data.event) {
    notFound();
  }

  const event = data.event;
  const attendees = data.attendees || [];
  const totalCount = data.totalCount ?? attendees.length;
  const attendedCount = data.attendedCount ?? 0;
  const fillPct = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
  const roleType = data.roleType || "student";

  let staffDetails: {
    whatsappLink: string;
    brochureUrl: string;
    studentCoordinators: Array<any>;
    allProfiles: Array<any>;
  } | null = null;

  if (roleType === "staff" || roleType === "admin") {
    const staffRes = await getEventStaffDetails(params.eventId);
    if (staffRes.success) {
      staffDetails = {
        whatsappLink: staffRes.whatsappLink || "",
        brochureUrl: staffRes.brochureUrl || "",
        studentCoordinators: staffRes.studentCoordinators || [],
        allProfiles: staffRes.allProfiles || [],
      };
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pt-16 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <Link
              href="/coordinator"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Coordinator Hub</span>
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-primary">
                {event.category?.name || "Track"}
              </span>

              {roleType === "staff" || roleType === "admin" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-900 text-white border border-indigo-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3 text-cyan-300" />
                  <span>Faculty Staff Coordinator</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  <GraduationCap className="h-3 w-3 text-emerald-600" />
                  <span>Student Coordinator</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {event.name}
            </h1>
            <p className="text-xs text-slate-500">{event.school_or_dept}</p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href={`/coordinator/scanner?event=${event.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all w-full sm:w-auto shrink-0 text-center"
            >
              <QrCode className="h-4 w-4" />
              <span>Open Event Scanner</span>
            </Link>
          </div>
        </div>

        {/* Event Specs & Stats Summary */}
        <div
          className={`grid grid-cols-2 ${
            data.firstSlotCount !== undefined
              ? "lg:grid-cols-4"
              : "sm:grid-cols-3"
          } gap-3 sm:gap-4`}
        >
          <div className="col-span-2 sm:col-span-1 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Schedule &amp; Venue
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                {event.event_date ? formatDate(event.event_date) : "TBA"} •{" "}
                {event.start_time ? formatTime(event.start_time) : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Registrations
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {totalCount} <span className="text-xs font-normal text-slate-400">/ {event.participant_limit || 100}</span>
            </div>
          </div>

          {/* 1st Slot Preference Stat Card (Staff & Admin Only) */}
          {data.firstSlotCount !== undefined && (
            <div className="rounded-2xl sm:rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/60 to-white p-3.5 sm:p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                1st Preference
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">
                {data.firstSlotCount}{" "}
                <span className="text-xs font-normal text-indigo-600">
                  {data.firstSlotCount === 1 ? "Delegate" : "Delegates"}
                </span>
              </div>
            </div>
          )}

          <div className={`rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-1 ${data.firstSlotCount !== undefined ? "col-span-2 sm:col-span-1" : ""}`}>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Attendance Progress
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {attendedCount} <span className="text-xs font-normal text-slate-400">({fillPct}%)</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Unified Tabbed Coordinator Workspace */}
        <EventRosterClient
          eventId={event.id}
          eventName={event.name}
          eventVenue={event.venue}
          eventStatus={event.status}
          roleType={roleType}
          initialAttendees={attendees as any}
          staffDetails={staffDetails}
        />
      </main>
    </div>
  );
}
