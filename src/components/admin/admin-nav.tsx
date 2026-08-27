"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ShieldCheck,
  Megaphone,
  FileSpreadsheet,
  ArrowUpRight,
  ExternalLink,
  QrCode,
  Sparkles,
  Home,
  LogOut,
} from "lucide-react";
import { signOutUser } from "@/actions/auth";

const ADMIN_NAV_LINKS = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/events",
    label: "Events & Tracks",
    icon: Calendar,
  },
  {
    href: "/admin/registrations",
    label: "Registrations & Passes",
    icon: Users,
  },
  {
    href: "/admin/coordinators",
    label: "Coordinators",
    icon: ShieldCheck,
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: Megaphone,
  },
  {
    href: "/admin/reports",
    label: "Reports & CSV",
    icon: FileSpreadsheet,
  },
];

export function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      {/* Top Banner Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo & Admin Badge */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-900">
                EUPHORIA &apos;26
              </span>
            </Link>
            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 uppercase tracking-wider">
              Admin Console
            </span>
          </div>

          {/* Quick Actions & User Switch */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Home className="h-3.5 w-3.5 text-slate-500" />
              <span>Public Portal</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-indigo-100 transition-colors"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Participant</span> View
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium hidden md:inline truncate max-w-[150px]">
                {userEmail}
              </span>
              <button
                onClick={() => signOutUser()}
                title="Sign Out"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {ADMIN_NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
