import {
  getAdminRegistrationsPageOneCached,
  getAllEventsAdmin,
} from "@/actions/admin";
import { MasterRegistrationsClient } from "./registrations-client";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const [data, { events }] = await Promise.all([
    getAdminRegistrationsPageOneCached(),
    getAllEventsAdmin(),
  ]);

  return (
    <div className="space-y-4">
      <MasterRegistrationsClient
        initialRegistrations={data.registrations || []}
        initialTotalCount={data.totalCount || 0}
        initialMetrics={data.metrics}
        allEvents={(events || []) as any}
      />
    </div>
  );
}
