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
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

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

  // Fetch real user registrations with joined event data
  const { data: registrations } = await supabase
    .from("event_registrations")
    .select(`
      id,
      registration_code,
      status,
      payment_status,
      created_at,
      event:events (
        id,
        name,
        slug,
        school_or_dept,
        venue,
        event_date,
        start_time,
        end_time,
        registration_fee,
        category:event_categories (
          name
        )
      )
    `)
    .eq("user_id", user.id);

  const userRegistrations = registrations || [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-slate-900">
      <Navbar
        user={{
          email: profile.email,
          participantType: profile.participant_type,
        }}
      />

      {/* Top Banner */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">
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
                    : profile.college_name || "External Participant"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.email} • {profile.department} (Year {profile.year_of_study})
                {profile.register_number && ` • Reg: ${profile.register_number}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/passes"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors"
              >
                <QrCode className="h-4 w-4" />
                <span>My Festival Pass</span>
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add More Events</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <main className="flex-1 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-medium text-slate-500">Registered Events</div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
                {userRegistrations.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {userRegistrations.length > 0
                  ? "All passes active"
                  : "No events registered yet"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-medium text-slate-500">Attendance Status</div>
              <div className="text-2xl font-bold text-primary font-mono mt-0.5">
                0 / {userRegistrations.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Scans open on event day</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-medium text-slate-500">Academic Affiliation</div>
              <div className="text-sm font-bold text-slate-900 truncate mt-1">
                {profile.participant_type === "internal"
                  ? "Kalasalingam Academy (KARE)"
                  : profile.college_name || "External University"}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Verified Google Identity
              </div>
            </div>
          </div>

          {/* Registrations List */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">My Event Registrations</h2>
              <span className="text-xs text-slate-500">Tap pass to view QR check-in code</span>
            </div>

            {userRegistrations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {userRegistrations.map((reg) => {
                  const evt = Array.isArray(reg.event) ? reg.event[0] : reg.event;
                  const cat = evt?.category ? (Array.isArray(evt.category) ? evt.category[0] : evt.category) : null;
                  return (
                    <div
                      key={reg.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {cat?.name || "Technical Track"}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {reg.registration_code}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="capitalize">{reg.status}</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">
                          {evt?.name || "Euphoria Event"}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                          {evt?.event_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>{formatDate(evt.event_date)}</span>
                            </div>
                          )}
                          {evt?.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {formatTime(evt.start_time)} - {formatTime(evt.end_time)}
                              </span>
                            </div>
                          )}
                          {evt?.venue && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">{evt.venue}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/dashboard/passes/${reg.registration_code}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
                        >
                          <QrCode className="h-4 w-4" />
                          <span>View QR Pass</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No events registered yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Browse the 61 official competitions across all 14 KARE schools and claim your all-access pass.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/#events"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-colors shadow-xs"
                  >
                    <span>Browse All 61 Competitions</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
