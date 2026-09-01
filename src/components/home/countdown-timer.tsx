"use client";

import { useEffect, useState, useRef } from "react";
import { Calendar, MapPin } from "lucide-react";

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
      <div className="relative flex flex-col items-center justify-center bg-white/95 border border-slate-200/90 rounded-xl px-2.5 sm:px-3 py-1.5 min-w-[42px] sm:min-w-[50px] shadow-2xs overflow-hidden group hover:border-indigo-300 transition-all duration-200">
        <span
          className={`relative font-mono font-black text-sm sm:text-base lg:text-lg leading-none tracking-tight text-slate-900 transition-all duration-150 ${
            animating ? "scale-95 opacity-80" : "scale-100 opacity-100"
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
      <div className="inline-flex items-center gap-2 p-3 rounded-2xl bg-white/80 border border-slate-200 animate-pulse w-fit">
        <div className="h-14 w-64 bg-slate-100 rounded-xl" />
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
    <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md w-full sm:w-auto">
      {/* Event Day & Campus Detail Strip */}
      <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/90 px-2.5 py-1 rounded-xl border border-indigo-100/90 shadow-2xs">
          <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span>September 25 &amp; 26, 2026</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>KARE Campus, Krishnankoil</span>
        </div>
      </div>

      {/* Countdown Timer Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-0.5">
        {/* Live indicator badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-mono font-bold shrink-0 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="tracking-wider uppercase text-slate-200">EVENT STARTS IN</span>
        </div>

        {/* Digit cards row */}
        <div className="flex items-end gap-1.5">
          {units.map((unit, idx) => (
            <div key={unit.label} className="flex items-end gap-1.5">
              <DigitCard value={unit.value} label={unit.label} />
              {idx < units.length - 1 && (
                <span className="font-mono font-bold text-slate-300 text-xs leading-none mb-3">
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
