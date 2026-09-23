"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Calendar,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  TrendingUp,
  X,
  CreditCard,
  Lock,
  Plus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";

interface VendorTransactionItem {
  id: string;
  reference_number: string;
  invoice_number?: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  status: string;
}

const WALLET_COLUMNS = [
  { id: "reference", label: "رقم المرجع" },
  { id: "invoice_number", label: "رقم الفاتورة" },
  { id: "type", label: "نوع العملية" },
  { id: "amount", label: "المبلغ" },
  { id: "balance_after", label: "الرصيد بعد الحركة" },
  { id: "date", label: "التاريخ والوقت" },
  { id: "description", label: "البيان والتفاصيل" },
  { id: "status", label: "الحالة" },
];

function fmt(n: number) {
  return Number(n || 0).toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: string) {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  return id.replace(/^TXN-/, "").replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

export default function VendorWalletPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<VendorTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [totalDebit, setTotalDebit] = useState(0);

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "all",
    startDate: null,
    endDate: null,
  });

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    reference: true,
    invoice_number: true,
    type: true,
    amount: true,
    balance_after: true,
    date: true,
    description: true,
    status: true,
  });

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch live authoritative data from server API
      const res = await fetch("/api/v1/wallet", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setCurrentBalance(Number(data.balance || 0));
        setTotalCredit(Number(data.totalCredit || 0));
        setTotalDebit(Number(data.totalDebit || 0));

        const mapped: VendorTransactionItem[] = (data.transactions || []).map((t: any) => {
          let refNum = t.reference || t.reference_number || (t.order_id ? `ORD-${shortId(t.order_id)}` : `TXN-${shortId(t.id)}`);
          let invNum = t.invoice_number;

          if (!invNum && refNum.startsWith("INV-")) {
            invNum = refNum;
            const orderMatch = (t.description || "").match(/ORD-[\w\d]+/i);
            if (orderMatch) {
              refNum = orderMatch[0];
            } else if (t.order_id) {
              refNum = t.order_id.startsWith("ORD-") ? t.order_id : `ORD-${t.order_id}`;
            } else {
              refNum = `TXN-${shortId(t.id)}`;
            }
          } else if (!invNum && t.order_id) {
            const clean = String(t.order_id).replace(/^ORD-/, "").replace(/^DEAL-/, "");
            invNum = `INV-2026-${clean.padStart(4, "0")}`;
          } else if (!invNum && (t.description || "").includes("ORD-")) {
            const orderMatch = (t.description || "").match(/ORD-([\w\d]+)/i);
            if (orderMatch) {
              invNum = `INV-2026-${orderMatch[1].padStart(4, "0")}`;
              if (refNum.startsWith("TXN-") || refNum.startsWith("TX-")) {
                refNum = orderMatch[0];
              }
            }
          }

          return {
            id: t.id,
            reference_number: refNum,
            invoice_number: invNum || undefined,
            type: (t.type === "credit" ? "credit" : "debit") as "credit" | "debit",
            amount: Math.abs(Number(t.amount || 0)),
            balance_after: Number(t.balance_after || 0),
            description: t.description || (t.type === "credit" ? "إيداع أرباح مبيعات صفقة" : "سحب رصيد / تسوية مالية"),
            created_at: t.date || t.created_at,
            status: t.status || "completed",
          };
        });
        setTransactions(mapped);

        // Sync with local storage
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("rfq_demo_wallet_transactions", JSON.stringify(data.transactions || []));
            if (data.profile) {
              const profilesRaw = localStorage.getItem("rfq_demo_profiles");
              const parsedProfiles = profilesRaw ? JSON.parse(profilesRaw) : [];
              const updated = parsedProfiles.map((p: any) =>
                p.id === data.profile.id ? { ...p, balance: data.balance, wallet_balance: data.balance } : p
              );
              localStorage.setItem("rfq_demo_profiles", JSON.stringify(updated));
            }
          } catch (e) {}
        }
        return;
      }

      // Fallback
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, wallet_balance, company_name, full_name")
        .eq("id", user.id)
        .maybeSingle();

      const { data: txns, error: txnErr } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (txnErr) {
        console.warn("Wallet transactions fetch warning:", txnErr);
      }

      let runningBalance = Number((profile as any)?.balance ?? profile?.wallet_balance ?? 0);
      let credTotal = 0;
      let debTotal = 0;

      const mapped: VendorTransactionItem[] = (txns || []).map((t: any) => {
        const amt = Number(t.amount || 0);
        const isCredit = t.type === "credit" || t.transaction_type === "credit" || amt > 0;
        if (isCredit) credTotal += Math.abs(amt);
        else debTotal += Math.abs(amt);

        let refNum = t.reference || t.reference_number || (t.order_id ? `ORD-${shortId(t.order_id)}` : `TXN-${shortId(t.id)}`);
        let invNum = t.invoice_number;

        if (!invNum && refNum.startsWith("INV-")) {
          invNum = refNum;
          const orderMatch = (t.description || "").match(/ORD-[\w\d]+/i);
          if (orderMatch) {
            refNum = orderMatch[0];
          } else if (t.order_id) {
            refNum = t.order_id.startsWith("ORD-") ? t.order_id : `ORD-${t.order_id}`;
          } else {
            refNum = `TXN-${shortId(t.id)}`;
          }
        } else if (!invNum && t.order_id) {
          const clean = String(t.order_id).replace(/^ORD-/, "").replace(/^DEAL-/, "");
          invNum = `INV-2026-${clean.padStart(4, "0")}`;
        } else if (!invNum && (t.description || "").includes("ORD-")) {
          const orderMatch = (t.description || "").match(/ORD-([\w\d]+)/i);
          if (orderMatch) {
            invNum = `INV-2026-${orderMatch[1].padStart(4, "0")}`;
            if (refNum.startsWith("TXN-") || refNum.startsWith("TX-")) {
              refNum = orderMatch[0];
            }
          }
        }

        return {
          id: t.id,
          reference_number: refNum,
          invoice_number: invNum || undefined,
          type: (isCredit ? "credit" : "debit") as "credit" | "debit",
          amount: Math.abs(amt),
          balance_after: Number(t.balance_after ?? (runningBalance - (isCredit ? 0 : amt))),
          description: t.description || (isCredit ? "إيداع أرباح مبيعات صفقة" : "سحب رصيد / تسوية مالية"),
          created_at: t.created_at || new Date().toISOString(),
          status: t.status || "completed",
        };
      });

      setCurrentBalance(runningBalance);
      setTotalCredit(credTotal);
      setTotalDebit(debTotal);
      setTransactions(mapped);
    } catch (err) {
      console.error("Error loading vendor wallet:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Filter transactions by Search, Type & Date Range
  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transactions.filter((t) => {
      // Type Filter (دائن / مدين)
      if (typeFilter !== "all" && t.type !== typeFilter) {
        return false;
      }

      // Date Range
      if (dateRange && (dateRange.startDate || dateRange.endDate)) {
        const itemDate = new Date(t.created_at).getTime();
        if (dateRange.startDate) {
          const s = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
          if (itemDate < s) return false;
        }
        if (dateRange.endDate) {
          const e = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
          if (itemDate > e) return false;
        }
      }

      // Search
      if (q) {
        const matchStr = `${t.reference_number} ${t.invoice_number || ""} ${t.description} ${t.type}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      return true;
    });
  }, [transactions, search, typeFilter, dateRange]);

  // Export to Excel / CSV Handler
  const handleExportExcel = () => {
    try {
      const headers = [
        "رقم المرجع",
        "رقم الفاتورة",
        "نوع العملية",
        "المبلغ (ر.س)",
        "الرصيد بعد الحركة (ر.س)",
        "التاريخ والوقت",
        "البيان والتفاصيل",
        "الحالة",
      ];

      const csvRows = [
        headers.join(","),
        ...filteredTransactions.map((t) =>
          [
            `"${t.reference_number || "-"}"`,
            `"${t.invoice_number || "-"}"`,
            `"${t.type === "credit" ? "دائن (+)" : "مدين (-)"}"`,
            t.amount.toFixed(2),
            t.balance_after.toFixed(2),
            `"${new Date(t.created_at).toLocaleString("ar-SA")}"`,
            `"${t.description.replace(/"/g, '""')}"`,
            `"${t.status === "completed" ? "مكتملة" : t.status}"`,
          ].join(",")
        ),
      ];

      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `كشف_حساب_المحفظة_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV export error:", e);
      alert("حدث خطأ أثناء تصدير كشف الحساب");
    }
  };

  return (
    <div dir="rtl" className="space-y-6 pb-16 font-sans w-full">
      {/* ── Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#1B4D3E] text-white flex items-center justify-center shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-slate-900">المحفظة المالية للمورد</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>محفظة موحدة - قيود دفترية معتمدة</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              متابعة رصيد المبيعات المتاح، حركات الإيداع والسحب، وسجل العمليات المالية بدقة تامة
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadWallet}
              disabled={loading}
              className="h-9 px-3.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>

            <Button
              onClick={handleExportExcel}
              disabled={filteredTransactions.length === 0}
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير كشف الحساب Excel</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* ── Financial Balance Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Available Balance */}
          <div className="bg-gradient-to-br from-[#1B4D3E] to-[#14392E] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-100/80">الرصيد المتاح الحالي</span>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-emerald-200" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight">{fmt(currentBalance)} ر.س</p>
              <span className="text-[10px] text-emerald-200/90 inline-flex items-center gap-1 mt-1 font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>رصيد مبيعات معتمد وموثق</span>
              </span>
            </div>
          </div>

          {/* Card 2: Total Credits */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">إجمالي مستحقات المبيعات (دائن)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-emerald-800 font-mono">+{fmt(totalCredit)} ر.س</p>
              <span className="text-[10px] text-slate-400 mt-1 block">إجمالي أرباح الصفقات المكتملة</span>
            </div>
          </div>

          {/* Card 3: Total Debits */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">إجمالي المسحوبات والتسويات (مدين)</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-rose-600 font-mono">-{fmt(totalDebit)} ر.س</p>
              <span className="text-[10px] text-slate-400 mt-1 block">عمليات التحويل البنكي والتسويات</span>
            </div>
          </div>
        </div>

        {/* ── Filter & Search Toolbar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="بحث بالرقم المرجعي، البيان..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
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

            {/* Type Filter (مدين ودائن) */}
            <div className="relative shrink-0">
              <select
                value={typeFilter}
                onChange={(e: any) => setTypeFilter(e.target.value)}
                className="h-10 text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/20 shadow-2xs cursor-pointer"
              >
                <option value="all">جميع العمليات</option>
                <option value="credit">دائن (+)</option>
                <option value="debit">مدين (-)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
            {/* Date Range Filter Component */}
            <DateRangeFilter value={dateRange} onChange={(val) => setDateRange(val || { startDate: null, endDate: null, preset: "all" })} />

            {/* Column Visibility Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 gap-1.5 shadow-2xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                  <span>تخصيص الأعمدة</span>
                  <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {Object.values(visibleColumns).filter(Boolean).length}/{WALLET_COLUMNS.length}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 text-right dir-rtl p-2 rounded-2xl shadow-xl border border-slate-200 bg-white z-50 space-y-1"
              >
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 px-1">
                  <span className="text-xs font-bold text-slate-800">الأعمدة المعروضة</span>
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      WALLET_COLUMNS.forEach((c) => (all[c.id] = true));
                      setVisibleColumns(all);
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    تحديد الكل
                  </button>
                </div>
                <div className="space-y-0.5">
                  {WALLET_COLUMNS.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700"
                    >
                      <span>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={!!visibleColumns[col.id]}
                        onChange={(e) =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col.id]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                    </label>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reset Filters */}
            {(search || typeFilter !== "all" || dateRange.startDate || dateRange.endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setDateRange({ preset: "all", startDate: null, endDate: null });
                }}
                className="text-xs text-rose-600 hover:bg-rose-50 h-10 px-2 rounded-xl"
                title="تفريغ الفلاتر"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Transactions Ledger Table ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">جاري تحميل سجل المعاملات المالية...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد قيود مالية مطابقة للبحث أو الفترة الزمنية المحددة</p>
              <p className="text-xs text-slate-400">ستظهر هنا حركات الأرباح المودعة والتحويلات الخاصة بمبيعاتك فور تنفيذها</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                    {visibleColumns.reference && <th className="py-3.5 px-4 font-extrabold">رقم المرجع</th>}
                    {visibleColumns.invoice_number && <th className="py-3.5 px-4 font-extrabold">رقم الفاتورة</th>}
                    {visibleColumns.type && <th className="py-3.5 px-4 font-extrabold">نوع العملية</th>}
                    {visibleColumns.amount && <th className="py-3.5 px-4 font-extrabold">المبلغ</th>}
                    {visibleColumns.balance_after && <th className="py-3.5 px-4 font-extrabold">الرصيد بعد الحركة</th>}
                    {visibleColumns.date && <th className="py-3.5 px-4 font-extrabold">التاريخ والوقت</th>}
                    {visibleColumns.description && <th className="py-3.5 px-4 font-extrabold">البيان والتفاصيل</th>}
                    {visibleColumns.status && <th className="py-3.5 px-4 font-extrabold text-center">الحالة</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Reference Number */}
                      {visibleColumns.reference && (
                        <td className="py-4 px-4 font-mono font-bold text-slate-900">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.reference_number || `TXN-${shortId(t.id)}`}</span>
                          </span>
                        </td>
                      )}

                      {/* Invoice Number */}
                      {visibleColumns.invoice_number && (
                        <td className="py-4 px-4 font-mono text-slate-700">
                          {t.invoice_number ? (
                            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded font-bold border border-blue-200">
                              {t.invoice_number}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-sans">-</span>
                          )}
                        </td>
                      )}

                      {/* Transaction Type */}
                      {visibleColumns.type && (
                        <td className="py-4 px-4">
                          {t.type === "credit" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              <span>دائن (+)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              <span>مدين (-)</span>
                            </span>
                          )}
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.amount && (
                        <td className="py-4 px-4 font-mono font-black text-sm">
                          <span className={t.type === "credit" ? "text-emerald-800" : "text-rose-600"}>
                            {t.type === "credit" ? "+" : "-"}{fmt(t.amount)} ر.س
                          </span>
                        </td>
                      )}

                      {/* Balance After */}
                      {visibleColumns.balance_after && (
                        <td className="py-4 px-4 font-mono font-bold text-slate-700">
                          {fmt(t.balance_after)} ر.س
                        </td>
                      )}

                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-4 px-4 text-slate-500 font-normal text-xs">
                          {fmtDate(t.created_at)}
                        </td>
                      )}

                      {/* Description */}
                      {visibleColumns.description && (
                        <td className="py-4 px-4 text-slate-800 max-w-xs truncate font-medium">
                          {t.description}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>مكتملة</span>
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
