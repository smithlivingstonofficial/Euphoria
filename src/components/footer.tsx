import Link from "next/link";
import { Sparkles, Layers, Compass, Bell, ShieldCheck, ChevronRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 sm:py-6 text-slate-500 pb-20 sm:pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between text-xs">
        
        {/* Brand & University Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-primary to-indigo-800 text-white shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
            </div>
            <span className="font-black text-slate-900 tracking-tight font-display text-sm">
              EUPHORIA 2026
            </span>
            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase">
              KARE Fest
            </span>
          </div>

          <span className="hidden sm:inline text-slate-300">•</span>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            Kalasalingam Academy of Research and Education
          </p>
        </div>

        {/* Mobile & Desktop Links Pill Row */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600">
          <Link
            href="/events"
            className="flex items-center gap-1 hover:text-primary transition-colors bg-slate-50 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border sm:border-0 border-slate-200/80"
          >
            <Layers className="h-3 w-3 text-primary" />
            <span>Events (61)</span>
          </Link>

          <Link
            href="/campus-map"
            className="flex items-center gap-1 hover:text-primary transition-colors bg-slate-50 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border sm:border-0 border-slate-200/80"
          >
            <Compass className="h-3 w-3 text-slate-400" />
            <span>Campus Map</span>
          </Link>

          <Link
            href="/announcements"
            className="flex items-center gap-1 hover:text-primary transition-colors bg-slate-50 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border sm:border-0 border-slate-200/80"
          >
            <Bell className="h-3 w-3 text-amber-500" />
            <span>Alerts</span>
          </Link>

          <span className="hidden sm:inline text-slate-300">|</span>

          <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal w-full sm:w-auto text-center sm:text-left mt-1 sm:mt-0">
            &copy; 2026 KARE. All rights reserved.
          </span>
        </div>

      </div>
    </footer>
  );
}
