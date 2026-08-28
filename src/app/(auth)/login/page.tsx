"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, AlertCircle, ArrowLeft, GraduationCap } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const authError = searchParams.get("error");

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
              <span>EUPHORIA &apos;26 • PASS PORTAL</span>
            </Link>

            <h1 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 tracking-tight">
              Sign In to Pass Portal
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Access your registered competitions &amp; entry QR pass.
            </p>
          </div>

          {/* Auth Error Message */}
          {authError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 flex items-center justify-center gap-1.5 shadow-2xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
              <span>Authentication failed: {authError}</span>
            </div>
          )}

          {/* Single Sign-On Button */}
          <div className="space-y-2.5 pt-1">
            <div className="[&>div]:w-full">
              <GoogleSignInButton
                redirectUrl={redirectUrl}
                label="Sign In with Google"
              />
            </div>

            {/* University & External Domain Notice */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 rounded-xl py-2 px-3 border border-slate-200/80">
              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Use @klu.ac.in or personal Google account</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don&apos;t have a pass?{" "}
              <Link
                href="/register"
                className="font-bold text-primary hover:text-primary-hover hover:underline transition-colors"
              >
                Register Pass
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
