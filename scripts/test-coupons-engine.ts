import { validateCoupon, INITIAL_PROMO_CODES, PromoCode } from "../lib/coupons";

async function runTests() {
  console.log("🚀 Running Promo Codes Engine Tests...");

  // Test 1: Delivery Fee Coupon (FREESHIP -> 100% off delivery)
  const res1 = validateCoupon("FREESHIP", 500, 45, INITIAL_PROMO_CODES);
  console.log("Test 1 (FREESHIP - 100% delivery):", res1);
  if (!res1.valid || res1.coupon?.target !== "delivery" || res1.discountAmount !== 45) {
    throw new Error("Test 1 Failed: FREESHIP should discount 100% of delivery fee (45 SAR)");
  }

  // Test 2: Delivery Fee Coupon (SHIP50 -> 50% off delivery)
  const res2 = validateCoupon("SHIP50", 500, 40, INITIAL_PROMO_CODES);
  console.log("Test 2 (SHIP50 - 50% delivery):", res2);
  if (!res2.valid || res2.coupon?.target !== "delivery" || res2.discountAmount !== 20) {
    throw new Error("Test 2 Failed: SHIP50 should discount 50% of delivery fee (20 SAR)");
  }

  // Test 3: Subtotal / Invoice Coupon (RIFQ10 -> 10% off parts subtotal)
  const res3 = validateCoupon("RIFQ10", 600, 45, INITIAL_PROMO_CODES);
  console.log("Test 3 (RIFQ10 - 10% subtotal):", res3);
  if (!res3.valid || res3.coupon?.target !== "subtotal" || res3.discountAmount !== 60) {
    throw new Error("Test 3 Failed: RIFQ10 should discount 10% of parts subtotal (60 SAR)");
  }

  // Test 4: Fixed Amount Coupon (SAVE50 -> 50 SAR off subtotal)
  const res4 = validateCoupon("SAVE50", 400, 45, INITIAL_PROMO_CODES);
  console.log("Test 4 (SAVE50 - 50 SAR fixed):", res4);
  if (!res4.valid || res4.coupon?.target !== "subtotal" || res4.discountAmount !== 50) {
    throw new Error("Test 4 Failed: SAVE50 should discount exactly 50 SAR");
  }

  // Test 5: Custom Dynamic Coupon (created from Admin)
  const customAdminCoupon: PromoCode = {
    id: "promo-custom-test",
    code: "RAMADAN_FREE",
    target: "delivery",
    type: "percent",
    value: 100,
    label: "توصيل رمضاني مجاني",
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  };

  const res5 = validateCoupon("RAMADAN_FREE", 300, 50, [customAdminCoupon]);
  console.log("Test 5 (Custom Admin Delivery Coupon):", res5);
  if (!res5.valid || res5.coupon?.target !== "delivery" || res5.discountAmount !== 50) {
    throw new Error("Test 5 Failed: Custom Admin Delivery Coupon should discount 50 SAR delivery");
  }

  console.log("✅ All Promo Code Engine Tests PASSED successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
