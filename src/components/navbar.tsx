"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Calendar,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";

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
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { selectedEvents, openCart } = useCart();

  const navLinks = [
    {
      href: "/events",
      label: "Events Catalog",
      badge: "61",
      icon: Layers,
    },
    {
      href: "/schedule",
      label: "Schedule",
      badge: "2 Days",
      icon: Calendar,
    },
    {
      href: "/announcements",
      label: "Alerts",
      badge: "Live",
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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[990] w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-700 text-white shadow-md transition-transform group-hover:scale-105">
              <Sparkles className="h-4.5 w-4.5 text-cyan-200" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                EUPHORIA
              </span>
              <span className="text-[9px] font-mono font-bold tracking-widest text-primary uppercase mt-0.5">
                KARE 2026
              </span>
            </div>
          </Link>

          {/* Center Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                    isActive
                      ? "bg-white text-primary shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      isActive ? "text-primary" : "text-slate-400"
                    )}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action Row */}
          <div className="hidden md:flex items-center gap-3">
            {/* Cart Badge Button */}
            <button
              type="button"
              onClick={openCart}
              className="relative flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
              title="View selected competition slots"
            >
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>Cart</span>
              {selectedEvents.length > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-mono font-black text-white shadow-xs">
                  {selectedEvents.length}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-400">0</span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2" ref={dropdownRef}>
                {/* Primary Digital Pass CTA */}
                <Link
                  href="/dashboard/passes"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-black text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Pass QR</span>
                </Link>

                {/* Account Dropdown Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-primary font-mono text-[10px] font-black">
                      {user.email.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate font-mono text-[11px]">
                      {user.role === "admin"
                        ? "Admin"
                        : isCoordinator
                        ? "Coordinator"
                        : "Account"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                        userDropdownOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Dropdown Popover */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100 z-50">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          Signed In As
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user.email}
                        </p>
                      </div>

                      <div className="py-1 space-y-1">
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50/80 hover:bg-rose-100 transition-colors"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                            <span>Admin Console</span>
                          </Link>
                        )}

                        {isCoordinator && (
                          <Link
                            href="/coordinator"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-primary bg-indigo-50/80 hover:bg-indigo-100 transition-colors"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            <span>Coordinator Hub</span>
                          </Link>
                        )}

                        <Link
                          href="/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          <span>Participant Dashboard</span>
                        </Link>

                        <Link
                          href="/dashboard/passes"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <QrCode className="h-3.5 w-3.5 text-slate-500" />
                          <span>Digital Pass &amp; QR</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
                >
                  <span>Register Pass</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Action Row */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={openCart}
              className="relative flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingBag className="h-4 w-4 text-primary" />
              {selectedEvents.length > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-mono font-black text-white">
                  {selectedEvents.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl border border-slate-200/90 bg-slate-50 p-2 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Open side menu"
            >
              <Menu className="h-5 w-5 text-slate-800" />
            </button>
          </div>
        </div>
      </header>

      {/* Upgraded Portal Slide-over Mobile Side Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in-50 duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Right Slide-over Panel */}
          <div className="fixed inset-y-0 right-0 w-[85vw] max-w-xs bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 z-[10001]">
            <div className="p-5 space-y-5">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm font-black tracking-tight text-slate-900 block leading-none">
                      EUPHORIA
                    </span>
                    <span className="text-[9px] font-mono font-bold text-primary tracking-widest block mt-0.5">
                      KARE 2026
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Account Status Banner */}
              {user ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                      [ SIGNED_IN ]
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-primary font-mono text-[9px] font-bold uppercase">
                      {user.role === "admin"
                        ? "Admin"
                        : isCoordinator
                        ? "Coordinator"
                        : "Delegate"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate font-mono">
                    {user.email}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Delegate Pass</span>
                    <span className="text-[10px] font-mono text-slate-500 block">61 Events • 2 Slots</span>
                  </div>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold shadow-xs"
                  >
                    Get Pass
                  </Link>
                </div>
              )}

              {/* Navigation Links Cards */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase px-1">
                  // NAVIGATION
                </span>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3.5 py-3 text-xs font-bold transition-all border",
                        isActive
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white border-slate-200/90 text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isActive ? "text-cyan-300" : "text-primary"
                          )}
                        />
                        <span>{link.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                            isActive ? "bg-white/20 text-cyan-200" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {link.badge}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5",
                            isActive ? "text-cyan-300" : "text-slate-400"
                          )}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* User Dashboard & Action Shortcuts */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase px-1">
                  // ACTIONS
                </span>
                {user ? (
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/passes"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl bg-primary px-3.5 py-3 text-xs font-bold text-white shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-cyan-200" />
                        <span>Digital Pass &amp; QR</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-cyan-200" />
                    </Link>

                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span>Dashboard</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-3 text-xs font-bold text-rose-700"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-rose-600" />
                          <span>Admin Console</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-rose-400" />
                      </Link>
                    )}

                    {isCoordinator && (
                      <Link
                        href="/coordinator"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-3 text-xs font-bold text-primary"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span>Coordinator Hub</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800"
                    >
                      <LogIn className="h-3.5 w-3.5 text-primary" />
                      <span>Sign In</span>
                    </Link>

                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-xs"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      <span>Register</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Cart Trigger Row */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openCart();
                }}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span>Selected Events Cart</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary text-white font-mono text-[10px] font-black">
                  {selectedEvents.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
