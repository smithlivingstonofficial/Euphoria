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
  Star,
  Sparkles,
  Layers,
  MapPin,
  Award,
} from "lucide-react";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";

interface RegistrationRow {
  id: string;
  slot_number?: number;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  pass?: {
    id?: string;
    pass_code?: string;
    pass_tier?: string;
    amount_paid?: number;
    slots_used?: number;
    status?: string;
  } | null;
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
    is_pro_event?: boolean;
    registration_fee?: number;
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
  const [selectedTier, setSelectedTier] = useState<"all" | "pro_pass" | "standard_pass">("all");
  const [selectedSlot, setSelectedSlot] = useState<"all" | "1" | "2">("all");
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
      const passCode = row.pass?.pass_code?.toLowerCase() || "";
      const eventName = row.event?.name?.toLowerCase() || "";

      const matchesSearch =
        !q ||
        studentName.includes(q) ||
        email.includes(q) ||
        regNo.includes(q) ||
        college.includes(q) ||
        code.includes(q) ||
        passCode.includes(q) ||
        eventName.includes(q);

      if (!matchesSearch) return false;

      // Event filter
      if (selectedEventId !== "all") {
        if ((row.event as any)?.id !== selectedEventId) {
          const matchEvent = allEvents.find((e) => e.id === selectedEventId);
          if (row.event?.name !== matchEvent?.name) return false;
        }
      }

      // Delegate Type filter
      if (selectedType !== "all") {
        if (row.user?.participant_type !== selectedType) return false;
      }

      // Pass Tier filter
      if (selectedTier !== "all") {
        const rowTier = row.pass?.pass_tier || (row.event?.is_pro_event ? "pro_pass" : "standard_pass");
        if (rowTier !== selectedTier) return false;
      }

      // Slot filter
      if (selectedSlot !== "all") {
        const slotNum = String(row.slot_number || 1);
        if (slotNum !== selectedSlot) return false;
      }

      // Attendance filter
      const isAttended = Array.isArray(row.attendance)
        ? row.attendance.length > 0
        : Boolean(row.attendance);

      if (selectedAttendance === "attended" && !isAttended) return false;
      if (selectedAttendance === "pending" && isAttended) return false;

      return true;
    });
  }, [
    registrations,
    searchQuery,
    selectedEventId,
    selectedType,
    selectedTier,
    selectedSlot,
    selectedAttendance,
    allEvents,
  ]);

  // Metric counts
  const totalAttendedCount = useMemo(() => {
    return registrations.filter((r) =>
      Array.isArray(r.attendance) ? r.attendance.length > 0 : Boolean(r.attendance)
    ).length;
  }, [registrations]);

  const proRegistrationsCount = useMemo(() => {
    return registrations.filter(
      (r) => r.pass?.pass_tier === "pro_pass" || Boolean(r.event?.is_pro_event)
    ).length;
  }, [registrations]);

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
      "Registration Code",
      "Master Pass Code",
      "Pass Tier",
      "Slot Number",
      "Student Name",
      "Email",
      "Mobile",
      "Register No",
      "Participant Type",
      "College / Dept",
      "Course & Year",
      "Competition",
      "Is Pro Event",
      "Date & Venue",
      "Attendance Status",
      "Scanned At",
      "Registration Date",
    ];

    const rows = filteredRows.map((r, idx) => {
      const isAttended = Array.isArray(r.attendance)
        ? r.attendance.length > 0
        : Boolean(r.attendance);
      const scannedAt = Array.isArray(r.attendance)
        ? r.attendance[0]?.scanned_at
        : (r.attendance as any)?.scanned_at;
      const passTier = r.pass?.pass_tier === "pro_pass" || r.event?.is_pro_event ? "Pro Pass" : "Standard Pass";

      return [
        idx + 1,
        `"${r.registration_code}"`,
        `"${r.pass?.pass_code || r.registration_code}"`,
        `"${passTier}"`,
        r.slot_number || 1,
        `"${r.user?.full_name || ""}"`,
        `"${r.user?.email || ""}"`,
        `"${r.user?.mobile_number || ""}"`,
        `"${r.user?.register_number || ""}"`,
        `"${r.user?.participant_type || ""}"`,
        `"${r.user?.college_name || r.user?.department || ""}"`,
        `"${r.user?.course || ""} Year ${r.user?.year_of_study || ""}"`,
        `"${r.event?.name || ""}"`,
        r.event?.is_pro_event ? "Yes" : "No",
        `"${r.event?.event_date || ""} - ${r.event?.venue || ""}"`,
        `"${isAttended ? "Present" : "Pending"}"`,
        `"${scannedAt ? new Date(scannedAt).toLocaleString() : ""}"`,
        `"${new Date(r.created_at).toLocaleString()}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `euphoria_2026_registrations_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedEventId("all");
    setSelectedType("all");
    setSelectedTier("all");
    setSelectedSlot("all");
    setSelectedAttendance("all");
  };

  const hasFilters =
    searchQuery !== "" ||
    selectedEventId !== "all" ||
    selectedType !== "all" ||
    selectedTier !== "all" ||
    selectedSlot !== "all" ||
    selectedAttendance !== "all";

  return (
    <div className="space-y-5">
      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Bookings</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
            {registrations.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across 61 competitions
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>Pro Allocations</span>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
            {proRegistrationsCount}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5">
            ₹300 Tier Bookings
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Check-in Attendance</span>
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono mt-0.5">
            {totalAttendedCount}
          </div>
          <div className="text-[11px] text-emerald-800 mt-0.5">
            Verified Check-ins
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs">
          <div className="text-xs font-bold text-indigo-900 flex items-center gap-1">
            <Users className="h-3 w-3 text-primary" />
            <span>Filtered Matches</span>
          </div>
          <div className="text-2xl font-black text-indigo-950 font-mono mt-0.5">
            {filteredRows.length}
          </div>
          <div className="text-[11px] text-indigo-800 mt-0.5">
            Matching current filters
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by participant name, pass code, reg no, college, or event..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV ({filteredRows.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none appearance-none truncate cursor-pointer"
          >
            <option value="all">All 61 Events</option>
            {allEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>

          {/* Pass Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Pass Tiers</option>
            <option value="pro_pass">⭐ Pro Pass (₹300)</option>
            <option value="standard_pass">📌 Standard Pass (₹200)</option>
          </select>

          {/* Slot Number Filter */}
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Slots (1 &amp; 2)</option>
            <option value="1">Slot #1 Only</option>
            <option value="2">Slot #2 Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">Internal &amp; External</option>
            <option value="internal">KARE Internal</option>
            <option value="external">External Delegates</option>
          </select>

          {/* Attendance Filter */}
          <select
            value={selectedAttendance}
            onChange={(e) => setSelectedAttendance(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Attendance</option>
            <option value="attended">✅ Present / Checked In</option>
            <option value="pending">⏳ Pending Check-In</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Pass &amp; Slot</th>
                <th className="px-4 py-3.5">Participant Details</th>
                <th className="px-4 py-3.5">Institution / Dept</th>
                <th className="px-4 py-3.5">Registered Event</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Attendance</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const isAttended = Array.isArray(row.attendance)
                    ? row.attendance.length > 0
                    : Boolean(row.attendance);
                  const attendanceData = Array.isArray(row.attendance)
                    ? row.attendance[0]
                    : (row.attendance as any);
                  const isPro = row.pass?.pass_tier === "pro_pass" || row.event?.is_pro_event;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Pass Code & Slot */}
                      <td className="px-4 py-3 font-mono">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 block">
                            {row.registration_code}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {isPro ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-extrabold px-1.5 py-0.2 text-[9px]">
                                <Star className="h-2.5 w-2.5 fill-amber-500" />
                                <span>PRO</span>
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[9px] font-bold">
                                STD
                              </span>
                            )}
                            <span className="rounded bg-indigo-50 text-primary px-1.5 py-0.2 text-[9px] font-bold">
                              Slot #{row.slot_number || 1}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Participant Details */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {row.user?.full_name || "Anonymous Participant"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {row.user?.email}
                          </div>
                          {row.user?.mobile_number && (
                            <div className="text-[10px] text-slate-400">
                              Tel: {row.user?.mobile_number}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* College / Institution */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 max-w-[200px]">
                          <span
                            className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold border ${
                              row.user?.participant_type === "internal"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-purple-50 text-purple-800 border-purple-200"
                            }`}
                          >
                            {row.user?.participant_type === "internal"
                              ? "KARE Internal"
                              : "External"}
                          </span>
                          <div className="font-semibold text-slate-800 truncate text-[11px]">
                            {row.user?.college_name || row.user?.department || "Kalasalingam Academy"}
                          </div>
                          {row.user?.register_number && (
                            <div className="text-[10px] font-mono text-slate-500">
                              Reg: {row.user?.register_number}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Event */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 max-w-[220px]">
                          <div className="font-bold text-slate-900 truncate">
                            {row.event?.name || "Euphoria Event"}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{row.event?.venue}</span>
                          </div>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold capitalize ${
                            row.payment_status === "paid" || row.payment_status === "not_required"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{row.payment_status === "not_required" ? "Pass Slot" : row.payment_status}</span>
                        </span>
                      </td>

                      {/* Attendance Status */}
                      <td className="px-4 py-3">
                        {isAttended ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold">
                              <Check className="h-3 w-3 text-emerald-700" />
                              <span>Present</span>
                            </span>
                            {attendanceData?.scanned_at && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {formatTime(attendanceData.scanned_at.split("T")[1] || "")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {!isAttended && (
                          <button
                            type="button"
                            onClick={() => handleManualCheckIn(row.id)}
                            disabled={processingId === row.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>Check-In</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No participant registrations found matching current filter criteria.
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
