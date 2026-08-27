"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { PublicEvent } from "@/components/events/event-catalog-explorer";

export const MAX_EVENTS_PER_PASS = 2;

export interface SelectionValidation {
  allowed: boolean;
  reason?: string;
}

export interface PricingSettings {
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
  };
}

const DEFAULT_PRICING: PricingSettings = {
  internal_base_fee: 300,
  internal_max_events_included: 2,
  internal_extra_event_fee: 100,
  external_base_fee: 400,
  external_max_events_included: 2,
  external_extra_event_fee: 150,
  pro_event_surcharge: 0,
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
      const hasPro = selectedEvents.some((e) => Boolean(e.is_pro_event));
      const proSurcharge = hasPro ? Number(pricingSettings.pro_event_surcharge || 0) : 0;
      const totalAmount = totalCount === 0 ? 0 : baseFee + extraFee + proSurcharge;

      return {
        baseFee,
        includedCount: Math.min(totalCount, includedLimit),
        extraEventsCount,
        extraFee,
        proSurcharge,
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
