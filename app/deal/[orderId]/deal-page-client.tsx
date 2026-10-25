"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Package,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  History,
  Loader2,
  Lock,
  ArrowRight,
  Car,
  User,
  Headphones,
  MessageCircle,
  MapPin,
  CreditCard,
  Check,
  KeyRound,
  Phone,
  Receipt,
  Star,
  ExternalLink,
  ChevronRight,
  Send,
  HelpCircle,
  Download,
  AlertCircle,
  Route,
  Navigation,
  Sparkles,
  Store
} from "lucide-react";
import { CarBrandLogo } from "@/components/car-brand-logo";
import { getEffectiveOrderStatus, syncOrderStatusUpdate } from "@/lib/order-status-sync";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";
import { generateCanonicalInvoiceNumber } from "@/lib/invoice-canonical";

const supabase = createClient();

/* ─────────────────────── Types ─────────────────────── */
interface VersionItem {
  id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  availability?: string;
  part_type?: string;
}

interface Version {
  id: string;
  version_number: number;
  total_price: number;
  delivery_days: number | null;
  warranty_terms: string | null;
  warranty_duration: string | null;
  notes: string | null;
  created_at: string;
  deal_version_items: VersionItem[];
}

interface ItemChange {
  id: string;
  order_id: string;
  change_type: "add" | "edit" | "delete";
  deal_item_id: string | null;
  part_name: string | null;
  part_number: string | null;
  quantity: number | null;
  unit_price: number | null;
  notes: string | null;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by: string | null;
  created_at: string;
}

interface DealFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  status: string;
  uploaded_by: string;
  confirmed_by: string | null;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

interface Review {
  id: string;
  rater_id: string;
  rating: number;
  comment: string | null;
}

interface DealPageClientProps {
  deal: {
    id: string;
    order_id: string;
    client_id: string;
    vendor_id: string;
    status: string;
    current_version: number;
  };
  order: {
    id: string;
    status: string;
    total_price: number;
    delivery_fee?: number | null;
    created_at?: string;
    courier_name?: string;
    courier_vehicle?: string;
    courier_phone?: string;
    rfqs: {
      car_make: string;
      car_model: string;
      car_year: number;
      vin?: string | null;
      plate_number?: string | null;
      delivery_location?: string | null;
      delivery_city?: string | null;
      delivery_district?: string | null;
      delivery_street?: string | null;
      delivery_latitude?: number | null;
      delivery_longitude?: number | null;
      parts_description?: string | null;
    } | null;
  } | null;
  currentVersion: Version | null;
  amendments: ItemChange[];
  files: DealFile[];
  events: TimelineEvent[];
  activityLog: TimelineEvent[];
  reviews: Review[];
  userRole: "client" | "vendor" | "courier" | "admin";
  userId: string;
  vendorName: string;
  clientName?: string;
  clientPhone?: string;
  vendorProfile?: any;
  clientProfile?: any;
  quote?: {
    id: string;
    delivery_cost: number | null;
    delivery_days: number | null;
    notes: string | null;
    created_at: string;
    total_price: number | null;
  } | null;
  isPickup?: boolean;
}

/* ─────────────────────── Helpers ─────────────────────── */
const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  preparing: {
    label: "تم التجهيز",
    badgeClass: "bg-amber-50 text-amber-800 border border-amber-200/70",
    dotClass: "bg-amber-500",
  },
  confirmed: {
    label: "تم التجهيز",
    badgeClass: "bg-amber-50 text-amber-800 border border-amber-200/70",
    dotClass: "bg-amber-500",
  },
  pending: {
    label: "تم التجهيز",
    badgeClass: "bg-amber-50 text-amber-800 border border-amber-200/70",
    dotClass: "bg-amber-500",
  },
  ready: {
    label: "تم التجهيز",
    badgeClass: "bg-blue-50 text-blue-800 border border-blue-200/70",
    dotClass: "bg-blue-500",
  },
  shipped: {
    label: "تم الشحن",
    badgeClass: "bg-indigo-50 text-indigo-800 border border-indigo-200/80",
    dotClass: "bg-indigo-500",
  },
  delivered: {
    label: "جاري التسليم",
    badgeClass: "bg-teal-50 text-teal-800 border border-teal-200/70",
    dotClass: "bg-teal-500",
  },
  out_for_delivery: {
    label: "جاري التسليم",
    badgeClass: "bg-teal-50 text-teal-800 border border-teal-200/70",
    dotClass: "bg-teal-500",
  },
  completed: {
    label: "تأكيد واستلام",
    badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200/70",
    dotClass: "bg-emerald-600",
  },
  closed: {
    label: "تأكيد واستلام",
    badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200/70",
    dotClass: "bg-emerald-600",
  },
  received: {
    label: "تأكيد واستلام",
    badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200/70",
    dotClass: "bg-emerald-600",
  },
  cancelled: {
    label: "ملغي",
    badgeClass: "bg-red-50 text-red-800 border border-red-200/70",
    dotClass: "bg-red-500",
  },
};

const changeTypeLabel: Record<string, string> = {
  add: "إضافة قطعة",
  edit: "تعديل قطعة",
  delete: "حذف قطعة",
};

export function DealPageClient({
  deal,
  order,
  currentVersion,
  amendments: initialAmendments,
  files,
  events,
  activityLog,
  reviews,
  userRole,
  userId,
  vendorName = "وهج الرواد",
  clientName = "عبدالعزيز الشمري",
  clientPhone = "0501237229",
  vendorProfile,
  clientProfile,
  quote,
  isPickup = false,
}: DealPageClientProps) {
  const router = useRouter();
  const orderIdKey = String(order?.id || deal?.order_id || deal?.id || "ORD-5501");

  // Comprehensive Pickup Detection
  const effectiveIsPickup = useMemo(() => {
    let rfqExtra: any = {};
    const partsDesc = (order as any)?.rfqs?.parts_description || (order as any)?.parts_description;
    if (partsDesc) {
      try {
        const parsed = typeof partsDesc === "string" ? JSON.parse(partsDesc) : partsDesc;
        if (Array.isArray(parsed) && parsed.length > 0) rfqExtra = parsed[0] || {};
      } catch {}
    }

    const locText = String(
      (order as any)?.rfqs?.delivery_location ||
      (order as any)?.delivery_location ||
      (order as any)?.pickup_location ||
      rfqExtra?.deliveryLocation ||
      ""
    );

    const hasPickupPhrase =
      locText.includes("استلام من فرع") ||
      locText.includes("استلام من الفرع") ||
      locText.includes("استلام من معرض") ||
      locText.includes("استلام يدوي") ||
      locText === "استلام من فرع المورد";

    const fulfillmentMethod =
      (order as any)?.fulfillment_method ||
      (order as any)?.fulfillment_type ||
      (order as any)?.rfqs?.fulfillment_method ||
      rfqExtra?.fulfillmentMethod ||
      (deal as any)?.fulfillment_method;

    const dm =
      (order as any)?.delivery_method ||
      (order as any)?.delivery_type ||
      (order as any)?.shipping_method ||
      (order as any)?.rfqs?.delivery_method ||
      (order as any)?.rfqs?.delivery_type ||
      rfqExtra?.deliveryMethod ||
      (deal as any)?.delivery_method ||
      (quote as any)?.delivery_method;

    const deliveryFeeVal = Number((order as any)?.delivery_fee ?? (order as any)?.delivery_cost ?? (deal as any)?.delivery_fee ?? 0);

    // 1. Strict Delivery Check: If explicitly delivery or delivery fee > 0, it is 100% DELIVERY
    if (
      fulfillmentMethod === "DELIVERY" ||
      dm === "delivery" ||
      dm === "shipping" ||
      (order as any)?.is_pickup === false ||
      deliveryFeeVal > 0
    ) {
      return false;
    }

    // 2. Pickup Check: Only if explicitly pickup
    if (
      fulfillmentMethod === "BRANCH_PICKUP" ||
      fulfillmentMethod === "SELF_PICKUP" ||
      dm === "pickup" ||
      (order as any)?.is_pickup === true ||
      (order as any)?.rfqs?.is_pickup === true ||
      (order as any)?.pickup_branch ||
      hasPickupPhrase
    ) {
      return true;
    }

    if (isPickup) return true;
    return false;
  }, [isPickup, order, deal, quote]);

  /* ── Role & Permission Resolution ── */
  const [effectiveRole, setEffectiveRole] = useState<"client" | "vendor" | "courier" | "admin">(
    (userRole as any) || "client"
  );

  const [platformSettings, setPlatformSettings] = useState({
    vat_percent: 15,
    platform_commission_percent: 3,
    vat_number: "310987654300003",
    cr_number: "1010789456",
  });

  useEffect(() => {
    fetch("/api/v1/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setPlatformSettings({
            vat_percent: Number(data.settings.vat_percent ?? 15),
            platform_commission_percent: Number(data.settings.platform_commission_percent ?? 3),
            vat_number: data.settings.vat_number || "310987654300003",
            cr_number: data.settings.cr_number || "1010789456",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const matchSession = document.cookie.match(/rfq_session=([^;]+)/);
      const matchRole = document.cookie.match(/rfq_role=([^;]+)/);
      const sVal = matchSession ? decodeURIComponent(matchSession[1]) : "";
      const rVal = matchRole ? decodeURIComponent(matchRole[1]) : "";

      if (rVal === "courier" || sVal === "courier") {
        setEffectiveRole("courier");
      } else if (rVal.startsWith("vendor") || sVal === "vendor") {
        setEffectiveRole("vendor");
      } else if (rVal.startsWith("admin") || sVal === "admin") {
        setEffectiveRole("admin");
      } else if (sVal === "client" || rVal.startsWith("client")) {
        setEffectiveRole("client");
      }
    }
  }, [userRole]);

  const isVendor = effectiveRole === "vendor";
  const isCourier = effectiveRole === "courier";
  const isClient = effectiveRole === "client";
  const isAdmin = effectiveRole === "admin";

  const canVendorControl = isVendor || isAdmin;
  const canCourierControl = isCourier || isAdmin;
  const canClientControl = isClient || isAdmin;

  // Security: OTP is strictly for the client/buyer and hidden from vendor and courier
  const isClientRecipient = isClient || (userRole === "client" && !isVendor && !isCourier);

  /* ── Dynamic Return Navigation by User Role ── */
  const ordersReturnUrl = useMemo(() => {
    if (effectiveRole === "vendor" || userRole === "vendor") return "/vendor/orders";
    if (effectiveRole === "courier" || userRole === "courier") return "/courier";
    if (effectiveRole === "admin" || userRole === "admin") return "/admin/orders";
    return "/client/orders";
  }, [effectiveRole, userRole]);

  const breadcrumbLabel = useMemo(() => {
    if (effectiveRole === "vendor" || userRole === "vendor") return "طلبات ومبيعات المورد";
    if (effectiveRole === "courier" || userRole === "courier") return "مهام التوصيل";
    if (effectiveRole === "admin" || userRole === "admin") return "إدارة الطلبات";
    return "طلباتي";
  }, [effectiveRole, userRole]);

  const handleBackToOrders = () => {
    if (typeof window !== "undefined") {
      if (
        document.referrer &&
        (document.referrer.includes("/vendor/orders") ||
          document.referrer.includes("/client/orders") ||
          document.referrer.includes("/admin/orders") ||
          document.referrer.includes("/courier"))
      ) {
        router.back();
        return;
      }
    }
    router.push(ordersReturnUrl);
  };

  /* ── Live status state ── */
  const [liveStatus, setLiveStatus] = useState(() => {
    const rawStatus = order?.status === "confirmed" ? "preparing" : (order?.status || deal?.status || "preparing");
    return getEffectiveOrderStatus(orderIdKey, rawStatus);
  });

  const [amendments, setAmendments] = useState<ItemChange[]>(initialAmendments);
  const [localActivity, setLocalActivity] = useState<TimelineEvent[]>(() => {
    return [...events, ...activityLog].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  /* ── Modals state ── */
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [vendorRating, setVendorRating] = useState(5);
  const [vendorHover, setVendorHover] = useState(0);
  const [vendorComment, setVendorComment] = useState("");
  const [courierRating, setCourierRating] = useState(5);
  const [courierHover, setCourierHover] = useState(0);
  const [courierComment, setCourierComment] = useState("");

  /* ── Pickup OTP Verification Modal ── */
  const [showPickupOtpModal, setShowPickupOtpModal] = useState(false);
  const [pickupOtpInput, setPickupOtpInput] = useState("");

  // Auto-open rating & confirmation modal when arriving with ?action=confirm
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "confirm" && (liveStatus === "delivered" || liveStatus === "shipped" || liveStatus === "ready")) {
        setRatingModalOpen(true);
      }
    }
  }, [liveStatus]);

  /* ── Dispute form state ── */
  const [disputeCategory, setDisputeCategory] = useState("delay");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  /* ── Support message state ── */
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);

  /* ── Amendment dialogs ── */
  const [showAmendDialog, setShowAmendDialog] = useState(false);
  const [amendType, setAmendType] = useState<"add" | "edit" | "delete">("add");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [amendForm, setAmendForm] = useState({
    part_name: "",
    part_number: "",
    quantity: 1,
    unit_price: 0,
    part_type: "أصلي",
  });
  const [rejectTarget, setRejectTarget] = useState<ItemChange | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* ── Activity & Changes Refresh ── */
  const refreshChanges = useCallback(async () => {
    const { data } = await supabase
      .from("deal_item_changes")
      .select("*")
      .eq("order_id", deal.order_id)
      .order("created_at", { ascending: false });
    if (data) setAmendments(data);
  }, [deal.order_id]);

  const refreshActivity = useCallback(async () => {
    const [eventsRes, activityRes] = await Promise.all([
      supabase.from("deal_events").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false }),
      supabase.from("order_activity_log").select("*").eq("order_id", deal.order_id).order("created_at", { ascending: false }),
    ]);
    const merged = [
      ...(eventsRes.data || []),
      ...(activityRes.data || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLocalActivity(merged);
  }, [deal.id, deal.order_id]);

  /* ── Subscriptions & Real-time Sync ── */
  useEffect(() => {
    const rawStatus = order?.status === "confirmed" ? "preparing" : (order?.status || deal?.status || "preparing");
    const eff = getEffectiveOrderStatus(orderIdKey, rawStatus);
    if (eff && eff !== liveStatus) {
      setLiveStatus(eff);
    }
  }, [order?.status, deal?.status, orderIdKey]);

  useEffect(() => {
    let isMounted = true;
    const cleanId = orderIdKey.replace(/^ORD-/, "").replace(/^DEAL-/, "");

    const pollLiveStatus = async () => {
      try {
        const res = await fetch(`/api/v1/orders/${cleanId}/status`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.status) {
            const serverStatus = data.status;
            if (serverStatus !== liveStatus) {
              setLiveStatus(serverStatus);
              syncOrderStatusUpdate({
                orderId: orderIdKey,
                newStatus: serverStatus,
                actorRole: effectiveRole,
              });
              if (refreshActivity) refreshActivity();
            }
          }
        }
      } catch (err) {
        // Silent retry
      }
    };

    const interval = setInterval(pollLiveStatus, 2500);

    const handleSync = () => {
      const current = getEffectiveOrderStatus(orderIdKey, liveStatus);
      if (current && current !== liveStatus) {
        setLiveStatus(current);
      }
    };

    window.addEventListener("rfq_data_changed", handleSync);
    window.addEventListener("storage", handleSync);

    const channel = supabase
      .channel(`rt:order-status:${deal.order_id || orderIdKey}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${deal.order_id || orderIdKey}` },
        (payload: any) => {
          if (payload?.new?.status) {
            setLiveStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("rfq_data_changed", handleSync);
      window.removeEventListener("storage", handleSync);
      supabase.removeChannel(channel);
    };
  }, [deal.order_id, orderIdKey, liveStatus, effectiveRole, refreshActivity]);

  /* ── Derived items calculation ── */
  const items: VersionItem[] = useMemo(() => {
    if (currentVersion?.deal_version_items && currentVersion.deal_version_items.length > 0) {
      return currentVersion.deal_version_items.map((it) => ({
        ...it,
        part_type: it.part_type || (it.part_name?.includes("تجاري") ? "تجاري" : "أصلي"),
      }));
    }
    return [];
  }, [currentVersion]);

  // Financial calculations from REAL database data
  const totalItemsCount = useMemo(() => items.reduce((acc, it) => acc + (it.quantity || 1), 0), [items]);
  const subtotalPartsPrice = useMemo(() => items.reduce((acc, it) => acc + Number(it.line_total || it.unit_price * (it.quantity || 1)), 0), [items]);
  const deliveryFee = effectiveIsPickup
    ? 0
    : quote?.delivery_cost != null
    ? Number(quote.delivery_cost)
    : (order?.delivery_fee != null ? Number(order.delivery_fee) : 0);
  
  const clientFeePercent = Number(
    (order as any)?.client_platform_fee_percent ??
    (order as any)?.platform_commission_percent ??
    (platformSettings as any).client_platform_fee_percent ??
    platformSettings.platform_commission_percent ??
    1.5
  );
  const vendorFeePercent = Number(
    (order as any)?.vendor_platform_fee_percent ??
    (platformSettings as any).vendor_platform_fee_percent ??
    5
  );

  const currentVatRate = (platformSettings.vat_percent || 15) / 100;
  const currentCommissionRate = clientFeePercent / 100;

  // Platform Fee (Client side)
  const commissionAmount = useMemo(() => {
    if ((order as any)?.client_platform_fee != null && Number((order as any).client_platform_fee) > 0) {
      return Number((order as any).client_platform_fee);
    }
    if ((order as any)?.platform_commission != null && Number((order as any).platform_commission) > 0) {
      return Number((order as any).platform_commission);
    }
    return Number((subtotalPartsPrice * currentCommissionRate).toFixed(2));
  }, [order, subtotalPartsPrice, currentCommissionRate]);

  // Subtotal before tax (Parts + Client Platform Fee)
  const subtotalBeforeTax = useMemo(() => {
    return Number((subtotalPartsPrice + commissionAmount).toFixed(2));
  }, [subtotalPartsPrice, commissionAmount]);

  // Vendor dues calculations
  const vendorDeductedFee = useMemo(() => {
    if ((order as any)?.vendor_platform_fee != null && Number((order as any).vendor_platform_fee) > 0) {
      return Number((order as any).vendor_platform_fee);
    }
    return Number(((subtotalPartsPrice * vendorFeePercent) / 100).toFixed(2));
  }, [order, subtotalPartsPrice, vendorFeePercent]);

  const vendorNetParts = useMemo(() => {
    return Math.max(0, Number((subtotalPartsPrice - vendorDeductedFee).toFixed(2)));
  }, [subtotalPartsPrice, vendorDeductedFee]);

  // Tax calculation (dynamic VAT on real amounts: parts + platform fee + delivery)
  const taxableBase = useMemo(() => {
    return Number((subtotalPartsPrice + commissionAmount + deliveryFee).toFixed(2));
  }, [subtotalPartsPrice, commissionAmount, deliveryFee]);

  const priceBeforeTax = useMemo(() => {
    if (order?.total_price && Number(order.total_price) > 0) {
      return currentVatRate > 0
        ? Math.round((Number(order.total_price) - deliveryFee - commissionAmount) / (1 + currentVatRate))
        : (Number(order.total_price) - deliveryFee - commissionAmount);
    }
    return subtotalPartsPrice;
  }, [order, subtotalPartsPrice, deliveryFee, commissionAmount, currentVatRate]);

  const vatAmount = useMemo(() => {
    if ((order as any)?.tax_amount != null && Number((order as any).tax_amount) > 0) {
      return Number((order as any).tax_amount);
    }
    if (order?.total_price && Number(order.total_price) > 0) {
      return Math.max(0, Number(order.total_price) - deliveryFee - subtotalPartsPrice - commissionAmount);
    }
    return Number((taxableBase * currentVatRate).toFixed(2));
  }, [order, taxableBase, subtotalPartsPrice, deliveryFee, commissionAmount, currentVatRate]);

  const grandTotal = useMemo(() => {
    if (order?.total_price && Number(order.total_price) > 0) {
      return Number(order.total_price);
    }
    return Number((taxableBase + vatAmount).toFixed(2));
  }, [order, taxableBase, vatAmount]);

  const canModifyItems = liveStatus === "preparing" || liveStatus === "confirmed";

  /* ── Status transitions with Global Sync ── */
  async function updateStatus(newStatus: string, otpCode?: string) {
    setIsSaving(true);
    const cleanOId = String(order?.id || deal?.order_id || orderIdKey).replace(/^ORD-/, "").replace(/^DEAL-/, "");

    // 1. If vendor advances to ready, shipped, ready_for_pickup, or completed with OTP
    if (newStatus === "ready" || newStatus === "shipped" || newStatus === "ready_for_pickup" || (newStatus === "completed" && effectiveIsPickup)) {
      try {
        const res = await fetch(`/api/v1/vendor/orders/${cleanOId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetStatus: newStatus, otpCode: otpCode?.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data?.message || "تعذر تحديث حالة الطلب");
          setIsSaving(false);
          return;
        }
      } catch (err: any) {
        console.warn("Vendor status API warning:", err);
      }
    }

    // 2. If client/admin confirms receipt or marks completed/delivered
    if (newStatus === "delivered" || newStatus === "completed") {
      try {
        await fetch(`/api/v1/client/orders/${cleanOId}/confirm-receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorRating,
            vendorComment,
            courierRating,
            courierComment,
          }),
        });
      } catch (err) {
        console.warn("Client confirm error:", err);
      }
    }

    // 3. Optimistic UI update immediately so user sees step transition instantly
    setLiveStatus(newStatus);

    // 4. Add local timeline event immediately
    const newEvent: TimelineEvent = {
      id: `EV-${Date.now()}`,
      event_type: newStatus === "completed" ? "deal_completed" : "status_changed",
      description: `تم تحديث الحالة إلى: ${statusConfig[newStatus]?.label || newStatus}`,
      created_at: new Date().toISOString(),
    };
    setLocalActivity((prev) => [newEvent, ...prev]);

    try {
      await syncOrderStatusUpdate({
        orderId: order?.id || deal?.order_id || orderIdKey,
        newStatus,
        dealId: deal?.id,
        actorRole: (effectiveRole || userRole) as any,
        description: `تم تحديث الحالة إلى: ${statusConfig[newStatus]?.label || newStatus}`,
      });

      try {
        await refreshActivity();
      } catch (e) {
        // Safe fallback
      }
    } catch (err) {
      console.warn("Status update error:", err);
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Amendments actions ── */
  function openAdd() {
    setAmendType("add");
    setSelectedItemId(null);
    setAmendForm({ part_name: "", part_number: "", quantity: 1, unit_price: 0, part_type: "أصلي" });
    setShowAmendDialog(true);
  }

  function openModify(item: VersionItem) {
    setAmendType("edit");
    setSelectedItemId(item.id);
    setAmendForm({
      part_name: item.part_name,
      part_number: item.part_number || "",
      quantity: item.quantity,
      unit_price: item.unit_price,
      part_type: item.part_type || "أصلي",
    });
    setShowAmendDialog(true);
  }

  function openRemove(item: VersionItem) {
    setAmendType("delete");
    setSelectedItemId(item.id);
    setAmendForm({
      part_name: item.part_name,
      part_number: item.part_number || "",
      quantity: item.quantity,
      unit_price: item.unit_price,
      part_type: item.part_type || "أصلي",
    });
    setShowAmendDialog(true);
  }

  async function submitChange() {
    if (!amendForm.part_name && amendType !== "delete") return;
    setIsSaving(true);
    try {
      await supabase.from("deal_item_changes").insert({
        order_id: deal.order_id,
        change_type: amendType,
        deal_item_id: selectedItemId,
        part_name: amendForm.part_name,
        part_number: amendForm.part_number || null,
        quantity: amendForm.quantity,
        unit_price: amendForm.unit_price,
        requested_by: userId,
        status: "pending",
      });

      const recipientId = userRole === "client" ? deal.vendor_id : deal.client_id;
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "item_change_requested",
        title: "طلب تعديل بنود الصفقة",
        message: `تم تقديم طلب ${changeTypeLabel[amendType]}: ${amendForm.part_name}`,
        order_id: deal.order_id,
        sent_at: new Date().toISOString(),
      });

      setShowAmendDialog(false);
      await refreshChanges();
    } finally {
      setIsSaving(false);
    }
  }

  async function approveChange(change: ItemChange) {
    if (!canModifyItems) return;
    setIsSaving(true);
    try {
      if (change.change_type === "add") {
        await supabase.from("deal_items").insert({
          order_id: deal.order_id,
          part_name: change.part_name,
          part_number: change.part_number || null,
          quantity: change.quantity,
          unit_price: change.unit_price,
          availability_status: "available",
        });
      } else if (change.change_type === "edit" && change.deal_item_id) {
        await supabase
          .from("deal_items")
          .update({
            part_name: change.part_name,
            part_number: change.part_number || null,
            quantity: change.quantity,
            unit_price: change.unit_price,
          })
          .eq("id", change.deal_item_id);
      } else if (change.change_type === "delete" && change.deal_item_id) {
        await supabase.from("deal_items").delete().eq("id", change.deal_item_id);
      }

      await supabase
        .from("deal_item_changes")
        .update({ status: "approved", reviewed_by: userId, reviewed_at: new Date().toISOString() })
        .eq("id", change.id);

      await refreshChanges();
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Rating submission (Vendor + Courier) ── */
  async function submitRating() {
    setIsSaving(true);
    try {
      // 1. Save vendor review
      if (vendorRating > 0) {
        await supabase.from("deal_reviews").insert({
          deal_id: deal.id,
          order_id: orderIdKey,
          rater_id: userId,
          reviewee_id: deal.vendor_id,
          role: "vendor",
          rating: vendorRating,
          comment: vendorComment || null,
        });
      }

      // 2. Save courier review (only if delivery)
      if (!effectiveIsPickup && courierRating > 0) {
        await supabase.from("deal_reviews").insert({
          deal_id: deal.id,
          order_id: orderIdKey,
          rater_id: userId,
          role: "courier",
          rating: courierRating,
          comment: courierComment || null,
        });
      }

      // 3. Mark deal as completed
      await updateStatus("completed");
      setRatingModalOpen(false);
      router.refresh();
    } catch (err) {
      console.warn("Error submitting rating:", err);
      await updateStatus("completed");
      setRatingModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Support & Dispute handling ── */
  function handleSendSupport() {
    setSupportSent(true);
    setTimeout(() => {
      setSupportSent(false);
      setShowSupportModal(false);
      setSupportMessage("");
    }, 1500);
  }

  function handleSendDispute() {
    setDisputeSubmitted(true);
    setTimeout(() => {
      setDisputeSubmitted(false);
      setShowDisputeModal(false);
      setDisputeNotes("");
    }, 1500);
  }

  /* ── Delivery timeline stage calculation (1-indexed matching 4 canonical stages) ── */
  const currentStepNumber = useMemo(() => {
    if (effectiveIsPickup) {
      if (liveStatus === "pending" || liveStatus === "confirmed") return 1;
      if (liveStatus === "preparing") return 2;
      if (liveStatus === "ready" || liveStatus === "ready_for_pickup") return 3;
      if (liveStatus === "completed" || liveStatus === "closed" || liveStatus === "received" || liveStatus === "delivered" || liveStatus === "picked_up") return 4;
      return 1;
    }
    if (liveStatus === "preparing" || liveStatus === "confirmed" || liveStatus === "pending") return 1;
    if (liveStatus === "ready" || liveStatus === "shipped") return 2;
    if (liveStatus === "delivered" || liveStatus === "out_for_delivery") return 3;
    if (liveStatus === "completed" || liveStatus === "closed" || liveStatus === "received") return 4;
    return 1;
  }, [liveStatus, effectiveIsPickup]);

  // Dynamic order ID display
  const displayOrderId = useMemo(() => {
    const raw = order?.id || deal?.order_id || deal?.id || "5940";
    return String(raw).replace(/^ORD-/, "").replace(/^DEAL-/, "");
  }, [deal, order]);

  // Delivery OTP code calculation (dynamic, unique, non-static per order)
  const displayOtpCode = useMemo(() => {
    if ((order as any)?.otp) return String((order as any).otp);
    if ((order as any)?.otp_code) return String((order as any).otp_code);
    const rawNum = String(displayOrderId || "").replace(/\D+/g, "");
    const baseNum = rawNum ? parseInt(rawNum, 10) : 6997;
    return String(((Math.abs(baseNum * 31337 + 7919) % 9000) + 1000));
  }, [order, displayOrderId]);

  // Real Vehicle data from DB
  const vehicle = useMemo(() => {
    return {
      make: order?.rfqs?.car_make || "تويوتا",
      model: order?.rfqs?.car_model || "كامري",
      year: order?.rfqs?.car_year ? String(order.rfqs.car_year) : "-",
      vin: order?.rfqs?.vin || order?.rfqs?.plate_number || "غير متوفر",
    };
  }, [order]);

  // Real Delivery Receiver data from DB
  const receiver = useMemo(() => {
    return {
      name: clientName || "العميل",
      phone: clientPhone || "-",
      location: order?.rfqs?.delivery_location || (order?.rfqs?.delivery_city ? `${order.rfqs.delivery_city} ${order.rfqs.delivery_district ? "- " + order.rfqs.delivery_district : ""}` : "الموقع غير محدد"),
    };
  }, [clientName, clientPhone, order]);

  // Real Driver data
  const driver = useMemo(() => {
    return {
      name: order?.courier_name || "سعيد المطيري (مندوب معتمد)",
      vehicle: order?.courier_vehicle || "دراجة نارية - لوحة د هـ 2214",
      phone: order?.courier_phone || "0559876543",
    };
  }, [order]);

  // Order creation date formatted
  const orderFormattedDate = useMemo(() => {
    if (!order?.created_at) return "اليوم";
    try {
      return new Date(order.created_at).toLocaleDateString("ar-SA", {
        day: "numeric",
        month: "long",
      });
    } catch (e) {
      return "اليوم";
    }
  }, [order]);

  // Vendor Initials
  const vendorInitials = useMemo(() => {
    const name = vendorName || "المورد المعتمد";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2);
  }, [vendorName]);

  const currentStatusInfo = useMemo(() => {
    if (effectiveIsPickup) {
      if (liveStatus === "pending" || liveStatus === "confirmed") {
        return { label: "تم التأكيد والدفع", badgeClass: "bg-amber-50 text-amber-800 border border-amber-200/70", dotClass: "bg-amber-500" };
      }
      if (liveStatus === "preparing") {
        return { label: "جاري التجهيز بالفرع", badgeClass: "bg-amber-50 text-amber-800 border border-amber-200/70", dotClass: "bg-amber-500" };
      }
      if (liveStatus === "ready" || liveStatus === "ready_for_pickup") {
        return { label: "جاهز للاستلام بالفرع 🏬", badgeClass: "bg-blue-50 text-blue-800 border border-blue-200/70", dotClass: "bg-blue-500" };
      }
      if (liveStatus === "completed" || liveStatus === "closed" || liveStatus === "received" || liveStatus === "delivered" || liveStatus === "picked_up") {
        return { label: "تم الاستلام بالفرع ✅", badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200/70", dotClass: "bg-emerald-600" };
      }
    }
    return statusConfig[liveStatus] || statusConfig.preparing;
  }, [liveStatus, effectiveIsPickup]);
  const pendingChanges = amendments.filter((a) => a.status === "pending");

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] py-6 px-4 sm:px-6 font-sans" dir="rtl">
      <div className="w-full space-y-6">

        {/* ════════════════════════════════════════════════════
            1. TOP HEADER (رأس الصفحة - RTL ALIGNED)
        ════════════════════════════════════════════════════ */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-1">
          {/* Title, Breadcrumb & Vendor Tag (Right side in RTL) */}
          <div className="space-y-2 text-right">
            {/* Return Button & Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToOrders}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200/90 hover:border-emerald-500 hover:bg-emerald-50/40 text-gray-700 hover:text-emerald-900 text-xs font-bold shadow-2xs transition-all cursor-pointer group active:scale-95"
                title="الرجوع إلى صفحة الطلبات"
              >
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-800 transition-transform group-hover:translate-x-0.5" />
                <span>العودة للطلبات</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-normal">
                <Link href={ordersReturnUrl} className="hover:text-gray-600 transition-colors">
                  {breadcrumbLabel}
                </Link>
                <span>/</span>
                <span className="text-gray-600 font-bold">تفاصيل الطلب</span>
              </div>
            </div>

            {/* Main Title & Status Badge */}
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                تفاصيل الطلب #{displayOrderId}
              </h1>

              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${currentStatusInfo.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentStatusInfo.dotClass}`} />
                <span>{currentStatusInfo.label}</span>
              </div>
            </div>

            {/* Vendor info tag */}
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-0.5">
              <span>المورد المعتمد لهذا الطلب</span>
              <button
                type="button"
                onClick={() => setShowVendorModal(true)}
                className="inline-flex items-center gap-1.5 font-medium text-gray-800 bg-white border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/20 px-2.5 py-0.5 rounded-full shadow-xs cursor-pointer active:scale-95 transition-all group"
                title="عرض تفاصيل المورد"
              >
                <span className="w-5 h-5 rounded-full bg-[#0F4C5C] group-hover:bg-[#1B4D3E] text-white text-[10px] font-bold flex items-center justify-center transition-colors">
                  {vendorInitials}
                </span>
                <span className="group-hover:text-emerald-900 transition-colors">{vendorName}</span>
              </button>
            </div>
          </div>

          {/* Action buttons (Left side in RTL) */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {/* Contact Support Button */}
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111827] text-white text-xs sm:text-sm font-medium hover:bg-black transition-all shadow-sm hover:shadow active:scale-[0.98]"
            >
              <Headphones className="w-4 h-4" />
              <span>تواصل مع الدعم</span>
            </button>

            {/* Report Issue Button */}
            <button
              type="button"
              onClick={() => setShowDisputeModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 transition-all shadow-sm hover:shadow-sm active:scale-[0.98]"
            >
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <span>إبلاغ عن مشكلة</span>
            </button>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════
            2. COMPACT ULTRA-PREMIUM ORDER TIMELINE TRACKER (مسار الطلب)
        ════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl md:rounded-3xl border border-gray-100/90 shadow-sm p-4 sm:p-5 relative overflow-hidden">
          
          {/* Subtle background glow accent */}
          <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-emerald-50/40 via-teal-50/15 to-transparent rounded-full blur-3xl -z-0 pointer-events-none" />

          {/* Card Header inside (Compact) */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50/80 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-[#12362C] text-white flex items-center justify-center shadow-sm shadow-[#1B4D3E]/20">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-1.5">
                  <span>مسار الطلب</span>
                </h2>
                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>تحديث مباشر لحالة الشحنة والتسليم</span>
                </p>
              </div>
            </div>

            {/* Estimated time box (Compact) */}
            <div className="text-left bg-gradient-to-l from-slate-50 to-white border border-slate-100 px-3 py-1 rounded-xl shadow-2xs">
              <span className="block text-[9px] sm:text-[10px] text-gray-400 font-semibold">موعد التسليم المتوقع</span>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-xs sm:text-sm font-black text-gray-900">
                  {quote?.delivery_days && quote.delivery_days > 0 ? `خلال ${quote.delivery_days} أيام` : "اليوم"}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>

          {/* ─── Precision Compact Stepper Track ─── */}
          <div className="relative py-1 my-0.5 z-10">

            {/* Inactive Background Line */}
            <div 
              className="absolute top-[20px] h-[2.5px] bg-slate-100 rounded-full z-0 pointer-events-none"
              style={{
                right: "12.5%",
                left: "12.5%",
              }}
            />

            {/* Active Emerald Progress Line */}
            <div
              className="absolute top-[20px] h-[2.5px] bg-gradient-to-l from-[#1B4D3E] via-emerald-600 to-teal-500 rounded-full z-0 transition-all duration-700 ease-out shadow-xs"
              style={{
                right: "12.5%",
                width:
                  currentStepNumber === 1
                    ? "0%"
                    : currentStepNumber === 2
                    ? "33.33%"
                    : currentStepNumber === 3
                    ? "66.66%"
                    : "100%",
              }}
            />

            {/* Stepper Nodes (Dynamic Delivery vs Branch Pickup) */}
            <div className="grid grid-cols-4 relative z-10 text-center">
              
              {/* ── Step 1: تم التأكيد (استلام فرع) أو تم التجهيز (توصيل مندوب) ── */}
              <div className="flex flex-col items-center group cursor-default">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentStepNumber > 1
                      ? "bg-gradient-to-br from-[#1B4D3E] to-[#12362C] text-white shadow-md shadow-[#1B4D3E]/25 ring-3 ring-emerald-600/15"
                      : currentStepNumber === 1
                      ? "bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white ring-3 ring-amber-500/25 shadow-md scale-105"
                      : "border-2 border-slate-200 bg-white text-slate-300"
                  }`}
                >
                  {currentStepNumber > 1 ? (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  ) : (
                    <Package className="w-4 h-4 text-white animate-pulse" />
                  )}
                </div>
                <span className="text-xs font-extrabold text-gray-900 mt-2">
                  {effectiveIsPickup ? "تم التأكيد" : "تم التجهيز"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {effectiveIsPickup ? "تأكيد ودفع الطلب" : "المورد"}
                </span>
              </div>

              {/* ── Step 2: جاري التجهيز (استلام فرع) أو تم الشحن (توصيل مندوب) ── */}
              <div className="flex flex-col items-center group cursor-default">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                    currentStepNumber > 2
                      ? "bg-gradient-to-br from-[#1B4D3E] to-[#12362C] text-white shadow-sm"
                      : currentStepNumber === 2
                      ? "bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white ring-3 ring-emerald-500/25 shadow-md shadow-gray-950/20 scale-105"
                      : "border-2 border-slate-200 bg-slate-50/50 text-slate-300"
                  }`}
                >
                  {currentStepNumber > 2 ? (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  ) : currentStepNumber === 2 ? (
                    <>
                      {effectiveIsPickup ? <Store className="w-4 h-4 text-white animate-pulse" /> : <Truck className="w-4 h-4 text-white animate-pulse" />}
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-ping" />
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                    </>
                  ) : effectiveIsPickup ? (
                    <Store className="w-3.5 h-3.5 text-slate-300" />
                  ) : (
                    <Truck className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
                <span className={`text-xs font-extrabold mt-2 ${currentStepNumber >= 2 ? "text-gray-900" : "text-gray-400"}`}>
                  {effectiveIsPickup ? "جاري التجهيز" : "تم الشحن"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {effectiveIsPickup ? "المورد بالفرع" : "المندوب"}
                </span>
              </div>

              {/* ── Step 3: جاهز بالفرع 🏬 (استلام فرع) أو جاري التسليم (توصيل مندوب) ── */}
              <div className="flex flex-col items-center group cursor-default">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentStepNumber > 3
                      ? "bg-gradient-to-br from-[#1B4D3E] to-[#12362C] text-white shadow-sm"
                      : currentStepNumber === 3
                      ? "bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white ring-3 ring-emerald-500/25 shadow-md scale-105"
                      : "border-2 border-slate-200 bg-slate-50/50 text-slate-300"
                  }`}
                >
                  {currentStepNumber > 3 ? (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  ) : currentStepNumber === 3 ? (
                    effectiveIsPickup ? <Store className="w-4 h-4 text-white animate-pulse" /> : <ShieldCheck className="w-4 h-4 text-white animate-pulse" />
                  ) : (
                    effectiveIsPickup ? <Store className="w-3.5 h-3.5 text-slate-300" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
                <span className={`text-xs font-extrabold mt-2 ${currentStepNumber >= 3 ? "text-gray-900" : "text-gray-400"}`}>
                  {effectiveIsPickup ? "جاهز بالفرع 🏬" : "جاري التسليم"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {effectiveIsPickup ? "بانتظار العميل (OTP)" : (currentStepNumber > 3 ? "تأكيد المندوب" : "المندوب")}
                </span>
              </div>

              {/* ── Step 4: تم الاستلام ✅ (استلام فرع) أو تأكيد واستلام (توصيل مندوب) ── */}
              <div className="flex flex-col items-center group cursor-default">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentStepNumber >= 4
                      ? "bg-gradient-to-br from-[#1B4D3E] to-[#12362C] text-white shadow-sm ring-3 ring-emerald-500/20"
                      : "border-2 border-slate-200 bg-slate-50/50 text-slate-300"
                  }`}
                >
                  {currentStepNumber >= 4 ? (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
                <span className={`text-xs font-extrabold mt-2 ${currentStepNumber >= 4 ? "text-gray-900" : "text-gray-400"}`}>
                  {effectiveIsPickup ? "تم الاستلام ✅" : "تأكيد واستلام"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {effectiveIsPickup ? (currentStepNumber >= 4 ? "تم تسليم الطلب" : "تسليم بالفرع والتقييم") : (currentStepNumber >= 4 ? "تم التقييم" : "تقييم العميل")}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Compact Bottom Status & Action Toolbar ─── */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs relative z-10">
            {/* View timeline button & Legal Rule Notification Banner (Right) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTimeline(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-gray-600 hover:text-gray-900 font-semibold transition-all border border-slate-200/60 text-xs shadow-2xs cursor-pointer"
              >
                <History className="w-3 h-3 text-emerald-700" />
                <span>عرض السجل الزمني</span>
              </button>

              {/* Customer OTP badge shown during delivery/pickup stages (Client View Only) */}
              {isClientRecipient && (liveStatus === "ready" || liveStatus === "ready_for_pickup" || liveStatus === "shipped" || liveStatus === "delivered" || liveStatus === "out_for_delivery") && (
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-950 to-slate-900 text-white px-3 py-1 rounded-full border border-emerald-500/40 shadow-2xs text-xs">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-200 font-medium">
                    {effectiveIsPickup ? "رمز استلام الطلب من الفرع (OTP):" : "رمز استلام الشحنة (OTP):"}
                  </span>
                  <span className="font-mono font-black text-emerald-400 tracking-widest bg-emerald-900/80 px-2 py-0.5 rounded-md border border-emerald-500/30 text-xs">
                    {displayOtpCode}
                  </span>
                </div>
              )}

              {liveStatus === "delivered" && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-bold shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>
                    {effectiveIsPickup
                      ? "تم تأكيد الاستلام بالفرع (في حال عدم تأكيد العميل، يكفي تأكيد المورد)"
                      : "تم تأكيد التسليم من المندوب (في حال عدم تأكيد العميل، يكفي تأكيد المندوب)"}
                  </span>
                </span>
              )}
            </div>

            {/* Action buttons & Role-based controls (Left) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Admin Simulation View Selector */}
              {(userRole === "admin" || effectiveRole === "admin") && (
                <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200 text-[10px] ml-1">
                  <span className="text-gray-400 px-1 font-bold">معاينة:</span>
                  {(["admin", "client", "vendor", "courier"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEffectiveRole(r)}
                      className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                        effectiveRole === r
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {r === "admin" ? "الأدمن" : r === "client" ? "العميل" : r === "vendor" ? "المورد" : "المندوب"}
                    </button>
                  ))}
                </div>
              )}

              {/* ── 1. STEP 1: PREPARING -> READY (المورد فقط) ── */}
              {(liveStatus === "preparing" || liveStatus === "confirmed" || liveStatus === "pending") && (
                canVendorControl ? (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(effectiveIsPickup ? "ready_for_pickup" : "ready")}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-[#1B4D3E] to-emerald-700 hover:from-[#14392E] hover:to-emerald-800 text-white rounded-full text-xs font-bold px-3.5 py-1.5 gap-1.5 shadow-xs h-8 cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span>{effectiveIsPickup ? "تأكيد جاهزية الطلب بالفرع (المورد)" : "تأكيد التجهيز (المورد)"}</span>
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80 font-bold">
                    <Package className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>{effectiveIsPickup ? "الطلب قيد التجهيز في فرع المورد" : "الطلب قيد التجهيز من قبل المورد"}</span>
                  </span>
                )
              )}

              {/* ── 2. STEP 2: READY / READY_FOR_PICKUP (الاستلام: المورد بالفرع / التوصيل: المندوب فقط) ── */}
              {(liveStatus === "ready" || liveStatus === "ready_for_pickup") && (
                effectiveIsPickup ? (
                  // Pickup: Vendor verifies OTP to complete handover
                  canVendorControl ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPickupOtpInput("");
                        setShowPickupOtpModal(true);
                      }}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-[#1B4D3E] to-emerald-700 hover:from-[#14392E] hover:to-emerald-800 text-white rounded-full text-xs font-bold px-3.5 py-1.5 gap-1.5 shadow-xs h-8 cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Store className="w-3 h-3" />}
                      <span>تسليم القطع للعميل بالفرع (رمز OTP) 🏬</span>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80 font-bold">
                      <Store className="w-3.5 h-3.5 text-blue-600" />
                      <span>الطلب جاهز للاستلام بفرع المورد — يرجى التوجه للاستلام وإبراز الرمز</span>
                    </span>
                  )
                ) : (
                  // Delivery: Courier accepts & ships package
                  canCourierControl ? (
                    <Button
                      size="sm"
                      onClick={() => updateStatus("shipped")}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-[#111827] to-slate-800 hover:from-black hover:to-slate-900 text-white rounded-full text-xs font-bold px-3.5 py-1.5 gap-1.5 shadow-xs h-8 cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                      <span>تأكيد استلام المندوب (تم الشحن)</span>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80 font-bold">
                      <Truck className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                      <span>{canVendorControl ? "تم التجهيز بنجاح — بانتظار استلام المندوب للشحنة" : "تم تجهيز طلبك — بانتظار استلام المندوب للشحن"}</span>
                    </span>
                  )
                )
              )}

              {/* ── 3. STEP 3: SHIPPED -> DELIVERED (المندوب فقط) ── */}
              {!effectiveIsPickup && liveStatus === "shipped" && (
                canCourierControl ? (
                  <Button
                    size="sm"
                    onClick={() => updateStatus("delivered")}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-[#1B4D3E] to-emerald-700 hover:from-[#14392E] hover:to-emerald-800 text-white rounded-full text-xs font-bold px-3.5 py-1.5 gap-1.5 shadow-xs h-8 cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span>تأكيد تسليم المندوب للعميل (تم التسليم)</span>
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80 font-bold">
                    <Truck className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>{canVendorControl ? "الشحنة قيد التوصيل للعميل مع المندوب" : "الشحنة في طريقها إليك برفقة مندوب التوصيل (جاري التسليم)"}</span>
                  </span>
                )
              )}

              {/* ── 4. STEP 4: DELIVERED -> COMPLETED (العميل فقط) ── */}
              {liveStatus === "delivered" && (
                canClientControl ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setRatingModalOpen(true);
                    }}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold px-4 py-1.5 gap-1.5 shadow-sm h-8 cursor-pointer animate-pulse"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5 fill-white" />}
                    <span>تأكيد الاستلام والتقييم (العميل)</span>
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span>تم التسليم — بانتظار تأكيد وتقييم العميل</span>
                  </span>
                )
              )}

              {/* ── 5. COMPLETED ── */}
              {liveStatus === "completed" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-3 py-1 rounded-full font-bold shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>طلب مكتمل ومُقيّم بنجاح</span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            3. TWO-COLUMN MAIN CONTENT GRID (RTL ORDER)
            Right side in RTL: Requested Parts & Payment Breakdown (col-span-8)
            Left side in RTL: Receiver details, Driver & Vehicle (col-span-4)
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ──────────────────────────────────────────────────
              MAIN RIGHT COLUMN (القطع المطلوبة + تفاصيل الدفع)
              First child = RIGHT side in RTL
              Spans 8 columns on large screens
          ────────────────────────────────────────────────── */}
          <main className="lg:col-span-8 space-y-5">

            {/* Card 1: القطع المطلوبة (Requested Parts Table) */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100/90 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">القطع المطلوبة</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                    {totalItemsCount} قطع
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead>
                    <tr className="text-gray-400 font-medium border-b border-gray-50 text-[11px] sm:text-xs">
                      <th className="py-3.5 px-5 sm:px-6 text-right">القطعة</th>
                      <th className="py-3.5 px-3 text-center">الكمية</th>
                      <th className="py-3.5 px-3 text-center">النوع</th>
                      <th className="py-3.5 px-5 sm:px-6 text-left">السعر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* Part Name */}
                        <td className="py-4 px-5 sm:px-6 font-bold text-gray-900 text-right">
                          <div>
                            <span>{item.part_name}</span>
                            {item.part_number && (
                              <span className="block text-[10px] text-gray-400 font-mono font-normal mt-0.5">
                                {item.part_number}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-4 px-3 text-center font-semibold text-gray-800">
                          {item.quantity}
                        </td>

                        {/* Type Badge */}
                        <td className="py-4 px-3 text-center">
                          <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2F6] text-[#334155] text-xs font-semibold">
                            {item.part_type || "أصلي"}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-4 px-5 sm:px-6 text-left font-bold text-gray-900 whitespace-nowrap">
                          {Number(item.line_total || item.unit_price * item.quantity).toLocaleString("ar-SA")} ر.س
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Subtotal line */}
              <div className="p-4 sm:p-5 bg-[#FAFBFB] border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm font-bold text-gray-900">
                <span className="text-gray-500">الإجمالي شامل الضريبة</span>
                <span className="text-sm sm:text-base font-extrabold">
                  {subtotalPartsPrice.toLocaleString("ar-SA")} ر.س
                </span>
              </div>
            </div>

            {/* Card 2: تفاصيل الدفع (Payment Breakdown) */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100/90 shadow-sm p-5 sm:p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2 text-gray-900 font-bold text-base sm:text-lg border-b border-gray-50 pb-3">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <h3>تفاصيل الدفع</h3>
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-3 text-xs sm:text-sm pt-1">
                <div className="flex items-baseline justify-between text-gray-600">
                  <span>المجموع الفرعي للقطع</span>
                  <span className="font-semibold text-gray-900">{subtotalPartsPrice.toLocaleString("ar-SA")} ر.س</span>
                </div>

                {clientFeePercent > 0 && (
                  <div className="flex items-baseline justify-between text-indigo-700 bg-indigo-50/70 px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold text-xs">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      <span>رسوم المنصة ({clientFeePercent}%)</span>
                    </span>
                    <span className="font-bold text-indigo-950">+{commissionAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                )}

                <div className="flex items-baseline justify-between text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/80 font-bold text-xs">
                  <span>الإجمالي قبل الضريبة</span>
                  <span className="font-mono text-slate-900">{subtotalBeforeTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                </div>

                <div className="flex items-baseline justify-between text-gray-600">
                  <span>رسوم التوصيل {effectiveIsPickup ? "(استلام من الفرع)" : ""}</span>
                  <span className="font-semibold text-gray-900">{deliveryFee.toLocaleString("ar-SA")} ر.س</span>
                </div>

                <div className="flex items-baseline justify-between text-gray-600">
                  <span>ضريبة القيمة المضافة ({platformSettings.vat_percent}%)</span>
                  <span className="font-semibold text-gray-900">+{vatAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                </div>

                {effectiveRole === "vendor" && (
                  <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2 my-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-950 border-b border-emerald-200/60 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>تفاصيل مستحقات المورد</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800">
                        رسوم المنصة: {vendorFeePercent}%
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-baseline justify-between text-slate-700">
                        <span>قيمة القطع:</span>
                        <span className="font-mono font-bold text-slate-900">{subtotalPartsPrice.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                      </div>
                      <div className="flex items-baseline justify-between text-amber-800">
                        <span>رسوم المنصة المخصومة ({vendorFeePercent}%):</span>
                        <span className="font-mono font-bold">-{vendorDeductedFee.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                      </div>
                      <div className="flex items-baseline justify-between text-emerald-900 font-extrabold pt-1.5 border-t border-emerald-200/70 text-sm">
                        <span>صافي مستحقات المورد:</span>
                        <span className="font-mono font-black">{vendorNetParts.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashed Separator */}
                <div className="border-t border-dashed border-gray-200 my-3" />

                {/* Grand Total */}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-sm sm:text-base font-bold text-gray-900">الإجمالي المستحق</span>
                  <span className="text-xl sm:text-2xl font-black text-gray-900">
                    {grandTotal.toLocaleString("ar-SA")} ر.س
                  </span>
                </div>

                {/* Paid badge & Canonical Invoice PDF Export */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold shadow-2xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>تم الدفع</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-500">
                      {generateCanonicalInvoiceNumber(deal.order_id)}
                    </span>
                  </div>

                  <InvoicePDFExport
                    platformSettings={platformSettings}
                    userRole={effectiveRole === "vendor" ? "vendor" : "client"}
                    invoice={{
                      id: deal.order_id,
                      invoice_number: generateCanonicalInvoiceNumber(deal.order_id),
                      order_id: deal.order_id,
                      total_amount: grandTotal,
                      subtotal: priceBeforeTax,
                      delivery_cost: deliveryFee,
                      platform_commission: commissionAmount,
                      platform_commission_percent: platformSettings.platform_commission_percent,
                      tax_amount: vatAmount,
                      vat_percent: platformSettings.vat_percent,
                      status: "paid",
                      created_at: order?.created_at || new Date().toISOString(),
                    }}
                    vendor={vendorProfile || { company_name: vendorName }}
                    client={clientProfile || { company_name: clientName || "العميل" }}
                    order={{
                      id: deal.order_id,
                      car_make: order?.rfqs?.car_make,
                      car_model: order?.rfqs?.car_model,
                      car_year: order?.rfqs?.car_year,
                      plate_number: order?.rfqs?.plate_number || undefined,
                    }}
                    items={items.map((it: any) => ({
                      part_name: it.part_name,
                      part_number: it.part_number || undefined,
                      quantity: it.quantity,
                      unit_price: it.unit_price,
                      line_total: it.line_total,
                    }))}
                    triggerButton={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-xs font-bold gap-2 h-9"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل الفاتورة الضريبية الرسمية (PDF)</span>
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>

            {/* Pending change requests notice (if any) */}
            {pendingChanges.length > 0 && (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>يوجد {pendingChanges.length} طلبات تعديل معلّقة</span>
                </div>
                <div className="space-y-2">
                  {pendingChanges.map((change) => {
                    const isRequester = change.requested_by === userId;
                    return (
                      <div
                        key={change.id}
                        className="bg-white border border-amber-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-bold text-gray-900 ml-1">{changeTypeLabel[change.change_type]}:</span>
                          <span className="text-gray-700">{change.part_name}</span>
                          {change.quantity && <span className="text-gray-500 mr-2">({change.quantity} حبة)</span>}
                        </div>

                        {!isRequester && canModifyItems && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveChange(change)}
                              disabled={isSaving}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-3"
                            >
                              موافقة
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </main>

          {/* ──────────────────────────────────────────────────
              LEFT SIDEBAR (المستلم، السائق، بيانات المركبة)
              Second child = LEFT side in RTL
              Spans 4 columns on large screens
          ────────────────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-4">

            {/* Card 1: تفاصيل المستلم (Receiver Details - Client Only) */}
            {userRole === "client" && (
              <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100/90 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm sm:text-base border-b border-gray-50 pb-3">
                  <User className="w-4 h-4 text-emerald-700" />
                  <h3>تفاصيل المستلم</h3>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-gray-400 font-normal">الاسم</span>
                    <span className="font-bold text-gray-900 text-left">{receiver.name}</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-gray-400 font-normal">رقم الجوال</span>
                    <span className="font-semibold text-gray-800 text-left font-mono" dir="ltr">
                      {receiver.phone}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-gray-400 font-normal">الموقع</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(receiver.location || "الرياض")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline text-left flex items-center gap-1.5 group/loc transition-colors cursor-pointer"
                      title="فتح العنوان على خرائط Google"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 inline group-hover/loc:scale-110 transition-transform" />
                      <span>{receiver.location}</span>
                      <ExternalLink className="w-3 h-3 text-emerald-600 opacity-70 group-hover/loc:opacity-100" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: مندوب التوصيل / فرع الاستلام (Driver or Branch Details) */}
            {effectiveIsPickup ? (
              <div className="bg-white rounded-2xl border border-gray-100/90 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#E8F4F1] text-[#1B4D3E] flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      الاستلام من الفرع 🏬
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug mt-1">
                      {vendorName}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {vendorProfile?.address || vendorProfile?.city || "الرياض - الفرع الرئيسي"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-xs">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendorProfile?.address || vendorProfile?.city || vendorName || "الرياض")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>موقع الفرع</span>
                  </a>
                  <a
                    href={`tel:${vendorProfile?.phone || "0501234567"}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-600" />
                    <span>اتصال بالفرع</span>
                  </a>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setShowDriverModal(true)}
                className="bg-white rounded-2xl border border-gray-100/90 shadow-sm p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-200/80 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#E8F4F1] text-[#1B4D3E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-emerald-800 transition-colors">
                      {driver.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">{driver.vehicle}</p>
                  </div>
                </div>

                <div
                  className="w-9 h-9 rounded-full bg-gray-50 group-hover:bg-emerald-50 text-gray-600 group-hover:text-emerald-700 flex items-center justify-center transition-colors shadow-xs"
                  title="عرض تفاصيل المندوب"
                >
                  <MessageCircle className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* OTP Code Badge for Verified Customer ONLY */}
            {isClientRecipient && (liveStatus === "ready" || liveStatus === "ready_for_pickup" || liveStatus === "shipped" || liveStatus === "delivered" || liveStatus === "out_for_delivery") && (
              <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white rounded-2xl p-3.5 border border-emerald-500/30 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-300 font-bold block">
                      {effectiveIsPickup ? "رمز استلام الطلب من الفرع (OTP)" : "رمز استلام الشحنة (OTP)"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {effectiveIsPickup ? "أظهر هذا الرمز لموظف الفرع عند الاستلام" : "زوّد المندوب بهذا الرمز لتأكيد الاستلام"}
                  </span>
                </div>
                <span className="font-mono text-lg font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/40 tracking-widest">
                  {displayOtpCode}
                </span>
              </div>
            )}

            {/* Card 3: بيانات المركبة (Vehicle Details) */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm sm:text-base border-b border-gray-50 pb-3">
                <CarBrandLogo make={vehicle.make} model={vehicle.model} className="w-5 h-5 text-emerald-700" />
                <h3>بيانات المركبة</h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-gray-400 font-normal">الماركة</span>
                  <span className="font-bold text-gray-900 text-left">{vehicle.make}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-gray-400 font-normal">الموديل</span>
                  <span className="font-bold text-gray-900 text-left">{vehicle.model}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-gray-400 font-normal">سنة الصنع</span>
                  <span className="font-semibold text-gray-800 text-left">{vehicle.year}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-gray-50">
                  <span className="text-gray-400 font-normal">رقم الهيكل</span>
                  <span className="font-mono text-gray-800 font-semibold tracking-wider text-xs sm:text-sm text-left">
                    {vehicle.vin}
                  </span>
                </div>
              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* ════════════════════════════════════════════════════
          MODALS & DIALOGS
      ════════════════════════════════════════════════════ */}

      {/* 1. SUPPORT MODAL (تواصل مع الدعم) */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl p-6 text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-emerald-700" />
              تواصل مع فريق الدعم والمساعدة
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              فريق الدعم الفني متواجد لمساعدتك بخصوص الطلب #{displayOrderId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-right">
            {/* Quick Contact Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://wa.me/966501234567?text=${encodeURIComponent(`مرحباً، أحتاج مساعدة بخصوص الطلب #${displayOrderId}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-center group"
              >
                <MessageCircle className="w-6 h-6 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-900">واتساب فوري</span>
                <span className="text-[10px] text-gray-400">استجابة سريعة</span>
              </a>

              <a
                href="tel:920000000"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-center group"
              >
                <Phone className="w-6 h-6 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-900">اتصال هاتفي</span>
                <span className="text-[10px] text-gray-400">920000000</span>
              </a>
            </div>

            {/* Direct Ticket Message */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <Label className="text-xs font-semibold text-gray-800">أو اكتب رسالتك هنا مباشرة:</Label>
              <Textarea
                placeholder="صف استفسارك أو مشكلتك بدقة..."
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={3}
                className="text-xs resize-none rounded-xl text-right"
              />
            </div>

            {supportSent && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium text-center">
                ✓ تم إرسال رسالتك بنجاح وسيتواصل معك الدعم خلال لحظات.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSupportModal(false)} className="rounded-xl text-xs">
              إغلاق
            </Button>
            <Button
              onClick={handleSendSupport}
              disabled={!supportMessage.trim() || supportSent}
              className="bg-[#111827] hover:bg-black text-white rounded-xl text-xs"
            >
              إرسال التذكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. REPORT ISSUE MODAL (إبلاغ عن مشكلة) */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl p-6 text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              إبلاغ عن مشكلة في الطلب
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              سيتم مراجعة بلاغك والتدخل المباشر لضمان حقوقك وحل الخلاف.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-right">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-800">نوع المشكلة</Label>
              <select
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2 text-xs bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-right"
              >
                <option value="delay">تأخر في موعد التوصيل</option>
                <option value="wrong_item">القطعة غير مطابقة للمواصفات</option>
                <option value="damaged_item">تلف أو كسر في القطعة</option>
                <option value="pricing_issue">اختلاف في السعر أو الفاتورة</option>
                <option value="other">مشكلة أخرى</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-800">تفاصيل المشكلة</Label>
              <Textarea
                placeholder="يرجى كتابة تفاصيل المشكلة هنا..."
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                rows={3}
                className="text-xs resize-none rounded-xl text-right"
              />
            </div>

            {disputeSubmitted && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium text-center">
                ✓ تم تسجيل البلاغ وسيتولى فريق العمل متابعته فوراً.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDisputeModal(false)} className="rounded-xl text-xs">
              إلغاء
            </Button>
            <Button
              onClick={handleSendDispute}
              disabled={!disputeNotes.trim() || disputeSubmitted}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs"
            >
              رفع البلاغ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. DRIVER CONTACT MODAL (تفاصيل المندوب - تطابق الصورة المرفقة) */}
      <Dialog open={showDriverModal} onOpenChange={setShowDriverModal}>
        <DialogContent dir="rtl" className="sm:max-w-[380px] rounded-3xl p-6 text-center border-0 shadow-2xl">
          
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-[#E8F4F1] text-[#1B4D3E] mx-auto flex items-center justify-center shadow-xs">
            <User className="w-8 h-8" />
          </div>

          {/* Name & Verified Badge */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <h3 className="text-lg font-black text-gray-900">{driver.name}</h3>
            <span className="w-5 h-5 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center text-xs shadow-2xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-xs text-gray-400 font-medium mt-1">
            مندوب توصيل · {driver.vehicle}
          </p>

          <div className="border-t border-gray-100 my-4" />

          {/* 3 Key Metric Stat Boxes */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Stat 1: التقييم */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl py-3 px-2">
              <div className="flex items-center justify-center gap-1 text-sm font-black text-gray-900">
                <span>4.9</span>
                <span className="text-amber-500 text-xs">★</span>
              </div>
              <span className="block text-[11px] text-gray-400 font-medium mt-0.5">التقييم</span>
            </div>

            {/* Stat 2: توصيلة مكتملة */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl py-3 px-2">
              <span className="block text-sm font-black text-gray-900">3,100</span>
              <span className="block text-[11px] text-gray-400 font-medium mt-0.5">توصيلة مكتملة</span>
            </div>

            {/* Stat 3: الخبرة */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl py-3 px-2">
              <span className="block text-sm font-black text-gray-900">3 سنوات</span>
              <span className="block text-[11px] text-gray-400 font-medium mt-0.5">الخبرة</span>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="mt-5 text-right space-y-2.5">
            <h4 className="text-xs font-bold text-gray-900">آراء العملاء</h4>

            {/* Review 1 */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-gray-400">قبل يومين</span>
                <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                وصل بسرعة وكان متعاون جداً
              </p>
            </div>

            {/* Review 2 */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-gray-400">قبل 5 أيام</span>
                <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                توصيل مرتب والتعامل ممتاز
              </p>
            </div>
          </div>

          {/* Action Buttons at the Bottom */}
          <div className="mt-5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${driver.phone}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-900/15 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>اتصال هاتفي</span>
              </a>

              <a
                href={`https://wa.me/${driver.phone.replace(/^0/, "966")}?text=${encodeURIComponent(`مرحباً ${driver.name}، بخصوص توصيل الطلب #${displayOrderId}`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1B4D3E] hover:bg-[#14392E] text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/15 active:scale-[0.98] transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>مراسلة واتساب</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowDriverModal(false)}
              className="w-full py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              إغلاق
            </button>
          </div>

        </DialogContent>
      </Dialog>

      {/* 4. RATING MODAL (تقييم المورد والمندوب للعميل) */}
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg rounded-3xl p-6 text-center border-0 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-2 shadow-xs">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <DialogTitle className="text-lg font-black text-gray-900">
            تأكيد استلام الطلب والتقييم
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mb-3">
            تقييمك يسهم في مكافأة المتميزين ورفع جودة الخدمات في منصة رفق.
          </DialogDescription>

          <div className="space-y-3.5 max-h-[60vh] overflow-y-auto px-1 py-1">
            {/* 1. تقييم المورد */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-right shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1B4D3E] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {vendorInitials}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">تقييم المورد ({vendorName})</h4>
                    <span className="text-[10px] text-gray-400">جودة القطع، التغليف، وسرعة التجهيز</span>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  {vendorRating} / 5
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 py-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setVendorHover(s)}
                    onMouseLeave={() => setVendorHover(0)}
                    onClick={() => setVendorRating(s)}
                    className="p-1 transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        s <= (vendorHover || vendorRating)
                          ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="ملاحظاتك عن جودة القطع ومطابقتها (اختياري)..."
                value={vendorComment}
                onChange={(e) => setVendorComment(e.target.value)}
                rows={2}
                className="text-xs rounded-xl resize-none text-right bg-white mt-1 border-slate-200"
              />
            </div>

            {/* 2. تقييم المندوب (فقط في حال كان الطلب توصيل) */}
            {!effectiveIsPickup && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-right shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">تقييم المندوب ({driver.name})</h4>
                      <span className="text-[10px] text-gray-400">سرعة التوصيل، التعامل، والتواصل</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                    {courierRating} / 5
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 py-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setCourierHover(s)}
                      onMouseLeave={() => setCourierHover(0)}
                      onClick={() => setCourierRating(s)}
                      className="p-1 transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          s <= (courierHover || courierRating)
                            ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="ملاحظاتك عن سرعة التوصيل وأسلوب المندوب (اختياري)..."
                  value={courierComment}
                  onChange={(e) => setCourierComment(e.target.value)}
                  rows={2}
                  className="text-xs rounded-xl resize-none text-right bg-white mt-1 border-slate-200"
                />
              </div>
            )}

            {/* Platform rule hint banner */}
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 text-right flex items-start gap-2 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {effectiveIsPickup
                  ? "تأكيد المورد باستلام القطع في الفرع يُعد كافياً لاكتمال الطلب، وتقييمك يساعدنا في تحسين المنظومة."
                  : "تأكيد المندوب بتسليم الشحنة يُعد كافياً لاكتمال الطلب، وتقييمك يساعدنا في تحسين المنظومة."}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 flex-row">
            <Button
              variant="outline"
              onClick={async () => {
                await updateStatus("completed");
                setRatingModalOpen(false);
              }}
              disabled={isSaving}
              className="rounded-xl text-xs flex-1 border-gray-200 cursor-pointer"
            >
              تخطي واعتماد الاكتمال
            </Button>
            <Button
              onClick={submitRating}
              disabled={isSaving}
              className="bg-[#1B4D3E] hover:bg-[#14392E] text-white rounded-xl text-xs flex-1 font-bold gap-1.5 shadow-sm cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              إرسال التقييم وتأكيد الاستلام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. ADD / EDIT ITEM DIALOG */}
      <Dialog open={showAmendDialog} onOpenChange={setShowAmendDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl p-6 text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold text-gray-900">
              {amendType === "add" ? "طلب إضافة قطعة" : amendType === "edit" ? "طلب تعديل قطعة" : "طلب حذف قطعة"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {amendType === "delete"
                ? `هل ترغب بإرسال طلب حذف القطعة "${amendForm.part_name}"؟`
                : "أدخل تفاصيل القطعة وسيتم إرسالها للطرف الآخر للموافقة."}
            </DialogDescription>
          </DialogHeader>

          {amendType !== "delete" && (
            <div className="space-y-3 py-2 text-right">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">اسم القطعة</Label>
                <Input
                  value={amendForm.part_name}
                  onChange={(e) => setAmendForm({ ...amendForm, part_name: e.target.value })}
                  placeholder="مثال: دينامو أصلي"
                  className="rounded-xl text-xs text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">الكمية</Label>
                  <Input
                    type="number"
                    min={1}
                    value={amendForm.quantity}
                    onChange={(e) => setAmendForm({ ...amendForm, quantity: parseInt(e.target.value) || 1 })}
                    className="rounded-xl text-xs text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">السعر التقريبي (ر.س)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={amendForm.unit_price || ""}
                    onChange={(e) => setAmendForm({ ...amendForm, unit_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="rounded-xl text-xs text-right"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAmendDialog(false)} className="rounded-xl text-xs">
              إلغاء
            </Button>
            <Button
              onClick={submitChange}
              disabled={isSaving || (amendType !== "delete" && !amendForm.part_name)}
              className="bg-[#1B4D3E] hover:bg-[#14392E] text-white rounded-xl text-xs"
            >
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. TIMELINE HISTORY MODAL */}
      <Dialog open={showTimeline} onOpenChange={setShowTimeline}>
        <DialogContent dir="rtl" className="sm:max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-700" />
              السجل الزمني للطلب
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3 text-right">
            {localActivity.map((act, i) => (
              <div key={`${act.id}-${i}`} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <div className="flex-1 text-xs text-right">
                  <p className="font-semibold text-gray-800">{act.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(act.created_at).toLocaleString("ar-SA")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. VENDOR DETAILS MODAL (تفاصيل المورد - تطابق الصورة المرفقة) */}
      <Dialog open={showVendorModal} onOpenChange={setShowVendorModal}>
        <DialogContent dir="rtl" className="sm:max-w-[380px] rounded-3xl p-6 text-center border-0 shadow-2xl">
          
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-[#E8F4F1] text-[#1B4D3E] mx-auto flex items-center justify-center font-black text-xl tracking-widest shadow-xs">
            {vendorInitials.split("").join(" ")}
          </div>

          {/* Name & Verified Badge */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <h3 className="text-lg font-black text-gray-900">{vendorName}</h3>
            <span className="w-5 h-5 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center text-xs shadow-2xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-xs text-gray-400 font-medium mt-1">
            المورد المعتمد لهذا الطلب · قطع غيار أصلية
          </p>

          <div className="border-t border-gray-100 my-4" />

          {/* 3 Key Metric Stat Boxes */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Stat 1: التقييم */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl py-3 px-2">
              <div className="flex items-center justify-center gap-1 text-sm font-black text-gray-900">
                <span>4.8</span>
                <span className="text-amber-500 text-xs">★</span>
              </div>
              <span className="block text-[11px] text-gray-400 font-medium mt-0.5">التقييم</span>
            </div>

            {/* Stat 2: طلب مكتمل */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl py-3 px-2">
              <span className="block text-sm font-black text-gray-900">1,240</span>
              <span className="block text-[11px] text-gray-400 font-medium mt-0.5">طلب مكتمل</span>
            </div>

            {/* Stat 3: الالتزام بالمواعيد */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl py-3 px-2">
              <span className="block text-sm font-black text-gray-900">98%</span>
              <span className="block text-[11px] text-gray-400 font-medium mt-0.5">الالتزام بالمواعيد</span>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="mt-5 text-right space-y-2.5">
            <h4 className="text-xs font-bold text-gray-900">آراء العملاء</h4>

            {/* Review 1 */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-gray-400">قبل 3 أيام</span>
                <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                قطع أصلية ووصلت بسرعة، تعامل ممتاز.
              </p>
            </div>

            {/* Review 2 */}
            <div className="bg-[#F8F9FA] border border-gray-100/80 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-gray-400">قبل أسبوع</span>
                <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                جودة جيدة، والتغليف كان محكم وسليم.
              </p>
            </div>
          </div>

          {/* Action Button at the Bottom */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowVendorModal(false)}
              className="w-full py-3 rounded-2xl bg-[#1B4D3E] hover:bg-[#14392E] text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/15 active:scale-[0.98] transition-all"
            >
              إغلاق
            </button>
          </div>

        </DialogContent>
      </Dialog>

      {/* 8. VENDOR PICKUP OTP VERIFICATION MODAL */}
      <Dialog open={showPickupOtpModal} onOpenChange={setShowPickupOtpModal}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl p-6 text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-700" />
              <span>تسليم الطلب من الفرع (التحقق من رمز OTP)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              الرجاء إدخال الرمز المكون من 4 أرقام الذي يظهره العميل على شاشته لتأكيد الاستلام وإيداع المستحقات
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">رمز الاستلام (OTP)</Label>
              <Input
                type="text"
                maxLength={4}
                placeholder="••••"
                value={pickupOtpInput}
                onChange={(e) => setPickupOtpInput(e.target.value.replace(/\D/g, ""))}
                className="text-center font-mono text-2xl tracking-widest h-12 bg-gray-50 border-gray-200 focus:border-emerald-500 font-black text-emerald-900"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPickupOtpModal(false)}
              className="rounded-xl text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={isSaving || pickupOtpInput.length < 4}
              onClick={async () => {
                await updateStatus("completed", pickupOtpInput);
                setShowPickupOtpModal(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>تأكيد التسليم بالفرع</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
