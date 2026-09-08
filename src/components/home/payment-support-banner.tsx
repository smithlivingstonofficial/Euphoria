"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AlertCircle, ArrowRight, ShieldCheck, Sparkles, HelpCircle } from "lucide-react";
import { PaymentIssueModal } from "./payment-issue-modal";

export function PaymentSupportBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-open modal if redirected with ?openPaymentIssue=true
  useEffect(() => {
    if (searchParams.get("openPaymentIssue") === "true") {
      setIsModalOpen(true);
      // Clean query parameter from URL without triggering reload
      try {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("openPaymentIssue");
        window.history.replaceState({}, "", nextUrl.pathname + nextUrl.search);
      } catch {
        // Safe fallback
      }
    }
  }, [searchParams]);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          MARQUEE BANNER STRIP — Lead Hero Section Notice & Action
      ═══════════════════════════════════════════════════════════════ */}
      <div className="w-full relative z-20 mb-3 sm:mb-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="relative group overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-indigo-500/10 backdrop-blur-md shadow-xs hover:border-amber-400 transition-all duration-300">
            {/* Ambient Background Shimmer Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-indigo-400/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5">
              
              {/* Left Badge: Live Help Desk */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[11px] font-extrabold tracking-wide uppercase shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
                  <span>Live Help Desk</span>
                </span>
              </div>

              {/* Center: Marquee / Ticker Text (Smooth CSS marquee with pause-on-hover) */}
              <div className="flex-1 overflow-hidden relative w-full text-center sm:text-left py-0.5">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
                  <span className="text-amber-700 font-bold hidden md:inline">
                    ⚠️ Facing any deduction or pass generation issue?
                  </span>
                  <span className="text-slate-700">
                    If you have any payment issue fillup this form
                  </span>
                  <span className="text-amber-600 font-bold hidden lg:inline">
                    — our verification desk will activate your pass instantly!
                  </span>
                </div>
              </div>

              {/* Right CTA Button: Direct Trigger for the Popup Modal */}
              <div className="shrink-0 w-full sm:w-auto flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs sm:text-xs font-black shadow-sm shadow-amber-500/25 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer group/btn"
                >
                  <span>Fill Form</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Payment Dispute & Event Resolution Modal */}
      <PaymentIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
