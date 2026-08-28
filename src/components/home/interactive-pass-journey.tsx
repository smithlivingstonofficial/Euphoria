"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LogIn,
  CheckCircle2,
  Ticket,
  QrCode,
} from "lucide-react";

export function InteractivePassJourney() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const steps = [
    {
      step: 1,
      title: "1. Instant Google Auth",
      short: "10-Sec Setup",
      icon: LogIn,
      description:
        "Sign in instantly with your Google account. Your college profile and participant credentials sync securely in one click.",
    },
    {
      step: 2,
      title: "2. Pick 2 Competition Slots",
      short: "Choose Events",
      icon: Ticket,
      description:
        "Your Delegate Pass unlocks 2 free competition slots across Day 1 & Day 2 from our entire 61-event university catalog.",
    },
    {
      step: 3,
      title: "3. Flash Digital QR Pass",
      short: "Rapid Entry",
      icon: QrCode,
      description:
        "Access your dynamic encrypted QR Pass on your mobile device for lightning check-ins at venue gates and arenas.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3 Step Indicator Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = s.step === activeStep;
          return (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step as 1 | 2 | 3)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]"
                  : "bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  0{s.step}
                </div>
                <div>
                  <h4 className="text-xs font-black font-sans leading-tight">{s.title}</h4>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      isActive ? "text-cyan-300" : "text-slate-400"
                    }`}
                  >
                    [{s.short}]
                  </p>
                </div>
              </div>
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-cyan-300" : "text-slate-400"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Step Preview Interactive Box in Light Theme */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {activeStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-mono font-bold text-primary bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                STEP_01 // AUTHENTICATION
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Frictionless One-Click Registration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Forget long registration forms. Simply click "Continue with Google" to link your university or personal email. Our system auto-configures your profile whether you are from Kalasalingam University or an external college across India.
              </p>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-hover transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Start One-Click Sign In</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-center">
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
              <h5 className="text-xs font-black text-slate-800 font-sans">
                Google Verified Identity
              </h5>
              <p className="text-[11px] text-slate-500 font-mono">
                Zero spam • Instant pass issuance • Realtime sync
              </p>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                STEP_02 // SLOT_ALLOCATION
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Select Any 2 Competitions with Zero Extra Fees
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your delegate pass grants you 2 official competition slots. Choose any combination—e.g., a Day 1 Hackathon + Day 2 Robotics Arena, or Day 1 Paper Presentation + Day 2 Drone Velocity.
              </p>

              <div className="pt-2">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-md hover:bg-primary transition-all"
                >
                  <Ticket className="h-4 w-4 text-cyan-300" />
                  <span>Browse 61 Competition Catalog</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-2">
              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-slate-800">Slot 1 (Day 1 Event)</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                  INCLUDED
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-50/80 border border-cyan-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                  <span className="text-xs font-bold text-slate-800">Slot 2 (Day 2 Event)</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-cyan-600 text-white px-2 py-0.5 rounded-full">
                  INCLUDED
                </span>
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                STEP_03 // DIGITAL_PASS
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Your Encrypted QR Pass on Your Phone
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Access your delegate QR pass at any time from your dashboard. Coordinators scan your pass in under a second for event attendance, lunch token validation, and certificate issuance.
              </p>

              <div className="pt-2">
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                  <span>View Pass Dashboard</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 text-white text-center space-y-2">
              <QrCode className="h-16 w-16 text-cyan-300 mx-auto" />
              <div className="font-mono text-xs font-bold text-emerald-400">
                [ STATUS: PASS_ACTIVE ]
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Rapid scanner ready • Zero latency gate entry
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
