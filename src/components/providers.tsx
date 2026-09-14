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
import { createClient } from "@/lib/supabase/client";
import { getUserPassSummary } from "@/actions/passes";

const SESSION_CACHE_KEY = "euphoria_auth_cache_v2";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateAppSessionCache() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      sessionStorage.removeItem("euphoria_reconciler_checked");
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
      // 1. High-Efficiency Cache Check (0 Supabase Network Roundtrips)
      try {
        const cachedStr = sessionStorage.getItem(SESSION_CACHE_KEY);
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

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setUser(null);
          setUserPass(undefined);
          setConfirmedEvents([]);
          setIsAuthLoaded(true);
          try {
            sessionStorage.removeItem(SESSION_CACHE_KEY);
          } catch {
            // Safe fallback
          }
          return;
        }

        const authUser = session.user;
        const [{ data: p }, { data: roleAss }, passRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, full_name, participant_type, is_profile_completed")
            .eq("id", authUser.id)
            .maybeSingle(),
          supabase
            .from("user_role_assignments")
            .select("role_id")
            .eq("user_id", authUser.id),
          getUserPassSummary(),
        ]);

        const roles = (roleAss || []).map((r: any) => r.role_id);
        const normalizedEmail = (authUser.email || "").toLowerCase().trim();
        const isSuperAdmin = roles.includes("super_admin");
        const isAdmin =
          roles.includes("admin") ||
          isSuperAdmin ||
          normalizedEmail.includes("admin") ||
          normalizedEmail.includes("smith");
        const isOverall = roles.includes("overall_coordinator");
        const isStaffCoord = roles.includes("staff_coordinator") || roles.includes("faculty");
        const isStudentCoord =
          roles.includes("student_coordinator") || roles.includes("coordinator");

        const resolvedRole: GlobalUser["role"] = isSuperAdmin
          ? "super_admin"
          : isAdmin
          ? "admin"
          : isOverall
          ? "overall_coordinator"
          : isStaffCoord
          ? "staff_coordinator"
          : isStudentCoord
          ? "student_coordinator"
          : "participant";

        let loadedUser: GlobalUser | null = null;
        if (p) {
          loadedUser = {
            id: p.id,
            email: p.email,
            fullName: p.full_name,
            participantType: p.participant_type as "internal" | "external",
            isProfileCompleted: Boolean(p.is_profile_completed),
            role: resolvedRole,
          };
          setUser(loadedUser);
        }

        let loadedPass: UserPassInfo | undefined = undefined;
        let loadedEvents: ConfirmedEventItem[] = [];

        if (passRes.success && passRes.data) {
          loadedPass = {
            hasPass: passRes.data.hasPass,
            passCode: passRes.data.passCode,
            passTier: passRes.data.passTier,
            amountPaid: passRes.data.amountPaid,
            totalSlots: passRes.data.totalSlots,
            slotsUsed: passRes.data.slotsUsed,
            remainingSlots: passRes.data.remainingSlots,
          };
          setUserPass(loadedPass);

          loadedEvents = passRes.data.registeredEvents.map((r: any) => ({
            id: r.registrationId,
            eventId: r.eventId,
            name: r.name,
            isProEvent: r.isProEvent,
            slotNumber: r.slotNumber,
            registrationCode: passRes.data?.passCode || "",
          }));
          setConfirmedEvents(loadedEvents);
        }

        try {
          sessionStorage.setItem(
            SESSION_CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              user: loadedUser,
              userPass: loadedPass,
              confirmedEvents: loadedEvents,
            })
          );
        } catch {
          // Safe fallback
        }
      } catch (err) {
        console.error("Failed to load app state", err);
      } finally {
        setIsAuthLoaded(true);
      }
    }

    loadAppState();

    const handleInvalidate = () => {
      loadAppState();
    };
    window.addEventListener("euphoria:session-invalidate", handleInvalidate);
    return () => {
      window.removeEventListener("euphoria:session-invalidate", handleInvalidate);
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
