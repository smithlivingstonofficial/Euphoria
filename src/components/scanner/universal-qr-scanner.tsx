"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  RefreshCw,
  AlertCircle,
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
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);

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

        if (scannerRef.current && isRunningRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}
        }

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

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
            ? { facingMode: "environment" }
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

            if (cleanCode === lastScannedCodeRef.current) return;
            if (scannedHistorySetRef.current.has(cleanCode)) return;

            lastScannedCodeRef.current = cleanCode;
            scannedHistorySetRef.current.add(cleanCode);

            if (isMounted) {
              setLastScannedDisplay(cleanCode);
            }

            playBeep();
            onScanSuccess(cleanCode);
          },
          (errorMessage: string) => {}
        );

        isRunningRef.current = true;
        if (isMounted) {
          setIsInitializing(false);

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
              "Camera permission was denied. Please allow camera access in your browser settings."
            );
          } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("DevicesNotFoundError")) {
            setCameraError("No camera found on this device. You can use the manual Pass Code box.");
          } else if (errorMsg.includes("NotReadableError") || errorMsg.includes("in use")) {
            setCameraError("Camera is in use by another app.");
          } else {
            setCameraError("Unable to start live camera feed.");
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

  const handleResetTarget = () => {
    lastScannedCodeRef.current = null;
    setLastScannedDisplay(null);
  };

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
      alert("No valid QR code found in the uploaded image.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4 text-slate-900 shadow-2xs space-y-3">
      {/* Scanner Header Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isScanning ? "bg-emerald-400 opacity-75" : "bg-slate-400 opacity-50"}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isScanning ? "bg-emerald-500" : "bg-slate-400"}`} />
          </span>
          <h4 className="text-xs font-extrabold text-slate-900">
            Live QR Scanner
          </h4>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5">
          {lastScannedDisplay && (
            <button
              type="button"
              onClick={handleResetTarget}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 text-[11px] font-bold cursor-pointer shadow-2xs"
              title="Reset target lock to re-scan"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Next Pass</span>
            </button>
          )}

          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-xs ${
                torchEnabled
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title={torchEnabled ? "Turn Torch Off" : "Turn Torch On"}
            >
              {torchEnabled ? <Zap className="h-3.5 w-3.5 fill-current" /> : <ZapOff className="h-3.5 w-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
            title={soundEnabled ? "Mute scan sound" : "Enable scan sound"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
          </button>

          {availableCameras.length > 1 && (
            <select
              value={activeCameraId || ""}
              onChange={(e) => setActiveCameraId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[120px] truncate shadow-2xs"
            >
              {availableCameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          <label className="p-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center shadow-2xs">
            <UploadCloud className="h-3.5 w-3.5" />
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
      <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-300 shadow-inner">
        {/* HTML5 QR Container */}
        <div
          id={containerId}
          className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        />

        {/* Laser Scanner Animation Overlay */}
        {isScanning && !cameraError && !isInitializing && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            <div className="relative w-full h-full max-w-[200px] max-h-[200px] border-2 border-emerald-400/80 rounded-2xl shadow-lg overflow-hidden">
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-4 border-l-4 border-emerald-400" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-4 border-r-4 border-emerald-400" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-4 border-r-4 border-emerald-400" />

              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />
            </div>
          </div>
        )}

        {/* Target Lock Indicator */}
        {lastScannedDisplay && !isInitializing && (
          <div className="absolute top-2.5 inset-x-2.5 pointer-events-none flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 shadow-md">
              <CheckCircle2 className="h-3 w-3" />
              <span>Pass Scanned</span>
            </span>
          </div>
        )}

        {/* Loading Spinner */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-300 font-bold">
              Starting camera feed...
            </p>
          </div>
        )}

        {/* Camera Error Display */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-2.5 p-5 text-center">
            <AlertCircle className="h-7 w-7 text-amber-400 shrink-0" />
            <h5 className="text-xs font-extrabold text-white">Camera Unavailable</h5>
            <p className="text-[11px] text-slate-300 leading-relaxed max-w-xs">
              {cameraError}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCameraId(null);
                setCameraError(null);
                setIsInitializing(true);
              }}
              className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer shadow-2xs mt-1"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
