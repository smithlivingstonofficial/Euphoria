"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sparkles,
  Calendar,
  Layers,
  Bell,
  User,
  Menu,
  X,
  QrCode,
  ChevronRight,
  ShoppingBag,
  ShieldCheck,
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
  const { selectedEvents, openCart } = useCart();

  const navLinks = [
    { href: "/events", label: "Events", icon: Layers },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/announcements", label: "Announcements", icon: Bell },
  ];

  const isCoordinator =
    user?.role === "staff_coordinator" ||
    user?.role === "student_coordinator" ||
    user?.role === "coordinator" ||
    user?.role === "faculty" ||
    user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
              EUPHORIA
            </span>
            <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
              KARE • 2026
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary-light text-primary font-semibold border border-primary-border"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-slate-500")} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth / Action CTA */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openCart}
            className="relative flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs cursor-pointer"
            title="View selected events"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            <span>Cart</span>
            {selectedEvents.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">
                {selectedEvents.length}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                  <span>Admin Console</span>
                </Link>
              )}
              {isCoordinator && (
                <Link
                  href="/coordinator"
                  className="flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-indigo-100 transition-colors shadow-2xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Coordinator Hub</span>
                </Link>
              )}
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
              >
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/dashboard/passes"
                className="flex items-center gap-1.5 rounded-md bg-primary-light border border-primary-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-indigo-100 transition-colors"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>My Pass</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
              >
                <span>Register</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle & Cart */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={openCart}
            className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
            aria-label="View Cart"
          >
            <ShoppingBag className="h-5 w-5 text-primary" />
            {selectedEvents.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-xs">
                {selectedEvents.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-indigo-50 text-primary font-bold"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <link.icon className={cn("h-4 w-4", pathname === link.href ? "text-primary" : "text-slate-500")} />
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-200 py-2.5 text-xs font-bold text-rose-700"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                    Admin Console
                  </Link>
                )}
                {isCoordinator && (
                  <Link
                    href="/coordinator"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 py-2.5 text-xs font-bold text-primary"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Coordinator Hub
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-800"
                >
                  <User className="h-3.5 w-3.5 text-primary" />
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/passes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-xs"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  My Digital Pass
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-xs"
                >
                  Register for Euphoria
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
