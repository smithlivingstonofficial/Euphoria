import { getAllCoordinatorsAdmin } from "@/actions/admin";
import { CoordinatorsAdminClient } from "./coordinators-client";
import { ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCoordinatorsPage() {
  const data = await getAllCoordinatorsAdmin();

  return (
    <div className="space-y-4">
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
