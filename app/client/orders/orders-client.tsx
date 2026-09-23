"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  RefreshCw,
  Car,
  MapPin,
  FileText,
  CalendarDays,
  ArrowLeft,
  Truck,
  Package,
  ClipboardList,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  XCircle,
  ShieldCheck,
  KeyRound,
  ChevronRight,
  ChevronLeft,
  Eye,
  Trash2,
  AlertCircle,
  MoreHorizontal,
  Edit3,
  Copy,
  SlidersHorizontal,
  User,
  Phone,
  Check,
  FileSpreadsheet,
  Tag,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { exportOrdersToExcel } from "@/lib/excel-export";
import { getEffectiveOrderStatus, syncOrderStatusUpdate } from "@/lib/order-status-sync";
import { CarBrandLogo } from "@/components/car-brand-logo";
import { RfqCardTimer } from "@/components/rfq-card-timer";
import { ReactivateSuccessModal } from "@/components/reactivate-success-modal";

/* ────────────────────────────────────────────── Types */
export interface RFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number?: string;
  vin?: string;
  parts_description?: string;
  delivery_location?: string;
  delivery_city?: string;
  status: string;
  created_at: string;
  expires_at?: string;
  quotes?: {
    count: number;
    id?: string;
    vendor_id?: string;
    total_price?: number;
    delivery_days?: number;
    status?: string;
    profiles?: { full_name?: string; company_name?: string; phone?: string };
  }[];
}

export interface Order {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  rfq_id?: string;
  parts_description?: string;
  order_items?: any[];
  rfqs?: {
    id?: string;
    car_make: string;
    car_model: string;
    car_year: number;
    plate_number?: string;
    vin?: string;
    parts_description?: string;
    delivery_location?: string;
    delivery_city?: string;
  };
  profiles?: { full_name?: string; company_name?: string; phone?: string };
  vendor?: { full_name?: string; company_name?: string; phone?: string };
  deals?: { id: string; status: string; deal_items?: any[] }[];
}

export type FilterMode = "all" | "rfq" | "active" | "completed" | "closed";

export interface UnifiedTableRow {
  rawId: string;
  displayId: string;
  itemType: "rfq" | "order";
  carMake: string;
  carModel: string;
  carYear: number | string;
  plateNumber: string;
  vin: string;
  partsText: string;
  partsCount: number;
  imagePathname?: string;
  deliveryLocation?: string;
  isUrgent?: boolean;
  rfqType?: string;
  targetVendorName?: string;
  recipientName?: string;
  recipientPhone?: string;
  quotesCount: number;
  amount: number | null;
  formattedDate: string;
  createdAtRaw: string;
  status: string;
  targetUrl: string;
  isPickup?: boolean;
  rawRfq?: RFQ;
  rawOrder?: Order;
}

interface ColumnConfig {
  id: string;
  label: string;
}

const TABLE_COLUMNS_CONFIG: ColumnConfig[] = [
  { id: "id", label: "رقم الطلب / النوع" },
  { id: "vehicle", label: "المركبة والموديل" },
  { id: "plate", label: "اللوحة / الهيكل" },
  { id: "quotes", label: "العروض / المبلغ" },
  { id: "date", label: "التاريخ" },
  { id: "status", label: "الحالة" },
  { id: "details", label: "التفاصيل وموقع التسليم" },
  { id: "actions", label: "الإجراءات" },
];

/* ────────────────────────────────────────────── Helpers */
function getPartsSummary(parts_description?: string): {
  count: number;
  text: string;
  imagePathname?: string;
  isUrgent?: boolean;
  rfqType?: string;
  targetVendorName?: string;
  deliveryLocation?: string;
  recipientName?: string;
  recipientPhone?: string;
} {
  if (!parts_description) return { count: 0, text: "قطع غيار ورش وصيانة" };
  try {
    const parsed = JSON.parse(parts_description);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const item0 = parsed[0] || {};
      const names = parsed
        .map((p: Record<string, unknown>) => p.partName || p.part_name || p.name || p.title)
        .filter(Boolean);
      return {
        count: parsed.length,
        text: names.join(" ، ") || "قطع غيار مركبات",
        imagePathname: (Array.isArray(item0.images) && item0.images[0]) || item0.imagePathname || item0.image_pathname || item0.imagePreview || item0.image_url,
        isUrgent: item0.isUrgent,
        rfqType: item0.rfqType,
        targetVendorName: item0.targetVendorName,
        deliveryLocation: item0.deliveryLocation || item0.delivery_location,
        recipientName: item0.recipientName || item0.recipient_name,
        recipientPhone: item0.recipientPhone || item0.recipient_phone,
      };
    }
  } catch {
    if (typeof parts_description === "string" && parts_description.trim()) {
      return { count: 1, text: parts_description };
    }
  }
  return { count: 0, text: "قطع غيار مركبات" };
}

const COMPLETED_STATUSES = ["completed", "closed", "received"];
const CANCELLED_STATUSES = ["cancelled", "rejected", "expired"];

function formatRemainingTime(expiresAtStr?: string, createdAtStr?: string, hours = 48) {
  const expiryDate = expiresAtStr
    ? new Date(expiresAtStr)
    : new Date(new Date(createdAtStr || Date.now()).getTime() + hours * 3600 * 1000);

  const diffMs = expiryDate.getTime() - Date.now();
  if (diffMs <= 0) {
    return { isExpired: true, text: "انتهت الصلاحية" };
  }

  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const minsRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursRemaining > 24) {
    const days = Math.floor(hoursRemaining / 24);
    const remH = hoursRemaining % 24;
    return { isExpired: false, text: `${days} يوم و ${remH} س متبقية` };
  }

  return { isExpired: false, text: `${hoursRemaining} س ${minsRemaining} د متبقية` };
}

function getUnifiedStatusConfig(itemType: "rfq" | "order", status: string, isPickup?: boolean): {
  label: string;
  badgeClass: string;
  dotClass: string;
  accentClass: string;
  Icon: typeof Clock;
} {
  if (itemType === "rfq") {
    switch (status) {
      case "quoted":
        return {
          label: "تم تقديم عروض",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
          dotClass: "bg-blue-500",
          accentClass: "from-blue-500 to-indigo-500",
          Icon: FileText,
        };
      case "accepted":
        return {
          label: "تم القبول",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          dotClass: "bg-emerald-500",
          accentClass: "from-emerald-500 to-teal-500",
          Icon: CheckCircle2,
        };
      case "closed":
        return {
          label: "مغلق",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200/80",
          dotClass: "bg-slate-400",
          accentClass: "from-slate-400 to-slate-600",
          Icon: XCircle,
        };
      case "cancelled":
      case "expired":
        return {
          label: "ملغي (انتهاء المهلة)",
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
          dotClass: "bg-rose-500",
          accentClass: "from-rose-400 to-rose-600",
          Icon: XCircle,
        };
      case "open":
      default:
        return {
          label: "بانتظار العروض",
          badgeClass: "bg-amber-50/90 text-amber-900 border-amber-300/80 hover:bg-amber-100/70",
          dotClass: "bg-amber-500 animate-pulse",
          accentClass: "from-amber-500 to-orange-500",
          Icon: Clock,
        };
    }
  } else {
    if (isPickup) {
      switch (status) {
        case "preparing":
        case "processing":
          return {
            label: "جاري التجهيز بالفرع",
            badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
            dotClass: "bg-amber-500",
            accentClass: "from-amber-500 to-orange-500",
            Icon: Clock,
          };
        case "ready":
        case "ready_for_pickup":
          return {
            label: "جاهز بالفرع 🏬",
            badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80",
            dotClass: "bg-teal-500",
            accentClass: "from-teal-500 to-emerald-500",
            Icon: Package,
          };
        case "completed":
        case "picked_up":
        case "delivered":
        case "received":
          return {
            label: "تم الاستلام ✅",
            badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
            dotClass: "bg-emerald-500",
            accentClass: "from-emerald-500 to-green-600",
            Icon: CheckCircle2,
          };
        case "cancelled":
          return {
            label: "أمر ملغي",
            badgeClass: "bg-red-50 text-red-700 border-red-200/80",
            dotClass: "bg-red-500",
            accentClass: "from-red-400 to-red-600",
            Icon: XCircle,
          };
        case "confirmed":
        case "pending":
        default:
          return {
            label: "بانتظار تجهيز المورد",
            badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
            dotClass: "bg-amber-500",
            accentClass: "from-amber-500 to-orange-500",
            Icon: Clock,
          };
      }
    } else {
      switch (status) {
        case "preparing":
          return {
            label: "تم التجهيز",
            badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
            dotClass: "bg-amber-500",
            accentClass: "from-amber-500 to-orange-500",
            Icon: Clock,
          };
        case "ready":
          return {
            label: "تم التجهيز",
            badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
            dotClass: "bg-blue-500",
            accentClass: "from-blue-500 to-cyan-500",
            Icon: Package,
          };
        case "shipped":
          return {
            label: "تم الشحن",
            badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
            dotClass: "bg-indigo-500",
            accentClass: "from-indigo-500 to-blue-600",
            Icon: Truck,
          };
        case "delivered":
          return {
            label: "جاري التسليم",
            badgeClass: "bg-teal-50 text-teal-700 border-teal-200/80",
            dotClass: "bg-teal-500",
            accentClass: "from-teal-500 to-emerald-500",
            Icon: CheckCircle2,
          };
        case "completed":
          return {
            label: "تأكيد واستلام",
            badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
            dotClass: "bg-emerald-500",
            accentClass: "from-emerald-500 to-green-600",
            Icon: CheckCircle2,
          };
        case "cancelled":
          return {
            label: "أمر ملغي",
            badgeClass: "bg-red-50 text-red-700 border-red-200/80",
            dotClass: "bg-red-500",
            accentClass: "from-red-400 to-red-600",
            Icon: XCircle,
          };
        case "pending":
        default:
          return {
            label: "قيد الانتظار",
            badgeClass: "bg-slate-100 text-slate-700 border-slate-200/80",
            dotClass: "bg-slate-400",
            accentClass: "from-slate-400 to-slate-600",
            Icon: Clock,
          };
      }
    }
  }
}

/* ────────────────────────────────────────────── Image Modal Lightbox */
function ImageLightboxModal({
  imagePathname,
  onClose,
}: {
  imagePathname: string | null;
  onClose: () => void;
}) {
  const fallbackSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='350' viewBox='0 0 500 350'><rect width='500' height='350' rx='20' fill='%230f172a'/><rect x='20' y='20' width='460' height='310' rx='16' fill='%231e293b' stroke='%23334155' stroke-width='2'/><circle cx='250' cy='150' r='65' fill='%232563eb' opacity='0.15'/><path d='M210 150 A40 40 0 0 1 290 150 A40 40 0 0 1 210 150 Z' fill='none' stroke='%2338bdf8' stroke-width='6'/><path d='M170 230 L330 230' stroke='%2310b981' stroke-width='8' stroke-linecap='round'/><text x='250' y='275' font-family='sans-serif' font-size='18' font-weight='bold' fill='%23f8fafc' text-anchor='middle'>معاينة صورة قطعة الغيار المرفقة</text><text x='250' y='300' font-family='sans-serif' font-size='13' fill='%2394a3b8' text-anchor='middle'>صورة القطعة المرفقة في الطلب</text></svg>";

  const [imgSrc, setImgSrc] = useState<string>(imagePathname || fallbackSvg);

  useEffect(() => {
    if (imagePathname) setImgSrc(imagePathname);
  }, [imagePathname]);

  if (!imagePathname) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl p-2.5 max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 dir-rtl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-full flex-1 flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden min-h-[300px] p-2">
          <img
            src={imgSrc}
            onError={() => setImgSrc(fallbackSvg)}
            alt="صورة القطعة المرفقة"
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />
        </div>
        <div className="p-3 text-center text-xs font-bold text-slate-700 border-t border-slate-100 mt-2 flex items-center justify-center gap-2">
          <span>📷 معاينة صورة قطعة الغيار المرفقة</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── Confirmation Delete Modal */
function ConfirmDeleteModal({
  rfqId,
  displayId,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  rfqId: string;
  displayId: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl text-right dir-rtl">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-slate-900">تأكيد حذف طلب التسعير</h3>
          <p className="text-xs text-slate-500">
            هل أنت متأكد من حذف الطلب رقم <span dir="ltr" className="font-mono font-bold text-slate-800">{displayId}</span>؟
          </p>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl h-10 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl h-10 text-xs bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                جاري الحذف...
              </>
            ) : (
              "حذف الطلب"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ClientOrdersClient({
  rfqs,
  orders,
  durationMinutes = 20,
}: {
  rfqs: RFQ[];
  orders: Order[];
  durationMinutes?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Initialize mode from URL param (?tab=...) or sessionStorage
  const [mode, setModeState] = useState<FilterMode>("all");
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore active tab on mount
  useEffect(() => {
    const tabParam = searchParams?.get("tab") as FilterMode | null;
    if (tabParam && ["all", "rfq", "active", "completed", "closed"].includes(tabParam)) {
      setModeState(tabParam);
    } else if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("client_orders_tab") as FilterMode | null;
      if (saved && ["all", "rfq", "active", "completed", "closed"].includes(saved)) {
        setModeState(saved);
        const params = new URLSearchParams(window.location.search);
        params.set("tab", saved);
        window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      }
    }
    setIsInitialized(true);
  }, []);

  // Mode setter that syncs URL query params and sessionStorage
  const setMode = useCallback(
    (newMode: FilterMode) => {
      setModeState(newMode);
      setCurrentPage(1);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("client_orders_tab", newMode);
        const params = new URLSearchParams(window.location.search);
        if (newMode === "all") {
          params.delete("tab");
        } else {
          params.set("tab", newMode);
        }
        const queryStr = params.toString();
        const newUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
        window.history.replaceState(null, "", newUrl);
      }
    },
    [pathname]
  );

  // Sync state if user navigates with browser Back/Forward
  useEffect(() => {
    if (!isInitialized) return;
    const tabParam = searchParams?.get("tab") as FilterMode | null;
    const targetMode =
      tabParam && ["all", "rfq", "active", "completed", "closed"].includes(tabParam)
        ? tabParam
        : "all";
    if (targetMode !== mode) {
      setModeState(targetMode);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("client_orders_tab", targetMode);
      }
    }
  }, [searchParams, isInitialized]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusVersion, setStatusVersion] = useState(0);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [localRfqs, setLocalRfqs] = useState<RFQ[]>(rfqs);

  useEffect(() => {
    setLocalRfqs(rfqs);
  }, [rfqs]);

  const [reactivatedModalData, setReactivatedModalData] = useState<{
    displayId: string;
    durationMinutes: number;
    carName?: string;
  } | null>(null);

  // Live status synchronization for multi-portal real-time updates
  const [liveStatuses, setLiveStatuses] = useState<Record<string, { status: string; courier_status: string }>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchLiveSync = async () => {
      try {
        const res = await fetch("/api/v1/orders?live_sync=1", {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.statuses) {
            setLiveStatuses(data.statuses);
          }
        }
      } catch {}
    };

    fetchLiveSync();
    const interval = setInterval(fetchLiveSync, 2500);

    const handleSync = () => {
      setStatusVersion((v) => v + 1);
      fetchLiveSync();
      router.refresh();
    };

    window.addEventListener("rfq_data_changed", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("rfq_data_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [router]);

  // Handler to reactivate an expired or cancelled RFQ
  const handleReactivateRfq = async (rfqId: string, displayId: string) => {
    try {
      setReactivatingId(rfqId);
      const res = await fetch(`/api/rfqs/${rfqId}/reactivate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "تعذر إعادة تنشيط الطلب");
      }

      const nowIso = new Date().toISOString();
      const newDuration = data.durationMinutes || durationMinutes;
      const expiresAtIso = data.expiresAt || new Date(Date.now() + newDuration * 60 * 1000).toISOString();

      // Persist in client storage cache for instant resilience across page reloads
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `rfq_reactivated_${rfqId}`,
            JSON.stringify({
              created_at: nowIso,
              expires_at: expiresAtIso,
              status: "open",
            })
          );
        } catch {}
      }

      // Update local state IMMEDIATELY (0ms UI latency!)
      setLocalRfqs((prev) =>
        prev.map((r) =>
          r.id === rfqId
            ? {
                ...r,
                status: "open",
                created_at: nowIso,
                expires_at: expiresAtIso,
                cancellation_reason: null,
              }
            : r
        )
      );

      // Find car title for the modal
      const targetRfq = localRfqs.find((r) => r.id === rfqId);
      const carTitle = targetRfq ? `${targetRfq.car_make || ""} ${targetRfq.car_model || ""}`.trim() : undefined;

      // Switch tab to active RFQs
      setMode("rfq");
      setCurrentPage(1);
      setStatusVersion((v) => v + 1);

      // Open the beautiful custom modal window (replaces native browser alert)
      setReactivatedModalData({
        displayId,
        durationMinutes: newDuration,
        carName: carTitle,
      });

      window.dispatchEvent(new Event("rfq_data_changed"));
      router.refresh();
    } catch (err: any) {
      console.error("Reactivate error:", err);
      alert(`❌ خطأ: ${err.message || "حدث خطأ أثناء إعادة تنشيط الطلب"}`);
    } finally {
      setReactivatingId(null);
    }
  };

  // Listen for real-time status updates across tabs/pages
  useEffect(() => {
    const handleStatusSync = () => {
      setStatusVersion((v) => v + 1);
    };
    window.addEventListener("rfq_data_changed", handleStatusSync);
    window.addEventListener("storage", handleStatusSync);
    return () => {
      window.removeEventListener("rfq_data_changed", handleStatusSync);
      window.removeEventListener("storage", handleStatusSync);
    };
  }, []);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [selectedVehicleModal, setSelectedVehicleModal] = useState<{
    make: string;
    model: string;
    year: string | number;
    plate: string;
    vin: string;
    displayId: string;
  } | null>(null);
  const [copiedVin, setCopiedVin] = useState(false);
  const [deleteModalTarget, setDeleteModalTarget] = useState<{ id: string; displayId: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);



  // Column Visibility Controller State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    id: true,
    vehicle: true,
    plate: true,
    quotes: true,
    date: true,
    status: true,
    actions: true,
    details: true,
  });

  // Determine if active view should be Cards or Table based on tab:
  // - "rfq" and "active" are Cards (كروت)
  // - "all", "completed", "closed" are Table (جدول)
  const isCardsView = mode === "rfq" || mode === "active";
  const ITEMS_PER_PAGE = isCardsView ? 12 : 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDeleteRfq = async (rfqId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/rfqs/${rfqId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message ||
          (data?.error === "HAS_ORDER"
            ? "لا يمكن حذف طلب تسعير مرتبط بطلب نشط"
            : "حدث خطأ أثناء حذف الطلب");
        alert(msg);
        console.error("[v0] RFQ delete failed:", data);
        return;
      }
      setDeleteModalTarget(null);
      router.refresh();
    } catch (err) {
      alert("حدث خطأ أثناء حذف الطلب");
      console.error("[v0] RFQ delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const fmtCurrency = (n: number) =>
    n.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Map RFQs & Orders to Unified Rows
  const allRows: UnifiedTableRow[] = useMemo(() => {
    const nowMs = Date.now();
    const durationMs = (durationMinutes || 20) * 60 * 1000;

    const rfqRows: UnifiedTableRow[] = localRfqs.map((rfq) => {
      const partsSummary = getPartsSummary(rfq.parts_description);
      const shortId = rfq.id.slice(0, 8).toUpperCase();
      const displayId = `#REQ-${shortId}`;
      const quotesCount = rfq.quotes?.[0]?.count ?? rfq.quotes?.length ?? 0;
      const lowestQuote = rfq.quotes?.[0]?.total_price || null;

      let rfqCreatedAt = rfq.created_at;
      let rfqExpiresAt = rfq.expires_at;
      let rfqRawStatus = rfq.status || "open";

      const hasLinkedOrder = orders.some(
        (o) => o.rfq_id === rfq.id || o.id === `ORD-${rfq.id.replace(/\D+/g, "")}` || (o.deals && o.deals.some((d: any) => d.id === rfq.id))
      );

      // If accepted or has an order, permanently mark as accepted and remove from open RFQs
      if (rfq.status === "accepted" || hasLinkedOrder) {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(`rfq_reactivated_${rfq.id}`);
          } catch {}
        }
        rfqRawStatus = "accepted";
      } else if (typeof window !== "undefined") {
        // Check client-side reactivation cache only for truly pending rfqs
        try {
          const cached = localStorage.getItem(`rfq_reactivated_${rfq.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.created_at && parsed.expires_at) {
              const expMs = new Date(parsed.expires_at).getTime();
              if (Date.now() < expMs) {
                rfqCreatedAt = parsed.created_at;
                rfqExpiresAt = parsed.expires_at;
                rfqRawStatus = "open";
              }
            }
          }
        } catch {}
      }

      // Check live expiration dynamically against admin duration
      const createdAtMs = new Date(rfqCreatedAt || nowMs).getTime();
      const targetExpiryMs = rfqExpiresAt ? new Date(rfqExpiresAt).getTime() : (createdAtMs + durationMs);
      const isTimeExpired = nowMs >= targetExpiryMs || (nowMs - createdAtMs >= durationMs + 1000);
      const isExpired = rfqRawStatus === "cancelled" || rfqRawStatus === "expired" || rfqRawStatus === "closed" || (rfqRawStatus === "open" && isTimeExpired);
      const effectiveStatus = rfqRawStatus === "accepted" ? "accepted" : (isExpired ? "cancelled" : rfqRawStatus);

      const isPickupRfq = Boolean(
        (rfq as any).fulfillment_method === "BRANCH_PICKUP" ||
        (rfq as any).fulfillment_method === "pickup" ||
        (rfq as any).fulfillment_method === "SELF_PICKUP" ||
        (rfq as any).delivery_method === "pickup" ||
        (rfq as any).delivery_type === "pickup" ||
        (rfq as any).is_pickup === true ||
        (rfq as any).pickup_branch ||
        String(rfq.delivery_location || partsSummary.deliveryLocation || "").includes("فرع") ||
        String(rfq.delivery_location || partsSummary.deliveryLocation || "").includes("استلام")
      );

      return {
        rawId: rfq.id,
        displayId: displayId,
        itemType: "rfq",
        carMake: rfq.car_make || "غير محدد",
        carModel: rfq.car_model || "غير محدد",
        carYear: rfq.car_year || "—",
        plateNumber: rfq.plate_number || "—",
        vin: rfq.vin || "—",
        partsText: partsSummary.text,
        partsCount: partsSummary.count,
        imagePathname: partsSummary.imagePathname,
        deliveryLocation: rfq.delivery_location || partsSummary.deliveryLocation,
        isUrgent: partsSummary.isUrgent,
        rfqType: partsSummary.rfqType,
        targetVendorName: partsSummary.targetVendorName,
        recipientName: partsSummary.recipientName,
        recipientPhone: partsSummary.recipientPhone,
        quotesCount: quotesCount,
        amount: lowestQuote,
        formattedDate: new Date(rfqCreatedAt).toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        createdAtRaw: rfqCreatedAt,
        status: effectiveStatus,
        targetUrl: `/client/rfq/${rfq.id}`,
        isPickup: isPickupRfq,
        rawRfq: {
          ...rfq,
          created_at: rfqCreatedAt,
          expires_at: rfqExpiresAt,
          status: effectiveStatus,
        },
      };
    });

    const orderRows: UnifiedTableRow[] = orders.map((order) => {
      const cleanId = order.id.replace(/^ORD-/, "").slice(0, 8).toUpperCase();
      const displayId = `#ORD-${cleanId}`;
      const dealId = order.deals?.[0]?.id || order.id;

      // 1. Resolve RFQ object (handling array or object from Supabase)
      const rfqObj = Array.isArray(order.rfqs) ? (order.rfqs[0] || {}) : (order.rfqs || {});
      const matchedRfq = localRfqs.find((r) => r.id === order.rfq_id || r.id === (rfqObj as any)?.id);
      const mergedRfq: any = { ...(matchedRfq || {}), ...(rfqObj || {}) };

      // 2. Resolve parts description from order, linked rfqs, or localRfqs
      const rawPartsDesc =
        order.parts_description ||
        mergedRfq.parts_description ||
        order.rfqs?.parts_description;

      const partsSummary = getPartsSummary(rawPartsDesc);

      let resolvedPartsText = partsSummary.text;

      // 3. If generic or empty, try order_items or deal_items
      if (!rawPartsDesc || resolvedPartsText === "قطع غيار ورش وصيانة" || resolvedPartsText === "قطع غيار مركبات") {
        const items = (order as any).order_items || (order as any).items || (order as any).deals?.[0]?.deal_items;
        if (Array.isArray(items) && items.length > 0) {
          const names = items.map((it: any) => it.part_name || it.partName || it.name || it.title).filter(Boolean);
          if (names.length > 0) {
            resolvedPartsText = names.join(" ، ");
          }
        }
      }

      // 4. If still empty or default, craft a dedicated descriptive label for the vehicle
      if (!resolvedPartsText || resolvedPartsText === "قطع غيار ورش وصيانة" || resolvedPartsText === "قطع غيار مركبات" || resolvedPartsText === "قطع غيار أمر شراء معتمد") {
        const make = mergedRfq.car_make || order.rfqs?.car_make;
        const model = mergedRfq.car_model || order.rfqs?.car_model;
        if (make && model) {
          resolvedPartsText = `قطع غيار صيانة معتمدة لـ ${make} ${model}`;
        } else {
          resolvedPartsText = "قطع غيار أمر شراء معتمد";
        }
      }

      const deliveryLoc =
        mergedRfq.delivery_location ||
        (order as any).delivery_location ||
        (order as any).pickup_location ||
        partsSummary.deliveryLocation ||
        "الرياض";

      const isPickupOrder = Boolean(
        (order as any).fulfillment_method === "BRANCH_PICKUP" ||
        (order as any).fulfillment_method === "pickup" ||
        (order as any).fulfillment_method === "SELF_PICKUP" ||
        (order as any).fulfillment_type === "BRANCH_PICKUP" ||
        (order as any).shipping_method === "pickup" ||
        (order as any).delivery_method === "pickup" ||
        (order as any).delivery_type === "pickup" ||
        (order as any).is_pickup === true ||
        (order as any).pickup_branch ||
        (order as any).pickup_location ||
        mergedRfq.fulfillment_method === "BRANCH_PICKUP" ||
        mergedRfq.fulfillment_method === "SELF_PICKUP" ||
        mergedRfq.fulfillment_method === "pickup" ||
        mergedRfq.fulfillment_type === "BRANCH_PICKUP" ||
        mergedRfq.delivery_method === "pickup" ||
        mergedRfq.delivery_type === "pickup" ||
        mergedRfq.is_pickup === true ||
        (order.deals?.[0] as any)?.delivery_method === "pickup" ||
        String(deliveryLoc || "").includes("فرع") ||
        String(deliveryLoc || "").includes("استلام") ||
        String(deliveryLoc || "").includes("branch") ||
        String(deliveryLoc || "").includes("pickup") ||
        (Number((order as any).delivery_fee) === 0 && (order as any).delivery_fee !== null && (order as any).delivery_fee !== undefined && (String(deliveryLoc).includes("فرع") || String(deliveryLoc).includes("استلام")))
      );

      return {
        rawId: order.id,
        displayId: displayId,
        itemType: "order",
        carMake: mergedRfq.car_make || order.rfqs?.car_make || "غير محدد",
        carModel: mergedRfq.car_model || order.rfqs?.car_model || "غير محدد",
        carYear: mergedRfq.car_year || order.rfqs?.car_year || "—",
        plateNumber: mergedRfq.plate_number || order.rfqs?.plate_number || "—",
        vin: mergedRfq.vin || order.rfqs?.vin || "—",
        partsText: resolvedPartsText,
        partsCount: partsSummary.count > 0 ? partsSummary.count : 1,
        imagePathname: partsSummary.imagePathname,
        deliveryLocation: deliveryLoc,
        isUrgent: partsSummary.isUrgent || false,
        rfqType: partsSummary.rfqType || "public",
        targetVendorName: order.vendor?.company_name || order.profiles?.company_name,
        quotesCount: 1,
        amount: Number(order.total_price || 0),
        formattedDate: new Date(order.created_at).toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        createdAtRaw: order.created_at,
        status: (() => {
          const rawNum = String(order.id).replace(/\D+/g, "");
          const liveEntry =
            liveStatuses[order.id] ||
            liveStatuses[`ORD-${cleanId}`] ||
            liveStatuses[cleanId] ||
            (rawNum ? liveStatuses[`ORD-${rawNum}`] : null) ||
            (rawNum ? liveStatuses[rawNum] : null);

          const courierSt = String(liveEntry?.courier_status || (order as any).courier_status || "").toUpperCase();
          let serverOrderSt = liveEntry?.status || (order as any).status || "preparing";

          let effectiveComputedStatus = serverOrderSt;
          if (courierSt === "EN_ROUTE_DELIVERY" || courierSt === "ARRIVED_DELIVERY") {
            effectiveComputedStatus = "delivered";
          } else if (courierSt === "DELIVERED") {
            effectiveComputedStatus = serverOrderSt === "completed" ? "completed" : "delivered";
          } else if (courierSt === "PICKED_UP") {
            effectiveComputedStatus = "shipped";
          }

          const dealStatus = (order as any).deals?.[0]?.id
            ? getEffectiveOrderStatus((order as any).deals[0].id, (order as any).deals[0].status || "")
            : "";
          if (dealStatus === "completed" || dealStatus === "closed" || dealStatus === "received") {
            return dealStatus;
          }
          return getEffectiveOrderStatus(order.id, effectiveComputedStatus);
        })(),
        targetUrl: `/deal/${dealId}`,
        isPickup: isPickupOrder,
        rawOrder: order,
      };
    });

    return [...rfqRows, ...orderRows].sort(
      (a, b) => new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime()
    );
  }, [localRfqs, orders, statusVersion, durationMinutes, liveStatuses]);

  // Compute KPIs dynamically from allRows
  const activeOrdersCount = useMemo(
    () => allRows.filter((o) => o.itemType === "order" && !COMPLETED_STATUSES.includes(o.status)).length,
    [allRows]
  );

  const rfqCount = useMemo(
    () => allRows.filter((r) => r.itemType === "rfq" && r.status === "open").length,
    [allRows]
  );

  const completedCount = useMemo(
    () => allRows.filter((o) => o.itemType === "order" && COMPLETED_STATUSES.includes(o.status)).length,
    [allRows]
  );

  const closedCount = useMemo(
    () => allRows.filter((r) => r.status === "closed" || r.status === "expired" || r.status === "cancelled").length,
    [allRows]
  );

  // Filter Rows
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (mode === "rfq" && (row.itemType !== "rfq" || row.status !== "open")) return false;
      if (mode === "active") {
        const isActiveOrder = row.itemType === "order" && !COMPLETED_STATUSES.includes(row.status) && row.status !== "cancelled";
        if (!isActiveOrder) return false;
      }
      if (mode === "completed" && !COMPLETED_STATUSES.includes(row.status)) return false;
      if (mode === "closed" && (row.status !== "closed" && row.status !== "expired" && row.status !== "cancelled")) return false;

      const q = debouncedSearch.toLowerCase().trim();
      if (q) {
        const matchId = row.displayId.toLowerCase().includes(q) || row.rawId.toLowerCase().includes(q);
        const matchCar = `${row.carMake} ${row.carModel} ${row.carYear}`.toLowerCase().includes(q);
        const matchPlate = row.plateNumber.toLowerCase().includes(q);
        const matchVin = row.vin.toLowerCase().includes(q);
        const matchParts = row.partsText.toLowerCase().includes(q);
        if (!matchId && !matchCar && !matchPlate && !matchVin && !matchParts) return false;
      }

      // Date Range Matching
      if (dateRange && (dateRange.startDate || dateRange.endDate)) {
        const rowTime = new Date(row.createdAtRaw).getTime();
        if (dateRange.startDate) {
          const startTime = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
          if (rowTime < startTime) return false;
        }
        if (dateRange.endDate) {
          const endTime = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
          if (rowTime > endTime) return false;
        }
      }

      return true;
    });
  }, [allRows, mode, debouncedSearch, dateRange]);

  // Export to Excel Handler
  const handleExportExcel = async () => {
    if (filteredRows.length === 0) return;
    setIsExportingExcel(true);
    try {
      const exportData = filteredRows.map((r) => ({
        displayId: r.displayId,
        itemType: r.itemType,
        carMake: r.carMake,
        carModel: r.carModel,
        carYear: r.carYear,
        plateNumber: r.plateNumber,
        vin: r.vin,
        formattedDate: r.formattedDate,
        statusLabel: r.status,
        amountOrQuotes: r.itemType === "order" ? r.amount : `${r.quotesCount} عروض`,
        partsText: r.partsText,
        partyName: r.targetVendorName || "—",
        deliveryLocation: r.deliveryLocation || "الرياض",
      }));
      await exportOrdersToExcel(exportData, "طلبات_وعمليات_العميل_رفق");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, currentPage, ITEMS_PER_PAGE]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 pt-3 dir-rtl text-slate-900">
      {/* Lightbox Modal */}
      {selectedImageModal && (
        <ImageLightboxModal
          imagePathname={selectedImageModal}
          onClose={() => setSelectedImageModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalTarget && (
        <ConfirmDeleteModal
          rfqId={deleteModalTarget.id}
          displayId={deleteModalTarget.displayId}
          isDeleting={isDeleting}
          onConfirm={() => handleDeleteRfq(deleteModalTarget.id)}
          onCancel={() => setDeleteModalTarget(null)}
        />
      )}

      <div className="space-y-6 text-slate-900 pb-16 font-sans w-full">
        {/* Header Title & CTA Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-black text-slate-900 tracking-tight">إدارة الطلبات والعمليات</h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              متابعة وإدارة طلبات التسعير النشطة والأوامر التنفيذية في مكان واحد
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold gap-1 h-9 px-3 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>تحديث</span>
            </Button>

            <Link href="/client/new-rfq">
              <Button
                size="sm"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold gap-1.5 h-9 px-3.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>طلب عرض سعر جديد</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Dynamic Top KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: RFQs (طلبات التسعير) */}
          <div
            onClick={() => {
              setMode(mode === "rfq" ? "all" : "rfq");
              setCurrentPage(1);
            }}
            className={`cursor-pointer rounded-2xl p-4 relative overflow-hidden group transition-all duration-200 border ${
              mode === "rfq"
                ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-md scale-[1.01]"
                : "bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 border-amber-200/70 hover:border-amber-300 hover:shadow-2xs"
            }`}
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-start justify-between gap-2.5">
              <div className="space-y-1">
                <span className="text-[11px] font-black text-amber-950 tracking-tight flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>طلبات التسعير (RFQ)</span>
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
                  {rfqCount}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>في انتظار استقبال عروض الأسعار</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Card 2: Active Orders (الطلبات النشطة) */}
          <div
            onClick={() => {
              setMode(mode === "active" ? "all" : "active");
              setCurrentPage(1);
            }}
            className={`cursor-pointer rounded-2xl p-4 relative overflow-hidden group transition-all duration-200 border ${
              mode === "active"
                ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-md scale-[1.01]"
                : "bg-gradient-to-br from-blue-50/50 via-white to-blue-50/20 border-blue-200/70 hover:border-blue-300 hover:shadow-2xs"
            }`}
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="flex items-start justify-between gap-2.5">
              <div className="space-y-1">
                <span className="text-[11px] font-black text-blue-950 tracking-tight flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>الطلبات النشطة</span>
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
                  {activeOrdersCount + rfqCount}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-blue-700/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>طلبات وأوامر نشطة قيد التسعير والتنفيذ</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Card 3: Completed Orders (الطلبات المكتملة) */}
          <div
            onClick={() => {
              setMode(mode === "completed" ? "all" : "completed");
              setCurrentPage(1);
            }}
            className={`cursor-pointer rounded-2xl p-4 relative overflow-hidden group transition-all duration-200 border ${
              mode === "completed"
                ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md scale-[1.01]"
                : "bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 border-emerald-200/70 hover:border-emerald-300 hover:shadow-2xs"
            }`}
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-start justify-between gap-2.5">
              <div className="space-y-1">
                <span className="text-[11px] font-black text-emerald-950 tracking-tight flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الطلبات المكتملة</span>
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
                  {completedCount}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-700/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>أوامر تم استلامها وإغلاقها بنجاح</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Card 4: Closed / Cancelled Orders */}
          <div
            onClick={() => {
              setMode(mode === "closed" ? "all" : "closed");
              setCurrentPage(1);
            }}
            className={`cursor-pointer rounded-2xl p-4 relative overflow-hidden group transition-all duration-200 border ${
              mode === "closed"
                ? "bg-slate-100 border-slate-500 ring-2 ring-slate-500/20 shadow-md scale-[1.01]"
                : "bg-gradient-to-br from-slate-50/80 via-white to-slate-100/30 border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
            }`}
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
            <div className="flex items-start justify-between gap-2.5">
              <div className="space-y-1">
                <span className="text-[11px] font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>المغلقة والملغاة</span>
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
                  {closedCount}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>طلبات منتهية أو ملغاة</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-800 text-white shadow-md shadow-slate-500/20 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Tabs Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
          {/* Tabs Filter Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: "all", label: "الكل (جدول)", count: allRows.length },
              { key: "rfq", label: "طلبات التسعير (كروت)", count: rfqCount },
              { key: "active", label: "الطلبات النشطة (كروت)", count: activeOrdersCount + rfqCount },
              { key: "completed", label: "الطلبات المكتملة (جدول)", count: completedCount },
              { key: "closed", label: "الطلبات المغلقة والملغاة (جدول)", count: closedCount },
            ].map((tab) => {
              const active = mode === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setMode(tab.key as FilterMode);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                      active ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Inputs, Date Picker & Column Selector Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="ابحث برقم الطلب، رقم اللوحة، الموديل، VIN، أو اسم القطعة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 rounded-lg border-slate-200 bg-slate-50/50 text-[11px] text-slate-900 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Date Range & Time Frame Filter Dropdown */}
              <DateRangeFilter
                value={dateRange}
                onChange={(val) => {
                  setDateRange(val);
                  setCurrentPage(1);
                }}
              />

              {/* Column Visibility Selector (Select Dropdown) */}
              {!isCardsView && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-lg border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 hover:bg-white gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="التحكم في أعمدة الجدول"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                      <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                        {Object.values(visibleColumns).filter(Boolean).length}/{TABLE_COLUMNS_CONFIG.length}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 text-right dir-rtl p-2 rounded-xl shadow-xl border border-slate-200 bg-white z-50 space-y-1"
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 px-1">
                      <span className="text-[11px] font-black text-slate-800">الأعمدة المعروضة</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVisibleColumns({
                            id: true,
                            vehicle: true,
                            plate: true,
                            quotes: true,
                            date: true,
                            status: true,
                            actions: true,
                            details: true,
                          });
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-bold"
                      >
                        تحديد الكل
                      </button>
                    </div>

                    <div className="space-y-0.5 max-h-56 overflow-y-auto">
                      {TABLE_COLUMNS_CONFIG.map((col) => {
                        const isChecked = !!visibleColumns[col.id];
                        return (
                          <label
                            key={col.id}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setVisibleColumns((prev) => ({
                                  ...prev,
                                  [col.id]: !prev[col.id],
                                }));
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                            />
                            <span>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Excel Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExportingExcel || filteredRows.length === 0}
                className="h-9 px-3 rounded-lg border-emerald-200 bg-emerald-50/60 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 gap-1.5 cursor-pointer shadow-2xs shrink-0"
                title="تصدير نتائج الجدول إلى ملف Excel"
              >
                {isExportingExcel ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>تصدير إكسيل</span>
              </Button>

              {(searchQuery || dateRange || mode !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setDebouncedSearch("");
                    setDateRange(null);
                    setMode("all");
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2.5 text-[11px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer"
                >
                  إعادة ضبط
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────── MAIN CONTENT AREA ────────────────────────────────────────── */}

        {paginatedRows.length > 0 ? (
          <>
            {/* ── 1. CARDS GRID VIEW: Used ONLY for "طلبات التسعير" and "الطلبات النشطة" ── */}
            {isCardsView ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedRows.map((row) => {
                  const effectiveStatus = getEffectiveOrderStatus(row.rawId, row.status);
                  const statusCfg = getUnifiedStatusConfig(row.itemType, effectiveStatus, row.isPickup);
                  const stepIndex = row.isPickup
                    ? effectiveStatus === "completed" || effectiveStatus === "picked_up" || effectiveStatus === "delivered" || effectiveStatus === "received"
                      ? 3
                      : effectiveStatus === "ready_for_pickup" || effectiveStatus === "ready"
                      ? 2
                      : effectiveStatus === "preparing" || effectiveStatus === "processing"
                      ? 1
                      : 0
                    : effectiveStatus === "delivered" || effectiveStatus === "completed" || effectiveStatus === "received"
                    ? 3
                    : effectiveStatus === "shipped"
                    ? 2
                    : effectiveStatus === "ready" || effectiveStatus === "processing"
                    ? 1
                    : 0;

                  if (row.itemType === "order") {
                    return (
                      <div
                        key={row.rawId}
                        onClick={() => router.push(row.targetUrl)}
                        className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group relative cursor-pointer"
                      >
                        {/* Top Gold / Amber Line Accent */}
                        <div className="h-1.5 w-full bg-[#D97706]" />

                        <div className="p-5 space-y-4 flex-1">
                          {/* 1. Header Bar: Status + Type (Left in RTL) and ID (Right in RTL) */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {/* Status Badge */}
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                                <span>{statusCfg.label}</span>
                              </div>

                              {/* Type Badge */}
                              {row.isPickup ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                                  🏬 استلام من الفرع
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#EBF3FF] text-[#1E40AF]">
                                  أمر تنفيذ
                                </span>
                              )}
                            </div>

                            {/* Order ID */}
                            <div dir="ltr" className="text-xs font-bold text-gray-400 font-mono tracking-wider">
                              {row.displayId}
                            </div>
                          </div>

                          {/* 2. Vehicle Info Section (Clickable Modal Trigger with stopPropagation) */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicleModal({
                                make: row.carMake,
                                model: row.carModel,
                                year: row.carYear,
                                plate: row.plateNumber || "—",
                                vin: row.vin && row.vin !== "—" ? row.vin : "غير متوفر",
                                displayId: row.displayId,
                              });
                            }}
                            className="flex items-start justify-between gap-3 pt-1 cursor-pointer group/veh p-1.5 -m-1.5 rounded-2xl hover:bg-emerald-50/50 transition-all border border-transparent hover:border-emerald-200/60"
                            title="انقر لعرض تفاصيل وبيانات المركبة كاملة"
                          >
                            {/* Right in RTL: Vehicle Name, Plate & Model */}
                            <div className="space-y-1.5 text-right flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-lg font-black text-gray-900 group-hover/veh:text-emerald-800 transition-colors leading-tight">
                                  {row.carMake} {row.carModel}
                                </h3>
                                <span className="opacity-0 group-hover/veh:opacity-100 transition-opacity text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                                  بيانات المركبة 🔍
                                </span>
                              </div>

                              <div>
                                <div className="inline-flex items-center gap-1.5 bg-[#F8F9FA] group-hover/veh:bg-white border border-gray-200/70 group-hover/veh:border-emerald-300 px-3 py-1 rounded-xl text-xs font-bold text-gray-800 font-mono shadow-2xs transition-all">
                                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span dir="ltr">{row.plateNumber || "—"}</span>
                                </div>
                              </div>

                              <p className="text-xs text-gray-500 font-medium">
                                موديل <span className="font-bold text-gray-800">{row.carYear}</span>
                              </p>
                            </div>

                            {/* Left in RTL: Vehicle Card Badge */}
                            <div className="w-20 rounded-2xl bg-[#E8F4F1] group-hover/veh:bg-[#d8ece7] border border-emerald-100/60 group-hover/veh:border-emerald-200 p-2 text-center flex flex-col items-center justify-center shrink-0 shadow-2xs transition-all">
                              <div className="w-10 h-8 flex items-center justify-center mb-0.5">
                                <CarBrandLogo make={row.carMake} model={row.carModel} className="max-h-7 max-w-[38px] w-auto h-auto object-contain" />
                              </div>
                              <span className="text-[11px] font-black text-gray-900 leading-tight truncate max-w-[70px]">
                                {row.carModel}
                              </span>
                              <span className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">الموديل</span>
                              <span className="text-xs font-black text-emerald-800 mt-0.5">{row.carYear}</span>
                            </div>
                          </div>

                          {/* 3. Chassis / VIN Row */}
                          <div className="flex items-center justify-between text-xs text-gray-400 pt-0.5">
                            <span>الهيكل:</span>
                            <div className="flex items-center gap-1 font-mono font-bold text-gray-800 text-xs">
                              <span className="text-gray-400">🔗</span>
                              <span dir="ltr">{row.vin && row.vin !== "—" ? row.vin : "غير متوفر"}</span>
                            </div>
                          </div>

                          {/* 4. Mini Stepper Track (4 Interactive Steps) */}
                          <div className="relative py-2 my-1">
                            {/* Background track */}
                            <div className="absolute top-[20px] right-[12.5%] left-[12.5%] h-[2px] bg-slate-100 rounded-full z-0" />

                            {/* Active track */}
                            <div
                              className="absolute top-[20px] right-[12.5%] h-[2px] bg-gradient-to-l from-emerald-600 to-[#1B4D3E] rounded-full z-0 transition-all duration-500"
                              style={{
                                width:
                                  stepIndex === 0
                                    ? "0%"
                                    : stepIndex === 1
                                    ? "33.3%"
                                    : stepIndex === 2
                                    ? "66.6%"
                                    : "100%",
                              }}
                            />

                            {/* 4 Nodes (RTL Order: 1 on Right -> 4 on Left) */}
                            {row.isPickup ? (
                              <div className="grid grid-cols-4 relative z-10 text-center">
                                {/* Node 1: تم التأكيد */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 1: تم تأكيد ودفع الطلب"
                                >
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#1B4D3E] text-white shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                  <span className="text-[10px] font-bold mt-1 text-gray-900 truncate max-w-full">
                                    تم التأكيد
                                  </span>
                                </div>

                                {/* Node 2: جاري التجهيز */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 2: جاري فحص وتجهيز القطع بالفرع"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      stepIndex >= 1
                                        ? "bg-[#1B4D3E] text-white shadow-xs"
                                        : "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                    }`}
                                  >
                                    {stepIndex >= 1 ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      "2"
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold mt-1 truncate max-w-full ${
                                      stepIndex >= 1 ? "text-gray-900" : "text-[#1B4D3E]"
                                    }`}
                                  >
                                    جاري التجهيز
                                  </span>
                                </div>

                                {/* Node 3: جاهز بالفرع 🏬 */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 3: تأكيد جاهزية الطلب للاستلام بالفرع"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      stepIndex >= 2
                                        ? "bg-[#1B4D3E] text-white shadow-xs"
                                        : stepIndex === 1
                                        ? "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {stepIndex >= 2 ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      "3"
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold mt-1 truncate max-w-full ${
                                      stepIndex >= 2 ? "text-gray-900" : "text-gray-400"
                                    }`}
                                  >
                                    جاهز بالفرع 🏬
                                  </span>
                                </div>

                                {/* Node 4: تم الاستلام ✅ */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 4: استلام الطلب بالفرع وتأكيد رمز OTP"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      stepIndex >= 3
                                        ? "bg-[#1B4D3E] text-white shadow-xs"
                                        : stepIndex === 2
                                        ? "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {stepIndex >= 3 ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      "4"
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold mt-1 truncate max-w-full ${
                                      stepIndex >= 3 ? "text-[#1B4D3E]" : "text-gray-400"
                                    }`}
                                  >
                                    تم الاستلام ✅
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 relative z-10 text-center">
                                {/* Node 1: تم التجهيز (المورد فقط) */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 1: تم التجهيز (بواسطة المورد فقط)"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      stepIndex > 0
                                        ? "bg-[#1B4D3E] text-white shadow-xs"
                                        : "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                    }`}
                                  >
                                    {stepIndex > 0 ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      "1"
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-bold mt-1 ${stepIndex >= 0 ? "text-gray-900" : "text-gray-400"}`}>
                                    تم التجهيز
                                  </span>
                                </div>

                                {/* Node 2: تم الشحن (المندوب) */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 2: تم الشحن (بواسطة المندوب)"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      stepIndex > 1
                                        ? "bg-[#1B4D3E] text-white shadow-xs"
                                        : stepIndex === 1
                                        ? "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {stepIndex > 1 ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      "2"
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold mt-1 ${
                                      stepIndex >= 1 ? "text-[#1B4D3E]" : "text-gray-400"
                                    }`}
                                  >
                                    تم الشحن
                                  </span>
                                </div>

                                {/* Node 3: جاري التسليم (المندوب) */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 3: جاري التسليم (بواسطة المندوب)"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      stepIndex > 2
                                        ? "bg-[#1B4D3E] text-white shadow-xs"
                                        : stepIndex === 2
                                        ? "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {stepIndex > 2 ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      "3"
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold mt-1 ${
                                      stepIndex >= 2 ? "text-[#1B4D3E]" : "text-gray-400"
                                    }`}
                                  >
                                    جاري التسليم
                                  </span>
                                </div>

                                {/* Node 4: تأكيد واستلام (العميل) */}
                                <div
                                  className="flex flex-col items-center cursor-default"
                                  title="المرحلة 4: تأكيد واستلام (بواسطة العميل)"
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      stepIndex >= 4
                                        ? "bg-[#1B4D3E] text-white shadow-xs"
                                        : stepIndex === 3
                                        ? "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {stepIndex >= 4 ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      "4"
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold mt-1 ${
                                      stepIndex >= 3 ? "text-[#1B4D3E]" : "text-gray-400"
                                    }`}
                                  >
                                    تأكيد واستلام
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 5. Parts Text Summary & Delivery Location */}
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-900 pt-0.5 leading-snug">
                              {row.partsText || "قطع غيار أمر شراء معتمد"}
                            </p>
                            {row.deliveryLocation && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{row.deliveryLocation}</span>
                              </div>
                            )}
                          </div>

                          {/* 6. Financial Card (السعر المعتمد) */}
                          <div className="bg-[#E8F4F1]/60 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>السعر المعتمد</span>
                            </div>
                            <span className="text-base font-black text-gray-900 font-mono">
                              {fmtCurrency(row.amount || 0)} ر.س
                            </span>
                          </div>
                        </div>

                        {/* 7. Footer: Date & Client Actions */}
                        <div className="px-5 py-3.5 bg-[#FAFBFB] border-t border-gray-100 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                            <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{row.formattedDate}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {effectiveStatus === "delivered" ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/deal/${row.rawId}?action=confirm`);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                                title="تأكيد استلام الطلب وتقييم المورد"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تأكيد واستلام</span>
                              </button>
                            ) : effectiveStatus === "completed" || effectiveStatus === "picked_up" || effectiveStatus === "received" ? (
                              <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>مكتمل ومستلم</span>
                              </span>
                            ) : (effectiveStatus === "preparing" || effectiveStatus === "confirmed" || effectiveStatus === "pending") ? (
                              <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                                <Package className="w-3 h-3 text-amber-600 animate-pulse" />
                                <span>بانتظار تجهيز المورد</span>
                              </span>
                            ) : (effectiveStatus === "ready" || effectiveStatus === "ready_for_pickup") ? (
                              row.isPickup ? (
                                <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                                  <Package className="w-3 h-3 text-teal-600" />
                                  <span>جاهز بالفرع 🏬</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                                  <Package className="w-3 h-3 text-blue-600" />
                                  <span>تم التجهيز - بانتظار المندوب</span>
                                </span>
                              )
                            ) : (
                              <span className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                                <Truck className="w-3 h-3 text-indigo-600 animate-pulse" />
                                <span>تم الشحن - مع المندوب</span>
                              </span>
                            )}

                            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 group-hover:text-emerald-900 transition-colors">
                              <span>تفاصيل الطلب</span>
                              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* RFQ Card */
                  return (
                    <div
                      key={row.rawId}
                      onClick={() => router.push(row.targetUrl)}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group relative cursor-pointer"
                    >
                      {/* Top Accent Gradient Bar */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${statusCfg.accentClass}`} />

                      {/* Card Content Top */}
                      <div className="p-5 space-y-4 flex-1">
                        {/* 1. Header Bar: Balanced 2-Row Architecture */}
                        <div className="space-y-2 pb-2.5 border-b border-gray-100/80">
                          {/* Row 1: Status (Right in RTL) + Order ID (Left in RTL) */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Status Badge */}
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 shadow-2xs transition-all ${statusCfg.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCfg.dotClass}`} />
                              <span className="whitespace-nowrap leading-none">{statusCfg.label}</span>
                            </div>

                            {/* ID Badge with LTR formatting */}
                            <div dir="ltr" className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50/95 border border-gray-200/80 text-[11px] font-bold text-gray-500 font-mono tracking-wider whitespace-nowrap shrink-0 shadow-2xs">
                              {row.displayId}
                            </div>
                          </div>

                          {/* Row 2: Type Tag (Right in RTL) + Expiry / Live Countdown Timer (Left in RTL) */}
                          <div className="flex items-center justify-between gap-2">
                            {/* RFQ Type Tag */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-orange-200/80 whitespace-nowrap shrink-0 shadow-2xs hover:bg-[#ffedd5] transition-colors">
                              <Tag className="w-3 h-3 text-orange-600/90 shrink-0" />
                              <span className="whitespace-nowrap leading-none">طلب تسعير</span>
                            </span>

                            {/* Live Remaining Time Countdown Timer (Based on Admin Settings) */}
                            {row.status !== "completed" && row.status !== "closed" && row.status !== "cancelled" ? (
                              <RfqCardTimer
                                createdAt={row.createdAtRaw}
                                expiresAt={row.rawRfq?.expires_at}
                                status={row.status}
                                durationMinutes={durationMinutes}
                                onExpire={() => setStatusVersion((v) => v + 1)}
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shrink-0 shadow-2xs">
                                <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span className="whitespace-nowrap leading-none">انتهت المهلة (ملغي)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. Vehicle Info Section (Clickable Modal Trigger with stopPropagation) */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVehicleModal({
                              make: row.carMake,
                              model: row.carModel,
                              year: row.carYear,
                              plate: row.plateNumber || "—",
                              vin: row.vin && row.vin !== "—" ? row.vin : "غير متوفر",
                              displayId: row.displayId,
                            });
                          }}
                          className="flex items-start justify-between gap-3 pt-1 cursor-pointer group/veh p-1.5 -m-1.5 rounded-2xl hover:bg-emerald-50/50 transition-all border border-transparent hover:border-emerald-200/60"
                          title="انقر لعرض تفاصيل وبيانات المركبة كاملة"
                        >
                          {/* Right in RTL: Vehicle Name, Plate & Model */}
                          <div className="space-y-1.5 text-right flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-lg font-black text-gray-900 group-hover/veh:text-emerald-800 transition-colors leading-tight">
                                {row.carMake} {row.carModel}
                              </h3>
                              <span className="opacity-0 group-hover/veh:opacity-100 transition-opacity text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                                بيانات المركبة 🔍
                              </span>
                            </div>

                            <div>
                              <div className="inline-flex items-center gap-1.5 bg-[#F8F9FA] group-hover/veh:bg-white border border-gray-200/70 group-hover/veh:border-emerald-300 px-3 py-1 rounded-xl text-xs font-bold text-gray-800 font-mono shadow-2xs transition-all">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span dir="ltr">{row.plateNumber || "—"}</span>
                              </div>
                            </div>

                            <p className="text-xs text-gray-500 font-medium">
                              موديل <span className="font-bold text-gray-800">{row.carYear}</span>
                            </p>
                          </div>

                          {/* Left in RTL: Vehicle Card Badge with High-Res Brand Logo */}
                          <div className="w-20 rounded-2xl bg-[#E8F4F1] group-hover/veh:bg-[#d8ece7] border border-emerald-100/60 group-hover/veh:border-emerald-200 p-2 text-center flex flex-col items-center justify-center shrink-0 shadow-2xs transition-all">
                            <div className="w-10 h-8 flex items-center justify-center mb-0.5">
                              <CarBrandLogo make={row.carMake} model={row.carModel} className="max-h-7 max-w-[38px] w-auto h-auto object-contain" />
                            </div>
                            <span className="text-[11px] font-black text-gray-900 leading-tight truncate max-w-[70px]">
                              {row.carModel}
                            </span>
                            <span className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">الموديل</span>
                            <span className="text-xs font-black text-emerald-800 mt-0.5">{row.carYear}</span>
                          </div>
                        </div>

                        {/* 3. Chassis / VIN Row */}
                        <div className="flex items-center justify-between text-xs text-gray-400 pt-0.5">
                          <span>الهيكل:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-gray-800 text-xs">
                            <span className="text-gray-400">🔗</span>
                            <span dir="ltr">{row.vin && row.vin !== "—" ? row.vin : "غير متوفر"}</span>
                          </div>
                        </div>

                        {/* 4. Parts Details & Image Preview */}
                        <div className="space-y-2 pt-1 border-t border-gray-100/80">
                          <div className="flex items-start gap-2.5">
                            {/* Image Thumbnail with Lightbox */}
                            {row.imagePathname ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedImageModal(row.imagePathname!);
                                }}
                                className="relative group/img w-12 h-12 rounded-xl border-2 border-blue-400 overflow-hidden bg-blue-50 shrink-0 hover:border-blue-600 transition-all shadow-2xs cursor-pointer"
                                title="انقر لمشاهدة الصورة المرفقة بحجم كامل"
                              >
                                <img
                                  src={row.imagePathname}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%232563eb'/><text x='50' y='55' font-family='sans-serif' font-size='32' fill='%23ffffff' text-anchor='middle'>📷</text></svg>";
                                  }}
                                  alt="صورة القطعة"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-blue-950/40 group-hover/img:bg-transparent transition-colors flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white drop-shadow-xs" />
                                </div>
                              </button>
                            ) : null}

                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                                {row.imagePathname && row.partsText === "صورة قطعة غيار مرفقة" ? (
                                  <span className="text-blue-700 font-bold inline-flex items-center gap-1">
                                    <span>📷 صورة قطعة غيار مرفقة بالطلب</span>
                                  </span>
                                ) : (
                                  row.partsText
                                )}
                              </p>

                              {/* Badges: Location & Urgency */}
                              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                {row.deliveryLocation && (
                                  <span className="inline-flex items-center gap-0.5 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg text-[10px] text-slate-700 font-medium">
                                    <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span className="truncate max-w-[130px]">{row.deliveryLocation}</span>
                                  </span>
                                )}

                                {row.recipientName && (
                                  <span className="inline-flex items-center gap-0.5 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg text-[10px] text-blue-800 font-medium">
                                    <User className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>{row.recipientName}</span>
                                    {row.recipientPhone && <span dir="ltr" className="text-[9px] font-mono text-blue-600">({row.recipientPhone})</span>}
                                  </span>
                                )}

                                {row.isUrgent && (
                                  <span className="bg-amber-500 text-white font-black px-2 py-0.5 rounded-lg text-[10px] shadow-2xs">
                                    ⚡ عاجل
                                  </span>
                                )}

                                {row.rfqType === "private" && (
                                  <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-purple-200/70">
                                    خاص: {row.targetVendorName || "مورد محدد"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 5. Financial & Quotes Highlights */}
                        <div className="pt-1">
                          <div
                            className={`rounded-2xl p-3 flex items-center justify-between border ${
                              row.quotesCount > 0
                                ? "bg-blue-50/70 border-blue-200/80"
                                : "bg-amber-50/60 border-amber-200/70"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <FileText
                                className={`w-4 h-4 shrink-0 ${
                                  row.quotesCount > 0 ? "text-blue-600" : "text-amber-600"
                                }`}
                              />
                              <span
                                className={`text-xs font-black ${
                                  row.quotesCount > 0 ? "text-blue-950" : "text-amber-950"
                                }`}
                              >
                                {row.quotesCount > 0
                                  ? `${row.quotesCount} عروض أسعار متوفرة`
                                  : "بانتظار عروض الموردين"}
                              </span>
                            </div>

                            {row.amount ? (
                              <span className="text-sm font-black text-emerald-700 font-mono">
                                يبدأ من {fmtCurrency(row.amount)} ر.س
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">
                                قيد المعالجة
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 6. Card Footer: Date & Actions */}
                      <div className="px-5 py-3.5 bg-[#FAFBFB] border-t border-gray-100 flex items-center justify-between gap-2">
                        {/* Creation Date */}
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{row.formattedDate}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {(row.status === "cancelled" || row.status === "expired" || row.status === "closed") && row.itemType === "rfq" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactivateRfq(row.rawId, row.displayId);
                              }}
                              disabled={reactivatingId === row.rawId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
                              title="إعادة تنشيط طلب التسعير وإعادته للطلبات النشطة"
                            >
                              {reactivatingId === row.rawId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              <span>إعادة تنشيط الطلب 🚀</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalTarget({ id: row.rawId, displayId: row.displayId });
                            }}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="حذف طلب التسعير"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 group-hover:text-emerald-900 transition-colors">
                            <span>{row.quotesCount > 0 ? "معاينة العروض" : "تفاصيل الطلب"}</span>
                            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── 2. TABLE VIEW: Used for "الكل", "الطلبات المكتملة", "الطلبات المغلقة والملغاة" ── */
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full text-right border-collapse text-[11px] leading-tight">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase text-[10px] tracking-tight">
                        {visibleColumns.id && <th className="py-2.5 px-3 whitespace-nowrap">رقم الطلب / النوع</th>}
                        {visibleColumns.vehicle && <th className="py-2.5 px-3 whitespace-nowrap">المركبة والموديل</th>}
                        {visibleColumns.plate && <th className="py-2.5 px-3 whitespace-nowrap">اللوحة / الهيكل</th>}
                        {visibleColumns.quotes && <th className="py-2.5 px-3 text-center whitespace-nowrap">العروض / المبلغ</th>}
                        {visibleColumns.date && <th className="py-2.5 px-3 whitespace-nowrap">التاريخ</th>}
                        {visibleColumns.status && <th className="py-2.5 px-3 whitespace-nowrap">الحالة</th>}
                        {visibleColumns.details && <th className="py-2.5 px-3">التفاصيل وموقع التسليم</th>}
                        {visibleColumns.actions && <th className="py-2.5 px-3 text-center whitespace-nowrap">الإجراءات</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRows.map((row) => {
                        const effectiveStatus = getEffectiveOrderStatus(row.rawId, row.status);
                        const statusCfg = getUnifiedStatusConfig(row.itemType, effectiveStatus, row.isPickup);

                        return (
                          <tr
                            key={row.rawId}
                            className="hover:bg-slate-50/80 transition-colors duration-150 group"
                          >
                            {/* 1. ID & Type */}
                            {visibleColumns.id && (
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <span dir="ltr" className="font-mono font-bold text-slate-900 text-xs">
                                      {row.displayId}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                        row.itemType === "rfq"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {row.itemType === "rfq" ? "تسعير" : "أمر"}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 block font-medium">
                                    {row.itemType === "rfq" ? "طلب عرض سعر" : "أمر تنفيذ مؤكد"}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* 2. Car & Model */}
                            {visibleColumns.vehicle && (
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                                    <CarBrandLogo make={row.carMake} model={row.carModel} className="w-4 h-4 text-slate-700" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 text-[11px]">
                                      {row.carMake} {row.carModel}
                                    </div>
                                    <div className="text-[9px] font-semibold text-slate-500">
                                      موديل <span className="font-bold text-slate-700">{row.carYear}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 3. Plate & VIN */}
                            {visibleColumns.plate && (
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-900">
                                    <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span dir="ltr">{row.plateNumber || "—"}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono">
                                    <KeyRound className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span dir="ltr" className="truncate max-w-[95px]" title={row.vin}>
                                      {row.vin !== "—" ? row.vin : "الهيكل غير مدخل"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 4. Quotes / Amount */}
                            {visibleColumns.quotes && (
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap text-center">
                                {row.itemType === "order" ? (
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-black text-slate-900 font-mono">
                                      {fmtCurrency(row.amount || 0)} ر.س
                                    </span>
                                    <span className="text-[8px] text-slate-400 block font-medium">
                                      السعر المعتمد
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                                      {row.quotesCount > 0 ? `${row.quotesCount} عروض` : "0 عروض"}
                                    </span>
                                    {row.amount ? (
                                      <span className="text-[8px] text-emerald-700 font-semibold block">
                                        يبدأ من {fmtCurrency(row.amount)} ر.س
                                      </span>
                                    ) : (
                                      <span className="text-[8px] text-slate-400 block">
                                        في انتظار الموردين
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* 5. Date */}
                            {visibleColumns.date && (
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap text-slate-600 text-[10px]">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800 block">{row.formattedDate}</span>
                                  <span className="text-[8px] text-slate-400 block">
                                    {new Date(row.createdAtRaw).toLocaleTimeString("ar-SA", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* 6. Status */}
                            {visibleColumns.status && (
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-start">
                                  <div
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold ${statusCfg.badgeClass}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                                    <span>{statusCfg.label}</span>
                                  </div>
                                  {row.itemType === "rfq" && row.status !== "completed" && row.status !== "closed" && row.status !== "cancelled" && (
                                    <RfqCardTimer
                                      createdAt={row.createdAtRaw}
                                      expiresAt={row.rawRfq?.expires_at}
                                      status={row.status}
                                      durationMinutes={durationMinutes}
                                      onExpire={() => setStatusVersion((v) => v + 1)}
                                      compact
                                      className="text-[9px] px-2 py-0.2"
                                    />
                                  )}
                                </div>
                              </td>
                            )}

                            {/* 7. Details & Delivery Location */}
                            {visibleColumns.details && (
                              <td className="py-2.5 px-3 align-middle">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    {row.imagePathname ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedImageModal(row.imagePathname!)}
                                        className="relative group/img w-8 h-8 rounded-lg border-2 border-blue-400 overflow-hidden bg-blue-50 shrink-0 hover:border-blue-600 transition-colors shadow-2xs cursor-pointer"
                                        title="انقر لمشاهدة الصورة المرفقة بحجم كامل"
                                      >
                                        <img
                                          src={row.imagePathname}
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%232563eb'/><text x='50' y='55' font-family='sans-serif' font-size='32' fill='%23ffffff' text-anchor='middle'>📷</text></svg>";
                                          }}
                                          alt="صورة القطعة"
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-blue-900/30 group-hover/img:bg-transparent transition-colors flex items-center justify-center">
                                          <Eye className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                                        </div>
                                      </button>
                                    ) : null}

                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-800 text-[10px] leading-tight line-clamp-1">
                                        {row.imagePathname && row.partsText === "صورة قطعة غيار مرفقة" ? (
                                          <span className="text-blue-700 font-bold inline-flex items-center gap-1">
                                            <span>📷 صورة قطعة غيار مرفقة</span>
                                            <span className="text-[9px] font-normal text-slate-500">(انقر للمعاينة)</span>
                                          </span>
                                        ) : (
                                          row.partsText
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1 text-[8px]">
                                    {row.deliveryLocation ? (
                                      <span className="inline-flex items-center gap-0.5 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded text-slate-700 font-medium">
                                        <MapPin className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                        <span className="truncate max-w-[120px]">{row.deliveryLocation}</span>
                                      </span>
                                    ) : null}

                                    {row.recipientName ? (
                                      <span className="inline-flex items-center gap-0.5 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded text-blue-800 font-medium">
                                        <User className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                        <span>{row.recipientName}</span>
                                        {row.recipientPhone ? <span dir="ltr" className="text-[7.5px] font-mono text-blue-600">({row.recipientPhone})</span> : null}
                                      </span>
                                    ) : null}

                                    {row.isUrgent ? (
                                      <span className="bg-amber-500 text-white font-black px-1 py-0.2 rounded">
                                        ⚡ عاجل
                                      </span>
                                    ) : null}

                                    {row.rfqType === "private" ? (
                                      <span className="bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                                        خاص: {row.targetVendorName || "مورد"}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* 8. Actions (Reactivate + 3-dots Dropdown Menu) - LAST COLUMN */}
                            {visibleColumns.actions && (
                              <td className="py-2.5 px-3 align-middle whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {row.itemType === "rfq" && (row.status === "cancelled" || row.status === "expired" || row.status === "closed") && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReactivateRfq(row.rawId, row.displayId);
                                      }}
                                      disabled={reactivatingId === row.rawId}
                                      className="h-8 px-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-2xs gap-1 cursor-pointer transition-all shrink-0"
                                      title="إعادة تنشيط الطلب وتجديد مهلة استقبال العروض"
                                    >
                                      {reactivatingId === row.rawId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                      ) : (
                                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                      )}
                                      <span>إعادة تنشيط</span>
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs cursor-pointer inline-flex items-center justify-center transition-colors"
                                        title="خيارات الإجراءات"
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48 text-right dir-rtl p-1 rounded-xl shadow-xl border border-slate-200 bg-white z-50 space-y-0.5"
                                    >
                                      {/* إعادة تنشيط الطلب */}
                                      {row.itemType === "rfq" && (row.status === "cancelled" || row.status === "expired" || row.status === "closed") && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => handleReactivateRfq(row.rawId, row.displayId)}
                                            disabled={reactivatingId === row.rawId}
                                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer"
                                          >
                                            <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>إعادة تنشيط الطلب 🚀</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                        </>
                                      )}

                                      {/* 1. عرض التفاصيل */}
                                      <DropdownMenuItem
                                        onClick={() => router.push(row.targetUrl)}
                                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                      >
                                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>عرض التفاصيل</span>
                                      </DropdownMenuItem>

                                      {/* 2. اطلاع / معاينة العروض */}
                                      <DropdownMenuItem
                                        onClick={() => router.push(row.targetUrl)}
                                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                      >
                                        <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{row.itemType === "rfq" ? "اطلاع على العروض" : "اطلاع على الطلب"}</span>
                                      </DropdownMenuItem>

                                      {/* 3. تعديل الطلب */}
                                      {row.itemType === "rfq" && row.status === "open" ? (
                                        <DropdownMenuItem
                                          onClick={() => router.push(`/client/new-rfq?edit=${row.rawId}`)}
                                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                        >
                                          <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                                          <span>تعديل الطلب</span>
                                        </DropdownMenuItem>
                                      ) : null}

                                      {/* 4. نسخ رقم الطلب */}
                                      <DropdownMenuItem
                                        onClick={() => {
                                          navigator.clipboard.writeText(row.displayId);
                                          alert(`تم نسخ رقم الطلب ${row.displayId}`);
                                        }}
                                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                      >
                                        <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                                        <span>نسخ رقم الطلب</span>
                                      </DropdownMenuItem>

                                      {/* 5. حذف الطلب (فقط لطلبات التسعير) */}
                                      {row.itemType === "rfq" && (
                                        <>
                                          <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                          <DropdownMenuItem
                                            onClick={() =>
                                              setDeleteModalTarget({ id: row.rawId, displayId: row.displayId })
                                            }
                                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                                          >
                                            <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                                            <span>حذف</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls Footer */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                عرض <span className="font-bold text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> إلى{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)}
                </span>{" "}
                من أصل <span className="font-bold text-slate-900">{filteredRows.length}</span> طلب
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-700 font-bold text-[11px] gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>السابق</span>
                  </Button>

                  <span className="font-bold text-slate-800 px-2 text-[11px]">
                    صفحة {currentPage} من {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-700 font-bold text-[11px] gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State Container */
          <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center space-y-3.5 shadow-2xs">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">لا توجد طلبات مطابقة حالياً</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || dateRange || mode !== "all"
                  ? "لم نجد أي طلبات تتطابق مع معايير البحث أو الفلترة المحددة."
                  : "لم تقم بإنشاء أي طلبات تسعير بعد. يمكنك بدء إضافة طلبك الأول الآن ببساطة."}
              </p>
            </div>

            {searchQuery || dateRange || mode !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setDebouncedSearch("");
                  setDateRange(null);
                  setMode("all");
                }}
                className="rounded-lg text-xs font-bold h-9 px-3.5 border-slate-200 cursor-pointer"
              >
                إعادة ضبط جميع الفلاتر
              </Button>
            ) : (
              <Link href="/client/new-rfq">
                <Button className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-2xs cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء طلب عرض سعر جديد</span>
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* ── 🚗 Vehicle Details Modal Dialog (نافذة بيانات المركبة) ── */}
        <Dialog
          open={!!selectedVehicleModal}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVehicleModal(null);
              setCopiedVin(false);
            }
          }}
        >
          <DialogContent className="max-w-md w-[92vw] sm:w-full p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white text-right dir-rtl font-sans z-50">
            {selectedVehicleModal && (
              <div>
                {/* Header with Emerald Gradient */}
                <div className="bg-gradient-to-br from-[#1B4D3E] to-[#123329] p-6 text-white relative">
                  <button
                    type="button"
                    onClick={() => setSelectedVehicleModal(null)}
                    className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-4">
                    {/* Brand Logo inside white rounded container */}
                    <div className="w-16 h-16 rounded-2xl bg-white p-2.5 shadow-lg flex items-center justify-center shrink-0 border border-white/20">
                      <CarBrandLogo
                        make={selectedVehicleModal.make}
                        model={selectedVehicleModal.model}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          مركبة مسجلة
                        </span>
                        <span className="text-white/60 text-xs font-mono">
                          {selectedVehicleModal.displayId}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white leading-tight truncate">
                        {selectedVehicleModal.make} {selectedVehicleModal.model}
                      </h2>
                      <p className="text-xs text-emerald-100/80 mt-0.5 font-medium">
                        سنة الصنع: <span className="font-bold text-white">{selectedVehicleModal.year}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-6 space-y-4 bg-[#F8FAFB]">
                  {/* Plate & Specs Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Plate Number Card */}
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>رقم اللوحة</span>
                      </div>
                      <div dir="ltr" className="text-base font-black text-gray-900 font-mono text-right">
                        {selectedVehicleModal.plate}
                      </div>
                    </div>

                    {/* Model Year Card */}
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                        <span>موديل السنة</span>
                      </div>
                      <div className="text-base font-black text-gray-900">
                        {selectedVehicleModal.year}
                      </div>
                    </div>
                  </div>

                  {/* VIN Number Card */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                        <span>رقم الهيكل (VIN)</span>
                      </div>
                      {selectedVehicleModal.vin && selectedVehicleModal.vin !== "غير متوفر" && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedVehicleModal.vin);
                            setCopiedVin(true);
                            setTimeout(() => setCopiedVin(false), 2000);
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                        >
                          {copiedVin ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span>تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ الرقم</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div
                      dir="ltr"
                      className="bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2 text-xs font-mono font-black text-gray-800 tracking-wider text-left select-all"
                    >
                      {selectedVehicleModal.vin}
                    </div>
                  </div>

                  {/* Additional Specs Details */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-gray-600 pb-2 border-b border-gray-50">
                      <span className="text-gray-400">الشركة المصنعة:</span>
                      <span className="font-bold text-gray-900">{selectedVehicleModal.make}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 pb-2 border-b border-gray-50">
                      <span className="text-gray-400">طراز المركبة:</span>
                      <span className="font-bold text-gray-900">{selectedVehicleModal.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="text-gray-400">حالة التحقق:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        مركبة موثقة ومعتمدة
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-end">
                  <Button
                    type="button"
                    onClick={() => setSelectedVehicleModal(null)}
                    className="w-full bg-[#1B4D3E] hover:bg-[#123329] text-white font-bold text-xs h-10 rounded-xl cursor-pointer"
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reactivation Success Celebration Modal */}
        <ReactivateSuccessModal
          isOpen={Boolean(reactivatedModalData)}
          displayId={reactivatedModalData?.displayId || ""}
          durationMinutes={reactivatedModalData?.durationMinutes || durationMinutes}
          carName={reactivatedModalData?.carName}
          onClose={() => setReactivatedModalData(null)}
          onViewActive={() => {
            setReactivatedModalData(null);
            setMode("rfq");
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
