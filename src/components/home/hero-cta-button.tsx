"use client";

import Link from "next/link";
import { Ticket, ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";

export function HeroCtaButton() {
  const { userPass, user } = useCart();

  const isLoggedIn = Boolean(user);
  const hasPass = Boolean(userPass?.hasPass);
  const isProfileCompleted = Boolean(user?.isProfileCompleted);

  const targetHref = !isLoggedIn
    ? "/register"
    : hasPass
    ? "/dashboard/passes"
    : isProfileCompleted
    ? "/events"
    : "/complete-profile";

  const buttonText = hasPass
    ? "View My Delegate Pass"
    : "Register & Get Pass (₹200)";

  return (
    <Link
      href={targetHref}
      className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-primary to-cyan-600 px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-black text-white shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group cursor-pointer"
    >
      <Ticket className="h-5 w-5 text-cyan-200" />
      <span>{buttonText}</span>
      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}
