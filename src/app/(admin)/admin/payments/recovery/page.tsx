import { getPaymentIssuesAndDiscrepanciesAdmin } from "@/actions/admin";
import PaymentRecoveryClient from "./payment-recovery-client";

export const metadata = {
  title: "Payment Issues & Recovery Hub | Euphoria 2026 Admin",
  description: "Live Easebuzz gateway telemetry, orphaned transaction reconciliation, and fail-safe festival pass recovery.",
};

export default async function AdminPaymentRecoveryPage() {
  const result = await getPaymentIssuesAndDiscrepanciesAdmin();
  const issues = result.issues || [];
  const stats = result.stats || {};

  return (
    <div className="space-y-6">
      <PaymentRecoveryClient initialIssues={issues} initialStats={stats} />
    </div>
  );
}
