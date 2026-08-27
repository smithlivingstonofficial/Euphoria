"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Shield,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        router.push(redirectUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 sm:px-6 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative w-full max-w-md space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-xs">
                <Sparkles className="h-3 w-3" />
              </div>
              <span>EUPHORIA &apos;26 • LOGIN</span>
            </Link>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sign In to Pass Portal
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Access your registered competitions, event schedule &amp; digital entry QR passes.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* 1. Fast Google Authentication */}
          <div className="space-y-3">
            <div className="[&>button]:min-h-[50px] [&>button]:rounded-2xl [&>button]:text-sm [&>button]:font-bold [&>button]:shadow-lg">
              <GoogleSignInButton
                redirectUrl={redirectUrl}
                label="Continue with Google"
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-1">
              <div className="w-full border-t border-white/10" />
              <span className="bg-slate-900 px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Or sign in with email
              </span>
            </div>
          </div>

          {/* 2. Email / Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@klu.ac.in or personal email"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-primary focus:bg-white/10 focus:outline-none transition-all"
                />
              </div>
              {email.toLowerCase().endsWith("@klu.ac.in") && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>KARE Verified Domain (@klu.ac.in)</span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-primary focus:bg-white/10 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="pt-2 border-t border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Need to register first?{" "}
              <Link
                href="/register"
                className="font-bold text-primary hover:text-primary-hover hover:underline transition-colors"
              >
                Create Delegate Pass
              </Link>
            </p>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
              <Shield className="h-3 w-3" />
              <span>Encrypted Authentication • KARE Euphoria &apos;26</span>
            </div>
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
