import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Left: Brand & University */}
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-white">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">EUPHORIA &apos;26</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Kalasalingam Academy of Research and Education</span>
        </div>

        {/* Right: Quick Links & Copyright */}
        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
          <Link href="/events" className="hover:text-primary transition-colors">
            Events (61)
          </Link>
          <Link href="/campus-map" className="hover:text-primary transition-colors">
            Campus Map
          </Link>
          <Link href="/announcements" className="hover:text-primary transition-colors">
            Alerts
          </Link>
          <span className="text-slate-300">|</span>
          <span>&copy; 2026 KARE. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
