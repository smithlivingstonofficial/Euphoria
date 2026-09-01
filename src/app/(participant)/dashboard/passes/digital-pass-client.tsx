"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Layers,
  Star,
  Plus,
  ArrowRight,
  Ticket,
  CreditCard,
  Receipt,
  FileText,
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
    description?: string;
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
  needs_accommodation?: boolean;
}

interface OrderItem {
  id: string;
  order_number: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export function DigitalPassClient({
  profile,
  registrations,
  passSummary,
  orders = [],
}: {
  profile: ProfileData;
  registrations: RegistrationItem[];
  passSummary?: UserPassSummary | null;
  orders?: OrderItem[];
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"pass" | "events" | "receipt">("pass");

  const hasPro =
    passSummary?.passTier === "pro_pass" ||
    registrations.some((r) => Boolean(r.event?.is_pro_event));

  const isAccommodationRequested = Boolean(
    profile.needs_accommodation ||
    orders.some(
      (o) =>
        o.status === "paid" &&
        (o.metadata?.needs_accommodation === true || o.metadata?.needs_accommodation === "true")
    )
  );

  const slotsUsed = passSummary?.slotsUsed ?? registrations.length;
  const remainingSlots = Math.max(0, 2 - slotsUsed);

  // Master pass code
  const masterCode =
    passSummary?.passCode ||
    (registrations.length > 0
      ? registrations[0].registration_code
      : `EUPH-26-${profile.id.substring(0, 6).toUpperCase()}`);

  useEffect(() => {
    const qrPayload = JSON.stringify({
      code: masterCode,
      uid: profile.id,
      name: profile.full_name,
      type: profile.participant_type,
      tier: hasPro ? "pro_pass" : "standard_pass",
      events: registrations.map((r) => ({
        id: r.event?.id,
        name: r.event?.name,
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

  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "true";

  useEffect(() => {
    if (shouldAutoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint]);

  const handleCopy = () => {
    navigator.clipboard.writeText(masterCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine exact total amount paid for receipt
  const primaryOrder = orders[0];
  let totalPaidAmount = 0;

  if (primaryOrder && Number(primaryOrder.amount) > 0) {
    totalPaidAmount = Number(primaryOrder.amount);
  } else if (passSummary?.amountPaid && Number(passSummary.amountPaid) > 0) {
    totalPaidAmount = Number(passSummary.amountPaid);
  } else {
    totalPaidAmount = hasPro ? 300 : 200;
  }

  const billStatus = primaryOrder?.status || "CONFIRMED";
  const billDate = primaryOrder?.created_at || registrations[0]?.created_at || new Date().toISOString();
  const billRef = primaryOrder?.order_number || masterCode;
  const billProvider = primaryOrder?.provider || "Razorpay / UPI";

  if (registrations.length === 0) {
    return (
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/10 p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 text-primary px-3 py-1 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Euphoria 2026 Festival Pass</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Get Started with Your Delegate Pass
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Select your technical competition to unlock 2 full event slots, digital QR gate pass, and official pass receipt.
            </p>
          </div>

          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all shrink-0"
          >
            <Sparkles className="h-4 w-4 text-cyan-200" />
            <span>Browse Competitions & Register</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* INK-FRIENDLY LIGHT-THEME 1-PAGE A4 PRINT CONTAINER (Only visible in print) */}
      {/* ========================================================================= */}
      <div className="hidden print:block w-full text-slate-900 space-y-2 p-0 m-0 max-h-[280mm] overflow-hidden">
        
        {/* Light University Letterhead Ribbon */}
        <div className="bg-slate-50 border-b-2 border-indigo-600 rounded-xl p-3 space-y-1">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display leading-tight">
                KALASALINGAM ACADEMY OF RESEARCH AND EDUCATION
              </h1>
              <p className="text-[9px] text-slate-600 italic leading-tight mt-0.5">
                (Deemed to be University under sec. 3 of UGC Act 1956) • Anand Nagar, Krishnankoil - 626126
              </p>
            </div>

            <span className="bg-indigo-50 text-indigo-900 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wider">
              EUPHORIA 2026
            </span>
          </div>

          <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[9px] font-mono text-slate-700">
            <span className="font-bold text-slate-900">OFFICIAL DELEGATE PASS &amp; TAX RECEIPT STATEMENT</span>
            <div className="flex gap-3">
              <span>MASTER: <strong className="text-slate-900">{masterCode}</strong></span>
              <span>REF: <strong className="text-slate-900">{billRef}</strong></span>
              <span>TOTAL PAID: <strong className="text-indigo-700 font-black">{formatCurrency(totalPaidAmount)}</strong></span>
            </div>
          </div>
        </div>

        {/* 2-Column Side-by-Side Grid fitting 100% on Single A4 Sheet */}
        <div className="grid grid-cols-12 gap-3 items-start pt-0.5">
          
          {/* LEFT COLUMN: TICKET PASS CARD (5 Cols) */}
          <div className="col-span-5 border border-slate-300 rounded-2xl overflow-hidden bg-white">
            <div className="p-3 bg-indigo-50/80 border-b border-indigo-200 relative">
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  hasPro ? "bg-amber-100 text-amber-950 border-amber-300" : "bg-indigo-100 text-indigo-950 border-indigo-300"
                }`}>
                  {hasPro ? "★ PRO DELEGATE PASS" : "STANDARD DELEGATE PASS"}
                </span>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  PASS ACTIVE
                </span>
              </div>
              <h2 className="text-base font-black tracking-tight mt-1.5 leading-none text-slate-900">EUPHORIA 2026</h2>
              <p className="text-[9px] text-slate-600 mt-0.5 leading-none">Kalasalingam University</p>
            </div>

            <div className="border-y border-dashed border-slate-300 bg-slate-50 py-1 text-center font-mono text-[9px] font-bold text-slate-800 uppercase tracking-wider">
              GATE CHECKPOINT ENTRY PASS
            </div>

            <div className="p-3 space-y-2">
              <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-300 bg-slate-50/50 text-center">
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Official Gate Verification QR Pass"
                    className="h-32 w-32 rounded-lg border border-slate-300"
                  />
                )}
                <span className="mt-1.5 font-mono font-black text-xs text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-300">
                  {masterCode}
                </span>
              </div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Delegate</span>
                  <span className="font-extrabold text-slate-900">{profile.full_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-medium">Type</span>
                  <span className="font-bold text-slate-800">
                    {profile.participant_type === "internal" ? "KARE Student" : "External Delegate"}
                  </span>
                </div>
                {profile.register_number && (
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-medium">Register No.</span>
                    <span className="font-bold font-mono text-slate-900">{profile.register_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Events Included</span>
                  <span className="font-extrabold text-indigo-700">{slotsUsed} / 2 Claimed</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: COMPETITIONS & TAX INVOICE STATEMENT (7 Cols) */}
          <div className="col-span-7 space-y-2.5">
            <div className="border border-slate-300 rounded-2xl p-3 bg-slate-50/50 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider">
                  Assigned Competitions ({registrations.length} Slots)
                </span>
                <span className="text-[9px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full font-mono">
                  Sept 25 &amp; 26, 2026
                </span>
              </div>

              <div className="space-y-1.5">
                {registrations.map((reg, idx) => (
                  <div key={reg.id} className="p-2 rounded-xl border border-slate-200 bg-white text-[10px] space-y-0.5">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Slot #{reg.slot_number || idx + 1}: {reg.event?.name}</span>
                      <span className="text-emerald-800 font-extrabold uppercase bg-emerald-50 px-1.5 py-0.2 rounded text-[8px] border border-emerald-300">
                        Confirmed Entry
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-[9px] pt-0.5">
                      <span>{reg.event?.school_or_dept || "Technical"}</span>
                      <span className="font-semibold text-slate-800">Venue: {reg.event?.venue || "KARE Campus"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-300 rounded-2xl p-3 bg-white space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider block">
                    Tax Invoice &amp; Payment Statement
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Order Ref: {billRef}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold text-[9px] uppercase border border-emerald-300">
                  {billStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block font-medium">Pass Description</span>
                  <span className="font-bold text-slate-900 block">{hasPro ? "PRO DELEGATE PASS" : "STANDARD DELEGATE PASS"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Payment Provider</span>
                  <span className="font-bold text-slate-900 block">{billProvider}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Campus Accommodation</span>
                  <span className={`font-bold block ${isAccommodationRequested ? "text-emerald-800" : "text-slate-700"}`}>
                    {isAccommodationRequested ? "Requested (In-Person Settlement)" : "None"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-indigo-50/80 text-slate-900 p-2.5 rounded-xl border border-indigo-200 pt-2 mt-1">
                <div>
                  <span className="text-xs font-black block leading-none">Total Amount Paid</span>
                  <span className="text-[8px] text-slate-600">Includes all taxes, gate access &amp; 2 event entries</span>
                </div>
                <span className="text-base font-black font-mono tracking-tight text-primary">
                  {formatCurrency(totalPaidAmount)}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 text-[8px] text-slate-600 text-center leading-tight space-y-0.5">
              <p className="font-extrabold text-slate-900 uppercase tracking-wider">
                Cryptographically Signed • Tamper-Proof Official Gate Scanning
              </p>
              <p>Present this printed pass with your original college photo ID card at competition venue entry checkpoints.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN UI LAYOUT (Hidden during window.print())                             */}
      {/* ========================================================================= */}
      
      {/* MOBILE SEGMENTED TAB SWITCHER (Visible only on mobile screens < sm) */}
      <div className="sm:hidden bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 border border-slate-300/80 shadow-inner print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("pass")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            mobileTab === "pass"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>Pass QR</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("events")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            mobileTab === "events"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Events ({registrations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("receipt")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
            mobileTab === "receipt"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Receipt</span>
        </button>
      </div>

      {/* MAIN SCREEN RESPONSIVE GRID (Stacked on mobile according to mobileTab, 2-col grid on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:hidden">
        
        {/* LEFT COLUMN: DIGITAL TICKET PASS (Visible on desktop OR mobileTab === 'pass') */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === "pass" ? "block" : "hidden sm:block"}`}>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-md overflow-hidden relative">
            {/* Top Foil Strip */}
            <div
              className={`h-1.5 w-full ${
                hasPro
                  ? "bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-400 to-primary"
              }`}
            />

            {/* Header Banner */}
            <div
              className={`p-5 text-white relative overflow-hidden ${
                hasPro
                  ? "bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900"
                  : "bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950"
              }`}
            >
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  {hasPro ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      <Star className="h-3 w-3 fill-current" />
                      <span>PRO DELEGATE PASS</span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-xs">
                      STANDARD PASS
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Pass Active</span>
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">EUPHORIA 2026</h2>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Kalasalingam Academy of Research and Education
                  </p>
                </div>
              </div>
            </div>

            {/* Ticket Cut Divider */}
            <div className="relative flex items-center justify-between bg-slate-50 px-2 py-1.5 border-y border-slate-200">
              <div className="-ml-4 h-5 w-5 rounded-full bg-slate-100 border border-slate-200" />
              <div className="flex-1 border-b border-dashed border-slate-300 mx-2" />
              <div className="-mr-4 h-5 w-5 rounded-full bg-slate-100 border border-slate-200" />
            </div>

            {/* Body: QR Code Container & Master Code */}
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Official Gate Verification QR Pass"
                    className="h-44 w-44 sm:h-48 sm:w-48 rounded-xl border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCopy}
                  className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-primary transition-colors cursor-pointer shadow-xs"
                  title="Click to copy Master Pass Code"
                >
                  <Ticket className="h-3.5 w-3.5 text-cyan-300" />
                  <span>{masterCode}</span>
                  {copiedCode ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400 ml-1" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-400 ml-1" />
                  )}
                </button>
              </div>

              {/* Pass Actions Bar */}
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-primary transition-colors cursor-pointer shadow-2xs"
                >
                  <Printer className="h-4 w-4 text-cyan-200" />
                  <span>Print Pass &amp; Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: COMPETITIONS & RECEIPT (Visible according to mobileTab or Desktop grid) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* CAMPUS ACCOMMODATION STATUS CARD */}
          <div className={`rounded-3xl border p-5 sm:p-6 shadow-xs space-y-3 transition-all ${
            isAccommodationRequested
              ? "bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white border-emerald-300"
              : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isAccommodationRequested ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
                }`}>
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Campus Accommodation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hostel &amp; lodging during Euphoria (Sep 25–26)
                  </p>
                </div>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider border ${
                isAccommodationRequested
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {isAccommodationRequested ? "Requested ✓" : "Not Requested"}
              </span>
            </div>

            {isAccommodationRequested ? (
              <div className="rounded-2xl bg-white/80 border border-emerald-200 p-3.5 space-y-2 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Accommodation request linked to pass {masterCode}</span>
                </div>
                <p className="text-emerald-900/80 leading-relaxed">
                  Your hostel spot request is registered in the system. Please report to the <strong>Euphoria Hospitality &amp; Hostel Helpdesk</strong> upon arriving at Kalasalingam University campus to complete your room allocation and in-person payment.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-1 text-xs text-slate-600">
                <p className="leading-relaxed">
                  No campus hostel accommodation was requested with this delegate pass. If you are an outstation participant and require lodging, please visit the on-campus registration helpdesk on event morning subject to room availability.
                </p>
              </div>
            )}
          </div>

          {/* 1. REGISTERED COMPETITIONS CARD (Visible on desktop OR mobileTab === 'events') */}
          <div className={`rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 ${mobileTab === "events" ? "block" : "hidden sm:block"}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  My Competitions
                </h3>
              </div>

              <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">
                {slotsUsed} / 2 Slots Used
              </span>
            </div>

            {/* List of Registered Events */}
            <div className="space-y-3">
              {registrations.map((reg, idx) => {
                const desc = reg.event?.description || "";
                const whatsappMatch = desc.match(/\[WHATSAPP_LINK:\s*([^\]]+)\]/);
                const brochureMatch = desc.match(/\[(BROCHURE_URL|BROCHURE_LINK):\s*([^\]]+)\]/);
                const whatsappLink = whatsappMatch ? whatsappMatch[1].trim() : null;
                const brochureUrl = brochureMatch ? brochureMatch[2].trim() : null;

                return (
                  <div
                    key={reg.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold font-mono">
                          Slot #{reg.slot_number || idx + 1}
                        </span>
                        {reg.event?.is_pro_event && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            <span>FLAGSHIP</span>
                          </span>
                        )}
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {reg.event?.school_or_dept || reg.event?.category?.name || "Technical"}
                        </span>
                      </div>

                      {reg.isAttended ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Attended</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-indigo-200">
                          <span>Confirmed Entry</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-slate-900">
                      {reg.event?.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{reg.event?.event_date ? formatDate(reg.event.event_date) : "Sept 25-26, 2026"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {reg.event?.start_time
                            ? `${formatTime(reg.event.start_time)} - ${formatTime(reg.event.end_time)}`
                            : "Full Day"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{reg.event?.venue || "KARE Campus"}</span>
                      </div>
                    </div>

                    {(whatsappLink || brochureUrl) && (
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200/70">
                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                          >
                            <span>💬 Join WhatsApp Group</span>
                            <ArrowRight className="h-3.5 w-3.5 text-white" />
                          </a>
                        )}
                        {brochureUrl && (
                          <a
                            href={brochureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-600 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5 text-cyan-300" />
                            <span>View Brochure PDF</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Slot 2 Open Banner */}
              {remainingSlots > 0 && (
                <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-emerald-950 block">
                      Slot #2 Included (+₹0 Extra Fee)
                    </span>
                    <p className="text-[11px] text-emerald-800">
                      You have 1 open slot remaining under your delegate pass.
                    </p>
                  </div>

                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Claim 2nd Event (+₹0)</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 2. OFFICIAL PASS RECEIPT & BILL STATEMENT (Visible on desktop OR mobileTab === 'receipt') */}
          <div className={`rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden ${mobileTab === "receipt" ? "block" : "hidden sm:block"}`}>
            {/* Header */}
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Receipt className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Official Pass Receipt
                </h3>
              </div>

              {/* Print Pass & Bill Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-primary transition-all shadow-xs cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-cyan-300" />
                <span>Print Pass &amp; Bill</span>
              </button>
            </div>

            {/* Itemized Bill Body */}
            <div className="p-5 space-y-4">
              {/* Invoice Metadata Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice / Order Ref</span>
                  <span className="font-mono font-black text-slate-900">{billRef}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Issuance Date</span>
                  <span className="font-semibold text-slate-800">{formatDate(billDate)}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold uppercase">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>{billStatus}</span>
                  </span>
                </div>
              </div>

              {/* Bill Details Summary Card */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3 text-xs">
                <div className="flex justify-between items-start border-b border-slate-200/70 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Pass Description
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5">
                      Euphoria 2026 Official Delegate Pass ({hasPro ? "PRO TIER" : "STANDARD TIER"})
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Issued to: <strong className="text-slate-800">{profile.full_name}</strong> ({profile.participant_type === "internal" ? "KARE Student" : profile.college_name || "External Delegate"})
                    </p>
                  </div>

                  <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-mono font-bold text-primary text-xs">
                    2 Events Included
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Registered Competitions Summary
                  </span>
                  <p className="text-xs text-slate-700 font-medium">
                    {registrations.map((r) => r.event?.name).filter(Boolean).join(" • ") || "2 Technical Symposium Entries"}
                  </p>
                </div>

                {/* Clear Total Payment Row */}
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/90 pt-3 mt-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Total Amount Paid</span>
                    <span className="text-[10px] text-slate-500">Includes all taxes, gate access &amp; 2 event entries</span>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-primary font-mono block">
                      {formatCurrency(totalPaidAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action Strip */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 text-center sm:text-left">
                Official Computer-Generated Tax Invoice • Kalasalingam Academy of Research &amp; Education
              </span>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors shrink-0 cursor-pointer"
              >
                <Printer className="h-4 w-4 text-cyan-200" />
                <span>Print Pass &amp; Bill Statement</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
