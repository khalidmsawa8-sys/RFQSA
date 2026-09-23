/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RIFQ ENTERPRISE EXCEL EXPORT UTILITY (أداة تصدير بيانات الإدارة لإكسيل)
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates formatted, styled, RTL-native Microsoft Excel (.xlsx) workbooks
 * with corporate headers, zebra row striping, and auto-adjusted column widths.
 */

import ExcelJS from "exceljs";

export interface ExportRowData {
  displayId: string;
  itemType: string;
  carMake: string;
  carModel: string;
  carYear: string | number;
  plateNumber: string;
  vin: string;
  formattedDate: string;
  statusLabel?: string | null;
  amountOrQuotes?: string | number | null;
  partsText: string;
  partyName?: string | null;
  deliveryLocation?: string | null;
}

/**
 * Format any raw JSON or string parts description into human-readable Arabic text
 */
export function formatPartsDescriptionText(partsInput: any): string {
  if (!partsInput) return "—";
  if (typeof partsInput === "object") {
    if (Array.isArray(partsInput)) {
      if (partsInput.length === 0) return "—";
      return partsInput
        .map((p: any, i: number) => {
          const name = p.name || p.partName || p.part_name || `قطعة ${i + 1}`;
          const qty = p.quantity || p.qty || 1;
          const type =
            p.partTypeName ||
            (p.partType === "oem" || p.partType === "original"
              ? "أصلي OEM"
              : p.partType === "commercial"
              ? p.commercialBrand
                ? `تجاري (${p.commercialBrand})`
                : "تجاري معتمد"
              : p.partType === "used"
              ? "تشليح أصلي"
              : "");
          const pn = p.partNumber || p.part_number;
          const price = p.unitPrice || p.unit_price ? ` [${p.unitPrice || p.unit_price} ر.س]` : "";
          return `${name}${type ? ` (${type})` : ""}${pn ? ` [رقم: ${pn}]` : ""} × ${qty}${price}`;
        })
        .join(" | ");
    }
    return JSON.stringify(partsInput);
  }

  if (typeof partsInput === "string") {
    const trimmed = partsInput.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatPartsDescriptionText(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  return String(partsInput);
}

export async function exportOrdersToExcel(
  rows: ExportRowData[],
  fileNamePrefix: string = "طلبات_وعمليات_رفق"
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة رفق RFQ";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("قائمة العمليات");
  (worksheet as any).views = [{ rightToLeft: true, showGridLines: true }];

  // 1. Define Columns
  worksheet.columns = [
    { header: "رقم الطلب", key: "displayId", width: 16 },
    { header: "نوع المعاملة", key: "itemType", width: 16 },
    { header: "الماركة", key: "carMake", width: 16 },
    { header: "الموديل", key: "carModel", width: 16 },
    { header: "سنة الصنع", key: "carYear", width: 12 },
    { header: "رقم اللوحة", key: "plateNumber", width: 15 },
    { header: "رقم الهيكل (VIN)", key: "vin", width: 24 },
    { header: "تاريخ الطلب", key: "formattedDate", width: 16 },
    { header: "الحالة", key: "statusLabel", width: 18 },
    { header: "المبلغ / العروض", key: "amountOrQuotes", width: 18 },
    { header: "تفاصيل القطع", key: "partsText", width: 40 },
    { header: "الجهة المقابلة", key: "partyName", width: 22 },
    { header: "موقع التسليم", key: "deliveryLocation", width: 24 },
  ];

  // 2. Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B4D3E" },
    };
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0F3328" } },
      bottom: { style: "medium", color: { argb: "FF0F3328" } },
      left: { style: "thin", color: { argb: "FF2E6B57" } },
      right: { style: "thin", color: { argb: "FF2E6B57" } },
    };
  });

  // 3. Add Data Rows
  rows.forEach((row, index) => {
    const isEven = index % 2 === 0;
    const addedRow = worksheet.addRow({
      displayId: row.displayId,
      itemType: row.itemType === "order" ? "أمر شراء معتمد" : "طلب تسعير (RFQ)",
      carMake: row.carMake || "—",
      carModel: row.carModel || "—",
      carYear: row.carYear || "—",
      plateNumber: row.plateNumber || "—",
      vin: row.vin && row.vin !== "—" ? row.vin : "غير مدخل",
      formattedDate: row.formattedDate,
      statusLabel: row.statusLabel || "—",
      amountOrQuotes:
        typeof row.amountOrQuotes === "number"
          ? `${row.amountOrQuotes} ر.س`
          : row.amountOrQuotes || "—",
      partsText: formatPartsDescriptionText(row.partsText),
      partyName: row.partyName || "—",
      deliveryLocation: row.deliveryLocation || "الرياض",
    });

    addedRow.height = 26;
    addedRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: "FF1E293B" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 11 || colNumber === 12 || colNumber === 13 ? "right" : "center",
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  // 4. Download Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `${fileNamePrefix}_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export interface AdminOrderExportRow {
  orderId: string;
  status: string;
  formattedDate: string;
  clientName: string;
  clientCompany?: string;
  clientRefCode?: string;
  clientPhone?: string;
  vendorName: string;
  vendorCompany?: string;
  vendorRefCode?: string;
  vendorPhone?: string;
  carMake: string;
  carModel: string;
  carYear: string | number;
  plateNumber: string;
  vin?: string;
  orderDetails: string;
  totalPrice: number | string;
}

/**
 * Enterprise Admin Orders Comprehensive Excel (.xlsx) Exporter
 */
export async function exportAdminOrdersToExcel(
  rows: AdminOrderExportRow[],
  fileNamePrefix: string = "طلبات_المنصة_الشاملة"
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة رفق RFQ - الإدارة العامة";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("سجل الطلبات والصفقات");
  (worksheet as any).views = [{ rightToLeft: true, showGridLines: true }];

  // 1. Define Columns
  worksheet.columns = [
    { header: "رقم الطلب", key: "orderId", width: 16 },
    { header: "الحالة", key: "status", width: 16 },
    { header: "تاريخ الطلب", key: "formattedDate", width: 16 },
    { header: "اسم العميل", key: "clientName", width: 22 },
    { header: "شركة العميل", key: "clientCompany", width: 24 },
    { header: "كود العميل", key: "clientRefCode", width: 14 },
    { header: "جوال العميل", key: "clientPhone", width: 16 },
    { header: "اسم المورد", key: "vendorName", width: 22 },
    { header: "شركة المورد", key: "vendorCompany", width: 24 },
    { header: "كود المورد", key: "vendorRefCode", width: 14 },
    { header: "جوال المورد", key: "vendorPhone", width: 16 },
    { header: "المركبة", key: "vehicle", width: 22 },
    { header: "سنة الصنع", key: "carYear", width: 12 },
    { header: "رقم اللوحة", key: "plateNumber", width: 15 },
    { header: "رقم الهيكل VIN", key: "vin", width: 22 },
    { header: "تفاصيل الطلب والقطع", key: "orderDetails", width: 50 },
    { header: "المبلغ الإجمالي (ر.س)", key: "totalPrice", width: 20 },
  ];

  // 2. Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D5C3A" },
    };
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF083D26" } },
      bottom: { style: "medium", color: { argb: "FF083D26" } },
      left: { style: "thin", color: { argb: "FF1E7E52" } },
      right: { style: "thin", color: { argb: "FF1E7E52" } },
    };
  });

  // 3. Add Rows
  rows.forEach((row, index) => {
    const isEven = index % 2 === 0;
    const addedRow = worksheet.addRow({
      orderId: row.orderId,
      status: row.status,
      formattedDate: row.formattedDate,
      clientName: row.clientName || "—",
      clientCompany: row.clientCompany || "—",
      clientRefCode: row.clientRefCode || "—",
      clientPhone: row.clientPhone || "—",
      vendorName: row.vendorName || "—",
      vendorCompany: row.vendorCompany || "—",
      vendorRefCode: row.vendorRefCode || "—",
      vendorPhone: row.vendorPhone || "—",
      vehicle: `${row.carMake || ""} ${row.carModel || ""}`.trim() || "—",
      carYear: row.carYear || "—",
      plateNumber: row.plateNumber || "—",
      vin: row.vin && row.vin !== "—" ? row.vin : "—",
      orderDetails: formatPartsDescriptionText(row.orderDetails),
      totalPrice:
        typeof row.totalPrice === "number"
          ? `${row.totalPrice.toLocaleString("ar-SA")} ر.س`
          : row.totalPrice || "—",
    });

    addedRow.height = 30;
    addedRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: "FF1E293B" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 16 ? "right" : "center",
        wrapText: colNumber === 16,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  // 4. Download Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `${fileNamePrefix}_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export interface AdminInvoiceExportRow {
  invoiceNumber: string;
  orderId: string;
  status: string;
  clientName: string;
  clientCompany?: string;
  clientRefCode?: string;
  clientTaxNumber?: string;
  vendorName: string;
  vendorCompany?: string;
  vendorRefCode?: string;
  vendorTaxNumber?: string;
  vehicle: string;
  plateNumber: string;
  vin?: string;
  orderDetails: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  issuedAt: string;
  paidAt?: string;
}

/**
 * Enterprise Admin Invoices Comprehensive Excel (.xlsx) Exporter
 */
export async function exportAdminInvoicesToExcel(
  rows: AdminInvoiceExportRow[],
  fileNamePrefix: string = "فواتير_المنصة_الضريبية_الشاملة"
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة رفق RFQ - الإدارة المالية";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("سجل الفواتير الضريبية");
  (worksheet as any).views = [{ rightToLeft: true, showGridLines: true }];

  worksheet.columns = [
    { header: "رقم الفاتورة", key: "invoiceNumber", width: 18 },
    { header: "رقم الطلب", key: "orderId", width: 16 },
    { header: "الحالة", key: "status", width: 15 },
    { header: "تاريخ الإصدار", key: "issuedAt", width: 16 },
    { header: "العميل", key: "clientName", width: 22 },
    { header: "الرقم الضريبي للعميل", key: "clientTaxNumber", width: 20 },
    { header: "كود العميل", key: "clientRefCode", width: 14 },
    { header: "المورد", key: "vendorName", width: 22 },
    { header: "الرقم الضريبي للمورد", key: "vendorTaxNumber", width: 20 },
    { header: "كود المورد", key: "vendorRefCode", width: 14 },
    { header: "بيانات المركبة واللوحة", key: "vehicle", width: 24 },
    { header: "رقم الهيكل VIN", key: "vin", width: 20 },
    { header: "تفاصيل الطلب والقطع", key: "orderDetails", width: 45 },
    { header: "المبلغ قبل الضريبة (ر.س)", key: "subtotal", width: 20 },
    { header: "ضريبة 15% (ر.س)", key: "taxAmount", width: 16 },
    { header: "الإجمالي شامل الضريبة (ر.س)", key: "totalAmount", width: 22 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF064E3B" },
    };
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF043327" } },
      bottom: { style: "medium", color: { argb: "FF043327" } },
      left: { style: "thin", color: { argb: "FF0F766E" } },
      right: { style: "thin", color: { argb: "FF0F766E" } },
    };
  });

  rows.forEach((row, index) => {
    const isEven = index % 2 === 0;
    const addedRow = worksheet.addRow({
      invoiceNumber: row.invoiceNumber,
      orderId: row.orderId || "—",
      status: row.status,
      issuedAt: row.issuedAt,
      clientName: row.clientCompany || row.clientName || "—",
      clientTaxNumber: row.clientTaxNumber || "—",
      clientRefCode: row.clientRefCode || "—",
      vendorName: row.vendorCompany || row.vendorName || "—",
      vendorTaxNumber: row.vendorTaxNumber || "—",
      vendorRefCode: row.vendorRefCode || "—",
      vehicle: `${row.vehicle || ""}${row.plateNumber ? ` [${row.plateNumber}]` : ""}`.trim() || "—",
      vin: row.vin || "—",
      orderDetails: formatPartsDescriptionText(row.orderDetails),
      subtotal: `${Number(row.subtotal || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`,
      taxAmount: `${Number(row.taxAmount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`,
      totalAmount: `${Number(row.totalAmount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`,
    });

    addedRow.height = 28;
    addedRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: "FF1E293B" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 13 ? "right" : "center",
        wrapText: colNumber === 13,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `${fileNamePrefix}_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export interface AdminWalletLedgerExportRow {
  reference: string;
  invoiceNumber?: string;
  userName: string;
  userCompany?: string;
  userRefCode?: string;
  userRole?: string;
  type: "credit" | "debit" | string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

/**
 * Enterprise Admin Wallet Ledger Excel (.xlsx) Exporter - Exactly matches Web Table
 */
export async function exportAdminWalletLedgerToExcel(
  rows: AdminWalletLedgerExportRow[],
  fileNamePrefix: string = "كشف_حركات_المحافظ_المالية"
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة رفق RFQ - الإدارة المالية";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("سجل الحركات المالية");
  (worksheet as any).views = [{ rightToLeft: true, showGridLines: true }];

  // Exactly matching the web table columns:
  // رقم المرجع | رقم الفاتورة/الطلب | المستخدم والمنشأة | نوع العملية (دائن/مدين) | المبلغ | الرصيد بعد الحركة | البيان والسبب | التاريخ والوقت
  worksheet.columns = [
    { header: "رقم المرجع", key: "reference", width: 18 },
    { header: "رقم الفاتورة / الطلب", key: "invoiceNumber", width: 18 },
    { header: "المستخدم والمنشأة", key: "user", width: 26 },
    { header: "كود الحساب", key: "userRefCode", width: 14 },
    { header: "نوع الحساب", key: "userRole", width: 14 },
    { header: "نوع العملية", key: "type", width: 16 },
    { header: "المبلغ (ر.س)", key: "amount", width: 18 },
    { header: "الرصيد بعد الحركة (ر.س)", key: "balanceAfter", width: 22 },
    { header: "البيان والسبب", key: "description", width: 40 },
    { header: "التاريخ والوقت", key: "createdAt", width: 22 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Luxury dark slate
    };
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  rows.forEach((row, index) => {
    const isEven = index % 2 === 0;
    const isCredit = row.type === "credit";
    const addedRow = worksheet.addRow({
      reference: row.reference,
      invoiceNumber: row.invoiceNumber || "—",
      user: `${row.userCompany || row.userName || "—"}`,
      userRefCode: row.userRefCode || "—",
      userRole: row.userRole === "client" ? "عميل" : row.userRole === "vendor" ? "مورد" : row.userRole === "courier" ? "مندوب" : "مستخدم",
      type: isCredit ? "دائن (إيداع +)" : "مدين (سحب/دفع -)",
      amount: `${isCredit ? "+" : "-"}${Number(row.amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`,
      balanceAfter: `${Number(row.balanceAfter || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`,
      description: row.description || "—",
      createdAt: row.createdAt,
    });

    addedRow.height = 26;
    addedRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: colNumber === 7 ? (isCredit ? "FF047857" : "FFB91C1C") : "FF1E293B" },
        bold: colNumber === 7 || colNumber === 8,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 9 ? "right" : "center",
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `${fileNamePrefix}_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export interface AdminWalletUserExportRow {
  name: string;
  companyName?: string;
  refCode?: string;
  role: string;
  balance: number;
  phone?: string;
  email?: string;
}

/**
 * Enterprise Admin Wallet Users Balances Excel (.xlsx) Exporter
 */
export async function exportAdminWalletUsersToExcel(
  rows: AdminWalletUserExportRow[],
  fileNamePrefix: string = "كشف_أرصدة_محافظ_المستخدمين"
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة رفق RFQ - الإدارة المالية";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("أرصدة المحافظ");
  (worksheet as any).views = [{ rightToLeft: true, showGridLines: true }];

  worksheet.columns = [
    { header: "المستخدم والمنشأة", key: "user", width: 26 },
    { header: "كود الحساب", key: "refCode", width: 14 },
    { header: "نوع الحساب", key: "role", width: 14 },
    { header: "الرصيد الحالي (ر.س)", key: "balance", width: 20 },
    { header: "رقم الجوال", key: "phone", width: 16 },
    { header: "البريد الإلكتروني", key: "email", width: 24 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D5C3A" },
    };
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF083D26" } },
      bottom: { style: "medium", color: { argb: "FF083D26" } },
      left: { style: "thin", color: { argb: "FF1E7E52" } },
      right: { style: "thin", color: { argb: "FF1E7E52" } },
    };
  });

  rows.forEach((row, index) => {
    const isEven = index % 2 === 0;
    const addedRow = worksheet.addRow({
      user: row.companyName || row.name || "—",
      refCode: row.refCode || "—",
      role: row.role === "client" ? "عميل" : row.role === "vendor" ? "مورد" : row.role === "courier" ? "مندوب توصيل" : "إداري",
      balance: `${Number(row.balance || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`,
      phone: row.phone || "—",
      email: row.email || "—",
    });

    addedRow.height = 26;
    addedRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: "FF1E293B" },
        bold: colNumber === 4,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 1 ? "right" : "center",
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `${fileNamePrefix}_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
