"use client";

import React, { useEffect, useState } from "react";
import { X, Check, MapPin, Building2, Phone } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface VendorReview {
  stars: number;
  comment: string;
  timeAgo: string;
}

export interface VendorBranchItem {
  id: string;
  name: string;
  city: string;
  district?: string;
  address: string;
  contact_phone?: string;
  is_main?: boolean;
}

export interface VendorModalData {
  vendorId?: string;
  refCode?: string;
  ref_code?: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
  rating?: number;
  ordersCount?: number;
  completedDeals?: number;
  commitmentRate?: string;
  memberSince?: string;
  isVerified?: boolean;
  reviews?: VendorReview[];
  branches?: VendorBranchItem[];
}

interface VendorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorModalData | null;
}

export function VendorDetailsModal({ isOpen, onClose, vendor }: VendorDetailsModalProps) {
  const [liveData, setLiveData] = useState<{
    rating?: number;
    completedDeals?: number;
    reviews?: VendorReview[];
    branches?: VendorBranchItem[];
    ref_code?: string;
    location?: string;
  }>({});

  useEffect(() => {
    if (!isOpen || !vendor) return;

    // Resolve target vendor ID: either direct vendorId, or if vendor is demo vendor
    const targetVendorId =
      vendor.vendorId ||
      (vendor.name?.includes("قطع الغيار المعتمدة") ? "vendor-demo-id" : undefined);

    if (!targetVendorId) return;

    let isMounted = true;
    fetch(`/api/v1/vendors/${targetVendorId}`)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.data) {
          const d = res.data;
          const mappedReviews: VendorReview[] = (d.rating_summary?.reviews || []).map((r: any) => ({
            stars: r.rating,
            comment: r.comment || "تقييم إيجابي ممتاز",
            timeAgo: new Date(r.created_at).toLocaleDateString("ar-SA"),
          }));

          setLiveData({
            rating: typeof d.rating === "number" ? d.rating : undefined,
            completedDeals: typeof d.total_reviews === "number" ? d.total_reviews : undefined,
            reviews: mappedReviews.length > 0 ? mappedReviews : undefined,
            branches: Array.isArray(d.branches) ? d.branches : undefined,
            ref_code: d.ref_code,
            location: d.address || d.city ? `${d.city || "الرياض"} – ${d.address || d.district || "المقر الرئيسي"}` : undefined,
          });
        }
      })
      .catch((e) => console.warn("Could not load dynamic vendor details:", e));

    return () => {
      isMounted = false;
    };
  }, [isOpen, vendor]);

  if (!vendor) return null;

  const initials =
    vendor.initials ||
    vendor.name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join(" ");

  const rating = liveData.rating ?? vendor.rating ?? 5.0;
  const completedDeals = liveData.completedDeals ?? vendor.completedDeals ?? 2;
  const commitmentRate = vendor.commitmentRate || "96%";
  const memberSince = vendor.memberSince || "2024";
  const refCode =
    vendor.ref_code ||
    vendor.refCode ||
    liveData.ref_code ||
    (vendor.vendorId === "vendor-demo-id" || vendor.name?.includes("قطع الغيار المعتمدة")
      ? "VND-501"
      : vendor.vendorId
      ? (vendor.vendorId.startsWith("VND-") ? vendor.vendorId : `VND-${vendor.vendorId.replace(/[^0-9A-Z]/gi, "").slice(0, 6).toUpperCase() || "501"}`)
      : "VND-501");
  const vendorLocation = liveData.location || "الرياض – طريق خريص – حي المنار";

  const branches = liveData.branches || vendor.branches || [];

  const reviews: VendorReview[] =
    liveData.reviews ||
    (vendor.reviews && vendor.reviews.length > 0
      ? vendor.reviews
      : [
          {
            stars: 5,
            comment: "التزام تام بالمواصفات والقطع أصلية ومطابقة للطلب.",
            timeAgo: "منذ 3 أيام",
          },
        ]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[420px] sm:max-w-[450px] w-[92vw] p-0 overflow-hidden rounded-3xl border border-gray-100 shadow-2xl bg-white text-center dir-rtl font-sans z-50">
        <div className="p-6 relative space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Top-Left Close Button (RTL) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 1. Centered Vendor Logo / Initials Badge */}
          <div className="pt-2 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#E8F4F1] border border-emerald-100 flex items-center justify-center text-lg font-black text-[#1B4D3E] shadow-2xs">
              {vendor.avatarUrl ? (
                <img
                  src={vendor.avatarUrl}
                  alt={vendor.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span className="tracking-widest font-bold">{initials}</span>
              )}
            </div>
          </div>

          {/* 2. Vendor Name & Verification */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs shrink-0">
                ✓
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {vendor.name}
              </h3>
            </div>
            
            <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-slate-500 font-medium">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-bold border border-slate-200">
                الرقم المرجعي: {refCode}
              </span>
              <span>•</span>
              <span>عضو منذ {memberSince}</span>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendorLocation + " " + vendor.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-[11px] text-emerald-800 hover:text-emerald-900 font-bold bg-emerald-50 hover:bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200 transition-all cursor-pointer group mx-auto shadow-2xs"
              title="عرض موقع المورد على خرائط Google"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
              <span>{vendorLocation}</span>
              <span className="text-[10px] text-emerald-700 font-extrabold bg-white px-1.5 py-0.2 rounded-md border border-emerald-200">
                خرائط Google 🗺️
              </span>
            </a>
          </div>

          {/* 3. Metrics 3-Column Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Rating */}
            <div className="bg-[#F8FAFB] border border-slate-100 rounded-2xl p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 font-black text-slate-900 text-sm font-mono">
                <span className="text-amber-500 text-xs">★</span>
                <span>{rating > 0 ? rating.toFixed(1) : "جديد"}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                التقييم الفعلي
              </span>
            </div>

            {/* Completed Deals */}
            <div className="bg-[#F8FAFB] border border-slate-100 rounded-2xl p-2.5 text-center">
              <div className="font-black text-slate-900 text-sm font-mono">
                {completedDeals}
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                صفقة مكتملة
              </span>
            </div>

            {/* Commitment Rate */}
            <div className="bg-[#F8FAFB] border border-slate-100 rounded-2xl p-2.5 text-center">
              <div className="font-black text-slate-900 text-sm font-mono">
                {commitmentRate}
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                معدل الالتزام
              </span>
            </div>
          </div>

          {/* 4. Vendor Branches Section (if any) */}
          {branches.length > 0 && (
            <div className="space-y-2 text-right pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>فروع المورد المعتمدة ({branches.length})</span>
                </h4>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                {branches.map((b) => {
                  const bLat = (b as any).latitude || (b as any).lat;
                  const bLng = (b as any).longitude || (b as any).lng;
                  const queryStr = `${vendor.name} - ${b.name}, ${b.city}, ${b.district ? b.district + " " : ""}${b.address}`;
                  const mapsUrl =
                    (b as any).maps_url ||
                    (b as any).google_maps_url ||
                    (bLat && bLng
                      ? `https://www.google.com/maps?q=${bLat},${bLng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}`);

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-2xl border text-right text-xs transition-all ${
                        b.is_main
                          ? "bg-emerald-50/70 border-emerald-200 shadow-2xs"
                          : "bg-slate-50/90 border-slate-200 hover:border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-black text-slate-800 text-xs truncate">
                            {b.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {b.is_main && (
                            <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                              الفرع الرئيسي
                            </span>
                          )}
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-300 transition-all hover:shadow-xs cursor-pointer"
                            title={`فتح ${b.name} على خرائط Google`}
                          >
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>موقع الفرع 🗺️</span>
                          </a>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 mr-5 leading-relaxed font-medium">
                        {b.city} {b.district ? `• ${b.district}` : ""} • {b.address}
                        {b.contact_phone ? ` • هاتف: ${b.contact_phone}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Recent Reviews Section */}
          <div className="space-y-2 text-right pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-900">آخر تقييمات العملاء</h4>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-0.5">
              {reviews.map((rev, i) => (
                <div
                  key={i}
                  className="bg-[#F8FAFB] border border-slate-100 rounded-2xl p-3 space-y-1 text-right"
                >
                  <div className="flex items-center justify-between">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <span key={s} className={s < rev.stars ? "text-amber-400" : "text-gray-300"}>
                          ★
                        </span>
                      ))}
                    </div>
                    {/* Time */}
                    <span className="text-[10px] text-slate-400 font-medium">
                      {rev.timeAgo}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 leading-snug">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Bottom Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#1B4D3E] hover:bg-[#153e32] text-white font-black text-xs transition-all shadow-sm cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
