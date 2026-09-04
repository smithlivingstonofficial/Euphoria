"use client";

import { useState } from "react";
import {
  RegistrationPricingPolicy,
  updatePricingSettingsAdmin,
} from "@/actions/admin";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap,
  Sparkles,
  Sliders,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Star,
  Zap,
  Info,
  Check,
  Gift,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function AdminPricingClient({
  initialSettings,
}: {
  initialSettings: RegistrationPricingPolicy;
}) {
  const [settings, setSettings] = useState<RegistrationPricingPolicy>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulator state
  const [simCombo, setSimCombo] = useState<"pro_normal" | "two_normal" | "single_pro" | "single_normal">("pro_normal");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const res = await updatePricingSettingsAdmin(settings);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to update pricing settings");
    } else {
      setSaveSuccess(true);
      if (res.settings) {
        setSettings(res.settings);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    }
    setIsSaving(false);
  };

  const applyPreset = (preset: "standard_300_200" | "subsidized_250_150" | "flagship_400_250") => {
    if (preset === "standard_300_200") {
      setSettings((prev) => ({
        ...prev,
        pro_pass_fee: 300,
        normal_pass_fee: 200,
        internal_base_fee: 200,
        external_base_fee: 200,
        internal_max_events_included: 2,
        external_max_events_included: 2,
        pro_event_surcharge: 100,
        max_pro_events_allowed: 1,
        require_pro_first: true,
      }));
    } else if (preset === "subsidized_250_150") {
      setSettings((prev) => ({
        ...prev,
        pro_pass_fee: 250,
        normal_pass_fee: 150,
        internal_base_fee: 150,
        external_base_fee: 150,
        internal_max_events_included: 2,
        external_max_events_included: 2,
        pro_event_surcharge: 100,
        max_pro_events_allowed: 1,
        require_pro_first: true,
      }));
    } else if (preset === "flagship_400_250") {
      setSettings((prev) => ({
        ...prev,
        pro_pass_fee: 400,
        normal_pass_fee: 250,
        internal_base_fee: 250,
        external_base_fee: 250,
        internal_max_events_included: 2,
        external_max_events_included: 2,
        pro_event_surcharge: 150,
        max_pro_events_allowed: 1,
        require_pro_first: true,
      }));
    }
  };

  // Simulator fee calculation
  const proPassFee = Number(settings.pro_pass_fee ?? 300);
  const normalPassFee = Number(settings.normal_pass_fee ?? 200);

  const isProCombo = simCombo === "pro_normal" || simCombo === "single_pro";
  const simTotalAmount = isProCombo ? proPassFee : normalPassFee;
  const simSlotsCount = simCombo === "pro_normal" || simCombo === "two_normal" ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {saveSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-bold">
            Pass pricing (₹{proPassFee} Pro Pass / ₹{normalPassFee} Normal Pass) updated successfully across the platform!
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Policy Presets Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-slate-900">
            Quick Policy Presets:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset("standard_300_200")}
            className="rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 hover:text-primary px-3 py-1.5 text-xs font-bold text-primary transition-colors cursor-pointer"
          >
            ⭐ Standard (₹300 Pro / ₹200 Normal)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("subsidized_250_150")}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-primary hover:border-indigo-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            🏷️ Subsidized (₹250 Pro / ₹150 Normal)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("flagship_400_250")}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-primary hover:border-indigo-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            👑 Flagship Tier (₹400 Flagship / ₹250 Regular)
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Universal Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Flagship Events Pass Tier */}
          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/30 p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    ⭐ Flagship Events Pass
                  </h3>
                  <p className="text-xs text-slate-500">
                    Covers 1 Flagship Event + 1 Regular Event choice
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900">
                Premium Tier
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {/* Flagship Pass Fee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Flagship Pass Total Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.pro_pass_fee ?? 300}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pro_pass_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-8 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none transition-all shadow-2xs"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Price applied whenever a pass includes a <strong>Flagship Event</strong> (both 1 Flagship or 1 Flagship + 1 Regular).
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3.5 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-amber-700" />
                  <span>Includes 2nd Event (₹0 Extra)</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-snug">
                  If a user registers 1 Flagship event now (pays ₹{settings.pro_pass_fee ?? 300}), they can return later to select their 2nd slot (1 Regular event) at ₹0 additional charge.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Regular Events Pass Tier */}
          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/20 p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-primary border border-indigo-100">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    📌 Regular Events Pass
                  </h3>
                  <p className="text-xs text-slate-500">
                    Covers up to 2 Regular Events (or 1 Regular solo)
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-primary">
                Common for All
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {/* Normal Pass Fee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Normal Pass Total Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.normal_pass_fee ?? 200}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        normal_pass_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-8 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:outline-none transition-all shadow-2xs"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Price applied when all selected events are <strong>Normal Events</strong> (both 1 Normal or 2 Normal).
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/60 p-3.5 text-xs text-indigo-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Includes 2nd Normal Event (₹0 Extra)</span>
                </div>
                <p className="text-[11px] text-indigo-800/90 leading-snug">
                  If a user registers 1 Normal event now (pays ₹{settings.normal_pass_fee ?? 200}), they can return later to select their 2nd Normal event at ₹0 additional charge.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Policy Rules Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-200/70 pb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Participation &amp; Registration Gate Rules
              </h4>
              <p className="text-xs text-slate-500">
                Universal delegate pass rules enforced across the whole platform
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
              <span className="text-xs font-bold text-slate-700 block">
                Maximum Events per Pass
              </span>
              <div className="text-lg font-black text-slate-900">
                2 Events (Enforced)
              </div>
              <p className="text-[11px] text-slate-400">
                1 Pro + 1 Normal OR 2 Normal
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
              <span className="text-xs font-bold text-slate-700 block">
                Pro Events Allowed
              </span>
              <div className="text-lg font-black text-amber-700">
                Maximum 1 Pro
              </div>
              <p className="text-[11px] text-slate-400">
                Must be selected as 1st slot
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
              <span className="text-xs font-bold text-slate-700 block">
                Participant Scope
              </span>
              <div className="text-lg font-black text-primary">
                Universal Pricing
              </div>
              <p className="text-[11px] text-slate-400">
                Identical for Internal &amp; External
              </p>
            </div>
          </div>

          {/* Registration Gate Switch */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-slate-900">
                Live Registration Gate Status
              </h5>
              <p className="text-[11px] text-slate-500">
                Enable or pause checkout and pass generation across the festival.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.is_registration_active}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    is_registration_active: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span>Saving Pricing Policy...</span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save All Policy &amp; Pricing Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Interactive Pass Combination & Fee Simulator Card */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Live Pass Combination &amp; Fee Simulator
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Preview the exact pass amount across all selection scenarios
          </span>
        </div>

        {/* Selection Combination Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setSimCombo("pro_normal")}
            className={`rounded-2xl p-3.5 text-left border transition-all cursor-pointer ${
              simCombo === "pro_normal"
                ? "bg-amber-50 border-amber-300 text-amber-950 shadow-xs font-bold ring-2 ring-amber-500/20"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span>1 Pro + 1 Normal</span>
              </div>
              <span className="font-extrabold text-xs text-amber-900">
                ₹{proPassFee}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Full Pass (Pro selected 1st)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSimCombo("two_normal")}
            className={`rounded-2xl p-3.5 text-left border transition-all cursor-pointer ${
              simCombo === "two_normal"
                ? "bg-indigo-50 border-indigo-300 text-primary shadow-xs font-bold ring-2 ring-primary/20"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>2 Normal Events</span>
              </div>
              <span className="font-extrabold text-xs text-primary">
                ₹{normalPassFee}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Full Pass (Standard Competitions)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSimCombo("single_pro")}
            className={`rounded-2xl p-3.5 text-left border transition-all cursor-pointer ${
              simCombo === "single_pro"
                ? "bg-amber-50 border-amber-300 text-amber-950 shadow-xs font-bold ring-2 ring-amber-500/20"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span>1 Pro Event Only</span>
              </div>
              <span className="font-extrabold text-xs text-amber-900">
                ₹{proPassFee}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Partial (can pick 1 Normal later for ₹0)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSimCombo("single_normal")}
            className={`rounded-2xl p-3.5 text-left border transition-all cursor-pointer ${
              simCombo === "single_normal"
                ? "bg-indigo-50 border-indigo-300 text-primary shadow-xs font-bold ring-2 ring-primary/20"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Zap className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>1 Normal Event Only</span>
              </div>
              <span className="font-extrabold text-xs text-primary">
                ₹{normalPassFee}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Partial (can pick 1 Normal later for ₹0)
            </p>
          </button>
        </div>

        {/* Live Simulated Result Display */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Simulated Output Pass
              </span>
              <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                {isProCombo ? "⭐ Pro Delegate Pass" : "📌 Normal Delegate Pass"}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {formatCurrency(simTotalAmount)}
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                (Covers {simSlotsCount} of 2 Slots)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
            <Gift className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              {simSlotsCount === 2
                ? "Both event slots are filled under this registration pass."
                : "Participant can add 1 more event later at ₹0 extra fee according to the pass criteria."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
