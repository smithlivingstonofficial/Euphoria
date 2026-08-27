import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getEventAttendeesForCoordinator } from "@/actions/coordinator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { EventRosterClient } from "./roster-client";
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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-1">
            <Link
              href="/coordinator"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Coordinator Hub</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-primary">
                {event.category?.name || "Track"}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {event.name}
              </h1>
            </div>
            <p className="text-xs text-slate-500">{event.school_or_dept}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/coordinator/scanner?event=${event.id}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all shrink-0"
            >
              <QrCode className="h-4 w-4" />
              <span>Open Event Scanner</span>
            </Link>
          </div>
        </div>

        {/* Event Specs & Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Schedule &amp; Timing
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span>
                {event.event_date ? formatDate(event.event_date) : "TBA"} •{" "}
                {event.start_time ? formatTime(event.start_time) : ""} -{" "}
                {event.end_time ? formatTime(event.end_time) : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Total Registrations
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalCount} <span className="text-xs font-normal text-slate-400">/ {event.participant_limit || 100} Capacity</span>
            </div>
            <p className="text-[11px] text-slate-500">Verified participant entries</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Attendance Progress
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {attendedCount} <span className="text-xs font-normal text-slate-400">({fillPct}%) Checked In</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Interactive Attendee Roster Table */}
        <EventRosterClient
          eventId={event.id}
          eventName={event.name}
          initialAttendees={attendees as any}
        />
      </main>

      <Footer />
    </div>
  );
}
