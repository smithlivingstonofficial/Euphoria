import { Suspense } from "react";
import { getPublicEvents } from "@/actions/events";
import { createClient } from "@/lib/supabase/server";
import { EventCatalogExplorer, PublicEvent } from "@/components/events/event-catalog-explorer";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const dynamic = "force-dynamic";

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

  let profile = null;
  let userRole = "participant";

  if (user) {
    const [{ data: p }, { data: roleAssignment }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, participant_type")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_role_assignments")
        .select("role_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    profile = p;
    if (roleAssignment?.role_id) {
      userRole = roleAssignment.role_id;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary">
      <Navbar
        user={
          user
            ? {
                email: user.email || "",
                role: userRole,
                participantType: profile?.participant_type,
              }
            : null
        }
      />

      {/* Catalog Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12 flex-1">
        <EventCatalogExplorer
          initialEvents={events as unknown as PublicEvent[]}
          categories={categories || []}
          initialTrack={resolvedSearchParams?.track || ""}
          initialQuery={resolvedSearchParams?.q || ""}
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
