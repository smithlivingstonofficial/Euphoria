import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/60 bg-white/80 backdrop-blur-md py-2 text-slate-400 print:hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4 text-[11px]">
          
          {/* Brand & University Tagline */}
          <div className="flex items-center gap-1.5 text-slate-600 flex-wrap justify-center sm:justify-start">
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            <span className="font-bold text-slate-900 tracking-tight font-display text-xs">
              EUPHORIA 2026
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">
              Kalasalingam University (KARE)
            </span>
          </div>

          {/* Minimalist Navigation & Copyright */}
          <div className="flex items-center gap-2 sm:gap-3 text-slate-500 font-medium">
            <Link href="/events" className="hover:text-primary transition-colors">
              Events
            </Link>
            <span className="text-slate-200">•</span>
            <Link href="/campus-map" className="hover:text-primary transition-colors">
              Map
            </Link>
            <span className="text-slate-200">•</span>
            <Link href="/announcements" className="hover:text-primary transition-colors">
              Alerts
            </Link>
            <span className="text-slate-200">•</span>
            <span className="text-slate-400">&copy; 2026 KARE</span>
          </div>

        </div>
      </div>
    </footer>
  );
}
