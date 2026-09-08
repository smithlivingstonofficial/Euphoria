"use client";

import { useState, useMemo } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  Lock,
  Building,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  generateCustomReportAction,
  CustomReportParams,
} from "@/actions/coordinator";

interface CustomReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleType: "staff" | "student" | "admin" | "overall_coordinator";
  assignedEvent?: { id: string; name: string; department?: string } | null;
  allEvents?: Array<{ id: string; name: string; school_or_dept?: string }>;
  initialEventId?: string;
}

const ALL_COLUMNS = [
  { id: "regCode", label: "Registration Code", group: "Registration" },
  { id: "name", label: "Delegate Full Name", group: "Participant" },
  { id: "email", label: "Email Address", group: "Participant" },
  { id: "mobile", label: "Mobile Number", group: "Participant" },
  { id: "regNo", label: "Register Number", group: "Participant" },
  { id: "college", label: "College / University", group: "Participant" },
  { id: "department", label: "Academic Department", group: "Participant" },
  { id: "course", label: "Course / Degree", group: "Participant" },
  { id: "year", label: "Year of Study", group: "Participant" },
  { id: "affiliation", label: "Affiliation (KLU vs External)", group: "Participant" },
  { id: "eventName", label: "Competition Name", group: "Event" },
  { id: "eventDept", label: "Event Department", group: "Event" },
  { id: "passCode", label: "Pass Code", group: "Pass" },
  { id: "passTier", label: "Pass Tier", group: "Pass" },
  { id: "amount", label: "Amount Paid", group: "Pass" },
  { id: "slotNumber", label: "Slot Number (1 or 2)", group: "Pass" },
  { id: "status", label: "Registration Status", group: "Registration" },
  { id: "attendance", label: "Attendance Status", group: "Attendance" },
  { id: "scanTime", label: "Check-in Timestamp", group: "Attendance" },
  { id: "scanMethod", label: "Check-in Method", group: "Attendance" },
];

export function CustomReportModal({
  isOpen,
  onClose,
  roleType,
  assignedEvent,
  allEvents = [],
  initialEventId,
}: CustomReportModalProps) {
  const isStaff = roleType === "staff";
  const isOverallOrAdmin = roleType === "overall_coordinator" || roleType === "admin";

  // Scope: staff is strictly locked to "event"
  const [scope, setScope] = useState<"all" | "department" | "event">(
    isStaff ? "event" : initialEventId ? "event" : "all"
  );
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || (isStaff ? assignedEvent?.id || "" : allEvents[0]?.id || "")
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Filters
  const [affiliation, setAffiliation] = useState<"all" | "internal" | "external">("all");
  const [attendanceStatus, setAttendanceStatus] = useState<"all" | "attended" | "absent">("all");
  const [passTier, setPassTier] = useState<"all" | "pro_pass" | "standard_pass">("all");
  const [slotType, setSlotType] = useState<"all" | "1" | "2">("all");

  // Selected Columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "regCode",
    "name",
    "email",
    "mobile",
    "regNo",
    "college",
    "department",
    "affiliation",
    "eventName",
    "passCode",
    "passTier",
    "slotNumber",
    "attendance",
    "scanTime",
  ]);

  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Department List
  const departments = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((e) => {
      if (e.school_or_dept) set.add(e.school_or_dept);
    });
    return Array.from(set).sort();
  }, [allEvents]);

  if (!isOpen) return null;

  const toggleColumn = (colId: string) => {
    if (selectedColumns.includes(colId)) {
      if (selectedColumns.length === 1) return; // Must have at least 1 column
      setSelectedColumns((prev) => prev.filter((id) => id !== colId));
    } else {
      setSelectedColumns((prev) => [...prev, colId]);
    }
  };

  const handleSelectAllCols = () => {
    setSelectedColumns(ALL_COLUMNS.map((c) => c.id));
  };

  const handleDeselectAllCols = () => {
    setSelectedColumns(["regCode", "name", "email", "eventName", "attendance"]);
  };

  const handleGenerateReport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const params: CustomReportParams = {
        scope: isStaff ? "event" : scope,
        eventId: isStaff ? assignedEvent?.id : scope === "event" ? selectedEventId : undefined,
        department: scope === "department" ? selectedDepartment : undefined,
        affiliation,
        attendanceStatus,
        passTier,
        slotType: slotType === "all" ? undefined : (Number(slotType) as 1 | 2),
        selectedColumns,
      };

      const res = await generateCustomReportAction(params);

      if (!res.success || !res.csvContent) {
        setErrorMsg(res.error || "Failed to generate report.");
        return;
      }

      // Trigger download
      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", res.filename || "Euphoria_Custom_Report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMsg(`Report generated successfully! (${res.totalCount} records exported)`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setErrorMsg("An unexpected error occurred while generating the report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                  Custom Report Generator
                </h3>
                {isStaff ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                    <Lock className="h-3 w-3 text-amber-700" />
                    <span>Scoped to Assigned Event</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-900 border border-purple-200">
                    <Sparkles className="h-3 w-3 text-purple-700" />
                    <span>Global Oversight Scope</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Filter delegates, pick custom data columns, and export Excel-ready CSV reports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. SCOPE SELECTION */}
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
            1. Report Scope
          </label>

          {isStaff ? (
            <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-3 text-xs">
              <Building className="h-4 w-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 block">
                  {assignedEvent?.name || "Your Assigned Event"}
                </span>
                <span className="text-[11px] text-slate-500">
                  {assignedEvent?.department || "Event Scope"} • Scoped strictly to your assigned event
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    scope === "all"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All 61 Events
                </button>
                <button
                  type="button"
                  onClick={() => setScope("department")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    scope === "department"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  By Department
                </button>
                <button
                  type="button"
                  onClick={() => setScope("event")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    scope === "event"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Specific Event
                </button>
              </div>

              {scope === "department" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Select Academic Department:</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                  >
                    <option value="all">All Departments Combined</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === "event" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Select Competition:</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                  >
                    {allEvents.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.name} ({evt.school_or_dept})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. ATTENDEE FILTER DIMENSIONS */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
            2. Participant &amp; Status Filters
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Affiliation */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Affiliation:</label>
              <select
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="all">All Delegates</option>
                <option value="internal">KLU Students Only</option>
                <option value="external">External Only</option>
              </select>
            </div>

            {/* Attendance Status */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Attendance Status:</label>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="all">All Registered</option>
                <option value="attended">Checked-In Only</option>
                <option value="absent">Pending / Absent Only</option>
              </select>
            </div>

            {/* Pass Tier */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Pass Tier:</label>
              <select
                value={passTier}
                onChange={(e) => setPassTier(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="all">All Pass Tiers</option>
                <option value="pro_pass">Pro Pass (₹300)</option>
                <option value="standard_pass">Standard Pass (₹200)</option>
              </select>
            </div>

            {/* Slot Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Slot Choice:</label>
              <select
                value={slotType}
                onChange={(e) => setSlotType(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="all">All Slots</option>
                <option value="1">Slot 1 (Primary)</option>
                <option value="2">Slot 2 (Secondary)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. CUSTOM COLUMN SELECTION */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              3. Columns to Export ({selectedColumns.length} of {ALL_COLUMNS.length} selected)
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllCols}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleDeselectAllCols}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline"
              >
                Reset Default
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
            {ALL_COLUMNS.map((col) => {
              const isChecked = selectedColumns.includes(col.id);
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer select-none transition-colors border ${
                    isChecked
                      ? "bg-white border-indigo-200 text-slate-900 font-bold shadow-2xs"
                      : "bg-slate-50/60 border-transparent text-slate-500 font-medium hover:bg-white/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleColumn(col.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>UTF-8 BOM Excel &amp; Sheets Ready</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={isExporting || selectedColumns.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Custom CSV</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
