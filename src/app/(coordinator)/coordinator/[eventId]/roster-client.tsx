"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  recordAttendanceCoordinator,
  revokeAttendanceCoordinator,
  updateEventOperationsStaff,
  CoordinatorAttendeeItem,
} from "@/actions/coordinator";
import { UniversalQRScanner } from "@/components/scanner/universal-qr-scanner";
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
  Star,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Phone,
  Mail,
  Lock,
  Edit3,
  MapPin,
  Camera,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export function EventRosterClient({
  eventId,
  eventName,
  eventVenue,
  eventStatus,
  roleType = "student",
  initialAttendees,
}: {
  eventId: string;
  eventName: string;
  eventVenue?: string;
  eventStatus?: string;
  roleType?: "staff" | "student" | "admin";
  initialAttendees: CoordinatorAttendeeItem[];
}) {
  const [attendees, setAttendees] = useState<CoordinatorAttendeeItem[]>(initialAttendees);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "attended" | "pending">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "pro_pass" | "standard_pass">("all");

  // Tamper-Proof Top Verification Input Box State
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
    studentName?: string;
    slot?: number;
  } | null>(null);
  const verifyInputRef = useRef<HTMLInputElement>(null);
  const sessionProcessedCodesRef = useRef<Set<string>>(new Set());

  // Modal Confirmations for Staff / Admin
  const [confirmCheckInItem, setConfirmCheckInItem] = useState<CoordinatorAttendeeItem | null>(null);
  const [confirmRevokeItem, setConfirmRevokeItem] = useState<CoordinatorAttendeeItem | null>(null);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Staff Event Operations Tab State
  const [activeTab, setActiveTab] = useState<"roster" | "operations">("roster");
  const [venueInput, setVenueInput] = useState(eventVenue || "");
  const [statusInput, setStatusInput] = useState(eventStatus || "published");
  const [isSavingOps, setIsSavingOps] = useState(false);
  const [opsFeedback, setOpsFeedback] = useState<string | null>(null);

  const isStaffOrAdmin = roleType === "staff" || roleType === "admin";

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const q = searchQuery.trim().toLowerCase();
      const studentName = a.user?.full_name?.toLowerCase() || "";
      const email = (a.user?.email || "").toLowerCase();
      const regNo = (a.user?.register_number || "").toLowerCase();
      const college = (a.user?.college_name || "").toLowerCase();
      const code = a.registration_code?.toLowerCase() || "";
      const passCode = (a.pass?.pass_code || "").toLowerCase();

      const matchesSearch =
        !q ||
        studentName.includes(q) ||
        email.includes(q) ||
        regNo.includes(q) ||
        college.includes(q) ||
        code.includes(q) ||
        passCode.includes(q);

      if (!matchesSearch) return false;

      if (filterTab === "attended" && !a.isAttended) return false;
      if (filterTab === "pending" && a.isAttended) return false;

      if (tierFilter !== "all") {
        const rowTier = a.pass?.pass_tier || "standard_pass";
        if (rowTier !== tierFilter) return false;
      }

      return true;
    });
  }, [attendees, searchQuery, filterTab, tierFilter]);

  // 1. TAMPER-PROOF VERIFICATION PROCESSOR
  const processVerification = async (codeToVerify: string, method: "qr_camera" | "manual_code_entry" = "manual_code_entry") => {
    const clean = codeToVerify.trim();
    if (!clean) return;

    // Extract code if JSON QR payload
    let finalCode = clean;
    if (finalCode.startsWith("{") && finalCode.includes("code")) {
      try {
        const parsed = JSON.parse(finalCode);
        if (parsed.code) finalCode = parsed.code;
      } catch {
        // use raw
      }
    }

    finalCode = finalCode.toUpperCase();

    // DEDUPLICATION: Ignore if already scanned and verified in this session
    if (method === "qr_camera" && sessionProcessedCodesRef.current.has(finalCode)) {
      return;
    }

    setIsVerifying(true);
    setVerifyMessage(null);

    const res = await recordAttendanceCoordinator({
      eventId,
      registrationCode: finalCode,
      scanMethod: method,
    });

    if (!res.success) {
      setVerifyMessage({
        type: "error",
        text: res.error || `Pass Code "${finalCode}" is not registered for this competition.`,
      });
    } else {
      const { alreadyCheckedIn, student, slotNumber, registrationCode, scannedAt } = res;

      sessionProcessedCodesRef.current.add(finalCode);
      if (registrationCode) {
        sessionProcessedCodesRef.current.add(registrationCode.toUpperCase());
      }

      if (alreadyCheckedIn) {
        setVerifyMessage({
          type: "info",
          text: `Participant ${student?.full_name || "Delegate"} is already checked in!`,
          studentName: student?.full_name,
        });
      } else {
        setVerifyMessage({
          type: "success",
          text: `Verified! Check-in recorded for ${student?.full_name || "Delegate"} (Slot #${slotNumber || 1})`,
          studentName: student?.full_name,
          slot: slotNumber,
        });

        // Update row in state
        setAttendees((prev) =>
          prev.map((a) =>
            a.registration_code.toUpperCase() === registrationCode?.toUpperCase() ||
            a.pass?.pass_code?.toUpperCase() === finalCode.toUpperCase() ||
            a.user.id === student?.id
              ? {
                  ...a,
                  isAttended: true,
                  scanned_at: scannedAt || new Date().toISOString(),
                  scan_method: method,
                }
              : a
          )
        );
      }
      setVerificationCode("");
    }

    setIsVerifying(false);
    if (verifyInputRef.current) {
      verifyInputRef.current.focus();
    }
  };

  const handleVerifyPassCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    processVerification(verificationCode, "manual_code_entry");
  };

  const handleCameraScanSuccess = (decodedText: string) => {
    processVerification(decodedText, "qr_camera");
  };

  // 2. STAFF OVERRIDE CHECK-IN (Protected by Confirmation Modal)
  const handleExecuteConfirmedCheckIn = async () => {
    if (!confirmCheckInItem) return;

    setIsActionProcessing(true);
    const res = await recordAttendanceCoordinator({
      eventId,
      registrationCode: confirmCheckInItem.registration_code,
      scanMethod: "staff_override",
    });

    if (res.success) {
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === confirmCheckInItem.id
            ? {
                ...a,
                isAttended: true,
                scanned_at: new Date().toISOString(),
                scan_method: "staff_override",
              }
            : a
        )
      );
      setConfirmCheckInItem(null);
    }
    setIsActionProcessing(false);
  };

  // 3. STAFF OVERRIDE REVOKE ATTENDANCE (Protected by Confirmation Modal)
  const handleExecuteConfirmedRevoke = async () => {
    if (!confirmRevokeItem) return;

    setIsActionProcessing(true);
    const res = await revokeAttendanceCoordinator({
      registrationId: confirmRevokeItem.id,
      eventId,
    });

    if (res.success) {
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === confirmRevokeItem.id
            ? {
                ...a,
                isAttended: false,
                scanned_at: null,
                scan_method: null,
              }
            : a
        )
      );
      setConfirmRevokeItem(null);
    }
    setIsActionProcessing(false);
  };

  // 4. STAFF EVENT OPERATIONS UPDATE
  const handleSaveOperations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOps(true);
    setOpsFeedback(null);

    const res = await updateEventOperationsStaff(eventId, {
      venue: venueInput,
      status: statusInput,
    });

    if (res.success) {
      setOpsFeedback("Event venue and operational status updated successfully!");
    } else {
      setOpsFeedback("Failed to update: " + (res.error || "Unknown error"));
    }
    setIsSavingOps(false);
  };

  // 5. STAFF CSV EXPORT (Staff / Admin Only)
  const handleExportCSV = () => {
    if (!isStaffOrAdmin) return;

    const headers = [
      "Sl No",
      "Registration Code",
      "Master Pass Code",
      "Pass Tier",
      "Slot Number",
      "Full Name",
      "Email",
      "Mobile Number",
      "Register Number",
      "Participant Type",
      "College / Dept",
      "Course & Year",
      "Attendance Status",
      "Scanned At",
      "Verification Method",
    ];

    const rows = filteredAttendees.map((a, idx) => {
      const isPro = a.pass?.pass_tier === "pro_pass";

      return [
        idx + 1,
        `"${a.registration_code}"`,
        `"${a.pass?.pass_code || a.registration_code}"`,
        `"${isPro ? "Pro Pass" : "Standard Pass"}"`,
        a.slot_number || 1,
        `"${a.user.full_name}"`,
        `"${a.user.email || ""}"`,
        `"${a.user.mobile_number || ""}"`,
        `"${a.user.register_number || ""}"`,
        `"${a.user.participant_type}"`,
        `"${a.user.college_name || a.user.department || ""}"`,
        `"${a.user.course || ""} Year ${a.user.year_of_study || ""}"`,
        `"${a.isAttended ? "Present" : "Absent / Pending"}"`,
        `"${a.scanned_at ? new Date(a.scanned_at).toLocaleString() : ""}"`,
        `"${a.scan_method || "N/A"}"`,
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
      `official_roster_${eventName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const attendedCount = attendees.filter((a) => a.isAttended).length;
  const pendingCount = attendees.length - attendedCount;

  return (
    <div className="space-y-6">
      {/* Role Indicator Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          {roleType === "staff" ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 px-3 py-1 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-purple-700" />
              <span>Faculty Staff Coordinator (Event Lead)</span>
            </span>
          ) : roleType === "admin" ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3 py-1 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Super Administrator Oversight</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Student Coordinator (Field &amp; Gate Verification)</span>
            </span>
          )}

          <span className="text-xs text-slate-500 hidden md:inline">
            {isStaffOrAdmin
              ? "Full audit access, operations control & manual supervisor override enabled."
              : "Tamper-proof verification mode: Scan QR or enter Pass Code to mark attendance."}
          </span>
        </div>

        {/* Staff Operations Tabs */}
        {isStaffOrAdmin && (
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 shrink-0">
            <button
              onClick={() => setActiveTab("roster")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "roster"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Attendee Roster ({attendees.length})
            </button>
            <button
              onClick={() => setActiveTab("operations")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "operations"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Venue &amp; Operations
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: EVENT OPERATIONS TAB (Staff Only) */}
      {isStaffOrAdmin && activeTab === "operations" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Competition Venue &amp; Operational Controls
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update room numbers, venue halls, and competition running status for {eventName}.
            </p>
          </div>

          {opsFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-xs">
              {opsFeedback}
            </div>
          )}

          <form onSubmit={handleSaveOperations} className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Venue / Hall / Room Location
              </label>
              <input
                type="text"
                value={venueInput}
                onChange={(e) => setVenueInput(e.target.value)}
                placeholder="e.g., Mechanical Block - Seminar Hall 2 (Room 304)"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Competition Status
              </label>
              <select
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="published">Published / Scheduled</option>
                <option value="registration_open">Registration Open</option>
                <option value="ongoing">Live / In-Progress</option>
                <option value="completed">Completed / Judging Concluded</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingOps}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              <span>{isSavingOps ? "Saving Changes..." : "Save Operational Updates"}</span>
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: ATTENDEE ROSTER TAB */}
      {(activeTab === "roster" || !isStaffOrAdmin) && (
        <div className="space-y-5">
          {/* TAMPER-PROOF VERIFICATION INPUT BOX (Primary Gate Check-in Engine) */}
          <div className="rounded-3xl border-2 border-slate-900/90 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Tamper-Proof Gate Check-In</span>
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  Pass Verification &amp; Attendance Entry
                </h3>
                <p className="text-xs text-slate-300">
                  Scan pass QR code or type exact Pass Code (e.g. <span className="font-mono text-amber-300">EUPH-26-XXXXXX</span>)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(!isCameraOpen)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold shadow-md transition-all shrink-0 cursor-pointer ${
                    isCameraOpen
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Camera className="h-4 w-4 text-primary" />
                  <span>{isCameraOpen ? "Close Camera" : "Live Camera Scanner"}</span>
                </button>
              </div>
            </div>

            {/* Embedded Live QR Camera Scanner */}
            {isCameraOpen && (
              <div className="pt-2">
                <UniversalQRScanner
                  isScanning={isCameraOpen}
                  onScanSuccess={handleCameraScanSuccess}
                />
              </div>
            )}

            {/* Verification Code Form */}
            <form onSubmit={handleVerifyPassCode} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  ref={verifyInputRef}
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter Pass Code or Paste Scanned Code..."
                  className="w-full rounded-2xl border-2 border-white/20 bg-white/10 px-4 py-2.5 text-xs font-mono font-bold text-white placeholder:text-slate-400 focus:border-amber-400 focus:bg-white/20 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || !verificationCode.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                <Check className="h-4 w-4" />
                <span>{isVerifying ? "Verifying..." : "Verify & Mark Present"}</span>
              </button>
            </form>

            {/* Verification Feedback Banner */}
            {verifyMessage && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                  verifyMessage.type === "success"
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                    : verifyMessage.type === "info"
                    ? "bg-amber-500/20 text-amber-200 border-amber-400/40"
                    : "bg-rose-500/20 text-rose-200 border-rose-400/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {verifyMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  <span>{verifyMessage.text}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setVerifyMessage(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-3 gap-3.5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-semibold text-slate-500">Registered Delegates</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                {attendees.length}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Verified Present</span>
              </div>
              <div className="text-2xl font-black text-emerald-950 font-mono mt-0.5">
                {attendedCount}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>Pending Check-In</span>
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
                {pendingCount}
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by participant name, pass code, reg no, college..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 p-1 rounded-full text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Staff CSV Export Button (Staff Only) */}
              {isStaffOrAdmin && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Export Roster CSV</span>
                </button>
              )}
            </div>

            {/* Tab Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    filterTab === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({attendees.length})
                </button>
                <button
                  onClick={() => setFilterTab("attended")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    filterTab === "attended"
                      ? "bg-emerald-700 text-white"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  Checked In ({attendedCount})
                </button>
                <button
                  onClick={() => setFilterTab("pending")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    filterTab === "pending"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Pass Tiers</option>
                  <option value="pro_pass">⭐ Pro Pass Only</option>
                  <option value="standard_pass">📌 Standard Pass Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Ticket / Slot</th>
                    <th className="px-4 py-3.5">Participant Details</th>
                    <th className="px-4 py-3.5">Institution &amp; Dept</th>
                    <th className="px-4 py-3.5">Attendance Status</th>
                    {isStaffOrAdmin && <th className="px-4 py-3.5 text-right">Supervisor Override</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendees.length > 0 ? (
                    filteredAttendees.map((item) => {
                      const isPro = item.pass?.pass_tier === "pro_pass";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Ticket & Slot */}
                          <td className="px-4 py-3 font-mono">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 block">
                                {item.registration_code}
                              </span>
                              <div className="flex items-center gap-1">
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
                                  Slot #{item.slot_number || 1}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Participant */}
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {item.user.full_name}
                              </div>
                              {/* Email masking for student volunteers */}
                              <div className="text-[11px] text-slate-500 font-mono">
                                {item.user.email || "Email protected"}
                              </div>
                              {/* Phone number display: Unmasked for staff, hidden for student */}
                              {isStaffOrAdmin && item.user.mobile_number ? (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                                  <Phone className="h-2.5 w-2.5 text-slate-400" />
                                  <span>Tel: {item.user.mobile_number}</span>
                                </div>
                              ) : !isStaffOrAdmin ? (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                                  <Lock className="h-2.5 w-2.5 text-slate-300" />
                                  <span>Contact info protected</span>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          {/* College / Institution */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5 max-w-[220px]">
                              <span
                                className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold border ${
                                  item.user.participant_type === "internal"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-purple-50 text-purple-800 border-purple-200"
                                }`}
                              >
                                {item.user.participant_type === "internal"
                                  ? "KARE Internal"
                                  : "External"}
                              </span>
                              <div className="font-semibold text-slate-800 truncate text-[11px]">
                                {item.user.college_name || item.user.department || "Kalasalingam Academy"}
                              </div>
                              {item.user.register_number && (
                                <div className="text-[10px] font-mono text-slate-500">
                                  Reg: {item.user.register_number}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Attendance Status */}
                          <td className="px-4 py-3">
                            {item.isAttended ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold">
                                  <Check className="h-3 w-3 text-emerald-700" />
                                  <span>Verified Present</span>
                                </span>
                                {item.scanned_at && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {formatTime(item.scanned_at.split("T")[1] || "")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>Pending Check-In</span>
                              </span>
                            )}
                          </td>

                          {/* Supervisor Override Actions (Staff / Admin Only with Confirmations) */}
                          {isStaffOrAdmin && (
                            <td className="px-4 py-3 text-right">
                              {item.isAttended ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRevokeItem(item)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                                  title="Undo attendance check-in"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Undo</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmCheckInItem(item)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Manual Override</span>
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={isStaffOrAdmin ? 5 : 4} className="py-12 text-center text-slate-400">
                        No participants found matching current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CONFIRM MANUAL CHECK-IN OVERRIDE (Staff / Admin Only) */}
      {confirmCheckInItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Confirm Manual Check-In
                </h3>
                <p className="text-xs text-slate-500">Supervisor Faculty Override</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Delegate</span>
                <strong className="text-slate-900 text-sm">{confirmCheckInItem.user.full_name}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Reg No.</span>
                  <span className="font-mono font-bold text-slate-800">{confirmCheckInItem.user.register_number || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Pass Code</span>
                  <span className="font-mono font-bold text-primary">{confirmCheckInItem.registration_code}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Institution</span>
                <span className="text-slate-700">{confirmCheckInItem.user.college_name || confirmCheckInItem.user.department || "KARE"}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to manually mark this participant present for <strong>{eventName}</strong> without a QR scan? This action will be recorded in the audit log under your Staff ID.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCheckInItem(null)}
                disabled={isActionProcessing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedCheckIn}
                disabled={isActionProcessing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{isActionProcessing ? "Recording..." : "Yes, Confirm Check-In"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM REVOKE ATTENDANCE (Staff / Admin Only) */}
      {confirmRevokeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Undo / Revoke Check-In
                </h3>
                <p className="text-xs text-slate-500">Supervisor Attendance Rollback</p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50/50 p-3.5 border border-rose-100 text-xs space-y-1.5">
              <div>
                <span className="text-[10px] font-bold text-rose-500 uppercase block">Delegate</span>
                <strong className="text-rose-950">{confirmRevokeItem.user.full_name}</strong>
              </div>
              <p className="text-[11px] text-rose-800">
                Ticket: <span className="font-mono font-bold">{confirmRevokeItem.registration_code}</span>
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to revoke the verified attendance status for this delegate? Their status will revert to <strong>Pending</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRevokeItem(null)}
                disabled={isActionProcessing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedRevoke}
                disabled={isActionProcessing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                <span>{isActionProcessing ? "Revoking..." : "Yes, Revoke Attendance"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
