"use client";

import Link from "next/link";
import { Sparkles, Star, Zap, GraduationCap, ArrowLeft } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function RegisterPage() {
  return (
    <div className="relative h-screen max-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/50 to-purple-50/40 px-4 py-4 sm:px-6 overflow-hidden selection:bg-indigo-100 selection:text-primary">
      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[350px] w-[350px] rounded-full bg-indigo-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full bg-purple-200/35 blur-3xl" />

      <div className="relative w-full max-w-sm sm:max-w-md space-y-4 my-auto">
        {/* Main Glassmorphism Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-5 sm:p-7 shadow-2xl shadow-slate-300/40 space-y-4 text-center">
          {/* Brand Header */}
          <div className="space-y-1.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-[11px] font-mono font-bold text-primary hover:bg-indigo-100 transition-all shadow-2xs"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow-xs">
                <Sparkles className="h-2.5 w-2.5" />
              </div>
              <span>EUPHORIA &apos;26 • REGISTRATION</span>
            </Link>

            <h1 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 tracking-tight">
              Get Your Delegate Pass
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Register for 60+ flagship tech symposia across 14 schools.
            </p>
          </div>

          {/* Compact Pass Tier Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-amber-50/30 p-3 text-left space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-black text-amber-900">
                <Star className="h-3 w-3 fill-current text-amber-500" />
                <span>PRO PASS</span>
              </div>
              <div className="text-lg font-black text-slate-900 font-display">₹300</div>
              <p className="text-[10px] text-amber-900/80 leading-tight font-medium">
                1 Pro + 1 Normal Event
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-b from-indigo-50/90 to-indigo-50/30 p-3 text-left space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-black text-indigo-900">
                <Zap className="h-3 w-3 text-primary" />
                <span>NORMAL PASS</span>
              </div>
              <div className="text-lg font-black text-slate-900 font-display">₹200</div>
              <p className="text-[10px] text-indigo-900/80 leading-tight font-medium">
                Up to 2 Normal Events
              </p>
            </div>
          </div>

          {/* Single Sign-On Button */}
          <div className="space-y-2.5 pt-1">
            <div className="[&>div]:w-full">
              <GoogleSignInButton
                redirectUrl="/complete-profile"
                label="Register with Google"
              />
            </div>

            {/* University & External Domain Notice */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 rounded-xl py-2 px-3 border border-slate-200/80">
              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Use @klu.ac.in or personal Google account</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="pt-2 border-t border-slate-100 text-center">
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
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Euphoria Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
