"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search, RefreshCw, FileText, Download, Clock,
  CheckCircle2, AlertTriangle, XCircle, Eye, Calendar,
  ChevronRight, Car
} from "lucide-react";
import Link from "next/link";

const supabase = createClient();

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "مفتوح للتسعير", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  quoted: { label: "تم تقديم عروض", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  accepted: { label: "تم القبول", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  closed: { label: "مغلق / منتهي", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

interface RFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number?: string;
  parts_description: string;
  status: string;
  created_at: string;
  expires_at?: string;
  expiry_hours?: number;
  client: { full_name: string; company_name?: string; ref_code: string; phone?: string } | null;
  quotes: Array<{ count: number }> | any[];
}

function formatRemainingTime(expiresAtStr?: string, createdAtStr?: string, hours = 48) {
  const expiryDate = expiresAtStr
    ? new Date(expiresAtStr)
    : new Date(new Date(createdAtStr || Date.now()).getTime() + hours * 3600 * 1000);

  const diffMs = expiryDate.getTime() - Date.now();
  if (diffMs <= 0) {
    return { isExpired: true, text: "انتهت المهلة (منتهي)" };
  }

  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const minsRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursRemaining > 24) {
    const days = Math.floor(hoursRemaining / 24);
    const remH = hoursRemaining % 24;
    return { isExpired: false, text: `${days} يوم و ${remH} ساعة متبقية` };
  }

  return { isExpired: false, text: `${hoursRemaining} س ${minsRemaining} د متبقية` };
}

export default function AdminRFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rfqs")
      .select(`
        id, car_make, car_model, car_year, plate_number, parts_description, status, created_at, expires_at, expiry_hours,
        client:profiles!rfqs_client_id_fkey(full_name, company_name, ref_code, phone),
        quotes(id, total_price, delivery_days, status, vendor:profiles(company_name, full_name, ref_code))
      `)
      .order("created_at", { ascending: false });

    const rfqsList = (data as RFQ[]) || [];

    // Check and auto-mark expired RFQs on the client
    rfqsList.forEach(async (r) => {
      const { isExpired } = formatRemainingTime(r.expires_at, r.created_at, r.expiry_hours || 48);
      if (isExpired && (r.status === "open" || r.status === "quoted")) {
        try {
          await supabase.from("rfqs").update({ status: "closed" }).eq("id", r.id);
        } catch {}
      }
    });

    setRfqs(rfqsList);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rfqs.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    if (!matchStatus) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [
      r.id,
      r.car_make,
      r.car_model,
      r.plate_number,
      r.client?.full_name,
      r.client?.company_name,
      r.client?.ref_code,
      r.client?.phone,
    ].some((v) => v && String(v).toLowerCase().includes(q));
  });

  const exportCSV = () => {
    const rows = filtered.map((r) => {
      const partsCount = r.parts_description?.split("\n").filter(Boolean).length || 1;
      const quotesCount = Array.isArray(r.quotes) ? r.quotes.length : 0;
      const { text: remainingText } = formatRemainingTime(r.expires_at, r.created_at, r.expiry_hours || 48);

      return [
        `#${r.id.slice(0, 8).toUpperCase()}`,
        r.client?.ref_code || "",
        r.client?.full_name || "",
        r.client?.phone || "",
        `${r.car_make} ${r.car_model} ${r.car_year}`,
        r.plate_number || "",
        partsCount,
        quotesCount,
        STATUS[r.status]?.label || r.status,
        remainingText,
        new Date(r.created_at).toLocaleDateString("ar-SA"),
      ];
    });

    const header = ["رقم RFQ", "كود العميل", "العميل", "جوال العميل", "السيارة", "رقم اللوحة", "عدد القطع", "عدد العروض", "الحالة", "الوقت المتبقي", "تاريخ الإنشاء"];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })),
      download: `rfqs_export_${Date.now()}.csv`,
    });
    a.click();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">طلبات التسعير (RFQs)</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            مراقبة مدة صلاحية طلبات التسعير، الوقت المتبقي، وإغلاق الطلبات المنتهية تلقائياً
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-emerald-200 bg-white text-emerald-700 text-xs font-black hover:bg-emerald-50 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Filter Pills & Search ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالسيارة، اسم العميل، رقم الجوال، أو كود RFQ..."
            className="w-full h-11 pr-10 pl-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex gap-1.5 bg-slate-100 rounded-2xl p-1.5 shrink-0 text-xs font-bold">
          {[["all", "الكل"], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === k ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. RFQs Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-4">رقم الطلب</th>
                <th className="py-4 px-4">العميل</th>
                <th className="py-4 px-4">المركبة المطلوبة</th>
                <th className="py-4 px-4 text-center">عدد العروض</th>
                <th className="py-4 px-4 text-center">الوقت المتبقي / الصلاحية</th>
                <th className="py-4 px-4 text-center">الحالة</th>
                <th className="py-4 px-4 text-center">تاريخ الإنشاء</th>
                <th className="py-4 px-5 text-center w-24">معاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-5">
                      <div className="h-4 bg-slate-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-bold">
                    <FileText className="w-10 h-10 mb-2 text-slate-200 mx-auto" />
                    لا توجد طلبات تسعير مطابقة
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const st = STATUS[r.status] || { label: r.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
                  const quotesCount = Array.isArray(r.quotes) ? r.quotes.length : 0;
                  const { isExpired, text: countdownText } = formatRemainingTime(
                    r.expires_at,
                    r.created_at,
                    r.expiry_hours || 48
                  );

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* ID */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs font-black text-slate-900 block">
                          #{r.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-4 px-4">
                        <p className="font-black text-slate-900 text-sm truncate max-w-44">
                          {r.client?.full_name || r.client?.company_name || "—"}
                        </p>
                        {r.client?.ref_code && (
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            {r.client.ref_code}
                          </span>
                        )}
                      </td>

                      {/* Vehicle */}
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-800 text-xs">{r.car_make} {r.car_model} {r.car_year}</p>
                        {r.plate_number && (
                          <p className="text-[10px] font-mono text-slate-400">{r.plate_number}</p>
                        )}
                      </td>

                      {/* Quotes Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-black border border-purple-200">
                          {quotesCount} {quotesCount === 1 ? "عرض" : "عروض"}
                        </span>
                      </td>

                      {/* Remaining Time Countdown Badge (CRITICAL REQUIREMENT) */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black border ${
                            isExpired
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{countdownText}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-center text-slate-400 font-medium text-[11px]">
                        {new Date(r.created_at).toLocaleDateString("ar-SA")}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-center">
                        <Link
                          href={`/client/rfq/${r.id}`}
                          target="_blank"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-bold inline-flex items-center gap-1"
                        >
                          <span>عرض</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
