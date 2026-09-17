"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
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
  ShieldAlert,
  MessageSquareWarning,
  SlidersHorizontal,
  Receipt,
  Search,
  X,
  Banknote,
} from "lucide-react";
import { signOutUser } from "@/actions/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        href: "/admin",
        label: "Executive Dashboard",
        icon: LayoutDashboard,
        exact: true,
        badge: "Live",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
    ],
  },
  {
    title: "EVENT MANAGEMENT",
    items: [
      {
        href: "/admin/events",
        label: "Events & Staff",
        icon: Calendar,
      },
      {
        href: "/admin/events/slots",
        label: "Slot & Quota Control",
        icon: SlidersHorizontal,
        badge: "Slots",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      },
    ],
  },
  {
    title: "PEOPLE & REGISTRATIONS",
    items: [
      {
        href: "/admin/registrations",
        label: "Master Registrations",
        icon: QrCode,
        badge: "Scanner",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      },
      {
        href: "/admin/users",
        label: "User Accounts",
        icon: UserCheck,
      },
      {
        href: "/admin/coordinators",
        label: "Coordinators & Roles",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "FINANCE & TRANSACTIONS",
    items: [
      {
        href: "/admin/cash-requests",
        label: "Cash On Hand Approvals",
        icon: Banknote,
        badge: "Cash",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
      {
        href: "/admin/payments",
        label: "Payment Transactions",
        icon: CreditCard,
      },
      {
        href: "/admin/payment-requests",
        label: "Payment Requests",
        icon: MessageSquareWarning,
      },
      {
        href: "/admin/payments/recovery",
        label: "Payment Resolution",
        icon: ShieldAlert,
        badge: "Issues",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      },
      {
        href: "/admin/pricing",
        label: "Pricing & Pass Tiers",
        icon: Receipt,
      },
    ],
  },
  {
    title: "OPERATIONS & AUDIT",
    items: [
      {
        href: "/admin/announcements",
        label: "Announcements",
        icon: Megaphone,
      },
      {
        href: "/admin/reports",
        label: "Reports & CSV Export",
        icon: FileSpreadsheet,
      },
    ],
  },
];

/**
 * Robust active route matcher:
 * Prevents child collision bugs where parent paths (e.g. /admin/payments)
 * remain highlighted when viewing specific children (e.g. /admin/payments/recovery).
 */
function isPathActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/admin" || href === "/super-admin") {
    return pathname === href;
  }

  // Payments isolation
  if (href === "/admin/payments") {
    return (
      pathname === "/admin/payments" ||
      (pathname.startsWith("/admin/payments/") &&
        !pathname.startsWith("/admin/payments/recovery"))
    );
  }

  // Events isolation
  if (href === "/admin/events") {
    return (
      pathname === "/admin/events" ||
      (pathname.startsWith("/admin/events/") &&
        !pathname.startsWith("/admin/events/slots"))
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  userEmail,
  userFullName,
  roleId = "admin",
  isSuperAdmin = false,
  className,
  onClose,
}: {
  userEmail: string;
  userFullName?: string;
  roleId?: string;
  isSuperAdmin?: boolean;
  className?: string;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const navigationSections = useMemo(() => {
    const sections: NavSection[] = [];

    if (isSuperAdmin) {
      sections.push({
        title: "DEVELOPER MASTER CONTROL",
        items: [
          {
            href: "/super-admin",
            label: "Super Admin Console",
            icon: Crown,
            exact: true,
            badge: "Root",
            badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
          },
        ],
      });
    }

    sections.push(...NAV_SECTIONS);

    // Filter items if user typed a search query
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase().trim();
    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            sec.title.toLowerCase().includes(query) ||
            item.href.toLowerCase().includes(query)
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [isSuperAdmin, searchQuery]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/90 bg-white text-slate-700 select-none shadow-xs",
        className || "hidden lg:flex"
      )}
    >
      {/* Brand Header: College Logo & Euphoria Logo Side-by-Side */}
      <div className="relative flex shrink-0 items-center justify-center border-b border-slate-100 px-3.5 py-3 min-h-[72px]">
        <Link
          href="/admin"
          onClick={() => onClose?.()}
          className="flex items-center justify-center gap-2.5 group w-full"
          title="Kalasalingam Academy of Research and Education • Euphoria 2026"
        >
          {/* College Crest Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/college-crest.png"
            alt="Kalasalingam Academy of Research and Education"
            className="h-10 w-auto max-h-10 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
            loading="eager"
            decoding="async"
          />

          {/* Subtle Vertical Divider */}
          <div className="h-6 w-px bg-slate-200 shrink-0" />

          {/* Euphoria Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/Euphoria.png"
            alt="Euphoria '26"
            className="h-9 w-auto max-w-[130px] object-contain transition-transform duration-200 group-hover:scale-105"
            loading="eager"
            decoding="async"
          />
        </Link>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Search Filter */}
      <div className="px-3.5 pt-3 pb-1 border-b border-slate-100/70">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search links..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 text-[11px] font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
        {navigationSections.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No matching links found for &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isPathActive(pathname, item.href, item.exact);
                  const isSuperAdminItem = item.href === "/super-admin";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onClose?.()}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${isActive
                          ? isSuperAdminItem
                            ? "bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-md shadow-purple-900/20 font-bold"
                            : "bg-primary text-white shadow-sm shadow-primary/25 font-bold"
                          : isSuperAdminItem
                            ? "text-purple-700 hover:bg-purple-50 font-bold border border-purple-200/70"
                            : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-medium"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${isActive
                              ? "text-white"
                              : isSuperAdminItem
                                ? "text-purple-600"
                                : "text-slate-400 group-hover:text-slate-700"
                            }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold border leading-none ${isActive
                                ? "bg-white/20 text-white border-white/30"
                                : item.badgeColor || "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {isActive ? (
                          <ChevronRight className="h-3.5 w-3.5 text-white/90 shrink-0" />
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* User & Quick Portal Switcher Footer */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-3 space-y-2">
        {/* Quick Portal Switchers */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
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
        <div
          className={`flex items-center justify-between rounded-xl border p-2 shadow-2xs ${isSuperAdmin
              ? "border-purple-200 bg-purple-50/50"
              : "border-slate-200/90 bg-white"
            }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-white text-xs shadow-2xs font-mono ${isSuperAdmin ? "bg-purple-700" : "bg-primary"
                }`}
            >
              {userFullName ? userFullName.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                {userFullName || "Administrator"}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                {userEmail}
              </div>
            </div>
          </div>

          <button
            type="button"
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
