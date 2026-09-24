import { getAdminScannerOverviewAction } from "@/actions/admin";
import { ScannerManagementClient } from "./scanner-management-client";

export const dynamic = "force-dynamic";

export default async function AdminScannerManagementPage() {
  const data = await getAdminScannerOverviewAction();

  return (
    <div className="space-y-4">
      <ScannerManagementClient initialData={data} />
    </div>
  );
}
