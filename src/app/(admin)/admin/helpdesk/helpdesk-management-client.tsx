"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  HelpdeskOperatorItem,
  assignHelpdeskOperatorAction,
  revokeHelpdeskOperatorAction,
} from "@/actions/helpdesk";
import {
  Headphones,
  Search,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Building,
  Mail,
  GraduationCap,
  X,
  Loader2,
  Info,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export function HelpdeskManagementClient({
  initialOperators,
  isSuperAdmin,
}: {
  initialOperators: HelpdeskOperatorItem[];
  isSuperAdmin: boolean;
}) {
  const [operators, setOperators] = useState<HelpdeskOperatorItem[]>(initialOperators);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Revoke confirmation modal
  const [revokeTarget, setRevokeTarget] = useState<HelpdeskOperatorItem | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered operators
  const filteredOperators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return operators;
    return operators.filter((op) => {
      return (
        op.email.toLowerCase().includes(q) ||
        op.fullName.toLowerCase().includes(q) ||
        (op.department && op.department.toLowerCase().includes(q)) ||
        (op.collegeName && op.collegeName.toLowerCase().includes(q)) ||
        (op.registerNumber && op.registerNumber.toLowerCase().includes(q))
      );
    });
  }, [operators, searchQuery]);

  // Handle Add Operator
  const handleAssignOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setModalError(null);
    startTransition(async () => {
      const res = await assignHelpdeskOperatorAction(emailInput);
      if (res.success) {
        showToast(res.message || "Operator added successfully!", "success");
        setIsAddModalOpen(false);
        setEmailInput("");
        // Optimistic refresh
        window.location.reload();
      } else {
        setModalError(res.error || "Failed to assign operator.");
      }
    });
  };

  // Handle Revoke Operator
  const handleConfirmRevoke = () => {
    if (!revokeTarget) return;

    startTransition(async () => {
      const res = await revokeHelpdeskOperatorAction(revokeTarget.userId);
      if (res.success) {
        showToast(res.message || "Operator access revoked.", "success");
        setOperators((prev) => prev.filter((o) => o.userId !== revokeTarget.userId));
        setRevokeTarget(null);
      } else {
        showToast(res.error || "Failed to revoke access.", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md",
              toastMessage.type === "success"
                ? "bg-emerald-950/90 border-emerald-700/60 text-emerald-200"
                : "bg-rose-950/90 border-rose-700/60 text-rose-200"
            )}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/50 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Headphones className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Help Desk Access Management
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 border border-indigo-200">
                  <Sparkles className="h-3 w-3 text-indigo-600" />
                  <span>Delegated Volunteers</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Assign student email accounts to grant staff or student volunteers live access to the{" "}
                <strong className="text-slate-900 font-semibold">Help Desk Portal</strong> for attendee lookup,
                pass verification, schedule inspection, and issue resolution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/helpdesk"
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              title="Open the live Help Desk in a new tab"
            >
              <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
              <span>Launch Help Desk</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setModalError(null);
                setEmailInput("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Assign Student Email</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-indigo-100/80">
          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Assigned Operators
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {operators.length}
              </span>
              <span className="text-xs text-indigo-600 font-bold">Volunteers</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Help Desk Status
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-black text-emerald-900">Live &amp; Operational</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Universal Access
            </span>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-700 font-medium">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>All Platform Admins retain automatic access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operators Section */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Active Help Desk Operators ({filteredOperators.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These student accounts have authorization to search and view complete participant dossiers.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by email, name, college..."
              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Table or Empty State */}
        {filteredOperators.length > 0 ? (
          <div>
            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredOperators.map((op) => {
                const initial = (op.fullName || op.email).charAt(0).toUpperCase();
                return (
                  <div key={op.userId} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-xs shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block leading-tight text-xs truncate">
                            {op.fullName}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="font-mono truncate">{op.email}</span>
                          </div>
                          {op.registerNumber && (
                            <span className="inline-block mt-1 text-[10px] font-mono text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.2">
                              Reg #{op.registerNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(op)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold px-2.5 py-1.5 shrink-0 cursor-pointer shadow-2xs"
                        title="Revoke access"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Revoke</span>
                      </button>
                    </div>

                    <div className="bg-slate-50/80 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1 border border-slate-100">
                      <div className="font-medium text-slate-800">
                        {op.department || "General Department"}
                      </div>
                      <div className="text-slate-500 truncate text-[10px]">
                        {op.collegeName || "Kalasalingam Academy of Research and Education"}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                        <span>Assigned {formatDate(op.assignedAt.slice(0, 10))}</span>
                        <span>By {op.assignedByName || "Admin"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Department &amp; College</th>
                    <th className="py-3 px-4">Assigned On</th>
                    <th className="py-3 px-4">Assigned By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOperators.map((op) => {
                    const initial = (op.fullName || op.email).charAt(0).toUpperCase();

                    return (
                      <tr key={op.userId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-xs shrink-0">
                              {initial}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {op.fullName}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <Mail className="h-3 w-3 text-slate-400" />
                                <span className="font-mono">{op.email}</span>
                              </div>
                              {op.registerNumber && (
                                <span className="inline-block mt-0.5 text-[10px] font-mono text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.2">
                                  Reg #{op.registerNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-800">
                              {op.department || "General Department"}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              {op.collegeName || "Kalasalingam Academy of Research and Education"}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatDate(op.assignedAt.slice(0, 10))}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          <span className="font-medium text-[11px]">
                            {op.assignedByName || "Admin"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setRevokeTarget(op)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/80 text-rose-700 text-[11px] font-bold px-2.5 py-1.5 transition-colors cursor-pointer"
                            title="Revoke Help Desk access"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {searchQuery ? "No matching operators found" : "No Help Desk operators assigned yet"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery
                  ? "Try searching with a different name, email, or department."
                  : "Assign student emails above to grant them operator access to search and inspect student records."}
              </p>
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setEmailInput("");
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer mt-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Assign First Operator</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ASSIGN STUDENT EMAIL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Grant Help Desk Access
                  </h3>
                  <p className="text-xs text-slate-500">Assign student by institutional or personal email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAssignOperator} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Student Account Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. 9923004001@klu.ac.in or student@gmail.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-start gap-1">
                  <Info className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
                  <span>The student must have an existing Euphoria &apos;26 account registered under this email.</span>
                </p>
              </div>

              {modalError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 font-medium">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !emailInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Granting Access...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Grant Access</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM REVOKE */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Revoke Help Desk Access
                </h3>
                <p className="text-xs text-slate-500">Confirm operator removal</p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50/80 border border-rose-200 p-3.5 text-xs text-rose-950 space-y-1.5">
              <p>
                Are you sure you want to remove Help Desk operator access for:
              </p>
              <div className="rounded-xl bg-white p-2.5 font-bold text-slate-900 border border-rose-200">
                <div>{revokeTarget.fullName}</div>
                <div className="text-[11px] font-mono text-slate-500 font-normal">
                  {revokeTarget.email}
                </div>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed pt-1">
                ⚠️ This user will immediately be blocked from searching or viewing participant dossiers on the Help Desk page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setRevokeTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmRevoke}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Revoking..." : "Confirm & Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
