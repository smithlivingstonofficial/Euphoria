"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CollegeLogoProps {
  className?: string;
  variant?: "full" | "compact" | "badge" | "crest";
  size?: "sm" | "md" | "lg";
  dark?: boolean;
}

export function CollegeLogo({
  className,
  variant = "full",
  size = "md",
}: CollegeLogoProps) {
  if (variant === "crest") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-b from-indigo-900 to-slate-900 p-2 shadow-md border border-indigo-500/20",
          size === "sm" && "h-8 w-8",
          size === "md" && "h-11 w-11",
          size === "lg" && "h-14 w-14",
          className
        )}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full fill-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="46" stroke="#F59E0B" strokeWidth="3" opacity="0.8" />
          <circle cx="50" cy="50" r="42" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Flame of Knowledge */}
          <path
            d="M50 20 C42 32 40 44 45 52 C46 47 50 43 52 40 C55 47 59 49 57 56 C62 50 63 36 50 20 Z"
            fill="url(#goldGrad)"
          />
          {/* Open Book */}
          <path
            d="M26 62 C34 58 45 58 50 64 C55 58 66 58 74 62 L74 74 C66 70 55 70 50 76 C45 70 34 70 26 74 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
          <path d="M50 64 L50 76" stroke="#1E1B4B" strokeWidth="2" />
          {/* Base Ribbon */}
          <path
            d="M28 80 C40 76 60 76 72 80 L70 85 C58 82 42 82 30 85 Z"
            fill="#F59E0B"
          />
          <defs>
            <linearGradient id="goldGrad" x1="40" y1="20" x2="60" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE68A" />
              <stop offset="0.5" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-2.5 shrink-0 select-none", className)}>
        {/* Crest */}
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-1.5 shadow-xs border border-indigo-400/30">
          <svg viewBox="0 0 100 100" className="h-full w-full fill-none">
            <circle cx="50" cy="50" r="45" stroke="#F59E0B" strokeWidth="3" />
            <path
              d="M50 22 C43 33 42 42 46 49 C47 45 50 42 52 39 C54 45 58 47 56 53 C61 47 62 35 50 22 Z"
              fill="#F59E0B"
            />
            <path
              d="M28 62 C35 59 45 59 50 64 C55 59 65 59 72 62 L72 73 C65 70 55 70 50 75 C45 70 35 70 28 73 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
        <div className="text-left">
          <div className="text-xs font-black tracking-tight text-slate-900 leading-tight">
            KALASALINGAM
          </div>
          <div className="text-[9px] font-bold text-indigo-600 tracking-wider uppercase font-mono">
            UNIVERSITY • NAAC A++
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3 shrink-0 select-none", className)}>
      {/* Official Crest Shield */}
      <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-2 shadow-md shadow-indigo-950/20 border border-indigo-400/30 shrink-0">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),transparent_70%)]" />
        <svg
          viewBox="0 0 100 100"
          className="relative h-full w-full fill-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Sun rays / circle */}
          <circle cx="50" cy="50" r="46" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6 2" opacity="0.85" />
          <circle cx="50" cy="50" r="40" stroke="#818CF8" strokeWidth="1.5" opacity="0.6" />
          
          {/* Flame of Wisdom */}
          <path
            d="M50 18 C41 31 39 43 45 51 C46 46 50 42 52 39 C55 46 59 48 57 55 C63 49 63 34 50 18 Z"
            fill="url(#collegeFlameGrad)"
          />
          {/* Open Book of Knowledge */}
          <path
            d="M24 62 C33 58 44 58 50 64 C56 58 67 58 76 62 L76 74 C67 70 56 70 50 76 C44 70 33 70 24 74 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
          <path d="M50 64 L50 76" stroke="#312E81" strokeWidth="2" />
          
          {/* Year / Star Dots */}
          <circle cx="50" cy="85" r="2.5" fill="#F59E0B" />

          <defs>
            <linearGradient id="collegeFlameGrad" x1="40" y1="18" x2="60" y2="55" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE68A" />
              <stop offset="0.4" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#EA580C" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography Block */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] sm:text-[15px] font-black tracking-tight text-slate-900 uppercase font-display leading-tight">
            Kalasalingam
          </span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-100/90 border border-amber-300/80 text-[9px] font-extrabold text-amber-900 tracking-wider uppercase font-mono">
            A++
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 tracking-tight leading-tight">
          Academy of Research and Education
        </span>
        <span className="text-[9px] font-semibold text-indigo-600/90 tracking-wide font-mono mt-0.5">
          Deemed to be University • Estd. 1984
        </span>
      </div>
    </div>
  );
}
