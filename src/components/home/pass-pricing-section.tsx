"use client";

import Link from "next/link";
import { Check, Star, Zap, ArrowRight, ShieldCheck, Ticket } from "lucide-react";

export function PassPricingSection() {
  return (
    <section className="border-t border-slate-200/80 bg-white py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-extrabold text-primary uppercase tracking-wider">
            <Ticket className="h-3.5 w-3.5" />
            <span>Clear Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display">
            Choose Your Festival Pass Tier
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            One pass grants access to 2 full days of competitions across 14 academic schools. No hidden charges or extra fees.
          </p>
        </div>

        {/* 2 Pricing Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
          {/* 1. Standard Delegate Pass */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-slate-300 hover:shadow-lg transition-all relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-200/80 text-slate-800">
                  STANDARD PASS
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">2 Event Slots</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">₹200</span>
                  <span className="text-xs font-bold text-slate-500">/ pass (fixed total)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Includes 2 Standard Competition entries. Perfect for single or multi-track competitors.
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-2.5 pt-4 border-t border-slate-200/80 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <span><strong>2 Standard Events</strong> included (Day 1 &amp; Day 2)</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>Claim 2nd slot anytime post-payment for <strong>₹0 extra</strong></span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>Official KARE Accredited Certificate</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>Instant Digital Pass QR with offline verification</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/events"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white py-3.5 text-xs sm:text-sm font-extrabold text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition-all shadow-xs"
              >
                <span>Select Events &amp; Get Standard Pass</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* 2. Pro Delegate Pass (Recommended) */}
          <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
            {/* Popular Badge */}
            <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs">
              <Star className="h-3 w-3 fill-current text-slate-950" />
              <span>MOST POPULAR</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  PRO PASS
                </span>
                <span className="text-xs font-mono font-bold text-amber-800">1 Pro + 1 Standard</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">₹300</span>
                  <span className="text-xs font-bold text-slate-500">/ pass (fixed total)</span>
                </div>
                <p className="text-xs text-amber-900 font-medium mt-1">
                  Covers 1 Pro Flagship Competition (Hackathon / Combat Arena) + 1 Standard Event.
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-2.5 pt-4 border-t border-amber-200 text-xs font-medium text-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black">
                    <Check className="h-3 w-3" />
                  </div>
                  <span><strong>1 Pro Flagship Event</strong> + <strong>1 Standard Event</strong></span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>Eligible for <strong>₹15 Lakhs+ Flagship Cash Pools</strong></span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>Official KARE Accredited Certificate</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>Instant Digital Pass QR with offline verification</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/events"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 text-xs sm:text-sm font-black text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/25 active:scale-[0.99]"
              >
                <span>Select Events &amp; Get Pro Pass</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Security Trust Footnote */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 pt-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Instant Easebuzz Secure Payment • 100% Refundable if event cancelled</span>
        </div>
      </div>
    </section>
  );
}
