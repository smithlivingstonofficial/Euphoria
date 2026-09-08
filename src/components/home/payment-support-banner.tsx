"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, GripVertical, Zap } from "lucide-react";
import { PaymentIssueModal } from "./payment-issue-modal";

export function PaymentSupportBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();

  const dragRef = useRef<{
    startX: number;
    startY: number;
    elemX: number;
    elemY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    elemX: 0,
    elemY: 0,
    hasMoved: false,
  });

  // Auto-open modal if redirected with ?openPaymentIssue=true
  useEffect(() => {
    if (searchParams.get("openPaymentIssue") === "true") {
      setIsModalOpen(true);
      try {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("openPaymentIssue");
        window.history.replaceState({}, "", nextUrl.pathname + nextUrl.search);
      } catch {
        // Safe fallback
      }
    }
  }, [searchParams]);

  // Set initial position safely on client side (bottom-left floating pill)
  useEffect(() => {
    const updateDefaultPos = () => {
      // Check if user previously moved the button in this session
      try {
        const saved = sessionStorage.getItem("payment_issue_btn_pos");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            const btnW = 215;
            const btnH = 48;
            const clampedX = Math.max(10, Math.min(window.innerWidth - btnW - 10, parsed.x));
            const clampedY = Math.max(65, Math.min(window.innerHeight - btnH - 15, parsed.y));
            setPosition({ x: clampedX, y: clampedY });
            return;
          }
        }
      } catch {
        // Safe fallback
      }

      // Default position: Bottom-Left
      // Desktop: 24px from left, 28px from bottom (avoids bottom-right cart and timer)
      // Mobile: 16px from left, 84px from bottom (clears bottom navigation dock)
      const isMobile = window.innerWidth < 640;
      const btnH = 48;
      const initialX = isMobile ? 16 : 24;
      const initialY = isMobile
        ? Math.max(65, window.innerHeight - btnH - 84)
        : Math.max(65, window.innerHeight - btnH - 28);

      setPosition({ x: initialX, y: initialY });
    };

    updateDefaultPos();

    // Re-clamp position on window resize
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const btnW = buttonRef.current?.offsetWidth || 215;
        const btnH = buttonRef.current?.offsetHeight || 48;
        return {
          x: Math.max(10, Math.min(window.innerWidth - btnW - 10, prev.x)),
          y: Math.max(65, Math.min(window.innerHeight - btnH - 15, prev.y)),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 120 FPS buttery-smooth dragging via direct transform & RAF (Zero latency, zero stutter)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only main button / touch
    if (!position) return;

    // Prevent unwanted text selection while dragging
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialElemX = position.x;
    const initialElemY = position.y;

    dragRef.current = {
      startX,
      startY,
      elemX: initialElemX,
      elemY: initialElemY,
      hasMoved: false,
    };
    setIsDragging(true);

    let currentX = initialElemX;
    let currentY = initialElemY;
    let rafId: number | null = null;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (Math.hypot(dx, dy) > 3) {
        dragRef.current.hasMoved = true;
      }

      const btnW = buttonRef.current?.offsetWidth || 215;
      const btnH = buttonRef.current?.offsetHeight || 48;

      const clampedX = Math.max(
        10,
        Math.min(window.innerWidth - btnW - 10, initialElemX + dx)
      );
      const clampedY = Math.max(
        65,
        Math.min(window.innerHeight - btnH - 15, initialElemY + dy)
      );

      currentX = clampedX;
      currentY = clampedY;

      // Direct DOM update via RAF for instantaneous 60/120 FPS hardware-accelerated tracking
      if (buttonRef.current) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          if (buttonRef.current) {
            buttonRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
          }
        });
      }
    };

    const handlePointerUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      // Sync final position to React state
      setPosition({ x: currentX, y: currentY });

      // If dragged, persist position in session
      if (dragRef.current.hasMoved) {
        try {
          sessionStorage.setItem(
            "payment_issue_btn_pos",
            JSON.stringify({ x: currentX, y: currentY })
          );
        } catch {
          // Safe fallback
        }
      } else {
        // Clicked/tapped without moving -> open dispute modal
        setIsModalOpen(true);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          ULTRA-ATTRACTIVE, HIGH-VISIBILITY DRAGGABLE FLOATING BUTTON
      ═══════════════════════════════════════════════════════════════ */}
      {position && (
        <div
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            touchAction: "none",
          }}
          className={`fixed top-0 left-0 z-[9990] select-none will-change-transform ${
            isDragging
              ? "cursor-grabbing transition-none scale-105 rotate-1 shadow-2xl"
              : "cursor-grab transition-transform duration-150 hover:scale-105"
          }`}
          title="Drag anywhere to reposition • Click to resolve payment issue"
        >
          <div className="group relative">
            {/* Ambient Multi-Hue Pulsing Aura Glow */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500 rounded-full blur-md opacity-60 group-hover:opacity-95 transition-opacity duration-300 pointer-events-none" />

            {/* Glowing Gradient Border Rim */}
            <div className="relative p-[1.5px] rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-500 shadow-[0_10px_30px_rgba(0,0,0,0.4)] group-hover:shadow-[0_12px_36px_rgba(245,158,11,0.5)] transition-all">
              
              {/* Inner Frosted Obsidian Glass Body with Specular Highlight */}
              <div className="flex items-center gap-2.5 pl-2.5 pr-3 py-2 rounded-full bg-slate-950/95 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
                
                {/* Tactile Drag Grip Handle */}
                <span className="text-slate-400 group-hover:text-amber-300 transition-colors flex items-center shrink-0 pr-0.5">
                  <GripVertical className="h-4 w-4 opacity-75 group-hover:opacity-100" />
                </span>

                {/* Glowing Amber/Gold 3D Jewel with Live Pulsing Beacon */}
                <div className="relative flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.65)] shrink-0">
                  <Zap className="h-4 w-4 fill-slate-950" />
                  
                  {/* Live Emerald Radar Ping */}
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 ring-2 ring-slate-950" />
                  </span>
                </div>

                {/* Ultra-Visible, High-Contrast Typography & Badge */}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[14px] sm:text-[15px] font-bold tracking-normal text-white font-sans drop-shadow-xs">
                    Payment Issue
                  </span>
                  
                  {/* Refined Modern Badge */}
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-sans shadow-xs">
                    Support
                  </span>
                </div>

                {/* Vibrant Micro Action Arrow Capsule */}
                <div className="h-6 w-6 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center transition-all duration-200 shadow-xs group-hover:translate-x-0.5 shrink-0">
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dispute & Event Resolution Modal */}
      <PaymentIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
