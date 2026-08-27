import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserPassSummary } from "@/actions/passes";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DigitalPassClient } from "./digital-pass-client";
import {
  Sparkles,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Building,
  User,
  ExternalLink,
} from "lucide-react";

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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar
        user={{
          email: profile.email,
          participantType: profile.participant_type,
        }}
      />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Official Digital Festival Pass
              </h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Present this pass with QR code at competition venue entrance checkpoints for attendance verification.
            </p>
          </div>

          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Browse Catalog</span>
          </Link>
        </div>

        {/* Digital Pass Card Client Component */}
        <DigitalPassClient
          profile={profile}
          registrations={userRegistrations as any}
          passSummary={passSummaryRes.data}
        />
      </main>

      <Footer />
    </div>
  );
}
