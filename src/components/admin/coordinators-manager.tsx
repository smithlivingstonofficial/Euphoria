"use client";

import { useState } from "react";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Calendar,
  User,
  Mail,
  Phone,
  Building,
  QrCode,
  Sparkles,
  AlertCircle,
  Plus,
} from "lucide-react";
import { assignCoordinatorAdmin, revokeCoordinatorAdmin } from "@/actions/admin";

interface CoordinatorAssignment {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  user?: any;
  event?: any;
}

interface ProfileOption {
  id: string;
  full_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  participant_type?: string | null;
}

interface EventOption {
  id: string;
  name: string;
  school_or_dept?: string | null;
}

export function CoordinatorsManager({
  initialStaff,
  initialStudents,
  allProfiles,
  allEvents,
}: {
  initialStaff: CoordinatorAssignment[];
  initialStudents: CoordinatorAssignment[];
  allProfiles: ProfileOption[];
  allEvents: EventOption[];
}) {
  const [staffList, setStaffList] = useState(initialStaff);
  const [studentList, setStudentList] = useState(initialStudents);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<"staff" | "student">("student");
  const [selectedEventId, setSelectedEventId] = useState(allEvents[0]?.id || "");
  const [selectedUserId, setSelectedUserId] = useState(allProfiles[0]?.id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !selectedUserId) return;

    setIsLoading(true);
    setErrorMessage(null);

    const res = await assignCoordinatorAdmin(type, selectedEventId, selectedUserId);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to assign coordinator");
      setIsLoading(false);
    } else {
      const assignedUser = allProfiles.find((p) => p.id === selectedUserId);
      const assignedEvent = allEvents.find((e) => e.id === selectedEventId);

      const newAssignment: CoordinatorAssignment = {
        id: "new-" + Date.now(),
        event_id: selectedEventId,
        user_id: selectedUserId,
        created_at: new Date().toISOString(),
        user: {
          id: selectedUserId,
          full_name: assignedUser?.full_name,
          email: assignedUser?.email,
          mobile_number: assignedUser?.mobile_number,
        },
        event: {
          id: selectedEventId,
          name: assignedEvent?.name,
        },
      };

      if (type === "staff") {
        setStaffList((prev) => [newAssignment, ...prev]);
      } else {
        setStudentList((prev) => [newAssignment, ...prev]);
      }

      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  const handleRevoke = async (type: "staff" | "student", assignmentId: string, userId: string) => {
    if (!window.confirm("Are you sure you want to revoke this coordinator's privileges?")) return;

    const res = await revokeCoordinatorAdmin(type, assignmentId, userId);
    if (res.success) {
      if (type === "staff") {
        setStaffList((prev) => prev.filter((a) => a.id !== assignmentId));
      } else {
        setStudentList((prev) => prev.filter((a) => a.id !== assignmentId));
      }
    } else {
      alert(res.error || "Failed to revoke coordinator");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Event Coordinator Staffing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Student coordinators are granted live QR camera scanning access at /coordinator/[eventId]/scan
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span>Assign Coordinator</span>
        </button>
      </div>

      {/* Grid: Staff vs Student Coordinators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Coordinators Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700">
                <QrCode className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                Student Event Coordinators ({studentList.length})
              </h3>
            </div>
            <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold border border-purple-200">
              Camera Terminal Access
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {studentList.length > 0 ? (
              studentList.map((item) => {
                const u = Array.isArray(item.user) ? item.user[0] : item.user;
                const e = Array.isArray(item.event) ? item.event[0] : item.event;

                return (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {u?.full_name || "Student Coordinator"}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{u?.email}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-indigo-100 truncate max-w-[200px]">
                          {e?.name || "Assigned Event"}
                        </span>
                        {u?.register_number && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {u.register_number}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevoke("student", item.id, item.user_id)}
                      title="Revoke Coordinator Access"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No student coordinators assigned yet.
              </div>
            )}
          </div>
        </div>

        {/* Faculty / Staff Coordinators Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                Faculty &amp; Staff Coordinators ({staffList.length})
              </h3>
            </div>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-200">
              Department Oversight
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {staffList.length > 0 ? (
              staffList.map((item) => {
                const u = Array.isArray(item.user) ? item.user[0] : item.user;
                const e = Array.isArray(item.event) ? item.event[0] : item.event;

                return (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {u?.full_name || "Faculty Coordinator"}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{u?.email}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-indigo-100 truncate max-w-[200px]">
                          {e?.name || "Assigned Event"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevoke("staff", item.id, item.user_id)}
                      title="Revoke Staff Assignment"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No faculty coordinators assigned yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Assign Coordinator to Event
            </h3>

            {errorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-4">
              {/* Role Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Coordinator Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("student")}
                    className={`rounded-lg p-2 text-xs font-semibold border transition-all text-center ${
                      type === "student"
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Student (QR Scanner)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("staff")}
                    className={`rounded-lg p-2 text-xs font-semibold border transition-all text-center ${
                      type === "staff"
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Faculty / Staff
                  </button>
                </div>
              </div>

              {/* Event Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Technical Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
                >
                  {allEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select User Account
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
                >
                  {allProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || "User"} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover disabled:opacity-50"
                >
                  {isLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
