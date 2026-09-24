"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  recordAttendanceCoordinator,
  CoordinatorEventItem,
  getEventScannerControlForCoordinatorAction,
  EventScannerControlData,
  updateEventSectionStaffAction,
  toggleEventScannerStatusStaffAction,
} from "@/actions/coordinator";
import { UniversalQRScanner } from "@/components/scanner/universal-qr-scanner";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Camera,
  History,
  ShieldCheck,
  Check,
  X,
  Lock,
  Calendar,
  Sparkles,
  Sun,
  Moon,
  Layers,
  Play,
  Pause,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface RecentScan {
  code: string;
  studentName: string;
  eventName: string;
  sectionName?: string;
  time: string;
  alreadyCheckedIn: boolean;
}

export function ScannerClient({
  assignedEvents,
}: {
  assignedEvents: CoordinatorEventItem[];
}) {
  const searchParams = useSearchParams();
  const initialEventParam = searchParams.get("event") || searchParams.get("eventId") || "";

  const isAdmin = useMemo(() => {
    return assignedEvents.some((e) => e.roleType === "admin");
  }, [assignedEvents]);

  // Check if launched for a specific event
  const specificEvent = useMemo(() => {
    if (!initialEventParam || initialEventParam === "all") return null;
    return assignedEvents.find((e) => e.id === initialEventParam) || null;
  }, [initialEventParam, assignedEvents]);

  // Zero-Clash Default:
  // For coordinators, ALWAYS default to their assigned event (NEVER "all"!).
  // For Admins, allow "all" if specifically requested or if no assigned events.
  const initialSelectedId = useMemo(() => {
    if (specificEvent) return specificEvent.id;
    if (initialEventParam && initialEventParam !== "all") {
      const found = assignedEvents.find((e) => e.id === initialEventParam);
      if (found) return found.id;
    }
    if (assignedEvents.length > 0) {
      if (!isAdmin) return assignedEvents[0].id;
      return initialEventParam === "all" ? "all" : assignedEvents[0].id;
    }
    return isAdmin ? "all" : "";
  }, [specificEvent, initialEventParam, assignedEvents, isAdmin]);

  const [selectedEventId, setSelectedEventId] = useState(initialSelectedId);
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
    sectionNumber?: number;
    sectionName?: string;
    error?: string;
  } | null>(null);

  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Scanner controls & round management state
  const [scannerControl, setScannerControl] = useState<EventScannerControlData | null>(null);
  const [masterScannerEnabled, setMasterScannerEnabled] = useState(true);
  const [globalDateBypass, setGlobalDateBypass] = useState(false);
  const [sectionCounts, setSectionCounts] = useState<Record<number, number>>({});
  const [canStaffSwitch, setCanStaffSwitch] = useState(false);
  const [isLoadingControls, setIsLoadingControls] = useState(false);

  // Fail-Safe Round Switch Modal state
  const [isConfirmSwitchModalOpen, setIsConfirmSwitchModalOpen] = useState(false);
  const [pendingSwitchSection, setPendingSwitchSection] = useState<number | null>(null);
  const [isSwitchingSection, setIsSwitchingSection] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isTogglingScanner, setIsTogglingScanner] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const processedCodeCooldownsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Current date in Indian Standard Time (Asia/Kolkata)
  const todayIST = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const activeEvent = useMemo(() => {
    if (specificEvent) return specificEvent;
    if (selectedEventId && selectedEventId !== "all") {
      return assignedEvents.find((e) => e.id === selectedEventId) || null;
    }
    if (assignedEvents.length === 1) return assignedEvents[0];
    return null;
  }, [specificEvent, selectedEventId, assignedEvents]);

  // Reset scan cooldowns when desk or section changes so attendees can be scanned smoothly
  useEffect(() => {
    processedCodeCooldownsRef.current.forEach(clearTimeout);
    processedCodeCooldownsRef.current.clear();
  }, [selectedEventId, scannerControl?.currentSection]);

  useEffect(() => {
    return () => {
      processedCodeCooldownsRef.current.forEach(clearTimeout);
      processedCodeCooldownsRef.current.clear();
    };
  }, []);

  // Gate is open on the day of competition OR when Admin authorizes Early Scan / Global Bypass
  const isEventDay = useMemo(() => {
    if (activeEvent) {
      return activeEvent.event_date === todayIST;
    }
    return assignedEvents.some((e) => e.event_date === todayIST);
  }, [activeEvent, assignedEvents, todayIST]);

  const isDateBypassed = globalDateBypass || Boolean(scannerControl?.allowEarlyScan);
  const isScannerDayLocked = !isAdmin && !isEventDay && !isDateBypassed;
  const isGlobalEmergencyLocked = !masterScannerEnabled && !isAdmin;
  const isEventPaused = scannerControl?.scannerStatus === "paused";
  const isEventClosed = scannerControl?.scannerStatus === "closed";
  const isEffectivelyLocked = isScannerDayLocked || isGlobalEmergencyLocked || isEventPaused || isEventClosed;

  // Synchronize Scanner Controls whenever active event changes
  useEffect(() => {
    if (!activeEvent?.id) {
      setScannerControl(null);
      return;
    }

    let isMounted = true;
    async function loadControl() {
      if (typeof document !== "undefined" && document.hidden) return;
      setIsLoadingControls(true);
      try {
        const res = await getEventScannerControlForCoordinatorAction(activeEvent!.id);
        if (isMounted && res.success) {
          if (res.control) setScannerControl(res.control);
          setMasterScannerEnabled(res.masterScannerEnabled);
          setGlobalDateBypass(Boolean(res.globalDateBypass));
          setSectionCounts(res.sectionCounts || {});
          setCanStaffSwitch(res.canStaffSwitch);
        }
      } catch (e) {
        console.error("Failed to load event scanner control", e);
      } finally {
        if (isMounted) setIsLoadingControls(false);
      }
    }

    loadControl();
    // 60-second gentle polling ONLY when the camera scanner tab is actively visible
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadControl();
      }
    }, 60000);

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadControl();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeEvent?.id]);

  const handleClearVerificationResult = () => {
    processedCodeCooldownsRef.current.forEach(clearTimeout);
    processedCodeCooldownsRef.current.clear();
    setVerificationResult(null);
    setManualCode("");
    if (inputRef.current && !isCameraActive) {
      inputRef.current.focus();
    }
  };

  const handleVerifyCode = async (
    codeToVerify: string,
    method: "qr_camera" | "manual_code_entry" = "manual_code_entry"
  ) => {
    if (!codeToVerify.trim()) return;
    if (isProcessingRef.current) return;

    let cleanCode = codeToVerify.trim();
    let parsedEvents: Array<{ id: string; name: string }> | null = null;
    let participantName: string | null = null;

    if (cleanCode.startsWith("{") && cleanCode.includes("code")) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.code) cleanCode = String(parsed.code).trim();
        if (parsed.name) participantName = String(parsed.name).trim();
        if (Array.isArray(parsed.events)) parsedEvents = parsed.events;
      } catch {
        // use raw string
      }
    }

    cleanCode = cleanCode.toUpperCase();

    const targetEventId = activeEvent?.id;
    const currentSec = scannerControl?.currentSection || 1;
    const scopedKey = `${targetEventId || "any"}_sec${currentSec}_${cleanCode}`;

    if (method === "qr_camera" && processedCodeCooldownsRef.current.has(scopedKey)) {
      return;
    }

    // Zero-Clash Gate Desk Validation:
    if (!targetEventId && !isAdmin) {
      setVerificationResult({
        success: false,
        error: "Please select a specific competition desk above before scanning passes.",
      });
      return;
    }

    // Zero-Egress Client-Side Pre-Validation:
    // If scanning for a specific event and the QR payload includes registered events:
    if (activeEvent && parsedEvents && parsedEvents.length > 0) {
      const isEnrolledInActiveEvent = parsedEvents.some((e) => e.id === activeEvent.id);
      if (!isEnrolledInActiveEvent) {
        // Cooldown on mismatch to prevent hammering on camera frame loop
        const timer = setTimeout(() => {
          processedCodeCooldownsRef.current.delete(scopedKey);
        }, 3000);
        processedCodeCooldownsRef.current.set(scopedKey, timer);

        // REJECT INSTANTLY: 0 MS, 0 DB CALLS, 0 EGRESS!
        const otherNames = parsedEvents.map((e) => `"${e.name || "Competition"}"`).join(", ");
        setVerificationResult({
          success: false,
          error: `NOT ENROLLED IN THIS EVENT: Participant "${participantName || "Delegate"}" is enrolled in [${otherNames}], NOT "${activeEvent.name}". Please redirect them to their designated venue.`,
        });
        return;
      }
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    setVerificationResult(null);

    try {
      const res = await recordAttendanceCoordinator({
        eventId: targetEventId,
        registrationCode: cleanCode,
        scanMethod: method,
      });

      // Cooldown timer to prevent repetitive duplicate requests from camera stream
      const timer = setTimeout(() => {
        processedCodeCooldownsRef.current.delete(scopedKey);
      }, 3500);
      processedCodeCooldownsRef.current.set(scopedKey, timer);

      if (!res.success) {
        setVerificationResult({
          success: false,
          error: res.error || `Pass Code "${cleanCode}" is invalid or not registered.`,
        });
      } else {
        const {
          alreadyCheckedIn,
          student,
          event,
          slotNumber,
          registrationCode,
          scannedAt,
          message,
          sectionNumber,
          sectionName,
        } = res;

        setVerificationResult({
          success: true,
          alreadyCheckedIn,
          message,
          student,
          event,
          slotNumber,
          registrationCode,
          scannedAt,
          sectionNumber,
          sectionName,
        });

        // Update local turnout count
        if (!alreadyCheckedIn && sectionNumber) {
          setSectionCounts((prev) => ({
            ...prev,
            [sectionNumber]: (prev[sectionNumber] || 0) + 1,
          }));
        }

        if (student && event) {
          setRecentScans((prev) => [
            {
              code: cleanCode,
              studentName: student?.full_name || "Delegate",
              eventName: event?.name || "Competition",
              sectionName:
                sectionName ||
                (scannerControl && scannerControl.sectionLabels[scannerControl.currentSection - 1]) ||
                "Standard",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              alreadyCheckedIn: Boolean(alreadyCheckedIn),
            },
            ...prev.slice(0, 14),
          ]);
        }
        setManualCode("");
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        error: err?.message || "Failed to contact gate server. Please try again.",
      });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEffectivelyLocked) return;
    handleVerifyCode(manualCode, "manual_code_entry");
  };

  const handleCameraScan = (decodedText: string) => {
    if (isEffectivelyLocked) return;
    handleVerifyCode(decodedText, "qr_camera");
  };

  // Staff Section Switching with Fail-Safe Dialog
  const handleExecuteSectionSwitch = async () => {
    if (!activeEvent?.id || pendingSwitchSection === null) return;
    setIsSwitchingSection(true);
    setSwitchError(null);
    try {
      const res = await updateEventSectionStaffAction({
        eventId: activeEvent.id,
        targetSection: pendingSwitchSection,
      });
      if (res.success) {
        setScannerControl((prev) => (prev ? { ...prev, currentSection: pendingSwitchSection } : null));
        setIsConfirmSwitchModalOpen(false);
        setPendingSwitchSection(null);
      } else {
        setSwitchError(res.error || "Failed to switch section");
      }
    } catch (e: any) {
      setSwitchError(e?.message || "Failed to switch section");
    } finally {
      setIsSwitchingSection(false);
    }
  };

  // Staff Scanner Pause / Resume
  const handleToggleScannerStatus = async (newStatus: "active" | "paused") => {
    if (!activeEvent?.id || isTogglingScanner) return;
    setIsTogglingScanner(true);
    try {
      const res = await toggleEventScannerStatusStaffAction({
        eventId: activeEvent.id,
        newStatus,
      });
      if (res.success) {
        setScannerControl((prev) => (prev ? { ...prev, scannerStatus: newStatus } : null));
      }
    } catch (e) {
      console.error("Failed to toggle scanner status", e);
    } finally {
      setIsTogglingScanner(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ULTRA-COMPACT MAIN SCANNER CONTAINER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs space-y-2.5">
        {/* In-Card Event Header / Dropdown */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          {specificEvent ? (
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight">
                    {specificEvent.name}
                  </h1>
                  <p className="text-[10px] font-semibold text-slate-500 truncate">
                    {specificEvent.school_or_dept} • Gate Terminal
                  </p>
                </div>
              </div>
              {assignedEvents.length > 1 && (
                <Link
                  href="/coordinator/scanner"
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline shrink-0 ml-2"
                >
                  Switch Desk
                </Link>
              )}
            </div>
          ) : (
            <div className="w-full">
              {assignedEvents.length === 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
                  No competitions assigned to your coordinator account.
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Competition Gate Desk:
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {assignedEvents.length} Assigned {assignedEvents.length === 1 ? "Event" : "Events"}
                    </span>
                  </div>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none cursor-pointer truncate shadow-2xs"
                  >
                    {isAdmin && (
                      <option value="all">⚡ Universal Gate (Admin Badge Inspector)</option>
                    )}
                    {assignedEvents.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.name} ({evt.school_or_dept})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Schedule Status Badge */}
          {activeEvent && (
            <div className="shrink-0">
              {isEventDay ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Today</span>
                </span>
              ) : isDateBypassed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-1 text-[10px] font-extrabold text-amber-900 shadow-2xs">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>Early Check-in Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">
                  <Calendar className="h-3 w-3 text-amber-600" />
                  <span>Scheduled {formatDate(activeEvent.event_date)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ADMIN / PRE-EVENT REHEARSAL BANNER */}
        {!isEventDay && (isAdmin || isDateBypassed) && (
          <div className="rounded-xl bg-amber-50/90 border border-amber-200 px-3 py-2 text-amber-950 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-[11px] font-semibold text-amber-950">
                <strong>Pre-Event Access Active:</strong> Scanner opened ahead of official date ({activeEvent ? formatDate(activeEvent.event_date) : "Event Day"}) by Administration. Passes can be verified live.
              </span>
            </div>
          </div>
        )}

        {/* 1. CENTRAL ADMINISTRATION EMERGENCY LOCKOUT */}
        {isGlobalEmergencyLocked ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-5 sm:p-6 text-center space-y-2.5 my-2">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-200/90 px-2.5 py-0.5 text-[10px] font-black text-rose-950">
                Campus-Wide Hold
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Scanner Temporarily Locked by Administration
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Central Control Desk has paused all gate check-ins campus-wide. Pass scanning will automatically resume once the hold is lifted.
              </p>
            </div>
          </div>
        ) : isScannerDayLocked ? (
          /* 2. NON-EVENT DAY LOCKOUT */
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/70 via-white to-white p-6 sm:p-8 text-center space-y-3.5 my-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs">
              <Lock className="h-6 w-6" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-0.5 text-xs font-black text-amber-900 border border-amber-300">
                <Calendar className="h-3.5 w-3.5 text-amber-700" />
                <span>Opens on Competition Day ({activeEvent ? formatDate(activeEvent.event_date) : "Event Day"})</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Attendance QR Scanning Locked
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gate check-in terminal and camera QR pass verification for{" "}
                <strong>{activeEvent ? activeEvent.name : "this competition"}</strong> will activate automatically on the day of the event.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-slate-600 border border-slate-200">
                Today: {todayIST}
              </span>
              <span className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 font-mono font-bold text-indigo-800">
                Event Date: {activeEvent?.event_date || "2026-09-25"}
              </span>
            </div>
          </div>
        ) : isEventPaused ? (
          /* 3. EVENT SCANNER PAUSED BY STAFF COORDINATOR */
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-center space-y-2.5 my-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Pause className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Check-Ins Temporarily Paused
              </h3>
              <p className="text-xs text-slate-600">
                The scanner for <strong>{activeEvent?.name}</strong> has been paused by the Faculty Coordinator. Please hold incoming participants.
              </p>
            </div>

            {canStaffSwitch && (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={isTogglingScanner}
                  onClick={() => handleToggleScannerStatus("active")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Resume Scanner Now</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 4. ACTIVE SCANNER WORKSPACE */
          <>
            {/* ACTIVE ROUND / SECTION PILL BANNER */}
            {activeEvent && scannerControl && (
              <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-sky-50/40 to-white p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0 shadow-2xs">
                    {scannerControl.currentSection === 1 ? (
                      <Sun className="h-4 w-4 text-amber-300" />
                    ) : (
                      <Moon className="h-4 w-4 text-sky-200" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                        Active Attendance Round
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live Scanning</span>
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {scannerControl.sectionLabels[scannerControl.currentSection - 1] ||
                        `Section ${scannerControl.currentSection}`}
                      <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                        (Round {scannerControl.currentSection} of {scannerControl.totalSections})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Round Turnout
                    </span>
                    <span className="text-xs sm:text-sm font-black text-indigo-950 font-mono">
                      {sectionCounts[scannerControl.currentSection] || 0}
                    </span>
                  </div>

                  {/* Staff Coordinator Fast Controls */}
                  {canStaffSwitch && (
                    <div className="flex items-center gap-1.5 border-l border-indigo-100 pl-2">
                      {scannerControl.totalSections > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextSec =
                              scannerControl.currentSection >= scannerControl.totalSections
                                ? 1
                                : scannerControl.currentSection + 1;
                            setPendingSwitchSection(nextSec);
                            setIsConfirmSwitchModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                          title="Switch to next round with fail-safe confirmation"
                        >
                          <Layers className="h-3 w-3" />
                          <span className="hidden sm:inline">Change Round</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleScannerStatus("paused")}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Pause scanner"
                      >
                        <Pause className="h-3 w-3 text-amber-600" />
                        <span className="hidden sm:inline">Pause</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
          </>
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

                <div className="flex items-center gap-1.5 flex-wrap">
                  {verificationResult.sectionName && (
                    <span className="rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 px-2 py-0.5 text-[11px] font-bold">
                      {verificationResult.sectionName}
                    </span>
                  )}
                  {verificationResult.slotNumber && (
                    <span className="rounded-lg bg-indigo-50 border border-indigo-100 text-primary px-2 py-0.5 text-[11px] font-bold font-mono">
                      Slot #{verificationResult.slotNumber}
                    </span>
                  )}
                  <span className="rounded-lg bg-white border border-slate-200 text-slate-900 px-2.5 py-0.5 text-[11px] font-mono font-bold">
                    {verificationResult.registrationCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearVerificationResult}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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

              <div className="flex items-center justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleClearVerificationResult}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Ready for Next Pass</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0 shadow-2xs mt-0.5",
                      verificationResult.error?.includes("NOT ENROLLED")
                        ? "bg-amber-600"
                        : "bg-rose-600"
                    )}
                  >
                    {verificationResult.error?.includes("NOT ENROLLED") ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-black text-slate-900">
                        {verificationResult.error?.includes("NOT ENROLLED")
                          ? "Event Mismatch (Wrong Room/Venue)"
                          : "Verification Denied"}
                      </h3>
                      {verificationResult.error?.includes("NOT ENROLLED") && (
                        <span className="rounded bg-amber-200/80 px-1.5 py-0.2 text-[9px] font-bold text-amber-950 uppercase border border-amber-300/80">
                          Redirect Participant
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-slate-800 leading-relaxed">
                      {verificationResult.error}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearVerificationResult}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                  title="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleClearVerificationResult}
                  className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Dismiss Notice</span>
                </button>
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
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
                      <span className="truncate">{scan.eventName}</span>
                      {scan.sectionName && (
                        <span className="rounded bg-indigo-50 border border-indigo-200 text-indigo-800 px-1 py-0.2 text-[9px] font-bold shrink-0">
                          {scan.sectionName}
                        </span>
                      )}
                    </div>
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

      {/* FAIL-SAFE CONFIRMATION MODAL FOR SECTION SWITCH */}
      {isConfirmSwitchModalOpen && pendingSwitchSection !== null && scannerControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Confirm Round Switch</h3>
                <p className="text-xs text-slate-500">Live attendance check-in window</p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-950 space-y-2">
              <p>
                You are about to switch the live attendance scan window to:
              </p>
              <div className="rounded-lg bg-white p-2.5 font-black text-slate-900 border border-amber-300 flex items-center justify-between">
                <span>
                  Round {pendingSwitchSection}:{" "}
                  {scannerControl.sectionLabels[pendingSwitchSection - 1] || `Section ${pendingSwitchSection}`}
                </span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  Upcoming
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                ⚠️ <strong>Fail-Safe Notice:</strong> Once activated, previous section check-ins will be locked. Any newly arriving or re-attending participants will be recorded exclusively under this round.
              </p>
            </div>

            {switchError && (
              <p className="text-xs font-semibold text-rose-600">{switchError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSwitchingSection}
                onClick={() => {
                  setIsConfirmSwitchModalOpen(false);
                  setPendingSwitchSection(null);
                  setSwitchError(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSwitchingSection}
                onClick={handleExecuteSectionSwitch}
                className="rounded-xl bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSwitchingSection ? "Activating..." : "Confirm & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
