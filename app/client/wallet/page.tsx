"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  X,
  CreditCard,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";

/* ── Types ── */
interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  balance_before?: number;
  balance_after: number;
  date: string;
  description: string;
  reference?: string;
  order_id?: string;
  invoice_number?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function ClientWalletPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "all",
    startDate: null,
    endDate: null,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Column Visibility Preferences
  const [columns, setColumns] = useState({
    refNumber: true,
    invoiceNumber: true,
    type: true,
    amount: true,
    balanceBefore: true,
    date: true,
    balance: true,
    description: true,
  });

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const clientId = user?.id || "client-demo-id";

      // 1. Fetch live authoritative data from server API
      const res = await fetch(`/api/v1/wallet?userId=${encodeURIComponent(clientId)}&role=client`, {
        cache: "no-store",
        credentials: "include",
        headers: {
          "x-user-id": clientId,
        },
      });
      const data = await res.json();

      if (data.success) {
        setCurrentBalance(Number(data.balance || 0));
        const mapped: Transaction[] = (data.transactions || []).map((t: any) => ({
          id: t.id,
          type: t.type as "credit" | "debit",
          amount: Number(t.amount || 0),
          balance_before: t.balance_before !== undefined ? Number(t.balance_before) : undefined,
          balance_after: Number(t.balance_after || 0),
          date: t.date || t.created_at,
          description: t.description || (t.type === "credit" ? "إيداع في المحفظة" : "خصم مشتريات"),
          reference: t.reference || `TX-${t.id.slice(0, 8).toUpperCase()}`,
          order_id: t.order_id,
          invoice_number: t.invoice_number || (t.reference?.startsWith("INV") ? t.reference : undefined),
        }));
        setTransactions(mapped);

        // Synchronize with local storage for offline / quick reads
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

      // Fallback if API returned unsuccessful
      if (!user) {
        setTransactions([]);
        setCurrentBalance(0);
        return;
      }

      // Fetch wallet transactions from client fallback
      const { data: txData, error } = await supabase
        .from("wallet_transactions")
        .select("id, type, amount, balance_before, balance_after, description, reference, invoice_number, order_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !txData) {
        setTransactions([]);
        setCurrentBalance(0);
        return;
      }

      const mapped: Transaction[] = txData.map((t: any) => ({
        id: t.id,
        type: t.type as "credit" | "debit",
        amount: Number(t.amount || 0),
        balance_before: t.balance_before !== undefined ? Number(t.balance_before) : undefined,
        balance_after: Number(t.balance_after || 0),
        date: t.created_at,
        description: t.description || (t.type === "credit" ? "إيداع في المحفظة" : "خصم مشتريات"),
        reference: t.reference || `TX-${t.id.slice(0, 8).toUpperCase()}`,
        order_id: t.order_id,
        invoice_number: t.invoice_number || (t.reference?.startsWith("INV") ? t.reference : undefined),
      }));

      let balance = mapped.length > 0 ? mapped[0].balance_after : 0;
      if (mapped.length === 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, wallet_balance")
          .eq("id", user.id)
          .maybeSingle();
        balance = Number((profile as any)?.balance ?? profile?.wallet_balance ?? 0);
      }
      setCurrentBalance(balance);
      setTransactions(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type Filter
      if (typeFilter !== "all" && t.type !== typeFilter) return false;

      // Date Range Filter
      if (dateRange && (dateRange.startDate || dateRange.endDate)) {
        const txDate = new Date(t.date).getTime();
        if (dateRange.startDate) {
          const s = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
          if (txDate < s) return false;
        }
        if (dateRange.endDate) {
          const e = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
          if (txDate > e) return false;
        }
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const ref = (t.reference || "").toLowerCase();
        const inv = (t.invoice_number || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const ord = (t.order_id || "").toLowerCase();
        return ref.includes(q) || inv.includes(q) || desc.includes(q) || ord.includes(q);
      }

      return true;
    });
  }, [transactions, typeFilter, dateRange, search]);

  // Financial Stats
  const stats = useMemo(() => {
    const totalCredits = filteredTransactions
      .filter((t) => t.type === "credit")
      .reduce((s, t) => s + t.amount, 0);
    const totalDebits = filteredTransactions
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + t.amount, 0);
    return { totalCredits, totalDebits, count: filteredTransactions.length };
  }, [filteredTransactions]);


  // Export to Excel / CSV
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const headers = [
        "رقم المرجع",
        "رقم الفاتورة",
        "نوع العملية",
        "المبلغ (ر.س)",
        "الرصيد قبل الحركة (ر.س)",
        "الرصيد بعد الحركة (ر.س)",
        "التاريخ والوقت",
        "البيان / الوصف",
      ];

      const rows = filteredTransactions.map((t) => [
        t.reference || "-",
        t.invoice_number || "-",
        t.type === "credit" ? "دائن (+)" : "مدين (-)",
        t.amount,
        t.balance_before !== undefined ? t.balance_before : "-",
        t.balance_after,
        fmtDate(t.date),
        t.description,
      ]);

      const csvContent =
        "\uFEFF" +
        [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `كشف_حساب_المحفظة_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تصدير كشف الحساب");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 text-slate-900 font-sans w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-100 font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">المحفظة والحساب المالي</h1>
            <p className="text-xs text-gray-500 mt-0.5">متابعة الرصيد المالي المتاح وكشف حركة العمليات المركزية</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWalletData}
            disabled={loading}
            className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          {/* Export to Excel */}
          <Button
            onClick={handleExportExcel}
            disabled={filteredTransactions.length === 0 || isExporting}
            size="sm"
            className="rounded-xl bg-[#0F4C5C] hover:bg-[#0c3c49] text-white text-xs font-bold gap-1.5 shadow-xs h-9"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تصدير Excel</span>
          </Button>
        </div>
      </div>

      {/* Balance & Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-[#1B4D3E] to-[#12362C] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-200">الرصيد المالي المتاح</span>
              <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black mt-3 tracking-tight font-mono">
              {fmt(currentBalance)} <span className="text-sm font-semibold text-emerald-200">ر.س</span>
            </p>
            <p className="text-[11px] text-emerald-100/70 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>محفظة موحدة - قيود دفترية مزدوجة معتمدة</span>
            </p>
          </div>

        </div>

        {/* Total Credits */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>إجمالي الإيداعات (دائن)</span>
            <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2 font-mono">
            +{fmt(stats.totalCredits)} <span className="text-xs font-bold text-gray-400">ر.س</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">مبالغ مستردة وإيداعات إيجابية</p>
        </div>

        {/* Total Debits */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>إجمالي المدفوعات (مدين)</span>
            <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2 font-mono">
            -{fmt(stats.totalDebits)} <span className="text-xs font-bold text-gray-400">ر.س</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">مشتريات وعمليات سداد الطلبات المعتمدة</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم المرجع، الفاتورة، أو البيان..."
              className="pr-10 text-xs h-10 rounded-xl bg-slate-50 border-slate-200"
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

          {/* Type Filter */}
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

        {/* DateRangeFilter & Column Customization */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
          {/* Date Range Filter */}
          <DateRangeFilter
            value={dateRange}
            onChange={(val) => setDateRange(val || { startDate: null, endDate: null, preset: "all" })}
          />

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
                  {Object.values(columns).filter(Boolean).length}/8
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white">
              <DropdownMenuLabel className="text-xs font-bold text-gray-500">إظهار / إخفاء الأعمدة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={columns.refNumber}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, refNumber: !!c }))}
              >
                رقم المرجع
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.invoiceNumber}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, invoiceNumber: !!c }))}
              >
                رقم الفاتورة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.type}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, type: !!c }))}
              >
                نوع العملية
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.amount}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, amount: !!c }))}
              >
                المبلغ
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.balanceBefore}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, balanceBefore: !!c }))}
              >
                الرصيد قبل الحركة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.balance}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, balance: !!c }))}
              >
                الرصيد بعد الحركة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.date}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, date: !!c }))}
              >
                التاريخ والوقت
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.description}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, description: !!c }))}
              >
                الوصف والبيان
              </DropdownMenuCheckboxItem>
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

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">جاري تحميل كشف الحساب المركزي...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-800">لا توجد حركات مالية مسجلة</p>
            <p className="text-xs text-gray-400 mt-1">ستظهر جميع عمليات السداد والإيداع ورصيد المحفظة هنا</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold">
                <tr>
                  {columns.refNumber && <th className="py-3.5 px-4">رقم المرجع</th>}
                  {columns.invoiceNumber && <th className="py-3.5 px-4">رقم الفاتورة</th>}
                  {columns.type && <th className="py-3.5 px-4">نوع العملية</th>}
                  {columns.amount && <th className="py-3.5 px-4">المبلغ</th>}
                  {columns.balanceBefore && <th className="py-3.5 px-4">الرصيد قبل الحركة</th>}
                  {columns.balance && <th className="py-3.5 px-4">الرصيد بعد الحركة</th>}
                  {columns.date && <th className="py-3.5 px-4">التاريخ والوقت</th>}
                  {columns.description && <th className="py-3.5 px-4">البيان والتفاصيل</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.type === "credit";

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* 1. Reference */}
                      {columns.refNumber && (
                        <td className="py-4 px-4 font-mono font-bold text-gray-900">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span>{tx.reference || `TX-${tx.id.slice(0, 8).toUpperCase()}`}</span>
                          </span>
                        </td>
                      )}

                      {/* 2. Canonical Invoice Number */}
                      {columns.invoiceNumber && (
                        <td className="py-4 px-4 font-mono text-gray-700">
                          {tx.invoice_number ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
                              {tx.invoice_number}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )}

                      {/* 3. Type */}
                      {columns.type && (
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            <span>{isCredit ? "دائن (+)" : "مدين (-)"}</span>
                          </span>
                        </td>
                      )}

                      {/* 4. Amount */}
                      {columns.amount && (
                        <td
                          className={`py-4 px-4 font-mono font-black text-sm ${
                            isCredit ? "text-emerald-800" : "text-rose-600"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {fmt(tx.amount)} <span className="text-xs font-normal text-gray-400">ر.س</span>
                        </td>
                      )}

                      {/* 5. Balance Before */}
                      {columns.balanceBefore && (
                        <td className="py-4 px-4 font-mono text-gray-600">
                          {tx.balance_before !== undefined ? `${fmt(tx.balance_before)} ر.س` : "-"}
                        </td>
                      )}

                      {/* 6. Balance After */}
                      {columns.balance && (
                        <td className="py-4 px-4 font-mono font-bold text-gray-900">
                          {fmt(tx.balance_after)} <span className="text-xs font-normal text-gray-400">ر.س</span>
                        </td>
                      )}

                      {/* 7. Date */}
                      {columns.date && (
                        <td className="py-4 px-4 text-gray-600 font-normal">{fmtDate(tx.date)}</td>
                      )}

                      {/* 8. Description */}
                      {columns.description && (
                        <td className="py-4 px-4 text-gray-600">
                          <span>{tx.description}</span>
                          {tx.order_id && (
                            <span className="block text-[10px] text-gray-400 font-mono mt-0.5">
                              طلب مرتبط #{tx.order_id.slice(0, 8).toUpperCase()}
                            </span>
                          )}
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

    </div>
  );
}

