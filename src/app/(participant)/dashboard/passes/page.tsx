import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserPassSummary } from "@/actions/passes";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DigitalPassClient } from "./digital-pass-client";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UserPassesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/passes");
  }

  // Fetch profile and pass summary in parallel
  const [{ data: profile }, passSummaryRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    getUserPassSummary(),
  ]);

  if (!profile || !profile.is_profile_completed) {
    redirect("/complete-profile");
  }

  // Fetch user registrations with joined event and attendance data
  const { data: registrations } = await supabase
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
    .order("slot_number", { ascending: true });

  const userRegistrations = (registrations || []).map((r) => {
    const isAttended = Array.isArray(r.attendance)
      ? r.attendance.length > 0
      : Boolean(r.attendance);
    return {
      ...r,
      isAttended,
    };
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-primary">
      <Navbar
        user={{
          email: profile.email,
          participantType: profile.participant_type,
        }}
      />

      {/* Main Container (Light Theme) */}
      <main className="flex-1 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Back to Dashboard Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>

            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              EUPHORIA • 2026
            </span>
          </div>

          {/* Interactive Digital Pass Client */}
          <DigitalPassClient
            profile={profile}
            registrations={userRegistrations as any}
            passSummary={passSummaryRes.data}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
