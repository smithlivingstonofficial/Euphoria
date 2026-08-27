import { createAdminClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/admin/event-form";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const adminClient = await createAdminClient();
  const { data: categories } = await adminClient
    .from("event_categories")
    .select("id, name")
    .order("display_order", { ascending: true });

  const safeCategories = (categories && categories.length > 0)
    ? categories
    : [
        { id: "cat_computing", name: "SCSE Computing & AI" },
        { id: "cat_electrical", name: "SEEE Electrical & Robotics" },
        { id: "cat_mech_civil", name: "SMEC Mech & Civil" },
        { id: "cat_gaming", name: "Esports & Gaming" },
        { id: "cat_nontech", name: "Non-Technical & Fun" },
      ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/events"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Create New Event / Competition
            </h1>
            <p className="text-xs text-slate-500">
              Publish a new technical event, hackathon, workshop or symposium competition
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <EventForm categories={safeCategories} />
    </div>
  );
}
