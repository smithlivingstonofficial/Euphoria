"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LogIn,
  CheckCircle2,
  Ticket,
  QrCode,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";

export function InteractivePassJourney() {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const STEP_DURATION = 4500; // 4.5 seconds per step
  const INTERVAL_STEP = 50;

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((current) => (current + 1) % 3 as 0 | 1 | 2);
          return 0;
        }
        return prev + (INTERVAL_STEP / STEP_DURATION) * 100;
      });
    }, INTERVAL_STEP);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleStepSelect = (index: 0 | 1 | 2) => {
    setActiveStep(index);
    setProgress(0);
  };

  const handleNext = () => {
    setActiveStep((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    setProgress(0);
  };

  const handlePrev = () => {
    setActiveStep((prev) => ((prev - 1 + 3) % 3) as 0 | 1 | 2);
    setProgress(0);
  };

  const steps = [
    {
      step: 1,
      title: "1. Quick Google Sign-In",
      badge: "10-Second Setup",
      icon: LogIn,
    },
    {
      step: 2,
      title: "2. Choose Any 2 Events",
      badge: "Pick 2 Competitions",
      icon: Ticket,
    },
    {
      step: 3,
      title: "3. Show Your Digital QR Pass",
      badge: "Fast Gate Entry",
      icon: QrCode,
    },
  ];

  return (
    <div
      className="space-y-6"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* 3 Step Light-Theme Tab Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = activeStep === idx;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => handleStepSelect(idx as 0 | 1 | 2)}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between cursor-pointer relative overflow-hidden ${
                isActive
                  ? "bg-gradient-to-r from-indigo-50/95 via-sky-50/80 to-indigo-50/95 border-2 border-indigo-600 text-slate-900 shadow-md shadow-indigo-100/60 scale-[1.01]"
                  : "bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {/* Active Tab Progress Timer Fill */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              )}

              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black shrink-0 transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  0{s.step}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold leading-tight">{s.title}</h4>
                  <p
                    className={`text-xs mt-0.5 font-bold ${
                      isActive ? "text-primary" : "text-slate-500"
                    }`}
                  >
                    {s.badge}
                  </p>
                </div>
              </div>
              <Icon
                className={`h-5 w-5 shrink-0 transition-transform ${
                  isActive ? "text-primary scale-110" : "text-slate-400"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Futuristic Dissolve & Backdrop-Blur Container */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm relative overflow-hidden min-h-[280px]">
        {/* Ambient Light Tech Glow Orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-cyan-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* STEP 1: Dissolve & Blur Effect */}
        {activeStep === 0 && (
          <div
            key={0}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in-0 blur-in-md zoom-in-[0.98] duration-500 ease-out"
          >
            <div className="lg:col-span-7 space-y-3.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Step 1: Simple Sign In
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Sign In Instantly With Google
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                No lengthy registration forms required. Click &quot;Continue with Google&quot; using your college or personal email. Your participant profile is created automatically in seconds.
              </p>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-xs sm:text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In with Google</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-sky-50/80 border border-indigo-200/80 space-y-3 text-center shadow-xs">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h5 className="text-sm font-extrabold text-slate-900">
                Safe &amp; Instant Access
              </h5>
              <p className="text-xs text-slate-600 font-medium">
                No password to remember • Instant digital pass
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Dissolve & Blur Effect */}
        {activeStep === 1 && (
          <div
            key={1}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in-0 blur-in-md zoom-in-[0.98] duration-500 ease-out"
          >
            <div className="lg:col-span-7 space-y-3.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                <Ticket className="h-3.5 w-3.5 text-indigo-600" />
                Step 2: Choose Your 2 Events
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Pick Any 2 Competitions Included Free
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your pass allows you to participate in 2 events. You can choose 1 event for Day 1 (Sept 25) and 1 event for Day 2 (Sept 26) from all 61 competitions.
              </p>

              <div className="pt-2">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-primary active:scale-95 transition-all"
                >
                  <Ticket className="h-4 w-4 text-cyan-300" />
                  <span>Browse 61 Events</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-bold text-slate-800">Event Slot 1 (Day 1)</span>
                </div>
                <span className="text-[10px] font-extrabold bg-primary text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                  Included Free
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-50/90 border border-cyan-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">Event Slot 2 (Day 2)</span>
                </div>
                <span className="text-[10px] font-extrabold bg-cyan-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                  Included Free
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Dissolve & Blur Effect */}
        {activeStep === 2 && (
          <div
            key={2}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in-0 blur-in-md zoom-in-[0.98] duration-500 ease-out"
          >
            <div className="lg:col-span-7 space-y-3.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                Step 3: Show Your Digital Pass
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Show Your Phone Pass at Venue Entry
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Open your digital pass anytime on your mobile phone. Event coordinators will scan your QR code for quick venue entry and attendance tracking.
              </p>

              <div className="pt-2">
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                  <span>View My Pass Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-cyan-50/80 border border-indigo-200/90 text-slate-900 text-center space-y-2.5 shadow-xs">
              <div className="relative inline-block p-3 rounded-2xl bg-slate-900 text-white shadow-md">
                <QrCode className="h-14 w-14 text-cyan-300" />
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce opacity-90" />
              </div>
              <div className="text-xs font-black text-emerald-700">
                Pass Active &amp; Gate Ready
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Fast gate scan • Instant attendance verification
              </p>
            </div>
          </div>
        )}

        {/* Tech Controls Bar (Clean Light Theme) */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              title={isPlaying ? "Pause auto transition" : "Play auto transition"}
            >
              {isPlaying ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span>Auto-Switching</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-slate-500" />
                  <span>Paused</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
              (Hover to pause)
            </span>
          </div>

          {/* Dot Page Indicator Pills */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleStepSelect(i as 0 | 1 | 2)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeStep === i
                    ? "w-6 bg-primary"
                    : "w-2 bg-slate-200 hover:bg-slate-300"
                }`}
                title={`Go to Step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Previous Step"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 font-mono px-1">
              0{activeStep + 1} / 03
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Next Step"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
