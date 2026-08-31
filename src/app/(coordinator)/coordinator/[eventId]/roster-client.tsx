"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  recordAttendanceCoordinator,
  revokeAttendanceCoordinator,
  updateEventOperationsStaff,
  updateEventLinksStaff,
  assignStudentCoordinatorStaff,
  revokeStudentCoordinatorStaff,
  CoordinatorAttendeeItem,
} from "@/actions/coordinator";
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
  GraduationCap,
  Plus,
  Trash2,
  Link as LinkIcon,
  Users,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface StudentCoordinator {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  registerNumber?: string;
  department?: string;
}

interface ProfileItem {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  register_number?: string;
  department?: string;
}

export function EventRosterClient({
  eventId,
  eventName,
  eventVenue,
  eventStatus,
  roleType = "student",
  initialAttendees,
  staffDetails,
}: {
  eventId: string;
  eventName: string;
  eventVenue?: string;
  eventStatus?: string;
  roleType?: "staff" | "student" | "admin";
  initialAttendees: CoordinatorAttendeeItem[];
  staffDetails?: {
    whatsappLink: string;
    brochureUrl: string;
    studentCoordinators: Array<StudentCoordinator>;
    allProfiles: Array<ProfileItem>;
  } | null;
}) {
  const isStaffOrAdmin = roleType === "staff" || roleType === "admin";
  const [activeTab, setActiveTab] = useState<"roster" | "controls">("roster");

  // Roster state & filters
  const [attendees, setAttendees] = useState<CoordinatorAttendeeItem[]>(initialAttendees);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "attended" | "pending">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "pro_pass" | "standard_pass">("all");

  // Modal Confirmations for Staff / Admin
  const [confirmCheckInItem, setConfirmCheckInItem] = useState<CoordinatorAttendeeItem | null>(null);
  const [confirmRevokeItem, setConfirmRevokeItem] = useState<CoordinatorAttendeeItem | null>(null);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Staff Venue & Operations State
  const [venueInput, setVenueInput] = useState(eventVenue || "");
  const [statusInput, setStatusInput] = useState(eventStatus || "published");
  const [isSavingOps, setIsSavingOps] = useState(false);
  const [opsFeedback, setOpsFeedback] = useState<string | null>(null);

  // Staff Links State
  const [whatsappLink, setWhatsappLink] = useState(staffDetails?.whatsappLink || "");
  const [brochureUrl, setBrochureUrl] = useState(staffDetails?.brochureUrl || "");
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [linksSuccess, setLinksSuccess] = useState<string | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);

  // Staff Student Coordinators State
  const [studentCoordinators, setStudentCoordinators] = useState<StudentCoordinator[]>(
    staffDetails?.studentCoordinators || []
  );
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Filter attendees for Roster Tab
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

  // 1. STAFF OVERRIDE ACTIONS
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

  // 2. STAFF OPERATIONS UPDATE
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

  // 3. STAFF LINKS UPDATE
  const handleSaveLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLinks(true);
    setLinksSuccess(null);
    setLinksError(null);

    const res = await updateEventLinksStaff(eventId, whatsappLink, brochureUrl);
    if (res.success) {
      setLinksSuccess("Event communication links updated successfully!");
    } else {
      setLinksError(res.error || "Failed to update links");
    }
    setIsSavingLinks(false);
  };

  // 4. STUDENT COORDINATOR ASSIGNMENT
  const handleAssignStudent = async (targetUser: ProfileItem) => {
    setIsSubmittingAssign(true);
    setAssignSuccess(null);
    setAssignError(null);

    const res = await assignStudentCoordinatorStaff(eventId, targetUser.id);
    if (res.success) {
      setStudentCoordinators((prev) => [
        ...prev.filter((s) => s.userId !== targetUser.id),
        {
          id: `new_${targetUser.id}`,
          userId: targetUser.id,
          fullName: targetUser.full_name,
          email: targetUser.email,
          mobileNumber: targetUser.mobile_number,
          registerNumber: targetUser.register_number,
          department: targetUser.department,
        },
      ]);
      setAssignSuccess(`Granted Student Coordinator access to ${targetUser.full_name}`);
      setIsAddStudentModalOpen(false);
    } else {
      setAssignError(res.error || "Failed to assign student coordinator");
    }
    setIsSubmittingAssign(false);
  };

  const handleRevokeStudent = async (student: StudentCoordinator) => {
    if (!confirm(`Remove ${student.fullName} as Student Coordinator?`)) return;

    const res = await revokeStudentCoordinatorStaff(eventId, student.userId);
    if (res.success) {
      setStudentCoordinators((prev) => prev.filter((s) => s.userId !== student.userId));
      setAssignSuccess(`Revoked Student Coordinator status for ${student.fullName}`);
    } else {
      setAssignError(res.error || "Failed to revoke student coordinator");
    }
  };

  const filteredCandidates = (staffDetails?.allProfiles || []).filter((p) => {
    const isAlreadyAssigned = studentCoordinators.some((s) => s.userId === p.id);
    if (isAlreadyAssigned) return false;

    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return true;

    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.register_number || "").toLowerCase().includes(q) ||
      (p.mobile_number || "").toLowerCase().includes(q)
    );
  });

  // 5. CSV EXPORT
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
    <div className="space-y-5 sm:space-y-6">
      {/* FACULTY STAFF / ADMIN TOGGLE SWITCHER */}
      {isStaffOrAdmin && (
        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-200/80 p-1.5 shadow-inner">
          <button
            onClick={() => setActiveTab("roster")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "roster"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Users className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Attendee Roster ({attendees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("controls")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "controls"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
            <span>Staff &amp; Venue Controls</span>
          </button>
        </div>
      )}

      {/* ==========================================
          VIEW 1: ATTENDEE ROSTER & SEARCH
         ========================================== */}
      {activeTab === "roster" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Metrics Summary Bar */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs space-y-0.5">
              <div className="text-[11px] sm:text-xs font-semibold text-slate-500">Total Delegates</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {attendees.length}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4 shadow-xs space-y-0.5">
              <div className="text-[11px] sm:text-xs font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>Verified Present</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                {attendedCount}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 sm:p-4 shadow-xs space-y-0.5">
              <div className="text-[11px] sm:text-xs font-bold text-amber-900 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                <span>Pending Entry</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
                {pendingCount}
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by delegate name, pass code, reg no, college..."
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
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer w-full sm:w-auto shrink-0"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {/* Tab Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    filterTab === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({attendees.length})
                </button>
                <button
                  onClick={() => setFilterTab("attended")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    filterTab === "attended"
                      ? "bg-emerald-700 text-white"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  Present ({attendedCount})
                </button>
                <button
                  onClick={() => setFilterTab("pending")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    filterTab === "pending"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="all">All Pass Tiers</option>
                  <option value="pro_pass">⭐ Pro Pass Only</option>
                  <option value="standard_pass">📌 Standard Pass Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roster Cards View for Mobile (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredAttendees.length > 0 ? (
              filteredAttendees.map((item) => {
                const isPro = item.pass?.pass_tier === "pro_pass";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                  >
                    {/* Top Row: Ticket Code & Status Pill */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 font-mono text-xs block">
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

                      <div>
                        {item.isAttended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-extrabold">
                            <Check className="h-3 w-3 text-emerald-700" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-medium">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Participant & College info */}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.user.full_name}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        {item.user.email || "Email protected"}
                      </div>
                      <div className="text-slate-600 text-[11px] font-medium pt-0.5 flex items-center gap-1">
                        <span className="truncate">{item.user.college_name || item.user.department || "KARE"}</span>
                        {item.user.register_number && (
                          <span className="font-mono text-slate-400">({item.user.register_number})</span>
                        )}
                      </div>
                    </div>

                    {/* Supervisor Action Button on Mobile */}
                    {isStaffOrAdmin && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        {item.isAttended ? (
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeItem(item)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer w-full"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Undo Attendance</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCheckInItem(item)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer w-full"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Manual Override</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                No participants found matching current filter criteria.
              </div>
            )}
          </div>

          {/* Roster Table View for Desktop (≥ md) */}
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
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
                              <div className="text-[11px] text-slate-500 font-mono">
                                {item.user.email || "Email protected"}
                              </div>
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

                          {/* Supervisor Override Actions */}
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

      {/* ==========================================
          VIEW 2: STAFF OPERATIONS & CONTROLS
         ========================================== */}
      {activeTab === "controls" && isStaffOrAdmin && (
        <div className="space-y-5">
          {/* Section 1: Venue & Operational Status Controls */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Venue &amp; Competition Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update venue location, hall room numbers, and competition status.
              </p>
            </div>

            {opsFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-xs">
                {opsFeedback}
              </div>
            )}

            <form onSubmit={handleSaveOperations} className="space-y-3.5 max-w-xl">
              <div className="space-y-1">
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

              <div className="space-y-1">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary disabled:opacity-50 transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Edit3 className="h-4 w-4" />
                <span>{isSavingOps ? "Saving Changes..." : "Save Operational Updates"}</span>
              </button>
            </form>
          </div>

          {/* Section 2: Official Communication Links */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-6 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Official Event Links
                  </h4>
                </div>
                <span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[10px] font-bold border border-indigo-100">
                  Faculty Staff
                </span>
              </div>

              {linksSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{linksSuccess}</span>
                </div>
              )}

              {linksError && (
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{linksError}</span>
                </div>
              )}

              <form onSubmit={handleSaveLinks} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Participant Group Link
                  </label>
                  <input
                    type="url"
                    value={whatsappLink}
                    onChange={(e) => setWhatsappLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Brochure PDF Link
                  </label>
                  <input
                    type="url"
                    value={brochureUrl}
                    onChange={(e) => setBrochureUrl(e.target.value)}
                    placeholder="https://domain.com/brochure.pdf"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingLinks}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-all disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>{isSavingLinks ? "Saving Links..." : "Save Communication Links"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 3: Student Coordinators Management */}
            <div className="lg:col-span-6 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-emerald-600 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Student Coordinators ({studentCoordinators.length})
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStudentSearchQuery("");
                    setIsAddStudentModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer w-full sm:w-auto shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Student Coordinator</span>
                </button>
              </div>

              {assignSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              {assignError && (
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{assignError}</span>
                </div>
              )}

              {studentCoordinators.length > 0 ? (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {studentCoordinators.map((sc) => (
                    <div
                      key={sc.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 font-extrabold text-emerald-900 text-sm">
                          {sc.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{sc.fullName}</span>
                            {sc.registerNumber && (
                              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-700">
                                {sc.registerNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{sc.email}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeStudent(sc)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                        title="Revoke Student Coordinator Access"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1.5">
                  <Users className="h-7 w-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No Student Coordinators Assigned Yet</p>
                </div>
              )}
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
              Are you sure you want to manually mark this participant present for <strong>{eventName}</strong> without a QR scan?
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
              Are you sure you want to revoke verified attendance for this delegate?
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

      {/* MODAL 3: ADD STUDENT COORDINATOR SELECTION MODAL */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            <div className="border-b border-slate-100 p-5 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Assign Student Coordinator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select a student delegate to grant QR scanner rights.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Search student name, email, or register number..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.slice(0, 15).map((candidate) => (
                    <div
                      key={candidate.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">
                            {candidate.full_name}
                          </span>
                          {candidate.register_number && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                              {candidate.register_number}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{candidate.email}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAssignStudent(candidate)}
                        disabled={isSubmittingAssign}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Assign Role</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    {studentSearchQuery ? "No matching students found." : "Type a student name or email to search."}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
