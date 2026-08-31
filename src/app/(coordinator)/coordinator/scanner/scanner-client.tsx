"use client";

import { useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { recordAttendanceCoordinator, CoordinatorEventItem } from "@/actions/coordinator";
import { UniversalQRScanner } from "@/components/scanner/universal-qr-scanner";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  History,
  ShieldCheck,
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

  // Check if launched for a specific event
  const specificEvent = useMemo(() => {
    if (!initialEventParam || initialEventParam === "all") return null;
    return assignedEvents.find((e) => e.id === initialEventParam) || null;
  }, [initialEventParam, assignedEvents]);

  const handleVerifyCode = async (
    codeToVerify: string,
    method: "qr_camera" | "manual_code_entry" = "manual_code_entry"
  ) => {
    if (!codeToVerify.trim()) return;

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

    if (method === "qr_camera" && sessionProcessedCodesRef.current.has(cleanCode)) {
      return;
    }

    setIsProcessing(true);
    setVerificationResult(null);

    const targetEventId = specificEvent ? specificEvent.id : (selectedEventId === "all" ? undefined : selectedEventId);

    const res = await recordAttendanceCoordinator({
      eventId: targetEventId,
      registrationCode: cleanCode,
      scanMethod: method,
    });

    if (!res.success) {
      setVerificationResult({
        success: false,
        error: res.error || `Pass Code "${cleanCode}" is invalid or not registered.`,
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
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    <div className="space-y-3">
      {/* ULTRA-COMPACT MAIN SCANNER CONTAINER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs space-y-2.5">
        {/* In-Card Event Header / Dropdown */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          {specificEvent ? (
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight">
                  {specificEvent.name}
                </h1>
                <p className="text-[10px] font-semibold text-slate-500 truncate">
                  {specificEvent.school_or_dept} • Gate Terminal
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none cursor-pointer truncate"
              >
                <option value="all">Universal Gate (All Assigned Events)</option>
                {assignedEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.school_or_dept})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Input Bar & Controls */}
        <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter Pass Code (e.g. EUPH-26-XXXXXX)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors uppercase"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isProcessing || !manualCode.trim()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isProcessing ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Verify Pass</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCameraActive(!isCameraActive)}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer border shrink-0 ${
                isCameraActive
                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{isCameraActive ? "Hide Camera" : "Open Camera"}</span>
            </button>
          </div>
        </form>

        {/* Embedded Universal QR Scanner */}
        {isCameraActive && (
          <div className="pt-0.5">
            <UniversalQRScanner
              isScanning={isCameraActive}
              onScanSuccess={handleCameraScan}
            />
          </div>
        )}
      </div>

      {/* VERIFICATION RESULT CREDENTIAL CARD */}
      {verificationResult && (
        <div
          className={`rounded-2xl border-2 p-3.5 shadow-xs transition-all animate-in fade-in duration-150 ${
            verificationResult.success
              ? verificationResult.alreadyCheckedIn
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-rose-300 bg-rose-50 text-rose-950"
          }`}
        >
          {verificationResult.success ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-2xs ${
                      verificationResult.alreadyCheckedIn ? "bg-amber-600" : "bg-emerald-600"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900">
                      {verificationResult.alreadyCheckedIn
                        ? "Already Checked-In"
                        : "Verified Entry!"}
                    </h3>
                    <p className="text-[11px] text-slate-600">{verificationResult.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {verificationResult.slotNumber && (
                    <span className="rounded-lg bg-indigo-50 border border-indigo-100 text-primary px-2 py-0.5 text-[11px] font-bold font-mono">
                      Slot #{verificationResult.slotNumber}
                    </span>
                  )}
                  <span className="rounded-lg bg-white border border-slate-200 text-slate-900 px-2.5 py-0.5 text-[11px] font-mono font-bold">
                    {verificationResult.registrationCode}
                  </span>
                </div>
              </div>

              {/* Student Credential Info */}
              {verificationResult.student && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white rounded-xl p-2.5 border border-slate-200/70">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Delegate Name
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                      {verificationResult.student.full_name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {verificationResult.student.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Institution / College
                    </span>
                    <span className="font-bold text-slate-800 block mt-0.5 text-xs">
                      {verificationResult.student.college_name ||
                        verificationResult.student.department ||
                        "KARE"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Reg: {verificationResult.student.register_number || "N/A"}
                    </span>
                  </div>

                  {verificationResult.event && (
                    <div className="sm:col-span-2 border-t border-slate-100 pt-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Verified Event
                      </span>
                      <span className="font-extrabold text-primary block text-xs mt-0.5">
                        {verificationResult.event.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Venue: {verificationResult.event.venue}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shrink-0 shadow-2xs">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-extrabold text-slate-900">Verification Denied</h3>
                <p className="text-[11px] text-rose-800 leading-snug">
                  {verificationResult.error}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECENT SCAN SESSION STREAM */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
            <History className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Gate Activity Log</span>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-mono">
            {recentScans.length} Verified
          </span>
        </div>

        {recentScans.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
            {recentScans.map((scan, i) => (
              <div
                key={i}
                className="py-1.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md font-black text-[9px] shrink-0 ${
                      scan.alreadyCheckedIn
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {scan.alreadyCheckedIn ? "DUP" : "OK"}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 block truncate text-[11px]">
                      {scan.studentName}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {scan.eventName}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className="font-bold text-slate-800 text-[10px] block">
                    {scan.code}
                  </span>
                  <span className="text-[9px] text-slate-400">{scan.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 text-xs italic">
            No QR passes scanned in this session yet.
          </div>
        )}
      </div>
    </div>
  );
}
