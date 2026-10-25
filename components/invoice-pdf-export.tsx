"use client";

import React, { useState } from "react";
import { Download, FileText, CheckCircle2, ChevronDown, Printer } from "lucide-react";
import QRCode from "qrcode";
import { normalizeInvoiceNumber } from "@/lib/invoice-canonical";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/* ── Types ──────────────────────────────────────────────── */
export interface InvoiceItem {
  part_name: string;
  part_number?: string;
  condition?: string; // أصلي / تجاري / تشليح
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface InvoicePDFProps {
  invoice: any;
  invoiceType?: "vendor" | "client" | "auto";
  vendor?: {
    full_name?: string;
    company_name?: string;
    tax_number?: string;
    commercial_register?: string;
    national_address?: string;
    phone?: string;
    email?: string;
    id?: string;
  };
  client?: {
    full_name?: string;
    company_name?: string;
    tax_number?: string;
    commercial_register?: string;
    national_address?: string;
    phone?: string;
    city?: string;
    id?: string;
  };
  order?: {
    id: string;
    parts_subtotal?: number;
    client_platform_fee?: number;
    client_platform_fee_percent?: number;
    delivery_fee?: number;
    delivery_cost?: number;
    car_make?: string;
    car_model?: string;
    car_year?: number | string;
    plate_number?: string;
    vin?: string;
    delivery_type?: string;
    delivery_method?: string;
    fulfillment_method?: string;
    is_pickup?: boolean;
    branch_name?: string;
    location_name?: string;
    created_at?: string;
    items?: any[];
    deal_items?: any[];
    parts_description?: string;
  };
  items?: InvoiceItem[];
  platformSettings?: {
    vat_percent?: number;
    platform_commission_percent?: number;
    client_platform_fee_percent?: number;
    vendor_platform_fee_percent?: number;
    vat_number?: string;
    cr_number?: string;
  };
  userRole?: "vendor" | "client" | "admin" | "courier";
  triggerButton?: React.ReactNode;
  onClose?: () => void;
}

/* ── Currency Formatter ─────────────────────────────────── */
const fmt = (n: number | undefined | null) => {
  const val = Number(n ?? 0);
  if (isNaN(val)) return "0.00";
  return val.toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function shortId(id?: string) {
  if (!id) return "001";
  return String(id).replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "001";
}

/* ══════════════════════════════════════════════════════════
   Component — Ultra-Professional A4 Saudi Tax Invoice
   Matches RFQ SA Platform Identity & ZATCA Standards
   Supports 2 Dedicated Forms:
   1. فاتورة المورد الضريبية (Vendor Tax Invoice) - Parts + Parts VAT only. No delivery fee.
   2. فاتورة العميل الضريبية (Client Tax Invoice) - Parts + Delivery + Parts VAT + Platform Fee.
══════════════════════════════════════════════════════════ */
export function InvoicePDFExport({
  invoice,
  invoiceType = "auto",
  vendor,
  client,
  order,
  items,
  platformSettings,
  userRole,
  triggerButton,
}: InvoicePDFProps) {
  const [busy, setBusy] = useState(false);
  const [showChooserModal, setShowChooserModal] = useState(false);

  const resolveTargetInvoiceType = (): "vendor" | "client" | "choose" => {
    if (invoiceType === "vendor") return "vendor";
    if (invoiceType === "client") return "client";
    if (userRole === "vendor") return "vendor";
    if (userRole === "client" || userRole === "courier") return "client";
    // For admin or auto without specified role, open chooser modal
    return "choose";
  };

  const handleTriggerClick = () => {
    const target = resolveTargetInvoiceType();
    if (target === "choose") {
      setShowChooserModal(true);
    } else {
      let preOpenedWin: Window | null = null;
      if (typeof window !== "undefined") {
        try {
          preOpenedWin = window.open("about:blank", "_blank", "width=1050,height=900,menubar=no,toolbar=no,location=no,status=no");
          if (preOpenedWin) {
            preOpenedWin.document.write(`
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="utf-8" />
                <title>جاري تحضير الفاتورة الضريبية ZATCA...</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
                  .card { text-align: center; padding: 36px 44px; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 440px; }
                  .spinner { width: 44px; height: 44px; border: 4px solid #334155; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
                  @keyframes spin { to { transform: rotate(360deg); } }
                  h2 { margin: 0 0 10px; font-size: 17px; font-weight: 800; color: #ffffff; }
                  p { margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="spinner"></div>
                  <h2>جاري إنشاء الفاتورة الضريبية ZATCA...</h2>
                  <p>يتم الآن استدعاء بيانات الفاتورة وتشفير رمز الاستجابة السريعة (QR Code) المعتمد</p>
                </div>
              </body>
              </html>
            `);
            preOpenedWin.document.close();
          }
        } catch (e) {
          preOpenedWin = null;
        }
      }
      executeExport(target, preOpenedWin);
    }
  };

  const executeExport = async (targetType: "vendor" | "client", existingWin?: Window | null) => {
    setShowChooserModal(false);
    setBusy(true);

    /* ── Dynamic Platform Policies & Tax Rates ── */
    const vatPercent = Number(
      platformSettings?.vat_percent ??
      invoice.vat_percent ??
      15
    );
    const VAT_RATE = vatPercent / 100;

    /* ── Safe Fallbacks ── */
    const isVendorInvoice = targetType === "vendor";
    const safeOrder = order || invoice.order || { id: invoice.order_id || invoice.id || "ORD-001" };
    const rawOrderId = safeOrder?.id || invoice.order_id || invoice.id || "001";
    const canonicalInvoiceNumber = normalizeInvoiceNumber(invoice.invoice_number, rawOrderId);

    // Dynamic platform fee percentages from system settings or order/invoice
    const clientFeePercent = Number(
      (platformSettings as any)?.client_platform_fee_percent ??
      safeOrder?.client_platform_fee_percent ??
      invoice?.client_platform_fee_percent ??
      safeOrder?.settlement_summary?.clientFeePercent ??
      5
    );
    const vendorFeePercent = Number(
      (platformSettings as any)?.vendor_platform_fee_percent ??
      platformSettings?.platform_commission_percent ??
      safeOrder?.vendor_platform_fee_percent ??
      invoice?.vendor_platform_fee_percent ??
      safeOrder?.settlement_summary?.vendorFeePercent ??
      6
    );
    const commissionPercent = isVendorInvoice ? vendorFeePercent : clientFeePercent;

    const platformCR = platformSettings?.cr_number || invoice.platform_cr_number || "1010789456";
    const platformVAT = platformSettings?.vat_number || invoice.platform_vat_number || "310987654300003";

    // 1. Comprehensive Line Items Extraction
    let rawItems: any[] = [];
    if (items && items.length > 0) {
      rawItems = items;
    } else if (invoice.invoice_items && Array.isArray(invoice.invoice_items) && invoice.invoice_items.length > 0) {
      rawItems = invoice.invoice_items;
    } else if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
      rawItems = invoice.items;
    } else if (invoice.parts_items && Array.isArray(invoice.parts_items) && invoice.parts_items.length > 0) {
      rawItems = invoice.parts_items;
    } else if (safeOrder?.items && Array.isArray(safeOrder.items) && safeOrder.items.length > 0) {
      rawItems = safeOrder.items;
    } else if (safeOrder?.deal_items && Array.isArray(safeOrder.deal_items) && safeOrder.deal_items.length > 0) {
      rawItems = safeOrder.deal_items;
    } else {
      try {
        const desc = invoice.parts_description || safeOrder?.parts_description;
        const parsed = typeof desc === "string" ? JSON.parse(desc) : desc;
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawItems = parsed;
        }
      } catch (e) {}
    }

    /* ── Delivery Method Verification ── */
    const isPickup = Boolean(
      invoice.is_pickup === true ||
      invoice.delivery_type === "pickup" ||
      invoice.delivery_method === "pickup" ||
      invoice.fulfillment_method === "SELF_PICKUP" ||
      invoice.fulfillment_method === "BRANCH_PICKUP" ||
      safeOrder.is_pickup === true ||
      safeOrder.delivery_type === "pickup" ||
      safeOrder.delivery_method === "pickup" ||
      safeOrder.fulfillment_method === "SELF_PICKUP" ||
      safeOrder.fulfillment_method === "BRANCH_PICKUP" ||
      safeOrder.settlement_summary?.isPickup === true
    );

    const rawGrandTotal = Number(invoice.total_amount ?? invoice.total_price ?? safeOrder.total_price ?? safeOrder.total_amount ?? 0);
    const deliveryFee = isPickup
      ? 0
      : Number(
          (invoice.delivery_cost && invoice.delivery_cost > 0 ? invoice.delivery_cost : null) ??
          (invoice.delivery_fee && invoice.delivery_fee > 0 ? invoice.delivery_fee : null) ??
          (safeOrder.delivery_fee && safeOrder.delivery_fee > 0 ? safeOrder.delivery_fee : null) ??
          (safeOrder.delivery_cost && safeOrder.delivery_cost > 0 ? safeOrder.delivery_cost : null) ??
          safeOrder.settlement_summary?.deliveryFee ??
          25
        );
    const discountAmount = Number(invoice.discount_amount ?? invoice.discount ?? 0) || 0;

    // Calculate Parts Subtotal accurately (prioritize explicit parts_subtotal)
    let calculatedPartsSubtotal = 0;
    if (invoice.parts_subtotal && Number(invoice.parts_subtotal) > 0) {
      calculatedPartsSubtotal = Number(invoice.parts_subtotal);
    } else if (safeOrder?.parts_subtotal && Number(safeOrder.parts_subtotal) > 0) {
      calculatedPartsSubtotal = Number(safeOrder.parts_subtotal);
    } else if (rawItems.length > 0) {
      calculatedPartsSubtotal = rawItems.reduce((acc: number, it: any) => {
        const q = Number(it.quantity || it.qty || 1);
        const u = Number(it.unit_price || it.price || 0);
        return acc + (Number(it.line_total) || (u * q));
      }, 0);
    }

    if (!calculatedPartsSubtotal || calculatedPartsSubtotal <= 0) {
      if (invoice.subtotal && Number(invoice.subtotal) < rawGrandTotal) {
        calculatedPartsSubtotal = Number(invoice.subtotal);
      } else if (rawGrandTotal > 0) {
        // Reverse calculation using clean linear factor: 1 + commRate + vatRate
        const netBase = Math.max(0, rawGrandTotal - deliveryFee);
        const linearFactor = 1 + (commissionPercent / 100) + VAT_RATE;
        calculatedPartsSubtotal = Number((netBase / linearFactor).toFixed(2));
      } else {
        calculatedPartsSubtotal = 100;
      }
    }

    // Prepare clean safe items (prevent inflated unit prices)
    const safeItems: InvoiceItem[] = rawItems.length > 0
      ? rawItems.map((it: any) => {
          const q = Number(it.quantity || it.qty || 1);
          let u = Number(it.unit_price || it.price || 0);
          // If unit price was missing or inflated above parts subtotal:
          if (u <= 0 || (calculatedPartsSubtotal > 0 && (u * q > calculatedPartsSubtotal || (Math.abs(u * q - calculatedPartsSubtotal) > 0.01 && u >= (rawGrandTotal * 0.8))))) {
            u = Number((calculatedPartsSubtotal / Math.max(1, rawItems.length * q)).toFixed(2));
          }
          const lt = Number((u * q).toFixed(2));
          return {
            part_name: it.part_name || it.name || it.partName || "قطعة غيار معتمدة",
            part_number: it.part_number || it.partNumber || "OEM-GENUINE",
            condition: it.condition || (it.type === "original" || it.part_type === "original" ? "أصلي وكالة" : it.type === "commercial" || it.part_type === "commercial" ? "تجاري معتمد" : "معتمد ومطابق"),
            quantity: q,
            unit_price: u,
            line_total: lt,
          };
        })
      : [{
          part_name: invoice.parts_summary || invoice.parts_description || "قطع غيار ومستلزمات صيانة معتمدة",
          part_number: safeOrder?.plate_number ? `لوحة: ${safeOrder.plate_number}` : "OEM-GENUINE",
          condition: "أصلي وكالة",
          quantity: 1,
          unit_price: calculatedPartsSubtotal,
          line_total: calculatedPartsSubtotal,
        }];

    const partsSubtotal = safeItems.reduce((s: number, it: InvoiceItem) => s + (Number(it.line_total) || 0), 0);

    /* ── Precise Financial Quantities ── */
    // Rule: VAT 15% is strictly on parts subtotal alone (before commission, delivery, and other fees)
    const vendorTaxableBase = Math.max(0, partsSubtotal - discountAmount);
    const vendorVatAmount = Number((vendorTaxableBase * VAT_RATE).toFixed(2));
    const vendorInvoiceTotal = Number((vendorTaxableBase + vendorVatAmount).toFixed(2));

    const platformFee = isVendorInvoice
      ? Number(((partsSubtotal * vendorFeePercent) / 100).toFixed(2))
      : (invoice.client_platform_fee && Number(invoice.client_platform_fee) > 0 && Math.abs(Number(invoice.client_platform_fee) - ((partsSubtotal * clientFeePercent) / 100)) < 0.1
          ? Number(invoice.client_platform_fee)
          : Number(((partsSubtotal * clientFeePercent) / 100).toFixed(2)));
    const clientTaxableBase = vendorTaxableBase;
    const clientVatAmount = Number((clientTaxableBase * VAT_RATE).toFixed(2));
    const paymentFee = Number(invoice.payment_fee ?? invoice.transfer_fee ?? 0) || 0;
    const calculatedClientTotal = Number((partsSubtotal + clientVatAmount + platformFee + deliveryFee + paymentFee).toFixed(2));
    const clientTotalPaid = (safeOrder?.settlement_summary?.grandTotal && Number(safeOrder.settlement_summary.grandTotal) > 0)
      ? Number(safeOrder.settlement_summary.grandTotal)
      : (rawGrandTotal > 0 && Math.abs(rawGrandTotal - calculatedClientTotal) < 0.5 ? rawGrandTotal : calculatedClientTotal);
    const orderTotalPaid = isVendorInvoice ? vendorInvoiceTotal : clientTotalPaid;

    /* ── Labels & Parties Info ── */
    const safeVendor = vendor || invoice.seller || invoice.vendor || invoice.vendor_profile || {};
    const safeClient = client || invoice.buyer || invoice.client || invoice.client_profile || {};

    const vendorName = safeVendor.company_name || safeVendor.full_name || safeVendor.name || invoice.vendor_name || "مؤسسة قطع الغيار المعتمدة";
    const vendorTaxNumber = safeVendor.tax_number || safeVendor.vat_number || "300123456700003";
    const vendorCR = safeVendor.commercial_register || safeVendor.cr_number || "1010987654";
    const vendorAddress = safeVendor.national_address || safeVendor.address || safeVendor.city || "المملكة العربية السعودية - الرياض - طريق خريص";

    const clientName = safeClient.company_name || safeClient.full_name || safeClient.name || invoice.client_name || "شركة المشتريات الوطنية";
    const clientVat = safeClient.tax_number || safeClient.vat_number || "—";
    const clientCR = safeClient.commercial_register || safeClient.national_id || "—";
    const clientAddress = safeClient.national_address || safeClient.address || safeOrder?.location_name || safeClient.city || "المملكة العربية السعودية - الرياض";

    /* ── Vehicle Info ── */
    const vehicleMake = (invoice.vehicle_make && invoice.vehicle_make !== "غير محدد" ? invoice.vehicle_make : "") || safeOrder.car_make || safeOrder.vehicle_make || invoice.car_make || "تويوتا";
    const vehicleModel = (invoice.vehicle_model && invoice.vehicle_model !== "غير محدد" ? invoice.vehicle_model : "") || safeOrder.car_model || safeOrder.vehicle_model || invoice.car_model || "كامري";
    const vehicleYear = invoice.vehicle_year && invoice.vehicle_year !== "—" ? invoice.vehicle_year : (safeOrder.car_year || safeOrder.vehicle_year || invoice.car_year || 2023);
    const plateNumber = invoice.plate_number && invoice.plate_number !== "—" ? invoice.plate_number : (safeOrder.plate_number || "—");
    const vinNumber = invoice.vin && invoice.vin !== "—" ? invoice.vin : (safeOrder.vin || "—");

    /* ── Delivery Method Badge ── */
    const deliveryMethodLabel = isPickup ? "استلام مباشر من فرع المورد (بدون رسوم)" : "توصيل سريع بالأسطول المعتمد";

    /* ── Dates ── */
    const rawDate = invoice.issued_at || invoice.created_at || safeOrder.created_at;
    const dateObj = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : new Date();
    const issuedDateAr = dateObj.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const issuedDateEn = dateObj.toISOString().split("T")[0];

    /* ── QR Code Generation (ZATCA compliant TLV / URL) ── */
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://rfqsa.tech";
    const qrTotal = isVendorInvoice ? vendorInvoiceTotal : clientTotalPaid;
    const qrVat = isVendorInvoice ? vendorVatAmount : clientVatAmount;
    const qrPayload = invoice.qr_code_data || `${baseUrl}/deal/${rawOrderId}?inv=${encodeURIComponent(canonicalInvoiceNumber)}&type=${targetType}&vat=${encodeURIComponent(vendorTaxNumber)}&total=${qrTotal}&tax=${qrVat}`;
    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 160,
        margin: 1,
        color: { dark: targetType === "vendor" ? "#064e3b" : "#1e3a8a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    } catch (e) {
      console.warn("QR code generation fallback:", e);
    }

    /* ── Items Rows ── */
    const itemRows = safeItems
      .map((it: InvoiceItem, i: number) => {
        const itemLineTotal = Number(it.line_total) || 0;
        const itemVat = itemLineTotal * VAT_RATE;
        const itemTotalWithVat = itemLineTotal + itemVat;
        return `
        <tr>
          <td class="td-num">${i + 1}</td>
          <td class="td-desc">
            <div class="part-title">${it.part_name}</div>
            <div class="part-sub">رقم القطعة: <span class="font-mono">${it.part_number || "—"}</span></div>
          </td>
          <td class="td-badge">
            <span class="cond-tag">${it.condition || "أصلي وكالة"}</span>
          </td>
          <td class="td-qty">${it.quantity}</td>
          <td class="td-num-val">${fmt(it.unit_price)}</td>
          <td class="td-num-val">${fmt(itemLineTotal)}</td>
          <td class="td-num-val font-vat">${fmt(itemVat)}</td>
          <td class="td-total-val">${fmt(itemTotalWithVat)}</td>
        </tr>`;
      })
      .join("");

    /* ── Distinct Summary Sections for Vendor vs Client ── */

    const badgeTitleAr = isVendorInvoice
      ? "فاتورة المورد الضريبية - قطع غيار"
      : "فاتورة العميل الضريبية وأمر الشراء";

    const badgeTitleEn = isVendorInvoice
      ? "Vendor Tax Invoice (Auto Parts Sales)"
      : "Client Tax Invoice & Order Settlement";

    const badgeGradient = isVendorInvoice
      ? "linear-gradient(135deg, #064e3b, #047857)"
      : "linear-gradient(135deg, #1e3a8a, #0369a1)";

    const primaryColor = isVendorInvoice ? "#064e3b" : "#1e3a8a";

    // Summary calculation card HTML
    const summaryCardHtml = isVendorInvoice
      ? `
        <!-- 1. VENDOR TAX INVOICE SUMMARY (Pure Parts + 15% VAT on Parts Only) -->
        <div class="totals-card" style="border-color:${primaryColor}">
          <div style="background:#f0fdf4;padding:8px 14px;border-bottom:1px solid #bbf7d0;font-size:11px;font-weight:800;color:#064e3b;display:flex;justify-content:space-between;align-items:center">
            <span>الحساب الضريبي لفاتورة المورد / Vendor Tax Summary</span>
            <span class="font-mono text-[9px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">ZATCA Compliant</span>
          </div>
          <div class="totals-row">
            <span>قيمة قطع الغيار (قبل الضريبة) / Parts Subtotal:</span>
            <span>${fmt(partsSubtotal)} ر.س</span>
          </div>
          ${discountAmount > 0 ? `
          <div class="totals-row" style="color:#047857;background:#f0fdf4">
            <span>خصم ترويجي معتمد / Discount:</span>
            <span>-${fmt(discountAmount)} ر.س</span>
          </div>` : ""}
          <div class="totals-row">
            <span>الوعاء الضريبي المعتمد لقطع الغيار / Taxable Base:</span>
            <span>${fmt(vendorTaxableBase)} ر.س</span>
          </div>
          <div class="totals-row">
            <span>ضريبة القيمة المضافة (${vatPercent}% VAT على قطع الغيار فقط):</span>
            <span class="font-vat" style="font-weight:900">+${fmt(vendorVatAmount)} ر.س</span>
          </div>
          <div class="totals-row grand-row" style="background:${primaryColor}">
            <span>إجمالي فاتورة المورد (شامل الضريبة) / VENDOR INVOICE TOTAL:</span>
            <span>${fmt(vendorInvoiceTotal)} ر.س</span>
          </div>
        </div>

        <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:7px 10px;font-size:9.5px;color:#475569;line-height:1.4">
          <strong>إشعار محاسبي وضريبي:</strong> تقتصر فاتورة المورد على قيمة قطع الغيار وضريبتها المعتمدة فقط؛ ولا تُسجل بها رسوم التوصيل أو عمولة المنصة نظراً لأنها خدمات خاصة بالعميل وناقل الشحن.
        </div>`
      : `
        <!-- 2. CLIENT TAX INVOICE & ORDER SETTLEMENT SUMMARY -->
        <div class="totals-card" style="border-color:${primaryColor}">
          <div style="background:#eff6ff;padding:8px 14px;border-bottom:1px solid #bfdbfe;font-size:11px;font-weight:800;color:#1e3a8a;display:flex;justify-content:space-between;align-items:center">
            <span>ملخص الحساب الضريبي وسداد الطلب / Order Settlement Breakdown</span>
            <span class="font-mono text-[9px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold">#ORD-${shortId(rawOrderId)}</span>
          </div>
          <div class="totals-row">
            <span>قيمة قطع الغيار (قبل الضريبة) / Parts Subtotal:</span>
            <span>${fmt(partsSubtotal)} ر.س</span>
          </div>
          <div class="totals-row">
            <span>ضريبة القيمة المضافة (${vatPercent}% VAT على قطع الغيار):</span>
            <span class="font-vat" style="font-weight:900;color:#047857">+${fmt(clientVatAmount)} ر.س</span>
          </div>
          <div class="totals-row">
            <span>رسوم خدمة المنصة (${clientFeePercent}%):</span>
            <span style="font-weight:800;color:#1e40af">+${fmt(platformFee)} ر.س</span>
          </div>
          <div class="totals-row" style="background:#f8fafc">
            <span>رسوم التوصيل والشحن:</span>
            <span class="${isPickup ? "text-emerald-700 font-bold" : "font-mono font-bold text-slate-800"}">
              ${isPickup ? "0.00 ر.س (استلام من الفرع)" : `+${fmt(deliveryFee)} ر.س`}
            </span>
          </div>
          ${paymentFee > 0 ? `
          <div class="totals-row">
            <span>رسوم معالجة الدفع:</span>
            <span>+${fmt(paymentFee)} ر.س</span>
          </div>` : ""}
          <div class="totals-row grand-row" style="background:${primaryColor}">
            <span>الإجمالي النهائي المسدد من العميل / TOTAL AMOUNT PAID:</span>
            <span>${fmt(orderTotalPaid)} ر.س</span>
          </div>
        </div>`;

    /* ── Complete A4 HTML ── */
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${badgeTitleAr} - ${canonicalInvoiceNumber} - منصة رفق</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  html, body {
    font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    direction: rtl;
    line-height: 1.4;
    font-size: 11.5px;
  }

  .a4-container {
    width: 210mm;
    min-height: 297mm;
    margin: 15px auto;
    background: #ffffff;
    padding: 12mm 14mm 10mm;
    position: relative;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* ═══════════ HEADER ═══════════ */
  .header-wrap {
    border-bottom: 2.5px solid ${primaryColor};
    padding-bottom: 12px;
    margin-bottom: 12px;
  }

  .header-grid {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-block {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-logo-img {
    height: 52px;
    width: auto;
    max-width: 150px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .brand-title {
    font-size: 20px;
    font-weight: 900;
    color: ${primaryColor};
    line-height: 1.1;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .brand-title-badge {
    background: #ecfdf5;
    color: #047857;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 6px;
    border: 1px solid #a7f3d0;
  }

  .brand-sub {
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    margin-top: 2px;
  }

  .brand-meta {
    font-size: 9.5px;
    color: #64748b;
    font-weight: 600;
    margin-top: 2px;
  }

  .inv-title-block {
    text-align: left;
    direction: ltr;
  }

  .inv-main-badge {
    display: inline-block;
    background: ${badgeGradient};
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 900;
    padding: 5px 14px;
    border-radius: 8px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .inv-sub-badge {
    font-size: 9.5px;
    font-weight: 700;
    color: ${primaryColor};
    margin-top: 3px;
    direction: rtl;
    text-align: left;
  }

  .inv-id-row {
    font-size: 13px;
    color: #0f172a;
    margin-top: 4px;
    font-weight: 800;
  }

  .inv-id-row strong {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 14.5px;
    color: ${primaryColor};
    letter-spacing: 0.5px;
  }

  /* ═══════════ META BAR ═══════════ */
  .meta-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .meta-item {
    font-size: 10px;
  }

  .meta-lbl {
    color: #64748b;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .meta-val {
    color: #0f172a;
    font-weight: 800;
    font-size: 11px;
  }

  /* ═══════════ PARTIES INFO ═══════════ */
  .parties-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .party-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    background: #ffffff;
  }

  .party-card.vendor-card {
    border-right: 3px solid #047857;
  }

  .party-card.client-card {
    border-right: 3px solid #0284c7;
  }

  .party-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #f1f5f9;
  }

  .party-tag {
    font-weight: 800;
    font-size: 10.5px;
    color: #0f172a;
  }

  .party-name {
    font-weight: 900;
    font-size: 13px;
    color: #0f172a;
    margin-bottom: 5px;
  }

  .party-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #475569;
    margin-bottom: 2px;
  }

  .party-row span:last-child {
    font-weight: 700;
    color: #0f172a;
  }

  /* ═══════════ VEHICLE STRIP ═══════════ */
  .vehicle-strip {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 7px 12px;
    margin-bottom: 12px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .v-item .v-label {
    font-size: 9px;
    color: #64748b;
    font-weight: 700;
  }

  .v-item .v-value {
    font-size: 11px;
    color: #0f172a;
    font-weight: 800;
  }

  /* ═══════════ ITEMS TABLE ═══════════ */
  .table-section {
    margin-bottom: 12px;
  }

  .table-title {
    font-size: 11px;
    font-weight: 800;
    color: ${primaryColor};
    margin-bottom: 6px;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    font-size: 10.5px;
  }

  .items-table thead tr {
    background: #f8fafc;
    border-bottom: 2px solid #cbd5e1;
  }

  .items-table th {
    padding: 7px 8px;
    font-weight: 800;
    color: #334155;
    text-align: center;
    border-left: 1px solid #e2e8f0;
    font-size: 10px;
  }

  .items-table th:last-child {
    border-left: none;
  }

  .items-table th.th-desc {
    text-align: right;
    width: 34%;
  }

  .items-table tbody tr {
    border-bottom: 1px solid #e2e8f0;
  }

  .items-table tbody tr:nth-child(even) {
    background: #f8fafc;
  }

  .items-table td {
    padding: 7px 8px;
    color: #1e293b;
    vertical-align: middle;
    border-left: 1px solid #e2e8f0;
  }

  .items-table td:last-child {
    border-left: none;
  }

  .td-num {
    text-align: center;
    font-weight: 800;
    color: #64748b;
    width: 26px;
  }

  .td-desc .part-title {
    font-weight: 800;
    color: #0f172a;
    font-size: 11px;
  }

  .td-desc .part-sub {
    font-size: 9px;
    color: #64748b;
    margin-top: 1px;
  }

  .td-badge {
    text-align: center;
  }

  .cond-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    background: #f0fdf4;
    color: #047857;
    border: 1px solid #bbf7d0;
  }

  .td-qty {
    text-align: center;
    font-weight: 800;
  }

  .td-num-val {
    text-align: center;
    font-weight: 700;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  .font-vat {
    color: #047857;
  }

  .td-total-val {
    text-align: center;
    font-weight: 900;
    color: ${primaryColor};
    font-family: 'Consolas', 'Courier New', monospace;
  }

  /* ═══════════ TOTALS & QR SECTION ═══════════ */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1.3fr;
    gap: 14px;
    margin-bottom: 10px;
    align-items: flex-start;
  }

  .qr-cert-box {
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    background: #ffffff;
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .qr-img {
    width: 105px;
    height: 105px;
    flex-shrink: 0;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 2px;
  }

  .cert-content {
    flex: 1;
    font-size: 9.5px;
  }

  .cert-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${primaryColor};
    font-weight: 800;
    font-size: 10.5px;
    margin-bottom: 4px;
  }

  .cert-text {
    color: #475569;
    line-height: 1.5;
    margin-bottom: 4px;
  }

  .zatca-tag {
    font-weight: 800;
    color: ${primaryColor};
    font-size: 9px;
  }

  /* ═══════════ TOTALS CARD ═══════════ */
  .totals-card {
    border: 1.5px solid ${primaryColor};
    border-radius: 8px;
    overflow: hidden;
    background: #ffffff;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 12px;
    font-size: 10.5px;
    border-bottom: 1px solid #e2e8f0;
    color: #475569;
  }

  .totals-row span:first-child {
    font-weight: 700;
  }

  .totals-row span:last-child {
    font-weight: 800;
    color: #0f172a;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  .totals-row.grand-row {
    background: ${primaryColor};
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 900;
    padding: 8px 12px;
    border-bottom: none;
  }

  .totals-row.grand-row span:last-child {
    color: #ffffff;
    font-size: 14.5px;
  }

  /* ═══════════ FOOTER ═══════════ */
  .footer-wrap {
    border-top: 1.5px solid #e2e8f0;
    padding-top: 8px;
    margin-top: auto;
    font-size: 9px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-left {
    text-align: left;
    direction: ltr;
    font-weight: 600;
  }

  .footer-right {
    font-weight: 700;
    line-height: 1.5;
  }

  .footer-right strong {
    color: ${primaryColor};
  }

  /* ═══════════ PRINT OPTIMIZATIONS ═══════════ */
  @page {
    size: A4 portrait;
    margin: 6mm 8mm;
  }

  @media print {
    html, body {
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .no-print {
      display: none !important;
    }
    .a4-container {
      margin: 0 auto;
      padding: 6mm 8mm;
      box-shadow: none;
      border: none;
      width: 100%;
      min-height: 285mm;
    }
    .page-break-inside-avoid {
      page-break-inside: avoid;
    }
  }
</style>
</head>
<body>

<!-- Floating Action Bar for Instant Screen Print & Preview -->
<div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #0f172a; color: #ffffff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border-bottom: 2px solid ${primaryColor};">
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="background: ${primaryColor}; color: #ffffff; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px;">✓</div>
    <div>
      <div style="font-size: 14px; font-weight: 900; letter-spacing: -0.2px;">${badgeTitleAr} — منصة رفق</div>
      <div style="font-size: 11px; color: #94a3b8;">${canonicalInvoiceNumber} &bull; متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك ZATCA Phase 2</div>
    </div>
  </div>
  <div style="display: flex; align-items: center; gap: 10px;">
    <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 18px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.4);">
      <span>🖨️ طباعة / حفظ كـ PDF</span>
    </button>
    <button onclick="window.close()" style="background: #334155; color: #ffffff; border: none; padding: 8px 14px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer;">
      ✕ إغلاق النافذة
    </button>
  </div>
</div>

<div class="a4-container">

  <div>
    <!-- ══════════════ 1. HEADER SECTION ══════════════ -->
    <div class="header-wrap">
      <div class="header-grid">
        
        <!-- Platform Branding (Right) -->
        <div class="brand-block">
          <img src="https://rfqsa.tech/logo.png" alt="منصة رفق" class="brand-logo-img" />

          <div>
            <div class="brand-title">
              <span>منصة رِفْق لقطع الغيار</span>
              <span class="brand-title-badge">موثقة ZATCA</span>
            </div>
            <div class="brand-sub">RFQ SA – The Saudi Automotive B2B Marketplace</div>
            <div class="brand-meta">سجل تجاري المنصة: ${platformCR} &bull; الرقم الضريبي للمنصة: ${platformVAT} &bull; الرياض، المملكة العربية السعودية</div>
          </div>
        </div>

        <!-- Invoice Title & IDs (Left) -->
        <div class="inv-title-block">
          <div class="inv-main-badge">${badgeTitleAr}</div>
          <div class="inv-sub-badge">${badgeTitleEn}</div>
          <div class="inv-id-row">
            رقم الفاتورة: <strong>${canonicalInvoiceNumber}</strong>
          </div>
        </div>

      </div>
    </div>

    <!-- ══════════════ 2. META DATA BAR ══════════════ -->
    <div class="meta-bar">
      <div class="meta-item">
        <div class="meta-lbl">تاريخ الإصدار / Issue Date</div>
        <div class="meta-val">${issuedDateAr} (${issuedDateEn})</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">رقم أمر الشراء / Order No</div>
        <div class="meta-val font-mono">#ORD-${shortId(rawOrderId)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">طريقة الاستلام / Fulfillment</div>
        <div class="meta-val" style="color:${primaryColor}">${deliveryMethodLabel}</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">حالة الفاتورة / Status</div>
        <div class="meta-val">
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-weight:800;font-size:10px;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0">
            معتمدة ومؤكدة ✓
          </span>
        </div>
      </div>
    </div>

    <!-- ══════════════ 3. PARTIES INFORMATION ══════════════ -->
    <div class="parties-grid">
      
      <!-- Supplier / Vendor Card -->
      <div class="party-card vendor-card">
        <div class="party-header">
          <span class="party-tag">بيانات المورد (البائع / Supplier)</span>
          <span class="font-mono text-[9px] text-emerald-700 font-bold">#VEN-${shortId(safeVendor.id || "001")}</span>
        </div>
        <div class="party-name">${vendorName}</div>
        <div class="party-row">
          <span>الرقم الضريبي (VAT ID):</span>
          <span class="font-mono" dir="ltr">${vendorTaxNumber}</span>
        </div>
        <div class="party-row">
          <span>السجل التجاري (CR):</span>
          <span class="font-mono" dir="ltr">${vendorCR}</span>
        </div>
        <div class="party-row">
          <span>العنوان والفرع:</span>
          <span>${vendorAddress}</span>
        </div>
      </div>

      <!-- Buyer / Client Card -->
      <div class="party-card client-card">
        <div class="party-header">
          <span class="party-tag">بيانات العميل (المشتري / Buyer)</span>
          <span class="font-mono text-[9px] text-blue-700 font-bold">#CLI-${shortId(safeClient.id || "001")}</span>
        </div>
        <div class="party-name">${clientName}</div>
        <div class="party-row">
          <span>الرقم الضريبي (VAT ID):</span>
          <span class="font-mono" dir="ltr">${clientVat}</span>
        </div>
        <div class="party-row">
          <span>السجل التجاري / الهوية:</span>
          <span class="font-mono" dir="ltr">${clientCR}</span>
        </div>
        <div class="party-row">
          <span>العنوان الوطني / المدينة:</span>
          <span>${clientAddress}</span>
        </div>
      </div>

    </div>

    <!-- ══════════════ 4. VEHICLE SPECIFICATIONS STRIP ══════════════ -->
    <div class="vehicle-strip">
      <div class="v-item">
        <div class="v-label">المركبة والموديل</div>
        <div class="v-value">${vehicleMake} ${vehicleModel} (${vehicleYear})</div>
      </div>
      <div class="v-item">
        <div class="v-label">رقم اللوحة / Plate No</div>
        <div class="v-value font-mono" dir="ltr">${plateNumber}</div>
      </div>
      <div class="v-item">
        <div class="v-label">رقم الهيكل / VIN</div>
        <div class="v-value font-mono" dir="ltr">${vinNumber}</div>
      </div>
      <div class="v-item">
        <div class="v-label">موقع التسليم / الفرع</div>
        <div class="v-value">${safeOrder.branch_name || safeOrder.location_name || (isPickup ? "فرع المورد المعتمد" : "عنوان العميل")}</div>
      </div>
    </div>

    <!-- ══════════════ 5. ITEMS & PARTS TABLE ══════════════ -->
    <div class="table-section">
      <div class="table-title">
        <span>&bull; تفاصيل قطع الغيار المطلوبة</span>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th class="td-num">#</th>
            <th class="th-desc">اسم القطعة والوصف</th>
            <th>الحالة / التصنيف</th>
            <th style="width:40px">الكمية</th>
            <th style="width:85px">سعر الوحدة</th>
            <th style="width:85px">الإجمالي (قبل الضريبة)</th>
            <th style="width:75px">ضريبة (${vatPercent}%)</th>
            <th style="width:90px">الإجمالي (شامل الضريبة)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="8" style="padding:20px;text-align:center;color:#94a3b8">لا توجد بنود مسجلة</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- ══════════════ 6. TOTALS & ZATCA QR ══════════════ -->
    <div class="bottom-grid page-break-inside-avoid">
      
      <!-- ZATCA QR Code & Security Stamp -->
      <div class="qr-cert-box">
        ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr-img" alt="ZATCA Electronic Invoicing QR" />` : ""}
        <div class="cert-content">
          <div class="cert-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>فاتورة إلكترونية موثقة عبر منصة رفق</span>
          </div>
          <div class="cert-text">
            رمز الاستجابة السريعة (QR Code) مشفر ومطابق لاشتراطات الربط والتكامل مع هيئة الزكاة والضريبة والجمارك (ZATCA).
          </div>
          <div class="zatca-tag">
            معرف الفاتورة: #${canonicalInvoiceNumber}
          </div>
        </div>
      </div>

      <!-- Financial Calculation Card (Decoupled Vendor vs Client) -->
      <div style="display:flex;flex-direction:column;gap:8px">
        ${summaryCardHtml}
      </div>

    </div>

    ${invoice.notes ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:10px;color:#78350f">
      <strong>ملاحظات:</strong> ${invoice.notes}
    </div>` : ""}

  </div>

  <!-- ══════════════ 7. REGULATORY FOOTER ══════════════ -->
  <div class="footer-wrap page-break-inside-avoid">
    <div class="footer-right">
      <strong>منصة رِفْق لقطع غيار السيارات</strong> &bull; تخضع هذه الفاتورة لضمان مطابقة القطع وحماية المشتري المعتمدة بالمنصة.
      <br/>فاتورة ضريبية رسمية صادرة إلكترونياً ومتوافقة مع أنظمة هيئة الزكاة والضريبة والجمارك (ZATCA) في المملكة العربية السعودية.
    </div>
    <div class="footer-left">
      support@rfqsa.tech | www.rfqsa.tech | 920000000
    </div>
  </div>

</div>

</body>
</html>`;

    /* ── Open & print with window / iframe fallback ── */
    let win = existingWin;
    if (!win || win.closed) {
      try {
        win = window.open("", "_blank", "width=1050,height=900,menubar=no,toolbar=no,location=no,status=no");
      } catch (e) {
        win = null;
      }
    }

    if (win && !win.closed) {
      try {
        win.document.open();
        win.document.write(html);
        win.document.close();
        setTimeout(() => {
          try {
            win?.focus();
            win?.print();
          } catch (e) {}
          setBusy(false);
        }, 700);
        return;
      } catch (err) {
        console.warn("Writing to window failed, falling back to iframe:", err);
      }
    }

    try {
      let iframe = document.getElementById("rfq-invoice-print-frame") as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "rfq-invoice-print-frame";
        iframe.style.position = "fixed";
        iframe.style.left = "-9999px";
        iframe.style.top = "0";
        iframe.style.width = "1024px";
        iframe.style.height = "1400px";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            iframe?.contentWindow?.focus();
            iframe?.contentWindow?.print();
          } catch (e) {}
          setBusy(false);
        }, 700);
        return;
      }
    } catch (err) {
      console.error("Iframe print error:", err);
    }
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={handleTriggerClick}
        disabled={busy}
        className="inline-flex"
        type="button"
      >
        {triggerButton ?? (
          <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60">
            <Download className="w-3.5 h-3.5" />
            {busy ? "جاري التحضير..." : "تحميل PDF"}
          </span>
        )}
      </button>

      {/* ── Invoice Type Chooser Modal (Admin / General view) ── */}
      <Dialog open={showChooserModal} onOpenChange={setShowChooserModal}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-3xl p-6 text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-700" />
              <span>اختيار نوع الفاتورة للطباعة / التصدير</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              يرجى تحديد النموذج المطلوب للتصدير وفقاً لضوابط الفوترة والضريبة المعتمدة
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {/* Option 1: Vendor Tax Invoice */}
            <div
              onClick={() => executeExport("vendor")}
              className="p-4 rounded-2xl border-2 border-emerald-200 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-950">1. فاتورة المورد الضريبية (Vendor Tax Invoice)</span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">ZATCA</span>
                </div>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  قيمة قطع الغيار + ضريبة القيمة المضافة (15% على القطع فقط). <strong>خالية تماماً من رسوم التوصيل والعمولة.</strong>
                </p>
              </div>
            </div>

            {/* Option 2: Client Tax Invoice & Order Settlement */}
            <div
              onClick={() => executeExport("client")}
              className="p-4 rounded-2xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-blue-950">2. فاتورة العميل وأمر الشراء (Client Invoice)</span>
                  <span className="text-[10px] bg-blue-200/80 text-blue-900 font-extrabold px-2 py-0.5 rounded-full">شاملة</span>
                </div>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  قيمة قطع الغيار + رسوم التوصيل (للمندوب) + الضريبة 15% على القطع + رسوم المنصة = الإجمالي النهائي المسدد.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
