"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  Building2,
  Navigation,
  ExternalLink,
  Check,
  Sparkles,
  Compass,
  Loader2,
  Clock,
} from "lucide-react";
import { VendorBranchMapModal } from "@/components/vendor-branch-map-modal";

interface VendorBranchesSelectorProps {
  branches: any[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  clientCoords: {
    lat: number;
    lng: number;
    name?: string;
  };
  selectedVendor?: any;
  verifiedMapVendor?: any;
  locationName?: string;
  isLoading?: boolean;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function getGoogleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
  originLat?: number | null,
  originLng?: number | null
): string {
  if (originLat && originLng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
}

export function VendorBranchesSelector({
  branches,
  selectedBranchId,
  onSelectBranch,
  clientCoords,
  selectedVendor,
  verifiedMapVendor,
  locationName,
  isLoading = false,
}: VendorBranchesSelectorProps) {
  const [previewBranch, setPreviewBranch] = useState<any | null>(null);

  // Compute branches with proximity and sort nearest first
  const branchesWithProximity = useMemo(() => {
    if (!branches || branches.length === 0) return [];
    const list = branches.map((b: any) => {
      const bLat = Number(b.latitude) || 24.7136;
      const bLng = Number(b.longitude) || 46.6753;
      const dist = calculateDistanceKm(
        clientCoords.lat,
        clientCoords.lng,
        bLat,
        bLng
      );
      const minutes = Math.max(4, Math.round(dist * 2.2));
      return {
        ...b,
        calcDistance: dist,
        calcMinutes: minutes,
      };
    });

    return list.sort((a, b) => a.calcDistance - b.calcDistance);
  }, [branches, clientCoords]);

  // Pre-select nearest branch if nothing is selected or if previous selection is invalid
  useEffect(() => {
    if (branchesWithProximity.length > 0) {
      const exists = branchesWithProximity.some((b) => b.id === selectedBranchId);
      if (!exists || !selectedBranchId) {
        onSelectBranch(branchesWithProximity[0].id);
      }
    }
  }, [branchesWithProximity, selectedBranchId, onSelectBranch]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs text-slate-500 font-bold">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span>جاري جلب فروع المورد المعتمدة وحساب المسافات...</span>
      </div>
    );
  }

  if (!branches || branches.length === 0) {
    const fallbackLat = selectedVendor?.latitude || 24.7136;
    const fallbackLng = selectedVendor?.longitude || 46.6753;
    const fallbackGmapsUrl = getGoogleMapsDirectionsUrl(
      fallbackLat,
      fallbackLng,
      clientCoords.lat,
      clientCoords.lng
    );

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="font-black text-slate-900">نقطة استلام الطلب المعتمدة:</span>
          </div>
          <a
            href={fallbackGmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-blue-400 text-blue-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Navigation className="w-3 h-3 text-blue-600" />
            <span>فتح في خرائط Google</span>
            <ExternalLink className="w-3 h-3 text-blue-500" />
          </a>
        </div>
        <p className="font-bold text-slate-700">
          {selectedVendor?.company_name || verifiedMapVendor?.company_name || "فرع المورد المعتمد"} – {selectedVendor?.address || verifiedMapVendor?.address || locationName}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Proximity & Context Notice */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <p className="font-black text-slate-900 flex items-center gap-1.5">
              <span>فروع المورد المعتمدة للاستلام ({branchesWithProximity.length} فروع)</span>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                مرتبة حسب الأقرب لموقعك
              </span>
            </p>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              نقطة قياس المسافة: <span className="font-bold text-blue-700">{clientCoords.name || "موقعك المحدد"}</span>
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-xl self-start sm:self-auto shrink-0">
          اختر الفرع الأنسب لك
        </span>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {branchesWithProximity.map((branch: any, idx: number) => {
          const isSelected = selectedBranchId === branch.id;
          const isNearest = idx === 0;
          const googleMapsUrl = getGoogleMapsDirectionsUrl(
            branch.latitude,
            branch.longitude,
            clientCoords.lat,
            clientCoords.lng
          );

          return (
            <div
              key={branch.id}
              onClick={() => onSelectBranch(branch.id)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group ${
                isSelected
                  ? "border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/10"
                  : "border-slate-200 hover:border-blue-300 bg-white hover:shadow-sm"
              }`}
            >
              {isNearest && (
                <div className="absolute -top-1 -left-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-br-xl shadow-sm flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>الفرع الأقرب إليك</span>
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">{branch.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {branch.city} {branch.district ? `– حي ${branch.district}` : ""}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "border-slate-300 bg-white group-hover:border-blue-400"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Proximity & Distance Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black ${
                    isNearest
                      ? "bg-emerald-100/90 text-emerald-800 border border-emerald-200"
                      : "bg-blue-50 text-blue-700 border border-blue-100"
                  }`}
                >
                  <Navigation className="w-3 h-3 text-blue-600" />
                  <span>المسافة: {branch.calcDistance} كم</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>~{branch.calcMinutes} دقيقة بالسيارة</span>
                </span>
              </div>

              {/* Address */}
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{branch.address}</span>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {/* Direct Google Maps Navigation Link */}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 h-9 px-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all shadow-sm group/btn"
                  title="فتح مسار الملاحة الفوري على تطبيق Google Maps"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                    G
                  </span>
                  <span>خرائط Google</span>
                  <ExternalLink className="w-3 h-3 text-blue-500 opacity-70 group-hover/btn:opacity-100" />
                </a>

                {/* In-app Preview Modal Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewBranch(branch);
                  }}
                  className="flex-1 h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  title="معاينة موقع الفرع والمسار على خريطة المنصة"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>معاينة المسار</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Branch Map Preview Modal */}
      <VendorBranchMapModal
        open={Boolean(previewBranch)}
        onClose={() => setPreviewBranch(null)}
        branch={previewBranch}
        clientCoords={clientCoords}
        isNearest={branchesWithProximity.length > 0 && previewBranch?.id === branchesWithProximity[0]?.id}
        isSelected={selectedBranchId === previewBranch?.id}
        onSelectBranch={(branchId) => {
          onSelectBranch(branchId);
          setPreviewBranch(null);
        }}
      />
    </div>
  );
}
