"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";

export function ClosingCtaButton() {
  const { userPass } = useCart();
  const hasPass = Boolean(userPass?.hasPass);

  return (
    <Link
      href={hasPass ? "/dashboard/passes" : "/register"}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-xs sm:text-sm font-black text-slate-900 shadow-xl shadow-slate-950/10 hover:bg-cyan-50 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer"
    >
      <span>{hasPass ? "View Pass QR Code" : "Claim Your Pass Now (₹200)"}</span>
      <ArrowRight className="h-4 w-4 text-primary" />
    </Link>
  );
}
