"use client";

import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Building2,
  Navigation,
  ExternalLink,
  Check,
  X,
  Clock,
  Car,
  Compass,
  Sparkles,
} from "lucide-react";

// Safe Leaflet loading guarded against SSR ReferenceError: window is not defined
let L: any = null;
if (typeof window !== "undefined") {
  try {
    L = require("leaflet");
    require("leaflet/dist/leaflet.css");
    if (L && L.Icon && L.Icon.Default) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    }
  } catch (e) {
    console.warn("Failed to load Leaflet:", e);
  }
}

interface VendorBranchMapModalProps {
  open: boolean;
  onClose: () => void;
  branch: {
    id: string;
    name: string;
    city: string;
    district?: string;
    address: string;
    latitude: number;
    longitude: number;
    contact_name?: string;
    contact_phone?: string;
    is_main?: boolean;
    calcDistance?: number;
    calcMinutes?: number;
  } | null;
  clientCoords?: {
    lat: number;
    lng: number;
    name?: string;
  } | null;
  isNearest?: boolean;
  isSelected?: boolean;
  onSelectBranch?: (branchId: string) => void;
}

export function VendorBranchMapModal({
  open,
  onClose,
  branch,
  clientCoords,
  isNearest = false,
  isSelected = false,
  onSelectBranch,
}: VendorBranchMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const branchLat = branch?.latitude ? Number(branch.latitude) : 24.7136;
  const branchLng = branch?.longitude ? Number(branch.longitude) : 46.6753;

  const clientLat = clientCoords?.lat || 24.7136;
  const clientLng = clientCoords?.lng || 46.6753;

  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${clientLat},${clientLng}&destination=${branchLat},${branchLng}&travelmode=driving`;
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${branchLat},${branchLng}`;

  useEffect(() => {
    if (!open || !branch) {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [branchLat, branchLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // 1. Branch Marker (Red/Amber with Store icon)
      const branchIcon = L.divIcon({
        className: "custom-branch-marker",
        html: `
          <div style="
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            border: 3px solid #ffffff;
            box-shadow: 0 8px 18px rgba(37,99,235,0.45);
          ">
            <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                <path d="M9 22v-4h6v4"/>
                <path d="M8 6h.01"/>
                <path d="M16 6h.01"/>
                <path d="M8 10h.01"/>
                <path d="M16 10h.01"/>
                <path d="M8 14h.01"/>
                <path d="M16 14h.01"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });

      const branchMarker = L.marker([branchLat, branchLng], { icon: branchIcon }).addTo(map);
      branchMarker.bindPopup(`
        <div style="direction: rtl; text-align: right; font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 13px; color: #1e293b;">${branch.name}</strong>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">${branch.address}</p>
        </div>
      `).openPopup();

      // 2. Client Marker (Green with Car/Pin icon)
      if (clientCoords) {
        const clientIcon = L.divIcon({
          className: "custom-client-marker",
          html: `
            <div style="
              background: linear-gradient(135deg, #10b981, #059669);
              width: 34px;
              height: 34px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              border: 3px solid #ffffff;
              box-shadow: 0 6px 14px rgba(16,185,129,0.4);
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.3 2 11.6V16c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const cMarker = L.marker([clientLat, clientLng], { icon: clientIcon }).addTo(map);
        cMarker.bindPopup(`
          <div style="direction: rtl; text-align: right; font-family: sans-serif; padding: 4px;">
            <strong style="font-size: 13px; color: #065f46;">موقعك المختار للتسليم</strong>
            <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">${clientCoords.name || "موقع الفرع"}</p>
          </div>
        `);

        // Connect with dashed polyline
        const polyline = L.polyline(
          [
            [clientLat, clientLng],
            [branchLat, branchLng],
          ],
          {
            color: "#2563eb",
            weight: 3,
            dashArray: "6, 8",
            opacity: 0.85,
          }
        ).addTo(map);

        try {
          map.fitBounds(
            [
              [clientLat, clientLng],
              [branchLat, branchLng],
            ],
            { padding: [50, 50], maxZoom: 15 }
          );
        } catch (e) {}
      }

      mapInstance.current = map;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
      }
    };
  }, [open, branch, clientCoords, branchLat, branchLng, clientLat, clientLng]);

  if (!branch) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 via-blue-950 to-slate-900 text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  معاينة موقع الفرع
                </span>
                {isNearest && (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    الفرع الأقرب لموقعك
                  </span>
                )}
                {branch.is_main && (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/90 text-slate-950">
                    الفرع الرئيسي
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
                <span>{branch.name}</span>
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  {branch.city} – {branch.district ? `حي ${branch.district} – ` : ""}
                  {branch.address}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold block">المسافة المباشرة:</span>
              <span className="text-sm font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                <Navigation className="w-3.5 h-3.5" />
                {branch.calcDistance !== undefined ? `${branch.calcDistance} كم` : "قريب منك"}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold block">الوقت المتوقع بالسيارة:</span>
              <span className="text-sm font-black text-blue-300 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                {branch.calcMinutes ? `~${branch.calcMinutes} دقيقة` : "~10 دقائق"}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold block">نقطة انطلاقك:</span>
              <span className="text-xs font-bold text-slate-200 truncate block mt-0.5">
                {clientCoords?.name || "فرع العميل المختار"}
              </span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full h-[320px] sm:h-[360px] bg-slate-100">
          <div ref={mapRef} className="w-full h-full z-0" />

          {/* Map Legend Floating Overlay */}
          <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 shadow-lg text-[11px] font-bold text-slate-700 space-y-1.5 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block border-2 border-white shadow-sm" />
              <span>فرع المورد (نقطة الاستلام)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border-2 border-white shadow-sm" />
              <span>موقعك المختار للتسليم</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
          >
            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-black">
              G
            </div>
            <span>فتح الاتجاهات في تطبيق Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-initial h-11 px-4 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-200/60"
            >
              إغلاق
            </Button>
            {onSelectBranch && (
              <Button
                type="button"
                onClick={() => {
                  onSelectBranch(branch.id);
                  onClose();
                }}
                className={`flex-1 sm:flex-initial h-11 px-6 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md ${
                  isSelected
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>هذا الفرع محدد حالياً</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>اختيار هذا الفرع للاستلام</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
