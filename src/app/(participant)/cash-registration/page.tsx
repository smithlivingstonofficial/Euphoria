import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getCashRegistrationPageData } from "@/actions/cash-registration";
import { CashRegistrationClient } from "@/components/cash-registration/cash-registration-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cash On Hand Registration | Euphoria 2026",
  description:
    "Register for Euphoria 2026 competitions with Cash on Hand. Select your Slot 1 and Slot 2 events and verify payment at the registration desk.",
};

export default async function CashRegistrationPage() {
  const result = await getCashRegistrationPageData();

  if (!result.success && result.redirectUrl) {
    redirect(result.redirectUrl);
  }

  const profile = result.profile;
  const hasActivePass = Boolean(result.hasActivePass);
  const activePass = result.activePass || null;
  const existingRequest = result.existingRequest || null;
  const events = result.events || [];
  const categories = result.categories || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary">
      <Navbar
        user={
          profile
            ? {
                email: profile.email,
                participantType: profile.participant_type,
              }
            : undefined
        }
      />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12 flex-1">
        <CashRegistrationClient
          profile={profile}
          hasActivePass={hasActivePass}
          activePass={activePass}
          initialExistingRequest={existingRequest}
          initialEvents={events}
          categories={categories}
        />
      </main>

      <Footer />
    </div>
  );
}
