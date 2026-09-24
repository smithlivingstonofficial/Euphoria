import { notFound } from "next/navigation";
import {
  getEventAttendeesForCoordinator,
  getEventStaffDetails,
  getEventScannerControlForCoordinatorAction,
} from "@/actions/coordinator";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { EventRosterClient } from "./roster-client";

export const dynamic = "force-dynamic";

export default async function CoordinatorEventRosterPage({
  params,
}: {
  params: { eventId: string };
}) {
  // Concurrently fetch event roster, staff details, and live scanner control in parallel (1 single server pass)
  const [data, staffRes, scannerCtrlRes] = await Promise.all([
    getEventAttendeesForCoordinator(params.eventId),
    getEventStaffDetails(params.eventId),
    getEventScannerControlForCoordinatorAction(params.eventId),
  ]);

  if (!data.success || !data.event) {
    notFound();
  }

  const event = data.event;
  const attendees = data.attendees || [];
  const roleType = data.roleType || "student";

  let staffDetails: {
    whatsappLink: string;
    brochureUrl: string;
    studentCoordinators: Array<any>;
    allProfiles: Array<any>;
  } | null = null;

  if ((roleType === "staff" || roleType === "admin") && staffRes?.success) {
    staffDetails = {
      whatsappLink: staffRes.whatsappLink || "",
      brochureUrl: staffRes.brochureUrl || "",
      studentCoordinators: staffRes.studentCoordinators || [],
      allProfiles: staffRes.allProfiles || [],
    };
  }

  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const isLiveToday = event.event_date === todayIST;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pt-20 sm:pt-24 pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Unified Coordinator Event Workspace */}
        <EventRosterClient
          eventId={event.id}
          eventName={event.name}
          eventVenue={event.venue}
          eventDate={event.event_date}
          startTime={event.start_time}
          endTime={event.end_time}
          schoolOrDept={event.school_or_dept}
          participantLimit={event.participant_limit}
          isProEvent={event.is_pro_event}
          firstSlotCount={data.firstSlotCount}
          isLiveToday={isLiveToday}
          eventRules={event.rules}
          eventStatus={event.status}
          roleType={roleType}
          initialAttendees={attendees as any}
          initialTotalCount={data.totalCount ?? 0}
          initialAttendedCount={data.attendedCount ?? 0}
          staffDetails={staffDetails}
          initialScannerControl={scannerCtrlRes?.control || null}
          initialMasterScannerEnabled={scannerCtrlRes?.masterScannerEnabled !== false}
          initialSectionCounts={scannerCtrlRes?.sectionCounts || {}}
          initialCanStaffSwitch={Boolean(scannerCtrlRes?.canStaffSwitch)}
        />
      </main>

      <Footer />
    </div>
  );
}
