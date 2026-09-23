/**
 * Fleet Bounded Context: Hierarchy (Organization -> Branch -> Fleet -> Vehicle)
 * CQRS Commands & Queries, DTOs, Vehicle Snapshots, Documents & Audit Records
 */

export interface Organization {
  id: string;
  name: string;
  cr_number: string;
  tax_number: string;
  created_at: string;
}

export interface OrganizationBranch {
  id: string;
  organization_id: string;
  name: string;
  city: string;
  address?: string;
  created_at: string;
}

export interface FleetGroup {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  fleet_type: "delivery" | "executive" | "workshop_client" | "rental";
  created_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: "registration" | "insurance" | "inspection" | "license";
  file_url: string;
  expiry_date?: string;
  created_at: string;
}

export interface VehicleMetadata {
  engine_code?: string;
  cylinders?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  vin_decoded_at?: string;
}

export interface VehicleEntity {
  id: string;
  organization_id: string;
  branch_id: string;
  fleet_id: string;
  brand_id: string;
  brand_name: string;
  model_id: string;
  model_name: string;
  year: number;
  trim?: string;
  vin: string;
  plate_number: string;
  color?: string;
  status: "active" | "maintenance" | "archived";
  is_default: boolean;
  is_favorite: boolean;
  notes?: string;
  metadata: VehicleMetadata;
  documents?: VehicleDocument[];
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleSnapshotDTO {
  vehicle_id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  vin: string;
  plate_number: string;
  color?: string;
  organization_name?: string;
  snapshot_timestamp: string;
}

/* ────────────────────────────────── CQRS Commands & Queries ────────────────────────────────── */

export interface CreateVehicleCommand {
  organization_id: string;
  branch_id?: string;
  fleet_id?: string;
  brand_id: string;
  brand_name: string;
  model_id: string;
  model_name: string;
  year: number;
  trim?: string;
  vin: string;
  plate_number: string;
  color?: string;
  is_default?: boolean;
  is_favorite?: boolean;
  notes?: string;
  user_id: string;
}

export interface UpdateVehicleCommand {
  vehicle_id: string;
  brand_id?: string;
  brand_name?: string;
  model_id?: string;
  model_name?: string;
  year?: number;
  trim?: string;
  vin?: string;
  plate_number?: string;
  branch_id?: string;
  status?: "active" | "maintenance" | "archived";
  is_default?: boolean;
  is_favorite?: boolean;
  notes?: string;
  color?: string;
  user_id: string;
}

export interface DeleteVehicleCommand {
  vehicle_id: string;
  user_id: string;
  reason?: string;
}

export interface SearchVehiclesQuery {
  organization_id: string;
  search_term?: string; // FTS across VIN, Plate, Make, Model
  status?: string;
  is_favorite?: boolean;
  page?: number;
  limit?: number;
}

/* ────────────────────────────────── Bulk Import DTOs & Commands ────────────────────────────────── */

export type DuplicateStrategy = "update" | "skip";

export interface ImportedVehicleRowDTO {
  row_number: number;
  brand_name: string;
  model_name: string;
  year: number;
  trim?: string;
  vin: string;
  plate_number: string;
  branch_name?: string;
  branch_id?: string;
  color?: string;
  status: "active" | "maintenance";
  is_favorite?: boolean;
  notes?: string;
  // Validation status & issues
  validation_status: "valid" | "warning" | "error";
  validation_errors: string[];
  validation_warnings: string[];
  is_intra_duplicate?: boolean;
  is_db_duplicate?: boolean;
  existing_vehicle_id?: string;
  is_new_branch?: boolean;
}

export interface BulkImportVehiclesCommand {
  import_id: string;
  organization_id: string;
  user_id: string;
  file_name: string;
  duplicate_strategy: DuplicateStrategy;
  create_missing_branches?: boolean;
  vehicles: Array<{
    row_number: number;
    brand_name: string;
    model_name: string;
    year: number;
    trim?: string;
    vin: string;
    plate_number: string;
    branch_name?: string;
    branch_id?: string;
    color?: string;
    status: "active" | "maintenance";
    is_favorite?: boolean;
    notes?: string;
  }>;
}

export interface BulkImportRowError {
  row_number: number;
  vin: string;
  plate_number?: string;
  field?: string;
  error_type: "MISSING_REQUIRED" | "INVALID_VALUE" | "DUPLICATE_VIN" | "UNAUTHORIZED" | "SERVER_ERROR";
  message: string;
  invalid_value?: any;
}

export interface BulkImportResultDTO {
  import_id: string;
  file_name: string;
  timestamp: string;
  total_rows: number;
  added_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  new_branches_created: string[];
  status: "completed" | "partial" | "failed";
  errors: BulkImportRowError[];
}

export interface ImportAuditRecord {
  import_id: string;
  user_id: string;
  organization_id: string;
  file_name: string;
  timestamp: string;
  total_rows: number;
  added_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  new_branches: string[];
  status: "completed" | "partial" | "failed";
}
