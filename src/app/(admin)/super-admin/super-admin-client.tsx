"use client";

import { useState } from "react";
import {
  Crown,
  ShieldCheck,
  ShieldAlert,
  Users,
  Key,
  Server,
  Database,
  Terminal,
  Activity,
  UserPlus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Lock,
  Sparkles,
  Zap,
  Globe,
  Radio,
} from "lucide-react";
import { updateUserRoleAdmin, purgeDatabaseTestDataAdmin } from "@/actions/admin";

interface SuperAdminClientProps {
  initialData: {
    superAdminEmail: string;
    admins: Array<{
      id: string;
      userId: string;
      roleId: string;
      isRootSuperAdmin: boolean;
      assignedAt: string;
      email: string;
      fullName: string;
      mobileNumber?: string;
      department?: string;
      participantType: string;
    }>;
    allProfiles: Array<{
      id: string;
      email: string;
      full_name: string;
      mobile_number?: string;
      department?: string;
      participant_type: string;
    }>;
    telemetry: {
      eventsCount: number;
      categoriesCount: number;
      usersCount: number;
      passesCount: number;
      ordersCount: number;
      totalRevenue: number;
      paymentProvider: string;
      easebuzzEnv: string;
      easebuzzSubMerchantId: string;
      baseUrl: string;
    };
  };
}

export function SuperAdminClient({ initialData }: SuperAdminClientProps) {
  const [data, setData] = useState(initialData);
  const [selectedUserIdToPromote, setSelectedUserIdToPromote] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Emergency Purge State
  const [purgeInput, setPurgeInput] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);

  const targetPurgePhrase = `PURGE-TEST-DATA-${data.superAdminEmail}`;

  // Promote User to Admin
  const handlePromoteToAdmin = async () => {
    if (!selectedUserIdToPromote) return;

    try {
      setIsPromoting(true);
      setActionSuccess(null);
      setActionError(null);

      const res = await updateUserRoleAdmin(selectedUserIdToPromote, "admin", "assign");

      if (!res.success) {
        setActionError(res.error || "Failed to grant administrator privileges.");
      } else {
        setActionSuccess("Platform Administrator granted successfully!");
        const promotedProfile = data.allProfiles.find((p) => p.id === selectedUserIdToPromote);
        if (promotedProfile) {
          setData((prev) => ({
            ...prev,
            admins: [
              ...prev.admins,
              {
                id: `new_${Date.now()}`,
                userId: promotedProfile.id,
                roleId: "admin",
                isRootSuperAdmin: false,
                assignedAt: new Date().toISOString(),
                email: promotedProfile.email,
                fullName: promotedProfile.full_name,
                mobileNumber: promotedProfile.mobile_number,
                department: promotedProfile.department,
                participantType: promotedProfile.participant_type,
              },
            ],
          }));
        }
        setSelectedUserIdToPromote("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Promotion error";
      setActionError(msg);
    } finally {
      setIsPromoting(false);
    }
  };

  // Revoke Admin
  const handleRevokeAdmin = async (userId: string, email: string) => {
    if (email.toLowerCase().trim() === data.superAdminEmail) {
      setActionError("Cannot revoke the Root Super Administrator.");
      return;
    }

    if (!confirm(`Are you sure you want to revoke Admin privileges from ${email}?`)) {
      return;
    }

    try {
      setActionSuccess(null);
      setActionError(null);

      const res = await updateUserRoleAdmin(userId, "admin", "revoke");

      if (!res.success) {
        setActionError(res.error || "Failed to revoke administrator privileges.");
      } else {
        setActionSuccess(`Administrator privileges revoked from ${email}.`);
        setData((prev) => ({
          ...prev,
          admins: prev.admins.filter((a) => a.userId !== userId),
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Revocation error";
      setActionError(msg);
    }
  };

  // Execute Emergency Purge
  const handleExecutePurge = async () => {
    if (purgeInput !== targetPurgePhrase) return;

    try {
      setIsPurging(true);
      setActionSuccess(null);
      setActionError(null);

      const res = await purgeDatabaseTestDataAdmin(purgeInput);

      if (!res.success) {
        setActionError(res.error || "Database purge failed.");
      } else {
        setActionSuccess("Database reset complete! All test records purged while 61 events remain intact.");
        setPurgeModalOpen(false);
        setPurgeInput("");
        setData((prev) => ({
          ...prev,
          telemetry: {
            ...prev.telemetry,
            usersCount: 1,
            passesCount: 0,
            ordersCount: 0,
            totalRevenue: 0,
          },
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Purge execution error";
      setActionError(msg);
    } finally {
      setIsPurging(false);
    }
  };

  // Candidates who are not already admins
  const eligibleCandidates = data.allProfiles.filter(
    (p) => !data.admins.some((a) => a.userId === p.id)
  );

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Developer Console Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 -mb-12 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-xs font-black text-purple-200 backdrop-blur-md shadow-2xs uppercase tracking-wider">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span>Root Level 4 Authorization</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Developer Master Control</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
            /super-admin Developer Console
          </h1>

          <p className="text-xs sm:text-sm text-purple-200/80 max-w-3xl leading-relaxed">
            Exclusive root governance center for <strong>{data.superAdminEmail}</strong>. Manage platform administrators, monitor live Easebuzz production telemetry, inspect event data integrity, and run emergency platform maintenance.
          </p>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 shadow-xs">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. Platform Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Preserved Events */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Preserved Events
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {data.telemetry.eventsCount}
            </span>
            <span className="text-[11px] font-bold text-emerald-600">Active</span>
          </div>
          <p className="text-[10px] text-slate-400">{data.telemetry.categoriesCount} categories linked</p>
        </div>

        {/* Platform Admins */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
            Platform Admins
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-900 font-mono">
              {data.admins.length}
            </span>
            <span className="text-[11px] font-bold text-indigo-600">Designated</span>
          </div>
          <p className="text-[10px] text-slate-500">Managed exclusively here</p>
        </div>

        {/* Payment Gateway */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Easebuzz Gateway
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-emerald-700 uppercase font-mono">
              {data.telemetry.easebuzzEnv.toUpperCase()} MODE
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Sub-ID: {data.telemetry.easebuzzSubMerchantId}</p>
        </div>

        {/* Production URL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Live Domain
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-slate-900 truncate">
            <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">kalasalingam.ac.in</span>
          </div>
          <p className="text-[10px] text-slate-400">SSL &amp; SURL/FURL Ready</p>
        </div>
      </div>

      {/* 3. Section: Administrator Delegation Governance */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <span>Platform Administrators Delegation</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only the Super Administrator has permission to grant or revoke the Level 3 Platform Administrator role.
            </p>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-purple-100 border border-purple-200 px-3 py-1 text-xs font-black text-purple-800">
            👑 Super Admin Exclusive
          </span>
        </div>

        {/* Promote User Form */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 sm:p-5 space-y-3">
          <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-indigo-600" />
            <span>Designate New Platform Administrator</span>
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedUserIdToPromote}
              onChange={(e) => setSelectedUserIdToPromote(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none cursor-pointer"
            >
              <option value="">Select an enrolled participant / user to elevate...</option>
              {eligibleCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.email}) — {p.department || p.participant_type}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedUserIdToPromote || isPromoting}
              onClick={handlePromoteToAdmin}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isPromoting ? "Promoting..." : "Grant Admin Authority"}</span>
            </button>
          </div>
        </div>

        {/* Table of Active Admins */}
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500">
              <tr>
                <th className="p-3.5">Administrator</th>
                <th className="p-3.5">Role Level</th>
                <th className="p-3.5">Department / Affiliation</th>
                <th className="p-3.5">Assigned Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-white text-xs ${admin.isRootSuperAdmin ? "bg-gradient-to-br from-purple-700 to-amber-500 shadow-xs" : "bg-indigo-600"}`}>
                        {admin.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{admin.fullName}</span>
                          {admin.isRootSuperAdmin && (
                            <span className="rounded bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.2">
                              DEVELOPER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{admin.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5">
                    {admin.isRootSuperAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[10px] font-black text-purple-800">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span>Level 4: Super Admin</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                        <ShieldCheck className="h-3 w-3 text-indigo-600" />
                        <span>Level 3: Platform Admin</span>
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-slate-600 font-medium">
                    {admin.department || "University-Wide Operations"}
                  </td>

                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                    {admin.assignedAt ? new Date(admin.assignedAt).toLocaleDateString() : "Genesis"}
                  </td>

                  <td className="p-3.5 text-right">
                    {admin.isRootSuperAdmin ? (
                      <span className="text-[11px] font-bold text-slate-400 italic">
                        Immutable Root
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRevokeAdmin(admin.userId, admin.email)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Revoke Admin</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Section: Emergency Platform Maintenance & Data Reset */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50/20 p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 border border-rose-200 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Emergency Platform Maintenance: Test Data Purge
            </h2>
            <p className="text-xs text-slate-500">
              Permanently purge test registrations, passes, orders, and payments while keeping all 61 events and categories 100% intact.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600 space-y-0.5">
              <strong className="text-slate-900 block">Database Sanitization Utility</strong>
              <span>
                Leaves your 61 competitions and categories intact. Useful right before the public opening.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPurgeModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Launch Purge Utility</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Purge Confirmation Modal */}
      {purgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-black text-slate-900">
                Confirm Emergency Database Purge
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will erase all test user registrations, delegate passes, attendance check-ins, and transaction records. <strong>All 61 event details and categories will remain untouched.</strong>
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">
                Type the confirmation phrase to authorize:
              </label>
              <div className="p-2 rounded-xl bg-slate-100 font-mono text-xs text-slate-800 select-all border border-slate-200">
                {targetPurgePhrase}
              </div>
              <input
                type="text"
                value={purgeInput}
                onChange={(e) => setPurgeInput(e.target.value)}
                placeholder="Type the exact phrase above..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-slate-900 focus:border-rose-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPurgeModalOpen(false);
                  setPurgeInput("");
                }}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgeInput !== targetPurgePhrase || isPurging}
                onClick={handleExecutePurge}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isPurging ? "Purging..." : "Confirm & Execute Purge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
