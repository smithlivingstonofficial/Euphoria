"use client";

import { useEffect, useState, useRef } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function DigitCard({ value, label }: { value: string; label: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setAnimating(true);
      const t = setTimeout(() => {
        setDisplayValue(value);
        setAnimating(false);
        prevValue.current = value;
      }, 120);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center justify-center bg-white border border-indigo-200/80 rounded-xl sm:rounded-2xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 min-w-[46px] sm:min-w-[60px] shadow-sm overflow-hidden group hover:border-indigo-400 hover:shadow-indigo-100 transition-all duration-200">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/60 via-white to-slate-50/40 pointer-events-none" />
        {/* Top border accent */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        <span
          className={`relative font-mono font-black text-base sm:text-xl leading-none tracking-tight bg-gradient-to-br from-indigo-600 via-primary to-cyan-600 bg-clip-text text-transparent transition-all duration-150 ${animating ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
            }`}
        >
          {displayValue}
        </span>
      </div>
      <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase mt-1">
        {label}
      </span>
    </div>
  );
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
      <div className="inline-flex items-center gap-2 p-2 rounded-2xl bg-white border border-slate-200 animate-pulse w-fit">
        <div className="h-12 w-56 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  const units = [
    { label: "DAYS", value: String(timeLeft.days).padStart(2, "0") },
    { label: "HRS", value: String(timeLeft.hours).padStart(2, "0") },
    { label: "MINS", value: String(timeLeft.minutes).padStart(2, "0") },
    { label: "SECS", value: String(timeLeft.seconds).padStart(2, "0") },
  ];

  return (
    <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-indigo-200/80 shadow-md shadow-indigo-100/50 max-w-full">
      {/* Live indicator badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/90 border border-indigo-200/70 rounded-xl text-[9px] sm:text-[10px] font-mono font-bold text-indigo-700 shrink-0 whitespace-nowrap">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="tracking-wider uppercase">EVENT STARTS IN</span>
      </div>

      {/* Digit cards row */}
      <div className="flex items-end gap-1 sm:gap-1.5">
        {units.map((unit, idx) => (
          <div key={unit.label} className="flex items-end gap-1 sm:gap-1.5">
            <DigitCard value={unit.value} label={unit.label} />
            {idx < units.length - 1 && (
              <span className="font-mono font-black text-indigo-300 text-sm sm:text-lg leading-none mb-4 sm:mb-5 animate-pulse">
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
