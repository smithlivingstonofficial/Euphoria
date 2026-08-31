"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  LogIn,
  CheckCircle2,
  Ticket,
  QrCode,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Step data ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 0,
    num: "01",
    label: "Sign In",
    title: "Sign In Instantly with Google",
    subtitle: "10-Second Setup",
    description:
      `No lengthy registration forms. Click "Continue with Google" using your college or personal email. Your participant profile and delegate pass are created automatically in seconds.`,
    ctaLabel: "Sign In with Google",
    ctaHref: "/login",
    ctaColor: "bg-primary hover:bg-primary/90 shadow-indigo-200",
    chipLabel: "Step 1: Quick Access",
    chipColor: "bg-indigo-50 border-indigo-200 text-indigo-700",
    accentColor: "indigo",
    icon: LogIn,
  },
  {
    id: 1,
    num: "02",
    label: "Choose Events",
    title: "Pick Any 2 Competitions — Free",
    subtitle: "Pick 2 Competitions",
    description:
      "Your pass includes 2 free event slots — 1 for Day 1 (Sept 25) and 1 for Day 2 (Sept 26). Browse all 61 competitions across 14 academic schools and select what interests you.",
    ctaLabel: "Browse 61 Events",
    ctaHref: "/events",
    ctaColor: "bg-slate-900 hover:bg-primary shadow-slate-200",
    chipLabel: "Step 2: Choose Your Events",
    chipColor: "bg-violet-50 border-violet-200 text-violet-700",
    accentColor: "violet",
    icon: Layers,
  },
  {
    id: 2,
    num: "03",
    label: "Show QR Pass",
    title: "Show Your Phone Pass at Entry",
    subtitle: "Fast Gate Entry",
    description:
      "Open your digital pass on your mobile phone. Event coordinators scan your unique QR code for instant venue entry and automatic attendance verification — no printouts needed.",
    ctaLabel: "View My Pass Dashboard",
    ctaHref: "/dashboard/passes",
    ctaColor: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
    chipLabel: "Step 3: Instant Gate Entry",
    chipColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
    accentColor: "emerald",
    icon: QrCode,
  },
] as const;

const STEP_DURATION = 5000;
const INTERVAL_MS = 60;

// ─── Step 1 Preview: Google Sign-In Mockup ───────────────────────────────────
function Step1Preview() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-2">
      <div className="w-full max-w-[220px] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Browser bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <div className="ml-2 flex-1 h-4 rounded-full bg-slate-200 text-[8px] font-mono text-slate-500 flex items-center px-2 truncate">
            accounts.google.com
          </div>
        </div>
        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex justify-center">
            <svg className="h-7 w-7" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>
          <p className="text-[10px] text-center text-slate-600 font-medium">Sign in to Euphoria 2026</p>

          {phase >= 1 ? (
            <div className={`transition-all duration-300 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-600 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}>
              participant@gmail.com
            </div>
          ) : (
            <div className="h-7 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
          )}

          <div className={`text-center transition-all duration-500 ${phase >= 2 ? "opacity-100" : "opacity-0"}`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold">
              <ShieldCheck className="h-3 w-3" />
              Authenticating...
            </div>
          </div>

          {phase >= 3 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 animate-in fade-in duration-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-700">Pass Created! Redirecting...</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] font-mono text-slate-400">Instant • Secure • No Password</p>
    </div>
  );
}

// ─── Step 2 Preview: Event Selection Grid ────────────────────────────────────
function Step2Preview() {
  const events = [
    { name: "Hackathon", cat: "Computing", day: "Day 1", selected: true, delay: 200 },
    { name: "Robotics", cat: "Engineering", day: "Day 1", selected: false, delay: 0 },
    { name: "Paper Pres.", cat: "Research", day: "Day 2", selected: true, delay: 500 },
    { name: "UI/UX Battle", cat: "Design", day: "Day 2", selected: false, delay: 0 },
    { name: "Code Sprint", cat: "Computing", day: "Day 1", selected: false, delay: 0 },
    { name: "ML Olympiad", cat: "AI/ML", day: "Day 2", selected: false, delay: 0 },
  ];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-2.5 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">61 Events Available</span>
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">2/2 Slots</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {events.map((ev, i) => (
          <div
            key={ev.name}
            className={cn(
              "relative p-2 rounded-xl border text-left transition-all duration-300",
              ev.selected
                ? "border-indigo-300 bg-indigo-50/80"
                : "border-slate-200 bg-white",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-800 truncate">{ev.name}</p>
                <p className="text-[9px] text-slate-400 truncate">{ev.cat}</p>
              </div>
              {ev.selected && (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-indigo-600 shrink-0 animate-in zoom-in duration-300"
                  style={{ animationDelay: `${ev.delay}ms` }}
                />
              )}
            </div>
            <span className="text-[8px] font-mono text-slate-400 mt-0.5 block">{ev.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3 Preview: QR Scan Animation ──────────────────────────────────────
function Step3Preview() {
  const [scanPhase, setScanPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setScanPhase(1), 800);
    const t2 = setTimeout(() => setScanPhase(2), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-2">
      {/* QR mockup with animated scanner */}
      <div className="relative w-32 h-32 rounded-2xl bg-slate-900 p-3 shadow-lg overflow-hidden">
        {/* QR icon */}
        <QrCode className="w-full h-full text-cyan-300" />
        {/* Scan beam */}
        <div
          className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full scan-line-active"
        />
        {/* Corner brackets */}
        <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
        <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
        <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br" />
      </div>

      {/* Status progression */}
      <div className="space-y-1.5 w-full max-w-[220px]">
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-medium transition-all duration-400",
          scanPhase >= 1 ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-400"
        )}>
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", scanPhase >= 1 ? "bg-indigo-500 animate-pulse" : "bg-slate-300")} />
          <span>Scanning QR Code...</span>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-medium transition-all duration-400",
          scanPhase >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
        )}>
          {scanPhase >= 2
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 animate-in zoom-in duration-300" />
            : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
          }
          <span className="font-bold">Pass Verified · Gate Open!</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InteractivePassJourney() {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [openMobileStep, setOpenMobileStep] = useState<number | null>(0);
  const [previewKey, setPreviewKey] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;
    progressRef.current = progress;

    const timer = setInterval(() => {
      progressRef.current += (INTERVAL_MS / STEP_DURATION) * 100;
      if (progressRef.current >= 100) {
        progressRef.current = 0;
        setActiveStep((cur) => {
          const next = ((cur + 1) % 3) as 0 | 1 | 2;
          setPreviewKey((k) => k + 1);
          return next;
        });
      }
      setProgress(progressRef.current);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPlaying, activeStep]);

  const selectStep = (idx: 0 | 1 | 2) => {
    setActiveStep(idx);
    setProgress(0);
    progressRef.current = 0;
    setPreviewKey((k) => k + 1);
  };

  const step = STEPS[activeStep];

  const accentClasses: Record<string, { border: string; bg: string; text: string; track: string }> = {
    indigo: { border: "border-indigo-400", bg: "bg-indigo-600", text: "text-indigo-700", track: "bg-indigo-500" },
    violet: { border: "border-violet-400", bg: "bg-violet-600", text: "text-violet-700", track: "bg-violet-500" },
    emerald: { border: "border-emerald-400", bg: "bg-emerald-600", text: "text-emerald-700", track: "bg-emerald-500" },
  };
  const accent = accentClasses[step.accentColor];

  return (
    <div
      className="space-y-5"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* ─── Desktop Step Track Navigation ─────────────────────────────── */}
      <div className="hidden md:block">
        <div className="relative flex items-stretch gap-0">
          {/* Connector track */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -translate-y-1/2 z-0 mx-16" />
          {/* Animated shimmer on track */}
          <div className="absolute top-1/2 left-16 right-16 h-px connector-shimmer -translate-y-1/2 z-0 opacity-60" />

          {STEPS.map((s, idx) => {
            const isActive = activeStep === idx;
            const Icon = s.icon;
            const stAccent = accentClasses[s.accentColor];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectStep(idx as 0 | 1 | 2)}
                className={cn(
                  "relative z-10 flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer overflow-hidden group",
                  isActive
                    ? `${stAccent.border} bg-white shadow-lg`
                    : "border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 hover:shadow-sm"
                )}
              >
                {/* Active progress bar at bottom */}
                {isActive && (
                  <div
                    className={`absolute bottom-0 left-0 h-1 rounded-full ${stAccent.track} transition-none`}
                    style={{ width: `${progress}%` }}
                  />
                )}

                <div className="flex items-center gap-3 w-full">
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-sm transition-all duration-200",
                      isActive
                        ? `${stAccent.bg} text-white shadow-sm`
                        : "bg-white text-slate-500 border border-slate-200 shadow-2xs group-hover:border-slate-300"
                    )}
                  >
                    {isActive ? <Icon className="h-4.5 w-4.5" /> : s.num}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className={cn("text-xs font-black leading-none", isActive ? stAccent.text : "text-slate-700")}>
                      {s.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{s.subtitle}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Desktop Content Panel ──────────────────────────────────────── */}
      <div className="hidden md:block">
        <div
          key={activeStep}
          className="rounded-3xl border border-slate-200/90 bg-white/98 backdrop-blur-xl p-7 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-400"
        >
          {/* Ambient orb */}
          <div
            className={cn(
              "absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-50",
              step.accentColor === "indigo" && "bg-indigo-100",
              step.accentColor === "violet" && "bg-violet-100",
              step.accentColor === "emerald" && "bg-emerald-100"
            )}
          />
          <div
            className={cn(
              "absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40",
              step.accentColor === "indigo" && "bg-cyan-100",
              step.accentColor === "violet" && "bg-indigo-100",
              step.accentColor === "emerald" && "bg-teal-100"
            )}
          />
          {/* Background grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Text */}
            <div className="lg:col-span-7 space-y-4">
              {/* Step chip */}
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border", step.chipColor)}>
                <Sparkles className="h-3.5 w-3.5" />
                {step.chipLabel}
              </span>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.description}
              </p>

              {/* Feature points */}
              <div className="flex flex-wrap gap-2 pt-1">
                {step.id === 0 && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      <Zap className="h-3 w-3 text-indigo-500" /> 10-Second Setup
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" /> Secure OAuth
                    </span>
                  </>
                )}
                {step.id === 1 && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      <Layers className="h-3 w-3 text-violet-500" /> 61 Competitions
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> 2 Free Slots
                    </span>
                  </>
                )}
                {step.id === 2 && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      <QrCode className="h-3 w-3 text-emerald-500" /> Instant Scan
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="h-3 w-3 text-teal-500" /> No Printout Needed
                    </span>
                  </>
                )}
              </div>

              <div className="pt-1">
                <Link
                  href={step.ctaHref}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs sm:text-sm font-black shadow-md active:scale-95 transition-all",
                    step.ctaColor
                  )}
                >
                  <step.icon className="h-4 w-4" />
                  <span>{step.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right: Animated Preview */}
            <div
              key={previewKey}
              className={cn(
                "lg:col-span-5 rounded-2xl border p-5 min-h-[220px] flex items-center justify-center",
                step.accentColor === "indigo" && "bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/70 border-indigo-200/80",
                step.accentColor === "violet" && "bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/70 border-violet-200/80",
                step.accentColor === "emerald" && "bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-emerald-200/80"
              )}
            >
              {step.id === 0 && <Step1Preview />}
              {step.id === 1 && <Step2Preview />}
              {step.id === 2 && <Step3Preview />}
            </div>
          </div>

          {/* Auto-play indicator strip */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Auto-advancing
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">Paused — hover to auto-advance</span>
              )}
            </div>
            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => {
                const a = accentClasses[s.accentColor];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectStep(i as 0 | 1 | 2)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300 cursor-pointer",
                      activeStep === i ? `w-6 ${a.track}` : "w-2 bg-slate-200 hover:bg-slate-300"
                    )}
                  />
                );
              })}
            </div>
            <span className="font-mono text-xs font-bold text-slate-500">
              {String(activeStep + 1).padStart(2, "0")} / 03
            </span>
          </div>
        </div>
      </div>

      {/* ─── Mobile Accordion Layout ─────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {STEPS.map((s, idx) => {
          const isOpen = openMobileStep === idx;
          const stAccent = accentClasses[s.accentColor];
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={cn(
                "rounded-2xl border-2 overflow-hidden transition-all duration-300",
                isOpen ? `${stAccent.border} bg-white shadow-md` : "border-slate-200 bg-white/90"
              )}
            >
              {/* Accordion header */}
              <button
                type="button"
                onClick={() => setOpenMobileStep(isOpen ? null : idx)}
                className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-sm transition-all",
                    isOpen ? `${stAccent.bg} text-white shadow-sm` : "bg-slate-100 text-slate-600"
                  )}
                >
                  {isOpen ? <Icon className="h-5 w-5" /> : s.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-black", isOpen ? stAccent.text : "text-slate-800")}>{s.label}</p>
                  <p className="text-[11px] text-slate-400">{s.subtitle}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div className="px-4 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>

                  {/* Mini preview */}
                  <div
                    className={cn(
                      "rounded-2xl border p-4",
                      s.accentColor === "indigo" && "bg-indigo-50/70 border-indigo-200/80",
                      s.accentColor === "violet" && "bg-violet-50/70 border-violet-200/80",
                      s.accentColor === "emerald" && "bg-emerald-50/70 border-emerald-200/80"
                    )}
                  >
                    {s.id === 0 && <Step1Preview />}
                    {s.id === 1 && <Step2Preview />}
                    {s.id === 2 && <Step3Preview />}
                  </div>

                  <Link
                    href={s.ctaHref}
                    className={cn(
                      "inline-flex items-center gap-2 w-full justify-center px-5 py-3 rounded-2xl text-white text-sm font-black shadow-md active:scale-95 transition-all",
                      s.ctaColor
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{s.ctaLabel}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
