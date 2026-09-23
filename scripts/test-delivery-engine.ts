import {
  calculateDeliveryCost,
  createDeliverySnapshot,
  calculateHaversineDistanceKm,
  DEFAULT_DELIVERY_RULES,
  DeliveryPricingRule,
} from "../lib/delivery-engine";

console.log("=================================================");
console.log("🚚 RIFQ CENTRALIZED DELIVERY ENGINE TEST SUITE");
console.log("=================================================\n");

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   Details: ${detail}`);
  }
}

// 1. Haversine Distance Test
const riyadhCenter = { latitude: 24.7136, longitude: 46.6753 };
const riyadhNorth = { latitude: 24.85, longitude: 46.72 };
const dist = calculateHaversineDistanceKm(
  riyadhCenter.latitude,
  riyadhCenter.longitude,
  riyadhNorth.latitude,
  riyadhNorth.longitude
);
assert(dist > 15 && dist < 20, "1. Haversine straight-line distance calculation", `Calculated: ${dist} km`);

// 2. Intra-city within base distance (< 15 km)
const calcWithinBase = calculateDeliveryCost({
  source_city: "الرياض",
  destination_city: "الرياض",
  source_coords: { latitude: 24.7136, longitude: 46.6753 },
  destination_coords: { latitude: 24.75, longitude: 46.7 }, // ~5 km
});
assert(
  calcWithinBase.delivery_fee_net === 25 && calcWithinBase.delivery_vat === 3.75 && calcWithinBase.delivery_fee_total === 28.75,
  "2. Intra-city within base distance (25 SAR net, 28.75 total)",
  `Got: Net=${calcWithinBase.delivery_fee_net}, Total=${calcWithinBase.delivery_fee_total}`
);

// 3. Intra-city exceeding base distance (e.g. ~25 km in Riyadh -> 25 + (10 * 1.5) = 40 SAR)
const calcExceedingBase = calculateDeliveryCost({
  source_city: "الرياض",
  destination_city: "الرياض",
  source_coords: { latitude: 24.5, longitude: 46.5 },
  destination_coords: { latitude: 24.75, longitude: 46.7 }, // ~34.8 km
});
assert(
  calcExceedingBase.extra_km_fee > 0 && calcExceedingBase.delivery_fee_net > 25,
  "3. Intra-city exceeding base distance calculates extra KM fee",
  `Distance=${calcExceedingBase.distance_km} km, ExtraKM=${calcExceedingBase.extra_distance_km} km, NetFee=${calcExceedingBase.delivery_fee_net}`
);

// 4. Inter-city delivery (Jeddah to Riyadh -> 45 SAR)
const calcIntercity = calculateDeliveryCost({
  source_city: "جدة",
  destination_city: "الرياض",
});
assert(
  calcIntercity.is_intra_city === false && calcIntercity.delivery_fee_net === 45 && calcIntercity.calculation_type === "inter_city",
  "4. Inter-city shipping rate applied (45 SAR net)",
  `Got: ${calcIntercity.delivery_fee_net} SAR, Type: ${calcIntercity.calculation_type}`
);

// 5. Missing coordinates fallback to city base rate
const calcMissingCoords = calculateDeliveryCost({
  source_city: "الرياض",
  destination_city: "الرياض",
  source_coords: null,
  destination_coords: null,
});
assert(
  calcMissingCoords.is_fallback === true && calcMissingCoords.delivery_fee_net === 25,
  "5. Missing GPS coordinates fallback to city base fee safely",
  `Fallback: ${calcMissingCoords.is_fallback}, NetFee: ${calcMissingCoords.delivery_fee_net}`
);

// 6. Unknown city fallback to default rule
const calcUnknownCity = calculateDeliveryCost({
  source_city: "مدينة_غير_معروفة",
  destination_city: "قرية_نائية",
});
assert(
  calcUnknownCity.rule_city === "كافة المدن الأخرى (افتراضي)" && calcUnknownCity.delivery_fee_net >= 35,
  "6. Unknown city safely uses default rule",
  `Matched rule: ${calcUnknownCity.rule_city}, Fee: ${calcUnknownCity.delivery_fee_net}`
);

// 7. Disabled rule fallback
const customRules: DeliveryPricingRule[] = DEFAULT_DELIVERY_RULES.map((r) =>
  r.city === "الرياض" ? { ...r, is_active: false } : r
);
const calcDisabled = calculateDeliveryCost(
  { source_city: "الرياض", destination_city: "الرياض" },
  customRules
);
assert(
  calcDisabled.rule_id !== "rule-riyadh",
  "7. Disabled city rule safely ignored and falls back to default active rule"
);

// 8. Immutable Snapshot generation test
const snapshot = createDeliverySnapshot(calcWithinBase, {
  source_city: "الرياض",
  destination_city: "الرياض",
});
assert(
  snapshot.snapshot_version === "1.0" &&
    snapshot.delivery_total === 28.75 &&
    snapshot.provider_name === "أسطول مؤسسة رفق المعتمد" &&
    Boolean(snapshot.calculated_at),
  "8. Immutable Snapshot generated with all required forensic attributes"
);

console.log(`\n=================================================`);
console.log(`🎯 Test Results: ${passed} / ${total} passed (${((passed / total) * 100).toFixed(0)}%)`);
console.log(`=================================================\n`);
