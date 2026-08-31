"use client";

import {
  Trophy,
  Award,
  Zap,
  QrCode,
  Users,
  Utensils,
  Sparkles,
  ShieldCheck,
  Cpu,
} from "lucide-react";

export function BentoPerksGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Large Feature Card: ₹25,000+ Prize Pool */}
      <div className="md:col-span-2 lg:col-span-2 rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-6 sm:p-8 flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-amber-300 hover:shadow-lg transition-all">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md">
              <Trophy className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              Cash Prizes
            </span>
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹15 Lakhs+ in Cash Prizes &amp; Certificates
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2 max-w-md">
              Cash rewards and official certificates for 1st, 2nd, and 3rd place podium finishers across all 61 competitions and 14 academic schools.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-amber-200/60 relative z-10 text-center">
          <div className="p-2.5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
            <span className="text-xs sm:text-sm font-black text-amber-900 block">
              1st Winner
            </span>
            <span className="text-[10px] font-bold text-slate-500">Cash + Certificate</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
            <span className="text-xs sm:text-sm font-black text-slate-800 block">
              2nd Runner
            </span>
            <span className="text-[10px] font-bold text-slate-500">Cash + Certificate</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
            <span className="text-xs sm:text-sm font-black text-slate-800 block">
              3rd Runner
            </span>
            <span className="text-[10px] font-bold text-slate-500">Cash + Certificate</span>
          </div>
        </div>
      </div>

      {/* 2. Card: Verified University Digital Credentials */}
      <div className="rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/60 to-white p-6 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-indigo-300 hover:shadow-lg transition-all">
        <div className="space-y-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
            <Award className="h-5 w-5" />
          </div>
          <h4 className="text-base font-black text-slate-900 tracking-tight">
            Verified Certificates
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every participant receives an official, digitally verifiable certificate from Kalasalingam Academy of Research and Education.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-primary pt-2">
          <span>KARE Verified</span>
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>

      {/* 3. Card: Fast QR Gate Check-in */}
      <div className="rounded-3xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50/60 to-white p-6 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-cyan-300 hover:shadow-lg transition-all">
        <div className="space-y-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md">
            <QrCode className="h-5 w-5" />
          </div>
          <h4 className="text-base font-black text-slate-900 tracking-tight">
            Instant Digital QR Pass
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Zero queues. Flash your real-time QR code at venue entrance scanners for immediate gate verification and attendance sync.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 pt-2">
          <span>Instant Scan Entry</span>
          <Zap className="h-4 w-4" />
        </div>
      </div>

      {/* 4. Card: High-Performance Labs & Infrastructure */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 flex flex-col justify-between space-y-4 group hover:border-slate-300 hover:shadow-md transition-all">
        <div className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Cpu className="h-5 w-5 text-cyan-300" />
          </div>
          <h4 className="text-base font-black text-slate-900 tracking-tight">
            World-Class Labs
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            High-speed GPU workstations, low-latency network, steel robotics combat arena, and open flight grounds.
          </p>
        </div>

        <span className="text-xs font-bold text-slate-500">
          14 Campus Labs
        </span>
      </div>

      {/* 5. Card: Industry Mentors & Faculty Jury */}
      <div className="rounded-3xl border border-purple-200/90 bg-gradient-to-br from-purple-50/60 to-white p-6 flex flex-col justify-between space-y-4 group hover:border-purple-300 hover:shadow-lg transition-all">
        <div className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md">
            <Users className="h-5 w-5" />
          </div>
          <h4 className="text-base font-black text-slate-900 tracking-tight">
            Student Community
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Direct interaction with startup founders, tech evaluators, university professors, and 1,000+ ambitious student peers.
          </p>
        </div>

        <span className="text-xs font-bold text-purple-700">
          Peer Network Hub
        </span>
      </div>

      {/* 6. Card: Delegate Hospitality & Kits */}
      <div className="md:col-span-2 lg:col-span-2 rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 to-white p-6 sm:p-7 flex flex-col justify-between space-y-4 group hover:border-emerald-300 hover:shadow-lg transition-all">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <Utensils className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
              Food &amp; Refreshments
            </span>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Delegate Hospitality, Kits &amp; Refreshments
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              All registered delegates receive official Euphoria lanyards, festival badges, meals, refreshments across both days, and campus accommodation guidance for outstation teams.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs font-bold text-emerald-800">
          <span>Included With Your Pass</span>
          <Sparkles className="h-4 w-4 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}
