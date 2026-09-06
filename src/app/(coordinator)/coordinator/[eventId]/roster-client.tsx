"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  recordAttendanceCoordinator,
  revokeAttendanceCoordinator,
  updateEventOperationsStaff,
  updateEventLinksStaff,
  assignStudentCoordinatorStaff,
  revokeStudentCoordinatorStaff,
  getPaginatedEventAttendees,
  exportEventAttendeesCSVAction,
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
  ExternalLink,
  ListChecks,
  FileText,
  Save,
  Loader2,
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  eventDate,
  startTime,
  endTime,
  schoolOrDept,
  participantLimit,
  isProEvent,
  firstSlotCount,
  isLiveToday,
  eventRules,
  eventStatus,
  roleType = "student",
  initialAttendees,
  initialTotalCount,
  initialAttendedCount,
  staffDetails,
}: {
  eventId: string;
  eventName: string;
  eventVenue?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  schoolOrDept?: string;
  participantLimit?: number | null;
  isProEvent?: boolean;
  firstSlotCount?: number;
  isLiveToday?: boolean;
  eventRules?: string | string[] | null;
  eventStatus?: string;
  roleType?: "staff" | "student" | "admin";
  initialAttendees: CoordinatorAttendeeItem[];
  initialTotalCount?: number;
  initialAttendedCount?: number;
  staffDetails?: {
    whatsappLink: string;
    brochureUrl: string;
    studentCoordinators: Array<StudentCoordinator>;
    allProfiles: Array<ProfileItem>;
  } | null;
}) {
  const isStaffOrAdmin = roleType === "staff" || roleType === "admin";
  const isAdmin = roleType === "admin";
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"roster" | "controls">("roster");

  // Live Telemetry Totals (derived from aggregate counts)
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount ?? initialAttendees.length);
  const [attendedCount, setAttendedCount] = useState<number>(initialAttendedCount ?? initialAttendees.filter((a) => a.isAttended).length);

  // Pagination & Filter State (strictly 10 per page)
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState<number>(initialTotalCount ?? initialAttendees.length);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [isExportingCSV, setIsExportingCSV] = useState<boolean>(false);

  // In-Memory Page Cache to eliminate redundant network requests on back/forward
  const pageCache = useRef<Record<string, { attendees: CoordinatorAttendeeItem[]; totalCount: number }>>({
    "1___all_all": { attendees: initialAttendees, totalCount: initialTotalCount ?? initialAttendees.length },
  });

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  // Roster state & filters
  const [attendees, setAttendees] = useState<CoordinatorAttendeeItem[]>(initialAttendees);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "attended" | "pending">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "pro_pass" | "standard_pass">("all");

  // Modal Confirmations for Staff / Admin
  const [confirmCheckInItem, setConfirmCheckInItem] = useState<CoordinatorAttendeeItem | null>(null);
  const [confirmRevokeItem, setConfirmRevokeItem] = useState<CoordinatorAttendeeItem | null>(null);
  const [typedOverrideCode, setTypedOverrideCode] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Staff Venue, Brochure & Rules State (Baseline & Active)
  const initialRulesFormatted = Array.isArray(eventRules)
    ? eventRules.join("\n")
    : typeof eventRules === "string"
    ? eventRules
    : "";
  const [savedVenue, setSavedVenue] = useState(eventVenue || "");
  const [venueInput, setVenueInput] = useState(eventVenue || "");
  const [savedBrochureUrl, setSavedBrochureUrl] = useState(staffDetails?.brochureUrl || "");
  const [brochureUrl, setBrochureUrl] = useState(staffDetails?.brochureUrl || "");
  const [savedRules, setSavedRules] = useState(initialRulesFormatted);
  const [rulesInput, setRulesInput] = useState(initialRulesFormatted);
  const [isSavingOps, setIsSavingOps] = useState(false);
  const [opsFeedback, setOpsFeedback] = useState<string | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);

  // Official WhatsApp Link State (Admin Controlled)
  const [savedWhatsappLink, setSavedWhatsappLink] = useState(staffDetails?.whatsappLink || "");
  const [whatsappLink, setWhatsappLink] = useState(staffDetails?.whatsappLink || "");
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [isConfirmLinksModalOpen, setIsConfirmLinksModalOpen] = useState(false);
  const [linksSuccess, setLinksSuccess] = useState<string | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);

  // Unsaved Changes Dirty State Tracking
  const isOpsDirty = useMemo(() => {
    return (
      venueInput.trim() !== savedVenue.trim() ||
      brochureUrl.trim() !== savedBrochureUrl.trim() ||
      rulesInput.trim() !== savedRules.trim()
    );
  }, [venueInput, savedVenue, brochureUrl, savedBrochureUrl, rulesInput, savedRules]);

  const isWhatsappDirty = useMemo(() => {
    return whatsappLink.trim() !== savedWhatsappLink.trim();
  }, [whatsappLink, savedWhatsappLink]);

  const hasUnsavedChanges = isOpsDirty || isWhatsappDirty;

  // Browser Window / Tab Close & Page Refresh Confirmation Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // In-App Navigation Guard State & Modal Actions
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const handleGuardedNavigation = (navAction: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => navAction);
      setIsUnsavedModalOpen(true);
    } else {
      navAction();
    }
  };

  const handleDiscardAndLeave = () => {
    setVenueInput(savedVenue);
    setBrochureUrl(savedBrochureUrl);
    setRulesInput(savedRules);
    setWhatsappLink(savedWhatsappLink);
    setIsUnsavedModalOpen(false);
    if (pendingNavigation) {
      const nextNav = pendingNavigation;
      setPendingNavigation(null);
      nextNav();
    }
  };

  const handleSaveAndLeave = async () => {
    setIsSavingOps(true);
    const res = await updateEventOperationsStaff(eventId, {
      venue: venueInput,
      brochureUrl: brochureUrl,
      rules: rulesInput,
    });
    setIsSavingOps(false);

    if (res.success) {
      setSavedVenue(venueInput);
      setSavedBrochureUrl(brochureUrl);
      setSavedRules(rulesInput);
      setOpsFeedback("Competition venue, brochure link, and rules updated successfully!");
      setIsUnsavedModalOpen(false);
      if (pendingNavigation) {
        const nextNav = pendingNavigation;
        setPendingNavigation(null);
        nextNav();
      }
    } else {
      setOpsError(res.error || "Failed to update event operations settings.");
      setIsUnsavedModalOpen(false);
    }
  };

  // Rules Line Counter & Starter Template
  const rulesCount = useMemo(() => {
    return rulesInput
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0).length;
  }, [rulesInput]);

  const handleInsertStandardTemplate = () => {
    const template = [
      "1. Valid physical College ID card is mandatory for campus entry and competition verification.",
      "2. Participants must report to the venue 15 minutes prior to the scheduled start time.",
      "3. All necessary development environments and workstations will be provided; participants may also bring their personal laptops.",
      "4. Decisions rendered by the jury and evaluation committee are final and binding.",
    ].join("\n");

    if (!rulesInput.trim()) {
      setRulesInput(template);
    } else {
      setRulesInput((prev) => prev.trim() + "\n" + template);
    }
  };

  // Staff Student Coordinators State
  const [studentCoordinators, setStudentCoordinators] = useState<StudentCoordinator[]>(
    staffDetails?.studentCoordinators || []
  );
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Fetch a page with specific query & filter options
  const fetchPage = async (
    targetPage: number,
    search: string,
    status: "all" | "attended" | "pending",
    tier: "all" | "pro_pass" | "standard_pass"
  ) => {
    const cacheKey = `${targetPage}_${search.trim()}_${status}_${tier}`;
    if (pageCache.current[cacheKey]) {
      const cached = pageCache.current[cacheKey];
      setAttendees(cached.attendees);
      setTotalFilteredCount(cached.totalCount);
      setCurrentPage(targetPage);
      return;
    }

    setIsLoadingPage(true);
    const res = await getPaginatedEventAttendees(eventId, {
      page: targetPage,
      pageSize,
      searchQuery: search,
      filterTab: status,
      tierFilter: tier,
    });
    setIsLoadingPage(false);

    if (res.success) {
      pageCache.current[cacheKey] = {
        attendees: res.attendees,
        totalCount: res.totalCount,
      };
      setAttendees(res.attendees);
      setTotalFilteredCount(res.totalCount);
      setCurrentPage(targetPage);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || isLoadingPage) return;
    fetchPage(newPage, searchQuery, filterTab, tierFilter);
  };

  // Debounce search and filter updates to trigger page 1 fetch
  useEffect(() => {
    const isDefault = searchQuery === "" && filterTab === "all" && tierFilter === "all" && currentPage === 1;
    if (isDefault) return;

    const timer = setTimeout(() => {
      fetchPage(1, searchQuery, filterTab, tierFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, filterTab, tierFilter]);

  // Pagination page numbers generator
  const paginationPageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [totalPages, currentPage]);

  const filteredAttendees = attendees;

  // 1. STAFF OVERRIDE ACTIONS
  const handleExecuteConfirmedCheckIn = async () => {
    if (!confirmCheckInItem) return;

    const targetCode = confirmCheckInItem.registration_code.trim().toUpperCase();
    const entered = typedOverrideCode.trim().toUpperCase();

    if (entered !== targetCode) {
      setOverrideError(`Pass Code mismatch. Please enter "${targetCode}" exactly as shown on the pass.`);
      return;
    }

    setIsActionProcessing(true);
    setOverrideError(null);
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
      setAttendedCount((prev) => prev + 1);
      pageCache.current = {};
      setConfirmCheckInItem(null);
      setTypedOverrideCode("");
      setOverrideError(null);
    } else {
      setOverrideError(res.error || "Failed to record manual check-in.");
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
      setAttendedCount((prev) => Math.max(0, prev - 1));
      pageCache.current = {};
      setConfirmRevokeItem(null);
    }
    setIsActionProcessing(false);
  };

  // 2. STAFF EVENT CONFIGURATION UPDATE (Venue, Brochure Link, Rules & Guidelines)
  const handleSaveEventSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOpsDirty || isSavingOps) return;
    setIsSavingOps(true);
    setOpsFeedback(null);
    setOpsError(null);

    const res = await updateEventOperationsStaff(eventId, {
      venue: venueInput,
      brochureUrl: brochureUrl,
      rules: rulesInput,
    });

    if (res.success) {
      setSavedVenue(venueInput);
      setSavedBrochureUrl(brochureUrl);
      setSavedRules(rulesInput);
      setOpsFeedback("Competition venue, brochure link, and rules updated successfully!");
    } else {
      setOpsError(res.error || "Failed to update event operations settings.");
    }
    setIsSavingOps(false);
  };

  // 3. ADMIN LINKS UPDATE (WITH CONFIRMATION MODAL)
  const handleOpenConfirmLinks = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isWhatsappDirty || isSavingLinks) return;
    setLinksSuccess(null);
    setLinksError(null);
    setIsConfirmLinksModalOpen(true);
  };

  const handleExecuteSaveLinks = async () => {
    setIsSavingLinks(true);
    setLinksSuccess(null);
    setLinksError(null);

    const res = await updateEventLinksStaff(eventId, whatsappLink, brochureUrl);
    if (res.success) {
      setSavedWhatsappLink(whatsappLink);
      setSavedBrochureUrl(brochureUrl);
      setLinksSuccess("Event communication links updated successfully!");
      setIsConfirmLinksModalOpen(false);
    } else {
      setLinksError(res.error || "Failed to update links");
      setIsConfirmLinksModalOpen(false);
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

  // 5. ON-DEMAND UNPAGINATED CSV EXPORT (Zero-egress during normal browsing)
  const handleExportCSV = async () => {
    if (!isStaffOrAdmin || isExportingCSV) return;

    try {
      setIsExportingCSV(true);
      const res = await exportEventAttendeesCSVAction(eventId);
      if (!res.success || !res.csvContent) {
        alert(res.error || "Failed to generate event CSV export.");
        return;
      }

      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        res.filename ||
          `official_roster_${eventName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${
            new Date().toISOString().split("T")[0]
          }.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export CSV Error:", err);
      alert("An unexpected error occurred during CSV export.");
    } finally {
      setIsExportingCSV(false);
    }
  };

  // Accurate full-event telemetry counts
  const pendingCount = Math.max(0, totalCount - attendedCount);
  const attendancePct = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
  const priorityOneCount = firstSlotCount ?? 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ==========================================
          TOP SECTION: UNIFIED EXECUTIVE HEADER & TABS
         ========================================== */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4.5 shadow-xs space-y-3">
        {/* Row 1: Breadcrumb + Header Title & Badges (Left) + Actions & Tabs (Right) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
          {/* Left: Breadcrumb & Title */}
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <Link
                href="/coordinator"
                onClick={(e) => {
                  if (hasUnsavedChanges) {
                    e.preventDefault();
                    handleGuardedNavigation(() => router.push("/coordinator"));
                  }
                }}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                <span>Coordinator Hub</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 text-slate-600 font-medium truncate max-w-[220px] sm:max-w-none">
                <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{schoolOrDept || "Event Workspace"}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {eventName}
              </h1>

              {isLiveToday && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Today</span>
                </span>
              )}

              {isProEvent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Flagship Pro</span>
                </span>
              )}

              {roleType === "admin" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-[11px] font-bold shadow-2xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-300" />
                  <span>Super Admin</span>
                </span>
              ) : roleType === "staff" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
                  <span>Faculty Coordinator</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Student Coordinator</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Tab Switcher & Scanner CTA */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* FACULTY STAFF / ADMIN TOGGLE SWITCHER */}
            {isStaffOrAdmin && (
              <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/90 gap-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleGuardedNavigation(() => setActiveTab("roster"))}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "roster"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Users
                    className={`h-3.5 w-3.5 shrink-0 ${
                      activeTab === "roster" ? "text-cyan-400" : "text-slate-500"
                    }`}
                  />
                  <span>Attendee Roster</span>
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-extrabold ${
                      activeTab === "roster"
                        ? "bg-slate-800 text-cyan-300 border border-slate-700/80"
                        : "bg-slate-200/90 text-slate-600"
                    }`}
                  >
                    {attendees.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("controls")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "controls"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <ShieldCheck
                    className={`h-3.5 w-3.5 shrink-0 ${
                      activeTab === "controls" ? "text-purple-400" : "text-slate-500"
                    }`}
                  />
                  <span>Staff &amp; Venue Controls</span>
                  {isOpsDirty && (
                    <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Unsaved modifications" />
                  )}
                </button>
              </div>
            )}

            {/* Direct Link to Camera Scanner */}
            <Link
              href={`/coordinator/scanner?eventId=${eventId}`}
              onClick={(e) => {
                if (hasUnsavedChanges) {
                  e.preventDefault();
                  handleGuardedNavigation(() => router.push(`/coordinator/scanner?eventId=${eventId}`));
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm px-3.5 py-2 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Camera className="h-4 w-4" />
              <span>Open Scanner</span>
            </Link>
          </div>
        </div>

        {/* Row 2: 4 Vibrant Themed Telemetry Capsules (Compact & Beautiful) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. Schedule & Venue (Indigo / Purple Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-500/[0.09] via-purple-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25 shrink-0">
                <MapPin className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800/90 block">
                  Schedule &amp; Venue
                </span>
                <p className="text-xs sm:text-sm font-black text-slate-900 truncate block mt-0.5" title={venueInput || eventVenue || "Venue TBA"}>
                  {venueInput || eventVenue || "Venue TBA"}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-indigo-100/90 border border-indigo-200 text-[10px] sm:text-[11px] font-bold text-indigo-950 truncate max-w-full">
                  <Clock className="h-3 w-3 text-indigo-600 shrink-0" />
                  <span>
                    {eventDate ? formatDate(eventDate) : "Date TBA"}
                    {startTime ? ` • ${formatTime(startTime)}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Registered Attendees (Cyan / Blue Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-500/[0.09] via-sky-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-cyan-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/25 shrink-0">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-800/90 block">
                  Delegates Booked
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {attendees.length}
                  </span>
                  <span className="text-[11px] font-bold text-cyan-800 bg-cyan-100/90 border border-cyan-200/90 px-1.5 py-0.5 rounded-md">
                    / {participantLimit ? `${participantLimit} Capacity` : "∞ Uncapped"}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-cyan-200/80 text-[10px] sm:text-[11px] font-bold text-cyan-950 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{pendingCount} Pending Check-In</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 1st Choice Priority (Amber / Orange / Gold Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-500/[0.09] via-orange-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25 shrink-0">
                <Star className="h-4.5 w-4.5 fill-white/40" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800/90 block">
                  1st Choice Priority
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-amber-950 tracking-tight">
                    {priorityOneCount}
                  </span>
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-200/90 px-1.5 py-0.5 rounded-md">
                    ⭐ Slot #1
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-amber-200/80 text-[10px] sm:text-[11px] font-bold text-amber-950 shadow-2xs">
                  <span>Top Preference Enrollments</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Live Attendance Progress (Emerald / Mint / Teal Theme) */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/[0.09] via-teal-500/[0.04] to-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25 shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/90 block">
                  Live Attendance
                </span>
                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                  <span className="text-xs sm:text-sm font-black text-emerald-950 truncate">
                    {attendedCount} Checked In
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono border ${
                      attendedCount > 0
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-2xs"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {attendancePct}%
                  </span>
                </div>
                {/* Glowing Gradient Progress Bar */}
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-200/90 overflow-hidden border border-emerald-100/90 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-sm shadow-emerald-500/40 transition-all duration-500"
                    style={{ width: `${Math.min(100, attendancePct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          VIEW 1: ATTENDEE ROSTER & SEARCH
         ========================================== */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          {/* Single-Row Search & Filter Toolbar */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 sm:gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by delegate name, pass code, reg no, college..."
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filters & Actions Group */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                {/* Attendance Status Dropdown */}
                <select
                  value={filterTab}
                  onChange={(e) => setFilterTab(e.target.value as any)}
                  className={`h-10 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer ${
                    filterTab === "attended"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : filterTab === "pending"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
                  } focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20`}
                >
                  <option value="all">All Attendees ({totalFilteredCount})</option>
                  <option value="attended">✅ Present ({attendedCount})</option>
                  <option value="pending">⏳ Pending ({pendingCount})</option>
                </select>

                {/* Pass Tier Filter Dropdown */}
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className={`h-10 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer ${
                    tierFilter !== "all"
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
                  } focus:border-primary focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20`}
                >
                  <option value="all">All Pass Tiers</option>
                  <option value="pro_pass">⭐ Pro Pass Only</option>
                  <option value="standard_pass">📌 Standard Pass Only</option>
                </select>

                {/* Staff CSV Export Button */}
                {isStaffOrAdmin && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={isExportingCSV}
                    className="h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 text-xs font-bold text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    {isExportingCSV ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Export CSV</span>
                      </>
                    )}
                  </button>
                )}

                {/* Results Count Badge */}
                <div className="hidden xl:flex items-center h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs font-semibold text-slate-600 shrink-0 gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Page {currentPage} of {totalPages} • {totalFilteredCount} Total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Roster Cards View for Mobile (< md) */}
          <div className={`block md:hidden space-y-3 transition-opacity duration-200 ${isLoadingPage ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
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
                <tbody className={`divide-y divide-slate-100 transition-opacity duration-200 ${isLoadingPage ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
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
                                  onClick={() => {
                                    setConfirmCheckInItem(item);
                                    setTypedOverrideCode("");
                                    setOverrideError(null);
                                  }}
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

          {/* Bento Pagination Bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Summary text */}
            <div className="text-xs text-slate-500 font-medium">
              {totalFilteredCount > 0 ? (
                <>
                  Showing <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, totalFilteredCount)}</span> to{" "}
                  <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalFilteredCount)}</span> of{" "}
                  <span className="font-bold text-slate-800">{totalFilteredCount}</span> delegates
                </>
              ) : (
                <span>No delegates found</span>
              )}
              {isLoadingPage && (
                <span className="ml-2.5 inline-flex items-center gap-1.5 text-primary animate-pulse font-semibold">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                </span>
              )}
            </div>

            {/* Right: Page Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Prev Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoadingPage}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Prev</span>
                </button>

                {/* Page Number Pills */}
                {paginationPageNumbers.map((pageItem, idx) => {
                  if (pageItem === "...") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-bold">
                        ...
                      </span>
                    );
                  }
                  const pageNum = pageItem as number;
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoadingPage}
                      className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary text-white shadow-xs scale-105"
                          : "border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoadingPage}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                  aria-label="Next Page"
                >
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW 2: STAFF OPERATIONS & CONTROLS
         ========================================== */}
      {activeTab === "controls" && isStaffOrAdmin && (
        <div className="space-y-4 sm:space-y-5">
          {/* Feedback Alerts (Consolidated at top of workspace) */}
          {(opsFeedback || opsError || linksSuccess || linksError) && (
            <div className="space-y-2">
              {(opsFeedback || linksSuccess) && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-xs flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{opsFeedback || linksSuccess}</span>
                </div>
              )}
              {(opsError || linksError) && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 font-semibold text-xs flex items-center gap-2 shadow-2xs">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{opsError || linksError}</span>
                </div>
              )}
            </div>
          )}

          {/* Symmetrical 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* ----------------------------------------------------
                COLUMN 1 (Left - 6 Cols): Logistics & Public Links
               ---------------------------------------------------- */}
            <div className="lg:col-span-6">
              {/* Single Unified Container: Venue, Brochure, and WhatsApp */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                {/* Unified Card Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        Venue, Brochure &amp; WhatsApp Links
                      </h4>
                      <p className="text-[11px] text-slate-500">Physical room assignment &amp; official links</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold border border-indigo-200">
                    Live Sync
                  </span>
                </div>

                {/* 1. Venue Location (Text Box Only) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Venue Details</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Editable
                    </span>
                  </div>
                  <input
                    type="text"
                    value={venueInput}
                    onChange={(e) => setVenueInput(e.target.value)}
                    placeholder="e.g., Room No.: 8501 Lab / Seminar Hall 2"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                  <p className="text-[11px] text-slate-400">
                    Physical hall, lab, or auditorium displayed on attendee passes.
                  </p>
                </div>

                <div className="border-t border-slate-100" />

                {/* 2. Official Event Brochure PDF */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-purple-500" />
                      <span>Official Event Brochure PDF</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        Editable by Staff &amp; Admin
                      </span>
                      {brochureUrl ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                          Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-medium border border-slate-200">
                          Not Set
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={brochureUrl}
                      onChange={(e) => setBrochureUrl(e.target.value)}
                      placeholder="https://drive.google.com/... or brochure.pdf"
                      className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:outline-hidden focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                    />
                    {brochureUrl.trim() && (
                      <a
                        href={brochureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-primary text-white text-xs font-bold px-3 transition-colors shrink-0 shadow-2xs cursor-pointer"
                        title="Verify link in new tab"
                      >
                        <span>Test</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Unlocks the <strong className="text-purple-700">&quot;View Brochure PDF&quot;</strong> button on the public event page.
                  </p>
                </div>

                <div className="border-t border-slate-100" />

                {/* 3. Official WhatsApp Group */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Official WhatsApp Group</span>
                    </label>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 px-2.5 py-0.5 text-[10px] font-bold border border-purple-200">
                        <ShieldCheck className="h-3 w-3 text-purple-600" />
                        <span>Admin Control</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold border border-slate-200">
                        <Lock className="h-3 w-3 text-slate-500" />
                        <span>Admin Managed</span>
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={whatsappLink}
                        onChange={(e) => setWhatsappLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-100 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenConfirmLinks()}
                        disabled={!isWhatsappDirty || isSavingLinks}
                        className={`h-10 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold px-3.5 transition-all shrink-0 ${
                          isWhatsappDirty && !isSavingLinks
                            ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-2xs"
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                        }`}
                      >
                        <Save className={`h-3.5 w-3.5 ${isWhatsappDirty ? "text-emerald-400" : "text-slate-400"}`} />
                        <span>{isSavingLinks ? "Saving..." : isWhatsappDirty ? "Save Link" : "Saved"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Current Group Link
                        </span>
                        <p className="font-mono text-xs text-slate-800 truncate select-all">
                          {savedWhatsappLink || "No link configured yet"}
                        </p>
                      </div>
                      {savedWhatsappLink && (
                        <a
                          href={savedWhatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 transition-colors shrink-0 shadow-2xs"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Shared with registered delegates for real-time announcements.
                  </p>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------
                COLUMN 2 (Right - 6 Cols): Guidelines & Coordinators
               ---------------------------------------------------- */}
            <div className="lg:col-span-6 space-y-4">
              {/* Card 4: Competition Rules & Guidelines */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-4.5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          Rules &amp; Guidelines
                        </h4>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          {rulesCount} Sections
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Paragraphs, rounds &amp; competition guidelines</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleInsertStandardTemplate}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                    <span>Insert Template</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    rows={7}
                    value={rulesInput}
                    onChange={(e) => setRulesInput(e.target.value)}
                    placeholder={`Round 1: Preliminary Screening\nProvide a comprehensive description of the round format, timing, and preliminary requirements.\n\nRound 2: Main Event & Evaluation\nDetailed specifications regarding workstations, technology stacks, scoring criteria, and presentation guidelines.\n\nGeneral Regulations:\n1. Valid physical College ID card is mandatory for campus entry.\n2. Decision of the jury and evaluation committee is final.`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-900 font-mono leading-relaxed focus:bg-white focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-100 transition-colors resize-y min-h-[180px] sm:min-h-[200px]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Rendered with paragraphs &amp; bullet points on public event modal.</span>
                    <span className="font-mono text-slate-600 font-medium">{rulesInput.length} characters (unlimited paragraphs)</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Student Coordinators Management */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-4.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100 shrink-0">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        Student Coordinators ({studentCoordinators.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">Student volunteers managing check-ins</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentSearchQuery("");
                      setIsAddStudentModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Student</span>
                  </button>
                </div>

                {assignSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{assignSuccess}</span>
                  </div>
                )}

                {assignError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{assignError}</span>
                  </div>
                )}

                {studentCoordinators.length > 0 ? (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {studentCoordinators.map((sc) => (
                      <div
                        key={sc.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 font-extrabold text-cyan-900 text-xs shrink-0">
                            {sc.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">{sc.fullName}</span>
                              {sc.registerNumber && (
                                <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-mono text-slate-700 shrink-0">
                                  {sc.registerNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{sc.email}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokeStudent(sc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
                          title="Revoke Student Coordinator Access"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
                    <Users className="h-6 w-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No Student Coordinators Assigned</p>
                    <p className="text-[11px] text-slate-400">Add student volunteers to grant scanning access</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Integrated Save Action Strip */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs flex items-center gap-2">
              {isOpsDirty ? (
                <>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-bold text-amber-800">
                    Unsaved changes detected. Click &quot;Save Event Configuration&quot; to apply.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-500">
                    All venue, brochure, and rules settings are up to date.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isOpsDirty && (
                <button
                  type="button"
                  onClick={() => {
                    setVenueInput(savedVenue);
                    setBrochureUrl(savedBrochureUrl);
                    setRulesInput(savedRules);
                  }}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold px-3 py-2.5 transition-colors cursor-pointer shrink-0"
                  title="Revert all unsaved changes"
                >
                  Reset
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveEventSettings()}
                disabled={!isOpsDirty || isSavingOps}
                className={`inline-flex items-center justify-center gap-2 rounded-xl text-xs font-extrabold px-6 py-2.5 shadow-sm transition-all w-full sm:w-auto shrink-0 ${
                  isOpsDirty && !isSavingOps
                    ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer ring-2 ring-indigo-500/30"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                }`}
              >
                {isSavingOps ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                    <span>Saving Configuration...</span>
                  </>
                ) : (
                  <>
                    <Save
                      className={`h-4 w-4 ${
                        isOpsDirty ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                    <span>
                      {isOpsDirty ? "Save Event Configuration" : "Saved"}
                    </span>
                  </>
                )}
              </button>
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Required Pass ID</span>
                  <span className="font-mono font-bold text-primary">{confirmCheckInItem.registration_code}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Institution</span>
                <span className="text-slate-700">{confirmCheckInItem.user.college_name || confirmCheckInItem.user.department || "KARE"}</span>
              </div>
            </div>

            {/* Verification Pass Code Input Prompt */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                Type Delegate Event Pass ID to Confirm:
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                To prevent accidental overrides, inspect the delegate&apos;s physical pass or digital pass and type the unique code:
              </p>
              <div className="relative pt-1">
                <input
                  type="text"
                  value={typedOverrideCode}
                  onChange={(e) => {
                    setTypedOverrideCode(e.target.value.toUpperCase());
                    setOverrideError(null);
                  }}
                  placeholder={`e.g. ${confirmCheckInItem.registration_code}`}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors focus:outline-none ${
                    typedOverrideCode.trim().toUpperCase() === confirmCheckInItem.registration_code.trim().toUpperCase()
                      ? "border-emerald-500 bg-emerald-50/40 text-emerald-950 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                      : typedOverrideCode.trim().length > 0
                      ? "border-amber-400 bg-amber-50/30 text-slate-900 focus:border-amber-500"
                      : "border-slate-300 bg-slate-50/50 text-slate-900 focus:border-slate-900 focus:bg-white"
                  }`}
                  autoFocus
                />
                {typedOverrideCode.trim().toUpperCase() === confirmCheckInItem.registration_code.trim().toUpperCase() && (
                  <div className="absolute right-3 top-3.5 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Status Validation Feedback */}
              {typedOverrideCode.trim().length > 0 && typedOverrideCode.trim().toUpperCase() !== confirmCheckInItem.registration_code.trim().toUpperCase() && (
                <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 pt-0.5">
                  <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />
                  <span>Code does not match yet. Expected: {confirmCheckInItem.registration_code}</span>
                </p>
              )}

              {typedOverrideCode.trim().toUpperCase() === confirmCheckInItem.registration_code.trim().toUpperCase() && (
                <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                  <span>Pass ID verified! Ready to confirm manual check-in.</span>
                </p>
              )}

              {overrideError && (
                <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 pt-0.5">
                  <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                  <span>{overrideError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setConfirmCheckInItem(null);
                  setTypedOverrideCode("");
                  setOverrideError(null);
                }}
                disabled={isActionProcessing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedCheckIn}
                disabled={
                  isActionProcessing ||
                  typedOverrideCode.trim().toUpperCase() !== confirmCheckInItem.registration_code.trim().toUpperCase()
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{isActionProcessing ? "Recording..." : "Confirm Manual Check-In"}</span>
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

      {/* MODAL 4: CONFIRM COMMUNICATION LINKS UPDATE (Admin / Super Admin Only) */}
      {isConfirmLinksModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="border-b border-slate-100 p-5 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Confirm Official Links Update
                  </h3>
                  <p className="text-[11px] text-slate-500">Administrator Review for {eventName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConfirmLinksModalOpen(false)}
                disabled={isSavingLinks}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 space-y-3.5">
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Caution:</strong> Updating these links will immediately affect all registered delegates on their digital passes, registration emails, and public event explorer pages.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200 space-y-3.5 text-xs">
                {/* WhatsApp Diff */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">WhatsApp Participant Group Link</span>
                    {savedWhatsappLink !== whatsappLink ? (
                      <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 border border-amber-200">
                        Modified
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-semibold px-2 py-0.5">
                        Unchanged
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-2.5 text-rose-900 break-all">
                      <span className="font-bold text-rose-700 block text-[9px] uppercase font-sans tracking-wider">Current Value:</span>
                      {savedWhatsappLink || <span className="italic text-slate-400 font-sans">None (Unconfigured)</span>}
                    </div>
                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 text-emerald-900 break-all">
                      <span className="font-bold text-emerald-700 block text-[9px] uppercase font-sans tracking-wider">New Value:</span>
                      {whatsappLink || <span className="italic text-slate-400 font-sans">Removed</span>}
                    </div>
                  </div>
                </div>

                {/* Brochure Diff */}
                <div className="space-y-1.5 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Event Brochure PDF URL</span>
                    {savedBrochureUrl !== brochureUrl ? (
                      <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 border border-amber-200">
                        Modified
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-semibold px-2 py-0.5">
                        Unchanged
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-2.5 text-rose-900 break-all">
                      <span className="font-bold text-rose-700 block text-[9px] uppercase font-sans tracking-wider">Current Value:</span>
                      {savedBrochureUrl || <span className="italic text-slate-400 font-sans">None (Unconfigured)</span>}
                    </div>
                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 text-emerald-900 break-all">
                      <span className="font-bold text-emerald-700 block text-[9px] uppercase font-sans tracking-wider">New Value:</span>
                      {brochureUrl || <span className="italic text-slate-400 font-sans">Removed</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmLinksModalOpen(false)}
                disabled={isSavingLinks}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSaveLinks}
                disabled={isSavingLinks}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>{isSavingLinks ? "Saving Changes..." : "Confirm & Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: UNSAVED CHANGES CONFIRMATION POPUP */}
      {isUnsavedModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Unsaved Changes Detected
                </h3>
                <p className="text-xs text-slate-500">
                  You have modifications that have not been saved.
                </p>
              </div>
            </div>

            {/* Changed items recap */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                Pending Modifications:
              </span>
              {venueInput !== savedVenue && (
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Venue Location:</span>
                  </span>
                  <span className="font-bold text-slate-900 truncate max-w-[170px]">{venueInput || "(empty)"}</span>
                </div>
              )}
              {brochureUrl !== savedBrochureUrl && (
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-500" />
                    <span>Brochure PDF:</span>
                  </span>
                  <span className="font-bold text-slate-900 truncate max-w-[170px]">{brochureUrl || "(empty)"}</span>
                </div>
              )}
              {rulesInput !== savedRules && (
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Rules &amp; Guidelines:</span>
                  </span>
                  <span className="font-bold text-slate-900">{rulesInput.length} characters</span>
                </div>
              )}
              {whatsappLink !== savedWhatsappLink && (
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <span>WhatsApp Group:</span>
                  </span>
                  <span className="font-bold text-slate-900 truncate max-w-[170px]">{whatsappLink || "(empty)"}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you leave without saving, these changes will be permanently discarded. What would you like to do?
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsUnsavedModalOpen(false)}
                className="w-full sm:w-auto flex-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={handleDiscardAndLeave}
                className="w-full sm:w-auto flex-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 py-2.5 text-xs font-bold text-rose-700 transition-colors cursor-pointer"
              >
                Discard &amp; Leave
              </button>

              <button
                type="button"
                onClick={handleSaveAndLeave}
                disabled={isSavingOps}
                className="w-full sm:w-auto flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-extrabold text-white transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {isSavingOps ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Save &amp; Leave</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
