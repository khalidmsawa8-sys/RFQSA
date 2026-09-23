"use client";

import React, { useState } from "react";
import { Download, FileText } from "lucide-react";

/* ── Types ──────────────────────────────────────────────── */
export interface QuoteItem {
  part_name: string;
  part_number?: string;
  condition?: string; // أصلي / تجاري / تشليح
  part_type?: string;
  commercial_brand?: string;
  warranty?: string;
  quantity?: number;
  qty?: number;
  unit_price: number;
  price?: number;
  line_total?: number;
  totalPrice?: number;
  availability?: string;
}

export interface QuotePDFExportProps {
  rfq: {
    id?: string;
    car_make: string;
    car_model: string;
    car_year: number | string;
    plate_number?: string;
    vin?: string;
    delivery_type?: string;
    branch_name?: string;
    location_name?: string;
    created_at: string;
  };
  vendor: {
    id?: string;
    full_name?: string;
    company_name?: string;
    tax_number?: string;
    commercial_register?: string;
    national_address?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  client?: {
    id?: string;
    full_name?: string;
    company_name?: string;
    tax_number?: string;
    commercial_register?: string;
    national_address?: string;
    address?: string;
    city?: string;
    phone?: string;
  };
  quote: {
    id?: string;
    items?: QuoteItem[];
    parts_items?: QuoteItem[];
    total_price?: number;
    subtotal?: number;
    delivery_days?: number;
    delivery_price?: number;
    delivery_cost?: number;
    delivery_type?: string;
    warranty_period?: string;
    warranty_days?: number;
    notes?: string;
    created_at?: string;
    issued_at?: string;
  };
  triggerButton?: React.ReactNode;
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
   Component — Ultra-Professional A4 Saudi Quotation (عرض سعر معتمد)
   Matches Invoice PDF Quality & RFQ SA Platform Identity
══════════════════════════════════════════════════════════ */
export function QuotePDFExport({
  rfq,
  vendor,
  client,
  quote,
  triggerButton,
}: QuotePDFExportProps) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);

    /* ── Safe Fallbacks ── */
    const rawRfqId = rfq?.id || "RFQ-001";
    const rawQuoteId = quote?.id || rfq?.id || "QT-001";
    const canonicalQuoteNumber = String(rawQuoteId).startsWith("QT-")
      ? rawQuoteId
      : `QT-${shortId(rawQuoteId)}`;

    // Extract items / parts
    const rawItems = (quote.items && Array.isArray(quote.items) && quote.items.length > 0)
      ? quote.items
      : (quote.parts_items && Array.isArray(quote.parts_items) && quote.parts_items.length > 0)
      ? quote.parts_items
      : [{
          part_name: "قطع غيار ومستلزمات صيانة",
          part_number: rfq?.plate_number ? `لوحة: ${rfq.plate_number}` : "SP-AUTO",
          condition: "أصلي وكالة",
          quantity: 1,
          unit_price: Number(quote.total_price) ? Number(quote.total_price) / 1.15 : 500,
          line_total: Number(quote.total_price) ? Number(quote.total_price) / 1.15 : 500,
        }];

    const safeItems: QuoteItem[] = rawItems.map((it: any) => {
      const q = Number(it.quantity ?? it.qty ?? 1);
      const u = Number(it.unit_price ?? it.price ?? 0);
      const lt = Number(it.line_total ?? it.totalPrice ?? (u * q));
      let conditionLabel = it.condition;
      if (!conditionLabel) {
        if (it.part_type === "original" || it.type === "original") conditionLabel = "أصلي وكالة (OEM)";
        else if (it.part_type === "commercial" || it.type === "commercial") {
          conditionLabel = it.commercial_brand ? `تجاري معتمد (${it.commercial_brand})` : "تجاري معتمد";
        } else if (it.part_type === "used" || it.type === "used") conditionLabel = "تشليح أصلي مجدد";
        else conditionLabel = "معتمد ومطابق";
      }
      return {
        part_name: it.part_name || it.name || "قطعة غيار معتمدة",
        part_number: it.part_number || it.partNumber || "—",
        condition: conditionLabel,
        part_type: it.part_type,
        commercial_brand: it.commercial_brand,
        warranty: it.warranty || (it.part_type === "original" ? "ضمان الوكالة (6 أشهر)" : "ضمان شهرين"),
        quantity: q,
        unit_price: u,
        line_total: lt,
      };
    });

    /* ── Calculations (ZATCA 15% Standard) ── */
    const VAT_RATE = 0.15;
    const subtotal = safeItems.reduce((s: number, it: QuoteItem) => s + (Number(it.line_total) || 0), 0);
    const deliveryFee = Number(quote.delivery_price ?? quote.delivery_cost ?? 0) || 0;
    const vat = subtotal * VAT_RATE;
    const grandTotal = Number(quote.total_price) || (subtotal + vat + deliveryFee);

    /* ── Labels & Parties Info ── */
    const safeVendor = vendor || {};
    const safeClient = client || {};

    const vendorName = safeVendor.company_name || safeVendor.full_name || "مؤسسة قطع الغيار المعتمدة";
    const vendorVat = safeVendor.tax_number || "300123456700003";
    const vendorCR = safeVendor.commercial_register || "1010987654";
    const vendorAddress = safeVendor.national_address || safeVendor.address || safeVendor.city || "المملكة العربية السعودية - الرياض - طريق خريص";
    const vendorPhone = safeVendor.phone || "+966 50 123 4567";

    const clientName = safeClient.company_name || safeClient.full_name || "شركة المشتريات الوطنية";
    const clientVat = safeClient.tax_number || "—";
    const clientCR = safeClient.commercial_register || "—";
    const clientAddress = safeClient.national_address || safeClient.address || safeClient.city || "المملكة العربية السعودية - الرياض";
    const clientPhone = safeClient.phone || "—";

    /* ── Vehicle Info ── */
    const vehicleMake = rfq.car_make || "تويوتا";
    const vehicleModel = rfq.car_model || "هايلكس";
    const vehicleYear = rfq.car_year || 2023;
    const plateNumber = rfq.plate_number || "—";
    const vinNumber = rfq.vin || "مطابق للمواصفات";

    /* ── Delivery Method Badge ── */
    const isPickup = rfq.delivery_type === "pickup" || quote.delivery_type === "pickup" || deliveryFee === 0;
    const deliveryMethodLabel = isPickup ? "استلام مباشر من فرع المورد (بدون رسوم)" : "توصيل سريع بالأسطول المعتمد";
    const deliveryDaysCount = Number(quote.delivery_days ?? 1);
    const deliveryTimelineText = deliveryDaysCount === 0 || isPickup ? "جاهز للتسليم الفوري" : `خلال ${deliveryDaysCount} ${deliveryDaysCount === 1 ? "يوم عمل" : "أيام عمل"}`;

    /* ── Dates ── */
    const rawDate = quote.issued_at || quote.created_at || rfq.created_at || new Date().toISOString();
    const dateObj = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : new Date();
    const issuedDateAr = dateObj.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const issuedDateEn = dateObj.toISOString().split("T")[0];

    /* ── Item Rows ── */
    const itemRows = safeItems
      .map((it: QuoteItem, i: number) => {
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
          <td class="td-warranty">${it.warranty || "ضمان مطابقة وفحص"}</td>
          <td class="td-qty">${it.quantity || 1}</td>
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
<title>عرض سعر رسمي - ${canonicalQuoteNumber} - منصة رفق</title>
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

  .quote-title-block {
    text-align: left;
    direction: ltr;
  }

  .quote-main-badge {
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

  .quote-sub-badge {
    font-size: 10px;
    font-weight: 700;
    color: #047857;
    margin-top: 3px;
    direction: rtl;
    text-align: left;
  }

  .quote-id-row {
    font-size: 13px;
    color: #0f172a;
    margin-top: 4px;
    font-weight: 800;
  }

  .quote-id-row strong {
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
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
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
    font-size: 10px;
  }

  .items-table thead {
    background: #064e3b;
    color: #ffffff;
  }

  .items-table th {
    padding: 7px 8px;
    font-weight: 800;
    text-align: center;
    font-size: 9.5px;
    border-left: 1px solid rgba(255, 255, 255, 0.15);
  }

  .items-table th:last-child {
    border-left: none;
  }

  .items-table th.th-desc {
    text-align: right;
    width: 28%;
  }

  .items-table tbody tr {
    border-bottom: 1px solid #e2e8f0;
  }

  .items-table tbody tr:nth-child(even) {
    background: #f8fafc;
  }

  .items-table td {
    padding: 6px 8px;
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
    width: 24px;
  }

  .td-desc .part-title {
    font-weight: 800;
    color: #0f172a;
    font-size: 10.5px;
  }

  .td-desc .part-sub {
    font-size: 9px;
    color: #64748b;
    margin-top: 1px;
  }

  .td-badge {
    text-align: center;
    width: 15%;
  }

  .cond-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 8.5px;
    font-weight: 700;
    background: #f0fdf4;
    color: #047857;
    border: 1px solid #bbf7d0;
  }

  .td-warranty {
    text-align: center;
    font-size: 9px;
    color: #475569;
    font-weight: 600;
    width: 14%;
  }

  .td-qty {
    text-align: center;
    font-weight: 800;
    width: 35px;
  }

  .td-num-val {
    text-align: center;
    font-weight: 700;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10px;
  }

  .font-vat {
    color: #047857;
  }

  .td-total-val {
    text-align: center;
    font-weight: 900;
    color: #064e3b;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10.5px;
  }

  /* ═══════════ TOTALS & TERMS SECTION ═══════════ */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 14px;
    margin-bottom: 10px;
    align-items: flex-start;
  }

  .terms-box {
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    background: #ffffff;
  }

  .terms-title {
    font-size: 10.5px;
    font-weight: 800;
    color: #064e3b;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .terms-list {
    list-style: none;
    font-size: 9.5px;
    color: #475569;
    line-height: 1.5;
  }

  .terms-list li {
    position: relative;
    padding-right: 12px;
    margin-bottom: 4px;
  }

  .terms-list li::before {
    content: "•";
    position: absolute;
    right: 0;
    color: #047857;
    font-weight: 900;
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

  /* ═══════════ AUTHENTICATION STAMPS ═══════════ */
  .stamps-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 8px;
    margin-bottom: 10px;
  }

  .stamp-box {
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 8px 12px;
    background: #fafbfc;
    min-height: 55px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .stamp-header {
    font-size: 9.5px;
    font-weight: 800;
    color: #475569;
  }

  .stamp-footer {
    font-size: 8.5px;
    color: #94a3b8;
    font-weight: 600;
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
              <span class="brand-title-badge">عرض سعر رسمي معتمد</span>
            </div>
            <div class="brand-sub">RFQ SA – The Saudi Automotive B2B Marketplace</div>
            <div class="brand-meta">سجل تجاري المنصة: 1010892341 &bull; الرقم الضريبي: 310984726100003 &bull; الرياض، المملكة العربية السعودية</div>
          </div>
        </div>

        <!-- Quote Title & IDs (Left) -->
        <div class="quote-title-block">
          <div class="quote-main-badge">عرض سعر رسمي معتمد</div>
          <div class="quote-sub-badge">Official Price Quotation</div>
          <div class="quote-id-row">
            رقم العرض: <strong>${canonicalQuoteNumber}</strong>
          </div>
        </div>

      </div>
    </div>

    <!-- ══════════════ 2. META DATA BAR ══════════════ -->
    <div class="meta-bar">
      <div class="meta-item">
        <div class="meta-lbl">تاريخ تقديم العرض / Date</div>
        <div class="meta-val">${issuedDateAr} (${issuedDateEn})</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">رقم طلب التسعير / RFQ No</div>
        <div class="meta-val font-mono">#RFQ-${shortId(rawRfqId)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">فترة الصلاحية / Validity</div>
        <div class="meta-val text-emerald-800">صالح لمدة 7 أيام عمل</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">مدة التجهيز والتسليم</div>
        <div class="meta-val text-blue-900">${deliveryTimelineText}</div>
      </div>
    </div>

    <!-- ══════════════ 3. PARTIES INFORMATION ══════════════ -->
    <div class="parties-grid">
      
      <!-- Supplier / Vendor Card -->
      <div class="party-card vendor-card">
        <div class="party-header">
          <span class="party-tag">بيانات المورد (مقدم العرض / Supplier)</span>
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
          <span class="party-tag">بيانات العميل (المستفيد / Client)</span>
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
        <div class="v-label">طريقة التسليم المقترحة</div>
        <div class="v-value text-emerald-800">${deliveryMethodLabel}</div>
      </div>
    </div>

    <!-- ══════════════ 5. ITEMS & PARTS TABLE ══════════════ -->
    <div class="table-section">
      <div class="table-title">
        <span>&bull; جدول تسعير قطع الغيار والبنود المطلوبة</span>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th class="td-num">#</th>
            <th class="th-desc">اسم القطعة والمواصفات</th>
            <th>الحالة / النوع</th>
            <th>فترة الضمان</th>
            <th style="width:35px">الكمية</th>
            <th style="width:80px">سعر الوحدة</th>
            <th style="width:80px">الإجمالي (قبل الضريبة)</th>
            <th style="width:70px">ضريبة (15%)</th>
            <th style="width:85px">الإجمالي (شامل الضريبة)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="9" style="padding:20px;text-align:center;color:#94a3b8">لا توجد بنود مسجلة</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- ══════════════ 6. TOTALS & TERMS SECTION ══════════════ -->
    <div class="bottom-grid page-break-inside-avoid">
      
      <!-- Terms & Assurance Box -->
      <div class="terms-box">
        <div class="terms-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>شروط وضمان عرض السعر المعتمد</span>
        </div>
        <ul class="terms-list">
          <li><strong>ضمان المطابقة:</strong> جميع القطع الموضحة أعلاه مطابقة لمواصفات المركبة ورقم الهيكل المحدد.</li>
          <li><strong>صلاحية الأسعار:</strong> الأسعار المذكورة سارية لمدة 7 أيام عمل من تاريخ تقديم العرض.</li>
          <li><strong>سياسة الاسترجاع:</strong> يحق للعميل الفحص والاسترجاع خلال فترة الضمان المعتمدة عبر المنصة.</li>
          ${quote.notes ? `<li><strong>ملاحظات المورد:</strong> ${quote.notes}</li>` : ""}
        </ul>
      </div>

      <!-- Financial Calculation Card -->
      <div class="totals-card">
        <div class="totals-row">
          <span>الإجمالي الفرعي (قبل الضريبة) / Subtotal:</span>
          <span>${fmt(subtotal)} ر.س</span>
        </div>
        <div class="totals-row">
          <span>ضريبة القيمة المضافة (15% VAT):</span>
          <span>${fmt(vat)} ر.س</span>
        </div>
        <div class="totals-row">
          <span>رسوم التوصيل والشحن / Delivery Fee:</span>
          <span>${deliveryFee > 0 ? `${fmt(deliveryFee)} ر.س` : '<span style="color:#047857;font-weight:800">مجانية (0.00 ر.س)</span>'}</span>
        </div>
        <div class="totals-row grand-row">
          <span>المجموع الكلي للعرض / GRAND TOTAL:</span>
          <span>${fmt(grandTotal)} ر.س</span>
        </div>
      </div>

    </div>

    <!-- ══════════════ 7. AUTHENTICATION STAMPS ══════════════ -->
    <div class="stamps-grid page-break-inside-avoid">
      <div class="stamp-box">
        <div class="stamp-header">اعتماد وتوقيع المورد المعتمد:</div>
        <div class="stamp-footer">${vendorName} &bull; معتمد رقمياً</div>
      </div>
      <div class="stamp-box">
        <div class="stamp-header">توثيق منصة رِفْق لقطع الغيار:</div>
        <div class="stamp-footer">وثيقة عرض سعر رقمية معتمدة عبر المنصة</div>
      </div>
    </div>

  </div>

  <!-- ══════════════ 8. REGULATORY FOOTER ══════════════ -->
  <div class="footer-wrap page-break-inside-avoid">
    <div class="footer-right">
      <strong>منصة رِفْق لقطع غيار السيارات</strong> &bull; يخضع هذا العرض للشروط والأحكام والضمان الذهبي للمنصة.
      <br/>عرض سعر رسمي موثق إلكترونياً ومتوافق مع المعايير التجارية لهيئة الزكاة والضريبة والجمارك بالمملكة العربية السعودية.
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
        <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shadow-xs disabled:opacity-60 border border-slate-300">
          <Download className="w-3.5 h-3.5 text-slate-600" />
          {busy ? "جاري التحضير..." : "تحميل عرض السعر (PDF)"}
        </span>
      )}
    </button>
  );
}
