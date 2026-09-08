import { Suspense } from "react";
import { getPublicEvents } from "@/actions/events";
import { EventCatalogExplorer, PublicEvent } from "@/components/events/event-catalog-explorer";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function EventsDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ track?: string; q?: string }> | { track?: string; q?: string };
}) {
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};

  const [{ events, categories }, supabase] = await Promise.all([
    getPublicEvents(),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, participant_type")
      .eq("id", user.id)
      .maybeSingle();

    const email = (profile?.email || user.email || "").toLowerCase().trim();
    const isInternal = profile?.participant_type === "internal" || email.endsWith("@klu.ac.in");

    userProfile = {
      id: user.id,
      email: email,
      fullName: profile?.full_name || "",
      participantType: (profile?.participant_type as "internal" | "external") || (isInternal ? "internal" : "external"),
      isInternal,
    };
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary">
      <Navbar user={userProfile ? { email: userProfile.email } : undefined} />

      {/* Catalog Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12 flex-1">
        <EventCatalogExplorer
          initialEvents={events as unknown as PublicEvent[]}
          categories={categories || []}
          initialTrack={resolvedSearchParams?.track || ""}
          initialQuery={resolvedSearchParams?.q || ""}
          user={userProfile}
        />
      </main>

      <Footer />
    </div>
  );
}

