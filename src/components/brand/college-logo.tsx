"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface CollegeLogoProps {
  className?: string;
  variant?: "full" | "compact" | "badge" | "crest";
  size?: "sm" | "md" | "lg";
  dark?: boolean;
}

const OFFICIAL_LOGO_URL = "https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png";

export function CollegeLogo({
  className,
  variant = "full",
  size = "md",
}: CollegeLogoProps) {
  const [hasError, setHasError] = useState(false);

  const heightClasses = {
    sm: "h-7 sm:h-8",
    md: "h-9 sm:h-11",
    lg: "h-12 sm:h-14",
  };

  if (!hasError) {
    if (variant === "crest") {
      return (
        <div
          className={cn(
            "relative flex items-center justify-center shrink-0 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200 overflow-hidden",
            size === "sm" && "h-8 w-8",
            size === "md" && "h-11 w-11",
            size === "lg" && "h-14 w-14",
            className
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={OFFICIAL_LOGO_URL}
            alt="Kalasalingam University"
            className="h-full w-auto object-contain"
            onError={() => setHasError(true)}
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 shrink-0 select-none",
          className
        )}
      >
        <div className="relative flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md p-1.5 sm:p-2 shadow-sm border border-slate-200/90 hover:border-indigo-300 transition-all duration-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={OFFICIAL_LOGO_URL}
            alt="Kalasalingam Academy of Research and Education"
            className={cn("w-auto object-contain", heightClasses[size])}
            onError={() => setHasError(true)}
          />
        </div>
      </div>
    );
  }

  // Fallback if image fails to load
  return (
    <div className={cn("inline-flex items-center gap-2.5 shrink-0 select-none", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 p-1.5 shadow-md border border-indigo-400/30">
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
