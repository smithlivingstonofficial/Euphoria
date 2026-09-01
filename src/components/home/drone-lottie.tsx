"use client";

import React, { useEffect, useState } from "react";
import { Lottie } from "lottie-react";
import { Bot, Globe, Trophy, Radio, ShieldCheck, Sparkles, Cpu } from "lucide-react";

interface DroneLottieProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function DroneLottie({ className = "", size = "lg" }: DroneLottieProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sizeClasses = {
    sm: "w-48 h-48 sm:w-56 sm:h-56",
    md: "w-64 h-64 sm:w-72 sm:h-72",
    lg: "w-72 h-72 sm:w-88 sm:h-88 lg:w-[460px] lg:h-[460px]",
    xl: "w-80 h-80 sm:w-[440px] sm:h-[440px] lg:w-[520px] lg:h-[520px]",
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      {/* ── Ambient Radial Glows Behind Drone ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.18)_0%,rgba(6,182,212,0.12)_40%,transparent_70%)] blur-2xl animate-pulse" />
        <div className="w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)] blur-xl" />
      </div>

      {/* ── High-Tech Concentric Orbital Rings & Reticle ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full max-w-[480px] max-h-[480px] stroke-indigo-400/30"
          fill="none"
        >
          {/* Outer Dashed Orbit Ring */}
          <circle
            cx="250"
            cy="250"
            r="210"
            strokeDasharray="4 8"
            strokeWidth="1"
            className="animate-[spin_60s_linear_infinite]"
          />
          {/* Middle Fine Ring */}
          <circle
            cx="250"
            cy="250"
            r="160"
            strokeDasharray="2 6"
            strokeWidth="1"
            className="stroke-cyan-400/40 animate-[spin_40s_linear_infinite_reverse]"
          />
          {/* Inner Accent Ring */}
          <circle
            cx="250"
            cy="250"
            r="110"
            strokeWidth="0.8"
            className="stroke-indigo-300/40"
          />
          {/* Coordinate Crosshairs */}
          <line x1="250" y1="20" x2="250" y2="480" strokeWidth="0.5" strokeDasharray="3 6" className="stroke-indigo-300/25" />
          <line x1="20" y1="250" x2="480" y2="250" strokeWidth="0.5" strokeDasharray="3 6" className="stroke-indigo-300/25" />
          {/* Corner Tech Marks */}
          <circle cx="250" cy="40" r="3" className="fill-indigo-500/50" />
          <circle cx="250" cy="460" r="3" className="fill-cyan-500/50" />
          <circle cx="40" cy="250" r="3" className="fill-indigo-500/50" />
          <circle cx="460" cy="250" r="3" className="fill-cyan-500/50" />
        </svg>
      </div>

      {/* ── Floating Tech Micro-Badges Around Drone ── */}
      {/* 1. Top-Left: Robotics & AI Flagship */}
      <div className="absolute top-1 -left-2 sm:-left-8 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md animate-float hover:scale-105 transition-transform">
        <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="text-left">
          <div className="text-[10px] font-black text-slate-800 tracking-tight leading-none">Robotics &amp; AI</div>
          <div className="text-[8.5px] font-semibold text-indigo-600 font-mono leading-none mt-0.5">Autonomous Arena</div>
        </div>
      </div>

      {/* 2. Top-Right: All India Participation */}
      <div className="absolute top-4 -right-2 sm:-right-8 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md animate-float-delayed hover:scale-105 transition-transform">
        <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
          <Globe className="h-3.5 w-3.5" />
        </div>
        <div className="text-left">
          <div className="text-[10px] font-black text-slate-800 tracking-tight leading-none">All-India Fest</div>
          <div className="text-[8.5px] font-semibold text-cyan-600 font-mono leading-none mt-0.5">5,000+ Delegates</div>
        </div>
      </div>

      {/* 3. Mid/Bottom-Left: Prizes & Awards */}
      <div className="absolute bottom-16 -left-1 sm:-left-6 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md animate-float-delayed hover:scale-105 transition-transform">
        <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
          <Trophy className="h-3.5 w-3.5" />
        </div>
        <div className="text-left">
          <div className="text-[10px] font-black text-amber-950 tracking-tight leading-none">₹15 Lakhs+</div>
          <div className="text-[8.5px] font-semibold text-amber-700 font-mono leading-none mt-0.5">Prize Pool</div>
        </div>
      </div>

      {/* 4. Mid/Bottom-Right: Live Radar / Telemetry Badge */}
      <div className="absolute bottom-14 -right-1 sm:-right-6 z-20 hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-slate-900/95 text-white backdrop-blur-md border border-slate-800 shadow-md animate-float hover:scale-105 transition-transform">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <div className="text-left">
          <div className="text-[9px] font-black text-white font-mono leading-none tracking-wider uppercase">RADAR ACTIVE</div>
          <div className="text-[7.5px] font-semibold text-emerald-400 font-mono leading-none mt-0.5">Live Telemetry</div>
        </div>
      </div>

      {/* ── Main Drone Staging with Smooth Float ── */}
      <div className="relative z-10 animate-float pointer-events-none">
        {isClient ? (
          <div className={sizeClasses[size]}>
            <Lottie
              src="/Drone.json"
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(79,70,229,0.22)]"
            />
          </div>
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-3xl bg-indigo-50/40 animate-pulse border border-indigo-100 flex items-center justify-center`}
          >
            <div className="h-10 w-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
