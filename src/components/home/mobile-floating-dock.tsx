"use client";

import Link from "next/link";
import { Zap, Calendar, Ticket, QrCode } from "lucide-react";

interface MobileFloatingDockProps {
  userRole?: string;
  hasPass?: boolean;
}

export function MobileFloatingDock({ userRole, hasPass }: MobileFloatingDockProps) {
  return (
    <div className="fixed bottom-3 inset-x-3 z-40 sm:hidden">
      <div className="flex items-center justify-around bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 shadow-xl text-slate-900 shadow-slate-200/80">
        <Link
          href="/events"
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
        >
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-mono font-bold">61 Events</span>
        </Link>

        <Link
          href="/schedule"
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
        >
          <Calendar className="h-4 w-4 text-indigo-600" />
          <span className="text-[10px] font-mono font-bold">Schedule</span>
        </Link>

        <Link
          href={hasPass ? "/dashboard/passes" : "/register"}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-black text-xs shadow-md active:scale-95 transition-all"
        >
          {hasPass ? (
            <>
              <QrCode className="h-4 w-4" />
              <span>Pass QR</span>
            </>
          ) : (
            <>
              <Ticket className="h-4 w-4" />
              <span>Get Pass</span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
