import { getCallerAuthInfo } from "@/actions/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authInfo = await getCallerAuthInfo();

  if (!authInfo || !authInfo.user) {
    redirect("/login?redirect=/admin");
  }

  // Enforce Level >= 3 (Admin or Super Admin)
  if (authInfo.roleLevel < 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-8 text-center shadow-xl space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-mono">
              Admin Access Restricted
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Your account (<strong>{authInfo.user.email}</strong>) does not have administrator privileges for Euphoria &apos;26.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Participant Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", authInfo.user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex">
      {/* Desktop Persistent SaaS Sidebar */}
      <AdminSidebar
        userEmail={authInfo.user.email || "admin@kare.edu"}
        userFullName={profile?.full_name || (authInfo.isSuperAdmin ? "Smith Livingston (Super Admin)" : "Admin")}
        roleId={authInfo.roleId}
        isSuperAdmin={authInfo.isSuperAdmin}
      />

      {/* Main SaaS Content Container */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <AdminTopbar
          userEmail={authInfo.user.email || "admin@kare.edu"}
          userFullName={profile?.full_name || (authInfo.isSuperAdmin ? "Smith Livingston" : "Admin")}
          roleId={authInfo.roleId}
          isSuperAdmin={authInfo.isSuperAdmin}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
