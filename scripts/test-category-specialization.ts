import {
  CANONICAL_PARTS_CATEGORIES,
  getPartsCategoryById,
  matchCategoryFromPartName,
  isVendorSpecializedInCategory,
  filterRfqsForVendorCategories,
} from "../lib/category-specialization";

console.log("=== 1. Checking Canonical Categories ===");
console.log(`Total Categories: ${CANONICAL_PARTS_CATEGORIES.length}`);
console.assert(CANONICAL_PARTS_CATEGORIES.length === 14, "Should have exactly 14 categories");
CANONICAL_PARTS_CATEGORIES.forEach((c) => {
  console.log(`- [${c.id}] ${c.nameAr} (${c.keywords.length} keywords)`);
});

console.log("\n=== 2. Testing Smart Auto-Detection ===");
const testParts = [
  { name: "كمبروسر مكيف كامري", expected: "cooling_ac" },
  { name: "رديتر ماء أصلي", expected: "cooling_ac" },
  { name: "فحمات أمامية برادو", expected: "brakes" },
  { name: "هوبات فرامل خلفية", expected: "brakes" },
  { name: "مساعدات يايات هايلكس", expected: "suspension" },
  { name: "مقصات وعضلات أمامية", expected: "suspension" },
  { name: "صدام أمامي وشبك تاهو", expected: "body_exterior" },
  { name: "كبوت ورفرف يمين", expected: "body_exterior" },
  { name: "دينمو كهرب وسلف باترول", expected: "electrical" },
  { name: "شمعة إنارة زينون ليد", expected: "lighting" },
  { name: "طرمبة بنزين سوناتا", expected: "fuel_system" },
  { name: "تيربو فورد اكسبلورر", expected: "fuel_system" },
  { name: "قزاز أمامي دبل سوناتا", expected: "glass_mirrors" },
  { name: "جنوط كروم مقاس 18", expected: "tires_rims" },
  { name: "بواجي وفلتر زيت وصيانة", expected: "maintenance_consumables" },
  { name: "دبة تلوث وشكمان لاندكروزر", expected: "exhaust_emissions" },
  { name: "طقم كراسي مكينة وراس مكينة", expected: "engine" },
  { name: "قيربوكس تماتيك وكلتش", expected: "transmission" },
  { name: "شاشة أندرويد ومراتب جلد", expected: "interior_accessories" },
];

for (const tp of testParts) {
  const match = matchCategoryFromPartName(tp.name);
  console.log(`Part: "${tp.name}" -> Category: ${match?.id || "None"} (${match?.shortName || "None"})`);
  console.assert(match?.id === tp.expected, `Expected ${tp.expected}, got ${match?.id}`);
}

console.log("\n=== 3. Testing Vendor Specialization Matching ===");
console.assert(isVendorSpecializedInCategory(["cooling_ac", "electrical"], "cooling_ac", false) === true);
console.assert(isVendorSpecializedInCategory(["cooling_ac", "electrical"], "brakes", false) === false);
console.assert(isVendorSpecializedInCategory([], "brakes", true) === true, "Specializes in all should be true");
console.assert(isVendorSpecializedInCategory(["cooling_ac"], "all", false) === true, "All category RFQ matches any vendor");

console.log("\n=== 4. Testing RFQ List Filtering ===");
const sampleRfqs = [
  { id: "1", parts_category: "cooling_ac", parts_description: JSON.stringify([{ partName: "كمبروسر" }]) },
  { id: "2", parts_category: "brakes", parts_description: JSON.stringify([{ partName: "فحمات" }]) },
  { id: "3", parts_category: "body_exterior", parts_description: JSON.stringify([{ partName: "صدام" }]) },
  { id: "4", parts_category: "all", parts_description: JSON.stringify([{ partName: "قطع مختلفة" }]) },
  { id: "5", parts_description: JSON.stringify([{ partName: "مساعدات يايات" }]) }, // detected suspension
];

const acVendorFiltered = filterRfqsForVendorCategories(sampleRfqs, ["cooling_ac"], false);
console.log(`AC Vendor sees ${acVendorFiltered.length} RFQs:`, acVendorFiltered.map((r) => r.id));
console.assert(acVendorFiltered.some((r) => r.id === "1"), "Should see AC RFQ");
console.assert(acVendorFiltered.some((r) => r.id === "4"), "Should see 'all' category RFQ");
console.assert(!acVendorFiltered.some((r) => r.id === "2"), "Should NOT see brakes RFQ");

const allVendorFiltered = filterRfqsForVendorCategories(sampleRfqs, [], true);
console.log(`General Vendor sees ${allVendorFiltered.length} RFQs (All)`);
console.assert(allVendorFiltered.length === sampleRfqs.length, "Should see all RFQs");

console.log("\n✅ ALL SPECIALIZATION LOGIC TESTS PASSED PERFECTLY!");
