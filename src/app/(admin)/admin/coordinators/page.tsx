import { getAllCoordinatorsAdmin } from "@/actions/admin";
import { CoordinatorsAdminClient } from "./coordinators-client";
import { ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCoordinatorsPage() {
  const data = await getAllCoordinatorsAdmin();

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-primary shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Staffing &amp; Event Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Staff &amp; Student Coordinator Directory
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Assign faculty staff coordinators and student coordinators across all 61 competitions to manage gate entry, QR pass verification, and attendee attendance.
          </p>
        </div>
      </div>

      <CoordinatorsAdminClient
        staffAssignments={(data.staffAssignments || []).map((s: any) => ({
          ...s,
          user: Array.isArray(s.user) ? s.user[0] : s.user,
          event: Array.isArray(s.event) ? s.event[0] : s.event,
        }))}
        studentAssignments={(data.studentAssignments || []).map((s: any) => ({
          ...s,
          user: Array.isArray(s.user) ? s.user[0] : s.user,
          event: Array.isArray(s.event) ? s.event[0] : s.event,
        }))}
        allProfiles={(data.allProfiles || []) as any}
        allEvents={(data.allEvents || []) as any}
      />
    </div>
  );
}
