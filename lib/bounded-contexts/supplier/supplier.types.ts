/**
 * Supplier & Radar Matching Engine Bounded Context Types
 * Composable Rule Engine & Match Criteria DTOs
 */

export interface VendorProfileDTO {
  vendor_id: string;
  company_name: string;
  city: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  rating: number; // 1.0 to 5.0
  win_rate: number; // percentage e.g. 85
  avg_response_time_minutes: number;
  brands_specialized: string[]; // e.g. ["تويوتا", "فورد", "هيونداي"]
  parts_categories: string[]; // e.g. ["فرامل", "محرك", "هيكل"]
  is_oem: boolean;
  is_aftermarket: boolean;
  accepts_pickup?: boolean;
  is_active?: boolean;
  business_hours?: any;
}

export interface MapVendorDTO {
  id: string;
  vendor_id?: string;
  branch_id?: string;
  branch_name?: string;
  is_main_branch?: boolean;
  contact_name?: string;
  full_name: string;
  company_name: string;
  city: string;
  district?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  rating: number;
  specialized_brands: string[];
  specializes_in_all_brands: boolean;
  accepts_pickup: boolean;
  business_hours: any;
  operational_status: {
    status: "open" | "closed" | "opening_soon" | "closing_soon";
    labelAr: string;
    badgeClass: string;
    nextChangeAr: string;
    todayHoursAr: string;
  };
  approx_distance_km?: number | null;
  approx_distance_label?: string | null;
}

export interface VendorPickupSnapshotDTO {
  vendor_id: string;
  vendor_name: string;
  pickup_address: string;
  city: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  business_hours?: any;
  snapshot_created_at: string;
}

export interface RFQMatchRequestDTO {
  rfq_id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  city: string;
  parts_description: string;
  category?: string;
  created_at: string;
}

export interface MatchReason {
  rule_id: string;
  label: string;
  score_gained: number;
  max_score: number;
}

export interface MatchResultDTO {
  rfq_id: string;
  vendor_id: string;
  vendor_name: string;
  total_score: number; // 0 to 100
  match_grade: "ممتاز" | "جيد جداً" | "مقبول";
  reasons: MatchReason[];
  created_at: string;
}

export interface IRadarRule {
  rule_id: string;
  name: string;
  max_weight: number;
  evaluate(rfq: RFQMatchRequestDTO, vendor: VendorProfileDTO): Promise<MatchReason>;
}

