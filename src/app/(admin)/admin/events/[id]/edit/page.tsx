import { createAdminClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/admin/event-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: { id: string };
}) {
  const adminClient = await createAdminClient();

  const [{ data: event }, { data: categories }, { count: registrationCount }] = await Promise.all([
    adminClient.from("events").select("*").eq("id", params.id).single(),
    adminClient.from("event_categories").select("id, name").order("display_order", { ascending: true }),
    adminClient.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", params.id),
  ]);

  if (!event) {
    notFound();
  }

  const safeCategories = (categories && categories.length > 0)
    ? categories
    : [
        { id: "cat_computing", name: "SCSE Computing & AI" },
        { id: "cat_electrical", name: "SEEE Electrical & Robotics" },
        { id: "cat_mech_civil", name: "SMEC Mech & Civil" },
        { id: "cat_gaming", name: "Esports & Gaming" },
        { id: "cat_nontech", name: "Non-Technical & Fun" },
      ];

  const rulesText = Array.isArray(event.rules)
    ? event.rules.join("\n")
    : typeof event.rules === "string"
    ? event.rules
    : "";

  const initialData = {
    id: event.id,
    slug: event.slug,
    categoryId: event.category_id,
    name: event.name,
    shortDescription: event.short_description,
    description: event.description,
    rules: rulesText,
    schoolOrDept: event.school_or_dept,
    venue: event.venue,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    registrationFee: Number(event.registration_fee || 0),
    participantLimit: Number(event.participant_limit || 100),
    minTeamSize: Number(event.min_team_size || 1),
    maxTeamSize: Number(event.max_team_size || 1),
    isProEvent: Boolean(event.is_pro_event),
    status: event.status,
    brochureUrl: event.brochure_url,
    registrationCount: registrationCount || 0,
  };

  return (
    <div className="w-full">
      <EventForm categories={safeCategories} initialData={initialData} isEdit={true} />
    </div>
  );
}
