"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, ExternalLink, Layers, Sparkles, Compass, Play, Pause } from "lucide-react";

export interface PinItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category?: string;
  description?: string;
}

interface FreeSatelliteMapProps {
  pins?: PinItem[];
  height?: string;
}

export function FreeSatelliteMap({
  pins = [],
  height = "h-[550px]",
}: FreeSatelliteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const [mapLoaded, setMapLoaded] = useState(false);
  const [activePinId, setActivePinId] = useState<string>(pins[0]?.id || "");
  const [isAutoCycling, setIsAutoCycling] = useState(true);

  // 3-Second Pin Cycling Tour (Pauses on user interaction/click)
  useEffect(() => {
    if (!isAutoCycling || pins.length === 0) return;

    const interval = setInterval(() => {
      setActivePinId((currentId) => {
        const currentIndex = pins.findIndex((p) => p.id === currentId);
        const nextIndex = (currentIndex + 1) % pins.length;
        return pins[nextIndex]?.id || pins[0]?.id;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoCycling, pins]);

  // Sync active marker class in DOM when activePinId changes
  useEffect(() => {
    if (!mapLoaded || pins.length === 0) return;

    pins.forEach((pin) => {
      const pinElement = document.getElementById(`kare-pin-${pin.id}`);
      if (pinElement) {
        if (pin.id === activePinId) {
          pinElement.classList.add("is-active");
          // Bring active marker to front in Leaflet
          const marker = markersRef.current.get(pin.id);
          if (marker && marker.setZIndexOffset) {
            marker.setZIndexOffset(1000);
          }
        } else {
          pinElement.classList.remove("is-active");
          const marker = markersRef.current.get(pin.id);
          if (marker && marker.setZIndexOffset) {
            marker.setZIndexOffset(0);
          }
        }
      }
    });
  }, [activePinId, mapLoaded, pins]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dynamically inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject custom CSS for clean non-cluttered pins + 3-sec active badge animation
    if (!document.getElementById("leaflet-pin-cycle-css")) {
      const style = document.createElement("style");
      style.id = "leaflet-pin-cycle-css";
      style.innerHTML = `
        .custom-kare-pin-container {
          background: transparent;
          border: none;
        }
        .kare-map-pin {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          cursor: pointer;
          user-select: none;
        }
        .kare-pin-dot-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
        }
        .kare-pin-radar-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          opacity: 0;
          transition: all 0.3s ease;
        }
        .kare-map-pin.is-active .kare-pin-radar-ring {
          opacity: 1;
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .kare-pin-dot {
          width: 13px;
          height: 13px;
          border-radius: 9999px;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 2;
        }
        .kare-map-pin:hover .kare-pin-dot,
        .kare-map-pin.is-active .kare-pin-dot {
          transform: scale(1.4);
        }
        .kare-pin-badge-card {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(6px) scale(0.92);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100;
          filter: drop-shadow(0 8px 16px rgba(15, 23, 42, 0.25));
        }
        .kare-map-pin.is-active .kare-pin-badge-card,
        .kare-map-pin:hover .kare-pin-badge-card {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
          pointer-events: auto;
        }
        .kare-pin-arrow {
          width: 0; 
          height: 0; 
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #ffffff;
          margin: 0 auto;
        }
      `;
      document.head.appendChild(style);
    }

    // Dynamically inject Leaflet JS
    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        initMap();
      };
      document.body.appendChild(script);
    }

    function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Kalasalingam Academy of Research and Education coordinates
      const kareCenterLat = 9.5748;
      const kareCenterLng = 77.6772;

      // Initialize Leaflet Map with STRICT zoom limits and campus bounds (cannot zoom out too far)
      const map = L.map(mapContainerRef.current, {
        center: [kareCenterLat, kareCenterLng],
        zoom: 16.3,
        minZoom: 15.6, // PREVENTS excessive zoom-out
        maxZoom: 18.2,
        maxBounds: [
          [9.566, 77.666], // South-West campus boundary
          [9.584, 77.690], // North-East campus boundary
        ],
        maxBoundsViscosity: 0.9, // Keeps viewport constrained to KARE
        zoomControl: false,
      });

      // Add custom zoom control in bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // High-Res Satellite Tile Layer
      const satelliteTiles = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping',
          maxNativeZoom: 17,
          maxZoom: 18.2,
        }
      );

      satelliteTiles.addTo(map);
      mapInstanceRef.current = map;
      markersRef.current.clear();
      setMapLoaded(true);

      // Render building pins with clean dots and 3-sec active floating badges
      pins.forEach((pin) => {
        const isHostel = pin.title.toLowerCase().includes("hostel");
        const isAuditorium = pin.title.toLowerCase().includes("auditorium") || pin.title.toLowerCase().includes("library");
        
        const dotColor = isHostel
          ? "bg-emerald-500 ring-emerald-400/50"
          : isAuditorium
          ? "bg-amber-500 ring-amber-400/50"
          : "bg-indigo-600 ring-indigo-400/50";

        const categoryTag = isHostel
          ? "🏨 Accommodation"
          : isAuditorium
          ? "📍 Central Landmark"
          : "🏛️ Academic Block";

        const customIcon = L.divIcon({
          className: "custom-kare-pin-container",
          html: `
            <div id="kare-pin-${pin.id}" class="kare-map-pin ${pin.id === activePinId ? "is-active" : ""}">
              <!-- Floating Active/Hover Badge Card -->
              <div class="kare-pin-badge-card">
                <div class="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-2.5 px-3 shadow-xl min-w-[150px] max-w-[220px] text-left font-sans">
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                      ${categoryTag}
                    </span>
                    <span class="h-1.5 w-1.5 rounded-full ${dotColor.split(" ")[0]} shrink-0"></span>
                  </div>
                  <div class="text-xs font-black text-slate-900 leading-tight font-display">
                    ${pin.title}
                  </div>
                  <div class="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 truncate">
                    ${pin.description || "KARE Campus Building"}
                  </div>
                </div>
                <div class="kare-pin-arrow"></div>
              </div>

              <!-- Unobtrusive Compact Dot -->
              <div class="kare-pin-dot-wrapper">
                <div class="kare-pin-radar-ring ${dotColor}"></div>
                <div class="kare-pin-dot ${dotColor.split(" ")[0]}"></div>
              </div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(map);

        // Click on pin: locks focus to this pin and pauses auto-cycle
        marker.on("click", () => {
          setActivePinId(pin.id);
          setIsAutoCycling(false);
          map.flyTo([pin.lat, pin.lng], 16.8, {
            animate: true,
            duration: 0.8,
          });
        });

        markersRef.current.set(pin.id, marker);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pins]);

  const resetView = () => {
    if (mapInstanceRef.current) {
      setIsAutoCycling(true);
      mapInstanceRef.current.flyTo([9.5748, 77.6772], 16.3, {
        animate: true,
        duration: 1.0,
      });
    }
  };

  const toggleAutoTour = () => {
    setIsAutoCycling((prev) => !prev);
  };

  return (
    <div className={`relative w-full ${height} overflow-hidden bg-slate-900 font-sans`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-white text-xs font-bold gap-2.5 z-20 backdrop-blur-md">
          <Sparkles className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="tracking-wide font-mono">Loading KARE Satellite Map...</span>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-10 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left Badge Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-900 shadow-md">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-black tracking-tight font-display">KARE Campus Map</span>
          <span className="hidden sm:inline-flex text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
            Satellite View
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Auto Tour 3-sec Toggle Button */}
          <button
            type="button"
            onClick={toggleAutoTour}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl backdrop-blur-xl border text-xs font-bold transition-all shadow-md cursor-pointer ${
              isAutoCycling
                ? "bg-slate-900/90 text-cyan-300 border-cyan-400/40 hover:bg-slate-900"
                : "bg-white/95 text-slate-700 border-slate-200/90 hover:bg-slate-50"
            }`}
            title="Cycles active building badge every 3 seconds"
          >
            {isAutoCycling ? (
              <>
                <Pause className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono">Tour Active (3s)</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[11px] font-mono">Resume Tour</span>
              </>
            )}
          </button>

          {/* Reset View Button */}
          <button
            type="button"
            onClick={resetView}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-800 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Compass className="h-4 w-4 text-emerald-600" />
            <span className="hidden xs:inline">Reset</span>
          </button>

          {/* Directions Link */}
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=Kalasalingam+Academy+of+Research+and+Education"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-hover active:scale-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            <Navigation className="h-4 w-4 text-cyan-200" />
            <span className="hidden sm:inline">Directions</span>
            <ExternalLink className="h-3 w-3 text-indigo-200" />
          </a>
        </div>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 pointer-events-none shadow-md">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>Hostels</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
          <span>Academic Blocks</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          <span>Landmarks</span>
        </span>
      </div>
    </div>
  );
}
