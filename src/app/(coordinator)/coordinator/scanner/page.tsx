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

      <main className="flex-1 pt-16 sm:pt-20 pb-8 px-3 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        {/* Interactive Scanner Client */}
        <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Loading scanner...</div>}>
          <ScannerClient assignedEvents={events} />
        </Suspense>
      </main>
    </div>
  );
}
