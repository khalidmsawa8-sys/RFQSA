"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  SlidersHorizontal,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BarChart3,
  CircleDollarSign,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─── Types ─────────────────────────────────────────── */
interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  date: string;
  description: string;
  reference?: string;
  invoice_number?: string;
  order_id?: string;
}

const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS_AR[dt.getMonth()]} ${dt.getFullYear()}`;
};

/* ─── Fetch from wallet_transactions table ───────── */
async function fetchWalletData(supabase: ReturnType<typeof createClient>, userId: string) {
  try {
    const res = await fetch("/api/v1/wallet", { cache: "no-store", credentials: "include" });
    const data = await res.json();
    if (data.success) {
      const currentBalance = Number(data.balance || 0);
      const transactions: Transaction[] = (data.transactions || []).map((t: any) => ({
        id: t.id,
        type: (t.type === "credit" ? "credit" : "debit") as "credit" | "debit",
        amount: Number(t.amount || 0),
        balance_after: Number(t.balance_after || 0),
        date: t.date || t.created_at,
        description: t.description || (t.type === "credit" ? "إيداع في المحفظة" : "خصم مشتريات"),
        reference: t.reference || t.reference_number || undefined,
        invoice_number: t.invoice_number || undefined,
        order_id: t.order_id || undefined,
      }));
      const sorted = [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return { transactions: sorted, currentBalance };
    }
  } catch (e) {}

  const { data: txData } = await supabase
    .from("wallet_transactions")
    .select("id, type, amount, balance_after, description, reference, created_at, order_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const transactions: Transaction[] = (txData || []).map((t: any) => ({
    id: t.id,
    type: t.type as "credit" | "debit",
    amount: Number(t.amount),
    balance_after: Number(t.balance_after),
    date: t.created_at,
    description: t.description,
    reference: t.reference ?? undefined,
    order_id: t.order_id ?? undefined,
  }));

  // الرصيد الحالي = آخر balance_after أو 0
  const currentBalance =
    transactions.length > 0
      ? transactions[transactions.length - 1].balance_after
      : 0;

  // رتّب تنازلياً لعرض الأحدث أولاً
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return { transactions: sorted, currentBalance };
}

/* ─── Monthly stats ──────────────────────────────────── */
function getMonthlyStats(transactions: Transaction[], month: number, year: number) {
  const tx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const credits = tx.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const debits = tx.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  return { credits, debits, net: credits - debits, count: tx.length };
}

/* ─── Page ─────────────────────────────────────────── */
export default function WalletPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Month selector
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  // pending
  const [pDateFrom, setPDateFrom] = useState("");
  const [pDateTo, setPDateTo] = useState("");
  const [pType, setPType] = useState<"all" | "credit" | "debit">("all");
  const [pAmountMin, setPAmountMin] = useState("");
  const [pAmountMax, setPAmountMax] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { transactions: tx, currentBalance: bal } = await fetchWalletData(supabase, user.id);
      setTransactions(tx);
      setCurrentBalance(bal);
      setLoading(false);
    })();
  }, []);

  // Month navigation
  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // Monthly filtered transactions
  const monthlyTx = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }), [transactions, selectedMonth, selectedYear]);

  const stats = useMemo(() => getMonthlyStats(transactions, selectedMonth, selectedYear), [transactions, selectedMonth, selectedYear]);
  const totalBalance = currentBalance;

  // Build monthly stats for mini chart (last 6 months)
  const last6 = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      let m = selectedMonth - 5 + i;
      let y = selectedYear;
      if (m < 0) { m += 12; y -= 1; }
      const s = getMonthlyStats(transactions, m, y);
      return { label: MONTHS_AR[m].slice(0, 3), ...s };
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Apply filters
  const applyFilter = () => {
    setDateFrom(pDateFrom); setDateTo(pDateTo);
    setTypeFilter(pType); setAmountMin(pAmountMin); setAmountMax(pAmountMax);
    setFilterOpen(false);
  };
  const clearFilter = () => {
    setPDateFrom(""); setPDateTo(""); setPType("all"); setPAmountMin(""); setPAmountMax("");
  };
  const openFilter = () => {
    setPDateFrom(dateFrom); setPDateTo(dateTo); setPType(typeFilter);
    setPAmountMin(amountMin); setPAmountMax(amountMax); setFilterOpen(true);
  };
  const activeCount = [dateFrom, dateTo, typeFilter !== "all" ? "t" : "", amountMin, amountMax].filter(Boolean).length;

  // Filtered table rows
  // When a custom date range is active, search all transactions (not just the current month)
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const hasDateRange = dateFrom || dateTo;
    const source = hasDateRange ? transactions : monthlyTx;
    return source.filter((t) => {
      const matchSearch = !q || t.description.toLowerCase().includes(q) || (t.reference || "").toLowerCase().includes(q);
      const matchType = typeFilter === "all" || t.type === typeFilter;
      const d = new Date(t.date);
      const matchFrom = !dateFrom || d >= new Date(dateFrom);
      const matchTo = !dateTo || d <= new Date(dateTo + "T23:59:59");
      const matchMin = !amountMin || t.amount >= Number(amountMin);
      const matchMax = !amountMax || t.amount <= Number(amountMax);
      return matchSearch && matchType && matchFrom && matchTo && matchMin && matchMax;
    });
  }, [transactions, monthlyTx, search, typeFilter, dateFrom, dateTo, amountMin, amountMax]);

  const maxBar = Math.max(...last6.map((m) => Math.max(m.credits, m.debits)), 1);

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      <div className="w-full px-4 sm:px-6 py-8 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
              <button onClick={() => window.history.back()} className="hover:text-slate-700 transition-colors">
                لوحة التحكم
              </button>
              <ChevronLeft className="w-3 h-3" />
              <span className="text-slate-600 font-medium">المحفظة</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">المحفظة</h1>
            <p className="text-sm text-slate-500 mt-1">سجل العمليات المالية وإحصائيات الرصيد</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            عودة
          </button>
        </div>

        {/* ── Balance Hero (premium dark navy with grid pattern) ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#0f172a] via-[#1a2b4a] to-[#243659] text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          {/* grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* subtle glow */}
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

          <div className="relative px-6 py-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/5">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">
                  إجمالي الرصيد
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl md:text-5xl font-bold text-white leading-none tabular-nums tracking-tight">
                    {loading ? "..." : fmt(Math.abs(totalBalance))}
                  </p>
                  <span className="text-sm font-medium text-white/50">ر.س</span>
                </div>
                <p className="text-[11px] text-white/40 mt-2">
                  محدّث · {MONTHS_AR[selectedMonth]} {selectedYear}
                </p>
              </div>
            </div>

            {/* Inline mini stats */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-300 uppercase tracking-wider mb-1">
                  <ArrowDownLeft className="w-3 h-3" />
                  دائن
                </div>
                <p className="text-base font-bold text-white tabular-nums">
                  {loading ? "..." : fmt(stats.credits)}
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-300 uppercase tracking-wider mb-1">
                  <ArrowUpRight className="w-3 h-3" />
                  مدين
                </div>
                <p className="text-base font-bold text-white tabular-nums">
                  {loading ? "..." : fmt(stats.debits)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI tiles row (Stripe/Linear style) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Credits tile */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                إجمالي الدائن
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.25} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight leading-none">
                {loading ? "..." : fmt(stats.credits)}
              </p>
              <span className="text-xs font-medium text-slate-400">ر.س</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>{filtered.filter(t => t.type === "credit").length} عملية</span>
            </div>
          </div>

          {/* Debits tile */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                إجمالي المدين
              </span>
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5 text-red-500" strokeWidth={2.25} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight leading-none">
                {loading ? "..." : fmt(stats.debits)}
              </p>
              <span className="text-xs font-medium text-slate-400">ر.س</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-medium">
              <TrendingDown className="w-3 h-3" />
              <span>{filtered.filter(t => t.type === "debit").length} عملية</span>
            </div>
          </div>

          {/* Net tile */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                صافي الشهر
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <CircleDollarSign className="w-3.5 h-3.5 text-slate-700" strokeWidth={2.25} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <p className={`text-3xl font-bold tabular-nums tracking-tight leading-none ${stats.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {stats.net >= 0 ? "+" : ""}{fmt(stats.net)}
              </p>
              <span className="text-xs font-medium text-slate-400">ر.س</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.net >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
              <span>{MONTHS_AR[selectedMonth]} {selectedYear}</span>
            </div>
          </div>
        </div>

        {/* ── Monthly Bar Chart ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700">الإحصائيات الشهرية</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />دائن
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />مدين
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-28">
            {last6.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-20">
                  <div
                    className="flex-1 rounded-t-md bg-emerald-400 transition-all duration-500"
                    style={{ height: `${(m.credits / maxBar) * 100}%`, minHeight: m.credits > 0 ? "4px" : "0" }}
                  />
                  <div
                    className="flex-1 rounded-t-md bg-red-400 transition-all duration-500"
                    style={{ height: `${(m.debits / maxBar) * 100}%`, minHeight: m.debits > 0 ? "4px" : "0" }}
                  />
                </div>
                <span className={`text-[10px] font-medium ${i === 5 ? "text-slate-700" : "text-slate-400"}`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
          {/* Net */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">صافي الشهر</span>
            </div>
            <span className={`text-sm font-bold ${stats.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {stats.net >= 0 ? "+" : ""}{fmt(stats.net)} ر.س
            </span>
          </div>
        </div>

        {/* ── Transactions Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            {/* Month selector */}
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-1 py-1 border border-slate-100">
              <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-slate-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-700 min-w-24 text-center">
                {MONTHS_AR[selectedMonth]} {selectedYear}
              </span>
              <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-slate-500 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <Input
                placeholder="بحث في العمليات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pr-9 text-sm bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300"
              />
            </div>

            {/* Filter */}
            <button
              onClick={openFilter}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              تصفية
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#1a2b4a] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => window.location.reload()}
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr_1.8fr] gap-4 px-5 py-3 bg-slate-50/70 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400">نوع العملية</span>
            <span className="text-xs font-semibold text-slate-400 text-left">المبلغ</span>
            <span className="text-xs font-semibold text-slate-400 text-left">الرصيد بعد</span>
            <span className="text-xs font-semibold text-slate-400">التاريخ</span>
            <span className="text-xs font-semibold text-slate-400">البيان</span>
          </div>

          {/* Rows */}
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr_1.8fr] gap-4 px-5 py-4 border-b border-slate-50 animate-pulse">
                {Array.from({ length: 5 }).map((__, j) => (
                  <div key={j} className="h-4 bg-slate-100 rounded-lg" />
                ))}
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-slate-200" />
              </div>
              <p className="text-slate-400 text-sm font-medium">لا توجد عمليات</p>
              <p className="text-slate-300 text-xs">لا توجد عمليات مالية لهذا الشهر</p>
            </div>
          ) : (
            filtered.map((tx, idx) => (
              <div
                key={tx.id}
                className={`grid grid-cols-[1.4fr_1fr_1fr_1.2fr_1.8fr] gap-4 px-5 py-4 items-center hover:bg-slate-50/60 transition-colors ${idx < filtered.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                {/* نوع العملية */}
                <div>
                  {tx.type === "credit" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
                      <ArrowDownLeft className="w-3 h-3" />
                      دائن
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
                      <ArrowUpRight className="w-3 h-3" />
                      مدين
                    </span>
                  )}
                </div>

                {/* المبلغ */}
                <div className="text-left">
                  <span className={`text-sm font-bold ${tx.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                  <span className="text-xs text-slate-400 mr-1">ر.س</span>
                </div>

                {/* الرصيد */}
                <div className="text-left">
                  <span className="text-sm font-semibold text-slate-700">{fmt(Math.abs(tx.balance_after))}</span>
                  <span className="text-xs text-slate-400 mr-1">ر.س</span>
                </div>

                {/* التاريخ */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="text-xs text-slate-500">{fmtDate(tx.date)}</span>
                  </div>
                </div>

                {/* البيان */}
                <div>
                  <p className="text-sm text-slate-600 font-medium truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {tx.reference && (
                      <span className="text-[11px] text-slate-500 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {tx.reference}
                      </span>
                    )}
                    {tx.invoice_number && (
                      <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                        {tx.invoice_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Footer summary */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">{filtered.length} عملية</span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-emerald-600 font-semibold">
                  دائن: +{fmt(filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0))} ر.س
                </span>
                <span className="text-red-500 font-semibold">
                  مدين: -{fmt(filtered.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))} ر.س
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Sheet ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[420px] p-0 flex flex-col" dir="rtl">
          <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <SheetTitle className="text-base font-bold text-gray-800">تصفية البيانات</SheetTitle>
            <button
              onClick={() => setFilterOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

            {/* نوع العملية */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">نوع العملية</p>
              <div className="grid grid-cols-3 gap-2">
                {(["all", "credit", "debit"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPType(t)}
                    className={`h-10 rounded-xl text-sm font-medium border transition-colors ${
                      pType === t
                        ? t === "credit"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : t === "debit"
                            ? "bg-red-50 border-red-300 text-red-600"
                            : "bg-[#1a2b4a] border-[#1a2b4a] text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {t === "all" ? "الكل" : t === "credit" ? "دائن" : "مدين"}
                  </button>
                ))}
              </div>
            </div>

            {/* تصفية التاريخ */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">تصفية التاريخ</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-medium">من</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={pDateFrom}
                      onChange={(e) => setPDateFrom(e.target.value)}
                      className="w-full h-10 pr-3 pl-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-600"
                    />
                    {pDateFrom && (
                      <button onClick={() => setPDateFrom("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-medium">إلى</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={pDateTo}
                      onChange={(e) => setPDateTo(e.target.value)}
                      className="w-full h-10 pr-3 pl-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-600"
                    />
                    {pDateTo && (
                      <button onClick={() => setPDateTo("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* تصفية المبلغ */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">تصفية المبلغ</p>
              <p className="text-xs text-gray-400 mb-3">المبلغ بالريال السعودي</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-medium">من</label>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                    <span className="px-2.5 text-xs text-gray-400 shrink-0 border-l border-gray-100 h-10 flex items-center">SAR</span>
                    <input
                      type="number" min="0" placeholder="e.g., 100"
                      value={pAmountMin} onChange={(e) => setPAmountMin(e.target.value)}
                      className="flex-1 h-10 px-3 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-medium">إلى</label>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                    <span className="px-2.5 text-xs text-gray-400 shrink-0 border-l border-gray-100 h-10 flex items-center">SAR</span>
                    <input
                      type="number" min="0" placeholder="e.g., 500"
                      value={pAmountMax} onChange={(e) => setPAmountMax(e.target.value)}
                      className="flex-1 h-10 px-3 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 bg-white flex items-center gap-3 shrink-0">
            <Button
              onClick={applyFilter}
              className="flex-1 h-11 bg-[#1a2b4a] hover:bg-[#243659] text-white rounded-xl text-sm font-semibold gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              تطبيق التصفية
            </Button>
            <Button
              variant="outline"
              onClick={clearFilter}
              className="h-11 px-5 border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
