"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PublicEvent } from "@/components/events/event-catalog-explorer";

export interface PricingSettings {
  internal_base_fee: number;
  internal_max_events_included: number;
  internal_extra_event_fee: number;
  external_base_fee: number;
  external_max_events_included: number;
  external_extra_event_fee: number;
  is_registration_active: boolean;
}

interface CartContextType {
  selectedEvents: PublicEvent[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addEvent: (event: PublicEvent) => void;
  removeEvent: (eventId: string) => void;
  toggleEvent: (event: PublicEvent) => void;
  clearCart: () => void;
  isEventSelected: (eventId: string) => boolean;
  pricingSettings: PricingSettings;
  setPricingSettings: (settings: PricingSettings) => void;
  calculatePricing: (participantType?: "internal" | "external" | null) => {
    baseFee: number;
    includedCount: number;
    extraEventsCount: number;
    extraFee: number;
    totalAmount: number;
    isInternal: boolean;
  };
}

const DEFAULT_PRICING: PricingSettings = {
  internal_base_fee: 300,
  internal_max_events_included: 3,
  internal_extra_event_fee: 100,
  external_base_fee: 500,
  external_max_events_included: 2,
  external_extra_event_fee: 150,
  is_registration_active: true,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "euphoria_2026_event_cart";

export function CartProvider({
  children,
  initialPricing = DEFAULT_PRICING,
}: {
  children: React.ReactNode;
  initialPricing?: PricingSettings;
}) {
  const [selectedEvents, setSelectedEvents] = useState<PublicEvent[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(initialPricing);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setSelectedEvents(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(selectedEvents));
      } catch (e) {
        console.error("Failed to save cart to localStorage", e);
      }
    }
  }, [selectedEvents, isLoaded]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addEvent = useCallback((event: PublicEvent) => {
    setSelectedEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev, event];
    });
  }, []);

  const removeEvent = useCallback((eventId: string) => {
    setSelectedEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const toggleEvent = useCallback((event: PublicEvent) => {
    setSelectedEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) {
        return prev.filter((e) => e.id !== event.id);
      }
      return [...prev, event];
    });
  }, []);

  const clearCart = useCallback(() => {
    setSelectedEvents([]);
  }, []);

  const isEventSelected = useCallback(
    (eventId: string) => selectedEvents.some((e) => e.id === eventId),
    [selectedEvents]
  );

  const calculatePricing = useCallback(
    (participantType?: "internal" | "external" | null) => {
      const isInternal = participantType !== "external"; // default internal (KARE)
      const baseFee = isInternal
        ? Number(pricingSettings.internal_base_fee)
        : Number(pricingSettings.external_base_fee);
      const includedLimit = isInternal
        ? Number(pricingSettings.internal_max_events_included)
        : Number(pricingSettings.external_max_events_included);
      const extraFeePerEvent = isInternal
        ? Number(pricingSettings.internal_extra_event_fee)
        : Number(pricingSettings.external_extra_event_fee);

      const totalCount = selectedEvents.length;
      const extraEventsCount = Math.max(0, totalCount - includedLimit);
      const extraFee = extraEventsCount * extraFeePerEvent;
      const totalAmount = totalCount === 0 ? 0 : baseFee + extraFee;

      return {
        baseFee,
        includedCount: Math.min(totalCount, includedLimit),
        extraEventsCount,
        extraFee,
        totalAmount,
        isInternal,
      };
    },
    [selectedEvents, pricingSettings]
  );

  return (
    <CartContext.Provider
      value={{
        selectedEvents,
        isCartOpen,
        setIsCartOpen,
        openCart,
        closeCart,
        addEvent,
        removeEvent,
        toggleEvent,
        clearCart,
        isEventSelected,
        pricingSettings,
        setPricingSettings,
        calculatePricing,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
