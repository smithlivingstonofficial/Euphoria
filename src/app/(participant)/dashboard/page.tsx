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
import { getUserPassSummary } from "@/actions/passes";
import { DigitalPassClient } from "./passes/digital-pass-client";

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

  // Fetch pass summary, orders, and event registrations in parallel
  const [passSummaryRes, ordersRes, registrationsRes] = await Promise.all([
    getUserPassSummary(),
    supabase
      .from("orders")
      .select("*")
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

  const passData = passSummaryRes.data;
  const orders = ordersRes.data ?? [];

  const userRegistrations = (registrationsRes.data || []).map((r) => {
    const isAttended = Array.isArray(r.attendance)
      ? r.attendance.length > 0
      : Boolean(r.attendance);
    return {
      ...r,
      isAttended,
    };
  });

  const slotsUsed = passData?.slotsUsed ?? userRegistrations.length;
  const remainingSlots = Math.max(0, 2 - slotsUsed);
  const hasActivePass = Boolean(passData?.hasPass || userRegistrations.length > 0);

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
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
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
                <Link
                  href="/events"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition-all whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{hasActivePass ? "Claim 2nd Slot (+₹0)" : "Browse Events"}</span>
                </Link>
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
