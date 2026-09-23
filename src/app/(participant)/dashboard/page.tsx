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
    redirect("/login");
  }

  // Fetch user profile, active pass, orders, and event registrations in parallel with selective column projections
  const [{ data: profile }, { data: passDataRow }, { data: ordersData }, { data: registrationsData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, gender, participant_type, register_number, college_name, department, course, year_of_study, mobile_number, needs_accommodation, is_profile_completed")
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

  // If profile is not complete or has missing data, redirect to complete-profile
  if (!profile || !profile.is_profile_completed || !isProfileComplete(profile)) {
    redirect("/complete-profile");
  }

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
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-primary">
      <Navbar
        user={{
          email: profile.email,
          participantType: profile.participant_type,
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pt-20 sm:pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 flex flex-col w-full">

          {/* 1. DIGITAL PASS & COMPETITIONS DASHBOARD (First on mobile, second on desktop) */}
          <div className="order-1 sm:order-2">
            <DigitalPassClient
              profile={profile}
              registrations={userRegistrations as any}
              passSummary={passData}
              orders={orders as any}
            />
          </div>

          {/* 2. USER PROFILE & LOGOUT CARD (Bottom on mobile, Top on desktop) */}
          <div className="order-2 sm:order-1 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-primary text-white font-black text-lg shadow-sm shadow-primary/20">
                {profile.full_name?.charAt(0).toUpperCase() || "E"}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                    {profile.full_name}
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${profile.participant_type === "internal"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-purple-50 text-purple-800 border-purple-200"
                      }`}
                  >
                    {profile.participant_type === "internal"
                      ? "KARE Student"
                      : profile.college_name || "External Delegate"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-medium truncate">
                  {profile.email}
                  {profile.register_number ? ` • Reg: ${profile.register_number}` : ""}
                  {profile.department ? ` • ${profile.department}` : ""}
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
