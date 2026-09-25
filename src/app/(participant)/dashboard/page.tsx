import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  Plus,
  Mail,
  GraduationCap,
  Printer,
  Copy,
  LogOut,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";
import { DigitalPassClient } from "./passes/digital-pass-client";

import { isProfileComplete } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function ParticipantDashboardPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  // Fetch user profile, active pass, orders, and event registrations in parallel
  const [{ data: profile }, { data: passDataRow }, { data: ordersData }, { data: registrationsData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("delegate_passes")
        .select("id, pass_code, pass_tier, amount_paid, total_slots, slots_used, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id, order_number, status, amount, currency, provider, created_at, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("event_registrations")
        .select(`
          id,
          slot_number,
          registration_code,
          status,
          payment_status,
          created_at,
          attendance (
            id,
            scanned_at,
            scan_method
          ),
          event:events (
            id,
            name,
            slug,
            is_pro_event,
            school_or_dept,
            venue,
            event_date,
            start_time,
            end_time,
            category:event_categories (
              id,
              name,
              slug
            )
          )
        `)
        .eq("user_id", user.id)
        .order("slot_number", { ascending: true }),
    ]);

  const userEmail = (user.email || "").toLowerCase().trim();
  const isKlu = userEmail.endsWith("@klu.ac.in");

  // Construct reliable active profile with graceful fallbacks
  const effectiveProfile = {
    id: user.id,
    email: profile?.email || user.email || "",
    full_name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      userEmail.split("@")[0] ||
      "Participant",
    participant_type: (profile?.participant_type || (isKlu ? "internal" : "external")) as "internal" | "external",
    register_number: profile?.register_number || (isKlu ? userEmail.split("@")[0] : null),
    college_name: profile?.college_name || (isKlu ? "Kalasalingam Academy of Research and Education" : null),
    school: profile?.school || (isKlu ? "SoC" : null),
    department: profile?.department || null,
    course: profile?.course || null,
    year_of_study: profile?.year_of_study || 1,
    mobile_number: profile?.mobile_number || null,
    gender: profile?.gender || null,
    needs_accommodation: Boolean(profile?.needs_accommodation),
    is_profile_completed: Boolean(profile?.is_profile_completed),
  };

  const isComplete = Boolean(
    profile && profile.is_profile_completed && isProfileComplete(profile)
  );

  const orders = ordersData ?? [];

  const userRegistrations = (registrationsData || []).map((r: any) => {
    const isAttended = Array.isArray(r.attendance)
      ? r.attendance.length > 0
      : Boolean(r.attendance);
    return {
      ...r,
      isAttended,
    };
  });

  const slotsUsed = passDataRow?.slots_used ?? userRegistrations.length;
  const totalSlots = passDataRow?.total_slots || 2;
  const remainingSlots = Math.max(0, totalSlots - slotsUsed);
  const hasActivePass = Boolean(passDataRow || userRegistrations.length > 0);

  const passData = passDataRow
    ? {
        hasPass: true,
        passId: passDataRow.id,
        passCode: passDataRow.pass_code,
        passTier: passDataRow.pass_tier,
        amountPaid: passDataRow.amount_paid,
        totalSlots,
        slotsUsed,
        remainingSlots,
        passStatus: passDataRow.status,
        registeredEvents: userRegistrations.map((r: any) => ({
          registrationId: r.id,
          slotNumber: r.slot_number || 1,
          eventId: r.event?.id || "",
          name: r.event?.name || "Event",
          slug: r.event?.slug || "",
          isProEvent: Boolean(r.event?.is_pro_event),
          schoolOrDept: r.event?.school_or_dept || "",
          venue: r.event?.venue || "",
          eventDate: r.event?.event_date || "",
          startTime: r.event?.start_time || "",
          endTime: r.event?.end_time || "",
          status: r.status,
          paymentStatus: r.payment_status,
          createdAt: r.created_at,
        })),
      }
    : userRegistrations.length > 0
    ? {
        hasPass: true,
        passId: userRegistrations[0].id,
        passCode: userRegistrations[0].registration_code || `EUPH-26-${user.id.substring(0, 6).toUpperCase()}`,
        passTier: userRegistrations.some((r: any) => r.event?.is_pro_event) ? "pro_pass" : "standard_pass",
        amountPaid: userRegistrations.some((r: any) => r.event?.is_pro_event) ? 300 : 200,
        totalSlots: 2,
        slotsUsed: userRegistrations.length,
        remainingSlots: Math.max(0, 2 - userRegistrations.length),
        passStatus: "active",
        registeredEvents: userRegistrations.map((r: any) => ({
          registrationId: r.id,
          slotNumber: r.slot_number || 1,
          eventId: r.event?.id || "",
          name: r.event?.name || "Event",
          slug: r.event?.slug || "",
          isProEvent: Boolean(r.event?.is_pro_event),
          schoolOrDept: r.event?.school_or_dept || "",
          venue: r.event?.venue || "",
          eventDate: r.event?.event_date || "",
          startTime: r.event?.start_time || "",
          endTime: r.event?.end_time || "",
          status: r.status,
          paymentStatus: r.payment_status,
          createdAt: r.created_at,
        })),
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-primary">
      <Navbar
        user={{
          email: effectiveProfile.email,
          participantType: effectiveProfile.participant_type,
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pt-20 sm:pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 flex flex-col w-full">

          {/* Incomplete Profile Alert Banner (Polite notification that doesn't block dashboard access) */}
          {!isComplete && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-950">Complete Your Profile Details</h2>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your profile has missing or unconfirmed details. Complete your profile to ensure seamless entry verification and event credentials.
                  </p>
                </div>
              </div>
              <Link
                href="/complete-profile?redirect=/dashboard"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all whitespace-nowrap shrink-0"
              >
                <span>Complete Profile</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* 1. DIGITAL PASS & COMPETITIONS DASHBOARD (First on mobile, second on desktop) */}
          <div className="order-1 sm:order-2">
            <DigitalPassClient
              profile={effectiveProfile}
              registrations={userRegistrations as any}
              passSummary={passData}
              orders={orders as any}
            />
          </div>

          {/* 2. USER PROFILE & LOGOUT CARD (Bottom on mobile, Top on desktop) */}
          <div className="order-2 sm:order-1 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-primary text-white font-black text-lg shadow-sm shadow-primary/20">
                {effectiveProfile.full_name?.charAt(0).toUpperCase() || "E"}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                    {effectiveProfile.full_name}
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${effectiveProfile.participant_type === "internal"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-purple-50 text-purple-800 border-purple-200"
                      }`}
                  >
                    {effectiveProfile.participant_type === "internal"
                      ? "KARE Student"
                      : effectiveProfile.college_name || "External Delegate"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-medium truncate">
                  {effectiveProfile.email}
                  {effectiveProfile.register_number ? ` • Reg: ${effectiveProfile.register_number}` : ""}
                  {effectiveProfile.department ? ` • ${effectiveProfile.department}` : ""}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto pt-1 sm:pt-0">
              {remainingSlots > 0 && (
                <>
                  <Link
                    href="/events"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition-all whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{hasActivePass ? "Claim 2nd Slot (+₹0)" : "Browse Events"}</span>
                  </Link>

                </>
              )}

              <LogoutButton variant="outline" className="flex-1 sm:flex-none py-2 px-3 text-xs font-bold whitespace-nowrap rounded-xl" />
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
