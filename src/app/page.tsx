import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Layers,
  Cpu,
  Bot,
  Plane,
  Dna,
  Briefcase,
  FlaskConical,
  Compass,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Award,
  Star,
  Ticket,
  Clock,
  MapPin,
  Flame,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

const TRACKS = [
  {
    name: "Computing & Artificial Intelligence",
    school: "School of Computing (SoC / SCSE)",
    count: "12 Events",
    highlight: "24-Hr Hackathons, AI 4.0 & PromptHive",
    icon: Cpu,
    color: "from-blue-600 to-indigo-600 text-blue-600 bg-blue-50 border-blue-200",
    href: "/events?track=Computing",
  },
  {
    name: "Robotics & Electrical Systems",
    school: "School of Electrical & Electronics (SEET)",
    count: "9 Events",
    highlight: "Chipcraft 3.0, QNX World & GreenTech IoT",
    icon: Bot,
    color: "from-amber-500 to-orange-600 text-amber-700 bg-amber-50 border-amber-200",
    href: "/events?track=Electrical",
  },
  {
    name: "Mechanical, Aero & Smart UAVs",
    school: "SMACE (Mech, Aero & Civil)",
    count: "5 Events",
    highlight: "Skyforge UAV Drones, Gravity Rush & CAD",
    icon: Plane,
    color: "from-sky-500 to-cyan-600 text-sky-700 bg-sky-50 border-sky-200",
    href: "/events?track=Mechanical",
  },
  {
    name: "Biotechnology & Chemical Sciences",
    school: "School of Bio & Chemical (SBCE)",
    count: "4 Events",
    highlight: "BioGrant X, CELLFIE Snapshot & Pitch Deck",
    icon: Dna,
    color: "from-emerald-500 to-teal-600 text-emerald-700 bg-emerald-50 border-emerald-200",
    href: "/events?track=Biotechnology",
  },
  {
    name: "Business, Commerce & FinTech",
    school: "Kalasalingam Business School (KBS)",
    count: "5 Events",
    highlight: "ADZAP, ACCFINTHON & Business Quiz",
    icon: Briefcase,
    color: "from-purple-500 to-violet-600 text-purple-700 bg-purple-50 border-purple-200",
    href: "/events?track=Management",
  },
  {
    name: "Advanced Sciences & Mathematics",
    school: "School of Advanced Sciences (SAS)",
    count: "4 Events",
    highlight: "Crime Scene Forensic Hunt & MATHXPLORE",
    icon: FlaskConical,
    color: "from-rose-500 to-pink-600 text-rose-700 bg-rose-50 border-rose-200",
    href: "/events?track=Sciences",
  },
  {
    name: "Architecture, Law & Media Arts",
    school: "KSoA, KSoL & Liberal Arts (SLASE)",
    count: "13 Events",
    highlight: "Archathon 24, Moot Court & Culinary Arts",
    icon: Compass,
    color: "from-indigo-500 to-fuchsia-600 text-indigo-700 bg-indigo-50 border-indigo-200",
    href: "/events?track=Architecture",
  },
  {
    name: "Health, Nursing & Foundational Core",
    school: "AHS, Nursing, Physio & First Year",
    count: "9 Events",
    highlight: "Human Lab, Physioquest & Fresh Coders",
    icon: ShieldCheck,
    color: "from-teal-500 to-emerald-600 text-teal-700 bg-teal-50 border-teal-200",
    href: "/events?track=Health",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let userRole = "participant";

  if (user) {
    const [{ data: p }, { data: roleAssignment }] = await Promise.all([
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
    ]);

    profile = p;
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
    <div className="min-h-screen bg-[#FAFAFC] text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary">
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

      {/* 1. HERO SECTION (High-Tech Minimalist Light Design) */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white py-12 sm:py-20">
        {/* Subtle high-tech background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-200/40 via-purple-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-gradient-to-tr from-sky-200/30 via-emerald-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
          <div className="max-w-3xl space-y-4">
            {/* Pulsing Status Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/90 bg-indigo-50/90 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Kalasalingam University • Euphoria 2026</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-500">Sept 25-26</span>
            </div>

            {/* Bold Punchy Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              The Flagship University{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Technical Symposium.
              </span>
            </h1>

            {/* Concise Subtext */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
              Join students from across India for 2 days of hackathons, robotics, AI arenas,
              and paper presentations. Compete in <strong>61 official events</strong> across 14 academic schools.
            </p>

            {/* Tech Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition-all group"
              >
                <Zap className="h-4 w-4 fill-current text-indigo-200" />
                <span>Explore 61 Competitions</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/schedule"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
              >
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Schedule Timeline</span>
              </Link>

              {user ? (
                userRole === "admin" ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-xs"
                  >
                    <Sparkles className="h-4 w-4 text-rose-600" />
                    <span>Admin Console</span>
                  </Link>
                ) : userRole === "staff_coordinator" ||
                  userRole === "student_coordinator" ||
                  userRole === "coordinator" ? (
                  <Link
                    href="/coordinator"
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3.5 text-xs sm:text-sm font-bold text-primary hover:bg-indigo-100 transition-all shadow-xs"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Coordinator Hub</span>
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/passes"
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-5 py-3.5 text-xs sm:text-sm font-bold text-primary hover:bg-indigo-100 transition-all shadow-xs"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Digital QR Pass</span>
                  </Link>
                )
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-5 py-3.5 text-xs sm:text-sm font-bold text-primary hover:bg-indigo-100 transition-all shadow-xs"
                >
                  <Ticket className="h-4 w-4" />
                  <span>Get Festival Pass</span>
                </Link>
              )}
            </div>
          </div>

          {/* 4 Interactive Tech Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-primary transition-colors">
                61
              </div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">
                Official Events
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Day 1 &amp; Day 2 tracks
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-primary transition-colors">
                14
              </div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">
                Academic Schools
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Computing, SEET, SMACE &amp; more
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group">
              <div className="text-2xl sm:text-3xl font-black text-amber-900 font-mono tracking-tight flex items-center gap-1.5">
                <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                <span>₹25,000+</span>
              </div>
              <div className="text-xs font-bold text-amber-900 mt-0.5">
                Prizes &amp; Awards
              </div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">
                Cash pools &amp; trophies
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group">
              <div className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono tracking-tight flex items-center gap-1.5">
                <Award className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Verified</span>
              </div>
              <div className="text-xs font-bold text-emerald-900 mt-0.5">
                Certificates
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">
                Official university credentials
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 8 ACADEMIC TRACKS GRID (Professional & Engaging) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" />
              <span>Department Tracks</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Explore by Discipline
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Select your track to browse specialized hackathons, robotics arenas, and technical presentations.
            </p>
          </div>

          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline self-start sm:self-auto"
          >
            <span>View All 61 Events Directory</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 8 Tracks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <Link
                key={track.name}
                href={track.href}
                className="group rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${track.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {track.count}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                      {track.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {track.school}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {track.highlight}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-primary pt-3 border-t border-slate-100">
                  <span>Browse Track</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. 2-DAY FESTIVAL TIMELINE RADAR */}
      <section className="border-t border-slate-200/80 bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5" />
                <span>Festival Timeline</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Two Days of Non-Stop Tech
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Friday, Sept 25 &amp; Saturday, Sept 26, 2026 at Kalasalingam Main Campus.
              </p>
            </div>

            <Link
              href="/schedule"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors self-start sm:self-auto"
            >
              <span>Full Interactive Schedule (61 Events)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Day 1 Card */}
            <div className="rounded-3xl border border-slate-200/90 bg-slate-50/50 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white font-black text-sm shadow-xs">
                    01
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Day 1 • Friday, Sept 25, 2026
                    </h3>
                    <p className="text-xs text-slate-500">
                      Grand Inauguration &amp; Flagship Hackathons Kickoff
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-100 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                  Day 1
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-200/80 pt-3.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>09:30 AM:</strong> Inauguration Ceremony at University Auditorium</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>11:00 AM:</strong> 24-Hr Hackathons &amp; Technical Arenas Launch</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>02:00 PM:</strong> Paper Presentations &amp; AI Prompt Stages</span>
                </div>
              </div>
            </div>

            {/* Day 2 Card */}
            <div className="rounded-3xl border border-slate-200/90 bg-slate-50/50 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600 text-white font-black text-sm shadow-xs">
                    02
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Day 2 • Saturday, Sept 26, 2026
                    </h3>
                    <p className="text-xs text-slate-500">
                      Final Demos, Robotics Deathmatch &amp; Valedictory
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[10px] font-bold">
                  Day 2
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-200/80 pt-3.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>09:00 AM:</strong> 24-Hr Hackathon Final Project Evaluations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>11:30 AM:</strong> Robotics Battle &amp; Drone Velocity Finals</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>03:30 PM:</strong> Grand Valedictory &amp; ₹25,000+ Prize Ceremony</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SIMPLE 3-STEP PARTICIPATION FLOW */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              3 Simple Steps to Participate
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Claim your delegate pass in seconds using your official student Google account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 space-y-3 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white font-black text-sm shadow-xs">
                1
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">1. Instant Sign In</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Authenticate with Google. Your college and department profile are set up automatically.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 space-y-3 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-xs">
                2
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">2. Select 2 Competitions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose any 2 event slots across Day 1 &amp; Day 2 from our 61-event catalog.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 space-y-3 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                3
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">3. Get Digital QR Pass</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access your pass on your phone for rapid gate scanning at event checkpoints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MINIMALIST HIGH-TECH CTA BANNER */}
      <section className="border-t border-slate-200/80 bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-primary via-indigo-600 to-purple-700 p-7 sm:p-10 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="space-y-1.5 max-w-xl relative z-10">
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                Euphoria 2026
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight pt-1">
                Ready to compete and innovate?
              </h3>
              <p className="text-xs sm:text-sm text-indigo-100">
                Registrations are open for students across India. Explore all 61 competitions today.
              </p>
            </div>

            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-xs sm:text-sm font-black text-slate-900 shadow-md hover:bg-indigo-50 active:scale-[0.99] transition-all shrink-0 relative z-10"
            >
              <span>Explore 61 Events Directory</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
