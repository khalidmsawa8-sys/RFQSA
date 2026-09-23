"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  RefreshCw,
} from "lucide-react";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";
import { normalizeInvoiceNumber } from "@/lib/invoice-canonical";

interface VendorInvoiceItem {
  id: string;
  invoice_number: string;
  order_id: string;
  created_at: string;
  total_amount: number;
  tax_amount: number;
  subtotal: number;
  status: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number | string;
  plate_number?: string;
  vin?: string;
  parts_summary: string;
  parts_items?: Array<{ name: string; qty: number; partNumber?: string; unit_price?: number; line_total?: number }>;
  invoice_items: Array<{
    id: string;
    part_name: string;
    part_number: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  client_name: string;
  client_phone?: string;
  client_profile?: any;
  vendor_profile?: any;
  deal_id: string;
  raw_deal: any;
}

const INVOICE_COLUMNS = [
  { id: "invoice_number", label: "رقم الفاتورة" },
  { id: "order_id", label: "رقم الطلب" },
  { id: "vehicle", label: "بيانات المركبة" },
  { id: "total", label: "الإجمالي شامل الضريبة" },
  { id: "date", label: "التاريخ" },
  { id: "details", label: "تفاصيل الطلب" },
  { id: "status", label: "الحالة" },
  { id: "actions", label: "الإجراءات" },
];

function shortId(id: string) {
  return id.replace(/^INV-/, "").replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`;
}

export default function VendorInvoicesPage() {
  const supabase = createClient();

  const [invoices, setInvoices] = useState<VendorInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoiceItem | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "all",
    startDate: null,
    endDate: null,
  });
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    invoice_number: true,
    order_id: true,
    vehicle: true,
    total: true,
    date: true,
    details: true,
    status: true,
    actions: true,
  });

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const vendorId = user?.id || "vendor-demo-id";

      // 1. Fetch Vendor's Profile
      const { data: vendorProfile } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, phone, tax_number, commercial_register, national_address")
        .eq("id", vendorId)
        .maybeSingle();

      const combinedOrders: any[] = [];
      const seenIds = new Set<string>();

      // 2. Fetch authoritative live orders from server API first
      try {
        const res = await fetch("/api/v1/orders", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            data.orders.forEach((o: any) => {
              if (o && o.id && !seenIds.has(o.id)) {
                seenIds.add(o.id);
                combinedOrders.push(o);
              }
            });
          }
        }
      } catch (e) {}

      // 3. Try fetching from Supabase / localStorage orders
      try {
        const { data: ordersData } = await supabase
          .from("orders")
          .select(`*`)
          .order("created_at", { ascending: false });

        if (ordersData && Array.isArray(ordersData)) {
          ordersData.forEach((o: any) => {
            if (o && o.id && !seenIds.has(o.id)) {
              seenIds.add(o.id);
              combinedOrders.push(o);
            }
          });
        }
      } catch (e) {}

      // 4. Try fetching from invoices table
      try {
        const { data: invoicesData } = await supabase.from("invoices").select("*");
        if (invoicesData && Array.isArray(invoicesData)) {
          invoicesData.forEach((inv: any) => {
            const cleanId = String(inv.id).replace(/^INV-/, "ORD-");
            if (inv && !seenIds.has(inv.id) && !seenIds.has(cleanId)) {
              seenIds.add(inv.id);
              combinedOrders.push(inv);
            }
          });
        }
      } catch (e) {}

      // Filter for this vendor (allow all if vendor-demo-id)
      const filteredRaw = combinedOrders.filter((ord: any) => {
        if (!ord) return false;
        if (!ord.vendor_id || ord.vendor_id === "vendor-demo-id" || vendorId === "vendor-demo-id") return true;
        return ord.vendor_id === vendorId || ord.deals?.some((d: any) => d.vendor_id === vendorId);
      });

      // Sort newest first
      filteredRaw.sort((a, b) => {
        const tA = new Date(a.created_at || a.issued_at || 0).getTime();
        const tB = new Date(b.created_at || b.issued_at || 0).getTime();
        return tB - tA;
      });

      // Map into VendorInvoiceItem
      const mapped: VendorInvoiceItem[] = filteredRaw.map((ord: any, idx: number) => {
        const rfq = ord.rfqs || ord.rfq;
        const client = ord.client || ord.profiles;
        const vendor = ord.vendor || vendorProfile || {
          company_name: "مؤسسة قطع الغيار المعتمدة",
          full_name: "مؤسسة قطع الغيار المعتمدة",
          phone: "0551122334",
          tax_number: "300987654300003",
          commercial_register: "1010887766",
          national_address: "الرياض - صناعية الشفاء - طريق خريص",
        };
        const total = Number(ord.total_amount || ord.total_price || 0);
        const tax = total * (15 / 115);
        const subtotal = total - tax;
        const rawOrderId = ord.order_id || ord.deal_order_id || ord.id || `ORD-${idx + 1}`;
        const cleanOrderId = String(rawOrderId).replace(/^ORD-/, "").slice(0, 8).toUpperCase();
        const invNum = normalizeInvoiceNumber(ord.invoice_number, rawOrderId);

        let partsText = "قطع غيار معتمدة";
        let partsItemsList: Array<{ name: string; qty: number; partNumber?: string; unit_price?: number; line_total?: number }> = [];

        if (Array.isArray(ord.items) && ord.items.length > 0) {
          partsItemsList = ord.items.map((p: any) => ({
            name: p.part_name || p.partName || p.name || "قطعة غيار معتمدة",
            qty: Number(p.quantity || 1),
            partNumber: p.part_number || p.partNumber,
            unit_price: Number(p.unit_price || p.price || 0),
            line_total: Number(p.line_total || (p.quantity || 1) * (p.unit_price || p.price || 0)),
          }));
          partsText = partsItemsList.map((p) => p.name).filter(Boolean).join("، ") || partsText;
        } else {
          try {
            const rawParts = ord.parts_description || rfq?.parts_description;
            const parsed = typeof rawParts === "string" ? JSON.parse(rawParts) : rawParts;
            if (Array.isArray(parsed) && parsed.length > 0) {
              partsItemsList = parsed.map((p: any) => ({
                name: p.partName || p.part_name || p.name || "قطعة غيار معتمدة",
                qty: Number(p.quantity || 1),
                partNumber: p.partNumber || p.part_number,
                unit_price: Number(p.unit_price || p.price || 0),
                line_total: Number(p.line_total || (p.quantity || 1) * (p.unit_price || p.price || 0)),
              }));
              partsText = partsItemsList.map((p) => p.name).filter(Boolean).join("، ") || partsText;
            }
          } catch (e) {}
        }

        if ((partsText === "قطع غيار معتمدة" || !partsText) && (rfq?.car_make || ord.car_make)) {
          const make = rfq?.car_make || ord.car_make;
          const model = rfq?.car_model || ord.car_model || "";
          partsText = `قطع غيار صيانة معتمدة لـ ${make} ${model}`.trim();
        }

        const clientName = client?.company_name || client?.full_name || "شركة المشتريات الوطنية (عميل المشتريات)";

        const invoiceItems = (ord.invoice_items && ord.invoice_items.length > 0)
          ? ord.invoice_items
          : (partsItemsList.length > 0
              ? partsItemsList.map((p, pIdx) => ({
                  id: `item-${pIdx}`,
                  part_name: p.name,
                  part_number: p.partNumber || "OEM-GENUINE",
                  quantity: p.qty,
                  unit_price: p.unit_price || Math.round(subtotal / (partsItemsList.length || 1)),
                  line_total: p.line_total || Math.round(subtotal / (partsItemsList.length || 1)) * p.qty,
                }))
              : [
                  {
                    id: "item-default",
                    part_name: partsText,
                    part_number: "OEM-GENUINE",
                    quantity: 1,
                    unit_price: subtotal,
                    line_total: subtotal,
                  },
                ]
            );

        return {
          id: ord.id || `inv-${idx + 1}`,
          invoice_number: invNum,
          order_id: cleanOrderId,
          created_at: ord.issued_at || ord.created_at || new Date(Date.now() - (idx * 24 + 12) * 3600 * 1000).toISOString(),
          total_amount: total,
          tax_amount: tax,
          subtotal: subtotal,
          status: ord.status === "cancelled" ? "cancelled" : "paid",
          vehicle_make: rfq?.car_make || ord.car_make || "تويوتا",
          vehicle_model: rfq?.car_model || ord.car_model || "كامري",
          vehicle_year: rfq?.car_year || ord.car_year || "2023",
          plate_number: rfq?.plate_number || ord.plate_number || "—",
          vin: rfq?.vin || ord.vin || "—",
          parts_summary: partsText,
          parts_items: partsItemsList,
          invoice_items: invoiceItems,
          client_name: clientName,
          client_phone: client?.phone,
          client_profile: client || {
            full_name: "شركة المشتريات الوطنية",
            company_name: "شركة المشتريات الوطنية",
            phone: "0501234567",
            tax_number: "300123456700003",
            commercial_register: "1010987654",
            national_address: "الرياض - طريق الملك فهد - حي العليا",
          },
          vendor_profile: vendor,
          deal_id: ord.deals?.[0]?.id || ord.deal_id || ord.id,
          raw_deal: ord,
        };
      });

      setInvoices(mapped);
    } catch (err) {
      console.error("Error loading vendor invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Filter by Search & Date Range
  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();

    return invoices.filter((inv) => {
      // Date Range Match
      if (dateRange && (dateRange.startDate || dateRange.endDate)) {
        const itemDate = new Date(inv.created_at).getTime();
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
        const matchStr = `${inv.invoice_number} ${inv.order_id} ${inv.vehicle_make} ${inv.vehicle_model} ${inv.plate_number} ${inv.parts_summary} ${inv.client_name}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      return true;
    });
  }, [invoices, search, dateRange]);

  // Totals calculations
  const totalSalesAmount = useMemo(() => {
    return filteredInvoices.reduce((acc, it) => acc + (it.total_amount || 0), 0);
  }, [filteredInvoices]);

  const totalVatAmount = useMemo(() => {
    return filteredInvoices.reduce((acc, it) => acc + (it.tax_amount || 0), 0);
  }, [filteredInvoices]);

  // Export to Excel / CSV Handler
  const handleExportExcel = () => {
    try {
      const headers = [
        "رقم الفاتورة",
        "رقم الطلب",
        "العميل",
        "ماركة المركبة",
        "موديل المركبة",
        "سنة الصنع",
        "رقم اللوحة",
        "رقم الهيكل",
        "تفاصيل البنود",
        "المبلغ قبل الضريبة (ر.س)",
        "ضريبة القيمة المضافة (15%)",
        "الإجمالي شامل الضريبة (ر.س)",
        "تاريخ الإصدار",
        "الحالة",
      ];

      const csvRows = [
        headers.join(","),
        ...filteredInvoices.map((inv) =>
          [
            `"${inv.invoice_number}"`,
            `"#ORD-${shortId(inv.order_id)}"`,
            `"${inv.client_name}"`,
            `"${inv.vehicle_make}"`,
            `"${inv.vehicle_model}"`,
            `"${inv.vehicle_year}"`,
            `"${inv.plate_number}"`,
            `"${inv.vin}"`,
            `"${inv.parts_summary.replace(/"/g, '""')}"`,
            inv.subtotal.toFixed(2),
            inv.tax_amount.toFixed(2),
            inv.total_amount.toFixed(2),
            `"${fmtDate(inv.created_at)}"`,
            `"${inv.status === "paid" ? "معتمدة" : inv.status}"`,
          ].join(",")
        ),
      ];

      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `فواتير_المبيعات_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV export error:", e);
      alert("حدث خطأ أثناء تصدير الفواتير");
    }
  };

  return (
    <div dir="rtl" className="space-y-6 pb-16 font-sans w-full">
      {/* ── Header ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-slate-900">سجل فواتير المبيعات الضريبية</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              استعراض وطباعة فواتير المبيعات المعتمدة وتصدير البيانات وفق معايير هيئة الزكاة والضريبة والجمارك (ZATCA)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadInvoices}
              disabled={loading}
              className="h-9 px-3.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>

            <Button
              onClick={handleExportExcel}
              disabled={filteredInvoices.length === 0}
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
              <p className="text-xs font-bold text-slate-400">إجمالي المبيعات المفوترة</p>
              <p className="text-xl font-black text-slate-900 font-mono mt-1">{fmt(totalSalesAmount)} ر.س</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">ضريبة القيمة المضافة (15%)</p>
              <p className="text-xl font-black text-amber-700 font-mono mt-1">{fmt(totalVatAmount)} ر.س</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">عدد الفواتير الصادرة</p>
              <p className="text-xl font-black text-emerald-800 font-mono mt-1">{filteredInvoices.length} فاتورة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ── Filters & Column Selector Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="بحث برقم الفاتورة، الطلب، العميل، المركبة..."
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
                    {Object.values(visibleColumns).filter(Boolean).length}/{INVOICE_COLUMNS.length}
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
                      INVOICE_COLUMNS.forEach((c) => (all[c.id] = true));
                      setVisibleColumns(all);
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    تحديد الكل
                  </button>
                </div>
                <div className="space-y-0.5">
                  {INVOICE_COLUMNS.map((col) => (
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
          </div>
        </div>

        {/* ── Table / Invoices List ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">جاري تحميل الفواتير...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد فواتير مطابقة للبحث أو الفترة الزمنية المحددة</p>
              <p className="text-xs text-slate-400">ستظهر هنا فواتير الصفقات وأوامر الشراء المعتمدة فور إصدارها</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                    {visibleColumns.invoice_number && <th className="py-3.5 px-4 font-extrabold">رقم الفاتورة</th>}
                    {visibleColumns.order_id && <th className="py-3.5 px-4 font-extrabold">رقم الطلب</th>}
                    {visibleColumns.vehicle && <th className="py-3.5 px-4 font-extrabold">بيانات المركبة واللوحة</th>}
                    {visibleColumns.total && <th className="py-3.5 px-4 font-extrabold text-center">الإجمالي شامل الضريبة</th>}
                    {visibleColumns.date && <th className="py-3.5 px-4 font-extrabold">تاريخ الإصدار</th>}
                    {visibleColumns.details && <th className="py-3.5 px-4 font-extrabold">تفاصيل الطلب</th>}
                    {visibleColumns.status && <th className="py-3.5 px-4 font-extrabold text-center">الحالة</th>}
                    {visibleColumns.actions && <th className="py-3.5 px-4 font-extrabold text-center">طباعة / PDF</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice # */}
                      {visibleColumns.invoice_number && (
                        <td className="py-4 px-4 font-mono">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="font-mono font-black text-slate-900 bg-slate-100/70 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>{inv.invoice_number}</span>
                          </button>
                        </td>
                      )}

                      {/* Order # */}
                      {visibleColumns.order_id && (
                        <td className="py-4 px-4 font-mono font-bold text-blue-700">
                          <Link href={`/deal/${inv.order_id}`} className="hover:underline">
                            #ORD-{shortId(inv.order_id)}
                          </Link>
                        </td>
                      )}

                      {/* Vehicle Info */}
                      {visibleColumns.vehicle && (
                        <td className="py-4 px-4 min-w-[160px]">
                          <div className="flex items-start gap-2">
                            <Car className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-slate-900 leading-tight">
                                {inv.vehicle_make} {inv.vehicle_model} {inv.vehicle_year}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {inv.plate_number && inv.plate_number !== "—" && (
                                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {inv.plate_number}
                                  </span>
                                )}
                                {inv.vin && inv.vin !== "—" && (
                                  <span className="text-[9px] font-mono text-slate-400">
                                    VIN: {inv.vin.slice(-6)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Total */}
                      {visibleColumns.total && (
                        <td className="py-4 px-4 text-center">
                          <span className="font-mono font-black text-emerald-800 text-sm">
                            {fmt(inv.total_amount)} ر.س
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            (الضريبة: {fmt(inv.tax_amount)} ر.س)
                          </span>
                        </td>
                      )}

                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-4 px-4 font-mono text-slate-500">
                          {fmtDate(inv.created_at)}
                        </td>
                      )}

                      {/* Full Order Details */}
                      {visibleColumns.details && (
                        <td className="py-4 px-4 min-w-[220px] max-w-sm">
                          <div className="space-y-1">
                            {inv.parts_items && inv.parts_items.length > 0 ? (
                              inv.parts_items.map((pi, piIdx) => (
                                <div key={piIdx} className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs text-slate-800">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-slate-900 leading-tight">{pi.name}</span>
                                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-mono shrink-0">
                                      {pi.qty}x
                                    </span>
                                  </div>
                                  {pi.partNumber && (
                                    <span className="text-[9px] font-mono text-slate-400 block mt-0.5">رقم القطعة: {pi.partNumber}</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-800 font-bold text-xs">{inv.parts_summary}</p>
                            )}
                            <span className="text-[10px] text-slate-500 block pt-0.5">العميل: {inv.client_name}</span>
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>معتمدة</span>
                          </span>
                        </td>
                      )}

                      {/* Actions (Preview & PDF download) */}
                      {visibleColumns.actions && (
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvoice(inv)}
                              className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold gap-1"
                              title="معاينة تفاصيل الفاتورة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>تفاصيل</span>
                            </Button>

                            <InvoicePDFExport
                              invoice={{
                                id: inv.id,
                                invoice_number: inv.invoice_number,
                                order_id: inv.order_id.startsWith("ORD-") ? inv.order_id : `ORD-${inv.order_id}`,
                                total_amount: inv.total_amount,
                                tax_amount: inv.tax_amount,
                                subtotal: inv.subtotal,
                                status: inv.status,
                                created_at: inv.created_at,
                              }}
                              vendor={inv.vendor_profile || {
                                company_name: "مؤسسة قطع الغيار المعتمدة",
                                full_name: "مؤسسة قطع الغيار المعتمدة",
                                phone: "0551122334",
                              }}
                              client={inv.client_profile || {
                                company_name: inv.client_name,
                                full_name: inv.client_name,
                                phone: inv.client_phone,
                              }}
                              order={{
                                id: inv.order_id.startsWith("ORD-") ? inv.order_id : `ORD-${inv.order_id}`,
                                car_make: inv.vehicle_make,
                                car_model: inv.vehicle_model,
                                car_year: Number(inv.vehicle_year) || 2023,
                                plate_number: inv.plate_number,
                              }}
                              items={inv.invoice_items}
                            />
                          </div>
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

      {/* Invoice Details Inspection Sheet */}
      {selectedInvoice && (
        <Sheet open={Boolean(selectedInvoice)} onOpenChange={() => setSelectedInvoice(null)}>
          <SheetContent side="left" className="w-[380px] sm:w-[500px] p-0 flex flex-col bg-white" dir="rtl">
            <SheetHeader className="p-5 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <SheetTitle className="text-base font-black text-gray-900">
                  فاتورة ضريبية #{selectedInvoice.invoice_number}
                </SheetTitle>
                <p className="text-xs text-gray-500 mt-0.5">تاريخ الإصدار: {fmtDate(selectedInvoice.created_at)}</p>
              </div>
            </SheetHeader>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Vehicle & Order details */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-2">
                <p className="font-bold text-gray-700">بيانات الطلب والعميل:</p>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div>
                    <span className="text-gray-400">رقم الطلب: </span>
                    <span className="font-mono font-bold text-gray-800">
                      #ORD-{selectedInvoice.order_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">المركبة: </span>
                    <span className="font-bold text-gray-800">
                      {selectedInvoice.vehicle_make} {selectedInvoice.vehicle_model} {selectedInvoice.vehicle_year}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">رقم اللوحة: </span>
                    <span className="font-mono">{selectedInvoice.plate_number || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">العميل: </span>
                    <span className="font-bold text-gray-800">{selectedInvoice.client_name}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="font-bold text-gray-800 mb-2">بنود الفاتورة والقطع الموردة:</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold">
                      <tr>
                        <th className="py-2 px-3">القطعة</th>
                        <th className="py-2 px-3 text-center">الكمية</th>
                        <th className="py-2 px-3">السعر</th>
                        <th className="py-2 px-3">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedInvoice.invoice_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-semibold text-gray-800">
                            {item.part_name}
                            {item.part_number && (
                              <p className="text-[10px] text-gray-400 font-mono">{item.part_number}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3">{fmt(item.unit_price)}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{fmt(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع الفرعي (قبل الضريبة):</span>
                  <span className="font-mono font-bold">{fmt(selectedInvoice.subtotal)} ر.س</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono font-bold">{fmt(selectedInvoice.tax_amount)} ر.س</span>
                </div>
                <div className="flex justify-between text-base font-black text-emerald-800 pt-2 border-t border-gray-200">
                  <span>الإجمالي شامل الضريبة:</span>
                  <span className="font-mono">{fmt(selectedInvoice.total_amount)} ر.س</span>
                </div>
              </div>

              {/* Vendor & Client Info */}
              {selectedInvoice.client_profile && (
                <div className="text-[11px] text-gray-500 border-t border-gray-100 pt-3 space-y-1">
                  <p className="font-bold text-gray-700">بيانات العميل المشتري:</p>
                  <p>{selectedInvoice.client_profile.company_name || selectedInvoice.client_profile.full_name}</p>
                  {selectedInvoice.client_profile.tax_number && (
                    <p>الرقم الضريبي للعميل: {selectedInvoice.client_profile.tax_number}</p>
                  )}
                  {selectedInvoice.client_profile.national_address && (
                    <p>العنوان الوطني: {selectedInvoice.client_profile.national_address}</p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <InvoicePDFExport
                  invoice={{
                    id: selectedInvoice.id,
                    invoice_number: selectedInvoice.invoice_number,
                    order_id: selectedInvoice.order_id.startsWith("ORD-") ? selectedInvoice.order_id : `ORD-${selectedInvoice.order_id}`,
                    total_amount: selectedInvoice.total_amount,
                    tax_amount: selectedInvoice.tax_amount,
                    subtotal: selectedInvoice.subtotal,
                    status: selectedInvoice.status,
                    created_at: selectedInvoice.created_at,
                  }}
                  vendor={selectedInvoice.vendor_profile || {
                    company_name: "مؤسسة قطع الغيار المعتمدة",
                    full_name: "مؤسسة قطع الغيار المعتمدة",
                    phone: "0551122334",
                  }}
                  client={selectedInvoice.client_profile || {
                    company_name: selectedInvoice.client_name,
                    full_name: selectedInvoice.client_name,
                    phone: selectedInvoice.client_phone,
                  }}
                  order={{
                    id: selectedInvoice.order_id.startsWith("ORD-") ? selectedInvoice.order_id : `ORD-${selectedInvoice.order_id}`,
                    car_make: selectedInvoice.vehicle_make,
                    car_model: selectedInvoice.vehicle_model,
                    car_year: Number(selectedInvoice.vehicle_year) || 2023,
                    plate_number: selectedInvoice.plate_number,
                  }}
                  items={selectedInvoice.invoice_items}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
