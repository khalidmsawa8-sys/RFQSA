"use client";

import React, { useState, useEffect, useMemo } from "react";
import { VehicleEntity, CreateVehicleCommand, UpdateVehicleCommand } from "@/lib/bounded-contexts/fleet/fleet.types";
import { fleetRepository } from "@/lib/bounded-contexts/fleet/fleet.repository";
import { INITIAL_VEHICLE_BRANDS, INITIAL_VEHICLE_MODELS } from "@/lib/bounded-contexts/catalog/catalog.types";
import {
  Car,
  Plus,
  Search,
  Star,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Check,
  Loader2,
  ArrowLeft,
  RefreshCw,
  ChevronLeft,
  Building2,
  SlidersHorizontal,
  Eye,
  Edit3,
  Copy,
  X,
  KeyRound,
  Sparkles,
  MapPin,
  Calendar,
  Award,
  MoreHorizontal,
  Clock,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  exportVehiclesToFormattedExcel,
  exportVehiclesToExcelCsv,
} from "@/lib/bounded-contexts/fleet/fleet.export";
import { VehicleImportModal } from "@/components/fleet/vehicle-import-modal";
import {
  BranchLocationMapPicker,
  SelectedLocationData,
} from "@/components/fleet/branch-location-map-picker";

/* ────────────────────────────────────────────── Column Config */
interface ColumnConfig {
  id: string;
  label: string;
}

const TABLE_COLUMNS_CONFIG: ColumnConfig[] = [
  { id: "vehicle", label: "المركبة والموديل" },
  { id: "plate", label: "رقم اللوحة" },
  { id: "vin", label: "رقم الهيكل (VIN)" },
  { id: "branch", label: "الفرع المرتبط" },
  { id: "color", label: "اللون الخارجي" },
  { id: "status", label: "الحالة" },
  { id: "favorite", label: "المفضلة" },
  { id: "actions", label: "الإجراءات" },
];

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  vehicle: true,
  plate: true,
  vin: true,
  branch: true,
  color: true,
  status: true,
  favorite: true,
  actions: true,
};

const COLUMN_STORAGE_KEY = "rfq_vehicle_table_columns_v1";

type FilterTab = "all" | "active" | "maintenance" | "favorite";

export default function FleetVehiclesManagementPage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<VehicleEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleEntity | null>(null);
  const [selectedVehicleForDetails, setSelectedVehicleForDetails] = useState<VehicleEntity | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [vinCopiedId, setVinCopiedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Add / Edit Form State
  const [brandId, setBrandId] = useState(INITIAL_VEHICLE_BRANDS[0].id);
  const [modelId, setModelId] = useState(INITIAL_VEHICLE_MODELS[0].id);
  const [year, setYear] = useState(2023);
  const [trim, setTrim] = useState("");
  const [vin, setVin] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [color, setColor] = useState("أبيض لؤلؤي");
  const [selectedBranchId, setSelectedBranchId] = useState("br-riyadh");
  const [vehicleStatus, setVehicleStatus] = useState<"active" | "maintenance">("active");
  const [isDefault, setIsDefault] = useState(false);
  const [isFavorite, setIsFavorite] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Branches State
  const [branches, setBranches] = useState<any[]>([]);
  const [newBranchTitle, setNewBranchTitle] = useState("");
  const [newBranchCity, setNewBranchCity] = useState("الرياض");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [newBranchLat, setNewBranchLat] = useState<number | undefined>(24.7136);
  const [newBranchLng, setNewBranchLng] = useState<number | undefined>(46.6753);
  const [newBranchMapsUrl, setNewBranchMapsUrl] = useState<string | undefined>(undefined);

  const DEFAULT_BRANCHES = [
    { id: "br-riyadh", title: "فرع الرياض", city: "الرياض", address: "طريق الملك فهد – حي العليا", phone: "0112345678" },
    { id: "br-jeddah", title: "فرع جدة", city: "جدة", address: "طريق المدينة – حي الروضة", phone: "0123456789" },
    { id: "br-dammam", title: "فرع الدمام", city: "الدمام", address: "شارع الأمل – الكورنيش الشمالي", phone: "0134567890" },
    { id: "br-makkah", title: "فرع مكة المكرمة", city: "مكة المكرمة", address: "طريق العزيزية العام", phone: "0125556677" },
  ];

  // Hydrate Columns from LocalStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
        if (saved) {
          setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) });
        }
      }
    } catch (e) {}
  }, []);

  const handleToggleColumn = (colId: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [colId]: !prev[colId] };
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
      }
    } catch (e) {}
  };

  const fetchBranches = () => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("rfq_demo_branches_v1");
        if (raw) {
          setBranches(JSON.parse(raw));
          return;
        }
      } catch (e) {}
      localStorage.setItem("rfq_demo_branches_v1", JSON.stringify(DEFAULT_BRANCHES));
      setBranches(DEFAULT_BRANCHES);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/client/vehicles");
      const data = await res.json();
      if (data.success && Array.isArray(data.vehicles)) {
        setVehicles(data.vehicles);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Failed to fetch vehicles from API:", e);
    }
    setVehicles([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
    fetchBranches();
  }, [search]);

  // Copy VIN to Clipboard Helper
  const copyVin = (vinText: string, vehicleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(vinText);
      setVinCopiedId(vehicleId);
      setTimeout(() => setVinCopiedId(null), 2000);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (v: VehicleEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/v1/client/vehicles/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !v.is_favorite }),
      });
    } catch {}
    await fetchVehicles();
  };

  // Branch Helper lookup
  const getBranchTitle = (branchId?: string) => {
    if (!branchId) return "فرع الرياض";
    const found = branches.find((b) => b.id === branchId);
    return found ? found.title : "فرع الرياض";
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Tab filter
      if (filterTab === "active" && v.status !== "active") return false;
      if (filterTab === "maintenance" && v.status !== "maintenance") return false;
      if (filterTab === "favorite" && !v.is_favorite) return false;

      // Branch filter
      if (branchFilter !== "all" && v.branch_id !== branchFilter) return false;

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const fullTitle = `${v.brand_name} ${v.model_name} ${v.year} ${v.trim || ""}`.toLowerCase();
        const matchPlate = (v.plate_number || "").toLowerCase().includes(q);
        const matchVin = (v.vin || "").toLowerCase().includes(q);
        const matchBranch = getBranchTitle(v.branch_id).toLowerCase().includes(q);
        const matchColor = (v.color || "").toLowerCase().includes(q);
        const matchNotes = (v.notes || "").toLowerCase().includes(q);
        if (!fullTitle.includes(q) && !matchPlate && !matchVin && !matchBranch && !matchColor && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [vehicles, filterTab, branchFilter, search, branches]);

  // ── Excel / CSV Export Handlers ──
  const handleExportAll = async (format: "xlsx" | "csv" = "xlsx") => {
    setIsExporting(true);
    try {
      // Query complete dataset for this organization without UI limit
      const res = await fleetRepository.searchVehicles({
        organization_id: "org-national-procurement",
        limit: 10000,
      });

      if (!res.vehicles || res.vehicles.length === 0) {
        alert("لا توجد مركبات مسجلة في قاعدة البيانات لتصديرها.");
        setIsExporting(false);
        return;
      }

      let count = 0;
      if (format === "xlsx") {
        count = await exportVehiclesToFormattedExcel({
          vehicles: res.vehicles,
          branchLookup: getBranchTitle,
          branchesList: branches,
          filenamePrefix: "تقرير_كافة_مركبات_الأسطول",
        });
        setExportSuccessMessage(`تم تصدير ${count} مركبة بنجاح إلى ملف إكسل منسق ومصمم بالكامل (.xlsx)`);
      } else {
        count = exportVehiclesToExcelCsv({
          vehicles: res.vehicles,
          branchLookup: getBranchTitle,
          filenamePrefix: "تقرير_كافة_مركبات_الأسطول",
        });
        setExportSuccessMessage(`تم تصدير ${count} مركبة بنجاح إلى ملف CSV متوافق`);
      }

      setTimeout(() => setExportSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Export all error:", err);
      alert("حدث خطأ أثناء تصدير ملف الإكسل");
    }
    setIsExporting(false);
  };

  const handleExportFiltered = async (format: "xlsx" | "csv" = "xlsx") => {
    setIsExporting(true);
    try {
      if (!filteredVehicles || filteredVehicles.length === 0) {
        alert("لا توجد نتائج مطابقة للفلاتر والبحث الحالي لتصديرها.");
        setIsExporting(false);
        return;
      }

      let count = 0;
      if (format === "xlsx") {
        count = await exportVehiclesToFormattedExcel({
          vehicles: filteredVehicles,
          branchLookup: getBranchTitle,
          branchesList: branches,
          filenamePrefix: "تقرير_مركبات_الأسطول_المفلترة",
        });
        setExportSuccessMessage(`تم تصدير ${count} مركبة مفلترة بنجاح إلى ملف إكسل منسق ومصمم بالكامل (.xlsx)`);
      } else {
        count = exportVehiclesToExcelCsv({
          vehicles: filteredVehicles,
          branchLookup: getBranchTitle,
          filenamePrefix: "تقرير_مركبات_الأسطول_المفلترة",
        });
        setExportSuccessMessage(`تم تصدير ${count} مركبة مفلترة بنجاح إلى ملف CSV متوافق`);
      }

      setTimeout(() => setExportSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Export filtered error:", err);
      alert("حدث خطأ أثناء تصدير ملف الإكسل");
    }
    setIsExporting(false);
  };

  // Open Edit Modal
  const openEditModal = (v: VehicleEntity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingVehicle(v);
    const b = INITIAL_VEHICLE_BRANDS.find((brand) => brand.name_ar === v.brand_name) || INITIAL_VEHICLE_BRANDS[0];
    const m = INITIAL_VEHICLE_MODELS.find((model) => model.name_ar === v.model_name) || INITIAL_VEHICLE_MODELS[0];
    setBrandId(b.id);
    setModelId(m.id);
    setYear(v.year || 2023);
    setTrim(v.trim || "");
    setVin(v.vin || "");
    setPlateNumber(v.plate_number || "");
    setColor(v.color || "أبيض لؤلؤي");
    setSelectedBranchId(v.branch_id || "br-riyadh");
    setVehicleStatus(v.status === "maintenance" ? "maintenance" : "active");
    setIsDefault(Boolean(v.is_default));
    setIsFavorite(Boolean(v.is_favorite));
    setNotes(v.notes || "");
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingVehicle(null);
    setBrandId(INITIAL_VEHICLE_BRANDS[0].id);
    setModelId(INITIAL_VEHICLE_MODELS[0].id);
    setYear(2023);
    setTrim("");
    setVin("");
    setPlateNumber("");
    setColor("أبيض لؤلؤي");
    setSelectedBranchId(branches[0]?.id || "br-riyadh");
    setVehicleStatus("active");
    setIsDefault(false);
    setIsFavorite(true);
    setNotes("");
    setShowAddModal(true);
  };

  // Save Add / Edit
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) {
      alert("يرجى تعبئة رقم اللوحة وبيانات المركبة");
      return;
    }

    setSubmitting(true);
    const brand = INITIAL_VEHICLE_BRANDS.find((b) => b.id === brandId) || INITIAL_VEHICLE_BRANDS[0];
    const model = INITIAL_VEHICLE_MODELS.find((m) => m.id === modelId) || INITIAL_VEHICLE_MODELS[0];

    const vehiclePayload = {
      brand_id: brand.id,
      brand_name: brand.name_ar,
      model_id: model.id,
      model_name: model.name_ar,
      year: Number(year),
      trim,
      vin: vin ? vin.toUpperCase() : undefined,
      plate_number: plateNumber,
      color,
      branch_id: selectedBranchId,
      status: vehicleStatus,
      is_default: isDefault,
      is_favorite: isFavorite,
      notes,
    };

    if (editingVehicle) {
      // Update via server API
      try {
        await fetch(`/api/v1/client/vehicles/${editingVehicle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vehiclePayload),
        });
      } catch (e) {
        console.warn("Failed to patch vehicle:", e);
      }
      setEditingVehicle(null);
      setShowAddModal(false);
    } else {
      // Create via server API
      try {
        await fetch("/api/v1/client/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vehiclePayload),
        });
      } catch (e) {
        console.warn("Failed to create vehicle:", e);
      }
      setShowAddModal(false);
    }

    setSubmitting(false);
    await fetchVehicles();
  };

  // Delete Vehicle
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("هل أنت متأكد من حذف هذه المركبة من حسابك؟")) {
      try {
        await fetch(`/api/v1/client/vehicles/${id}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.warn("Failed to delete vehicle:", e);
      }
      if (selectedVehicleForDetails?.id === id) {
        setSelectedVehicleForDetails(null);
      }
      await fetchVehicles();
    }
  };

  // Branch Handlers
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchTitle.trim() || !newBranchAddress.trim()) {
      alert("يرجى تعبئة اسم الفرع وتحديد العنوان على الخريطة");
      return;
    }
    const mapsUrl = newBranchMapsUrl || (newBranchLat && newBranchLng ? `https://www.google.com/maps?q=${newBranchLat},${newBranchLng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newBranchAddress)}`);
    const updated = [
      ...branches,
      {
        id: `br-${Date.now()}`,
        title: newBranchTitle,
        city: newBranchCity,
        address: newBranchAddress,
        phone: newBranchPhone || "0110000000",
        latitude: newBranchLat,
        longitude: newBranchLng,
        google_maps_url: mapsUrl,
      },
    ];
    localStorage.setItem("rfq_demo_branches_v1", JSON.stringify(updated));
    setBranches(updated);
    setNewBranchTitle("");
    setNewBranchAddress("");
    setNewBranchPhone("");
    setNewBranchLat(undefined);
    setNewBranchLng(undefined);
    setNewBranchMapsUrl(undefined);
    alert("تمت إضافة الفرع الجديد وتثبيت موقعه على الخريطة بنجاح!");
  };

  const handleDeleteBranch = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الفرع؟")) {
      const updated = branches.filter((b) => b.id !== id);
      localStorage.setItem("rfq_demo_branches_v1", JSON.stringify(updated));
      setBranches(updated);
    }
  };

  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;
  const favoriteCount = vehicles.filter((v) => v.is_favorite).length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 dir-rtl text-slate-900 font-sans w-full" dir="rtl">
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0A1224] via-[#0F1C36] to-[#0A1224] p-4 sm:p-6 rounded-3xl text-white shadow-2xl border border-slate-800">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Car className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1 flex-wrap">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400">إدارة الأسطول المؤسسي</span>
              <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Enterprise SaaS Module
              </span>
            </div>
            <h1 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug truncate">
              إدارة المركبات (Vehicles Management)
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-normal">
              إدارة أسطول سيارات الشركة، ربط الفروع، وتخصيص بيانات الهيكل واللوحات لطلب قطع الغيار بسهولة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowBranchModal(true)}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-purple-300" />
            <span>إدارة فروع الشركة ({branches.length})</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-11 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-black transition-all cursor-pointer shadow-xs"
            title="استيراد وتحديث أسطول المركبات من ملف Excel أو CSV دفعة واحدة"
          >
            <FileUp className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            <span>استيراد أسطول (Excel Import)</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-11 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة مركبة جديدة</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS SUMMARY ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Fleet */}
        <div
          onClick={() => setFilterTab("all")}
          className={`bg-white rounded-2xl sm:rounded-3xl border p-3 sm:p-5 shadow-xs flex items-center gap-2.5 sm:gap-4 min-w-0 cursor-pointer transition-all ${
            filterTab === "all" ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30" : "border-slate-200/90 hover:border-blue-300"
          }`}
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Car className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate">إجمالي الأسطول</p>
            <p className="text-base sm:text-2xl font-black text-slate-900 font-mono mt-0.5 truncate">{vehicles.length}</p>
          </div>
        </div>

        {/* Active Vehicles */}
        <div
          onClick={() => setFilterTab("active")}
          className={`bg-white rounded-2xl sm:rounded-3xl border p-3 sm:p-5 shadow-xs flex items-center gap-2.5 sm:gap-4 min-w-0 cursor-pointer transition-all ${
            filterTab === "active" ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30" : "border-slate-200/90 hover:border-emerald-300"
          }`}
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate">المركبات النشطة</p>
            <p className="text-base sm:text-2xl font-black text-emerald-600 font-mono mt-0.5 truncate">{activeCount}</p>
          </div>
        </div>

        {/* Under Maintenance */}
        <div
          onClick={() => setFilterTab("maintenance")}
          className={`bg-white rounded-2xl sm:rounded-3xl border p-3 sm:p-5 shadow-xs flex items-center gap-2.5 sm:gap-4 min-w-0 cursor-pointer transition-all ${
            filterTab === "maintenance" ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30" : "border-slate-200/90 hover:border-amber-300"
          }`}
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate">قيد الصيانة والقطع</p>
            <p className="text-base sm:text-2xl font-black text-amber-600 font-mono mt-0.5 truncate">{maintenanceCount}</p>
          </div>
        </div>

        {/* Linked Branches */}
        <div
          onClick={() => setShowBranchModal(true)}
          className="bg-white hover:bg-purple-50/50 cursor-pointer rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-purple-300 p-3 sm:p-5 shadow-xs flex items-center justify-between gap-2.5 sm:gap-4 min-w-0 transition-all group"
        >
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate">الفروع المرتبطة</p>
              <p className="text-base sm:text-2xl font-black text-slate-900 font-mono mt-0.5 truncate">{branches.length} فروع</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 group-hover:bg-purple-600 group-hover:text-white px-2 py-1 rounded-lg transition-colors shrink-0">
            إدارة ←
          </span>
        </div>
      </div>

      {/* ── FILTER TOOLBAR (TABS, SEARCH, BRANCH SELECTOR & COLUMN VISIBILITY) ── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { key: "all", label: "كافة المركبات", count: vehicles.length },
            { key: "active", label: "المركبات النشطة", count: activeCount },
            { key: "maintenance", label: "قيد الصيانة", count: maintenanceCount },
            { key: "favorite", label: "المفضلة ⭐", count: favoriteCount },
          ].map((tab) => {
            const active = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key as FilterTab)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${active ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Branch Filter & Columns Customizer */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالماركة، الموديل، رقم اللوحة، رقم الشاصي (VIN)، أو الفرع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-8 h-9 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Branch Filter Selector */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">🏢 جميع الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>

            {/* Column Visibility Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-lg border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 hover:bg-white gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  title="التحكم في أعمدة الجدول"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                  <span>تخصيص الأعمدة</span>
                  <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                    {Object.values(visibleColumns).filter(Boolean).length}/{TABLE_COLUMNS_CONFIG.length}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 text-right dir-rtl p-2 rounded-xl shadow-xl border border-slate-200 bg-white z-50 space-y-1"
              >
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 px-1">
                  <span className="text-[11px] font-black text-slate-800">الأعمدة المعروضة</span>
                  <button
                    type="button"
                    onClick={handleResetColumns}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    إظهار الكل
                  </button>
                </div>

                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {TABLE_COLUMNS_CONFIG.map((col) => {
                    const isChecked = visibleColumns[col.id];
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-[11px] font-semibold text-slate-700 select-none transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleColumn(col.id)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Excel / CSV Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="h-9 px-3 rounded-lg border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/80 text-[11px] font-bold text-emerald-800 gap-1.5 cursor-pointer shadow-2xs shrink-0 transition-all"
                  title="تصدير بيانات المركبات إلى ملف إكسل منسق (.xlsx)"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>تصدير إكسل (Excel)</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 text-right dir-rtl p-2 rounded-xl shadow-xl border border-slate-200 bg-white z-50 space-y-1.5"
              >
                <div className="text-[11px] font-black text-slate-800 px-2 py-1 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>تصدير ملفات الإكسل والبيانات</span>
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    XLSX / CSV
                  </span>
                </div>

                {/* Section 1: Formatted Excel (.xlsx) */}
                <div className="px-2 pt-0.5 pb-1">
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>إكسل منسق بنفس ألوان الجدول (.xlsx)</span>
                  </span>
                </div>

                <DropdownMenuItem
                  onClick={() => handleExportAll("xlsx")}
                  className="flex items-center justify-between text-xs py-2 px-2.5 cursor-pointer rounded-lg font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>تصدير كافة المركبات (XLSX)</span>
                  </span>
                  <span className="text-[10px] font-mono font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {vehicles.length}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleExportFiltered("xlsx")}
                  className="flex items-center justify-between text-xs py-2 px-2.5 cursor-pointer rounded-lg font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-900"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>تصدير النتائج المفلترة (XLSX)</span>
                  </span>
                  <span className="text-[10px] font-mono font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {filteredVehicles.length}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-slate-100" />

                {/* Section 2: CSV Format */}
                <div className="px-2 pt-0.5 pb-1">
                  <span className="text-[10px] font-bold text-slate-500">
                    ملف بيانات CSV متوافق مع Excel:
                  </span>
                </div>

                <DropdownMenuItem
                  onClick={() => handleExportAll("csv")}
                  className="flex items-center justify-between text-[11px] py-1.5 px-2.5 cursor-pointer rounded-lg font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>تصدير كـ CSV (كافة المركبات)</span>
                  </span>
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                    {vehicles.length}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleExportFiltered("csv")}
                  className="flex items-center justify-between text-[11px] py-1.5 px-2.5 cursor-pointer rounded-lg font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>تصدير كـ CSV (المفلترة)</span>
                  </span>
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                    {filteredVehicles.length}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVehicles}
              className="h-9 px-3 rounded-lg border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 hover:bg-white gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>تحديث</span>
            </Button>
          </div>
        </div>

        {/* Export Success Notification Banner */}
        {exportSuccessMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* ── VEHICLES DATA TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-bold">جاري تحميل جدول المركبات...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-16 text-center p-8 space-y-3">
            <Car className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">لا توجد مركبات مطابقة في أسطولك</h3>
            <p className="text-xs text-slate-500">جرب تعديل معايير البحث أو أضف مركبة جديدة لأسطول شركتك</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة مركبة الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 select-none">
                  {visibleColumns.vehicle && <th className="py-3 px-4">المركبة والموديل</th>}
                  {visibleColumns.plate && <th className="py-3 px-4 text-center">رقم اللوحة</th>}
                  {visibleColumns.vin && <th className="py-3 px-4">رقم الهيكل (VIN)</th>}
                  {visibleColumns.branch && <th className="py-3 px-4">الفرع المرتبط</th>}
                  {visibleColumns.color && <th className="py-3 px-4">اللون</th>}
                  {visibleColumns.status && <th className="py-3 px-4 text-center">الحالة</th>}
                  {visibleColumns.favorite && <th className="py-3 px-3 text-center">المفضلة</th>}
                  {visibleColumns.actions && <th className="py-3 px-4 text-left">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredVehicles.map((v) => {
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVehicleForDetails(v)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      title="اضغط لمعاينة كافة بيانات وتفاصيل المركبة"
                    >
                      {/* Vehicle & Model */}
                      {visibleColumns.vehicle && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-black text-slate-700 text-sm shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {v.brand_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors text-sm">
                                  {v.brand_name} {v.model_name}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-slate-500">
                                موديل {v.year} {v.trim ? `• ${v.trim}` : ""}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Plate Number */}
                      {visibleColumns.plate && (
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300/80 rounded-lg font-black text-slate-900 text-xs shadow-2xs font-mono">
                            {v.plate_number || "—"}
                          </span>
                        </td>
                      )}

                      {/* VIN */}
                      {visibleColumns.vin && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="font-bold text-slate-800 truncate max-w-[140px]" title={v.vin}>
                              {v.vin}
                            </span>
                            <button
                              onClick={(e) => copyVin(v.vin, v.id, e)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="نسخ رقم الهيكل"
                            >
                              {vinCopiedId === v.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Branch */}
                      {visibleColumns.branch && (
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-lg">
                            <Building2 className="w-3 h-3 text-purple-600" />
                            <span>{getBranchTitle(v.branch_id)}</span>
                          </span>
                        </td>
                      )}

                      {/* Color */}
                      {visibleColumns.color && (
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-bold text-slate-700">{v.color || "أبيض"}</span>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-4 text-center">
                          {v.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.8 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>نشطة وجاهزة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.8 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>قيد الصيانة</span>
                            </span>
                          )}
                        </td>
                      )}

                      {/* Favorite Toggle */}
                      {visibleColumns.favorite && (
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={(e) => handleToggleFavorite(v, e)}
                            className="p-1 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                            title={v.is_favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                v.is_favorite ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"
                              }`}
                            />
                          </button>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-4 text-left">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Fast RFQ Button */}
                            <Link
                              href={`/client/new-rfq?vehicle_id=${v.id}&make=${encodeURIComponent(v.brand_name)}&model=${encodeURIComponent(v.model_name)}&year=${v.year}&plate=${encodeURIComponent(v.plate_number)}&vin=${encodeURIComponent(v.vin)}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-2xs"
                              title="إنشاء طلب عرض سعر فوري لهذه السيارة"
                            >
                              <span>طلب قطع</span>
                              <ArrowLeft className="w-3 h-3" />
                            </Link>

                            {/* Details Button */}
                            <button
                              onClick={() => setSelectedVehicleForDetails(v)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 transition-colors cursor-pointer"
                              title="عرض تفاصيل المركبة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Options */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                  title="خيارات إضافية"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40 text-right dir-rtl p-1 rounded-xl shadow-xl border border-slate-200 bg-white z-50">
                                <DropdownMenuItem
                                  onClick={() => setSelectedVehicleForDetails(v)}
                                  className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                  <span>معاينة التفاصيل</span>
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditModal(v)}
                                  className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                  <span>تعديل البيانات</span>
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(v.id)}
                                  className="flex items-center justify-between text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  <span>أرشفة / حذف</span>
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* ──────────────── VEHICLE DETAILS MODAL (نافذة تفاصيل وبيانات المركبة) ──────────────── */}
      {selectedVehicleForDetails && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedVehicleForDetails(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-right dir-rtl my-8"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
                  {selectedVehicleForDetails.brand_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-slate-900">
                      {selectedVehicleForDetails.brand_name} {selectedVehicleForDetails.model_name}
                    </h3>
                    {selectedVehicleForDetails.is_favorite && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        مفضلة
                      </span>
                    )}
                    {selectedVehicleForDetails.status === "active" ? (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        نشطة وجاهزة
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        قيد الصيانة
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">
                    موديل {selectedVehicleForDetails.year} {selectedVehicleForDetails.trim ? `• فئة ${selectedVehicleForDetails.trim}` : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVehicleForDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions Top Bar */}
            <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <Link
                href={`/client/new-rfq?vehicle_id=${selectedVehicleForDetails.id}&make=${encodeURIComponent(selectedVehicleForDetails.brand_name)}&model=${encodeURIComponent(selectedVehicleForDetails.model_name)}&year=${selectedVehicleForDetails.year}&plate=${encodeURIComponent(selectedVehicleForDetails.plate_number)}&vin=${encodeURIComponent(selectedVehicleForDetails.vin)}`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs transition-all text-center flex items-center justify-center gap-2 shadow-sm"
              >
                <span>طلب قطع غيار لهذه المركبة</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <button
                onClick={() => {
                  const target = selectedVehicleForDetails;
                  setSelectedVehicleForDetails(null);
                  openEditModal(target);
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                <span>تعديل</span>
              </button>

              <button
                onClick={() => handleDelete(selectedVehicleForDetails.id)}
                className="py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="أرشفة المركبة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* الماركة والموديل */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">الماركة والموديل</span>
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-center font-black text-slate-900 truncate">
                  {selectedVehicleForDetails.brand_name} {selectedVehicleForDetails.model_name}
                </p>
              </div>

              {/* سنة الصنع */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">سنة الصنع</span>
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-center font-black text-slate-900">
                  {selectedVehicleForDetails.year}
                </p>
              </div>

              {/* رقم اللوحة */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">رقم اللوحة</span>
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-center font-black text-slate-900 font-mono">
                  {selectedVehicleForDetails.plate_number}
                </p>
              </div>

              {/* رقم الهيكل VIN */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">رقم الهيكل (VIN)</span>
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => copyVin(selectedVehicleForDetails.vin, selectedVehicleForDetails.id)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="نسخ رقم الهيكل"
                  >
                    {vinCopiedId === selectedVehicleForDetails.id ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <p className="font-mono font-bold text-emerald-800 text-[11px] truncate max-w-[90px]" title={selectedVehicleForDetails.vin}>
                    {selectedVehicleForDetails.vin}
                  </p>
                </div>
              </div>

              {/* اللون الخارجي */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">اللون الخارجي</span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-center font-bold text-slate-800">
                  {selectedVehicleForDetails.color || "أبيض"}
                </p>
              </div>

              {/* الفرع المرتبط */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">الفرع المرتبط</span>
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-center font-bold text-slate-800 truncate">
                  {getBranchTitle(selectedVehicleForDetails.branch_id)}
                </p>
              </div>

              {/* الفئة Trim */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">الفئة / Trim</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-center font-bold text-slate-800">
                  {selectedVehicleForDetails.trim || "قياسي"}
                </p>
              </div>

              {/* تاريخ الإضافة */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-end gap-1.5 mb-1 text-slate-500">
                  <span className="text-[11px] font-semibold">تاريخ التسجيل</span>
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-center font-bold text-slate-800 text-[11px]">
                  {new Date(selectedVehicleForDetails.created_at).toLocaleDateString("ar-SA")}
                </p>
              </div>
            </div>

            {/* Notes Section */}
            {selectedVehicleForDetails.notes && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span>💡 ملاحظات التشغيل والصيانة:</span>
                </span>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  {selectedVehicleForDetails.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── ADD / EDIT VEHICLE MODAL ──────────────── */}
      {(showAddModal || editingVehicle) && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-right dir-rtl my-8" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <span>{editingVehicle ? "تعديل بيانات المركبة" : "إضافة مركبة جديدة لأسطول الشركة"}</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingVehicle(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الماركة (Brand)</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  >
                    {INITIAL_VEHICLE_BRANDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_ar} ({b.name_en})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الموديل (Model)</label>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  >
                    {INITIAL_VEHICLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name_ar} ({m.name_en})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">سنة الصنع</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفئة (Trim)</label>
                  <input
                    type="text"
                    value={trim}
                    onChange={(e) => setTrim(e.target.value)}
                    placeholder="GLE / XLE"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اللون</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الشاصي (VIN) *</label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="17 حرف ورقم..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم اللوحة *</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="أ ب ج 1234"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفرع المرتبط</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة المركبة</label>
                  <select
                    value={vehicleStatus}
                    onChange={(e) => setVehicleStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="active">نشطة وجاهزة للتشغيل</option>
                    <option value="maintenance">قيد الصيانة والقطع</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                  <span className="font-bold text-slate-700">تعيين كمركبة مفضلة ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <span className="font-bold text-slate-700">المركبة الافتراضية</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات التشغيل والصيانة</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: صيانة دورية كل 10,000 كم، استخدام زيت 5W-30..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingVehicle ? "حفظ التعديلات" : "حفظ المركبة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── BRANCH MANAGEMENT MODAL ──────────────── */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-right dir-rtl my-6 max-h-[92vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    إدارة فروع الشركة ومواقع التسليم
                  </h3>
                  <p className="text-xs text-slate-500">
                    إضافة مقرات الفروع وتحديد مواقعها الجغرافية بدقة على الخريطة التفاعلية
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBranchModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {/* Add Branch Form */}
              <form onSubmit={handleAddBranch} className="bg-gradient-to-br from-purple-50/60 via-slate-50 to-purple-50/40 p-4 sm:p-5 rounded-3xl border border-purple-100 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
                  <h4 className="font-black text-purple-950 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    <span>إضافة فرع جديد للشركة</span>
                  </h4>
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                    موقع تسليم معتمد
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم الفرع *</label>
                    <input
                      type="text"
                      value={newBranchTitle}
                      onChange={(e) => setNewBranchTitle(e.target.value)}
                      placeholder="مثال: فرع مكة المكرمة - العزيزية"
                      className="w-full h-11 px-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">المدينة *</label>
                    <input
                      type="text"
                      value={newBranchCity}
                      onChange={(e) => setNewBranchCity(e.target.value)}
                      placeholder="الرياض / جدة / مكة..."
                      className="w-full h-11 px-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs text-xs"
                      required
                    />
                  </div>
                </div>

                {/* ── ULTRA-ADVANCED GOOGLE MAPS DELIVERY LOCATION PICKER ── */}
                <BranchLocationMapPicker
                  initialAddress={newBranchAddress}
                  initialCity={newBranchCity}
                  initialLat={newBranchLat || 24.7136}
                  initialLng={newBranchLng || 46.6753}
                  onLocationChange={(loc: SelectedLocationData) => {
                    setNewBranchAddress(loc.address);
                    if (loc.city) setNewBranchCity(loc.city);
                    setNewBranchLat(loc.latitude);
                    setNewBranchLng(loc.longitude);
                    setNewBranchMapsUrl(loc.googleMapsUrl);
                  }}
                />

                {/* Phone Input & Submit Button */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-end">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف للتواصل</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={newBranchPhone}
                      onChange={(e) => setNewBranchPhone(e.target.value)}
                      placeholder="0110000000"
                      className="w-full h-11 px-3 rounded-2xl border border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs text-left [direction:ltr]"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="w-full h-11 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-101 active:scale-99"
                    >
                      <span>+ إضافة الفرع</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Current Branches List */}
              <div className="space-y-2.5">
                <h4 className="font-black text-slate-800 text-xs flex items-center justify-between">
                  <span>الفروع المسجلة حالياً ({branches.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">مرتبطة بطلبات قطع الغيار والأسطول</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {branches.map((b) => (
                    <div key={b.id} className="p-3.5 bg-slate-50 hover:bg-purple-50/50 rounded-2xl border border-slate-200 hover:border-purple-200 flex items-start justify-between gap-3 text-xs transition-all shadow-2xs group">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900">{b.title}</span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">{b.city}</span>
                          {b.latitude && b.longitude && (
                            <span className="text-[9px] font-mono bg-white px-1.5 py-0.2 rounded border border-purple-200 text-purple-700 font-bold">
                              GPS 📍
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">{b.address}</p>
                        
                        <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 flex-wrap">
                          {b.google_maps_url ? (
                            <a
                              href={b.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 font-black flex items-center gap-1 transition-colors bg-purple-100/60 hover:bg-purple-100 px-2 py-0.5 rounded-md"
                            >
                              <MapPin className="w-3 h-3 text-purple-600" />
                              <span>Google Maps ↗</span>
                            </a>
                          ) : (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address + " " + b.city)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 font-black flex items-center gap-1 transition-colors bg-purple-100/60 hover:bg-purple-100 px-2 py-0.5 rounded-md"
                            >
                              <MapPin className="w-3 h-3 text-purple-600" />
                              <span>Google Maps ↗</span>
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {branches.length > 1 && (
                        <button
                          onClick={() => handleDeleteBranch(b.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all shrink-0 cursor-pointer"
                          title="حذف الفرع"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowBranchModal(false)}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK VEHICLE IMPORT MODAL ── */}
      <VehicleImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          fetchVehicles();
          fetchBranches();
        }}
        existingVehicles={vehicles}
        branches={branches}
      />
    </div>
  );
}
