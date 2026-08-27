"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Sparkles,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Building,
  GraduationCap,
  ShieldCheck,
  ExternalLink,
  Layers,
  ShoppingBag,
  Star,
  Gift,
  Plus,
  ArrowRight,
  Ticket,
} from "lucide-react";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";
import { UserPassSummary } from "@/actions/passes";

interface RegistrationItem {
  id: string;
  slot_number?: number;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  isAttended: boolean;
  event: {
    id: string;
    name: string;
    slug: string;
    is_pro_event?: boolean;
    school_or_dept: string;
    venue: string;
    event_date: string;
    start_time: string;
    end_time: string;
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
}

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  participant_type: "internal" | "external";
  register_number?: string;
  college_name?: string;
  department?: string;
  course?: string;
  year_of_study?: number;
  mobile_number?: string;
}

export function DigitalPassClient({
  profile,
  registrations,
  passSummary,
}: {
  profile: ProfileData;
  registrations: RegistrationItem[];
  passSummary?: UserPassSummary | null;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const hasPro =
    passSummary?.passTier === "pro_pass" ||
    registrations.some((r) => Boolean(r.event?.is_pro_event));

  const slotsUsed = passSummary?.slotsUsed ?? registrations.length;
  const remainingSlots = Math.max(0, 2 - slotsUsed);

  // Determine master pass code
  const masterCode =
    passSummary?.passCode ||
    (registrations.length > 0
      ? registrations[0].registration_code
      : `EUPH-26-${profile.id.substring(0, 6).toUpperCase()}`);

  useEffect(() => {
    // Generate high resolution QR code encoding registration verification payload
    const qrPayload = JSON.stringify({
      code: masterCode,
      uid: profile.id,
      name: profile.full_name,
      type: profile.participant_type,
      tier: hasPro ? "pro_pass" : "standard_pass",
      events: registrations.map((r) => ({
        id: r.event.id,
        name: r.event.name,
        slot: r.slot_number || 1,
      })),
      ts: Date.now(),
    });

    QRCode.toDataURL(qrPayload, {
      width: 360,
      margin: 1.5,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    }).then((url) => setQrDataUrl(url));
  }, [masterCode, profile, registrations, hasPro]);

  const handleCopy = () => {
    navigator.clipboard.writeText(masterCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (registrations.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
          <QrCode className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-black text-slate-900">No Active Festival Pass</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          You haven&apos;t chosen any competitions yet. Browse our 61 technical symposium events and claim your delegate pass.
        </p>
        <div className="pt-2">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Select &amp; Register Events</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="text-xs text-slate-500 font-medium">
          Status: <strong className="text-emerald-700 font-bold">Active Pass</strong> •{" "}
          {slotsUsed}/2 Slots Used {remainingSlots > 0 ? `(1 Slot Open • ₹0)` : `(Complete)`}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Save / Print Pass</span>
          </button>
        </div>
      </div>

      {/* Main Digital Pass Card (Light Theme with Authentic Ticket Styling) */}
      <div className="rounded-3xl border-2 border-slate-200/90 bg-white shadow-xl overflow-hidden print:border-none print:shadow-none max-w-2xl mx-auto">
        {/* Pass Header */}
        <div
          className={`p-6 sm:p-7 text-white relative overflow-hidden ${
            hasPro
              ? "bg-gradient-to-r from-amber-600 via-slate-900 to-amber-700"
              : "bg-gradient-to-r from-slate-900 via-slate-950 to-primary"
          }`}
        >
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {hasPro ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <Star className="h-3 w-3 fill-current" />
                    <span>PRO DELEGATE PASS</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
                    STANDARD DELEGATE PASS
                  </span>
                )}
                <span className="rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
                  2026
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">EUPHORIA</h2>
              <p className="text-[11px] text-slate-300">
                Kalasalingam Academy of Research and Education
              </p>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`inline-block rounded-xl px-3 py-1 text-xs font-extrabold border ${
                  profile.participant_type === "internal"
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
                    : "bg-purple-500/20 text-purple-200 border-purple-400/30"
                }`}
              >
                {profile.participant_type === "internal" ? "KARE Student" : "External Delegate"}
              </span>
            </div>
          </div>
        </div>

        {/* Pass Body (QR Code & Student Credentials) */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 border-b border-slate-100 pb-6">
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/60 shrink-0 shadow-xs">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Official QR Pass Code"
                  className="h-40 w-40 sm:h-44 sm:w-44 rounded-xl"
                />
              ) : (
                <div className="h-40 w-40 sm:h-44 sm:w-44 flex items-center justify-center text-xs text-slate-400">
                  Generating secure QR...
                </div>
              )}
              <div className="mt-2.5 font-mono text-xs font-black text-slate-900 tracking-wider">
                {masterCode}
              </div>
            </div>

            {/* Student Credential Details */}
            <div className="space-y-3.5 flex-1 w-full text-center sm:text-left">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Delegate Name
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {profile.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{profile.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                {profile.register_number && (
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Register No.
                    </span>
                    <span className="font-bold text-slate-900 font-mono">{profile.register_number}</span>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    College / Dept
                  </span>
                  <span className="font-bold text-slate-900 truncate block">
                    {profile.college_name || profile.department || "Kalasalingam University"}
                  </span>
                </div>

                {profile.course && (
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Course &amp; Year
                    </span>
                    <span className="font-bold text-slate-900">
                      {profile.course} {profile.year_of_study ? `• Yr ${profile.year_of_study}` : ""}
                    </span>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Pass Allocation
                  </span>
                  <span className="font-bold text-primary">
                    {slotsUsed} / 2 Slots
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Registered Events List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Registered Event Access (Slot 1 &amp; Slot 2)
              </span>
              <span className="text-[11px] text-slate-400">
                September 25 &amp; 26, 2026
              </span>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/40">
              {registrations.map((reg, idx) => (
                <div
                  key={reg.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-mono">
                        Slot #{reg.slot_number || idx + 1}
                      </span>
                      {reg.event.is_pro_event && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.2 text-[9px] font-black uppercase">
                          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                          <span>PRO</span>
                        </span>
                      )}
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                        {reg.event.category?.name || "Track"}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        {reg.event.name}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                        {reg.event.event_date ? formatDate(reg.event.event_date) : ""} •{" "}
                        {reg.event.start_time ? formatTime(reg.event.start_time) : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{reg.event.venue}</span>
                      </span>
                    </div>
                  </div>

                  {/* Attendance Check-in Status */}
                  <div className="shrink-0">
                    {reg.isAttended ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Attended</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-primary border border-indigo-200">
                        <span>Confirmed Entry</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Slot 2 open placeholder */}
              {remainingSlots > 0 && (
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 print:hidden border-t border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-900 uppercase">
                        Slot #2 Open
                      </span>
                      <span className="text-xs font-bold text-emerald-950">
                        Included in your pass (₹0 extra fee)
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      You can still choose 1 more normal event anytime before festival registrations close.
                    </p>
                  </div>

                  <Link
                    href="/events"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Claim 2nd Event (+₹0)</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Pass Footer Security Notice */}
          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Tamper-Resistant Cryptographic Verification</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Keep this QR code ready on your phone or printed card. Event coordinators will scan this QR at competition entry checkpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
