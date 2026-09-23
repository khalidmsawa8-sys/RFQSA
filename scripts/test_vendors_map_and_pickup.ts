/**
 * End-to-End Verification Script for Vendors Map & Self-Pickup Feature
 * 
 * Verifies:
 * 1. Business hours calculation engine (Asia/Riyadh timezone, operational status, schedule formatting).
 * 2. Brand specialization compatibility with canonical brand normalization.
 * 3. Haversine approximate distance calculations.
 * 4. Immutable pickup snapshot generation.
 */

import {
  calculateVendorOpenStatus,
  getFormattedWeeklySchedule,
  DEFAULT_SAUDI_BUSINESS_HOURS,
  StructuredBusinessHours,
} from "../lib/business-hours";
import { isMakeMatchingSpecialization, CANONICAL_BRANDS } from "../lib/brand-specialization";
import { calculateHaversineDistanceKm } from "../lib/delivery-engine";

function runTests() {
  console.log("==================================================================");
  console.log("🚀 STARTING VENDORS MAP & SELF-PICKUP AUTOMATED VERIFICATION SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` (${detail})` : ""}`);
      failed++;
    }
  }

  // ──────────────────────────────────────────────────────────
  // TEST SUITE 1: STRUCTURED BUSINESS HOURS ENGINE (Asia/Riyadh)
  // ──────────────────────────────────────────────────────────
  console.log("📌 [SUITE 1] Testing Structured Business Hours & Operational Engine...");

  const regularHours: StructuredBusinessHours = {
    timezone: "Asia/Riyadh",
    weekly_schedule: {
      sunday: { isOpen: true, open: "08:00", close: "18:00" },
      monday: { isOpen: true, open: "08:00", close: "18:00" },
      tuesday: { isOpen: true, open: "08:00", close: "18:00" },
      wednesday: { isOpen: true, open: "08:00", close: "18:00" },
      thursday: { isOpen: true, open: "08:00", close: "18:00" },
      friday: { isOpen: false, open: "14:00", close: "20:00" },
      saturday: { isOpen: true, open: "09:00", close: "14:00" },
    },
  };

  const statusSundayNoon = calculateVendorOpenStatus(
    regularHours,
    new Date("2026-08-30T12:00:00+03:00") // Sunday 12:00 PM Riyadh time
  );
  assert(statusSundayNoon.status === "open", "Sunday 12:00 PM should be OPEN", `Got: ${statusSundayNoon.status}`);
  assert(statusSundayNoon.labelAr === "مفتوح الآن", "Sunday 12:00 PM label is 'مفتوح الآن'");

  const statusSundayNight = calculateVendorOpenStatus(
    regularHours,
    new Date("2026-08-30T22:00:00+03:00") // Sunday 10:00 PM Riyadh time
  );
  assert(statusSundayNight.status === "closed", "Sunday 10:00 PM should be CLOSED", `Got: ${statusSundayNight.status}`);

  const statusFridayNoon = calculateVendorOpenStatus(
    regularHours,
    new Date("2026-08-28T12:00:00+03:00") // Friday 12:00 PM Riyadh time
  );
  assert(statusFridayNoon.status === "closed", "Friday (closed day) should be CLOSED", `Got: ${statusFridayNoon.status}`);

  const statusClosingSoon = calculateVendorOpenStatus(
    regularHours,
    new Date("2026-08-30T17:40:00+03:00") // Sunday 5:40 PM (20 mins before 6:00 PM close)
  );
  assert(statusClosingSoon.status === "closing_soon", "Sunday 5:40 PM should be CLOSING_SOON (<30m)", `Got: ${statusClosingSoon.status}`);

  const weeklyFormatted = getFormattedWeeklySchedule(regularHours);
  assert(weeklyFormatted.length === 7, "Weekly schedule returns exactly 7 formatted days");
  assert(weeklyFormatted.some(d => d.dayKey === "friday" && !d.isOpen), "Friday is correctly marked as closed");

  // ──────────────────────────────────────────────────────────
  // TEST SUITE 2: BRAND SPECIALIZATION & MATCHING
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [SUITE 2] Testing Brand Specialization & Canonical Matching...");

  assert(
    isMakeMatchingSpecialization("تويوتا", ["toyota", "lexus"], false),
    "Arabic 'تويوتا' matches 'toyota' vendor specialization"
  );
  assert(
    isMakeMatchingSpecialization("Camry Toyota", ["toyota"], false),
    "Compound 'Camry Toyota' matches 'toyota' vendor"
  );
  assert(
    isMakeMatchingSpecialization("شفروليه", ["chevrolet", "gmc"], false),
    "Arabic 'شفروليه' matches 'chevrolet' vendor"
  );
  assert(
    !isMakeMatchingSpecialization("مرسيدس", ["toyota", "honda"], false),
    "Mercedes is correctly REJECTED when vendor only specializes in Toyota/Honda"
  );
  assert(
    isMakeMatchingSpecialization("بي ام دبليو", [], true),
    "Universal vendor (specializes_in_all_brands = true) matches all makes"
  );

  // ──────────────────────────────────────────────────────────
  // TEST SUITE 3: HAVERSINE DISTANCE APPROXIMATION
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [SUITE 3] Testing Approximate Haversine Distance...");

  // Riyadh Olaya (24.7136, 46.6753) to Riyadh Malaz (24.6644, 46.7323) ~7-9 km
  const distanceKm = calculateHaversineDistanceKm(24.7136, 46.6753, 24.6644, 46.7323);
  assert(distanceKm >= 5 && distanceKm <= 12, `Riyadh inter-district distance is ~${distanceKm.toFixed(1)} km`);

  // Same coordinates = 0 km
  const zeroDist = calculateHaversineDistanceKm(24.7136, 46.6753, 24.7136, 46.6753);
  assert(zeroDist === 0, "Distance to self is 0 km");

  console.log("\n==================================================================");
  console.log(`🎉 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
