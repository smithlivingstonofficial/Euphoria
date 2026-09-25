import { getPassDiscrepanciesAdminAction } from "@/actions/pass-issues-admin";
import { getCallerAuthInfo } from "@/actions/admin";
import { PassIssuesClient } from "./pass-issues-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pass & Slot Discrepancy Manager | Euphoria Admin",
  description:
    "Audit, diagnose, and resolve festival pass discrepancies, unenrolled students, desynced slot counts, and orphaned paid orders.",
};

export default async function AdminPassIssuesPage() {
  const [authInfo, data] = await Promise.all([
    getCallerAuthInfo(),
    getPassDiscrepanciesAdminAction(),
  ]);

  if (!authInfo || authInfo.roleLevel < 2) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <PassIssuesClient
        initialItems={data.items || []}
        initialMetrics={
          data.metrics || {
            total: 0,
            unenrolled: 0,
            partiallyEnrolled: 0,
            slotDesync: 0,
            paidWithoutPass: 0,
          }
        }
        availableEvents={data.availableEvents || []}
        currentUserRole={authInfo}
      />
    </div>
  );
}
