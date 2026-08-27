import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { getPublicPricingSettings } from "@/actions/events";
import { getUserPassSummary } from "@/actions/passes";
import { createClient } from "@/lib/supabase/server";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Euphoria 2026 | Kalasalingam Academy of Research and Education (KARE)",
  description:
    "Official event portal for Euphoria — The flagship national technical festival of Kalasalingam Academy of Research and Education.",
  keywords: [
    "Euphoria",
    "KARE",
    "Kalasalingam",
    "Technical Symposium",
    "Hackathon",
    "Coding",
    "Robotics",
    "Paper Presentation",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [pricing, supabase] = await Promise.all([
    getPublicPricingSettings(),
    createClient(),
  ]);

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let userProfile = null;
  let userPass = undefined;
  let confirmedEvents: any[] = [];

  if (authUser) {
    const [{ data: p }, passRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, participant_type")
        .eq("id", authUser.id)
        .maybeSingle(),
      getUserPassSummary(),
    ]);

    if (p) {
      userProfile = {
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        participantType: p.participant_type as "internal" | "external",
      };
    }

    if (passRes.success && passRes.data) {
      userPass = {
        hasPass: passRes.data.hasPass,
        passCode: passRes.data.passCode,
        passTier: passRes.data.passTier,
        amountPaid: passRes.data.amountPaid,
        totalSlots: passRes.data.totalSlots,
        slotsUsed: passRes.data.slotsUsed,
        remainingSlots: passRes.data.remainingSlots,
      };

      confirmedEvents = passRes.data.registeredEvents.map((r) => ({
        id: r.registrationId,
        eventId: r.eventId,
        name: r.name,
        isProEvent: r.isProEvent,
        slotNumber: r.slotNumber,
        registrationCode: passRes.data?.passCode || "",
      }));
    }
  }

  return (
    <html lang="en" className={`light ${fontSans.variable}`}>
      <body className="min-h-screen bg-background text-slate-900 font-sans antialiased selection:bg-primary selection:text-white flex flex-col">
        <AppProviders
          initialPricing={pricing}
          initialPass={userPass}
          initialConfirmedEvents={confirmedEvents}
          user={userProfile}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
