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
  const [simulatedEventsCount, setSimulatedEventsCount] = useState(3);

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

  // Simulator calculations
  const internalIncluded = Math.min(simulatedEventsCount, settings.internal_max_events_included);
  const internalExtra = Math.max(0, simulatedEventsCount - settings.internal_max_events_included);
  const internalTotal =
    simulatedEventsCount === 0
      ? 0
      : Number(settings.internal_base_fee) + internalExtra * Number(settings.internal_extra_event_fee);

  const externalIncluded = Math.min(simulatedEventsCount, settings.external_max_events_included);
  const externalExtra = Math.max(0, simulatedEventsCount - settings.external_max_events_included);
  const externalTotal =
    simulatedEventsCount === 0
      ? 0
      : Number(settings.external_base_fee) + externalExtra * Number(settings.external_extra_event_fee);

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {saveSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-bold">
            Pricing policy and event limit tiers updated successfully across the platform!
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Internal Students (KARE) */}
          <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

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
                  Standard festival delegate admission fee for internal students.
                </p>
              </div>

              {/* Internal Max Events Included */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Included Free Events Allocation
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
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
                  Number of events a student can apply for under the base registration pass.
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
                  Fee charged for each additional event beyond the included quota.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: External Students */}
          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600" />

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
                    Students from other universities &amp; colleges
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
                  Included Free Events Allocation
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
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
                  Number of events included for external delegates.
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

        {/* Global Registration Status Switch */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900">
              Live Registration Gate Status
            </h4>
            <p className="text-xs text-slate-500">
              Enable or temporarily pause registrations for all 61 competitions.
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
              <span>Saving Policy...</span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Pricing Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Interactive Simulator Card */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Live Fee Calculation Simulator
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Preview pricing for {simulatedEventsCount} selected competitions
          </span>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Simulate Events Chosen:</span>
            <span className="text-sm font-extrabold text-primary">
              {simulatedEventsCount} {simulatedEventsCount === 1 ? "Event" : "Events"}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={simulatedEventsCount}
            onChange={(e) => setSimulatedEventsCount(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        {/* Simulation Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-indigo-700 block">
              Internal (KARE) Delegate
            </span>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(internalTotal)}
            </div>
            <p className="text-[11px] text-slate-500">
              Base: {formatCurrency(settings.internal_base_fee)} ({internalIncluded} Included)
              {internalExtra > 0 &&
                ` + ${internalExtra} Extra @ ${formatCurrency(settings.internal_extra_event_fee)}`}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 border border-purple-100 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-purple-700 block">
              External Delegate
            </span>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(externalTotal)}
            </div>
            <p className="text-[11px] text-slate-500">
              Base: {formatCurrency(settings.external_base_fee)} ({externalIncluded} Included)
              {externalExtra > 0 &&
                ` + ${externalExtra} Extra @ ${formatCurrency(settings.external_extra_event_fee)}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
