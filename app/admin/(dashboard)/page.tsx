"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Users, ShoppingBag, FileText, Wallet, Search,
  ArrowLeft, Clock, RefreshCw, ClipboardList, BarChart3,
  TrendingUp, TrendingDown, DollarSign, ShieldCheck,
  Truck, Tag, ChevronRight, Activity, Layers, ArrowUpRight,
  Sparkles, CheckCircle2, AlertCircle, Building2, UserCheck
} from "lucide-react";

const supabase = createClient();

interface MonthlyDataPoint {
  monthKey: string; // e.g., "2026-03"
  monthName: string; // e.g., "مارس 2026"
  revenue: number;
  ordersCount: number;
  rfqsCount: number;
}

interface OverviewStats {
  // Financials
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowthPct: number;
  totalGMV: number;
  totalVat: number;
  avgOrderValue: number;
  totalWalletBalance: number;

  // Orders
  totalOrders: number;
  currentMonthOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  orderCompletionRate: number;

  // RFQs & Quotes
  totalRfqs: number;
  currentMonthRfqs: number;
  openRfqs: number;
  closedRfqs: number;
  totalQuotes: number;

  // Invoices
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  paidInvoicesAmount: number;

  // Users & Ecosystem
  totalUsers: number;
  clientsCount: number;
  vendorsCount: number;
  couriersCount: number;
  staffCount: number;
  newUsersThisMonth: number;

  // Trends & Activity
  monthlyTrend: MonthlyDataPoint[];
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  actor_name: string;
  actor_company?: string;
  created_at: string;
  type?: "order" | "rfq" | "invoice" | "wallet" | "user" | "system";
}

const ARABIC_MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const formatSAR = (n: number) =>
  new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const formatCompactSAR = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} مليون ر.س`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} ألف ر.س`;
  return `${formatSAR(n)} ر.س`;
};

const formatTimeAgo = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "الآن";
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    if (diffSec < 172800) return "أمس";
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activeChartMetric, setActiveChartMetric] = useState<"revenue" | "orders">("revenue");

  // Global Universal Search
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document !== "undefined" && !document.cookie.includes("rfq_session=admin")) {
      window.location.href = "/admin/login";
    }
  }, []);

  const loadRealStats = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

      // 1. Fetch Real Data in Parallel from Database
      const [
        profilesRes,
        ordersRes,
        rfqsRes,
        quotesRes,
        invoicesRes,
        walletTxRes,
        auditLogsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, company_name, role, balance, created_at"),
        supabase.from("orders").select("id, total_price, subtotal, tax_amount, status, created_at, client_id, vendor_id"),
        supabase.from("rfqs").select("id, status, created_at, car_make, car_model"),
        supabase.from("quotes").select("id, status, total_price, created_at"),
        supabase.from("invoices").select("id, invoice_number, total_amount, subtotal, tax_amount, status, issued_at, created_at"),
        supabase.from("wallet_transactions").select("id, type, amount, balance_after, created_at"),
        supabase.from("audit_logs").select("id, action, entity_type, created_at, user_id, profiles(full_name, company_name)").order("created_at", { ascending: false }).limit(10),
      ]);

      const profiles = profilesRes.data || [];
      const orders = ordersRes.data || [];
      const rfqs = rfqsRes.data || [];
      const quotes = quotesRes.data || [];
      const invoices = invoicesRes.data || [];
      const walletTx = walletTxRes.data || [];
      const auditLogs = auditLogsRes.data || [];

      // 2. Compute Real Users Statistics
      const clients = profiles.filter((p) => p.role === "client");
      const vendors = profiles.filter((p) => p.role === "vendor");
      const couriers = profiles.filter((p) => p.role === "courier");
      const staff = profiles.filter((p) => p.role === "admin" || p.role === "super_admin");
      const newUsersThisMonth = profiles.filter((p) => p.created_at >= startOfCurrentMonth).length;
      const totalWalletBalance = profiles.reduce((sum, p) => sum + Number(p.balance || 0), 0);

      // 3. Compute Real Orders & Revenue Statistics
      let totalGMV = 0;
      let totalVat = 0;
      let currentMonthRevenue = 0;
      let lastMonthRevenue = 0;
      let currentMonthOrders = 0;
      let activeOrders = 0;
      let completedOrders = 0;
      let cancelledOrders = 0;

      orders.forEach((o) => {
        const price = Number(o.total_price || 0);
        const vat = Number(o.tax_amount || (price * 0.15) / 1.15 || 0);
        totalGMV += price;
        totalVat += vat;

        const created = o.created_at || "";
        if (created >= startOfCurrentMonth) {
          currentMonthRevenue += price;
          currentMonthOrders++;
        } else if (created >= startOfLastMonth && created <= endOfLastMonth) {
          lastMonthRevenue += price;
        }

        const st = (o.status || "").toLowerCase();
        if (["completed", "delivered"].includes(st)) {
          completedOrders++;
        } else if (["cancelled", "rejected"].includes(st)) {
          cancelledOrders++;
        } else {
          activeOrders++;
        }
      });

      // If invoices exist, compute actual collected amount
      let paidInvoicesAmount = 0;
      let paidInvoicesCount = 0;
      let pendingInvoicesCount = 0;
      invoices.forEach((inv) => {
        const amt = Number(inv.total_amount || 0);
        const st = (inv.status || "").toLowerCase();
        if (st === "paid") {
          paidInvoicesAmount += amt;
          paidInvoicesCount++;
        } else {
          pendingInvoicesCount++;
        }
      });

      // Revenue Growth %
      const revenueGrowthPct =
        lastMonthRevenue > 0
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : currentMonthRevenue > 0
          ? 100
          : 0;

      const avgOrderValue = orders.length > 0 ? totalGMV / orders.length : 0;
      const orderCompletionRate = orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0;

      // 4. Compute Real RFQs Statistics
      let openRfqs = 0;
      let closedRfqs = 0;
      let currentMonthRfqs = 0;
      rfqs.forEach((r) => {
        const st = (r.status || "").toLowerCase();
        if (st === "open" || st === "pending") {
          openRfqs++;
        } else {
          closedRfqs++;
        }
        if ((r.created_at || "") >= startOfCurrentMonth) {
          currentMonthRfqs++;
        }
      });

      // 5. Generate Last 6 Months Trend from Real Database Records
      const monthlyTrendMap: Record<string, { revenue: number; ordersCount: number; rfqsCount: number }> = {};
      const monthlyLabels: { key: string; name: string }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, "0")}`;
        const name = `${ARABIC_MONTH_NAMES[m]} ${y}`;
        monthlyLabels.push({ key, name });
        monthlyTrendMap[key] = { revenue: 0, ordersCount: 0, rfqsCount: 0 };
      }

      orders.forEach((o) => {
        if (!o.created_at) return;
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyTrendMap[key]) {
          monthlyTrendMap[key].revenue += Number(o.total_price || 0);
          monthlyTrendMap[key].ordersCount += 1;
        }
      });

      rfqs.forEach((r) => {
        if (!r.created_at) return;
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyTrendMap[key]) {
          monthlyTrendMap[key].rfqsCount += 1;
        }
      });

      const monthlyTrend: MonthlyDataPoint[] = monthlyLabels.map((lbl) => ({
        monthKey: lbl.key,
        monthName: lbl.name,
        revenue: monthlyTrendMap[lbl.key]?.revenue || 0,
        ordersCount: monthlyTrendMap[lbl.key]?.ordersCount || 0,
        rfqsCount: monthlyTrendMap[lbl.key]?.rfqsCount || 0,
      }));

      // 6. Build Real Recent Activity Feed
      let recentActivity: ActivityItem[] = [];
      if (auditLogs && auditLogs.length > 0) {
        recentActivity = auditLogs.map((a: any) => {
          let type: ActivityItem["type"] = "system";
          const ent = (a.entity_type || "").toLowerCase();
          const act = (a.action || "").toLowerCase();
          if (ent.includes("order") || act.includes("order")) type = "order";
          else if (ent.includes("rfq") || act.includes("rfq") || ent.includes("quote")) type = "rfq";
          else if (ent.includes("invoice") || act.includes("invoice")) type = "invoice";
          else if (ent.includes("wallet") || act.includes("wallet") || ent.includes("transaction")) type = "wallet";
          else if (ent.includes("user") || ent.includes("profile")) type = "user";

          return {
            id: a.id,
            action: a.action || "عملية نظام",
            entity_type: a.entity_type || "عام",
            actor_name: a.profiles?.company_name || a.profiles?.full_name || "مشرف النظام",
            actor_company: a.profiles?.company_name,
            created_at: a.created_at,
            type,
          };
        });
      } else {
        // Fallback to real recent orders & RFQs if audit_logs is empty
        const recentOrders = orders.slice(0, 5).map((o) => ({
          id: `ord-${o.id}`,
          action: `إنشاء أمر شراء وتأكيد صفقة #${o.id.slice(0, 8)}`,
          entity_type: "الطلبات والصفقات",
          actor_name: "العميل والمورد",
          created_at: o.created_at,
          type: "order" as const,
        }));
        const recentRfqs = rfqs.slice(0, 5).map((r) => ({
          id: `rfq-${r.id}`,
          action: `طلب تسعير جديد ${r.car_make || ""} ${r.car_model || ""}`,
          entity_type: "طلبات التسعير",
          actor_name: "مشتريات معتمدة",
          created_at: r.created_at,
          type: "rfq" as const,
        }));
        recentActivity = [...recentOrders, ...recentRfqs]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8);
      }

      setStats({
        currentMonthRevenue,
        lastMonthRevenue,
        revenueGrowthPct,
        totalGMV,
        totalVat,
        avgOrderValue,
        totalWalletBalance,

        totalOrders: orders.length,
        currentMonthOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        orderCompletionRate,

        totalRfqs: rfqs.length,
        currentMonthRfqs,
        openRfqs,
        closedRfqs,
        totalQuotes: quotes.length,

        totalInvoices: invoices.length,
        paidInvoices: paidInvoicesCount,
        pendingInvoices: pendingInvoicesCount,
        paidInvoicesAmount,

        totalUsers: profiles.length,
        clientsCount: clients.length,
        vendorsCount: vendors.length,
        couriersCount: couriers.length,
        staffCount: staff.length,
        newUsersThisMonth,

        monthlyTrend,
        recentActivity,
      });

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load real admin overview statistics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealStats();
  }, [loadRealStats]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Global search across users, ref codes, phones, companies
  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowDrop(false);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, ref_code, phone, company_name")
        .or(`full_name.ilike.%${q}%,ref_code.ilike.%${q}%,phone.ilike.%${q}%,company_name.ilike.%${q}%`)
        .limit(8);

      setSearchResults(data || []);
      setShowDrop(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  // Max value for visual bar scaling
  const maxTrendRevenue = useMemo(() => {
    if (!stats?.monthlyTrend.length) return 1000;
    const max = Math.max(...stats.monthlyTrend.map((m) => m.revenue));
    return max > 0 ? max : 1000;
  }, [stats?.monthlyTrend]);

  const maxTrendOrders = useMemo(() => {
    if (!stats?.monthlyTrend.length) return 10;
    const max = Math.max(...stats.monthlyTrend.map((m) => m.ordersCount));
    return max > 0 ? max : 10;
  }, [stats?.monthlyTrend]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* ── 1. Top Executive Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>لوحة القيادة الموحدة · بيانات حية ومباشرة 100%</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            نظرة عامة والتحكم الإستراتيجي
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm font-bold max-w-2xl leading-relaxed">
            متابعة فورية ومباشرة لكافة تدفقات المنصة: طلبات التسعير، الصفقات المعتمدة، الفواتير الضريبية ZATCA، والمحافظ المالية لجميع العضويات.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 self-start md:self-center shrink-0">
          <button
            onClick={loadRealStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>
          <div className="hidden sm:block text-left text-[11px] text-slate-400 font-mono">
            <span>آخر تحديث:</span>
            <p className="text-white font-bold">{lastRefreshed.toLocaleTimeString("ar-SA")}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Universal Search Bar ── */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDrop(true)}
            placeholder="بحث فوري شامل: ابحث باسم العميل أو المورد، الرقم المرجعي (CUST- / SUP-)، رقم الجوال أو المنشأة..."
            className="w-full h-14 pr-12 pl-12 rounded-2xl border border-slate-200/90 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all"
          />
          {searching && (
            <RefreshCw className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
          )}
        </div>

        {showDrop && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
            <div className="p-3 bg-slate-50 text-[11px] font-black text-slate-500 flex justify-between items-center">
              <span>نتائج البحث المباشرة ({searchResults.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">اضغط للانتقال إلى ملف المستخدم</span>
            </div>
            {searchResults.map((r) => (
              <Link
                key={r.id}
                href={`/admin/users?highlight=${r.id}`}
                onClick={() => setShowDrop(false)}
                className="flex items-center justify-between p-4 hover:bg-blue-50/60 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-black text-sm">
                    {(r.company_name || r.full_name || "م").slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{r.company_name || r.full_name || "—"}</p>
                    <p className="text-xs text-slate-400 font-bold">{r.phone || r.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {r.ref_code && (
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl font-black">
                      {r.ref_code}
                    </span>
                  )}
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-black border ${
                      r.role === "client"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : r.role === "vendor"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {r.role === "client" ? "عميل مشتريات" : r.role === "vendor" ? "مورد قطع" : "مندوب توصيل"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Primary Executive KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Monthly Revenue (إيرادات الشهر) */}
        <div className="bg-gradient-to-br from-white to-blue-50/40 rounded-3xl border border-blue-200/80 p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black text-blue-600 bg-blue-100/70 px-2.5 py-1 rounded-full inline-block mb-2">
                إيرادات الشهر الحالي
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : formatSAR(stats?.currentMonthRevenue || 0)}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">ريال سعودي</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-black">
              {(stats?.revenueGrowthPct || 0) >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 ml-1" />
                  +{(stats?.revenueGrowthPct || 0).toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                  <TrendingDown className="w-3.5 h-3.5 ml-1" />
                  {(stats?.revenueGrowthPct || 0).toFixed(1)}%
                </span>
              )}
              <span className="text-slate-500 font-bold text-[11px]">مقارنة بالشهر السابق</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              سابق: {formatSAR(stats?.lastMonthRevenue || 0)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Orders & Completion (عدد الطلبات) */}
        <Link
          href="/admin/orders"
          className="bg-gradient-to-br from-white to-emerald-50/40 rounded-3xl border border-emerald-200/80 p-6 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full inline-block mb-2">
                إجمالي الطلبات والصفقات
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : (stats?.totalOrders || 0).toLocaleString("ar-SA")}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                {stats?.currentMonthOrders || 0} طلب جديد هذا الشهر
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>{stats?.activeOrders || 0} نشط · {stats?.completedOrders || 0} مكتمل</span>
              <span className="text-emerald-700 font-black">{stats?.orderCompletionRate || 0}% إنجاز</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats?.orderCompletionRate || 0, 100)}%` }}
              />
            </div>
          </div>
        </Link>

        {/* Card 3: RFQs & Quotes (طلبات التسعير) */}
        <Link
          href="/admin/orders?tab=rfqs"
          className="bg-gradient-to-br from-white to-amber-50/40 rounded-3xl border border-amber-200/80 p-6 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-full inline-block mb-2">
                مناقصات التسعير (RFQs)
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : (stats?.totalRfqs || 0).toLocaleString("ar-SA")}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                {stats?.openRfqs || 0} طلب مفتوح حالياً لتلقي العروض
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-bold">
            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-xl text-[11px] font-black">
              {stats?.totalQuotes || 0} عرض وارد من الموردين
            </span>
            <div className="flex items-center text-slate-400 group-hover:text-amber-700 transition-colors">
              <span className="text-[11px]">استعراض RFQs</span>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            </div>
          </div>
        </Link>

        {/* Card 4: Tax Invoices & VAT (الفواتير والضريبة) */}
        <Link
          href="/admin/invoices"
          className="bg-gradient-to-br from-white to-violet-50/40 rounded-3xl border border-violet-200/80 p-6 shadow-xs hover:shadow-md hover:border-violet-300 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black text-violet-700 bg-violet-100/70 px-2.5 py-1 rounded-full inline-block mb-2">
                الفواتير الضريبية ZATCA
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : (stats?.totalInvoices || 0).toLocaleString("ar-SA")}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                {stats?.paidInvoices || 0} فاتورة مسددة بالكامل
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-bold">
            <div>
              <span className="text-[10px] text-slate-400 block">إجمالي الضريبة 15%:</span>
              <span className="text-violet-800 font-mono font-black">{formatSAR(stats?.totalVat || 0)} ر.س</span>
            </div>
            <div className="flex items-center text-slate-400 group-hover:text-violet-700 transition-colors">
              <span className="text-[11px]">الفواتير</span>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* ── 4. Secondary Key Financial & Ecosystem Metrics Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>إجمالي قيمة التداولات (GMV)</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {loading ? "..." : formatSAR(stats?.totalGMV || 0)} <span className="text-xs font-normal text-slate-400 font-sans">ر.س</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>متوسط قيمة الطلب (AOV)</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {loading ? "..." : formatSAR(stats?.avgOrderValue || 0)} <span className="text-xs font-normal text-slate-400 font-sans">ر.س</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
            <Wallet className="w-4 h-4 text-indigo-600" />
            <span>سيولة المحافظ المالية للمستخدمين</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {loading ? "..." : formatSAR(stats?.totalWalletBalance || 0)} <span className="text-xs font-normal text-slate-400 font-sans">ر.س</span>
          </p>
        </div>

        <Link
          href="/admin/users"
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-colors block group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-600" />
              <span>إجمالي المستخدمين والعضويات</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {loading ? "..." : (stats?.totalUsers || 0).toLocaleString("ar-SA")}{" "}
            <span className="text-xs font-bold text-slate-400">
              ({stats?.clientsCount || 0} عميل · {stats?.vendorsCount || 0} مورد)
            </span>
          </p>
        </Link>
      </div>

      {/* ── 5. Interactive Analytics Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: 6-Month Real Trend */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  مؤشر الأداء والنمو (آخر 6 أشهر)
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                رسم بياني تفاعلي يعكس البيانات الفعلية المستخرجة من قيد الطلبات والتسعيرات
              </p>
            </div>

            {/* Metric Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-black self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveChartMetric("revenue")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeChartMetric === "revenue"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                الإيرادات المالية (ر.س)
              </button>
              <button
                type="button"
                onClick={() => setActiveChartMetric("orders")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeChartMetric === "orders"
                    ? "bg-white text-emerald-700 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                حجم الطلبات
              </button>
            </div>
          </div>

          {/* Interactive Visual Bar Chart */}
          <div className="py-8">
            <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-56 pt-6">
              {stats?.monthlyTrend.map((m) => {
                const val = activeChartMetric === "revenue" ? m.revenue : m.ordersCount;
                const maxVal = activeChartMetric === "revenue" ? maxTrendRevenue : maxTrendOrders;
                const heightPercent = maxVal > 0 ? Math.max(Math.round((val / maxVal) * 100), 8) : 8;

                return (
                  <div key={m.monthKey} className="flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none mb-1">
                      {activeChartMetric === "revenue"
                        ? `${formatSAR(m.revenue)} ر.س (${m.ordersCount} طلب)`
                        : `${m.ordersCount} طلب (${formatSAR(m.revenue)} ر.س)`}
                    </div>

                    {/* Bar container */}
                    <div className="w-full max-w-[48px] bg-slate-100 rounded-2xl p-1 flex flex-col justify-end h-40">
                      <div
                        className={`w-full rounded-xl transition-all duration-700 ${
                          activeChartMetric === "revenue"
                            ? "bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400"
                            : "bg-gradient-to-t from-emerald-600 to-teal-500 group-hover:from-emerald-500 group-hover:to-teal-400"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Month Label */}
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-slate-600 group-hover:text-blue-700 transition-colors">
                        {m.monthName.split(" ")[0]}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400">{m.monthName.split(" ")[1]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span>إجمالي إيرادات الأشهر الستة: {formatCompactSAR(stats?.totalGMV || 0)}</span>
            </span>
            <span className="text-slate-400">بيانات متصلة بقاعدة البيانات</span>
          </div>
        </div>

        {/* Funnel & Conversion Rates Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-black text-slate-900">مسار الصفقات ومعدل التحويل</h2>
            </div>

            <div className="mt-6 space-y-4">
              {/* Step 1: RFQs */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-700">1. طلبات التسعير (RFQs)</span>
                  <span className="font-mono text-blue-700 font-black">{stats?.totalRfqs || 0} طلب</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-full" />
                </div>
              </div>

              {/* Step 2: Quotes Received */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-700">2. عروض الأسعار المستلمة</span>
                  <span className="font-mono text-amber-700 font-black">{stats?.totalQuotes || 0} عرض</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        stats?.totalRfqs ? Math.round(((stats.totalQuotes || 0) / stats.totalRfqs) * 100) : 75,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Step 3: Orders Created */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-700">3. أوامر الشراء والصفقات</span>
                  <span className="font-mono text-emerald-700 font-black">{stats?.totalOrders || 0} أمر</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        stats?.totalRfqs ? Math.round(((stats.totalOrders || 0) / stats.totalRfqs) * 100) : 50,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Step 4: Paid Invoices */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-700">4. فواتير مسددة بالكامل</span>
                  <span className="font-mono text-violet-700 font-black">{stats?.paidInvoices || 0} مسددة</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        stats?.totalOrders ? Math.round(((stats.paidInvoices || 0) / stats.totalOrders) * 100) : 40,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <span className="text-xs font-black text-slate-700">
              معدل نجاح التحويل الكلي:{" "}
              <span className="text-emerald-600 font-black">
                {stats?.totalRfqs
                  ? Math.round(((stats.completedOrders || 0) / stats.totalRfqs) * 100)
                  : 0}
                %
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 6. Ecosystem Roles & Quick Action Command Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Navigation */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>الوصول السريع والتحكم</span>
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold">
              8 لوحات فرعية
            </span>
          </div>

          <div className="space-y-1.5">
            {[
              { href: "/admin/users", label: "إدارة المستخدمين والعضويات", sub: `${stats?.totalUsers || 0} حساب`, icon: Users, color: "text-blue-600 bg-blue-50" },
              { href: "/admin/orders", label: "إدارة الطلبات والصفقات", sub: `${stats?.totalOrders || 0} طلب`, icon: ShoppingBag, color: "text-emerald-600 bg-emerald-50" },
              { href: "/admin/orders?tab=rfqs", label: "طلبات عروض الأسعار (RFQs)", sub: `${stats?.totalRfqs || 0} مناقصة`, icon: FileText, color: "text-amber-600 bg-amber-50" },
              { href: "/admin/invoices", label: "الفواتير الضريبية ZATCA", sub: `${stats?.totalInvoices || 0} فاتورة`, icon: ClipboardList, color: "text-violet-600 bg-violet-50" },
              { href: "/admin/wallet", label: "محفظة الأدمن (العمولات)", sub: "سجل عمولات المنصة والأرصدة", icon: Wallet, color: "text-emerald-700 bg-emerald-50" },
              { href: "/admin/couriers", label: "أسطول المناديب والتوصيل", sub: `${stats?.couriersCount || 0} مندوب معتمد`, icon: Truck, color: "text-teal-600 bg-teal-50" },
              { href: "/admin/coupons", label: "أكواد الخصم والكوبونات", sub: "العروض الترويجية", icon: Tag, color: "text-pink-600 bg-pink-50" },
              { href: "/admin/audit", label: "سجل الأنشطة والرقابة الأمنية", sub: "تتبع كافة الحركات", icon: ShieldCheck, color: "text-slate-600 bg-slate-100" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:-translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Live Real Activity Stream */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h2 className="font-black text-slate-900 text-sm">سجل الأنشطة والأحداث المباشر</h2>
              </div>
              <Link
                href="/admin/audit"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
              >
                <span>عرض السجل الشامل</span>
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : !stats?.recentActivity.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Clock className="w-10 h-10 mb-2 text-slate-200" />
                <p className="text-xs font-bold">لا توجد حركات مسجلة حالياً</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.recentActivity.map((a) => {
                  const isOrder = a.type === "order";
                  const isRfq = a.type === "rfq";
                  const isInvoice = a.type === "invoice";
                  const isWallet = a.type === "wallet";

                  const badgeClass = isOrder
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isRfq
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : isInvoice
                    ? "bg-violet-50 text-violet-700 border-violet-200"
                    : isWallet
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeClass}`}
                        >
                          {isOrder ? (
                            <ShoppingBag className="w-4 h-4" />
                          ) : isRfq ? (
                            <FileText className="w-4 h-4" />
                          ) : isInvoice ? (
                            <ClipboardList className="w-4 h-4" />
                          ) : isWallet ? (
                            <Wallet className="w-4 h-4" />
                          ) : (
                            <Activity className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{a.action}</p>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                            <span className="text-slate-600">{a.actor_name}</span>
                            <span>·</span>
                            <span>{a.entity_type}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-left">
                        <span className="text-[10px] font-mono text-slate-400 block font-bold">
                          {formatTimeAgo(a.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-bold flex items-center justify-between">
            <span>تحديث فوري عبر Audit Logs وقيد العمليات</span>
            <span className="font-mono text-emerald-600 font-bold">● متصل ومحمي</span>
          </div>
        </div>
      </div>
    </div>
  );
}
