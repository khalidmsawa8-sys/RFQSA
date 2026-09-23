"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Download,
  Car,
  FileText,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowUpDown,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  ShieldCheck,
  X,
} from "lucide-react";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";
import { normalizeInvoiceNumber } from "@/lib/invoice-canonical";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";

/* ── Types ── */
interface ClientInvoice {
  id: string;
  invoice_number: string;
  order_id: string;
  status: string;
  total_amount: number;
  tax_amount: number;
  subtotal: number;
  issued_at: string;
  created_at: string;
  notes: string | null;
  deal_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number | string;
  plate_number?: string;
  vin?: string;
  parts_summary: string;
  parts_items?: Array<{ name: string; qty: number; partNumber?: string }>;
  vendor_name: string;
  vendor_phone?: string;
  deals: {
    order_id: string;
    client_id: string;
    vendor_id: string;
    orders: {
      id: string;
      rfq_id: string;
      total_price?: number;
      parts_description?: string;
      rfqs: {
        id?: string;
        car_make: string;
        car_model: string;
        car_year: number;
        vin?: string;
        plate_number?: string;
        parts_description?: string;
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
  client_profile?: { full_name: string; company_name: string; phone: string; tax_number?: string; commercial_register?: string; national_address?: string } | null;
  vendor_profile?: { full_name: string; company_name: string; phone: string; tax_number?: string; commercial_register?: string; national_address?: string } | null;
  delivery_cost?: number;
}

const statusConfig: Record<string, { label: string; badge: string; icon: any }> = {
  paid: { label: "مدفوعة", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  completed: { label: "معتمدة", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending: { label: "معلقة", badge: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  overdue: { label: "متأخرة", badge: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertCircle },
  cancelled: { label: "ملغاة", badge: "bg-gray-100 text-gray-700 border-gray-200", icon: AlertCircle },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`;
};

export default function ClientInvoicesPage() {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "all",
    startDate: null,
    endDate: null,
  });
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Column Visibility Customization
  const [columns, setColumns] = useState({
    invoiceNumber: true,
    orderNumber: true,
    vehicleInfo: true,
    total: true,
    date: true,
    details: true,
    status: true,
    actions: true,
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      // Fetch Client Profile
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("full_name, company_name, phone, tax_number, commercial_register, national_address")
        .eq("id", user.id)
        .maybeSingle();

      const combinedOrders: any[] = [];
      const seenIds = new Set<string>();

      // 1. Fetch live authoritative orders from server API first
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

      // 2. Fetch Orders for this client from Supabase / localStorage
      try {
        const { data: ordersData } = await supabase
          .from("orders")
          .select(`
            id,
            rfq_id,
            total_price,
            status,
            created_at,
            parts_description,
            rfqs(
              id,
              car_make,
              car_model,
              car_year,
              plate_number,
              vin,
              parts_description,
              delivery_location
            ),
            vendor:profiles!orders_vendor_id_fkey(
              id,
              full_name,
              company_name,
              phone,
              tax_number,
              commercial_register,
              national_address
            ),
            deals(id, status)
          `)
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

      // 3. Fallback to deals
      try {
        const { data: dealsData } = await supabase
          .from("deals")
          .select("*");
        if (dealsData && Array.isArray(dealsData)) {
          dealsData.forEach((d: any) => {
            const ord = d.orders || d;
            const ordId = d.order_id || ord.id;
            if (ordId && !seenIds.has(ordId)) {
              seenIds.add(ordId);
              combinedOrders.push({
                ...ord,
                deal_id: d.id,
                deal_order_id: d.order_id,
              });
            }
          });
        }
      } catch (e) {}

      // Filter for this client (allow all if client-demo-id)
      const filteredRaw = combinedOrders.filter((ord: any) => {
        if (!ord) return false;
        if (!ord.client_id || ord.client_id === "client-demo-id" || user.id === "client-demo-id") return true;
        return ord.client_id === user.id || ord.deals?.some((d: any) => d.client_id === user.id);
      });

      // Sort newest first
      filteredRaw.sort((a, b) => {
        const tA = new Date(a.created_at || a.issued_at || 0).getTime();
        const tB = new Date(b.created_at || b.issued_at || 0).getTime();
        return tB - tA;
      });

      // Map into structured ClientInvoice items
      const mapped: ClientInvoice[] = filteredRaw.map((ord: any, idx: number) => {
        const rfq = ord.rfqs || ord.rfq;
        const vendor = ord.vendor || ord.profiles;
        const total = Number(ord.total_amount || ord.total_price || 0);
        const tax = total * (15 / 115);
        const subtotal = total - tax;
        const rawOrderId = ord.order_id || ord.deal_order_id || ord.id || `ORD-${idx + 1}`;
        const cleanOrderId = String(rawOrderId).replace(/^ORD-/, "").slice(0, 8).toUpperCase();
        const invNum = normalizeInvoiceNumber(ord.invoice_number, rawOrderId);
        const issuedAt = ord.issued_at || ord.created_at || new Date(Date.now() - (idx * 24 + 12) * 3600 * 1000).toISOString();

        // Extract parts description
        let partsText = "قطع غيار معتمدة";
        let parsedItems: any[] = [];
        try {
          const rawParts = ord.parts_description || rfq?.parts_description;
          const parsed = typeof rawParts === "string" ? JSON.parse(rawParts) : rawParts;
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedItems = parsed;
            const names = parsed.map((p: any) => p.partName || p.part_name || p.name || p.title).filter(Boolean);
            if (names.length > 0) {
              partsText = names.join("، ");
            }
          }
        } catch (e) {}

        if (partsText === "قطع غيار معتمدة" && (rfq?.car_make || ord.car_make)) {
          const make = rfq?.car_make || ord.car_make;
          const model = rfq?.car_model || ord.car_model || "";
          partsText = `قطع غيار صيانة معتمدة لـ ${make} ${model}`.trim();
        }

        const vendorName = vendor?.company_name || vendor?.full_name || "مؤسسة قطع الغيار المعتمدة";

        const mappedPartsItems = parsedItems.map((p: any) => ({
          name: p.partName || p.part_name || p.name || "قطعة غيار معتمدة",
          qty: Number(p.quantity || 1),
          partNumber: p.partNumber || p.part_number,
        }));

        const invoiceItems = (ord.invoice_items && ord.invoice_items.length > 0)
          ? ord.invoice_items
          : (parsedItems.length > 0
              ? parsedItems.map((p: any, pIdx: number) => ({
                  id: `item-${pIdx}`,
                  part_name: p.partName || p.part_name || p.name || "قطعة غيار معتمدة",
                  part_number: p.partNumber || p.part_number || "OEM-GENUINE",
                  quantity: Number(p.quantity || 1),
                  unit_price: Number(p.unit_price || p.price || Math.round(subtotal / (parsedItems.length || 1))),
                  line_total: Number(p.line_total || (p.quantity || 1) * (p.unit_price || p.price || Math.round(subtotal / (parsedItems.length || 1)))),
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
          status: ord.status === "cancelled" ? "cancelled" : "paid",
          total_amount: total,
          tax_amount: tax,
          subtotal: subtotal,
          issued_at: issuedAt,
          created_at: ord.created_at || issuedAt,
          notes: ord.notes || null,
          deal_id: ord.deals?.[0]?.id || ord.deal_id || ord.id,
          vehicle_make: rfq?.car_make || ord.car_make || "غير محدد",
          vehicle_model: rfq?.car_model || ord.car_model || "",
          vehicle_year: rfq?.car_year || ord.car_year || "—",
          plate_number: rfq?.plate_number || ord.plate_number || "—",
          vin: rfq?.vin || ord.vin || "—",
          parts_summary: partsText,
          parts_items: mappedPartsItems,
          vendor_name: vendorName,
          vendor_phone: vendor?.phone,
          deals: {
            order_id: cleanOrderId,
            client_id: user.id,
            vendor_id: vendor?.id || "vendor-demo-id",
            orders: {
              id: ord.id,
              rfq_id: ord.rfq_id || rfq?.id,
              total_price: total,
              parts_description: ord.parts_description,
              rfqs: rfq ? {
                car_make: rfq.car_make,
                car_model: rfq.car_model,
                car_year: rfq.car_year,
                vin: rfq.vin,
                plate_number: rfq.plate_number,
                parts_description: rfq.parts_description,
              } : null,
            },
          },
          invoice_items: invoiceItems,
          client_profile: clientProfile || {
            full_name: user.user_metadata?.full_name || "شركة المشتريات الوطنية",
            company_name: user.user_metadata?.company_name || "شركة المشتريات الوطنية",
            phone: "0501234567",
            tax_number: "300123456700003",
            commercial_register: "1010987654",
            national_address: "الرياض - طريق الملك فهد - حي العليا",
          },
          vendor_profile: vendor || {
            full_name: "مؤسسة قطع الغيار المعتمدة",
            company_name: "مؤسسة قطع الغيار المعتمدة",
            phone: "0551122334",
            tax_number: "300987654300003",
            commercial_register: "1010887766",
            national_address: "الرياض - صناعية الشفاء - طريق خريص",
          },
        };
      });

      setInvoices(mapped);
    } catch (e) {
      console.error("Error fetching client invoices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;

      // Date range filter
      if (dateRange && (dateRange.startDate || dateRange.endDate)) {
        const invDate = new Date(inv.issued_at || inv.created_at).getTime();
        if (dateRange.startDate) {
          const s = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
          if (invDate < s) return false;
        }
        if (dateRange.endDate) {
          const e = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
          if (invDate > e) return false;
        }
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const num = (inv.invoice_number || "").toLowerCase();
        const ordId = (inv.order_id || inv.deals?.order_id || "").toLowerCase();
        const car = `${inv.vehicle_make || ""} ${inv.vehicle_model || ""}`.toLowerCase();
        const plate = (inv.plate_number || "").toLowerCase();
        const parts = (inv.parts_summary || "").toLowerCase();
        const vendor = (inv.vendor_name || "").toLowerCase();
        return (
          num.includes(q) ||
          ordId.includes(q) ||
          car.includes(q) ||
          plate.includes(q) ||
          parts.includes(q) ||
          vendor.includes(q)
        );
      }

      return true;
    });
  }, [invoices, statusFilter, dateRange, search]);

  // Export to Excel
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const headers = [
        "رقم الفاتورة",
        "رقم الطلب",
        "بيانات المركبة",
        "رقم اللوحة",
        "تفاصيل الطلب",
        "المورد",
        "المبلغ قبل الضريبة (ر.س)",
        "ضريبة القيمة المضافة 15% (ر.س)",
        "الإجمالي شامل الضريبة (ر.س)",
        "تاريخ الإصدار",
        "الحالة",
      ];

      const rows = filteredInvoices.map((inv) => {
        const car = `${inv.vehicle_make} ${inv.vehicle_model} ${inv.vehicle_year}`.trim() || "غير محدد";
        const plate = inv.plate_number || "-";
        const statusLabel = statusConfig[inv.status]?.label || inv.status;

        return [
          inv.invoice_number,
          inv.order_id ? `#ORD-${inv.order_id}` : "-",
          car,
          plate,
          inv.parts_summary || "قطع غيار معتمدة",
          inv.vendor_name || "مؤسسة قطع الغيار المعتمدة",
          inv.subtotal || 0,
          inv.tax_amount || 0,
          inv.total_amount || 0,
          fmtDate(inv.issued_at),
          statusLabel,
        ];
      });

      const csvContent =
        "\uFEFF" +
        [headers.join(","), ...rows.map((row) => row.map((val) => `"${val}"`).join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `فواتير_العميل_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تصدير الفواتير");
    } finally {
      setIsExporting(false);
    }
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const totalCount = filteredInvoices.length;
    const grandTotal = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const paidCount = filteredInvoices.filter((i) => i.status === "paid" || i.status === "completed").length;
    return { totalCount, grandTotal, paidCount };
  }, [filteredInvoices]);

  return (
    <div className="space-y-6 pb-16 text-slate-900 font-sans w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">سجل الفواتير الضريبية</h1>
              <p className="text-xs text-gray-500 mt-0.5">استعراض وتنزيل الفواتير الضريبية المعتمدة لجميع طلباتك</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            disabled={loading}
            className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          {/* Export to Excel */}
          <Button
            onClick={handleExportExcel}
            disabled={filteredInvoices.length === 0 || isExporting}
            size="sm"
            className="rounded-xl bg-[#0F4C5C] hover:bg-[#0c3c49] text-white text-xs font-bold gap-1.5 shadow-xs h-9"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تصدير Excel</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-xs text-gray-500 font-medium">إجمالي عدد الفواتير</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{summary.totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-xs text-gray-500 font-medium">مجموع المبالغ المفوترة</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">
            {fmt(summary.grandTotal)} <span className="text-xs font-bold text-gray-500">ر.س</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-xs text-gray-500 font-medium">الفواتير المدفوعة</p>
          <p className="text-2xl font-black text-teal-800 mt-1">{summary.paidCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة، رقم الطلب، تفاصيل القطع، أو بيانات المركبة..."
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

        {/* Filter actions: DateRangeFilter + Column Customization + Reset */}
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
                checked={columns.invoiceNumber}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, invoiceNumber: !!c }))}
              >
                رقم الفاتورة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.orderNumber}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, orderNumber: !!c }))}
              >
                رقم الطلب
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.vehicleInfo}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, vehicleInfo: !!c }))}
              >
                بيانات المركبة واللوحة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.total}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, total: !!c }))}
              >
                الإجمالي شامل الضريبة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.date}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, date: !!c }))}
              >
                تاريخ الإصدار
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.details}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, details: !!c }))}
              >
                تفاصيل الطلب
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.status}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, status: !!c }))}
              >
                الحالة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columns.actions}
                onCheckedChange={(c) => setColumns((p) => ({ ...p, actions: !!c }))}
              >
                طباعة / PDF
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Filters */}
          {(dateRange.startDate || dateRange.endDate || search || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange({ preset: "all", startDate: null, endDate: null });
                setSearch("");
                setStatusFilter("all");
              }}
              className="text-xs text-rose-600 hover:bg-rose-50 h-10 px-2 rounded-xl"
              title="تفريغ الفلاتر"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
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
                  {columns.invoiceNumber && <th className="py-3.5 px-4 font-extrabold">رقم الفاتورة</th>}
                  {columns.orderNumber && <th className="py-3.5 px-4 font-extrabold">رقم الطلب</th>}
                  {columns.vehicleInfo && <th className="py-3.5 px-4 font-extrabold">بيانات المركبة واللوحة</th>}
                  {columns.total && <th className="py-3.5 px-4 font-extrabold text-center">الإجمالي شامل الضريبة</th>}
                  {columns.date && <th className="py-3.5 px-4 font-extrabold">تاريخ الإصدار</th>}
                  {columns.details && <th className="py-3.5 px-4 font-extrabold">تفاصيل الطلب</th>}
                  {columns.status && <th className="py-3.5 px-4 font-extrabold text-center">الحالة</th>}
                  {columns.actions && <th className="py-3.5 px-4 font-extrabold text-center">طباعة / PDF</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const st = statusConfig[inv.status] || statusConfig.paid;
                  const StatusIcon = st.icon;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Invoice Number */}
                      {columns.invoiceNumber && (
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

                      {/* 2. Order Number */}
                      {columns.orderNumber && (
                        <td className="py-4 px-4 font-mono font-bold text-blue-700">
                          {inv.order_id ? (
                            <Link
                              href={`/deal/${inv.order_id}`}
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              <span>#ORD-{inv.order_id}</span>
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}

                      {/* 3. Vehicle Info */}
                      {columns.vehicleInfo && (
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {inv.vehicle_make} {inv.vehicle_model} {inv.vehicle_year}
                              </p>
                              {inv.plate_number && inv.plate_number !== "—" && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  اللوحة: {inv.plate_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* 4. Total Amount */}
                      {columns.total && (
                        <td className="py-4 px-4 text-center">
                          <span className="font-mono font-black text-emerald-800 text-sm">
                            {fmt(inv.total_amount)} ر.س
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            (الضريبة: {fmt(inv.tax_amount)} ر.س)
                          </span>
                        </td>
                      )}

                      {/* 5. Date */}
                      {columns.date && (
                        <td className="py-4 px-4 font-mono text-slate-500">
                          {fmtDate(inv.issued_at)}
                        </td>
                      )}

                      {/* 6. Details (تفاصيل الطلب والقطع) */}
                      {columns.details && (
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
                            <span className="text-[10px] text-slate-500 block pt-0.5">المورد: {inv.vendor_name}</span>
                          </div>
                        </td>
                      )}

                      {/* 7. Status */}
                      {columns.status && (
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${st.badge}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{st.label}</span>
                          </span>
                        </td>
                      )}

                      {/* 8. Actions */}
                      {columns.actions && (
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

                            {/* Download PDF Component */}
                            <InvoicePDFExport
                              invoice={inv}
                              vendor={inv.vendor_profile || { company_name: inv.vendor_name }}
                              client={inv.client_profile || undefined}
                              order={{
                                id: inv.order_id,
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                <p className="text-xs text-gray-500 mt-0.5">تاريخ الإصدار: {fmtDate(selectedInvoice.issued_at)}</p>
              </div>
            </SheetHeader>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Vehicle & Order details */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-2">
                <p className="font-bold text-gray-700">بيانات الطلب والمركبة:</p>
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
                    <span className="text-gray-400">رقم الهيكل (VIN): </span>
                    <span className="font-mono text-[10px]">{selectedInvoice.vin || "-"}</span>
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
              {selectedInvoice.vendor_profile && (
                <div className="text-[11px] text-gray-500 border-t border-gray-100 pt-3 space-y-1">
                  <p className="font-bold text-gray-700">المورد المعتمد:</p>
                  <p>{selectedInvoice.vendor_profile.company_name || selectedInvoice.vendor_profile.full_name}</p>
                  {selectedInvoice.vendor_profile.tax_number && (
                    <p>الرقم الضريبي للمورد: {selectedInvoice.vendor_profile.tax_number}</p>
                  )}
                  {selectedInvoice.vendor_profile.national_address && (
                    <p>العنوان الوطني للمورد: {selectedInvoice.vendor_profile.national_address}</p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <InvoicePDFExport
                  invoice={selectedInvoice}
                  vendor={selectedInvoice.vendor_profile || { company_name: selectedInvoice.vendor_name }}
                  client={selectedInvoice.client_profile || undefined}
                  order={{
                    id: selectedInvoice.order_id,
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
