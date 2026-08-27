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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 px-4 py-8 sm:px-6 overflow-hidden">
      {/* Subtle Light Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative w-full max-w-md space-y-6">
        {/* Main Light Registration Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1 text-xs font-bold text-primary hover:bg-indigo-100 transition-colors shadow-2xs"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-xs">
                <Sparkles className="h-3 w-3" />
              </div>
              <span>EUPHORIA &apos;26 • KARE FEST</span>
            </Link>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Participant Registration
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Get your official Euphoria &apos;26 Delegate Pass to register for 61 symposium competitions.
            </p>
          </div>

          {/* Pass Pricing Model Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-left space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-black text-amber-800">
                <Star className="h-3.5 w-3.5 fill-current text-amber-600" />
                <span>PRO PASS</span>
              </div>
              <div className="text-lg font-black text-slate-900">₹300</div>
              <p className="text-[10px] text-amber-900/80 leading-tight font-medium">
                1 Pro + 1 Normal Event
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 text-left space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-black text-indigo-800">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>NORMAL PASS</span>
              </div>
              <div className="text-lg font-black text-slate-900">₹200</div>
              <p className="text-[10px] text-indigo-900/80 leading-tight font-medium">
                Up to 2 Normal Events
              </p>
            </div>
          </div>

          {/* Google One-Tap Action */}
          <div className="space-y-3 pt-1">
            <div className="[&>button]:min-h-[50px] [&>button]:rounded-2xl [&>button]:text-sm [&>button]:font-bold [&>button]:shadow-sm">
              <GoogleSignInButton
                redirectUrl="/complete-profile"
                label="Sign in with Google"
              />
            </div>

            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-center text-[11px] text-slate-600">
              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Use <strong>@klu.ac.in</strong> or personal Google account
              </span>
            </div>
          </div>

          {/* Value Props Row */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-slate-900 flex items-center justify-center gap-1">
                <QrCode className="h-3 w-3 text-primary" />
                <span>Instant QR</span>
              </div>
              <p className="text-[10px] text-slate-500">Digital Entry</p>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-slate-900 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>61 Tracks</span>
              </div>
              <p className="text-[10px] text-slate-500">SCSE / SEEE</p>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-slate-900 flex items-center justify-center gap-1">
                <Shield className="h-3 w-3 text-blue-600" />
                <span>Verified</span>
              </div>
              <p className="text-[10px] text-slate-500">KARE Campus</p>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="pt-2 text-center">
            <p className="text-xs text-slate-500">
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span>← Back to Euphoria Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
