"use client";

import { useState } from "react";
import {
  updateEventLinksStaff,
  assignStudentCoordinatorStaff,
  revokeStudentCoordinatorStaff,
} from "@/actions/coordinator";
import {
  Link as LinkIcon,
  FileText,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  X,
  ExternalLink,
  Sparkles,
  GraduationCap,
} from "lucide-react";

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

export function StaffControlsClient({
  eventId,
  initialWhatsappLink,
  initialBrochureUrl,
  initialStudentCoordinators,
  allProfiles,
}: {
  eventId: string;
  initialWhatsappLink: string;
  initialBrochureUrl: string;
  initialStudentCoordinators: StudentCoordinator[];
  allProfiles: ProfileItem[];
}) {
  const [whatsappLink, setWhatsappLink] = useState(initialWhatsappLink);
  const [brochureUrl, setBrochureUrl] = useState(initialBrochureUrl);
  const [studentCoordinators, setStudentCoordinators] = useState<StudentCoordinator[]>(
    initialStudentCoordinators
  );

  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [linksSuccess, setLinksSuccess] = useState<string | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);

  // Add Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

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
      setIsAddModalOpen(false);
    } else {
      setAssignError(res.error || "Failed to assign student coordinator");
    }
    setIsSubmittingAssign(false);
  };

  const handleRevokeStudent = async (student: StudentCoordinator) => {
    if (!confirm(`Are you sure you want to remove ${student.fullName} as Student Coordinator for this event?`)) {
      return;
    }

    const res = await revokeStudentCoordinatorStaff(eventId, student.userId);
    if (res.success) {
      setStudentCoordinators((prev) => prev.filter((s) => s.userId !== student.userId));
      setAssignSuccess(`Revoked Student Coordinator status for ${student.fullName}`);
    } else {
      setAssignError(res.error || "Failed to revoke student coordinator");
    }
  };

  const filteredCandidates = allProfiles.filter((p) => {
    const isAlreadyAssigned = studentCoordinators.some((s) => s.userId === p.id);
    if (isAlreadyAssigned) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.register_number || "").toLowerCase().includes(q) ||
      (p.mobile_number || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            Faculty Staff Operations Panel
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* 1. EDIT EVENT COMMUNICATION LINKS (6 Cols) */}
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

        {/* 2. MANAGE STUDENT COORDINATORS ROSTER (6 Cols) */}
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
                setSearchQuery("");
                setIsAddModalOpen(true);
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

      {/* ADD STUDENT COORDINATOR SELECTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            {/* Modal Header */}
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
                    Select a student delegate to grant QR scanner &amp; gate check-in rights.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, email, or register number..."
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
                    {searchQuery ? "No matching students found." : "Type a student name or email to search."}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
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
