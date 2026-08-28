"use client";

import { useState } from "react";
import {
  MapPin,
  Navigation,
  Compass,
} from "lucide-react";

interface CampusVenue {
  id: string;
  name: string;
  location: string;
  eventsHosted: string;
  features: string;
  capacity: string;
  tag: string;
}

const VENUES: CampusVenue[] = [
  {
    id: "auditorium",
    name: "K.S. Krishnan Central Auditorium",
    location: "Campus Main Quadrangle (Opposite Admin Block)",
    eventsHosted: "Inauguration, Keynote Addresses, Cultural Gala & Grand Valedictory Prize Distribution",
    features: "Air-conditioned 1,800+ seat theater with state-of-the-art acoustic sound & dual 4K projection",
    capacity: "1,800+ Seats",
    tag: "MAIN_STAGE",
  },
  {
    id: "computing-labs",
    name: "SCSE Advanced Computing Complex",
    location: "Block 3 • Floors 1 & 2",
    eventsHosted: "24-Hour AI & Web3 Hackathon, PromptHive AI, Algorithmic Code Sprint & Bug Bash",
    features: "High-spec GPU workstations, dual monitors, high-speed Gigabit LAN & round-the-clock coffee stations",
    capacity: "400+ Coders",
    tag: "HACKATHON_HUB",
  },
  {
    id: "robo-arena",
    name: "Indoor Sports Complex & Combat Cage",
    location: "South Campus Recreation Center",
    eventsHosted: "Robo Deathmatch 15kg/30kg, RC Racing Arena & Sumo Bot Knockouts",
    features: "Reinforced steel combat cage with poly-carbonate impact shielding & pits for bot repairs",
    capacity: "600+ Spectators",
    tag: "ROBO_CAGE",
  },
  {
    id: "aviation-grounds",
    name: "University Aviation Flight Grounds",
    location: "East Campus Open Field (Near SMACE)",
    eventsHosted: "Skyforge UAV Drone Velocity Circuit, FPV Obstacle Race & Gravity Rush Glider Challenge",
    features: "Open-sky flight corridor with digital hoop sensors, safety net perimeter & pilot stations",
    capacity: "Outdoor Arena",
    tag: "UAV_FLIGHT_DECK",
  },
  {
    id: "kbs-seminar",
    name: "Kalasalingam Business School Seminar Hall",
    location: "KBS Block • 3rd Floor",
    eventsHosted: "ADZAP Product Spoofing, ACCFINTHON Trading Simulation & Corporate Business Quiz",
    features: "Tiered executive seminar hall with live Bloomberg terminal screens and AV podium",
    capacity: "250+ Seats",
    tag: "FINTECH_ARENA",
  },
];

export function CampusVenueRadar() {
  const [activeVenueId, setActiveVenueId] = useState(VENUES[0].id);
  const activeVenue = VENUES.find((v) => v.id === activeVenueId) || VENUES[0];

  return (
    <div className="space-y-6">
      {/* Venue Switcher */}
      <div className="flex flex-wrap items-center gap-2 font-mono">
        {VENUES.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveVenueId(v.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeVenueId === v.id
                ? "bg-slate-900 text-cyan-300 shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            [ {v.tag} ]
          </button>
        ))}
      </div>

      {/* Active Venue Card in Light Theme */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-primary text-xs font-mono font-bold uppercase tracking-wider">
                LOC_{activeVenue.tag}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                CAPACITY: {activeVenue.capacity}
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeVenue.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>{activeVenue.location}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <strong className="text-slate-900 block mb-0.5 font-mono text-[11px] uppercase">
                  // COMPETITIONS_HOSTED:
                </strong>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {activeVenue.eventsHosted}
                </p>
              </div>

              <div>
                <strong className="text-slate-900 block mb-0.5 font-mono text-[11px] uppercase">
                  // VENUE_SPECIFICATIONS:
                </strong>
                <p className="text-slate-600">{activeVenue.features}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-2xl bg-slate-900 p-6 text-white text-center space-y-3 shadow-md">
            <Navigation className="h-10 w-10 text-cyan-400 mx-auto animate-bounce" />
            <h4 className="text-sm font-black font-sans">Campus Location Verified</h4>
            <p className="text-xs text-slate-300 font-mono">
              Kalasalingam Academy of Research and Education (KARE), Anand Nagar, Krishnankoil, Tamil Nadu 626126
            </p>
            <a
              href="https://maps.google.com/?q=Kalasalingam+Academy+of+Research+and+Education"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-white text-slate-900 text-xs font-black hover:bg-cyan-50 transition-colors shadow-md"
            >
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span>Open in Google Maps</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
