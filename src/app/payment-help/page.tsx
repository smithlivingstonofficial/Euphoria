import { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getUserPaymentIssueContext } from "@/actions/payment-issues";
import { PaymentHelpClient } from "@/components/payment-help/payment-help-client";

export const metadata: Metadata = {
  title: "Payment Help & Pass Request | Euphoria 2026",
  description:
    "Official payment resolution and pass activation portal for Euphoria 2026 participants. Submit your bank transaction details to issue your festival pass.",
};

export const revalidate = 0; // Always fresh context on payment resolution

export default async function PaymentHelpPage() {
  const context = await getUserPaymentIssueContext();

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary">
      {/* Global Navbar */}
      <Navbar user={context.userProfile ? { email: context.userProfile.email } : undefined} />

      {/* Main Page Body: Tight top padding directly below the 57px fixed navbar */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-[66px] sm:pt-[70px] pb-10">
        <PaymentHelpClient initialContext={context} />
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
