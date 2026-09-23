"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MatchResultDTO, RFQMatchRequestDTO, VendorProfileDTO } from "@/lib/bounded-contexts/supplier/supplier.types";
import { smartRadarMatchingEngine, DEFAULT_CURRENT_VENDOR } from "@/lib/bounded-contexts/supplier/radar.matcher";
import { filterRfqsForVendor } from "@/lib/brand-specialization";
import { filterRfqsForVendorCategories } from "@/lib/category-specialization";
import {
  Zap,
  Filter,
  CheckCircle2,
  Star,
  MapPin,
  Truck,
  Car,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Loader2,
  Building2,
  Send,
  Clock,
  Package,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface ScoredRFQ {
  rfq: {
    id: string;
    car_make: string;
    car_model: string;
    car_year: number;
    plate_number?: string;
    vin?: string;
    parts_description?: string;
    delivery_location?: string;
    created_at: string;
    status: string;
  };
  match: MatchResultDTO;
}

function shortId(id: string) {
  if (!id) return "—";
  return id.replace(/^(REQ-|ORD-|RFQ-)/i, "").slice(0, 8).toUpperCase();
}

function parsePartsText(parts_description?: string): string {
  if (!parts_description) return "قطع غيار مركبات";
  try {
    const parsed = JSON.parse(parts_description);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const names = parsed.map((p: any) => p.partName || p.part_name || p.name || p.title).filter(Boolean);
      return names.join(" ، ") || "قطع غيار مركبات";
    }
  } catch {
    if (typeof parts_description === "string" && parts_description.trim()) {
      return parts_description;
    }
  }
  return "قطع غيار مركبات";
}

export default function VendorRadarPage() {
  const [vendorProfile, setVendorProfile] = useState<VendorProfileDTO>(DEFAULT_CURRENT_VENDOR);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [scoredRfqs, setScoredRfqs] = useState<ScoredRFQ[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAndCalculate = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Fetch current logged-in vendor profile
      const { data: authData } = await supabase.auth.getUser();
      let currentVendor: VendorProfileDTO = { ...DEFAULT_CURRENT_VENDOR };
      let vendorSpecializedBrands: string[] = currentVendor.brands_specialized;
      let vendorSpecializesInAll = true;

      let vendorSpecializedCategories: string[] = [];
      let vendorSpecializesInAllCategories = true;

      if (authData?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, company_name, city, phone, specialized_brands, specializes_in_all_brands, specialized_categories, specializes_in_all_categories")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (prof) {
          if (Array.isArray(prof.specialized_brands) && prof.specialized_brands.length > 0) {
            vendorSpecializedBrands = prof.specialized_brands;
          }
          vendorSpecializesInAll = prof.specializes_in_all_brands !== false;

          if (Array.isArray(prof.specialized_categories)) {
            vendorSpecializedCategories = prof.specialized_categories;
          }
          vendorSpecializesInAllCategories = prof.specializes_in_all_categories !== false;

          currentVendor = {
            ...currentVendor,
            vendor_id: authData.user.id,
            company_name: prof.company_name || prof.full_name || currentVendor.company_name,
            city: prof.city || currentVendor.city,
            brands_specialized: vendorSpecializedBrands,
          };
        }
      }
      setVendorProfile(currentVendor);

      // 2. Fetch real open RFQs from Supabase database
      const { data: rfqsData } = await supabase
        .from("rfqs")
        .select("id, car_make, car_model, car_year, plate_number, vin, parts_description, delivery_location, status, created_at, expires_at, target_vendor_id, parts_category")
        .in("status", ["open", "quoted"])
        .order("created_at", { ascending: false })
        .limit(50);

      const now = Date.now();
      const activeUnexpired = (rfqsData || []).filter((r: any) => {
        if (r.status === "cancelled" || r.status === "closed") return false;
        if (r.expires_at && now >= new Date(r.expires_at).getTime()) return false;
        // Filter out private RFQs intended for other vendors
        if (r.target_vendor_id && r.target_vendor_id !== currentVendor.vendor_id && r.target_vendor_id !== "vendor-demo-id" && r.target_vendor_id !== "current-vendor-id") {
          return false;
        }
        return true;
      });

      const directTargeted = activeUnexpired.filter((r: any) => r.target_vendor_id && (r.target_vendor_id === currentVendor.vendor_id || r.target_vendor_id === "vendor-demo-id" || r.target_vendor_id === "current-vendor-id"));
      const generalMarket = activeUnexpired.filter((r: any) => !r.target_vendor_id);

      let filteredGeneral = filterRfqsForVendor(
        generalMarket,
        vendorSpecializedBrands,
        vendorSpecializesInAll
      );

      filteredGeneral = filterRfqsForVendorCategories(
        filteredGeneral,
        vendorSpecializedCategories,
        vendorSpecializesInAllCategories
      );

      const rawRfqs = [...directTargeted, ...filteredGeneral];

      // 3. Compute Smart Radar Match Score for each real RFQ
      const scoredList: ScoredRFQ[] = await Promise.all(
        rawRfqs.map(async (rfq: any) => {
          const matchReq: RFQMatchRequestDTO = {
            rfq_id: rfq.id,
            car_make: rfq.car_make || "تويوتا",
            car_model: rfq.car_model || "",
            car_year: rfq.car_year || 2023,
            city: rfq.delivery_location || "الرياض",
            parts_description: parsePartsText(rfq.parts_description),
            created_at: rfq.created_at,
          };

          const matchResult = await smartRadarMatchingEngine.calculateMatchScore(matchReq, currentVendor);

          // Elevate direct targeted requests to 100% match
          if (rfq.target_vendor_id && (rfq.target_vendor_id === currentVendor.vendor_id || rfq.target_vendor_id === "vendor-demo-id" || rfq.target_vendor_id === "current-vendor-id")) {
            matchResult.total_score = 100;
            matchResult.match_grade = "مباشرة 100% 🎯";
          }

          return {
            rfq,
            match: matchResult,
          };
        })
      );

      // Sort by Match Score (Highest first)
      scoredList.sort((a, b) => b.match.total_score - a.match.total_score);
      setScoredRfqs(scoredList);
    } catch (err) {
      console.error("Radar matching error:", err);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAndCalculate();
  }, [fetchAndCalculate]);

  // Filtered RFQs based on Brand and City dropdowns
  const filteredMatches = useMemo(() => {
    return scoredRfqs.filter(({ rfq }) => {
      if (selectedBrand !== "all") {
        const make = (rfq.car_make || "").toLowerCase();
        if (!make.includes(selectedBrand.toLowerCase())) return false;
      }
      if (selectedCity !== "all") {
        const loc = (rfq.delivery_location || "").toLowerCase();
        if (!loc.includes(selectedCity.toLowerCase())) return false;
      }
      return true;
    });
  }, [scoredRfqs, selectedBrand, selectedCity]);

  // Extract unique brands and cities available in the database for the filters
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    scoredRfqs.forEach(({ rfq }) => {
      if (rfq.car_make) set.add(rfq.car_make.trim());
    });
    return Array.from(set);
  }, [scoredRfqs]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    scoredRfqs.forEach(({ rfq }) => {
      if (rfq.delivery_location) {
        const loc = rfq.delivery_location.trim();
        if (loc.includes("رياض")) set.add("الرياض");
        else if (loc.includes("جدة")) set.add("جدة");
        else if (loc.includes("دمام")) set.add("الدمام");
        else set.add(loc);
      }
    });
    return Array.from(set);
  }, [scoredRfqs]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 dir-rtl text-slate-900 font-sans w-full" dir="rtl">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0A1224] via-[#0F1C36] to-[#0A1224] p-5 sm:p-7 rounded-3xl text-white shadow-2xl border border-slate-800">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Zap className="w-6 h-6 sm:w-7 sm:h-7 fill-emerald-300 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-slate-300">محرك المطابقة التخصصي الحقيقي</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black">
                Smart Rule Engine v3
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug truncate">
              رادار تصفية الطلبات الذكي (Smart RFQ Radar)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              احتساب وتوجيه طلبات السوق الحقيقية وفق تخصص الماركة، النطاق الجغرافي، ونوعية القطع المطلوبة
            </p>
          </div>
        </div>

        <button
          onClick={fetchAndCalculate}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 shadow-sm shrink-0 self-end sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>إعادة حساب المطابقة الحية</span>
        </button>
      </div>

      {/* ── FILTER CONTROLS BAR ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800 shrink-0">تصفية النتائج:</span>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="all">كافة الماركات ({availableBrands.length})</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="all">كافة المدن</option>
            <option value="الرياض">الرياض</option>
            <option value="جدة">جدة</option>
            <option value="الدمام">الدمام</option>
          </select>

          {(selectedBrand !== "all" || selectedCity !== "all") && (
            <button
              onClick={() => {
                setSelectedBrand("all");
                setSelectedCity("all");
              }}
              className="text-xs text-red-600 font-bold hover:underline px-2"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span>الطلبات المطابقة في السوق:</span>
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black font-mono border border-emerald-200 text-xs">
            {filteredMatches.length} طلبات حقيقية
          </span>
        </div>
      </div>

      {/* ── RADAR MATCH RESULTS ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">جاري احتساب قواعد المطابقة بالرادار وقراءة الطلبات المفتوحة...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-2 text-slate-400">
            <Package className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">لا توجد طلبات مطابقة للمعايير المحددة</p>
            <p className="text-xs text-slate-400">جرب اختيار "كافة الماركات" أو "كافة المدن" لعرض جميع طلبات السوق المتاحة</p>
          </div>
        ) : (
          filteredMatches.map(({ rfq, match }) => {
            const partsText = parsePartsText(rfq.parts_description);
            const isHighMatch = match.total_score >= 85;

            return (
              <div
                key={rfq.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-xl hover:border-emerald-400 transition-all duration-300 space-y-4 group"
              >
                {/* Header: Score badge + RFQ Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center font-black text-base sm:text-xl shadow-md shrink-0 ${
                        isHighMatch
                          ? "bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/20"
                          : "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20"
                      }`}
                    >
                      {match.total_score}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          طلب #{shortId(rfq.id)}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                            isHighMatch
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          مطابقة {match.match_grade}
                        </span>
                        {rfq.target_vendor_id && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                            🎯 طلب تسعير مباشر موجه إليك
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        {rfq.car_make} {rfq.car_model} {rfq.car_year}
                        {rfq.plate_number && ` • لوحة: ${rfq.plate_number}`}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>موقع التوصيل: {rfq.delivery_location || "الرياض"}</span>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(rfq.created_at).toLocaleDateString("ar-SA")}</span>
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/vendor/quote/${rfq.id}`}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black transition-all shadow-md shrink-0 w-full sm:w-auto"
                  >
                    <span>تقديم عرض سعر الآن</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>

                {/* Parts Summary Row */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 block mb-0.5">تفاصيل القطع المطلوبة في هذا الطلب:</span>
                  <p className="text-xs font-extrabold text-slate-800">{partsText}</p>
                </div>

                {/* Reasons Breakdown Chips */}
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-600">تحليل قواعد محرك المطابقة لهذا الطلب:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {match.reasons.map((r) => (
                      <div
                        key={r.rule_id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate">{r.label}</span>
                        </div>
                        <span className="font-black text-emerald-700 font-mono shrink-0 mr-1 text-xs">
                          +{r.score_gained}/{r.max_score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
