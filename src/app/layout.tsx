import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { getPublicPricingSettings } from "@/actions/events";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const fontDisplay = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-display",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://euphoria.kalasalingam.ac.in"),
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
  const [pricing] = await Promise.all([
    getPublicPricingSettings(),
  ]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`light ${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`}
    >
      <body className="min-h-screen bg-background text-slate-900 font-sans antialiased selection:bg-primary selection:text-white flex flex-col">
        <AppProviders
          initialPricing={pricing}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
