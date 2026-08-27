"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Sparkles,
  Search,
  Plus,
  ExternalLink,
  QrCode,
  Home,
  Shield,
  UploadCloud,
  Layers,
} from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin": "Executive Dashboard",
  "/admin/events": "Events & Competitions",
  "/admin/events/new": "Create New Event",
  "/admin/events/bulk": "Bulk Event Upload Center",
  "/admin/registrations": "Master Registrations & Passes",
  "/admin/coordinators": "Coordinator Role Assignments",
  "/admin/announcements": "Broadcast Alerts & Notifications",
  "/admin/reports": "Data Export & Audit Center",
};

export function AdminTopbar({
  userEmail,
  userFullName,
}: {
  userEmail: string;
  userFullName?: string;
}) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentTitle =
    BREADCRUMB_MAP[pathname] ||
    (pathname.includes("/admin/events/") && pathname.includes("/edit")
      ? "Edit Event Configuration"
      : "Admin Console");

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">
              Admin OS
            </span>
            <span className="hidden sm:inline-block text-slate-300">/</span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {currentTitle}
            </h1>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Upload Action */}
          <Link
            href="/admin/events/bulk"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-primary hover:bg-indigo-100 transition-colors shadow-2xs"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Bulk Upload CSV</span>
          </Link>

          {/* Quick Create Action */}
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Event</span>
          </Link>

          {/* System Pulse Badge */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Sync Active</span>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full">
            <AdminSidebar userEmail={userEmail} userFullName={userFullName} />
          </div>
        </div>
      )}
    </>
  );
}
