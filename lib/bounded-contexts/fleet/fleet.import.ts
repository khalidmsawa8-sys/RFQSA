/**
 * Fleet Vehicles Bulk Excel & CSV Import Engine (Enterprise-Grade)
 * Implements Template Generation with Data Validation, Client & Server Parsing,
 * Smart Column Matching, Multi-level VIN Duplicate Detection, and Error Reporting.
 */

import ExcelJS from "exceljs";
import {
  ImportedVehicleRowDTO,
  BulkImportRowError,
  VehicleEntity,
} from "./fleet.types";

/**
/**
 * Known car brands in Arabic and English for smart recognition and extraction.
 */
export const KNOWN_CAR_BRANDS = [
  "تويوتا", "تويوتا لاندكروزر", "هيونداي", "فورد", "نيسان", "كيا", "شيفروليه", "جي إم سي", "مازدا",
  "هوندا", "مرسيدس", "بي إم دبليو", "أودي", "لكزس", "ميتسوبيشي", "إيسوزو", "شيري", "هافال",
  "جيلي", "شانجان", "إم جي", "رينو", "فولكس واجن", "سوزوكي", "لاند روفر", "جيب", "دودج",
  "كاديلاك", "بورش", "بيجو", "جاكوار", "انفينيتي", "جينيسيس", "جريت وول", "بايك", "دونغ فينغ",
  "فاو", "فوتون", "سوبارو", "سكودا", "سيات", "فولفو", "رام", "كرايسلر", "لينكولن", "ميني",
  "Toyota", "Hyundai", "Ford", "Nissan", "Kia", "Chevrolet", "GMC", "Mazda", "Honda",
  "Mercedes", "Mercedes-Benz", "BMW", "Audi", "Lexus", "Mitsubishi", "Isuzu", "Chery",
  "Haval", "Geely", "Changan", "MG", "Renault", "Volkswagen", "Suzuki", "Land Rover",
  "Jeep", "Dodge", "Cadillac", "Porsche", "Peugeot", "Jaguar", "Infiniti", "Genesis",
  "Great Wall", "BAIC", "Dongfeng", "FAW", "Foton", "Subaru", "Skoda", "SEAT", "Volvo", "RAM", "Chrysler", "Lincoln", "MINI"
];

/**
 * Known header aliases for fuzzy matching across Arabic and English variations.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  brand_name: [
    "الماركة", "ماركة", "الشركة المصنعة", "المصنع", "نوع", "ماركة السيارة", "الماركه", "ماركه",
    "brand", "make", "manufacturer", "car_make", "vehicle_make"
  ],
  model_name: [
    "الموديل", "موديل", "طراز", "الطراز", "موديل السيارة", "الموديل/الطراز", "نوع الطراز",
    "model", "model_name", "car_model", "vehicle_model"
  ],
  year: [
    "سنة الصنع", "السنة", "سنة الموديل", "موديل السنة", "عام الصنع", "الموديل/السنة", "سنة", "العام",
    "year", "model_year", "prod_year", "production_year", "manufacturing_year"
  ],
  trim: [
    "الفئة", "فئة", "فئة المركبة", "المواصفات", "نوع الفئة", "المواصفة", "الدرجة",
    "trim", "grade", "version", "edition", "sub_model"
  ],
  plate_number: [
    "رقم اللوحة", "اللوحة", "لوحة المركبة", "لوحة", "رقم اللوحه", "اللوحه", "حروف وأرقام اللوحة", "لوحة السيارة",
    "plate", "plate_number", "license_plate", "plate_no", "reg_number", "registration"
  ],
  vin: [
    "رقم الهيكل", "رقم الشاصي", "رقم الهيكل (vin)", "الشاصي", "شاصي", "رقم الشاسيه", "شاسيه", "الهيكل", "رقم الشاسي",
    "vin", "chassis", "chassis_number", "vin_number", "vin_no", "frame_number", "serial_number"
  ],
  branch_name: [
    "الفرع", "الفرع المرتبط", "فرع الشركة", "اسم الفرع", "الموقع", "المدينة", "موقع الفرع", "الفرع/المدينة",
    "branch", "branch_name", "location", "facility", "city", "site"
  ],
  color: [
    "اللون", "اللون الخارجي", "لون المركبة", "لون السيارة", "الدهان",
    "color", "exterior_color", "colour", "paint"
  ],
  status: [
    "حالة المركبة", "الحالة", "حالة التشغيل", "وضع المركبة", "حالة السيارة", "الوضع التشغيلي",
    "status", "vehicle_status", "state", "operational_status"
  ],
  is_favorite: [
    "المفضلة", "مفضلة", "مركبة مفضلة", "مميزة",
    "favorite", "is_favorite", "fav", "starred", "is_vip"
  ],
  notes: [
    "ملاحظات", "ملاحظات الصيانة والتشغيل", "ملاحظات إضافية", "وصف", "تفاصيل", "ملاحظة",
    "notes", "description", "comments", "remarks", "memo"
  ],
  vehicle_full_name: [
    "اسم السيارة", "اسم المركبة", "بيانات المركبة", "وصف المركبة", "الماركة والموديل",
    "vehicle_name", "car_name", "model_and_make"
  ],
};

/**
 * Smart helper: extracts brand, model, and year from any combined text.
 */
export function extractVehicleAttributes(rawText: string): {
  detectedBrand?: string;
  detectedModel?: string;
  detectedYear?: number;
} {
  if (!rawText || !rawText.trim()) return {};
  const cleaned = rawText.trim();

  let detectedYear: number | undefined;
  const yearMatch = cleaned.match(/\b(19\d\d|20[0-3]\d)\b/);
  if (yearMatch) {
    detectedYear = parseInt(yearMatch[1], 10);
  }

  let textWithoutYear = cleaned.replace(/\b(19\d\d|20[0-3]\d)\b/g, "").replace(/[-–_]/g, " ").trim();

  let detectedBrand: string | undefined;
  let detectedModel: string | undefined;

  for (const brand of KNOWN_CAR_BRANDS) {
    const regex = new RegExp(`\\b${brand}\\b`, "i");
    if (regex.test(textWithoutYear)) {
      detectedBrand = brand;
      textWithoutYear = textWithoutYear.replace(regex, "").trim();
      break;
    }
  }

  if (detectedBrand) {
    detectedModel = textWithoutYear.replace(/\s+/g, " ").trim() || "قياسي";
  } else {
    // Fallback: first word is brand, remaining is model
    const parts = textWithoutYear.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      detectedBrand = parts[0];
      detectedModel = parts.slice(1).join(" ");
    } else if (parts.length === 1) {
      detectedBrand = parts[0];
      detectedModel = "طراز عام";
    }
  }

  return { detectedBrand, detectedModel, detectedYear };
}

/**
 * Sanitizes strings against Excel Formula Injection (=, +, -, @).
 */
export function sanitizeTextValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  // Strip potential leading formula triggers for safety
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = str.replace(/^[\=\+\-\@\t\r]+/, "");
  }
  return str;
}

/**
 * Normalizes VIN string (strips spaces, dashes, converts to uppercase string).
 */
export function normalizeVin(rawVin: unknown): string {
  if (!rawVin) return "";
  let str = String(rawVin).trim().toUpperCase();
  // Remove non-alphanumeric characters (spaces, dashes)
  str = str.replace(/[^A-Z0-9]/g, "");
  return str;
}

/**
 * Normalizes branch name (trims, replaces multiple spaces with single space).
 */
export function normalizeBranchName(rawName: unknown): string {
  if (!rawName) return "فرع الرياض";
  return String(rawName).trim().replace(/\s+/g, " ");
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Downloadable Excel Import Template (.xlsx)
 * ──────────────────────────────────────────────────────────────────────────── */

export async function generateVehicleImportTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة المشتريات B2B (RFQ Marketplace)";
  workbook.lastModifiedBy = "نظام إدارة الأسطول والمشتريات";
  workbook.created = new Date();

  // ── Sheet 1: Data Input Sheet ──
  const worksheet = workbook.addWorksheet("نموذج إدخال المركبات", {
    views: [{ rightToLeft: true, showGridLines: true }],
  });

  worksheet.columns = [
    { key: "brand", width: 18 }, // A
    { key: "model", width: 18 }, // B
    { key: "year", width: 14 }, // C
    { key: "trim", width: 16 }, // D
    { key: "plate", width: 18 }, // E
    { key: "vin", width: 26 }, // F
    { key: "branch", width: 24 }, // G
    { key: "color", width: 16 }, // H
    { key: "status", width: 22 }, // I
    { key: "favorite", width: 14 }, // J
    { key: "notes", width: 38 }, // K
  ];

  // Header Banner
  worksheet.mergeCells("A1:K1");
  const banner = worksheet.getCell("A1");
  banner.value = "🚗 نموذج استيراد بيانات المركبات — منصة المشتريات B2B (Fleet Import Template)";
  banner.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  banner.alignment = { horizontal: "center", vertical: "middle" };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A1224" } };
  worksheet.getRow(1).height = 38;

  // Subtitle / Notes
  worksheet.mergeCells("A2:K2");
  const sub = worksheet.getCell("A2");
  sub.value = "تعليمات: الحقول المؤشر عليها بنجمة (*) إلزامية | لا تغير ترتيب الأعمدة | يتم معالجة الحفظ تلقائياً في النظام";
  sub.font = { name: "Segoe UI", size: 9, color: { argb: "FF94A3B8" } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  worksheet.getRow(2).height = 22;

  // Table Headers (Row 3)
  const headers = [
    "الماركة *",
    "الموديل *",
    "سنة الصنع *",
    "الفئة (Trim)",
    "رقم اللوحة *",
    "رقم الهيكل (VIN) *",
    "الفرع المرتبط",
    "اللون الخارجي",
    "حالة المركبة",
    "المفضلة",
    "ملاحظات الصيانة والتشغيل",
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const c = headerRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    c.border = {
      top: { style: "medium", color: { argb: "FF334155" } },
      bottom: { style: "medium", color: { argb: "FF334155" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  });

  // Sample Rows (Examples of valid inputs)
  const sampleRows = [
    [
      "تويوتا",
      "كامري",
      2023,
      "GLE 2.5",
      "أ ب ج 1234",
      "JTEBU5JR8K5092141",
      "فرع الرياض",
      "أبيض لؤلؤي",
      "نشطة (جاهزة للتشغيل)",
      "نعم",
      "سيارة الإدارة التنفيذية",
    ],
    [
      "فورد",
      "تاوروس",
      2022,
      "Titanium 2.0",
      "س ص ع 9988",
      "1FA6P8CF0H5182931",
      "فرع جدة",
      "فضي ميتاليك",
      "نشطة (جاهزة للتشغيل)",
      "لا",
      "مركبة العمليات والتشغيل",
    ],
    [
      "هيونداي",
      "سوناتا",
      2021,
      "Smart 2.5",
      "د هـ و 5678",
      "KMHCT4AE8FU123456",
      "فرع الدمام",
      "رمادي غامق",
      "قيد الصيانة والقطع",
      "لا",
      "في انتظار وصول قطع الغيار",
    ],
  ];

  sampleRows.forEach((rowValues, rIdx) => {
    const row = worksheet.getRow(4 + rIdx);
    row.height = 26;
    rowValues.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = { name: "Segoe UI", size: 10, color: { argb: "FF334155" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Ensure VIN and Plate are treated explicitly as Text
      if (cIdx === 4 || cIdx === 5) {
        cell.numFmt = "@";
      }
    });
  });

  // Pre-format 100 empty data rows with Text formatting for VIN/Plate
  for (let i = 7; i <= 100; i++) {
    const r = worksheet.getRow(i);
    r.height = 24;
    // VIN (Col F) and Plate (Col E) format as plain Text to prevent scientific notation in Excel
    r.getCell(5).numFmt = "@";
    r.getCell(6).numFmt = "@";
    r.getCell(3).numFmt = "0"; // Year as integer
  }

  // ── Sheet 2: Guidelines & Reference Instructions ──
  const guideSheet = workbook.addWorksheet("تعليمات وإرشادات الاستيراد", {
    views: [{ rightToLeft: true, showGridLines: true }],
  });

  guideSheet.columns = [
    { key: "field", width: 24 },
    { key: "required", width: 14 },
    { key: "rules", width: 45 },
    { key: "example", width: 25 },
  ];

  guideSheet.mergeCells("A1:D1");
  const gBanner = guideSheet.getCell("A1");
  gBanner.value = "📖 دليل إرشادات تعبئة ملف استيراد أسطول المركبات";
  gBanner.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  gBanner.alignment = { horizontal: "center", vertical: "middle" };
  gBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A1224" } };
  guideSheet.getRow(1).height = 36;

  const gHeaders = ["اسم الحقل", "إلزامي / اختياري", "قواعد التحقق والشروط", "مثال"];
  const gHRow = guideSheet.getRow(3);
  gHRow.height = 26;
  gHeaders.forEach((h, i) => {
    const c = gHRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  });

  const guidelines = [
    ["الماركة", "إلزامي (*)", "اسم الشركة المصنعة للمركبة (مثل: تويوتا، فورد، نيسان)", "تويوتا"],
    ["الموديل", "إلزامي (*)", "طراز السيارة (مثل: كامري، تاوروس، باترول)", "كامري"],
    ["سنة الصنع", "إلزامي (*)", "سنة رقمية صحيحة من 1970 حتى العام القادم", "2023"],
    ["الفئة (Trim)", "اختياري", "فئة المواصفات (قياسي، فل كامل، GLX)", "GLE"],
    ["رقم اللوحة", "إلزامي (*)", "أحرف وأرقام اللوحة الرسمية للمركبة", "أ ب ج 1234"],
    ["رقم الهيكل (VIN)", "إلزامي (*)", "معرف الهيكل المكون من 17 حرف ورقم (يجب ألا يتكرر)", "JTEBU5JR8K5092141"],
    ["الفرع المرتبط", "اختياري", "اسم الفرع (إذا كان الفرع جديداً سيتم إنشاؤه تلقائياً)", "فرع الرياض"],
    ["اللون الخارجي", "اختياري", "اللون الأساسي للمركبة (الافتراضي: أبيض)", "أبيض لؤلؤي"],
    ["حالة المركبة", "اختياري", "القيمة: 'نشطة' أو 'قيد الصيانة' (الافتراضي: نشطة)", "نشطة (جاهزة للتشغيل)"],
    ["المفضلة", "اختياري", "القيمة: 'نعم' أو 'لا' (الافتراضي: لا)", "نعم"],
    ["ملاحظات", "اختياري", "أي معلومات أو توجيهات تشغيلية خاصة بالسيارة", "صيانة دورية"],
  ];

  guidelines.forEach((gRow, idx) => {
    const r = guideSheet.getRow(4 + idx);
    r.height = 24;
    gRow.forEach((val, cIdx) => {
      const c = r.getCell(cIdx + 1);
      c.value = val;
      c.font = { name: "Segoe UI", size: 9.5 };
      c.alignment = { horizontal: cIdx === 2 ? "right" : "center", vertical: "middle" };
      c.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (cIdx === 1 && val.includes("إلزامي")) {
        c.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
      }
    });
  });

  // Trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "نموذج_استيراد_المركبات.xlsx");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Parse Uploaded Excel (.xlsx / .xls / .csv) File
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ParsedRawRow {
  row_number: number;
  raw: Record<string, string>;
}

export async function parseVehicleImportExcel(
  fileOrBuffer: File | ArrayBuffer
): Promise<{
  sheetName: string;
  totalParsed: number;
  columnMap: Record<string, string>; // e.g. { brand_name: "الماركة", vin: "رقم الهيكل" }
  availableHeaders: string[];
  rows: ParsedRawRow[];
}> {
  const workbook = new ExcelJS.Workbook();

  if (fileOrBuffer instanceof File) {
    const arrayBuffer = await fileOrBuffer.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
  } else {
    await workbook.xlsx.load(fileOrBuffer);
  }

  // Use the first worksheet or the one named 'نموذج إدخال المركبات'
  const worksheet =
    workbook.getWorksheet("نموذج إدخال المركبات") || workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("ملف الإكسل لا يحتوي على أي صفحات بيانات صالحة");
  }

  // Find Header Row (Scan first 10 rows for columns matching our aliases)
  let headerRowNumber = 1;
  let headerCells: Array<{ colIdx: number; text: string }> = [];

  const norm = (s: string) =>
    s.toLowerCase().replace(/[\*\(\)\-_]/g, " ").replace(/\s+/g, " ").trim();

  // Core fields that distinguish a vehicle table header from banners or text
  const CORE_VEHICLE_FIELDS = ["brand_name", "model_name", "year", "plate_number", "vin"];

  for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    const cells: Array<{ colIdx: number; text: string }> = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const txt = sanitizeTextValue(cell.value);
      if (txt) cells.push({ colIdx: colNumber, text: txt });
    });

    if (cells.length < 2) continue;

    // Guard 1: Skip merged rows where all cells have the exact same text (e.g. title banners)
    const uniqueValues = new Set(cells.map((c) => c.text.trim()));
    if (uniqueValues.size <= 1) continue;

    // Guard 2: Skip explicit instructions or guide banners
    const joinedText = cells.map((c) => c.text).join(" ").toLowerCase();
    if (
      joinedText.includes("تعليمات:") ||
      joinedText.includes("fleet import template") ||
      joinedText.includes("دليل إرشادات") ||
      joinedText.includes("الحقول المؤشر عليها")
    ) {
      continue;
    }

    // Check how many DISTINCT vehicle fields match in this candidate row
    const matchedDistinctFields = new Set<string>();
    cells.forEach((c) => {
      const cleanCell = norm(c.text);
      for (const [fieldKey, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some((a) => cleanCell === norm(a) || cleanCell.includes(norm(a)))) {
          matchedDistinctFields.add(fieldKey);
        }
      }
    });

    // Valid header row if at least 2 distinct core vehicle fields or 3 distinct overall fields matched
    const coreMatches = CORE_VEHICLE_FIELDS.filter((f) => matchedDistinctFields.has(f)).length;
    if (coreMatches >= 2 || matchedDistinctFields.size >= 3) {
      headerRowNumber = r;
      headerCells = cells;
      break;
    }
  }

  if (headerCells.length === 0) {
    // Fallback to row 1
    headerRowNumber = 1;
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headerCells.push({ colIdx: colNumber, text: sanitizeTextValue(cell.value) });
    });
  }

  const availableHeaders = headerCells.map((h) => h.text);

  // ── Auto-detect Column Mapping with 2-Pass Strategy ──
  const columnMap: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  // Pass 1: Exact normalized match (aliases vs headers) excluding vehicle_full_name
  for (const [fieldKey, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (fieldKey === "vehicle_full_name") continue;
    for (const h of headerCells) {
      if (usedHeaders.has(h.text)) continue;
      const cleanH = norm(h.text);
      if (aliases.some((a) => cleanH === norm(a))) {
        columnMap[fieldKey] = h.text;
        usedHeaders.add(h.text);
        break;
      }
    }
  }

  // Pass 2: Substring match for unmapped fields
  for (const [fieldKey, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (columnMap[fieldKey]) continue;
    // Don't map vehicle_full_name if we already have brand_name or model_name
    if (fieldKey === "vehicle_full_name" && (columnMap["brand_name"] || columnMap["model_name"])) {
      continue;
    }
    for (const h of headerCells) {
      if (usedHeaders.has(h.text)) continue;
      const cleanH = norm(h.text);
      if (aliases.some((a) => cleanH.includes(norm(a)) || norm(a).includes(cleanH))) {
        columnMap[fieldKey] = h.text;
        usedHeaders.add(h.text);
        break;
      }
    }
  }

  // Extract Data Rows
  const parsedRows: ParsedRawRow[] = [];
  for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const rowObj: Record<string, string> = {};
    let nonEmptyCount = 0;
    const values: string[] = [];

    headerCells.forEach(({ colIdx, text }) => {
      const cell = row.getCell(colIdx);
      let val = "";
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === "object" && "text" in cell.value) {
          val = String((cell.value as any).text || "");
        } else if (typeof cell.value === "object" && "result" in cell.value) {
          val = String((cell.value as any).result || "");
        } else {
          val = String(cell.value);
        }
      }
      val = val.trim();
      if (val) {
        nonEmptyCount++;
        values.push(val);
      }
      rowObj[text] = val;
    });

    // Skip completely empty rows
    if (nonEmptyCount === 0) continue;

    // Skip rows where all cells have identical text (merged banners)
    if (new Set(values).size <= 1 && values.length > 1) continue;

    // Skip instructions or guidelines banner rows
    const joined = values.join(" ").toLowerCase();
    if (
      joined.includes("تعليمات:") ||
      joined.includes("fleet import template") ||
      joined.includes("دليل إرشادات") ||
      joined.includes("الحقول المؤشر عليها")
    ) {
      continue;
    }

    // Skip repeated headers if user duplicated header rows in data
    const isRepeatedHeader = headerCells.every((h) => rowObj[h.text] === h.text);
    if (isRepeatedHeader) continue;

    parsedRows.push({
      row_number: r,
      raw: rowObj,
    });
  }

  return {
    sheetName: worksheet.name,
    totalParsed: parsedRows.length,
    columnMap,
    availableHeaders,
    rows: parsedRows,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. Validation & Sanity Engine (Client & Server)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ValidationSummary {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  newBranchesCount: number;
  newBranchesList: string[];
  rows: ImportedVehicleRowDTO[];
}

export function validateImportedVehicles(
  rawRows: ParsedRawRow[],
  columnMap: Record<string, string>,
  existingVehicles: VehicleEntity[] = [],
  existingBranches: Array<{ id: string; title: string }> = []
): ValidationSummary {
  const currentYear = new Date().getFullYear();
  const existingVinMap = new Map<string, VehicleEntity>();

  // Map of normalized existing VINs in Database
  existingVehicles.forEach((v) => {
    if (v.vin && !v.deleted_at) {
      existingVinMap.set(normalizeVin(v.vin), v);
    }
  });

  const existingBranchNames = new Set(
    existingBranches.map((b) => normalizeBranchName(b.title).toLowerCase())
  );

  // Track seen VINs within this import file to detect intra-file duplicates
  const seenFileVins = new Map<string, number>(); // normalized VIN -> first row_number
  const discoveredNewBranches = new Set<string>();

  const validatedRows: ImportedVehicleRowDTO[] = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  // Filter out any lingering banner or instruction rows before processing
  const cleanRawRows = rawRows.filter((r) => {
    const values = Object.values(r.raw).map((v) => (v || "").trim()).filter(Boolean);
    if (values.length === 0) return false;
    const joined = values.join(" ").toLowerCase();
    if (
      joined.includes("تعليمات:") ||
      joined.includes("fleet import template") ||
      joined.includes("دليل إرشادات") ||
      joined.includes("الحقول المؤشر عليها")
    ) {
      return false;
    }
    if (new Set(values).size <= 1 && values.length > 1) return false;
    return true;
  });

  cleanRawRows.forEach((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Helper to get mapped cell value
    const getVal = (key: string): string => {
      const headerName = columnMap[key];
      return headerName && r.raw[headerName] !== undefined ? r.raw[headerName].trim() : "";
    };

    let brandName = getVal("brand_name");
    let modelName = getVal("model_name");
    const vehicleFullName = getVal("vehicle_full_name");
    const rawYear = getVal("year");
    const trim = getVal("trim") || "قياسي";
    let plateNumber = getVal("plate_number");
    let rawVin = getVal("vin");
    const rawBranch = getVal("branch_name");
    const color = getVal("color") || "أبيض";
    const rawStatus = getVal("status");
    const rawFavorite = getVal("is_favorite");
    const notes = getVal("notes");

    // Skip if row happens to contain instruction text
    if (
      brandName.includes("تعليمات:") ||
      brandName.includes("الحقول المؤشر عليها") ||
      plateNumber.includes("تعليمات:") ||
      plateNumber.includes("الحقول المؤشر عليها")
    ) {
      return;
    }

    // ── Smart Extraction: Combine & Auto-Detect Make/Model/Year if missing ──
    if ((!brandName || !modelName) && vehicleFullName) {
      const extracted = extractVehicleAttributes(vehicleFullName);
      if (!brandName && extracted.detectedBrand) brandName = extracted.detectedBrand;
      if (!modelName && extracted.detectedModel) modelName = extracted.detectedModel;
      if (!rawYear && extracted.detectedYear) {
        // Will be picked up below
      }
    } else if (brandName && !modelName) {
      const extracted = extractVehicleAttributes(brandName);
      if (extracted.detectedBrand && extracted.detectedModel) {
        brandName = extracted.detectedBrand;
        modelName = extracted.detectedModel;
      } else {
        modelName = "طراز عام";
      }
    } else if (!brandName && modelName) {
      const extracted = extractVehicleAttributes(modelName);
      if (extracted.detectedBrand) {
        brandName = extracted.detectedBrand;
        modelName = extracted.detectedModel || "طراز عام";
      } else {
        brandName = "مركبة معتمدة";
      }
    }

    // Fallback if still empty
    if (!brandName) {
      brandName = "مركبة معتمدة";
      warnings.push("تم تعيين ماركة افتراضية لعدم توفرها بالملف");
    }
    if (!modelName) {
      modelName = "طراز عام";
      warnings.push("تم تعيين موديل افتراضي لعدم توفره بالملف");
    }

    // ── 2. Validate Year ──
    let year = Number(rawYear);
    if (!rawYear || isNaN(year) || year < 1970 || year > currentYear + 2) {
      // Try to extract from fullName or brandName/modelName
      const combinedText = `${vehicleFullName} ${brandName} ${modelName}`;
      const yearMatch = combinedText.match(/\b(19\d\d|20[0-3]\d)\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      } else {
        year = currentYear;
        warnings.push(`تم تعيين سنة الصنع الافتراضية (${currentYear})`);
      }
    }

    // ── 3. Validate Plate Number ──
    if (!plateNumber) {
      plateNumber = `غير محدد - ${r.row_number}`;
      warnings.push("تم تعيين رقم لوحة مؤقت لعدم توفره بالملف");
    }

    // ── 4. Validate & Normalize VIN (Auto-generate fallback if empty) ──
    let vin = normalizeVin(rawVin);
    let isIntraDuplicate = false;
    let isDbDuplicate = false;
    let existingVehicleId: string | undefined;

    if (!rawVin || !vin) {
      // Auto-generate a valid unique fallback VIN so the import never gets blocked
      const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      vin = `KSA${Date.now().toString().slice(-6)}${randSuffix}${r.row_number}`;
      rawVin = vin;
      warnings.push("تم توليد رقم هيكل (VIN) فريد تلقائياً لعدم توفره بالملف");
    } else {
      if (vin.length < 6 || vin.length > 25) {
        warnings.push(`طول رقم الهيكل (${vin.length} خانة) يختلف عن المعيار المعتاد (17 خانة)`);
      }

      // Check intra-file duplicate
      if (seenFileVins.has(vin)) {
        isIntraDuplicate = true;
        const firstRow = seenFileVins.get(vin);
        warnings.push(`رقم الهيكل مكرر داخل نفس الملف (مطابق للصف رقم ${firstRow}) — سيتم تحديثه`);
      } else {
        seenFileVins.set(vin, r.row_number);
      }

      // Check database duplicate
      if (existingVinMap.has(vin)) {
        isDbDuplicate = true;
        const match = existingVinMap.get(vin)!;
        existingVehicleId = match.id;
        duplicateCount++;
      }
    }

    // ── 5. Branch Normalization & New Branch Detection ──
    const branchName = normalizeBranchName(rawBranch || "فرع الرياض");
    let isNewBranch = false;
    let branchId = "br-riyadh";

    const matchedBranch = existingBranches.find(
      (b) => normalizeBranchName(b.title).toLowerCase() === branchName.toLowerCase()
    );

    if (matchedBranch) {
      branchId = matchedBranch.id;
    } else {
      isNewBranch = true;
      discoveredNewBranches.add(branchName);
      warnings.push(`الفرع "${branchName}" غير مسجل مسبقاً وسيتم إنشاؤه تلقائياً`);
    }

    // ── 6. Status & Favorite Normalization ──
    let status: "active" | "maintenance" = "active";
    if (rawStatus) {
      const lowerStatus = rawStatus.toLowerCase();
      if (lowerStatus.includes("صيانة") || lowerStatus.includes("maint") || lowerStatus.includes("ورشة")) {
        status = "maintenance";
      }
    }

    let isFavorite = false;
    if (rawFavorite) {
      const lowerFav = rawFavorite.toLowerCase();
      if (lowerFav === "نعم" || lowerFav === "yes" || lowerFav === "true" || lowerFav === "1" || lowerFav.includes("⭐")) {
        isFavorite = true;
      }
    }

    // ── 7. Overall Row Status Classification ──
    let validationStatus: "valid" | "warning" | "error" = "valid";
    if (errors.length > 0) {
      validationStatus = "error";
      errorCount++;
    } else if (warnings.length > 0) {
      validationStatus = "warning";
      warningCount++;
    } else {
      validCount++;
    }

    validatedRows.push({
      row_number: r.row_number,
      brand_name: brandName || "—",
      model_name: modelName || "—",
      year: isNaN(year) ? currentYear : year,
      trim,
      vin: vin || rawVin || "—",
      plate_number: plateNumber || "—",
      branch_name: branchName,
      branch_id: branchId,
      color,
      status,
      is_favorite: isFavorite,
      notes: sanitizeTextValue(notes),
      validation_status: validationStatus,
      validation_errors: errors,
      validation_warnings: warnings,
      is_intra_duplicate: isIntraDuplicate,
      is_db_duplicate: isDbDuplicate,
      existing_vehicle_id: existingVehicleId,
      is_new_branch: isNewBranch,
    });
  });

  return {
    totalRows: validatedRows.length,
    validCount,
    warningCount,
    errorCount,
    duplicateCount,
    newBranchesCount: discoveredNewBranches.size,
    newBranchesList: Array.from(discoveredNewBranches),
    rows: validatedRows,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. Error Report Exporter (.xlsx)
 * ──────────────────────────────────────────────────────────────────────────── */

export async function exportImportErrorReport(
  errors: BulkImportRowError[],
  filenamePrefix = "تقرير_أخطاء_استيراد_المركبات"
): Promise<void> {
  if (!errors || errors.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("أخطاء الاستيراد", {
    views: [{ rightToLeft: true, showGridLines: true }],
  });

  worksheet.columns = [
    { key: "row", width: 14 },
    { key: "vin", width: 24 },
    { key: "plate", width: 18 },
    { key: "field", width: 18 },
    { key: "type", width: 22 },
    { key: "message", width: 45 },
  ];

  // Header Banner
  worksheet.mergeCells("A1:F1");
  const banner = worksheet.getCell("A1");
  banner.value = `⚠️ تقرير أخطاء استيراد المركبات — إجمالي الأخطاء: ${errors.length}`;
  banner.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  banner.alignment = { horizontal: "center", vertical: "middle" };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } }; // Dark Red
  worksheet.getRow(1).height = 36;

  // Table Headers
  const headers = [
    "رقم الصف بالملف",
    "رقم الهيكل (VIN)",
    "رقم اللوحة",
    "الحقل المعني",
    "نوع الخطأ",
    "وصف وسبب الخطأ",
  ];

  const hRow = worksheet.getRow(3);
  hRow.height = 28;
  headers.forEach((h, idx) => {
    const c = hRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  });

  // Data Rows
  errors.forEach((err, idx) => {
    const r = worksheet.getRow(4 + idx);
    r.height = 24;
    const vals = [
      `الصف ${err.row_number}`,
      err.vin || "—",
      err.plate_number || "—",
      err.field || "عام",
      err.error_type,
      err.message,
    ];

    vals.forEach((v, cIdx) => {
      const c = r.getCell(cIdx + 1);
      c.value = v;
      c.font = { name: "Segoe UI", size: 9.5 };
      c.alignment = { horizontal: cIdx === 5 ? "right" : "center", vertical: "middle" };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? "FFFFFFFF" : "FFFEF2F2" } };
      c.border = {
        top: { style: "thin", color: { argb: "FFFECACA" } },
        bottom: { style: "thin", color: { argb: "FFFECACA" } },
        left: { style: "thin", color: { argb: "FFFECACA" } },
        right: { style: "thin", color: { argb: "FFFECACA" } },
      };
    });
  });

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const fileName = `${filenamePrefix}_${dateStr}.xlsx`;

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
}
