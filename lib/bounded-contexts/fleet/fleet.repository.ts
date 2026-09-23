/**
 * Fleet Bounded Context Repository Layer
 * Implements FTS Search, Soft Delete, Audit Trail & Outbox Transactional Events
 */

import {
  VehicleEntity,
  CreateVehicleCommand,
  UpdateVehicleCommand,
  DeleteVehicleCommand,
  SearchVehiclesQuery,
  VehicleSnapshotDTO,
  BulkImportVehiclesCommand,
  BulkImportResultDTO,
  BulkImportRowError,
  ImportAuditRecord,
} from "./fleet.types";
import { OutboxEvent, AuditLogRecord } from "../types/common.types";
import { normalizeVin, normalizeBranchName } from "./fleet.import";

const LOCAL_STORAGE_KEY = "rfq_demo_vehicles_v3";
const OUTBOX_KEY = "rfq_demo_outbox_events_v3";
const AUDIT_KEY = "rfq_demo_audit_logs_v3";
const IMPORT_HISTORY_KEY = "rfq_demo_import_history_v1";
const BRANCHES_KEY = "rfq_demo_branches_v1";

const SEED_VEHICLES: VehicleEntity[] = [
  {
    id: "veh-toyota-camry-01",
    organization_id: "org-national-procurement",
    branch_id: "br-riyadh-main",
    fleet_id: "fl-exec-01",
    brand_id: "b-toyota",
    brand_name: "تويوتا",
    model_id: "m-camry",
    model_name: "كامري",
    year: 2023,
    trim: "GLE 2.5",
    vin: "JTEBU5JR8K5092141",
    plate_number: "أ ب ج 1234",
    color: "أبيض لؤلؤي",
    status: "active",
    is_default: true,
    is_favorite: true,
    notes: "سيارة الإدارة التنفيذية - صيانة دورية كل 10 آلاف كم",
    metadata: { engine_code: "A25A-FKS", cylinders: 4, fuel_type: "بنزين 91", transmission: "أوتوماتيك 8 سرعات" },
    documents: [
      { id: "doc-1", vehicle_id: "veh-toyota-camry-01", document_type: "registration", file_url: "/docs/reg_camry.pdf", expiry_date: "2027-11-15", created_at: new Date().toISOString() }
    ],
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "veh-ford-taurus-02",
    organization_id: "org-national-procurement",
    branch_id: "br-jeddah-west",
    fleet_id: "fl-rental-02",
    brand_id: "b-ford",
    brand_name: "فورد",
    model_id: "m-taurus",
    model_name: "تاوروس",
    year: 2022,
    trim: "Titanium 2.0 EcoBoost",
    vin: "1FA6P8CF0H5182931",
    plate_number: "س ص ع 9988",
    color: "فضي ميترال",
    status: "active",
    is_default: false,
    is_favorite: true,
    notes: "مركبة تشغيل فرع جدة",
    metadata: { engine_code: "2.0L EcoBoost", cylinders: 4, fuel_type: "بنزين 95" },
    documents: [],
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "veh-hyundai-sonata-03",
    organization_id: "org-national-procurement",
    branch_id: "br-dammam-east",
    fleet_id: "fl-deliv-03",
    brand_id: "b-hyundai",
    brand_name: "هيونداي",
    model_id: "m-sonata",
    model_name: "سوناتا",
    year: 2021,
    trim: "Smart 2.5",
    vin: "KMHCT4AE8FU123456",
    plate_number: "د هـ و 5678",
    color: "رمادي غامق",
    status: "maintenance",
    is_default: false,
    is_favorite: false,
    notes: "تحت الصيانة في ورشة المنطقة الشرقية",
    metadata: { engine_code: "Smartstream G2.5", cylinders: 4 },
    documents: [],
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export class FleetRepository {
  private getStorageVehicles(): VehicleEntity[] {
    if (typeof window === "undefined") return SEED_VEHICLES;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_VEHICLES));
        return SEED_VEHICLES;
      }
      return JSON.parse(raw);
    } catch (e) {
      return SEED_VEHICLES;
    }
  }

  private saveStorageVehicles(vehicles: VehicleEntity[]) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vehicles));
        window.dispatchEvent(new Event("rfq_data_changed"));
      } catch (e) {
        // ignore
      }
    }
  }

  private recordOutboxEvent(event: OutboxEvent) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(OUTBOX_KEY) || "[]";
        const events: OutboxEvent[] = JSON.parse(raw);
        events.unshift(event);
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(events.slice(0, 50)));
      } catch (e) {
        // ignore
      }
    }
  }

  private recordAuditLog(log: AuditLogRecord) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(AUDIT_KEY) || "[]";
        const logs: AuditLogRecord[] = JSON.parse(raw);
        logs.unshift(log);
        localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 100)));
      } catch (e) {
        // ignore
      }
    }
  }

  /* ──────────────── Search Vehicles Query (FTS Simulation) ──────────────── */
  async searchVehicles(query: SearchVehiclesQuery): Promise<{ vehicles: VehicleEntity[]; total: number }> {
    const all = this.getStorageVehicles().filter(v => !v.deleted_at);

    let filtered = all.filter(v => v.organization_id === query.organization_id || query.organization_id === "org-national-procurement");

    if (query.status) {
      filtered = filtered.filter(v => v.status === query.status);
    }

    if (query.is_favorite) {
      filtered = filtered.filter(v => v.is_favorite);
    }

    if (query.search_term && query.search_term.trim() !== "") {
      const term = query.search_term.trim().toLowerCase();
      filtered = filtered.filter(v =>
        v.vin.toLowerCase().includes(term) ||
        v.plate_number.toLowerCase().includes(term) ||
        v.brand_name.toLowerCase().includes(term) ||
        v.model_name.toLowerCase().includes(term) ||
        (v.notes && v.notes.toLowerCase().includes(term))
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return { vehicles: paginated, total: filtered.length };
  }

  /* ──────────────── Get Vehicle Details Query ──────────────── */
  async getVehicleById(id: string): Promise<VehicleEntity | null> {
    const all = this.getStorageVehicles();
    return all.find(v => v.id === id && !v.deleted_at) || null;
  }

  /* ──────────────── Create Vehicle Command ──────────────── */
  async createVehicle(cmd: CreateVehicleCommand): Promise<VehicleEntity> {
    const all = this.getStorageVehicles();

    // Reset default if new vehicle is specified as default
    if (cmd.is_default) {
      all.forEach(v => { v.is_default = false; });
    }

    const newVehicle: VehicleEntity = {
      id: `veh-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organization_id: cmd.organization_id || "org-national-procurement",
      branch_id: cmd.branch_id || "br-riyadh-main",
      fleet_id: cmd.fleet_id || "fl-exec-01",
      brand_id: cmd.brand_id || "b-custom",
      brand_name: cmd.brand_name || "مركبة معتمدة",
      model_id: cmd.model_id || "m-custom",
      model_name: cmd.model_name || "موديل حديث",
      year: Number(cmd.year) || new Date().getFullYear(),
      trim: cmd.trim || "",
      vin: cmd.vin && cmd.vin.trim() ? cmd.vin.trim().toUpperCase() : `VIN${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      plate_number: cmd.plate_number || "أ ب ج 100",
      color: cmd.color || "أبيض",
      status: "active",
      is_default: !!cmd.is_default,
      is_favorite: !!cmd.is_favorite,
      notes: cmd.notes || "",
      metadata: { vin_decoded_at: new Date().toISOString() },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    all.unshift(newVehicle);
    this.saveStorageVehicles(all);

    // Record Transactional Outbox Event
    this.recordOutboxEvent({
      id: `evt_${Date.now()}`,
      event_type: "VehicleCreatedEvent",
      aggregate_type: "Vehicle",
      aggregate_id: newVehicle.id,
      payload: { vehicle_id: newVehicle.id, vin: newVehicle.vin, organization_id: newVehicle.organization_id },
      status: "pending",
      retry_count: 0,
      correlation_id: `corr_${Date.now()}`,
      created_at: new Date().toISOString(),
    });

    // Record Audit Log
    this.recordAuditLog({
      id: `audit_${Date.now()}`,
      organization_id: newVehicle.organization_id,
      user_id: cmd.user_id,
      action: "CREATE_VEHICLE",
      entity_name: "Vehicle",
      entity_id: newVehicle.id,
      new_values: newVehicle,
      timestamp: new Date().toISOString(),
    });

    return newVehicle;
  }

  /* ──────────────── Update Vehicle Command ──────────────── */
  async updateVehicle(cmd: UpdateVehicleCommand): Promise<VehicleEntity | null> {
    const all = this.getStorageVehicles();
    const idx = all.findIndex(v => v.id === cmd.vehicle_id && !v.deleted_at);
    if (idx < 0) return null;

    const oldValues = { ...all[idx] };

    if (cmd.is_default) {
      all.forEach(v => { v.is_default = false; });
    }

    if (cmd.brand_id) all[idx].brand_id = cmd.brand_id;
    if (cmd.brand_name) all[idx].brand_name = cmd.brand_name;
    if (cmd.model_id) all[idx].model_id = cmd.model_id;
    if (cmd.model_name) all[idx].model_name = cmd.model_name;
    if (cmd.year) all[idx].year = cmd.year;
    if (cmd.trim !== undefined) all[idx].trim = cmd.trim;
    if (cmd.vin) all[idx].vin = cmd.vin.toUpperCase();
    if (cmd.plate_number) all[idx].plate_number = cmd.plate_number;
    if (cmd.branch_id) all[idx].branch_id = cmd.branch_id;
    if (cmd.status) all[idx].status = cmd.status;
    if (typeof cmd.is_default === "boolean") all[idx].is_default = cmd.is_default;
    if (typeof cmd.is_favorite === "boolean") all[idx].is_favorite = cmd.is_favorite;
    if (cmd.notes !== undefined) all[idx].notes = cmd.notes;
    if (cmd.color !== undefined) all[idx].color = cmd.color;
    all[idx].updated_at = new Date().toISOString();

    this.saveStorageVehicles(all);

    this.recordAuditLog({
      id: `audit_${Date.now()}`,
      user_id: cmd.user_id,
      action: "UPDATE_VEHICLE",
      entity_name: "Vehicle",
      entity_id: all[idx].id,
      old_values: oldValues,
      new_values: all[idx],
      timestamp: new Date().toISOString(),
    });

    return all[idx];
  }

  /* ──────────────── Toggle Favorite ──────────────── */
  async toggleFavorite(params: { vehicle_id: string; user_id: string }): Promise<VehicleEntity | null> {
    const all = this.getStorageVehicles();
    const idx = all.findIndex(v => v.id === params.vehicle_id && !v.deleted_at);
    if (idx < 0) return null;

    all[idx].is_favorite = !all[idx].is_favorite;
    all[idx].updated_at = new Date().toISOString();
    this.saveStorageVehicles(all);
    return all[idx];
  }

  /* ──────────────── Delete Vehicle Command (Soft Delete) ──────────────── */
  async deleteVehicle(cmd: DeleteVehicleCommand): Promise<boolean> {
    const all = this.getStorageVehicles();
    const idx = all.findIndex(v => v.id === cmd.vehicle_id && !v.deleted_at);
    if (idx < 0) return false;

    all[idx].deleted_at = new Date().toISOString();
    all[idx].deleted_by = cmd.user_id;

    this.saveStorageVehicles(all);

    this.recordAuditLog({
      id: `audit_${Date.now()}`,
      user_id: cmd.user_id,
      action: "SOFT_DELETE_VEHICLE",
      entity_name: "Vehicle",
      entity_id: cmd.vehicle_id,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /* ──────────────── Generate Immutable Vehicle Snapshot ──────────────── */
  createVehicleSnapshot(vehicle: VehicleEntity): VehicleSnapshotDTO {
    return {
      vehicle_id: vehicle.id,
      make: vehicle.brand_name,
      model: vehicle.model_name,
      year: vehicle.year,
      trim: vehicle.trim,
      vin: vehicle.vin,
      plate_number: vehicle.plate_number,
      color: vehicle.color,
      organization_name: "شركة المشتريات الوطنية",
      snapshot_timestamp: new Date().toISOString(),
    };
  }

  /* ──────────────── Bulk Upsert Vehicles Command (Enterprise Bulk Import) ──────────────── */
  async bulkUpsertVehicles(cmd: BulkImportVehiclesCommand): Promise<BulkImportResultDTO> {
    const all = this.getStorageVehicles();
    const errors: BulkImportRowError[] = [];
    const newBranchesCreated: string[] = [];

    // 1. Idempotency Check: prevent duplicate execution of same import_id
    if (typeof window !== "undefined") {
      try {
        const historyRaw = localStorage.getItem(IMPORT_HISTORY_KEY) || "[]";
        const history: ImportAuditRecord[] = JSON.parse(historyRaw);
        const existingRecord = history.find(h => h.import_id === cmd.import_id && h.status === "completed");
        if (existingRecord) {
          return {
            import_id: existingRecord.import_id,
            file_name: existingRecord.file_name,
            timestamp: existingRecord.timestamp,
            total_rows: existingRecord.total_rows,
            added_count: existingRecord.added_count,
            updated_count: existingRecord.updated_count,
            skipped_count: existingRecord.skipped_count,
            failed_count: existingRecord.failed_count,
            new_branches_created: existingRecord.new_branches,
            status: "completed",
            errors: [],
          };
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Load & Sync Branches
    let branches: Array<{ id: string; title: string; city: string; address?: string; phone?: string }> = [];
    if (typeof window !== "undefined") {
      try {
        const bRaw = localStorage.getItem(BRANCHES_KEY);
        if (bRaw) branches = JSON.parse(bRaw);
      } catch (e) {}
    }
    if (branches.length === 0) {
      branches = [
        { id: "br-riyadh", title: "فرع الرياض", city: "الرياض", address: "طريق الملك فهد – حي العليا", phone: "0112345678" },
        { id: "br-jeddah", title: "فرع جدة", city: "جدة", address: "طريق المدينة – حي الروضة", phone: "0123456789" },
        { id: "br-dammam", title: "فرع الدمام", city: "الدمام", address: "شارع الأمل – الكورنيش الشمالي", phone: "0134567890" },
        { id: "br-makkah", title: "فرع مكة المكرمة", city: "مكة المكرمة", address: "طريق العزيزية العام", phone: "0125556677" },
      ];
    }

    const branchLookup = new Map<string, string>();
    branches.forEach(b => {
      branchLookup.set(normalizeBranchName(b.title).toLowerCase(), b.id);
    });

    // 3. Process Each Vehicle
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const currentYear = new Date().getFullYear();

    for (const item of cmd.vehicles) {
      let vin = normalizeVin(item.vin);
      if (!vin) {
        vin = `KSA${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}${item.row_number || 1}`;
      }

      const brand_name = item.brand_name && item.brand_name !== "—" ? item.brand_name.trim() : "مركبة معتمدة";
      const model_name = item.model_name && item.model_name !== "—" ? item.model_name.trim() : "طراز عام";
      const plate_number = item.plate_number && item.plate_number !== "—" ? item.plate_number.trim() : `غير محدد - ${item.row_number || 1}`;
      let year = Number(item.year);
      if (isNaN(year) || year < 1970 || year > currentYear + 2) {
        year = currentYear;
      }

      // Handle Branch Resolution / Dynamic Creation
      let branchId = item.branch_id || "br-riyadh";
      if (item.branch_name) {
        const normBranch = normalizeBranchName(item.branch_name);
        const normKey = normBranch.toLowerCase();
        if (branchLookup.has(normKey)) {
          branchId = branchLookup.get(normKey)!;
        } else if (cmd.create_missing_branches !== false) {
          // Create new branch
          const newBId = `br-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const newBranchObj = {
            id: newBId,
            title: normBranch,
            city: "المملكة العربية السعودية",
            address: normBranch,
            phone: "0110000000",
          };
          branches.push(newBranchObj);
          branchLookup.set(normKey, newBId);
          branchId = newBId;
          if (!newBranchesCreated.includes(normBranch)) {
            newBranchesCreated.push(normBranch);
          }
        }
      }

      // Check for Existing Vehicle by VIN
      const existingIdx = all.findIndex(v => normalizeVin(v.vin) === vin && !v.deleted_at);

      if (existingIdx >= 0) {
        // DUPLICATE VIN FOUND IN DATABASE
        if (cmd.duplicate_strategy === "update") {
          // Update Mode: Merge non-empty fields into existing record without blanking out data
          const existing = all[existingIdx];
          const oldValues = { ...existing };

          if (item.brand_name && item.brand_name !== "—") existing.brand_name = item.brand_name;
          if (item.model_name && item.model_name !== "—") existing.model_name = item.model_name;
          if (item.year) existing.year = item.year;
          if (item.trim && item.trim !== "—") existing.trim = item.trim;
          if (item.plate_number && item.plate_number !== "—") existing.plate_number = item.plate_number;
          if (item.color && item.color !== "—") existing.color = item.color;
          if (item.status) existing.status = item.status;
          if (typeof item.is_favorite === "boolean") existing.is_favorite = item.is_favorite;
          if (item.notes) existing.notes = item.notes;
          existing.branch_id = branchId;
          existing.updated_at = new Date().toISOString();

          updatedCount++;
        } else {
          // Skip Mode: Ignore existing vehicle
          skippedCount++;
        }
      } else {
        // NEW VEHICLE CREATION
        const newVehicle: VehicleEntity = {
          id: `veh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          organization_id: cmd.organization_id || "org-national-procurement",
          branch_id: branchId,
          fleet_id: "fl-exec-01",
          brand_id: `b-${brand_name.toLowerCase()}`,
          brand_name,
          model_id: `m-${model_name.toLowerCase()}`,
          model_name,
          year,
          trim: item.trim || "قياسي",
          vin,
          plate_number,
          color: item.color || "أبيض",
          status: item.status || "active",
          is_default: false,
          is_favorite: !!item.is_favorite,
          notes: item.notes || "",
          metadata: { vin_decoded_at: new Date().toISOString() },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        all.unshift(newVehicle);
        addedCount++;
      }
    }

    // 4. Commit Changes to Storage
    this.saveStorageVehicles(all);

    if (typeof window !== "undefined" && newBranchesCreated.length > 0) {
      try {
        localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
      } catch (e) {}
    }

    // 5. Record Transactional Outbox Event
    this.recordOutboxEvent({
      id: `evt_import_${Date.now()}`,
      event_type: "FleetBulkImportedEvent",
      aggregate_type: "Fleet",
      aggregate_id: cmd.import_id,
      payload: {
        import_id: cmd.import_id,
        organization_id: cmd.organization_id,
        added_count: addedCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        errors_count: errors.length,
      },
      status: "pending",
      retry_count: 0,
      correlation_id: `corr_${cmd.import_id}`,
      created_at: new Date().toISOString(),
    });

    // 6. Record Audit Log
    this.recordAuditLog({
      id: `audit_import_${Date.now()}`,
      organization_id: cmd.organization_id,
      user_id: cmd.user_id,
      action: "BULK_IMPORT_VEHICLES",
      entity_name: "Fleet",
      entity_id: cmd.import_id,
      new_values: {
        file_name: cmd.file_name,
        duplicate_strategy: cmd.duplicate_strategy,
        added_count: addedCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        new_branches: newBranchesCreated,
      },
      timestamp: new Date().toISOString(),
    });

    // 7. Save Import Audit History Record
    const resultStatus: "completed" | "partial" | "failed" =
      errors.length === 0 ? "completed" : addedCount > 0 || updatedCount > 0 ? "partial" : "failed";

    const auditRecord: ImportAuditRecord = {
      import_id: cmd.import_id,
      user_id: cmd.user_id,
      organization_id: cmd.organization_id,
      file_name: cmd.file_name,
      timestamp: new Date().toISOString(),
      total_rows: cmd.vehicles.length,
      added_count: addedCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      failed_count: errors.length,
      new_branches: newBranchesCreated,
      status: resultStatus,
    };

    if (typeof window !== "undefined") {
      try {
        const historyRaw = localStorage.getItem(IMPORT_HISTORY_KEY) || "[]";
        const history: ImportAuditRecord[] = JSON.parse(historyRaw);
        history.unshift(auditRecord);
        localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
      } catch (e) {}
    }

    return {
      import_id: cmd.import_id,
      file_name: cmd.file_name,
      timestamp: auditRecord.timestamp,
      total_rows: cmd.vehicles.length,
      added_count: addedCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      failed_count: errors.length,
      new_branches_created: newBranchesCreated,
      status: resultStatus,
      errors,
    };
  }

  /* ──────────────── Get Import History Query ──────────────── */
  async getImportHistory(organizationId: string): Promise<ImportAuditRecord[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(IMPORT_HISTORY_KEY) || "[]";
      const history: ImportAuditRecord[] = JSON.parse(raw);
      return history.filter(h => h.organization_id === organizationId || organizationId === "org-national-procurement");
    } catch (e) {
      return [];
    }
  }
}

export const fleetRepository = new FleetRepository();
