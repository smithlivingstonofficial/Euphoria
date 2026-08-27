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
  Scale,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Users,
  ChevronRight,
  MapPin,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

const SCHOOL_TRACKS = [
  {
    name: "Computing & Artificial Intelligence",
    school: "School of Computing (SoC / SCSE)",
    count: "12 Events",
    desc: "24-Hr Hackathons, Wonders of AI 4.0, PromptHive, Byte Odyssey & Code Xtreme.",
    icon: Cpu,
    color: "from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700",
    href: "/events?track=Computing",
  },
  {
    name: "Robotics & Electrical Systems",
    school: "School of Electrical & Electronics (SEET)",
    count: "9 Events",
    desc: "Chipcraft 3.0, QNX World, Smart Grid, GreenTech IoT & eSiM-A-THON.",
    icon: Bot,
    color: "from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-700",
    href: "/events?track=Electrical",
  },
  {
    name: "Mechanical, Aero & Smart UAVs",
    school: "SMACE (Mech, Aero & Civil)",
    count: "5 Events",
    desc: "Skyforge UAVs, Smart City, Gravity Rush, Bot Velocity & CAD Draft Kings.",
    icon: Plane,
    color: "from-sky-500/10 to-cyan-500/10 border-sky-200 text-sky-700",
    href: "/events?track=Mechanical",
  },
  {
    name: "Biotechnology & Chemical Sciences",
    school: "School of Bio & Chemical (SBCE)",
    count: "4 Events",
    desc: "CELLFIE Snapshot, BioGrant X Problem to Proposal, Cultivating Solutions & Pitch Deck.",
    icon: Dna,
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700",
    href: "/events?track=Biotechnology",
  },
  {
    name: "Business, Commerce & FinTech",
    school: "Kalasalingam Business School (KBS)",
    count: "5 Events",
    desc: "ADZAP, ACCFINTHON, Business Quiz, Paper Presentations & Social Impact Photography.",
    icon: Briefcase,
    color: "from-purple-500/10 to-violet-500/10 border-purple-200 text-purple-700",
    href: "/events?track=Management",
  },
  {
    name: "Advanced Sciences & Mathematics",
    school: "School of Advanced Sciences (SAS)",
    count: "4 Events",
    desc: "MINDSNAP, Crime Scene Chronicles Forensic Hunt, MATHXPLORE & Treasure Hunt.",
    icon: FlaskConical,
    color: "from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-700",
    href: "/events?track=Sciences",
  },
  {
    name: "Architecture, Law & Media Arts",
    school: "KSoA, KSoL & Liberal Arts (SLASE)",
    count: "13 Events",
    desc: "Archathon 24, Legal Draft Battle, Moot Court, Culinary Arts & Media Reels.",
    icon: Compass,
    color: "from-indigo-500/10 to-fuchsia-500/10 border-indigo-200 text-indigo-700",
    href: "/events?track=Architecture",
  },
  {
    name: "Health, Nursing & Foundational Core",
    school: "AHS, Nursing, Physio & First Year",
    count: "9 Events",
    desc: "CRE8-3D, Human Lab, Physioquest, Fresh Coders 2.0 & Mechatronics Integration.",
    icon: ShieldCheck,
    color: "from-teal-500/10 to-emerald-500/10 border-teal-200 text-teal-700",
    href: "/events?track=Health",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, participant_type")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        user={
          user
            ? {
                email: user.email || "",
                participantType: profile?.participant_type,
              }
            : null
        }
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white py-14 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-indigo-50/70 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
          <div className="max-w-3xl space-y-4">
            {/* Festival Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-bold text-primary shadow-2xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Kalasalingam National Technical Symposium • Euphoria 2026</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Where Innovation Meets{" "}
              <span className="bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Excellence.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Experience South India&apos;s premier university symposium. Compete in{" "}
              <strong>61 official events</strong> across 14 schools in Computing, AI,
              Robotics, Bio-Engineering, Architecture, Business, and Law. Free entry
              passes for all college students.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all"
              >
                <Layers className="h-4 w-4" />
                <span>Explore 61 Events</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/schedule"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
              >
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Day 1 &amp; Day 2 Schedule</span>
              </Link>

              {!user && (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-5 py-3 text-xs sm:text-sm font-bold text-primary hover:bg-indigo-100 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Get Student Pass</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                61
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                Official Events
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                14
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                KARE Schools
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                Sept 25-26
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                Festival Dates
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
                ₹0 FREE
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                All-Access Pass
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tracks & Schools Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span>Department Clusters</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Explore Tracks by Discipline
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your domain to browse specialized hackathons, paper presentations, and robotics arenas.
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

        {/* Tracks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SCHOOL_TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <Link
                key={track.name}
                href={track.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br border ${track.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {track.count}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                      {track.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {track.school}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {track.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-primary pt-2 border-t border-slate-100">
                  <span>Browse Track</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3-Step Participant Journey (Zero wasted space) */}
      <section className="border-t border-slate-200 bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              How to Participate in Euphoria &apos;26
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Instant registration for all internal KARE students and external university participants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 space-y-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-bold text-xs shadow-xs">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900">Sign In with Google</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                One-click authentication using your official student Google account with automatic affiliation setup.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 space-y-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900">Choose Your Competitions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explore the 61 official events across Day 1 &amp; Day 2 and claim your free seat with 1-click registration.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 space-y-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900">Get Digital QR Pass</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access your pass directly in your Dashboard for rapid check-in at event venues across campus.
              </p>
            </div>
          </div>

          {/* Bottom Banner CTA */}
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-primary via-indigo-700 to-purple-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Ready to compete in Euphoria &apos;26?
              </h3>
              <p className="text-xs text-indigo-100 max-w-lg">
                Registrations are free and open to all UG &amp; PG students across India. Claim your digital pass now.
              </p>
            </div>

            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-bold text-slate-900 shadow-sm hover:bg-indigo-50 active:scale-[0.99] transition-all shrink-0"
            >
              <span>Explore All 61 Events</span>
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
