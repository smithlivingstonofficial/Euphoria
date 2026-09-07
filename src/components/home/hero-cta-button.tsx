"use client";

import Link from "next/link";
import { Ticket, ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function HeroCtaButton() {
  const { userPass } = useCart();
  const [authState, setAuthState] = useState<{
    isLoggedIn: boolean;
    hasPass: boolean;
    isProfileCompleted: boolean;
  }>({
    isLoggedIn: false,
    hasPass: Boolean(userPass?.hasPass),
    isProfileCompleted: false,
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: profile }, { data: passData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("is_profile_completed")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("delegate_passes")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle(),
        ]);

        setAuthState({
          isLoggedIn: true,
          hasPass: Boolean(passData || userPass?.hasPass),
          isProfileCompleted: Boolean(profile?.is_profile_completed),
        });
      } catch {
        // Fallback gracefully
      }
    }
    checkAuth();
  }, [userPass?.hasPass]);

  const targetHref = !authState.isLoggedIn
    ? "/register"
    : authState.hasPass
    ? "/dashboard/passes"
    : authState.isProfileCompleted
    ? "/events"
    : "/complete-profile";

  const buttonText = authState.hasPass
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
