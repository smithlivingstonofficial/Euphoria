import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DigitalPassClient } from "../digital-pass-client";
import { ArrowLeft, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DynamicPassPage({
  params,
}: {
  params: { regCode: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/passes/${params.regCode}`);
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_profile_completed) {
    redirect("/complete-profile");
  }

  // Fetch registrations matching this registration code or user
  const { data: registrations } = await supabase
    .from("event_registrations")
    .select(`
      id,
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
    .or(`registration_code.eq.${params.regCode},user_id.eq.${user.id}`);

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
              href="/dashboard/passes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to All Passes</span>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Digital Pass • {params.regCode}
              </h1>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors shrink-0"
          >
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Pass Client */}
        <DigitalPassClient
          profile={profile}
          registrations={userRegistrations as any}
        />
      </main>

      <Footer />
    </div>
  );
}
