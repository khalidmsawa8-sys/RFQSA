"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
  TrendingUp,
  X,
  CreditCard,
  Lock,
  Truck,
  ExternalLink,
} from "lucide-react";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { extractCleanOrderNumber } from "@/lib/invoice-canonical";

interface CourierTransactionItem {
  id: string;
  reference_number: string;
  invoice_number?: string;
  order_id: string;
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
  return id.replace(/^LEDG-/, "").replace(/^ORD-/, "").replace(/^DEL-/, "").slice(0, 8).toUpperCase();
}

export default function CourierWalletPage() {
  const [transactions, setTransactions] = useState<CourierTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [completedTripsCount, setCompletedTripsCount] = useState(0);

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

  useEffect(() => {
    async function loadWallet() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/courier/wallet", {
          headers: { "x-courier-id": "courier-demo-id" },
        });
        const data = await res.json();

        if (data.success && data.wallet) {
          const w = data.wallet;
          setCurrentBalance(Number(w.current_balance || 0));
          setTotalEarned(Number(w.total_earned || 0));
          setCompletedTripsCount(Number(w.completed_trips_count || 0));

          let runningBalance = Number(w.current_balance || 0);
          const mapped: CourierTransactionItem[] = (w.ledger_entries || []).map((e: any) => {
            const isCredit = e.entry_type === "COMMISSION_CREDIT" || e.entry_type === "BONUS";
            const amt = Math.abs(Number(e.amount || 35.0));
            const ordNum = extractCleanOrderNumber(e.order_id || e.delivery_id || e.id || "5501") || "5501";

            return {
              id: e.id,
              reference_number: `ORD-${ordNum}`,
              invoice_number: `INV-2026-${ordNum}`,
              order_id: `ORD-${ordNum}`,
              type: isCredit ? "credit" : "debit",
              amount: amt,
              balance_after: runningBalance,
              description: e.description || (isCredit ? `عمولة توصيل مكتملة للطلب #ORD-${ordNum}` : "سحب أرباح بنكية"),
              created_at: e.created_at || new Date().toISOString(),
              status: "completed",
            };
          });

          setTransactions(mapped);
        }
      } catch (err) {
        console.error("Error loading courier wallet:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWallet();
  }, []);

  // Filter transactions by Search & Date Range
  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transactions.filter((t) => {
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
        const matchStr = `${t.reference_number} ${t.order_id} ${t.description} ${t.type}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      return true;
    });
  }, [transactions, search, dateRange]);

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
            `"${t.reference_number}"`,
            `"${t.invoice_number || "-"}"`,
            `"${t.type === "credit" ? "دائن (+)" : "مدين (-)"}"`,
            t.amount.toFixed(2),
            t.balance_after.toFixed(2),
            `"${new Date(t.created_at).toLocaleString("ar-SA")}"`,
            `"${t.description.replace(/"/g, '""')}"`,
            `"${t.status === "completed" ? "مكتملة ومودعة" : t.status}"`,
          ].join(",")
        ),
      ];

      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `كشف_حساب_محفظة_المندوب_${new Date().toISOString().slice(0, 10)}.csv`);
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
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-xl font-black text-slate-900">المحفظة المالية للمندوب</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>كشف عمولات محمي (Read-Only)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              متابعة رصيد عمولات التوصيل المتاح للسحب، سجل الشحنات المنجزة، وحركات الإيداع المالي المعتمدة
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">رصيد العمولات المتاح للسحب</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">{fmt(currentBalance)} ر.س</p>
              <span className="text-[10px] text-emerald-300 inline-flex items-center gap-1 mt-1 font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>رصيد عمولات معتمد وموثق</span>
              </span>
            </div>
          </div>

          {/* Card 2: Cumulative Earned */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">إجمالي الأرباح التراكمية (دائن)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-emerald-800 font-mono">+{fmt(totalEarned)} ر.س</p>
              <span className="text-[10px] text-slate-400 mt-1 block">مجموع عمولات الشحنات المكتملة</span>
            </div>
          </div>

          {/* Card 3: Trips Count */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">عدد مهام التوصيل المكتملة</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-900 font-mono">{completedTripsCount} رحلة</p>
              <span className="text-[10px] text-slate-400 mt-1 block">شحنات موثقة بـ OTP / PoD</span>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="بحث بالرقم المرجعي، الطلب، البيان..."
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

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Date Range Filter */}
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
                    className="text-[10px] text-emerald-800 hover:underline font-bold"
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
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                      />
                    </label>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Transactions Ledger Table ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">جاري تحميل سجل العمولات...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد حركات مالية مطابقة للفترة المحددة</p>
              <p className="text-xs text-slate-400">ستظهر هنا قيود العمولات فور إتمام مهام التوصيل</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                    {visibleColumns.reference && <th className="py-3.5 px-4 font-extrabold">رقم المرجع</th>}
                    {visibleColumns.invoice_number && <th className="py-3.5 px-4 font-extrabold">رقم الفاتورة</th>}
                    {visibleColumns.type && <th className="py-3.5 px-4 font-extrabold text-center">نوع العملية</th>}
                    {visibleColumns.amount && <th className="py-3.5 px-4 font-extrabold text-center">المبلغ</th>}
                    {visibleColumns.balance_after && <th className="py-3.5 px-4 font-extrabold text-center">الرصيد بعد الحركة</th>}
                    {visibleColumns.date && <th className="py-3.5 px-4 font-extrabold">التاريخ والوقت</th>}
                    {visibleColumns.description && <th className="py-3.5 px-4 font-extrabold">البيان والتفاصيل</th>}
                    {visibleColumns.status && <th className="py-3.5 px-4 font-extrabold text-center">الحالة</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Reference */}
                      {visibleColumns.reference && (
                        <td className="py-4 px-4 font-mono font-bold text-slate-900">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.reference_number}</span>
                          </span>
                        </td>
                      )}

                      {/* Invoice */}
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

                      {/* Type (Credit/Debit) */}
                      {visibleColumns.type && (
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              t.type === "credit"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {t.type === "credit" ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                <span>دائن (+)</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                <span>مدين (-)</span>
                              </>
                            )}
                          </span>
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.amount && (
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`font-mono font-black text-sm ${
                              t.type === "credit" ? "text-emerald-800" : "text-rose-700"
                            }`}
                          >
                            {t.type === "credit" ? "+" : "-"}
                            {fmt(t.amount)} ر.س
                          </span>
                        </td>
                      )}

                      {/* Balance After */}
                      {visibleColumns.balance_after && (
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-800 text-xs">
                          {fmt(t.balance_after)} ر.س
                        </td>
                      )}

                      {/* Date & Time */}
                      {visibleColumns.date && (
                        <td className="py-4 px-4 text-slate-500 font-normal text-xs">
                          {fmtDate(t.created_at)}
                        </td>
                      )}

                      {/* Description */}
                      {visibleColumns.description && (
                        <td className="py-4 px-4 max-w-sm text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span>{t.description}</span>
                            {t.order_id && (
                              <Link
                                href={`/courier/orders/${t.order_id}`}
                                className="text-blue-600 hover:underline font-mono font-bold text-[10px] inline-flex items-center gap-0.5"
                              >
                                <span>#ORD-{shortId(t.order_id)}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>مكتملة ومودعة</span>
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
