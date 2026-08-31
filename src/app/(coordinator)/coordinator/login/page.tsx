"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Users,
} from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function CoordinatorLoginPage() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const unverifiedEmail = searchParams.get("email");

  return (
    <div className="relative h-screen max-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-4 sm:px-6 overflow-hidden selection:bg-indigo-500 selection:text-white text-white">
      {/* Background Decorative Glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[350px] w-[350px] rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm sm:max-w-md space-y-4 my-auto">
        {/* Glassmorphism Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-5 text-center">
          {/* Badge & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-[11px] font-mono font-bold text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>FACULTY STAFF &amp; COORDINATOR PORTAL</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
              Event Management Login
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Authorized Faculty Staff &amp; Student Event Coordinators Only.
            </p>
          </div>

          {/* Access Denied Warning Box */}
          {authError === "not_a_coordinator" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 space-y-1.5 text-left animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>Coordinator Access Unverified</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                The Google account <strong>{unverifiedEmail || "you used"}</strong> is not registered as an Event Staff/Coordinator for any competition.
              </p>
              <p className="text-[10px] text-rose-300/70 pt-1 border-t border-rose-500/20">
                Please contact the Euphoria Admin team to assign your official email as an event coordinator.
              </p>
            </div>
          )}

          {/* Standard Auth Error */}
          {authError && authError !== "not_a_coordinator" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Authentication Error: {authError}</span>
            </div>
          )}

          {/* Single Sign-On Button */}
          <div className="space-y-3 pt-1">
            <GoogleSignInButton
              redirectUrl="/coordinator"
              label="Sign In with Staff Google Account"
              className="bg-white text-slate-900 border-none hover:bg-slate-100 font-extrabold shadow-lg shadow-indigo-500/10"
            />

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 bg-white/5 rounded-xl py-2 px-3 border border-white/10">
              <GraduationCap className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Use official staff email registered in Admin</span>
            </div>
          </div>

          {/* Standard Participant Link */}
          <div className="pt-2 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              Are you a participant delegate?{" "}
              <Link
                href="/login"
                className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                Go to Participant Pass Login
              </Link>
            </p>
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
