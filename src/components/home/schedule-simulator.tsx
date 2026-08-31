"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Flame,
} from "lucide-react";

interface ScheduleItem {
  time: string;
  title: string;
  venue: string;
  track: string;
  badge: string;
  isMarquee?: boolean;
}

const DAY_1_SCHEDULE: ScheduleItem[] = [
  {
    time: "08:30 AM - 09:30 AM",
    title: "Participant Gate Check-in & Pass Verification",
    venue: "Main Campus Reception & Helpdesk",
    track: "General",
    badge: "Registration",
  },
  {
    time: "09:30 AM - 10:45 AM",
    title: "Grand Inauguration Ceremony & Keynote Address",
    venue: "K.S. Krishnan Central Auditorium",
    track: "Ceremony",
    badge: "Official Opening",
    isMarquee: true,
  },
  {
    time: "11:00 AM Onwards",
    title: "24-Hour AI & Web3 Hackathon Kickoff",
    venue: "SCSE Advanced Computing Labs (Block 3)",
    track: "Computing & AI",
    badge: "24-Hr Marathon",
    isMarquee: true,
  },
  {
    time: "11:30 AM - 01:30 PM",
    title: "ADZAP & Pitch Deck Preliminary Rounds",
    venue: "KBS Seminar Hall",
    track: "Business & Commerce",
    badge: "Pitch Arena",
  },
  {
    time: "01:00 PM - 02:00 PM",
    title: "Networking Lunch & Delegate Refreshments",
    venue: "University Food Court & Student Center",
    track: "Hospitality",
    badge: "Lunch Break",
  },
  {
    time: "02:00 PM - 04:30 PM",
    title: "Paper Presentations & PromptHive AI Battle",
    venue: "Block 8 Smart Classrooms & Labs",
    track: "Computing / Multi-Track",
    badge: "Technical Presentations",
  },
  {
    time: "05:00 PM - 07:00 PM",
    title: "Day 1 Technical Quiz & Evening Cultural Showcase",
    venue: "Open Air Theatre (OAT)",
    track: "Cultural & Quiz",
    badge: "Evening Gala",
  },
];

const DAY_2_SCHEDULE: ScheduleItem[] = [
  {
    time: "08:30 AM - 09:30 AM",
    title: "Day 2 Morning Check-in & Breakfast",
    venue: "University Cafeteria",
    track: "Hospitality",
    badge: "Breakfast",
  },
  {
    time: "09:00 AM - 11:00 AM",
    title: "24-Hr Hackathon Project Submissions & Jury Demos",
    venue: "SCSE Project Expo Hall",
    track: "Computing & AI",
    badge: "Evaluation",
    isMarquee: true,
  },
  {
    time: "10:30 AM - 01:00 PM",
    title: "Robo Deathmatch & RC Arena Knockout Rounds",
    venue: "Indoor Sports Complex (Robo Cage)",
    track: "Robotics & Hardware",
    badge: "Combat Arena",
    isMarquee: true,
  },
  {
    time: "11:00 AM - 01:30 PM",
    title: "Skyforge UAV Drone Velocity Circuit Finals",
    venue: "University Aviation Grounds",
    track: "Aerospace & SMACE",
    badge: "Flight Finals",
    isMarquee: true,
  },
  {
    time: "01:00 PM - 02:00 PM",
    title: "Delegate Lunch & Refreshment Hour",
    venue: "University Food Court",
    track: "Hospitality",
    badge: "Lunch Break",
  },
  {
    time: "02:00 PM - 03:30 PM",
    title: "Grand Championship Finals & Prototype Exhibition",
    venue: "Central Auditorium Lobby",
    track: "All Tracks",
    badge: "Championship",
  },
  {
    time: "03:30 PM - 05:30 PM",
    title: "Grand Valedictory, ₹15 Lakhs+ Prize Ceremony & Certificates",
    venue: "K.S. Krishnan Central Auditorium",
    track: "Ceremony",
    badge: "Prize Distribution",
    isMarquee: true,
  },
];

export function ScheduleSimulator() {
  const [activeDay, setActiveDay] = useState<1 | 2>(1);

  const schedule = activeDay === 1 ? DAY_1_SCHEDULE : DAY_2_SCHEDULE;

  return (
    <div className="space-y-6">
      {/* Day Toggle Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Festival Timeline Matrix
          </h3>
        </div>

        {/* Day Tabs */}
        <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200/90 shadow-2xs self-start sm:self-auto font-mono">
          <button
            onClick={() => setActiveDay(1)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeDay === 1
                ? "bg-slate-900 text-cyan-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            [ DAY 01 • SEPT 25 ]
          </button>
          <button
            onClick={() => setActiveDay(2)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeDay === 2
                ? "bg-slate-900 text-cyan-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            [ DAY 02 • SEPT 26 ]
          </button>
        </div>
      </div>

      {/* Roadmap Timeline Nodes */}
      <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-cyan-400 before:to-purple-500">
        {schedule.map((item, idx) => (
          <div
            key={idx}
            className={`relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
              item.isMarquee
                ? "bg-white border-l-4 border-l-primary border-slate-200/90 shadow-md shadow-indigo-50/50"
                : "bg-white/90 border-slate-200/80 hover:bg-white shadow-2xs"
            }`}
          >
            {/* Glowing Timeline Dot */}
            <div
              className={`absolute -left-[29px] sm:-left-[37px] top-5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white ${
                item.isMarquee
                  ? "border-primary text-primary"
                  : "border-slate-300 text-slate-400"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  item.isMarquee ? "bg-primary animate-ping" : "bg-slate-400"
                }`}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-primary bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                    <Clock className="h-3 w-3" />
                    <span>{item.time}</span>
                  </span>

                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {item.badge}
                  </span>

                  {item.isMarquee && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      <Flame className="h-3 w-3 text-amber-600 fill-current" />
                      <span>FLAGSHIP</span>
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                  {item.title}
                </h4>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{item.venue}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-700 font-semibold font-mono text-[11px]">
                    {item.track}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 text-center">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white text-xs font-black shadow-md hover:bg-primary-hover transition-all"
        >
          <span>Explore All 61 Competitions</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
