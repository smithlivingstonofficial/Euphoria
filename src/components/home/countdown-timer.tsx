"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    // Target: September 25, 2026, 09:30 AM IST (UTC+05:30)
    const targetDate = new Date("2026-09-25T09:30:00+05:30").getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-white border border-slate-200 animate-pulse w-fit">
        <div className="h-10 w-44 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  const units = [
    { label: "DAYS", value: String(timeLeft.days).padStart(2, "0") },
    { label: "HOURS", value: String(timeLeft.hours).padStart(2, "0") },
    { label: "MINS", value: String(timeLeft.minutes).padStart(2, "0") },
    { label: "SECS", value: String(timeLeft.seconds).padStart(2, "0") },
  ];

  return (
    <div className="inline-flex flex-col sm:flex-row items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-indigo-200/90 shadow-md shadow-indigo-100/60 max-w-full">
      {/* Telemetry Badge Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/90 border border-indigo-200/80 rounded-xl text-[10px] sm:text-xs font-mono font-bold text-primary shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="tracking-wider uppercase font-mono font-extrabold text-primary">
          EVENT STARTS IN
        </span>
      </div>

      {/* Light Digit Cards Row */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {units.map((unit, idx) => (
          <div key={unit.label} className="flex items-center">
            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50/80 via-white to-slate-50 border border-indigo-200/90 rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-[42px] sm:min-w-[56px] shadow-xs hover:border-indigo-400 transition-all group">
              <span className="font-mono font-black text-sm sm:text-lg leading-none tracking-tight bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                {unit.value}
              </span>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-indigo-500/90 uppercase mt-1">
                {unit.label}
              </span>
            </div>
            {idx < units.length - 1 && (
              <span className="font-mono font-black text-indigo-300 mx-0.5 sm:mx-1 text-xs sm:text-sm animate-pulse">
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
