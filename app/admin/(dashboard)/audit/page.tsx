"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search, RefreshCw, ScrollText, Download, Filter,
  ShieldCheck, AlertTriangle, Info, Clock, ShoppingBag,
  FileText, ClipboardList, Wallet, Users, Truck,
  ChevronDown, ChevronRight, Eye, Sparkles, X, Check,
  Activity, Layers, ArrowLeft, ArrowUpRight, Copy, Terminal
} from "lucide-react";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  action: string;
  action_label: string;
  entity_type: "order" | "rfq" | "quote" | "invoice" | "wallet" | "user" | "delivery" | "support" | "system";
  entity_type_label: string;
  entity_id: string | null;
  actor_name: string;
  actor_company?: string;
  actor_role: string;
  actor_ref_code?: string;
  details: string;
  old_values?: any;
  new_values?: any;
  severity: "info" | "warning" | "critical";
  created_at: string;
  source: string;
}

const ENTITY_CONFIG: Record<string, { label: string; icon: any; badge: string }> = {
  all: { label: "كافة العمليات", icon: Activity, badge: "bg-slate-100 text-slate-800" },
  order: { label: "الطلبات والصفقات", icon: ShoppingBag, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rfq: { label: "مناقصات التسعير", icon: FileText, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  invoice: { label: "الفواتير الضريبية", icon: ClipboardList, badge: "bg-violet-50 text-violet-700 border-violet-200" },
  wallet: { label: "المحافظ المالية", icon: Wallet, badge: "bg-blue-50 text-blue-700 border-blue-200" },
  user: { label: "المستخدمين والعضويات", icon: Users, badge: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  delivery: { label: "أسطول التوصيل", icon: Truck, badge: "bg-teal-50 text-teal-700 border-teal-200" },
  system: { label: "النظام والأمان", icon: ShieldCheck, badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);

  // Inspection Drawer/Dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [stats, setStats] = useState({
    totalLogs: 0,
    ordersCount: 0,
    rfqsCount: 0,
    invoicesCount: 0,
    walletCount: 0,
    securityCount: 0,
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/v1/admin/audit?limit=300`;
      if (entityFilter !== "all") url += `&entityType=${entityFilter}`;
      if (severityFilter !== "all") url += `&severity=${severityFilter}`;
      if (dateRange?.startDate) url += `&dateFrom=${dateRange.startDate}`;
      if (dateRange?.endDate) url += `&dateTo=${dateRange.endDate}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, severityFilter, dateRange]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Client-side text search
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => {
      return (
        l.action?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.actor_name?.toLowerCase().includes(q) ||
        l.actor_ref_code?.toLowerCase().includes(q) ||
        l.entity_id?.toLowerCase().includes(q) ||
        l.entity_type_label?.toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  const exportCSV = () => {
    const rows = filteredLogs.map((l) => [
      l.id.slice(0, 8),
      l.entity_type_label,
      l.action,
      l.actor_name,
      l.actor_ref_code || "—",
      l.actor_role === "client" ? "عميل" : l.actor_role === "vendor" ? "مورد" : l.actor_role === "courier" ? "مندوب" : "إداري",
      l.details,
      l.entity_id ? `#${l.entity_id.slice(0, 8)}` : "—",
      new Date(l.created_at).toLocaleString("ar-SA"),
    ]);

    const header = ["المعرف", "القسم / الكيان", "نوع الإجراء", "المنفذ / المستخدم", "كود الحساب", "نوع العضوية", "تفاصيل العملية", "معرف السجل", "التاريخ والوقت"];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* ── 1. Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>سجل الرقابة والتدقيق الأمني الشامل (Enterprise Audit Trail)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">سجل النشاط والعمليات الموحد</h1>
          <p className="text-slate-300 text-xs sm:text-sm font-bold max-w-2xl leading-relaxed">
            تتبع وتسجيل فوري غير قابل للتعديل لكافة العمليات التي تجري في جميع لوحات النظام: أوامر الشراء، التسعيرات، الفواتير، المحافظ المالية، وإجراءات المستخدمين.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير السجل (CSV/Excel)</span>
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Quick KPI Counters ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "كافة العمليات", count: stats.totalLogs, color: "text-slate-900", bg: "bg-white", border: "border-slate-200" },
          { label: "حركات الطلبات", count: stats.ordersCount, color: "text-emerald-700", bg: "bg-emerald-50/50", border: "border-emerald-200/60" },
          { label: "مناقصات RFQ", count: stats.rfqsCount, color: "text-amber-700", bg: "bg-amber-50/50", border: "border-amber-200/60" },
          { label: "الفواتير الضريبية", count: stats.invoicesCount, color: "text-violet-700", bg: "bg-violet-50/50", border: "border-violet-200/60" },
          { label: "حركات المحافظ", count: stats.walletCount, color: "text-blue-700", bg: "bg-blue-50/50", border: "border-blue-200/60" },
          { label: "الأمان والرقابة", count: stats.securityCount, color: "text-rose-700", bg: "bg-rose-50/50", border: "border-rose-200/60" },
        ].map((item, idx) => (
          <div key={idx} className={`${item.bg} rounded-2xl border ${item.border} p-3.5 shadow-xs text-right`}>
            <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
            <p className={`text-xl font-black ${item.color} mt-1 font-mono`}>
              {loading ? "..." : item.count.toLocaleString("ar-SA")}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3. Smart Search & Filters Bar ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالإجراء، اسم المستخدم، كود الحساب (CUST / SUP)، أو رقم المرجع..."
              className="w-full h-11 pr-10 pl-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe Filter */}
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">كافة مستويات الأهمية</option>
              <option value="info">عادي (Info)</option>
              <option value="warning">تنبيه (Warning)</option>
              <option value="critical">هام / حرج (Critical)</option>
            </select>
          </div>
        </div>

        {/* Entity Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {Object.entries(ENTITY_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = entityFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEntityFilter(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Audit Log Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-4 w-32">القسم / الكيان</th>
                <th className="py-4 px-4">الإجراء والعملية</th>
                <th className="py-4 px-4">المستخدم والمنشأة</th>
                <th className="py-4 px-4">تفاصيل الحركة</th>
                <th className="py-4 px-4 text-center">التاريخ والوقت</th>
                <th className="py-4 px-4 text-center w-24">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-4 bg-slate-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-bold">
                    لا توجد عمليات مسجلة مطابقة للبحث أو الفلتر المحدد
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const cfg = ENTITY_CONFIG[log.entity_type] || ENTITY_CONFIG.system;
                  const Icon = cfg.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Entity Type Badge */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${cfg.badge}`}>
                          <Icon className="w-3 h-3" />
                          <span>{log.entity_type_label}</span>
                        </span>
                      </td>

                      {/* Action Title */}
                      <td className="py-4 px-4">
                        <p className="font-black text-slate-900 text-xs">{log.action}</p>
                        {log.entity_id && (
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            مرجع #{log.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs">{log.actor_name || "النظام"}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            {log.actor_ref_code && (
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded font-bold text-slate-600">
                                {log.actor_ref_code}
                              </span>
                            )}
                            <span className="capitalize">{log.actor_role}</span>
                          </div>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">{log.details}</p>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-center text-[11px] text-slate-500 font-mono">
                        <span className="block font-bold text-slate-700">
                          {new Date(log.created_at).toLocaleDateString("ar-SA")}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Inspection Modal / Payload Viewer ── */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 text-right max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-600" />
                  <span>تفاصيل سجل الحركة: {selectedLog.action}</span>
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">القسم:</span>
                  <span className="font-black text-slate-900">{selectedLog.entity_type_label}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">المنفذ:</span>
                  <span className="font-black text-slate-900">{selectedLog.actor_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">كود الحساب:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedLog.actor_ref_code || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">معرف السجل:</span>
                  <span className="font-mono font-bold text-slate-700">{selectedLog.entity_id || "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block font-normal">التاريخ والوقت الدقيق:</span>
                  <span className="font-mono text-slate-800">{new Date(selectedLog.created_at).toLocaleString("ar-SA")}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-900 mb-1.5">بيان وتفاصيل العملية:</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-normal">
                  {selectedLog.details}
                </div>
              </div>

              {selectedLog.new_values && (
                <div>
                  <p className="text-xs font-black text-slate-900 mb-1.5">البيانات المسجلة (Payload):</p>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed text-left" dir="ltr">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
