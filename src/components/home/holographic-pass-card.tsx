"use client";

import { useState, useRef, MouseEvent } from "react";
import Link from "next/link";
import {
  QrCode,
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HolographicPassProps {
  userRole?: string;
  hasPass?: boolean;
}

export function HolographicPassCard({ userRole, hasPass }: HolographicPassProps) {
  const [selectedTier, setSelectedTier] = useState<"standard" | "pro">("standard");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setRotateX(((y - cy) / cy) * -6);
    setRotateY(((x - cx) / cx) * 6);
    setGlarePos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 0.35 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos((p) => ({ ...p, opacity: 0 }));
  };

  const isPro = selectedTier === "pro";

  return (
    <div
      className="perspective-1000 w-full max-w-[360px] mx-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.15s ease-out",
        }}
        className="preserve-3d"
      >
        <div className={cn(
          "relative rounded-[28px] overflow-hidden shadow-2xl border transition-all duration-300",
          isPro
            ? "border-amber-300/60 shadow-amber-300/25"
            : "border-indigo-200/70 shadow-indigo-300/25"
        )}>

          {/* ── Cursor glare overlay ── */}
          <div
            className="absolute inset-0 z-40 pointer-events-none rounded-[28px] transition-opacity duration-300"
            style={{
              background: isPro
                ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.25) 0%, transparent 60%)`
                : `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.22) 0%, transparent 60%)`,
              opacity: glarePos.opacity,
            }}
          />

          {/* ════════════════════════════════════
              TOP HALF — Gradient branding panel
          ════════════════════════════════════ */}
          <div className={cn(
            "relative px-6 pt-6 pb-8 overflow-hidden",
            isPro
              ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700"
              : "bg-gradient-to-br from-indigo-700 via-primary to-cyan-600"
          )}>
            {/* Soft mesh orbs behind content */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            {/* Dot grid texture */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:18px_18px] pointer-events-none" />

            {/* Header row */}
            <div className="relative z-10 flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm items-center justify-center border border-white/30">
                  <img
                    src="https://www.kalasalingam.ac.in/wp-content/uploads/2022/02/Logo.png"
                    alt="KARE"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-black text-white/60 tracking-[0.14em] uppercase leading-none">
                    EUPHORIA 2026
                  </p>
                  <p className="text-[13px] font-black text-white leading-tight">
                    Delegate Pass
                  </p>
                </div>
              </div>

              {/* LIVE badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[9px] font-mono font-black text-white tracking-wider">LIVE</span>
              </div>
            </div>

            {/* Tier label */}
            <div className="relative z-10 mb-1">
              <p className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest">
                ACCESS_TIER
              </p>
              <h3 className="text-[28px] font-black text-white leading-tight tracking-tight font-display">
                {isPro ? "PRO DELEGATE" : "STANDARD"}
              </h3>
              <p className="text-sm font-semibold text-white/70 mt-0.5">
                {isPro ? "1 Pro Flagship · 1 Standard Event" : "2 Standard Event Slots"}
              </p>
            </div>

            {/* Dates strip */}
            <div className="relative z-10 mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-[10px] font-mono font-bold text-white/60 whitespace-nowrap">
                SEPT 25–26, 2026
              </span>
              <div className="flex-1 h-px bg-white/20" />
            </div>
          </div>

          {/* ════════════════════════════════════
              BOTTOM HALF — White details panel
          ════════════════════════════════════ */}
          <div className="bg-white px-6 pt-5 pb-6 space-y-5">

            {/* Tier switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs">
              <button
                onClick={() => setSelectedTier("standard")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black transition-all duration-200 cursor-pointer",
                  !isPro
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                <Zap className="h-3 w-3 fill-current text-indigo-500" />
                Standard · ₹200
              </button>
              <button
                onClick={() => setSelectedTier("pro")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black transition-all duration-200 cursor-pointer",
                  isPro
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-amber-700"
                )}
              >
                <Star className={cn("h-3 w-3", isPro ? "fill-white text-white" : "text-amber-500")} />
                Pro · ₹300
              </button>
            </div>

            {/* QR code — centered */}
            <div className="flex flex-col items-center gap-2">
              {/* Outer ring glow */}
              <div className="relative flex items-center justify-center">
                <div className={cn(
                  "absolute w-24 h-24 rounded-3xl border-2 qr-ring",
                  isPro ? "border-amber-300/50" : "border-indigo-300/50"
                )} />
                <div className={cn(
                  "absolute w-24 h-24 rounded-3xl border-2 qr-ring-2",
                  isPro ? "border-amber-200/30" : "border-cyan-300/30"
                )} />

                {/* QR box */}
                <div className={cn(
                  "relative rounded-2xl p-3 shadow-lg overflow-hidden",
                  isPro ? "bg-amber-900" : "bg-slate-900"
                )}>
                  <QrCode className={cn("h-14 w-14", isPro ? "text-amber-300" : "text-cyan-300")} />
                  {/* Scan line */}
                  <div
                    className="absolute left-1 right-1 h-[2px] rounded-full scan-line-active opacity-90"
                    style={{
                      background: isPro
                        ? "linear-gradient(90deg,transparent,rgba(251,191,36,1),transparent)"
                        : "linear-gradient(90deg,transparent,rgba(34,211,238,1),transparent)",
                    }}
                  />
                  {/* Corner brackets */}
                  {[
                    "top-1.5 left-1.5 border-t-2 border-l-2 rounded-tl",
                    "top-1.5 right-1.5 border-t-2 border-r-2 rounded-tr",
                    "bottom-1.5 left-1.5 border-b-2 border-l-2 rounded-bl",
                    "bottom-1.5 right-1.5 border-b-2 border-r-2 rounded-br",
                  ].map((cls) => (
                    <div
                      key={cls}
                      className={cn("absolute w-3 h-3", cls, isPro ? "border-amber-400" : "border-cyan-400")}
                    />
                  ))}
                </div>
              </div>
              <p className={cn("text-[10px] font-mono font-bold", isPro ? "text-amber-600" : "text-indigo-600")}>
                Scan at gate entry
              </p>
            </div>

            {/* Slot grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className={cn(
                "p-3 rounded-2xl border space-y-1",
                isPro ? "bg-amber-50 border-amber-200/80" : "bg-indigo-50/80 border-indigo-200/70"
              )}>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className={cn("h-3 w-3 shrink-0", isPro ? "text-amber-600" : "text-indigo-600")} />
                  <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-wide">Day 1</span>
                </div>
                <p className="text-xs font-black text-slate-800 leading-tight">
                  {isPro ? "Pro Flagship" : "Hackathon"}
                </p>
                <p className="text-[9px] text-slate-400">Sept 25</p>
              </div>
              <div className={cn(
                "p-3 rounded-2xl border space-y-1",
                isPro ? "bg-amber-50 border-amber-200/80" : "bg-cyan-50/70 border-cyan-200/70"
              )}>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className={cn("h-3 w-3 shrink-0", isPro ? "text-amber-600" : "text-cyan-600")} />
                  <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-wide">Day 2</span>
                </div>
                <p className="text-xs font-black text-slate-800 leading-tight">Competition</p>
                <p className="text-[9px] text-slate-400">Sept 26</p>
              </div>
            </div>

            {/* Trust row */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Secure OAuth
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-200" />
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-indigo-400" />
                Instant Pass
              </div>
            </div>

            {/* Price + CTA */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <div>
                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Total Fee</p>
                <p className="text-xl font-mono font-black text-slate-900">{isPro ? "₹300" : "₹200"}</p>
              </div>
              <Link
                href={hasPass ? "/dashboard/passes" : "/events"}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black text-white shadow-md active:scale-95 hover:scale-[1.02] transition-all cursor-pointer",
                  isPro
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-300/40"
                    : "bg-gradient-to-r from-indigo-600 to-primary shadow-indigo-300/40"
                )}
              >
                {hasPass ? "View Pass" : "Claim Now"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
