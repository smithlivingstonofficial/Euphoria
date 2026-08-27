"use client";

import { useState, useMemo } from "react";
import { manualAttendanceCheckIn } from "@/actions/admin";
import {
  Search,
  CheckCircle2,
  Users,
  Calendar,
  Building,
  FileSpreadsheet,
  QrCode,
  Clock,
  Check,
  Filter,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface RegistrationRow {
  id: string;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    mobile_number?: string;
    register_number?: string;
    college_name?: string;
    department?: string;
    course?: string;
    year_of_study?: number;
    participant_type: "internal" | "external";
  } | null;
  event?: {
    id: string;
    name: string;
    event_date: string;
    venue: string;
    category?: {
      name: string;
    } | null;
  } | null;
  attendance?: Array<{
    id: string;
    scanned_at: string;
    scan_method: string;
  }> | { id: string; scanned_at: string; scan_method: string } | null;
}

interface EventItem {
  id: string;
  name: string;
  school_or_dept: string;
}

export function MasterRegistrationsClient({
  initialRegistrations,
  allEvents,
}: {
  initialRegistrations: RegistrationRow[];
  allEvents: EventItem[];
}) {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>(initialRegistrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [selectedType, setSelectedType] = useState<"all" | "internal" | "external">("all");
  const [selectedAttendance, setSelectedAttendance] = useState<"all" | "attended" | "pending">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filtered registrations
  const filteredRows = useMemo(() => {
    return registrations.filter((row) => {
      const q = searchQuery.trim().toLowerCase();
      const studentName = row.user?.full_name?.toLowerCase() || "";
      const email = row.user?.email?.toLowerCase() || "";
      const regNo = row.user?.register_number?.toLowerCase() || "";
      const college = row.user?.college_name?.toLowerCase() || "";
      const code = row.registration_code?.toLowerCase() || "";
      const eventName = row.event?.name?.toLowerCase() || "";

      const matchesSearch =
        !q ||
        studentName.includes(q) ||
        email.includes(q) ||
        regNo.includes(q) ||
        college.includes(q) ||
        code.includes(q) ||
        eventName.includes(q);

      if (!matchesSearch) return false;

      // Event filter
      if (selectedEventId !== "all") {
        if ((row.event as any)?.id !== selectedEventId) {
          // Check if matches event
          const matchEvent = allEvents.find((e) => e.id === selectedEventId);
          if (row.event?.name !== matchEvent?.name) return false;
        }
      }

      // Delegate Type filter
      if (selectedType !== "all") {
        if (row.user?.participant_type !== selectedType) return false;
      }

      // Attendance filter
      const isAttended = Array.isArray(row.attendance)
        ? row.attendance.length > 0
        : Boolean(row.attendance);

      if (selectedAttendance === "attended" && !isAttended) return false;
      if (selectedAttendance === "pending" && isAttended) return false;

      return true;
    });
  }, [registrations, searchQuery, selectedEventId, selectedType, selectedAttendance, allEvents]);

  const handleManualCheckIn = async (regId: string) => {
    setProcessingId(regId);
    const res = await manualAttendanceCheckIn(regId);
    if (res.success) {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === regId
            ? {
                ...r,
                attendance: {
                  id: Math.random().toString(),
                  scanned_at: new Date().toISOString(),
                  scan_method: "manual_search",
                },
              }
            : r
        )
      );
    }
    setProcessingId(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Pass Code",
      "Student Name",
      "Email",
      "Register No",
      "Participant Type",
      "College / Dept",
      "Competition Registered",
      "Date & Venue",
      "Attendance Status",
      "Registration Date",
    ];

    const rows = filteredRows.map((r, idx) => {
      const isAttended = Array.isArray(r.attendance)
        ? r.attendance.length > 0
        : Boolean(r.attendance);

      return [
        idx + 1,
        `"${r.registration_code}"`,
        `"${r.user?.full_name || ""}"`,
        `"${r.user?.email || ""}"`,
        `"${r.user?.register_number || ""}"`,
        `"${r.user?.participant_type || ""}"`,
        `"${r.user?.college_name || r.user?.department || ""}"`,
        `"${r.event?.name || ""}"`,
        `"${r.event?.event_date || ""} - ${r.event?.venue || ""}"`,
        `"${isAttended ? "Present / Checked In" : "Pending"}"`,
        `"${new Date(r.created_at).toLocaleString()}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Euphoria_2026_Master_Registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRegistered = registrations.length;
  const totalAttended = registrations.filter((r) =>
    Array.isArray(r.attendance) ? r.attendance.length > 0 : Boolean(r.attendance)
  ).length;

  return (
    <div className="space-y-6">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Total Pass Registrations
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {totalRegistered}
          </div>
          <p className="text-[11px] text-slate-500">Across all 61 competitions</p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Checked In Attendance
          </span>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {totalAttended}
          </div>
          <p className="text-[11px] text-slate-500">Gate verified participants</p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            KARE Internal Delegates
          </span>
          <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
            {registrations.filter((r) => r.user?.participant_type === "internal").length}
          </div>
          <p className="text-[11px] text-slate-500">University students</p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            External Delegates
          </span>
          <div className="text-2xl font-black text-purple-700 font-mono mt-1">
            {registrations.filter((r) => r.user?.participant_type === "external").length}
          </div>
          <p className="text-[11px] text-slate-500">Out-station delegates</p>
        </div>
      </div>

      {/* Search & Filter Control Hub */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number, college, pass code, or competition..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Master CSV</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100 text-xs">
          {/* Event Filter */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Filter by Competition
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-2xs truncate"
            >
              <option value="all">All 61 Official Competitions</option>
              {allEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.school_or_dept})
                </option>
              ))}
            </select>
          </div>

          {/* Delegate Type Filter */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Delegate Classification
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-2xs"
            >
              <option value="all">All Delegate Types</option>
              <option value="internal">KARE Internal Students</option>
              <option value="external">External University Delegates</option>
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Attendance Gate Status
            </label>
            <select
              value={selectedAttendance}
              onChange={(e) => setSelectedAttendance(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="attended">Checked In / Present</option>
              <option value="pending">Pending Check-in</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Registrations Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-900 font-bold">{filteredRows.length}</strong> of{" "}
            {registrations.length} master registration entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Student Delegate</th>
                <th className="px-5 py-3.5">Competition Registered</th>
                <th className="px-5 py-3.5">Pass Code</th>
                <th className="px-5 py-3.5">Gate Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRows.length > 0 ? (
                filteredRows.map((r) => {
                  const isAttended = Array.isArray(r.attendance)
                    ? r.attendance.length > 0
                    : Boolean(r.attendance);
                  const attRecord = Array.isArray(r.attendance)
                    ? r.attendance[0]
                    : r.attendance;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Student Details */}
                      <td className="px-5 py-3.5">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {r.user?.full_name || "Delegate"}
                        </div>
                        <div className="text-[11px] text-slate-500">{r.user?.email}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${
                              r.user?.participant_type === "internal"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {r.user?.participant_type === "internal" ? "KARE" : "External"}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {r.user?.college_name || r.user?.department}
                          </span>
                        </div>
                      </td>

                      {/* Competition Details */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">
                          {r.event?.name || "Competition"}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>
                            {r.event?.event_date ? formatDate(r.event.event_date) : "TBA"} •{" "}
                            {r.event?.venue}
                          </span>
                        </div>
                      </td>

                      {/* Pass Code */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                          {r.registration_code}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {formatDate(r.created_at)}
                        </div>
                      </td>

                      {/* Attendance Action */}
                      <td className="px-5 py-3.5">
                        {isAttended ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Verified Present</span>
                            </span>
                            {attRecord?.scanned_at && (
                              <div className="text-[10px] text-slate-400">
                                {new Date(attRecord.scanned_at).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleManualCheckIn(r.id)}
                            disabled={processingId === r.id}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {processingId === r.id ? (
                              <span>Marking...</span>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Check In</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-xs text-slate-400">
                    No registrations match your search filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
