import { getAllOrdersAdmin } from "@/actions/admin";
import AdminPaymentsClient from "./admin-payments-client";

export const metadata = {
  title: "Payment Transactions Audit | Euphoria 2026 Admin",
  description: "Manage and track all festival pass payments, Easebuzz order statuses, and transaction details.",
};

export default async function AdminPaymentsPage() {
  const result = await getAllOrdersAdmin();
  const orders = result.orders || [];

  return (
    <div className="space-y-6">
      <AdminPaymentsClient initialOrders={orders} />
    </div>
  );
}
