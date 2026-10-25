"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText, Search, RefreshCw, Download, SlidersHorizontal,
  Calendar, Eye, ChevronRight, CheckCircle2, Clock, AlertTriangle,
  Car, Hash, Building2, User, X, Store, Users, ShieldCheck, Printer
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoicePDFExport } from "@/components/invoice-pdf-export";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";
import { exportAdminInvoicesToExcel, AdminInvoiceExportRow, formatPartsDescriptionText } from "@/lib/excel-export";
import { extractCleanOrderNumber, normalizeInvoiceNumber } from "@/lib/invoice-canonical";

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
  client_platform_fee?: number;
  client_platform_fee_percent?: number;
  vendor_platform_fee?: number;
  vendor_platform_fee_percent?: number;
  platform_commission?: number;
  platform_commission_percent?: number;
  parts_subtotal?: number;
  parts_vat?: number;
  vendor_invoice_total?: number;
  net_payout?: number;
  delivery_fee?: number;
  issued_at: string;
  due_date?: string;
  type: string;
  client: { full_name: string; company_name?: string; ref_code: string; tax_number?: string; phone?: string; national_address?: string } | null;
  vendor: { full_name: string; company_name: string; ref_code: string; tax_number?: string; phone?: string; national_address?: string } | null;
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
  vat_percent?: number;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Date Range Filter (الإطار الزمني)
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);

  // Column Customization with side-by-side Client & Vendor Commissions
  const [columns, setColumns] = useState({
    invNumber: true,
    orderId: true,
    vehicle: true,
    orderDetails: true,
    client: true,
    vendor: true,
    subtotal: false,
    clientCommission: true,
    vendorCommission: true,
    tax: true,
    total: true,
    status: true,
    date: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Interactive PDF / Invoice Preview Modal State
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<Invoice | null>(null);
  const [modalTab, setModalTab] = useState<"client" | "vendor">("client");

  const [platformSettings, setPlatformSettings] = useState({
    vat_percent: 15,
    platform_commission_percent: 15,
    client_platform_fee_percent: 5,
    vendor_platform_fee_percent: 15,
    vat_number: "310987654300003",
    cr_number: "1010789456",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let currentVatPercent = 15;
      let currentClientFeePercent = 5;
      let currentVendorFeePercent = 15;
      try {
        const sRes = await fetch("/api/v1/settings", { cache: "no-store" });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.success && sData.settings) {
            currentVatPercent = Number(sData.settings.vat_percent ?? 15);
            currentClientFeePercent = Number(sData.settings.client_platform_fee_percent ?? 5);
            currentVendorFeePercent = Number(sData.settings.vendor_platform_fee_percent ?? 15);
            setPlatformSettings({
              vat_percent: currentVatPercent,
              platform_commission_percent: currentVendorFeePercent,
              client_platform_fee_percent: currentClientFeePercent,
              vendor_platform_fee_percent: currentVendorFeePercent,
              vat_number: sData.settings.vat_number || "310987654300003",
              cr_number: sData.settings.cr_number || "1010789456",
            });
          }
        }
      } catch (e) {}

      // Try fetching from authoritative invoices API first
      let apiInvoicesMap = new Map<string, any>();
      try {
        const invApiRes = await fetch("/api/v1/invoices?role=admin", {
          headers: { "x-admin-request": "true" },
          cache: "no-store",
        });
        if (invApiRes.ok) {
          const invApiData = await invApiRes.json();
          if (invApiData.success && Array.isArray(invApiData.invoices)) {
            invApiData.invoices.forEach((inv: any) => {
              const k = extractCleanOrderNumber(inv.order_id || inv.id) || inv.invoice_number || inv.id;
              if (k) apiInvoicesMap.set(k, inv);
              if (inv.id) apiInvoicesMap.set(inv.id, inv);
              if (inv.order_id) apiInvoicesMap.set(inv.order_id, inv);
            });
          }
        }
      } catch (e) {
        console.error("Invoices API fetch error:", e);
      }

      // Fetch database invoices and orders
      const [invoicesRes, ordersRes, profilesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select(`
            id, invoice_number, status, total_amount, subtotal, tax_amount, issued_at, due_date, type, client_id, vendor_id, deal_id,
            client:profiles!invoices_client_id_fkey(id, full_name, company_name, ref_code, tax_number, phone),
            vendor:profiles!invoices_vendor_id_fkey(id, full_name, company_name, ref_code, tax_number, phone),
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
            client:profiles!orders_client_id_fkey(id, full_name, company_name, ref_code, tax_number, phone),
            vendor:profiles!orders_vendor_id_fkey(id, full_name, company_name, ref_code, tax_number, phone),
            rfq:rfqs!orders_rfq_id_fkey(id, car_make, car_model, car_year, plate_number, vin, parts_description)
          `)
          .order("created_at", { ascending: false })
          .limit(100),

        supabase.from("profiles").select("id, full_name, company_name, ref_code, tax_number, role, phone"),
      ]);

      const profMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const rawInvoices = (invoicesRes.data || []) as any[];
      const rawOrders = (ordersRes.data || []) as any[];

      const invoiceOrderIds = new Set<string>();
      const normalizedInvoices: Invoice[] = [];

      // Process direct invoice records
      rawInvoices.forEach((inv) => {
        const order = inv.deal?.orders;
        const ordId = order?.id || inv.order_id || inv.id;
        const cleanKey = extractCleanOrderNumber(ordId);
        if (cleanKey) invoiceOrderIds.add(cleanKey);
        if (order?.id) invoiceOrderIds.add(order.id);
        if (inv.order_id) invoiceOrderIds.add(inv.order_id);
        if (inv.id) invoiceOrderIds.add(inv.id);

        const apiMatch = (cleanKey ? apiInvoicesMap.get(cleanKey) : null) || apiInvoicesMap.get(ordId) || apiInvoicesMap.get(inv.id);

        const rfq = order?.rfq || order?.rfqs || inv.rfqs || inv.rfq || apiMatch?.rfq || (inv.vehicle_make ? {
          car_make: inv.vehicle_make,
          car_model: inv.vehicle_model,
          car_year: inv.vehicle_year,
          plate_number: inv.plate_number,
          vin: inv.vin,
          parts_description: inv.parts_summary || inv.parts_description,
        } : null);

        const total = Number(inv.total_amount || apiMatch?.total_amount || 0);
        const vatRate = currentVatPercent / 100;
        const sub = Number(inv.subtotal || apiMatch?.subtotal || (vatRate > 0 ? Math.round((total / (1 + vatRate)) * 100) / 100 : total));
        const partsSubtotal = Number(apiMatch?.parts_subtotal || inv.parts_subtotal || sub);
        const partsVat = Number(apiMatch?.parts_vat || Number((partsSubtotal * vatRate).toFixed(2)));
        const vendorInvoiceTotal = Number(apiMatch?.vendor_invoice_total || Number((partsSubtotal + partsVat).toFixed(2)));

        const clientFeePercent = Number(apiMatch?.client_platform_fee_percent ?? currentClientFeePercent);
        const vendorFeePercent = Number(apiMatch?.vendor_platform_fee_percent ?? currentVendorFeePercent);

        const clientFee = Number(apiMatch?.client_platform_fee || inv.client_platform_fee || 0) > 0
          ? Number(apiMatch?.client_platform_fee || inv.client_platform_fee)
          : (partsSubtotal > 0 ? Number((partsSubtotal * (clientFeePercent / 100)).toFixed(2)) : 0);
        const vendorFee = Number(apiMatch?.vendor_platform_fee || inv.vendor_platform_fee || 0) > 0
          ? Number(apiMatch?.vendor_platform_fee || inv.vendor_platform_fee)
          : (partsSubtotal > 0 ? Number((partsSubtotal * (vendorFeePercent / 100)).toFixed(2)) : 0);
        const netPayout = Number(apiMatch?.net_payout ?? Number((vendorInvoiceTotal - vendorFee).toFixed(2)));
        const tax = Number(inv.tax_amount || apiMatch?.tax_amount || Math.round((total - sub) * 100) / 100);

        normalizedInvoices.push({
          id: inv.id,
          invoice_number: normalizeInvoiceNumber(inv.invoice_number, ordId),
          status: inv.status || "paid",
          total_amount: total,
          subtotal: sub,
          parts_subtotal: partsSubtotal,
          parts_vat: partsVat,
          vendor_invoice_total: vendorInvoiceTotal,
          client_platform_fee: clientFee,
          client_platform_fee_percent: clientFeePercent,
          vendor_platform_fee: vendorFee,
          vendor_platform_fee_percent: vendorFeePercent,
          platform_commission: vendorFee,
          platform_commission_percent: vendorFeePercent,
          net_payout: netPayout,
          tax_amount: tax,
          vat_percent: currentVatPercent,
          delivery_fee: Number(apiMatch?.delivery_fee ?? 0),
          issued_at: inv.issued_at || new Date().toISOString(),
          due_date: inv.due_date,
          type: inv.type || "tax_invoice",
          client: inv.client || (inv.client_id ? profMap.get(inv.client_id) : null) || apiMatch?.client || { full_name: "شركة المشتريات الوطنية", ref_code: "CLI-101" },
          vendor: inv.vendor || (inv.vendor_id ? profMap.get(inv.vendor_id) : null) || apiMatch?.vendor || { full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة", ref_code: "VND-501" },
          deal: {
            order_id: ordId,
            orders: {
              id: ordId,
              rfq: rfq,
            },
          },
          items_summary: rfq?.parts_description ? formatPartsDescriptionText(rfq.parts_description) : (inv.parts_summary || "قطع غيار ومستلزمات صيانة"),
          order_id: order?.id || inv.deal?.order_id || ordId,
        });
      });

      // Ensure every completed/active order has an invoice representation in the view
      rawOrders.forEach((o) => {
        const cleanKey = extractCleanOrderNumber(o.id);
        if (!invoiceOrderIds.has(o.id) && (!cleanKey || !invoiceOrderIds.has(cleanKey))) {
          if (cleanKey) invoiceOrderIds.add(cleanKey);
          invoiceOrderIds.add(o.id);

          const apiMatch = (cleanKey ? apiInvoicesMap.get(cleanKey) : null) || apiInvoicesMap.get(o.id);

          const total = Number(o.total_price || apiMatch?.total_amount || 2850);
          const vatRate = currentVatPercent / 100;
          const sub = Number(apiMatch?.subtotal || (vatRate > 0 ? Math.round((total / (1 + vatRate)) * 100) / 100 : total));
          const partsSubtotal = Number(apiMatch?.parts_subtotal || sub);
          const partsVat = Number(apiMatch?.parts_vat || Number((partsSubtotal * vatRate).toFixed(2)));
          const vendorInvoiceTotal = Number(apiMatch?.vendor_invoice_total || Number((partsSubtotal + partsVat).toFixed(2)));

          const clientFeePercent = Number(apiMatch?.client_platform_fee_percent ?? currentClientFeePercent);
          const vendorFeePercent = Number(apiMatch?.vendor_platform_fee_percent ?? currentVendorFeePercent);

          const clientFee = Number(apiMatch?.client_platform_fee || o.client_platform_fee || 0) > 0
            ? Number(apiMatch?.client_platform_fee || o.client_platform_fee)
            : (partsSubtotal > 0 ? Number((partsSubtotal * (clientFeePercent / 100)).toFixed(2)) : 0);
          const vendorFee = Number(apiMatch?.vendor_platform_fee || o.vendor_platform_fee || 0) > 0
            ? Number(apiMatch?.vendor_platform_fee || o.vendor_platform_fee)
            : (partsSubtotal > 0 ? Number((partsSubtotal * (vendorFeePercent / 100)).toFixed(2)) : 0);
          const netPayout = Number(apiMatch?.net_payout ?? Number((vendorInvoiceTotal - vendorFee).toFixed(2)));
          const tax = Number(apiMatch?.tax_amount || Math.round((total - sub) * 100) / 100);

          const rfq = o.rfq || o.rfqs || apiMatch?.rfq || (o.car_make ? {
            car_make: o.car_make,
            car_model: o.car_model,
            car_year: o.car_year,
            plate_number: o.plate_number,
            vin: o.vin,
            parts_description: o.parts_description,
          } : null);

          normalizedInvoices.push({
            id: `INV-${cleanKey || o.id}`,
            invoice_number: normalizeInvoiceNumber(o.invoice_number, o.id),
            status: o.status === "completed" ? "paid" : o.status === "cancelled" ? "cancelled" : "issued",
            total_amount: total,
            subtotal: sub,
            parts_subtotal: partsSubtotal,
            parts_vat: partsVat,
            vendor_invoice_total: vendorInvoiceTotal,
            client_platform_fee: clientFee,
            client_platform_fee_percent: clientFeePercent,
            vendor_platform_fee: vendorFee,
            vendor_platform_fee_percent: vendorFeePercent,
            platform_commission: vendorFee,
            platform_commission_percent: vendorFeePercent,
            net_payout: netPayout,
            tax_amount: tax,
            vat_percent: currentVatPercent,
            delivery_fee: Number(apiMatch?.delivery_fee ?? 0),
            issued_at: o.created_at || new Date().toISOString(),
            type: "tax_invoice",
            client: o.client || (o.client_id ? profMap.get(o.client_id) : null) || apiMatch?.client || { full_name: "شركة المشتريات الوطنية", ref_code: "CLI-101" },
            vendor: o.vendor || (o.vendor_id ? profMap.get(o.vendor_id) : null) || apiMatch?.vendor || { full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة", ref_code: "VND-501" },
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

      // Final strict deduplication
      const finalAdminInvoices: Invoice[] = [];
      const seenAdminKeys = new Set<string>();
      for (const inv of normalizedInvoices) {
        const key = extractCleanOrderNumber(inv.order_id || inv.id) || inv.invoice_number || inv.id;
        if (key && seenAdminKeys.has(key)) continue;
        if (key) seenAdminKeys.add(key);
        finalAdminInvoices.push(inv);
      }

      setInvoices(finalAdminInvoices);
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

        const clientFee = Number(inv.client_platform_fee || 0);
        const vendorFee = Number(inv.vendor_platform_fee || 0);
        const totalComm = Number((clientFee + vendorFee).toFixed(2));

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
          subtotal: Number(inv.parts_subtotal ?? inv.subtotal ?? 0),
          clientCommission: clientFee,
          vendorCommission: vendorFee,
          platformCommission: totalComm,
          taxAmount: Number(inv.tax_amount || 0),
          totalAmount: Number(inv.total_amount || 0),
          issuedAt: new Date(inv.issued_at).toLocaleDateString("ar-SA"),
        };
      });

      await exportAdminInvoicesToExcel(
        exportRows,
        "فواتير_المنصة_الضريبية_الشاملة",
        platformSettings.vat_percent,
        platformSettings.platform_commission_percent,
        platformSettings.client_platform_fee_percent,
        platformSettings.vendor_platform_fee_percent
      );
    } catch (err) {
      console.error("Export invoices error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatInvoiceForPdf = (inv: Invoice, targetType: "client" | "vendor") => {
    const rawOrderId = inv.order_id || inv.deal?.order_id || inv.id;
    const cleanNum = extractCleanOrderNumber(rawOrderId);
    const ordId = cleanNum ? `ORD-${cleanNum}` : rawOrderId;
    const invNum = normalizeInvoiceNumber(inv.invoice_number, rawOrderId);

    const partsSub = Number(inv.parts_subtotal ?? inv.subtotal ?? 0);
    const vatRate = (inv.vat_percent ?? platformSettings.vat_percent ?? 15) / 100;
    const partsVat = Number(inv.parts_vat ?? Number((partsSub * vatRate).toFixed(2)));
    const vendorTotal = Number(inv.vendor_invoice_total ?? Number((partsSub + partsVat).toFixed(2)));
    const vendorFee = Number(inv.vendor_platform_fee ?? Number((partsSub * ((platformSettings.vendor_platform_fee_percent ?? 15) / 100)).toFixed(2)));
    const netPayout = Number(inv.net_payout ?? Number((vendorTotal - vendorFee).toFixed(2)));

    const clientFee = Number(inv.client_platform_fee ?? Number((partsSub * ((platformSettings.client_platform_fee_percent ?? 5) / 100)).toFixed(2)));
    const deliveryFee = Number(inv.delivery_fee ?? 0);
    const clientTaxable = Number((partsSub + clientFee + deliveryFee).toFixed(2));
    const clientVat = Number((clientTaxable * vatRate).toFixed(2));
    const clientTotal = Number(inv.total_amount ?? (clientTaxable + clientVat).toFixed(2));

    return {
      id: inv.id,
      invoice_number: invNum,
      order_id: ordId,
      created_at: inv.issued_at || new Date().toISOString(),
      issued_at: inv.issued_at || new Date().toISOString(),
      status: inv.status === "completed" ? "paid" : inv.status || "paid",
      type: "tax_invoice",
      total_amount: targetType === "client" ? clientTotal : vendorTotal,
      subtotal: partsSub,
      parts_subtotal: partsSub,
      parts_vat: partsVat,
      vendor_invoice_total: vendorTotal,
      vendor_platform_fee: vendorFee,
      vendor_platform_fee_percent: platformSettings.vendor_platform_fee_percent ?? 15,
      client_platform_fee: clientFee,
      client_platform_fee_percent: platformSettings.client_platform_fee_percent ?? 5,
      platform_commission: targetType === "vendor" ? vendorFee : clientFee,
      platform_commission_percent: targetType === "vendor" ? (platformSettings.vendor_platform_fee_percent ?? 15) : (platformSettings.client_platform_fee_percent ?? 5),
      net_payout: netPayout,
      delivery_fee: deliveryFee,
      tax_amount: targetType === "client" ? clientVat : partsVat,
      vat_percent: platformSettings.vat_percent,
    };
  };

  const formatOrderForPdf = (inv: Invoice) => {
    const rawOrderId = inv.order_id || inv.deal?.order_id || inv.id;
    const cleanNum = extractCleanOrderNumber(rawOrderId);
    const ordId = cleanNum ? `ORD-${cleanNum}` : rawOrderId;
    const rfq = inv.deal?.orders?.rfq;

    return {
      id: ordId,
      car_make: rfq?.car_make || (inv as any).car_make || (inv as any).vehicle_make || "غير محدد",
      car_model: rfq?.car_model || (inv as any).car_model || (inv as any).vehicle_model || "",
      car_year: rfq?.car_year || (inv as any).car_year || (inv as any).vehicle_year || 2023,
      plate_number: rfq?.plate_number || (inv as any).plate_number || "—",
      vin: rfq?.vin || (inv as any).vin || "—",
      parts_subtotal: Number(inv.parts_subtotal ?? inv.subtotal ?? 0),
      client_platform_fee: Number(inv.client_platform_fee ?? 0),
      client_platform_fee_percent: platformSettings.client_platform_fee_percent ?? 5,
      vendor_platform_fee: Number(inv.vendor_platform_fee ?? 0),
      vendor_platform_fee_percent: platformSettings.vendor_platform_fee_percent ?? 15,
      delivery_fee: Number(inv.delivery_fee ?? 0),
    };
  };

  const formatItemsForPdf = (inv: Invoice) => {
    if (inv.parts_items && inv.parts_items.length > 0) return inv.parts_items;
    const rfq = inv.deal?.orders?.rfq;
    const desc = inv.items_summary || (rfq?.parts_description ? formatPartsDescriptionText(rfq.parts_description) : "قطع غيار ومستلزمات صيانة");
    const sub = Number(inv.parts_subtotal ?? inv.subtotal ?? 0);
    return [
      {
        part_name: desc,
        part_number: rfq?.plate_number ? `لوحة: ${rfq.plate_number}` : "SP-PART",
        quantity: 1,
        unit_price: sub,
        line_total: sub,
      },
    ];
  };

  const summary = useMemo(() => {
    const totalCount = filtered.length;
    const subtotalTotal = filtered.reduce((s, i) => s + Number(i.parts_subtotal ?? i.subtotal ?? 0), 0);
    const clientCommissionTotal = filtered.reduce((s, i) => s + Number(i.client_platform_fee || 0), 0);
    const vendorCommissionTotal = filtered.reduce((s, i) => s + Number(i.vendor_platform_fee || 0), 0);
    const commissionTotal = clientCommissionTotal + vendorCommissionTotal;
    const vatTotal = filtered.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
    const grandTotal = filtered.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    return {
      totalCount,
      subtotalTotal,
      clientCommissionTotal,
      vendorCommissionTotal,
      commissionTotal,
      vatTotal,
      grandTotal
    };
  }, [filtered]);

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

      {/* ── 1.5. Financial KPI Metrics with Side-by-Side Client & Vendor Commissions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Invoices */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-500">إجمالي الفواتير الصادرة</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">فاتورة معتمدة</p>
        </div>

        {/* Subtotal */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-500">المبيعات قبل الضريبة</p>
          <p className="text-2xl font-black text-slate-800 mt-1 font-mono">
            {summary.subtotalTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">ريال سعودي</p>
        </div>

        {/* Client Platform Fees */}
        <div className="bg-white p-5 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/40 shadow-xs">
          <p className="text-xs font-bold text-blue-700">عمولة العميل ({platformSettings.client_platform_fee_percent}%)</p>
          <p className="text-2xl font-black text-blue-900 mt-1 font-mono">
            {summary.clientCommissionTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-blue-600 mt-1">رسوم المنصة من المشتري</p>
        </div>

        {/* Vendor Platform Fees */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-xs">
          <p className="text-xs font-bold text-emerald-700">عمولة المورد ({platformSettings.vendor_platform_fee_percent}%)</p>
          <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">
            {summary.vendorCommissionTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-600 mt-1">نسبة المنصة المقتطعة</p>
        </div>

        {/* VAT Amount */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/40 shadow-xs">
          <p className="text-xs font-bold text-amber-800">ضريبة ZATCA ({platformSettings.vat_percent}%)</p>
          <p className="text-2xl font-black text-amber-900 mt-1 font-mono">
            {summary.vatTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-amber-600 mt-1">ريال سعودي</p>
        </div>

        {/* Total Grand Revenue Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-900 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md sm:col-span-2 lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-emerald-400">إجمالي المبالغ المفوترة شامل الضريبة</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              إجمالي عمولات المنصة المحصلة من العملاء والموردين:{" "}
              <span className="font-bold font-mono text-emerald-300">{summary.commissionTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
            </p>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            {summary.grandTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-400">ر.س</span>
          </p>
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
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 space-y-2 text-xs font-bold text-slate-700">
                  <p className="text-[11px] text-slate-400 font-bold border-b border-slate-100 pb-1.5">إظهار / إخفاء الأعمدة</p>
                  {[
                    { key: "invNumber" as const, label: "رقم الفاتورة" },
                    { key: "orderId" as const, label: "رقم الطلب" },
                    { key: "vehicle" as const, label: "بيانات المركبة واللوحة" },
                    { key: "orderDetails" as const, label: "تفاصيل الطلب والقطع" },
                    { key: "client" as const, label: "العميل" },
                    { key: "vendor" as const, label: "المورد" },
                    { key: "subtotal" as const, label: "قبل الضريبة والعمولة" },
                    { key: "clientCommission" as const, label: `عمولة العميل (${platformSettings.client_platform_fee_percent}%)` },
                    { key: "vendorCommission" as const, label: `عمولة المورد (${platformSettings.vendor_platform_fee_percent}%)` },
                    { key: "tax" as const, label: `ضريبة القيمة المضافة (${platformSettings.vat_percent}%)` },
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

      {/* ── 3. Invoices Table with Dual Commission Columns and Activated PDF Column ── */}
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
                {columns.subtotal && <th className="py-4 px-3 text-center">قبل الضريبة</th>}
                {columns.clientCommission && (
                  <th className="py-4 px-3 text-center text-blue-700 bg-blue-50/50">
                    عمولة العميل ({platformSettings.client_platform_fee_percent}%)
                  </th>
                )}
                {columns.vendorCommission && (
                  <th className="py-4 px-3 text-center text-emerald-700 bg-emerald-50/50">
                    عمولة المورد ({platformSettings.vendor_platform_fee_percent}%)
                  </th>
                )}
                {columns.tax && <th className="py-4 px-3 text-center">ضريبة ZATCA ({platformSettings.vat_percent}%)</th>}
                {columns.total && <th className="py-4 px-4 text-center">الإجمالي الكلي</th>}
                {columns.status && <th className="py-4 px-4 text-center">الحالة</th>}
                {columns.date && <th className="py-4 px-4 text-center">التاريخ</th>}
                <th className="py-4 px-4 text-center min-w-[220px]">الفواتير وإصدار PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={14} className="py-4 px-5">
                      <div className="h-4 bg-slate-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-400 font-bold">
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

                      {columns.subtotal && (
                        <td className="py-4 px-3 text-center font-mono font-semibold text-slate-700">
                          {Number(inv.parts_subtotal ?? inv.subtotal ?? 0).toLocaleString("ar-SA")}{" "}
                          <span className="text-[10px] text-slate-400 font-sans">ر.س</span>
                        </td>
                      )}

                      {/* Client Commission (عمولة العميل) */}
                      {columns.clientCommission && (
                        <td className="py-4 px-3 text-center font-mono font-bold text-blue-700 bg-blue-50/30">
                          {Number(inv.client_platform_fee || 0).toLocaleString("ar-SA")}{" "}
                          <span className="text-[10px] text-blue-500 font-sans">ر.س</span>
                        </td>
                      )}

                      {/* Vendor Commission (عمولة المورد) */}
                      {columns.vendorCommission && (
                        <td className="py-4 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {Number(inv.vendor_platform_fee || 0).toLocaleString("ar-SA")}{" "}
                          <span className="text-[10px] text-emerald-500 font-sans">ر.س</span>
                        </td>
                      )}

                      {columns.tax && (
                        <td className="py-4 px-3 text-center font-mono font-bold text-amber-700 bg-amber-50/40">
                          {Number(inv.tax_amount || 0).toLocaleString("ar-SA")}{" "}
                          <span className="text-[10px] text-amber-500 font-sans">ر.س</span>
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

                      {/* Activated PDF Column with Dual Actions & Preview */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Live Preview Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceModal(inv);
                              setModalTab("client");
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="معاينة تفاصيل الفاتورة الضريبية"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Client Invoice PDF Button */}
                          <InvoicePDFExport
                            platformSettings={platformSettings}
                            invoiceType="client"
                            userRole="client"
                            invoice={formatInvoiceForPdf(inv, "client")}
                            vendor={inv.vendor || undefined}
                            client={inv.client || undefined}
                            order={formatOrderForPdf(inv)}
                            items={formatItemsForPdf(inv)}
                            triggerButton={
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition-all cursor-pointer shadow-xs"
                                title="عرض وتحميل فاتورة العميل الضريبية (PDF)"
                              >
                                <FileText className="w-3 h-3 text-blue-600" />
                                <span>فاتورة العميل</span>
                              </button>
                            }
                          />

                          {/* Vendor Invoice PDF Button */}
                          <InvoicePDFExport
                            platformSettings={platformSettings}
                            invoiceType="vendor"
                            userRole="vendor"
                            invoice={formatInvoiceForPdf(inv, "vendor")}
                            vendor={inv.vendor || undefined}
                            client={inv.client || undefined}
                            order={formatOrderForPdf(inv)}
                            items={formatItemsForPdf(inv)}
                            triggerButton={
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-all cursor-pointer shadow-xs"
                                title="عرض وتحميل فاتورة المورد الضريبية (PDF)"
                              >
                                <FileText className="w-3 h-3 text-emerald-600" />
                                <span>فاتورة المورد</span>
                              </button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Interactive Live Invoice Preview Modal (ZATCA Dual Client/Vendor) ── */}
      {selectedInvoiceModal && (
        <Dialog open={Boolean(selectedInvoiceModal)} onOpenChange={(open) => !open && setSelectedInvoiceModal(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6" dir="rtl">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>معاينة الفاتورة الضريبية</span>
                  <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {selectedInvoiceModal.invoice_number}
                  </span>
                </DialogTitle>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${STATUS[selectedInvoiceModal.status]?.cls || "bg-slate-100"}`}>
                  {STATUS[selectedInvoiceModal.status]?.label || selectedInvoiceModal.status}
                </span>
              </div>

              {/* Tab Switcher: Client vs Vendor Invoice */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalTab("client")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                    modalTab === "client"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>فاتورة العميل الضريبية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("vendor")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                    modalTab === "vendor"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>فاتورة المورد الضريبية</span>
                </button>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Top Banner */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                modalTab === "client" ? "bg-blue-50/70 border-blue-200 text-blue-900" : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-current" />
                  <div>
                    <p className="font-black text-sm">
                      {modalTab === "client" ? "فاتورة ضريبية للعميل (ZATCA معتمدة)" : "فاتورة ضريبية للمورد ومستخلص المبيعات"}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {modalTab === "client"
                        ? "تشمل قطع الغيار، أجور التوصيل، رسوم المنصة (%5)، وضريبة القيمة المضافة 15%"
                        : "تشمل مبيعات قطع الغيار وضريبتها مع بيان صافي المستحق بعد حسم عمولة المنصة (%15)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parties Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 text-[11px]">
                    {modalTab === "client" ? "الطرف البائع (المنصة المعتمدة)" : "الطرف البائع (المورد المعتمد)"}
                  </p>
                  <p className="font-black text-slate-900 text-sm">
                    {modalTab === "client"
                      ? "منصة رفق لقطع الغيار والصيانة"
                      : (selectedInvoiceModal.vendor?.company_name || selectedInvoiceModal.vendor?.full_name || "مؤسسة قطع الغيار المعتمدة")}
                  </p>
                  <p className="text-slate-600 font-mono text-[11px]">
                    الرقم الضريبي: {modalTab === "client" ? platformSettings.vat_number : (selectedInvoiceModal.vendor?.tax_number || "300123456700003")}
                  </p>
                  <p className="text-slate-600 font-mono text-[11px]">
                    السجل التجاري: {modalTab === "client" ? platformSettings.cr_number : "1010987654"}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 text-[11px]">الطرف المشتري (العميل)</p>
                  <p className="font-black text-slate-900 text-sm">
                    {selectedInvoiceModal.client?.company_name || selectedInvoiceModal.client?.full_name || "شركة المشتريات الوطنية"}
                  </p>
                  <p className="text-slate-600 font-mono text-[11px]">
                    الرقم الضريبي: {selectedInvoiceModal.client?.tax_number || "310123456700003"}
                  </p>
                  {selectedInvoiceModal.client?.phone && (
                    <p className="text-slate-600 font-mono text-[11px]">
                      الهاتف: {selectedInvoiceModal.client.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Vehicle & Items Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-700">بيانات المركبة والطلب:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">المركبة:</span>
                    <span className="font-bold text-slate-800">
                      {selectedInvoiceModal.deal?.orders?.rfq?.car_make || "فورد"} {selectedInvoiceModal.deal?.orders?.rfq?.car_model || "توروس"} {selectedInvoiceModal.deal?.orders?.rfq?.car_year || 2023}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">رقم اللوحة:</span>
                    <span className="font-bold font-mono text-slate-800">
                      {selectedInvoiceModal.deal?.orders?.rfq?.plate_number || "ص ض ط 3344"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">رقم الطلب:</span>
                    <span className="font-bold font-mono text-blue-700">
                      {selectedInvoiceModal.order_id || selectedInvoiceModal.deal?.order_id || "ORD-001"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">تاريخ الإصدار:</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedInvoiceModal.issued_at).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <p className="text-slate-500 text-[11px]">تفاصيل البنود والقطع:</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedInvoiceModal.items_summary || "قطع غيار ومستلزمات صيانة معتمدة"}
                  </p>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي للقطع (قبل الضريبة):</span>
                  <span className="font-mono font-bold">{Number(selectedInvoiceModal.parts_subtotal ?? selectedInvoiceModal.subtotal ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                </div>

                {modalTab === "client" ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>أجور التوصيل والشحن:</span>
                      <span className="font-mono font-bold">{Number(selectedInvoiceModal.delivery_fee || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <div className="flex justify-between text-blue-700 bg-blue-50/60 p-1.5 rounded-lg font-bold">
                      <span>رسوم المنصة للعميل ({selectedInvoiceModal.client_platform_fee_percent || platformSettings.client_platform_fee_percent}%):</span>
                      <span className="font-mono">+{Number(selectedInvoiceModal.client_platform_fee || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <div className="flex justify-between text-amber-800">
                      <span>ضريبة القيمة المضافة ({selectedInvoiceModal.vat_percent || platformSettings.vat_percent}%):</span>
                      <span className="font-mono font-bold">+{Number(selectedInvoiceModal.tax_amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2 mt-1">
                      <span>الإجمالي المستحق على العميل:</span>
                      <span className="font-mono text-blue-700">{Number(selectedInvoiceModal.total_amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-amber-800">
                      <span>ضريبة القيمة المضافة للقطع ({selectedInvoiceModal.vat_percent || platformSettings.vat_percent}%):</span>
                      <span className="font-mono font-bold">+{Number(selectedInvoiceModal.parts_vat || (Number(selectedInvoiceModal.parts_subtotal ?? selectedInvoiceModal.subtotal ?? 0) * 0.15)).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <div className="flex justify-between text-slate-800 font-bold border-t border-slate-100 pt-1.5">
                      <span>إجمالي مبيعات المورد شامل الضريبة:</span>
                      <span className="font-mono">{Number(selectedInvoiceModal.vendor_invoice_total || (Number(selectedInvoiceModal.parts_subtotal ?? selectedInvoiceModal.subtotal ?? 0) * 1.15)).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <div className="flex justify-between text-red-700 bg-red-50/60 p-1.5 rounded-lg font-bold">
                      <span>عمولة المنصة المقتطعة ({selectedInvoiceModal.vendor_platform_fee_percent || platformSettings.vendor_platform_fee_percent}%):</span>
                      <span className="font-mono">-{Number(selectedInvoiceModal.vendor_platform_fee || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 mt-2">
                      <span>صافي المستحق للمورد (Net Payout):</span>
                      <span className="font-mono">{Number(selectedInvoiceModal.net_payout || ((Number(selectedInvoiceModal.vendor_invoice_total || 0)) - Number(selectedInvoiceModal.vendor_platform_fee || 0))).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons in Modal Footer */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  إغلاق النافذة
                </button>

                <div className="flex items-center gap-2">
                  <InvoicePDFExport
                    platformSettings={platformSettings}
                    invoiceType={modalTab}
                    userRole={modalTab}
                    invoice={formatInvoiceForPdf(selectedInvoiceModal, modalTab)}
                    vendor={selectedInvoiceModal.vendor || undefined}
                    client={selectedInvoiceModal.client || undefined}
                    order={formatOrderForPdf(selectedInvoiceModal)}
                    items={formatItemsForPdf(selectedInvoiceModal)}
                    triggerButton={
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black shadow-md cursor-pointer transition-all ${
                          modalTab === "client" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        <Printer className="w-4 h-4" />
                        <span>تحميل {modalTab === "client" ? "فاتورة العميل (PDF)" : "فاتورة المورد (PDF)"}</span>
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
