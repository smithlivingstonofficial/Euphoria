import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FreeSatelliteMap } from "@/components/home/free-satellite-map";
import { Sparkles, ChevronRight, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Campus Satellite Map | Euphoria 2026",
  description:
    "Free Satellite campus map of Kalasalingam Academy of Research and Education (KARE) with direct Google Maps travel directions.",
};

export default function CampusMapPage() {
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
      description: "TIFAC CORE",
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
      description: "Computer Block",
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary selection:text-white">
      <Navbar />

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-extrabold">Campus Satellite Map</span>
        </nav>

        {/* Clean Page Header (No text description paragraph block) */}
        <div className="space-y-1.5 border-b border-slate-200/80 pb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>KARE Satellite Aerial Layout</span>
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Kalasalingam University Campus Satellite Map
          </h1>
        </div>

        {/* Free Satellite Tile Map Container with Pinned Locations */}
        <FreeSatelliteMap pins={campusPins} height="h-[580px] sm:h-[680px]" />
      </main>

      <Footer />
    </div>
  );
}
