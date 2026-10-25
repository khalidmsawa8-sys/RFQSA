"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Star,
  Car,
  Filter,
  FileText,
  Phone,
  Receipt,
  ArrowRight,
  CalendarDays,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sheet as SheetIcon,
} from "lucide-react";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  tax_amount: number;
  subtotal: number;
  platform_commission?: number;
  platform_commission_percent?: number;
  vat_percent?: number;
  issued_at: string;
  notes: string | null;
  deal_id: string;
  deals: {
    order_id: string;
    client_id: string;
    vendor_id: string;
    orders: {
      id: string;
      rfq_id: string;
      rfqs: {
        car_make: string;
        car_model: string;
        car_year: number;
        vin: string;
        plate_number?: string;
      } | null;
    } | null;
  } | null;
  invoice_items: {
    id: string;
    part_name: string;
    part_number: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  payments: {
    id: string;
    amount: number;
    payment_method: string;
    reference_number: string;
  }[];
  client_profile?: { full_name: string; company_name: string; phone: string; tax_number?: string; commercial_register?: string; national_address?: string } | null;
  vendor_profile?: { full_name: string; company_name: string; phone: string; tax_number?: string; commercial_register?: string; national_address?: string } | null;
  client_rating?: number | null;
  /** Delivery info pulled from the accepted quote that produced this order. */
  delivery_cost?: number;
  delivery_days?: number;
}

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  pending:   { label: "معلّقة",  dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  paid:      { label: "مدفوعة", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:   { label: "متأخرة", dot: "bg-red-400",     badge: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "ملغاة",  dot: "bg-gray-300",    badge: "bg-gray-50 text-gray-500 border-gray-200" },
  issued:    { label: "صادرة",  dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClient();

  const [platformSettings, setPlatformSettings] = useState<{
    vat_percent: number;
    platform_commission_percent: number;
    platform_name: string;
    tax_number: string;
    cr_number: string;
    phone: string;
    email: string;
    address: string;
  }>({
    vat_percent: 15,
    platform_commission_percent: 3,
    platform_name: "منصة طلبات عروض الأسعار (RFQ)",
    tax_number: "310123456700003",
    cr_number: "1010123456",
    phone: "+966 11 000 0000",
    email: "info@rfq.sa",
    address: "الرياض، المملكة العربية السعودية",
  });

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d?.settings || d?.data;
        if (s) {
          setPlatformSettings((prev) => ({
            ...prev,
            vat_percent: Number(s.vat_percent ?? 15),
            platform_commission_percent: Number(s.platform_commission_percent ?? 3),
            tax_number: s.vat_number || prev.tax_number,
            cr_number: s.cr_number || prev.cr_number,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Advanced filter sheet
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [plateFilter, setPlateFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");

  // Pending (not-yet-applied) state inside the sheet
  const [pendingDateFrom, setPendingDateFrom] = useState("");
  const [pendingDateTo, setPendingDateTo] = useState("");
  const [pendingPlate, setPendingPlate] = useState("");
  const [pendingVendor, setPendingVendor] = useState("all");

  const openFilter = () => {
    setPendingDateFrom(dateFrom);
    setPendingDateTo(dateTo);
    setPendingPlate(plateFilter);
    setPendingVendor(vendorFilter);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setPlateFilter(pendingPlate);
    setVendorFilter(pendingVendor);
    setFilterOpen(false);
  };

  const clearFilter = () => {
    setPendingDateFrom(""); setPendingDateTo("");
    setPendingPlate(""); setPendingVendor("all");
  };

  const activeFilterCount = [
    dateFrom, dateTo, plateFilter, vendorFilter !== "all" ? vendorFilter : ""
  ].filter(Boolean).length;

  const exportToExcel = (data: Invoice[]) => {
    const rows = data.map((inv) => {
      const rfq = inv.deals?.orders?.rfqs;
      const orderId = inv.deals?.orders?.id || inv.deals?.order_id || "";
      const vendor = inv.vendor_profile?.company_name || inv.vendor_profile?.full_name || "";
      const client = inv.client_profile?.company_name || inv.client_profile?.full_name || "";
      const vehicle = rfq ? `${rfq.car_make} ${rfq.car_model} ${rfq.car_year}` : "";
      const status = statusConfig[inv.status]?.label || inv.status;
      return [
        inv.invoice_number || "",
        orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : "",
        status,
        vendor,
        client,
        vehicle,
        rfq?.plate_number || "",
        Number(inv.subtotal || 0).toFixed(2),
        Number(inv.platform_commission || 0).toFixed(2),
        Number(inv.tax_amount || 0).toFixed(2),
        Number(inv.total_amount || 0).toFixed(2),
        inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("ar-SA") : "",
      ];
    });

    const header = [
      "رقم الفاتورة",
      "رقم الطلب",
      "الحالة",
      "المورد",
      "العميل",
      "المركبة",
      "رقم اللوحة",
      "قبل الضريبة والعمولة",
      `عمولة المنصة (${platformSettings.platform_commission_percent}%)`,
      `ضريبة القيمة المضافة (${platformSettings.vat_percent}%)`,
      "الإجمالي الكلي",
      "التاريخ"
    ];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `فواتير_${MONTHS_AR[selectedMonth]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Month selector
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [refreshKey, setRefreshKey]       = useState(0);
  const [refreshing, setRefreshing]       = useState(false);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0);  setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const fetchInvoices = useCallback(async (uid: string) => {
    setLoading(true);

    const { data: clientDeals } = await supabase.from("deals").select("id, order_id, client_id, vendor_id").eq("client_id", uid);
    const { data: vendorDeals } = await supabase.from("deals").select("id, order_id, client_id, vendor_id").eq("vendor_id", uid);
    const allDeals = [...(clientDeals || []), ...(vendorDeals || [])];
    const dealIds = allDeals.map((d) => d.id);

    if (dealIds.length === 0) { setInvoices([]); setLoading(false); return; }

    const { data: invoiceData } = await supabase
      .from("invoices")
      .select(`id, invoice_number, status, total_amount, tax_amount, subtotal, issued_at, notes, deal_id,
        invoice_items(id, part_name, part_number, quantity, unit_price, line_total),
        payments(id, amount, payment_method, reference_number)`)
      .in("deal_id", dealIds)
      .order("issued_at", { ascending: false });

    const orderIds = allDeals.map((d) => d.order_id).filter(Boolean);

    const { data: completedOrders } = await supabase
      .from("orders")
      .select("id, status, created_at, total_price, rfq_id, quote_id, rfqs(car_make, car_model, car_year, vin, plate_number, client_id)")
      .in("id", orderIds);

    // Fetch the accepted quote behind every order so the invoice PDF gets
    // the supplier-supplied delivery_cost & delivery_days.
    const quoteIds = (completedOrders || [])
      .map((o: any) => o.quote_id)
      .filter(Boolean);

    const { data: quoteRows } = quoteIds.length
      ? await supabase
          .from("quotes")
          .select("id, delivery_cost, delivery_days")
          .in("id", quoteIds)
      : { data: [] as Array<{ id: string; delivery_cost: number | null; delivery_days: number | null }> };

    // Map: order_id -> { delivery_cost, delivery_days }
    const deliveryByOrder: Record<string, { delivery_cost: number; delivery_days: number }> = {};
    (completedOrders || []).forEach((o: any) => {
      const q = (quoteRows || []).find((qr: any) => qr.id === o.quote_id);
      if (q) {
        deliveryByOrder[o.id] = {
          delivery_cost: Number(q.delivery_cost ?? 0),
          delivery_days: Number(q.delivery_days ?? 0),
        };
      }
    });

    // Fetch deal_items for all orders to use as fallback when invoice_items is empty
    const { data: allDealItems } = await supabase
      .from("deal_items")
      .select("id, order_id, part_name, part_number, quantity, unit_price, line_total")
      .in("order_id", orderIds);

    // Map: order_id -> deal_items[]
    const dealItemsByOrder: Record<string, any[]> = {};
    (allDealItems || []).forEach((item: any) => {
      if (!dealItemsByOrder[item.order_id]) dealItemsByOrder[item.order_id] = [];
      dealItemsByOrder[item.order_id]!.push(item);
    });

    const dealMap = Object.fromEntries(allDeals.map((d: any) => [d.id, d]));
    const orderToDeal = Object.fromEntries(allDeals.map((d: any) => [d.order_id, d]));

    const profileIds = [...new Set(allDeals.flatMap((d: any) => [d.client_id, d.vendor_id].filter(Boolean)))];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, company_name, phone, tax_number, commercial_register, national_address").in("id", profileIds);
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

    const { data: ratings } = await supabase.from("deal_reviews").select("deal_id, rating").in("deal_id", dealIds);
    const ratingMap: Record<string, number> = {};
    (ratings || []).forEach((r: any) => { ratingMap[r.deal_id] = r.rating; });

    // Build a map: order_id -> total_price (this is the value shown in deal details page)
    const orderTotalMap: Record<string, number> = {};
    (completedOrders || []).forEach((o: any) => {
      orderTotalMap[o.id] = Number(o.total_price || 0);
    });

    const enrichedInvoices = (invoiceData || []).map((inv: any) => {
      const deal = dealMap[inv.deal_id];
      const order = (completedOrders || []).find((o: any) => o.id === deal?.order_id);
      const dlv = order ? deliveryByOrder[order.id] : null;
      // Use orders.total_price as the source of truth — same value shown in deal details
      const realTotal = order ? Number(order.total_price || 0) : Number(inv.total_amount || 0);
      // Prefer invoice_items from the invoices table; fall back to deal_items if empty
      const invoiceItems = inv.invoice_items && inv.invoice_items.length > 0
        ? inv.invoice_items
        : (order ? (dealItemsByOrder[order.id] || []).map((di: any) => ({
            id: di.id,
            part_name: di.part_name,
            part_number: di.part_number || "",
            quantity: di.quantity,
            unit_price: Number(di.unit_price),
            line_total: Number(di.line_total ?? di.unit_price * di.quantity),
          })) : []);
      const commRate = Number(inv.platform_commission_percent ?? platformSettings.platform_commission_percent ?? 3);
      const vatRate = Number(inv.vat_percent ?? platformSettings.vat_percent ?? 15);
      const delivery = Number(dlv?.delivery_cost || 0);
      const netBase = Math.max(0, realTotal - delivery);
      const factor = 1 + (commRate / 100) + (vatRate / 100);
      const itemsSum = invoiceItems.reduce((acc: number, it: any) => acc + ((Number(it.unit_price) || 0) * (Number(it.quantity) || 1)), 0);
      const calcSubtotal = itemsSum > 0
        ? Number(itemsSum.toFixed(2))
        : (Number(inv.subtotal) && Number(inv.subtotal) < realTotal
            ? Number(inv.subtotal)
            : Number((netBase / factor).toFixed(2)));
      const calcCommission = Number(inv.platform_commission) || Number(((calcSubtotal * commRate) / 100).toFixed(2));
      const calcTax = Number(inv.tax_amount) && Number(inv.tax_amount) > 0 && Number(inv.tax_amount) < realTotal
        ? Number(inv.tax_amount)
        : Number(((calcSubtotal * vatRate) / 100).toFixed(2));

      return {
        ...inv,
        total_amount: realTotal,
        subtotal: calcSubtotal,
        platform_commission: calcCommission,
        platform_commission_percent: commRate,
        tax_amount: calcTax,
        vat_percent: vatRate,
        invoice_items: invoiceItems,
        deals: deal ? { ...deal, orders: order ? { id: order.id, rfq_id: order.rfq_id, rfqs: order.rfqs } : null } : null,
        client_profile: deal?.client_id ? profileMap[deal.client_id] : null,
        vendor_profile: deal?.vendor_id ? profileMap[deal.vendor_id] : null,
        client_rating: ratingMap[inv.deal_id] ?? null,
        delivery_cost: dlv?.delivery_cost,
        delivery_days: dlv?.delivery_days,
      };
    });

    const invoiceOrderIds = new Set(enrichedInvoices.map((inv: any) => inv.deals?.orders?.id).filter(Boolean));
    const syntheticInvoices = (completedOrders || [])
      .filter((o: any) => !invoiceOrderIds.has(o.id))
      .map((o: any) => {
        const deal = orderToDeal[o.id];
        if (!deal) return null;
        const realTotal = Number(o.total_price || 0);
        const dlv = deliveryByOrder[o.id];
        const commRate = Number(o.platform_commission_percent ?? platformSettings.platform_commission_percent ?? 3);
        const vatRate = Number(o.vat_percent ?? platformSettings.vat_percent ?? 15);
        const delivery = Number(dlv?.delivery_cost || 0);
        const netBase = Math.max(0, realTotal - delivery);
        const factor = 1 + (commRate / 100) + (vatRate / 100);

        // Pull deal_items for this order as the line items on the synthetic invoice
        const syntheticItems = (dealItemsByOrder[o.id] || []).map((di: any) => ({
          id: di.id,
          part_name: di.part_name,
          part_number: di.part_number || "",
          quantity: di.quantity,
          unit_price: Number(di.unit_price),
          line_total: Number(di.line_total ?? di.unit_price * di.quantity),
        }));

        const itemsSum = syntheticItems.reduce((acc: number, it: any) => acc + (it.unit_price * it.quantity), 0);
        const calcSubtotal = itemsSum > 0
          ? Number(itemsSum.toFixed(2))
          : (Number(o.subtotal) || Number((netBase / factor).toFixed(2)));
        const calcCommission = Number(o.platform_commission) || Number(((calcSubtotal * commRate) / 100).toFixed(2));
        const calcTax = Number(o.tax_amount) || Number(((calcSubtotal * vatRate) / 100).toFixed(2));
        return {
          id: `synthetic-${o.id}`,
          invoice_number: `ORD-${o.id.slice(0, 8).toUpperCase()}`,
          status: "issued",
          total_amount: realTotal,
          subtotal: calcSubtotal,
          platform_commission: calcCommission,
          platform_commission_percent: commRate,
          tax_amount: calcTax,
          vat_percent: vatRate,
          issued_at: o.created_at,
          notes: null,
          deal_id: deal.id,
          deals: { ...deal, orders: { id: o.id, rfq_id: o.rfq_id, rfqs: o.rfqs } },
          invoice_items: syntheticItems,
          payments: [],
          client_profile: deal.client_id ? profileMap[deal.client_id] : null,
          vendor_profile: deal.vendor_id ? profileMap[deal.vendor_id] : null,
          client_rating: ratingMap[deal.id] ?? null,
          delivery_cost: dlv?.delivery_cost,
          delivery_days: dlv?.delivery_days,
        };
      })
      .filter(Boolean);

    setInvoices([...enrichedInvoices, ...syntheticInvoices] as Invoice[]);
    setLoading(false);
  }, [supabase]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setUserRole(profile?.role || null);
      await fetchInvoices(user.id);
    };
    init();
  }, [fetchInvoices, supabase]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!currentUserId) return;
    setRefreshing(true);
    await fetchInvoices(currentUserId);
    setRefreshing(false);
  }, [currentUserId, fetchInvoices]);

  // Unique vendors list for the select
  const vendorOptions = Array.from(
    new Map(
      invoices
        .map((inv) => inv.vendor_profile)
        .filter(Boolean)
        .map((v) => [v!.full_name || v!.company_name, v!])
    ).values()
  );

  const filtered = useMemo(() => invoices.filter((inv) => {
    const q = search.toLowerCase();
    const realOrderId = inv.deals?.orders?.id || inv.deals?.order_id || "";
    const matchSearch = !q ||
      realOrderId.toLowerCase().includes(q) ||
      realOrderId.slice(0, 8).toLowerCase().includes(q) ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.client_profile?.full_name || "").toLowerCase().includes(q) ||
      (inv.client_profile?.company_name || "").toLowerCase().includes(q) ||
      (inv.vendor_profile?.full_name || "").toLowerCase().includes(q) ||
      (inv.vendor_profile?.company_name || "").toLowerCase().includes(q) ||
      (inv.deals?.orders?.rfqs?.car_make || "").toLowerCase().includes(q) ||
      (inv.deals?.orders?.rfqs?.car_model || "").toLowerCase().includes(q) ||
      (inv.deals?.orders?.rfqs?.plate_number || "").toLowerCase().includes(q);

    const matchStatus = statusFilter.length === 0 || statusFilter.includes(inv.status);

    const issued = inv.issued_at ? new Date(inv.issued_at) : null;

    // If a custom date range is active, skip the month filter entirely
    const hasDateRange = dateFrom || dateTo;
    const matchMonth = hasDateRange
      ? true
      : !issued || (issued.getMonth() === selectedMonth && issued.getFullYear() === selectedYear);

    // Date range filter (from filter sheet)
    const matchDateFrom = !dateFrom || (issued && issued >= new Date(dateFrom));
    const matchDateTo   = !dateTo   || (issued && issued <= new Date(dateTo + "T23:59:59"));

    // Plate filter
    const plate = inv.deals?.orders?.rfqs?.plate_number || "";
    const matchPlate = !plateFilter || plate.toLowerCase().includes(plateFilter.toLowerCase());

    // Vendor filter
    const vName = inv.vendor_profile?.full_name || inv.vendor_profile?.company_name || "";
    const matchVendor = vendorFilter === "all" || vName === vendorFilter;

    return matchSearch && matchStatus && matchMonth && matchDateFrom && matchDateTo && matchPlate && matchVendor;
  }), [invoices, search, statusFilter, selectedMonth, selectedYear, dateFrom, dateTo, plateFilter, vendorFilter]);



  // Stats
  const totalAmount = filtered.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const paidCount = filtered.filter((i) => i.status === "paid").length;
  const pendingCount = filtered.filter((i) => i.status === "pending" || i.status === "issued").length;

  const formatAmount = (n: number) =>
    n.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      <div className="w-full px-4 sm:px-6 py-8 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
              <button onClick={() => window.history.back()} className="hover:text-slate-700 transition-colors">
                لوحة التحكم
              </button>
              <ArrowRight className="w-3 h-3" />
              <span className="text-slate-600 font-medium">الفواتير</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">الفواتير</h1>
            <p className="text-sm text-slate-500 mt-1">إدارة جميع فواتيرك في مكان واحد</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            عودة
          </button>
        </div>

        {/* ── Month Navigator ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Arrows + Month label */}
          <div className="flex items-center gap-3">
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-700 min-w-[110px] text-center">
              {MONTHS_AR[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* عدد الفواتير */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #e8f8f0 0%, #d0f0e4 100%)" }}>
            <div className="absolute left-4 top-4 w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-emerald-700">عدد الفواتير</p>
              <p className="text-4xl font-bold text-slate-800 mt-2 leading-none">{filtered.length}</p>
              <p className="text-xs text-emerald-600 mt-2">{MONTHS_AR[selectedMonth]} {selectedYear}</p>
            </div>
          </div>

          {/* إجمالي الفواتير */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #e8f8f0 0%, #d0f0e4 100%)" }}>
            <div className="absolute left-4 top-4 w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center">
              <Receipt className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-emerald-700">إجمالي الفواتير</p>
              <p className="text-4xl font-bold text-slate-800 mt-2 leading-none">{formatAmount(totalAmount)}</p>
              <p className="text-xs text-emerald-600 mt-2">ريال سعودي · {MONTHS_AR[selectedMonth]} {selectedYear}</p>
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-4 py-3 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <Input
              placeholder="بحث برقم الفاتورة أو العميل أو المركبة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pr-9 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 placeholder:text-slate-300"
            />
          </div>
          <div className="w-px h-6 bg-slate-100" />
          {/* Filter Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={openFilter}
            className="h-9 gap-2 text-sm border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            تصفية
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {/* Excel Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(filtered)}
            disabled={filtered.length === 0}
            className="h-9 gap-2 text-sm border-emerald-200 rounded-xl text-emerald-700 hover:bg-emerald-50 shrink-0"
          >
            <SheetIcon className="w-3.5 h-3.5" />
            Excel
          </Button>
        </div>

        {/* ── Filter Sheet ── */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0 overflow-y-auto" dir="rtl">
            <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
              <SheetTitle className="text-base font-bold text-slate-800">تصفية البيانات</SheetTitle>
              <button
                onClick={() => setFilterOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </SheetHeader>

            <div className="px-5 py-5 space-y-6">

              {/* تصفية التاريخ */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">تصفية التاريخ</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">من:</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={pendingDateFrom}
                        onChange={(e) => setPendingDateFrom(e.target.value)}
                        className="w-full h-9 pr-9 pl-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-600"
                      />
                      {pendingDateFrom && (
                        <button
                          onClick={() => setPendingDateFrom("")}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">إلى:</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={pendingDateTo}
                        onChange={(e) => setPendingDateTo(e.target.value)}
                        className="w-full h-9 pr-9 pl-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-600"
                      />
                      {pendingDateTo && (
                        <button
                          onClick={() => setPendingDateTo("")}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* البحث عن رقم المركبة */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-1.5">البحث عن رقم المركبة</p>
                <p className="text-xs text-slate-400 mb-2">رقم المركبة:</p>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="أدخل رقم المركبة (مثال: 1234)"
                    value={pendingPlate}
                    onChange={(e) => setPendingPlate(e.target.value)}
                    className="h-9 pr-9 text-sm border-slate-200 rounded-xl placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* البحث عن المورد */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-1.5">البحث عن المورد</p>
                <p className="text-xs text-slate-400 mb-2">اسم المورد:</p>
                <Select value={pendingVendor} onValueChange={setPendingVendor}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 rounded-xl text-slate-600 focus:ring-slate-200">
                    <div className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <SelectValue placeholder="اختر أو ابحث عن المورد" />
                    </div>
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="rounded-xl">
                    <SelectItem value="all" className="text-sm">الكل</SelectItem>
                    {vendorOptions.map((v) => {
                      const name = v.full_name || v.company_name || "";
                      return (
                        <SelectItem key={name} value={name} className="text-sm">
                          {name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-slate-100 flex items-center gap-3">
              <Button
                onClick={applyFilter}
                className="flex-1 h-10 bg-[#1a2b4a] hover:bg-[#243659] text-white rounded-xl text-sm font-semibold gap-2"
              >
                تطبيق التصفية
              </Button>
              <Button
                variant="outline"
                onClick={clearFilter}
                className="h-10 px-5 border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">

          {/* Table Header */}
          <div className="grid grid-cols-[1.1fr_0.9fr_1.1fr_1fr_1.6fr_0.9fr_1fr_auto] gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/60">
            <span className="text-xs font-semibold text-slate-400 text-right">رقم الفاتورة</span>
            <span className="text-xs font-semibold text-slate-400 text-right">الطلب</span>
            <span className="text-xs font-semibold text-slate-400 text-right">حالة الطلب</span>
            <span className="text-xs font-semibold text-slate-400 text-right">المورد</span>
            <span className="text-xs font-semibold text-slate-400 text-right">المركبة</span>
            <span className="text-xs font-semibold text-slate-400 text-right">الإجمالي</span>
            <span className="text-xs font-semibold text-slate-400 text-right">التاريخ</span>
            <span className="text-xs font-semibold text-slate-400 text-left">PDF</span>
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.1fr_0.9fr_1.1fr_1fr_1.6fr_0.9fr_1fr_auto] gap-4 px-6 py-4 border-b border-slate-50 animate-pulse">
                {Array.from({ length: 8 }).map((__, j) => (
                  <div key={j} className="h-4 bg-slate-100 rounded-lg" />
                ))}
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                <FileText className="w-7 h-7 text-slate-200" />
              </div>
              <p className="text-slate-400 text-sm font-medium">لا توجد فواتير</p>
              <p className="text-slate-300 text-xs">ستظهر فواتيرك هنا بعد إتمام الطلبات</p>
            </div>
          ) : (
            filtered.map((invoice, idx) => {
              const rfq = invoice.deals?.orders?.rfqs;
              const orderId = invoice.deals?.orders?.id || invoice.deals?.order_id;
              const otherParty = userRole === "client" ? invoice.vendor_profile : invoice.client_profile;
              const otherLabel = userRole === "client" ? "المورد" : "العميل";
              const partyName = otherParty?.company_name || otherParty?.full_name || otherLabel;
              const st = statusConfig[invoice.status] || statusConfig.issued;
              const vehicleLabel = rfq
                ? `${rfq.car_make} ${rfq.car_model} (${rfq.plate_number || rfq.car_year})`
                : null;

              return (
                <div
                  key={invoice.id}
                  className={`grid grid-cols-[1.1fr_0.9fr_1.1fr_1fr_1.6fr_0.9fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-slate-50/70 transition-colors ${idx < filtered.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  {/* رقم الفاتورة */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 font-mono tracking-wide">
                      <FileText className="w-3 h-3" />
                      {invoice.invoice_number || "—"}
                    </span>
                  </div>

                  {/* الطلب */}
                  <div>
                    {orderId ? (
                      <a
                        href={`/deal/${orderId}`}
                        className="text-sm font-bold text-slate-800 hover:text-blue-700 transition-colors font-mono"
                      >
                        #{orderId.slice(0, 8).toUpperCase()}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400 font-mono">—</span>
                    )}
                  </div>

                  {/* حالة الطلب */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${st.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>

                  {/* المورد / العميل */}
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors text-right">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                            {partyName.slice(0, 2)}
                          </span>
                          <span className="truncate max-w-24 font-medium">{partyName}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 rounded-xl p-3" dir="rtl">
                        <p className="font-semibold text-sm">{partyName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{otherLabel}</p>
                        {invoice.client_rating && <StarRating rating={invoice.client_rating} />}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* المركبة */}
                  <div>
                    {vehicleLabel ? (
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="text-sm text-slate-600 font-medium truncate">{vehicleLabel}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </div>

                  {/* الإجمالي */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800 leading-none">
                      {formatAmount(Number(invoice.total_amount))} <span className="text-[10px] text-slate-400 font-sans">ر.س</span>
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5 text-[10px] font-mono">
                      <span className="text-slate-500">قبل الضريبة: {Number(invoice.subtotal || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                      <span className="text-indigo-600 font-bold">عمولة ({invoice.platform_commission_percent || platformSettings.platform_commission_percent}%): +{Number(invoice.platform_commission || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                      <span className="text-blue-600 font-bold">ضريبة ({invoice.vat_percent || platformSettings.vat_percent}%): +{Number(invoice.tax_amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                  </div>

                  {/* التاريخ */}
                  <div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      {invoice.issued_at ? formatDate(invoice.issued_at) : "—"}
                    </div>
                  </div>

                  {/* PDF Button */}
                  <div className="flex justify-end">
                    <InvoicePDFExport
                      platformSettings={platformSettings}
                      userRole={userRole === "vendor" ? "vendor" : "client"}
                      invoice={{
                        id: invoice.id,
                        invoice_number: invoice.invoice_number,
                        issued_at: invoice.issued_at || "",
                        status: invoice.status,
                        notes: invoice.notes,
                        total_amount: Number(invoice.total_amount || 0),
                        subtotal: Number(invoice.subtotal || 0),
                        platform_commission: Number(invoice.platform_commission || 0),
                        platform_commission_percent: invoice.platform_commission_percent || platformSettings.platform_commission_percent,
                        tax_amount: Number(invoice.tax_amount ?? 0),
                        vat_percent: invoice.vat_percent || platformSettings.vat_percent,
                        delivery_cost: Number(invoice.delivery_cost ?? 0),
                        delivery_days: invoice.delivery_days,
                      }}
                      vendor={{
                        full_name: invoice.vendor_profile?.full_name,
                        company_name: invoice.vendor_profile?.company_name,
                        tax_number: invoice.vendor_profile?.tax_number,
                        commercial_register: invoice.vendor_profile?.commercial_register,
                        national_address: invoice.vendor_profile?.national_address,
                      }}
                      client={{
                        full_name: invoice.client_profile?.full_name,
                        company_name: invoice.client_profile?.company_name,
                        tax_number: invoice.client_profile?.tax_number,
                        commercial_register: invoice.client_profile?.commercial_register,
                        national_address: invoice.client_profile?.national_address,
                      }}
                      order={{
                        id: orderId || invoice.deal_id,
                        car_make: rfq?.car_make,
                        car_model: rfq?.car_model,
                        car_year: rfq?.car_year,
                        plate_number: rfq?.plate_number,
                      }}
                      items={(invoice.invoice_items || []).map((it) => ({
                        part_name: it.part_name,
                        part_number: it.part_number,
                        quantity: it.quantity,
                        unit_price: Number(it.unit_price),
                        line_total: Number(it.line_total),
                      }))}
                      triggerButton={
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors shadow-sm">
                          <Download className="w-3.5 h-3.5" />
                          تحميل PDF
                        </button>
                      }
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
