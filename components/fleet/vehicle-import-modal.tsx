"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  RefreshCw,
  Edit3,
  Check,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VehicleEntity,
  ImportedVehicleRowDTO,
  BulkImportResultDTO,
  BulkImportRowError,
  DuplicateStrategy,
} from "@/lib/bounded-contexts/fleet/fleet.types";
import { fleetRepository } from "@/lib/bounded-contexts/fleet/fleet.repository";
import {
  generateVehicleImportTemplate,
  parseVehicleImportExcel,
  validateImportedVehicles,
  exportImportErrorReport,
  ParsedRawRow,
  ValidationSummary,
} from "@/lib/bounded-contexts/fleet/fleet.import";

interface VehicleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  existingVehicles: VehicleEntity[];
  branches: Array<{ id: string; title: string }>;
}

type ImportStep = "upload" | "mapping" | "preview" | "processing" | "result";

export function VehicleImportModal({
  isOpen,
  onClose,
  onImportComplete,
  existingVehicles,
  branches,
}: VehicleImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsing & Mapping State
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRawRow[]>([]);

  // Validation State
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "warning" | "error" | "duplicate">("all");
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("update");

  // Inline Editing State
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);

  // Batch Processing State
  const [importId, setImportId] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [processedRowsCount, setProcessedRowsCount] = useState(0);
  const [importResult, setImportResult] = useState<BulkImportResultDTO | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep("upload");
      setFile(null);
      setParseError(null);
      setValidationSummary(null);
      setImportResult(null);
      setProgressPercent(0);
      setProcessedRowsCount(0);
      setEditingRowIdx(null);
      setImportId(`imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Step 1: File Selection & Parsing ──
  const handleFileSelect = async (selectedFile: File) => {
    setParseError(null);
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setParseError("صيغة الملف غير مدعومة. يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setParseError("حجم الملف كبير جداً. الحد الأقصى المسموح به هو 10 ميجابايت.");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const parsed = await parseVehicleImportExcel(selectedFile);

      if (parsed.rows.length === 0) {
        setParseError("الملف المرفوع فارغ ولا يحتوي على صفوف بيانات.");
        setIsParsing(false);
        return;
      }

      if (parsed.rows.length > 5000) {
        setParseError(`الملف يحتوي على (${parsed.rows.length}) صفاً. الحد الأقصى لكل عملية استيراد هو 5000 مركبة.`);
        setIsParsing(false);
        return;
      }

      setAvailableHeaders(parsed.availableHeaders);
      setColumnMap(parsed.columnMap);
      setParsedRows(parsed.rows);

      // Run initial validation
      const val = validateImportedVehicles(parsed.rows, parsed.columnMap, existingVehicles, branches);
      setValidationSummary(val);

      setStep("preview");
    } catch (err: any) {
      console.error("Excel parse error:", err);
      setParseError(err?.message || "تعذر قراءة ملف الإكسل. تأكد من سلامة الملف وصيغته.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // ── Step 2: Mapping Updates ──
  const handleColumnMapChange = (fieldKey: string, headerName: string) => {
    const updated = { ...columnMap, [fieldKey]: headerName };
    setColumnMap(updated);
    if (parsedRows.length > 0) {
      const val = validateImportedVehicles(parsedRows, updated, existingVehicles, branches);
      setValidationSummary(val);
    }
  };

  // ── Step 3: Inline Cell Edit in Preview Grid ──
  const handleUpdateRowCell = (rowIndex: number, field: keyof ImportedVehicleRowDTO, value: any) => {
    if (!validationSummary) return;

    const updatedRows = [...validationSummary.rows];
    const row = { ...updatedRows[rowIndex], [field]: value };

    // Re-evaluate this row's errors
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.brand_name || row.brand_name === "—") errors.push("الماركة مطلوبة");
    if (!row.model_name || row.model_name === "—") errors.push("الموديل مطلوب");
    if (!row.year || isNaN(row.year) || row.year < 1970 || row.year > new Date().getFullYear() + 2) {
      errors.push("سنة الصنع غير صالحة");
    }
    if (!row.plate_number || row.plate_number === "—") errors.push("رقم اللوحة مطلوب");
    if (!row.vin || row.vin === "—") errors.push("رقم الهيكل VIN مطلوب");

    row.validation_errors = errors;
    row.validation_warnings = warnings;
    row.validation_status = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

    updatedRows[rowIndex] = row;

    const validCount = updatedRows.filter((r) => r.validation_status === "valid").length;
    const warningCount = updatedRows.filter((r) => r.validation_status === "warning").length;
    const errorCount = updatedRows.filter((r) => r.validation_status === "error").length;

    setValidationSummary({
      ...validationSummary,
      rows: updatedRows,
      validCount,
      warningCount,
      errorCount,
    });
  };

  // ── Step 4: Batch Import Execution ──
  const handleExecuteImport = async () => {
    if (!validationSummary) return;

    const blockingErrors = validationSummary.rows.filter((r) => r.validation_status === "error");
    if (blockingErrors.length > 0) {
      alert(`يرجى تصحيح (${blockingErrors.length}) خطأ قبل متابعة عملية الاستيراد.`);
      return;
    }

    setStep("processing");
    setIsProcessing(true);
    setProgressPercent(5);

    const CHUNK_SIZE = 100;
    const allRows = validationSummary.rows;
    const totalCount = allRows.length;

    let overallAdded = 0;
    let overallUpdated = 0;
    let overallSkipped = 0;
    const accumulatedErrors: BulkImportRowError[] = [];
    const allNewBranches: string[] = [];

    try {
      for (let i = 0; i < totalCount; i += CHUNK_SIZE) {
        const chunk = allRows.slice(i, i + CHUNK_SIZE);
        const batchImportId = `${importId}_batch_${Math.floor(i / CHUNK_SIZE)}`;

        // Send chunk to Backend Repository / API
        const batchResult = await fleetRepository.bulkUpsertVehicles({
          import_id: batchImportId,
          organization_id: "org-national-procurement",
          user_id: "demo-user-id",
          file_name: file?.name || "import_fleet.xlsx",
          duplicate_strategy: duplicateStrategy,
          create_missing_branches: true,
          vehicles: chunk.map((r) => ({
            row_number: r.row_number,
            brand_name: r.brand_name,
            model_name: r.model_name,
            year: r.year,
            trim: r.trim,
            vin: r.vin,
            plate_number: r.plate_number,
            branch_name: r.branch_name,
            branch_id: r.branch_id,
            color: r.color,
            status: r.status,
            is_favorite: r.is_favorite,
            notes: r.notes,
          })),
        });

        overallAdded += batchResult.added_count;
        overallUpdated += batchResult.updated_count;
        overallSkipped += batchResult.skipped_count;
        if (batchResult.errors && batchResult.errors.length > 0) {
          accumulatedErrors.push(...batchResult.errors);
        }
        if (batchResult.new_branches_created) {
          batchResult.new_branches_created.forEach((b) => {
            if (!allNewBranches.includes(b)) allNewBranches.push(b);
          });
        }

        const processed = Math.min(i + CHUNK_SIZE, totalCount);
        setProcessedRowsCount(processed);
        setProgressPercent(Math.round((processed / totalCount) * 100));

        // Small breather for smooth UI progress
        await new Promise((res) => setTimeout(res, 80));
      }

      const finalResult: BulkImportResultDTO = {
        import_id: importId,
        file_name: file?.name || "fleet_import.xlsx",
        timestamp: new Date().toISOString(),
        total_rows: totalCount,
        added_count: overallAdded,
        updated_count: overallUpdated,
        skipped_count: overallSkipped,
        failed_count: accumulatedErrors.length,
        new_branches_created: allNewBranches,
        status: accumulatedErrors.length === 0 ? "completed" : overallAdded > 0 ? "partial" : "failed",
        errors: accumulatedErrors,
      };

      setImportResult(finalResult);
      setStep("result");
      onImportComplete();
    } catch (err: any) {
      console.error("Batch import execution error:", err);
      alert("حدث خطأ أثناء تنفيذ عملية الاستيراد: " + (err?.message || "خطأ غير معروف"));
      setStep("preview");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered preview rows
  const filteredPreviewRows = validationSummary?.rows.filter((r) => {
    if (previewFilter === "valid") return r.validation_status === "valid";
    if (previewFilter === "warning") return r.validation_status === "warning";
    if (previewFilter === "error") return r.validation_status === "error";
    if (previewFilter === "duplicate") return r.is_db_duplicate || r.is_intra_duplicate;
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto dir-rtl text-slate-900" dir="rtl">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">استيراد أسطول المركبات (Bulk Fleet Import)</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Excel & CSV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                رفع مئات المركبات دفعة واحدة مع الفحص الفوري، كشف التكرار، وتحديث قاعدة البيانات
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isProcessing) {
                if (confirm("عملية الاستيراد جارية حالياً، هل أنت متأكد من الإلغاء؟")) {
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP INDICATOR BREADCRUMB ── */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-600 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto [scrollbar-width:none]">
            <div className={`flex items-center gap-1.5 ${step === "upload" ? "text-emerald-700 font-black" : "text-slate-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === "upload" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>1</span>
              <span>رفع الملف</span>
            </div>
            <span className="text-slate-300">←</span>

            <div className={`flex items-center gap-1.5 ${step === "mapping" ? "text-emerald-700 font-black" : "text-slate-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === "mapping" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>2</span>
              <span>مطابقة الأعمدة</span>
            </div>
            <span className="text-slate-300">←</span>

            <div className={`flex items-center gap-1.5 ${step === "preview" ? "text-emerald-700 font-black" : "text-slate-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === "preview" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>3</span>
              <span>الفحص والمعاينة</span>
            </div>
            <span className="text-slate-300">←</span>

            <div className={`flex items-center gap-1.5 ${step === "processing" || step === "result" ? "text-emerald-700 font-black" : "text-slate-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === "processing" || step === "result" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>4</span>
              <span>الحفظ والتقرير</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={generateVehicleImportTemplate}
            className="h-8 px-3 rounded-lg border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold gap-1.5 shrink-0"
            title="تحميل نموذج إكسل جاهز ومعبأ بأمثلة"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>تحميل نموذج الإكسل الجاهز (.xlsx)</span>
          </Button>
        </div>

        {/* ── MODAL BODY CONTENT ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ════════ STEP 1: UPLOAD ════════ */}
          {step === "upload" && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer group space-y-4"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center shadow-xs">
                  {isParsing ? (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-800">
                    {isParsing ? "جاري قراءة وتحليل ملف الإكسل..." : "اسحب وأفلت ملف الإكسل هنا، أو اضغط للاختيار"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    يدعم ملفات Microsoft Excel بصيغة (.xlsx, .xls) أو ملفات (.csv) حتى 5,000 مركبة
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>التعرف التلقائي الذكي على الأعمدة والعناوين العربية والإنجليزية</span>
                </div>
              </div>

              {parseError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Tips & Recommendations */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-2 text-blue-900">
                <h4 className="font-black flex items-center gap-1.5 text-blue-950">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>نصائح لضمان استيراد سلس ودقيق:</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-[11px]">
                  <li>احرص على ملء الحقول الإلزامية: <strong>الماركة، الموديل، سنة الصنع، رقم اللوحة، ورقم الهيكل (VIN)</strong>.</li>
                  <li>رقم الهيكل (VIN) هو المعرف الرئيسي للمركبة، وسيتم كشف أي تكرار وتحديثه أو تخطيه حسب رغبتك.</li>
                  <li>إذا وردت فروع جديدة في ملفك لم تكن مسجلة مسبقاً، سيتم إنشاؤها تلقائياً وربطها بالأسطول.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ════════ STEP 2: MAPPING ════════ */}
          {step === "mapping" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">مطابقة أعمدة ملف الإكسل</h3>
                  <p className="text-xs text-slate-500">تحقق من صحة ربط حقول النظام مع أعمدة الملف المرفوع</p>
                </div>
                <Button
                  onClick={() => {
                    const val = validateImportedVehicles(parsedRows, columnMap, existingVehicles, branches);
                    setValidationSummary(val);
                    setStep("preview");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <span>متابعة للمعاينة والفحص ←</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: "brand_name", label: "الماركة *", required: true },
                  { key: "model_name", label: "الموديل *", required: true },
                  { key: "year", label: "سنة الصنع *", required: true },
                  { key: "trim", label: "الفئة (Trim)", required: false },
                  { key: "plate_number", label: "رقم اللوحة *", required: true },
                  { key: "vin", label: "رقم الهيكل (VIN) *", required: true },
                  { key: "branch_name", label: "الفرع المرتبط", required: false },
                  { key: "color", label: "اللون الخارجي", required: false },
                  { key: "status", label: "حالة المركبة", required: false },
                  { key: "is_favorite", label: "المفضلة", required: false },
                  { key: "notes", label: "ملاحظات التشغيل", required: false },
                ].map(({ key, label, required }) => (
                  <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{label}</span>
                      {columnMap[key] ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.2 rounded">
                          تم الربط ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.2 rounded">
                          {required ? "مطلوب" : "اختياري"}
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMap[key] || ""}
                      onChange={(e) => handleColumnMapChange(key, e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- اختر العمود المقابل --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ STEP 3: PREVIEW & VALIDATION ════════ */}
          {step === "preview" && validationSummary && (
            <div className="space-y-4">
              
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div
                  onClick={() => setPreviewFilter("all")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    previewFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-[11px] opacity-75 font-bold">إجمالي السجلات</p>
                  <p className="text-xl font-black font-mono mt-0.5">{validationSummary.totalRows}</p>
                </div>

                <div
                  onClick={() => setPreviewFilter("valid")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    previewFilter === "valid" ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/70"
                  }`}
                >
                  <p className="text-[11px] opacity-75 font-bold">سليمة وجاهزة ✓</p>
                  <p className="text-xl font-black font-mono mt-0.5">{validationSummary.validCount}</p>
                </div>

                <div
                  onClick={() => setPreviewFilter("warning")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    previewFilter === "warning" ? "border-amber-600 bg-amber-600 text-white" : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100/70"
                  }`}
                >
                  <p className="text-[11px] opacity-75 font-bold">تنبيهات ⚠️</p>
                  <p className="text-xl font-black font-mono mt-0.5">{validationSummary.warningCount}</p>
                </div>

                <div
                  onClick={() => setPreviewFilter("error")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    previewFilter === "error" ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-red-50 text-red-900 hover:bg-red-100/70"
                  }`}
                >
                  <p className="text-[11px] opacity-75 font-bold">أخطاء تمنع الحفظ ❌</p>
                  <p className="text-xl font-black font-mono mt-0.5">{validationSummary.errorCount}</p>
                </div>

                <div
                  onClick={() => setPreviewFilter("duplicate")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                    previewFilter === "duplicate" ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100/70"
                  }`}
                >
                  <p className="text-[11px] opacity-75 font-bold">مكررات بالـ VIN 🔄</p>
                  <p className="text-xl font-black font-mono mt-0.5">{validationSummary.duplicateCount}</p>
                </div>
              </div>

              {/* Duplicate Strategy & Branch Creation Controls */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-black text-slate-800">إجراء تكرار رقم الهيكل (VIN):</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="dup_strategy"
                      checked={duplicateStrategy === "update"}
                      onChange={() => setDuplicateStrategy("update")}
                      className="accent-slate-900"
                    />
                    <span>تحديث البيانات القائمة (Update / Upsert)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="dup_strategy"
                      checked={duplicateStrategy === "skip"}
                      onChange={() => setDuplicateStrategy("skip")}
                      className="accent-slate-900"
                    />
                    <span>تخطي المكرر وإدخال الجديد فقط (Skip)</span>
                  </label>
                </div>

                {validationSummary.newBranchesCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-900 rounded-xl font-bold text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>سيتم إنشاء {validationSummary.newBranchesCount} فروع جديدة تلقائياً: ({validationSummary.newBranchesList.join("، ")})</span>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">الماركة والموديل</th>
                      <th className="py-2.5 px-3 text-center">السنة</th>
                      <th className="py-2.5 px-3">الفئة</th>
                      <th className="py-2.5 px-3 text-center">اللوحة</th>
                      <th className="py-2.5 px-3">رقم الهيكل (VIN)</th>
                      <th className="py-2.5 px-3">الفرع</th>
                      <th className="py-2.5 px-3">اللون</th>
                      <th className="py-2.5 px-3 text-center">الحالة</th>
                      <th className="py-2.5 px-3 text-center">حالة الفحص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreviewRows.map((row, idx) => {
                      const isError = row.validation_status === "error";
                      const isWarning = row.validation_status === "warning";
                      const isDup = row.is_db_duplicate || row.is_intra_duplicate;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            isError ? "bg-red-50/50" : isWarning ? "bg-amber-50/40" : ""
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-bold text-slate-400 text-[11px]">
                            {row.row_number}
                          </td>

                          {/* Brand & Model */}
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900">
                              {row.brand_name} {row.model_name}
                            </span>
                          </td>

                          {/* Year */}
                          <td className="py-2 px-3 text-center font-mono">
                            {row.year}
                          </td>

                          {/* Trim */}
                          <td className="py-2 px-3 text-slate-600">
                            {row.trim}
                          </td>

                          {/* Plate */}
                          <td className="py-2 px-3 text-center font-mono font-bold">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[11px]">
                              {row.plate_number}
                            </span>
                          </td>

                          {/* VIN */}
                          <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-800">
                            <span className={isDup ? "text-blue-700 bg-blue-50 px-1 py-0.5 rounded" : ""}>
                              {row.vin}
                            </span>
                          </td>

                          {/* Branch */}
                          <td className="py-2 px-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                              row.is_new_branch ? "bg-purple-100 text-purple-900 border border-purple-200" : "bg-slate-100 text-slate-700"
                            }`}>
                              {row.branch_name}
                              {row.is_new_branch ? " ✨" : ""}
                            </span>
                          </td>

                          {/* Color */}
                          <td className="py-2 px-3 text-slate-600">
                            {row.color}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3 text-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              row.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {row.status === "active" ? "نشطة" : "صيانة"}
                            </span>
                          </td>

                          {/* Validation Status Badge */}
                          <td className="py-2 px-3 text-center">
                            {isError ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full"
                                title={row.validation_errors.join(" | ")}
                              >
                                <AlertCircle className="w-3 h-3 text-red-600" />
                                <span>خطأ ({row.validation_errors.length})</span>
                              </span>
                            ) : isWarning ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"
                                title={row.validation_warnings.join(" | ")}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>تنبيه</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>سليم ✓</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("mapping")}
                    className="text-xs font-bold text-slate-700"
                  >
                    ← تعديل مطابقة الأعمدة
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("upload")}
                    className="text-xs font-bold text-slate-500"
                  >
                    رفع ملف آخر
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  {validationSummary.errorCount > 0 && (
                    <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>يوجد {validationSummary.errorCount} أخطاء تمنع الحفظ</span>
                    </span>
                  )}

                  <Button
                    onClick={handleExecuteImport}
                    disabled={validationSummary.errorCount > 0 || isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري المعالجة...</span>
                      </span>
                    ) : (
                      <span>بدء استيراد {validationSummary.totalRows} مركبة الآن ←</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ════════ STEP 4: PROCESSING ════════ */}
          {step === "processing" && (
            <div className="py-12 px-6 max-w-lg mx-auto text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 mx-auto flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">جاري استيراد وتحديث الأسطول...</h3>
                <p className="text-xs text-slate-500">
                  يتم إرسال وفحص البيانات في دفعات آمنة وتحديث الفروع وقيد الأحداث في النظام
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">تمت معالجة: {processedRowsCount} من {validationSummary?.totalRows || 0} مركبة</span>
                  <span className="text-emerald-700 font-mono font-black">{progressPercent}%</span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 justify-center">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>يرجى عدم إغلاق هذه النافذة أو تحديث الصفحة حتى اكتمال الاستيراد.</span>
              </div>
            </div>
          )}

          {/* ════════ STEP 5: RESULTS ════════ */}
          {step === "result" && importResult && (
            <div className="py-8 px-6 max-w-xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">اكتملت عملية الاستيراد بنجاح!</h3>
                <p className="text-xs text-slate-500">
                  تم تحديث قاعدة بيانات أسطول المركبات وقيد الأحداث وسجلات التدقيق
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <p className="text-xs font-bold opacity-75">مركبات أضيفت جديداً</p>
                  <p className="text-2xl font-black font-mono mt-0.5 text-emerald-700">+{importResult.added_count}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                  <p className="text-xs font-bold opacity-75">مركبات تم تحديثها</p>
                  <p className="text-2xl font-black font-mono mt-0.5 text-blue-700">~{importResult.updated_count}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900">
                  <p className="text-xs font-bold opacity-75">مركبات تم تخطيها</p>
                  <p className="text-2xl font-black font-mono mt-0.5 text-slate-700">{importResult.skipped_count}</p>
                </div>
              </div>

              {importResult.new_branches_created && importResult.new_branches_created.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs font-bold flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-700" />
                  <span>تم إنشاء ({importResult.new_branches_created.length}) فروع جديدة في النظام بنجاح: {importResult.new_branches_created.join("، ")}</span>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-red-900 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>تعذر استيراد ({importResult.errors.length}) صفوف بسبب أخطاء</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportImportErrorReport(importResult.errors, "تقرير_أخطاء_استيراد_المركبات")}
                      className="h-8 px-3 rounded-lg border-red-300 bg-white hover:bg-red-100 text-red-800 text-[11px] font-bold gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل تقرير الأخطاء (.xlsx)</span>
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-3">
                <Button
                  onClick={onClose}
                  className="h-11 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-lg cursor-pointer"
                >
                  <span>إغلاق وعرض الأسطول المحدث ✓</span>
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
