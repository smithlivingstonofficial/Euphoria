import { getPaginatedOrdersAdmin } from "@/actions/admin";
import AdminPaymentsClient from "./admin-payments-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment Transactions Audit | Euphoria 2026 Admin",
  description: "Manage and track all festival pass payments, Easebuzz order statuses, and transaction details.",
};

export default async function AdminPaymentsPage() {
  const result = await getPaginatedOrdersAdmin({
    page: 1,
    pageSize: 10,
    statusFilter: "all",
  });

  const orders = result.orders || [];

  return (
    <div className="space-y-6">
      <AdminPaymentsClient
        initialOrders={orders}
        initialTotalFilteredCount={result.totalFilteredCount ?? orders.length}
        initialMetrics={result.metrics}
      />
    </div>
  );
}

