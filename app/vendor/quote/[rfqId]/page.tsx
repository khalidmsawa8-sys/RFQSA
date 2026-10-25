"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Upload,
  Lock,
  Copy,
  Check,
  ShieldCheck,
  Tag,
  Eye,
  Images,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Car,
  Calendar,
  Hash,
  Award,
  Sparkles,
  MapPin,
  Phone,
  User,
  Store,
  Globe,
  Clock,
  Coins,
  Truck,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Percent,
  Send,
  FileText,
  Calculator,
  Info,
  Layers,
  Sparkle,
  Ban,
  RotateCcw,
  Timer,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";
import {
  calculateDeliveryCost,
  createDeliverySnapshot,
  DeliveryCalculationResult,
  DeliverySnapshot,
} from "@/lib/delivery-engine";
import { isMakeMatchingSpecialization } from "@/lib/brand-specialization";
import { RfqCardTimer } from "@/components/rfq-card-timer";

interface VendorGalleryModalProps {
  partName: string;
  partNumber?: string;
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

function VendorGalleryModal({
  partName,
  partNumber,
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: VendorGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

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

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];
  const fullSrc =
    currentImage?.startsWith("http") || currentImage?.startsWith("data:")
      ? currentImage
      : currentImage
      ? `/api/file?pathname=${encodeURIComponent(currentImage)}`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 text-white rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  معرض صور القطعة: {partName || "قطعة الغيار"}
                </h3>
                {partNumber && (
                  <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                    {partNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                <span>الصورة المعروضة:</span>
                <span className="text-blue-400 font-bold font-mono">
                  {currentIndex + 1} من {images.length}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fullSrc && (
              <a
                href={fullSrc}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                title="فتح الصورة في تبويب مستقل"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">عرض بالحجم الكامل</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-[340px] max-h-[58vh] overflow-hidden group select-none">
          {fullSrc && (
            <img
              src={fullSrc}
              alt={`صورة ${currentIndex + 1}`}
              className={`max-w-full max-h-[56vh] object-contain transition-transform duration-300 ${
                isZoomed ? "scale-125 cursor-zoom-out" : "scale-100 cursor-zoom-in"
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          )}

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-105 cursor-pointer z-10"
                title="الصورة السابقة"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all hover:scale-105 cursor-pointer z-10"
                title="الصورة التالية"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
            title={isZoomed ? "تصغير" : "تكبير"}
          >
            {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Filmstrip */}
        {images.length > 1 && (
          <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2.5 overflow-x-auto">
            {images.map((img, idx) => {
              const thumbSrc =
                img?.startsWith("http") || img?.startsWith("data:")
                  ? img
                  : img
                  ? `/api/file?pathname=${encodeURIComponent(img)}`
                  : null;
              return (
                <div
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative group/strip shrink-0 w-16 h-16 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 ${
                    currentIndex === idx
                      ? "border-blue-500 ring-2 ring-blue-500/30 scale-105 shadow-md"
                      : "border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600"
                  }`}
                >
                  {thumbSrc && (
                    <img src={thumbSrc} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[9px] font-mono font-bold px-1 rounded text-white">
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            معرض صور القطعة المرفق من قبل العميل
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

interface RFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number?: string | null;
  vin?: string | null;
  parts_description: string;
  delivery_location?: string | null;
  delivery_city?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  client_id?: string;
  created_at?: string;
  status?: string;
  expires_at?: string | null;
  expiry_hours?: number | null;
  profiles?: { full_name?: string; phone?: string };
}

interface ParsedPart {
  partName: string;
  partNumber: string;
  partType?: "original" | "commercial";
  commercialBrand?: string | null;
  quantity: number;
  imagePathname?: string | null;
  images?: string[];
  notes?: string | null;
}

interface QuoteItem extends ParsedPart {
  selectedType: "original" | "commercial" | "both" | "unavailable";
  original_price: string;
  commercial_price: string;
  commercial_brand: string;
  availability: "available" | "unavailable";
  image_file?: File | null;
  image_url?: string | null;
}

function parseParts(raw: string): ParsedPart[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) {
      return arr.map((p: Record<string, any>, idx: number) => {
        const rawImages =
          Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : p.imagePathname || p.imagePreview || p.imageUrl || p.image_url
            ? [String(p.imagePathname || p.imagePreview || p.imageUrl || p.image_url)]
            : [];

        return {
          partName: String(p.partName || p.part_name || p.name || p.title || `قطعة غيار #${idx + 1}`),
          partNumber: String(p.partNumber || p.part_number || ""),
          partType:
            p.partType === "commercial" ||
            p.part_type === "commercial" ||
            p.partTypeName === "تجاري"
              ? "commercial"
              : "original",
          commercialBrand: p.commercialBrand || p.commercial_brand || p.brand || null,
          quantity: Number(p.quantity || 1),
          images: rawImages,
          imagePathname: rawImages.length > 0 ? rawImages[0] : null,
          notes: p.notes ? String(p.notes) : null,
        };
      });
    }
  } catch {
    /* ignore */
  }
  return String(raw || "")
    .split("\n")
    .filter(Boolean)
    .map((line, idx) => ({
      partName: line.trim() || `قطعة غيار #${idx + 1}`,
      partNumber: "",
      partType: "original",
      commercialBrand: null,
      quantity: 1,
      images: [],
      imagePathname: null,
      notes: null,
    }));
}

function parseRFQExtraDetails(parts_description?: string, delivery_location?: string | null) {
  if (!parts_description)
    return { deliveryLocation: delivery_location, isUrgent: false, rfqType: "public", deliveryMethod: "delivery" };
  try {
    const parsed = JSON.parse(parts_description);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const item0 = parsed[0] || {};
      return {
        recipientName: item0.recipientName || undefined,
        recipientPhone: item0.recipientPhone || undefined,
        deliveryLocation: delivery_location || item0.deliveryLocation || undefined,
        isUrgent: Boolean(item0.isUrgent),
        rfqType: item0.rfqType || "public",
        targetVendorName: item0.targetVendorName || undefined,
        deliveryMethod: item0.deliveryMethod || (item0.fulfillmentMethod === "SELF_PICKUP" ? "pickup" : "delivery"),
        fulfillmentMethod: item0.fulfillmentMethod || (item0.deliveryMethod === "pickup" ? "SELF_PICKUP" : "DELIVERY"),
        source: item0.source || undefined,
        pickupSnapshot: item0.pickupSnapshot || undefined,
      };
    }
  } catch {}
  return { deliveryLocation: delivery_location, isUrgent: false, rfqType: "public", deliveryMethod: "delivery" };
}

export default function SubmitQuotePage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.rfqId as string;
  const supabase = createClient();

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [deliveryCost, setDeliveryCost] = useState("0");
  const [deliveryDays, setDeliveryDays] = useState("1");
  const [platformSettings, setPlatformSettings] = useState({
    vat_percent: 15,
    platform_commission_percent: 15,
    client_platform_fee_percent: 5,
    vendor_platform_fee_percent: 15,
    vat_number: "310987654300003",
    cr_number: "1010789456",
  });

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d?.settings || d?.data;
        if (s) {
          setPlatformSettings((prev) => ({
            ...prev,
            vat_percent: Number(s.vat_percent ?? 15),
            platform_commission_percent: Number(s.platform_commission_percent ?? 15),
            client_platform_fee_percent: Number(s.client_platform_fee_percent ?? s.platform_commission_percent ?? 5),
            vendor_platform_fee_percent: Number(s.vendor_platform_fee_percent ?? 15),
            vat_number: s.vat_number || prev.vat_number,
            cr_number: s.cr_number || prev.cr_number,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const taxRate = Number(platformSettings.vat_percent ?? 15);
  const clientFeeRate = Number(platformSettings.client_platform_fee_percent ?? platformSettings.platform_commission_percent ?? 5);
  const vendorFeeRate = Number(platformSettings.vendor_platform_fee_percent ?? 15);
  const commissionRate = clientFeeRate; // Backwards compatibility alias
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vinCopied, setVinCopied] = useState(false);
  const [vendorGalleryPart, setVendorGalleryPart] = useState<{
    partName: string;
    partNumber?: string;
    images: string[];
    activeIndex: number;
  } | null>(null);

  // Preparation Duration State
  const [showPrepTimeModal, setShowPrepTimeModal] = useState(false);
  const [prepDays, setPrepDays] = useState(0);
  const [prepHours, setPrepHours] = useState(2);
  const [prepMinutes, setPrepMinutes] = useState(0);

  const [isUnauthorizedBrand, setIsUnauthorizedBrand] = useState(false);
  const [deliveryCalc, setDeliveryCalc] = useState<DeliveryCalculationResult | null>(null);
  const [vendorProfile, setVendorProfile] = useState<{
    full_name?: string;
    company_name?: string;
    national_address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    specialized_brands?: string[];
    specializes_in_all_brands?: boolean;
  } | null>(null);

  const [hasExistingQuote, setHasExistingQuote] = useState(false);
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);

  // Success 2-second popup modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProgress, setSuccessProgress] = useState(0);

  useEffect(() => {
    if (showSuccessModal) {
      const timerBar = setTimeout(() => {
        setSuccessProgress(100);
      }, 50);
      const timerRedirect = setTimeout(() => {
        router.push("/vendor/orders");
        if (typeof window !== "undefined") {
          window.location.href = "/vendor/orders";
        }
      }, 2000);
      return () => {
        clearTimeout(timerBar);
        clearTimeout(timerRedirect);
      };
    }
  }, [showSuccessModal, router]);

  useEffect(() => {
    async function load() {
      if (!rfqId) {
        setIsLoading(false);
        return;
      }
      try {
        let {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          user = {
            id: "vendor-demo-id",
            email: "vendor@rfqsa.tech",
            user_metadata: { role: "vendor", full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة" },
          } as any;
        }

        // Fetch dynamic platform settings (VAT & Commission)
        try {
          const sRes = await fetch("/api/v1/settings", { cache: "no-store" });
          if (sRes.ok) {
            const sJson = await sRes.json();
              setPlatformSettings({
                vat_percent: Number(sJson.settings.vat_percent ?? 15),
                platform_commission_percent: Number(sJson.settings.client_platform_fee_percent ?? sJson.settings.platform_commission_percent ?? 5),
                client_platform_fee_percent: Number(sJson.settings.client_platform_fee_percent ?? sJson.settings.platform_commission_percent ?? 5),
                vendor_platform_fee_percent: Number(sJson.settings.vendor_platform_fee_percent ?? 6),
                vat_number: sJson.settings.vat_number || "310987654300003",
                cr_number: sJson.settings.cr_number || "1010789456",
              });
          }
        } catch (sErr) {
          console.warn("Could not load dynamic platform settings:", sErr);
        }

        // Check for existing quote to pre-populate form (DO NOT redirect)
        let existingQuote: any = null;
        try {
          const res = await fetch(`/api/quotes?rfq_id=${rfqId}&vendor_id=${user.id}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.quotes) && json.quotes.length > 0) {
              existingQuote = json.quotes[0];
            }
          }
        } catch (e) {}

        if (!existingQuote) {
          const { data: qData } = await supabase
            .from("quotes")
            .select("*")
            .eq("rfq_id", rfqId)
            .eq("vendor_id", user.id)
            .maybeSingle();
          existingQuote = qData;
        }

        if (existingQuote) {
          setHasExistingQuote(true);
          setExistingQuoteId(existingQuote.id);
        }

        let rfqData: any = null;

        // 1. Direct API fetch (Server source of truth)
        try {
          const res = await fetch(`/api/rfqs/${rfqId}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.rfq) {
              rfqData = json.rfq;
            }
          }
        } catch (err) {
          console.warn("Direct RFQ API fetch error:", err);
        }

        // 2. Fallback to Supabase client
        if (!rfqData) {
          const { data } = await supabase
            .from("rfqs")
            .select("*, profiles!rfqs_client_id_fkey(full_name, phone)")
            .eq("id", rfqId)
            .maybeSingle();
          rfqData = data;
        }

        if (!rfqData) {
          router.push("/vendor/orders");
          return;
        }

        // Fetch Vendor Profile for GPS, City, and Brand Specializations
        const { data: vProfile } = await supabase
          .from("profiles")
          .select("full_name, company_name, national_address, city, latitude, longitude, specialized_brands, specializes_in_all_brands")
          .eq("id", user.id)
          .maybeSingle();

        if (vProfile) {
          setVendorProfile(vProfile as any);
        }

        // ── Server-Side & Client Brand Authorization Verification ──
        const vendorBrands = (vProfile as any)?.specialized_brands || ["toyota", "lexus", "hyundai", "kia", "gmc", "ford", "nissan"];
        const vendorAllBrands = Boolean((vProfile as any)?.specializes_in_all_brands);
        const isAuthorizedForBrand = isMakeMatchingSpecialization(
          rfqData.car_make,
          vendorBrands,
          vendorAllBrands
        );

        if (!isAuthorizedForBrand) {
          setIsUnauthorizedBrand(true);
          setRfq(rfqData);
          setIsLoading(false);
          return;
        }

        const rfqExtra = parseRFQExtraDetails(rfqData.parts_description, rfqData.delivery_location);
        const fulfillmentMethod = (rfqData as any).fulfillment_method || rfqExtra.fulfillmentMethod;
        const deliveryMethod = (rfqData as any).delivery_method || (rfqData as any).delivery_type || rfqExtra.deliveryMethod;

        let isPickupOrder = false;
        if (fulfillmentMethod === "DELIVERY" || deliveryMethod === "delivery" || deliveryMethod === "shipping") {
          isPickupOrder = false;
        } else if (
          fulfillmentMethod === "SELF_PICKUP" ||
          fulfillmentMethod === "BRANCH_PICKUP" ||
          deliveryMethod === "pickup" ||
          (rfqData as any).is_pickup === true ||
          (rfqData as any).pickup_branch
        ) {
          isPickupOrder = true;
        }

        // Centralized RIFQ Fleet Delivery Calculation
        try {
          const calcResult = calculateDeliveryCost({
            source_city: (vProfile as any)?.city || (vProfile as any)?.national_address || "الرياض",
            source_coords:
              (vProfile as any)?.latitude && (vProfile as any)?.longitude
                ? {
                    latitude: Number((vProfile as any).latitude),
                    longitude: Number((vProfile as any).longitude),
                  }
                : null,
            destination_city: rfqData.delivery_city,
            destination_coords:
              rfqData.delivery_latitude && rfqData.delivery_longitude
                ? {
                    latitude: Number(rfqData.delivery_latitude),
                    longitude: Number(rfqData.delivery_longitude),
                  }
                : null,
            destination_location_text: rfqData.delivery_location,
          });

          setDeliveryCalc(calcResult);
          const computedFee = calcResult?.delivery_fee_net && calcResult.delivery_fee_net > 0 ? calcResult.delivery_fee_net : 25;
          setDeliveryCost(isPickupOrder ? "0" : String(computedFee));
          setDeliveryDays(isPickupOrder ? "0" : String(calcResult?.estimated_days || 1));
        } catch (calcErr) {
          console.warn("Delivery calculation warning:", calcErr);
          setDeliveryCost(isPickupOrder ? "0" : "25");
          setDeliveryDays("1");
        }

        // Ensure only real previously submitted quotes by this specific vendor are used
        const isRealExistingQuote = Boolean(
          existingQuote &&
          existingQuote.vendor_id === user.id &&
          !String(existingQuote.id).includes("MOCK") &&
          !String(existingQuote.id).startsWith("Q-8412") &&
          !String(existingQuote.id).startsWith("Q-6190")
        );

        if (isRealExistingQuote) {
          if (existingQuote.notes) {
            const rawNote = existingQuote.notes;
            const matchNote = rawNote.match(/📝 ملاحظات: (.*)/);
            setNotes(matchNote ? matchNote[1] : rawNote);
          }
          if (existingQuote.delivery_cost != null) {
            setDeliveryCost(String(existingQuote.delivery_cost));
          }
          if (existingQuote.delivery_days != null) {
            setDeliveryDays(String(existingQuote.delivery_days));
          }
          if (existingQuote.delivery_snapshot?.preparation_time) {
            const pt = existingQuote.delivery_snapshot.preparation_time;
            if (pt.days != null) setPrepDays(pt.days);
            if (pt.hours != null) setPrepHours(pt.hours);
            if (pt.minutes != null) setPrepMinutes(pt.minutes);
          }
        } else {
          // Strictly empty notes for new or first-time view by vendor
          setNotes("");
        }

        try {
          await supabase.from("rfq_views").upsert(
            { rfq_id: rfqId, vendor_id: user.id },
            { onConflict: "rfq_id,vendor_id", ignoreDuplicates: true }
          );
        } catch (viewErr) {
          console.warn("RFQ views warning:", viewErr);
        }

        const parsed = parseParts(rfqData.parts_description || "[]");
        setRfq(rfqData as RFQ);
        setItems(
          parsed.map((p, idx) => {
            const existingItem = isRealExistingQuote
              ? (existingQuote?.items?.find(
                  (it: any) =>
                    it.part_name === p.partName ||
                    (it.part_number && p.partNumber && it.part_number === p.partNumber)
                ) || existingQuote?.items?.[idx])
              : null;

            // Pricing fields MUST be strictly empty strings for new quote submissions
            const origPrice = existingItem?.original_price ? String(existingItem.original_price) : "";
            const commPrice = existingItem?.commercial_price ? String(existingItem.commercial_price) : "";
            const commBrand = existingItem?.commercial_brand || p.commercialBrand || "";
            const selType = existingItem?.part_type || (p.partType === "commercial" ? "commercial" : "original");

            return {
              ...p,
              selectedType: (selType || "original") as
                | "original"
                | "commercial"
                | "both"
                | "unavailable",
              original_price: origPrice,
              commercial_price: commPrice,
              commercial_brand: commBrand,
              availability: existingItem?.availability || (selType === "unavailable" ? "unavailable" : "available"),
              image_file: null,
              image_url: existingItem?.image_url || null,
            };
          })
        );
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error loading quote data:", err);
        setError("تعذر تحميل بيانات الطلب، يرجى التحديث.");
        setIsLoading(false);
      }
    }
    load();
  }, [rfqId]);

  // Handle Original Price input
  const updateOriginalPrice = (idx: number, val: string) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const newOrig = val;
        const commVal = it.commercial_price;
        const hasOrig = parseFloat(newOrig) > 0;
        const hasComm = parseFloat(commVal) > 0;

        let newType: "original" | "commercial" | "both" | "unavailable" = "unavailable";
        if (hasOrig && hasComm) newType = "both";
        else if (hasOrig) newType = "original";
        else if (hasComm) newType = "commercial";

        return {
          ...it,
          original_price: newOrig,
          selectedType: newType,
          availability: newType === "unavailable" ? "unavailable" : "available",
        };
      })
    );
  };

  // Handle Commercial Price input
  const updateCommercialPrice = (idx: number, val: string) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const newComm = val;
        const origVal = it.original_price;
        const hasOrig = parseFloat(origVal) > 0;
        const hasComm = parseFloat(newComm) > 0;

        let newType: "original" | "commercial" | "both" | "unavailable" = "unavailable";
        if (hasOrig && hasComm) newType = "both";
        else if (hasOrig) newType = "original";
        else if (hasComm) newType = "commercial";

        return {
          ...it,
          commercial_price: newComm,
          selectedType: newType,
          availability: newType === "unavailable" ? "unavailable" : "available",
        };
      })
    );
  };

  const updateCommercialBrand = (idx: number, val: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, commercial_brand: val } : it)));
  };

  const toggleUnavailable = (idx: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const currentlyUnavailable = it.selectedType === "unavailable";
        if (currentlyUnavailable) {
          // Re-enable
          return {
            ...it,
            selectedType: "original",
            availability: "available",
          };
        } else {
          // Mark unavailable
          return {
            ...it,
            selectedType: "unavailable",
            original_price: "",
            commercial_price: "",
            availability: "unavailable",
          };
        }
      })
    );
  };

  // Line total calculation for each item
  const getItemLineTotal = (it: QuoteItem) => {
    if (it.selectedType === "unavailable") return 0;
    const origPrice = parseFloat(it.original_price) || 0;
    const commPrice = parseFloat(it.commercial_price) || 0;

    if (it.selectedType === "original") return origPrice * it.quantity;
    if (it.selectedType === "commercial") return commPrice * it.quantity;
    if (it.selectedType === "both") {
      const effectivePrice = origPrice > 0 ? origPrice : commPrice;
      return effectivePrice * it.quantity;
    }
    const effectivePrice = origPrice > 0 ? origPrice : commPrice;
    return effectivePrice * it.quantity;
  };

  // Smart dual financial calculations
  const originalSubtotal = items.reduce((sum, it) => {
    if (it.selectedType === "unavailable") return sum;
    const p = parseFloat(it.original_price) || 0;
    return sum + p * it.quantity;
  }, 0);

  const commercialSubtotal = items.reduce((sum, it) => {
    if (it.selectedType === "unavailable") return sum;
    const p = parseFloat(it.commercial_price) || 0;
    return sum + p * it.quantity;
  }, 0);

  const hasOriginalPrices = originalSubtotal > 0;
  const hasCommercialPrices = commercialSubtotal > 0;
  const hasBothPriceTypes = hasOriginalPrices && hasCommercialPrices;

  const partsSubtotal = hasOriginalPrices
    ? originalSubtotal
    : hasCommercialPrices
    ? commercialSubtotal
    : 0;

  const deliveryCostNum = parseFloat(deliveryCost) || 0;

  // Platform Fees & VAT Calculations:
  // 1. Client Fee: Added to parts subtotal before VAT
  const clientCommissionAmount = Number(((partsSubtotal * clientFeeRate) / 100).toFixed(2));
  const commissionAmount = clientCommissionAmount; // Compatibility alias
  // 2. Vendor Fee: Deducted from vendor dues without altering the parts price shown to client
  const vendorFeeAmount = Number(((partsSubtotal * vendorFeeRate) / 100).toFixed(2));
  const vendorNetParts = Math.max(0, Number((partsSubtotal - vendorFeeAmount).toFixed(2)));
  // 3. 15% VAT strictly on parts subtotal
  const taxAmount = Number(((partsSubtotal * taxRate) / 100).toFixed(2));
  const vendorNetDues = Number((vendorNetParts + taxAmount).toFixed(2));
  const grandTotal = Number((partsSubtotal + clientCommissionAmount + taxAmount + deliveryCostNum).toFixed(2));

  const originalClientFee = Number(((originalSubtotal * clientFeeRate) / 100).toFixed(2));
  const originalVendorFee = Number(((originalSubtotal * vendorFeeRate) / 100).toFixed(2));
  const originalVendorNet = Math.max(0, Number((originalSubtotal - originalVendorFee).toFixed(2)));
  const originalCommission = originalClientFee;
  const originalTaxAmount = Number(((originalSubtotal * taxRate) / 100).toFixed(2));
  // Vendor quote total is parts subtotal + 15% VAT on parts (e.g. 100 + 15 = 115 SAR)
  const originalTotalWithTax = Number((originalSubtotal + originalTaxAmount).toFixed(2));
  const originalGrandTotal = originalSubtotal > 0 ? Number((originalTotalWithTax + deliveryCostNum).toFixed(2)) : 0;

  const commercialClientFee = Number(((commercialSubtotal * clientFeeRate) / 100).toFixed(2));
  const commercialVendorFee = Number(((commercialSubtotal * vendorFeeRate) / 100).toFixed(2));
  const commercialVendorNet = Math.max(0, Number((commercialSubtotal - commercialVendorFee).toFixed(2)));
  const commercialCommission = commercialClientFee;
  const commercialTaxAmount = Number(((commercialSubtotal * taxRate) / 100).toFixed(2));
  // Commercial quote total is parts subtotal + 15% VAT on parts
  const commercialTotalWithTax = Number((commercialSubtotal + commercialTaxAmount).toFixed(2));
  const commercialGrandTotal = commercialSubtotal > 0 ? Number((commercialTotalWithTax + deliveryCostNum).toFixed(2)) : 0;

  const copyVin = () => {
    if (rfq?.vin) {
      navigator.clipboard.writeText(rfq.vin);
      setVinCopied(true);
      setTimeout(() => setVinCopied(false), 2000);
    }
  };

  const getFormattedPrepTime = (d: number, h: number, m: number) => {
    const parts = [];
    if (d > 0) parts.push(`${d} ${d === 1 ? "يوم" : d === 2 ? "يومان" : d <= 10 ? "أيام" : "يوماً"}`);
    if (h > 0) parts.push(`${h} ${h === 1 ? "ساعة" : h === 2 ? "ساعتان" : h <= 10 ? "ساعات" : "ساعة"}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? "دقيقة" : m === 2 ? "دقيقتان" : m <= 10 ? "دقائق" : "دقيقة"}`);

    if (parts.length === 0) return "جاهز للتسليم الفوري";
    return parts.join(" و ");
  };

  const handleOpenPrepModal = () => {
    const availableItems = items.filter(
      (it) =>
        it.selectedType !== "unavailable" &&
        (parseFloat(it.original_price) > 0 || parseFloat(it.commercial_price) > 0)
    );

    if (availableItems.length === 0) {
      setError("يرجى إدخال سعر واحد على الأقل (أصلي أو تجاري) لقطعة متوفرة قبل المتابعة");
      return;
    }
    setError(null);
    setShowPrepTimeModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowPrepTimeModal(false);
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!rfq) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        user = {
          id: (vendorProfile as any)?.id || "vendor-demo-id",
          email: "vendor@rfqsa.tech",
          user_metadata: { role: "vendor", full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة" },
        } as any;
      }

      const availableItems = items.filter(
        (it) =>
          it.selectedType !== "unavailable" &&
          (parseFloat(it.original_price) > 0 || parseFloat(it.commercial_price) > 0)
      );

      if (availableItems.length === 0) {
        setError("يرجى إدخال سعر واحد على الأقل (أصلي أو تجاري) لقطعة متوفرة");
        setIsSubmitting(false);
        return;
      }

      const uploadedItems = await Promise.all(
        items.map(async (it) => {
          let image_url = it.image_url;
          if (it.image_file && typeof window !== "undefined") {
            try {
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve(it.image_url || "");
                reader.readAsDataURL(it.image_file as File);
              });
              const b64 = await base64Promise;
              if (b64) image_url = b64;
            } catch (e) {
              console.warn("Image conversion fallback:", e);
            }
          }

          const origPrice = parseFloat(it.original_price) || 0;
          const commPrice = parseFloat(it.commercial_price) || 0;
          const hasOrig = origPrice > 0;
          const hasComm = commPrice > 0;

          let finalType: "original" | "commercial" | "both" | "unavailable" = "unavailable";
          if (hasOrig && hasComm) finalType = "both";
          else if (hasOrig) finalType = "original";
          else if (hasComm) finalType = "commercial";

          const unitPriceToUse = hasOrig ? origPrice : hasComm ? commPrice : 0;

          return {
            part_name: it.partName,
            part_number: it.partNumber,
            part_type: finalType,
            original_price: origPrice,
            commercial_price: commPrice,
            commercial_brand: it.commercial_brand || null,
            quantity: it.quantity,
            unit_price: finalType === "unavailable" ? 0 : unitPriceToUse,
            line_total: getItemLineTotal(it),
            availability: finalType === "unavailable" ? "unavailable" : "available",
            image_url: image_url || null,
          };
        })
      );

      // Final Centralized Delivery Verification & Frozen Snapshot Creation
      let finalCalc;
      try {
        finalCalc = calculateDeliveryCost({
          source_city: (vendorProfile as any)?.city || (vendorProfile as any)?.national_address || "الرياض",
          source_coords:
            (vendorProfile as any)?.latitude && (vendorProfile as any)?.longitude
              ? {
                  latitude: Number((vendorProfile as any).latitude),
                  longitude: Number((vendorProfile as any).longitude),
                }
              : null,
          destination_city: rfq.delivery_city,
          destination_coords:
            rfq.delivery_latitude && rfq.delivery_longitude
              ? {
                  latitude: Number(rfq.delivery_latitude),
                  longitude: Number(rfq.delivery_longitude),
                }
              : null,
          destination_location_text: rfq.delivery_location,
        });
      } catch (errCalc) {
        console.warn("Delivery calculation fallback:", errCalc);
        finalCalc = { delivery_fee_net: 25, estimated_days: 1, distance_km: 10, is_cross_city: false, rule_id: "default" } as any;
      }

      let deliverySnapshot = null;
      try {
        deliverySnapshot = createDeliverySnapshot(finalCalc as any, {
          source_city: (vendorProfile as any)?.city || (vendorProfile as any)?.national_address || "الرياض",
          destination_city: rfq.delivery_city,
          destination_coords:
            rfq.delivery_latitude && rfq.delivery_longitude
              ? {
                  latitude: Number(rfq.delivery_latitude),
                  longitude: Number(rfq.delivery_longitude),
                }
              : null,
        });
      } catch (errSnap) {
        console.warn("Delivery snapshot fallback:", errSnap);
      }

      const rfqExtraDetails = parseRFQExtraDetails(rfq.parts_description, rfq.delivery_location);
      const rfqFulfillment = (rfq as any).fulfillment_method || rfqExtraDetails.fulfillmentMethod;
      const rfqDeliveryMethod = (rfq as any).delivery_method || (rfq as any).delivery_type || rfqExtraDetails.deliveryMethod;

      let isPickupOrder = false;
      if (rfqFulfillment === "DELIVERY" || rfqDeliveryMethod === "delivery" || rfqDeliveryMethod === "shipping") {
        isPickupOrder = false;
      } else if (
        rfqFulfillment === "SELF_PICKUP" ||
        rfqFulfillment === "BRANCH_PICKUP" ||
        rfqDeliveryMethod === "pickup" ||
        (rfq as any).is_pickup === true ||
        (rfq as any).pickup_branch ||
        (rfq as any).pickup_branch_id
      ) {
        isPickupOrder = true;
      }

      const verifiedDeliveryCost = isPickupOrder ? 0 : (finalCalc?.delivery_fee_net && finalCalc.delivery_fee_net > 0 ? finalCalc.delivery_fee_net : (Number(deliveryCost) > 0 ? Number(deliveryCost) : 25));
      const verifiedClientFee = Number(((partsSubtotal * clientFeeRate) / 100).toFixed(2));
      const verifiedVendorFee = Number(((partsSubtotal * vendorFeeRate) / 100).toFixed(2));
      const verifiedCommission = verifiedClientFee;
      const verifiedTax = Number(((partsSubtotal * taxRate) / 100).toFixed(2));
      const vendorQuoteTotal = Number((partsSubtotal + verifiedTax).toFixed(2));
      const verifiedGrandTotal = Number((partsSubtotal + verifiedClientFee + verifiedTax + verifiedDeliveryCost).toFixed(2));

      const prepTimeText = getFormattedPrepTime(prepDays, prepHours, prepMinutes);
      const calculatedPrepDays = Math.max(1, prepDays + (prepHours > 0 || prepMinutes > 0 ? 1 : 0));

      const combinedNotes = [
        `⏱️ مدة التجهيز: ${prepTimeText}`,
        notes ? `📝 ملاحظات: ${notes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const quotePayload = {
        id: existingQuoteId || undefined,
        rfq_id: rfq.id,
        vendor_id: user?.id || "vendor-demo-id",
        total_price: vendorQuoteTotal,
        quote_total: vendorQuoteTotal,
        parts_subtotal: partsSubtotal,
        client_platform_fee_percent: clientFeeRate,
        client_platform_fee: verifiedClientFee,
        vendor_platform_fee_percent: vendorFeeRate,
        vendor_platform_fee: verifiedVendorFee,
        platform_commission: verifiedClientFee,
        platform_commission_percent: clientFeeRate,
        tax_amount: verifiedTax,
        vat_percent: taxRate,
        delivery_days: calculatedPrepDays,
        delivery_cost: verifiedDeliveryCost,
        delivery_snapshot: {
          ...(deliverySnapshot || {}),
          preparation_time: {
            days: prepDays,
            hours: prepHours,
            minutes: prepMinutes,
            text: prepTimeText,
          },
        },
        notes: combinedNotes,
        items: uploadedItems,
      };

      // 1. Direct Server API Call
      try {
        await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quotePayload),
        });
      } catch (e) {
        console.warn("Direct quotes API post error:", e);
      }

      // 2. Local Client State update
      try {
        await supabase.from("quotes").insert(quotePayload);
      } catch (e) {
        console.warn("Supabase local quote insert error:", e);
      }

      try {
        await supabase.from("rfqs").update({ status: "quoted" }).eq("id", rfq.id);
      } catch (e) {}

      setShowPrepTimeModal(false);
      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (fatalErr: any) {
      console.error("Quote submission error:", fatalErr);
      setError("حدث خطأ أثناء إرسال العرض: " + (fatalErr?.message || "يرجى المحاولة مرة أخرى"));
      setIsSubmitting(false);
      setShowPrepTimeModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm font-black text-slate-700">جاري تحميل بيانات الطلب والقطع...</p>
        </div>
      </div>
    );
  }

  if (isUnauthorizedBrand && rfq) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="bg-white rounded-3xl border border-red-200/90 p-6 sm:p-8 max-w-lg w-full text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
            <Ban className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              غير مصرح بالوصول لهذا الطلب 🔒
            </span>
            <h2 className="text-xl font-black text-slate-900 pt-1">
              طلب تسعير خارج نطاق تخصصك المعتمد
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              هذا الطلب مخصص لمركبة من ماركة <strong className="text-slate-900 font-bold font-mono">({rfq.car_make || "غير محدد"})</strong>، ولا يقع ضمن ماركات السيارات المسجلة في تخصص حسابك.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 font-medium">
            وفق ضوابط المنصة لحماية جودة التسعير، يُسمح للموردين فقط بالتسعير على ماركات تخصصهم الموثقة.
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Button
              onClick={() => router.push("/vendor/orders")}
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              العودة لطلبات تخصصي
            </Button>
            <Link
              href="/vendor/profile#brands"
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center justify-center border border-slate-200"
            >
              إدارة ماركات تخصصي
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!rfq) return null;

  const extra = parseRFQExtraDetails(rfq.parts_description, rfq.delivery_location);
  const locationLabel = rfq.delivery_city
    ? `${rfq.delivery_city}${rfq.delivery_location ? ` - ${rfq.delivery_location}` : ""}`
    : rfq.delivery_location || "—";

  const shortId = rfq.id.slice(0, 8).toUpperCase();
  const pricedCount = items.filter(
    (it) => parseFloat(it.original_price) > 0 || parseFloat(it.commercial_price) > 0
  ).length;

  const isExpired = Boolean(
    rfq &&
      (rfq.status === "closed" ||
        rfq.status === "cancelled" ||
        rfq.status === "completed" ||
        Date.now() >
          (rfq.expires_at
            ? new Date(rfq.expires_at).getTime()
            : new Date(new Date(rfq.created_at || Date.now()).getTime() + (rfq.expiry_hours || 48) * 3600 * 1000).getTime()))
  );

  const remainingTimeText = (() => {
    if (!rfq) return "";
    const expiryDate = rfq.expires_at
      ? new Date(rfq.expires_at)
      : new Date(new Date(rfq.created_at || Date.now()).getTime() + (rfq.expiry_hours || 48) * 3600 * 1000);
    const diffMs = expiryDate.getTime() - Date.now();
    if (diffMs <= 0) return "انتهت الصلاحية";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remH = hours % 24;
      return `${days} يوم و ${remH} س متبقية`;
    }
    return `${hours} س ${mins} د متبقية`;
  })();

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
      
      {/* ────────────────── 1. LUXURY TOP NAVIGATION HEADER ────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Right: Back & Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-all hover:scale-105 shadow-2xs cursor-pointer shrink-0"
              title="الرجوع للرادار والطلبات"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight shrink-0">
                  تقديم تسعيرة جديدة
                </h1>

                {extra.isUrgent && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full animate-pulse shrink-0">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>عاجل جداً 🔥</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-normal hidden sm:block mt-0.5">
                أدخل سعر القطعة في خانة الأصلي أو التجاري (أو كليهما معاً) مباشرة بكل سهولة
              </p>
            </div>
          </div>

          {/* Left: Dedicated Delivery Card Chip & Order Number & Countdown */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Live Countdown Badge synced with Admin Settings */}
            <RfqCardTimer
              createdAt={rfq.created_at || new Date().toISOString()}
              expiresAt={rfq.expires_at || undefined}
              status={rfq.status}
              className="px-3 py-1.5 rounded-xl text-xs font-black"
            />

            {extra.deliveryMethod === "pickup" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 text-xs font-bold shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-amber-700 block font-bold leading-none mb-0.5">طريقة الاستلام</span>
                  <span className="font-black text-xs text-amber-950">استلام من الفرع 🏬</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200/90 text-xs font-bold shadow-2xs max-w-[200px] sm:max-w-xs md:max-w-sm">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="text-right min-w-0">
                  <span className="text-[9px] text-slate-400 block font-bold leading-none mb-0.5">عنوان وجهة التوصيل</span>
                  <span className="font-black text-xs text-slate-800 truncate block" title={extra.deliveryLocation || locationLabel}>
                    {extra.deliveryLocation || locationLabel}
                  </span>
                </div>
              </div>
            )}

            {/* Order Number Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black shadow-2xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>طلب رقم: #{shortId}</span>
            </span>
          </div>

        </div>
      </header>

      {/* ────────────────── MAIN CONTENT CONTAINER ────────────────── */}
      <div className="w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Expiration Banner Warning */}
        {isExpired && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-900 shadow-2xs">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-black text-sm">انتهت صلاحية طلب التسعير</h3>
              <p className="text-xs text-rose-700 mt-0.5">
                عذراً، لقد انتهت المدة الزمنية المحددة لاستقبال العروض لهذا الطلب وتم إغلاقه. تم تعطيل إرسال أو تعديل العروض.
              </p>
            </div>
          </div>
        )}

        {/* ────────────────── 2. FULL-WIDTH VEHICLE SPECIFICATIONS HERO CARD (تصميم مدمج وخلفية فاتحة) ────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden w-full">
          
          {/* Header Bar — Light & Compact */}
          <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100/80 border border-blue-200/60 text-blue-700 flex items-center justify-center">
                <Car className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black text-slate-800">بيانات ومواصفات المركبة المطلوبة</h2>
                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                  <span>مركبة معتمدة</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                طلب رقم: #{shortId}
              </span>
            </div>
          </div>

          {/* Body Content: 4 Compact Columns */}
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Box 1: Make & Model */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">ماركة وموديل السيارة</span>
                  <div className="w-6 h-6 rounded-md bg-blue-100/70 text-blue-700 flex items-center justify-center">
                    <Car className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-black text-slate-900 leading-tight">
                    {rfq.car_make} {rfq.car_model}
                  </p>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/50 inline-block mt-0.5">
                    طراز معتمد وموثق
                  </span>
                </div>
              </div>

              {/* Box 2: Year */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">سنة الصنع / الموديل</span>
                  <div className="w-6 h-6 rounded-md bg-amber-100/70 text-amber-700 flex items-center justify-center">
                    <Calendar className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-base font-mono font-black text-slate-900 leading-tight">
                    {rfq.car_year || "—"}
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 inline-block mt-0.5">
                    سنة تصنيع المركبة
                  </span>
                </div>
              </div>

              {/* Box 3: Saudi License Plate */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">رقم اللوحة السعودية</span>
                  <div className="w-6 h-6 rounded-md bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                    <Award className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900 font-mono leading-tight">
                      {rfq.plate_number || "—"}
                    </p>
                    <span className="text-[9px] font-bold text-emerald-700 inline-block mt-0.5">
                      لوحة مسجلة
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-black bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 shadow-2xs">
                    🇸🇦 KSA
                  </span>
                </div>
              </div>

              {/* Box 4: VIN with 1-Click Copy */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">رقم الهيكل (VIN)</span>
                  <div className="w-6 h-6 rounded-md bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
                    <Hash className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono font-black text-slate-900 truncate" title={rfq.vin || ""}>
                      {rfq.vin || "غير متوفر"}
                    </p>
                    <span className="text-[9px] font-bold text-indigo-600 inline-block mt-0.5">
                      مطابقة دقيقة
                    </span>
                  </div>
                  {rfq.vin && (
                    <button
                      onClick={copyVin}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-200/70 border border-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                      title="نسخ رقم الهيكل"
                    >
                      {vinCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">تم</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-600" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ────────────────── 3. FULL-WIDTH PARTS PRICING TABLE (بكامل الصفحة - خلفية بيضاء نقية) ────────────────── */}
        <div className="bg-white rounded-3xl overflow-hidden w-full">
          
          {/* Table Header Toolbar */}
          <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>جدول تسعير القطع المطلوبة</span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {items.length} قطعة
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  أدخل سعر القطعة في خانة الأصلي أو التجاري مباشرة، وسيتم اعتماد الخيار تلقائياً
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>القطع المسعّرة: <strong className="text-emerald-700 font-mono text-sm">{pricedCount}</strong> / {items.length}</span>
              </span>
            </div>
          </div>

          {/* Full-width Responsive Table */}
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-right border-collapse text-xs bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black text-slate-700 select-none">
                  <th className="py-3.5 px-3 text-center w-12">#</th>
                  <th className="py-3.5 px-3 text-center w-20">معرض الصور</th>
                  <th className="py-3.5 px-4 min-w-[200px]">اسم القطعة والمواصفات</th>
                  <th className="py-3.5 px-3 text-center w-16">الكمية</th>
                  
                  {/* Column: Status & Action */}
                  <th className="py-3.5 px-3 text-center w-28 border-r border-slate-200/80">حالة التوفر والإجراء</th>

                  {/* Column: Part Type */}
                  <th className="py-3.5 px-3 text-center w-32">نوع القطعة</th>

                  {/* Column: Unit Price */}
                  <th className="py-3.5 px-4 text-center min-w-[280px]">سعر القطعة</th>

                  {/* Column: Line Total */}
                  <th className="py-3.5 px-4 text-left w-36">الإجمالي</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((it, idx) => {
                  const lineTotal = getItemLineTotal(it);
                  const hasImages = Boolean(it.images && it.images.length > 0);
                  const firstImg = hasImages && it.images ? it.images[0] : it.imagePathname;
                  const thumb =
                    firstImg?.startsWith("http") || firstImg?.startsWith("data:")
                      ? firstImg
                      : firstImg
                      ? `/api/file?pathname=${encodeURIComponent(firstImg)}`
                      : null;

                  const hasOrigPrice = parseFloat(it.original_price) > 0;
                  const hasCommPrice = parseFloat(it.commercial_price) > 0;
                  const isUnavailable = it.selectedType === "unavailable";

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors align-middle ${
                        isUnavailable
                          ? "bg-slate-50/80 opacity-60"
                          : hasOrigPrice && hasCommPrice
                          ? "bg-emerald-50/15 hover:bg-emerald-50/25"
                          : hasOrigPrice
                          ? "bg-blue-50/10 hover:bg-blue-50/20"
                          : hasCommPrice
                          ? "bg-amber-50/10 hover:bg-amber-50/20"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      {/* 1. Index */}
                      <td className="py-4 px-3 text-center font-mono font-bold text-slate-400 align-middle">
                        {idx + 1}
                      </td>

                      {/* 2. Image Gallery Cell */}
                      <td className="py-3 px-3 text-center align-middle">
                        {hasImages && it.images && it.images.length > 0 ? (
                          (() => {
                            const count = it.images.length;
                            return (
                              <div
                                className="relative inline-block group/thumb cursor-pointer"
                                onClick={() =>
                                  setVendorGalleryPart({
                                    partName: it.partName,
                                    partNumber: it.partNumber,
                                    images: it.images || [],
                                    activeIndex: 0,
                                  })
                                }
                                title="انقر لفتح معرض صور القطعة بالكامل"
                              >
                                {count > 1 && (
                                  <div className="absolute -top-1 -right-1 w-11 h-11 rounded-xl bg-blue-500/20 rotate-6 transition-transform group-hover/thumb:rotate-12" />
                                )}

                                <div
                                  className={`relative w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border-2 transition-all shadow-xs ${
                                    count > 1
                                      ? "border-blue-500"
                                      : "border-slate-200 group-hover/thumb:border-blue-400"
                                  }`}
                                >
                                  {thumb && (
                                    <img
                                      src={thumb}
                                      alt={it.partName}
                                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                    <Eye className="w-4 h-4 text-white" />
                                  </div>
                                </div>

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
                          <div className="w-11 h-11 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                            <Images className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* 3. Part Name & Number */}
                      <td className="py-3 px-4 align-middle">
                        <p className="text-xs font-black text-slate-900 leading-tight">
                          {it.partName || "قطعة غيار"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {it.partNumber ? (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                              OEM: {it.partNumber}
                            </span>
                          ) : null}

                          {it.commercialBrand ? (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                              طلب العميل: {it.commercialBrand}
                            </span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => toggleUnavailable(idx)}
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                              isUnavailable
                                ? "bg-slate-800 text-white hover:bg-slate-700"
                                : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                          >
                            {isUnavailable ? "إلغاء استبعاد القطعة" : "✕ غير متوفر لدي"}
                          </button>
                        </div>
                      </td>

                      {/* 4. Quantity */}
                      <td className="py-3 px-3 text-center align-middle">
                        <span className="inline-block px-3 py-1 rounded-xl bg-slate-100 font-mono font-black text-slate-800 text-xs border border-slate-200">
                          {it.quantity}
                        </span>
                      </td>

                      {/* 5. Status & Action Column (Stacked Horizontal Tier) */}
                      <td className="py-3 px-3 border-r border-slate-100">
                        <div className="flex flex-col gap-2.5">
                          {/* Row 1: Original Status */}
                          <div className="h-10 flex items-center justify-center">
                            {hasOrigPrice && !isUnavailable ? (
                              <span className="w-full h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>متوفر</span>
                              </span>
                            ) : (
                              <span className="w-full h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-200 text-xs font-semibold flex items-center justify-center">
                                <span>غير متوفر</span>
                              </span>
                            )}
                          </div>

                          {/* Row 2: Commercial Status */}
                          <div className="h-10 flex items-center justify-center">
                            {hasCommPrice && !isUnavailable ? (
                              <span className="w-full h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>متوفر</span>
                              </span>
                            ) : (
                              <span className="w-full h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-200 text-xs font-semibold flex items-center justify-center">
                                <span>غير متوفر</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 6. Part Type Column (Stacked Horizontal Tier) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-2.5">
                          {/* Row 1: Original */}
                          <div className="h-10 flex items-center justify-center">
                            <span
                              className={`w-full h-10 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                                hasOrigPrice
                                  ? "bg-emerald-50/90 border-emerald-300 text-emerald-950 font-black shadow-xs"
                                  : "bg-slate-50/90 border-slate-200 text-slate-700"
                              }`}
                            >
                              <ShieldCheck className={`w-3.5 h-3.5 ${hasOrigPrice ? "text-emerald-600" : "text-slate-400"}`} />
                              <span>أصلي</span>
                            </span>
                          </div>

                          {/* Row 2: Commercial */}
                          <div className="h-10 flex items-center justify-center">
                            <span
                              className={`w-full h-10 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                                hasCommPrice
                                  ? "bg-amber-50/90 border-amber-300 text-amber-950 font-black shadow-xs"
                                  : "bg-slate-50/90 border-slate-200 text-slate-700"
                              }`}
                            >
                              <Tag className={`w-3.5 h-3.5 ${hasCommPrice ? "text-amber-600" : "text-slate-400"}`} />
                              <span>تجاري</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 7. Price Input Column (Stacked Horizontal Tier) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2.5">
                          {/* Row 1: Original Price Input */}
                          <div className="h-10 flex items-center relative">
                            <div className="relative w-full">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                disabled={isUnavailable}
                                value={it.original_price}
                                onChange={(e) => updateOriginalPrice(idx, e.target.value)}
                                placeholder="أدخل سعر الأصلي"
                                className="w-full h-10 pl-9 pr-3 bg-white border-2 border-slate-200 focus:border-blue-500 focus:bg-blue-50/20 rounded-xl text-center text-xs font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded pointer-events-none">
                                ر.س
                              </span>
                              {hasOrigPrice && !isUnavailable && (
                                <button
                                  type="button"
                                  onClick={() => updateOriginalPrice(idx, "")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 flex items-center justify-center text-[10px] cursor-pointer"
                                  title="مسح سعر الأصلي"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Commercial Price Input + Brand Input */}
                          <div className="h-10 flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                disabled={isUnavailable}
                                value={it.commercial_price}
                                onChange={(e) => updateCommercialPrice(idx, e.target.value)}
                                placeholder="أدخل سعر التجاري"
                                className="w-full h-10 pl-9 pr-3 bg-white border-2 border-slate-200 focus:border-amber-500 focus:bg-amber-50/20 rounded-xl text-center text-xs font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-700 bg-amber-50 px-1 py-0.5 rounded pointer-events-none">
                                ر.س
                              </span>
                              {hasCommPrice && !isUnavailable && (
                                <button
                                  type="button"
                                  onClick={() => updateCommercialPrice(idx, "")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 flex items-center justify-center text-[10px] cursor-pointer"
                                  title="مسح سعر التجاري"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Commercial Brand input */}
                            <input
                              type="text"
                              disabled={isUnavailable}
                              value={it.commercial_brand}
                              onChange={(e) => updateCommercialBrand(idx, e.target.value)}
                              placeholder="اسم الماركة (مثال: Denso)"
                              className="w-32 sm:w-40 h-10 px-2.5 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-center text-[10px] font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none shadow-2xs disabled:bg-slate-100 disabled:border-slate-200 transition-all"
                            />
                          </div>
                        </div>
                      </td>

                      {/* 8. Line Total Column (Stacked Horizontal Tier) */}
                      <td className="py-3 px-4 text-left font-mono text-xs">
                        <div className="flex flex-col gap-2.5 items-end">
                          {/* Row 1: Original Line Total */}
                          <div className="h-10 flex items-center justify-end">
                            {hasOrigPrice && !isUnavailable ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                <span>{(parseFloat(it.original_price) * it.quantity).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>
                                <span className="font-sans text-[10px] text-slate-600 font-bold">ر.س</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-sans font-bold px-3">—</span>
                            )}
                          </div>

                          {/* Row 2: Commercial Line Total */}
                          <div className="h-10 flex items-center justify-end">
                            {hasCommPrice && !isUnavailable ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                <span>{(parseFloat(it.commercial_price) * it.quantity).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>
                                <span className="font-sans text-[10px] text-slate-600 font-bold">ر.س</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-sans font-bold px-3">—</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Table Toolbar */}
          <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                القطع المسعّرة: <strong className="text-emerald-700 font-mono font-black text-sm">{pricedCount}</strong> من أصل{" "}
                <strong className="text-slate-900 font-mono font-black text-sm">{items.length}</strong> قطعة
              </span>
            </div>

            {/* Live Automatic Totals */}
            <div className="flex flex-wrap items-center gap-3">
              {originalSubtotal > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-950 shadow-2xs">
                  <span className="text-[11px] font-bold text-blue-700">إجمالي الأصلي (شامل الضريبة 15%):</span>
                  <span className="font-mono font-black text-sm text-blue-950">
                    {originalTotalWithTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-blue-600">ر.س</span>
                </div>
              )}

              {commercialSubtotal > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-700">إجمالي التجاري (شامل الضريبة 15%):</span>
                  <span className="font-mono font-black text-sm text-amber-950">
                    {commercialTotalWithTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-amber-600">ر.س</span>
                </div>
              )}

              {originalSubtotal === 0 && commercialSubtotal === 0 && (
                <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs">
                  <span>الإجمالي:</span>
                  <span className="font-mono font-bold text-slate-500">0.00 ر.س</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ────────────────── 4. ULTRA-CLEAN COMMERCIAL SUMMARY & SUBMIT PANEL (Vibrant & Harmonious Theme) ────────────────── */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border-2 border-emerald-200/70 bg-gradient-to-br from-[#f0fdf9] via-[#f8fafc] to-[#eff6ff] shadow-sm space-y-6">
          
          {/* Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100/80 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 ring-4 ring-emerald-100/80">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-emerald-950">ملخص العرض التجاري</h3>
                <p className="text-xs text-emerald-800/80 font-medium">
                  مراجعة مجموع تسعير القطع وإضافة ملاحظات وضمان العرض قبل الإرسال
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-900 bg-white/95 px-4 py-2 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center gap-2 backdrop-blur-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>القطع المسعّرة: <strong className="text-emerald-700 font-mono text-sm">{pricedCount}</strong> من أصل {items.length}</span>
            </span>
          </div>

          {/* Dual Cards + Notes + Submit Layout */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Right: Original & Commercial Totals Cards */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-4 justify-between">
              
              {/* Card 1: Original OEM Total */}
              <div className={`flex-1 p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between shadow-xs ${
                originalSubtotal > 0
                  ? "bg-gradient-to-br from-white via-white to-blue-50/60 border-blue-300 ring-2 ring-blue-500/10"
                  : "bg-white border-blue-100/80"
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-blue-100/70">
                  <div className="flex items-center gap-2 text-blue-950 font-black text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>إجمالي الأصلي (OEM):</span>
                  </div>
                  {originalSubtotal > 0 ? (
                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                      ✓ مسعّر
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-50/50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      غير مسعّر
                    </span>
                  )}
                </div>

                {/* Tax Breakdown Rows & Net Dues Breakdown */}
                <div className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                    <span>قيمة قطع الغيار:</span>
                    <span className="font-mono text-slate-800 font-black">
                      {originalSubtotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px] bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                    <span>رسوم المنصة المخصومة من مستحقاتك ({vendorFeeRate}%):</span>
                    <span className="font-mono text-emerald-950 font-black">
                      -{originalVendorFee.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 font-bold text-[11px] pr-2">
                    <span>↳ صافي مستحقات القطع لك:</span>
                    <span className="font-mono text-emerald-800 font-black">
                      {originalVendorNet.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-blue-700 font-bold text-[11px]">
                    <span>ضريبة القيمة المضافة ({taxRate}% على القطع):</span>
                    <span className="font-mono text-blue-900 font-black">
                      +{originalTaxAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                </div>

                {/* Grand Total incl. Commission & VAT */}
                <div className="pt-2.5 border-t border-blue-100/80 flex items-center justify-between bg-blue-50/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3.5 sm:p-4 rounded-b-2xl">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-blue-950">إجمالي العرض شامل الضريبة:</span>
                    <span className="text-[9px] text-blue-600 font-medium">قيمة القطع شامل ضريبة القيمة المضافة ({taxRate}%)</span>
                  </div>
                  <div className="flex items-baseline gap-1 text-blue-950 font-mono font-black text-xl sm:text-2xl">
                    <span>{originalTotalWithTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs font-sans font-bold text-blue-700">ر.س</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Commercial Total */}
              <div className={`flex-1 p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between shadow-xs ${
                commercialSubtotal > 0
                  ? "bg-gradient-to-br from-white via-white to-amber-50/60 border-amber-300 ring-2 ring-amber-500/10"
                  : "bg-white border-amber-100/80"
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-amber-100/70">
                  <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
                    <Tag className="w-4 h-4 text-amber-600" />
                    <span>إجمالي التجاري / البديل:</span>
                  </div>
                  {commercialSubtotal > 0 ? (
                    <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                      ✓ مسعّر
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-50/50 px-2.5 py-0.5 rounded-full border border-amber-100">
                      غير مسعّر
                    </span>
                  )}
                </div>

                {/* Tax Breakdown Rows */}
                <div className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                    <span>قيمة قطع الغيار:</span>
                    <span className="font-mono text-slate-800 font-black">
                      {commercialSubtotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px] bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                    <span>رسوم المنصة المخصومة من مستحقاتك ({vendorFeeRate}%):</span>
                    <span className="font-mono text-emerald-950 font-black">
                      -{commercialVendorFee.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 font-bold text-[11px] pr-2">
                    <span>↳ صافي مستحقات القطع لك:</span>
                    <span className="font-mono text-emerald-800 font-black">
                      {commercialVendorNet.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-amber-700 font-bold text-[11px]">
                    <span>ضريبة القيمة المضافة ({taxRate}% على القطع):</span>
                    <span className="font-mono text-amber-900 font-black">
                      +{commercialTaxAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                </div>

                {/* Grand Total incl. Commission & VAT */}
                <div className="pt-2.5 border-t border-amber-100/80 flex items-center justify-between bg-amber-50/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3.5 sm:p-4 rounded-b-2xl">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-amber-950">إجمالي العرض شامل الضريبة:</span>
                    <span className="text-[9px] text-amber-600 font-medium">قيمة القطع شامل ضريبة القيمة المضافة ({taxRate}%)</span>
                  </div>
                  <div className="flex items-baseline gap-1 text-amber-950 font-mono font-black text-xl sm:text-2xl">
                    <span>{commercialTotalWithTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs font-sans font-bold text-amber-700">ر.س</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Left: Notes & Terms Textarea + Submit Action */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4 bg-white rounded-2xl p-5 sm:p-6 border-2 border-emerald-100/90 shadow-xs">
              <div className="space-y-2">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>ملاحظات وضمان العرض للعميل (اختياري):</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: الضمان 6 أشهر، القطع أصلية وكالة داخل الكرتون المعتمد، توفر فوري..."
                  rows={3}
                  className="w-full bg-emerald-50/30 hover:bg-white focus:bg-white border border-emerald-200/80 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 rounded-2xl p-3.5 text-xs text-slate-800 placeholder:text-emerald-900/40 shadow-2xs resize-none transition-all outline-none leading-relaxed"
                />
              </div>

              {/* Error prompt if any */}
              {error && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleOpenPrepModal}
                disabled={isSubmitting || pricedCount === 0 || isExpired}
                className={`w-full h-13 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2.5 shadow-lg ${
                  isExpired
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white shadow-emerald-500/25 hover:shadow-emerald-500/35 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{hasExistingQuote ? "جاري تحديث العرض..." : "جاري إرسال العرض..."}</span>
                  </>
                ) : isExpired ? (
                  <>
                    <Ban className="w-5 h-5 text-slate-500" />
                    <span>انتهت صلاحية طلب التسعير (مغلق)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{hasExistingQuote ? "تحديث وتأكيد العرض للعميل 🚀" : "إرسال وتأكيد العرض للعميل 🚀"}</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ────────────────── ORDER PREPARATION DURATION MODAL ────────────────── */}
      {showPrepTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right flex flex-col scale-100 animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">مدة تجهيز وتوفير الطلب</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    حدد الوقت المتوقع لتجهيز القطع وتسليمها لأسطول / مندوب التوصيل
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPrepTimeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Steppers for Days / Hours / Minutes */}
              <div className="grid grid-cols-3 gap-3.5">
                
                {/* 1. Days */}
                <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>الأيام</span>
                  </div>
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setPrepDays((p) => Math.max(0, p - 1))}
                      disabled={prepDays <= 0}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-base flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={prepDays}
                      onChange={(e) => setPrepDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 h-8 bg-white border border-slate-200 rounded-xl text-center font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPrepDays((p) => p + 1)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-base flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Hours */}
                <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>الساعات</span>
                  </div>
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setPrepHours((p) => Math.max(0, p - 1))}
                      disabled={prepHours <= 0}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-base flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={prepHours}
                      onChange={(e) => setPrepHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-12 h-8 bg-white border border-slate-200 rounded-xl text-center font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPrepHours((p) => Math.min(23, p + 1))}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-base flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Minutes */}
                <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <Timer className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الدقائق</span>
                  </div>
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setPrepMinutes((p) => Math.max(0, p - 15))}
                      disabled={prepMinutes <= 0}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-base flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={15}
                      value={prepMinutes}
                      onChange={(e) => setPrepMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-12 h-8 bg-white border border-slate-200 rounded-xl text-center font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPrepMinutes((p) => Math.min(59, p + 15))}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-base flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 block">خيارات سريعة ومقترحة:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "⚡ فوري (30 دقيقة)", d: 0, h: 0, m: 30 },
                    { label: "⏱️ خلال ساعتين", d: 0, h: 2, m: 0 },
                    { label: "📦 نفس اليوم (4 ساعات)", d: 0, h: 4, m: 0 },
                    { label: "📅 خلال 24 ساعة", d: 1, h: 0, m: 0 },
                    { label: "🚛 خلال يومين", d: 2, h: 0, m: 0 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrepDays(preset.d);
                        setPrepHours(preset.h);
                        setPrepMinutes(preset.m);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        prepDays === preset.d && prepHours === preset.h && prepMinutes === preset.m
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Formatted Summary Box */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-4 h-4" strokeWidth={3} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 block">الوقت المعتمد لتجهيز العرض:</span>
                  <span className="text-sm font-black text-emerald-950">
                    {getFormattedPrepTime(prepDays, prepHours, prepMinutes)}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="w-full sm:flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-md shadow-emerald-600/20 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{hasExistingQuote ? "جاري تحديث العرض..." : "جاري إرسال العرض..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{hasExistingQuote ? "تأكيد وتحديث العرض نهائياً 🚀" : "تأكيد وإرسال العرض نهائياً 🚀"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPrepTimeModal(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 h-12 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                رجوع للتسعير
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Vendor Part Images Lightbox Modal */}
      <VendorGalleryModal
        isOpen={Boolean(vendorGalleryPart)}
        partName={vendorGalleryPart?.partName || ""}
        partNumber={vendorGalleryPart?.partNumber}
        images={vendorGalleryPart?.images || []}
        initialIndex={vendorGalleryPart?.activeIndex || 0}
        onClose={() => setVendorGalleryPart(null)}
      />

      {/* ────────────────── SUCCESS NOTIFICATION POPUP (2 SECONDS) ────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-7 sm:p-8 max-w-md w-full shadow-2xl border border-emerald-100 text-center relative overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Glowing Top Aura */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Animated Icon */}
              <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-5 animate-pulse">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl font-black text-slate-900 mb-2">
                {hasExistingQuote ? "تم تحديث عرض السعر بنجاح! 🚀" : "تم تقديم عرض السعر بنجاح! 🎉"}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mb-6">
                تم إرسال تسعيرتك للعميل وحفظ تفاصيل القطع والتجهيز، جاري تحويلك تلقائياً إلى صفحة الطلبات...
              </p>

              {/* Order Info Badge */}
              <div className="w-full bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 mb-6 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">طلب رقم: <span className="font-mono text-emerald-800 font-black">#{rfq?.id}</span></span>
                <span className="font-black text-emerald-700 font-mono text-sm">{grandTotal.toLocaleString("ar-SA")} ر.س</span>
              </div>

              {/* 2-Second Progress Bar */}
              <div className="w-full space-y-2">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full"
                    style={{
                      width: `${successProgress}%`,
                      transition: "width 2000ms linear",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                  <span>جاري التوجيه للطلبات...</span>
                  <span className="font-mono text-emerald-600">2s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
