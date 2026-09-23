"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import { normalizeInvoiceNumber } from "@/lib/invoice-canonical";

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
  vendor?: {
    full_name?: string;
    company_name?: string;
    tax_number?: string;
    commercial_register?: string;
    national_address?: string;
    phone?: string;
    email?: string;
  };
  client?: {
    full_name?: string;
    company_name?: string;
    tax_number?: string;
    commercial_register?: string;
    national_address?: string;
    phone?: string;
    city?: string;
  };
  order?: {
    id: string;
    car_make?: string;
    car_model?: string;
    car_year?: number | string;
    plate_number?: string;
    vin?: string;
    delivery_type?: string;
    branch_name?: string;
    location_name?: string;
    created_at?: string;
  };
  items?: InvoiceItem[];
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

const fmtEn = (n: number | undefined | null) => {
  const val = Number(n ?? 0);
  if (isNaN(val)) return "0.00";
  return val.toLocaleString("en-US", {
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
══════════════════════════════════════════════════════════ */
export function InvoicePDFExport({
  invoice,
  vendor,
  client,
  order,
  items,
  triggerButton,
}: InvoicePDFProps) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);

    /* ── Safe Fallbacks ── */
    const safeOrder = order || invoice.order || { id: invoice.order_id || invoice.id || "ORD-001" };
    const rawOrderId = safeOrder?.id || invoice.order_id || invoice.id || "001";
    const canonicalInvoiceNumber = normalizeInvoiceNumber(invoice.invoice_number, rawOrderId);

    // Extract parts / items with complete specs
    const rawItems = (items && items.length > 0)
      ? items
      : (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0)
      ? invoice.items
      : (invoice.parts_items && Array.isArray(invoice.parts_items) && invoice.parts_items.length > 0)
      ? invoice.parts_items
      : [{
          part_name: invoice.parts_summary || invoice.parts_description || "قطع غيار ومستلزمات صيانة",
          part_number: safeOrder?.plate_number ? `لوحة: ${safeOrder.plate_number}` : "SP-AUTO",
          condition: "أصلي وكالة",
          quantity: 1,
          unit_price: Number(invoice.subtotal) || (Number(invoice.total_amount) ? Number(invoice.total_amount) / 1.15 : 1000),
          line_total: Number(invoice.subtotal) || (Number(invoice.total_amount) ? Number(invoice.total_amount) / 1.15 : 1000),
        }];

    const safeItems: InvoiceItem[] = rawItems.map((it: any) => {
      const q = Number(it.quantity || it.qty || 1);
      const u = Number(it.unit_price || it.price || 0);
      const lt = Number(it.line_total || it.totalPrice || (u * q));
      return {
        part_name: it.part_name || it.name || "قطعة غيار",
        part_number: it.part_number || it.partNumber || "—",
        condition: it.condition || (it.type === "original" ? "أصلي وكالة" : it.type === "commercial" ? "تجاري معتمد" : it.type === "used" ? "تشليح أصلي" : "معتمد"),
        quantity: q,
        unit_price: u,
        line_total: lt,
      };
    });

    const safeVendor = vendor || invoice.seller || invoice.vendor || invoice.vendor_profile || {};
    const safeClient = client || invoice.buyer || invoice.client || invoice.client_profile || {};

    /* ── Calculations (ZATCA 15% Standard) ── */
    const VAT_RATE = 0.15;
    const subtotal = safeItems.reduce((s: number, it: InvoiceItem) => s + (Number(it.line_total) || 0), 0);
    const deliveryFee = Number(invoice.delivery_cost ?? invoice.delivery_fee ?? 0) || 0;
    const paymentFee = Number(invoice.payment_fee ?? invoice.transfer_fee ?? 0) || 0;
    const discountAmount = Number(invoice.discount_amount ?? invoice.discount ?? 0) || 0;
    const vat = invoice.tax_amount ? Number(invoice.tax_amount) : ((subtotal - discountAmount) * VAT_RATE);
    const grandTotal = invoice.total_amount ? Number(invoice.total_amount) : (subtotal - discountAmount + vat + deliveryFee + paymentFee);

    /* ── Labels & Parties Info ── */
    const vendorName = safeVendor.company_name || safeVendor.full_name || safeVendor.name || invoice.vendor_name || "مؤسسة قطع الغيار المعتمدة";
    const vendorVat = safeVendor.tax_number || safeVendor.vat_number || "300123456700003";
    const vendorCR = safeVendor.commercial_register || safeVendor.cr_number || "1010987654";
    const vendorAddress = safeVendor.national_address || safeVendor.address || safeVendor.city || "المملكة العربية السعودية - الرياض - طريق خريص";
    const vendorPhone = safeVendor.phone || "+966 50 123 4567";

    const clientName = safeClient.company_name || safeClient.full_name || safeClient.name || invoice.client_name || "شركة المشتريات الوطنية";
    const clientVat = safeClient.tax_number || safeClient.vat_number || "—";
    const clientCR = safeClient.commercial_register || safeClient.national_id || "—";
    const clientAddress = safeClient.national_address || safeClient.address || safeOrder?.location_name || safeClient.city || "المملكة العربية السعودية - الرياض";
    const clientPhone = safeClient.phone || safeOrder?.recipient_phone || "—";

    /* ── Vehicle Info ── */
    const vehicleMake = safeOrder.car_make || invoice.vehicle_make || "تويوتا";
    const vehicleModel = safeOrder.car_model || invoice.vehicle_model || "هايلكس";
    const vehicleYear = safeOrder.car_year || invoice.vehicle_year || 2023;
    const plateNumber = safeOrder.plate_number || invoice.plate_number || "—";
    const vinNumber = safeOrder.vin || invoice.vin || "—";

    /* ── Delivery Method Badge ── */
    const isPickup = invoice.delivery_type === "pickup" || safeOrder.delivery_type === "pickup" || deliveryFee === 0;
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
    const qrPayload = invoice.qr_code_data || `${baseUrl}/deal/${rawOrderId}?inv=${encodeURIComponent(canonicalInvoiceNumber)}&vat=${encodeURIComponent(vendorVat)}&total=${grandTotal}&tax=${vat}`;
    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 160,
        margin: 1,
        color: { dark: "#064e3b", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    } catch (e) {
      console.warn("QR code generation fallback:", e);
    }

    /* ── Status Pill ── */
    const statusMap: Record<string, { labelAr: string; labelEn: string; bg: string; color: string; border: string }> = {
      paid: { labelAr: "مدفوعة ومؤكدة بالكامل ✓", labelEn: "PAID IN FULL", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
      pending: { labelAr: "معلقة بانتظار الدفع", labelEn: "PENDING PAYMENT", bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
      issued: { labelAr: "صادرة ومعتمدة", labelEn: "ISSUED & VERIFIED", bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
      overdue: { labelAr: "متأخرة السداد", labelEn: "OVERDUE", bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
      cancelled: { labelAr: "ملغاة", labelEn: "CANCELLED", bg: "#f8fafc", color: "#64748b", border: "#cbd5e1" },
    };
    const statusInfo = statusMap[invoice.status ?? "paid"] ?? statusMap.paid;

    /* ── Item Rows ── */
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

    /* ── HTML A4 Document ── */
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>فاتورة ضريبية - ${canonicalInvoiceNumber} - منصة رفق</title>
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
    border-bottom: 2.5px solid #064e3b;
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

  .brand-logo-svg {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
  }

  .brand-title {
    font-size: 20px;
    font-weight: 900;
    color: #064e3b;
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
    background: linear-gradient(135deg, #064e3b, #047857);
    color: #ffffff;
    font-size: 13px;
    font-weight: 900;
    padding: 4px 14px;
    border-radius: 8px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .inv-sub-badge {
    font-size: 10px;
    font-weight: 700;
    color: #047857;
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
    font-size: 15px;
    color: #064e3b;
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

  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 800;
    background: ${statusInfo.bg};
    color: ${statusInfo.color};
    border: 1px solid ${statusInfo.border};
  }

  /* ═══════════ PARTIES GRID ═══════════ */
  .parties-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .party-card {
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    position: relative;
  }

  .party-card.vendor-card {
    border-top: 3px solid #047857;
    background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 40%);
  }

  .party-card.client-card {
    border-top: 3px solid #1e40af;
    background: linear-gradient(180deg, #eff6ff 0%, #ffffff 40%);
  }

  .party-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-bottom: 6px;
  }

  .party-tag {
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .vendor-card .party-tag { color: #047857; }
  .client-card .party-tag { color: #1e40af; }

  .party-name {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }

  .party-row {
    font-size: 10.5px;
    color: #475569;
    margin-bottom: 2px;
    display: flex;
    justify-content: space-between;
  }

  .party-row span:first-child {
    color: #64748b;
    font-weight: 600;
  }

  .party-row span:last-child {
    font-weight: 700;
    color: #0f172a;
  }

  /* ═══════════ VEHICLE SPECS BAR ═══════════ */
  .vehicle-strip {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .v-item {
    font-size: 10px;
  }

  .v-label {
    color: #64748b;
    font-weight: 700;
    margin-bottom: 1px;
  }

  .v-value {
    color: #0f172a;
    font-weight: 800;
    font-size: 11px;
  }

  /* ═══════════ ITEMS TABLE ═══════════ */
  .table-section {
    margin-bottom: 12px;
  }

  .table-title {
    font-size: 12px;
    font-weight: 800;
    color: #064e3b;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    font-size: 10.5px;
  }

  .items-table thead {
    background: #064e3b;
    color: #ffffff;
  }

  .items-table th {
    padding: 7px 8px;
    font-weight: 800;
    text-align: center;
    font-size: 10px;
    border-left: 1px solid rgba(255, 255, 255, 0.15);
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
    color: #064e3b;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  /* ═══════════ TOTALS & QR SECTION ═══════════ */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
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
    color: #047857;
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
    color: #064e3b;
    font-size: 9px;
  }

  /* ═══════════ TOTALS CARD ═══════════ */
  .totals-card {
    border: 1.5px solid #064e3b;
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
    background: #064e3b;
    color: #ffffff;
    font-size: 13px;
    font-weight: 900;
    padding: 8px 12px;
    border-bottom: none;
  }

  .totals-row.grand-row span:last-child {
    color: #ffffff;
    font-size: 15px;
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
    color: #064e3b;
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

<div class="a4-container">

  <div>
    <!-- ══════════════ 1. HEADER SECTION ══════════════ -->
    <div class="header-wrap">
      <div class="header-grid">
        
        <!-- Platform Branding (Right) -->
        <div class="brand-block">
          <!-- RFQ SA Infinity Vector Logo -->
          <svg class="brand-logo-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" rx="36" fill="#064E3B"/>
            <path d="M 50 100 C 50 65, 95 65, 120 100 C 145 135, 190 135, 190 100 C 190 65, 145 65, 120 100 C 95 135, 50 135, 50 100 Z" stroke="#10B981" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="65" cy="115" r="10" fill="#34D399"/>
            <circle cx="135" cy="85" r="10" fill="#F59E0B"/>
          </svg>

          <div>
            <div class="brand-title">
              <span>منصة رِفْق لقطع الغيار</span>
              <span class="brand-title-badge">موثقة ZATCA</span>
            </div>
            <div class="brand-sub">RFQ SA – The Saudi Automotive B2B Marketplace</div>
            <div class="brand-meta">سجل تجاري المنصة: 1010892341 &bull; الرقم الضريبي: 310984726100003 &bull; الرياض، المملكة العربية السعودية</div>
          </div>
        </div>

        <!-- Invoice Title & IDs (Left) -->
        <div class="inv-title-block">
          <div class="inv-main-badge">فاتورة ضريبية إلكترونية</div>
          <div class="inv-sub-badge">Electronic Tax Invoice</div>
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
        <div class="meta-val text-emerald-800">${deliveryMethodLabel}</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">حالة الفاتورة / Status</div>
        <div class="meta-val">
          <span class="status-badge">${statusInfo.labelAr}</span>
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
          <span class="font-mono" dir="ltr">${vendorVat}</span>
        </div>
        <div class="party-row">
          <span>السجل التجاري (CR):</span>
          <span class="font-mono" dir="ltr">${vendorCR}</span>
        </div>
        <div class="party-row">
          <span>العنوان والفرع:</span>
          <span>${vendorAddress}</span>
        </div>
        <div class="party-row">
          <span>الهاتف / التواصل:</span>
          <span class="font-mono" dir="ltr">${vendorPhone}</span>
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
        <div class="party-row">
          <span>الهاتف / التواصل:</span>
          <span class="font-mono" dir="ltr">${clientPhone}</span>
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
        <span>&bull; تفاصيل قطع الغيار والخدمات المطلوبة</span>
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
            <th style="width:75px">ضريبة (15%)</th>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>فاتورة إلكترونية موثقة عبر منصة رفق</span>
          </div>
          <div class="cert-text">
            رمز الاستجابة السريعة (QR Code) مشفر ومطابق لاشتراطات المرحلة الثانية للربط والتكامل مع هيئة الزكاة والضريبة والجمارك (ZATCA).
          </div>
          <div class="zatca-tag">
            معرف الفاتورة: #${canonicalInvoiceNumber}
          </div>
        </div>
      </div>

      <!-- Financial Calculation Card -->
      <div class="totals-card">
        <div class="totals-row">
          <span>الإجمالي الفرعي (قبل الضريبة) / Subtotal:</span>
          <span>${fmt(subtotal)} ر.س</span>
        </div>
        ${discountAmount > 0 ? `
        <div class="totals-row" style="color:#047857;background:#f0fdf4">
          <span>خصم كوبون الترويج / Discount:</span>
          <span>-${fmt(discountAmount)} ر.س</span>
        </div>` : ""}
        <div class="totals-row">
          <span>ضريبة القيمة المضافة (15% VAT):</span>
          <span>${fmt(vat)} ر.س</span>
        </div>
        <div class="totals-row">
          <span>رسوم التوصيل / Delivery Fee:</span>
          <span>${deliveryFee > 0 ? `${fmt(deliveryFee)} ر.س` : '<span style="color:#047857;font-weight:800">مجانية (0.00 ر.س)</span>'}</span>
        </div>
        ${paymentFee > 0 ? `
        <div class="totals-row">
          <span>رسوم معالجة الدفع / Processing Fee:</span>
          <span>${fmt(paymentFee)} ر.س</span>
        </div>` : ""}
        <div class="totals-row grand-row">
          <span>المجموع الكلي النهائي / GRAND TOTAL:</span>
          <span>${fmt(grandTotal)} ر.س</span>
        </div>
      </div>

    </div>

    ${invoice.notes ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:10px;color:#78350f">
      <strong>ملاحظات الطلب:</strong> ${invoice.notes}
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

    /* ── Open & print with iframe fallback ── */
    try {
      const win = window.open("", "_blank", "width=1000,height=850");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {}
          setBusy(false);
        }, 600);
        return;
      }
    } catch (e) {
      console.warn("Popup window blocked, trying iframe print:", e);
    }

    // Fallback: Invisible iframe printing
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {}
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
          setBusy(false);
        }, 600);
        return;
      }
    } catch (err) {
      console.error("Iframe print error:", err);
    }
    setBusy(false);
  };

  return (
    <button
      onClick={handleExport}
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
  );
}
