"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  AlertCircle,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const unverifiedEmail = searchParams.get("email");

  return (
    <div className="relative h-screen max-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-4 sm:px-6 overflow-hidden selection:bg-purple-500 selection:text-white text-white">
      {/* Background Decorative Glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[350px] w-[350px] rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm sm:max-w-md space-y-4 my-auto">
        {/* Glassmorphism Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/70 space-y-5 text-center">
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/10 px-3.5 py-1 text-[11px] font-mono font-bold text-purple-300">
              <Lock className="h-3.5 w-3.5 text-purple-400" />
              <span>EUPHORIA ADMIN OS • RESTRICTED ACCESS</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
              Admin OS Sign In
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Festival Directors &amp; System Administrators Only.
            </p>
          </div>

          {/* Access Denied Warning Box */}
          {authError === "not_an_admin" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 space-y-1.5 text-left animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                <span>Admin Privileges Required</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                The account <strong>{unverifiedEmail || "you used"}</strong> does not have administrator permissions for Admin OS.
              </p>
            </div>
          )}

          {/* Standard Auth Error */}
          {authError && authError !== "not_an_admin" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Authentication Error: {authError}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="space-y-3 pt-1">
            <GoogleSignInButton
              redirectUrl="/admin"
              label="Sign In with Admin Google Account"
              className="bg-white text-slate-900 border-none hover:bg-slate-100 font-extrabold shadow-lg shadow-purple-500/10"
            />
          </div>

          {/* Links */}
          <div className="pt-2 border-t border-white/10 text-center space-y-1.5 text-xs text-slate-400">
            <div>
              Staff Coordinator?{" "}
              <Link
                href="/coordinator/login"
                className="font-bold text-purple-400 hover:text-purple-300 hover:underline transition-colors"
              >
                Go to Coordinator Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Euphoria Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
