import { getPaymentIssuesAdmin } from "@/actions/payment-issues";
import { PaymentRequestsClient } from "./payment-requests-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Payment Requests | Euphoria 2026 Admin",
  description: "Review, auto-verify, and approve student payment dispute requests and issue festival passes.",
};

export default async function AdminPaymentRequestsPage() {
  const result = await getPaymentIssuesAdmin({ statusFilter: "all" });

  const issues = result.issues || [];
  const metrics = result.metrics || {
    total: 0,
    pending: 0,
    underReview: 0,
    resolved: 0,
    rejected: 0,
    autoVerified: 0,
  };

  return (
    <div className="space-y-6">
      <PaymentRequestsClient initialIssues={issues} initialMetrics={metrics} />
    </div>
  );
}
