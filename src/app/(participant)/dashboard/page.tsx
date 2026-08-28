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
  Ticket,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { LogoutButton } from "@/components/auth/logout-button";
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
  const passCode =
    passData?.passCode ||
    (registeredEvents[0]?.registrationId
      ? `EUPH-26-${user.id.substring(0, 6).toUpperCase()}`
      : null);

  const slot1 = registeredEvents.find((e) => e.slotNumber === 1) || registeredEvents[0];
  const slot2 =
    registeredEvents.find((e) => e.slotNumber === 2) ||
    (registeredEvents.length > 1 ? registeredEvents[1] : null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-primary">
      <Navbar
        user={{
          email: profile.email,
          participantType: profile.participant_type,
        }}
      />

      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-7 w-full">
          {/* 1. USER PROFILE HEADER CARD (Light Theme) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-primary text-white font-black text-lg sm:text-xl shadow-md shadow-primary/20">
                {profile.full_name?.charAt(0).toUpperCase() || "E"}
              </div>

              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                    {profile.full_name}
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      profile.participant_type === "internal"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-purple-50 text-purple-800 border-purple-200"
                    }`}
                  >
                    {profile.participant_type === "internal"
                      ? "KARE Student"
                      : profile.college_name || "External Delegate"}
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                  {profile.email}
                  {profile.register_number ? ` • Reg: ${profile.register_number}` : ""}
                  {profile.department ? ` • ${profile.department}` : ""}
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 flex-wrap sm:flex-nowrap">
              <Link
                href="/dashboard/passes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary active:scale-[0.98] transition-all"
              >
                <QrCode className="h-4 w-4" />
                <span>My QR Pass</span>
              </Link>

              {remainingSlots > 0 ? (
                <Link
                  href="/events"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
                >
                  <Layers className="h-4 w-4 text-slate-500" />
                  <span>{hasActivePass ? "Claim 2nd Event (+₹0)" : "Browse Events"}</span>
                </Link>
              ) : (
                <Link
                  href="/events"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
                >
                  <Layers className="h-4 w-4 text-slate-500" />
                  <span>Browse Events</span>
                </Link>
              )}

              <LogoutButton variant="outline" className="w-full sm:w-auto py-2.5" />
            </div>
          </div>

          {/* 2. FESTIVAL PASS VIP CARD (Light Theme) */}
          {hasActivePass ? (
            <div
              className={`rounded-3xl border-2 p-5 sm:p-7 relative overflow-hidden shadow-sm transition-all ${
                isProPass
                  ? "border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 shadow-amber-500/5"
                  : "border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/30 shadow-indigo-500/5"
              }`}
            >
              <div className="space-y-4 sm:space-y-5">
                {/* Top Badge Strip */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isProPass ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-slate-950 px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-xs">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>PRO FESTIVAL PASS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-xs">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>STANDARD FESTIVAL PASS</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>PASS ACTIVE</span>
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    EUPHORIA 2026 • KARE
                  </span>
                </div>

                {/* Main Pass Title & Master Code */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Official University Delegate Pass
                    </h2>
                    <p className="text-xs text-slate-500">
                      Valid for verified entry at event venue checkpoints on September 25 &amp; 26, 2026.
                    </p>
                  </div>

                  {/* Pass Code Pill */}
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 self-start sm:self-auto shadow-2xs">
                    <div className="text-left">
                      <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                        Master Pass Code
                      </div>
                      <div className="font-mono font-black text-sm text-slate-900 tracking-wider">
                        {passCode}
                      </div>
                    </div>
                    <Ticket className="h-5 w-5 text-primary ml-1 shrink-0" />
                  </div>
                </div>

                {/* Quota Progress Bar */}
                <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      Pass Quota:{" "}
                      <strong className="text-slate-900 font-extrabold">
                        {slotsUsed} of 2 Slots Claimed
                      </strong>
                    </span>
                    <span className="font-mono text-slate-500 text-[11px] font-semibold">
                      {remainingSlots > 0 ? `1 Slot Open (+₹0)` : `Pass Complete (2/2)`}
                    </span>
                  </div>

                  {/* 2-Segment Progress Bar */}
                  <div className="grid grid-cols-2 gap-2 h-2.5">
                    <div
                      className={`rounded-full transition-all ${
                        slot1 ? "bg-emerald-500 shadow-xs" : "bg-slate-100"
                      }`}
                    />
                    <div
                      className={`rounded-full transition-all ${
                        slot2
                          ? "bg-emerald-500 shadow-xs"
                          : slot1
                          ? "bg-amber-400/80 border border-amber-400 animate-pulse"
                          : "bg-slate-100"
                      }`}
                    />
                  </div>
                </div>

                {/* Card Footer CTA */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200/70">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Cryptographically signed • Tamper-proof gate scanning</span>
                  </div>

                  <Link
                    href="/dashboard/passes"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary active:scale-[0.99] transition-all shrink-0"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Open QR Pass for Entry</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* NO PASS BANNER (Light Theme) */
            <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/50 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-primary px-3 py-0.5 text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Get Started with Euphoria 2026</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Claim Your Festival Pass
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Register for up to 2 technical competitions from across 14 KARE academic schools. Select your first event to unlock your digital pass.
                </p>
              </div>

              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                <span>Browse Competitions &amp; Register</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* 3. EVENT ALLOCATIONS (SLOT 1 & SLOT 2) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-primary">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Event Allocations (2 Slots Max)
                </h2>
              </div>

              <span className="text-xs font-bold text-slate-500 font-mono">
                {slotsUsed} / 2 Confirmed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SLOT #1 CARD */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                      Slot #1
                    </span>
                    {slot1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Confirmed on Pass</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        Unclaimed
                      </span>
                    )}
                  </div>

                  {slot1 ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {slot1.isProEvent && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            <span>PRO EVENT</span>
                          </span>
                        )}
                        <span className="rounded bg-indigo-50 text-primary border border-indigo-200 px-2 py-0.5 text-[10px] font-bold">
                          {slot1.schoolOrDept || "Technical Event"}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {slot1.name}
                      </h3>

                      <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{slot1.eventDate ? formatDate(slot1.eventDate) : "Sept 25-26, 2026"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {slot1.startTime
                              ? `${formatTime(slot1.startTime)} - ${formatTime(slot1.endTime)}`
                              : "Full Day"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{slot1.venue || "KARE Campus"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Sparkles className="h-5 w-5" />
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
                className={`rounded-3xl border p-5 shadow-xs flex flex-col justify-between space-y-4 transition-colors ${
                  slot2
                    ? "border-slate-200 bg-white"
                    : slot1
                    ? "border-emerald-300 bg-gradient-to-b from-emerald-50/40 via-white to-white"
                    : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                      Slot #2
                    </span>
                    {slot2 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Confirmed on Pass</span>
                      </span>
                    ) : slot1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900 border border-emerald-300 animate-pulse">
                        <Gift className="h-3 w-3 text-emerald-600" />
                        <span>CLAIM FOR ₹0</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        Pending Slot #1
                      </span>
                    )}
                  </div>

                  {slot2 ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {slot2.isProEvent && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            <span>PRO EVENT</span>
                          </span>
                        )}
                        <span className="rounded bg-indigo-50 text-primary border border-indigo-200 px-2 py-0.5 text-[10px] font-bold">
                          {slot2.schoolOrDept || "Technical Event"}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {slot2.name}
                      </h3>

                      <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{slot2.eventDate ? formatDate(slot2.eventDate) : "Sept 25-26, 2026"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {slot2.startTime
                              ? `${formatTime(slot2.startTime)} - ${formatTime(slot2.endTime)}`
                              : "Full Day"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{slot2.venue || "KARE Campus"}</span>
                        </div>
                      </div>
                    </div>
                  ) : slot1 ? (
                    <div className="py-4 space-y-2 text-left">
                      <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                        <Gift className="h-4 w-4 text-emerald-600" />
                        <span>Included in Your Active Pass!</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        You have already confirmed your Festival Pass. Claim your 2nd event slot anytime at <strong>₹0 extra fee</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Sparkles className="h-5 w-5" />
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

          {/* 4. PASS ORDERS & RECEIPTS */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">
                  Pass Orders &amp; Receipts
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {orders.length} {orders.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            {orders.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {order.order_number}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>{order.status}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Issued on {formatDate(order.created_at)} • Provider: {order.provider}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900 font-mono">
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
