"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { reconcileUserPendingPaymentAction } from "@/actions/payments";
import { invalidateAppSessionCache } from "@/components/providers";

/**
 * Silent, non-intrusive background reconciler that checks if a returning
 * participant has an unverified Easebuzz payment (e.g. they completed UPI
 * in PhonePe / Google Pay and closed the browser without waiting for redirect).
 */
export function PaymentReconciler() {
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    // Check if auto-reconciler has already executed in this browser session
    try {
      if (sessionStorage.getItem("euphoria_reconciler_checked") === "true") {
        return;
      }
    } catch {
      // Safe fallback
    }

    // Run slight delay so initial render completes
    const timer = setTimeout(async () => {
      try {
        sessionStorage.setItem("euphoria_reconciler_checked", "true");
        const res = await reconcileUserPendingPaymentAction();
        if (res.success && res.reconciled) {
          console.log("🎉 Euphoria Payment Auto-Reconciled:", res.passCode);
          invalidateAppSessionCache();
          router.refresh();
        }
      } catch {
        // Silently swallow errors on passive background check
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
