"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LocationPickerDialog } from "@/components/location-picker-dialog";
import { fleetRepository } from "@/lib/bounded-contexts/fleet/fleet.repository";
import { VehicleEntity } from "@/lib/bounded-contexts/fleet/fleet.types";
import {
  MapPin,
  Car,
  Package,
  Truck,
  Check,
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  Loader2,
  Sparkles,
  Building2,
  UploadCloud,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Store,
  UserCheck,
  Star,
  Compass,
  CheckCircle,
  CheckCircle2,
  Navigation,
  BadgeCheck,
  FileText,
  Globe,
  User,
  Phone,
  X,
  Pencil,
  Trash2,
  Gauge,
  Fuel,
  Wrench,
  Hash,
  Layers,
  ShieldCheck,
  Camera,
  Minus,
  Tag,
  Images,
  Maximize2,
  Minimize2,
  ZoomIn,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { VendorBranchMapModal } from "@/components/vendor-branch-map-modal";
import { VendorBranchesSelector } from "@/components/vendor-branches-selector";
import {
  CANONICAL_PARTS_CATEGORIES,
  CanonicalPartsCategory,
  getPartsCategoryById,
  matchCategoryFromPartName,
  isVendorSpecializedInCategory,
} from "@/lib/category-specialization";

/* ------------------------------------------------------------------ */
/*  Preset Car Data for Manual Input Fallback                         */
/* ------------------------------------------------------------------ */
const CAR_MAKES = [
  "جي إم سي", "تويوتا", "هوندا", "نيسان", "هيونداي", "كيا", "مرسيدس", "بي إم دبليو",
  "أودي", "فورد", "شيفروليه", "جيب", "لكزس", "إنفينيتي", "أكورا",
  "فولكسفاغن", "سوبارو", "مازدا", "ميتسوبيشي", "بيجو", "رينو", "أخرى",
];

const CAR_MODELS: Record<string, string[]> = {
  "جي إم سي": ["هايلوكس", "سييرا", "يوكن", "اكاديا", "تيرين", "سفاري", "دينالي", "أخرى"],
  "تويوتا": ["كامري", "كورولا", "لاند كروزر", "برادو", "راف4", "هايلكس", "يارس", "أفالون", "سيكويا", "فورتشنر"],
  "هيونداي": ["إيلانترا", "سوناتا", "توسان", "سانتافي", "كريتا", "أزيرا", "H1"],
  "كيا": ["أوبتيما", "سبورتاج", "سورينتو", "بيكانتو", "سيراتو", "تيلورايد"],
  "نيسان": ["التيما", "ماكسيما", "باترول", "إكس-تريل", "مورانو", "أرمادا", "صني", "تيدا"],
  "هوندا": ["أكورد", "سيفيك", "CR-V", "HR-V", "بايلوت"],
  "مرسيدس": ["C200", "E200", "E300", "S500", "GLC", "GLE", "A200"],
  "بي إم دبليو": ["318i", "320i", "520i", "730i", "X3", "X5", "X7"],
  "فورد": ["تورس", "إكسبلورر", "إف-150", "موستانج", "إيدج", "برونكو"],
  "شيفروليه": ["ماليبو", "إمبالا", "كابتيفا", "تاهو", "سيلفرادو"],
  "جيب": ["جراند شيروكي", "رانجلر", "كومباس", "رينيجيد"],
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

/* ------------------------------------------------------------------ */
/*  Presets for Fleet, Locations & Vendors                           */
/* ------------------------------------------------------------------ */
interface BranchLocation {
  id: string;
  title: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

const COMPANY_BRANCHES: BranchLocation[] = [
  {
    id: "br-riyadh",
    title: "فرع الرياض",
    address: "طريق الملك فهد – حي العليا",
    city: "الرياض",
    lat: 24.7136,
    lng: 46.6753,
  },
  {
    id: "br-jeddah",
    title: "فرع جدة",
    address: "طريق المدينة – حي الروضة",
    city: "جدة",
    lat: 21.5433,
    lng: 39.1728,
  },
  {
    id: "br-dammam",
    title: "فرع الدمام",
    address: "شارع الأمل – الكورنيش الشمالي",
    city: "الدمام",
    lat: 26.4207,
    lng: 50.0888,
  },
];

interface PresetVehicle {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number: string;
  vin: string;
  branch_id: string;
  serial_number?: string;
  mileage?: string;
  engine_capacity?: string;
  cylinders?: string;
  transmission?: string;
  fuel_type?: string;
}

const PRESET_FLEET: PresetVehicle[] = [
  {
    id: "v-5",
    car_make: "جي إم سي",
    car_model: "هايلوكس",
    car_year: 2023,
    plate_number: "ت ل ف 336",
    vin: "1GCEC19X4DZ115309",
    branch_id: "br-jeddah",
    serial_number: "SN-115309",
    mileage: "28,000 كم",
    engine_capacity: "5.3 لتر V8",
    cylinders: "8 سلندر",
    transmission: "أوتوماتيك 10 سرعات",
    fuel_type: "بنزين 95",
  },
  {
    id: "v-1",
    car_make: "تويوتا",
    car_model: "هايلكس",
    car_year: 2023,
    plate_number: "أ ب ج 1234",
    vin: "MR0AX12019D0084790",
    branch_id: "br-riyadh",
    serial_number: "SN-948210",
    mileage: "42,000 كم",
    engine_capacity: "2.7 لتر",
    cylinders: "4 سلندر",
    transmission: "أوتوماتيك",
    fuel_type: "بنزين 91",
  },
  {
    id: "v-2",
    car_make: "تويوتا",
    car_model: "كامري",
    car_year: 2022,
    plate_number: "ك ل م 2245",
    vin: "JTECR2F83HA109482",
    branch_id: "br-riyadh",
    serial_number: "SN-773124",
    mileage: "68,000 كم",
    engine_capacity: "2.5 لتر",
    cylinders: "4 سلندر",
    transmission: "أوتوماتيك",
    fuel_type: "بنزين 91",
  },
  {
    id: "v-3",
    car_make: "هيونداي",
    car_model: "H1",
    car_year: 2021,
    plate_number: "د هـ و 5678",
    vin: "KMHCT4AE8FU123984",
    branch_id: "br-riyadh",
    serial_number: "SN-552019",
    mileage: "115,000 كم",
    engine_capacity: "2.4 لتر",
    cylinders: "4 سلندر",
    transmission: "أوتوماتيك",
    fuel_type: "ديزل",
  },
  {
    id: "v-4",
    car_make: "فورد",
    car_model: "تورس",
    car_year: 2022,
    plate_number: "س م ع 9988",
    vin: "1FA6P8CF0H5182934",
    branch_id: "br-jeddah",
    serial_number: "SN-883491",
    mileage: "54,000 كم",
    engine_capacity: "2.0 لتر EcoBoost",
    cylinders: "4 سلندر",
    transmission: "أوتوماتيك 8 سرعات",
    fuel_type: "بنزين 95",
  },
  {
    id: "v-5",
    car_make: "سوبارو",
    car_model: "كيدا",
    car_year: 2011,
    plate_number: "ا هـ خ 8233",
    vin: "FSADFSDFSDFSDFS89",
    branch_id: "br-riyadh",
    serial_number: "SN-339218",
    mileage: "180,000 كم",
    engine_capacity: "2.0 لتر",
    cylinders: "4 سلندر",
    transmission: "أوتوماتيك",
    fuel_type: "بنزين 91",
  },
];

interface VendorProfile {
  id: string;
  company_name: string;
  full_name: string;
  city: string;
  rating: number;
  specialty: string;
  phone?: string;
}

const PRESET_VENDORS: VendorProfile[] = [
  {
    id: "v-supplier-1",
    company_name: "مؤسسة قطع الغيار المعتمدة",
    full_name: "أحمد العتيبي",
    city: "الرياض",
    rating: 4.9,
    specialty: "متخصص تويوتا وهوندا",
  },
  {
    id: "v-supplier-2",
    company_name: "شركة المحركات الوطنية",
    full_name: "محمد الشمري",
    city: "الرياض",
    rating: 4.8,
    specialty: "متخصص أمريكي وفورد",
  },
  {
    id: "v-supplier-3",
    company_name: "مركز التحدي لقطع السيارات",
    full_name: "خالد الغامدي",
    city: "جدة",
    rating: 4.7,
    specialty: "شامل جميع الماركات",
  },
  {
    id: "v-supplier-4",
    company_name: "مؤسسة الخليج المتقدمة",
    full_name: "سعد الدوسري",
    city: "الدمام",
    rating: 4.9,
    specialty: "قطع أسطول وتجارية",
  },
];

/* ------------------------------------------------------------------ */
/*  Part Gallery Types & Modal Component                              */
/* ------------------------------------------------------------------ */
export interface PartItemState {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  images: string[];
  imagePreview?: string;
  imagePathname?: string;
  isUploading?: boolean;
  notes?: string;
}

interface PartGalleryModalProps {
  part: PartItemState | null;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onUploadImages: (partId: string, files: FileList | File[]) => void;
  onDeleteImage: (partId: string, index: number) => void;
  onSetMainImage: (partId: string, index: number) => void;
}

function PartGalleryModal({
  part,
  initialIndex = 0,
  isOpen,
  onClose,
  onUploadImages,
  onDeleteImage,
  onSetMainImage,
}: PartGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen, part?.id]);

  const images = part?.images || (part?.imagePreview ? [part.imagePreview] : []);

  // Keyboard shortcuts (Esc, Left, Right arrows)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || !part) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 text-white rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  معرض صور: {part.name || "قطعة الغيار"}
                </h3>
                {part.partNumber && (
                  <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                    {part.partNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                <span>إجمالي الصور المرفقة:</span>
                <span className="text-blue-400 font-bold font-mono">
                  {images.length > 0 ? `${currentIndex + 1} من ${images.length}` : "0"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload more button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onUploadImages(part.id, e.target.files);
                  e.target.value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صور</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-[340px] max-h-[58vh] overflow-hidden group select-none">
          {images.length > 0 ? (
            <>
              <img
                src={currentImage}
                alt={`صورة ${currentIndex + 1}`}
                className={`max-w-full max-h-[56vh] object-contain transition-transform duration-300 ${
                  isZoomed ? "scale-125 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />

              {/* Navigation Chevrons */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-105 cursor-pointer z-10"
                    title="الصورة السابقة"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-105 cursor-pointer z-10"
                    title="الصورة التالية"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Floating Image Actions Toolbar */}
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 backdrop-blur-md p-1.5 rounded-2xl shadow-xl z-10">
                {/* Main Image Badge / Action */}
                {currentIndex === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>الصورة الرئيسية (الغلاف)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetMainImage(part.id, currentIndex)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-[10px] font-bold transition-all border border-slate-700 hover:border-amber-500/40 cursor-pointer"
                  >
                    <Star className="w-3 h-3" />
                    <span>تعيين كصورة رئيسية</span>
                  </button>
                )}

                {/* Zoom Toggle */}
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={isZoomed ? "تصغير" : "تكبير"}
                >
                  {isZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Delete Current Image */}
                <button
                  type="button"
                  onClick={() => {
                    onDeleteImage(part.id, currentIndex);
                    if (currentIndex >= images.length - 1 && currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                    }
                  }}
                  className="w-7 h-7 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 flex items-center justify-center transition-colors cursor-pointer"
                  title="حذف هذه الصورة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                <Images className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-black text-slate-300">لا توجد صور مرفقة لهذه القطعة بعد</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                يمكنك رفع عدة صور للقطعة من زوايا مختلفة، أو صورة للرقم التسلسلي والعلامة التجارية لتسهيل التسعير
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>رفع صور الآن</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Filmstrip */}
        {images.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2.5 overflow-x-auto">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative group/strip shrink-0 w-16 h-16 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 ${
                  currentIndex === idx
                    ? "border-blue-500 ring-2 ring-blue-500/30 scale-105 shadow-md"
                    : "border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600"
                }`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                    <Star className="w-2.5 h-2.5 fill-slate-950" />
                  </div>
                )}
                <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[9px] font-mono font-bold px-1 rounded text-white">
                  {idx + 1}
                </span>
              </div>
            ))}

            {/* Quick Upload Tile inside Filmstrip */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-16 h-16 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/60 hover:bg-blue-950/30 text-slate-400 hover:text-blue-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
              title="إضافة المزيد من الصور"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[8px] font-bold">إضافة</span>
            </button>
          </div>
        )}

        {/* Modal Footer Confirmation Bar */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {images.length > 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>تم تجهيز {images.length} صورة للقطعة بنجاح</span>
              </span>
            ) : (
              <span className="text-slate-400">لم يتم إرفاق صور بعد</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-600/30 hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              <span>
                {images.length > 0
                  ? `حفظ واعتماد معرض الصور للقطعة (${images.length} صور) ✓`
                  : "إغلاق المعرض"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Geo Proximity & Google Maps Helper Functions                      */
/* ------------------------------------------------------------------ */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
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

/* ------------------------------------------------------------------ */
/*  Main Component - CLEAN SEPARATE STEPPER & FLAT UI                 */
/* ------------------------------------------------------------------ */
function NewRFQWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit") || null;
  const vendorIdParam = searchParams?.get("vendorId") || searchParams?.get("vendor_id") || null;
  const modeParam = searchParams?.get("mode") || null;
  const sourceParam = searchParams?.get("source") || null;

  const isEditMode = Boolean(editId);
  const [isLoadingEdit, setIsLoadingEdit] = useState<boolean>(false);
  const supabase = createClient();

  // Verified Vendor State from Map/Backend Verification
  const [verifiedMapVendor, setVerifiedMapVendor] = useState<any | null>(null);
  const [isLoadingVerifiedVendor, setIsLoadingVerifiedVendor] = useState<boolean>(false);

  // Wizard Current Step (1 to 4)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Mobile Accordion State
  const [showMobileSummary, setShowMobileSummary] = useState<boolean>(false);

  // Step 1: Location State (Initially unselected -> page is full width until first selection)
  const [branchList, setBranchList] = useState<BranchLocation[]>(COMPANY_BRANCHES);
  const [hasSelectedLocation, setHasSelectedLocation] = useState<boolean>(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("rfq_demo_branches_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBranchList(parsed);
          }
        }
      } catch (e) {}
    }
  }, []);
  const [recipientName, setRecipientName] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [deliveryCity, setDeliveryCity] = useState<string | null>("الرياض");
  const [deliveryDistrict, setDeliveryDistrict] = useState<string | null>(null);
  const [deliveryStreet, setDeliveryStreet] = useState<string | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Step 2: Vehicle State (Initially empty until user selects or fills vehicle in step 2)
  const [hasSelectedVehicle, setHasSelectedVehicle] = useState<boolean>(false);
  const [vehicleSource, setVehicleSource] = useState<"fleet" | "manual">("fleet");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [fleetSearch, setFleetSearch] = useState<string>("");
  const [fleetList, setFleetList] = useState<PresetVehicle[]>(PRESET_FLEET);

  // Dynamically load vehicles from API or repository
  useEffect(() => {
    async function loadClientVehicles() {
      try {
        const res = await fetch("/api/v1/client/vehicles");
        const data = await res.json();
        if (data.success && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          const mapped = data.vehicles.map((v: any) => ({
            id: v.id,
            car_make: v.brand_name || v.car_make,
            car_model: v.model_name || v.car_model,
            car_year: Number(v.year || v.car_year || 2023),
            plate_number: v.plate_number || "",
            vin: v.vin || "",
            branch_id: v.branch_id || "br-riyadh",
            mileage: v.notes || "جاهزة للاستخدام",
          }));
          setFleetList(mapped);
          return;
        }
      } catch (e) {}

      // Fallback to fleetRepository
      try {
        const storageVehicles = fleetRepository.searchVehicles({ organization_id: "org-national-procurement" });
        storageVehicles.then(({ vehicles }) => {
          if (vehicles && vehicles.length > 0) {
            const mapped = vehicles.map((v) => ({
              id: v.id,
              car_make: v.brand_name,
              car_model: v.model_name,
              car_year: v.year,
              plate_number: v.plate_number,
              vin: v.vin,
              branch_id: v.branch_id || "br-riyadh",
              mileage: v.notes || "مركبة معتمدة",
            }));
            setFleetList(mapped);
          }
        });
      } catch (e) {}
    }

    loadClientVehicles();
  }, []);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState<boolean>(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const [branchSearch, setBranchSearch] = useState<string>("");

  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState<boolean>(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState<boolean>(false);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setIsVehicleDropdownOpen(false);
      }
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setIsVendorDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync branchSearch when selectedBranchId changes or loads
  useEffect(() => {
    if (selectedBranchId && !branchSearch && !selectedBranchId.startsWith("custom-")) {
      const b = branchList.find((item) => item.id === selectedBranchId);
      if (b) {
        setBranchSearch(`${b.title} – ${b.city}`);
      }
    }
  }, [selectedBranchId, branchList]);

  // Manual Vehicle form state & Specs
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("2023");
  const [plateNumber, setPlateNumber] = useState("");
  const [vin, setVin] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [mileage, setMileage] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [cylinders, setCylinders] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");

  // Step 3: Order Details State
  const [rfqType, setRfqType] = useState<"public" | "private" | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorSearch, setVendorSearch] = useState<string>("");
  const [vendorList, setVendorList] = useState<VendorProfile[]>(PRESET_VENDORS);

  // Step 3: Spare Parts Category Specialization (Saudi Market)
  const [selectedPartsCategory, setSelectedPartsCategory] = useState<string>("all");
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<CanonicalPartsCategory | null>(null);

  const [partsText, setPartsText] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePathname, setImagePathname] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  // Multi-Parts List State (جدول تفاصيل القطع مع معرض صور متعدد)
  const [partsList, setPartsList] = useState<PartItemState[]>([
    {
      id: "part-1",
      name: "",
      partNumber: "",
      quantity: 1,
      images: [],
      imagePreview: undefined,
      isUploading: false,
      notes: "",
    },
  ]);

  // Active Gallery Modal Target
  const [galleryModalTarget, setGalleryModalTarget] = useState<{
    part: PartItemState;
    activeIndex: number;
  } | null>(null);

  const handleAddPartRow = () => {
    setPartsList((prev) => [
      ...prev,
      {
        id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: "",
        partNumber: "",
        quantity: 1,
        images: [],
        imagePreview: undefined,
        isUploading: false,
        notes: "",
      },
    ]);
  };

  const handleRemovePartRow = (id: string) => {
    if (partsList.length <= 1) return;
    setPartsList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePartRow = (id: string, field: string, value: any) => {
    setPartsList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

    // Smart Category Auto-Detection from Saudi market keywords
    if (field === "name" && typeof value === "string" && value.trim().length >= 2) {
      const detected = matchCategoryFromPartName(value);
      if (detected) {
        setAutoDetectedCategory(detected);
        if (selectedPartsCategory === "all") {
          setSelectedPartsCategory(detected.id);
        }
      }
    }
  };

  // Multi-Image Upload Handler
  const handlePartMultipleImagesUpload = async (id: string, files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    handleUpdatePartRow(id, "isUploading", true);

    const readPromises = fileArray.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve((e.target?.result as string) || "");
        };
        reader.readAsDataURL(file);
      });
    });

    const dataUrls = (await Promise.all(readPromises)).filter(Boolean);

    setPartsList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const currentImages = Array.isArray(p.images) ? p.images : (p.imagePreview ? [p.imagePreview] : []);
          const updatedImages = [...currentImages, ...dataUrls];
          return {
            ...p,
            images: updatedImages,
            imagePreview: updatedImages[0] || p.imagePreview,
            imagePathname: updatedImages[0] || p.imagePathname,
          };
        }
        return p;
      })
    );

    // If modal is open for this part, update its state
    setGalleryModalTarget((curr) => {
      if (curr && curr.part.id === id) {
        const currentImages = Array.isArray(curr.part.images) ? curr.part.images : [];
        const updatedImages = [...currentImages, ...dataUrls];
        return {
          ...curr,
          part: {
            ...curr.part,
            images: updatedImages,
            imagePreview: updatedImages[0],
          },
        };
      }
      return curr;
    });

    // Background upload to cloud storage
    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload-part-image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.pathname || data.url) {
          const cloudUrl = data.pathname || data.url;
          setPartsList((prev) =>
            prev.map((p) => {
              if (p.id === id) {
                const currentImages = p.images || [];
                const updatedImages = currentImages.map((img) => (img.startsWith("data:") ? cloudUrl : img));
                return {
                  ...p,
                  images: updatedImages,
                  imagePathname: p.imagePathname || cloudUrl,
                };
              }
              return p;
            })
          );
        }
      } catch (err) {
        console.log("Background cloud upload fallback:", err);
      }
    }

    setTimeout(() => {
      handleUpdatePartRow(id, "isUploading", false);
    }, 400);
  };

  const handleSetMainImage = (partId: string, imageIndex: number) => {
    setPartsList((prev) =>
      prev.map((p) => {
        if (p.id === partId && p.images && p.images.length > imageIndex) {
          const reordered = [...p.images];
          const [selected] = reordered.splice(imageIndex, 1);
          reordered.unshift(selected);
          return {
            ...p,
            images: reordered,
            imagePreview: reordered[0],
            imagePathname: reordered[0],
          };
        }
        return p;
      })
    );

    setGalleryModalTarget((curr) => {
      if (curr && curr.part.id === partId && curr.part.images) {
        const reordered = [...curr.part.images];
        const [selected] = reordered.splice(imageIndex, 1);
        reordered.unshift(selected);
        return {
          activeIndex: 0,
          part: {
            ...curr.part,
            images: reordered,
            imagePreview: reordered[0],
          },
        };
      }
      return curr;
    });
  };

  const handleDeleteImage = (partId: string, imageIndex: number) => {
    setPartsList((prev) =>
      prev.map((p) => {
        if (p.id === partId && p.images) {
          const updated = p.images.filter((_, idx) => idx !== imageIndex);
          return {
            ...p,
            images: updated,
            imagePreview: updated[0] || undefined,
            imagePathname: updated[0] || undefined,
          };
        }
        return p;
      })
    );

    setGalleryModalTarget((curr) => {
      if (curr && curr.part.id === partId && curr.part.images) {
        const updated = curr.part.images.filter((_, idx) => idx !== imageIndex);
        const newActive = Math.min(curr.activeIndex, Math.max(0, updated.length - 1));
        return {
          activeIndex: newActive,
          part: {
            ...curr.part,
            images: updated,
            imagePreview: updated[0] || undefined,
          },
        };
      }
      return curr;
    });
  };

  // Step 4: Delivery Options State
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [notes, setNotes] = useState<string>("");

  // Multi-Branch Vendor Support (CRITICAL REQUIREMENT 11)
  const [vendorBranches, setVendorBranches] = useState<any[]>([]);
  const [selectedVendorBranchId, setSelectedVendorBranchId] = useState<string>("");
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);
  const [previewBranch, setPreviewBranch] = useState<any | null>(null);

  // Compute client reference coordinates from selected location/branch in Step 1
  const clientReferenceCoord = React.useMemo(() => {
    if (deliveryLat && deliveryLng) {
      return { lat: deliveryLat, lng: deliveryLng, name: locationName || "الموقع المحدد للتسليم" };
    }
    const foundBranch = branchList.find((b) => b.id === selectedBranchId);
    if (foundBranch && foundBranch.lat && foundBranch.lng) {
      return { lat: foundBranch.lat, lng: foundBranch.lng, name: foundBranch.title || foundBranch.address };
    }
    if (deliveryCity === "جدة") {
      return { lat: 21.5433, lng: 39.1728, name: "فرع جدة" };
    }
    if (deliveryCity === "الدمام") {
      return { lat: 26.4207, lng: 50.0888, name: "فرع الدمام" };
    }
    return { lat: 24.7136, lng: 46.6753, name: "فرع الرياض الرئيسي" };
  }, [deliveryLat, deliveryLng, selectedBranchId, branchList, locationName, deliveryCity]);

  // Compute branches with proximity (distance in km and driving minutes)
  const branchesWithProximity = React.useMemo(() => {
    if (!vendorBranches || vendorBranches.length === 0) return [];
    const list = vendorBranches.map((b: any) => {
      const bLat = Number(b.latitude) || 24.7136;
      const bLng = Number(b.longitude) || 46.6753;
      const dist = calculateDistanceKm(
        clientReferenceCoord.lat,
        clientReferenceCoord.lng,
        bLat,
        bLng
      );
      const minutes = Math.max(5, Math.round(dist * 2.2));
      return {
        ...b,
        calcDistance: dist,
        calcMinutes: minutes,
      };
    });

    // Sort by proximity (closest branch first)
    return list.sort((a, b) => a.calcDistance - b.calcDistance);
  }, [vendorBranches, clientReferenceCoord]);

  useEffect(() => {
    // Only load vendor branches if the user selected a private RFQ with a specific vendor
    if (deliveryMethod === "pickup" && rfqType === "private" && selectedVendorId) {
      setIsLoadingBranches(true);
      const url = `/api/v1/vendor/branches?vendor_id=${selectedVendorId}`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
            setVendorBranches(data.branches);
            const sortedByDist = [...data.branches].map((b: any) => {
              const bLat = Number(b.latitude) || 24.7136;
              const bLng = Number(b.longitude) || 46.6753;
              const dist = calculateDistanceKm(clientReferenceCoord.lat, clientReferenceCoord.lng, bLat, bLng);
              return { id: b.id, dist };
            }).sort((a, b) => a.dist - b.dist);

            setSelectedVendorBranchId((prev) => prev || sortedByDist[0]?.id || data.branches[0].id);
          } else {
            setVendorBranches([]);
            setSelectedVendorBranchId("");
          }
        })
        .catch(() => {
          setVendorBranches([]);
          setSelectedVendorBranchId("");
        })
        .finally(() => setIsLoadingBranches(false));
    } else {
      setVendorBranches([]);
      setSelectedVendorBranchId("");
    }
  }, [selectedVendorId, deliveryMethod, rfqType, clientReferenceCoord]);

  // System Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load Real Fleet Vehicles & Real Vendors from Database
  useEffect(() => {
    (async () => {
      try {
        const res = await fleetRepository.searchVehicles({
          organization_id: "org-national-procurement",
        });
        if (res.vehicles && res.vehicles.length > 0) {
          const mapped: PresetVehicle[] = res.vehicles.map((v: VehicleEntity) => ({
            id: v.id,
            car_make: v.brand_name,
            car_model: v.model_name,
            car_year: v.year,
            plate_number: v.plate_number,
            vin: v.vin,
            branch_id: v.branch_id || "br-riyadh",
          }));
          setFleetList(mapped);
        }
      } catch (e) {
        console.log("[v0] Using default preset fleet list", e);
      }

      // Fetch Real Vendors from profiles table
      try {
        const { data: dbVendors } = await supabase
          .from("profiles")
          .select("id, full_name, company_name, phone")
          .eq("role", "vendor");

        if (dbVendors && dbVendors.length > 0) {
          const mappedVendors: VendorProfile[] = dbVendors.map((v: any) => ({
            id: v.id,
            company_name: v.company_name || v.full_name || "مورد معتمد",
            full_name: v.full_name || "",
            city: "الرياض",
            rating: 4.8,
            specialty: "مورد موثوق بالمنصة",
            phone: v.phone || "",
          }));
          setVendorList((prev) => [...mappedVendors, ...prev]);
        }
      } catch (e) {
        console.log("[v0] Using default preset vendor list", e);
      }
    })();
  }, [supabase]);

  // Hydrate Verified Vendor from Server API when coming from Vendors Map / Direct Private link
  useEffect(() => {
    if (vendorIdParam) {
      setIsLoadingVerifiedVendor(true);
      fetch(`/api/v1/vendors/${vendorIdParam}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            const v = json.data;
            setVerifiedMapVendor(v);
            setRfqType("private");
            setSelectedVendorId(v.id);
            setVendorSearch(v.company_name);

            if (modeParam === "pickup" || sourceParam === "VENDOR_MAP") {
              setDeliveryMethod("pickup");
              setLocationName(v.address || `${v.city} – ${v.district || "فرع المورد المعتمد"}`);
              setDeliveryCity(v.city || "الرياض");
              setDeliveryDistrict(v.district || null);
              setDeliveryLat(v.latitude || 24.645);
              setDeliveryLng(v.longitude || 46.735);
              setHasSelectedLocation(true);
            }
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch verified vendor details:", err);
        })
        .finally(() => {
          setIsLoadingVerifiedVendor(false);
        });
    }
  }, [vendorIdParam, modeParam, sourceParam]);

  const DRAFT_STORAGE_KEY = "rfq_new_order_draft_v1";
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  // 1. Hydrate either Edit RFQ Data OR Saved Draft
  useEffect(() => {
    if (editId) {
      setIsLoadingEdit(true);
      async function loadEditData() {
        let rfq: any = null;
        try {
          const res = await fetch(`/api/rfqs/${editId}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.rfq) {
              rfq = json.rfq;
            }
          }
        } catch (err) {
          console.warn("Direct fetch for edit RFQ error:", err);
        }

        if (!rfq) {
          const { data } = await supabase
            .from("rfqs")
            .select("*")
            .eq("id", editId)
            .maybeSingle();
          rfq = data;
        }

        if (rfq) {
          // 1. Location & Branch Selection
          const loc = rfq.delivery_location || "";
          const city = rfq.delivery_city || "جدة";
          const foundBranch = COMPANY_BRANCHES.find(b =>
            (loc && (loc.includes(b.title) || loc.includes(b.city) || loc.includes(b.address))) ||
            (city && (b.city === city || (city === "جدة" && b.id === "br-jeddah") || (city === "الرياض" && b.id === "br-riyadh")))
          ) || COMPANY_BRANCHES.find(b => b.city === "جدة") || COMPANY_BRANCHES[1];

          if (foundBranch) {
            setSelectedBranchId(foundBranch.id);
            setLocationName(`${foundBranch.title} – ${foundBranch.address}`);
            setDeliveryLat(foundBranch.lat);
            setDeliveryLng(foundBranch.lng);
            setDeliveryCity(foundBranch.city);
            setHasSelectedLocation(true);
          } else {
            setSelectedBranchId("custom-gps");
            setLocationName(loc || "فرع جدة – طريق المدينة – حي الروضة");
            setDeliveryCity(city || "جدة");
            setHasSelectedLocation(true);
          }

          // 2. Parse Parts
          let parsed: any[] = [];
          if (typeof rfq.parts_description === "string") {
            try {
              parsed = JSON.parse(rfq.parts_description);
            } catch {
              parsed = [{ partName: rfq.parts_description, quantity: 1 }];
            }
          } else if (Array.isArray(rfq.parts_description)) {
            parsed = rfq.parts_description;
          }

          // 3. Recipient Name & Phone (with fallback to client profiles)
          const rName =
            parsed[0]?.recipientName ||
            rfq.recipient_name ||
            rfq.profiles?.full_name ||
            rfq.client?.full_name ||
            "م. أحمد الغامدي (مسؤول الفرع)";
          const rPhone =
            parsed[0]?.recipientPhone ||
            rfq.recipient_phone ||
            rfq.profiles?.phone ||
            rfq.client?.phone ||
            "0559876543";

          setRecipientName(rName);
          setRecipientPhone(rPhone);

          // 4. Vehicle Selection
          const carMk = rfq.car_make || "جي إم سي";
          const carMd = rfq.car_model || "هايلوكس";
          const carYr = String(rfq.car_year || "2023");
          const carPl = rfq.plate_number || "ت ل ف 336";
          const carVin = rfq.vin || "1GCEC19X4DZ115309";

          const matchedVehicle = PRESET_FLEET.find(v =>
            (v.plate_number && v.plate_number === carPl) ||
            (v.vin && v.vin === carVin) ||
            (v.car_make === carMk && v.car_model === carMd)
          );

          if (matchedVehicle) {
            setVehicleSource("fleet");
            setSelectedVehicleId(matchedVehicle.id);
            setCarMake(matchedVehicle.car_make);
            setCarModel(matchedVehicle.car_model);
            setCarYear(String(matchedVehicle.car_year));
            setPlateNumber(matchedVehicle.plate_number);
            setVin(matchedVehicle.vin);
            setSerialNumber(matchedVehicle.serial_number || "SN-115309");
            setMileage(matchedVehicle.mileage || "28,000 كم");
            setEngineCapacity(matchedVehicle.engine_capacity || "5.3 لتر V8");
            setCylinders(matchedVehicle.cylinders || "8 سلندر");
            setTransmission(matchedVehicle.transmission || "أوتوماتيك 10 سرعات");
            setFuelType(matchedVehicle.fuel_type || "بنزين 95");
            setHasSelectedVehicle(true);
          } else {
            setVehicleSource("manual");
            setSelectedVehicleId("");
            setCarMake(carMk);
            setCarModel(carMd);
            setCarYear(carYr);
            setPlateNumber(carPl);
            setVin(carVin);
            setSerialNumber(rfq.serial_number || "SN-115309");
            setMileage(rfq.mileage || "28,000 كم");
            setEngineCapacity(rfq.engine_capacity || "5.3 لتر V8");
            setCylinders(rfq.cylinders || "8 سلندر");
            setTransmission(rfq.transmission || "أوتوماتيك");
            setFuelType(rfq.fuel_type || "بنزين 95");
            setHasSelectedVehicle(true);
          }

          // 5. Parts list setup
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mappedParts: PartItemState[] = parsed.map((p, idx) => {
              const imgArr = Array.isArray(p.images) && p.images.length > 0
                ? p.images
                : p.imagePathname || p.imagePreview || p.imageUrl || p.image_url
                ? [p.imagePathname || p.imagePreview || p.imageUrl || p.image_url]
                : [];
              return {
                id: `part-${idx + 1}-${Date.now()}`,
                name: p.partName || p.name || `قطعة غيار #${idx + 1}`,
                partNumber: p.partNumber || p.part_number || "",
                quantity: parseInt(p.quantity) || 1,
                images: imgArr,
                imagePreview: imgArr[0] || undefined,
                imagePathname: imgArr[0] || undefined,
                isUploading: false,
                notes: p.notes || "",
              };
            });
            setPartsList(mappedParts);

            if (parsed[0]?.isUrgent !== undefined) setIsUrgent(Boolean(parsed[0].isUrgent));
            if (parsed[0]?.deliveryMethod) setDeliveryMethod(parsed[0].deliveryMethod);
            if (parsed[0]?.rfqType) setRfqType(parsed[0].rfqType);
          }

          if (rfq.notes) setNotes(rfq.notes);
          if (rfq.isUrgent !== undefined) setIsUrgent(Boolean(rfq.isUrgent));
          if (rfq.rfq_type) setRfqType(rfq.rfq_type);
        }
        setIsLoadingEdit(false);
        setIsDraftHydrated(true);
      }
      loadEditData();
      return;
    }

    // Otherwise, hydrate saved draft from localStorage
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
          if (parsed.recipientName !== undefined) setRecipientName(parsed.recipientName);
          if (parsed.recipientPhone !== undefined) setRecipientPhone(parsed.recipientPhone);
          if (parsed.selectedBranchId !== undefined) setSelectedBranchId(parsed.selectedBranchId);
          if (parsed.locationName !== undefined) setLocationName(parsed.locationName);
          if (parsed.deliveryLat !== undefined) setDeliveryLat(parsed.deliveryLat);
          if (parsed.deliveryLng !== undefined) setDeliveryLng(parsed.deliveryLng);
          if (parsed.deliveryCity !== undefined) setDeliveryCity(parsed.deliveryCity);
          if (parsed.deliveryDistrict !== undefined) setDeliveryDistrict(parsed.deliveryDistrict);
          if (parsed.deliveryStreet !== undefined) setDeliveryStreet(parsed.deliveryStreet);
          if (parsed.hasSelectedLocation !== undefined) setHasSelectedLocation(parsed.hasSelectedLocation);

          if (parsed.vehicleSource !== undefined) setVehicleSource(parsed.vehicleSource);
          if (parsed.selectedVehicleId !== undefined) setSelectedVehicleId(parsed.selectedVehicleId);
          if (parsed.carMake !== undefined) setCarMake(parsed.carMake);
          if (parsed.carModel !== undefined) setCarModel(parsed.carModel);
          if (parsed.carYear !== undefined) setCarYear(parsed.carYear);
          if (parsed.plateNumber !== undefined) setPlateNumber(parsed.plateNumber);
          if (parsed.vin !== undefined) setVin(parsed.vin);
          if (parsed.serialNumber !== undefined) setSerialNumber(parsed.serialNumber);
          if (parsed.mileage !== undefined) setMileage(parsed.mileage);
          if (parsed.engineCapacity !== undefined) setEngineCapacity(parsed.engineCapacity);
          if (parsed.cylinders !== undefined) setCylinders(parsed.cylinders);
          if (parsed.transmission !== undefined) setTransmission(parsed.transmission);
          if (parsed.fuelType !== undefined) setFuelType(parsed.fuelType);
          if (parsed.hasSelectedVehicle !== undefined) setHasSelectedVehicle(parsed.hasSelectedVehicle);

          if (parsed.rfqType !== undefined) setRfqType(parsed.rfqType);
          if (parsed.selectedVendorId !== undefined) setSelectedVendorId(parsed.selectedVendorId);
          if (Array.isArray(parsed.partsList) && parsed.partsList.length > 0) setPartsList(parsed.partsList);
          if (parsed.partsText !== undefined) setPartsText(parsed.partsText);
          if (parsed.isUrgent !== undefined) setIsUrgent(parsed.isUrgent);

          if (parsed.deliveryMethod !== undefined) setDeliveryMethod(parsed.deliveryMethod);
          if (parsed.notes !== undefined) setNotes(parsed.notes);
        }
      }
    } catch (e) {
      console.warn("Could not load RFQ draft from localStorage", e);
    } finally {
      setIsDraftHydrated(true);
    }
  }, [editId, supabase]);

  // 2. Auto-save current progress & inputs to localStorage on every change (ONLY in new RFQ mode)
  useEffect(() => {
    if (!isDraftHydrated || isEditMode) return;
    try {
      if (typeof window !== "undefined") {
        const draft = {
          currentStep,
          recipientName,
          recipientPhone,
          selectedBranchId,
          locationName,
          deliveryLat,
          deliveryLng,
          deliveryCity,
          deliveryDistrict,
          deliveryStreet,
          hasSelectedLocation,

          vehicleSource,
          selectedVehicleId,
          carMake,
          carModel,
          carYear,
          plateNumber,
          vin,
          serialNumber,
          mileage,
          engineCapacity,
          cylinders,
          transmission,
          fuelType,
          hasSelectedVehicle,

          rfqType,
          selectedVendorId,
          partsList,
          partsText,
          isUrgent,

          deliveryMethod,
          notes,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }
    } catch (e) {
      console.warn("Could not save RFQ draft to localStorage", e);
    }
  }, [
    isDraftHydrated,
    currentStep,
    recipientName,
    recipientPhone,
    selectedBranchId,
    locationName,
    deliveryLat,
    deliveryLng,
    deliveryCity,
    deliveryDistrict,
    deliveryStreet,
    hasSelectedLocation,
    vehicleSource,
    selectedVehicleId,
    carMake,
    carModel,
    carYear,
    plateNumber,
    vin,
    serialNumber,
    mileage,
    engineCapacity,
    cylinders,
    transmission,
    fuelType,
    hasSelectedVehicle,
    rfqType,
    selectedVendorId,
    partsList,
    partsText,
    isUrgent,
    deliveryMethod,
    notes,
  ]);

  // Handle GPS location detection with robust fallback & reverse geocoding
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);

    const applyLocation = (lat: number, lng: number, address: string) => {
      setDeliveryLat(lat);
      setDeliveryLng(lng);
      setSelectedBranchId("custom-gps");
      setLocationName(address);
      setDeliveryCity("الرياض");
      setHasSelectedLocation(true);
      setIsGettingLocation(false);
      setBranchSearch("");
    };

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let humanAddress = `موقعي الحالي (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`,
              { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                const parts = data.display_name.split(",");
                const shortAddr = parts.slice(0, 3).join(" – ");
                humanAddress = `موقعي الحالي (${shortAddr})`;
              }
            }
          } catch (e) {
            // Reverse geocode fallback
          }

          applyLocation(latitude, longitude, humanAddress);
        },
        (err) => {
          console.warn("[v0] GPS Geolocation failed/denied, applying smart GPS position:", err);
          applyLocation(24.7136, 46.6753, "موقعي الحالي – الرياض (حي العليا)");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      applyLocation(24.7136, 46.6753, "موقعي الحالي – الرياض (حي العليا)");
    }
  };

  // Branch Selection Handler
  const handleSelectBranch = (b: BranchLocation) => {
    setSelectedBranchId(b.id);
    setLocationName(`${b.title} – ${b.address}`);
    setDeliveryLat(b.lat);
    setDeliveryLng(b.lng);
    setDeliveryCity(b.city);
    setHasSelectedLocation(true);
    setBranchSearch(`${b.title} – ${b.city}`);
    setIsBranchDropdownOpen(false);
  };

  // Vehicle Selection Handler
  const handleSelectVehicleCard = (v: PresetVehicle) => {
    setVehicleSource("fleet");
    setSelectedVehicleId(v.id);
    setCarMake(v.car_make);
    setCarModel(v.car_model);
    setCarYear(String(v.car_year));
    setPlateNumber(v.plate_number);
    setVin(v.vin);
    setSerialNumber(v.serial_number || `SN-${v.id.replace("v-", "100")}`);
    setMileage(v.mileage || "50,000 كم");
    setEngineCapacity(v.engine_capacity || "2.5 لتر");
    setCylinders(v.cylinders || "4 سلندر");
    setTransmission(v.transmission || "أوتوماتيك");
    setFuelType(v.fuel_type || "بنزين 91");
    setHasSelectedVehicle(true);
  };

  // Image Upload Handler
  const handleImageUpload = async (file: File) => {
    setImageFile(file);
    setIsUploadingImage(true);

    // 1. Instant FileReader Base64 conversion for 100% reliable image display
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setImagePreview(dataUrl);
        setImagePathname(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // 2. Optional server blob upload
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-part-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.pathname) {
        setImagePathname(data.pathname);
      }
    } catch (e) {
      console.log("Image upload background fallback used Data URL", e);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Active Selected Vendor (Supports verified server-fetched vendor or preset list)
  const selectedVendor =
    (verifiedMapVendor && verifiedMapVendor.id === selectedVendorId)
      ? verifiedMapVendor
      : (vendorList.find((v) => v.id === selectedVendorId) || vendorList[0]);

  // Final Form Submission to Database via Server API
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const validParts = partsList.filter((p) =>
      Boolean(p.name?.trim()) ||
      Boolean(p.partNumber?.trim()) ||
      Boolean(p.images && p.images.length > 0) ||
      Boolean(p.imagePreview) ||
      Boolean(p.imagePathname)
    );

    const partsSummaryText = validParts.length > 0
      ? validParts
          .map((p, i) => `${p.name?.trim() || `قطعة غيار #${i + 1}`} (الكمية: ${p.quantity || 1})${p.partNumber ? ` [كود: ${p.partNumber}]` : ""}`)
          .join(" ، ")
      : partsText.trim();

    if (!partsSummaryText && !imagePreview && !partsList.some(p => (p.images && p.images.length > 0) || p.imagePreview)) {
      setError("يرجى إدخال اسم قطعة واحدة على الأقل في جدول تفاصيل الطلب أو إرفاق صورة لها");
      setIsSubmitting(false);
      setCurrentStep(3);
      return;
    }

    if (rfqType === "private" && !selectedVendorId) {
      setError("يرجى اختيار المورد المحدد للطلب الخاص");
      setIsSubmitting(false);
      setCurrentStep(3);
      return;
    }

    try {
      // Auto-save manually entered vehicle to Fleet Garage (/client/garage)
      if (vehicleSource === "manual" && carMake && carModel) {
        try {
          await fleetRepository.createVehicle({
            organization_id: "org-national-procurement",
            branch_id: selectedBranchId || "br-riyadh-main",
            brand_id: `b-${carMake || "custom"}`,
            brand_name: carMake,
            model_id: `m-${carModel || "custom"}`,
            model_name: carModel,
            year: parseInt(carYear) || 2023,
            vin: vin || `VIN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            plate_number: plateNumber || "أ ب ج 1234",
            user_id: "demo-user-id",
          });
        } catch (e) {}
      }

      const formattedParts = validParts.length > 0
        ? validParts.map((p, i) => {
            const imgArr = Array.isArray(p.images) && p.images.length > 0
              ? p.images
              : p.imagePreview || p.imagePathname
              ? [p.imagePreview || p.imagePathname]
              : [];
            return {
              ...p,
              category: selectedPartsCategory || "all",
              name: p.name?.trim() || `قطعة غيار #${i + 1}`,
              partName: p.name?.trim() || `قطعة غيار #${i + 1}`,
              quantity: Number(p.quantity) || 1,
              images: imgArr,
              imagePreview: imgArr[0] || null,
              imagePathname: imgArr[0] || null,
            };
          })
        : [{ name: partsText || "قطع غيار ورش", quantity: 1, category: selectedPartsCategory || "all", imagePreview, images: imagePreview ? [imagePreview] : [] }];

      const payload = {
        carMake: carMake || "تويوتا",
        carModel: carModel || "كامري",
        carYear: carYear || "2023",
        plateNumber: plateNumber,
        vin: vin,
        partsCategory: selectedPartsCategory || "all",
        partsCategoryName: selectedPartsCategory === "all" ? "عام (كافة التخصصات)" : (getPartsCategoryById(selectedPartsCategory)?.nameAr || "عام"),
        partsText: partsSummaryText || "قطع غيار سيارات",
        partsList: formattedParts,
        imagePathname: imagePathname || imagePreview,
        imagePreview: imagePreview,
        isUrgent: isUrgent,
        rfqType: rfqType === "private" ? "private" : "public",
        selectedVendorId: rfqType === "private" ? (selectedVendorId || null) : null,
        selectedVendorName: rfqType === "private" ? (selectedVendor?.company_name || verifiedMapVendor?.company_name || null) : null,
        selectedVendorBranchId: (rfqType === "private" && deliveryMethod === "pickup") ? (selectedVendorBranchId || null) : null,
        selectedVendorBranchName: (rfqType === "private" && deliveryMethod === "pickup") ? (vendorBranches.find((b: any) => b.id === selectedVendorBranchId)?.name || null) : null,
        targetVendorId: rfqType === "private" ? (selectedVendorId || null) : null,
        locationName: locationName || "فرع الرياض",
        deliveryCity: deliveryCity || "الرياض",
        deliveryDistrict: deliveryDistrict || null,
        recipientName: recipientName,
        recipientPhone: recipientPhone,
        deliveryMethod: deliveryMethod,
        fulfillmentMethod: deliveryMethod === "pickup" ? "SELF_PICKUP" : "DELIVERY",
        source: sourceParam === "VENDOR_MAP" ? "VENDOR_MAP" : "DIRECT",
        notes: notes,
      };

      if (editId) {
        const res = await fetch(`/api/rfqs/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || data.error || "حدث خطأ أثناء حفظ وتعديل الطلب في السيرفر");
          setIsSubmitting(false);
          return;
        }

        // Sync to browser localStorage
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("rfq_demo_rfqs");
            const currentList = raw ? JSON.parse(raw) : [];
            const updatedList = (Array.isArray(currentList) ? currentList : []).map((it: any) =>
              it.id === editId ? { ...it, ...payload, ...data.rfq } : it
            );
            localStorage.setItem("rfq_demo_rfqs", JSON.stringify(updatedList));
            window.dispatchEvent(new Event("rfq_data_changed"));
            window.dispatchEvent(new Event("storage"));
          } catch (e) {}
        }

        window.location.href = "/client/orders";
        return;
      }

      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "حدث خطأ أثناء حفظ الطلب في السيرفر");
        setIsSubmitting(false);
        return;
      }

      // Sync to browser localStorage for immediate real-time availability across vendor/client views
      if (typeof window !== "undefined" && data.rfq) {
        try {
          const raw = localStorage.getItem("rfq_demo_rfqs");
          const currentList = raw ? JSON.parse(raw) : [];
          const updatedList = [data.rfq, ...(Array.isArray(currentList) ? currentList : [])];
          localStorage.setItem("rfq_demo_rfqs", JSON.stringify(updatedList));
          window.dispatchEvent(new Event("rfq_data_changed"));
          window.dispatchEvent(new Event("storage"));
        } catch (e) {}
      }

      // Clear draft on successful submission
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (e) {}

      // Success! Perform navigation to orders
      window.location.href = "/client/orders";
    } catch (e: any) {
      setError("تعذر الاتصال بالسيرفر، يرجى المحاولة لاحقاً");
      setIsSubmitting(false);
    }
  };

  // Filter Branches for Step 1
  const filteredBranches = branchList.filter((b) => {
    const q = branchSearch.toLowerCase();
    return (
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  });

  const selectedBranch = branchList.find((b) => b.id === selectedBranchId);

  // Filter Vehicles for Step 2
  const filteredFleet = fleetList.filter((v) => {
    const q = fleetSearch.toLowerCase();
    const matchSearch =
      !q ||
      `${v.car_make} ${v.car_model}`.toLowerCase().includes(q) ||
      v.plate_number.toLowerCase().includes(q) ||
      v.vin.toLowerCase().includes(q);
    return matchSearch;
  });

  // Filter Vendors for Step 3
  const filteredVendors = vendorList.filter((v) => {
    const q = vendorSearch.toLowerCase();
    return (
      !q ||
      v.company_name.toLowerCase().includes(q) ||
      v.full_name.toLowerCase().includes(q) ||
      v.specialty.toLowerCase().includes(q) ||
      v.city.toLowerCase().includes(q)
    );
  });

  // Steps Configuration
  const stepsConfig = [
    {
      num: 1,
      title: "تحديد الموقع",
      sub: "فرع الشركة أو موقع التسليم",
      icon: MapPin,
    },
    {
      num: 2,
      title: "اختيار المركبة",
      sub: "سيارات الأسطول أو إضافة مركبة",
      icon: Car,
    },
    {
      num: 3,
      title: "تفاصيل الطلب",
      sub: "وصف القطع والمورد المستهدف",
      icon: Package,
    },
    {
      num: 4,
      title: "طريقة الاستلام",
      sub: "خيارات التوصيل والمراجعة",
      icon: Truck,
    },
  ];

  const showSummary = currentStep === 4;

  return (
    <div className="min-h-screen bg-slate-100/70 p-3 sm:p-4 md:p-6 lg:p-8 font-sans text-slate-900" dir="rtl">
      {/* Location Picker Dialog */}
      <LocationPickerDialog
        open={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onLocationSelect={(loc) => {
          setDeliveryLat(loc.latitude);
          setDeliveryLng(loc.longitude);
          setSelectedBranchId("custom-map");
          setLocationName(loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
          if (loc.city) setDeliveryCity(loc.city);
          if (loc.district) setDeliveryDistrict(loc.district);
          if (loc.street) setDeliveryStreet(loc.street);
          setHasSelectedLocation(true);
          setBranchSearch("");
          setIsLocationPickerOpen(false);
        }}
      />

      {/* 1. SIMPLE & CLEAN TOP HEADER LINE (NO BIG CONTAINER BOX) */}
      <div className="w-full mb-4 flex items-center justify-between">
        <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
          {isEditMode ? (
            <>
              <span className="flex items-center gap-2">
                <span>تعديل طلب عرض السعر</span>
                <span className="text-emerald-700 bg-emerald-100 font-mono text-xs px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  #{editId}
                </span>
              </span>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-3 py-0.5 rounded-full flex items-center gap-1">
                <span>وضع التعديل ✏️</span>
              </span>
            </>
          ) : (
            <>
              <span>إنشاء طلب عرض سعر جديد (RFQ)</span>
              <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-3 py-0.5 rounded-full">
                الخطوة {currentStep} من 4
              </span>
            </>
          )}
        </h1>

        <button
          onClick={() => {
            try {
              if (typeof window !== "undefined" && !isEditMode) {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
              }
            } catch (e) {}
            router.push("/client/orders");
          }}
          className="text-xs font-extrabold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>إلغاء وعودة</span>
          <span>←</span>
        </button>
      </div>

      {/* 2. DEDICATED SEPARATE STEPPER CARD AT THE TOP - CIRCULAR BADGES WITH TEXT BELOW */}
      <div className="w-full mb-6 bg-white rounded-3xl p-6 sm:p-7 overflow-hidden">
        {/* Desktop Circular Stepper */}
        <div className="hidden lg:flex items-center justify-between relative px-8">
          {/* Horizontal Connecting Timeline Track Line */}
          <div className="absolute top-7 right-20 left-20 h-1 bg-slate-100 rounded-full z-0 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: currentStep === 1 ? "0%" : currentStep === 2 ? "33.33%" : currentStep === 3 ? "66.66%" : "100%",
              }}
            />
          </div>

          {stepsConfig.map((s) => {
            const isCompleted = currentStep > s.num || isEditMode;
            const isActive = currentStep === s.num;
            const StepIcon = s.icon;
            return (
              <div
                key={s.num}
                onClick={() => (s.num < currentStep || isEditMode) && setCurrentStep(s.num)}
                className={`flex flex-col items-center text-center relative z-10 transition-all ${
                  s.num < currentStep || isEditMode ? "cursor-pointer hover:opacity-90" : ""
                }`}
              >
                {/* Circular Step Badge with Pulsing Aura */}
                <div className="relative flex items-center justify-center">
                  {isActive && (
                    <span className="absolute -inset-2 rounded-full bg-blue-500/30 animate-pulse z-0" />
                  )}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-extrabold relative z-10 transition-all duration-300 ${
                      isCompleted && !isActive
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="w-6 h-6" strokeWidth={3} />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>
                </div>

                {/* Text Centered Below Circle */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-[10px] font-mono font-bold ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                      0{s.num}
                    </span>
                    {isCompleted && !isActive && (
                      <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                        مكتمل ✓
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-black transition-colors ${
                    isActive ? "text-blue-600" : isCompleted ? "text-slate-900" : "text-slate-600"
                  }`}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
                    {s.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Circular Stepper Header */}
        <div className="lg:hidden space-y-3">
          <div className="flex items-center justify-between px-2">
            {stepsConfig.map((s) => {
              const isCompleted = currentStep > s.num || isEditMode;
              const isActive = currentStep === s.num;
              const StepIcon = s.icon;
              return (
                <div
                  key={s.num}
                  onClick={() => (s.num < currentStep || isEditMode) && setCurrentStep(s.num)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer text-center"
                >
                  <div className="relative flex items-center justify-center">
                    {isActive && (
                      <span className="absolute -inset-1.5 rounded-full bg-blue-500/30 animate-pulse z-0" />
                    )}
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isActive
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : <StepIcon className="w-4 h-4" />}
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold ${isActive ? "text-blue-600" : "text-slate-500"}`}>
                    {s.title.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ════════════ DYNAMIC GRID CONTAINER (FORM + FLOATING SUMMARY) ════════════ */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-500">
        
        {/* ────────────────── 1. MAIN STEP FORM CARD (FLAT DESIGN) ────────────────── */}
        <div className={`bg-white rounded-3xl overflow-visible shadow-sm border border-slate-200/60 flex flex-col transition-all duration-500 ${
          showSummary ? "lg:col-span-8" : "lg:col-span-12"
        }`}>

          {/* MOBILE EXPANDABLE SUMMARY (IF LOCATION SELECTED) */}
          {showSummary && (
            <div className="lg:hidden bg-[#0B1528] text-white px-4 py-3">
              <button
                type="button"
                onClick={() => setShowMobileSummary(!showMobileSummary)}
                className="w-full flex items-center justify-between text-xs font-bold"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    ملخص الطلب: <span className="font-semibold text-slate-300">{locationName.split("–")[0] || "الموقع"} • {carMake || "المركبة"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0 mr-2 font-extrabold">
                  <span>{showMobileSummary ? "إخفاء" : "عرض الملخص"}</span>
                  {showMobileSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showMobileSummary && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-2.5 rounded-xl">
                      <span className="text-[10px] text-cyan-400 block font-bold">الموقع</span>
                      <span className="font-bold text-white truncate block">{locationName || "غير محدد"}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl">
                      <span className="text-[10px] text-indigo-400 block font-bold">المركبة</span>
                      <span className="font-bold text-white truncate block">{carMake ? `${carMake} ${carModel}` : "لم تحدد بعد"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-2.5 rounded-xl">
                      <span className="text-[10px] text-purple-400 block font-bold">نوع الطلب</span>
                      <span className="font-bold text-white truncate block">
                        {currentStep >= 3 ? (rfqType === "private" ? `خاص (${selectedVendor.company_name})` : "عام (كل الموردين)") : "لم يحدد بعد"}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl">
                      <span className="text-[10px] text-emerald-400 block font-bold">الاستلام</span>
                      <span className="font-bold text-white truncate block">{currentStep >= 4 ? (deliveryMethod === "delivery" ? "توصيل" : "استلام من الفرع") : "لم يحدد بعد"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAIN CONTENT FORM IN PADDED CONTAINER */}
          <div className="p-5 sm:p-7 md:p-8 flex flex-col justify-between space-y-7">
            
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* ════════ STEP 1: RECIPIENT & LOCATION ════════ */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* 1. Recipient Information Card (بيانات المستلم والتواصل) */}
                <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <User className="w-4.5 h-4.5 text-blue-600" />
                      <span>بيانات المستلم:</span>
                    </label>
                    <span className="text-[10px] font-bold text-slate-500">
                      بيانات مسؤول الاستلام للتنسيق المباشر عند استلام القطع
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Recipient Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>اسم المستلم *</span>
                        </label>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded">إلزامي *</span>
                      </div>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => {
                          setRecipientName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="مثال: م. أحمد الغامدي أو مسؤول الفرع"
                        className={`w-full h-10 px-3.5 rounded-xl border bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          !recipientName.trim() && error
                            ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                      />
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>رقم للتواصل *</span>
                        </label>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded">إلزامي *</span>
                      </div>
                      <input
                        type="tel"
                        dir="ltr"
                        value={recipientPhone}
                        onChange={(e) => {
                          setRecipientPhone(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="05XXXXXXXX"
                        className={`w-full h-10 px-3.5 rounded-xl border bg-white text-xs font-bold font-mono text-slate-900 text-left placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          !recipientPhone.trim() && error
                            ? "border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200/80 my-2" />

                {/* 2. Location Selection Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <span>تحديد موقع التسليم أو الفرع</span>
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                        حقل إلزامي *
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      اختر الفرع المسجل المسئول عن الطلب، أو حدد موقعك الجغرافي الخارجي
                    </p>
                  </div>

                  {hasSelectedLocation && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>تم اعتـماد الموقع</span>
                    </div>
                  )}
                </div>

                {/* Filter Badge Header matching Step 2 */}
                <div className="flex items-center justify-between bg-gradient-to-r from-[#0F1C36] via-[#162749] to-[#0F1C36] text-white rounded-2xl p-4 border border-slate-800 shadow-md">
                  <span className="text-xs font-black text-white flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">فروع الشركة المسجلة (ابحث أو اختر من القائمة المنسدلة) *</span>
                  </span>
                  <span className="text-[10px] font-extrabold text-blue-300 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full shrink-0">
                    حقل إلزامي *
                  </span>
                </div>

                {/* Search Input with Auto-Dropdown List (matching Step 2 vehicle selector) */}
                <div ref={branchDropdownRef} className="relative space-y-2">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>البحث واختيار الفرع من فروع الشركة المسجلة:</span>
                  </label>

                  <div className="relative">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="اضغط للبحث أو اختر اسم الفرع، المدينة، أو العنوان..."
                      value={branchSearch}
                      onFocus={() => setIsBranchDropdownOpen(true)}
                      onClick={() => setIsBranchDropdownOpen(true)}
                      onChange={(e) => {
                        setBranchSearch(e.target.value);
                        setIsBranchDropdownOpen(true);
                      }}
                      className="w-full h-12 pr-10 pl-10 bg-white border border-slate-200/90 shadow-2xs rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />

                    {branchSearch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBranchSearch("");
                          setIsBranchDropdownOpen(true);
                        }}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronDown
                        onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer"
                      />
                    )}
                  </div>

                  {/* ── Dropdown List when Clicked/Focused (Inline Expandable to prevent any clipping) ── */}
                  {isBranchDropdownOpen && (
                    <div className="mt-2 w-full bg-white rounded-2xl border-2 border-blue-500/90 shadow-xl overflow-hidden transition-all duration-200 dir-rtl flex flex-col z-20">
                      <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between text-xs font-black text-blue-950">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>فروع الشركة المسجلة المتاحة ({filteredBranches.length})</span>
                        </span>
                        <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded-full border border-blue-200">
                          انقر لاختيار الفرع
                        </span>
                      </div>

                      <div className="overflow-y-auto max-h-72 divide-y divide-slate-100 p-2 space-y-1">
                        {filteredBranches.length > 0 ? (
                          filteredBranches.map((b) => {
                            const isSelected = selectedBranchId === b.id;
                            return (
                              <div
                                key={b.id}
                                onClick={() => {
                                  handleSelectBranch(b);
                                  setBranchSearch(`${b.title} – ${b.city}`);
                                  setIsBranchDropdownOpen(false);
                                  if (error) setError(null);
                                }}
                                className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? "bg-blue-50/90 text-blue-950 font-bold border-2 border-blue-500 shadow-2xs"
                                    : "hover:bg-slate-50 text-slate-800 border border-transparent hover:border-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "bg-slate-100 text-blue-700 border border-slate-200/80"
                                    }`}
                                  >
                                    <Building2 className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                        {b.title}
                                      </span>
                                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md">
                                        {b.city}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 truncate">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{b.address}</span>
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected ? "bg-blue-600 text-white shadow-xs" : "border-2 border-slate-300 bg-slate-50"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-5 text-center text-xs text-slate-500 font-medium">
                            لا يوجد فرع مطابق لبحثك "{branchSearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Detailed Selected Branch Information (matching Step 2 vehicle card) ── */}
                {hasSelectedLocation && selectedBranch && !selectedBranchId.startsWith("custom-") && (
                  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                    {/* Header with Title and Action Icons/Buttons */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Building2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-slate-900">
                            معلومات الفرع المعتمد للتسليم
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {selectedBranch.title} • {selectedBranch.city}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBranchDropdownOpen(true);
                            setBranchSearch("");
                          }}
                          title="تعديل / تغيير الفرع"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-black rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBranchId("");
                            setLocationName("");
                            setDeliveryLat(null);
                            setDeliveryLng(null);
                            setHasSelectedLocation(false);
                            setBranchSearch("");
                            setIsBranchDropdownOpen(true);
                          }}
                          title="إلغاء التحديد"
                          className="p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Branch Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">اسم الفرع المعتمد</span>
                        <span className="text-xs font-black text-slate-900">{selectedBranch.title}</span>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">المدينة / المنطقة</span>
                        <span className="text-xs font-black text-slate-900">{selectedBranch.city}</span>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">العنوان المعتمد للتسليم</span>
                        <span className="text-xs font-black text-slate-900 truncate block">{selectedBranch.address}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Separator Divider Line */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-400 bg-slate-100/70 px-3.5 py-1 rounded-full">
                    أو تحديد موقع مخصص خارجي
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Option 2: Custom Map / GPS Selection Box */}
                <div
                  className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 ${
                    selectedBranchId === "custom-map" || selectedBranchId === "custom-gps"
                      ? "bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20"
                      : "bg-slate-50/70 border-slate-200/80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">تحديد موقع مخصص بواسطة الخريطة أو GPS</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {selectedBranchId === "custom-map" || selectedBranchId === "custom-gps"
                            ? locationName
                            : "حدد موقعك الحالي تلقائياً أو ابحث عن عنوان مخصص على الخريطة"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className="flex-1 sm:flex-initial h-10 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                      >
                        {isGettingLocation ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <Navigation className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>موقعي الحالي (GPS)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsLocationPickerOpen(true)}
                        className="flex-1 sm:flex-initial h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span>البحث بالخريطة</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════ STEP 2: VEHICLE ════════ */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">اختيار المركبة المطلوبة</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    حدد السيارة المراد طلب قطع الغيار لها من أسطولك المسجل أو أضف بيانات سيارة جديدة
                  </p>
                </div>

                {/* Filter Badge Header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-[#0F1C36] via-[#162749] to-[#0F1C36] text-white rounded-2xl p-4 border border-slate-800 shadow-md">
                  <span className="text-xs font-black text-white flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">مركبات {locationName.split("–")[0] || "الفرع"} (ابحث أو اختر من القائمة المنسدلة) *</span>
                  </span>
                  <span className="text-[10px] font-extrabold text-blue-300 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full shrink-0">
                    حقل إلزامي *
                  </span>
                </div>

                {/* Search Input with Auto-Dropdown List */}
                <div ref={vehicleDropdownRef} className="relative space-y-2">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-600" />
                    <span>البحث واختيار السيارة من الأسطول:</span>
                  </label>

                  <div className="relative">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="اضغط للبحث أو اختر برقم اللوحة، طراز السيارة، أو VIN..."
                      value={fleetSearch}
                      onFocus={() => setIsVehicleDropdownOpen(true)}
                      onClick={() => setIsVehicleDropdownOpen(true)}
                      onChange={(e) => {
                        setFleetSearch(e.target.value);
                        setIsVehicleDropdownOpen(true);
                      }}
                      className="w-full h-12 pr-10 pl-10 bg-white border border-slate-200/90 shadow-2xs rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />

                    {fleetSearch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFleetSearch("");
                          setIsVehicleDropdownOpen(true);
                        }}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronDown
                        onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer"
                      />
                    )}
                  </div>

                  {/* ── Dropdown List when Clicked/Focused (Inline Expandable to prevent any clipping) ── */}
                  {isVehicleDropdownOpen && (
                    <div className="mt-2 w-full bg-white rounded-2xl border-2 border-blue-500/90 shadow-xl overflow-hidden transition-all duration-200 dir-rtl flex flex-col">
                      <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between text-xs font-black text-blue-950">
                        <span className="flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-blue-600" />
                          <span>سيارات الأسطول المتاحة ({filteredFleet.length})</span>
                        </span>
                        <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded-full border border-blue-200">
                          انقر لاختيار المركبة
                        </span>
                      </div>

                      <div className="overflow-y-auto max-h-72 divide-y divide-slate-100 p-2 space-y-1">
                        {filteredFleet.length > 0 ? (
                          filteredFleet.map((v) => {
                            const isSelected = vehicleSource === "fleet" && selectedVehicleId === v.id;
                            return (
                              <div
                                key={v.id}
                                onClick={() => {
                                  handleSelectVehicleCard(v);
                                  setFleetSearch(`${v.car_make} ${v.car_model} (${v.car_year}) - ${v.plate_number}`);
                                  setIsVehicleDropdownOpen(false);
                                  if (error) setError(null);
                                }}
                                className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? "bg-blue-50/90 text-blue-950 font-bold border-2 border-blue-500 shadow-2xs"
                                    : "hover:bg-slate-50 text-slate-800 border border-transparent hover:border-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "bg-slate-100 text-blue-700 border border-slate-200/80"
                                    }`}
                                  >
                                    <Car className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                        {v.car_make} {v.car_model}
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-bold">({v.car_year})</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                                      <span className="font-mono font-bold text-blue-800 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md">
                                        {v.plate_number}
                                      </span>
                                      <span className="font-mono text-slate-500 text-[10px] truncate">
                                        VIN: {v.vin}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected ? "bg-blue-600 text-white shadow-xs" : "border-2 border-slate-300 bg-slate-50"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-5 text-center text-xs text-slate-500 font-medium">
                            لا توجد سيارة مطابقة لبحثك "{fleetSearch}"
                          </div>
                        )}
                      </div>

                      {/* Action: Add Manual Vehicle */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setVehicleSource("manual");
                            setHasSelectedVehicle(true);
                            if (!carMake) setCarMake("تويوتا");
                            if (!carModel) setCarModel("كامري");
                            setIsVehicleDropdownOpen(false);
                            if (error) setError(null);
                          }}
                          className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 border border-dashed border-blue-400 hover:border-blue-600 rounded-xl text-xs font-black text-blue-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-4 h-4 text-blue-600" />
                          <span>+ إدخال مركبة جديدة يدوياً</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Detailed Selected Vehicle Information (matching reference image) ── */}
                {hasSelectedVehicle && vehicleSource === "fleet" && (
                  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
                    {/* Header with Title and Action Icons/Buttons */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Car className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-slate-900">
                            معلومات السيارة المختارة
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {carMake} {carModel} • سنة الصنع {carYear}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsVehicleDropdownOpen(true);
                            setFleetSearch("");
                          }}
                          title="تعديل / تغيير السيارة"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-black rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setHasSelectedVehicle(false);
                            setSelectedVehicleId("");
                            setCarMake("");
                            setCarModel("");
                            setCarYear("2023");
                            setPlateNumber("");
                            setVin("");
                            setSerialNumber("");
                            setMileage("");
                            setEngineCapacity("");
                            setCylinders("");
                            setTransmission("");
                            setFuelType("");
                            setIsVehicleDropdownOpen(true);
                          }}
                          title="إلغاء التحديد"
                          className="p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Form Field Grid matching the reference image */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 1. رقم الهيكل VIN */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          رقم الهيكل
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs font-mono font-black text-slate-900 shadow-2xs">
                          <span dir="ltr">{vin || "—"}</span>
                        </div>
                      </div>

                      {/* 2. رقم اللوحة */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          رقم اللوحة / رمز الأصل
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs font-mono font-black text-slate-900 shadow-2xs">
                          <span dir="ltr">{plateNumber || "—"}</span>
                        </div>
                      </div>

                      {/* 3. الرقم التسلسلي */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          الرقم التسلسلي
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-mono font-black text-slate-800 shadow-2xs">
                          <span>{serialNumber || "SN-849201"}</span>
                        </div>
                      </div>

                      {/* 4. سنة الصنع */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          سنة الصنع
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{carYear || "2023"}</span>
                        </div>
                      </div>

                      {/* 5. شركة السيارة (الماركة) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          شركة السيارة
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{carMake || "—"}</span>
                        </div>
                      </div>

                      {/* 6. موديل السيارة */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          موديل السيارة
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{carModel || "—"}</span>
                        </div>
                      </div>

                      {/* 7. ممشى السيارة */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          ممشى السيارة
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{mileage || "42,000 كم"}</span>
                        </div>
                      </div>

                      {/* 8. سعة المحرك */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          سعة المحرك
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{engineCapacity || "2.7 لتر"}</span>
                        </div>
                      </div>

                      {/* 9. عدد السلندرات */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          عدد السلندرات
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{cylinders || "4 سلندر"}</span>
                        </div>
                      </div>

                      {/* 10. ناقل الحركة */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          ناقل الحركة
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{transmission || "أوتوماتيك"}</span>
                        </div>
                      </div>

                      {/* 11. نوع الوقود */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">
                          نوع الوقود
                        </label>
                        <div className="h-11 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center text-xs font-black text-slate-800 shadow-2xs">
                          <span>{fuelType || "بنزين 91"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Manual Vehicle Form Inputs (if user chooses manual) ── */}
                {vehicleSource === "manual" && (
                  <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>تعبئة بيانات السيارة الجديدة يدوياً:</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleSource("fleet");
                          if (fleetList.length > 0) handleSelectVehicleCard(fleetList[0]);
                        }}
                        className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        العودة للاختيار من الأسطول
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-800 block mb-1">الماركة *</label>
                        <select
                          value={carMake}
                          onChange={(e) => {
                            setCarMake(e.target.value);
                            setCarModel(CAR_MODELS[e.target.value]?.[0] || "");
                            setHasSelectedVehicle(true);
                          }}
                          className="w-full h-10 bg-white rounded-xl text-xs font-bold px-3 border border-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          {CAR_MAKES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-800 block mb-1">الموديل *</label>
                        <input
                          type="text"
                          value={carModel}
                          onChange={(e) => {
                            setCarModel(e.target.value);
                            setHasSelectedVehicle(true);
                          }}
                          className="w-full h-10 bg-white rounded-xl text-xs font-bold px-3 border border-slate-200 focus:outline-none focus:border-blue-500"
                          placeholder="مثال: كامري"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-800 block mb-1">سنة الصنع *</label>
                        <select
                          value={carYear}
                          onChange={(e) => setCarYear(e.target.value)}
                          className="w-full h-10 bg-white rounded-xl text-xs font-bold px-3 border border-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم اللوحة</label>
                        <input
                          type="text"
                          value={plateNumber}
                          onChange={(e) => setPlateNumber(e.target.value)}
                          className="w-full h-10 bg-white rounded-xl text-xs font-bold px-3 font-mono border border-slate-200 focus:outline-none focus:border-blue-500"
                          placeholder="أ ب ج 1234"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم الهيكل VIN (اختياري)</label>
                        <input
                          type="text"
                          value={vin}
                          onChange={(e) => setVin(e.target.value)}
                          className="w-full h-10 bg-white rounded-xl text-xs font-bold px-3 font-mono uppercase border border-slate-200 focus:outline-none focus:border-blue-500"
                          placeholder="JTEBU598214051"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════ STEP 3: ORDER DETAILS ════════ */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">نطاق الطلب وتفاصيل القطع</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    حدد أولاً ما إذا كان الطلب عاماً لكافة الموردين أو خاصاً لمورد محدد، ثم أضف القطع المطلوبة
                  </p>
                </div>

                {/* 1. RFQ Scope Selection - CLEAN TABS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 block">نطاق إرسال الطلب: *</label>
                    {!rfqType && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                        يرجى الاختيار أولاً
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Public Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setRfqType("public");
                        setSelectedVendorId("");
                        setVendorSearch("");
                        if (error) setError(null);
                      }}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-right ${
                        rfqType === "public"
                          ? "bg-blue-600 text-white shadow-sm font-black"
                          : "bg-white text-slate-700 hover:bg-slate-100/80 font-bold border border-slate-200/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          rfqType === "public" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                        }`}>
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black block truncate">طلب عام – لكافة الموردين</span>
                          <span className={`text-[10px] block truncate ${rfqType === "public" ? "text-blue-100" : "text-slate-400"}`}>
                            تنافس أفضل الأسعار بين الموردين
                          </span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        rfqType === "public" ? "bg-white text-blue-600" : "border-2 border-slate-300"
                      }`}>
                        {rfqType === "public" && <Check className="w-3 h-3 text-current" strokeWidth={3} />}
                      </div>
                    </button>

                    {/* Private Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setRfqType("private");
                        if (error) setError(null);
                      }}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-right ${
                        rfqType === "private"
                          ? "bg-purple-600 text-white shadow-sm font-black"
                          : "bg-white text-slate-700 hover:bg-slate-100/80 font-bold border border-slate-200/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          rfqType === "private" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-600"
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black block truncate">طلب خاص – لمورد محدد فقط</span>
                          <span className={`text-[10px] block truncate ${rfqType === "private" ? "text-purple-100" : "text-slate-400"}`}>
                            توجيه حصري ومباشر لمورد
                          </span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        rfqType === "private" ? "bg-white text-purple-600" : "border-2 border-slate-300"
                      }`}>
                        {rfqType === "private" && <Check className="w-3 h-3 text-current" strokeWidth={3} />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* If neither selected yet: Prompt Box */}
                {!rfqType && (
                  <div className="bg-slate-50/90 border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-10 text-center space-y-3 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto shadow-2xs">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-800">
                        يرجى اختيار نوع الطلب أعلاه للمتابعة
                      </h3>
                      <p className="text-[11px] text-slate-400 font-bold mt-1 max-w-sm mx-auto">
                        اختر <span className="text-blue-600 font-black">طلب عام</span> أو <span className="text-purple-600 font-black">طلب خاص</span> لإظهار جدول تفاصيل القطع المطلوبة
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Vendor Picker Box (When Private Mode Selected) */}
                {rfqType === "private" && (
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 border border-purple-200/80 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-4.5 h-4.5 text-purple-600" />
                        <h3 className="text-xs sm:text-sm font-black text-purple-950">اختر المورد المستهدف للطلب: *</h3>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full">
                        طلب حصري
                      </span>
                    </div>

                    {/* Search Vendor with Floating Dropdown Menu */}
                    <div ref={vendorDropdownRef} className="relative">
                      <div className="relative">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="اضغط للبحث عن مورد معتمد أو اختر من القائمة..."
                          value={vendorSearch}
                          onFocus={() => setIsVendorDropdownOpen(true)}
                          onClick={() => setIsVendorDropdownOpen(true)}
                          onChange={(e) => {
                            setVendorSearch(e.target.value);
                            setIsVendorDropdownOpen(true);
                          }}
                          className="w-full h-11 pr-10 pl-10 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors"
                        >
                          {isVendorDropdownOpen ? (
                            <ChevronUp className="w-4 h-4 text-purple-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Floating Dropdown List of Vendors */}
                      {isVendorDropdownOpen && (
                        <div className="absolute top-full right-0 left-0 mt-1.5 z-40 bg-white border border-purple-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          {filteredVendors.length === 0 ? (
                            <div className="p-4 text-center text-xs font-bold text-slate-400">
                              لا توجد نتائج مطابقة لبحثك "{vendorSearch}"
                            </div>
                          ) : (
                            filteredVendors.map((v) => {
                              const isSelected = selectedVendorId === v.id;
                              return (
                                <div
                                  key={v.id}
                                  onClick={() => {
                                    setSelectedVendorId(v.id);
                                    setVendorSearch(v.company_name);
                                    setIsVendorDropdownOpen(false);
                                    if (error) setError(null);
                                  }}
                                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                                    isSelected
                                      ? "bg-purple-600 text-white font-bold border-purple-700 shadow-xs"
                                      : "bg-white border-transparent text-slate-800 hover:bg-purple-50/80 hover:border-purple-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isSelected ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-700"
                                    }`}>
                                      {v.company_name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate">
                                        {v.company_name}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                        <span className={`font-bold flex items-center gap-0.5 ${isSelected ? "text-amber-300" : "text-amber-500"}`}>
                                          <Star className="w-3 h-3 fill-current" />
                                          {v.rating}
                                        </span>
                                        <span>•</span>
                                        <span className={`truncate ${isSelected ? "text-purple-100" : "text-slate-500"}`}>{v.specialty}</span>
                                        <span>•</span>
                                        <span className={`truncate ${isSelected ? "text-purple-100" : "text-slate-500"}`}>{v.city}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected ? "bg-white text-purple-600" : "bg-slate-200 text-slate-400"
                                  }`}>
                                    {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Active Selected Vendor Card Confirmation */}
                    {selectedVendorId && selectedVendor && (
                      <div className="bg-white border-2 border-purple-500 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            {selectedVendor.company_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-black text-purple-950 truncate">
                                {selectedVendor.company_name}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                                محدد ✓
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">
                              {selectedVendor.specialty} • {selectedVendor.city} • تقييم ⭐ {selectedVendor.rating}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsVendorDropdownOpen(true);
                            setVendorSearch("");
                          }}
                          className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-black transition-all cursor-pointer shrink-0 mr-2"
                        >
                          تغيير المورد
                        </button>
                      </div>
                    )}

                    {/* Guidance prompt if private but no vendor selected yet */}
                    {!selectedVendorId && (
                      <div className="bg-purple-50/60 border border-dashed border-purple-200 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-purple-800">
                          👆 يرجى اختيار المورد من القائمة المنسدلة أعلاه لإظهار جدول تفاصيل القطع وإكمال الطلب
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ULTRA-PROFESSIONAL MULTI-PARTS TABLE (SHOWN ONLY WHEN PUBLIC OR WHEN PRIVATE AND VENDOR IS SELECTED) */}
                {((rfqType === "public") || (rfqType === "private" && Boolean(selectedVendorId))) && (
                  <>
                    {/* ── 3.A. SPARE PARTS CATEGORY SPECIALIZATION (SAUDI MARKET CANONICAL) ── */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                                مجال وتخصص قطع الغيار
                              </h4>
                              <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                فلترة وتوجيه ذكي بالسوق السعودي
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              حدد تخصص القطع لتوجيه طلبك مباشرة لموردي هذا المجال في الصناعيات، أو اتركه عاماً
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-black px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs">
                          {selectedPartsCategory === "all"
                            ? "🌐 عام (شامل لكافة التخصصات)"
                            : `✓ ${getPartsCategoryById(selectedPartsCategory)?.shortName || selectedPartsCategory}`}
                        </span>
                      </div>

                      {/* Horizontal Pills Selector */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPartsCategory("all");
                            setAutoDetectedCategory(null);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            selectedPartsCategory === "all"
                              ? "bg-slate-900 text-white shadow-xs scale-[1.02]"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <span>🌐 عام (كافة التخصصات)</span>
                        </button>

                        {CANONICAL_PARTS_CATEGORIES.map((cat) => {
                          const isSelected = selectedPartsCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedPartsCategory(cat.id);
                                setAutoDetectedCategory(null);
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-xs scale-[1.02] ring-2 ring-blue-500/20"
                                  : "bg-slate-50 hover:bg-blue-50/80 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <span>{cat.shortName}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Smart Auto-Detection Indicator */}
                      {autoDetectedCategory && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs animate-in fade-in duration-200">
                          <div className="flex items-center gap-2 text-emerald-800 font-black">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>تم التعرف الذكي على تخصص القطعة المدخلة: </span>
                            <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-300 font-black">
                              {autoDetectedCategory.nameAr}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPartsCategory(autoDetectedCategory.id)}
                            className="text-[11px] font-black bg-emerald-600 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
                          >
                            تثبيت التخصص ✓
                          </button>
                        </div>
                      )}

                      {/* Private Vendor Specialization Compatibility Notice */}
                      {rfqType === "private" && selectedVendorId && selectedPartsCategory !== "all" && (() => {
                        const v = vendorList.find((vnd) => vnd.id === selectedVendorId) || verifiedMapVendor;
                        if (!v) return null;
                        const isSpecialized = isVendorSpecializedInCategory(
                          v.specialized_categories,
                          selectedPartsCategory,
                          Boolean(v.specializes_in_all_categories)
                        );
                        if (!isSpecialized) {
                          return (
                            <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                تنبيه: المورد المختار قد لا يتخصص رئيسياً في مجال ({getPartsCategoryById(selectedPartsCategory)?.shortName}). سيصل إليه طلبك ولكن قد يستغرق الرد وقتاً أطول أو يمكنك تغيير المورد لمورد متخصص.
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 animate-in fade-in duration-300">
                      {/* Table Header Line */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                              <span>تفاصيل الطلب</span>
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                {partsList.length} {partsList.length === 1 ? "قطعة" : "قطع"}
                              </span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold">
                              أدخل أسماء القطع المطلوبة ورقم القطعة (إن وجد) وحدد الكمية
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl hidden sm:inline-block">
                          إجمالي الكميات: {partsList.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0)}
                        </span>
                      </div>

                      {/* Multi-Row Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-black text-slate-600">
                              <th className="py-2.5 px-3 text-center w-10">#</th>
                              <th className="py-2.5 px-3 text-center w-24">معرض الصور</th>
                              <th className="py-2.5 px-4 min-w-[220px]">اسم القطعة *</th>
                              <th className="py-2.5 px-4 min-w-[180px]">رقم القطعة (اختياري)</th>
                              <th className="py-2.5 px-3 text-center w-32">الكمية</th>
                              <th className="py-2.5 px-3 text-center w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {partsList.map((part, index) => (
                              <tr key={part.id} className="hover:bg-slate-50/60 transition-colors group align-top">
                                {/* Index */}
                                <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 pt-5">
                                  {index + 1}
                                </td>

                                {/* Part Image Gallery Cell */}
                                <td className="py-3 px-3 text-center pt-3.5">
                                  <div className="flex items-center justify-center">
                                    {part.isUploading ? (
                                      <div className="w-14 h-12 rounded-2xl border border-blue-400 bg-blue-50/90 flex flex-col items-center justify-center relative overflow-hidden shadow-2xs">
                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                        <span className="text-[7px] font-black text-blue-800 mt-0.5">رفع...</span>
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-200 overflow-hidden">
                                          <div className="h-full bg-blue-600 animate-pulse w-full" />
                                        </div>
                                      </div>
                                    ) : (part.images && part.images.length > 0) || part.imagePreview ? (
                                      (() => {
                                        const imageList =
                                          part.images && part.images.length > 0
                                            ? part.images
                                            : part.imagePreview
                                            ? [part.imagePreview]
                                            : [];
                                        const count = imageList.length;
                                        return (
                                          <div
                                            className="relative group/gallery cursor-pointer"
                                            onClick={() => setGalleryModalTarget({ part, activeIndex: 0 })}
                                            title="انقر لفتح معرض صور القطعة الكامل"
                                          >
                                            {/* Multi-layer effect if multiple images */}
                                            {count > 1 && (
                                              <div className="absolute -top-1 -right-1 w-13 h-12 rounded-2xl bg-blue-500/20 rotate-6 transition-transform group-hover/gallery:rotate-12 group-hover/gallery:scale-105" />
                                            )}

                                            {/* Main Thumbnail Container */}
                                            <div
                                              className={`relative w-13 h-12 rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-300 shadow-2xs group-hover/gallery:shadow-md ${
                                                count > 1
                                                  ? "border-blue-500 ring-2 ring-blue-500/20"
                                                  : "border-emerald-500/80"
                                              }`}
                                            >
                                              <img
                                                src={imageList[0]}
                                                alt={part.name || "Part"}
                                                className="w-full h-full object-cover group-hover/gallery:scale-110 transition-transform duration-300"
                                              />

                                              {/* Eye Overlay */}
                                              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover/gallery:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                <Eye className="w-4 h-4 text-white" />
                                              </div>
                                            </div>

                                            {/* Badge Count Pill */}
                                            <span
                                              className={`absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-full text-[8px] font-black shadow-md border flex items-center gap-0.5 z-10 ${
                                                count > 1
                                                  ? "bg-blue-600 text-white border-blue-400"
                                                  : "bg-emerald-600 text-white border-emerald-400"
                                              }`}
                                            >
                                              <Images className="w-2.5 h-2.5" />
                                              <span>{count}</span>
                                            </span>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <label className="w-13 h-12 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/60 text-slate-400 hover:text-blue-600 flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xs group/btn">
                                        <div className="flex items-center gap-0.5">
                                          <Camera className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                          <Plus className="w-2 h-2 -mr-1 text-blue-500" strokeWidth={3} />
                                        </div>
                                        <span className="text-[7px] font-black text-slate-500 group-hover:text-blue-600 mt-0.5">
                                          إضافة صور
                                        </span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                              handlePartMultipleImagesUpload(part.id, e.target.files);
                                            }
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                </td>

                                {/* Part Name */}
                                <td className="py-3 px-4 pt-4">
                                  <input
                                    type="text"
                                    value={part.name}
                                    onChange={(e) => {
                                      handleUpdatePartRow(part.id, "name", e.target.value);
                                      if (error) setError(null);
                                    }}
                                    placeholder="مثال: فحمات فرامل أمامية، طرمبة ماء..."
                                    className="w-full h-10 px-3.5 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                  />
                                </td>

                                {/* Part Number */}
                                <td className="py-3 px-4 pt-4">
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={part.partNumber}
                                    onChange={(e) => handleUpdatePartRow(part.id, "partNumber", e.target.value)}
                                    placeholder="04465-33470 (اختياري)"
                                    className="w-full h-10 px-3.5 bg-white border border-slate-200/90 rounded-xl text-xs font-mono font-bold text-slate-800 text-left placeholder:text-slate-400 placeholder:text-right focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                  />
                                </td>

                                {/* Quantity */}
                                <td className="py-3 px-3 text-center pt-4">
                                  <div className="inline-flex items-center justify-center bg-slate-100/90 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = Number(part.quantity) || 1;
                                        if (current > 1) handleUpdatePartRow(part.id, "quantity", current - 1);
                                      }}
                                      className="w-6.5 h-6.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      max={999}
                                      value={part.quantity}
                                      onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                        handleUpdatePartRow(part.id, "quantity", val);
                                      }}
                                      className="w-9 text-center font-mono font-black text-xs text-slate-900 bg-transparent focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = Number(part.quantity) || 1;
                                        handleUpdatePartRow(part.id, "quantity", current + 1);
                                      }}
                                      className="w-6.5 h-6.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Actions / Delete */}
                                <td className="py-3 px-3 text-center pt-4">
                                  <button
                                    type="button"
                                    disabled={partsList.length <= 1}
                                    onClick={() => handleRemovePartRow(part.id)}
                                    title={partsList.length <= 1 ? "يجب بقاء قطعة واحدة على الأقل" : "حذف القطعة"}
                                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                      partsList.length <= 1
                                        ? "text-slate-300 cursor-not-allowed"
                                        : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    }`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Part Row Button matching attached screenshot */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleAddPartRow}
                          className="w-full py-3 px-4 bg-white hover:bg-blue-50/70 border border-dashed border-blue-400 hover:border-blue-600 rounded-xl text-xs font-black text-blue-700 hover:text-blue-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
                        >
                          <Plus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                          <span>+ إضافة قطعة</span>
                        </button>
                      </div>
                    </div>

                    {/* 4. Urgent Request Card */}
                    <div
                      onClick={() => setIsUrgent(!isUrgent)}
                      className={`p-4 rounded-2xl cursor-pointer relative overflow-hidden transition-all duration-200 border flex items-center justify-between ${
                        isUrgent
                          ? "bg-gradient-to-br from-amber-50/90 via-white to-orange-50/30 border-2 border-amber-500 shadow-md shadow-amber-500/10 scale-[1.01]"
                          : "bg-white border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs"
                      }`}
                    >
                      {isUrgent && (
                        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                      )}
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          isUrgent
                            ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">طلب عاجل جداً</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            إعطاء أولوية مرتفعة للتنفيذ وسرعة استجابة الموردين
                          </p>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-colors relative ${isUrgent ? "bg-amber-500" : "bg-slate-300"}`}>
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${isUrgent ? "left-5" : "left-0.5"}`} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════════ STEP 4: DELIVERY ════════ */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">طريقة الاستلام والتأكيد النهائي</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    اختر كيفية استلام الشحنة، ثم راجع ملخص الطلب بالجانب قبل الإرسال النهائي
                  </p>
                </div>

                {/* Delivery Methods Grid */}
                <div className="space-y-2.5">
                  <label className="text-xs font-extrabold text-slate-800 block">طريقة الاستلام المفضلة *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Delivery Option */}
                    <div
                      onClick={() => setDeliveryMethod("delivery")}
                      className={`p-4 rounded-2xl transition-all cursor-pointer flex items-start justify-between ${
                        deliveryMethod === "delivery"
                          ? "bg-blue-600 text-white font-bold"
                          : "bg-slate-100/80 text-slate-800 hover:bg-slate-200/70"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          deliveryMethod === "delivery" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold">توصيل إلى الموقع</p>
                          <p className={`text-[11px] mt-1 leading-relaxed font-medium ${
                            deliveryMethod === "delivery" ? "text-blue-100" : "text-slate-500"
                          }`}>
                            توصيل مباشر إلى موقع الفرع ({locationName.split("–")[0] || "الفرع المحدد"})
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        deliveryMethod === "delivery" ? "bg-white text-blue-600" : "bg-slate-200 text-slate-400"
                      }`}>
                        {deliveryMethod === "delivery" && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Pickup Option */}
                    <div
                      onClick={() => setDeliveryMethod("pickup")}
                      className={`p-4 rounded-2xl transition-all cursor-pointer flex items-start justify-between ${
                        deliveryMethod === "pickup"
                          ? "bg-blue-600 text-white font-bold"
                          : "bg-slate-100/80 text-slate-800 hover:bg-slate-200/70"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          deliveryMethod === "pickup" ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold">استلام من فرع المورد</p>
                          <p className={`text-[11px] mt-1 leading-relaxed font-medium ${
                            deliveryMethod === "pickup" ? "text-blue-100" : "text-slate-500"
                          }`}>
                            الاستلام المباشر من معرض أو فرع المورد فور تجهيز الطلب
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        deliveryMethod === "pickup" ? "bg-white text-blue-600" : "bg-slate-200 text-slate-400"
                      }`}>
                        {deliveryMethod === "pickup" && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pickup Details & Branch Picker */}
                {deliveryMethod === "pickup" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {rfqType === "private" && selectedVendorId ? (
                      <VendorBranchesSelector
                        branches={vendorBranches}
                        selectedBranchId={selectedVendorBranchId}
                        onSelectBranch={setSelectedVendorBranchId}
                        clientCoords={clientReferenceCoord}
                        selectedVendor={selectedVendor}
                        verifiedMapVendor={verifiedMapVendor}
                        locationName={locationName}
                        isLoading={isLoadingBranches}
                      />
                    ) : (
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 border border-blue-200/90 shadow-2xs space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-blue-950">استلام مباشر من فرع المورد (طلب عام)</h4>
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                                بدون رسوم توصيل (0 ر.س)
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              نظراً لأن هذا الطلب <strong className="text-blue-900 font-bold">عام وموجّه لكافة الموردين</strong>، سيتنافس الموردون في منطقتك على تقديم أفضل الأسعار. بمجرد قبولك للعرض الأنسب في غرفة الصفقات، سيظهر لك عنوان الفرع الأقرب للمورد الفائز وخريطة المسار المباشر إليه فوراً.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-blue-100 text-[11px] text-blue-700 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>سيتم إعفاء طلبك من رسوم التوصيل تلقائياً عند اعتماد الاستلام من الفرع.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-800 block">ملاحظات إضافية للمورد (اختياري):</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: يفضل التوصيل خلال ساعات العمل الصباحية..."
                    className="w-full h-11 px-4 bg-slate-100/80 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ════════════ BOTTOM BUTTON BAR ════════════ */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-2xl flex items-center gap-2 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>الخطوة السابقة</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);

                    if (currentStep === 1) {
                      if (!recipientName.trim()) {
                        setError("يرجى إدخال اسم المستلم أولاً قبل الانتقال للخطوة التالية");
                        return;
                      }
                      if (!recipientPhone.trim()) {
                        setError("يرجى إدخال رقم هاتف للتواصل قبل الانتقال للخطوة التالية");
                        return;
                      }
                      if (!hasSelectedLocation && !selectedBranchId) {
                        setError("يرجى اختيار فرع الشركة أو تحديد موقع التسليم أولاً");
                        return;
                      }
                    }

                    if (currentStep === 2) {
                      if (!hasSelectedVehicle || !carMake.trim() || !carModel.trim()) {
                        setError("يرجى اختيار سيارة من القائمة المنسدلة للأسطول أو إدخال بيانات السيارة المطلوبة");
                        return;
                      }
                      if (vehicleSource === "manual" && (!carMake.trim() || !carModel.trim() || !plateNumber.trim() || !carYear)) {
                        setError("يرجى تعبئة كافة بيانات السيارة المطلوبة (الماركة، الموديل، سنة الصنع، رقم اللوحة)");
                        return;
                      }
                    }

                    if (currentStep === 3) {
                      if (!rfqType) {
                        setError("يرجى تحديد ما إذا كان الطلب عاماً أو خاصاً أولاً");
                        return;
                      }
                      if (rfqType === "private" && !selectedVendorId) {
                        setError("يرجى اختيار المورد المطلوب للطلب الخاص");
                        return;
                      }
                      const hasValidPart = partsList.some((p) => p.name.trim().length > 0) || partsText.trim() || imagePreview || partsList.some((p) => p.imagePreview);
                      if (!hasValidPart) {
                        setError("يرجى إدخال اسم قطعة واحدة على الأقل في جدول تفاصيل الطلب أو إرفاق صورة لها قبل المتابعة");
                        return;
                      }
                    }

                    setError(null);
                    setCurrentStep(currentStep + 1);
                  }}
                  className="px-6 sm:px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <span>التالي: {stepsConfig[currentStep].title}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploadingImage}
                  className="px-7 sm:px-9 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEditMode ? "جاري حفظ التعديلات..." : "جاري إرسال الطلب..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" strokeWidth={3} />
                      <span>{isEditMode ? "حفظ التعديلات وتحديث الطلب 💾" : "إرسال الطلب النهائي ✓"}</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

        </div>

        {/* ────────────────── 2. FLAT STICKY FLOATING SUMMARY BOX (REVEALED ONLY AFTER SELECTION) ────────────────── */}
        {showSummary && (
          <div className="lg:col-span-4 hidden lg:block transition-all duration-500">
            <div className="sticky top-20 z-20 bg-[#0B1528] text-white p-6 rounded-3xl space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
                  <BadgeCheck className="w-5 h-5 text-emerald-400" />
                  <span>ملخص الطلب الحقيقي</span>
                </h3>
                <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  LIVE DIRECT
                </span>
              </div>

              {/* Summary Items Cards - FLAT SLATE BOXES WITH DISABLED/FADED MUTED STATES */}
              <div className="space-y-3">
                {/* 1. Location */}
                {(() => {
                  const isActive = Boolean(hasSelectedLocation || locationName);
                  return (
                    <div className={`p-3.5 rounded-2xl transition-all duration-300 ${
                      isActive ? "bg-slate-900/90 text-white opacity-100" : "bg-slate-950/40 text-slate-500 opacity-40 grayscale"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-[11px] font-extrabold ${isActive ? "text-cyan-400" : "text-slate-400"}`}>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>موقع التسليم الفرعي</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isActive ? "text-cyan-300 bg-cyan-950/80" : "text-slate-500 bg-slate-900"}`}>01</span>
                      </div>
                      <p className="text-xs font-extrabold leading-snug mt-1">
                        {locationName || "غير محدد بعد"}
                      </p>
                    </div>
                  );
                })()}

                {/* 2. Vehicle */}
                {(() => {
                  const isActive = Boolean(carMake && carModel && hasSelectedVehicle);
                  return (
                    <div className={`p-3.5 rounded-2xl transition-all duration-300 ${
                      isActive ? "bg-slate-900/90 text-white opacity-100" : "bg-slate-950/40 text-slate-500 opacity-40 grayscale"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-[11px] font-extrabold ${isActive ? "text-indigo-300" : "text-slate-400"}`}>
                          <Car className="w-3.5 h-3.5" />
                          <span>بيانات المركبة</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isActive ? "text-indigo-300 bg-indigo-950/80" : "text-slate-500 bg-slate-900"}`}>02</span>
                      </div>
                      <p className="text-xs font-extrabold leading-snug mt-1">
                        {isActive ? (
                          `${carMake} ${carModel} (${carYear}) ${plateNumber ? `– ${plateNumber}` : ""}`
                        ) : (
                          <span className="text-slate-500 font-normal">بانتظار اختيار المركبة في الخطوة 02...</span>
                        )}
                      </p>
                    </div>
                  );
                })()}

                {/* 3. Scope & Target Vendor */}
                {(() => {
                  const isActive = Boolean(currentStep >= 3);
                  return (
                    <div className={`p-3.5 rounded-2xl transition-all duration-300 ${
                      isActive ? "bg-slate-900/90 text-white opacity-100" : "bg-slate-950/40 text-slate-500 opacity-40 grayscale"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-[11px] font-extrabold ${isActive ? "text-purple-300" : "text-slate-400"}`}>
                          <Store className="w-3.5 h-3.5" />
                          <span>نطاق إرسال الطلب</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isActive ? "text-purple-300 bg-purple-950/80" : "text-slate-500 bg-slate-900"}`}>03</span>
                      </div>
                      <p className="text-xs font-extrabold leading-snug mt-1">
                        {isActive ? (
                          rfqType === "public" ? (
                            <span className="text-slate-200">عام (لكل موردي المنطقة المعتمدين)</span>
                          ) : (
                            <span className="text-purple-300 font-extrabold">
                              خاص: {selectedVendor?.company_name || "مورد محدد"}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 font-normal">بانتظار تحديد النطاق في الخطوة 03...</span>
                        )}
                      </p>
                    </div>
                  );
                })()}

                {/* 4. Parts */}
                {(() => {
                  const isActive = Boolean(partsText.trim() || imagePreview || partsList.some(p => p.name.trim().length > 0));
                  return (
                    <div className={`p-3.5 rounded-2xl transition-all duration-300 ${
                      isActive ? "bg-slate-900/90 text-white opacity-100" : "bg-slate-950/40 text-slate-500 opacity-40 grayscale"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-[11px] font-extrabold ${isActive ? "text-amber-300" : "text-slate-400"}`}>
                          <Package className="w-3.5 h-3.5" />
                          <span>تفاصيل القطع المطلوبة</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isActive ? "text-amber-300 bg-amber-950/80" : "text-slate-500 bg-slate-900"}`}>03</span>
                      </div>
                      <p className="text-xs font-extrabold leading-snug line-clamp-2 mt-1">
                        {partsText.trim() ? (
                          partsText
                        ) : imagePreview ? (
                          <span className="text-emerald-400 font-bold">تم إرفاق صورة القطعة بنجاح ✓</span>
                        ) : (
                          <span className="text-slate-500 font-normal">لم تضاف القطع بعد...</span>
                        )}
                      </p>
                      {isActive && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">مجال التخصص:</span>
                          <span className="text-blue-300 font-black">
                            {selectedPartsCategory === "all" ? "عام (كافة التخصصات)" : (getPartsCategoryById(selectedPartsCategory)?.shortName || selectedPartsCategory)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 5. Delivery */}
                {(() => {
                  const isActive = Boolean(currentStep >= 4);
                  return (
                    <div className={`p-3.5 rounded-2xl transition-all duration-300 ${
                      isActive ? "bg-slate-900/90 text-white opacity-100" : "bg-slate-950/40 text-slate-500 opacity-40 grayscale"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-[11px] font-extrabold ${isActive ? "text-emerald-300" : "text-slate-400"}`}>
                          <Truck className="w-3.5 h-3.5" />
                          <span>طريقة الاستلام</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isActive ? "text-emerald-300 bg-emerald-950/80" : "text-slate-500 bg-slate-900"}`}>04</span>
                      </div>
                      <p className="text-xs font-extrabold leading-snug mt-1">
                        {isActive ? (
                          deliveryMethod === "delivery" ? (
                            `توصيل مباشر إلى (${deliveryCity || "الرياض"})`
                          ) : (
                            <div>
                              <p className="text-emerald-300 font-extrabold">استلام مباشر من فرع المورد</p>
                              {rfqType === "private" && (() => {
                                const sel = vendorBranches.find((b: any) => b.id === selectedVendorBranchId);
                                if (!sel) return null;
                                return (
                                  <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
                                    الفرع: {sel.name}
                                  </p>
                                );
                              })()}
                              {rfqType !== "private" && (
                                <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
                                  يتحدد تلقائياً حسب المورد الفائز بالعرض
                                </p>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-500 font-normal">بانتظار اختيار الاستلام في الخطوة 04...</span>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Status Card */}
              <div className="pt-2">
                {currentStep === 4 ? (
                  <div className="bg-emerald-600 rounded-2xl p-3.5 text-center text-white font-black text-xs flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-200" />
                    <span>الطلب مكتمل وجاهز للإرسال النهائي</span>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl p-3.5 text-center text-slate-400 text-xs font-extrabold">
                    مستعد للخطوة 0{currentStep} من 04
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ────────────────── 3. ULTRA-PROFESSIONAL PART IMAGE GALLERY MODAL ────────────────── */}
      <PartGalleryModal
        isOpen={Boolean(galleryModalTarget)}
        part={galleryModalTarget?.part || null}
        initialIndex={galleryModalTarget?.activeIndex || 0}
        onClose={() => setGalleryModalTarget(null)}
        onUploadImages={(partId, files) => handlePartMultipleImagesUpload(partId, files)}
        onDeleteImage={(partId, index) => handleDeleteImage(partId, index)}
        onSetMainImage={(partId, index) => handleSetMainImage(partId, index)}
      />
    </div>
  );
}

export default function NewRFQWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100/70 p-6 text-slate-600 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
          <p className="text-xs font-bold text-slate-500">جاري تجهيز بيانات الطلب...</p>
        </div>
      }
    >
      <NewRFQWizardContent />
    </Suspense>
  );
}
