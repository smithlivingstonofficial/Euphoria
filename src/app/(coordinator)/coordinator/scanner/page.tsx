import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ScannerClient } from "./scanner-client";
import { getCoordinatorWorkspaceData } from "@/actions/coordinator";
import { ArrowLeft, ShieldCheck, QrCode } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoordinatorScannerPage() {
  const data = await getCoordinatorWorkspaceData();
  const events = data.events || [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <Link
              href="/coordinator"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Coordinator Hub</span>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Live Attendance &amp; Pass Check-In Scanner
              </h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Gate Terminal
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Scan participant QR codes with your device camera or enter their Pass Code manually for instant check-in.
            </p>
          </div>
        </div>

        {/* Interactive Scanner Client */}
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading scanner...</div>}>
          <ScannerClient assignedEvents={events} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
