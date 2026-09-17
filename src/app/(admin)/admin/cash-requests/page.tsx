import { getCashRequestsAdmin } from "@/actions/cash-registration";
import { CashRequestsClient } from "./cash-requests-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cash On Hand Requests | Euphoria 2026 Admin",
  description: "Verify participant physical cash collection and issue festival passes.",
};

export default async function AdminCashRequestsPage() {
  const result = await getCashRequestsAdmin({ statusFilter: "all" });

  const requests = result.requests || [];
  const metrics = result.metrics || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalCashCollected: 0,
  };

  const availableEvents = result.availableEvents || [];

  return (
    <div className="space-y-6">
      <CashRequestsClient
        initialRequests={requests}
        initialMetrics={metrics}
        availableEvents={availableEvents}
      />
    </div>
  );
}
