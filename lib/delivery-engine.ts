/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RIFQ CENTRALIZED DELIVERY ENGINE (محرك حساب وتسعير أسطول مؤسسة رفق المركزي)
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all delivery calculations, distance estimations,
 * city pricing rules, snapshot generation, and audit logging.
 * ISOMORPHIC & UNIVERSAL (Safe for Client, Server, Edge, and APIs).
 */

export interface DeliveryPricingRule {
  id: string;
  city: string; // اسم المدينة (أو "كافة المدن الأخرى (افتراضي)")
  base_fee: number; // السعر الأساسي للتوصيل داخل المدينة (قبل الضريبة)
  base_distance_km: number; // المسافة الأساسية المشمولة بالسعر الأساسي (كم)
  extra_fee_per_km: number; // تكلفة الكيلومتر الإضافي بعد المسافة الأساسية
  intercity_fee: number; // رسوم الشحن الأساسية بين المدن المختلفة
  min_fee: number; // الحد الأدنى لرسوم التوصيل
  estimated_delivery_hours: number; // زمن التوصيل المتوقع بالساعات (مثال: 24)
  is_active: boolean; // حالة تفعيل القاعدة
  is_default: boolean; // هل هي القاعدة الافتراضية
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface DeliveryCalculationRequest {
  source_city?: string | null;
  source_coords?: GeoCoordinate | null;
  destination_city?: string | null;
  destination_coords?: GeoCoordinate | null;
  destination_location_text?: string | null;
  custom_tax_rate?: number; // افتراضياً 15%
}

export type CalculationType =
  | "intra_city_base" // داخل المدينة ضمن المسافة الأساسية
  | "intra_city_distance" // داخل المدينة مع كيلومترات إضافية
  | "inter_city" // شحن بين مدينتين مختلفتين
  | "fallback_city_base" // اعتماد السعر الأساسي للمدينة لعدم توفر إحداثيات
  | "fallback_default_rule" // استخدام القاعدة الافتراضية العامة
  | "free_delivery_promotion"; // توصيل مجاني ترويجي

export interface DeliveryCalculationResult {
  rule_id: string;
  rule_city: string;
  is_intra_city: boolean;
  distance_km: number | null; // المسافة الجوية بالكيلومتر
  base_distance_km: number;
  extra_distance_km: number;
  base_fee: number;
  extra_km_fee: number;
  intercity_fee: number;
  delivery_fee_net: number; // الرسوم قبل الضريبة
  vat_rate: number; // نسبة الضريبة (مثال: 15%)
  delivery_vat: number; // مبلغ الضريبة
  delivery_fee_total: number; // الإجمالي شامل الضريبة
  estimated_days: number;
  estimated_hours: number;
  calculation_type: CalculationType;
  calculation_description: string;
  is_fallback: boolean;
  fallback_reason?: string;
}

export interface DeliverySnapshot {
  snapshot_version: "1.0";
  rule_id: string;
  rule_city: string;
  source_city: string;
  destination_city: string;
  source_coords: GeoCoordinate | null;
  destination_coords: GeoCoordinate | null;
  is_intra_city: boolean;
  distance_km: number | null;
  base_distance_km: number;
  extra_distance_km: number;
  base_fee: number;
  extra_fee_per_km: number;
  extra_km_fee: number;
  intercity_fee: number;
  delivery_fee_net: number;
  vat_rate: number;
  delivery_vat: number;
  delivery_total: number;
  estimated_days: number;
  estimated_hours: number;
  calculation_type: CalculationType;
  calculation_description: string;
  provider_name: "أسطول مؤسسة رفق المعتمد";
  calculated_at: string;
}

export interface DeliveryAuditLog {
  id: string;
  rule_id?: string;
  city: string;
  user_id: string;
  user_name?: string;
  action_type: "create" | "update" | "delete" | "toggle_status" | "set_default";
  old_values: Partial<DeliveryPricingRule> | null;
  new_values: Partial<DeliveryPricingRule> | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DEFAULT RULES (القواعد الافتراضية المعتمدة لمدن المملكة)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_DELIVERY_RULES: DeliveryPricingRule[] = [
  {
    id: "rule-riyadh",
    city: "الرياض",
    base_fee: 25,
    base_distance_km: 15,
    extra_fee_per_km: 1.5,
    intercity_fee: 45,
    min_fee: 25,
    estimated_delivery_hours: 24,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-jeddah",
    city: "جدة",
    base_fee: 25,
    base_distance_km: 15,
    extra_fee_per_km: 1.5,
    intercity_fee: 45,
    min_fee: 25,
    estimated_delivery_hours: 24,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-dammam",
    city: "الدمام",
    base_fee: 25,
    base_distance_km: 15,
    extra_fee_per_km: 1.5,
    intercity_fee: 45,
    min_fee: 25,
    estimated_delivery_hours: 24,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-khobar",
    city: "الخبر",
    base_fee: 25,
    base_distance_km: 15,
    extra_fee_per_km: 1.5,
    intercity_fee: 45,
    min_fee: 25,
    estimated_delivery_hours: 24,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-makkah",
    city: "مكة المكرمة",
    base_fee: 30,
    base_distance_km: 15,
    extra_fee_per_km: 1.5,
    intercity_fee: 45,
    min_fee: 30,
    estimated_delivery_hours: 24,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-madinah",
    city: "المدينة المنورة",
    base_fee: 30,
    base_distance_km: 15,
    extra_fee_per_km: 1.5,
    intercity_fee: 45,
    min_fee: 30,
    estimated_delivery_hours: 24,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-qassim",
    city: "القصيم",
    base_fee: 25,
    base_distance_km: 15,
    extra_fee_per_km: 1.5,
    intercity_fee: 45,
    min_fee: 25,
    estimated_delivery_hours: 24,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-tabuk",
    city: "تبوك",
    base_fee: 30,
    base_distance_km: 15,
    extra_fee_per_km: 1.75,
    intercity_fee: 55,
    min_fee: 30,
    estimated_delivery_hours: 48,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-abha",
    city: "أبها",
    base_fee: 30,
    base_distance_km: 15,
    extra_fee_per_km: 1.75,
    intercity_fee: 55,
    min_fee: 30,
    estimated_delivery_hours: 48,
    is_active: true,
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rule-default",
    city: "كافة المدن الأخرى (افتراضي)",
    base_fee: 35,
    base_distance_km: 15,
    extra_fee_per_km: 2.0,
    intercity_fee: 55,
    min_fee: 35,
    estimated_delivery_hours: 48,
    is_active: true,
    is_default: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getClientDeliveryRules(): DeliveryPricingRule[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("rfq_delivery_rules");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_DELIVERY_RULES;
}

export function saveClientDeliveryRules(rules: DeliveryPricingRule[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("rfq_delivery_rules", JSON.stringify(rules));
      window.dispatchEvent(new Event("delivery_rules_changed"));
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MATHEMATICAL & GEOGRAPHICAL DISTANCE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates straight-line (great-circle) distance between two GPS points using Haversine formula.
 * @returns distance in Kilometers (rounded to 2 decimal places)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number" ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Earth's radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 100) / 100;
}

/**
 * Normalizes Arabic city names for robust, case-and-accent-insensitive matching.
 */
export function normalizeCityName(cityName?: string | null): string {
  if (!cityName) return "";
  let clean = cityName
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, ""); // remove harakat

  // Common aliases
  if (clean.includes("رياض") || clean.includes("riyadh")) return "الرياض";
  if (clean.includes("جده") || clean.includes("jeddah")) return "جدة";
  if (clean.includes("دمام") || clean.includes("dammam")) return "الدمام";
  if (clean.includes("خبر") || clean.includes("khobar")) return "الخبر";
  if (clean.includes("مكه") || clean.includes("makkah") || clean.includes("mecca")) return "مكة المكرمة";
  if (clean.includes("مدينه") || clean.includes("madinah") || clean.includes("medina")) return "المدينة المنورة";
  if (clean.includes("قصيم") || clean.includes("بريده") || clean.includes("عنيزه") || clean.includes("qassim")) return "القصيم";
  if (clean.includes("تبوك") || clean.includes("tabuk")) return "تبوك";
  if (clean.includes("ابها") || clean.includes("خميس مشيط") || clean.includes("abha")) return "أبها";
  if (clean.includes("حائل") || clean.includes("hail")) return "حائل";
  if (clean.includes("طائف") || clean.includes("taif")) return "الطائف";
  if (clean.includes("جبيل") || clean.includes("jubail")) return "الجبيل";
  if (clean.includes("احساء") || clean.includes("هفوف") || clean.includes("ahsa")) return "الأحساء";
  if (clean.includes("جازان") || clean.includes("jizan")) return "جازان";
  if (clean.includes("نجران") || clean.includes("najran")) return "نجران";
  if (clean.includes("ينبع") || clean.includes("yanbu")) return "ينبع";

  return cityName.trim();
}

/**
 * Finds the most suitable active pricing rule for a given city.
 */
export function findMatchingPricingRule(
  targetCity: string | null | undefined,
  rules: DeliveryPricingRule[]
): DeliveryPricingRule {
  const normTarget = normalizeCityName(targetCity);
  const activeRules = rules.filter((r) => r.is_active);

  if (normTarget) {
    const directMatch = activeRules.find((r) => normalizeCityName(r.city) === normTarget);
    if (directMatch) return directMatch;
  }

  // Fallback to active default rule
  const defaultRule = activeRules.find((r) => r.is_default);
  if (defaultRule) return defaultRule;

  // Ultimate fallback if all else disabled
  return (
    rules.find((r) => r.is_default) ||
    rules[0] ||
    DEFAULT_DELIVERY_RULES[DEFAULT_DELIVERY_RULES.length - 1]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL DELIVERY PRICING CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates delivery costs, distance fees, VAT, and estimated delivery timeframe.
 * Centralized, deterministic, and regression-safe.
 */
export function calculateDeliveryCost(
  req: DeliveryCalculationRequest,
  customRules?: DeliveryPricingRule[]
): DeliveryCalculationResult {
  const rules = customRules && customRules.length > 0 ? customRules : getClientDeliveryRules();
  const vatRate = typeof req.custom_tax_rate === "number" ? req.custom_tax_rate : 15;

  const srcCityNorm = normalizeCityName(req.source_city || "الرياض");
  const destCityNorm = normalizeCityName(req.destination_city || req.source_city || "الرياض");

  // Determine matching rule based on destination city (or source city fallback)
  const rule = findMatchingPricingRule(destCityNorm || srcCityNorm, rules);

  // Check if Intra-city or Inter-city
  const isIntraCity = Boolean(
    (srcCityNorm && destCityNorm && srcCityNorm === destCityNorm) ||
      (!srcCityNorm && destCityNorm) ||
      (srcCityNorm && !destCityNorm)
  );

  const hasCoords = Boolean(
    req.source_coords &&
      req.destination_coords &&
      typeof req.source_coords.latitude === "number" &&
      typeof req.source_coords.longitude === "number" &&
      typeof req.destination_coords.latitude === "number" &&
      typeof req.destination_coords.longitude === "number" &&
      req.source_coords.latitude !== 0 &&
      req.destination_coords.latitude !== 0
  );

  let straightLineDistanceKm: number | null = null;
  if (hasCoords && req.source_coords && req.destination_coords) {
    straightLineDistanceKm = calculateHaversineDistanceKm(
      req.source_coords.latitude,
      req.source_coords.longitude,
      req.destination_coords.latitude,
      req.destination_coords.longitude
    );
  }

  let baseFee = Number(rule.base_fee) || 25;
  let baseDistanceKm = Number(rule.base_distance_km) || 15;
  let extraFeePerKm = Number(rule.extra_fee_per_km) || 1.5;
  let intercityFee = Number(rule.intercity_fee) || 45;
  let minFee = Number(rule.min_fee) || baseFee;

  let extraDistanceKm = 0;
  let extraKmFee = 0;
  let deliveryFeeNet = baseFee;
  let calculationType: CalculationType = "intra_city_base";
  let calculationDescription = `توصيل داخلي معتمد لمدينة ${rule.city} بالسعر الأساسي`;
  let isFallback = false;
  let fallbackReason: string | undefined = undefined;

  if (isIntraCity) {
    if (straightLineDistanceKm !== null && straightLineDistanceKm > 0) {
      if (straightLineDistanceKm > baseDistanceKm) {
        extraDistanceKm = Math.round((straightLineDistanceKm - baseDistanceKm) * 100) / 100;
        extraKmFee = Math.round(extraDistanceKm * extraFeePerKm * 100) / 100;
        deliveryFeeNet = baseFee + extraKmFee;
        calculationType = "intra_city_distance";
        calculationDescription = `توصيل داخلي (${rule.city}) - المسافة الجوية ${straightLineDistanceKm} كم (أساسي: ${baseDistanceKm} كم + إضافي: ${extraDistanceKm} كم × ${extraFeePerKm} ر.س)`;
      } else {
        calculationType = "intra_city_base";
        calculationDescription = `توصيل داخلي (${rule.city}) - المسافة الجوية ${straightLineDistanceKm} كم (مشمولة بالكامل ضمن المسافة الأساسية ${baseDistanceKm} كم)`;
      }
    } else {
      // Missing GPS coordinates -> fallback to city base rate
      calculationType = "fallback_city_base";
      isFallback = true;
      fallbackReason = "عدم توفر إحداثيات GPS دقيقة، تم تطبيق السعر الأساسي للمدينة";
      calculationDescription = `توصيل معتمد لمدينة ${rule.city} بالسعر الأساسي القياسي`;
    }
  } else {
    // Inter-city delivery
    deliveryFeeNet = intercityFee;
    calculationType = "inter_city";
    calculationDescription = `شحن وتوصيل بين المدن (من ${req.source_city || "المدينة المصدر"} إلى ${req.destination_city || rule.city})`;
  }

  // Ensure minimum fee threshold
  if (deliveryFeeNet < minFee) {
    deliveryFeeNet = minFee;
  }

  deliveryFeeNet = Math.max(0, Math.round(deliveryFeeNet * 100) / 100);
  const deliveryVat = Math.round(((deliveryFeeNet * vatRate) / 100) * 100) / 100;
  const deliveryTotal = Math.round((deliveryFeeNet + deliveryVat) * 100) / 100;

  const estimatedHours = rule.estimated_delivery_hours || (isIntraCity ? 24 : 48);
  const estimatedDays = Math.max(1, Math.ceil(estimatedHours / 24));

  return {
    rule_id: rule.id,
    rule_city: rule.city,
    is_intra_city: isIntraCity,
    distance_km: straightLineDistanceKm,
    base_distance_km: baseDistanceKm,
    extra_distance_km: extraDistanceKm,
    base_fee: baseFee,
    extra_km_fee: extraKmFee,
    intercity_fee: isIntraCity ? 0 : intercityFee,
    delivery_fee_net: deliveryFeeNet,
    vat_rate: vatRate,
    delivery_vat: deliveryVat,
    delivery_fee_total: deliveryTotal,
    estimated_days: estimatedDays,
    estimated_hours: estimatedHours,
    calculation_type: calculationType,
    calculation_description: calculationDescription,
    is_fallback: isFallback,
    fallback_reason: fallbackReason,
  };
}

/**
 * Creates an immutable, permanently frozen snapshot of delivery parameters
 * to be saved with the quote / deal / invoice.
 */
export function createDeliverySnapshot(
  calc: DeliveryCalculationResult,
  req: DeliveryCalculationRequest
): DeliverySnapshot {
  return {
    snapshot_version: "1.0",
    rule_id: calc.rule_id,
    rule_city: calc.rule_city,
    source_city: req.source_city || "الرياض",
    destination_city: req.destination_city || req.source_city || "الرياض",
    source_coords: req.source_coords || null,
    destination_coords: req.destination_coords || null,
    is_intra_city: calc.is_intra_city,
    distance_km: calc.distance_km,
    base_distance_km: calc.base_distance_km,
    extra_distance_km: calc.extra_distance_km,
    base_fee: calc.base_fee,
    extra_fee_per_km: calc.extra_distance_km > 0 ? calc.extra_km_fee / calc.extra_distance_km : 1.5,
    extra_km_fee: calc.extra_km_fee,
    intercity_fee: calc.intercity_fee,
    delivery_fee_net: calc.delivery_fee_net,
    vat_rate: calc.vat_rate,
    delivery_vat: calc.delivery_vat,
    delivery_total: calc.delivery_fee_total,
    estimated_days: calc.estimated_days,
    estimated_hours: calc.estimated_hours,
    calculation_type: calc.calculation_type,
    calculation_description: calc.calculation_description,
    provider_name: "أسطول مؤسسة رفق المعتمد",
    calculated_at: new Date().toISOString(),
  };
}
