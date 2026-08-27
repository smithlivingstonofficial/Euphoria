"use client";

import Link from "next/link";
import {
  Sparkles,
  Shield,
  ArrowRight,
  Star,
  Zap,
  QrCode,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 sm:px-6 overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative w-full max-w-md space-y-6">
        {/* Main Glassmorphic Registration Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-xs">
                <Sparkles className="h-3 w-3" />
              </div>
              <span>EUPHORIA &apos;26 • KARE FEST</span>
            </Link>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Participant Registration
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Get your official Euphoria &apos;26 Delegate Pass to register for 61 symposium competitions.
            </p>
          </div>

          {/* Pass Pricing Model Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-left space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-black text-amber-400">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>PRO PASS</span>
              </div>
              <div className="text-lg font-black text-white">₹300</div>
              <p className="text-[10px] text-amber-200/80 leading-tight">
                1 Pro + 1 Normal Event
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-left space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-black text-indigo-400">
                <Zap className="h-3.5 w-3.5" />
                <span>NORMAL PASS</span>
              </div>
              <div className="text-lg font-black text-white">₹200</div>
              <p className="text-[10px] text-indigo-200/80 leading-tight">
                Up to 2 Normal Events
              </p>
            </div>
          </div>

          {/* Google One-Tap Action */}
          <div className="space-y-3 pt-1">
            <div className="[&>button]:min-h-[50px] [&>button]:rounded-2xl [&>button]:text-sm [&>button]:font-bold [&>button]:shadow-lg">
              <GoogleSignInButton
                redirectUrl="/complete-profile"
                label="Sign in with Google"
              />
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 p-2.5 text-center text-[11px] text-slate-300">
              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Use <strong>@klu.ac.in</strong> or any valid Google ID
              </span>
            </div>
          </div>

          {/* Value Props Row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-white flex items-center justify-center gap-1">
                <QrCode className="h-3 w-3 text-primary" />
                <span>Instant QR</span>
              </div>
              <p className="text-[10px] text-slate-400">Digital Entry</p>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-white flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>61 Tracks</span>
              </div>
              <p className="text-[10px] text-slate-400">SCSE / SEEE</p>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-white flex items-center justify-center gap-1">
                <Shield className="h-3 w-3 text-blue-400" />
                <span>Verified</span>
              </div>
              <p className="text-[10px] text-slate-400">KARE Campus</p>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="pt-2 text-center">
            <p className="text-xs text-slate-400">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-bold text-primary hover:text-primary-hover hover:underline transition-colors"
              >
                Sign In to Dashboard
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
            <span>← Back to Euphoria Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
