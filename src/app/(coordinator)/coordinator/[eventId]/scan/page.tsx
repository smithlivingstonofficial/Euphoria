"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Camera,
  ArrowLeft,
  Volume2,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function CoordinatorScanTerminalPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) || "evt-01";

  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: "success" | "duplicate" | "invalid";
    participantName?: string;
    regNumber?: string;
    department?: string;
    scannedAt?: string;
    message?: string;
  } | null>(null);

  const [checkinCount, setCheckinCount] = useState(48);
  const totalCapacity = 120;

  const simulateScan = (codeToTest: string) => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      if (codeToTest.toUpperCase().includes("DUP")) {
        setScanResult({
          status: "duplicate",
          participantName: "Rahul V.",
          regNumber: "9922004088",
          department: "SCSE - Computer Science",
          scannedAt: "09:42 AM",
          message: "Pass already checked-in at 09:42 AM by Coordinator Priya M.",
        });
      } else if (codeToTest.toUpperCase().includes("INV")) {
        setScanResult({
          status: "invalid",
          message: "Invalid pass signature or wrong event venue. Verification rejected.",
        });
      } else {
        setScanResult({
          status: "success",
          participantName: "Anand Kumar",
          regNumber: "9922004001",
          department: "SCSE - Computer Science",
          scannedAt: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        setCheckinCount((prev) => prev + 1);
      }
    }, 400);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      {/* Coordinator Slim Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Exit Terminal</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold font-mono text-slate-200">
              SCAN TERMINAL • LIVE
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-primary">
            {checkinCount} / {totalCapacity}
          </div>
        </div>
      </header>

      {/* Main Scanner Container */}
      <main className="flex-1 p-4">
        <div className="mx-auto max-w-lg space-y-4">
          {/* Event Context Header */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Assigned Event Check-in
            </div>
            <h2 className="text-sm font-bold text-white">
              CodeSprint: Speed Algorithm Battle
            </h2>
            <div className="text-xs text-slate-400">Main Computing Lab 4, Admin Block 3rd Floor</div>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-800 p-1 text-xs font-semibold">
            <button
              onClick={() => {
                setMode("camera");
                setScanResult(null);
              }}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                mode === "camera" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Camera Scanner</span>
            </button>
            <button
              onClick={() => {
                setMode("manual");
                setScanResult(null);
              }}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                mode === "manual" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Manual Search</span>
            </button>
          </div>

          {/* Camera Viewfinder View */}
          {mode === "camera" && (
            <div className="space-y-4">
              <div className="relative aspect-square w-full rounded-2xl border-2 border-slate-700 bg-black flex flex-col items-center justify-center overflow-hidden">
                {/* Simulated Camera Target Frame */}
                <div className="relative h-56 w-56 rounded-xl border-2 border-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-primary" />

                  {/* Scanning Animation Bar */}
                  <div className="w-full h-0.5 bg-primary/80 animate-bounce" />
                </div>

                <p className="absolute bottom-4 text-xs font-medium text-slate-400">
                  Align participant pass QR within frame
                </p>
              </div>

              {/* Fast Test Simulation Triggers */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => simulateScan("EUPH-26-PASS")}
                  disabled={isScanning}
                  className="rounded-lg bg-slate-800 border border-slate-700 py-2 px-2 text-[11px] font-semibold text-emerald-400 hover:bg-slate-700 transition-colors"
                >
                  Test Valid Scan
                </button>
                <button
                  onClick={() => simulateScan("EUPH-26-DUP")}
                  disabled={isScanning}
                  className="rounded-lg bg-slate-800 border border-slate-700 py-2 px-2 text-[11px] font-semibold text-amber-400 hover:bg-slate-700 transition-colors"
                >
                  Test Duplicate Scan
                </button>
                <button
                  onClick={() => simulateScan("EUPH-26-INV")}
                  disabled={isScanning}
                  className="rounded-lg bg-slate-800 border border-slate-700 py-2 px-2 text-[11px] font-semibold text-rose-400 hover:bg-slate-700 transition-colors"
                >
                  Test Invalid Pass
                </button>
              </div>
            </div>
          )}

          {/* Manual Search Mode */}
          {mode === "manual" && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Participant Register Number or Code
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 9922004001 or EUPH-26-A8K9M2"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
                />
              </div>

              <button
                onClick={() => simulateScan(manualCode || "EUPH-26-A8K9M2")}
                disabled={isScanning}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search & Verify Attendance</span>
              </button>
            </div>
          )}

          {/* Verification Result Drawer */}
          {scanResult && (
            <div
              className={`rounded-2xl p-5 border shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200 ${
                scanResult.status === "success"
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-100"
                  : scanResult.status === "duplicate"
                  ? "bg-amber-950/80 border-amber-500 text-amber-100"
                  : "bg-rose-950/80 border-rose-500 text-rose-100"
              }`}
            >
              <div className="flex items-start gap-3">
                {scanResult.status === "success" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : scanResult.status === "duplicate" ? (
                  <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                  <div className="text-sm font-bold">
                    {scanResult.status === "success"
                      ? "CHECK-IN VERIFIED"
                      : scanResult.status === "duplicate"
                      ? "DUPLICATE SCAN WARNING"
                      : "ACCESS REJECTED"}
                  </div>

                  {scanResult.status === "success" && (
                    <div className="text-xs space-y-0.5 pt-1">
                      <div className="font-bold text-white text-base">
                        {scanResult.participantName}
                      </div>
                      <div className="font-mono text-emerald-200">
                        {scanResult.regNumber} • {scanResult.department}
                      </div>
                      <div className="text-emerald-300 text-[11px]">
                        Scanned at {scanResult.scannedAt} • Attendance Logged
                      </div>
                    </div>
                  )}

                  {scanResult.status === "duplicate" && (
                    <div className="text-xs space-y-0.5 pt-1">
                      <div className="font-bold text-white text-base">
                        {scanResult.participantName}
                      </div>
                      <p className="text-amber-200">{scanResult.message}</p>
                    </div>
                  )}

                  {scanResult.status === "invalid" && (
                    <div className="text-xs pt-1 text-rose-200">
                      {scanResult.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
