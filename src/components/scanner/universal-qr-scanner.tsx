"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  RefreshCw,
  AlertCircle,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  RotateCcw,
} from "lucide-react";

interface UniversalQRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isScanning?: boolean;
  onToggleScanning?: (active: boolean) => void;
}

export function UniversalQRScanner({
  onScanSuccess,
  onScanError,
  isScanning = true,
  onToggleScanning,
}: UniversalQRScannerProps) {
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScannedDisplay, setLastScannedDisplay] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const scannedHistorySetRef = useRef<Set<string>>(new Set());
  const containerId = "universal-html5-qr-reader";

  // Audio Beep Synthesizer using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);

      // Haptic feedback for mobile devices
      if ("vibrate" in navigator) {
        navigator.vibrate(100);
      }
    } catch {
      // Audio playback suppressed or unsupported
    }
  };

  // Start Scanner
  useEffect(() => {
    let isMounted = true;

    async function initHtml5Scanner() {
      if (!isScanning) {
        stopScanner();
        return;
      }

      setIsInitializing(true);
      setCameraError(null);

      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        // Cleanup existing instance
        if (scannerRef.current && isRunningRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
        }

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        // Get cameras
        const devices = await Html5Qrcode.getCameras();
        if (isMounted) {
          setAvailableCameras(
            devices.map((d, i) => ({
              id: d.id,
              label: d.label || `Camera ${i + 1}`,
            }))
          );
        }

        const cameraConfig =
          activeCameraId ||
          (devices.length > 0
            ? { facingMode: "environment" } // Prefer back camera
            : { facingMode: "user" });

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.75);
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            const cleanCode = decodedText.trim();
            if (!cleanCode) return;

            // DEDUPLICATION SAFEGUARD:
            // 1. If this exact same QR code is currently in the viewfinder, IGNORE IT.
            if (cleanCode === lastScannedCodeRef.current) {
              return;
            }

            // 2. If this exact QR code was already scanned in this active session, IGNORE IT.
            if (scannedHistorySetRef.current.has(cleanCode)) {
              return;
            }

            // Record as scanned
            lastScannedCodeRef.current = cleanCode;
            scannedHistorySetRef.current.add(cleanCode);

            if (isMounted) {
              setLastScannedDisplay(cleanCode);
            }

            playBeep();
            onScanSuccess(cleanCode);
          },
          (errorMessage: string) => {
            // Frame scan without detection - continuous cycle
          }
        );

        isRunningRef.current = true;
        if (isMounted) {
          setIsInitializing(false);

          // Check if torch/flashlight is supported
          try {
            const capabilities = scanner.getRunningTrackCapabilities();
            if (capabilities && "torch" in capabilities) {
              setHasTorch(true);
            }
          } catch {}
        }
      } catch (err: any) {
        console.error("QR Scanner Initialization error:", err);
        if (isMounted) {
          setIsInitializing(false);
          const errorMsg = err?.message || String(err);
          if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission")) {
            setCameraError(
              "Camera permission was denied. Please allow camera access in your browser settings to scan QR passes."
            );
          } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("DevicesNotFoundError")) {
            setCameraError("No camera found on this device. You can use the manual Pass Code box or upload an image.");
          } else if (errorMsg.includes("NotReadableError") || errorMsg.includes("in use")) {
            setCameraError("Camera is currently in use by another application. Please close other tabs/apps.");
          } else {
            setCameraError("Unable to start live camera feed. Please verify HTTPS or use manual pass entry.");
          }
          if (onScanError) onScanError(errorMsg);
        }
      }
    }

    initHtml5Scanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isScanning, activeCameraId]);

  const stopScanner = async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
        isRunningRef.current = false;
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
    }
  };

  // Switch Torch / Flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !isRunningRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchEnabled;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchEnabled(nextTorch);
    } catch (e) {
      console.warn("Failed to toggle torch:", e);
    }
  };

  // Reset deduplication lock to scan again if needed
  const handleResetTarget = () => {
    lastScannedCodeRef.current = null;
    setLastScannedDisplay(null);
  };

  // Image Upload File Scanner Fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = new Html5Qrcode("temp-qr-file-scanner");
      const result = await tempScanner.scanFile(file, true);

      if (result) {
        const clean = result.trim();
        lastScannedCodeRef.current = clean;
        scannedHistorySetRef.current.add(clean);
        setLastScannedDisplay(clean);
        playBeep();
        onScanSuccess(clean);
      }
    } catch (err: any) {
      alert("No valid Euphoria QR code found in the uploaded image. Please ensure the code is clear.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-3xl border-2 border-slate-800 bg-slate-950 p-4 sm:p-5 text-white shadow-2xl space-y-4">
      {/* Scanner Header Controls */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isScanning ? "bg-emerald-400 opacity-75" : "bg-slate-500 opacity-50"}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isScanning ? "bg-emerald-500" : "bg-slate-500"}`} />
          </span>
          <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
            Live QR Scanner Engine
          </h4>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Reset Scan Target */}
          {lastScannedDisplay && (
            <button
              type="button"
              onClick={handleResetTarget}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              title="Reset target lock to re-scan"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Next Pass</span>
            </button>
          )}

          {/* Torch Toggle (Mobile) */}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                torchEnabled
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
              title={torchEnabled ? "Turn Torch Off" : "Turn Torch On"}
            >
              {torchEnabled ? <Zap className="h-4 w-4 fill-current" /> : <ZapOff className="h-4 w-4" />}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
            title={soundEnabled ? "Mute scan sound" : "Enable scan sound"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          {/* Camera Selector */}
          {availableCameras.length > 1 && (
            <select
              value={activeCameraId || ""}
              onChange={(e) => setActiveCameraId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              {availableCameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {/* Upload Image Option */}
          <label className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center">
            <UploadCloud className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Hidden File Scanner Element */}
      <div id="temp-qr-file-scanner" className="hidden" />

      {/* Camera Viewport */}
      <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-slate-800 shadow-inner">
        {/* HTML5 QR Container */}
        <div
          id={containerId}
          className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        />

        {/* Laser Scanner Animation Overlay */}
        {isScanning && !cameraError && !isInitializing && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {/* Viewfinder Target Frame */}
            <div className="relative w-full h-full max-w-[240px] max-h-[240px] border-2 border-emerald-400/80 rounded-2xl shadow-lg overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />

              {/* Scanning Laser Beam Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />
            </div>
          </div>
        )}

        {/* Single-Scan Target Lock Indicator */}
        {lastScannedDisplay && !isInitializing && (
          <div className="absolute top-3 inset-x-3 pointer-events-none flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-slate-950 font-black text-[10px] px-3 py-1 shadow-lg backdrop-blur-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Pass Processed (Ignored in Viewfinder)</span>
            </span>
          </div>
        )}

        {/* Loading Spinner */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <RefreshCw className="h-7 w-7 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-300 font-semibold">
              Connecting camera &amp; initializing scanner...
            </p>
          </div>
        )}

        {/* Camera Error Display */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-amber-400 shrink-0" />
            <h5 className="text-xs font-bold text-amber-200">Camera Unavailable</h5>
            <p className="text-[11px] text-slate-300 leading-relaxed max-w-xs">
              {cameraError}
            </p>
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveCameraId(null);
                  setCameraError(null);
                  setIsInitializing(true);
                }}
                className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guidance Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Single-Scan Lock: Same pass is scanned once and ignored</span>
        <span className="font-mono text-emerald-400">Anti-Duplicate Active</span>
      </div>
    </div>
  );
}
