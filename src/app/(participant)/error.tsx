"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Sparkles, QrCode } from "lucide-react";

export default function ParticipantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary border border-indigo-200">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Pass Portal Notice</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error.message || "Failed to load pass or registration details. Please refresh or try again."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2.5 pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload Pass</span>
          </button>
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Explore Events</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
