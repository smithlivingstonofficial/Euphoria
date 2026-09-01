"use client";

import {
  Trophy,
  Award,
  Zap,
  QrCode,
  Users,
  Utensils,
  ShieldCheck,
  Cpu,
  Bed,
  CheckCircle2,
  Ticket,
  Layers,
} from "lucide-react";

export function BentoPerksGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* ── 1. Large Feature Card: ₹15 Lakhs+ Prize Pool & Podium Rewards ── */}
      <div className="md:col-span-2 lg:col-span-2 rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-6 sm:p-7 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:border-amber-300 hover:shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="h-5.5 w-5.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100/90 text-amber-900 border border-amber-300/80 shadow-2xs font-mono">
              ₹15 Lakhs+ Cash Pool
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              Podium Cash Prizes &amp; Institutional Trophies
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1.5 max-w-lg">
              Immediate Cash / UPI awards and official merit certificates for 1st, 2nd, and 3rd place podium finishers across all 61 competitions and 14 academic schools.
            </p>
          </div>
        </div>

        {/* Podium Rank Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-amber-200/60 relative z-10 text-center">
          <div className="p-3 rounded-2xl bg-white/95 border border-amber-200/80 shadow-2xs group-hover:border-amber-300 transition-colors">
            <div className="text-base sm:text-lg font-black text-amber-900 leading-none">🥇 1st Place</div>
            <div className="text-[10px] font-bold text-amber-700 mt-1">Cash / UPI + Trophy</div>
            <div className="text-[9px] text-slate-400 font-medium mt-0.5">Merit Certificate</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/95 border border-slate-200/80 shadow-2xs group-hover:border-slate-300 transition-colors">
            <div className="text-base sm:text-lg font-black text-slate-800 leading-none">🥈 2nd Place</div>
            <div className="text-[10px] font-bold text-slate-700 mt-1">Cash / UPI + Trophy</div>
            <div className="text-[9px] text-slate-400 font-medium mt-0.5">Merit Certificate</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/95 border border-amber-100/80 shadow-2xs group-hover:border-amber-200 transition-colors">
            <div className="text-base sm:text-lg font-black text-amber-800 leading-none">🥉 3rd Place</div>
            <div className="text-[10px] font-bold text-amber-700 mt-1">Cash / UPI + Shield</div>
            <div className="text-[9px] text-slate-400 font-medium mt-0.5">Merit Certificate</div>
          </div>
        </div>
      </div>

      {/* ── 2. Card: Physical Certificates ── */}
      <div className="rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/60 via-white to-white p-6 sm:p-7 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-indigo-300 hover:shadow-xl transition-all duration-300">
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Award className="h-5.5 w-5.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs font-mono">
              Physical Copy
            </span>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-display">
              Physical Certificates
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Official physical Certificates of Participation from Kalasalingam University awarded to all attending participants.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-indigo-100 text-[11px] font-semibold text-slate-700">
              <Award className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Issued on-campus to participants</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-indigo-100 text-[11px] font-semibold text-slate-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Official university seal &amp; signatures</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-indigo-100 text-xs font-bold text-indigo-700 font-mono">
          <span>KARE Certified</span>
          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Physical Copy</span>
        </div>
      </div>

      {/* ── 3. Card: Fast QR Gate Check-in ── */}
      <div className="rounded-3xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50/60 via-white to-white p-6 sm:p-7 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-cyan-300 hover:shadow-xl transition-all duration-300">
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-700 text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="h-5.5 w-5.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200/80 shadow-2xs font-mono">
              Fast Check-In
            </span>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-display">
              Instant Digital QR Pass
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Zero paper queues. Access your live dynamic QR gate pass right on your mobile dashboard instantly after checkout.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-cyan-100 text-[11px] font-semibold text-slate-700">
              <Zap className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
              <span>1-tap campus gate entrance</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-cyan-100 text-[11px] font-semibold text-slate-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
              <span>Real-time meal &amp; event sync</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-cyan-100 text-xs font-bold text-cyan-700 font-mono">
          <span>Instant Scan Entry</span>
          <span className="text-[10px] text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">Live QR</span>
        </div>
      </div>

      {/* ── 4. Card: 2 Competitions Included With Pass ── */}
      <div className="rounded-3xl border border-rose-200/90 bg-gradient-to-br from-rose-50/60 via-white to-white p-6 sm:p-7 flex flex-col justify-between space-y-4 group hover:border-rose-300 hover:shadow-xl transition-all duration-300">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Ticket className="h-5.5 w-5.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-mono">
              Pass Benefit
            </span>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-display">
              2 Competitions Included
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Your delegate pass includes participation in up to 2 official competitions across any of the 14 academic schools.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-rose-100 text-[11px] font-semibold text-slate-700">
              <Layers className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              <span>Choose any 2 of 61 events</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-rose-100 text-[11px] font-semibold text-slate-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              <span>Day 1 &amp; Day 2 track access</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-rose-100 text-xs font-bold text-rose-700 font-mono">
          <span>Included With Pass</span>
          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">2 Events</span>
        </div>
      </div>

      {/* ── 5. Card: Student Community & Mentorship ── */}
      <div className="rounded-3xl border border-purple-200/90 bg-gradient-to-br from-purple-50/60 via-white to-white p-6 sm:p-7 flex flex-col justify-between space-y-4 group hover:border-purple-300 hover:shadow-xl transition-all duration-300">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <Users className="h-5.5 w-5.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs font-mono">
              1,000+ Peers
            </span>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-display">
              Student Community
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Direct peer networking, cross-college collaboration, and startup founder interactions during the festival.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-purple-100 text-[11px] font-semibold text-slate-700">
              <Users className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span>Connect with 1,000+ student peers</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 border border-purple-100 text-[11px] font-semibold text-slate-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span>Industry jury &amp; founder advice</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-purple-100 text-xs font-bold text-purple-700 font-mono">
          <span>All-India Peer Hub</span>
          <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">Networking</span>
        </div>
      </div>

      {/* ── 6. Large Feature Card: 4-Sharing Campus Accommodation & Food ── */}
      <div className="md:col-span-2 lg:col-span-2 rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-6 sm:p-7 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:border-emerald-300 hover:shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Utensils className="h-5.5 w-5.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 shadow-2xs font-mono">
              Hostel &amp; Food
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              Campus Accommodation &amp; Food
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1.5 max-w-lg">
              During pass checkout, select whether you need accommodation. Outstation delegates receive 4-sharing campus hostel rooms with payment collected in-person upon arrival at KARE campus.
            </p>
          </div>
        </div>

        {/* Accommodation & Food Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
          {/* Feature 1: Accommodation */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/95 border border-emerald-200/80 shadow-2xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 mt-0.5">
              <Bed className="h-4 w-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-black text-slate-900 leading-tight">
                4-Sharing Hostel Rooms
              </div>
              <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Choose <span className="font-semibold text-emerald-700">&ldquo;Need Accommodation&rdquo;</span> at pass checkout. Room fees are paid in-person at the college desk.
              </div>
            </div>
          </div>

          {/* Feature 2: Food & Stay */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/95 border border-emerald-200/80 shadow-2xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 mt-0.5">
              <Utensils className="h-4 w-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-black text-slate-900 leading-tight">
                Lunch for Stay Delegates
              </div>
              <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Lunch is provided for delegates opting for campus hostel stay. Campus food courts available for all.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Tag */}
        <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs font-bold text-emerald-900 relative z-10 font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Pay Room Fees In-Person at Campus Desk</span>
          </span>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Cart Opt-In (Yes/No)
          </span>
        </div>
      </div>
    </div>
  );
}
