"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  Layers,
  Building,
  Clock,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { bulkUploadEventsAdmin, getMasterEventsPreset } from "@/actions/admin";

interface ParsedEventRow {
  name: string;
  school: string;
  category: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  registration_fee: number | string;
  participant_limit: number | string;
  min_team_size?: number | string;
  max_team_size?: number | string;
  short_description?: string;
  rules?: string;
  status?: string;
  is_pro_event?: boolean;
}

export function BulkUploadEvents({
  initialPresetCount = 61,
}: {
  initialPresetCount?: number;
}) {
  const [events, setEvents] = useState<ParsedEventRow[]>([]);
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count?: number;
    errors?: string[];
  } | null>(null);

  // 1. Load Server Master CSV Preset
  const handleLoadPreset = async () => {
    setIsLoadingPreset(true);
    setImportResult(null);

    const res = await getMasterEventsPreset();
    if (res.success && res.events) {
      setEvents(res.events as unknown as ParsedEventRow[]);
    } else {
      alert(res.error || "Failed to load master CSV");
    }
    setIsLoadingPreset(false);
  };

  // 2. Parse Custom Client CSV Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert("The uploaded CSV file is empty.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const parsed: ParsedEventRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV row respecting quotes
        const row: string[] = [];
        let inQuotes = false;
        let cur = "";

        for (const char of lines[i]) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === "," && !inQuotes) {
            row.push(cur.trim().replace(/^"|"$/g, ""));
            cur = "";
          } else {
            cur += char;
          }
        }
        row.push(cur.trim().replace(/^"|"$/g, ""));

        if (row.length >= 2 && row[0]) {
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = row[idx] || "";
          });

          const schoolName = rowObj["school"] || rowObj["department"] || "KARE";
          const rawDate = rowObj["event_date"] || rowObj["event date"] || rowObj["date"] || "";
          const eventDate = rawDate.includes("26") ? "2026-09-26" : "2026-09-25";
          const isFlagship =
            (rowObj["event type"] || rowObj["type"] || "").toLowerCase().includes("flagship") ||
            (rowObj["event type"] || rowObj["type"] || "").toLowerCase().includes("pro");

          parsed.push({
            name: rowObj["name"] || rowObj["event name"] || rowObj["title"] || "",
            school: schoolName,
            category: rowObj["category"] || rowObj["track"] || schoolName || "Technical",
            event_date: eventDate,
            start_time: rowObj["start_time"] || rowObj["start time"] || "09:30",
            end_time: rowObj["end_time"] || rowObj["end time"] || "16:30",
            venue: rowObj["venue"] || rowObj["location"] || "Campus Academic Center & Spec Labs",
            registration_fee: rowObj["registration_fee"] || rowObj["fee"] || 0,
            participant_limit: rowObj["participant_limit"] || rowObj["target capacity"] || rowObj["capacity"] || 100,
            min_team_size: rowObj["min_team_size"] || 1,
            max_team_size: rowObj["max_team_size"] || 1,
            is_pro_event: isFlagship,
            short_description: rowObj["short_description"] || rowObj["description"] || "",
            rules: rowObj["rules"] || "",
            status: "registration_open",
          });
        }
      }

      setEvents(parsed);
    };

    reader.readAsText(file);
  };

  // 3. Execute Bulk Import
  const handleExecuteImport = async () => {
    if (events.length === 0) return;

    setIsImporting(true);
    setImportResult(null);

    const res = await bulkUploadEventsAdmin(events);
    setImportResult(res);
    setIsImporting(false);
  };

  // 4. Download Sample CSV Template
  const handleDownloadSampleCSV = () => {
    const headers = [
      "name",
      "school",
      "category",
      "event_date",
      "start_time",
      "end_time",
      "venue",
      "registration_fee",
      "participant_limit",
      "min_team_size",
      "max_team_size",
      "short_description",
      "rules",
      "status",
    ];

    const sampleRow = [
      '"CodeSprint Algorithm Showdown"',
      '"School of Computing (SCSE)"',
      '"Computing & AI"',
      "2026-09-25",
      "09:30",
      "16:30",
      '"SCSE Lab 304"',
      "0",
      "100",
      "1",
      "3",
      '"High speed algorithmic challenge across 3 rounds."',
      '"Bring your own laptop;College ID card mandatory;Jury decision is final"',
      "registration_open",
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), sampleRow.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Euphoria_Events_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preset Card: Official 61 Events */}
        <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider">
                Official Excel Data Available
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Euphoria &apos;26 Master Event Roster ({initialPresetCount} Events)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Auto-extracted and mapped directly from{" "}
              <code className="font-mono text-indigo-700 bg-white/80 px-1.5 py-0.5 rounded border border-indigo-200">
                data/EVENTS DETAILS -EUPHORIA 2026.xlsx
              </code>{" "}
              spanning all 14 KARE schools (Computing, Electrical, Mech, Bio, Sciences, Law, B-School, Architecture &amp; Health).
            </p>
          </div>

          <button
            onClick={handleLoadPreset}
            disabled={isLoadingPreset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 px-5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoadingPreset ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Reading Master Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Load Official 61 Events to Preview</span>
              </>
            )}
          </button>
        </div>

        {/* Custom Upload Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <UploadCloud className="h-4 w-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Upload Custom CSV File
                </h2>
              </div>
              <button
                onClick={handleDownloadSampleCSV}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Download className="h-3 w-3" />
                <span>Download Sample CSV</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drag &amp; drop or select any customized CSV file with columns for event title, school, category, venue, and timings.
            </p>
          </div>

          {/* File input */}
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 z-10 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center hover:border-primary/50 hover:bg-indigo-50/30 transition-colors">
              <FileSpreadsheet className="h-6 w-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                Click or Drop CSV File Here
              </span>
              <span className="text-[10px] text-slate-400">Accepts standard .csv</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success / Error Notification */}
      {importResult && (
        <div
          className={`rounded-2xl p-4 border text-xs space-y-2 ${
            importResult.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              {importResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600" />
              )}
              <span>
                {importResult.success
                  ? `Successfully imported ${importResult.count} events into database!`
                  : "Bulk upload encountered an error."}
              </span>
            </div>
            {importResult.success && (
              <Link
                href="/admin/events"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                <span>View in Event Directory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-2 text-[11px] text-rose-700 bg-white/70 p-2.5 rounded-lg max-h-32 overflow-y-auto">
              <strong className="block mb-1">Warnings / Errors:</strong>
              {importResult.errors.map((err, idx) => (
                <div key={idx}>• {err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loaded Events Preview Table */}
      {events.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Import Preview &amp; Verification
                </h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                  {events.length} Events Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review mapped event titles, dates, venues and department tracks before saving to Supabase
              </p>
            </div>

            {/* Execute Import CTA */}
            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving {events.length} Events to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Import All {events.length} Events to Supabase</span>
                </>
              )}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Event Name</th>
                  <th className="px-4 py-3">School / Department</th>
                  <th className="px-4 py-3">Category Track</th>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Seats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {events.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-400 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      {evt.name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <span className="inline-block truncate max-w-[180px]">
                        {evt.school}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-primary border border-indigo-100">
                        {evt.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">
                      {evt.event_date} ({evt.start_time} - {evt.end_time})
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-[160px]">
                      {evt.venue}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                      {evt.participant_limit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
