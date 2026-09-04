"use client";

import { useMemo } from "react";
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
  UserCheck,
  CreditCard,
  Crown,
} from "lucide-react";
import { signOutUser } from "@/actions/auth";

const NAV_SECTIONS = [
  {
    title: "CORE CONTROL",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/admin/events",
        label: "Events & Staff",
        icon: Calendar,
      },
      {
        href: "/admin/users",
        label: "Participants & Passes",
        icon: UserCheck,
      },
      {
        href: "/admin/coordinators",
        label: "Coordinators & Roles",
        icon: ShieldCheck,
      },
      {
        href: "/admin/announcements",
        label: "Announcements",
        icon: Megaphone,
      },
      {
        href: "/admin/payments",
        label: "Payment Transactions",
        icon: CreditCard,
      },
      {
        href: "/admin/reports",
        label: "Reports & CSV",
        icon: FileSpreadsheet,
      },
    ],
  },
];

export function AdminSidebar({
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

  const navigationSections = useMemo(() => {
    const sections = [...NAV_SECTIONS];
    if (isSuperAdmin) {
      sections.unshift({
        title: "DEVELOPER MASTER CONTROL",
        items: [
          {
            href: "/super-admin",
            label: "Super Admin Console",
            icon: Crown,
            exact: true,
          },
        ],
      });
    }
    return sections;
  }, [isSuperAdmin]);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200/90 bg-white text-slate-700 lg:flex select-none">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105 ${isSuperAdmin ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 shadow-purple-500/30" : "bg-primary shadow-primary/20"}`}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 font-mono">
                EUPHORIA &apos;26
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 rounded bg-purple-100 text-purple-800 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider border border-purple-200">
                  <span>👑 SUPER ADMIN</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border border-indigo-100">
                  <span>🛡️ ADMIN CONSOLE</span>
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-mono">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const isSuperAdminItem = item.href === "/super-admin";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? isSuperAdminItem
                          ? "bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-md shadow-purple-900/20 font-bold"
                          : "bg-primary text-white shadow-xs font-bold"
                        : isSuperAdminItem
                          ? "text-purple-700 hover:bg-purple-50 font-bold border border-purple-200/70"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          isActive
                            ? "text-white"
                            : isSuperAdminItem
                              ? "text-purple-600"
                              : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {isSuperAdminItem ? (
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                          isActive
                            ? "bg-white/20 text-amber-300"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        ROOT
                      </span>
                    ) : isActive ? (
                      <ChevronRight className="h-3.5 w-3.5 text-white/80 shrink-0" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User & Quick Portal Switcher Footer */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5">
        {/* Quick portal switchers */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
          >
            <Home className="h-3 w-3 text-slate-400" />
            <span>Public</span>
            <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 py-1.5 text-[11px] font-bold text-primary hover:bg-indigo-100 transition-colors shadow-2xs"
          >
            <QrCode className="h-3 w-3" />
            <span>Pass View</span>
          </Link>
        </div>

        {/* User Profile Card */}
        <div className={`flex items-center justify-between rounded-xl border p-2.5 shadow-2xs ${isSuperAdmin ? "border-purple-200 bg-purple-50/40" : "border-slate-200/90 bg-white"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-white text-xs shadow-2xs font-mono ${isSuperAdmin ? "bg-purple-700" : "bg-primary"}`}>
              {userFullName ? userFullName.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                <span>{userFullName || "Super Admin"}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[125px]">
                {userEmail}
              </div>
            </div>
          </div>

          <button
            onClick={() => signOutUser()}
            title="Sign Out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
