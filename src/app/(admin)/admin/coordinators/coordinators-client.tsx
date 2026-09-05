"use client";

import { useState, useMemo } from "react";
import {
  assignCoordinatorAdmin,
  revokeCoordinatorAdmin,
} from "@/actions/admin";
import {
  ShieldCheck,
  Plus,
  Search,
  Trash2,
  Users,
  Calendar,
  Building,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  Clock,
  MapPin,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  UserPlus,
} from "lucide-react";

export interface CoordinatorItem {
  id: string;
  event_id: string | null;
  user_id: string;
  created_at?: string;
  isDbRecord?: boolean;
  isSheetRecord?: boolean;
  isUnassigned?: boolean;
  user?: {
    id: string;
    full_name: string;
    email: string;
    mobile_number?: string;
    register_number?: string;
    department?: string;
  } | null;
  event?: {
    id: string;
    name: string;
    school_or_dept: string;
    venue?: string;
    event_date?: string;
    start_time?: string;
    end_time?: string;
  } | null;
}

export interface ProfileItem {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  department?: string;
  participant_type?: string;
}

export interface EventItem {
  id: string;
  name: string;
  school_or_dept: string;
  venue?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
}

export function CoordinatorsAdminClient({
  staffAssignments: initialStaff,
  studentAssignments: initialStudent,
  allProfiles,
  allEvents,
}: {
  staffAssignments: CoordinatorItem[];
  studentAssignments: CoordinatorItem[];
  allProfiles: ProfileItem[];
  allEvents: EventItem[];
}) {
  const [staffList, setStaffList] = useState<CoordinatorItem[]>(initialStaff);
  const [studentList, setStudentList] = useState<CoordinatorItem[]>(initialStudent);

  // Primary view: "events" (Operations Matrix) vs "coordinators" (Directory)
  const [viewMode, setViewMode] = useState<"events" | "coordinators">("events");

  // Coordinator Directory Filters
  const [coordTab, setCoordTab] = useState<"all" | "staff" | "student" | "unassigned">("all");
  const [coordSearch, setCoordSearch] = useState("");

  // Event Operations Matrix Filters
  const [eventSchoolFilter, setEventSchoolFilter] = useState<string>("all");
  const [eventStatusFilter, setEventStatusFilter] = useState<"all" | "fully_staffed" | "needs_student" | "unstaffed">("all");
  const [eventSearch, setEventSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"staff" | "student">("staff");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Distinct schools/departments from events
  const schools = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((e) => {
      if (e.school_or_dept) set.add(e.school_or_dept);
    });
    return Array.from(set).sort();
  }, [allEvents]);

  // Combined coordinators list with type tag
  const allCoordinatorsCombined = useMemo(() => {
    const list: Array<CoordinatorItem & { type: "staff" | "student" }> = [];
    staffList.forEach((s) => list.push({ ...s, type: "staff" }));
    studentList.forEach((st) => list.push({ ...st, type: "student" }));
    return list;
  }, [staffList, studentList]);

  // Quick lookup of currently assigned event for any user ID
  const userCurrentAssignment = useMemo(() => {
    const map = new Map<string, { event: any; type: "staff" | "student"; assignmentId: string }>();
    allCoordinatorsCombined.forEach((item) => {
      if (item.event && item.event.id && item.user_id) {
        map.set(item.user_id, {
          event: item.event,
          type: item.type,
          assignmentId: item.id,
        });
      }
    });
    return map;
  }, [allCoordinatorsCombined]);

  // Event Coverage Matrix: For each of the 61 events, map assigned staff & students
  const eventsMatrix = useMemo(() => {
    return allEvents.map((evt) => {
      const assignedStaff = staffList.filter((s) => s.event_id === evt.id || s.event?.id === evt.id);
      const assignedStudents = studentList.filter((st) => st.event_id === evt.id || st.event?.id === evt.id);

      let status: "fully_staffed" | "needs_student" | "unstaffed" = "unstaffed";
      if (assignedStaff.length > 0 && assignedStudents.length > 0) {
        status = "fully_staffed";
      } else if (assignedStaff.length > 0) {
        status = "needs_student";
      }

      return {
        event: evt,
        assignedStaff,
        assignedStudents,
        status,
      };
    });
  }, [allEvents, staffList, studentList]);

  // High-level KPI Stats
  const stats = useMemo(() => {
    const totalEvents = allEvents.length;
    const fullyStaffed = eventsMatrix.filter((e) => e.status === "fully_staffed").length;
    const needsStudent = eventsMatrix.filter((e) => e.status === "needs_student").length;
    const unstaffed = eventsMatrix.filter((e) => e.status === "unstaffed").length;
    const coveredEvents = totalEvents - unstaffed;
    const coveragePct = totalEvents > 0 ? Math.round((coveredEvents / totalEvents) * 100) : 0;

    const activeStaff = staffList.filter((s) => s.event_id && !s.isUnassigned).length;
    const activeStudents = studentList.filter((s) => s.event_id && !s.isUnassigned).length;
    const unassignedCoordinators = allCoordinatorsCombined.filter((c) => !c.event_id || c.isUnassigned).length;

    return {
      totalEvents,
      coveredEvents,
      coveragePct,
      fullyStaffed,
      needsStudent,
      unstaffed,
      activeStaff,
      activeStudents,
      unassignedCoordinators,
    };
  }, [allEvents, eventsMatrix, staffList, studentList, allCoordinatorsCombined]);

  // Filtered Event Matrix (for Competitions View)
  const filteredEventsMatrix = useMemo(() => {
    return eventsMatrix.filter((item) => {
      // School filter
      if (eventSchoolFilter !== "all" && item.event.school_or_dept !== eventSchoolFilter) {
        return false;
      }
      // Status filter
      if (eventStatusFilter !== "all" && item.status !== eventStatusFilter) {
        return false;
      }
      // Search filter
      const q = eventSearch.trim().toLowerCase();
      if (!q) return true;

      const eventName = item.event.name?.toLowerCase() || "";
      const school = item.event.school_or_dept?.toLowerCase() || "";
      const venue = item.event.venue?.toLowerCase() || "";
      const staffNames = item.assignedStaff.map((s) => s.user?.full_name?.toLowerCase() || "").join(" ");
      const studentNames = item.assignedStudents.map((s) => s.user?.full_name?.toLowerCase() || "").join(" ");

      return (
        eventName.includes(q) ||
        school.includes(q) ||
        venue.includes(q) ||
        staffNames.includes(q) ||
        studentNames.includes(q)
      );
    });
  }, [eventsMatrix, eventSchoolFilter, eventStatusFilter, eventSearch]);

  // Filtered Coordinators List (for Directory View)
  const filteredCoordinators = useMemo(() => {
    return allCoordinatorsCombined.filter((item) => {
      if (coordTab === "staff" && item.type !== "staff") return false;
      if (coordTab === "student" && item.type !== "student") return false;
      if (coordTab === "unassigned" && item.event_id && !item.isUnassigned) return false;

      const q = coordSearch.trim().toLowerCase();
      if (!q) return true;

      const userName = item.user?.full_name?.toLowerCase() || "";
      const userEmail = item.user?.email?.toLowerCase() || "";
      const userDept = item.user?.department?.toLowerCase() || "";
      const eventName = item.event?.name?.toLowerCase() || "";
      const school = item.event?.school_or_dept?.toLowerCase() || "";

      return (
        userName.includes(q) ||
        userEmail.includes(q) ||
        userDept.includes(q) ||
        eventName.includes(q) ||
        school.includes(q)
      );
    });
  }, [allCoordinatorsCombined, coordTab, coordSearch]);

  // Trigger Modal to Assign
  const openAssignModal = (preselectedEventId?: string, preselectedType?: "staff" | "student") => {
    setActionError(null);
    setActionSuccess(null);
    setModalType(preselectedType || "staff");
    setSelectedEventId(preselectedEventId || allEvents[0]?.id || "");
    setSelectedUserId("");
    setIsModalOpen(true);
  };

  // Trigger Modal to Reassign a specific coordinator
  const openReassignModal = (coord: CoordinatorItem & { type: "staff" | "student" }) => {
    setActionError(null);
    setActionSuccess(null);
    setModalType(coord.type);
    setSelectedUserId(coord.user_id);
    setSelectedEventId(coord.event_id || allEvents[0]?.id || "");
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedEventId) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await assignCoordinatorAdmin(modalType, selectedEventId, selectedUserId);

    if (!res.success) {
      setActionError(res.error || "Failed to assign coordinator");
      setIsSubmitting(false);
      return;
    }

    const targetUser = allProfiles.find((p) => p.id === selectedUserId);
    const targetEvent = allEvents.find((e) => e.id === selectedEventId);

    const newAssignment: CoordinatorItem = {
      id: "db_" + Math.random().toString(36).substring(2, 9),
      event_id: selectedEventId,
      user_id: selectedUserId,
      created_at: new Date().toISOString(),
      isDbRecord: true,
      isUnassigned: false,
      user: targetUser ? { ...targetUser } : null,
      event: targetEvent ? { ...targetEvent } : null,
    };

    // STRICT 1-EVENT RULE: Remove this user from any previous assignments
    setStaffList((prev) => {
      const filtered = prev.filter((a) => a.user_id !== selectedUserId);
      return modalType === "staff" ? [newAssignment, ...filtered] : filtered;
    });

    setStudentList((prev) => {
      const filtered = prev.filter((a) => a.user_id !== selectedUserId);
      return modalType === "student" ? [newAssignment, ...filtered] : filtered;
    });

    setActionSuccess(
      `Successfully assigned ${targetUser?.full_name || "Coordinator"} strictly to "${targetEvent?.name}"!`
    );
    setIsModalOpen(false);
    setIsSubmitting(false);
    setTimeout(() => setActionSuccess(null), 4500);
  };

  // Revoke Handler
  const handleRevoke = async (
    assignmentId: string,
    userId: string,
    type: "staff" | "student",
    coordinatorName: string,
    eventName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to revoke ${coordinatorName}'s coordinator role for "${eventName}"?`
      )
    ) {
      return;
    }

    const res = await revokeCoordinatorAdmin(type, assignmentId, userId);
    if (res.success) {
      if (type === "staff") {
        setStaffList((prev) => prev.filter((a) => a.id !== assignmentId));
      } else {
        setStudentList((prev) => prev.filter((a) => a.id !== assignmentId));
      }
      setActionSuccess(`Coordinator role revoked for ${coordinatorName}.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } else {
      alert(res.error || "Failed to revoke coordinator");
    }
  };

  // Identify currently selected user in modal to show warning if reassigning
  const activeSelectedUserExisting = selectedUserId
    ? userCurrentAssignment.get(selectedUserId)
    : null;

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-extrabold block text-sm">Action Complete</span>
              <span className="text-emerald-700">{actionSuccess}</span>
            </div>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Strict Security Policy Notice */}
      <div className="rounded-3xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/70 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                Strict 1-Event Coordinator Access Enforced
              </h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                Single-Event Bound
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Coordinators are strictly restricted to their designated competition for QR scanning, check-in, and participant roster access. Global access across all 61 competitions is exclusively reserved for Super Admin and Administrators.
            </p>
          </div>
        </div>

        <button
          onClick={() => openAssignModal()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Assign Coordinator</span>
        </button>
      </div>

      {/* KPI Operations Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Competitions & Coverage */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Competitions
            </span>
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.coveredEvents}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {stats.totalEvents} Staffed
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.coveragePct}%` }}
            />
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {stats.coveragePct}% events have active lead
          </div>
        </div>

        {/* Faculty Staff Leads */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Faculty Leads
            </span>
            <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-900">
              {stats.activeStaff}
            </span>
            <span className="text-xs font-bold text-indigo-600/80">Faculty Members</span>
          </div>
          <p className="text-[11px] text-slate-500">
            1 faculty coordinator per event
          </p>
        </div>

        {/* Student Coordinators */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Student Leads
            </span>
            <div className="p-1.5 rounded-xl bg-purple-50 text-purple-700">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-900">
              {stats.activeStudents}
            </span>
            <span className="text-xs font-bold text-purple-600/80">Student Leads</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Assigned for on-ground verification
          </p>
        </div>

        {/* Attention Required / Unstaffed */}
        <div
          onClick={() => {
            setViewMode("events");
            setEventStatusFilter(stats.unstaffed > 0 ? "unstaffed" : "needs_student");
          }}
          className={`rounded-3xl border p-4 sm:p-5 shadow-xs space-y-2 cursor-pointer transition-all hover:scale-[1.01] ${
            stats.unstaffed > 0
              ? "border-rose-200 bg-rose-50/50 hover:bg-rose-50"
              : "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Needs Attention
            </span>
            <div
              className={`p-1.5 rounded-xl ${
                stats.unstaffed > 0
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                stats.unstaffed > 0 ? "text-rose-900" : "text-amber-900"
              }`}
            >
              {stats.unstaffed > 0 ? stats.unstaffed : stats.needsStudent}
            </span>
            <span className="text-xs font-bold text-slate-600">
              {stats.unstaffed > 0 ? "Unstaffed Events" : "Need Student Lead"}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <span>Click to filter events</span>
            <ChevronRight className="h-3 w-3 inline" />
          </p>
        </div>
      </div>

      {/* Navigation View Switcher (By Competitions vs By Coordinators) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            onClick={() => setViewMode("events")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              viewMode === "events"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Competitions Operations Matrix ({allEvents.length})</span>
          </button>
          <button
            onClick={() => setViewMode("coordinators")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              viewMode === "coordinators"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="h-4 w-4 text-purple-600" />
            <span>Coordinator Directory ({allCoordinatorsCombined.length})</span>
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Real-time Event Scoping Active</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          VIEW 1: COMPETITIONS OPERATIONS MATRIX (EVENT-CENTRIC)
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "events" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Search competition by title, school, venue, or coordinator name..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setEventStatusFilter("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    eventStatusFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Statuses ({eventsMatrix.length})
                </button>
                <button
                  onClick={() => setEventStatusFilter("fully_staffed")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    eventStatusFilter === "fully_staffed"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  Fully Staffed ({stats.fullyStaffed})
                </button>
                <button
                  onClick={() => setEventStatusFilter("needs_student")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    eventStatusFilter === "needs_student"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  Needs Student ({stats.needsStudent})
                </button>
                <button
                  onClick={() => setEventStatusFilter("unstaffed")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    eventStatusFilter === "unstaffed"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  Unstaffed ({stats.unstaffed})
                </button>
              </div>
            </div>

            {/* School / Department Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                School:
              </span>
              <button
                onClick={() => setEventSchoolFilter("all")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  eventSchoolFilter === "all"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All Departments ({allEvents.length})
              </button>
              {schools.map((school) => {
                const count = allEvents.filter((e) => e.school_or_dept === school).length;
                return (
                  <button
                    key={school}
                    onClick={() => setEventSchoolFilter(school)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      eventSchoolFilter === school
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {school} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Competitions Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEventsMatrix.length > 0 ? (
              filteredEventsMatrix.map(({ event: evt, assignedStaff, assignedStudents, status }) => (
                <div
                  key={evt.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-200 hover:shadow-md transition-all"
                >
                  {/* Top: Event Identity & Status */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 max-w-[200px] truncate">
                        {evt.school_or_dept}
                      </span>
                      {status === "fully_staffed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Fully Staffed</span>
                        </span>
                      )}
                      {status === "needs_student" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200 shrink-0">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          <span>Needs Student</span>
                        </span>
                      )}
                      {status === "unstaffed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200 shrink-0">
                          <AlertCircle className="h-3 w-3 text-rose-600" />
                          <span>Unstaffed</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 line-clamp-2">
                      {evt.name}
                    </h4>

                    {/* Venue & Schedule metadata */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      {evt.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{evt.venue}</span>
                        </span>
                      )}
                      {evt.event_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{evt.event_date}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Staffing Slots */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {/* Faculty Staff Slot */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Faculty Staff Coordinator</span>
                        <span className="text-indigo-600">Level 3</span>
                      </div>
                      {assignedStaff.length > 0 ? (
                        assignedStaff.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 truncate">
                                {s.user?.full_name || "Faculty Coordinator"}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {s.user?.email}
                              </div>
                              {s.user?.mobile_number && (
                                <div className="text-[9px] text-slate-400 font-mono">
                                  Ph: {s.user.mobile_number}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openReassignModal({ ...s, type: "staff" })}
                                title="Reassign Faculty Coordinator"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleRevoke(
                                    s.id,
                                    s.user_id,
                                    "staff",
                                    s.user?.full_name || "Faculty",
                                    evt.name
                                  )
                                }
                                title="Remove Faculty Coordinator"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <button
                          onClick={() => openAssignModal(evt.id, "staff")}
                          className="w-full rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/70 p-2 text-center text-xs font-bold text-indigo-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Assign Faculty Staff</span>
                        </button>
                      )}
                    </div>

                    {/* Student Lead Slot */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Student Coordinator Lead</span>
                        <span className="text-purple-600">Level 2</span>
                      </div>
                      {assignedStudents.length > 0 ? (
                        assignedStudents.map((st) => (
                          <div
                            key={st.id}
                            className="rounded-2xl border border-purple-100 bg-purple-50/40 p-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 truncate">
                                {st.user?.full_name || "Student Coordinator"}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {st.user?.email}
                              </div>
                              {st.user?.register_number && (
                                <div className="text-[9px] text-slate-400 font-mono">
                                  Reg: {st.user.register_number}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openReassignModal({ ...st, type: "student" })}
                                title="Reassign Student Coordinator"
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleRevoke(
                                    st.id,
                                    st.user_id,
                                    "student",
                                    st.user?.full_name || "Student",
                                    evt.name
                                  )
                                }
                                title="Remove Student Coordinator"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <button
                          onClick={() => openAssignModal(evt.id, "student")}
                          className="w-full rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 hover:bg-purple-50/70 p-2 text-center text-xs font-bold text-purple-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Assign Student Lead</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No competitions found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search query, department filter, or staffing status pills above.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          VIEW 2: COORDINATOR DIRECTORY (PERSON-CENTRIC)
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "coordinators" && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80 shrink-0">
              <button
                onClick={() => setCoordTab("all")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  coordTab === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All Roles ({allCoordinatorsCombined.length})
              </button>
              <button
                onClick={() => setCoordTab("staff")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  coordTab === "staff"
                    ? "bg-white text-indigo-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Faculty Staff ({staffList.length})
              </button>
              <button
                onClick={() => setCoordTab("student")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  coordTab === "student"
                    ? "bg-white text-purple-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Student Leads ({studentList.length})
              </button>
              <button
                onClick={() => setCoordTab("unassigned")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  coordTab === "unassigned"
                    ? "bg-white text-amber-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Pending Assignment ({stats.unassignedCoordinators})
              </button>
            </div>

            <button
              onClick={() => openAssignModal()}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Assign New Coordinator</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={coordSearch}
              onChange={(e) => setCoordSearch(e.target.value)}
              placeholder="Search coordinator by name, email, department, or assigned competition..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Coordinator Details</th>
                  <th className="px-5 py-3.5">Designated Role</th>
                  <th className="px-5 py-3.5">Assigned Single Competition</th>
                  <th className="px-5 py-3.5">Verification Source</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCoordinators.length > 0 ? (
                  filteredCoordinators.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Coordinator Identity */}
                      <td className="px-5 py-3.5">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {item.user?.full_name || "Coordinator"}
                        </div>
                        <div className="text-[11px] text-slate-500">{item.user?.email}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          {item.user?.mobile_number && (
                            <span className="font-mono">Ph: {item.user.mobile_number}</span>
                          )}
                          {item.user?.department && (
                            <span className="border-l border-slate-200 pl-2">
                              {item.user.department}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Type */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                            item.type === "staff"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {item.type === "staff" ? (
                            <>
                              <Users className="h-3 w-3" />
                              <span>Faculty Staff</span>
                            </>
                          ) : (
                            <>
                              <GraduationCap className="h-3 w-3" />
                              <span>Student Lead</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Competition Assignment (Strictly 1) */}
                      <td className="px-5 py-3.5">
                        {item.event && item.event.name ? (
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{item.event.name}</span>
                              <span className="inline-block rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px] font-bold">
                                1:1 Bound
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.event.school_or_dept}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold">
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              <span>Unassigned / Pending</span>
                            </span>
                            <button
                              onClick={() => openReassignModal(item)}
                              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Assign Event
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] font-medium text-slate-500">
                          {item.isSheetRecord
                            ? "Department Schedule"
                            : "Platform Database"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openReassignModal(item)}
                            title="Reassign Event"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleRevoke(
                                item.id,
                                item.user_id,
                                item.type,
                                item.user?.full_name || "Coordinator",
                                item.event?.name || "Assigned Event"
                              )
                            }
                            title="Revoke Role"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                      No coordinators found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          ASSIGN / REASSIGN COORDINATOR MODAL (ENFORCING STRICT 1-EVENT POLICY)
          ───────────────────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 pr-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Single-Event Scoping Policy</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {activeSelectedUserExisting
                  ? "Reassign Coordinator Event"
                  : "Assign Event Coordinator"}
              </h2>
              <p className="text-xs text-slate-500">
                Grant gate scanning, attendee roster verification, and check-in privileges strictly for one designated event.
              </p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 pt-1">
              {/* Coordinator Role Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Coordinator Role Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType("staff")}
                    className={`rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer text-left ${
                      modalType === "staff"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-900 shadow-2xs"
                        : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-extrabold text-sm">Faculty Staff</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      Faculty / Department Coordinator
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType("student")}
                    className={`rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer text-left ${
                      modalType === "student"
                        ? "bg-purple-50 border-purple-600 text-purple-900 shadow-2xs"
                        : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-extrabold text-sm">Student Lead</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      Student Coordinator
                    </div>
                  </button>
                </div>
              </div>

              {/* User Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Select User Account
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none shadow-2xs"
                  required
                >
                  <option value="">-- Choose registered user --</option>
                  {allProfiles.map((u) => {
                    const current = userCurrentAssignment.get(u.id);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                        {current?.event?.name ? ` [Assigned: ${current.event.name}]` : " [Unassigned]"}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reassignment Warning Banner */}
              {activeSelectedUserExisting && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">1-Event Scoping Notice:</span>
                    <span>
                      This coordinator is currently assigned to{" "}
                      <strong>&quot;{activeSelectedUserExisting.event?.name}&quot;</strong>.
                      Assigning to a new event will automatically move them to the selected competition.
                    </span>
                  </div>
                </div>
              )}

              {/* Event Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Designated Competition (Strictly 1 Event)
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none shadow-2xs truncate"
                  required
                >
                  <option value="">-- Choose competition (61 events) --</option>
                  {allEvents.map((evt) => {
                    const assignedStaff = staffList.find((s) => s.event_id === evt.id || s.event?.id === evt.id);
                    const staffLabel = assignedStaff?.user?.full_name ? `(Staff: ${assignedStaff.user.full_name})` : "(Staff: None)";
                    return (
                      <option key={evt.id} value={evt.id}>
                        {evt.name} • {evt.school_or_dept} {staffLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Error Notice */}
              {actionError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedUserId || !selectedEventId}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Assigning...</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>
                        {activeSelectedUserExisting ? "Confirm Reassignment" : "Confirm Single Assignment"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
