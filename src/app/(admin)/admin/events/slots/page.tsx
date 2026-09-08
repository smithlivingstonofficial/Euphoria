import { redirect } from "next/navigation";
import { verifyAdminSession, getEventsSlotControlAdmin } from "@/actions/admin";
import { SlotsControlClient } from "./slots-control-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Slot & Quota Control Center | Euphoria Admin",
  description: "Manage event capacity, KLU quota caps, and external delegate slot reservations.",
};

export default async function AdminEventSlotsPage() {
  const session = await verifyAdminSession();
  if (!session.authorized) {
    redirect("/admin");
  }

  const { events, stats, error } = await getEventsSlotControlAdmin();

  return (
    <div className="min-h-screen bg-slate-50/75 text-slate-900">
      <SlotsControlClient
        initialEvents={events}
        initialStats={stats}
        initialError={error}
        isSuperAdmin={session.isSuperAdmin}
      />
    </div>
  );
}
