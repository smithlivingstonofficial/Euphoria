import { Suspense } from "react";
import { getPublicEvents } from "@/actions/events";
import { createClient } from "@/lib/supabase/server";
import { EventCatalogExplorer, PublicEvent } from "@/components/events/event-catalog-explorer";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Layers, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EventsDirectoryPage({
  searchParams,
}: {
  searchParams?: { track?: string; q?: string };
}) {
  const [{ events, categories }, supabase] = await Promise.all([
    getPublicEvents(),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, participant_type")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        user={
          user
            ? {
                email: user.email || "",
                participantType: profile?.participant_type,
              }
            : null
        }
      />

      {/* Catalog Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex-1">
        <EventCatalogExplorer
          initialEvents={events as unknown as PublicEvent[]}
          categories={categories || []}
          initialTrack={searchParams?.track || ""}
          initialQuery={searchParams?.q || ""}
          user={
            user
              ? {
                  id: user.id,
                  email: user.email || "",
                  fullName: profile?.full_name,
                }
              : null
          }
        />
      </main>

      <Footer />
    </div>
  );
}
