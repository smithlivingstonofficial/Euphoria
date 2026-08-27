import { BulkUploadEvents } from "@/components/admin/bulk-upload-events";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function BulkUploadEventsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/events"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Bulk Event Upload &amp; Data Pipeline
              </h1>
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-primary border border-indigo-200">
                CSV / Excel Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Import full symposium schedules, venues, and categories directly into Supabase in seconds
            </p>
          </div>
        </div>
      </div>

      {/* Main Bulk Upload Tool */}
      <BulkUploadEvents initialPresetCount={61} />
    </div>
  );
}
