"use client";

import React, { useEffect, useState } from "react";
import {
  CartProvider,
  PricingSettings,
  UserPassInfo,
  ConfirmedEventItem,
} from "@/context/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FloatingCartPill } from "@/components/cart/floating-cart-pill";
import { PaymentReconciler } from "@/components/cart/payment-reconciler";
import { getAppUserSessionBundle } from "@/actions/passes";

const STORAGE_CACHE_KEY = "euphoria_auth_cache_v3";
const OLD_SESSION_KEY = "euphoria_auth_cache_v2";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes Vercel Pro client shield

export function invalidateAppSessionCache() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_CACHE_KEY);
      sessionStorage.removeItem(STORAGE_CACHE_KEY);
      sessionStorage.removeItem(OLD_SESSION_KEY);
      sessionStorage.removeItem("euphoria_reconciler_checked");
      // Signal other tabs via localStorage mutation
      localStorage.setItem("euphoria_auth_inval_signal", String(Date.now()));
      window.dispatchEvent(new CustomEvent("euphoria:session-invalidate"));
    } catch {
      // Safe fallback
    }
  }
}

export interface GlobalUser {
  id: string;
  email: string;
  fullName?: string;
  participantType?: "internal" | "external" | null;
  role?: "admin" | "super_admin" | "overall_coordinator" | "staff_coordinator" | "student_coordinator" | "participant";
  isProfileCompleted?: boolean;
}

export function AppProviders({
  children,
  initialPricing,
}: {
  children: React.ReactNode;
  initialPricing?: PricingSettings;
}) {
  const [user, setUser] = useState<GlobalUser | null>(null);
  const [userPass, setUserPass] = useState<UserPassInfo | undefined>(undefined);
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedEventItem[]>([]);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    async function loadAppState() {
      // 1. High-Efficiency LocalStorage Check (0 Network Roundtrips across all tabs)
      try {
        let cachedStr = localStorage.getItem(STORAGE_CACHE_KEY);
        if (!cachedStr) {
          cachedStr = sessionStorage.getItem(STORAGE_CACHE_KEY);
        }
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (
            cached &&
            typeof cached.timestamp === "number" &&
            Date.now() - cached.timestamp < CACHE_TTL_MS
          ) {
            setUser(cached.user);
            setUserPass(cached.userPass);
            setConfirmedEvents(cached.confirmedEvents || []);
            setIsAuthLoaded(true);
            return;
          }
        }
      } catch {
        // Safe fallback to fresh fetch
      }

      // 2. Single consolidated server action (Cuts 3 client-to-Supabase PostgREST queries down to 1 server bundle)
      try {
        const bundle = await getAppUserSessionBundle();

        if (bundle.success && bundle.user) {
          setUser(bundle.user);
          setUserPass(bundle.userPass);
          setConfirmedEvents(bundle.confirmedEvents || []);

          try {
            const payload = JSON.stringify({
              timestamp: Date.now(),
              user: bundle.user,
              userPass: bundle.userPass,
              confirmedEvents: bundle.confirmedEvents || [],
            });
            localStorage.setItem(STORAGE_CACHE_KEY, payload);
          } catch {
            // Safe fallback
          }
        } else {
          setUser(null);
          setUserPass(undefined);
          setConfirmedEvents([]);
          try {
            localStorage.removeItem(STORAGE_CACHE_KEY);
            sessionStorage.removeItem(STORAGE_CACHE_KEY);
          } catch {
            // Safe fallback
          }
        }
      } catch (err) {
        console.error("Failed to load app state bundle", err);
      } finally {
        setIsAuthLoaded(true);
      }
    }

    loadAppState();

    const handleInvalidate = () => {
      loadAppState();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "euphoria_auth_inval_signal" || e.key === STORAGE_CACHE_KEY) {
        loadAppState();
      }
    };

    window.addEventListener("euphoria:session-invalidate", handleInvalidate);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("euphoria:session-invalidate", handleInvalidate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <CartProvider
      initialPricing={initialPricing}
      initialPass={userPass}
      initialConfirmedEvents={confirmedEvents}
      user={user}
    >
      {children}
      <CartDrawer user={user} />
      <FloatingCartPill user={user} />
      {user && (!userPass || !userPass.hasPass) && <PaymentReconciler />}
    </CartProvider>
  );
}
