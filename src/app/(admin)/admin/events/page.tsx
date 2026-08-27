import Link from "next/link";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Users,
  MapPin,
  Clock,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { getAllEventsAdmin } from "@/actions/admin";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { EventsAdminTable } from "@/components/admin/events-admin-table";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const res = await getAllEventsAdmin();
  const events = res.events || [];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Events & Competitions Directory
            </h1>
            <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-primary border border-indigo-200">
              {events.length} Total Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure rules, venues, capacity ceilings &amp; department track categories
          </p>
        </div>

        {/* Action Button */}
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Event</span>
        </Link>
      </div>

      {/* Interactive Events Table Component */}
      <EventsAdminTable initialEvents={events} />
    </div>
  );
}
