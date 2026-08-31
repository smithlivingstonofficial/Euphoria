"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, ExternalLink, Layers, Sparkles, Compass } from "lucide-react";

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

  const [mapLoaded, setMapLoaded] = useState(false);

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

    // Inject custom CSS animation & responsive scale helper classes for markers
    if (!document.getElementById("leaflet-pin-scale-css")) {
      const style = document.createElement("style");
      style.id = "leaflet-pin-scale-css";
      style.innerHTML = `
        .pin-label-badge {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.25s ease;
          transform-origin: bottom center;
          will-change: transform;
        }
        .pin-zoom-small { transform: scale(0.75); font-size: 9.5px !important; padding: 2px 6px !important; }
        .pin-zoom-medium { transform: scale(0.92); font-size: 11px !important; padding: 3px 8px !important; }
        .pin-zoom-large { transform: scale(1.08); font-size: 12px !important; padding: 4px 10px !important; }
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
      const kareLat = 9.5746;
      const kareLng = 77.6742;

      // Initialize Leaflet Map centered at KARE campus
      const map = L.map(mapContainerRef.current, {
        center: [kareLat, kareLng],
        zoom: 16.5,
        minZoom: 14,
        maxZoom: 17.8,
        zoomControl: false,
      });

      // Add custom zoom control in bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Esri World Imagery Satellite Tile Layer (Free, High-Res Open Satellite Imagery)
      const satelliteTiles = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping',
          maxNativeZoom: 17,
          maxZoom: 17.8,
        }
      );

      satelliteTiles.addTo(map);
      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Function to get zoom scale class
      const getZoomClass = (zoomLevel: number) => {
        if (zoomLevel < 15.5) return "pin-zoom-small";
        if (zoomLevel <= 16.5) return "pin-zoom-medium";
        return "pin-zoom-large";
      };

      const currentZoom = map.getZoom();
      const initialZoomClass = getZoomClass(currentZoom);

      // Render building pin markers with sharp location teardrop needle pointing to exact GPS coordinate
      pins.forEach((pin) => {
        const customIcon = L.divIcon({
          className: "custom-leaflet-marker-pin-needle",
          html: `
            <div class="relative flex flex-col items-center group cursor-pointer">
              <div id="badge-${pin.id}" class="pin-label-badge ${initialZoomClass} flex items-center gap-1.5 rounded-xl bg-white/95 text-slate-900 border border-slate-200/90 shadow-lg font-black whitespace-nowrap group-hover:scale-110 group-hover:border-primary group-hover:text-primary transition-all">
                <span class="h-2 w-2 rounded-full bg-indigo-600 shrink-0"></span>
                <span>${pin.title}</span>
              </div>

              <div class="flex flex-col items-center -mt-0.5">
                <div class="w-0.5 h-3 bg-gradient-to-b from-indigo-400 to-indigo-600 shadow-sm"></div>
                <div class="h-3 w-3 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center -mt-1">
                  <span class="h-1 w-1 rounded-full bg-cyan-300"></span>
                </div>
              </div>
            </div>
          `,
          iconSize: [140, 48],
          iconAnchor: [70, 48], // Bottom tip needle anchored precisely at target GPS location
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 6px; min-width: 170px;">
            <div style="margin-bottom: 4px;">
              <span style="background: #e0e7ff; color: #4338ca; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">📍 KARE Campus</span>
            </div>
            <strong style="font-size: 13px; font-weight: 900; color: #0f172a; display: block; margin-bottom: 2px;">${pin.title}</strong>
            <span style="font-size: 11px; color: #64748b; font-weight: 500;">${pin.description || "University Building"}</span>
          </div>
        `);
      });

      // Listen to zoomend event to dynamically update marker label scale classes
      map.on("zoomend", () => {
        const zoom = map.getZoom();
        const newClass = getZoomClass(zoom);

        pins.forEach((pin) => {
          const badgeEl = document.getElementById(`badge-${pin.id}`);
          if (badgeEl) {
            badgeEl.classList.remove("pin-zoom-small", "pin-zoom-medium", "pin-zoom-large");
            badgeEl.classList.add(newClass);
          }
        });
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
      mapInstanceRef.current.flyTo([9.5746, 77.6742], 16.5, {
        animate: true,
        duration: 1.2,
      });
    }
  };

  return (
    <div className={`relative w-full ${height} overflow-hidden bg-slate-100 font-sans`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-slate-900 text-xs font-bold gap-2.5 z-20 backdrop-blur-md">
          <Sparkles className="h-5 w-5 animate-spin text-primary" />
          <span className="tracking-wide">Loading Satellite Map...</span>
        </div>
      )}

      {/* Light Theme Floating Top Control Header Bar */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-10 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left Badge Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-900 shadow-md">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-extrabold tracking-tight">KARE Satellite View</span>
          <span className="hidden sm:inline-flex text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
            9.5746° N, 77.6742° E
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Reset View Button */}
          <button
            type="button"
            onClick={resetView}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-800 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Compass className="h-4 w-4 text-emerald-600" />
            <span className="hidden xs:inline">Reset View</span>
          </button>

          {/* Embedded Google Maps Directions Button */}
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=Kalasalingam+Academy+of+Research+and+Education"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-primary active:scale-95 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
          >
            <Navigation className="h-4 w-4 text-cyan-300" />
            <span>Get Directions</span>
            <ExternalLink className="h-3 w-3 text-slate-400 hidden sm:inline" />
          </a>
        </div>
      </div>
    </div>
  );
}
