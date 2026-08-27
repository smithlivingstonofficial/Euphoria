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
} from "lucide-react";

interface AssignmentItem {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
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
  } | null;
}

interface ProfileItem {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  participant_type: string;
}

interface EventItem {
  id: string;
  name: string;
  school_or_dept: string;
}

export function CoordinatorsAdminClient({
  staffAssignments: initialStaff,
  studentAssignments: initialStudent,
  allProfiles,
  allEvents,
}: {
  staffAssignments: AssignmentItem[];
  studentAssignments: AssignmentItem[];
  allProfiles: ProfileItem[];
  allEvents: EventItem[];
}) {
  const [staffList, setStaffList] = useState<AssignmentItem[]>(initialStaff);
  const [studentList, setStudentList] = useState<AssignmentItem[]>(initialStudent);
  const [activeTab, setActiveTab] = useState<"all" | "staff" | "student">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignType, setAssignType] = useState<"staff" | "student">("staff");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Combined assignments with type flag
  const combinedList = useMemo(() => {
    const list: Array<AssignmentItem & { type: "staff" | "student" }> = [];
    staffList.forEach((s) => list.push({ ...s, type: "staff" }));
    studentList.forEach((s) => list.push({ ...s, type: "student" }));
    return list;
  }, [staffList, studentList]);

  // Filtered list
  const filteredList = useMemo(() => {
    return combinedList.filter((item) => {
      if (activeTab === "staff" && item.type !== "staff") return false;
      if (activeTab === "student" && item.type !== "student") return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const userName = item.user?.full_name?.toLowerCase() || "";
      const userEmail = item.user?.email?.toLowerCase() || "";
      const eventName = item.event?.name?.toLowerCase() || "";
      const school = item.event?.school_or_dept?.toLowerCase() || "";

      return (
        userName.includes(q) ||
        userEmail.includes(q) ||
        eventName.includes(q) ||
        school.includes(q)
      );
    });
  }, [combinedList, activeTab, searchQuery]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedEventId) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await assignCoordinatorAdmin(assignType, selectedEventId, selectedUserId);

    if (!res.success) {
      setActionError(res.error || "Failed to assign coordinator");
    } else {
      setActionSuccess("Coordinator successfully assigned!");
      const targetUser = allProfiles.find((p) => p.id === selectedUserId);
      const targetEvent = allEvents.find((e) => e.id === selectedEventId);

      const newAssignment: AssignmentItem = {
        id: Math.random().toString(),
        event_id: selectedEventId,
        user_id: selectedUserId,
        created_at: new Date().toISOString(),
        user: targetUser ? { ...targetUser } : null,
        event: targetEvent ? { ...targetEvent } : null,
      };

      if (assignType === "staff") {
        setStaffList((prev) => [newAssignment, ...prev]);
      } else {
        setStudentList((prev) => [newAssignment, ...prev]);
      }

      setIsModalOpen(false);
      setSelectedUserId("");
      setSelectedEventId("");
      setTimeout(() => setActionSuccess(null), 4000);
    }
    setIsSubmitting(false);
  };

  const handleRevoke = async (assignmentId: string, userId: string, type: "staff" | "student") => {
    if (!confirm("Are you sure you want to revoke this coordinator role?")) return;

    const res = await revokeCoordinatorAdmin(type, assignmentId, userId);
    if (res.success) {
      if (type === "staff") {
        setStaffList((prev) => prev.filter((a) => a.id !== assignmentId));
      } else {
        setStudentList((prev) => prev.filter((a) => a.id !== assignmentId));
      }
      setActionSuccess("Coordinator assignment revoked.");
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{actionSuccess}</span>
        </div>
      )}

      {/* Metrics & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All Roles ({combinedList.length})
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "staff"
                ? "bg-white text-indigo-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Faculty Staff ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab("student")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "student"
                ? "bg-white text-purple-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Student Coordinators ({studentList.length})
          </button>
        </div>

        {/* Modal Trigger */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Assign New Coordinator</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by coordinator name, email, department, or competition name..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Coordinator Name</th>
                <th className="px-5 py-3.5">Role Type</th>
                <th className="px-5 py-3.5">Assigned Competition</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.length > 0 ? (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Coordinator Identity */}
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {item.user?.full_name || "Coordinator"}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.user?.email}</div>
                      {item.user?.mobile_number && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Ph: {item.user.mobile_number}
                        </div>
                      )}
                    </td>

                    {/* Role Type */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          item.type === "staff"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {item.type === "staff" ? "Faculty Staff" : "Student Coordinator"}
                      </span>
                    </td>

                    {/* Competition */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">
                        {item.event?.name || "Competition"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.event?.school_or_dept || "KARE"}
                      </div>
                    </td>

                    {/* Revoke Action */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleRevoke(item.id, item.user_id, item.type)}
                        title="Revoke Coordinator Role"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-xs text-slate-400">
                    No coordinator assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Coordinator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 pr-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Assign Operations Role</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Assign Event Coordinator
              </h2>
              <p className="text-xs text-slate-500">
                Grant gate scanning, attendee roster verification, and check-in privileges.
              </p>
            </div>

            <form onSubmit={handleAssign} className="space-y-4 pt-1">
              {/* Type Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Coordinator Role Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignType("staff")}
                    className={`rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer text-left ${
                      assignType === "staff"
                        ? "bg-indigo-50 border-primary text-primary shadow-2xs"
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
                    onClick={() => setAssignType("student")}
                    className={`rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer text-left ${
                      assignType === "student"
                        ? "bg-purple-50 border-purple-600 text-purple-700 shadow-2xs"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none shadow-2xs"
                  required
                >
                  <option value="">-- Choose registered user --</option>
                  {allProfiles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Assigned Competition
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none shadow-2xs truncate"
                  required
                >
                  <option value="">-- Choose competition (61 events) --</option>
                  {allEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} • {evt.school_or_dept}
                    </option>
                  ))}
                </select>
              </div>

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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedUserId || !selectedEventId}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Assigning...</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Confirm Assignment</span>
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
