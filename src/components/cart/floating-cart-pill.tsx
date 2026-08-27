"use client";

import { ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/utils";

export function FloatingCartPill({
  user,
}: {
  user?: { participantType?: "internal" | "external" | null } | null;
}) {
  const { selectedEvents, openCart, calculatePricing } = useCart();

  if (selectedEvents.length === 0) return null;

  const pricing = calculatePricing(user?.participantType);

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <button
        onClick={openCart}
        className="group flex items-center gap-3 rounded-full bg-slate-900 pl-4 pr-5 py-3 text-white shadow-xl shadow-slate-900/30 hover:bg-primary transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-white/10"
      >
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary group-hover:bg-white text-white group-hover:text-primary transition-colors">
          <ShoppingBag className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
            {selectedEvents.length}
          </span>
        </div>

        <div className="text-left">
          <div className="text-xs font-extrabold leading-none">
            {selectedEvents.length} {selectedEvents.length === 1 ? "Event" : "Events"} Selected
          </div>
          <div className="text-[10px] text-slate-300 group-hover:text-white/90 font-medium mt-0.5">
            Pass Total: {formatCurrency(pricing.totalAmount)}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 ml-1 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
