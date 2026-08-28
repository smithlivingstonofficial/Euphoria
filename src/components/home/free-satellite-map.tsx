"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, ExternalLink, Layers, Sparkles } from "lucide-react";

interface FreeSatelliteMapProps {
  pins?: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    description?: string;
  }>;
  height?: string;
}

export function FreeSatelliteMap({ pins = [], height = "h-[550px]" }: FreeSatelliteMapProps) {
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
        maxZoom: 17.5,
        zoomControl: true,
      });

      // Esri World Imagery Satellite Tile Layer (Free, High-Res Open Satellite Imagery)
      const satelliteTiles = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxNativeZoom: 17,
          maxZoom: 17.5,
        }
      );

      satelliteTiles.addTo(map);
      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Add pins if provided
      pins.forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng]).addTo(map);
        marker.bindTooltip(pin.title, {
          permanent: true,
          direction: "top",
          offset: [0, -10],
          className: "leaflet-custom-tooltip",
        });
        marker.bindPopup(
          `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
            <strong style="font-size: 13px; font-weight: 800; color: #0f172a; display: block; margin-bottom: 2px;">📍 ${pin.title}</strong>
            ${pin.description ? `<span style="font-size: 11px; color: #475569; font-weight: 500;">${pin.description}</span>` : ""}
          </div>`
        );
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pins]);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm space-y-4">
      {/* Map Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-black text-slate-900">OpenStreet Satellite Map</h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
            9.5746° N, 77.6742° E
          </span>

          {/* Embedded Google Maps Directions Button */}
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=Kalasalingam+Academy+of+Research+and+Education"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-primary active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Navigation className="h-4 w-4 text-cyan-300" />
            <span>Get Directions in Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Free Satellite Map Container */}
      <div
        className={`w-full ${height} rounded-2xl border border-slate-200/90 overflow-hidden shadow-md bg-slate-900 relative z-0`}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white text-xs font-bold gap-2 z-10">
            <Sparkles className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Loading Free Satellite Map...</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 font-medium">
        <span>Kalasalingam Academy of Research and Education, Krishnankoil - 626126</span>
        <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          Open Satellite Imagery • Ready for Pinning
        </span>
      </div>
    </div>
  );
}
