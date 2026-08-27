"use client";

import { useState, useMemo } from "react";
import { recordAttendanceCoordinator } from "@/actions/coordinator";
import {
  Search,
  CheckCircle2,
  Clock,
  User,
  Building,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface AttendeeItem {
  id: string;
  registration_code: string;
  status: string;
  payment_status: string;
  registered_at: string;
  isAttended: boolean;
  scanned_at?: string | null;
  scan_method?: string | null;
  user: {
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
  };
}

export function EventRosterClient({
  eventId,
  eventName,
  initialAttendees,
}: {
  eventId: string;
  eventName: string;
  initialAttendees: AttendeeItem[];
}) {
  const [attendees, setAttendees] = useState<AttendeeItem[]>(initialAttendees);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "attended" | "pending">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        a.user.full_name.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        (a.user.register_number && a.user.register_number.toLowerCase().includes(q)) ||
        (a.user.college_name && a.user.college_name.toLowerCase().includes(q)) ||
        a.registration_code.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterTab === "attended") return a.isAttended;
      if (filterTab === "pending") return !a.isAttended;
      return true;
    });
  }, [attendees, searchQuery, filterTab]);

  const handleToggleAttendance = async (item: AttendeeItem) => {
    if (item.isAttended) return; // already recorded

    setProcessingId(item.id);
    const res = await recordAttendanceCoordinator({
      eventId,
      registrationCode: item.registration_code,
      scanMethod: "manual_search",
    });

    if (res.success) {
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? {
                ...a,
                isAttended: true,
                scanned_at: new Date().toISOString(),
                scan_method: "manual_search",
              }
            : a
        )
      );
    }
    setProcessingId(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Registration Code",
      "Full Name",
      "Email",
      "Register Number",
      "Participant Type",
      "College / Dept",
      "Course & Year",
      "Mobile",
      "Attendance Status",
      "Scanned At",
    ];

    const rows = attendees.map((a, idx) => [
      idx + 1,
      `"${a.registration_code}"`,
      `"${a.user.full_name}"`,
      `"${a.user.email}"`,
      `"${a.user.register_number || ""}"`,
      `"${a.user.participant_type}"`,
      `"${a.user.college_name || a.user.department || ""}"`,
      `"${a.user.course || ""} Year ${a.user.year_of_study || ""}"`,
      `"${a.user.mobile_number || ""}"`,
      `"${a.isAttended ? "Present" : "Absent / Pending"}"`,
      `"${a.scanned_at ? new Date(a.scanned_at).toLocaleString() : ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${eventName.replace(/[^a-zA-Z0-9]/g, "_")}_Roster.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const attendedCount = attendees.filter((a) => a.isAttended).length;
  const pendingCount = attendees.length - attendedCount;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attendees by name, email, roll number, or pass code..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80 shrink-0">
          <button
            onClick={() => setFilterTab("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filterTab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All ({attendees.length})
          </button>
          <button
            onClick={() => setFilterTab("attended")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filterTab === "attended"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Checked In ({attendedCount})
          </button>
          <button
            onClick={() => setFilterTab("pending")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filterTab === "pending"
                ? "bg-white text-amber-800 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {/* CSV Export */}
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>Export Roster CSV</span>
        </button>
      </div>

      {/* Attendees Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">Participant Details</th>
              <th className="px-4 py-3">College &amp; Dept</th>
              <th className="px-4 py-3">Pass Code</th>
              <th className="px-4 py-3">Attendance Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredAttendees.length > 0 ? (
              filteredAttendees.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Participant Name & Contact */}
                  <td className="px-4 py-3.5">
                    <div className="font-extrabold text-slate-900 text-sm">
                      {a.user.full_name}
                    </div>
                    <div className="text-[11px] text-slate-500">{a.user.email}</div>
                    {a.user.mobile_number && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Ph: {a.user.mobile_number}
                      </div>
                    )}
                  </td>

                  {/* Institution */}
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-800">
                      {a.user.college_name || a.user.department || "KARE"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {a.user.register_number ? `Reg: ${a.user.register_number}` : ""}
                      {a.user.course ? ` • ${a.user.course}` : ""}
                    </div>
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.2 text-[9px] font-bold border mt-1 ${
                        a.user.participant_type === "internal"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}
                    >
                      {a.user.participant_type === "internal" ? "KARE Internal" : "External Delegate"}
                    </span>
                  </td>

                  {/* Registration Code */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80">
                      {a.registration_code}
                    </span>
                  </td>

                  {/* Attendance Check-in Button */}
                  <td className="px-4 py-3.5">
                    {a.isAttended ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Checked In</span>
                        </span>
                        {a.scanned_at && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{new Date(a.scanned_at).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleAttendance(a)}
                        disabled={processingId === a.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {processingId === a.id ? (
                          <span>Marking...</span>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Present</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-xs text-slate-400">
                  No attendees match your search filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
