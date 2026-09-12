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

export interface GlobalUser {
  id: string;
  email: string;
  fullName?: string;
  participantType?: "internal" | "external" | null;
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
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setIsAuthLoaded(true);
          return;
        }

        const authUser = session.user;
        const [{ data: p }, passRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, full_name, participant_type")
            .eq("id", authUser.id)
            .maybeSingle(),
          getUserPassSummary(),
        ]);

        if (p) {
          setUser({
            id: p.id,
            email: p.email,
            fullName: p.full_name,
            participantType: p.participant_type as "internal" | "external",
          });
        }

        if (passRes.success && passRes.data) {
          setUserPass({
            hasPass: passRes.data.hasPass,
            passCode: passRes.data.passCode,
            passTier: passRes.data.passTier,
            amountPaid: passRes.data.amountPaid,
            totalSlots: passRes.data.totalSlots,
            slotsUsed: passRes.data.slotsUsed,
            remainingSlots: passRes.data.remainingSlots,
          });

          setConfirmedEvents(
            passRes.data.registeredEvents.map((r: any) => ({
              id: r.registrationId,
              eventId: r.eventId,
              name: r.name,
              isProEvent: r.isProEvent,
              slotNumber: r.slotNumber,
              registrationCode: passRes.data?.passCode || "",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load app state", err);
      } finally {
        setIsAuthLoaded(true);
      }
    }

    loadAppState();
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
