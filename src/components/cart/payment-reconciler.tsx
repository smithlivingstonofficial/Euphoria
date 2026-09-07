"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { reconcileUserPendingPaymentAction } from "@/actions/payments";

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

    // Run slight delay so initial render completes
    const timer = setTimeout(async () => {
      try {
        const res = await reconcileUserPendingPaymentAction();
        if (res.success && res.reconciled) {
          console.log("🎉 Euphoria Payment Auto-Reconciled:", res.passCode);
          router.refresh();
        }
      } catch {
        // Silently swallow errors on passive background check
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
