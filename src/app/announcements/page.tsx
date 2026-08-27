import { getPublicAnnouncements } from "@/actions/events";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Megaphone,
  Calendar,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const { announcements } = await getPublicAnnouncements();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="border-b border-slate-200 bg-white py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-0.5 text-xs font-bold text-primary">
            <Megaphone className="h-3.5 w-3.5" />
            <span>Official Broadcasts • Euphoria 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Announcements &amp; Live Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Important updates, schedule notifications, and guidelines from the symposium central committee.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-5">
        {announcements.length > 0 ? (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-primary border border-indigo-100">
                  {ann.event?.name ? `Event: ${ann.event.name}` : "General Broadcast"}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {formatDate(ann.created_at)}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900">
                {ann.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {ann.content}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Megaphone className="h-6 w-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">No New Announcements Yet</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Live notifications will be broadcast here as the symposium dates approach. Stay tuned!
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
