"use client";

import Link from "next/link";
import { FreeSatelliteMap } from "./free-satellite-map";
import { Compass, ArrowRight, Sparkles } from "lucide-react";

export function CampusVenueRadar() {
  const campusPins = [
    {
      id: "central-library",
      lat: 9.574309998590286,
      lng: 77.67877001836207,
      title: "Central Library",
      description: "KARE Central Library & Information Center",
    },
    {
      id: "tifac-core",
      lat: 9.57488265919995,
      lng: 77.67981053782255,
      title: "TIFAC Core",
      description: "TIFAC CORE in Network Engineering & Technology",
    },
    {
      id: "admin-office",
      lat: 9.57429511588042,
      lng: 77.67631320027677,
      title: "Admin Office",
      description: "KARE Administrative Office",
    },
    {
      id: "krishna-auditorium",
      lat: 9.574972557531089,
      lng: 77.67743081264729,
      title: "Krishna Auditorium",
      description: "K.S. Krishnan Central Auditorium",
    },
    {
      id: "computer-block",
      lat: 9.574534061925531,
      lng: 77.6760141433337,
      title: "Computer Block",
      description: "SCSE Advanced Computing Complex",
    },
    {
      id: "8th-block",
      lat: 9.575087024818723,
      lng: 77.6757748193542,
      title: "8th Block",
      description: "Academic Block 8",
    },
    {
      id: "9th-block",
      lat: 9.574648850252082,
      lng: 77.67505413726114,
      title: "9th Block",
      description: "Academic Block 9",
    },
    {
      id: "10th-block",
      lat: 9.5741020770453,
      lng: 77.67483382369315,
      title: "10th Block",
      description: "Academic Block 10",
    },
    {
      id: "11th-block",
      lat: 9.573306325172338,
      lng: 77.67511602309881,
      title: "11th Block",
      description: "Academic Block 11",
    },
    {
      id: "7th-block",
      lat: 9.57404105318123,
      lng: 77.67391296247597,
      title: "7th Block",
      description: "Academic Block 7",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>KARE Campus Layout</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kalasalingam University Satellite Map
          </h3>
        </div>

        <Link
          href="/campus-map"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
        >
          <Compass className="h-4 w-4 text-cyan-200" />
          <span>Fullscreen Campus Map</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Free Satellite Map Component */}
      <FreeSatelliteMap pins={campusPins} height="h-[420px] sm:h-[480px]" />
    </div>
  );
}
