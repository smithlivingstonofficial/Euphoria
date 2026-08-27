"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  CreditCard,
  Building,
  Sparkles,
  Printer,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RegistrationItem {
  id: string;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  user?: any;
  event?: any;
  attendance?: Array<{
    id: string;
    scanned_at: string;
    scan_method: string;
  }>;
}

export function ReportsExporter({
  registrations,
  events,
}: {
  registrations: RegistrationItem[];
  events: Array<{ id: string; name: string; registration_fee?: number | null }>;
}) {
  const [selectedEventId, setSelectedEventId] = useState("all");

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Participant Master Directory
  const exportParticipantDirectory = () => {
    const userMap = new Map<string, RegistrationItem["user"]>();
    registrations.forEach((r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      if (u && !userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    });

    const headers = [
      "Full Name",
      "Email Address",
      "Mobile Number",
      "Participant Type",
      "College / University",
      "City",
      "Degree",
      "Department",
      "Year",
      "Register No",
    ];

    const rows = Array.from(userMap.values()).map((u) => [
      `"${u?.full_name || ""}"`,
      u?.email || "",
      u?.mobile_number || "",
      u?.participant_type === "internal" ? "KARE Internal" : "External",
      `"${u?.college_name || (u?.participant_type === "internal" ? "KARE" : "")}"`,
      `"${u?.city || ""}"`,
      `"${u?.course || ""}"`,
      `"${u?.department || ""}"`,
      u?.year_of_study ? `${u.year_of_study} Year` : "",
      u?.register_number || "",
    ]);

    downloadCSV(
      `Euphoria_Participant_Directory_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  // 2. Attendance & Signature Log Sheet
  const exportAttendanceSheet = () => {
    let targetRegs = registrations;
    if (selectedEventId !== "all") {
      targetRegs = targetRegs.filter((r) => {
        const e = Array.isArray(r.event) ? r.event[0] : r.event;
        return e?.id === selectedEventId;
      });
    }

    const headers = [
      "Pass Code",
      "Participant Name",
      "College Name",
      "Department",
      "Mobile Phone",
      "Event Name",
      "Venue",
      "Check-In Status",
      "Scan Timestamp",
      "Physical Signature / Remarks",
    ];

    const rows = targetRegs.map((r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const e = Array.isArray(r.event) ? r.event[0] : r.event;
      const att = (r.attendance || [])[0];

      return [
        r.registration_code,
        `"${u?.full_name || ""}"`,
        `"${u?.college_name || (u?.participant_type === "internal" ? "KARE" : "")}"`,
        `"${u?.department || ""}"`,
        u?.mobile_number || "",
        `"${e?.name || ""}"`,
        `"${e?.venue || ""}"`,
        att ? "Checked In" : "Pending",
        att ? att.scanned_at : "",
        '""', // Blank for physical signature
      ];
    });

    downloadCSV(
      `Euphoria_Attendance_Signature_Sheet_${selectedEventId}_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  // 3. Financial Revenue Report
  const exportRevenueReport = () => {
    const headers = [
      "Event Name",
      "Registration Fee",
      "Paid Registrations",
      "Free Registrations",
      "Total Registrations",
      "Total Revenue (INR)",
    ];

    const eventStats = new Map<
      string,
      { name: string; fee: number; paid: number; free: number; total: number }
    >();

    events.forEach((evt) => {
      eventStats.set(evt.id, {
        name: evt.name,
        fee: Number(evt.registration_fee || 0),
        paid: 0,
        free: 0,
        total: 0,
      });
    });

    registrations.forEach((r) => {
      const e = Array.isArray(r.event) ? r.event[0] : r.event;
      if (e && eventStats.has(e.id)) {
        const stat = eventStats.get(e.id)!;
        stat.total += 1;
        if (r.payment_status === "paid") {
          stat.paid += 1;
        } else if (r.payment_status === "not_required") {
          stat.free += 1;
        }
      }
    });

    const rows = Array.from(eventStats.values()).map((s) => [
      `"${s.name}"`,
      s.fee.toString(),
      s.paid.toString(),
      s.free.toString(),
      s.total.toString(),
      (s.paid * s.fee).toString(),
    ]);

    downloadCSV(
      `Euphoria_Revenue_Report_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  // 4. Institution Breakdown
  const exportInstitutionBreakdown = () => {
    const collegeCounts = new Map<string, number>();

    registrations.forEach((r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const college =
        u?.participant_type === "internal"
          ? "Kalasalingam Academy of Research and Education (KARE)"
          : u?.college_name || "Unknown College";

      collegeCounts.set(college, (collegeCounts.get(college) || 0) + 1);
    });

    const headers = ["College / University Name", "Total Participants Registered"];
    const rows = Array.from(collegeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => [`"${name}"`, count.toString()]);

    downloadCSV(
      `Euphoria_Institution_Breakdown_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Report 1: Participant Master Directory */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Participant Master Directory CSV
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Exhaustive database export of all registered students with verified mobile numbers, college affiliations, degrees, and emails.
          </p>
        </div>

        <button
          onClick={exportParticipantDirectory}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Master Directory CSV</span>
        </button>
      </div>

      {/* Report 2: Attendance & Signature Log Sheet */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Printer className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Printable Attendance &amp; Signature Sheet
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pre-formatted spreadsheet with check-in timestamps and physical signature columns for offline desk coordinators.
          </p>

          <div className="pt-1">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none"
            >
              <option value="all">All Events Combined</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={exportAttendanceSheet}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Attendance Sheet CSV</span>
        </button>
      </div>

      {/* Report 3: Financial Revenue Settlement */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Financial Revenue &amp; Accounts Settlement
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Detailed revenue audit broken down by event track, paid tickets, free passes, and total collected funds.
          </p>
        </div>

        <button
          onClick={exportRevenueReport}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Revenue Summary CSV</span>
        </button>
      </div>

      {/* Report 4: Institution & College Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Building className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            University &amp; College Breakdown
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ranked list of participating institutions and universities with total student turnouts for institutional trophies.
          </p>
        </div>

        <button
          onClick={exportInstitutionBreakdown}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Institution Breakdown CSV</span>
        </button>
      </div>
    </div>
  );
}
