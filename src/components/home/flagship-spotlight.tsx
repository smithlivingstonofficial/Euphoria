"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Zap,
  Users,
  Clock,
  ArrowRight,
  Flame,
  Bot,
  Cpu,
  Plane,
  Dna,
  Briefcase,
  Sparkles,
} from "lucide-react";

interface FlagshipEvent {
  id: string;
  title: string;
  category: string;
  school: string;
  prizePool: string;
  teamSize: string;
  timing: string;
  day: string;
  description: string;
  tag: string;
  icon: typeof Cpu;
  gradient: string;
  borderHover: string;
  filterType: string;
}

const FLAGSHIP_EVENTS: FlagshipEvent[] = [
  {
    id: "hackathon-24",
    title: "24-Hour National AI & Web3 Hackathon",
    category: "Computing & AI",
    school: "School of Computing (SCSE)",
    prizePool: "₹10,000+",
    teamSize: "2 - 4 Members",
    timing: "Day 1 (11:00 AM) - Day 2 (11:00 AM)",
    day: "Day 1 & 2",
    description:
      "24 hours of non-stop coding, ideation, and building real-world AI and decentralized software solutions with industry mentors.",
    tag: "Marquee 24-Hr",
    icon: Cpu,
    gradient: "from-blue-600 to-indigo-600",
    borderHover: "hover:border-indigo-400 hover:shadow-indigo-100/60",
    filterType: "hackathons",
  },
  {
    id: "robo-deathmatch",
    title: "Robo Deathmatch & RC Arena Challenge",
    category: "Robotics & Hardware",
    school: "School of Electrical (SEET)",
    prizePool: "₹6,000+",
    teamSize: "2 - 4 Members",
    timing: "Day 2 • 10:30 AM - 03:00 PM",
    day: "Day 2",
    description:
      "Custom battle bots collide inside the high-tensile steel combat cage. Knock out opponents through torque, armor, and precision driving.",
    tag: "High Octane Arena",
    icon: Bot,
    gradient: "from-amber-500 to-orange-600",
    borderHover: "hover:border-amber-400 hover:shadow-amber-100/60",
    filterType: "robotics",
  },
  {
    id: "skyforge-uav",
    title: "Skyforge UAV Drone Velocity Circuit",
    category: "Mechanical & Aerospace",
    school: "SMACE (Aero & Mechanical)",
    prizePool: "₹5,000+",
    teamSize: "1 - 3 Members",
    timing: "Day 2 • 11:00 AM - 02:30 PM",
    day: "Day 2",
    description:
      "Pilot FPV and autonomous UAV drones through high-speed obstacle hoops, hairpin chicanes, and payload drop zones.",
    tag: "Flight Arena",
    icon: Plane,
    gradient: "from-cyan-500 to-sky-600",
    borderHover: "hover:border-cyan-400 hover:shadow-cyan-100/60",
    filterType: "drones",
  },
  {
    id: "biogrant-pitch",
    title: "BioGrant X: Biotech Innovation Pitch",
    category: "Bio & Chemical Sciences",
    school: "School of Bio & Chemical (SBCE)",
    prizePool: "₹3,500+",
    teamSize: "1 - 3 Members",
    timing: "Day 1 • 01:30 PM - 04:30 PM",
    day: "Day 1",
    description:
      "Present novel research proposals in genetic engineering, sustainable therapeutics, and biomaterials to an expert faculty jury.",
    tag: "Research Grant",
    icon: Dna,
    gradient: "from-emerald-500 to-teal-600",
    borderHover: "hover:border-emerald-400 hover:shadow-emerald-100/60",
    filterType: "pitch",
  },
  {
    id: "adzap-fintech",
    title: "ADZAP & FinTech Stock Simulation",
    category: "Business & Commerce",
    school: "Kalasalingam Business School (KBS)",
    prizePool: "₹4,000+",
    teamSize: "2 - 4 Members",
    timing: "Day 1 • 11:30 AM - 03:00 PM",
    day: "Day 1",
    description:
      "High-pressure ad creation, market pitching, and fast-paced algorithmic financial trading simulation.",
    tag: "Strategy & Pitch",
    icon: Briefcase,
    gradient: "from-purple-500 to-violet-700",
    borderHover: "hover:border-purple-400 hover:shadow-purple-100/60",
    filterType: "pitch",
  },
  {
    id: "prompthive-ai",
    title: "PromptHive: Generative AI Battleground",
    category: "Computing & AI",
    school: "School of Computing (SCSE)",
    prizePool: "₹3,000+",
    teamSize: "Individual / Pair",
    timing: "Day 1 • 02:00 PM - 04:30 PM",
    day: "Day 1",
    description:
      "Test your prompt engineering prowess against live LLMs, multi-modal synthesis puzzles, and reverse image generation constraints.",
    tag: "Live AI Arena",
    icon: Sparkles,
    gradient: "from-rose-500 to-pink-600",
    borderHover: "hover:border-rose-400 hover:shadow-rose-100/60",
    filterType: "hackathons",
  },
];

const FILTERS = [
  { label: "[ ALL_FLAGSHIPS ]", value: "all" },
  { label: "[ HACKATHONS & AI ]", value: "hackathons" },
  { label: "[ ROBOTICS & ARENAS ]", value: "robotics" },
  { label: "[ UAV DRONES ]", value: "drones" },
  { label: "[ PITCH & STRATEGY ]", value: "pitch" },
];

export function FlagshipSpotlight() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredEvents =
    activeFilter === "all"
      ? FLAGSHIP_EVENTS
      : FLAGSHIP_EVENTS.filter((e) => e.filterType === activeFilter);

  return (
    <div className="space-y-8">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500 fill-current animate-pulse" />
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Marquee Competitions
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all ${
                activeFilter === f.value
                  ? "bg-slate-900 text-cyan-300 shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Light Marquee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredEvents.map((event) => {
          const Icon = event.icon;
          return (
            <div
              key={event.id}
              className={`group relative rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between space-y-5 ${event.borderHover}`}
            >
              {/* Header Badges */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${event.gradient} text-white shadow-md group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black font-mono">
                      <Award className="h-3 w-3 text-amber-600" />
                      <span>{event.prizePool}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-primary text-[10px] font-mono font-bold">
                      {event.day}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold text-primary uppercase tracking-wider block">
                    {event.school}
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-primary transition-colors leading-snug mt-1">
                    {event.title}
                  </h4>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {event.description}
                </p>
              </div>

              {/* Event Attributes Footer */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>{event.teamSize}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate max-w-[130px]">{event.timing}</span>
                  </div>
                </div>

                <Link
                  href={`/events`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs font-bold text-slate-800 group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:shadow-md transition-all"
                >
                  <span>Explore in Directory</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
