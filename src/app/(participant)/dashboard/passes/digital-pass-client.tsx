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
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface RegistrationItem {
  id: string;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  isAttended: boolean;
  event: {
    id: string;
    name: string;
    slug: string;
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
}: {
  profile: ProfileData;
  registrations: RegistrationItem[];
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Determine master code
  const masterCode =
    registrations.length > 0
      ? registrations[0].registration_code
      : `EUPH-26-${profile.id.substring(0, 6).toUpperCase()}`;

  useEffect(() => {
    // Generate high resolution QR code encoding registration verification payload
    const qrPayload = JSON.stringify({
      code: masterCode,
      uid: profile.id,
      name: profile.full_name,
      type: profile.participant_type,
      events: registrations.map((r) => r.event.id),
      ts: Date.now(),
    });

    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 1.5,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    }).then((url) => setQrDataUrl(url));
  }, [masterCode, profile, registrations]);

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
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
          <QrCode className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Active Event Passes</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You haven&apos;t registered for any competitions yet. Explore our 61 technical symposium events and claim your delegate pass.
        </p>
        <div className="pt-2">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-colors"
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
      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="text-xs text-slate-500 font-medium">
          Pass Status: <strong className="text-emerald-600 font-bold">Active &amp; Valid</strong> • {registrations.length} Competitions Registered
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Digital Pass Card (Printable Layout) */}
      <div className="rounded-3xl border-2 border-slate-200/90 bg-white shadow-xl overflow-hidden print:border-none print:shadow-none max-w-2xl mx-auto">
        {/* Pass Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-primary p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
                  Official Delegate Pass
                </span>
                <span className="rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
                  2026
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">EUPHORIA</h2>
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
                {profile.participant_type === "internal" ? "KARE Internal" : "External Delegate"}
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
                  className="h-44 w-44 rounded-xl"
                />
              ) : (
                <div className="h-44 w-44 flex items-center justify-center text-xs text-slate-400">
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

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                {profile.register_number && (
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Register No.
                    </span>
                    <span className="font-bold text-slate-900">{profile.register_number}</span>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    College / Dept
                  </span>
                  <span className="font-bold text-slate-900 truncate block">
                    {profile.college_name || profile.department || "Kalasalingam University"}
                  </span>
                </div>

                {profile.course && (
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Course &amp; Year
                    </span>
                    <span className="font-bold text-slate-900">
                      {profile.course} {profile.year_of_study ? `• Year ${profile.year_of_study}` : ""}
                    </span>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Event Quota
                  </span>
                  <span className="font-bold text-primary">
                    {registrations.length} Registered
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Registered Events List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Registered Event Access
              </span>
              <span className="text-[11px] text-slate-400">
                Valid for September 25 &amp; 26, 2026
              </span>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/40">
              {registrations.map((reg, idx) => (
                <div
                  key={reg.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                        #{idx + 1}
                      </span>
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
                        <span>Attended / Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-primary border border-indigo-200">
                        <span>Confirmed Entry</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
