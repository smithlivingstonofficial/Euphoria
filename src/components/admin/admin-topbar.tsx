"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Sparkles,
  ExternalLink,
  QrCode,
  ChevronRight,
} from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { cn } from "@/lib/utils";

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin": "Executive Dashboard",
  "/admin/users": "Registered Users & Profiles",
  "/admin/events": "Events & Competitions",
  "/admin/events/new": "Create New Event",
  "/admin/events/bulk": "Bulk Event Upload Center",
  "/admin/events/slots": "Slot & Quota Control",
  "/admin/pricing": "Pricing & Tier Policy Settings",
  "/admin/registrations": "Master Registrations & Passes",
  "/admin/coordinators": "Coordinator Role Assignments",
  "/admin/announcements": "Broadcast Alerts & Notifications",
  "/admin/payments": "Payment Audit & Financial Telemetry",
  "/admin/payment-requests": "Payment Requests & Verification",
  "/admin/payments/recovery": "Payment Issues & Recovery Hub",
  "/admin/reports": "Data Export & Audit Center",
  "/super-admin": "Super Admin Developer Console",
};

export function AdminTopbar({
  userEmail,
  userFullName,
  roleId = "admin",
  isSuperAdmin = false,
}: {
  userEmail: string;
  userFullName?: string;
  roleId?: string;
  isSuperAdmin?: boolean;
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
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors lg:hidden cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
            >
              <span>Admin OS</span>
            </Link>
            <ChevronRight className="hidden sm:inline-block h-3.5 w-3.5 text-slate-300" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {currentTitle}
            </h1>
          </div>
        </div>

        {/* Right: Telemetry Status, Shortcuts & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Production Live Status Badge */}
          {isSuperAdmin ? (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-2.5 py-1 text-[11px] font-extrabold text-purple-800 shadow-2xs">
              <Sparkles className="h-3 w-3 text-purple-600 fill-purple-200" />
              <span>SUPER ADMIN (DEV)</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Production Live</span>
            </div>
          )}

          {/* Quick Scanner Shortcut */}
          <Link
            href="/admin/registrations"
            title="Open Attendance QR Scanner Desk"
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <QrCode className="h-3.5 w-3.5 text-slate-500" />
            <span>Scanner Desk</span>
          </Link>

          {/* Public Portal Shortcut */}
          <Link
            href="/"
            target="_blank"
            title="Preview Public Website"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {/* User Profile Tag */}
          <div className="flex items-center gap-2.5 pl-1.5 sm:pl-2.5 border-l border-slate-200">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl font-bold text-white text-xs shadow-2xs font-mono",
                isSuperAdmin ? "bg-purple-700" : "bg-primary"
              )}
            >
              {userFullName ? userFullName.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-none">
                {userFullName || "Administrator"}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isSuperAdmin ? "Super Admin" : "Operations"}
              </div>
            </div>
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
            <AdminSidebar
              userEmail={userEmail}
              userFullName={userFullName}
              roleId={roleId}
              isSuperAdmin={isSuperAdmin}
              className="flex w-72 max-w-full"
              onClose={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
