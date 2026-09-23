"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrderRealtime, type PendingEditChange } from "@/hooks/use-order-realtime";
import { getEffectiveOrderStatus, syncOrderStatusUpdate } from "@/lib/order-status-sync";

const supabase = createClient();
import {
  ShoppingBag,
  Wallet,
  ChevronLeft,
  Package,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  Eye,
  RefreshCw,
  FileText,
  Truck,
  CheckCircle,
  Edit3,
  User2,
  LifeBuoy,
  RotateCcw,
  Plus,
  TrendingUp,
  Sparkles,
  Activity,
  Car,
  ShieldCheck,
  Building2,
  Calendar,
  Zap,
  ArrowUpRight,
  HelpCircle,
  Award,
  AlertCircle,
  Store,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { filterRfqsForVendor } from "@/lib/brand-specialization";
import { filterRfqsForVendorCategories } from "@/lib/category-specialization";

/* ─────────────── types ─────────────── */
interface Order {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  rfq_id?: string;
  rfqs?: { car_make: string; car_model: string; car_year: number; plate_number?: string; vin?: string };
  client?: { full_name?: string; company_name?: string };
  vendor?: { full_name?: string; company_name?: string };
}

interface RFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number?: string;
  vin?: string;
  parts_description?: string;
  status: string;
  created_at: string;
  quotes?: { id?: string; total_price?: number; vendor_id?: string; count?: number }[];
  client?: { full_name?: string; company_name?: string } | null;
}

interface WalletTx {
  balance_after: number;
  created_at: string;
  type?: string;
  amount?: number;
}

type PendingChange = PendingEditChange & {
  orders?: { rfqs?: { car_make: string; car_model: string; car_year: number } };
};

/* ─────────────── constants ─────────────── */
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const ORDER_STEPS = [
  { key: "preparing", label: "تم التجهيز", icon: Package },
  { key: "shipped", label: "تم الشحن", icon: Truck },
  { key: "delivered", label: "جاري التسليم", icon: CheckCircle2 },
  { key: "completed", label: "تأكيد واستلام", icon: CheckCircle2 },
];

const ORDER_STATUS_AR: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "قيد الانتظار", color: "text-gray-700", bg: "bg-gray-100 border-gray-200", dot: "bg-gray-400" },
  preparing: { label: "تم التجهيز", color: "text-amber-800", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  ready: { label: "تم التجهيز", color: "text-blue-800", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  shipped: { label: "تم الشحن", color: "text-indigo-800", bg: "bg-indigo-50 border-indigo-200", dot: "bg-indigo-500" },
  delivered: { label: "جاري التسليم", color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  completed: { label: "تأكيد واستلام", color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "ملغي", color: "text-red-800", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  open: { label: "مفتوح للتسعير", color: "text-amber-800", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-400" },
  quoted: { label: "عروض متاحة", color: "text-blue-800", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  accepted: { label: "مقبول", color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
  closed: { label: "مغلق", color: "text-slate-700", bg: "bg-slate-100 border-slate-200", dot: "bg-slate-400" },
};

function fmt(n: number) {
  return (n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function shortId(id: string) {
  if (!id) return "—";
  return id.replace(/^(REQ-|ORD-|RFQ-)/i, "").slice(0, 8).toUpperCase();
}

/* ─────────────── StatusBadge ─────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg = ORDER_STATUS_AR[status] || { label: status, color: "text-gray-700", bg: "bg-gray-100 border-gray-200", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-[11px] font-bold border shadow-2xs ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─────────────── OrderTracker ─────────────── */
const LEGACY_STATUS_MAP: Record<string, string> = {
  confirmed: "preparing",
  processing: "ready",
};

function OrderTracker({ order }: { order: Order }) {
  const normalisedStatus = getEffectiveOrderStatus(order.id, order.status);
  const stepIndex =
    normalisedStatus === "preparing" || normalisedStatus === "confirmed" ? 0 :
    normalisedStatus === "ready" || normalisedStatus === "shipped" ? 1 :
    normalisedStatus === "delivered" ? 2 :
    normalisedStatus === "completed" ? 3 : 0;
  return (
    <div className="mt-4 pt-2">
      <div className="flex items-center justify-between relative px-2">
        {/* background track */}
        <div className="absolute top-4 right-6 left-6 h-1 bg-slate-100 rounded-full z-0" />
        {/* active progress line */}
        <div
          className="absolute top-4 right-6 h-1 bg-gradient-to-l from-emerald-500 to-teal-600 rounded-full z-0 transition-all duration-500 shadow-sm"
          style={{ width: stepIndex >= 0 ? `${(stepIndex / (ORDER_STEPS.length - 1)) * 92}%` : "0%" }}
        />
        {ORDER_STEPS.map((step, i) => {
          const done = i <= stepIndex;
          const active = i === stepIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 z-10 flex-1">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  done
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105"
                    : "bg-white border-slate-200 text-slate-300"
                } ${active ? "ring-4 ring-emerald-500/20 scale-110" : ""}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] sm:text-[11px] text-center leading-tight max-w-[65px] ${done ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface SlideDashboardProps {
  role: "client" | "vendor";
  permissions?: string[];
  isOwner?: boolean;
  userRole?: string;
  roleNameAr?: string;
}

export function SlideDashboard({
  role,
  permissions: initialPermissions,
  isOwner: initialIsOwner,
  userRole: initialUserRole,
  roleNameAr: initialRoleNameAr,
}: SlideDashboardProps) {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name?: string; company_name?: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<any[]>([]);
  const [walletBal, setWalletBal] = useState(0);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [globalPendingChanges, setGlobalPendingChanges] = useState<PendingChange[]>([]);
  const [supportRequests, setSupportRequests] = useState<{ id: string; status: string; request_type: string; created_at: string }[]>([]);
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  // Active Effective Permissions & RBAC Context
  const [activePermissions, setActivePermissions] = useState<string[]>(initialPermissions || []);
  const [activeIsOwner, setActiveIsOwner] = useState<boolean>(initialIsOwner ?? false);
  const [activeRoleNameAr, setActiveRoleNameAr] = useState<string>(initialRoleNameAr || "");
  const [activeUserRole, setActiveUserRole] = useState<string>(initialUserRole || "");

  useEffect(() => {
    if (initialPermissions && initialPermissions.length > 0) {
      setActivePermissions(initialPermissions);
      setActiveIsOwner(Boolean(initialIsOwner));
      setActiveRoleNameAr(initialRoleNameAr || "");
      setActiveUserRole(initialUserRole || "");
    } else {
      fetch("/api/v1/account/permissions")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setActivePermissions(data.permissions || []);
            setActiveIsOwner(Boolean(data.isOwner));
            setActiveRoleNameAr(data.roleNameAr || "");
            setActiveUserRole(data.role || "");
          }
        })
        .catch(() => {});
    }
  }, [initialPermissions, initialIsOwner, initialRoleNameAr, initialUserRole]);

  const hasPerm = useCallback(
    (perm: string) => {
      if (activeIsOwner) return true;
      if (!activePermissions || activePermissions.length === 0) return false;
      if (activePermissions.includes("*")) return true;
      return activePermissions.includes(perm);
    },
    [activeIsOwner, activePermissions]
  );

  const fetchData = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isInitial) {
      setLoading(true);
    }
    let userId = "";
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) userId = data.user.id;
    } catch (e) {}

    if (!userId && typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|; )rfq_user_id=([^;]*)/);
      if (m) userId = decodeURIComponent(m[1]);
    }

    setCurrentUserId(userId);

    try {
      // 1. Fetch Profile
      let profileData: any = null;
      if (userId) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("full_name, company_name, specialized_brands, specializes_in_all_brands")
          .eq("id", userId)
          .maybeSingle();
        profileData = pData;
      }
      if (!profileData && typeof document !== "undefined") {
        const mName = document.cookie.match(/(?:^|; )rfq_user_name=([^;]*)/);
        const cName = mName ? decodeURIComponent(mName[1]) : "";
        if (cName) {
          profileData = { full_name: cName, company_name: cName };
        }
      }
      setProfile(profileData);

      // 2. Fetch Orders (100% Real Scoped DB Data)
      let ordersData: any[] = [];
      if (userId) {
        let ordersQuery = supabase
          .from("orders")
          .select("id, status, total_price, created_at, rfq_id, rfqs(car_make, car_model, car_year, plate_number)")
          .order("created_at", { ascending: false });

        if (role === "client") {
          ordersQuery = ordersQuery.eq("client_id", userId);
        } else {
          ordersQuery = ordersQuery.eq("vendor_id", userId);
        }
        const { data: res } = await ordersQuery;
        ordersData = res || [];
      }
      setOrders((ordersData as Order[]) || []);

      // 3. Fetch RFQs (100% Real Scoped DB Data)
      let rawRfqs: RFQ[] = [];
      if (role === "client") {
        if (userId) {
          const { data: rfqsData } = await supabase
            .from("rfqs")
            .select("id, car_make, car_model, car_year, plate_number, vin, parts_description, status, created_at, quotes(id, total_price, vendor_id, created_at)")
            .eq("client_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);
          rawRfqs = (rfqsData as RFQ[]) || [];
        }
      } else if (role === "vendor") {
        const { data: rfqsData } = await supabase
          .from("rfqs")
          .select("id, car_make, car_model, car_year, plate_number, vin, parts_description, status, created_at, quotes(id, total_price, vendor_id, created_at)")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(50);
        rawRfqs = (rfqsData as RFQ[]) || [];

        // If vendor, apply server/source-of-truth brand & category specialization filtering
        const vBrands = profileData?.specialized_brands || ["toyota", "lexus", "hyundai", "kia", "gmc", "ford", "nissan"];
        const vAll = Boolean(profileData?.specializes_in_all_brands);
        rawRfqs = filterRfqsForVendor(rawRfqs, vBrands, vAll);

        const vCats = profileData?.specialized_categories || [];
        const vAllCats = profileData?.specializes_in_all_categories !== false;
        rawRfqs = filterRfqsForVendorCategories(rawRfqs, vCats, vAllCats);
      }

      setRfqs(rawRfqs);

      // 4. Fetch Real Wallet Balance
      let realWalletBalance = 0;
      if (userId) {
        const { data: wData } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (wData && typeof wData.balance === "number") {
          realWalletBalance = Number(wData.balance);
        }
      }

      // Fetch Wallet Transactions
      let txsData: WalletTx[] = [];
      if (userId) {
        const { data: tData } = await supabase
          .from("wallet_transactions")
          .select("balance_after, created_at, type, amount")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        txsData = (tData as WalletTx[]) || [];
        if (realWalletBalance === 0 && txsData.length > 0) {
          realWalletBalance = Number(txsData[0].balance_after || 0);
        }
      }
      setWalletTxs(txsData);
      setWalletBal(realWalletBalance);

      // 5. Fetch Real Fleet Vehicles (Strictly scoped by user)
      if (typeof window !== "undefined") {
        try {
          const rawVehicles = localStorage.getItem("rfq_demo_vehicles_v3");
          if (rawVehicles) {
            const parsed = JSON.parse(rawVehicles);
            const userVehicles = (Array.isArray(parsed) ? parsed : []).filter(
              (v: any) => !v.deleted_at && (v.client_id === userId || (!v.client_id && userId === "client-demo-id"))
            );
            setFleetVehicles(userVehicles);
          } else {
            setFleetVehicles([]);
          }
        } catch (e) {
          setFleetVehicles([]);
        }
      }

      // 6. Fetch Real Support Tickets
      if (userId && role === "client") {
        const { data: suppData } = await supabase
          .from("support_tickets")
          .select("id, status, request_type, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        setSupportRequests(suppData || []);
      }
    } catch (e) {
      console.error("Dashboard real data fetch error:", e);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [role]);

  useEffect(() => {
    setIsMounted(true);
    fetchData(true);

    const handleDataChange = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchData(false);
      }, 200);
    };

    window.addEventListener("rfq_data_changed", handleDataChange);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener("rfq_data_changed", handleDataChange);
    };
  }, [fetchData]);

  /* ── Real Derived Collections ── */
  const TERMINAL_STATUSES = ["completed", "delivered", "cancelled", "closed"];
  const activeOrders = useMemo(() => orders.filter((o) => !TERMINAL_STATUSES.includes(o.status)), [orders]);
  const completedOrders = useMemo(() => orders.filter((o) => ["completed", "delivered"].includes(o.status)), [orders]);
  const rfqOrders = useMemo(() => rfqs.filter((r) => r.status === "open" || r.status === "quoted"), [rfqs]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || activeOrders[0] || null,
    [orders, selectedOrderId, activeOrders]
  );

  const { liveStatus: selectedLiveStatus } = useOrderRealtime({
    orderId: selectedOrder?.id || "",
    initialStatus: selectedOrder?.status || "",
    currentUserId,
    fetchChanges: false,
  });

  /* ── 100% Real Chart Data (6 Months Aggregation from Database) ── */
  const now = new Date();
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const mo = orders.filter((o) => {
        if (!o.created_at) return false;
        const od = new Date(o.created_at);
        return od.getMonth() === m && od.getFullYear() === y;
      });
      const revenue = mo.reduce((s, o) => s + Number(o.total_price || 0), 0);
      const walletIn = walletTxs
        .filter((t) => {
          if (!t.created_at) return false;
          const td = new Date(t.created_at);
          return td.getMonth() === m && td.getFullYear() === y && t.type === "credit";
        })
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      return {
        month: MONTHS_AR[m].slice(0, 3),
        orders: mo.length,
        revenue: revenue,
        wallet: walletIn,
      };
    });
  }, [orders, walletTxs]);

  /* ── advance order status (vendor) ── */
  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const normalised = getEffectiveOrderStatus(orderId, currentStatus);
    const flow = ["preparing", "ready", "shipped", "delivered", "completed"];
    const cur = flow.indexOf(normalised);
    if (cur < 0 || cur >= flow.length - 1) return;
    const next = flow[cur + 1];
    setUpdatingStatus(true);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: next } : o)));
    
    await syncOrderStatusUpdate({
      orderId,
      newStatus: next,
      actorRole: role as any,
    });

    setUpdatingStatus(false);
  };

  const cookieName = typeof document !== "undefined" ? (() => {
    const m = document.cookie.match(/(?:^|; )rfq_user_name=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : "";
  })() : "";

  const displayName = profile?.company_name || profile?.full_name || cookieName || (role === "client" ? "منشأة العميل" : "متجر المورد");

  /* ── 100% Real 30-Day Total Spending ── */
  const last30Total = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders
      .filter((o) => o.created_at && new Date(o.created_at).getTime() >= cutoff)
      .reduce((s, o) => s + Number(o.total_price || 0), 0);
  }, [orders]);

  /* ── Real Total Quotes Received ── */
  const totalQuotesReceived = useMemo(() => {
    return rfqs.reduce((acc, curr) => {
      if (Array.isArray(curr.quotes)) {
        return acc + curr.quotes.length;
      }
      return acc;
    }, 0);
  }, [rfqs]);

  /* ── Real KPI Cards (Guarded by Granular Permissions) ── */
  const statCards = [
    {
      label: "الطلبات النشطة",
      value: activeOrders.length,
      trend: activeOrders.length > 0 ? `${activeOrders.length} طلب قيد التجهيز والشحن` : "لا توجد طلبات جارية",
      trendColor: activeOrders.length > 0 ? "text-blue-600 bg-blue-50 border-blue-200" : "text-slate-500 bg-slate-50 border-slate-200",
      icon: Activity,
      iconBg: "bg-blue-500/10 border border-blue-500/20 text-blue-600",
      accent: "bg-blue-600",
      link: role === "client" ? "/client/orders" : "/vendor/orders",
      isCurrency: false,
      perm: "orders:view",
    },
    {
      label: "طلبات التسعير (RFQ)",
      value: rfqOrders.length,
      trend: totalQuotesReceived > 0 ? `${totalQuotesReceived} عرض سعر مستلم` : rfqOrders.length > 0 ? "بانتظار عروض الموردين" : "لا توجد طلبات مفتوحة",
      trendColor: totalQuotesReceived > 0 ? "text-blue-700 bg-blue-50 border-blue-200" : "text-amber-700 bg-amber-50 border-amber-200",
      icon: FileText,
      iconBg: "bg-amber-500/10 border border-amber-500/20 text-amber-600",
      accent: "bg-amber-500",
      link: role === "client" ? "/client/orders" : "/vendor/orders",
      isCurrency: false,
      perm: role === "client" ? "rfqs:view" : "quotes:view_radar",
    },
    {
      label: "الطلبات المكتملة",
      value: completedOrders.length,
      trend: completedOrders.length > 0 ? `تم استلامها وإغلاقها بنجاح` : "لا توجد طلبات مكتملة بعد",
      trendColor: completedOrders.length > 0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-50 border-slate-200",
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600",
      accent: "bg-emerald-500",
      link: role === "client" ? "/client/orders" : "/vendor/orders",
      isCurrency: false,
      perm: "orders:view",
    },
    {
      label: "رصيد المحفظة المتاح",
      value: walletBal,
      trend: walletBal > 0 ? "رصيد متاح للاستخدام الفوري" : "الرصيد: 0.00 ر.س",
      trendColor: walletBal > 0 ? "text-purple-700 bg-purple-50 border-purple-200" : "text-slate-500 bg-slate-50 border-slate-200",
      icon: Wallet,
      iconBg: "bg-purple-500/10 border border-purple-500/20 text-purple-600",
      accent: "bg-purple-600",
      link: role === "client" ? "/client/wallet" : "/vendor/wallet",
      isCurrency: true,
      perm: "finance:view",
    },
  ];

  const visibleStatCards = useMemo(() => {
    return statCards.filter((card) => {
      if (!card.perm) return true;
      return hasPerm(card.perm);
    });
  }, [statCards, hasPerm]);

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-128px)] items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
          <p className="text-sm text-slate-800 font-bold">جاري تحميل البيانات الحية والمؤشرات...</p>
        </div>
      </div>
    );
  }

  /* ── Time-based greeting ── */
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    return "مساء الخير";
  })();

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-900 w-full" dir="rtl">
        {/* ══════════ 1. ULTRA-PREMIUM DYNAMIC HERO BANNER ══════════ */}
        <header className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-r from-[#0A1224] via-[#0F1C36] to-[#0A1224] text-white shadow-2xl p-5 sm:p-7">
          {/* Decorative Mesh Background */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, rgba(16,185,129,0.8) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Ambient Glows */}
          <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Profile Greeting & Live Status */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative group shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 p-0.5 shadow-xl shadow-emerald-500/20">
                  <div className="w-full h-full rounded-[14px] bg-[#0A1224] flex items-center justify-center text-white font-black text-xl sm:text-2xl">
                    {displayName.charAt(0)}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-[#0A1224] animate-pulse" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-slate-300">{greeting}، 👋</span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {activeRoleNameAr
                      ? activeRoleNameAr
                      : activeIsOwner
                      ? role === "client"
                        ? "مالك المنشأة"
                        : "مالك المتجر"
                      : "موظف معتمد"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-full">
                    {new Date().toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                </div>

                <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight truncate">
                  {displayName}
                </h1>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    {role === "client" ? "مركز المشتريات المؤسسية" : "مركز مبيعات الموردين"}
                  </span>
                  {hasPerm("finance:view") && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span>
                        إجمالي تعاملات 30 يوماً: <strong className="text-emerald-400 font-mono font-black">{fmt(last30Total)} ر.س</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top Quick Actions Bar */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {role === "client" && (
                <>
                  {hasPerm("rfqs:create") && (
                    <Link
                      href="/client/new-rfq"
                      className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>طلب عرض سعر جديد</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    </Link>
                  )}

                  {hasPerm("fleet:manage") && (
                    <Link
                      href="/client/garage"
                      className="inline-flex items-center gap-1.5 h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all shadow-xs"
                    >
                      <Car className="w-4 h-4 text-emerald-300" />
                      <span>إدارة المركبات ({fleetVehicles.length})</span>
                    </Link>
                  )}
                </>
              )}

              {role === "vendor" && (hasPerm("branch:manage_location") || hasPerm("settings:manage")) && (
                <Link
                  href="/vendor/settings?tab=pickup_location"
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <Store className="w-4 h-4" />
                  <span>موقع الفرع والاستلام</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">خريطة 📍</span>
                </Link>
              )}

              <button
                onClick={() => fetchData()}
                className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all active:scale-95 cursor-pointer"
                title="تحديث البيانات المباشرة"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">تحديث</span>
              </button>
            </div>
          </div>
        </header>

        {/* ══════════ VENDOR BRANCH PICKUP ONBOARDING BANNER ══════════ */}
        {role === "vendor" && (hasPerm("branch:manage_location") || hasPerm("settings:manage")) && (
          <div className="bg-gradient-to-r from-[#0F1C36] via-[#132342] to-[#0A1224] border border-purple-500/30 rounded-3xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-white">إعداد موقع الفرع وخريطة الاستلام الذاتي (Self-Pickup)</h3>
                  <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-2 py-0.2 rounded-full">جديد 🗺️</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">
                  اضبط إحداثيات موقع معرضك وساعات العمل لتظهر لعملائك على الخريطة وتبدأ باستقبال طلبات الشراء والاستلام الفوري من فرعك.
                </p>
              </div>
            </div>

            <Link
              href="/vendor/settings?tab=pickup_location"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shrink-0 shadow-md shadow-purple-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>إعداد موقع الفرع 📍</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ══════════ 2. DYNAMIC KPI TILES (100% REAL STATS - FILTERED BY RBAC) ══════════ */}
        {visibleStatCards.length > 0 && (
          <div
            className={`grid grid-cols-2 ${
              visibleStatCards.length === 1
                ? "lg:grid-cols-1 max-w-sm"
                : visibleStatCards.length === 2
                ? "lg:grid-cols-2"
                : visibleStatCards.length === 3
                ? "lg:grid-cols-3"
                : "lg:grid-cols-4"
            } gap-3 sm:gap-4`}
          >
            {visibleStatCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  href={card.link}
                  className="group relative bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 hover:border-emerald-500/40 transition-all duration-300 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
                >
                  {/* Top Accent Line */}
                  <div className={`absolute top-0 right-0 left-0 h-1.5 ${card.accent}`} />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 truncate">{card.label}</span>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${card.iconBg} shadow-2xs shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" strokeWidth={2.2} />
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums font-mono">
                        {card.isCurrency ? fmt(Number(card.value)) : card.value}
                      </p>
                      {card.isCurrency && <span className="text-xs font-extrabold text-slate-400">ر.س</span>}
                    </div>

                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border ${card.trendColor}`}>
                      {card.trend}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 border-t border-slate-100 pt-2.5 mt-3">
                    <span className="group-hover:text-emerald-700 transition-colors">عرض السجل والتفاصيل</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-1 group-hover:text-emerald-600 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ══════════ 3. FINANCIAL SPEND ANALYTICS & INSIGHTS (GUARDED) ══════════ */}
        {hasPerm("finance:view") && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    التحليل المالي ومعدلات الشراء الشهري
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      <Sparkles className="w-3 h-3" />
                      بيانات حية
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">متابعة إجمالي الإنفاق ومعدل وتيرة الطلبات المنفذة</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
                    قيمة المشتريات
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-xs" />
                    عدد الطلبات
                  </span>
                </div>
              </div>
            </div>

            {isMounted ? (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "14px",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        padding: "10px 14px",
                      }}
                      formatter={(v: any, name: string) => [
                        name === "revenue" ? `${fmt(Number(v))} ر.س` : `${v} طلب`,
                        name === "revenue" ? "قيمة المشتريات" : "عدد الطلبات",
                      ]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRevenue)" dot={{ r: 3, fill: "#10b981" }} />
                    <Area type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} fill="url(#gradOrders)" dot={{ r: 2, fill: "#2563eb" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] w-full bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                جاري تجهيز التحليل المالي...
              </div>
            )}
          </div>
        )}

        {/* ══════════ 4. LIVE ORDER TRACKER + LIVE RFQ RADAR (RBAC GUARDED) ══════════ */}
        {(() => {
          const canViewOrders = hasPerm("orders:view");
          const canViewRfqs = role === "client" ? hasPerm("rfqs:view") : (hasPerm("quotes:view_radar") || hasPerm("rfqs:view"));
          if (!canViewOrders && !canViewRfqs) return null;
          const singleCol = (canViewOrders && !canViewRfqs) || (!canViewOrders && canViewRfqs);

          return (
            <div className={`grid grid-cols-1 ${singleCol ? "" : "lg:grid-cols-2"} gap-5`}>
              {/* Order Tracker Card */}
              {canViewOrders && (
                <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black text-slate-900">تتبع مسار الطلبات النشطة</h2>
                          <p className="text-[11px] text-slate-400">متابعة فورية لحالة التجهيز والتسليم</p>
                        </div>
                      </div>

                      {activeOrders.length > 1 && (
                        <select
                          className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none cursor-pointer"
                          value={selectedOrder?.id || ""}
                          onChange={(e) => setSelectedOrderId(e.target.value)}
                        >
                          {activeOrders.map((o) => (
                            <option key={o.id} value={o.id}>
                              #{shortId(o.id)} — {o.rfqs?.car_make} {o.rfqs?.car_model}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {selectedOrder ? (
                      (() => {
                        const displayStatus = getEffectiveOrderStatus(selectedOrder.id, selectedLiveStatus || selectedOrder.status);
                        const isTerminal = TERMINAL_STATUSES.includes(displayStatus);
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs shadow-2xs">
                                  <Car className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                  <span className="font-mono font-black text-slate-900 text-xs">#{shortId(selectedOrder.id)}</span>
                                  {selectedOrder.rfqs && (
                                    <p className="text-[11px] font-bold text-slate-500">
                                      {selectedOrder.rfqs.car_make} {selectedOrder.rfqs.car_model} {selectedOrder.rfqs.car_year}
                                      {selectedOrder.rfqs.plate_number && ` • ${selectedOrder.rfqs.plate_number}`}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-left">
                                <StatusBadge status={displayStatus} />
                                <p className="text-xs font-black text-slate-900 font-mono mt-1">
                                  {fmt(Number(selectedOrder.total_price))} ر.س
                                </p>
                              </div>
                            </div>

                            <OrderTracker order={{ ...selectedOrder, status: displayStatus }} />

                            {role === "vendor" && (hasPerm("orders:update_status") || hasPerm("orders:manage")) && (
                              <button
                                onClick={() => advanceStatus(selectedOrder.id, displayStatus)}
                                disabled={updatingStatus || isTerminal}
                                className="w-full h-10 rounded-2xl bg-slate-900 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                              >
                                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4" />}
                                <span>تحديث مرحلة الطلب إلى الخطوة التالية</span>
                              </button>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <Package className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="text-xs font-bold text-slate-600">لا توجد طلبات تنفيذية جارية حالياً</p>
                        <p className="text-[11px] text-slate-400">ستظهر تفاصيل ومسار التوصيل فور تحويل عروض الأسعار لطلبات مؤكدة</p>
                      </div>
                    )}
                  </div>

                  {selectedOrder && (
                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                      <Link
                        href={`/deal/${selectedOrder.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <span>معاينة صفقة الشراء والتفاصيل الكاملة</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Link>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(selectedOrder.created_at).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Live RFQ Bidding Stream Card */}
              {canViewRfqs && (
                <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black text-slate-900">طلبات التسعير الحية (RFQ)</h2>
                          <p className="text-[11px] text-slate-400">عروض الأسعار المتاحة وتنافس الموردين</p>
                        </div>
                      </div>

                      <Link
                        href={role === "client" ? "/client/orders" : "/vendor/orders"}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                      >
                        <span>عرض الكل</span>
                        <ArrowLeft className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto max-h-[280px] pr-1">
                      {rfqOrders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                          <FileText className="w-10 h-10 mx-auto text-slate-300" />
                          <p className="text-xs font-bold text-slate-600">لا توجد طلبات تسعير مفتوحة حالياً</p>
                          {hasPerm("rfqs:create") && (
                            <Link
                              href="/client/new-rfq"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إنشاء طلب عرض سعر جديد</span>
                            </Link>
                          )}
                        </div>
                      ) : (
                        rfqOrders.slice(0, 5).map((rfq: any) => {
                          const offerCount = Array.isArray(rfq.quotes) ? rfq.quotes.length : (rfq.quotes?.[0]?.count ?? 0);
                          return (
                            <Link
                              key={rfq.id}
                              href={role === "client" ? `/client/rfq/${rfq.id}` : `/vendor/quote/${rfq.id}`}
                              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 transition-all group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-slate-900 text-xs">#{shortId(rfq.id)}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(rfq.created_at).toLocaleDateString("ar-SA")}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                                  {rfq.car_make} {rfq.car_model} {rfq.car_year}
                                  {rfq.plate_number && ` • ${rfq.plate_number}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {offerCount > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                    <span>{offerCount} {offerCount === 1 ? "عرض متاح" : "عروض متاحة"}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>بانتظار العروض</span>
                                  </span>
                                )}
                                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-all" />
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      إجمالي طلبات التسعير المفتوحة: <strong className="text-slate-900 font-mono">{rfqOrders.length}</strong>
                    </span>
                    {hasPerm("rfqs:create") && (
                      <Link
                        href="/client/new-rfq"
                        className="text-xs font-extrabold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <span>+ إنشاء طلب جديد</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════ 5. FLEET QUICK DISPATCH & HEALTH WIDGET ══════════ */}
        {role === "client" && hasPerm("fleet:manage") && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">جاهزية أسطول المركبات (Fleet Dispatch)</h2>
                  <p className="text-[11px] text-slate-400">وصول سريع لسيارات الشركة لطلب قطع الغيار بضغطة واحدة</p>
                </div>
              </div>

              <Link
                href="/client/garage"
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                <span>إدارة جدول المركبات الكامل ({fleetVehicles.length})</span>
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>

            {fleetVehicles.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Car className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">لا توجد مركبات مسجلة في الأسطول حالياً</p>
                <Link
                  href="/client/garage"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مركبة للأسطول</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {fleetVehicles.slice(0, 3).map((veh) => (
                  <div
                    key={veh.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-200/80 flex items-center justify-center font-black text-slate-800 text-xs">
                          {veh.brand_name?.charAt(0) || "س"}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {veh.brand_name} {veh.model_name}
                          </h4>
                          <span className="text-[11px] font-bold text-slate-400">
                            موديل {veh.year} • {veh.plate_number}
                          </span>
                        </div>
                      </div>

                      {veh.status === "active" ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          نشطة
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                          صيانة
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/client/new-rfq?vehicle_id=${veh.id}&make=${encodeURIComponent(veh.brand_name || "")}&model=${encodeURIComponent(veh.model_name || "")}&year=${veh.year || ""}&plate=${encodeURIComponent(veh.plate_number || "")}&vin=${encodeURIComponent(veh.vin || "")}`}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 group-hover:bg-emerald-600 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>طلب قطع لهذه المركبة</span>
                      <ArrowLeft className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ 6. PENDING OPERATIONS & SUPPORT CENTER (RBAC GUARDED) ══════════ */}
        {(() => {
          const canViewPending = hasPerm("orders:view") || hasPerm("orders:manage");
          const canViewSupport = hasPerm("support:manage") || hasPerm("support:view") || activeIsOwner;
          if (!canViewPending && !canViewSupport) return null;
          const singleCol = (canViewPending && !canViewSupport) || (!canViewPending && canViewSupport);

          return (
            <div className={`grid grid-cols-1 ${singleCol ? "" : "lg:grid-cols-2"} gap-5`}>
              {/* Pending Changes Card */}
              {canViewPending && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Edit3 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900">طلبات التعديل على الصفقات</h3>
                        <p className="text-[10px] text-slate-400">تعديلات القطع والكميات الواردة من الموردين</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-slate-500">
                      {globalPendingChanges.length > 0 ? `${globalPendingChanges.length} طلب معلق` : "0 طلب"}
                    </span>
                  </div>

                  {globalPendingChanges.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 space-y-1.5">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">كافة الصفقات والطلبات متطابقة ومحدثة</p>
                      <p className="text-[11px] text-slate-400">لا توجد طلبات تعديل كميات أو استبدال قطع قيد المراجعة</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {globalPendingChanges.slice(0, 3).map((change) => (
                        <div key={change.id} className="p-3 bg-orange-50/50 rounded-xl border border-orange-200/60 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-900">#{shortId(change.order_id)}</span>
                            <p className="text-[11px] font-bold text-slate-600">{change.part_name || "تعديل قطعة"}</p>
                          </div>
                          <Link href={`/deal/${change.order_id}`} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold">
                            مراجعة
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-2.5 mt-3 text-[11px] text-slate-400 text-center font-bold">
                    ⚡ المزامنة الحية مفعلة تلقائياً مع خوادم RIFQ
                  </div>
                </div>
              )}

              {/* Support & Returns Hub */}
              {canViewSupport && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <LifeBuoy className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900">مركز المساعدة وضمان القطع</h3>
                        <p className="text-[10px] text-slate-400">طلبات الاستبدال، الاسترجاع، والدعم الفني</p>
                      </div>
                    </div>

                    <Link href="/client/support" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                      فتح تذكرة +
                    </Link>
                  </div>

                  {supportRequests.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 space-y-1.5">
                      <ShieldCheck className="w-8 h-8 text-indigo-500/80 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">الضمان وحماية المشتريات مفعل 100%</p>
                      <p className="text-[11px] text-slate-400">يمكنك تقديم طلب استرجاع أو استبدال لأي قطعة خلال فترة الضمان المعتمدة</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {supportRequests.slice(0, 3).map((req) => (
                        <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-900">#{req.id.slice(0, 8)}</span>
                            <p className="text-[11px] text-slate-500">{req.request_type}</p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">{req.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between text-xs">
                    <Link href="/client/support" className="font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>طلب استرجاع قطعة</span>
                    </Link>
                    <span className="text-[11px] text-emerald-600 font-black">✓ مدعوم بخدمة العملاء 24/7</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

    </div>
  );
}
