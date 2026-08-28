import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { getUserPassSummary } from "@/actions/passes";
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Layers,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Award,
  Ticket,
  Flame,
  Zap,
  HelpCircle,
  Building,
} from "lucide-react";

// Interactive Light Home Components
import { HeroParticleCanvas } from "@/components/home/hero-particle-canvas";
import { CountdownTimer } from "@/components/home/countdown-timer";
import { HolographicPassCard } from "@/components/home/holographic-pass-card";
import { FlagshipSpotlight } from "@/components/home/flagship-spotlight";
import { TrackExplorerTabs } from "@/components/home/track-explorer-tabs";
import { ScheduleSimulator } from "@/components/home/schedule-simulator";
import { BentoPerksGrid } from "@/components/home/bento-perks-grid";
import { InteractivePassJourney } from "@/components/home/interactive-pass-journey";
import { CampusVenueRadar } from "@/components/home/campus-venue-radar";
import { FAQInteractive } from "@/components/home/faq-interactive";
import { MobileFloatingDock } from "@/components/home/mobile-floating-dock";

export const dynamic = "force-dynamic";

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
        .select("full_name, participant_type, is_profile_completed")
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
    <div className="min-h-screen bg-[#FAFAFC] text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary relative overflow-x-hidden pt-16 pb-16 sm:pb-0">
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

      {/* 1. HERO SECTION (Streamlined Content & Compact Mobile Spacing) */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white py-6 sm:py-16">
        {/* Interactive Light Particle Constellation Canvas */}
        <HeroParticleCanvas />

        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-100/50 via-cyan-100/40 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-gradient-to-tr from-sky-100/40 via-emerald-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
            {/* Hero Left Column: Headline, Subtitle, Countdown, CTAs */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center sm:text-left flex flex-col items-center sm:items-start">
              {/* Official College Logo Badge (Centered on Mobile) */}
              <div className="flex justify-center sm:justify-start w-full">
                <div className="inline-flex items-center rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 px-4 py-2 shadow-xs">
                  <img
                    src="https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png"
                    alt="Kalasalingam Academy of Research and Education"
                    className="h-7 sm:h-9 w-auto object-contain"
                  />
                </div>
              </div>

              {/* High-Impact Punchy Headline */}
              <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
                ENGINEER THE FUTURE.{" "}
                <span className="bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  DOMINATE THE ARENA.
                </span>
              </h1>

              {/* Streamlined Subtitle (Ultra-Concise 1-Liner) */}
              <p className="text-xs sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl">
                Compete in <strong>61 official events</strong> across 14 academic schools with <strong>₹25,000+ in cash prizes</strong>.
              </p>

              {/* Compact Visual Telemetry Chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 font-mono text-[10px] sm:text-xs font-bold text-slate-700">
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200">
                  ⚡ 61 COMPETITIONS
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  🏆 ₹25,000+ CASH POOL
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-primary">
                  🎓 14 SCHOOLS
                </span>
              </div>

              {/* Compact Mobile Countdown Timer */}
              <div className="pt-1 w-full flex justify-center sm:justify-start">
                <CountdownTimer />
              </div>

              {/* Tech Action CTAs */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1 font-sans w-full">
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition-all group"
                >
                  <Zap className="h-4 w-4 fill-current text-cyan-200" />
                  <span>Explore 61 Events</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/schedule"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs font-mono"
                >
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span>[ SCHEDULE ]</span>
                </Link>

                {user ? (
                  userRole === "admin" ? (
                    <Link
                      href="/admin"
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-xs font-mono"
                    >
                      <Sparkles className="h-4 w-4 text-rose-600" />
                      <span>[ ADMIN ]</span>
                    </Link>
                  ) : userRole === "staff_coordinator" ||
                    userRole === "student_coordinator" ||
                    userRole === "coordinator" ? (
                    <Link
                      href="/coordinator"
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs sm:text-sm font-bold text-primary hover:bg-indigo-100 transition-all shadow-xs font-mono"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>[ HUB ]</span>
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/passes"
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs sm:text-sm font-bold text-primary hover:bg-indigo-100 transition-all shadow-xs font-mono"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>[ PASS_QR ]</span>
                    </Link>
                  )
                ) : (
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs sm:text-sm font-bold text-primary hover:bg-indigo-100 transition-all shadow-xs font-mono"
                  >
                    <Ticket className="h-4 w-4" />
                    <span>[ GET_PASS ]</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Hero Right Column: Light 3D Holographic Pass Card */}
            <div className="lg:col-span-5 flex items-center justify-center pt-2 lg:pt-0">
              <HolographicPassCard userRole={userRole} hasPass={hasPass} />
            </div>
          </div>

          {/* 4 Light Tech Stat Capsules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-6 sm:pt-8">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-sm p-3 sm:p-4 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="text-xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-primary transition-colors">
                61
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-0.5">
                Official Events
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-0.5">
                Day 1 &amp; Day 2 tracks
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-sm p-3 sm:p-4 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="text-xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-primary transition-colors">
                14
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-0.5">
                Academic Schools
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-0.5">
                Computing, SEET &amp; more
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 backdrop-blur-sm p-3 sm:p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group">
              <div className="text-xl sm:text-3xl font-black text-amber-900 font-mono tracking-tight flex items-center gap-1">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
                <span>₹25,000+</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-amber-900 mt-0.5">
                Prizes &amp; Awards
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-amber-700/80 mt-0.5">
                Cash pools &amp; trophies
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 backdrop-blur-sm p-3 sm:p-4 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group">
              <div className="text-xl sm:text-3xl font-black text-emerald-900 font-mono tracking-tight flex items-center gap-1">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                <span>Verified</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-emerald-900 mt-0.5">
                Certificates
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-emerald-700/80 mt-0.5">
                Official KARE credentials
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MARQUEE FLAGSHIP COMPETITIONS SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full space-y-4">
        <div className="text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>[ SPOTLIGHT_ARENAS ]</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Flagship Arenas &amp; 24-Hr Marathons
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Explore the most anticipated high-octane battles across AI, robotics combat, flight drones, and biotech research.
          </p>
        </div>

        <FlagshipSpotlight />
      </section>

      {/* 3. INTERACTIVE 8 ACADEMIC TRACKS MATRIX */}
      <section className="border-t border-slate-200/80 bg-white py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
                <Layers className="h-3.5 w-3.5" />
                <span>[ DISCIPLINE_MATRIX ]</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Explore by Discipline
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Switch through the 8 academic disciplines to discover specialized challenges and university labs.
              </p>
            </div>

            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline self-start sm:self-auto font-mono"
            >
              <span>[ VIEW_ALL_61_EVENTS ]</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <TrackExplorerTabs />
        </div>
      </section>

      {/* 4. INTERACTIVE 2-DAY FESTIVAL SCHEDULE SIMULATOR */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              <span>[ ROADMAP_SIMULATOR ]</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Two Days of Non-Stop Tech
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Friday, Sept 25 &amp; Saturday, Sept 26, 2026 at Kalasalingam Main Campus.
            </p>
          </div>

          <ScheduleSimulator />
        </div>
      </section>

      {/* 5. GAMIFIED BENTO PERKS GRID */}
      <section className="border-t border-slate-200/80 bg-white py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>[ PARTICIPANT_PERKS ]</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Why Compete at Euphoria 2026?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              More than a symposium. Gain national exposure, verified credentials, cash prizes, and tech peer networks.
            </p>
          </div>

          <BentoPerksGrid />
        </div>
      </section>

      {/* 6. INTERACTIVE 3-STEP PASS PARTICIPATION JOURNEY */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>[ ONBOARDING_FLOW ]</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              3 Simple Steps to Participate
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Claim your delegate pass in seconds using your official Google account.
            </p>
          </div>

          <InteractivePassJourney />
        </div>
      </section>

      {/* 7. CAMPUS VENUE RADAR & LOCATION GUIDE */}
      <section className="border-t border-slate-200/80 bg-white py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
              <Building className="h-3.5 w-3.5 text-primary" />
              <span>[ CAMPUS_LOCATIONS ]</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Kalasalingam University Event Venues
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Discover where hackathons, combat arenas, and keynote stages are located across the campus.
            </p>
          </div>

          <CampusVenueRadar />
        </div>
      </section>

      {/* 8. DYNAMIC SEARCHABLE FAQ ACCORDION */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              <span>[ FAQ_KNOWLEDGEBASE ]</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Everything you need to know about passes, team rules, travel, and credentials.
            </p>
          </div>

          <FAQInteractive />
        </div>
      </section>

      {/* 9. LIGHT HIGH-TECH CLOSING CTA BANNER */}
      <section className="border-t border-slate-200/80 bg-white py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 p-6 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
            {/* Luminous glow elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-300/15 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2.5 max-w-xl relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                <span>[ CAPACITY_LIMITED ]</span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight pt-1">
                Ready to compete and make history?
              </h3>
              <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                Registrations are open for students across India. Reserve your 2 competition slots before flagship hackathon and robotics arenas reach capacity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 shrink-0">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-xs sm:text-sm font-black text-slate-900 shadow-xl hover:bg-cyan-50 active:scale-[0.99] transition-all"
              >
                <span>Browse 61 Events</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>

              {user ? (
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/80 border border-white/20 px-6 py-4 text-xs sm:text-sm font-bold text-white hover:bg-slate-900 transition-all shadow-md font-mono"
                >
                  <QrCode className="h-4 w-4" />
                  <span>[ MY_PASS_QR ]</span>
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/80 border border-white/20 px-6 py-4 text-xs sm:text-sm font-bold text-white hover:bg-slate-900 transition-all shadow-md font-mono"
                >
                  <Ticket className="h-4 w-4" />
                  <span>[ CLAIM_DELEGATE_PASS ]</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Floating Mobile Dock in Light Theme */}
      <MobileFloatingDock userRole={userRole} hasPass={hasPass} />

      <Footer />
    </div>
  );
}
