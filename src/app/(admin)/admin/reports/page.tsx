import { getAllRegistrationsAdmin, getAllEventsAdmin } from "@/actions/admin";
import { ReportsExporter } from "@/components/admin/reports-exporter";
import { FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const [registrationsRes, eventsRes] = await Promise.all([
    getAllRegistrationsAdmin(),
    getAllEventsAdmin(),
  ]);

  const registrations = registrationsRes.registrations || [];
  const events = (eventsRes.events || []).map((e) => ({
    id: e.id,
    name: e.name,
    registration_fee: e.registration_fee,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Reports &amp; Data Export Center
            </h1>
            <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              CSV Generator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and download clean spreadsheet exports for attendance logs, financial accounting, and university records
          </p>
        </div>
      </div>

      {/* Exporter Matrix */}
      <ReportsExporter registrations={registrations} events={events} />
    </div>
  );
}
