import {
  isMakeMatchingSpecialization,
  resolveCanonicalBrandId,
  filterRfqsForVendor,
  CANONICAL_BRANDS,
} from "../lib/brand-specialization";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("🚀 Starting Comprehensive Brand Specialization Test Suite...\n");

// Test 1: Canonical Resolution & Aliases
console.log("--- 1. Canonical Resolution & Aliases Tests ---");
assert(resolveCanonicalBrandId("تويوتا") === "toyota", "Arabic 'تويوتا' -> 'toyota'");
assert(resolveCanonicalBrandId("Toyota") === "toyota", "English 'Toyota' -> 'toyota'");
assert(resolveCanonicalBrandId("جي إم سي") === "gmc", "Arabic 'جي إم سي' -> 'gmc'");
assert(resolveCanonicalBrandId("جمس") === "gmc", "Arabic alias 'جمس' -> 'gmc'");
assert(resolveCanonicalBrandId("GMC") === "gmc", "English 'GMC' -> 'gmc'");
assert(resolveCanonicalBrandId("مرسيدس بنز") === "mercedes_benz", "Arabic 'مرسيدس بنز' -> 'mercedes_benz'");
assert(resolveCanonicalBrandId("Mercedes") === "mercedes_benz", "English 'Mercedes' -> 'mercedes_benz'");
assert(resolveCanonicalBrandId("شفروليه") === "chevrolet", "Arabic 'شفروليه' -> 'chevrolet'");
assert(resolveCanonicalBrandId("Chevrolet") === "chevrolet", "English 'Chevrolet' -> 'chevrolet'");
assert(resolveCanonicalBrandId("فورد") === "ford", "Arabic 'فورد' -> 'ford'");
assert(resolveCanonicalBrandId("Ford") === "ford", "English 'Ford' -> 'ford'");

// Test 2: Vendor Specialized in Toyota sees Toyota ONLY
console.log("\n--- 2. Toyota Vendor Access Tests ---");
const toyotaVendor = ["toyota"];
assert(isMakeMatchingSpecialization("تويوتا", toyotaVendor), "Toyota vendor CAN see Arabic 'تويوتا'");
assert(isMakeMatchingSpecialization("Toyota", toyotaVendor), "Toyota vendor CAN see English 'Toyota'");
assert(isMakeMatchingSpecialization("كامري", toyotaVendor) === false, "Toyota vendor cannot match ambiguous text unless mapped");

// Test 3: Vendor Specialized in Toyota does NOT see Ford or Nissan
console.log("\n--- 3. Exclusion Tests ---");
assert(!isMakeMatchingSpecialization("فورد", toyotaVendor), "Toyota vendor CANNOT see 'فورد'");
assert(!isMakeMatchingSpecialization("Ford", toyotaVendor), "Toyota vendor CANNOT see 'Ford'");
assert(!isMakeMatchingSpecialization("نيسان", toyotaVendor), "Toyota vendor CANNOT see 'نيسان'");
assert(!isMakeMatchingSpecialization("Nissan", toyotaVendor), "Toyota vendor CANNOT see 'Nissan'");
assert(!isMakeMatchingSpecialization("جي إم سي", toyotaVendor), "Toyota vendor CANNOT see 'جي إم سي'");

// Test 4: Vendor with 'ALL' sees all makes
console.log("\n--- 4. 'ALL' Specialization Tests ---");
const allVendor = ["ALL"];
assert(isMakeMatchingSpecialization("تويوتا", allVendor), "ALL vendor can see Toyota");
assert(isMakeMatchingSpecialization("فورد", allVendor), "ALL vendor can see Ford");
assert(isMakeMatchingSpecialization("مرسيدس", allVendor), "ALL vendor can see Mercedes");
assert(isMakeMatchingSpecialization("جيلي", allVendor), "ALL vendor can see Geely");
assert(isMakeMatchingSpecialization("هونشي", [], true), "Vendor with specializesInAll=true can see Hongqi");

// Test 5: Vendor without specializations
console.log("\n--- 5. Empty Specialization Tests ---");
const emptyVendor: string[] = [];
assert(!isMakeMatchingSpecialization("تويوتا", emptyVendor), "Empty vendor CANNOT see Toyota");
assert(!isMakeMatchingSpecialization("فورد", emptyVendor), "Empty vendor CANNOT see Ford");
assert(!isMakeMatchingSpecialization("نيسان", null), "Null vendor CANNOT see Nissan");

// Test 6: Filter List of RFQs Server-Side
console.log("\n--- 6. Filter RFQ List Server-Side Tests ---");
const sampleRfqs = [
  { id: "1", car_make: "تويوتا", model: "كامري" },
  { id: "2", car_make: "فورد", model: "توروس" },
  { id: "3", car_make: "Toyota", model: "Land Cruiser" },
  { id: "4", car_make: "نيسان", model: "باترول" },
  { id: "5", car_make: "GMC", model: "Yukon" },
];

const toyotaOnlyResults = filterRfqsForVendor(sampleRfqs, ["toyota"]);
assert(toyotaOnlyResults.length === 2, `Toyota filter returned exactly 2 items (got ${toyotaOnlyResults.length})`);
assert(toyotaOnlyResults.every((r) => r.car_make.toLowerCase().includes("toyota") || r.car_make === "تويوتا"), "All returned items are Toyota");

const fordOnlyResults = filterRfqsForVendor(sampleRfqs, ["ford"]);
assert(fordOnlyResults.length === 1 && fordOnlyResults[0].id === "2", "Ford filter returned only RFQ #2");

const multiBrandResults = filterRfqsForVendor(sampleRfqs, ["toyota", "gmc"]);
assert(multiBrandResults.length === 3, `Toyota + GMC filter returned 3 items (got ${multiBrandResults.length})`);

const allBrandResults = filterRfqsForVendor(sampleRfqs, ["ALL"]);
assert(allBrandResults.length === 5, `ALL filter returned all 5 items (got ${allBrandResults.length})`);

const emptyResults = filterRfqsForVendor(sampleRfqs, []);
assert(emptyResults.length === 0, `Empty vendor filter returned 0 items (got ${emptyResults.length})`);

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
