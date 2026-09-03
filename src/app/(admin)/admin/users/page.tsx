import { getAllUsersAndPassesAdmin, getCallerAuthInfo } from "@/actions/admin";
import { UsersAdminClient } from "./users-client";
import { Users, Sparkles, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [data, authInfo] = await Promise.all([
    getAllUsersAndPassesAdmin(),
    getCallerAuthInfo(),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-primary shadow-2xs">
            <Users className="h-3.5 w-3.5" />
            <span>Participant Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Registered Users &amp; Delegate Passes
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Inspect all registered participant profiles, festival passes, slot allocations (Slot 1 &amp; Slot 2), attendance check-ins, and role assignments across Euphoria 2026.
          </p>
        </div>
      </div>

      {/* Main Interactive Client */}
      <UsersAdminClient
        initialUsers={data.users || []}
        currentUserRole={authInfo}
      />
    </div>
  );
}
