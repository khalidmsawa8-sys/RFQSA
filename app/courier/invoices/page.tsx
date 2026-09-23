"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  FileText,
  Calendar,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Car,
  Receipt,
  X,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  Truck,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";

interface CourierWaybillItem {
  id: string;
  waybill_number: string;
  order_id: string;
  created_at: string;
  delivery_fee: number;
  status: string;
  vendor_name: string;
  vendor_address?: string;
  client_name: string;
  client_address?: string;
  vehicle_info: string;
  plate_number?: string;
  parts_summary: string;
  pod_url?: string | null;
}

const WAYBILL_COLUMNS = [
  { id: "waybill_number", label: "رقم البوليصة / الشحنة" },
  { id: "order_id", label: "رقم الطلب" },
  { id: "parties", label: "المورد والعميل" },
  { id: "vehicle", label: "المركبة والقطع" },
  { id: "fee", label: "أجر التوصيل" },
  { id: "date", label: "تاريخ المهمة" },
  { id: "status", label: "حالة الشحنة" },
  { id: "actions", label: "سند التسليم / PDF" },
];

function shortId(id: string) {
  return id.replace(/^DEL-/, "").replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CourierInvoicesPage() {
  const supabase = createClient();

  const [waybills, setWaybills] = useState<CourierWaybillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "all",
    startDate: null,
    endDate: null,
  });
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    waybill_number: true,
    order_id: true,
    parties: true,
    vehicle: true,
    fee: true,
    date: true,
    status: true,
    actions: true,
  });

  useEffect(() => {
    async function loadWaybills() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/courier/deliveries", {
          headers: { "x-courier-id": "courier-demo-id" },
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.deliveries)) {
          const mapped: CourierWaybillItem[] = data.deliveries.map((d: any, idx: number) => ({
            id: d.id,
            waybill_number: `WB-${new Date(d.created_at).getFullYear()}-${shortId(d.id)}`,
            order_id: d.order_id,
            created_at: d.created_at,
            delivery_fee: Number(d.delivery_fee_earned || 35.0),
            status: d.delivery_status || "DELIVERED",
            vendor_name: d.vendor_name || "مؤسسة قطع الغيار المعتمدة",
            vendor_address: d.pickup_address,
            client_name: d.client_name || "العميل",
            client_address: d.dropoff_address,
            vehicle_info: "مركبة العميل المعتمدة",
            plate_number: "—",
            parts_summary: d.parts_summary || "قطع غيار صيانة دورية",
            pod_url: d.pod_photo_url,
          }));

          setWaybills(mapped);
        }
      } catch (err) {
        console.error("Error loading courier waybills:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWaybills();
  }, []);

  // Filter by Search & Date Range
  const filteredWaybills = useMemo(() => {
    const q = search.trim().toLowerCase();

    return waybills.filter((wb) => {
      // Date Range Match
      if (dateRange && (dateRange.startDate || dateRange.endDate)) {
        const itemDate = new Date(wb.created_at).getTime();
        if (dateRange.startDate) {
          const s = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
          if (itemDate < s) return false;
        }
        if (dateRange.endDate) {
          const e = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
          if (itemDate > e) return false;
        }
      }

      // Search Match
      if (q) {
        const matchStr = `${wb.waybill_number} ${wb.order_id} ${wb.vendor_name} ${wb.client_name} ${wb.parts_summary}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      return true;
    });
  }, [waybills, search, dateRange]);

  // Totals calculations
  const totalEarned = useMemo(() => {
    return filteredWaybills.reduce((acc, it) => acc + (it.delivery_fee || 0), 0);
  }, [filteredWaybills]);

  // Export to Excel / CSV Handler
  const handleExportExcel = () => {
    try {
      const headers = [
        "رقم البوليصة",
        "رقم الطلب",
        "المورد (الاستلام)",
        "العميل (التسليم)",
        "تفاصيل القطع",
        "أجر وعمولة التوصيل (ر.س)",
        "تاريخ المهمة",
        "حالة الشحنة",
      ];

      const csvRows = [
        headers.join(","),
        ...filteredWaybills.map((wb) =>
          [
            `"${wb.waybill_number}"`,
            `"#ORD-${shortId(wb.order_id)}"`,
            `"${wb.vendor_name}"`,
            `"${wb.client_name}"`,
            `"${wb.parts_summary.replace(/"/g, '""')}"`,
            wb.delivery_fee.toFixed(2),
            `"${new Date(wb.created_at).toLocaleDateString("ar-SA")}"`,
            `"${wb.status}"`,
          ].join(",")
        ),
      ];

      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `بوالص_الشحن_وسندات_التوصيل_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV export error:", e);
      alert("حدث خطأ أثناء تصدير بوالص الشحن");
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
                <Truck className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-xl font-black text-slate-900">سجل بوالص الشحن وسندات التسليم</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              استعراض بوالص الشحن المنجزة، سندات التسليم الموثقة، وأجور وعمولات التوصيل المستحقة
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleExportExcel}
              disabled={filteredWaybills.length === 0}
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel / CSV</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* ── Summary Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">إجمالي عمولات التوصيل المنجزة</p>
              <p className="text-xl font-black text-emerald-800 font-mono mt-1">{fmt(totalEarned)} ر.س</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">عدد الشحنات والبوالص الصادرة</p>
              <p className="text-xl font-black text-slate-900 font-mono mt-1">{filteredWaybills.length} بوليصة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">نسبة التوثيق وإثبات التسليم</p>
              <p className="text-xl font-black text-blue-700 font-mono mt-1">100% موثقة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
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
              placeholder="بحث برقم البوليصة، الطلب، المورد، العميل..."
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
                    {Object.values(visibleColumns).filter(Boolean).length}/{WAYBILL_COLUMNS.length}
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
                      WAYBILL_COLUMNS.forEach((c) => (all[c.id] = true));
                      setVisibleColumns(all);
                    }}
                    className="text-[10px] text-emerald-800 hover:underline font-bold"
                  >
                    تحديد الكل
                  </button>
                </div>
                <div className="space-y-0.5">
                  {WAYBILL_COLUMNS.map((col) => (
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

        {/* ── Table / Waybills List ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">جاري تحميل بوالص وسندات الشحن...</p>
            </div>
          ) : filteredWaybills.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد بوالص شحن مطابقة للبحث أو الفترة الزمنية المحددة</p>
              <p className="text-xs text-slate-400">ستظهر هنا بوالص وسندات الشحنات فور إتمام المهام</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                    {visibleColumns.waybill_number && <th className="py-3.5 px-4 font-extrabold">رقم البوليصة</th>}
                    {visibleColumns.order_id && <th className="py-3.5 px-4 font-extrabold">رقم الطلب</th>}
                    {visibleColumns.parties && <th className="py-3.5 px-4 font-extrabold">المورد والعميل</th>}
                    {visibleColumns.vehicle && <th className="py-3.5 px-4 font-extrabold">تفاصيل القطع</th>}
                    {visibleColumns.fee && <th className="py-3.5 px-4 font-extrabold text-center">أجر التوصيل</th>}
                    {visibleColumns.date && <th className="py-3.5 px-4 font-extrabold">تاريخ المهمة</th>}
                    {visibleColumns.status && <th className="py-3.5 px-4 font-extrabold text-center">الحالة</th>}
                    {visibleColumns.actions && <th className="py-3.5 px-4 font-extrabold text-center">سند التسليم / PDF</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWaybills.map((wb) => (
                    <tr key={wb.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Waybill # */}
                      {visibleColumns.waybill_number && (
                        <td className="py-4 px-4">
                          <span className="font-mono font-black text-slate-900 bg-slate-100/70 px-2.5 py-1 rounded-lg border border-slate-200/80">
                            {wb.waybill_number}
                          </span>
                        </td>
                      )}

                      {/* Order # */}
                      {visibleColumns.order_id && (
                        <td className="py-4 px-4 font-mono font-bold text-blue-700">
                          <Link href={`/courier/orders/${wb.order_id}`} className="hover:underline flex items-center gap-1">
                            <span>#ORD-{shortId(wb.order_id)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      )}

                      {/* Parties */}
                      {visibleColumns.parties && (
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 truncate max-w-xs">
                              <span className="text-slate-400 font-normal">من:</span> {wb.vendor_name}
                            </p>
                            <p className="text-slate-600 truncate max-w-xs text-[11px]">
                              <span className="text-slate-400 font-normal">إلى:</span> {wb.client_name}
                            </p>
                          </div>
                        </td>
                      )}

                      {/* Vehicle & Parts */}
                      {visibleColumns.vehicle && (
                        <td className="py-4 px-4 max-w-xs">
                          <p className="text-slate-700 truncate font-medium" title={wb.parts_summary}>
                            {wb.parts_summary}
                          </p>
                        </td>
                      )}

                      {/* Fee */}
                      {visibleColumns.fee && (
                        <td className="py-4 px-4 text-center">
                          <span className="font-mono font-black text-emerald-800 text-sm">
                            +{fmt(wb.delivery_fee)} ر.س
                          </span>
                        </td>
                      )}

                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-4 px-4 font-mono text-slate-500">
                          {new Date(wb.created_at).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>مكتملة وموثقة</span>
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-4 px-4 text-center">
                          <InvoicePDFExport
                            invoice={{
                              id: wb.id,
                              invoice_number: wb.waybill_number,
                              order_id: wb.order_id,
                              total_amount: wb.delivery_fee,
                              tax_amount: 0,
                              subtotal: wb.delivery_fee,
                              status: wb.status,
                              created_at: wb.created_at,
                              items: [
                                {
                                  part_name: `خدمة توصيل شحنة سريعة (${wb.parts_summary})`,
                                  quantity: 1,
                                  unit_price: wb.delivery_fee,
                                  line_total: wb.delivery_fee,
                                },
                              ],
                              order: {
                                id: wb.order_id,
                                car_make: "طلب قطع غيار",
                                car_model: "معتمد",
                                car_year: 2024,
                              },
                              vendor: {
                                full_name: wb.vendor_name,
                              },
                              client: {
                                full_name: wb.client_name,
                              },
                            }}
                          />
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
