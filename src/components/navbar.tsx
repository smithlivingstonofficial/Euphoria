"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Layers,
  Bell,
  User,
  Menu,
  X,
  QrCode,
  ChevronDown,
  ShoppingBag,
  ShieldCheck,
  ChevronRight,
  LogIn,
  Ticket,
  Compass,
  LayoutDashboard,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { LogoutButton } from "@/components/auth/logout-button";

interface NavbarProps {
  user?: {
    email: string;
    role?: string;
    participantType?: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { selectedEvents, openCart } = useCart();

  const navLinks = [
    {
      href: "/events",
      label: "Events",
      badge: "61",
      badgeVariant: "indigo",
      icon: Layers,
    },
    {
      href: "/campus-map",
      label: "Map",
      badge: "Live",
      badgeVariant: "slate",
      icon: Compass,
    },
    {
      href: "/announcements",
      label: "Alerts",
      badge: "•",
      badgeVariant: "rose",
      icon: Bell,
    },
  ];

  const isCoordinator =
    user?.role === "staff_coordinator" ||
    user?.role === "student_coordinator" ||
    user?.role === "coordinator" ||
    user?.role === "faculty" ||
    user?.role === "admin";

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[990] w-full transition-all duration-300",
          isScrolled
            ? "bg-white/96 shadow-sm shadow-slate-900/[0.06] backdrop-blur-xl"
            : "bg-white/85 backdrop-blur-md"
        )}
      >
        {/* ── Festival gradient top-stripe ── */}
        <div className="h-[3px] w-full bg-gradient-to-r from-indigo-600 via-primary to-cyan-500" />

        <div className="mx-auto flex h-[54px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* ════ LOGO ════ */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            {/* Icon mark */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-md group-hover:shadow-indigo-500/30 group-hover:scale-105 transition-all duration-200 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/80 via-primary/60 to-cyan-500/40" />
              <Sparkles className="relative h-4 w-4 text-white" />
            </div>
            {/* Wordmark */}
            <div>
              <p className="text-[15px] font-black tracking-[-0.04em] text-slate-900 font-display leading-none group-hover:text-primary transition-colors duration-200">
                EUPHORIA
              </p>
              <div className="flex items-center gap-1.5 mt-[2px]">
                <span className="text-[9px] font-mono font-bold text-slate-400 tracking-[0.12em] uppercase leading-none">
                  KARE 2026
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </Link>

          {/* ════ DESKTOP CENTER NAV ════ */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 text-[13px] font-semibold transition-all duration-200 rounded-xl group",
                    isActive
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                  <span>{link.label}</span>

                  {/* Badge */}
                  {link.badge && (
                    <span className={cn(
                      "rounded-md px-1.5 py-0.5 text-[9px] font-mono font-black inline-flex items-center gap-0.5",
                      link.badgeVariant === "indigo" && (isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"),
                      link.badgeVariant === "slate" && "bg-slate-100 text-slate-500",
                      link.badgeVariant === "rose" && "text-rose-600"
                    )}>
                      {link.badgeVariant === "rose" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                      )}
                      {link.badgeVariant !== "rose" && link.badge}
                    </span>
                  )}

                  {/* Active underline indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-primary to-cyan-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ════ DESKTOP RIGHT ACTIONS ════ */}
          <div className="hidden md:flex items-center gap-2">

            {/* Cart */}
            <button
              type="button"
              onClick={openCart}
              className={cn(
                "relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95",
                selectedEvents.length > 0
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              )}
              title="View selected competition slots"
            >
              <ShoppingBag className={cn("h-3.5 w-3.5", selectedEvents.length > 0 ? "text-primary" : "text-slate-400")} />
              <span>Cart</span>
              {selectedEvents.length > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-mono font-black text-white">
                  {selectedEvents.length}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-400">0</span>
              )}
            </button>

            {/* ── Authenticated user ── */}
            {user ? (
              <div className="flex items-center gap-2" ref={dropdownRef}>
                {/* Pass QR pill */}
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
                >
                  <QrCode className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Pass QR</span>
                </Link>

                {/* User menu trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                      userDropdownOpen
                        ? "border-indigo-200 bg-indigo-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {/* Avatar circle */}
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-primary text-white font-mono text-[9px] font-black shrink-0">
                      {user.email.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="max-w-[72px] truncate text-[11px]">
                      {isAdmin ? "Admin" : isCoordinator ? "Coord." : "Account"}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform duration-200 shrink-0", userDropdownOpen && "rotate-180")} />
                  </button>

                  {/* Dropdown */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200/90 bg-white/98 backdrop-blur-xl p-2 shadow-xl shadow-slate-900/10 animate-in fade-in-50 zoom-in-95 duration-150 z-50">
                      {/* User info block */}
                      <div className="px-3 py-2.5 mb-1.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white font-black font-mono text-sm shrink-0">
                            {user.email.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Signed in as</p>
                            <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
                          </div>
                          <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                            {isAdmin ? "ADMIN" : isCoordinator ? "COORD" : "DELEGATE"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors">
                            <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                            Admin Console
                          </Link>
                        )}
                        {isCoordinator && (
                          <Link href="/coordinator" onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors">
                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                            Coordinator Hub
                          </Link>
                        )}
                        <Link href="/dashboard" onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                          <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                          My Dashboard
                        </Link>
                        <Link href="/dashboard/passes" onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                          <QrCode className="h-3.5 w-3.5 text-slate-400" />
                          Digital Pass &amp; QR
                        </Link>
                        <div className="pt-1 mt-0.5 border-t border-slate-100">
                          <LogoutButton
                            variant="ghost"
                            className="w-full justify-start px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
                            onLogoutSuccess={() => setUserDropdownOpen(false)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Guest actions ── */
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-primary px-4 py-1.5 text-xs font-black text-white shadow-sm shadow-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Get Pass
                </Link>
              </div>
            )}
          </div>

          {/* ════ MOBILE RIGHT CONTROLS ════ */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={openCart}
              className="relative flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer active:scale-95"
              aria-label="Cart"
            >
              <ShoppingBag className="h-4 w-4 text-primary" />
              {selectedEvents.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[8px] font-mono font-black text-white px-0.5">
                  {selectedEvents.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              aria-label="Open menu"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════
          MOBILE SLIDE-OVER DRAWER
      ════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[82vw] max-w-[320px] flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 z-[10001]">

            {/* Gradient top stripe */}
            <div className="h-[3px] w-full bg-gradient-to-r from-indigo-600 via-primary to-cyan-500" />

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/70 to-cyan-500/40" />
                  <Sparkles className="h-4 w-4 text-white relative" />
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight text-slate-900 font-display leading-none">EUPHORIA</p>
                  <p className="text-[9px] font-mono font-bold text-slate-400 tracking-widest mt-0.5">KARE 2026</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* User banner */}
              {user ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white font-black font-mono text-base shrink-0">
                    {user.email.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Signed in</p>
                    <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
                  </div>
                  <span className="text-[9px] font-mono font-black px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                    {isAdmin ? "ADMIN" : isCoordinator ? "COORD" : "DELEGATE"}
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200/70">
                  <p className="text-xs font-bold text-slate-800 mb-0.5">EUPHORIA 2026 Delegate Pass</p>
                  <p className="text-[10px] text-slate-500 mb-3">61 Events · 2 Slots · Starting ₹200</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700">
                      <LogIn className="h-3.5 w-3.5 text-primary" /> Sign In
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-black text-white shadow-xs">
                      <Ticket className="h-3.5 w-3.5" /> Get Pass
                    </Link>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="space-y-1">
                <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Navigate</p>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all border",
                        isActive
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("h-4 w-4", isActive ? "text-cyan-300" : "text-primary")} />
                        <span>{link.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                          isActive ? "bg-white/15 text-cyan-200" : "bg-slate-100 text-slate-500"
                        )}>
                          {link.badge}
                        </span>
                        <ChevronRight className={cn("h-3.5 w-3.5", isActive ? "text-slate-400" : "text-slate-300")} />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Authenticated actions */}
              {user && (
                <div className="space-y-1">
                  <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Actions</p>

                  <Link href="/dashboard/passes" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-primary px-3 py-2.5 text-sm font-bold text-white shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <QrCode className="h-4 w-4 text-cyan-200" />
                      <span>Digital Pass &amp; QR</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-cyan-200" />
                  </Link>

                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="h-4 w-4 text-slate-400" />
                      <span>Dashboard</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </Link>

                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm font-bold text-rose-700">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="h-4 w-4 text-rose-500" />
                        <span>Admin Console</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-rose-300" />
                    </Link>
                  )}

                  {isCoordinator && (
                    <Link href="/coordinator" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2.5 text-sm font-bold text-indigo-700">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="h-4 w-4 text-indigo-500" />
                        <span>Coordinator Hub</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-indigo-300" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="border-t border-slate-100 px-4 py-3 space-y-2">
              {/* Cart */}
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); openCart(); }}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span>Events Cart</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary text-white font-mono text-[10px] font-black">
                  {selectedEvents.length}
                </span>
              </button>

              {/* Logout */}
              {user && (
                <LogoutButton
                  variant="outline"
                  className="w-full justify-center py-2 text-xs rounded-xl"
                  onLogoutSuccess={() => setMobileMenuOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
