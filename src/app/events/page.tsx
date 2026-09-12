import { Suspense } from "react";
import { getPublicEvents } from "@/actions/events";
import { EventCatalogExplorer, PublicEvent } from "@/components/events/event-catalog-explorer";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const revalidate = 60;

export default async function EventsDirectoryPage() {
  const { events, categories } = await getPublicEvents();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-primary">
      <Navbar />

      {/* Catalog Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12 flex-1">
        <Suspense fallback={<div className="h-96 w-full flex items-center justify-center">Loading catalog...</div>}>
          <EventCatalogExplorer
            initialEvents={events as unknown as PublicEvent[]}
            categories={categories || []}
            initialTrack=""
            initialQuery=""
          />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

