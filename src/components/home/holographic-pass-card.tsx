"use client";

import { useState, useRef, MouseEvent } from "react";
import Link from "next/link";
import {
  QrCode,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface HolographicPassProps {
  userRole?: string;
  hasPass?: boolean;
}

export function HolographicPassCard({ userRole, hasPass }: HolographicPassProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10; // 10 deg max tilt
    const rotY = ((x - centerX) / centerX) * 10;

    setRotateX(rotX);
    setRotateY(rotY);

    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.4,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      className="perspective-1000 w-full max-w-sm sm:max-w-md mx-auto py-2"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.15s ease-out",
        }}
        className="preserve-3d relative rounded-3xl p-5 sm:p-7 shadow-2xl transition-all duration-200 border border-indigo-200/90 bg-white/95 backdrop-blur-xl text-slate-900 overflow-hidden group cursor-pointer shadow-indigo-100/70"
      >
        {/* Holographic Sheen Overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl z-30"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.2) 35%, transparent 75%)`,
            opacity: glarePos.opacity,
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-100/70 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-cyan-100/70 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* Header Telemetry Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 pb-3.5 sm:pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src="https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png"
              alt="KARE Logo"
              className="h-6 sm:h-7 w-auto object-contain shrink-0"
            />
            <div className="h-4 sm:h-5 w-px bg-slate-200 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-primary uppercase block whitespace-nowrap">
                EUPHORIA 2026
              </span>
              <span className="text-[11px] sm:text-xs font-black tracking-tight text-slate-900 block whitespace-nowrap">
                Delegate Pass
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider shadow-2xs">
            <Zap className="h-3 w-3 fill-current text-amber-600 shrink-0" />
            <span>VIP DELEGATE</span>
          </div>
        </div>

        {/* Pass Content Body */}
        <div className="relative z-10 py-4 sm:py-5 space-y-3.5 sm:space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                PASS_TIER
              </span>
              <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5 truncate">
                All-Access 2-Slot Pass
              </h4>
              <p className="text-[11px] sm:text-xs text-primary font-mono font-bold mt-0.5 sm:mt-1">
                Sept 25-26 • 2 Full Days
              </p>
            </div>

            {/* Light Tech QR Mockup */}
            <div className="relative p-1.5 sm:p-2 rounded-2xl bg-slate-900 text-white shadow-md shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              <QrCode className="h-10 w-10 sm:h-12 sm:w-12 text-cyan-300" />
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce opacity-90" />
            </div>
          </div>

          {/* 2 Event Slots Matrix Preview */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/90 space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate">SLOT 01 (DAY 1)</span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                Hackathons / AI
              </p>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/90 space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-bold text-cyan-700">
                <CheckCircle2 className="h-3 w-3 text-cyan-600 shrink-0" />
                <span className="truncate">SLOT 02 (DAY 2)</span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                Robotics / Arena
              </p>
            </div>
          </div>
        </div>

        {/* Pass Footer Telemetry */}
        <div className="relative z-10 pt-3.5 sm:pt-4 border-t border-slate-200/80 flex items-center justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono block">PASS_TOKEN</span>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-800 tracking-wider block truncate">
              EUPH-2026-LIVE
            </span>
          </div>

          <Link
            href={hasPass ? "/dashboard/passes" : "/register"}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>{hasPass ? "View Pass QR" : "Claim Pass"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Watermark */}
        <div className="absolute -bottom-6 -right-6 pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity">
          <ShieldCheck className="h-32 w-32 text-slate-900" />
        </div>
      </div>
    </div>
  );
}
