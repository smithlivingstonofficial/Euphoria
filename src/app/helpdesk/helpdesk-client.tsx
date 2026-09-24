"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import {
  HelpdeskAuthInfo,
  StudentSearchHit,
  StudentFullDossier,
  searchStudentsHelpdeskAction,
  getStudentFullDossierHelpdeskAction,
} from "@/actions/helpdesk";
import { UniversalQRScanner } from "@/components/scanner/universal-qr-scanner";
import { signOutUser } from "@/actions/auth";
import QRCode from "qrcode";
import {
  Headphones,
  Search,
  Camera,
  Copy,
  Check,
  Phone,
  MessageSquare,
  Mail,
  Building,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Bed,
  Layers,
  Share2,
  LogOut,
  ChevronRight,
  User,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn, formatDate, formatTime } from "@/lib/utils";

export function HelpdeskClient({ authInfo }: { authInfo: HelpdeskAuthInfo }) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentSearchHit[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<StudentFullDossier | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recent lookups session history
  const [recentLookups, setRecentLookups] = useState<Array<{ id: string; name: string; code?: string }>>([]);

  // Modals
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ passCode: string; studentName: string; qrUrl: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Keyboard shortcut: '/' focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchStudentsHelpdeskAction(clean);
      if (res.success && res.results) {
        setSearchResults(res.results);
        // If exact single code match, auto-load dossier
        if (res.results.length === 1 && clean.toUpperCase().startsWith("EUPH-")) {
          loadStudentDossier(res.results[0].studentId);
        }
      }
      setIsSearching(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Load Full Dossier
  const loadStudentDossier = async (studentId: string) => {
    setIsLoadingDossier(true);
    setErrorMessage(null);
    setSelectedStudentId(studentId);

    const res = await getStudentFullDossierHelpdeskAction({ studentId });
    if (res.success && res.dossier) {
      setDossier(res.dossier);

      // Add to recent lookups
      setRecentLookups((prev) => {
        const filtered = prev.filter((item) => item.id !== studentId);
        return [
          {
            id: studentId,
            name: res.dossier!.profile.fullName,
            code: res.dossier!.pass?.passCode,
          },
          ...filtered,
        ].slice(0, 8);
      });
    } else {
      setErrorMessage(res.error || "Failed to load student dossier.");
    }
    setIsLoadingDossier(false);
  };

  // Handle QR Camera scan result
  const handleScanSuccess = async (decodedText: string) => {
    setIsCameraScannerOpen(false);
    setQuery(decodedText);
    showToast("QR code scanned! Searching...");

    // Try direct code lookup
    setIsLoadingDossier(true);
    const res = await getStudentFullDossierHelpdeskAction({ codeQuery: decodedText });
    if (res.success && res.dossier) {
      setDossier(res.dossier);
      setSelectedStudentId(res.dossier.profile.id);

      setRecentLookups((prev) => {
        const filtered = prev.filter((item) => item.id !== res.dossier!.profile.id);
        return [
          {
            id: res.dossier!.profile.id,
            name: res.dossier!.profile.fullName,
            code: res.dossier!.pass?.passCode,
          },
          ...filtered,
        ].slice(0, 8);
      });
    } else {
      // Fallback: trigger normal text search
      const searchRes = await searchStudentsHelpdeskAction(decodedText);
      if (searchRes.success && searchRes.results && searchRes.results.length > 0) {
        setSearchResults(searchRes.results);
        loadStudentDossier(searchRes.results[0].studentId);
      } else {
        setErrorMessage("No student found with this QR code.");
      }
    }
    setIsLoadingDossier(false);
  };

  // Generate Digital Pass QR Modal
  const handleShowDigitalPassQR = async () => {
    if (!dossier || !dossier.pass) return;

    try {
      const qrPayload = dossier.pass.passCode;
      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });

      setQrModalData({
        passCode: dossier.pass.passCode,
        studentName: dossier.profile.fullName,
        qrUrl,
      });
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      showToast("Failed to render QR Code.");
    }
  };

  // Copy Complete Student Summary for WhatsApp/Helpdesk note
  const handleCopySummary = () => {
    if (!dossier) return;

    const p = dossier.profile;
    const pass = dossier.pass;
    const eventsList = dossier.events
      .map(
        (e) =>
          `• Slot ${e.slotNumber}: ${e.event.name} (${e.event.venue || "TBA"}) [${e.registrationCode}]`
      )
      .join("\n");

    const summary = `*Euphoria '26 - Help Desk Verification*
👤 *Student:* ${p.fullName}
🎓 *College:* ${p.collegeName || "KARE"}
🏛️ *Dept/Year:* ${p.department || "N/A"} (${p.yearOfStudy ? `Year ${p.yearOfStudy}` : "N/A"})
📱 *Phone:* ${p.mobileNumber || "N/A"}
📧 *Email:* ${p.email}
🎫 *Pass Code:* ${pass?.passCode || "No Active Pass"} (${pass?.passTier || "N/A"})
🏠 *Lodging:* ${p.needsAccommodation ? "Hostel Lodging Confirmed" : "No Accommodation"}
📅 *Events Enrolled:*
${eventsList || "None"}
_Verified at Help Desk by: ${authInfo.profile?.fullName || authInfo.user.email}_`;

    navigator.clipboard.writeText(summary);
    showToast("Student summary copied for WhatsApp / notes!");
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border bg-slate-900 border-slate-800 text-white text-xs font-semibold backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Help Desk Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 tracking-tight">
                  Euphoria &apos;26 Help Desk
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Desk Mode: LIVE</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Universal Delegate &amp; Participant Lookup System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Operator Identity Chip */}
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                {(authInfo.profile?.fullName || authInfo.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block text-[11px] leading-tight">
                  {authInfo.profile?.fullName || "Operator"}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {authInfo.isAdmin ? "Administrator" : "Help Desk Desk"}
                </span>
              </div>
            </div>

            {authInfo.isAdmin && (
              <Link
                href="/admin/helpdesk"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 transition-colors cursor-pointer shadow-2xs"
                title="Go to Admin Help Desk Management"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Manage Access</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => signOutUser()}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold px-2.5 py-2 transition-colors cursor-pointer shadow-2xs"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Search Bar & Scanner Launch Container */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Main Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Student Name, Email, Phone, Pass Code (e.g. EUPH-26-XXXXXX), or Reg Number... (Press '/' to focus)"
                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-10 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Camera Scan Button */}
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
              title="Open camera to scan pass QR code"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Scan Pass QR</span>
            </button>
          </div>

          {/* Search Hits Dropdown / Quick Selector */}
          {searchResults.length > 0 && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-2.5 space-y-1.5 animate-in fade-in duration-150">
              <div className="text-[11px] font-bold text-indigo-900 px-2 py-0.5 flex items-center justify-between">
                <span>Matching Students ({searchResults.length}):</span>
                <span className="text-[10px] text-indigo-600 font-normal">Click a student to load full profile</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {searchResults.map((hit) => {
                  const isSelected = selectedStudentId === hit.studentId;
                  return (
                    <button
                      key={hit.studentId}
                      type="button"
                      onClick={() => loadStudentDossier(hit.studentId)}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs",
                        isSelected
                          ? "bg-indigo-600 border-indigo-700 text-white ring-2 ring-indigo-400/40"
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/60 text-slate-900"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs shrink-0",
                          isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                        )}
                      >
                        {hit.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs truncate leading-tight">
                          {hit.fullName}
                        </div>
                        <div
                          className={cn(
                            "text-[11px] truncate font-mono",
                            isSelected ? "text-indigo-100" : "text-slate-500"
                          )}
                        >
                          {hit.email}
                        </div>
                        {hit.passCode && (
                          <div
                            className={cn(
                              "text-[10px] font-mono font-bold mt-0.5",
                              isSelected ? "text-amber-200" : "text-amber-700"
                            )}
                          >
                            Pass: {hit.passCode}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Lookups Bar */}
          {recentLookups.length > 0 && (
            <div className="flex items-center gap-1.5 pt-2 flex-wrap text-xs text-slate-500 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Recent:
              </span>
              {recentLookups.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadStudentDossier(r.id)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
                    selectedStudentId === r.id
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  )}
                >
                  <span>{r.name}</span>
                  {r.code && <span className="font-mono text-[10px] opacity-75">({r.code})</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading Spinner State */}
        {isLoadingDossier && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Loading Student Dossier...</p>
            <p className="text-xs text-slate-400 mt-1">
              Fetching profile, delegate pass, registered events, and attendance records...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && !isLoadingDossier && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-xs">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-900 block text-sm">Lookup Error</span>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* FULL STUDENT DOSSIER DISPLAY */}
        {dossier && !isLoadingDossier && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. Profile & Pass Header Card */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xs p-5 sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Profile Identity Details */}
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-2xl shadow-md shadow-indigo-500/20 shrink-0">
                    {dossier.profile.avatarUrl ? (
                      <img
                        src={dossier.profile.avatarUrl}
                        alt={dossier.profile.fullName}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      dossier.profile.fullName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {dossier.profile.fullName}
                      </h2>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase border",
                          dossier.profile.participantType === "internal"
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        )}
                      >
                        {dossier.profile.participantType === "internal"
                          ? "Internal (KARE)"
                          : "External Delegate"}
                      </span>

                      {dossier.profile.needsAccommodation ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                          <Bed className="h-3 w-3 text-emerald-600" />
                          <span>Hostel Lodging Booked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium">
                          <span>No Lodging</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {dossier.profile.collegeName || "Kalasalingam Academy of Research and Education"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {dossier.profile.course || dossier.profile.department || "Academic Department"}{" "}
                          {dossier.profile.yearOfStudy && `(Year ${dossier.profile.yearOfStudy})`}
                        </span>
                        {dossier.profile.registerNumber && (
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 rounded text-[10px]">
                            #{dossier.profile.registerNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct Contact Shortcuts */}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      {dossier.profile.mobileNumber && (
                        <>
                          <a
                            href={`tel:${dossier.profile.mobileNumber}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                          >
                            <Phone className="h-3 w-3 text-indigo-600" />
                            <span>{dossier.profile.mobileNumber}</span>
                          </a>
                          <a
                            href={`https://wa.me/91${dossier.profile.mobileNumber.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold transition-colors shadow-2xs"
                          >
                            <MessageSquare className="h-3 w-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}

                      <a
                        href={`mailto:${dossier.profile.email}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      >
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span className="font-mono text-[11px]">{dossier.profile.email}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Quick Desk Actions */}
                <div className="flex flex-row lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    title="Copy student summary for WhatsApp or coordinator notes"
                  >
                    <Share2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Copy Summary</span>
                  </button>

                  {dossier.pass && (
                    <button
                      type="button"
                      onClick={handleShowDigitalPassQR}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                      title="Display digital pass QR code on screen"
                    >
                      <QrCode className="h-3.5 w-3.5 text-indigo-300" />
                      <span>Show Pass QR</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Delegate Pass Status Card */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Delegate Pass &amp; Quota</h3>
                    <p className="text-[11px] text-slate-500">Official Fest Credential &amp; Slot Allowance</p>
                  </div>
                </div>

                {dossier.pass && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase border",
                      dossier.pass.status === "active"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    )}
                  >
                    Pass Status: {dossier.pass.status}
                  </span>
                )}
              </div>

              {dossier.pass ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Pass Code */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Pass Code
                    </span>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="text-base font-black font-mono text-indigo-950">
                        {dossier.pass.passCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(dossier.pass!.passCode, "Pass Code")}
                        className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy Pass Code"
                      >
                        {copiedCode === dossier.pass.passCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pass Tier */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Pass Tier
                    </span>
                    <div className="text-sm font-black text-slate-900 capitalize mt-1">
                      {dossier.pass.passTier.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Paid: ₹{dossier.pass.amountPaid}
                    </div>
                  </div>

                  {/* Slots Used */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Slot Quota Utilization
                    </span>
                    <div className="text-sm font-black text-slate-900 font-mono mt-1">
                      {dossier.pass.slotsUsed} of {dossier.pass.totalSlots} Slots Used
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (dossier.pass.slotsUsed / (dossier.pass.totalSlots || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Slots Remaining */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Available Slots
                    </span>
                    <div className="text-sm font-black text-emerald-700 font-mono mt-1">
                      {Math.max(0, dossier.pass.totalSlots - dossier.pass.slotsUsed)} Slot(s) Left
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Can register for more events if &gt; 0
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">No Active Delegate Pass Found</span>
                    <p className="mt-0.5 text-amber-800">
                      This student has not yet completed pass checkout or their payment is pending approval.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Registered Events & Attendance Records */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Enrolled Events &amp; Attendance Records ({dossier.events.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Registered competitions, schedule times, and check-in statuses across sections
                    </p>
                  </div>
                </div>
              </div>

              {dossier.events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dossier.events.map((reg) => {
                    const evt = reg.event;
                    const hasAttendedAny = reg.attendance.length > 0;

                    return (
                      <div
                        key={reg.registrationId}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 font-mono">
                                  SLOT {reg.slotNumber}
                                </span>
                                {hasAttendedAny ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    <span>Checked In</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 text-slate-700 text-[10px] font-medium px-2 py-0.5">
                                    <span>Pending Scan</span>
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-black text-slate-900 mt-1">
                                {evt.name}
                              </h4>
                              <p className="text-[11px] text-slate-500">{evt.schoolOrDept}</p>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                Pass Code
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(reg.registrationCode, "Reg Code")}
                                className="inline-flex items-center gap-1 font-mono font-bold text-xs text-indigo-900 hover:text-indigo-600"
                                title="Click to copy registration code"
                              >
                                <span>{reg.registrationCode}</span>
                                <Copy className="h-3 w-3 text-slate-400" />
                              </button>
                            </div>
                          </div>

                          {/* Venue & Schedule */}
                          <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span className="font-semibold">{evt.venue || "Venue TBA"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{evt.eventDate ? formatDate(evt.eventDate) : "Date TBA"}</span>
                              {evt.startTime && (
                                <>
                                  <span>•</span>
                                  <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>
                                    {formatTime(evt.startTime)}
                                    {evt.endTime ? ` - ${formatTime(evt.endTime)}` : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Section Attendance Badges */}
                        <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Attendance by Section:
                          </span>
                          {reg.attendance.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {reg.attendance.map((att) => (
                                <span
                                  key={att.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2 py-1"
                                >
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span>{att.sectionName || `Section ${att.sectionNumber}`}</span>
                                  <span className="text-[9px] font-normal text-emerald-700 font-mono">
                                    ({att.scannedAt.slice(11, 16)})
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              No attendance recorded for this competition yet.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  This student has not yet enrolled in any specific competitions or workshops.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial Empty State Guide */}
        {!dossier && !isLoadingDossier && !errorMessage && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-xs space-y-4 max-w-2xl mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Headphones className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Ready to Verify Student Details
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Use the search bar above to look up any participant by their name, email address, mobile number,
                institution register number, or pass code.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left text-xs pt-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="font-bold text-slate-900 block">📷 Instant Camera Scan</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Scan participant&apos;s physical pass or phone screen for 1-second lookup.
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="font-bold text-slate-900 block">🎫 Pass &amp; Quota Check</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Verify slots used, remaining quota, payment status, and lodging.
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="font-bold text-slate-900 block">⏱️ Live Attendance</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Check if attendee is marked present for 1st Section or 2nd Section.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CAMERA SCANNER MODAL */}
      {isCameraScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Scan Pass QR Code</h3>
                  <p className="text-[11px] text-slate-400">Position pass QR code within camera frame</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
              <UniversalQRScanner
                isScanning={isCameraScannerOpen}
                onScanSuccess={handleScanSuccess}
                onScanError={(err) => console.log("Scan err:", err)}
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>Supports all Euphoria &apos;26 Delegate passes &amp; Event tickets</span>
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL PASS QR MODAL */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-900">Digital Pass QR</h3>
                <p className="text-xs text-slate-500">{qrModalData.studentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center">
              <img
                src={qrModalData.qrUrl}
                alt={qrModalData.passCode}
                className="h-64 w-64 object-contain shadow-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Official Pass Code
              </span>
              <span className="text-lg font-black font-mono text-indigo-950 block">
                {qrModalData.passCode}
              </span>
              <p className="text-[11px] text-slate-500 pt-1">
                Participant can photograph this QR code or scan it directly from your desk screen.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
