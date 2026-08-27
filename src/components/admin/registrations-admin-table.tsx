"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  QrCode,
  CheckCircle2,
  Clock,
  UserCheck,
  FileSpreadsheet,
  Building,
  Phone,
  Mail,
  X,
  CreditCard,
  Sparkles,
  Download,
} from "lucide-react";
import { manualAttendanceCheckIn, updateRegistrationStatus } from "@/actions/admin";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

interface RegistrationItem {
  id: string;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  qr_secret_nonce?: string;
  user?: any;
  event?: any;
  attendance?: Array<{
    id: string;
    scanned_at: string;
    scan_method: string;
  }>;
}

export function RegistrationsAdminTable({
  initialRegistrations,
  eventsList,
}: {
  initialRegistrations: RegistrationItem[];
  eventsList: Array<{ id: string; name: string }>;
}) {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>(initialRegistrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [selectedReg, setSelectedReg] = useState<RegistrationItem | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Filtered registrations
  const filtered = useMemo(() => {
    return registrations.filter((reg) => {
      const q = searchQuery.toLowerCase();
      const user = Array.isArray(reg.user) ? reg.user[0] : reg.user;
      const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;

      const matchesSearch =
        reg.registration_code.toLowerCase().includes(q) ||
        (user?.full_name && user.full_name.toLowerCase().includes(q)) ||
        (user?.email && user.email.toLowerCase().includes(q)) ||
        (user?.mobile_number && user.mobile_number.includes(q)) ||
        (user?.college_name && user.college_name.toLowerCase().includes(q)) ||
        (user?.register_number && user.register_number.toLowerCase().includes(q)) ||
        (event?.name && event.name.toLowerCase().includes(q));

      const matchesEvent = eventFilter === "all" ? true : event?.id === eventFilter;
      const matchesType = typeFilter === "all" ? true : user?.participant_type === typeFilter;
      const isCheckedIn = (reg.attendance || []).length > 0;
      const matchesAttendance =
        attendanceFilter === "all"
          ? true
          : attendanceFilter === "checked_in"
          ? isCheckedIn
          : !isCheckedIn;

      return matchesSearch && matchesEvent && matchesType && matchesAttendance;
    });
  }, [registrations, searchQuery, eventFilter, typeFilter, attendanceFilter]);

  // Handle Manual Attendance Check-In
  const handleCheckIn = async (regId: string) => {
    setIsProcessing(regId);
    const res = await manualAttendanceCheckIn(regId);
    if (res.success) {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === regId
            ? {
                ...r,
                attendance: [
                  {
                    id: "temp",
                    scanned_at: new Date().toISOString(),
                    scan_method: "manual_search",
                  },
                ],
              }
            : r
        )
      );
      if (selectedReg && selectedReg.id === regId) {
        setSelectedReg((prev) =>
          prev
            ? {
                ...prev,
                attendance: [
                  {
                    id: "temp",
                    scanned_at: new Date().toISOString(),
                    scan_method: "manual_search",
                  },
                ],
              }
            : null
        );
      }
    } else {
      alert(res.error || "Check-in failed");
    }
    setIsProcessing(null);
  };

  // Export Filtered Table to CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert("No records to export.");
      return;
    }

    const headers = [
      "Pass Code",
      "Participant Name",
      "Email",
      "Mobile",
      "Participant Type",
      "College / University",
      "Department",
      "Year",
      "Register No",
      "Event Name",
      "Fee",
      "Payment Status",
      "Check-In Status",
      "Check-In Time",
      "Registration Date",
    ];

    const rows = filtered.map((r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const e = Array.isArray(r.event) ? r.event[0] : r.event;
      const att = (r.attendance || [])[0];

      return [
        r.registration_code,
        `"${u?.full_name || ""}"`,
        u?.email || "",
        u?.mobile_number || "",
        u?.participant_type === "internal" ? "KARE Internal" : "External",
        `"${u?.college_name || (u?.participant_type === "internal" ? "KARE" : "")}"`,
        `"${u?.department || ""}"`,
        u?.year_of_study ? `${u.year_of_study} Year` : "",
        u?.register_number || "",
        `"${e?.name || ""}"`,
        e?.registration_fee ?? 0,
        r.payment_status,
        att ? "Checked In" : "Pending",
        att ? att.scanned_at : "",
        r.created_at,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Euphoria_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Multi-Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by participant name, pass code, email, mobile, or college..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none shadow-xs"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-xs"
          >
            <option value="all">All Events</option>
            {eventsList.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-xs"
          >
            <option value="all">All Participants</option>
            <option value="internal">KARE Internal</option>
            <option value="external">External</option>
          </select>

          {/* Attendance Filter */}
          <select
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none shadow-xs"
          >
            <option value="all">All Attendance</option>
            <option value="checked_in">Checked In</option>
            <option value="pending">Pending Scan</option>
          </select>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Counter summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-800 font-semibold">{filtered.length}</strong> of{" "}
          {registrations.length} registrations
        </span>
      </div>

      {/* Registrations Master Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Pass Code</th>
                  <th className="px-4 py-3">Participant Details</th>
                  <th className="px-4 py-3">Institution & Dept</th>
                  <th className="px-4 py-3">Registered Event</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Check-In</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((reg) => {
                  const user = Array.isArray(reg.user) ? reg.user[0] : reg.user;
                  const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
                  const isCheckedIn = (reg.attendance || []).length > 0;

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReg(reg)}
                          className="hover:text-primary transition-colors underline decoration-dotted"
                        >
                          {reg.registration_code}
                        </button>
                      </td>

                      {/* Participant */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {user?.full_name || "Participant"}
                        </div>
                        <div className="text-[11px] text-slate-500">{user?.email}</div>
                        {user?.mobile_number && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            +91 {user.mobile_number}
                          </div>
                        )}
                      </td>

                      {/* Institution */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border mb-0.5 ${
                            user?.participant_type === "internal"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {user?.participant_type === "internal"
                            ? `KARE (${user?.register_number || "Internal"})`
                            : user?.college_name || "External"}
                        </span>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                          {user?.department || "General"}
                        </div>
                      </td>

                      {/* Event */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{event?.name || "Event"}</div>
                        <div className="text-[11px] text-slate-400">
                          {event?.category?.name || "Track"}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                            reg.payment_status === "paid" || reg.payment_status === "not_required"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {reg.payment_status === "paid"
                            ? "Paid"
                            : reg.payment_status === "not_required"
                            ? "Free"
                            : "Pending"}
                        </span>
                      </td>

                      {/* Check-In */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                            isCheckedIn
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isCheckedIn ? "Checked In" : "Pending"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedReg(reg)}
                            title="Inspect QR Pass"
                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>

                          {!isCheckedIn ? (
                            <button
                              onClick={() => handleCheckIn(reg.id)}
                              disabled={isProcessing === reg.id}
                              title="Mark Check-In Attendance"
                              className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                              {isProcessing === reg.id ? "Checking..." : "Check In"}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold px-2 py-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Verified</span>
                            </span>
                          )}
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
            No participant registrations matched your search criteria.
          </div>
        )}
      </div>

      {/* Pass Inspection Modal */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            {/* Close Button */}
            <button
              onClick={() => setSelectedReg(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Digital Pass &amp; Participant File
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  {selectedReg.registration_code}
                </p>
              </div>
            </div>

            {/* Pass QR Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center space-y-2">
              <div className="text-xs font-bold text-slate-800">
                {Array.isArray(selectedReg.event) ? selectedReg.event[0]?.name : selectedReg.event?.name}
              </div>
              <div className="inline-flex items-center justify-center rounded-lg bg-white p-3 border border-slate-200 shadow-xs">
                {/* Visual QR Simulator */}
                <div className="h-28 w-28 bg-slate-900 flex flex-col items-center justify-center text-white rounded p-2 text-center">
                  <QrCode className="h-16 w-16 text-white mb-1" />
                  <span className="text-[9px] font-mono leading-none">
                    {selectedReg.registration_code}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                Signed cryptographic QR pass token
              </div>
            </div>

            {/* Participant Profile Breakdown */}
            {(() => {
              const u = Array.isArray(selectedReg.user) ? selectedReg.user[0] : selectedReg.user;
              const isCheckedIn = (selectedReg.attendance || []).length > 0;

              return (
                <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Full Name</span>
                    <strong className="text-slate-800">{u?.full_name}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Email</span>
                    <span className="font-mono text-slate-800">{u?.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Mobile Phone</span>
                    <span className="font-mono text-slate-800">+91 {u?.mobile_number}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Affiliation</span>
                    <span className="font-semibold text-slate-800">
                      {u?.participant_type === "internal"
                        ? `KARE (${u.register_number})`
                        : u?.college_name}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Department</span>
                    <span className="text-slate-800">{u?.department}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Check-in Status</span>
                    <span
                      className={`font-bold ${
                        isCheckedIn ? "text-purple-600" : "text-amber-600"
                      }`}
                    >
                      {isCheckedIn ? "Checked In" : "Pending Check-In"}
                    </span>
                  </div>

                  {/* Actions inside modal */}
                  <div className="pt-3 flex gap-2">
                    {!isCheckedIn && (
                      <button
                        onClick={() => handleCheckIn(selectedReg.id)}
                        disabled={isProcessing === selectedReg.id}
                        className="flex-1 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
                      >
                        {isProcessing === selectedReg.id ? "Checking In..." : "Confirm Check-In"}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedReg(null)}
                      className="flex-1 rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close Pass
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
