"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Store,
  Search,
  Filter,
  Navigation,
  CheckCircle2,
  Clock,
  Star,
  ExternalLink,
  Plus,
  Car,
  Building2,
  Phone,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Compass,
  X,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Check,
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
import { MapVendorDTO } from "@/lib/bounded-contexts/supplier/supplier.types";
import {
  getFormattedWeeklySchedule,
  formatTimeAr,
} from "@/lib/business-hours";
import { CANONICAL_BRANDS } from "@/lib/brand-specialization";

const SAUDI_CITIES = [
  { name: "الكل", value: "all" },
  { name: "الرياض", value: "الرياض", lat: 24.7136, lng: 46.6753 },
  { name: "الخرج", value: "الخرج", lat: 24.1500, lng: 47.3000 },
  { name: "جدة", value: "جدة", lat: 21.5433, lng: 39.1728 },
  { name: "الدمام", value: "الدمام", lat: 26.4207, lng: 50.0888 },
  { name: "مكة المكرمة", value: "مكة المكرمة", lat: 21.3891, lng: 39.8579 },
  { name: "المدينة المنورة", value: "المدينة المنورة", lat: 24.5247, lng: 39.5692 },
  { name: "الخبر", value: "الخبر", lat: 26.2172, lng: 50.1971 },
];

const CAR_MODELS_BY_BRAND: Record<string, string[]> = {
  toyota: ["كامري", "كورولا", "لاند كروزر", "برادو", "راف4", "هايلكس", "يارس", "أفالون", "سيكويا", "فورتشنر", "أخرى"],
  lexus: ["ES", "LS", "LX", "RX", "GX", "IS", "NX", "أخرى"],
  hyundai: ["إيلانترا", "سوناتا", "توسان", "سانتافي", "كريتا", "أزيرا", "أكسنت", "H1", "أخرى"],
  kia: ["أوبتيما", "سبورتاج", "سورينتو", "بيكانتو", "سيراتو", "تيلورايد", "كادينزا", "K5", "أخرى"],
  nissan: ["التيما", "ماكسيما", "باترول", "إكس-تريل", "مورانو", "أرمادا", "صني", "تيدا", "أخرى"],
  honda: ["أكورد", "سيفيك", "CR-V", "HR-V", "بايلوت", "أخرى"],
  mercedes_benz: ["C-Class (C200)", "E-Class (E200/E300)", "S-Class (S500)", "GLC", "GLE", "A-Class", "G-Class", "أخرى"],
  bmw: ["الفئة الثالثة (320i)", "الفئة الخامسة (520i)", "الفئة السابعة (730i)", "X3", "X5", "X7", "أخرى"],
  ford: ["تورس", "إكسبلورر", "إف-150 (F-150)", "موستانج", "إيدج", "برونكو", "إكسبيديشن", "أخرى"],
  gmc: ["سييرا", "يوكن", "اكاديا", "تيرين", "دينالي", "أخرى"],
  chevrolet: ["ماليبو", "إمبالا", "كابتيفا", "تاهو", "سيلفرادو", "كابرس", "ترافرس", "أخرى"],
  jeep: ["جراند شيروكي", "رانجلر", "كومباس", "رينيجيد", "جلاديتور", "أخرى"],
  mazda: ["مازدا 6", "مازدا 3", "CX-9", "CX-5", "CX-30", "أخرى"],
  mitsubishi: ["باجيرو", "لانسر", "أوتلاندر", "L200", "إكليبس", "أخرى"],
  audi: ["A4", "A6", "A8", "Q5", "Q7", "Q8", "أخرى"],
  volkswagen: ["باسات", "تيجوان", "طوارق", "جولف", "أرتيون", "أخرى"],
  porsche: ["كايين", "باناميرا", "ماكان", "911", "أخرى"],
  land_rover: ["رينج روفر", "ديفندر", "ديسكفري", "إيفوك", "أخرى"],
  changan: ["CS75", "CS85", "CS95", "CS35 Plus", "إيدو", "أخرى"],
  haval: ["H6", "H9", "جوليان", "دارغو", "أخرى"],
  geely: ["كولراي", "توغيلا", "أزكارا", "مونجارو", "إمجراند", "أخرى"],
  mg: ["MG 5", "MG 6", "MG GT", "MG RX5", "MG ZS", "MG HS", "أخرى"],
};

const BRAND_NAMES_AR: Record<string, string> = {
  toyota: "تويوتا",
  lexus: "لكزس",
  hyundai: "هيونداي",
  kia: "كيا",
  nissan: "نيسان",
  honda: "هوندا",
  mercedes_benz: "مرسيدس",
  bmw: "بي إم دبليو",
  ford: "فورد",
  gmc: "جي إم سي",
  chevrolet: "شيفروليه",
  jeep: "جيب",
  mazda: "مازدا",
  mitsubishi: "ميتسوبيشي",
  audi: "أودي",
  volkswagen: "فولكس واجن",
  porsche: "بورش",
  land_rover: "لاند روفر",
  changan: "شانجان",
  haval: "هافال",
  geely: "جيلي",
  mg: "إم جي",
};

export default function VendorsMapClient() {
  const router = useRouter();

  // State: Data
  const [vendors, setVendors] = useState<MapVendorDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State: Selected Vendor & Details Modal
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [activeVendorForModal, setActiveVendorForModal] = useState<MapVendorDTO | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);

  // State: Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [filterPickupOnly, setFilterPickupOnly] = useState<boolean>(false);
  const [filterOpenNowOnly, setFilterOpenNowOnly] = useState<boolean>(false);

  // State: Client Geolocation (Temporary in-memory only)
  const [clientCoords, setClientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // State: Map instance & DOM refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayerGroup = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // ── 1. Fetch Real Vendors from Backend API ──
  const fetchVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCity && selectedCity !== "all") params.set("city", selectedCity);
      if (selectedBrand && selectedBrand !== "all") params.set("brand", selectedBrand);
      if (selectedModel && selectedModel !== "all") params.set("model", selectedModel);
      if (filterPickupOnly) params.set("accepts_pickup", "true");
      if (filterOpenNowOnly) params.set("open_now", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      if (clientCoords) {
        params.set("client_lat", clientCoords.lat.toString());
        params.set("client_lng", clientCoords.lng.toString());
      }

      const res = await fetch(`/api/v1/vendors/map?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setVendors(json.data.vendors || []);
      } else {
        setError(json.errors?.[0]?.message || "فشل جلب قائمة الموردين");
      }
    } catch (e: any) {
      setError("تعذر الاتصال بالخادم، يرجى التحقق من الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [selectedCity, selectedBrand, selectedModel, filterPickupOnly, filterOpenNowOnly, clientCoords]);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── 2. Initialize Leaflet Map (Safe, Client-side only) ──
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const defaultCenter: [number, number] = [24.7136, 46.6753]; // Riyadh center

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: false,
    });

    // Dark-themed, standard OSM tile layer with proper production attribution
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control on top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    markersLayerGroup.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // Trigger resize calculation
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 200);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // ── 3. Render Custom Markers for Vendors ──
  useEffect(() => {
    if (!mapInstance.current || !markersLayerGroup.current) return;

    markersLayerGroup.current.clearLayers();

    const bounds: [number, number][] = [];

    vendors.forEach((vendor) => {
      if (!vendor.latitude || !vendor.longitude) return;

      const isSelected = selectedVendorId === vendor.id;
      const isOpen =
        vendor.operational_status.status === "open" ||
        vendor.operational_status.status === "closing_soon";

      const pinColor = isSelected ? "#10B981" : isOpen ? "#3B82F6" : "#64748B";

      const customIcon = L.divIcon({
        className: "custom-vendor-marker",
        html: `
          <div style="
            background: ${pinColor};
            width: ${isSelected ? "38px" : "32px"};
            height: ${isSelected ? "38px" : "32px"};
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            border: 3px solid #0F172A;
            box-shadow: 0 8px 20px rgba(0,0,0,0.5);
            transition: all 0.2s ease;
            transform: ${isSelected ? "scale(1.15)" : "scale(1)"};
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([vendor.latitude, vendor.longitude], {
        icon: customIcon,
      });

      marker.on("click", () => {
        setSelectedVendorId(vendor.id);
        setActiveVendorForModal(vendor);
        if (mapInstance.current) {
          mapInstance.current.panTo([vendor.latitude, vendor.longitude], {
            animate: true,
            duration: 0.5,
          });
        }
      });

      marker.bindPopup(`
        <div style="direction: rtl; font-family: inherit; padding: 4px; min-width: 230px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
            <span style="font-weight: 900; font-size: 13px; color: #0F172A;">${vendor.company_name}</span>
            ${vendor.is_main_branch ? '<span style="font-size: 9px; font-weight: bold; background: #FEF3C7; color: #B45309; padding: 1px 6px; border-radius: 4px;">الفرع الرئيسي ⭐</span>' : ''}
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #059669; margin-bottom: 3px;">🏪 ${vendor.branch_name || "الفرع الرئيسي"}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">📍 ${vendor.address}</div>
          ${vendor.contact_name ? `<div style="font-size: 10px; color: #64748B; margin-bottom: 4px;">👤 ${vendor.contact_name}</div>` : ''}
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; border-top: 1px solid #E2E8F0; padding-top: 6px;">
            <span style="font-size: 10px; font-weight: bold; background: #ECFDF5; color: #059669; padding: 2px 8px; border-radius: 6px;">
              ${vendor.operational_status.labelAr}
            </span>
            <span style="font-size: 10px; font-weight: bold; color: #D97706;">★ ${vendor.rating.toFixed(1)}</span>
          </div>
        </div>
      `);

      marker.addTo(markersLayerGroup.current!);
      bounds.push([vendor.latitude, vendor.longitude]);
    });

    // Fit map bounds if vendors exist
    if (bounds.length > 0 && mapInstance.current && !selectedVendorId) {
      try {
        mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {}
    }
  }, [vendors, selectedVendorId]);

  // ── 4. Geolocation Trigger (Strictly user-approved, non-intrusive) ──
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("متصفحك لا يدعم خاصية تحديد الموقع الجغرافي");
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setClientCoords({ lat: latitude, lng: longitude });
        setIsLocating(false);

        if (mapInstance.current) {
          mapInstance.current.flyTo([latitude, longitude], 14, { duration: 1.2 });

          // Render or update user location pin
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const userIcon = L.divIcon({
              className: "user-loc-marker",
              html: `
                <div style="
                  background: #2563EB;
                  width: 22px;
                  height: 22px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 0 0 6px rgba(37,99,235,0.35);
                  animation: pulse 2s infinite;
                "></div>
              `,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            });
            userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
              .bindPopup("<div style='direction: rtl; font-size: 11px; font-weight: bold;'>📍 موقعك الحالي التقريبي</div>")
              .addTo(mapInstance.current);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("تم رفض إذن الوصول للموقع. يمكنك الاستمرار بتصفح الموردين واختيار المدينة يدوياً.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError("معلومات الموقع غير متوفرة حالياً، يرجى اختيار المدينة يدوياً.");
        } else {
          setGpsError("انتهت مهلة تحديد الموقع، يرجى المحاولة لاحقاً.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // ── 5. Focus on specific vendor ──
  const handleSelectVendor = (vendor: MapVendorDTO) => {
    setSelectedVendorId(vendor.id);
    setActiveVendorForModal(vendor);
    if (mapInstance.current) {
      mapInstance.current.flyTo([vendor.latitude, vendor.longitude], 15, { duration: 0.8 });
    }
  };

  // ── 6. Navigate to new-rfq with verified server params & selected vehicle ──
  const handleStartPickupOrder = (vendor: MapVendorDTO) => {
    const vId = vendor.vendor_id || vendor.id.split("__")[0] || vendor.id;
    const bId = vendor.branch_id || vendor.id.split("__")[1] || "";
    const brandAr = BRAND_NAMES_AR[selectedBrand] || (selectedBrand !== "all" ? selectedBrand : "");
    const modelAr = selectedModel !== "all" ? selectedModel : "";
    let url = `/client/new-rfq?vendorId=${encodeURIComponent(vId)}&branchId=${encodeURIComponent(bId)}&mode=pickup&source=VENDOR_MAP`;
    if (brandAr) url += `&carMake=${encodeURIComponent(brandAr)}`;
    if (modelAr) url += `&carModel=${encodeURIComponent(modelAr)}`;
    router.push(url);
  };

  // Current active vendor object
  const activeVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId) || activeVendorForModal || vendors[0] || null;
  }, [vendors, selectedVendorId, activeVendorForModal]);

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] bg-[#070D1E] text-slate-100 select-none overflow-hidden" dir="rtl">
      
      {/* ── TOP ACTION & FILTER BAR ── */}
      <header className="shrink-0 bg-[#0B1528] border-b border-slate-800/80 px-4 py-3 z-30 shadow-md">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Title & Stats */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                    خريطة الموردين المعتمدين
                  </h1>
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {vendors.length} فرع نشط
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  اختر أقرب فرع مورد معتمد لطلب وتجهيز واستلام القطع مباشرة
                </p>
              </div>
            </div>

            {/* GPS Locator Button on Mobile */}
            <button
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold active:scale-95 transition-all"
            >
              {isLocating ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Navigation className="w-4 h-4" />}
              <span>موقعي</span>
            </button>
          </div>

          {/* Search & Global Controls */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، الحي، أو الشارع..."
                className="w-full h-10 pr-9 pl-4 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* GPS Button (Desktop) */}
            <button
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
              title="تحديد موقعي وحساب المسافة التقريبية"
            >
              {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              <span>{clientCoords ? "تم تحديد موقعك ✓" : "تحديد موقعي"}</span>
            </button>
          </div>

        </div>

        {/* ── FILTER PILLS ROW ── */}
        <div className="w-full mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          
          {/* City Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 ml-1">المدينة:</span>
            {SAUDI_CITIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedCity(c.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCity === c.value
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-800 shrink-0 mx-1" />

          {/* Quick Toggles */}
          <button
            onClick={() => setFilterOpenNowOnly(!filterOpenNowOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterOpenNowOnly
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>مفتوح الآن</span>
          </button>

          <button
            onClick={() => setFilterPickupOnly(!filterPickupOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterPickupOnly
                ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>يقبل الاستلام الذاتي</span>
          </button>

          {/* Brand & Model Filter */}
          <div className="flex items-center gap-2 shrink-0 mr-auto flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 ml-1">الماركة:</span>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedModel("all");
                }}
                className="h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">كافة الأنواع والماركات 🌐</option>
                <optgroup label="🇯🇵 المنشأ الياباني">
                  <option value="toyota">تويوتا (Toyota)</option>
                  <option value="lexus">لكزس (Lexus)</option>
                  <option value="nissan">نيسان (Nissan)</option>
                  <option value="honda">هوندا (Honda)</option>
                  <option value="mazda">مازدا (Mazda)</option>
                  <option value="mitsubishi">ميتسوبيشي (Mitsubishi)</option>
                  <option value="isuzu">إيسوزو (Isuzu)</option>
                </optgroup>
                <optgroup label="🇺🇸 المنشأ الأمريكي">
                  <option value="ford">فورد (Ford)</option>
                  <option value="gmc">جي إم سي (GMC)</option>
                  <option value="chevrolet">شيفروليه (Chevrolet)</option>
                  <option value="cadillac">كاديلاك (Cadillac)</option>
                  <option value="jeep">جيب (Jeep)</option>
                  <option value="dodge">دودج (Dodge)</option>
                  <option value="ram">رام (RAM)</option>
                </optgroup>
                <optgroup label="🇰🇷 المنشأ الكوري">
                  <option value="hyundai">هيونداي (Hyundai)</option>
                  <option value="kia">كيا (Kia)</option>
                  <option value="genesis">جينيسيس (Genesis)</option>
                </optgroup>
                <optgroup label="🇩🇪 المنشأ الأوروبي والألماني">
                  <option value="mercedes_benz">مرسيدس بنز (Mercedes-Benz)</option>
                  <option value="bmw">بي إم دبليو (BMW)</option>
                  <option value="audi">أودي (Audi)</option>
                  <option value="volkswagen">فولكس واجن (Volkswagen)</option>
                  <option value="porsche">بورش (Porsche)</option>
                  <option value="land_rover">لاند روفر (Land Rover)</option>
                </optgroup>
                <optgroup label="🇨🇳 المنشأ الصيني">
                  <option value="changan">شانجان (Changan)</option>
                  <option value="haval">هافال (Haval)</option>
                  <option value="geely">جيلي (Geely)</option>
                  <option value="mg">إم جي (MG)</option>
                  <option value="byd">بي واي دي (BYD)</option>
                  <option value="chery">شيري (Chery)</option>
                </optgroup>
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 ml-1">الموديل:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={selectedBrand === "all"}
                className={`h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer ${
                  selectedBrand === "all" ? "text-slate-600 opacity-60 cursor-not-allowed" : "text-emerald-400 border-emerald-500/40"
                }`}
              >
                <option value="all">
                  {selectedBrand === "all" ? "اختر الماركة أولاً" : "كافة الموديلات 🚗"}
                </option>
                {selectedBrand !== "all" &&
                  (CAR_MODELS_BY_BRAND[selectedBrand] || []).map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
              </select>
            </div>
          </div>

        </div>
      </header>

      {/* ── GPS Notification Alert (if any) ── */}
      {gpsError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{gpsError}</span>
          </div>
          <button onClick={() => setGpsError(null)} className="text-amber-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── MAIN WORKSPACE: SPLIT DESKTOP (MAP + SIDEBAR LIST) ── */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* 1. LEFT SIDE: INTERACTIVE LEAFLET MAP CANVAS */}
        <div className="flex-1 h-full relative z-10 bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Distance Disclaimer Pill */}
          <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-[11px] font-medium text-slate-300 shadow-xl">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>المسافات المعروضة تقديرية خطية عبر معادلة Haversine</span>
          </div>
        </div>

        {/* 2. RIGHT SIDE: VENDORS LIST & ACTIVE VENDOR DETAILS */}
        <div className="w-full md:w-[420px] lg:w-[460px] shrink-0 bg-[#0B1528] border-r border-slate-800/80 flex flex-col z-20 shadow-2xl h-[45vh] md:h-full">
          
          {/* List Header */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-white">قائمة الموردين المتاحين</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              {vendors.length} فروع
            </span>
          </div>

          {/* Vendors Scrollable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-xs font-bold">جاري تحميل وتحديث خريطة الموردين...</p>
              </div>
            ) : vendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                <Store className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-300">لا يوجد موردون يطابقون خيارات البحث</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  جرب تغيير المدينة أو إزالة بعض الفلاتر لعرض كافة الموردين
                </p>
                <button
                  onClick={() => {
                    setSelectedCity("all");
                    setSelectedBrand("all");
                    setFilterPickupOnly(false);
                    setFilterOpenNowOnly(false);
                    setSearchQuery("");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              vendors.map((vendor) => {
                const isSelected = selectedVendorId === vendor.id;
                const opStatus = vendor.operational_status;

                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleSelectVendor(vendor)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                        : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700"
                    }`}
                  >
                    {/* Top Row: Title, Rating, Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs mt-0.5">
                          {vendor.company_name.charAt(0) || "م"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-xs font-black text-white truncate">
                              {vendor.company_name}
                            </h3>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-bold text-emerald-400 truncate">
                              🏪 {vendor.branch_name || "الفرع الرئيسي"}
                            </span>
                            {vendor.is_main_branch && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0">
                                الفرع الرئيسي ⭐
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-1">
                            📍 {vendor.address || `${vendor.district ? `${vendor.district} – ` : ""}${vendor.city}`}
                          </p>
                          {vendor.contact_name && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              👤 {vendor.contact_name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{vendor.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Middle Info: Distance & Opening Status */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${opStatus.badgeClass}`}>
                          {opStatus.labelAr}
                        </span>
                        {vendor.accepts_pickup && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-bold">
                            استلام ذاتي ✓
                          </span>
                        )}
                      </div>

                      {vendor.approx_distance_label ? (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                          {vendor.approx_distance_label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">📍 {vendor.city}</span>
                      )}
                    </div>

                    {/* Brand Tags */}
                    {vendor.specialized_brands && vendor.specialized_brands.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        {vendor.specialized_brands.slice(0, 4).map((b) => (
                          <span
                            key={b}
                            className="px-1.5 py-0.2 bg-slate-800 text-slate-400 text-[9px] font-bold rounded"
                          >
                            {b}
                          </span>
                        ))}
                        {vendor.specialized_brands.length > 4 && (
                          <span className="text-[9px] text-slate-500 font-bold">
                            +{vendor.specialized_brands.length - 4} ماركات
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar (When selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartPickupOrder(vendor);
                          }}
                          className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>طلب واستلام من الفرع</span>
                        </button>

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                          title="فتح المسار في خرائط Google"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">خرائط Google</span>
                        </a>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVendorForModal(vendor);
                            setShowScheduleModal(true);
                          }}
                          className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all border border-slate-700 cursor-pointer"
                          title="عرض جدول ساعات العمل"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Summary if a vendor is active */}
          {activeVendor && (
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold">الفرع المختار:</p>
                <p className="text-xs font-black text-white truncate">
                  {activeVendor.company_name} {activeVendor.branch_name ? `(${activeVendor.branch_name})` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleStartPickupOrder(activeVendor)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
              >
                <span>طلب واستلام مباشر</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ── 3. WEEKLY BUSINESS HOURS SCHEDULE MODAL ── */}
      {showScheduleModal && activeVendor && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="bg-[#0B1528] text-white rounded-3xl border border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">أوقات العمل الأسبوعية</h3>
                  <p className="text-[11px] text-slate-400">{activeVendor.company_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Schedule List */}
            <div className="space-y-2">
              {getFormattedWeeklySchedule(activeVendor.business_hours).map((d) => (
                <div
                  key={d.dayKey}
                  className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold ${
                    d.isToday
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      : "bg-slate-900 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{d.dayNameAr}</span>
                    {d.isToday && (
                      <span className="text-[9px] font-extrabold bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded">
                        اليوم
                      </span>
                    )}
                  </div>
                  <span className={d.isOpen ? "text-slate-200" : "text-rose-400"}>
                    {d.hoursAr}
                  </span>
                </div>
              ))}
            </div>

            {/* Address Details */}
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{activeVendor.address}</span>
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  handleStartPickupOrder(activeVendor);
                }}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>متابعة الطلب مع هذا المورد</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
