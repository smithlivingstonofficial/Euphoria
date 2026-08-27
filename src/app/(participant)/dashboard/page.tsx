import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Plus,
  ShieldCheck,
  Building,
  Star,
  Gift,
  CreditCard,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { getUserPassSummary } from "@/actions/passes";
import { formatCurrency, formatDate, formatTime, formatEventTimeRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParticipantDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // If profile is not complete, redirect to complete-profile
  if (!profile || !profile.is_profile_completed) {
    redirect("/complete-profile");
  }

  // Fetch pass summary and orders in parallel
  const [passSummaryRes, ordersRes] = await Promise.all([
    getUserPassSummary(),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const passData = passSummaryRes.data;
  const hasActivePass = Boolean(passData?.hasPass);
  const slotsUsed = passData?.slotsUsed ?? 0;
  const remainingSlots = passData?.remainingSlots ?? 2;
  const registeredEvents = passData?.registeredEvents ?? [];
  const orders = ordersRes.data ?? [];

  const isProPass = passData?.passTier === "pro_pass";
  const passCode = passData?.passCode || (registeredEvents[0]?.registrationId ? `EUPH-26-${user.id.substring(0, 6).toUpperCase()}` : null);

  const slot1 = registeredEvents.find((e) => e.slotNumber === 1) || registeredEvents[0];
  const slot2 = registeredEvents.find((e) => e.slotNumber === 2) || (registeredEvents.length > 1 ? registeredEvents[1] : null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar
        user={{
          email: profile.email,
          participantType: profile.participant_type,
        }}
      />

      {/* Top Welcome Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Welcome, {profile.full_name}
                </h1>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                    profile.participant_type === "internal"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  {profile.participant_type === "internal"
                    ? `KARE (${profile.school || "SCSE"})`
                    : profile.college_name || "External Delegate"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.email} • {profile.department} (Year {profile.year_of_study})
                {profile.register_number && ` • Reg: ${profile.register_number}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hasActivePass && (
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                  <span>My Festival Pass</span>
                </Link>
              )}
              {remainingSlots > 0 ? (
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {hasActivePass ? "Claim 2nd Event (+₹0)" : "Choose Events"}
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Main Content */}
      <main className="flex-1 py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-7">
          {/* FESTIVAL PASS HERO CARD */}
          {hasActivePass ? (
            <div
              className={`rounded-3xl border p-6 sm:p-7 shadow-sm relative overflow-hidden ${
                isProPass
                  ? "bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border-amber-300"
                  : "bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white border-slate-800"
              }`}
            >
              {/* Background ambient light */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isProPass ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-slate-950 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>PRO FESTIVAL PASS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>STANDARD FESTIVAL PASS</span>
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                        isProPass
                          ? "bg-white text-emerald-800 border-emerald-300"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>PASS ACTIVE</span>
                    </span>
                  </div>

                  <div>
                    <h2
                      className={`text-xl sm:text-2xl font-black tracking-tight ${
                        isProPass ? "text-slate-900" : "text-white"
                      }`}
                    >
                      Euphoria 2026 Official Delegate Pass
                    </h2>
                    <p
                      className={`text-xs mt-0.5 ${
                        isProPass ? "text-slate-600" : "text-slate-300"
                      }`}
                    >
                      Master Pass Code:{" "}
                      <strong
                        className={`font-mono font-bold tracking-wider ${
                          isProPass ? "text-slate-900" : "text-white"
                        }`}
                      >
                        {passCode}
                      </strong>{" "}
                      • Quota: {slotsUsed}/2 Events Claimed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href="/dashboard/passes"
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold shadow-md transition-all ${
                      isProPass
                        ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                        : "bg-white text-slate-950 hover:bg-slate-100 shadow-white/10"
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Open QR Pass for Entry</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* NO PASS YET BANNER */
            <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 rounded-md bg-indigo-100 text-primary px-2 py-0.5 text-[10px] font-bold">
                  <span>GET STARTED</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Claim Your Euphoria 2026 Festival Pass
                </h2>
                <p className="text-xs text-slate-600 max-w-xl">
                  Choose up to 2 technical competitions from across 14 KARE schools. Select 1 Pro event + 1 Normal event for ₹300, or 2 Normal events for ₹200.
                </p>
              </div>

              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-colors shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                <span>Browse Competitions &amp; Register</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* 2-SLOT PROGRESS VISUALIZER */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                Your Festival Event Allocations (Max 2 Slots)
              </h2>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {slotsUsed} / 2 Slots Booked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SLOT #1 CARD */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      Slot #1 Allocation
                    </span>
                    {slot1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Confirmed on Pass</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Unclaimed
                      </span>
                    )}
                  </div>

                  {slot1 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        {slot1.isProEvent && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-black uppercase">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>PRO</span>
                          </span>
                        )}
                        <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                          {slot1.schoolOrDept || "Technical Event"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {slot1.name}
                      </h3>
                      <div className="space-y-1 text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{slot1.eventDate ? formatDate(slot1.eventDate) : "Sept 25-26, 2026"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {slot1.startTime
                              ? `${formatTime(slot1.startTime)} - ${formatTime(slot1.endTime)}`
                              : "Full Day"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{slot1.venue || "KARE Campus"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-slate-500">
                        Slot 1 is open. Select any Pro or Normal competition.
                      </p>
                    </div>
                  )}
                </div>

                {!slot1 && (
                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-primary transition-colors"
                  >
                    <span>Choose Event #1</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {/* SLOT #2 CARD */}
              <div
                className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between space-y-4 ${
                  slot2
                    ? "border-slate-200 bg-white"
                    : slot1
                    ? "border-emerald-300 bg-gradient-to-b from-emerald-50/40 via-white to-white"
                    : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      Slot #2 Allocation
                    </span>
                    {slot2 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Confirmed on Pass</span>
                      </span>
                    ) : slot1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 border border-emerald-300 animate-pulse">
                        <Gift className="h-3 w-3 text-emerald-600" />
                        <span>CLAIM FOR ₹0</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Pending Slot #1
                      </span>
                    )}
                  </div>

                  {slot2 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        {slot2.isProEvent && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-black uppercase">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>PRO</span>
                          </span>
                        )}
                        <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                          {slot2.schoolOrDept || "Technical Event"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {slot2.name}
                      </h3>
                      <div className="space-y-1 text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{slot2.eventDate ? formatDate(slot2.eventDate) : "Sept 25-26, 2026"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {slot2.startTime
                              ? `${formatTime(slot2.startTime)} - ${formatTime(slot2.endTime)}`
                              : "Full Day"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{slot2.venue || "KARE Campus"}</span>
                        </div>
                      </div>
                    </div>
                  ) : slot1 ? (
                    <div className="py-4 space-y-2 text-left">
                      <div className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-900">
                        <Gift className="h-4 w-4 text-emerald-600" />
                        <span>Included in Your Active Pass!</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        You have already paid for your Festival Pass. Claim your 2nd event slot anytime at <strong>₹0 extra fee</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-slate-500">
                        Select your 1st event first to unlock slot 2.
                      </p>
                    </div>
                  )}
                </div>

                {!slot2 && slot1 && (
                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Claim 2nd Event (+₹0)</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* 3. ORDER & TRANSACTION HISTORY */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">
                  Pass Orders &amp; Receipts
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                {orders.length} {orders.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            {orders.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {order.order_number}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{order.status}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Created {formatDate(order.created_at)} • Provider: {order.provider}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(Number(order.amount))}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {order.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No payment transactions recorded yet.
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
