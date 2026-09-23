/**
 * Fleet Vehicles Excel & CSV Exporter
 * Generates high-fidelity formatted Excel (.xlsx) workbooks styled identically
 * to the RFQ Marketplace vehicle management table with corporate banner, KPI cards,
 * color-coded status badges, license plate pill borders, RTL layout, and CSV fallback.
 */

import ExcelJS from "exceljs";
import { VehicleEntity } from "./fleet.types";

export interface ExportVehiclesOptions {
  vehicles: VehicleEntity[];
  branchLookup?: (branchId?: string) => string;
  filenamePrefix?: string;
  branchesList?: Array<{ id: string; title: string }>;
}

/**
 * Generates and triggers browser download of a fully formatted Excel (.xlsx) file
 * with the exact same visual design, colors, badges, and layout as the web app table.
 */
export async function exportVehiclesToFormattedExcel({
  vehicles,
  branchLookup,
  filenamePrefix = "تقرير_مركبات_الأسطول",
  branchesList = [],
}: ExportVehiclesOptions): Promise<number> {
  if (!vehicles || vehicles.length === 0) {
    return 0;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة المشتريات B2B (RFQ Marketplace)";
  workbook.lastModifiedBy = "نظام إدارة الأسطول المؤسسي";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create worksheet with Right-To-Left view enabled for Arabic
  const worksheet = workbook.addWorksheet("أسطول المركبات", {
    views: [{ rightToLeft: true, showGridLines: true }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // 1. Configure Column Widths (matching the web app column structure)
  worksheet.columns = [
    { key: "index", width: 7 }, // م
    { key: "brand", width: 16 }, // الماركة
    { key: "model", width: 16 }, // الموديل
    { key: "year", width: 13 }, // سنة الصنع
    { key: "trim", width: 15 }, // الفئة (Trim)
    { key: "plate", width: 18 }, // رقم اللوحة
    { key: "vin", width: 26 }, // رقم الهيكل (VIN)
    { key: "branch", width: 24 }, // الفرع المرتبط
    { key: "color", width: 15 }, // اللون الخارجي
    { key: "status", width: 22 }, // حالة المركبة
    { key: "favorite", width: 13 }, // المفضلة
    { key: "created_at", width: 16 }, // تاريخ الإضافة
    { key: "notes", width: 36 }, // ملاحظات الصيانة والتشغيل
  ];

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedDateTime = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} - ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;

  // 2. Row 1: Main Header Banner (Dark Navy Theme matching App Header)
  worksheet.mergeCells("A1:M1");
  const bannerRow = worksheet.getRow(1);
  bannerRow.height = 42;
  const bannerCell = worksheet.getCell("A1");
  bannerCell.value = "🚗 تقرير أسطول المركبات المؤسسي — منصة المشتريات B2B (Fleet Management)";
  bannerCell.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  bannerCell.alignment = { horizontal: "center", vertical: "middle" };
  bannerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0A1224" }, // Dark Navy
  };

  // 3. Row 2: Subtitle / System Meta Info
  worksheet.mergeCells("A2:M2");
  const metaRow = worksheet.getRow(2);
  metaRow.height = 22;
  const metaCell = worksheet.getCell("A2");
  metaCell.value = `تاريخ التصدير: ${formattedDateTime}  |  المنشأة: إدارة المشتريات والأسطول  |  إجمالي السجلات: ${vehicles.length} مركبة`;
  metaCell.font = { name: "Segoe UI", size: 9, bold: false, color: { argb: "FF94A3B8" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };

  // 4. Row 3: Blank Spacing Row
  worksheet.getRow(3).height = 10;

  // 5. Row 4: KPI Summary Cards (Total, Active, Maintenance, Branches)
  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;
  const uniqueBranchesCount =
    branchesList.length > 0 ? branchesList.length : new Set(vehicles.map((v) => v.branch_id)).size || 4;

  const kpiRow = worksheet.getRow(4);
  kpiRow.height = 28;

  // KPI 1: Total Fleet (A4:C4)
  worksheet.mergeCells("A4:C4");
  const kpiTotal = worksheet.getCell("A4");
  kpiTotal.value = `📊 إجمالي الأسطول: ${vehicles.length} مركبة`;
  kpiTotal.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1D4ED8" } }; // Blue-700
  kpiTotal.alignment = { horizontal: "center", vertical: "middle" };
  kpiTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }; // Blue-50
  kpiTotal.border = {
    top: { style: "thin", color: { argb: "FF93C5FD" } },
    bottom: { style: "thin", color: { argb: "FF93C5FD" } },
    left: { style: "thin", color: { argb: "FF93C5FD" } },
    right: { style: "thin", color: { argb: "FF93C5FD" } },
  };

  // KPI 2: Active Vehicles (D4:F4)
  worksheet.mergeCells("D4:F4");
  const kpiActive = worksheet.getCell("D4");
  kpiActive.value = `✅ المركبات النشطة: ${activeCount} مركبة`;
  kpiActive.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF047857" } }; // Emerald-700
  kpiActive.alignment = { horizontal: "center", vertical: "middle" };
  kpiActive.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } }; // Emerald-50
  kpiActive.border = {
    top: { style: "thin", color: { argb: "FF86EFAC" } },
    bottom: { style: "thin", color: { argb: "FF86EFAC" } },
    left: { style: "thin", color: { argb: "FF86EFAC" } },
    right: { style: "thin", color: { argb: "FF86EFAC" } },
  };

  // KPI 3: Under Maintenance (G4:I4)
  worksheet.mergeCells("G4:I4");
  const kpiMaint = worksheet.getCell("G4");
  kpiMaint.value = `⚠️ قيد الصيانة والقطع: ${maintenanceCount} مركبة`;
  kpiMaint.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFB45309" } }; // Amber-700
  kpiMaint.alignment = { horizontal: "center", vertical: "middle" };
  kpiMaint.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } }; // Amber-50
  kpiMaint.border = {
    top: { style: "thin", color: { argb: "FFFDE68A" } },
    bottom: { style: "thin", color: { argb: "FFFDE68A" } },
    left: { style: "thin", color: { argb: "FFFDE68A" } },
    right: { style: "thin", color: { argb: "FFFDE68A" } },
  };

  // KPI 4: Linked Branches (J4:M4)
  worksheet.mergeCells("J4:M4");
  const kpiBranches = worksheet.getCell("J4");
  kpiBranches.value = `🏢 الفروع المرتبطة: ${uniqueBranchesCount} فروع`;
  kpiBranches.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF6B21A8" } }; // Purple-700
  kpiBranches.alignment = { horizontal: "center", vertical: "middle" };
  kpiBranches.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF5FF" } }; // Purple-50
  kpiBranches.border = {
    top: { style: "thin", color: { argb: "FFD8B4FE" } },
    bottom: { style: "thin", color: { argb: "FFD8B4FE" } },
    left: { style: "thin", color: { argb: "FFD8B4FE" } },
    right: { style: "thin", color: { argb: "FFD8B4FE" } },
  };

  // 6. Row 5: Blank Spacing Row
  worksheet.getRow(5).height = 10;

  // 7. Row 6: Table Headers (Matching App UI columns exactly)
  const headers = [
    "م",
    "الماركة",
    "الموديل",
    "سنة الصنع",
    "الفئة (Trim)",
    "رقم اللوحة",
    "رقم الهيكل (VIN)",
    "الفرع المرتبط",
    "اللون الخارجي",
    "حالة المركبة",
    "المفضلة",
    "تاريخ الإضافة",
    "ملاحظات الصيانة والتشغيل",
  ];

  const headerRow = worksheet.getRow(6);
  headerRow.height = 30;
  headers.forEach((headerText, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = headerText;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Slate-800
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  // Helper for branch title
  const getBranch = (branchId?: string) => {
    if (branchLookup) return branchLookup(branchId);
    if (!branchId) return "فرع الرياض";
    const match = branchesList.find((b) => b.id === branchId);
    return match ? match.title : branchId;
  };

  // 8. Rows 7+: Vehicle Data Rows with styled cells & badges
  let currentRowIndex = 7;

  vehicles.forEach((v, index) => {
    const row = worksheet.getRow(currentRowIndex);
    row.height = 26;

    const isEven = index % 2 === 1;
    const baseRowBg = isEven ? "FFF8FAFC" : "FFFFFFFF"; // Zebra striping

    const branchName = getBranch(v.branch_id);
    const isMaintenance = v.status === "maintenance";
    const statusText = isMaintenance ? "قيد الصيانة والقطع" : "نشطة (جاهزة للتشغيل)";
    const favoriteText = v.is_favorite ? "⭐ نعم" : "لا";
    const createdDate = v.created_at
      ? new Date(v.created_at).toLocaleDateString("ar-SA")
      : "—";

    const rowData = [
      index + 1, // م
      v.brand_name || "—", // الماركة
      v.model_name || "—", // الموديل
      v.year || "—", // سنة الصنع
      v.trim || "قياسي", // الفئة
      v.plate_number || "—", // رقم اللوحة
      v.vin || "—", // رقم الهيكل
      branchName, // الفرع
      v.color || "أبيض", // اللون
      statusText, // الحالة
      favoriteText, // المفضلة
      createdDate, // تاريخ الإضافة
      v.notes || "لا توجد ملاحظات", // ملاحظات
    ];

    rowData.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;

      // Default cell styling
      cell.font = { name: "Segoe UI", size: 10, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseRowBg } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Specific Column Custom Styling:

      // Col 1: Index (م)
      if (colIdx === 0) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF64748B" } };
      }

      // Col 2 & 3: Brand & Model
      if (colIdx === 1 || colIdx === 2) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      }

      // Col 4: Year
      if (colIdx === 3) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF334155" } };
      }

      // Col 6: Plate Number (Styled like a Saudi license plate pill badge)
      if (colIdx === 5) {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = {
          top: { style: "medium", color: { argb: "FF94A3B8" } },
          bottom: { style: "medium", color: { argb: "FF94A3B8" } },
          left: { style: "medium", color: { argb: "FF94A3B8" } },
          right: { style: "medium", color: { argb: "FF94A3B8" } },
        };
      }

      // Col 7: VIN (Monospace uppercase)
      if (colIdx === 6) {
        cell.font = { name: "Consolas", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
      }

      // Col 8: Branch (Purple Badge)
      if (colIdx === 7) {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF6B21A8" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF5FF" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE9D5FF" } },
          bottom: { style: "thin", color: { argb: "FFE9D5FF" } },
          left: { style: "thin", color: { argb: "FFE9D5FF" } },
          right: { style: "thin", color: { argb: "FFE9D5FF" } },
        };
      }

      // Col 10: Status (Green Badge for Active, Amber for Maintenance)
      if (colIdx === 9) {
        if (isMaintenance) {
          cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFB45309" } }; // Amber-700
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } }; // Amber-50
          cell.border = {
            top: { style: "thin", color: { argb: "FFFDE68A" } },
            bottom: { style: "thin", color: { argb: "FFFDE68A" } },
            left: { style: "thin", color: { argb: "FFFDE68A" } },
            right: { style: "thin", color: { argb: "FFFDE68A" } },
          };
        } else {
          cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF047857" } }; // Emerald-700
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } }; // Emerald-50
          cell.border = {
            top: { style: "thin", color: { argb: "FFA7F3D0" } },
            bottom: { style: "thin", color: { argb: "FFA7F3D0" } },
            left: { style: "thin", color: { argb: "FFA7F3D0" } },
            right: { style: "thin", color: { argb: "FFA7F3D0" } },
          };
        }
      }

      // Col 11: Favorite (Gold star)
      if (colIdx === 10) {
        if (v.is_favorite) {
          cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFD97706" } };
        } else {
          cell.font = { name: "Segoe UI", size: 10, color: { argb: "FF94A3B8" } };
        }
      }

      // Col 13: Notes (Right aligned)
      if (colIdx === 12) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF475569" } };
      }
    });

    currentRowIndex++;
  });

  // 9. Footer Summary Row
  worksheet.mergeCells(`A${currentRowIndex}:M${currentRowIndex}`);
  const footerRow = worksheet.getRow(currentRowIndex);
  footerRow.height = 22;
  const footerCell = worksheet.getCell(`A${currentRowIndex}`);
  footerCell.value = `نظام إدارة المشتريات والأسطول B2B • تم إصدار وتنسيق هذا التقرير آلياً • إجمالي المركبات: ${vehicles.length}`;
  footerCell.font = { name: "Segoe UI", size: 8.5, italic: true, color: { argb: "FF64748B" } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
  footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  footerCell.border = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "medium", color: { argb: "FFCBD5E1" } },
  };

  // 10. Generate dynamic file name and trigger browser download as .xlsx
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const fileName = `${filenamePrefix}_${dateStr}_${timeStr}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return vehicles.length;
}

/**
 * Sanitizes a field against CSV / Excel Formula Injection and properly escapes double quotes.
 */
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Security: Excel Formula Injection Protection
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape inner double quotes
  str = str.replace(/"/g, '""');

  return `"${str}"`;
}

/**
 * Fallback / Alternative CSV Exporter:
 * Enhanced with Windows Excel regional compatibility (includes UTF-8 BOM and sep=, header
 * so Excel on Arabic Windows separates columns correctly instead of clumping them into Column A).
 */
export function exportVehiclesToExcelCsv({
  vehicles,
  branchLookup,
  filenamePrefix = "تقرير_مركبات_الأسطول",
}: ExportVehiclesOptions): number {
  if (!vehicles || vehicles.length === 0) {
    return 0;
  }

  const headers = [
    "م",
    "الماركة",
    "الموديل",
    "الفئة (Trim)",
    "سنة الصنع",
    "رقم اللوحة",
    "رقم الهيكل (VIN)",
    "الفرع المرتبط",
    "اللون الخارجي",
    "حالة المركبة",
    "المفضلة",
    "تاريخ الإضافة",
    "ملاحظات الصيانة والتشغيل",
  ];

  const headerRow = headers.map(sanitizeCsvField).join(",");

  const dataRows = vehicles.map((v, index) => {
    const branchName = branchLookup ? branchLookup(v.branch_id) : v.branch_id || "فرع الرياض";
    const statusText = v.status === "active" ? "نشطة (جاهزة للتشغيل)" : "قيد الصيانة والقطع";
    const favoriteText = v.is_favorite ? "نعم ⭐" : "لا";
    const createdDate = v.created_at
      ? new Date(v.created_at).toLocaleDateString("ar-SA")
      : "—";

    const rowFields = [
      index + 1,
      v.brand_name || "—",
      v.model_name || "—",
      v.trim || "قياسي",
      v.year || "—",
      v.plate_number || "—",
      v.vin || "—",
      branchName,
      v.color || "—",
      statusText,
      favoriteText,
      createdDate,
      v.notes || "لا توجد ملاحظات",
    ];

    return rowFields.map(sanitizeCsvField).join(",");
  });

  // sep=,\r\n tells Microsoft Excel explicitly what delimiter is used, preventing regional locale distortion
  const csvContent = "\uFEFFsep=,\r\n" + [headerRow, ...dataRows].join("\r\n");

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const fileName = `${filenamePrefix}_${dateStr}_${timeStr}.csv`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return vehicles.length;
}

// Alias default export function to formatted Excel
export const exportVehiclesToExcel = exportVehiclesToFormattedExcel;
