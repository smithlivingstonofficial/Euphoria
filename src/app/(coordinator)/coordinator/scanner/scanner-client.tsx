"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { recordAttendanceCoordinator, CoordinatorEventItem } from "@/actions/coordinator";
import { UniversalQRScanner } from "@/components/scanner/universal-qr-scanner";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building,
  Sparkles,
  Camera,
  History,
  ShieldCheck,
  RefreshCw,
  Star,
  Check,
  X,
} from "lucide-react";

interface RecentScan {
  code: string;
  studentName: string;
  eventName: string;
  time: string;
  alreadyCheckedIn: boolean;
}

export function ScannerClient({
  assignedEvents,
}: {
  assignedEvents: CoordinatorEventItem[];
}) {
  const searchParams = useSearchParams();
  const initialEventParam = searchParams.get("event") || "all";

  const [selectedEventId, setSelectedEventId] = useState(initialEventParam);
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    alreadyCheckedIn?: boolean;
    message?: string;
    student?: any;
    event?: any;
    slotNumber?: number;
    registrationCode?: string;
    scannedAt?: string;
    error?: string;
  } | null>(null);

  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const sessionProcessedCodesRef = useRef<Set<string>>(new Set());

  const handleVerifyCode = async (codeToVerify: string, method: "qr_camera" | "manual_code_entry" = "manual_code_entry") => {
    if (!codeToVerify.trim()) return;

    // Extract code if JSON QR payload
    let cleanCode = codeToVerify.trim();
    if (cleanCode.startsWith("{") && cleanCode.includes("code")) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.code) cleanCode = parsed.code;
      } catch {
        // use raw string
      }
    }

    cleanCode = cleanCode.toUpperCase();

    // If already verified in this session and scanned via camera, ignore it
    if (method === "qr_camera" && sessionProcessedCodesRef.current.has(cleanCode)) {
      return;
    }

    setIsProcessing(true);
    setVerificationResult(null);

    const res = await recordAttendanceCoordinator({
      eventId: selectedEventId === "all" ? undefined : selectedEventId,
      registrationCode: cleanCode,
      scanMethod: method,
    });

    if (!res.success) {
      setVerificationResult({
        success: false,
        error: res.error || `Invalid or unassigned pass code "${cleanCode}".`,
      });
    } else {
      const { alreadyCheckedIn, student, event, slotNumber, registrationCode, scannedAt, message } = res;

      sessionProcessedCodesRef.current.add(cleanCode);
      if (registrationCode) {
        sessionProcessedCodesRef.current.add(registrationCode.toUpperCase());
      }

      setVerificationResult({
        success: true,
        alreadyCheckedIn,
        message,
        student,
        event,
        slotNumber,
        registrationCode,
        scannedAt,
      });

      if (student && event) {
        setRecentScans((prev) => [
          {
            code: cleanCode,
            studentName: student?.full_name || "Delegate",
            eventName: event?.name || "Competition",
            time: new Date().toLocaleTimeString(),
            alreadyCheckedIn: Boolean(alreadyCheckedIn),
          },
          ...prev.slice(0, 14),
        ]);
      }
      setManualCode("");
    }
    setIsProcessing(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyCode(manualCode, "manual_code_entry");
  };

  const handleCameraScan = (decodedText: string) => {
    handleVerifyCode(decodedText, "qr_camera");
  };

  return (
    <div className="space-y-6">
      {/* Event Filter & Scan Mode Selector */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-slate-700 block">
              Competition Check-In Gate
            </label>
            <p className="text-[11px] text-slate-400">
              Select a specific competition or scan across all your assigned events.
            </p>
          </div>

          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-primary focus:outline-none shadow-2xs max-w-sm truncate cursor-pointer"
          >
            <option value="all">Universal Gate (All Assigned Events)</option>
            {assignedEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name} ({evt.school_or_dept})
              </option>
            ))}
          </select>
        </div>

        {/* Input Methods: Manual Code Bar */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter or paste Pass Code (e.g. EUPH-26-XXXXXX)..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-all uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || !manualCode.trim()}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isProcessing ? (
              <span>Verifying...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Check In</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border shrink-0 ${
              isCameraActive
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70"
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>{isCameraActive ? "Hide Camera" : "Open Camera"}</span>
          </button>
        </form>

        {/* Live Universal QR Scanner */}
        {isCameraActive && (
          <div className="pt-2">
            <UniversalQRScanner
              isScanning={isCameraActive}
              onScanSuccess={handleCameraScan}
            />
          </div>
        )}
      </div>

      {/* Instant Verification Result Card */}
      {verificationResult && (
        <div
          className={`rounded-3xl border-2 p-6 shadow-md animate-in fade-in duration-200 ${
            verificationResult.success
              ? verificationResult.alreadyCheckedIn
                ? "border-amber-200 bg-amber-50/80 text-amber-950"
                : "border-emerald-200 bg-emerald-50/90 text-emerald-950"
              : "border-rose-200 bg-rose-50 text-rose-950"
          }`}
        >
          {verificationResult.success ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs ${
                      verificationResult.alreadyCheckedIn
                        ? "bg-amber-600"
                        : "bg-emerald-600"
                    }`}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold leading-tight">
                      {verificationResult.alreadyCheckedIn
                        ? "Already Checked-In"
                        : "Check-In Confirmed!"}
                    </h3>
                    <p className="text-xs opacity-80">{verificationResult.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {verificationResult.slotNumber && (
                    <span className="rounded-xl bg-indigo-600 text-white px-2.5 py-1 text-xs font-bold shadow-2xs">
                      Slot #{verificationResult.slotNumber}
                    </span>
                  )}
                  <span className="rounded-xl bg-white px-3 py-1 text-xs font-mono font-black shadow-2xs">
                    {verificationResult.registrationCode}
                  </span>
                </div>
              </div>

              {/* Student Credential Box */}
              {verificationResult.student && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 rounded-2xl p-4 border border-black/5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Delegate Name
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                      {verificationResult.student.full_name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {verificationResult.student.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Institution / College
                    </span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {verificationResult.student.college_name ||
                        verificationResult.student.department ||
                        "Kalasalingam University"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Reg: {verificationResult.student.register_number || "N/A"}
                    </span>
                  </div>

                  {verificationResult.event && (
                    <div className="sm:col-span-2 border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Verified Competition Entry
                      </span>
                      <span className="font-extrabold text-primary block mt-0.5">
                        {verificationResult.event.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Venue: {verificationResult.event.venue}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shrink-0 shadow-xs">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-rose-950">Verification Denied</h3>
                <p className="text-xs text-rose-800 leading-snug">
                  {verificationResult.error}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Session Scan Stream */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <History className="h-4 w-4 text-primary" />
            <span>Recent Gate Check-In Stream</span>
          </div>
          <span className="text-xs text-slate-400">
            {recentScans.length} verified this session
          </span>
        </div>

        {recentScans.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentScans.map((scan, i) => (
              <div
                key={i}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-xl font-bold text-[10px] ${
                      scan.alreadyCheckedIn
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {scan.alreadyCheckedIn ? "DUP" : "OK"}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {scan.studentName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {scan.eventName}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="font-bold text-slate-700 text-[11px] block">
                    {scan.code}
                  </span>
                  <span className="text-[10px] text-slate-400">{scan.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No QR passes scanned in this session yet. Ready for check-ins!
          </div>
        )}
      </div>
    </div>
  );
}
