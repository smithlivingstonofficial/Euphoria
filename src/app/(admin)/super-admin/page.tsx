import { getCallerAuthInfo, getSuperAdminDashboardData } from "@/actions/admin";
import { SuperAdminClient } from "./super-admin-client";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const authInfo = await getCallerAuthInfo();

  // Strict check: only Level 4 (Super Admin / smithlivingston2005@gmail.com) can access /super-admin
  if (!authInfo || !authInfo.isSuperAdmin) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 font-mono tracking-tight">
              Super Admin Access Required
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              The <code>/super-admin</code> route is strictly restricted to the developer root account (<strong>smithlivingston2005@gmail.com</strong>).
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors w-full cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Admin Console</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const result = await getSuperAdminDashboardData();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center text-rose-600 font-bold">
        Error loading Super Admin telemetry: {result.error}
      </div>
    );
  }

  return <SuperAdminClient initialData={result.data} />;
}
