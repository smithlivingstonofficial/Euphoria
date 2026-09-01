"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { PublicEvent } from "@/components/events/event-catalog-explorer";

export const MAX_EVENTS_PER_PASS = 2;

export interface SelectionValidation {
  allowed: boolean;
  reason?: string;
  isConfirmed?: boolean;
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

export interface ConfirmedEventItem {
  id: string;
  eventId: string;
  name: string;
  isProEvent: boolean;
  slotNumber: number;
  registrationCode: string;
}

export interface UserPassInfo {
  hasPass: boolean;
  passCode?: string;
  passTier?: "standard_pass" | "pro_pass";
  amountPaid?: number;
  totalSlots: number;
  slotsUsed: number;
  remainingSlots: number;
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
  isEventConfirmed: (eventId: string) => boolean;
  canSelectEvent: (event: PublicEvent) => SelectionValidation;
  hasProEventSelected: boolean;
  firstSelectedEvent: PublicEvent | null;
  maxEventsLimit: number;
  pricingSettings: PricingSettings;
  setPricingSettings: (settings: PricingSettings) => void;
  userPass: UserPassInfo;
  confirmedEvents: ConfirmedEventItem[];
  setUserPassState: (pass: UserPassInfo, confirmed: ConfirmedEventItem[]) => void;
  calculatePricing: (participantType?: "internal" | "external" | null) => {
    baseFee: number;
    includedCount: number;
    extraEventsCount: number;
    extraFee: number;
    proSurcharge: number;
    totalAmount: number;
    isInternal: boolean;
    isProPass: boolean;
    isIncrementalClaim: boolean;
  };
  needsAccommodation: boolean;
  setNeedsAccommodation: (val: boolean) => void;
  toggleNeedsAccommodation: () => void;
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
  initialPass,
  initialConfirmedEvents = [],
}: {
  children: React.ReactNode;
  initialPricing?: PricingSettings;
  initialPass?: UserPassInfo;
  initialConfirmedEvents?: ConfirmedEventItem[];
}) {
  const [selectedEvents, setSelectedEvents] = useState<PublicEvent[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(initialPricing);
  const [isLoaded, setIsLoaded] = useState(false);

  const [userPass, setUserPass] = useState<UserPassInfo>(
    initialPass || {
      hasPass: initialConfirmedEvents.length > 0,
      totalSlots: 2,
      slotsUsed: initialConfirmedEvents.length,
      remainingSlots: Math.max(0, 2 - initialConfirmedEvents.length),
    }
  );

  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedEventItem[]>(
    initialConfirmedEvents
  );

  const [needsAccommodation, setNeedsAccommodation] = useState(false);
  const ACCOMMODATION_STORAGE_KEY = "euphoria_2026_accommodation_pref";

  useEffect(() => {
    try {
      const savedAcc = localStorage.getItem(ACCOMMODATION_STORAGE_KEY);
      if (savedAcc !== null) {
        setNeedsAccommodation(savedAcc === "true");
      }
    } catch (e) {
      console.error("Failed to load accommodation preference", e);
    }
  }, []);

  const handleSetAccommodation = useCallback((val: boolean) => {
    setNeedsAccommodation(val);
    try {
      localStorage.setItem(ACCOMMODATION_STORAGE_KEY, String(val));
    } catch (e) {
      console.error("Failed to save accommodation preference", e);
    }
  }, []);

  const toggleNeedsAccommodation = useCallback(() => {
    handleSetAccommodation(!needsAccommodation);
  }, [needsAccommodation, handleSetAccommodation]);

  // Sync external props if they change
  useEffect(() => {
    if (initialPass) {
      setUserPass(initialPass);
    }
    if (initialConfirmedEvents && initialConfirmedEvents.length > 0) {
      setConfirmedEvents(initialConfirmedEvents);
    }
  }, [initialPass, initialConfirmedEvents]);

  const setUserPassState = useCallback(
    (pass: UserPassInfo, confirmed: ConfirmedEventItem[]) => {
      setUserPass(pass);
      setConfirmedEvents(confirmed);
    },
    []
  );

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed: PublicEvent[] = JSON.parse(saved);
        // Filter out any items that the user has already confirmed
        const filtered = parsed.filter(
          (p) => !confirmedEvents.some((c) => c.eventId === p.id)
        );
        setSelectedEvents(filtered);
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
    }
    setIsLoaded(true);
  }, [confirmedEvents]);

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

  const isEventConfirmed = useCallback(
    (eventId: string) => confirmedEvents.some((e) => e.eventId === eventId),
    [confirmedEvents]
  );

  const hasProEventSelected = useMemo(() => {
    return (
      selectedEvents.some((e) => Boolean(e.is_pro_event)) ||
      confirmedEvents.some((e) => Boolean(e.isProEvent))
    );
  }, [selectedEvents, confirmedEvents]);

  const firstSelectedEvent = useMemo(() => {
    return selectedEvents.length > 0 ? selectedEvents[0] : null;
  }, [selectedEvents]);

  // Validation engine for Pro Event and slot limits taking confirmed passes into account
  const canSelectEvent = useCallback(
    (event: PublicEvent): SelectionValidation => {
      // 1. Check if already confirmed in database
      if (confirmedEvents.some((c) => c.eventId === event.id)) {
        return {
          allowed: false,
          isConfirmed: true,
          reason: "Already confirmed on your Festival Pass",
        };
      }

      // 2. Check if already in cart (allow click to unselect)
      if (selectedEvents.some((e) => e.id === event.id)) {
        return { allowed: true };
      }

      const totalConfirmed = confirmedEvents.length;
      const totalInCart = selectedEvents.length;

      // 3. User already has maximum 2 confirmed events
      if (totalConfirmed >= MAX_EVENTS_PER_PASS) {
        return {
          allowed: false,
          reason: "Pass complete (Maximum 2 events confirmed)",
        };
      }

      // 4. User has reached total limit combined (confirmed + in cart)
      if (totalConfirmed + totalInCart >= MAX_EVENTS_PER_PASS) {
        return {
          allowed: false,
          reason: `Pass full (Max 2 events: ${totalConfirmed} confirmed, ${totalInCart} selected)`,
        };
      }

      const isCandidatePro = Boolean(event.is_pro_event);

      // CASE A: User has 1 CONFIRMED event in database
      if (totalConfirmed === 1) {
        const slot1Event = confirmedEvents[0];
        const isSlot1Pro = Boolean(slot1Event.isProEvent);

        if (isSlot1Pro) {
          // 1st was PRO -> 2nd MUST be NORMAL
          if (isCandidatePro) {
            return {
              allowed: false,
              reason: "Only 1 Flagship event allowed per Pass (choose a regular event)",
            };
          }
          return { allowed: true };
        } else {
          // 1st was NORMAL -> 2nd CANNOT be PRO (Pro must be 1st choice)
          if (isCandidatePro) {
            return {
              allowed: false,
              reason: "Flagship events must be selected as your 1st choice",
            };
          }
          return { allowed: true };
        }
      }

      // CASE B: User has 0 CONFIRMED events in database
      if (totalConfirmed === 0) {
        // Slot 1 (Cart empty)
        if (totalInCart === 0) {
          return { allowed: true };
        }

        // Slot 2 (1 item in cart)
        const cartFirstEvent = selectedEvents[0];
        const isCartFirstPro = Boolean(cartFirstEvent.is_pro_event);

        if (isCartFirstPro) {
          // 1st choice is PRO -> 2nd choice MUST be NORMAL
          if (isCandidatePro) {
            return {
              allowed: false,
              reason: "Only 1 Flagship event allowed per Pass (choose a regular event for slot 2)",
            };
          }
          return { allowed: true };
        } else {
          // 1st choice is NORMAL -> 2nd choice CANNOT be PRO
          if (isCandidatePro) {
            return {
              allowed: false,
              reason: "Flagship events must be selected as your 1st choice",
            };
          }
          return { allowed: true };
        }
      }

      return { allowed: true };
    },
    [confirmedEvents, selectedEvents]
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
  // - If user has 1 confirmed event and is claiming 2nd slot -> ₹0
  // - If initial checkout with Pro event -> ₹300
  // - If initial checkout with only Normal events -> ₹200
  const calculatePricing = useCallback(
    (participantType?: "internal" | "external" | null) => {
      const totalInCart = selectedEvents.length;
      const totalConfirmed = confirmedEvents.length;
      const isInternal = participantType !== "external";
      const isIncrementalClaim = totalConfirmed > 0;

      if (totalInCart === 0) {
        return {
          baseFee: 0,
          includedCount: 0,
          extraEventsCount: 0,
          extraFee: 0,
          proSurcharge: 0,
          totalAmount: 0,
          isInternal,
          isProPass: false,
          isIncrementalClaim,
        };
      }

      // If user already paid for a pass and is adding their 2nd event:
      if (isIncrementalClaim) {
        return {
          baseFee: 0,
          includedCount: 1,
          extraEventsCount: 0,
          extraFee: 0,
          proSurcharge: 0,
          totalAmount: 0, // ₹0 additional fee
          isInternal,
          isProPass: false,
          isIncrementalClaim: true,
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
        includedCount: Math.min(totalInCart, MAX_EVENTS_PER_PASS),
        extraEventsCount: Math.max(0, totalInCart - MAX_EVENTS_PER_PASS),
        extraFee: 0,
        proSurcharge,
        totalAmount,
        isInternal,
        isProPass: hasPro,
        isIncrementalClaim: false,
      };
    },
    [selectedEvents, confirmedEvents, pricingSettings]
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
        isEventConfirmed,
        canSelectEvent,
        hasProEventSelected,
        firstSelectedEvent,
        maxEventsLimit: MAX_EVENTS_PER_PASS,
        pricingSettings,
        setPricingSettings,
        userPass,
        confirmedEvents,
        setUserPassState,
        calculatePricing,
        needsAccommodation,
        setNeedsAccommodation: handleSetAccommodation,
        toggleNeedsAccommodation,
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
