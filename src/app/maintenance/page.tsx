"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Server,
  Zap,
} from "lucide-react";
import { CollegeLogo } from "@/components/brand/college-logo";
import { EuphoriaLogo } from "@/components/brand/euphoria-logo";

export default function MaintenancePage() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "medium",
        }).format(now) + " IST"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Glow Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px] pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CollegeLogo className="h-8 w-auto filter brightness-110" />
          <div className="hidden sm:block h-6 w-px bg-slate-800" />
          <EuphoriaLogo className="h-7 w-auto filter brightness-110 hidden sm:block" />
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-[11px] sm:text-xs font-mono font-semibold tracking-wide text-amber-300 uppercase">
            Maintenance Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 z-10">
        <div className="max-w-2xl w-full text-center space-y-6 sm:space-y-8">
          {/* Animated Migration Icon Container */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute -inset-3 bg-gradient-to-r from-amber-500 to-indigo-600 rounded-3xl blur-lg opacity-40 animate-pulse" />
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl flex items-center justify-center text-amber-400">
              <Database className="h-10 w-10 sm:h-12 sm:w-12 animate-pulse" />
              <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* Heading and Mission Statement */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>SCHEDULED PLATFORM UPGRADE &amp; DATABASE MIGRATION</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Platform Temporarily On Hold
            </h1>

            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
              We are currently transferring our database infrastructure to upgraded servers.
              To ensure <strong className="text-slate-200">100% data consistency and zero registration loss</strong>, 
              all live interactions are temporarily suspended.
            </p>
          </div>

          {/* Assurance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-200">Data 100% Safe</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                All festival passes, tickets, profiles, and transactions are preserved.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Server className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-200">Zero-Loss Migration</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Writes are frozen to prevent discrepancies between source and target systems.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-purple-950/70 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-200">Instant Resumption</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Services will resume automatically once verification is complete.
              </p>
            </div>
          </div>

          {/* Action & Status Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Checking Status..." : "Check Status (Refresh)"}</span>
            </button>

            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* Notice to Roles */}
          <p className="text-[11px] text-slate-500 italic max-w-md mx-auto">
            * Note: System holds apply universally to participants, student volunteers, faculty coordinators, and platform administrators.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/70 px-4 sm:px-8 py-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 Euphoria • Kalasalingam Academy of Research and Education</p>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Official Event Platform</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-slate-500" />
            euphoria@klu.ac.in
          </span>
        </div>
      </footer>
    </div>
  );
}
