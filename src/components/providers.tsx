"use client";

import React from "react";
import {
  CartProvider,
  PricingSettings,
  UserPassInfo,
  ConfirmedEventItem,
} from "@/context/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FloatingCartPill } from "@/components/cart/floating-cart-pill";

export function AppProviders({
  children,
  initialPricing,
  initialPass,
  initialConfirmedEvents = [],
  user,
}: {
  children: React.ReactNode;
  initialPricing?: PricingSettings;
  initialPass?: UserPassInfo;
  initialConfirmedEvents?: ConfirmedEventItem[];
  user?: {
    id: string;
    email: string;
    fullName?: string;
    participantType?: "internal" | "external" | null;
  } | null;
}) {
  return (
    <CartProvider
      initialPricing={initialPricing}
      initialPass={initialPass}
      initialConfirmedEvents={initialConfirmedEvents}
    >
      {children}
      <CartDrawer user={user} />
      <FloatingCartPill user={user} />
    </CartProvider>
  );
}
