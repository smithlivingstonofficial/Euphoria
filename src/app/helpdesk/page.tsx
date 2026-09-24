import { getHelpdeskAuthInfo } from "@/actions/helpdesk";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Headphones, LogOut } from "lucide-react";
import { HelpdeskClient } from "./helpdesk-client";

export const dynamic = "force-dynamic";

export default async function HelpdeskPage() {
  const auth = await getHelpdeskAuthInfo();

  if (!auth || !auth.user) {
    redirect("/login?redirect=/helpdesk");
  }

  // If user is neither admin nor assigned helpdesk operator
  if (!auth.isHelpdesk) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-8 text-center shadow-2xl space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-mono">
              Help Desk Access Restricted
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your account (<strong>{auth.user.email}</strong>) is not currently authorized to access the Euphoria &apos;26 Help Desk portal.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 text-xs text-slate-400 text-left space-y-1.5">
            <p className="font-semibold text-slate-300">Need Help Desk Privileges?</p>
            <p className="text-[11px] leading-relaxed">
              Platform Administrators can grant your student email access through the{" "}
              <strong className="text-slate-200">Admin &gt; Help Desk Access</strong> console.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Participant Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <HelpdeskClient authInfo={auth} />;
}
