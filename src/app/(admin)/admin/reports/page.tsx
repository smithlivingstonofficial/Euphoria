import {
  getAllRegistrationsAdmin,
  getAllEventsAdmin,
  getAllOrdersAdmin,
  getAllCoordinatorsAdmin,
} from "@/actions/admin";
import { ReportsExporter } from "@/components/admin/reports-exporter";
import { FileSpreadsheet, ShieldCheck, DownloadCloud } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const [registrationsRes, eventsRes, ordersRes, coordinatorsRes] =
    await Promise.all([
      getAllRegistrationsAdmin(),
      getAllEventsAdmin(),
      getAllOrdersAdmin(),
      getAllCoordinatorsAdmin(),
    ]);

  const registrations = registrationsRes.registrations || [];
  const events = eventsRes.events || [];
  const orders = ordersRes.orders || [];
  const coordinators = {
    staffAssignments: coordinatorsRes.staffAssignments || [],
    studentAssignments: coordinatorsRes.studentAssignments || [],
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Reports &amp; Data Export Center
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              Live Production Exporter
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate and download Excel-ready CSV spreadsheets for financial audits, faculty/student coordinators, participant rosters, event attendance, and accommodation desks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>UTF-8 BOM Excel Compatible</span>
          </div>
        </div>
      </div>

      {/* Exporter Suite Component */}
      <ReportsExporter
        registrations={registrations}
        events={events}
        orders={orders}
        coordinators={coordinators}
      />
    </div>
  );
}

