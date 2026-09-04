"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
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
  Plus,
  Star,
  Sparkles,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { getEventSchedule } from "@/lib/schedule";
import { parseEventMetadata } from "@/components/events/event-catalog-explorer";
import { deleteEventAdmin, updateEventAdmin } from "@/actions/admin";

interface EventItem {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  school_or_dept?: string;
  venue?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  registration_fee?: number;
  participant_limit?: number;
  is_pro_event?: boolean;
  status: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  registrations?: Array<{
    id: string;
    status: string;
    payment_status: string;
    slot_number?: number;
  }>;
}

export function EventsAdminTable({ initialEvents }: { initialEvents: EventItem[] }) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState<"all" | "pro" | "normal">("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        evt.name.toLowerCase().includes(q) ||
        (evt.venue && evt.venue.toLowerCase().includes(q)) ||
        (evt.school_or_dept && evt.school_or_dept.toLowerCase().includes(q)) ||
        (evt.category?.name && evt.category.name.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ? true : evt.status === statusFilter;

      const matchesTier =
        tierFilter === "all"
          ? true
          : tierFilter === "pro"
          ? Boolean(evt.is_pro_event)
          : !evt.is_pro_event;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [events, searchQuery, statusFilter, tierFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(id);
    const res = await deleteEventAdmin(id);
    if (res.success) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      alert(res.error || "Failed to delete event");
    }
    setIsDeleting(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateEventAdmin(id, { status: newStatus });
    if (res.success) {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
      );
    } else {
      alert(res.error || "Failed to update status");
    }
  };

  const exportEventsCSV = () => {
    const listToExport = filteredEvents.length > 0 ? filteredEvents : events;

    const headers = [
      "S.No",
      "Event Name",
      "Slug",
      "School / Academic Department",
      "Category / Track",
      "Tier",
      "Event Date",
      "Start Date",
      "End Date",
      "Start Time",
      "End Time",
      "Is 2-Day Event",
      "Schedule Label",
      "Venue Location",
      "Max Capacity",
      "Confirmed Registrations",
      "Slot 1 First-Choice Count",
      "Available Seats",
      "Fill Percentage",
      "Status",
      "Coordinator Names",
      "Coordinator Mobiles",
      "Coordinator Emails",
      "WhatsApp Group Link",
      "Brochure PDF URL",
      "Description",
      "Rules & Guidelines",
    ];

    const escapeCSV = (val?: string | number | null | boolean) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = listToExport.map((evt, idx) => {
      const sched = getEventSchedule(evt);
      const regCount = (evt.registrations || []).length;
      const firstSlotCount = (evt.registrations || []).filter((r) => r.slot_number === 1).length;
      const limit = evt.participant_limit || 100;
      const available = Math.max(0, limit - regCount);
      const fillPct = Math.min(100, Math.round((regCount / limit) * 100));

      const meta = parseEventMetadata({
        ...evt,
        school_or_dept: evt.school_or_dept || "",
        venue: evt.venue || "",
        event_date: evt.event_date || "",
        start_time: evt.start_time || "",
        end_time: evt.end_time || "",
        registration_fee: evt.registration_fee || 0,
        participant_limit: limit,
        is_pro_event: Boolean(evt.is_pro_event),
      } as any);

      return [
        (idx + 1).toString(),
        escapeCSV(evt.name),
        escapeCSV(evt.slug),
        escapeCSV(evt.school_or_dept || "KARE"),
        escapeCSV(evt.category?.name || "General Track"),
        escapeCSV(evt.is_pro_event ? "Flagship" : "Regular"),
        escapeCSV(evt.event_date || sched.startDate),
        escapeCSV(sched.startDate),
        escapeCSV(sched.endDate),
        escapeCSV(sched.startTime),
        escapeCSV(sched.endTime),
        escapeCSV(sched.isTwoDay ? "YES" : "NO"),
        escapeCSV(sched.displaySchedule),
        escapeCSV(evt.venue || "Campus Venue"),
        limit.toString(),
        regCount.toString(),
        firstSlotCount.toString(),
        available.toString(),
        `${fillPct}%`,
        escapeCSV(evt.status),
        escapeCSV(meta.names || (evt as any).coordinator_names || ""),
        escapeCSV(meta.mobiles || (evt as any).coordinator_mobiles || ""),
        escapeCSV(meta.emails || (evt as any).coordinator_emails || ""),
        escapeCSV(meta.whatsappLink || (evt as any).whatsapp_link || ""),
        escapeCSV(meta.brochureUrl || (evt as any).brochure_url || ""),
        escapeCSV(meta.cleanDescription || evt.description || ""),
        escapeCSV(Array.isArray((evt as any).rules) ? (evt as any).rules.join(" | ") : (evt as any).rules || ""),
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Euphoria_2026_Events_Master_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search, Filters and Export Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event title, category, venue, or school..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as "all" | "pro" | "normal")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-xs"
          >
            <option value="all">All Tiers</option>
            <option value="pro">⭐ Flagship Events Only</option>
            <option value="normal">⚡ Regular Events Only</option>
          </select>

          {/* Status Filter */}
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="registration_open">Registration Open</option>
            <option value="published">Published</option>
            <option value="registration_closed">Registration Closed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={exportEventsCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Download full event catalog as CSV spreadsheet with all schedules, coordinates, and rules"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Export CSV ({filteredEvents.length})</span>
          </button>
        </div>
      </div>

      {/* Events Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Event Title &amp; Track</th>
                  <th className="px-5 py-3">Schedule &amp; Venue</th>
                  <th className="px-5 py-3">Seat Capacity</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEvents.map((evt) => {
                  const regCount = (evt.registrations || []).length;
                  const firstSlotCount = (evt.registrations || []).filter((r) => r.slot_number === 1).length;
                  const limit = evt.participant_limit || 100;
                  const fillPct = Math.min(100, Math.round((regCount / limit) * 100));
                  const isPro = Boolean(evt.is_pro_event);
                  const sched = getEventSchedule(evt);

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Title & Track */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{evt.name}</span>
                          {isPro && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              <span>FLAGSHIP</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-indigo-100">
                            {evt.category?.name || "Track"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {evt.school_or_dept || "KARE"}
                          </span>
                        </div>
                      </td>

                      {/* Schedule & Venue */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {sched.isTwoDay ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-indigo-950">25 – 26 Sep</span>
                                <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Day 1 &amp; 2
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 block font-normal">
                                {sched.startTime} → {sched.endTime}
                              </span>
                            </div>
                          ) : (
                            <span>
                              {sched.startDate ? formatDate(sched.startDate) : "TBA"} • {sched.startTime}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{evt.venue || "Campus Venue"}</span>
                        </div>
                      </td>

                      {/* Capacity Meter */}
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-900">
                          {regCount} <span className="text-slate-400 font-normal">/ {limit} Seats</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${
                                fillPct >= 90
                                  ? "bg-rose-500"
                                  : fillPct >= 60
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-semibold">{fillPct}%</span>
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          <span>1st Choice:</span>
                          <span className="font-mono">{firstSlotCount}</span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-5 py-3">
                        <select
                          value={evt.status}
                          onChange={(e) => handleStatusChange(evt.id, e.target.value)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 focus:border-primary focus:outline-none shadow-xs"
                        >
                          <option value="registration_open">Registration Open</option>
                          <option value="published">Published</option>
                          <option value="registration_closed">Closed</option>
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                          <option value="draft">Draft</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/events/${evt.id}/edit`}
                            title="Edit Event"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-primary transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(evt.id, evt.name)}
                            disabled={isDeleting === evt.id}
                            title="Delete Event"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No events matched your search filter.
          </div>
        )}
      </div>
    </div>
  );
}
