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

      {/* ═══════════════════════════════════════════════════════════════
          ULTRA-MODERN TECHFEST HERO SECTION — Clean, Centered & Prestigious
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/60 to-slate-100/40 border-b border-slate-200/80 py-10 sm:py-16 lg:py-20">
        {/* Dynamic Canvas Background */}
        <HeroParticleCanvas />

        {/* Ambient Gradient Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="hero-orb-1 absolute -top-40 -left-20 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(79,70,229,0.12)_0%,rgba(99,102,241,0.03)_50%,transparent_75%)] blur-3xl" />
          <div className="hero-orb-2 absolute -top-24 -right-16 w-[550px] h-[550px] bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,rgba(14,165,233,0.02)_50%,transparent_75%)] blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center space-y-6 sm:space-y-8">
          
          {/* ── Official Kalasalingam Institutional Header (ONLY College Logo) ── */}
          <div className="flex items-center justify-center p-3 sm:p-4 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-2xs">
            <CollegeLogo variant="full" />
          </div>

          {/* ── Official Euphoria Logo (Replaces Tag) ── */}
          <div className="pt-1">
            <EuphoriaLogo variant="full" size="lg" />
          </div>

          {/* ── Headline ── */}
          <div className="space-y-1 max-w-4xl">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 font-display leading-[1.06]">
              Where Innovation
            </h1>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight font-display leading-[1.06] bg-gradient-to-r from-indigo-600 via-primary to-cyan-500 bg-clip-text text-transparent">
              Meets Velocity.
            </h1>
          </div>

          {/* ── Narrative & Value Subtext ── */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium max-w-2xl">
            South India&apos;s premier national technical showdown at Kalasalingam University. Compete across <strong className="text-slate-900 font-bold">61 high-octane competitions</strong> in 14 academic schools for a <strong className="text-slate-900 font-bold">₹15 Lakhs+ cash prize pool</strong> and verified national credentials.
          </p>

          {/* ── Primary Call-to-Action Group ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none pt-1">
            <Link
              href={user ? (hasPass ? "/dashboard/passes" : "/events") : "/register"}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-primary to-cyan-600 px-8 py-4 text-sm sm:text-base font-black text-white shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-98 transition-all group cursor-pointer w-full sm:w-auto"
            >
              <Ticket className="h-5 w-5 text-cyan-200" />
              <span>{hasPass ? "View My Delegate Pass" : "Claim All-Access Pass (₹200) →"}</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/90 backdrop-blur-sm px-6 py-4 text-sm font-bold text-slate-800 hover:bg-slate-50 hover:border-indigo-300 transition-all shadow-2xs w-full sm:w-auto"
            >
              <Layers className="h-4.5 w-4.5 text-slate-400" />
              <span>Explore 61 Competitions</span>
            </Link>
          </div>

          {/* ── Countdown Timer Centerpiece ── */}
          <div className="w-full max-w-sm pt-2">
            <CountdownTimer />
          </div>

          {/* ── Social Proof Trust Bar ── */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {["A", "R", "S"].map((l, i) => (
                  <div
                    key={l}
                    className="h-6 w-6 rounded-full text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white shadow-2xs"
                    style={{ background: ["#6366F1", "#10B981", "#F59E0B"][i] }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              <span><strong className="text-slate-900 font-bold">1,240+</strong> Delegates Registered</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Instant QR Generation
            </span>
          </div>

          {/* ── 4 Modern Metric Capsules ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full pt-6 sm:pt-8">
            {/* Stat 1 */}
            <div className="relative rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-sm p-4 sm:p-5 shadow-2xs hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl bg-gradient-to-b from-indigo-500 to-primary" />
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                61
              </div>
              <div className="text-xs font-bold text-slate-800 mt-1">Official Competitions</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Day 1 &amp; Day 2 tracks</div>
            </div>

            {/* Stat 2 */}
            <div className="relative rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-sm p-4 sm:p-5 shadow-2xs hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl bg-gradient-to-b from-emerald-500 to-teal-500" />
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                14
              </div>
              <div className="text-xs font-bold text-slate-800 mt-1">Academic Schools</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Computing, SEET &amp; more</div>
            </div>

            {/* Stat 3 */}
            <div className="relative rounded-3xl border border-amber-200/80 bg-amber-50/60 backdrop-blur-sm p-4 sm:p-5 shadow-2xs hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl bg-gradient-to-b from-amber-500 to-orange-500" />
              <div className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight flex items-center gap-1.5 font-mono">
                <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                <span>₹15L+</span>
              </div>
              <div className="text-xs font-bold text-amber-900 mt-1">Prizes &amp; Cash Awards</div>
              <div className="text-[11px] text-amber-800/80 mt-0.5 font-medium">Direct bank payouts</div>
            </div>

            {/* Stat 4 */}
            <div className="relative rounded-3xl border border-teal-200/80 bg-teal-50/50 backdrop-blur-sm p-4 sm:p-5 shadow-2xs hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl bg-gradient-to-b from-teal-500 to-emerald-600" />
              <div className="text-2xl sm:text-3xl font-black text-teal-900 tracking-tight flex items-center gap-1.5 font-mono">
                <Award className="h-5 w-5 text-teal-600 shrink-0" />
                <span>Verified</span>
              </div>
              <div className="text-xs font-bold text-teal-900 mt-1">Digital Certificates</div>
              <div className="text-[11px] text-teal-700/80 mt-0.5 font-medium">Instant QR verification</div>
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
              Everything you need to know about passes, team rules, travel, and credentials.
            </p>
          </div>

          <FAQInteractive />
        </div>
      </section>

      {/* 6. HIGH-CONVERTING CLOSING CTA BANNER */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 p-6 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 shadow-2xl relative overflow-hidden">
            {/* Luminous ambient elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-300/15 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2.5 max-w-xl relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                <span>₹15 Lakhs+ Cash Pool Active</span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight pt-1 font-display">
                Ready to compete and make history?
              </h3>
              <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                Registrations are open for students across India. Claim your 2 competition slots before flagship hackathon and robotics arenas reach capacity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 shrink-0">
              <Link
                href={user ? (hasPass ? "/dashboard/passes" : "/events") : "/register"}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-xs sm:text-sm font-black text-slate-900 shadow-xl hover:bg-cyan-50 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>{hasPass ? "View Pass QR" : "Claim Your Pass Now (₹200)"}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>

              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/80 border border-white/20 px-6 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-slate-900 transition-all shadow-md"
              >
                <Zap className="h-4 w-4" />
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
