"use client";

import Link from "next/link";
import { Sparkles, Shield, ArrowRight } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/60 p-4 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
        {/* Branding Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 mb-1 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              EUPHORIA &apos;26
            </span>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Participant Registration</h1>
          <p className="text-xs text-slate-500">
            Sign in with Google to access events and digital passes
          </p>
        </div>

        {/* Google Authentication */}
        <div className="space-y-3 pt-1">
          <GoogleSignInButton
            redirectUrl="/complete-profile"
            label="Continue with Google"
          />

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-center">
            <span>Supports <strong>@klu.ac.in</strong> and external Google accounts</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
