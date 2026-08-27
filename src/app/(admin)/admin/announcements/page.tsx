import { getAllAnnouncementsAdmin, getAllEventsAdmin } from "@/actions/admin";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const [announcementsRes, eventsRes] = await Promise.all([
    getAllAnnouncementsAdmin(),
    getAllEventsAdmin(),
  ]);

  const announcements = announcementsRes.announcements || [];
  const eventsList = (eventsRes.events || []).map((e) => ({
    id: e.id,
    name: e.name,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Announcements &amp; Urgent Broadcasts
            </h1>
            <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              Live Alert Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish notifications, schedule updates, or emergency announcements across the platform
          </p>
        </div>
      </div>

      {/* Announcements Manager */}
      <AnnouncementsManager
        initialAnnouncements={announcements}
        eventsList={eventsList}
      />
    </div>
  );
}
