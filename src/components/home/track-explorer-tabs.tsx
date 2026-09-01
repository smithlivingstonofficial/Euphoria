"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Bot,
  Plane,
  Dna,
  Briefcase,
  FlaskConical,
  Compass,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";

interface TrackData {
  id: string;
  code: string;
  name: string;
  shortName: string;
  school: string;
  count: string;
  icon: typeof Cpu;
  color: string;
  bgActive: string;
  borderActive: string;
  badgeColor: string;
  summary: string;
  keyEvents: string[];
  facilities: string;
  queryParam: string;
}

const TRACKS_DATA: TrackData[] = [
  {
    id: "computing",
    code: "01",
    name: "Computing & Artificial Intelligence",
    shortName: "Computing & AI",
    school: "School of Computing (SoC)",
    count: "12 Events",
    icon: Cpu,
    color: "from-blue-600 to-indigo-600",
    bgActive: "bg-blue-50/60",
    borderActive: "border-blue-300",
    badgeColor: "bg-blue-100 text-blue-800",
    summary:
      "Deep dive into high-performance software engineering, neural networks, 24-hr hackathons, prompt hacking, and code debugging arenas.",
    keyEvents: [
      "24-Hour AI & Web3 Hackathon",
      "PromptHive AI Arena",
      "Bug Bash & Speed Debugging",
      "Algorithmic Code Sprint",
    ],
    facilities: "High-spec GPU Lab Workstations, Gigabit LAN & AI testbeds",
    queryParam: "Computing",
  },
  {
    id: "electrical",
    code: "02",
    name: "Robotics & Electrical Systems",
    shortName: "Robotics & Hardware",
    school: "School of Electronics, Electrical and Biomedical Technology (SEET)",
    count: "9 Events",
    icon: Bot,
    color: "from-amber-500 to-orange-600",
    bgActive: "bg-amber-50/60",
    borderActive: "border-amber-300",
    badgeColor: "bg-amber-100 text-amber-800",
    summary:
      "Witness fierce combat robotics, micro-controller firmware programming, PCB layout design, and GreenTech embedded IoT prototypes.",
    keyEvents: [
      "Robo Deathmatch & RC Arena",
      "Chipcraft 3.0 VLSI Challenge",
      "QNX Automotive World",
      "GreenTech IoT Showcase",
    ],
    facilities: "Steel combat arena cage, soldering stations, oscilloscopes & power supplies",
    queryParam: "Electrical",
  },
  {
    id: "mechanical",
    code: "03",
    name: "Mechanical, Aero & Smart UAVs",
    shortName: "Aero & Mechanical",
    school: "School of Mechanical, Aero, Auto and Civil Engineering",
    count: "5 Events",
    icon: Plane,
    color: "from-cyan-500 to-sky-600",
    bgActive: "bg-cyan-50/60",
    borderActive: "border-cyan-300",
    badgeColor: "bg-cyan-100 text-cyan-800",
    summary:
      "Test aerodynamics, smart UAV flight obstacle navigation, CAD drafting precision, and rapid structural stress engineering.",
    keyEvents: [
      "Skyforge UAV Drone Racing",
      "Gravity Rush Glider Challenge",
      "Speed CAD 3D Modeling",
      "Bridge Load Simulation",
    ],
    facilities: "Open university flight grounds, high-precision wind tunnel & CAD labs",
    queryParam: "Mechanical",
  },
  {
    id: "biotech",
    code: "04",
    name: "Biotechnology & Chemical Sciences",
    shortName: "BioTech & Pharma",
    school: "School of Bio, Chemical and Processing Engineering",
    count: "4 Events",
    icon: Dna,
    color: "from-emerald-500 to-teal-600",
    bgActive: "bg-emerald-50/60",
    borderActive: "border-emerald-300",
    badgeColor: "bg-emerald-100 text-emerald-800",
    summary:
      "Explore computational genomics, cell imaging, sustainable biochemical formulations, and live grant pitching to scientists.",
    keyEvents: [
      "BioGrant X Research Pitch",
      "CELLFIE Microscopic Snapshot",
      "Green Chemistry Formulation",
      "Bio-Entrepreneurship Deck",
    ],
    facilities: "Advanced bio-spectroscopy labs & laminar airflow clean rooms",
    queryParam: "Biotechnology",
  },
  {
    id: "management",
    code: "05",
    name: "Business, Commerce & FinTech",
    shortName: "Business & FinTech",
    school: "Kalasalingam Business School (KBS)",
    count: "5 Events",
    icon: Briefcase,
    color: "from-purple-500 to-violet-600",
    bgActive: "bg-purple-50/60",
    borderActive: "border-purple-300",
    badgeColor: "bg-purple-100 text-purple-800",
    summary:
      "Compete in adrenaline-fueled mock stock markets, creative television commercial spoofing, and venture capital pitch challenges.",
    keyEvents: [
      "ADZAP Product Commercials",
      "ACCFINTHON Mock Stock Trading",
      "Corporate Strategist Quiz",
      "Brand Revamp Case Study",
    ],
    facilities: "Executive Bloomberg simulation rooms & KBS multimedia auditorium",
    queryParam: "Management",
  },
  {
    id: "sciences",
    code: "06",
    name: "Advanced Sciences & Mathematics",
    shortName: "Sciences & Forensics",
    school: "School of Advanced Sciences (SAS)",
    count: "4 Events",
    icon: FlaskConical,
    color: "from-rose-500 to-pink-600",
    bgActive: "bg-rose-50/60",
    borderActive: "border-rose-300",
    badgeColor: "bg-rose-100 text-rose-800",
    summary:
      "Solve simulated crime scenes with chemical forensics, unravel mathematical cryptographic riddles, and scientific debates.",
    keyEvents: [
      "Crime Scene Forensic Hunt",
      "MATHXPLORE Puzzle Sprint",
      "Quantum Physics Debate",
      "Chemical Synthesis Clues",
    ],
    facilities: "Central analytical instrumentation labs & forensic simulation sets",
    queryParam: "Sciences",
  },
  {
    id: "architecture",
    code: "07",
    name: "Architecture, Law & Media Arts",
    shortName: "Design, Law & Arts",
    school: "KSoA, KSoL & Liberal Arts (SLASE)",
    count: "13 Events",
    icon: Compass,
    color: "from-indigo-500 to-fuchsia-600",
    bgActive: "bg-indigo-50/60",
    borderActive: "border-indigo-300",
    badgeColor: "bg-indigo-100 text-indigo-800",
    summary:
      "Engage in national moot court arguments, 24-hour architectural charrettes, digital photography exhibits, and culinary arts.",
    keyEvents: [
      "Archathon 24 Design Charrette",
      "Euphoria National Moot Court",
      "Frames of KARE Photography",
      "Culinary Fusion Masterclass",
    ],
    facilities: "Moot court chamber, drafting studios & architecture workshop bays",
    queryParam: "Architecture",
  },
  {
    id: "health",
    code: "08",
    name: "Health, Nursing & Foundational Core",
    shortName: "Health Sciences",
    school: "Allied & Health Sciences, Nursing & First Year Core",
    count: "9 Events",
    icon: ShieldCheck,
    color: "from-teal-500 to-emerald-600",
    bgActive: "bg-teal-50/60",
    borderActive: "border-teal-300",
    badgeColor: "bg-teal-100 text-teal-800",
    summary:
      "Demonstrate clinical triage diagnostics, physiotherapy posture rehabilitation, and first-year foundational programming sprints.",
    keyEvents: [
      "Human Lab Clinical Quiz",
      "Physioquest Anatomy Arena",
      "Fresh Coders Junior Sprint",
      "Emergency Triage Simulation",
    ],
    facilities: "Simulation hospital wards, physiotherapy clinic & junior computing labs",
    queryParam: "Health",
  },
];

export function TrackExplorerTabs() {
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const currentTrack = TRACKS_DATA[activeTrackIndex];
  const CurrentIcon = currentTrack.icon;

  return (
    <div className="space-y-6">
      {/* 8 Track Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono">
        {TRACKS_DATA.map((t, idx) => {
          const Icon = t.icon;
          const isActive = idx === activeTrackIndex;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTrackIndex(idx)}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col items-center sm:items-start justify-between gap-2.5 ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]"
                  : "bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-white/20 text-cyan-300"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
                  [{t.code}]
                </span>
              </div>
              <div className="text-center sm:text-left w-full">
                <span className="text-xs font-black block truncate leading-tight font-sans">
                  {t.shortName}
                </span>
                <span
                  className={`text-[10px] font-mono block mt-0.5 ${
                    isActive ? "text-cyan-300" : "text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Track Highlight Box in Light Theme */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-100/40 via-cyan-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Track Info */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${currentTrack.color} text-white shadow-md`}
              >
                <CurrentIcon className="h-5 w-5" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 border border-indigo-200 text-primary">
                DISCIPLINE_{currentTrack.code}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {currentTrack.school}
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentTrack.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
                {currentTrack.summary}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 font-mono">
              <span className="font-bold text-slate-900 font-sans">Lab Facilities: </span>
              <span>{currentTrack.facilities}</span>
            </div>
          </div>

          {/* Right Column: Featured Competitions in Track & CTA */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                // KEY_COMPETITIONS
              </span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>

            <div className="space-y-2">
              {currentTrack.keyEvents.map((evt) => (
                <div
                  key={evt}
                  className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{evt}</span>
                </div>
              ))}
            </div>

            <Link
              href={`/events?track=${currentTrack.queryParam}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-xs font-black shadow-md hover:bg-primary-hover transition-all"
            >
              <span>Explore {currentTrack.count} in {currentTrack.shortName}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
