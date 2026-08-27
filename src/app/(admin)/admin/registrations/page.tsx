import { getAllRegistrationsAdmin, getAllEventsAdmin } from "@/actions/admin";
import { MasterRegistrationsClient } from "./registrations-client";
import { Users, Sparkles, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const [{ registrations }, { events }] = await Promise.all([
    getAllRegistrationsAdmin(),
    getAllEventsAdmin(),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-primary shadow-2xs">
            <Users className="h-3.5 w-3.5" />
            <span>Master Registration &amp; Pass Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Participant Passes &amp; Attendance Directory
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Live database of all student delegate passes, event selections, attendance check-ins, and university-wide participation metrics.
          </p>
        </div>
      </div>

      <MasterRegistrationsClient
        initialRegistrations={(registrations || []).map((r: any) => ({
          ...r,
          user: Array.isArray(r.user) ? r.user[0] : r.user,
          event: Array.isArray(r.event) ? r.event[0] : r.event,
        }))}
        allEvents={(events || []) as any}
      />
    </div>
  );
}
