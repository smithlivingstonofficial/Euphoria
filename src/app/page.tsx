import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { getUserPassSummary } from "@/actions/passes";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Award,
  Ticket,
  Zap,
  HelpCircle,
  Building,
  Calendar,
  MapPin,
  Layers,
} from "lucide-react";

// Brand & Logo Components
import { CollegeLogo } from "@/components/brand/college-logo";
import { EuphoriaLogo } from "@/components/brand/euphoria-logo";

// Interactive Home Components
import { HeroParticleCanvas } from "@/components/home/hero-particle-canvas";
import { CountdownTimer } from "@/components/home/countdown-timer";
import { BentoPerksGrid } from "@/components/home/bento-perks-grid";
import { InteractivePassJourney } from "@/components/home/interactive-pass-journey";
import { CampusVenueRadar } from "@/components/home/campus-venue-radar";
import { FAQInteractive } from "@/components/home/faq-interactive";
import { MobileFloatingDock } from "@/components/home/mobile-floating-dock";
import { DroneLottie } from "@/components/home/drone-lottie";

import { isProfileComplete } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let userRole = "participant";
  let hasPass = false;

  if (user) {
    const [{ data: p }, { data: roleAssignment }, passRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_role_assignments")
        .select("role_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      getUserPassSummary(),
    ]);

    profile = p;
    // Verify that profile data is actually non-empty
    if (profile && profile.is_profile_completed && !isProfileComplete(profile)) {
      profile.is_profile_completed = false;
    }

    if (passRes?.success && passRes?.data?.hasPass) {
      hasPass = true;
    }

    const isAdmin =
      roleAssignment?.role_id === "admin" ||
      (user.email &&
        (user.email.toLowerCase().includes("admin") ||
          user.email.toLowerCase().includes("smith") ||
          user.email === process.env.ADMIN_EMAIL));

    if (isAdmin) userRole = "admin";
    else if (
      roleAssignment?.role_id === "coordinator" ||
      roleAssignment?.role_id === "staff_coordinator" ||
      roleAssignment?.role_id === "student_coordinator" ||
      roleAssignment?.role_id === "faculty"
    ) {
      userRole = roleAssignment.role_id;
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary relative overflow-x-hidden pt-[57px] pb-16 sm:pb-0">
      <Navbar
        user={
          user
            ? {
              email: user.email || "",
              role: userRole,
              participantType: profile?.participant_type,
            }
            : null
        }
      />

      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION — Co-Branded Institutional Presentation, 3D Drone & Registration Focus
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-slate-100/50 border-b border-slate-200/80 pt-3 sm:pt-5 pb-8 sm:pb-12">
        {/* Dynamic Canvas Background */}
        <HeroParticleCanvas />

        {/* Ambient Gradient Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="hero-orb-1 absolute -top-40 -left-20 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(79,70,229,0.12)_0%,rgba(99,102,241,0.03)_50%,transparent_75%)] blur-3xl" />
          <div className="hero-orb-2 absolute -top-24 -right-16 w-[550px] h-[550px] bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,rgba(14,165,233,0.02)_50%,transparent_75%)] blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* LEFT COLUMN: Clean College Logo, Big Euphoria Logo, Professional Subtitle & Action Deck (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
              {/* ── 1. Prestigious Institutional Presenter Badge (College Logo Only) ── */}
              <div className="inline-flex items-center px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all duration-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png"
                  alt="Kalasalingam Academy of Research and Education"
                  className="h-8 sm:h-9 w-auto object-contain shrink-0"
                />
              </div>

              {/* ── 2. Official Euphoria 2026 Festival Main Brand Logo ── */}
              <div className="flex items-center justify-center lg:justify-start w-full">
                <EuphoriaLogo variant="full" size="hero" />
              </div>

              {/* ── 3. Clean & Professional Festival Subtitle ── */}
              <p className="text-sm sm:text-base font-medium text-slate-600 max-w-xl leading-relaxed">
                South India&apos;s premier national techno-management festival — hosting 61 interdisciplinary competitions across 14 academic schools.
              </p>

              {/* ── 4. Primary & Secondary Call-to-Action Group ── */}
              <div className="w-full space-y-3.5 pt-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-md sm:max-w-none">
                  <Link
                    href={user ? (hasPass ? "/dashboard/passes" : (profile?.is_profile_completed ? "/events" : "/complete-profile")) : "/register"}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-primary to-cyan-600 px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-black text-white shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group cursor-pointer"
                  >
                    <Ticket className="h-5 w-5 text-cyan-200" />
                    <span>{hasPass ? "View My Delegate Pass" : "Register & Get Pass (₹200)"}</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300/90 bg-white/95 backdrop-blur-sm px-6 sm:px-7 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-slate-800 hover:bg-slate-50 hover:border-indigo-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-2xs"
                  >
                    <Layers className="h-4.5 w-4.5 text-slate-400" />
                    <span>Explore 61 Competitions</span>
                  </Link>
                </div>

                {/* Value Proposition Row */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-5 text-xs font-semibold text-slate-500 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>2 Competitions Included</span>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5 text-indigo-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Instant Digital QR Gate Pass</span>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5 text-amber-700">
                    <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>₹15 Lakhs+ Cash Prize Pool</span>
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 3D Drone & Countdown Deck (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-2 lg:py-0">
              {/* 3D Drone */}
              <DroneLottie size="lg" className="w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto" />

              {/* Drone Focus Spotlight Cone */}
              <div className="relative w-full flex flex-col items-center -mt-6 sm:-mt-8 z-20">
                <div className="relative w-64 sm:w-72 h-8 overflow-hidden pointer-events-none flex justify-center">
                  <div className="w-40 h-full bg-gradient-to-b from-cyan-400/35 via-indigo-500/15 to-transparent [clip-path:polygon(38%_0%,62%_0%,100%_100%,0%_100%)] blur-xs animate-pulse" />
                </div>

                {/* Projected Countdown Deck */}
                <div className="relative group w-full sm:w-auto">
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-400/25 via-indigo-500/30 to-primary/25 blur-md opacity-80 group-hover:opacity-100 transition-opacity animate-pulse pointer-events-none" />
                  <CountdownTimer />
                </div>
              </div>
            </div>

          </div>

          {/* ── 9. Credibility Metrics Strip (4 Compact & Attractive Cards) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full pt-6 sm:pt-8">
            {/* Stat 1: 61 Competitions */}
            <div className="relative flex items-center gap-3 sm:gap-3.5 rounded-2xl border border-indigo-100/90 bg-white/95 backdrop-blur-md p-3 sm:p-3.5 shadow-2xs hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/80 text-indigo-600 border border-indigo-200/60 shadow-2xs group-hover:scale-105 transition-transform">
                <Layers className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight font-mono leading-none">
                  61
                </div>
                <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5 truncate">
                  Competitions
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5 truncate">
                  Day 1 &amp; Day 2 Tracks
                </div>
              </div>
            </div>

            {/* Stat 2: 14 Academic Schools */}
            <div className="relative flex items-center gap-3 sm:gap-3.5 rounded-2xl border border-emerald-100/90 bg-white/95 backdrop-blur-md p-3 sm:p-3.5 shadow-2xs hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-600 border border-emerald-200/60 shadow-2xs group-hover:scale-105 transition-transform">
                <Building className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight font-mono leading-none">
                  14
                </div>
                <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5 truncate">
                  Academic Schools
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5 truncate">
                  Computing, SEET &amp; more
                </div>
              </div>
            </div>

            {/* Stat 3: ₹15L+ Cash Prizes */}
            <div className="relative flex items-center gap-3 sm:gap-3.5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 backdrop-blur-md p-3 sm:p-3.5 shadow-2xs hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/70 text-amber-700 border border-amber-300/60 shadow-2xs group-hover:scale-105 transition-transform">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-black text-amber-950 tracking-tight font-mono leading-none">
                  ₹15L+
                </div>
                <div className="text-xs font-bold text-amber-900 leading-tight mt-0.5 truncate">
                  Cash Prize Pool
                </div>
                <div className="text-[10px] text-amber-800/80 font-medium leading-none mt-0.5 truncate">
                  Direct Bank Payouts
                </div>
              </div>
            </div>

            {/* Stat 4: Physical Certificates */}
            <div className="relative flex items-center gap-3 sm:gap-3.5 rounded-2xl border border-teal-100/90 bg-gradient-to-br from-white via-teal-50/40 to-teal-100/30 backdrop-blur-md p-3 sm:p-3.5 shadow-2xs hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/80 text-teal-600 border border-teal-200/60 shadow-2xs group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5 text-teal-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-black text-teal-950 tracking-tight font-mono leading-none">
                  Official
                </div>
                <div className="text-xs font-bold text-teal-900 leading-tight mt-0.5 truncate">
                  Physical Certificates
                </div>
                <div className="text-[10px] text-teal-700/80 font-medium leading-none mt-0.5 truncate">
                  Issued on Campus
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. GAMIFIED BENTO PERKS GRID */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Festival Benefits</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Why Compete at Euphoria 2026?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Gain national exposure, verified credentials, cash prizes up to ₹15 Lakhs+, and tech peer networks.
            </p>
          </div>

          <BentoPerksGrid />
        </div>
      </section>

      {/* 3. INTERACTIVE 3-STEP PASS PARTICIPATION JOURNEY */}
      <section className="border-t border-slate-200/80 bg-white py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Simple 3-Step Process</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              3 Simple Steps to Participate
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Claim your delegate pass in seconds using your official Google account.
            </p>
          </div>

          <InteractivePassJourney />
        </div>
      </section>

      {/* 4. CAMPUS VENUE RADAR */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Building className="h-3.5 w-3.5 text-primary" />
              <span>Campus Venues</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Kalasalingam University Event Venues
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Discover where hackathons, combat arenas, and keynote stages are located across the campus.
            </p>
          </div>

          <CampusVenueRadar />
        </div>
      </section>

      {/* 5. SEARCHABLE FAQ */}
      <section className="border-t border-slate-200/80 bg-white py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              <span>Common Questions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Everything you need to know about delegate passes, competitions, hostel accommodation, and event details.
            </p>
          </div>

          <FAQInteractive />
        </div>
      </section>

      {/* 6. HIGH-CONVERTING CLOSING CTA BANNER */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 p-8 sm:p-12 lg:p-14 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-8 sm:gap-10 shadow-2xl relative overflow-hidden group">
            {/* Luminous ambient background glows */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-cyan-300/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-300/30 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-amber-300/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-300/25 transition-all duration-700" />

            <div className="space-y-3 max-w-xl relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-bold uppercase tracking-wider font-mono border border-white/20 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                <span>₹15 Lakhs+ Cash Pool Active</span>
              </div>

              <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight font-display text-white leading-tight">
                Ready to compete and make history?
              </h3>

              <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed max-w-lg">
                Registrations are open for students across India. Claim your 2 competition slots before flagship hackathon and robotics arenas reach capacity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 relative z-10 shrink-0">
              <Link
                href={user ? (hasPass ? "/dashboard/passes" : "/events") : "/register"}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-xs sm:text-sm font-black text-slate-900 shadow-xl shadow-slate-950/10 hover:bg-cyan-50 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>{hasPass ? "View Pass QR Code" : "Claim Your Pass Now (₹200)"}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>

              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/20 px-6 py-4 text-xs sm:text-sm font-bold text-white hover:text-cyan-200 transition-all backdrop-blur-md shadow-md hover:scale-[1.02] active:scale-[0.99]"
              >
                <Zap className="h-4 w-4 text-cyan-300" />
                <span>Browse 61 Events</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Mobile Dock */}
      <MobileFloatingDock userRole={userRole} hasPass={hasPass} />

      <Footer />
    </div>
  );
}
