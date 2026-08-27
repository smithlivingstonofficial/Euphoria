import { getFestivalSchedule } from "@/actions/events";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Building,
  Layers,
} from "lucide-react";
import { formatTime, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const { day1, day2, totalCount } = await getFestivalSchedule();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="border-b border-slate-200 bg-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-0.5 text-xs font-bold text-primary">
            <Calendar className="h-3.5 w-3.5" />
            <span>Master Timeline • Euphoria 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Official Festival Schedule &amp; Timings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Complete schedule of all {totalCount} technical tracks, hackathons, presentations, and competitions across Day 1 (Sept 25) and Day 2 (Sept 26).
          </p>
        </div>
      </section>

      {/* Schedule Tabs and Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-10">
        {/* Day 1 Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-sm shadow-xs">
              01
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Day 1 • Friday, September 25, 2026
              </h2>
              <p className="text-xs text-slate-500">
                Inauguration, 24-Hour Hackathons Launch &amp; Day 1 Technical Events ({day1.length} Events)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {day1.map((evt) => (
              <div
                key={evt.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-primary border border-indigo-100">
                      {evt.category?.name || "Technical"}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {formatTime(evt.start_time)} - {formatTime(evt.end_time)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                    {evt.name}
                  </h3>

                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {evt.school_or_dept}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-[11px] truncate max-w-[170px]">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.venue}</span>
                  </div>
                  <Link
                    href={`/events?q=${encodeURIComponent(evt.name)}`}
                    className="font-bold text-primary hover:underline text-[11px]"
                  >
                    View &amp; Register &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day 2 Section */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-sm shadow-xs">
              02
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Day 2 • Saturday, September 26, 2026
              </h2>
              <p className="text-xs text-slate-500">
                Hackathons Finale, Technical Presentations, Finals &amp; Grand Valedictory ({day2.length} Events)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {day2.map((evt) => (
              <div
                key={evt.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100">
                      {evt.category?.name || "Technical"}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {formatTime(evt.start_time)} - {formatTime(evt.end_time)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                    {evt.name}
                  </h3>

                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {evt.school_or_dept}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-[11px] truncate max-w-[170px]">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.venue}</span>
                  </div>
                  <Link
                    href={`/events?q=${encodeURIComponent(evt.name)}`}
                    className="font-bold text-primary hover:underline text-[11px]"
                  >
                    View &amp; Register &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
