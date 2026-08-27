"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  UploadCloud,
  Users,
  ShieldCheck,
  Megaphone,
  FileSpreadsheet,
  ExternalLink,
  QrCode,
  Sparkles,
  Home,
  LogOut,
  ChevronRight,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { signOutUser } from "@/actions/auth";

const NAV_SECTIONS = [
  {
    title: "CORE OPERATIONS",
    items: [
      {
        href: "/admin",
        label: "Overview",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/admin/events",
        label: "Events & Competitions",
        icon: Calendar,
      },
      {
        href: "/admin/events/bulk",
        label: "Bulk Upload Center",
        icon: UploadCloud,
        badge: "61 Events",
      },
      {
        href: "/admin/pricing",
        label: "Pricing & Tier Policy",
        icon: DollarSign,
        badge: "Tiers",
      },
    ],
  },
  {
    title: "LOGISTICS & PASSES",
    items: [
      {
        href: "/admin/users",
        label: "Registered Users & Passes",
        icon: UserCheck,
        badge: "Directory",
      },
      {
        href: "/admin/registrations",
        label: "Master Registrations",
        icon: Users,
      },
      {
        href: "/admin/coordinators",
        label: "Coordinator Staffing",
        icon: ShieldCheck,
      },
      {
        href: "/admin/announcements",
        label: "Broadcast Alerts",
        icon: Megaphone,
      },
    ],
  },
  {
    title: "DATA & INTELLIGENCE",
    items: [
      {
        href: "/admin/reports",
        label: "Reports & CSV Export",
        icon: FileSpreadsheet,
      },
    ],
  },
];

export function AdminSidebar({
  userEmail,
  userFullName,
}: {
  userEmail: string;
  userFullName?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white text-slate-700 lg:flex select-none">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 font-mono">
                EUPHORIA &apos;26
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Admin OS • KARE
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-indigo-50 text-primary border border-indigo-200/70"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      isActive && (
                        <ChevronRight className="h-3 w-3 text-white/70" />
                      )
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User & Quick Portal Switcher Footer */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-3 space-y-2.5">
        {/* Quick portal switchers */}
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
          >
            <Home className="h-3 w-3 text-slate-400" />
            <span>Public</span>
            <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 py-1.5 text-[11px] font-bold text-primary hover:bg-indigo-100 transition-colors shadow-2xs"
          >
            <QrCode className="h-3 w-3" />
            <span>Pass View</span>
          </Link>
        </div>

        {/* User Profile Card */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-white text-xs shadow-2xs">
              {userFullName ? userFullName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {userFullName || "Super Administrator"}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                {userEmail}
              </div>
            </div>
          </div>

          <button
            onClick={() => signOutUser()}
            title="Sign Out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
