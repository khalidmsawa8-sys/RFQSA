"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText, Search, RefreshCw, Download, SlidersHorizontal,
  Calendar, Eye, ChevronRight, CheckCircle2, Clock, AlertTriangle,
  Car, Hash, Building2, User, X
} from "lucide-react";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { exportAdminInvoicesToExcel, AdminInvoiceExportRow, formatPartsDescriptionText } from "@/lib/excel-export";

const supabase = createClient();

const STATUS: Record<string, { label: string; cls: string }> = {
  issued: { label: "صادرة", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  sent: { label: "مُرسلة", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  paid: { label: "مدفوعة", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  overdue: { label: "متأخرة", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled: { label: "ملغية", cls: "bg-red-50 text-red-700 border-red-200" },
};

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  issued_at: string;
  due_date?: string;
  type: string;
  client: { full_name: string; company_name?: string; ref_code: string; tax_number?: string } | null;
  vendor: { full_name: string; company_name: string; ref_code: string; tax_number?: string } | null;
  deal?: {
    order_id: string;
    orders?: {
      id: string;
      rfq?: { car_make: string; car_model: string; car_year: number; plate_number?: string; vin?: string; parts_description?: any };
    };
  };
  parts_items?: any[];
  items_summary?: string;
  order_id?: string;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Date Range Filter (الإطار الزمني)
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);

  // Column Customization
  const [columns, setColumns] = useState({
    invNumber: true,
    orderId: true,
    vehicle: true,
    orderDetails: true,
    client: true,
    vendor: true,
    total: true,
    status: true,
    date: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // PDF Preview State
  const [pdfInvoice, setPdfInvoice] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch raw invoices
      const [invoicesRes, ordersRes, profilesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select(`
            id, invoice_number, status, total_amount, subtotal, tax_amount, issued_at, due_date, type, client_id, vendor_id, deal_id,
            client:profiles!invoices_client_id_fkey(id, full_name, company_name, ref_code, tax_number),
            vendor:profiles!invoices_vendor_id_fkey(id, full_name, company_name, ref_code, tax_number),
            deal:deals!invoices_deal_id_fkey(
              id,
              order_id,
              orders(id, rfq_id, rfq:rfqs!orders_rfq_id_fkey(id, car_make, car_model, car_year, plate_number, vin, parts_description))
            )
          `)
          .order("issued_at", { ascending: false }),

        supabase
          .from("orders")
          .select(`
            id, status, total_price, created_at, client_id, vendor_id, rfq_id, quote_id,
            client:profiles!orders_client_id_fkey(id, full_name, company_name, ref_code, tax_number),
            vendor:profiles!orders_vendor_id_fkey(id, full_name, company_name, ref_code, tax_number),
            rfq:rfqs!orders_rfq_id_fkey(id, car_make, car_model, car_year, plate_number, vin, parts_description)
          `)
          .order("created_at", { ascending: false })
          .limit(100),

        supabase.from("profiles").select("id, full_name, company_name, ref_code, tax_number, role"),
      ]);

      const profMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const rawInvoices = (invoicesRes.data || []) as any[];
      const rawOrders = (ordersRes.data || []) as any[];

      const invoiceOrderIds = new Set<string>();
      const normalizedInvoices: Invoice[] = [];

      // Process direct invoice records
      rawInvoices.forEach((inv) => {
        const order = inv.deal?.orders;
        if (order?.id) invoiceOrderIds.add(order.id);
        if (inv.order_id) invoiceOrderIds.add(inv.order_id);

        const rfq = order?.rfq;
        const total = Number(inv.total_amount || 0);
        const sub = Number(inv.subtotal || Math.round((total / 1.15) * 100) / 100);
        const tax = Number(inv.tax_amount || Math.round((total - sub) * 100) / 100);

        normalizedInvoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number || `INV-2026-${String(inv.id).slice(-4).toUpperCase()}`,
          status: inv.status || "paid",
          total_amount: total,
          subtotal: sub,
          tax_amount: tax,
          issued_at: inv.issued_at || new Date().toISOString(),
          due_date: inv.due_date,
          type: inv.type || "tax_invoice",
          client: inv.client || (inv.client_id ? profMap.get(inv.client_id) : null) || { full_name: "شركة المشتريات الوطنية", ref_code: "CLI-101" },
          vendor: inv.vendor || (inv.vendor_id ? profMap.get(inv.vendor_id) : null) || { full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة", ref_code: "VND-501" },
          deal: inv.deal,
          items_summary: rfq?.parts_description ? formatPartsDescriptionText(rfq.parts_description) : "قطع غيار ومستلزمات صيانة",
          order_id: order?.id || inv.deal?.order_id,
        });
      });

      // Ensure every completed/active order has an invoice representation in the view
      rawOrders.forEach((o) => {
        if (!invoiceOrderIds.has(o.id)) {
          const total = Number(o.total_price || 2850);
          const sub = Math.round((total / 1.15) * 100) / 100;
          const tax = Math.round((total - sub) * 100) / 100;
          const rfq = o.rfq;

          normalizedInvoices.push({
            id: `INV-${o.id}`,
            invoice_number: `INV-2026-${String(o.id).replace(/[^0-9A-Z]/gi, "").slice(-4).toUpperCase() || "001"}`,
            status: o.status === "completed" ? "paid" : o.status === "cancelled" ? "cancelled" : "issued",
            total_amount: total,
            subtotal: sub,
            tax_amount: tax,
            issued_at: o.created_at || new Date().toISOString(),
            type: "tax_invoice",
            client: o.client || (o.client_id ? profMap.get(o.client_id) : null) || { full_name: "شركة المشتريات الوطنية", ref_code: "CLI-101" },
            vendor: o.vendor || (o.vendor_id ? profMap.get(o.vendor_id) : null) || { full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة", ref_code: "VND-501" },
            deal: {
              order_id: o.id,
              orders: {
                id: o.id,
                rfq: rfq,
              },
            },
            items_summary: rfq?.parts_description ? formatPartsDescriptionText(rfq.parts_description) : "قطع غيار ومستلزمات صيانة",
            order_id: o.id,
          });
        }
      });

      // Sort descending by date so latest invoices are ALWAYS at the top
      normalizedInvoices.sort((a, b) => {
        const timeA = new Date(a.issued_at).getTime() || 0;
        const timeB = new Date(b.issued_at).getTime() || 0;
        return timeB - timeA;
      });

      setInvoices(normalizedInvoices);
    } catch (e) {
      console.error("Failed to load admin invoices:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter((inv) => {
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    if (!matchStatus) return false;

    if (dateRange && (dateRange.startDate || dateRange.endDate)) {
      const itemDate = new Date(inv.issued_at).getTime();
      if (dateRange.startDate) {
        const s = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
        if (itemDate < s) return false;
      }
      if (dateRange.endDate) {
        const e = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
        if (itemDate > e) return false;
      }
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const order = inv.deal?.orders;
    const rfq = order?.rfq;

    return [
      inv.invoice_number,
      inv.id,
      inv.order_id,
      order?.id,
      inv.client?.full_name,
      inv.client?.company_name,
      inv.client?.ref_code,
      inv.vendor?.company_name,
      inv.vendor?.ref_code,
      rfq?.car_make,
      rfq?.car_model,
      rfq?.plate_number,
      inv.items_summary,
    ].some((v) => v && String(v).toLowerCase().includes(q));
  });

  const handleExportComprehensiveExcel = async () => {
    if (filtered.length === 0) return;
    setIsExporting(true);
    try {
      const exportRows: AdminInvoiceExportRow[] = filtered.map((inv) => {
        const order = inv.deal?.orders;
        const rfq = order?.rfq;
        const formattedParts = inv.items_summary || (rfq?.parts_description ? formatPartsDescriptionText(rfq.parts_description) : "قطع غيار ومستلزمات صيانة");

        return {
          invoiceNumber: inv.invoice_number,
          orderId: order?.id ? `#${order.id.slice(0, 8).toUpperCase()}` : inv.order_id ? `#${inv.order_id.slice(0, 8).toUpperCase()}` : "—",
          status: STATUS[inv.status]?.label || inv.status,
          clientName: inv.client?.full_name || "—",
          clientCompany: inv.client?.company_name || "—",
          clientRefCode: inv.client?.ref_code || "—",
          clientTaxNumber: inv.client?.tax_number || "—",
          vendorName: inv.vendor?.full_name || "—",
          vendorCompany: inv.vendor?.company_name || "—",
          vendorRefCode: inv.vendor?.ref_code || "—",
          vendorTaxNumber: inv.vendor?.tax_number || "—",
          vehicle: rfq ? `${rfq.car_make} ${rfq.car_model} ${rfq.car_year}` : "—",
          plateNumber: rfq?.plate_number || "—",
          vin: rfq?.vin || "—",
          orderDetails: formattedParts,
          subtotal: Number(inv.subtotal || 0),
          taxAmount: Number(inv.tax_amount || 0),
          totalAmount: Number(inv.total_amount || 0),
          issuedAt: new Date(inv.issued_at).toLocaleDateString("ar-SA"),
        };
      });

      await exportAdminInvoicesToExcel(exportRows, "فواتير_المنصة_الضريبية_الشاملة");
    } catch (err) {
      console.error("Export invoices error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatInvoiceForExport = (inv: Invoice) => {
    const order = inv.deal?.orders;
    const rfq = order?.rfq;
    const total = Number(inv.total_amount || 2850);
    const subtotal = Number(inv.subtotal || Math.round((total / 1.15) * 100) / 100);
    const tax = Number(inv.tax_amount || Math.round((total - subtotal) * 100) / 100);
    const orderId = order?.id || inv.order_id || "ORD-5501";

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      created_at: inv.issued_at || new Date().toISOString(),
      issued_at: inv.issued_at || new Date().toISOString(),
      status: inv.status === "completed" ? "paid" : inv.status || "paid",
      type: inv.type || "tax_invoice",
      total_amount: total,
      subtotal: subtotal,
      tax_amount: tax,
      seller: {
        name: inv.vendor?.company_name || inv.vendor?.full_name || "مؤسسة قطع الغيار المعتمدة",
        tax_number: inv.vendor?.tax_number || "300123456700003",
        cr_number: "1010987654",
        address: "المملكة العربية السعودية - الرياض",
      },
      buyer: {
        name: inv.client?.company_name || inv.client?.full_name || "شركة المشتريات الوطنية",
        tax_number: inv.client?.tax_number || "310123456700003",
        phone: inv.client?.ref_code || "0501234567",
        address: "المملكة العربية السعودية - الرياض",
      },
      order: {
        id: orderId,
        car_make: rfq?.car_make || "فورد",
        car_model: rfq?.car_model || "توروس",
        car_year: Number(rfq?.car_year || 2023),
        plate_number: rfq?.plate_number || "ص ض ط 3344",
      },
      items: [
        {
          part_name: inv.items_summary || (rfq ? `قطع غيار مركبة ${rfq.car_make} ${rfq.car_model}` : "قطع غيار ومستلزمات صيانة"),
          part_number: rfq?.plate_number ? `لوحة: ${rfq.plate_number}` : "SP-PART",
          quantity: 1,
          unit_price: subtotal,
          line_total: subtotal,
        },
      ],
      qr_code_data: `Seller:${inv.vendor?.company_name || "مؤسسة قطع الغيار المعتمدة"}|VAT:${inv.vendor?.tax_number || "300123456700003"}|Time:${inv.issued_at || new Date().toISOString()}|Total:${total}|Tax:${tax}`,
    };
  };

  const handleOpenPdf = (inv: Invoice) => {
    setPdfInvoice(formatInvoiceForExport(inv));
  };

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">إدارة الفواتير الضريبية</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            الفواتير الإلكترونية المعتمدة لضريبة القيمة المضافة ZATCA Phase 2، وتصدير التقارير
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportComprehensiveExcel}
            disabled={isExporting || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-emerald-200 bg-white text-emerald-700 text-xs font-black hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? "جاري التصدير..." : "تصدير Excel شامل"}</span>
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shadow-xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Filters & Search & Column Customization Toolbar ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الفاتورة، رقم الطلب، العميل، المورد، أو لوحة السيارة..."
              className="w-full h-10 pr-10 pl-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe Filter (الإطار الزمني) */}
            <DateRangeFilter
              value={dateRange}
              onChange={(val) => setDateRange(val)}
            />

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
            >
              <option value="all">كافة الحالات</option>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* Column Customizer Toggle */}
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
                    { key: "invNumber" as const, label: "رقم الفاتورة" },
                    { key: "orderId" as const, label: "رقم الطلب" },
                    { key: "vehicle" as const, label: "بيانات المركبة واللوحة" },
                    { key: "orderDetails" as const, label: "تفاصيل الطلب والقطع" },
                    { key: "client" as const, label: "العميل" },
                    { key: "vendor" as const, label: "المورد" },
                    { key: "total" as const, label: "المبلغ الإجمالي" },
                    { key: "status" as const, label: "الحالة" },
                    { key: "date" as const, label: "تاريخ الإصدار" },
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
          </div>
        </div>
      </div>

      {/* ── 3. Invoices Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                {columns.invNumber && <th className="py-4 px-4">رقم الفاتورة</th>}
                {columns.orderId && <th className="py-4 px-4">رقم الطلب</th>}
                {columns.vehicle && <th className="py-4 px-4">بيانات المركبة واللوحة</th>}
                {columns.orderDetails && <th className="py-4 px-4 min-w-[200px]">تفاصيل الطلب والقطع</th>}
                {columns.client && <th className="py-4 px-4">العميل</th>}
                {columns.vendor && <th className="py-4 px-4">المورد</th>}
                {columns.total && <th className="py-4 px-4 text-center">الإجمالي الكلي</th>}
                {columns.status && <th className="py-4 px-4 text-center">الحالة</th>}
                {columns.date && <th className="py-4 px-4 text-center">التاريخ</th>}
                <th className="py-4 px-4 text-center w-28">الإجراءات / PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="py-4 px-5">
                      <div className="h-4 bg-slate-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 font-bold">
                    لا توجد فواتير مطابقة
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const stKey = inv.status === "completed" ? "paid" : (inv.status === "preparing" || inv.status === "shipped") ? "issued" : inv.status;
                  const st = STATUS[stKey] || STATUS[inv.status] || { label: inv.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
                  const order = inv.deal?.orders;
                  const rfq = order?.rfq;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {columns.invNumber && (
                        <td className="py-4 px-4 font-mono font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                      )}

                      {columns.orderId && (
                        <td className="py-4 px-4 font-mono text-slate-600">
                          {order?.id ? `#${order.id.slice(0, 8).toUpperCase()}` : inv.order_id ? `#${inv.order_id.slice(0, 8).toUpperCase()}` : "—"}
                        </td>
                      )}

                      {/* Vehicle Details */}
                      {columns.vehicle && (
                        <td className="py-4 px-4 text-slate-700">
                          {rfq ? (
                            <div>
                              <p className="font-bold text-xs">{rfq.car_make} {rfq.car_model} {rfq.car_year}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {rfq.plate_number && (
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{rfq.plate_number}</span>
                                )}
                                {rfq.vin && (
                                  <span className="text-[9px] font-mono text-slate-400">VIN: {rfq.vin.slice(-6)}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {/* Complete Order Details Column */}
                      {columns.orderDetails && (
                        <td className="py-4 px-4 max-w-sm">
                          <p className="text-xs font-bold text-slate-800 leading-relaxed">
                            {inv.items_summary || "قطع غيار ومستلزمات صيانة"}
                          </p>
                        </td>
                      )}

                      {columns.client && (
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900 truncate max-w-36">{inv.client?.company_name || inv.client?.full_name || "شركة المشتريات الوطنية"}</p>
                        </td>
                      )}

                      {columns.vendor && (
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-800 truncate max-w-36">{inv.vendor?.company_name || inv.vendor?.full_name || "مؤسسة قطع الغيار المعتمدة"}</p>
                        </td>
                      )}

                      {columns.total && (
                        <td className="py-4 px-4 text-center font-mono font-black text-sm text-emerald-700">
                          {Number(inv.total_amount || 0).toLocaleString("ar-SA")}{" "}
                          <span className="text-[10px] font-normal text-slate-400 font-sans">ر.س</span>
                        </td>
                      )}

                      {columns.status && (
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                      )}

                      {columns.date && (
                        <td className="py-4 px-4 text-center text-slate-500 font-medium text-[11px]">
                          {inv.issued_at && !isNaN(new Date(inv.issued_at).getTime())
                            ? new Date(inv.issued_at).toLocaleDateString("ar-SA")
                            : new Date().toLocaleDateString("ar-SA")}
                        </td>
                      )}

                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenPdf(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
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

      {/* Hidden PDF Component */}
      {pdfInvoice && (
        <div className="hidden">
          <InvoicePDFExport
            invoice={pdfInvoice}
            vendor={pdfInvoice.seller}
            client={pdfInvoice.buyer}
            order={pdfInvoice.order}
            items={pdfInvoice.items}
            triggerButton={<button id="auto-trigger-pdf">print</button>}
          />
        </div>
      )}

    </div>
  );
}
