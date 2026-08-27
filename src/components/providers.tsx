"use client";

import React from "react";
import { CartProvider, PricingSettings } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FloatingCartPill } from "@/components/cart/floating-cart-pill";

export function AppProviders({
  children,
  initialPricing,
  user,
}: {
  children: React.ReactNode;
  initialPricing?: PricingSettings;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    participantType?: "internal" | "external" | null;
  } | null;
}) {
  return (
    <CartProvider initialPricing={initialPricing}>
      {children}
      <CartDrawer user={user} />
      <FloatingCartPill user={user} />
    </CartProvider>
  );
}
