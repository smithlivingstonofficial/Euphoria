"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface EuphoriaLogoProps {
  className?: string;
  variant?: "full" | "compact" | "icon" | "hero";
  size?: "sm" | "md" | "lg" | "xl";
}

export function EuphoriaLogo({
  className,
  variant = "full",
  size = "md",
}: EuphoriaLogoProps) {
  if (variant === "icon") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-indigo-600 via-primary to-cyan-500 p-2 shadow-lg shadow-indigo-500/25",
          size === "sm" && "h-8 w-8",
          size === "md" && "h-11 w-11",
          size === "lg" && "h-14 w-14",
          size === "xl" && "h-16 w-16",
          className
        )}
      >
        <Sparkles className="h-full w-full text-white animate-pulse" />
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={cn("inline-flex items-center gap-3.5 select-none", className)}>
        {/* Geometric Luminous Emblem */}
        <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-slate-950 p-2.5 shadow-xl shadow-indigo-500/20 border border-indigo-500/30 group">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-cyan-500/10 to-transparent" />
          <svg
            viewBox="0 0 100 100"
            className="relative h-full w-full fill-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Hexagonal Tech Prism */}
            <polygon
              points="50,12 85,32 85,68 50,88 15,68 15,32"
              stroke="url(#euphoriaHexGrad)"
              strokeWidth="3.5"
            />
            {/* Inner Star / Spark */}
            <path
              d="M50 24 L55 45 L76 50 L55 55 L50 76 L45 55 L24 50 L45 45 Z"
              fill="url(#euphoriaStarGrad)"
            />
            <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
            <defs>
              <linearGradient id="euphoriaHexGrad" x1="15" y1="12" x2="85" y2="88" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="0.5" stopColor="#06B6D4" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="euphoriaStarGrad" x1="24" y1="24" x2="76" y2="76" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38BDF8" />
                <stop offset="0.5" stopColor="#818CF8" />
                <stop offset="1" stopColor="#C084FC" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight font-display bg-gradient-to-r from-indigo-600 via-primary to-cyan-500 bg-clip-text text-transparent leading-none">
              EUPHORIA
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-black text-indigo-700 font-mono">
              2026
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mt-1">
            National Techfest
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5 shrink-0 select-none", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 p-2 shadow-md border border-indigo-500/30">
        <svg viewBox="0 0 100 100" className="h-full w-full fill-none">
          <polygon
            points="50,14 84,33 84,67 50,86 16,67 16,33"
            stroke="url(#euphoriaMiniGrad)"
            strokeWidth="4"
          />
          <path
            d="M50 28 L54 46 L72 50 L54 54 L50 72 L46 54 L28 50 L46 46 Z"
            fill="#38BDF8"
          />
          <defs>
            <linearGradient id="euphoriaMiniGrad" x1="16" y1="14" x2="84" y2="86" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="text-left">
        <div className="text-base font-black tracking-tight text-slate-900 font-display leading-none">
          EUPHORIA <span className="text-indigo-600 font-mono text-xs">2026</span>
        </div>
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono mt-0.5">
          National Techfest
        </div>
      </div>
    </div>
  );
}
