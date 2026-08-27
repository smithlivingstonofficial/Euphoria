import { getPricingSettingsAdmin } from "@/actions/admin";
import { AdminPricingClient } from "./pricing-client";
import { DollarSign, ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const settings = await getPricingSettingsAdmin();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-primary shadow-2xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Registration &amp; Delegate Policy</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pricing Tiers &amp; Event Limits
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Configure base registration fees, included event quotas, and extra event charges for KARE internal students and external university delegates.
          </p>
        </div>
      </div>

      <AdminPricingClient initialSettings={settings} />
    </div>
  );
}
