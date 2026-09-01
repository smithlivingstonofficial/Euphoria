"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface EuphoriaLogoProps {
  className?: string;
  imgClassName?: string;
  variant?: "full" | "compact" | "icon" | "hero";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "hero";
  showWordmark?: boolean;
}

export function EuphoriaLogo({
  className,
  imgClassName,
  variant = "full",
  size = "md",
  showWordmark = true,
}: EuphoriaLogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "h-7 sm:h-8",
    md: "h-9 sm:h-10",
    lg: "h-12 sm:h-14",
    xl: "h-16 sm:h-20",
    "2xl": "h-20 sm:h-24 lg:h-28",
    "3xl": "h-24 sm:h-28 lg:h-32",
    hero: "h-32 sm:h-44 md:h-52 lg:h-60 max-w-full drop-shadow-xs",
  };

  if (variant === "icon") {
    return (
      <div className={cn("relative flex items-center justify-center shrink-0", className)}>
        {!imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/logos/Euphoria.png"
            alt="Euphoria 2026"
            className={cn("object-contain w-auto", sizeClasses[size])}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-primary to-cyan-500 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-2 select-none shrink-0", className)}>
        {!imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/logos/Euphoria.png"
            alt="Euphoria 2026"
            className={cn("object-contain w-auto", sizeClasses[size])}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs">
              E
            </div>
            {showWordmark && (
              <span className="font-extrabold text-slate-900 font-display text-sm tracking-tight">
                EUPHORIA <span className="text-indigo-600 font-mono text-xs">2026</span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full & Hero Variants
  return (
    <div className={cn("inline-flex items-center gap-3 select-none shrink-0", className)}>
      {!imgError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/logos/Euphoria.png"
          alt="Euphoria 2026 Logo"
          className={cn("object-contain w-auto", sizeClasses[size], imgClassName)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 p-2 text-white font-black shadow-md border border-indigo-500/30">
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </div>
          {showWordmark && (
            <div className="text-left">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 font-display leading-none">
                EUPHORIA <span className="text-indigo-600 font-mono text-xs">2026</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono mt-0.5">
                National Techfest
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
