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

  const applyPreset = (preset: "standard" | "subsidized" | "premium") => {
    if (preset === "standard") {
      setSettings((prev) => ({
        ...prev,
        internal_base_fee: 300,
        internal_max_events_included: 2,
        internal_extra_event_fee: 100,
        external_base_fee: 400,
        external_max_events_included: 2,
        external_extra_event_fee: 150,
        pro_event_surcharge: 0,
        max_pro_events_allowed: 1,
        require_pro_first: true,
      }));
    } else if (preset === "subsidized") {
      setSettings((prev) => ({
        ...prev,
        internal_base_fee: 200,
        internal_max_events_included: 2,
        internal_extra_event_fee: 75,
        external_base_fee: 300,
        external_max_events_included: 2,
        external_extra_event_fee: 100,
        pro_event_surcharge: 0,
        max_pro_events_allowed: 1,
        require_pro_first: true,
      }));
    } else if (preset === "premium") {
      setSettings((prev) => ({
        ...prev,
        internal_base_fee: 350,
        internal_max_events_included: 2,
        internal_extra_event_fee: 120,
        external_base_fee: 550,
        external_max_events_included: 2,
        external_extra_event_fee: 175,
        pro_event_surcharge: 50,
        max_pro_events_allowed: 1,
        require_pro_first: true,
      }));
    }
  };

  // Simulator fee calculation
  const simEventCount =
    simCombo === "pro_normal" || simCombo === "two_normal" ? 2 : 1;
  const simHasPro = simCombo === "pro_normal" || simCombo === "single_pro";
  const proSurcharge = simHasPro ? Number(settings.pro_event_surcharge || 0) : 0;

  const internalIncluded = Math.min(simEventCount, settings.internal_max_events_included);
  const internalExtra = Math.max(0, simEventCount - settings.internal_max_events_included);
  const internalTotal =
    Number(settings.internal_base_fee) +
    internalExtra * Number(settings.internal_extra_event_fee) +
    proSurcharge;

  const externalIncluded = Math.min(simEventCount, settings.external_max_events_included);
  const externalExtra = Math.max(0, simEventCount - settings.external_max_events_included);
  const externalTotal =
    Number(settings.external_base_fee) +
    externalExtra * Number(settings.external_extra_event_fee) +
    proSurcharge;

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {saveSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-bold">
            Pricing policy, Pro event rules, and pass quotas updated successfully across the platform!
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
            onClick={() => applyPreset("standard")}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-primary hover:border-indigo-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            ⭐ Standard 2-Event Pass (₹300 / ₹400)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("subsidized")}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-primary hover:border-indigo-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            🏷️ Subsidized Pass (₹200 / ₹300)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("premium")}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-primary hover:border-indigo-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            👑 Premium Pass + Pro Surcharge (₹350 / ₹550)
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Internal Students (KARE) */}
          <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-primary border border-indigo-100">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Internal Students (KARE)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified `@klu.ac.in` student delegates
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-primary">
                KARE Tier
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {/* Internal Base Fee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Base Registration Pass Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.internal_base_fee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        internal_base_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-8 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Standard festival delegate admission fee for KARE students (covers up to 2 events).
                </p>
              </div>

              {/* Internal Max Events Included */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Maximum Events Included per Pass
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.internal_max_events_included}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      internal_max_events_included: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Event quota for internal delegates (standard: 2 events).
                </p>
              </div>

              {/* Internal Extra Event Fee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Extra Fee per Additional Event (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.internal_extra_event_fee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        internal_extra_event_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-8 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Fee charged if participant chooses additional events beyond quota.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: External Students */}
          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-violet-600" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 border border-purple-100">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    External Delegates
                  </h3>
                  <p className="text-xs text-slate-500">
                    Students from external universities &amp; colleges
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-700">
                National Tier
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {/* External Base Fee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Base Registration Pass Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.external_base_fee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        external_base_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-8 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Base pass fee for out-station delegates attending Euphoria.
                </p>
              </div>

              {/* External Max Events Included */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Maximum Events Included per Pass
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.external_max_events_included}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      external_max_events_included: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Number of events included for external delegates (standard: 2 events).
                </p>
              </div>

              {/* External Extra Event Fee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Extra Fee per Additional Event (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.external_extra_event_fee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        external_extra_event_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-8 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Charge for every extra event chosen beyond the quota.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Pro Event Rules & Surcharge Policy */}
        <div className="rounded-3xl border border-amber-200/90 bg-white p-6 shadow-xs space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                <Star className="h-5 w-5 fill-amber-500 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Pro Event Policy &amp; Surcharge Rules
                </h3>
                <p className="text-xs text-slate-500">
                  Control Pro Event selection limits, slot ordering, and premium pricing
                </p>
              </div>
            </div>

            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-xs font-black">
              ⭐ Flagship Policy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Pro Surcharge */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Pro Event Surcharge / Premium (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.pro_event_surcharge ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pro_event_surcharge: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-8 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Optional additional fee when a pass includes a Pro Event (set 0 if included in base fee).
              </p>
            </div>

            {/* Max Pro Events Allowed */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Max Pro Events per Pass
              </label>
              <input
                type="number"
                min="1"
                max="2"
                value={settings.max_pro_events_allowed ?? 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_pro_events_allowed: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400">
                Maximum number of Pro Events a participant may choose (enforced: 1).
              </p>
            </div>

            {/* Strict Order Policy */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Selection Order Rule
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Pro Must Be Selected 1st
                </span>
                <input
                  type="checkbox"
                  checked={settings.require_pro_first ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      require_pro_first: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                When enabled, picking a Normal Event first immediately locks Pro events.
              </p>
            </div>
          </div>
        </div>

        {/* Global Registration Status Switch */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900">
              Live Registration Gate Status
            </h4>
            <p className="text-xs text-slate-500">
              Enable or temporarily pause registrations across all festival competitions.
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
            Preview pricing based on participant selection combinations
          </span>
        </div>

        {/* Selection Combination Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setSimCombo("pro_normal")}
            className={`rounded-2xl p-3 text-left border transition-all cursor-pointer ${
              simCombo === "pro_normal"
                ? "bg-amber-50 border-amber-300 text-amber-950 shadow-xs font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>1 Pro + 1 Normal</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Full Pass (Pro selected 1st)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSimCombo("two_normal")}
            className={`rounded-2xl p-3 text-left border transition-all cursor-pointer ${
              simCombo === "two_normal"
                ? "bg-indigo-50 border-indigo-300 text-primary shadow-xs font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>2 Normal Events</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Full Pass (Standard Competitions)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSimCombo("single_pro")}
            className={`rounded-2xl p-3 text-left border transition-all cursor-pointer ${
              simCombo === "single_pro"
                ? "bg-amber-50 border-amber-300 text-amber-950 shadow-xs font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>1 Pro Event Only</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Partial Pass (1 slot filled)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSimCombo("single_normal")}
            className={`rounded-2xl p-3 text-left border transition-all cursor-pointer ${
              simCombo === "single_normal"
                ? "bg-slate-100 border-slate-300 text-slate-900 shadow-xs font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Zap className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>1 Normal Event Only</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Partial Pass (1 slot filled)
            </p>
          </button>
        </div>

        {/* Simulation Output Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700">
                Internal (KARE) Delegate Pass
              </span>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-primary px-2 py-0.5 rounded-full">
                {simEventCount} / 2 Slots
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {formatCurrency(internalTotal)}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Base: {formatCurrency(settings.internal_base_fee)} (covers {internalIncluded} events)
              {proSurcharge > 0 && ` + ${formatCurrency(proSurcharge)} Pro Surcharge`}
              {internalExtra > 0 && ` + ${internalExtra} Extra @ ${formatCurrency(settings.internal_extra_event_fee)}`}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 border border-purple-100 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700">
                External Delegate Pass
              </span>
              <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                {simEventCount} / 2 Slots
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {formatCurrency(externalTotal)}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Base: {formatCurrency(settings.external_base_fee)} (covers {externalIncluded} events)
              {proSurcharge > 0 && ` + ${formatCurrency(proSurcharge)} Pro Surcharge`}
              {externalExtra > 0 && ` + ${externalExtra} Extra @ ${formatCurrency(settings.external_extra_event_fee)}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
