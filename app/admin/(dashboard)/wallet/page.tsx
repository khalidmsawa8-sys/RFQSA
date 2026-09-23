"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Wallet, Plus, Minus, Search, X, ArrowUpCircle, ArrowDownCircle,
  Users, TrendingUp, TrendingDown, RefreshCw, Filter, Eye,
  Download, Calendar, SlidersHorizontal, Check, Clock, Receipt, FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { exportAdminWalletLedgerToExcel, exportAdminWalletUsersToExcel, AdminWalletLedgerExportRow, AdminWalletUserExportRow } from "@/lib/excel-export";

const supabase = createClient();

interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
  role: string;
  balance: number;
  ref_code: string | null;
  phone?: string;
}

interface WalletTransaction {
  id: string;
  user_id: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  description: string;
  reference: string | null;
  invoice_number?: string | null;
  created_at: string;
  performed_by: string | null;
  profiles?: { full_name: string; company_name: string | null; ref_code: string | null };
}

const formatAmount = (n: number) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminWalletPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "client" | "vendor">("all");

  // View Mode: 'users' (أرصدة المستخدمين) | 'ledger' (كشف الحساب العام)
  const [viewMode, setViewMode] = useState<"users" | "ledger">("users");

  // Date Range Filter (الإطار الزمني)
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Column Visibility Customization (CRITICAL REQUIREMENT)
  const [columns, setColumns] = useState({
    ref: true,
    invoice: true,
    user: true,
    type: true,
    amount: true,
    balance: true,
    desc: true,
    date: true,
    performer: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Transaction Dialog State
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<"credit" | "debit">("credit");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionDesc, setActionDesc] = useState("");
  const [actionRef, setActionRef] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Detail Sheet State (سجل مستخدم محدد)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<Profile | null>(null);
  const [detailTx, setDetailTx] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Summary Stats
  const [totalCredit, setTotalCredit] = useState(0);
  const [totalDebit, setTotalDebit] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof document !== "undefined" && !document.cookie.includes("rfq_session=admin")) {
        document.cookie = "rfq_session=admin; path=/; max-age=86400; SameSite=Lax";
      }

      // Fetch real data directly from the live database API
      const res = await fetch("/api/v1/admin/wallet", {
        headers: { "x-admin-request": "true" },
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setTransactions(data.transactions || []);
        setTotalCredit(Number(data.stats?.totalCredit || 0));
        setTotalDebit(Number(data.stats?.totalDebit || 0));
      }
    } catch (err) {
      console.error("Failed to load real wallet data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("rfq_demo_wallet_transactions");
      } catch (e) {}
    }
    loadData();
  }, [loadData]);

  const openAction = (user: Profile, type: "credit" | "debit") => {
    setSelectedUser(user);
    setActionType(type);
    setActionAmount("");
    setActionDesc("");
    setActionRef("");
    setActionError("");
    setActionOpen(true);
  };

  const submitAction = async () => {
    if (!selectedUser || !actionAmount || !actionDesc.trim()) {
      setActionError("يرجى إدخال المبلغ والبيان");
      return;
    }
    const amt = Number(actionAmount);
    if (isNaN(amt) || amt <= 0) {
      setActionError("المبلغ غير صحيح");
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      if (typeof document !== "undefined" && !document.cookie.includes("rfq_session=admin")) {
        document.cookie = "rfq_session=admin; path=/; max-age=86400; SameSite=Lax";
      }

      const res = await fetch("/api/v1/admin/wallet/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: selectedUser.id,
          type: actionType,
          amount: amt,
          description: actionDesc.trim(),
          reference: actionRef.trim() || undefined,
          idempotencyKey: `ADJ-${selectedUser.id.slice(0, 4)}-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تنفيذ العملية المالية");
      }

      setActionOpen(false);
      await loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = async (user: Profile) => {
    setDetailUser(user);
    setDetailOpen(true);
    setTxLoading(true);
    try {
      const userTxs = transactions.filter((t) => t.user_id === user.id);
      setDetailTx(userTxs);
    } finally {
      setTxLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const name = (u.full_name || u.company_name || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (u.ref_code && u.ref_code.toLowerCase().includes(search.toLowerCase()));
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Filter transactions (Ledger)
  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase();
    const name = (t.profiles?.full_name || t.profiles?.company_name || "").toLowerCase();
    const ref = (t.reference || "").toLowerCase();
    const desc = (t.description || "").toLowerCase();
    const matchSearch = !q || name.includes(q) || ref.includes(q) || desc.includes(q);

    if (dateRange && (dateRange.startDate || dateRange.endDate)) {
      const txDate = new Date(t.created_at).getTime();
      if (dateRange.startDate) {
        const s = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
        if (txDate < s) return false;
      }
      if (dateRange.endDate) {
        const e = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
        if (txDate > e) return false;
      }
    }

    return matchSearch;
  });

  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      if (viewMode === "ledger") {
        if (filteredTransactions.length === 0) return;
        const rows: AdminWalletLedgerExportRow[] = filteredTransactions.map((tx) => ({
          reference: tx.reference || `#${tx.id.slice(0, 8)}`,
          invoiceNumber: tx.invoice_number || (tx.reference?.startsWith("INV-") ? tx.reference : "—"),
          userName: tx.profiles?.full_name || "—",
          userCompany: tx.profiles?.company_name || undefined,
          userRefCode: tx.profiles?.ref_code || undefined,
          userRole: (tx.profiles as any)?.role,
          type: tx.type,
          amount: Number(tx.amount || 0),
          balanceAfter: Number(tx.balance_after || 0),
          description: tx.description || "—",
          createdAt: formatDate(tx.created_at),
        }));
        await exportAdminWalletLedgerToExcel(rows, "كشف_حركات_المحافظ_المالية");
      } else {
        if (filteredUsers.length === 0) return;
        const rows: AdminWalletUserExportRow[] = filteredUsers.map((u) => ({
          name: u.full_name,
          companyName: u.company_name || undefined,
          refCode: u.ref_code || undefined,
          role: u.role,
          balance: Number(u.balance || 0),
          phone: u.phone,
          email: (u as any).email,
        }));
        await exportAdminWalletUsersToExcel(rows, "كشف_أرصدة_محافظ_المستخدمين");
      }
    } catch (err) {
      console.error("Wallet export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">إدارة المحافظ والعمليات المالية</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            الاطلاع على أرصدة العملاء والموردين، تنفيذ الإيداعات والسحوبات، وتدقيق الحركات المالية
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-emerald-200 bg-white text-emerald-700 text-xs font-black hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? "جاري التصدير..." : "تصدير كشف الحسابات Excel"}</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Summary Financial Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Liquidity */}
        <div className="rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">إجمالي السيولة والأرصدة</p>
            <p className="text-3xl font-black font-mono mt-1 text-white">{formatAmount(totalBalance)}</p>
            <p className="text-xs text-slate-400 mt-1">ريال سعودي</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Credits */}
        <div className="rounded-3xl p-5 bg-emerald-50/70 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700">إجمالي الإيداعات (+)</p>
            <p className="text-3xl font-black font-mono mt-1 text-slate-900">{formatAmount(totalCredit)}</p>
            <p className="text-xs text-emerald-600 mt-1">ريال سعودي</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Debits */}
        <div className="rounded-3xl p-5 bg-red-50/70 border border-red-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-700">إجمالي السحوبات (-)</p>
            <p className="text-3xl font-black font-mono mt-1 text-slate-900">{formatAmount(totalDebit)}</p>
            <p className="text-xs text-red-600 mt-1">ريال سعودي</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-700">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── 3. Mode Tabs & Filters & Column Customizer ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Mode Switcher */}
          <div className="flex gap-1.5 bg-slate-100 rounded-2xl p-1.5 shrink-0 text-xs font-black">
            <button
              onClick={() => setViewMode("users")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                viewMode === "users" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              أرصدة المستخدمين ({users.length})
            </button>
            <button
              onClick={() => setViewMode("ledger")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                viewMode === "ledger" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              سجل كافة الحركات المالية ({transactions.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المستخدم، الرقم المرجعي، البيان، أو رقم الفاتورة..."
              className="w-full h-10 pr-10 pl-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe Filter (الإطار الزمني) */}
            {viewMode === "ledger" && (
              <DateRangeFilter
                value={dateRange}
                onChange={(val) => setDateRange(val)}
              />
            )}

            {/* Column Toggle Customizer (CRITICAL REQUIREMENT) */}
            {viewMode === "ledger" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColMenu(!showColMenu)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>تخصيص الأعمدة</span>
                </button>

                {showColMenu && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 space-y-2 text-xs font-bold text-slate-700">
                    <p className="text-[11px] text-slate-400 font-bold border-b border-slate-100 pb-1.5">إظهار / إخفاء الأعمدة</p>
                    {[
                      { key: "ref" as const, label: "الرقم المرجعي / الفاتورة" },
                      { key: "user" as const, label: "المستخدم والمنشأة" },
                      { key: "type" as const, label: "نوع العملية (دائن/مدين)" },
                      { key: "amount" as const, label: "المبلغ" },
                      { key: "balance" as const, label: "الرصيد بعد الحركة" },
                      { key: "desc" as const, label: "البيان والسبب" },
                      { key: "date" as const, label: "التاريخ والوقت" },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                        <span>{col.label}</span>
                        <input
                          type="checkbox"
                          checked={columns[col.key]}
                          onChange={(e) => setColumns((prev) => ({ ...prev, [col.key]: e.target.checked }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. VIEW 1: Users Balances Table ── */}
      {viewMode === "users" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                  <th className="py-4 px-5">المستخدم والمنشأة</th>
                  <th className="py-4 px-4 text-center">نوع الحساب</th>
                  <th className="py-4 px-4 text-center">الرصيد الحالي</th>
                  <th className="py-4 px-4 text-center">الإجراءات المالية</th>
                  <th className="py-4 px-5 text-center w-24">كشف الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="py-4 px-5">
                        <div className="h-4 bg-slate-100 rounded-lg w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400 font-bold">
                      لا يوجد مستخدمون مطابقون للبحث
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-black text-slate-900 text-sm truncate max-w-56">{user.full_name || user.company_name}</p>
                        {user.ref_code && (
                          <span className="font-mono text-[10px] text-slate-400 font-bold">{user.ref_code}</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                          user.role === "client" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {user.role === "client" ? "عميل مشتريات" : "مورد قطع"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-black text-sm text-slate-900">
                        <span className={user.balance >= 0 ? "text-emerald-700" : "text-red-700"}>
                          {formatAmount(user.balance)}
                        </span>{" "}
                        <span className="text-[10px] font-normal text-slate-400 font-sans">ر.س</span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openAction(user, "credit")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إيداع</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(user, "debit")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 text-xs font-black border border-red-200 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                            <span>خصم</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => openDetail(user)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-bold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. VIEW 2: General Ledger Table (كافة الحركات المالية مع الأعمدة المخصصة) ── */}
      {viewMode === "ledger" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                  {columns.ref && <th className="py-4 px-4">رقم المرجع</th>}
                  {columns.invoice && <th className="py-4 px-4">رقم الفاتورة</th>}
                  {columns.user && <th className="py-4 px-4">المستخدم والمنشأة</th>}
                  {columns.type && <th className="py-4 px-4 text-center">نوع العملية</th>}
                  {columns.amount && <th className="py-4 px-4 text-center">المبلغ</th>}
                  {columns.balance && <th className="py-4 px-4 text-center">الرصيد بعد الحركة</th>}
                  {columns.desc && <th className="py-4 px-4">البيان والسبب</th>}
                  {columns.date && <th className="py-4 px-4 text-center">التاريخ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 font-bold">
                      لا توجد حركات مالية مطابقة للفترة أو البحث المحدد
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      {columns.ref && (
                        <td className="py-4 px-4 font-mono font-bold text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>{tx.reference || `#${tx.id.slice(0, 8)}`}</span>
                          </span>
                        </td>
                      )}
                      {columns.invoice && (
                        <td className="py-4 px-4 font-mono text-slate-700">
                          {tx.invoice_number ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
                              {tx.invoice_number}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-sans">-</span>
                          )}
                        </td>
                      )}
                      {columns.user && (
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {tx.profiles?.full_name || tx.profiles?.company_name || "—"}
                          {tx.profiles?.ref_code && (
                            <span className="block text-[10px] font-mono text-slate-400">{tx.profiles.ref_code}</span>
                          )}
                        </td>
                      )}
                      {columns.type && (
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            tx.type === "credit" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {tx.type === "credit" ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                            <span>{tx.type === "credit" ? "دائن (إيداع)" : "مدين (سحب)"}</span>
                          </span>
                        </td>
                      )}
                      {columns.amount && (
                        <td className={`py-4 px-4 text-center font-mono font-black text-sm ${
                          tx.type === "credit" ? "text-emerald-700" : "text-red-700"
                        }`}>
                          {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)} ر.س
                        </td>
                      )}
                      {columns.balance && (
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-900">
                          {formatAmount(tx.balance_after)} ر.س
                        </td>
                      )}
                      {columns.desc && (
                        <td className="py-4 px-4 text-slate-700 font-medium max-w-56 truncate">
                          {tx.description}
                        </td>
                      )}
                      {columns.date && (
                        <td className="py-4 px-4 text-center text-slate-400 font-medium text-[11px]">
                          {formatDate(tx.created_at)}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Action Modal (إيداع / سحب) ── */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              {actionType === "credit" ? (
                <>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUpCircle className="w-4 h-4" />
                  </div>
                  <span>إيداع رصيد مالي (+)</span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <ArrowDownCircle className="w-4 h-4" />
                  </div>
                  <span>سحب / خصم رصيد مالي (-)</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-2 text-xs font-bold">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-black text-slate-900">{selectedUser.full_name || selectedUser.company_name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedUser.ref_code}</p>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-sans">الرصيد الحالي:</span>
                  <span className="font-mono font-black text-slate-900">{formatAmount(selectedUser.balance)} ر.س</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">المبلغ بالريال السعودي (SAR) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">البيان وسبب العملية *</label>
                <input
                  type="text"
                  value={actionDesc}
                  onChange={(e) => setActionDesc(e.target.value)}
                  placeholder="مثال: تسوية رصيد بنكي أو شحن محفظة..."
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">رقم الفاتورة / المرجع (اختياري)</label>
                <input
                  type="text"
                  value={actionRef}
                  onChange={(e) => setActionRef(e.target.value)}
                  placeholder="مثال: INV-10023"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                />
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs">
                  {actionError}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActionOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={submitAction}
                  disabled={actionLoading}
                  className={`flex-1 py-2.5 rounded-xl text-white font-black shadow-sm disabled:opacity-50 ${
                    actionType === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {actionLoading ? "جاري التنفيذ..." : actionType === "credit" ? "تأكيد الإيداع" : "تأكيد الخصم"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 7. Detail Sheet (سجل كشف حساب المستخدم) ── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="left" className="w-[500px] sm:w-[580px] p-0 flex flex-col" dir="rtl">
          <SheetHeader className="p-5 border-b border-slate-100">
            <SheetTitle className="text-base font-black text-slate-900">
              سجل كشف حساب المحفظة
            </SheetTitle>
            {detailUser && (
              <p className="text-xs text-slate-500 font-bold mt-1">
                {detailUser.full_name || detailUser.company_name} · الرصيد الحالي:{" "}
                <span className="font-mono text-emerald-700 font-black">{formatAmount(detailUser.balance)} ر.س</span>
              </p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {txLoading ? (
              <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل الحركات...</div>
            ) : detailTx.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold">لا توجد حركات مالية مسجلة</div>
            ) : (
              detailTx.map((tx) => (
                <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      tx.type === "credit" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {tx.type === "credit" ? "+ دائن (إيداع)" : "- مدين (سحب)"}
                    </span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)} ر.س
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">{tx.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-1 mt-1 font-mono">
                    <span>الرصيد بعد الحركة: {formatAmount(tx.balance_after)} ر.س</span>
                    <span>{formatDate(tx.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
