"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { PublicEvent } from "@/components/events/event-catalog-explorer";

export const MAX_EVENTS_PER_PASS = 2;

export interface SelectionValidation {
  allowed: boolean;
  reason?: string;
}

export interface PricingSettings {
  pro_pass_fee: number;
  normal_pass_fee: number;
  internal_base_fee: number;
  internal_max_events_included: number;
  internal_extra_event_fee: number;
  external_base_fee: number;
  external_max_events_included: number;
  external_extra_event_fee: number;
  pro_event_surcharge?: number;
  max_pro_events_allowed?: number;
  require_pro_first?: boolean;
  is_registration_active: boolean;
}

interface CartContextType {
  selectedEvents: PublicEvent[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addEvent: (event: PublicEvent) => boolean;
  removeEvent: (eventId: string) => void;
  toggleEvent: (event: PublicEvent) => boolean;
  clearCart: () => void;
  isEventSelected: (eventId: string) => boolean;
  canSelectEvent: (event: PublicEvent) => SelectionValidation;
  hasProEventSelected: boolean;
  firstSelectedEvent: PublicEvent | null;
  maxEventsLimit: number;
  pricingSettings: PricingSettings;
  setPricingSettings: (settings: PricingSettings) => void;
  calculatePricing: (participantType?: "internal" | "external" | null) => {
    baseFee: number;
    includedCount: number;
    extraEventsCount: number;
    extraFee: number;
    proSurcharge: number;
    totalAmount: number;
    isInternal: boolean;
    isProPass: boolean;
  };
}

const DEFAULT_PRICING: PricingSettings = {
  pro_pass_fee: 300,
  normal_pass_fee: 200,
  internal_base_fee: 200,
  internal_max_events_included: 2,
  internal_extra_event_fee: 0,
  external_base_fee: 200,
  external_max_events_included: 2,
  external_extra_event_fee: 0,
  pro_event_surcharge: 100,
  max_pro_events_allowed: 1,
  require_pro_first: true,
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

  const isEventSelected = useCallback(
    (eventId: string) => selectedEvents.some((e) => e.id === eventId),
    [selectedEvents]
  );

  const hasProEventSelected = useMemo(() => {
    return selectedEvents.some((e) => Boolean(e.is_pro_event));
  }, [selectedEvents]);

  const firstSelectedEvent = useMemo(() => {
    return selectedEvents.length > 0 ? selectedEvents[0] : null;
  }, [selectedEvents]);

  // Validation engine for Pro Event and slot limits
  const canSelectEvent = useCallback(
    (event: PublicEvent): SelectionValidation => {
      // If already in cart, user can interact to toggle/remove it
      if (selectedEvents.some((e) => e.id === event.id)) {
        return { allowed: true };
      }

      // Max 2 events per pass
      if (selectedEvents.length >= MAX_EVENTS_PER_PASS) {
        return {
          allowed: false,
          reason: "Pass full (Maximum 2 events selected)",
        };
      }

      // Slot 1: Empty cart - Any event (Pro or Normal) can be chosen
      if (selectedEvents.length === 0) {
        return { allowed: true };
      }

      // Slot 2: Exactly 1 event currently selected
      const firstEvent = selectedEvents[0];
      const isFirstPro = Boolean(firstEvent.is_pro_event);
      const isCandidatePro = Boolean(event.is_pro_event);

      if (isFirstPro) {
        // Case A: 1st choice is PRO -> 2nd choice MUST be NORMAL
        if (isCandidatePro) {
          return {
            allowed: false,
            reason: "Only 1 Pro event allowed (choose a normal event for slot 2)",
          };
        }
        return { allowed: true };
      } else {
        // Case B: 1st choice is NORMAL -> 2nd choice CANNOT be PRO (Pro must be 1st choice)
        if (isCandidatePro) {
          return {
            allowed: false,
            reason: "Pro events can only be selected as your 1st choice",
          };
        }
        return { allowed: true };
      }
    },
    [selectedEvents]
  );

  const addEvent = useCallback(
    (event: PublicEvent): boolean => {
      const validation = canSelectEvent(event);
      if (!validation.allowed) return false;

      setSelectedEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) return prev;
        return [...prev, event];
      });
      return true;
    },
    [canSelectEvent]
  );

  const removeEvent = useCallback((eventId: string) => {
    setSelectedEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const toggleEvent = useCallback(
    (event: PublicEvent): boolean => {
      if (isEventSelected(event.id)) {
        removeEvent(event.id);
        return true;
      }

      const validation = canSelectEvent(event);
      if (!validation.allowed) {
        return false;
      }

      setSelectedEvents((prev) => [...prev, event]);
      return true;
    },
    [isEventSelected, canSelectEvent, removeEvent]
  );

  const clearCart = useCallback(() => {
    setSelectedEvents([]);
  }, []);

  // Universal Pass Pricing Calculation:
  // - Any pass with a Pro event (1 Pro, or 1 Pro + 1 Normal) = ₹300
  // - Any pass with only Normal events (1 Normal, or 2 Normal) = ₹200
  // - Common to both internal and external participants
  const calculatePricing = useCallback(
    (participantType?: "internal" | "external" | null) => {
      const totalCount = selectedEvents.length;
      const isInternal = participantType !== "external";

      if (totalCount === 0) {
        return {
          baseFee: 0,
          includedCount: 0,
          extraEventsCount: 0,
          extraFee: 0,
          proSurcharge: 0,
          totalAmount: 0,
          isInternal,
          isProPass: false,
        };
      }

      const hasPro = selectedEvents.some((e) => Boolean(e.is_pro_event));
      const proPassFee = Number(pricingSettings.pro_pass_fee ?? 300);
      const normalPassFee = Number(pricingSettings.normal_pass_fee ?? 200);

      const totalAmount = hasPro ? proPassFee : normalPassFee;
      const baseFee = normalPassFee;
      const proSurcharge = hasPro ? Math.max(0, proPassFee - normalPassFee) : 0;

      return {
        baseFee,
        includedCount: Math.min(totalCount, MAX_EVENTS_PER_PASS),
        extraEventsCount: Math.max(0, totalCount - MAX_EVENTS_PER_PASS),
        extraFee: 0,
        proSurcharge,
        totalAmount,
        isInternal,
        isProPass: hasPro,
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
        canSelectEvent,
        hasProEventSelected,
        firstSelectedEvent,
        maxEventsLimit: MAX_EVENTS_PER_PASS,
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
