"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  DollarSign,
  TrendingUp,
  Sparkles,
  Send,
  Building2,
  Receipt,
  Check,
  FileSpreadsheet,
  Tag,
} from "lucide-react";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { exportOrdersToExcel } from "@/lib/excel-export";
import { getEffectiveOrderStatus, syncOrderStatusUpdate } from "@/lib/order-status-sync";
import { CarBrandLogo } from "@/components/car-brand-logo";
import { RfqCardTimer } from "@/components/rfq-card-timer";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/* ────────────────────────────────────────────── Types */
export interface VendorRFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number?: string;
  vin?: string;
  parts_description?: string;
  delivery_location?: string;
  status: string;
  created_at: string;
  expires_at?: string;
  quotes?: {
    id?: string;
    total_price?: number;
    delivery_days?: number;
    status?: string;
    vendor_id?: string;
  }[];
}

export interface VendorOrder {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  rfq_id?: string;
  rfqs?: {
    car_make: string;
    car_model: string;
    car_year: number;
    plate_number?: string;
    vin?: string;
    parts_description?: string;
    delivery_location?: string;
  };
  client?: { full_name?: string; company_name?: string; phone?: string };
  deals?: { id: string; status: string }[];
}

export type VendorTabMode = "all" | "rfq" | "active" | "completed";

export interface UnifiedVendorRow {
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
  imagePathname?: string | null;
  deliveryLocation?: string;
  isUrgent?: boolean;
  clientName?: string;
  clientPhone?: string;
  myQuotePrice?: number | null;
  amount: number | null;
  formattedDate: string;
  createdAtRaw: string;
  status: string;
  targetUrl: string;
  isPickup?: boolean;
  partsSubtotal?: number;
  vendorFeePercent?: number;
  vendorPlatformFee?: number;
  vendorNetParts?: number;
  rawRfq?: VendorRFQ;
  rawOrder?: VendorOrder;
}

interface SelectedVehicleData {
  make: string;
  model: string;
  year: number | string;
  plate: string;
  vin: string;
  displayId: string;
}

interface ColumnConfig {
  id: string;
  label: string;
}

const TABLE_COLUMNS_CONFIG: ColumnConfig[] = [
  { id: "id", label: "رقم الطلب / النوع" },
  { id: "vehicle", label: "المركبة والموديل" },
  { id: "plate", label: "اللوحة / الهيكل" },
  { id: "price", label: "المبلغ / التسعير" },
  { id: "date", label: "التاريخ" },
  { id: "status", label: "الحالة" },
  { id: "actions", label: "الإجراءات" },
];

/* ────────────────────────────────────────────── Helpers */
function fmt(n: number) {
  return (n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function shortId(id: string) {
  if (!id) return "—";
  return id.replace(/^(REQ-|ORD-|RFQ-)/i, "").slice(0, 8).toUpperCase();
}

function getPartsSummary(parts_description?: string): { count: number; text: string; isUrgent?: boolean; imagePathname?: string | null } {
  if (!parts_description) return { count: 0, text: "قطع غيار مركبات" };
  try {
    const parsed = JSON.parse(parts_description);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const names = parsed
        .map((p: any) => p.partName || p.part_name || p.name || p.title)
        .filter(Boolean);
      const img = parsed.find((p: any) => p.image_url || p.imageUrl || p.image_pathname || p.imagePathname);
      return {
        count: parsed.length,
        text: names.join(" ، ") || "قطع غيار مركبات",
        isUrgent: parsed[0]?.isUrgent,
        imagePathname: img ? (img.image_url || img.imageUrl || img.image_pathname || img.imagePathname) : null,
      };
    }
  } catch {
    if (typeof parts_description === "string" && parts_description.trim()) {
      return { count: 1, text: parts_description };
    }
  }
  return { count: 0, text: "قطع غيار مركبات" };
}

const COMPLETED_STATUSES = ["completed", "closed", "received", "cancelled"];

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

function getStatusConfig(itemType: "rfq" | "order", status: string) {
  if (itemType === "rfq") {
    switch (status) {
      case "quoted":
        return {
          label: "تم تقديم تسعيرتك",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          dotClass: "bg-blue-500",
          accent: "from-blue-500 to-indigo-600",
        };
      case "accepted":
        return {
          label: "تم قبول عرضك",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dotClass: "bg-emerald-500",
          accent: "from-emerald-500 to-teal-600",
        };
      case "closed":
        return {
          label: "مغلق",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
          dotClass: "bg-slate-400",
          accent: "from-slate-400 to-slate-600",
        };
      default:
        return {
          label: "مفتوح للتسعير",
          badgeClass: "bg-amber-50/90 text-amber-900 border-amber-300/80 hover:bg-amber-100/70",
          dotClass: "bg-amber-500 animate-pulse",
          accent: "from-amber-500 to-orange-500",
        };
    }
  } else {
    switch (status) {
      case "preparing":
      case "confirmed":
      case "pending":
        return {
          label: "بانتظار تجهيز المورد",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-500",
          accent: "from-amber-500 to-orange-500",
        };
      case "ready":
      case "processing":
        return {
          label: "تم التجهيز",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          dotClass: "bg-blue-500",
          accent: "from-blue-500 to-indigo-500",
        };
      case "shipped":
        return {
          label: "تم الشحن",
          badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
          dotClass: "bg-indigo-500",
          accent: "from-indigo-500 to-purple-600",
        };
      case "delivered":
        return {
          label: "جاري التسليم",
          badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
          dotClass: "bg-teal-500",
          accent: "from-teal-500 to-emerald-500",
        };
      case "completed":
        return {
          label: "مكتمل ومستلم",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dotClass: "bg-emerald-500",
          accent: "from-emerald-500 to-teal-600",
        };
      case "cancelled":
        return {
          label: "ملغي",
          badgeClass: "bg-red-50 text-red-700 border-red-200",
          dotClass: "bg-red-500",
          accent: "from-red-500 to-rose-600",
        };
      default:
        return {
          label: status,
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
          dotClass: "bg-slate-400",
          accent: "from-slate-400 to-slate-600",
        };
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

/* ────────────────────────────────────────────── Main Component */
export function VendorOrdersClient({
  rfqs: initialRfqs,
  orders: initialOrders,
  vendorSpecializations,
  durationMinutes = 20,
  currentVendorId = "vendor-demo-id",
}: {
  rfqs: VendorRFQ[];
  orders: VendorOrder[];
  vendorSpecializations?: {
    specialized_brands: string[];
    specializes_in_all_brands: boolean;
    specialized_categories?: string[];
    specializes_in_all_categories?: boolean;
  };
  durationMinutes?: number;
  currentVendorId?: string;
}) {
  const router = useRouter();

  const [rfqs, setRfqs] = useState<VendorRFQ[]>(initialRfqs);
  const [orders, setOrders] = useState<VendorOrder[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<VendorTabMode>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusVersion, setStatusVersion] = useState(0);

  // Sync props on change
  useEffect(() => {
    setRfqs(initialRfqs);
  }, [initialRfqs]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Live status synchronization for multi-portal real-time updates
  const [liveStatuses, setLiveStatuses] = useState<Record<string, { status: string; courier_status: string }>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchLiveSync = async () => {
      try {
        const [ordersRes, rfqsRes] = await Promise.all([
          fetch(`/api/v1/orders?live_sync=1&vendor_id=${encodeURIComponent(currentVendorId || "")}`, {
            cache: "no-store",
            headers: {
              Pragma: "no-cache",
              "x-user-id": currentVendorId || "",
              "x-user-role": "vendor",
            },
          }),
          fetch("/api/rfqs", {
            cache: "no-store",
            headers: {
              Pragma: "no-cache",
              "x-user-id": currentVendorId,
              "x-user-role": "vendor",
            },
          }),
        ]);

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (isMounted && data.success && data.statuses) {
            setLiveStatuses(data.statuses);
          }
          if (isMounted && data.success && Array.isArray(data.orders)) {
            const isDemo = currentVendorId === "vendor-demo-id" || currentVendorId === "current-vendor-id";
            const myOrders = data.orders.filter((o: any) => {
              if (!o) return false;
              if (o.vendor_id === currentVendorId) return true;
              if (isDemo && (o.vendor_id === "vendor-demo-id" || o.vendor_id === "v-supplier-1")) return true;
              return false;
            });
            setOrders(myOrders);
          }
        }

        if (rfqsRes.ok) {
          const rfqJson = await rfqsRes.json();
          if (isMounted && rfqJson.rfqs && Array.isArray(rfqJson.rfqs)) {
            setRfqs((prevRfqs) => {
              return rfqJson.rfqs
                .filter((r: any) => r && r.status !== "accepted" && r.status !== "closed" && r.status !== "completed" && r.status !== "cancelled")
                .map((newRfq: any) => {
                  const prev = prevRfqs.find((p) => p.id === newRfq.id);
                  const mergedQuotes = (newRfq.quotes && newRfq.quotes.length > 0)
                    ? newRfq.quotes
                    : (prev?.quotes || []);
                  return {
                    ...newRfq,
                    quotes: mergedQuotes,
                  };
                });
            });
          }
        }
      } catch {}
    };

    fetchLiveSync();
    const interval = setInterval(fetchLiveSync, 3000);

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

  // Selected Item Modal (Legacy)
  const [selectedItem, setSelectedItem] = useState<UnifiedVendorRow | null>(null);

  // Vehicle Details Modal State
  const [selectedVehicleModal, setSelectedVehicleModal] = useState<SelectedVehicleData | null>(null);
  const [copiedVin, setCopiedVin] = useState(false);

  // Image Lightbox Modal State
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  // Column Visibility Customizer
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "vehicle",
    "plate",
    "price",
    "date",
    "status",
    "actions",
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rfq_vendor_table_columns_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColumns(parsed.filter((c: string) => c !== "client"));
        }
      }
    } catch (e) {}
  }, []);

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId];
      if (next.length === 0) return prev;
      localStorage.setItem("rfq_vendor_table_columns_v2", JSON.stringify(next));
      return next;
    });
  };

  /* ── Status Advance (Vendor Workflow strictly restricted to ready and shipped) ── */
  const advanceOrderStatus = async (orderId: string, currentStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const norm = getEffectiveOrderStatus(orderId, currentStatus);

    let nextStatus = "ready";
    if (norm === "preparing" || norm === "confirmed" || norm === "pending") {
      nextStatus = "ready";
    } else if (norm === "ready") {
      nextStatus = "shipped";
    } else {
      return; // Handed over to courier / client
    }

    setUpdatingOrderId(orderId);
    setLiveStatuses((prev) => ({
      ...prev,
      [orderId]: {
        status: nextStatus,
        courier_status: nextStatus === "shipped" ? "PICKED_UP" : (prev[orderId]?.courier_status || ""),
      },
    }));

    try {
      const res = await fetch(`/api/v1/vendor/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "تعذر تحديث حالة الطلب");
      } else {
        await syncOrderStatusUpdate({
          orderId,
          newStatus: nextStatus,
          actorRole: "vendor",
        });
        setStatusVersion((v) => v + 1);
      }
    } catch (err: any) {
      console.warn("Status update fallback:", err);
      await syncOrderStatusUpdate({
        orderId,
        newStatus: nextStatus,
        actorRole: "vendor",
      });
      setStatusVersion((v) => v + 1);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // OTP Verification Modal for Branch Pickup
  const [otpModalData, setOtpModalData] = useState<{ orderId: string; displayId: string } | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleVerifyOtpSubmit = async () => {
    if (!otpModalData) return;
    if (!otpInput || otpInput.trim().length < 4) {
      alert("يرجى إدخال رمز التحقق OTP المكون من 4 أرقام");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch(`/api/v1/vendor/orders/${otpModalData.orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus: "completed",
          otpCode: otpInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "رمز التحقق غير صحيح، يرجى التأكد من العميل");
      } else {
        await syncOrderStatusUpdate({
          orderId: otpModalData.orderId,
          newStatus: "completed",
          actorRole: "vendor",
        });
        setStatusVersion((v) => v + 1);
        setOtpModalData(null);
        setOtpInput("");
        alert("✅ تم تأكيد استلام الطلب من الفرع بنجاح وإيداع المبلغ في محفظتك الإلكترونية!");
      }
    } catch (err: any) {
      alert("حدث خطأ أثناء التحقق من الرمز: " + err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCardStepClick = async (e: React.MouseEvent, orderId: string, targetStatus: string, isPickup?: boolean) => {
    e.stopPropagation();

    if (isPickup && (targetStatus === "completed" || targetStatus === "picked_up")) {
      const shortCode = shortId(orderId);
      setOtpModalData({ orderId, displayId: `ORD-${shortCode}` });
      setOtpInput("");
      return;
    }

    if (targetStatus !== "ready" && targetStatus !== "shipped" && targetStatus !== "ready_for_pickup") {
      alert("صلاحيات المورد تقتصر فقط على (جاهز للتسليم بالفرع / للشحن) و (تسليم الطلب).");
      return;
    }

    setUpdatingOrderId(orderId);
    setLiveStatuses((prev) => ({
      ...prev,
      [orderId]: {
        status: targetStatus,
        courier_status: targetStatus === "shipped" ? "PICKED_UP" : (prev[orderId]?.courier_status || ""),
      },
    }));

    try {
      const res = await fetch(`/api/v1/vendor/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "تعذر تحديث حالة الطلب");
      } else {
        await syncOrderStatusUpdate({
          orderId,
          newStatus: targetStatus,
          actorRole: "vendor",
        });
        setStatusVersion((v) => v + 1);
      }
    } catch (err) {
      await syncOrderStatusUpdate({
        orderId,
        newStatus: targetStatus,
        actorRole: "vendor",
      });
      setStatusVersion((v) => v + 1);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  /* ── Build Unified Rows ── */
  const unifiedRows = useMemo<UnifiedVendorRow[]>(() => {
    const rows: UnifiedVendorRow[] = [];

    // Map Orders
    orders.forEach((o) => {
      const rfqData = o.rfqs || (o as any).rfq || {};
      const partsSummary = getPartsSummary(rfqData.parts_description || (o as any).parts_description);
      const cleanOId = o.id ? String(o.id).replace(/^(ORD-|REQ-|DEAL-)/i, "") : "";
      const live = liveStatuses[o.id] || (cleanOId ? liveStatuses[cleanOId] : undefined);
      const activeOrderStatus = live?.status || o.status || "preparing";
      const activeCourierStatus = (live?.courier_status || (o as any).courier_status || "").toUpperCase();

      const carMake = rfqData.car_make || (o as any).car_make || "غير محدد";
      const carModel = rfqData.car_model || (o as any).car_model || "";
      const carYear = rfqData.car_year || (o as any).car_year || "—";
      const plateNumber = rfqData.plate_number || (o as any).plate_number || "—";
      const vin = rfqData.vin || (o as any).vin || "—";
      const deliveryLocation = rfqData.delivery_location || (o as any).delivery_location || "الرياض";
      const clientName = o.client?.company_name || o.client?.full_name || (o as any).client_name || (o as any).client?.name || "عميل موثق";
      const clientPhone = o.client?.phone || (o as any).client_phone;

      const locText = String(deliveryLocation || "");
      const isExplicitDelivery =
        (o as any).fulfillment_method === "DELIVERY" ||
        (o as any).delivery_method === "delivery" ||
        (o as any).shipping_method === "delivery" ||
        (o as any).is_pickup === false ||
        rfqData.fulfillment_method === "DELIVERY" ||
        rfqData.delivery_method === "delivery" ||
        rfqData.is_pickup === false ||
        Number((o as any).delivery_fee) > 0;

      const hasPickupPhrase =
        locText === "استلام من فرع المورد" ||
        locText === "استلام يدوي" ||
        locText.startsWith("استلام من فرع المورد");

      const isPickup = !isExplicitDelivery && Boolean(
        hasPickupPhrase ||
        (o as any).fulfillment_method === "BRANCH_PICKUP" ||
        (o as any).fulfillment_method === "SELF_PICKUP" ||
        (o as any).delivery_method === "pickup" ||
        (o as any).delivery_type === "pickup" ||
        (o as any).is_pickup === true ||
        rfqData.fulfillment_method === "BRANCH_PICKUP" ||
        rfqData.fulfillment_method === "SELF_PICKUP" ||
        rfqData.delivery_method === "pickup" ||
        rfqData.is_pickup === true
      );

      const partsSub = Number((o as any).parts_subtotal ?? (o as any).subtotal ?? 0);
      const vendorFeeRate = Number(
        (o as any).vendor_platform_fee_percent ??
        (o as any).quote?.vendor_platform_fee_percent ??
        15
      );
      const vendorFeeAmt = Number(
        (o as any).vendor_platform_fee ??
        ((partsSub * vendorFeeRate) / 100).toFixed(2)
      );
      const netParts = Math.max(0, Number((partsSub - vendorFeeAmt).toFixed(2)));

      rows.push({
        rawId: o.id,
        displayId: `ORD-${shortId(o.id)}`,
        itemType: "order",
        carMake,
        carModel,
        carYear,
        plateNumber,
        vin,
        partsText: partsSummary.text,
        partsCount: partsSummary.count,
        imagePathname: partsSummary.imagePathname,
        deliveryLocation,
        isUrgent: partsSummary.isUrgent,
        clientName,
        clientPhone,
        myQuotePrice: o.total_price,
        amount: o.total_price,
        partsSubtotal: partsSub > 0 ? partsSub : (Number(o.total_price) || 0),
        vendorFeePercent: vendorFeeRate,
        vendorPlatformFee: vendorFeeAmt,
        vendorNetParts: netParts > 0 ? netParts : (Number(o.total_price) || 0),
        formattedDate: new Date(o.created_at).toLocaleDateString("ar-SA"),
        createdAtRaw: o.created_at,
        status: (() => {
          if (activeCourierStatus === "EN_ROUTE_DELIVERY" || activeCourierStatus === "ARRIVED_DELIVERY") {
            return "delivered";
          }
          if (activeCourierStatus === "DELIVERED") {
            return activeOrderStatus === "completed" ? "completed" : "delivered";
          }
          if (activeCourierStatus === "PICKED_UP") {
            return "shipped";
          }
          const dealStatus = o.deals?.[0]?.id ? getEffectiveOrderStatus(o.deals[0].id, o.deals[0].status || "") : "";
          if (dealStatus === "completed" || dealStatus === "closed" || dealStatus === "received") {
            return dealStatus;
          }
          const fallback = o.deals?.[0]?.status === "completed" ? "completed" : activeOrderStatus;
          return getEffectiveOrderStatus(o.id, fallback);
        })(),
        targetUrl: `/deal/${o.id}`,
        isPickup,
        rawOrder: o,
      });
    });

    // Extract all RFQ IDs that already have an order
    const activeOrderRfqIds = new Set<string>();
    orders.forEach((o) => {
      if (o.rfq_id) {
        activeOrderRfqIds.add(o.rfq_id);
        activeOrderRfqIds.add(String(o.rfq_id).replace("RFQ-", ""));
      }
      if (o.id) {
        const cleanNum = String(o.id).replace(/\D+/g, "");
        if (cleanNum) {
          activeOrderRfqIds.add(`RFQ-${cleanNum}`);
          activeOrderRfqIds.add(cleanNum);
        }
      }
    });

    // Map RFQs
    rfqs.forEach((r) => {
      if (
        !r ||
        !r.id ||
        r.status === "accepted" ||
        r.status === "closed" ||
        r.status === "completed" ||
        r.status === "cancelled" ||
        r.status === "ordered" ||
        activeOrderRfqIds.has(r.id) ||
        activeOrderRfqIds.has(String(r.id).replace("RFQ-", ""))
      ) {
        return; // Exclude converted or accepted RFQs from Pricing Requests tab
      }

      const partsSummary = getPartsSummary(r.parts_description);
      const isDemoVendor = !currentVendorId || currentVendorId === "vendor-demo-id" || currentVendorId === "current-vendor-id";
      let myQuote = r.quotes?.find(
        (q: any) =>
          q.vendor_id === currentVendorId ||
          (isDemoVendor && (q.vendor_id === "vendor-demo-id" || q.vendor_id === "current-vendor-id"))
      );

      // Local storage fallback for instant response right after vendor submits a quote
      if (!myQuote && typeof window !== "undefined") {
        try {
          const cachedQuotes = localStorage.getItem("rfq_demo_quotes");
          if (cachedQuotes) {
            const parsed = JSON.parse(cachedQuotes);
            if (Array.isArray(parsed)) {
              myQuote = parsed.find(
                (q: any) =>
                  q.rfq_id === r.id &&
                  (q.vendor_id === currentVendorId ||
                    (isDemoVendor && (q.vendor_id === "vendor-demo-id" || q.vendor_id === "current-vendor-id")))
              );
            }
          }
        } catch {}
      }

      const quotePrice = myQuote && myQuote.total_price != null ? Number(myQuote.total_price) : null;
      const isQuoted = Boolean(myQuote && quotePrice !== null && quotePrice > 0);

      rows.push({
        rawId: r.id,
        displayId: `RFQ-${shortId(r.id)}`,
        itemType: "rfq",
        carMake: r.car_make || "غير محدد",
        carModel: r.car_model || "",
        carYear: r.car_year || "—",
        plateNumber: r.plate_number || "—",
        vin: r.vin || "—",
        partsText: partsSummary.text,
        partsCount: partsSummary.count,
        imagePathname: partsSummary.imagePathname,
        deliveryLocation: r.delivery_location || "الرياض",
        isUrgent: partsSummary.isUrgent,
        clientName: "شركة مشتريات (عميل B2B)",
        myQuotePrice: quotePrice,
        amount: quotePrice,
        formattedDate: new Date(r.created_at).toLocaleDateString("ar-SA"),
        createdAtRaw: r.created_at,
        status: isQuoted ? "quoted" : "open",
        targetUrl: `/vendor/quote/${r.id}`,
        rawRfq: r,
      });
    });

    // Sort newest first
    return rows.sort(
      (a, b) => new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime()
    );
  }, [rfqs, orders, statusVersion]);

  /* ── Filtered Rows by Tab & Search ── */
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unifiedRows.filter((row) => {
      // Tab matching
      if (activeTab === "rfq" && row.itemType !== "rfq") return false;
      if (activeTab === "active" && (row.itemType !== "order" || COMPLETED_STATUSES.includes(row.status))) return false;
      if (activeTab === "completed" && (row.itemType !== "order" || !COMPLETED_STATUSES.includes(row.status))) return false;

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

      // Search matching
      if (q) {
        const matchStr = `${row.displayId} ${row.carMake} ${row.carModel} ${row.plateNumber} ${row.vin} ${row.partsText} ${row.clientName || ""}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      return true;
    });
  }, [unifiedRows, activeTab, search, dateRange]);

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
        amountOrQuotes:
          r.amount !== null && r.amount !== undefined
            ? r.amount
            : r.myQuotePrice
            ? `${r.myQuotePrice} ر.س`
            : "في انتظار التسعير",
        partsText: r.partsText,
        partyName: r.clientName || "—",
        deliveryLocation: r.deliveryLocation || "الرياض",
      }));
      await exportOrdersToExcel(exportData, "طلبات_وعمليات_المورد_رفق");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Counts for Metric Badges
  const counts = useMemo(() => {
    const rfqCount = unifiedRows.filter((r) => r.itemType === "rfq" && r.status !== "closed").length;
    const activeCount = unifiedRows.filter((r) => r.itemType === "order" && !COMPLETED_STATUSES.includes(r.status)).length;
    const completedCount = unifiedRows.filter((r) => r.itemType === "order" && COMPLETED_STATUSES.includes(r.status)).length;
    const completedAmount = unifiedRows
      .filter((r) => r.itemType === "order" && COMPLETED_STATUSES.includes(r.status))
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      all: unifiedRows.length,
      rfq: rfqCount,
      active: activeCount,
      completed: completedCount,
      completedAmount,
    };
  }, [unifiedRows]);

  return (
    <div className="space-y-6 text-slate-900 pb-16 font-sans">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              لوحة الموردين
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">إدارة الطلبات والمبيعات</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            متابعة طلبات التسعير، تجهيز الطلبات النشطة وسجل العمليات المكتملة
          </p>
        </div>

        {/* Specialization Status Info */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-2xl text-xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-bold block">التخصصات المعتمدة:</span>
            <span className="font-extrabold text-slate-900 text-xs">
              {vendorSpecializations?.specializes_in_all_brands
                ? "كافة الماركات (All Brands)"
                : vendorSpecializations?.specialized_brands && vendorSpecializations.specialized_brands.length > 0
                ? `${vendorSpecializations.specialized_brands.length} ماركات محددة`
                : "لم تُحدد بعد"}
            </span>
          </div>
          <Link
            href="/vendor/profile#brands"
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition-all mr-1 shrink-0"
          >
            تعديل
          </Link>
        </div>
      </div>

      {/* ── Onboarding Banner if No Specialization Configured ── */}
      {vendorSpecializations &&
        !vendorSpecializations.specializes_in_all_brands &&
        (!vendorSpecializations.specialized_brands || vendorSpecializations.specialized_brands.length === 0) && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">
                  لم تقم بتحديد ماركات السيارات التي تتخصص بتوريدها بعد!
                </h3>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  وفق سياسة المنصة الذكية، تظهر طلبات التسعير فقط للموردين المتخصصين في نفس الماركة. يرجى تحديد ماركاتك (مثل: تويوتا، نيسان، هيونداي...) لتصلك طلبات السوق المتوافقة فوراً.
                </p>
              </div>
            </div>
            <Link
              href="/vendor/profile#brands"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all shadow-md shrink-0 self-start sm:self-center"
            >
              <span>تحديد ماركات التخصص الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        )}

      {/* ── 2. Top Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: All Operations */}
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10 ring-2 ring-slate-900/20"
              : "bg-white text-slate-900 border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${activeTab === "all" ? "text-slate-300" : "text-slate-500"}`}>
              إجمالي العمليات
            </span>
            <ClipboardList className={`w-4 h-4 ${activeTab === "all" ? "text-slate-300" : "text-slate-400"}`} />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono">{counts.all}</span>
            <span className={`text-[10px] font-bold ${activeTab === "all" ? "text-slate-400" : "text-slate-400"}`}>
              طلبات تسعير وعمليات
            </span>
          </div>
        </div>

        {/* KPI 2: RFQ Requests */}
        <div
          onClick={() => setActiveTab("rfq")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "rfq"
              ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20"
              : "bg-white text-slate-900 border-slate-200/80 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${activeTab === "rfq" ? "text-amber-100" : "text-amber-700"}`}>
              طلبات التسعير (RFQ)
            </span>
            <FileText className={`w-4 h-4 ${activeTab === "rfq" ? "text-amber-100" : "text-amber-600"}`} />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono">{counts.rfq}</span>
            <span className={`text-[10px] font-bold ${activeTab === "rfq" ? "text-amber-100" : "text-slate-400"}`}>
              جاهزة لتقديم عروض الأسعار
            </span>
          </div>
        </div>

        {/* KPI 3: Active Orders */}
        <div
          onClick={() => setActiveTab("active")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "active"
              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10 ring-2 ring-blue-600/20"
              : "bg-white text-slate-900 border-slate-200/80 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${activeTab === "active" ? "text-blue-100" : "text-blue-700"}`}>
              الطلبات النشطة
            </span>
            <Package className={`w-4 h-4 ${activeTab === "active" ? "text-blue-100" : "text-blue-600"}`} />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono">{counts.active}</span>
            <span className={`text-[10px] font-bold ${activeTab === "active" ? "text-blue-100" : "text-slate-400"}`}>
              قيد التجهيز والشحن
            </span>
          </div>
        </div>

        {/* KPI 4: Completed Orders */}
        <div
          onClick={() => setActiveTab("completed")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "completed"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-600/20"
              : "bg-white text-slate-900 border-slate-200/80 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${activeTab === "completed" ? "text-emerald-100" : "text-emerald-700"}`}>
              الطلبات المكتملة
            </span>
            <CheckCircle2 className={`w-4 h-4 ${activeTab === "completed" ? "text-emerald-100" : "text-emerald-600"}`} />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono">{counts.completed}</span>
            <span className={`text-xs font-bold font-mono ${activeTab === "completed" ? "text-emerald-100" : "text-emerald-700"}`}>
              ({fmt(counts.completedAmount)} ر.س)
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & View Selector Bar ── */}
      <div className="space-y-3">
        {/* Navigation Tabs Pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            الكل (جدول) ({counts.all})
          </button>

          <button
            onClick={() => setActiveTab("rfq")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "rfq"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-white text-amber-900 hover:bg-amber-50 border border-amber-200/80"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>طلبات التسعير (بطاقات) ({counts.rfq})</span>
          </button>

          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "active"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-blue-900 hover:bg-blue-50 border border-blue-200/80"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>الطلبات النشطة (بطاقات) ({counts.active})</span>
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "completed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200/80"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>الطلبات المكتملة والمغلقة (جدول) ({counts.completed})</span>
          </button>
        </div>

        {/* Search & Customizer Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث سريع برقم الطلب، اسم المركبة، اللوحة، رقم الهيكل، أو القطع..."
              className="pr-10 h-10 text-xs rounded-xl bg-white border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range & Time Frame Filter */}
          <DateRangeFilter
            value={dateRange}
            onChange={(val) => setDateRange(val)}
          />

          {/* Excel Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExportingExcel || filteredRows.length === 0}
            className="h-10 px-3.5 rounded-xl border-emerald-200 bg-emerald-50/60 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 gap-1.5 cursor-pointer shadow-2xs"
            title="تصدير نتائج الجدول إلى ملف Excel"
          >
            {isExportingExcel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>تصدير إكسيل</span>
          </Button>

          {(search || dateRange || activeTab !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setDateRange(null);
                setActiveTab("all");
              }}
              className="h-10 px-2.5 text-xs text-red-600 hover:bg-red-50 rounded-xl font-bold cursor-pointer"
            >
              مسح الفلاتر
            </Button>
          )}

          {/* Columns Customizer Dropdown (When in Table View) */}
          {(activeTab === "all" || activeTab === "completed") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3.5 rounded-xl border-slate-200 text-xs font-bold gap-2 text-slate-700 bg-white"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span>تخصيص الأعمدة</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-200 shadow-xl bg-white">
                <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400">إظهار / إخفاء أعمدة الجدول:</div>
                <DropdownMenuSeparator />
                {TABLE_COLUMNS_CONFIG.map((col) => {
                  const isVisible = visibleColumns.includes(col.id);
                  return (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleColumn(col.id);
                      }}
                      className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl cursor-pointer hover:bg-slate-50"
                    >
                      <span className="font-bold text-slate-800">{col.label}</span>
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                        isVisible ? "bg-emerald-600 text-white font-black" : "border border-slate-300"
                      }`}>
                        {isVisible && "✓"}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── 4. Main Content Views ── */}

      {/* ══════════ VIEW A & D: TABLE VIEW (الكل / المكتملة) ══════════ */}
      {(activeTab === "all" || activeTab === "completed") && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {filteredRows.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <ClipboardList className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">لا توجد عمليات تطابق البحث</p>
              <p className="text-xs text-slate-400">جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    {visibleColumns.includes("id") && <th className="py-3 px-4">رقم الطلب / النوع</th>}
                    {visibleColumns.includes("vehicle") && <th className="py-3 px-4">المركبة والموديل</th>}
                    {visibleColumns.includes("plate") && <th className="py-3 px-4">اللوحة / الهيكل</th>}
                    {visibleColumns.includes("price") && <th className="py-3 px-4 text-center">المبلغ / التسعير</th>}
                    {visibleColumns.includes("date") && <th className="py-3 px-4">التاريخ</th>}
                    {visibleColumns.includes("status") && <th className="py-3 px-4">الحالة</th>}
                    {visibleColumns.includes("actions") && <th className="py-3 px-4 text-center">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRows.map((row) => {
                    const effectiveStatus = getEffectiveOrderStatus(row.rawId, row.status);
                    const st = getStatusConfig(row.itemType, effectiveStatus);
                    return (
                      <tr
                        key={row.rawId}
                        onClick={() => router.push(row.targetUrl)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* ID / Type */}
                        {visibleColumns.includes("id") && (
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 text-xs">{row.displayId}</span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                  row.itemType === "rfq"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {row.itemType === "rfq" ? "طلب تسعير" : "أمر بيع"}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Vehicle & Model */}
                        {visibleColumns.includes("vehicle") && (
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 p-1 flex items-center justify-center shrink-0">
                                <CarBrandLogo make={row.carMake} model={row.carModel} className="w-full h-full object-contain" />
                              </div>
                              <div>
                                <span className="font-black text-slate-900 block">{row.carMake} {row.carModel}</span>
                                <span className="text-[10px] text-slate-500 font-medium">موديل {row.carYear}</span>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Plate & VIN */}
                        {visibleColumns.includes("plate") && (
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 block">{row.plateNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[120px]">{row.vin}</span>
                          </td>
                        )}



                        {/* Price */}
                        {visibleColumns.includes("price") && (
                          <td className="py-3.5 px-4 text-center">
                            {row.amount || row.myQuotePrice ? (
                              <span className="font-mono font-black text-emerald-700 text-xs">
                                {fmt(row.amount || row.myQuotePrice || 0)} ر.س
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                                بانتظار التسعير
                              </span>
                            )}
                          </td>
                        )}

                        {/* Date */}
                        {visibleColumns.includes("date") && (
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{row.formattedDate}</td>
                        )}

                        {/* Status Badge */}
                        {visibleColumns.includes("status") && (
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-[10px] font-black border ${st.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                              {st.label}
                            </span>
                          </td>
                        )}

                        {/* Actions */}
                        {visibleColumns.includes("actions") && (
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={row.targetUrl}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition-all"
                                title="عرض التفاصيل"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {row.itemType === "order" && !COMPLETED_STATUSES.includes(row.status) && (
                                <button
                                  onClick={(e) => advanceOrderStatus(row.rawId, row.status, e)}
                                  disabled={updatingOrderId === row.rawId}
                                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  {updatingOrderId === row.rawId ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <span>ترقية</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════ VIEW B: RFQs CARDS (طلبات التسعير - بطاقات مطابقة لصفحة العميل) ══════════ */}
      {activeTab === "rfq" && (
        <div className="space-y-4">
          {filteredRows.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center text-slate-400 space-y-2 border border-slate-200">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">لا توجد طلبات تسعير متاحة حالياً</p>
              <p className="text-xs text-slate-400">ستظهر هنا طلبات تسعير قطع الغيار الجديدة فور نشرها من قبل العملاء</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRows.map((row) => {
                const hasQuoted = Boolean(row.myQuotePrice != null && row.myQuotePrice > 0);
                const st = getStatusConfig("rfq", hasQuoted ? "quoted" : "open");
                return (
                  <div
                    key={row.rawId}
                    onClick={() => router.push(row.targetUrl)}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group relative cursor-pointer"
                  >
                    {/* Top Accent Gradient Bar */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${st.accent || "from-amber-500 to-orange-500"}`} />

                    {/* Card Content Top */}
                    <div className="p-5 space-y-4 flex-1">
                      {/* 1. Header Bar: Balanced 2-Row Architecture */}
                      <div className="space-y-2 pb-2.5 border-b border-gray-100/80">
                        {/* Row 1: Status (Right in RTL) + Order ID (Left in RTL) */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Status Badge */}
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 shadow-2xs transition-all ${st.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dotClass}`} />
                            <span className="whitespace-nowrap leading-none">{st.label}</span>
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
                          {row.status !== "completed" && row.status !== "closed" ? (
                            <RfqCardTimer
                              createdAt={row.createdAtRaw}
                              expiresAt={row.rawRfq?.expires_at}
                              status={row.status}
                              durationMinutes={durationMinutes}
                            />
                          ) : (
                            <div />
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

                              {row.isUrgent && (
                                <span className="bg-amber-500 text-white font-black px-2 py-0.5 rounded-lg text-[10px] shadow-2xs">
                                  ⚡ عاجل جداً
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 5. Financial & Vendor Quote Highlights */}
                      <div className="pt-1">
                        <div
                          className={`rounded-2xl p-3 flex items-center justify-between border ${
                            hasQuoted
                              ? "bg-emerald-50/70 border-emerald-200/80"
                              : "bg-amber-50/60 border-amber-200/70"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {hasQuoted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                            <span
                              className={`text-xs font-black ${
                                hasQuoted ? "text-emerald-950" : "text-amber-950"
                              }`}
                            >
                              {hasQuoted
                                ? "عرض السعر المقدم من طرفك:"
                                : "جاهز لتقديم عرض سعرك التجاري"}
                            </span>
                          </div>

                          {hasQuoted ? (
                            <span className="text-sm font-black text-emerald-800 font-mono">
                              {fmt(row.amount || row.myQuotePrice || 0)} ر.س
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                              بانتظار تسعيرتك
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 6. Card Footer: Date & Vendor Action */}
                    <div className="px-5 py-3.5 bg-[#FAFBFB] border-t border-gray-100 flex items-center justify-between gap-2">
                      {/* Creation Date */}
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{row.formattedDate}</span>
                      </div>

                      {/* Vendor Action Link/Button */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs ${
                          hasQuoted
                            ? "bg-slate-900 hover:bg-slate-800 text-white"
                            : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{hasQuoted ? "تعديل عرض السعر" : "تقديم تسعيرة فورية 🚀"}</span>
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ VIEW C: ACTIVE ORDERS CARDS (الطلبات النشطة - بطاقات) ══════════ */}
      {activeTab === "active" && (
        <div className="space-y-4">
          {filteredRows.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center text-slate-400 space-y-2 border border-slate-200">
              <Package className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">لا توجد طلبات بيع نشطة حالياً</p>
              <p className="text-xs text-slate-400">ستظهر هنا الطلبات فور قبول العميل لعروض الأسعار الخاصة بك</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRows.map((row) => {
                const effectiveStatus = getEffectiveOrderStatus(row.rawId, row.status);
                const statusCfg = getStatusConfig("order", effectiveStatus);
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

                return (
                  <div
                    key={row.rawId}
                    onClick={() => router.push(row.targetUrl)}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group relative cursor-pointer"
                  >
                    {/* Top Accent Line */}
                    <div className="h-1.5 w-full bg-emerald-600" />

                    <div className="p-5 space-y-4 flex-1">
                      {/* 1. Header Bar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                            <span>{statusCfg.label}</span>
                          </span>
                          {row.isPickup ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                              🏬 استلام من الفرع
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#EBF3FF] text-[#1E40AF]">
                              أمر بيع
                            </span>
                          )}
                        </div>
                        <span dir="ltr" className="text-xs font-bold text-gray-400 font-mono tracking-wider">
                          {row.displayId}
                        </span>
                      </div>

                      {/* 2. Vehicle Info Section */}
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
                            <div className="flex flex-col items-center group/node" title="المرحلة 1: تم تأكيد ودفع الطلب">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#1B4D3E] text-white shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <span className="text-[10px] font-bold mt-1 text-gray-900 truncate max-w-full">
                                تم التأكيد
                              </span>
                            </div>

                            {/* Node 2: جاري التجهيز */}
                            <div className="flex flex-col items-center group/node" title="المرحلة 2: جاري فحص وتجهيز القطع بالفرع">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  stepIndex >= 1
                                    ? "bg-[#1B4D3E] text-white shadow-xs"
                                    : "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                }`}
                              >
                                {stepIndex >= 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "2"}
                              </div>
                              <span className={`text-[10px] font-bold mt-1 truncate max-w-full ${stepIndex >= 1 ? "text-gray-900" : "text-[#1B4D3E]"}`}>
                                جاري التجهيز
                              </span>
                            </div>

                            {/* Node 3: جاهز بالفرع 🏬 */}
                            <div
                              onClick={(e) => handleCardStepClick(e, row.rawId, "ready_for_pickup", true)}
                              className="flex flex-col items-center cursor-pointer group/node"
                              title="المرحلة 3: تأكيد جاهزية الطلب للاستلام بالفرع"
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  stepIndex >= 2
                                    ? "bg-[#1B4D3E] text-white shadow-xs"
                                    : stepIndex === 1
                                    ? "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                    : "bg-slate-100 text-slate-400 group-hover/node:bg-emerald-50 group-hover/node:text-emerald-700"
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
                              onClick={(e) => handleCardStepClick(e, row.rawId, "completed", true)}
                              className="flex flex-col items-center cursor-pointer group/node"
                              title="المرحلة 4: تسليم الطلب للعميل بالفرع وتأكيد رمز OTP"
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  stepIndex >= 3
                                    ? "bg-[#1B4D3E] text-white shadow-xs ring-2 ring-emerald-500/20"
                                    : stepIndex === 2
                                    ? "border-2 border-[#1B4D3E] bg-white text-[#1B4D3E] ring-2 ring-emerald-500/20 scale-105"
                                    : "bg-slate-100 text-slate-400 group-hover/node:bg-emerald-50 group-hover/node:text-emerald-700"
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
                            {/* Node 1: تم التجهيز */}
                            <div
                              onClick={(e) => handleCardStepClick(e, row.rawId, "ready")}
                              className="flex flex-col items-center cursor-pointer group/node"
                              title="المرحلة 1: تم التجهيز"
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
                                  "1"
                                )}
                              </div>
                              <span className={`text-[10px] font-bold mt-1 ${stepIndex >= 0 ? "text-gray-900" : "text-gray-400"}`}>
                                تم التجهيز
                              </span>
                            </div>

                            {/* Node 2: تم الشحن */}
                            <div
                              onClick={(e) => handleCardStepClick(e, row.rawId, "shipped")}
                              className="flex flex-col items-center cursor-pointer group/node"
                              title="المرحلة 2: تم الشحن"
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

                            {/* Node 3: جاري التسليم */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                alert("مرحلة التوصيل والتسليم تتم متابعتها وتحديثها مباشرة عبر مندوب التوصيل والعميل.");
                              }}
                              className="flex flex-col items-center cursor-pointer group/node"
                              title="المرحلة 3: جاري التسليم (مع المندوب)"
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

                            {/* Node 4: تأكيد واستلام */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                alert("مرحلة تأكيد الاستلام النهائي مخصصة للعميل بعد استلام القطع وتأكيد مطابقتها.");
                              }}
                              className="flex flex-col items-center cursor-pointer group/node"
                              title="المرحلة 4: تأكيد واستلام (العميل)"
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  stepIndex >= 4
                                    ? "bg-[#1B4D3E] text-white shadow-xs ring-2 ring-emerald-500/20"
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

                      {/* 5. Client Info Badge & Parts text */}
                      <div className="space-y-2 pt-1 border-t border-gray-100/80">
                        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                          {row.partsText || "قطع غيار أمر بيع معتمد"}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                            العميل: {row.clientName}
                          </span>
                          {row.deliveryLocation && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[120px]">{row.deliveryLocation}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 5. Financial Card (تفاصيل مستحقات المورد المعتمدة) */}
                      {row.itemType === "order" && row.partsSubtotal && row.partsSubtotal > 0 ? (
                        <div className="bg-[#E8F4F1]/80 border border-emerald-200/90 rounded-2xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs border-b border-emerald-200/60 pb-1.5">
                            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>تفاصيل المستحقات</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                              الإجمالي: {fmt(row.amount || 0)} ر.س
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                            <div className="bg-white rounded-lg p-1.5 border border-slate-200">
                              <span className="text-slate-500 block text-[9px]">قيمة القطع</span>
                              <strong className="font-mono text-slate-800 font-bold">{fmt(row.partsSubtotal)} ر.س</strong>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-200">
                              <span className="text-amber-700 block text-[9px]">رسوم المنصة ({row.vendorFeePercent || 3}%)</span>
                              <strong className="font-mono text-amber-900 font-bold">-{fmt(row.vendorPlatformFee || 0)} ر.س</strong>
                            </div>
                            <div className="bg-emerald-100/90 rounded-lg p-1.5 border border-emerald-300">
                              <span className="text-emerald-800 block text-[9px] font-bold">صافي المستحقات</span>
                              <strong className="font-mono text-emerald-950 font-black">{fmt(row.vendorNetParts || 0)} ر.س</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#E8F4F1]/60 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>قيمة العرض المالي</span>
                          </div>
                          <span className="text-base font-black text-gray-900 font-mono">
                            {fmt(row.amount || 0)} ر.س
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 6. Footer: Actions & Advance Status */}
                    <div className="px-5 py-3.5 bg-[#FAFBFB] border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{row.formattedDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {stepIndex < 2 ? (
                          <button
                            type="button"
                            onClick={(e) => advanceOrderStatus(row.rawId, effectiveStatus, e)}
                            disabled={updatingOrderId === row.rawId}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {updatingOrderId === row.rawId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>{stepIndex === 0 ? "جاهز للتسليم 📦" : "تسليم للمندوب 🚚"}</span>
                              </>
                            )}
                          </button>
                        ) : stepIndex === 2 ? (
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span>مع المندوب</span>
                          </span>
                        ) : stepIndex === 3 ? (
                          <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 text-[11px] font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>جاري التسليم</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مكتمل</span>
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
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 🚗 Vehicle Details Modal Dialog (نافذة بيانات المركبة التفصيلية) ── */}
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
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div dir="ltr" className="font-mono font-black text-sm text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-gray-100 text-center tracking-wider select-all break-all">
                    {selectedVehicleModal.vin || "غير متوفر"}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedVehicleModal(null)}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 🏬 Branch Pickup OTP Verification Modal ── */}
      {otpModalData && (
        <Dialog open={Boolean(otpModalData)} onOpenChange={(open) => !open && setOtpModalData(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white shadow-2xl border border-emerald-100 font-sans" dir="rtl">
            <DialogHeader className="text-right space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <DialogTitle className="text-lg font-black text-gray-900">
                تسليم الطلب للعميل بالفرع ({otpModalData.displayId})
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium">
                يرجى طلب رمز التحقق (OTP) المكون من 4 أرقام من العميل المتواجد بالفرع لتأكيد تسليم القطع فوراً.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-gray-700">رمز التحقق (OTP):</label>
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="مثال: 4920"
                  className="w-full text-center font-mono text-2xl font-black tracking-widest py-3 rounded-2xl border-2 border-emerald-200 focus:border-emerald-600 focus:outline-none bg-emerald-50/40 text-emerald-950"
                  autoFocus
                />
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 font-medium space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>💡 ملاحظة هامة:</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  بمجرد تأكيد رمز الـ OTP، سيتحول الطلب إلى <strong>مكتمل ومستلم نهائياً</strong> ويتم إيداع مستحقاتك في محفظتك الإلكترونية تلقائياً.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOtpModalData(null)}
                disabled={isVerifyingOtp}
                className="flex-1 rounded-2xl text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleVerifyOtpSubmit}
                disabled={isVerifyingOtp || otpInput.trim().length < 4}
                className="flex-1 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5"
              >
                {isVerifyingOtp ? (
                  <span>جاري التحقق...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد وتسليم نهائي ✅</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── 📷 Image Lightbox Modal ── */}
      {selectedImageModal && (
        <ImageLightboxModal
          imagePathname={selectedImageModal}
          onClose={() => setSelectedImageModal(null)}
        />
      )}
    </div>
  );
}
