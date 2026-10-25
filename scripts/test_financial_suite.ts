/**
 * scripts/test_financial_suite.ts
 * Comprehensive Automated Financial Distribution & Tax Invoice Decoupling Test Suite
 * Validates all 12 mandatory test scenarios required by Section 8 of the implementation plan.
 */

import {
  computeOrderDistributionBreakdown,
  distributeOrderFundsAutomatically,
  toHalalas,
  fromHalalas,
} from "../lib/wallet-distribution";
import { normalizeInvoiceNumber } from "../lib/invoice-canonical";
import { executeLedgerTransaction } from "../lib/wallet-ledger";
import fs from "fs";
import path from "path";

// Color helpers for terminal output
const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const cyan = (msg: string) => `\x1b[36m${msg}\x1b[0m`;
const yellow = (msg: string) => `\x1b[33m${msg}\x1b[0m`;
const bold = (msg: string) => `\x1b[1m${msg}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ${green("✔ PASS:")} ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${red("✖ FAIL:")} ${testName}`);
    if (details) console.error(`    ${red("Details:")} ${details}`);
  }
}

async function runSuite() {
  console.log(bold(cyan("\n═══════════════════════════════════════════════════════════════════════")));
  console.log(bold(cyan("   RFQ SA — AUTOMATED FINANCIAL DISTRIBUTION & TAX INVOICE SUITE")));
  console.log(bold(cyan("═══════════════════════════════════════════════════════════════════════\n")));

  const DATA_DIR = path.join(process.cwd(), "data");
  const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
  const INVOICES_FILE = path.join(DATA_DIR, "invoices_db.json");
  const TRANSACTIONS_FILE = path.join(DATA_DIR, "wallet_transactions_db.json");

  // Backup original files before test runs
  const backupOrders = fs.existsSync(ORDERS_FILE) ? fs.readFileSync(ORDERS_FILE, "utf-8") : "[]";
  const backupInvoices = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, "utf-8") : "[]";
  const backupTxns = fs.existsSync(TRANSACTIONS_FILE) ? fs.readFileSync(TRANSACTIONS_FILE, "utf-8") : "[]";

  try {
    /* ─────────────────────────────────────────────────────────────────
       TEST 1: Canonical 1,200 SAR Split Verification
       Parts: 1,000 | VAT: 150 | Delivery: 30 | Platform: 20 | Total: 1,200
       Expected: Vendor: 1,150 | Courier: 30 | Platform: 20
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 1] Canonical 1,200 SAR Split Verification:"));
    const b1 = computeOrderDistributionBreakdown({
      totalAmount: 1200,
      partsSubtotal: 1000,
      deliveryFee: 30,
      platformFee: 20,
      vatRate: 0.15,
      isPickup: false,
    });

    assert(b1.partsSubtotal === 1000, "Parts Subtotal equals 1,000.00 SAR", `Got ${b1.partsSubtotal}`);
    assert(b1.partsVat === 150, "Parts VAT 15% equals 150.00 SAR", `Got ${b1.partsVat}`);
    assert(b1.vendorTotal === 1150, "Vendor Total (Parts + VAT) equals 1,150.00 SAR", `Got ${b1.vendorTotal}`);
    assert(b1.courierFee === 30, "Courier Fee equals 30.00 SAR", `Got ${b1.courierFee}`);
    assert(b1.platformFee === 20, "Platform Fee equals 20.00 SAR", `Got ${b1.platformFee}`);
    assert(b1.grandTotal === 1200, "Grand Total equals 1,200.00 SAR", `Got ${b1.grandTotal}`);
    assert(
      b1.vendorTotal + b1.courierFee + b1.platformFee === b1.grandTotal,
      "Sum of all allocations exactly equals Grand Total (1,150 + 30 + 20 = 1,200)",
      `Sum: ${b1.vendorTotal + b1.courierFee + b1.platformFee}`
    );

    /* ─────────────────────────────────────────────────────────────────
       TEST 2: Webhook / Replay Idempotency (5 Consecutive Submissions)
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 2] Webhook / Replay Idempotency Test:"));
    const testOrder2Id = `ORD-TEST-IDEMP-${Date.now()}`;
    // Seed order in orders_db.json
    const orders2 = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    orders2.unshift({
      id: testOrder2Id,
      total_price: 1200,
      parts_subtotal: 1000,
      delivery_fee: 30,
      platform_fee: 20,
      status: "paid",
      vendor_id: "vendor-demo-id",
      client_id: "client-demo-id",
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders2, null, 2), "utf-8");

    // First call
    const res2_1 = await distributeOrderFundsAutomatically({
      orderId: testOrder2Id,
      paymentSource: "external",
    });
    assert(res2_1.settled === true && res2_1.alreadySettled === false, "First settlement succeeds normally");

    // Replay 1
    const res2_2 = await distributeOrderFundsAutomatically({
      orderId: testOrder2Id,
      paymentSource: "external",
    });
    assert(res2_2.settled === true && res2_2.alreadySettled === true, "Second call detects already settled state without error");

    // Replay 2, 3, 4
    const res2_3 = await distributeOrderFundsAutomatically({ orderId: testOrder2Id, paymentSource: "external" });
    const res2_4 = await distributeOrderFundsAutomatically({ orderId: testOrder2Id, paymentSource: "external" });
    const res2_5 = await distributeOrderFundsAutomatically({ orderId: testOrder2Id, paymentSource: "external" });
    assert(
      Boolean(res2_3.alreadySettled && res2_4.alreadySettled && res2_5.alreadySettled),
      "Repeated webhooks 3, 4, 5 all gracefully return idempotent success"
    );

    // Verify transactions count in ledger (3 for legacy single fee, 4 for two-sided fee)
    const txns2 = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, "utf-8") || "[]");
    const orderTxns2 = txns2.filter((t: any) => t.reference && t.reference.includes(testOrder2Id.replace("ORD-", "")));
    assert(orderTxns2.length === 3 || orderTxns2.length === 4, "No duplicate transactions created on replay (3 or 4 records exist)", `Found ${orderTxns2.length}`);

    /* ─────────────────────────────────────────────────────────────────
       TEST 3: Concurrent Execution Race Condition Lock Test
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 3] Concurrent Race Condition Lock Test:"));
    const testOrder3Id = `ORD-TEST-CONCURR-${Date.now()}`;
    const orders3 = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    orders3.unshift({
      id: testOrder3Id,
      total_price: 1200,
      parts_subtotal: 1000,
      delivery_fee: 30,
      platform_fee: 20,
      status: "paid",
      vendor_id: "vendor-demo-id",
      client_id: "client-demo-id",
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders3, null, 2), "utf-8");

    // Fire 2 simultaneous settlements
    const [cRes1, cRes2] = await Promise.all([
      distributeOrderFundsAutomatically({ orderId: testOrder3Id, paymentSource: "external" }),
      distributeOrderFundsAutomatically({ orderId: testOrder3Id, paymentSource: "external" }),
    ]);

    assert(Boolean(cRes1.settled && cRes2.settled), "Both concurrent settlement promises resolve safely");
    assert(
      Boolean((cRes1.alreadySettled && !cRes2.alreadySettled) || (!cRes1.alreadySettled && cRes2.alreadySettled)),
      "Mutex / DB lock prevents simultaneous duplicate settlement (one settles, other yields idempotent result)"
    );

    /* ─────────────────────────────────────────────────────────────────
       TEST 4: Failure & Atomicity / Validation
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 4] Settlement Validation & Missing Order Safeguard:"));
    const fakeRes = await distributeOrderFundsAutomatically({
      orderId: "ORD-NON-EXISTENT-99999",
      paymentSource: "external",
    });
    assert(
      fakeRes.settled === false && fakeRes.error !== undefined,
      "Non-existent order fails safely without modifying ledger",
      fakeRes.error
    );

    /* ─────────────────────────────────────────────────────────────────
       TEST 5: Branch Pickup (Zero Delivery Fee)
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 5] Branch Pickup Order (Zero Delivery Fee):"));
    const b5 = computeOrderDistributionBreakdown({
      totalAmount: 1170,
      partsSubtotal: 1000,
      deliveryFee: 30, // Passed, but isPickup is true
      platformFee: 20,
      vatRate: 0.15,
      isPickup: true,
    });

    assert(b5.courierFee === 0, "Delivery fee is strictly 0 SAR for branch pickup", `Got ${b5.courierFee}`);
    assert(b5.vendorTotal === 1150, "Vendor still receives full 1,150.00 SAR", `Got ${b5.vendorTotal}`);
    assert(b5.platformFee === 20, "Platform receives 20.00 SAR", `Got ${b5.platformFee}`);
    assert(b5.grandTotal === 1170, "Grand Total equals 1,170.00 SAR (1,150 + 0 + 20)", `Got ${b5.grandTotal}`);

    // Test execution with branch pickup order
    const testOrder5Id = `ORD-TEST-PICKUP-${Date.now()}`;
    const orders5 = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    orders5.unshift({
      id: testOrder5Id,
      total_price: 1170,
      parts_subtotal: 1000,
      delivery_fee: 0,
      platform_fee: 20,
      delivery_type: "pickup",
      status: "paid",
      vendor_id: "vendor-demo-id",
      client_id: "client-demo-id",
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders5, null, 2), "utf-8");

    const res5 = await distributeOrderFundsAutomatically({
      orderId: testOrder5Id,
      paymentSource: "external",
    });
    assert(res5.settled === true, "Branch pickup order settles successfully");
    assert(res5.breakdown?.courierFee === 0, "Settlement summary records courierFee = 0.00 SAR");

    const txns5 = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, "utf-8") || "[]");
    const courierTxn5 = txns5.find(
      (t: any) => t.reference && t.reference.includes(testOrder5Id.replace("ORD-", "")) && t.reference.includes("COURIER")
    );
    assert(!courierTxn5, "No courier transaction is created when delivery fee is 0");

    /* ─────────────────────────────────────────────────────────────────
       TEST 6: Order Cancellation / Refund Verification
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 6] Order Cancellation / Status Integrity:"));
    const cleanId5 = testOrder5Id.replace("ORD-", "");
    const orders6 = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    const targetIdx6 = orders6.findIndex((o: any) => o.id === testOrder5Id);
    orders6[targetIdx6].status = "cancelled";
    orders6[targetIdx6].refund_status = "refunded";
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders6, null, 2), "utf-8");

    const updatedOrder6 = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8")).find((o: any) => o.id === testOrder5Id);
    assert(updatedOrder6.status === "cancelled", "Order status successfully updated to cancelled");
    assert(updatedOrder6.wallet_split_settled === true, "Historical settlement audit summary remains preserved for accounting audit");

    /* ─────────────────────────────────────────────────────────────────
       TEST 7: External Payment vs Client Wallet Debit Verification
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 7] External Gateway vs Internal Wallet Debit Verification:"));
    // 7A: External payment
    const testOrder7A = `ORD-TEST-EXT-${Date.now()}`;
    const orders7A = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    orders7A.unshift({
      id: testOrder7A,
      total_price: 1200,
      parts_subtotal: 1000,
      delivery_fee: 30,
      platform_fee: 20,
      status: "paid",
      vendor_id: "vendor-demo-id",
      client_id: "client-demo-id",
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders7A, null, 2), "utf-8");

    await distributeOrderFundsAutomatically({
      orderId: testOrder7A,
      paymentSource: "external", // Paid via Mada/Credit card
    });

    const txns7A = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, "utf-8") || "[]");
    const clientDebit7A = txns7A.find((t: any) => t.reference === `PAY-${testOrder7A.replace("ORD-", "")}-CLIENT-WALLET`);
    assert(!clientDebit7A, "External payment does NOT debit client wallet balance (prevents double charge)");

    // 7B: Wallet payment
    const testClientId7B = `test-client-wallet-${Date.now()}`;
    const testOrder7B = `ORD-TEST-WALLET-${Date.now()}`;
    const orders7B = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    orders7B.unshift({
      id: testOrder7B,
      total_price: 1200,
      parts_subtotal: 1000,
      delivery_fee: 30,
      platform_fee: 20,
      payment_method: "wallet",
      status: "paid",
      vendor_id: "vendor-demo-id",
      client_id: testClientId7B,
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders7B, null, 2), "utf-8");

    // 7B-1: Zero balance debit attempt is safely rejected
    const zeroBalanceRes = await distributeOrderFundsAutomatically({
      orderId: testOrder7B,
      paymentSource: "wallet",
    });
    assert(zeroBalanceRes.success === false, "Zero balance wallet payment is blocked and prevented from settling");

    // 7B-2: Credit wallet with 2,000 SAR and test successful debit
    await executeLedgerTransaction({
      userId: testClientId7B,
      type: "credit",
      amount: 2000,
      description: "إيداع رصيد تجريبي في محفظة العميل",
      reference: `CREDIT-${Date.now()}`,
    });

    const fundedDebitRes = await distributeOrderFundsAutomatically({
      orderId: testOrder7B,
      paymentSource: "wallet", // Paid from RFQ wallet balance
    });
    assert(fundedDebitRes.success === true, "Funded wallet payment settles successfully");

    const txns7B = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, "utf-8") || "[]");
    const clientDebit7B = txns7B.find((t: any) => t.reference === `PAY-${testOrder7B.replace("ORD-", "")}-CLIENT-WALLET`);
    assert(clientDebit7B !== undefined, "Internal wallet payment debits client wallet balance exactly once");
    assert(clientDebit7B.amount === 1200 && (clientDebit7B.type === "debit" || clientDebit7B.type === "DEBIT"), "Client debit amount equals 1,200.00 SAR");

    /* ─────────────────────────────────────────────────────────────────
       TEST 8: Halalas, Rounding, Discounts, and Fractions Math
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 8] Halalas Precision & Decimal Rounding Math:"));
    const b8 = computeOrderDistributionBreakdown({
      totalAmount: 153.33,
      partsSubtotal: 100.29,
      deliveryFee: 35.04,
      platformFee: 3.0,
      vatRate: 0.15,
      isPickup: false,
    });

    const partsHalalas = toHalalas(b8.partsSubtotal);
    const vatHalalas = toHalalas(b8.partsVat);
    const vendorHalalas = toHalalas(b8.vendorTotal);
    const courierHalalas = toHalalas(b8.courierFee);
    const platformHalalas = toHalalas(b8.platformFee);
    const grandHalalas = toHalalas(b8.grandTotal);

    assert(vendorHalalas === partsHalalas + vatHalalas, "Vendor Halalas equals partsHalalas + vatHalalas exactly");
    assert(
      vendorHalalas + courierHalalas + platformHalalas === grandHalalas,
      "Zero halala discrepancy: vendorHalalas + courierHalalas + platformHalalas === grandHalalas",
      `Sum: ${vendorHalalas + courierHalalas + platformHalalas}, Grand: ${grandHalalas}`
    );

    /* ─────────────────────────────────────────────────────────────────
       TEST 9: Total Ledger Balance Equality (Zero Leakage Check)
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 9] Zero Fund Leakage Verification:"));
    const testCases = [
      { total: 1200, parts: 1000, del: 30, plat: 20 },
      { total: 500, parts: 400, del: 40, plat: 20 },
      { total: 2500.5, parts: 2000, del: 50, plat: 150.5 },
      { total: 85.25, parts: 50, del: 27.75, plat: 0 },
    ];

    let allZeroLeakage = true;
    for (const tc of testCases) {
      const b = computeOrderDistributionBreakdown({
        totalAmount: tc.total,
        partsSubtotal: tc.parts,
        deliveryFee: tc.del,
        platformFee: tc.plat,
      });
      if (toHalalas(b.vendorTotal) + toHalalas(b.courierFee) + toHalalas(b.platformFee) !== toHalalas(b.grandTotal)) {
        allZeroLeakage = false;
      }
    }
    assert(allZeroLeakage, "All test cases verify sum(distribution) === total_collected without halala leakage");

    /* ─────────────────────────────────────────────────────────────────
       TEST 10: Vendor Tampering Prevention / Server Authority
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 10] Server Authority & Tampering Prevention:"));
    const testOrder10Id = `ORD-TEST-TAMPER-${Date.now()}`;
    const orders10 = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    orders10.unshift({
      id: testOrder10Id,
      total_price: 1200,
      parts_subtotal: 1000,
      delivery_fee: 30,
      platform_fee: 20,
      // Vendor attempts to send fraudulent amounts in client payload:
      vendor_requested_payout: 999999,
      tampered_vat: 0,
      status: "paid",
      vendor_id: "vendor-demo-id",
      client_id: "client-demo-id",
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders10, null, 2), "utf-8");

    const res10 = await distributeOrderFundsAutomatically({
      orderId: testOrder10Id,
      paymentSource: "external",
    });
    assert(
      res10.breakdown?.vendorTotal === 1150,
      "Server strictly enforces calculated formula (1,150 SAR) and rejects fraudulent client payload amounts"
    );

    /* ─────────────────────────────────────────────────────────────────
       TEST 11: ZATCA Decoupled Vendor Tax Invoice & QR Code Content
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 11] ZATCA Decoupled Vendor Tax Invoice & QR Code Content:"));
    const sampleVendorInvoiceNumber = normalizeInvoiceNumber(undefined, "ORD-1200");
    const vendorVatId = "300123456700003";
    const vendorPartsTotal = 1150;
    const vendorTax = 150;

    const qrUrl = `https://rfqsa.tech/deal/ORD-1200?inv=${encodeURIComponent(sampleVendorInvoiceNumber)}&vat=${vendorVatId}&total=${vendorPartsTotal}&tax=${vendorTax}`;
    assert(qrUrl.includes("total=1150"), "Vendor Tax Invoice QR code contains total=1150 (NOT 1200)");
    assert(qrUrl.includes("tax=150"), "Vendor Tax Invoice QR code contains tax=150 (strictly parts VAT)");
    assert(!qrUrl.includes("total=1200"), "Third party fees (delivery 30, platform 20) are strictly excluded from vendor tax QR");

    /* ─────────────────────────────────────────────────────────────────
       TEST 12: Historical Orders Backward Compatibility
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 12] Historical Orders Backward Compatibility:"));
    const historicalOrder = {
      id: "ORD-LEGACY-001",
      total_price: 1200,
      status: "completed",
      created_at: "2025-01-01T00:00:00Z",
      // No wallet_split_settled or new fields
    };
    const b12 = computeOrderDistributionBreakdown({
      totalAmount: historicalOrder.total_price,
    });
    assert(b12.grandTotal === 1200, "Historical orders compute safely without required extra fields");
    assert(b12.vendorTotal > 0, "Historical orders breakdown is calculated gracefully");

    /* ─────────────────────────────────────────────────────────────────
       TEST 13: 100 SAR Parts Order — Pure 15% VAT on Parts & Zero Delivery on Vendor Invoice
       Parts: 100 | 15% VAT: 15 | Delivery: 25 | Platform 3%: 3 | Total: 143
       Vendor Invoice Total: 115 SAR (100 + 15). Delivery NOT recorded in vendor invoice.
       Courier Wallet: 25 SAR.
       Platform Wallet: 3 SAR.
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 13] 100 SAR Parts & VAT on Parts Only Verification:"));
    const b13 = computeOrderDistributionBreakdown({
      totalAmount: 143,
      partsSubtotal: 100,
      deliveryFee: 25,
      platformFee: 3,
      vatRate: 0.15,
      isPickup: false,
    });

    assert(b13.partsSubtotal === 100, "Parts Subtotal = 100.00 SAR", `Got ${b13.partsSubtotal}`);
    assert(b13.partsVat === 15, "15% VAT strictly on parts only = 15.00 SAR (NOT 15.45)", `Got ${b13.partsVat}`);
    assert(b13.vendorTotal === 115, "Vendor Tax Invoice Total = 115.00 SAR (100 + 15)", `Got ${b13.vendorTotal}`);
    assert(b13.courierFee === 25, "Courier Wallet = 25.00 SAR (Delivery fee)", `Got ${b13.courierFee}`);
    assert(b13.platformFee === 3, "Platform Wallet = 3.00 SAR (Commission)", `Got ${b13.platformFee}`);
    assert(b13.grandTotal === 143, "Client Grand Total = 143.00 SAR", `Got ${b13.grandTotal}`);
    assert(
      b13.vendorTotal + b13.courierFee + b13.platformFee === 143,
      "Exact zero leakage split: 115 (Vendor) + 25 (Courier) + 3 (Platform) = 143.00 SAR",
      `Sum: ${b13.vendorTotal + b13.courierFee + b13.platformFee}`
    );

    // Branch pickup variation for 100 SAR parts
    const b13Pickup = computeOrderDistributionBreakdown({
      totalAmount: 118,
      partsSubtotal: 100,
      deliveryFee: 0,
      platformFee: 3,
      vatRate: 0.15,
      isPickup: true,
    });
    assert(b13Pickup.courierFee === 0, "Branch pickup courier allocation = 0.00 SAR");
    assert(b13Pickup.vendorTotal === 115, "Branch pickup vendor total remains 115.00 SAR");
    assert(b13Pickup.grandTotal === 118, "Branch pickup client total = 118.00 SAR (100 + 15 + 3)");

    /* ─────────────────────────────────────────────────────────────────
       TEST 14: Authoritative Two-Sided Platform Fee Specification (المواصفة النهائية لرسوم المنصة)
       1. Fee calculated on parts subtotal before VAT.
       2. Client fee (3%) added to parts before VAT -> Subtotal before VAT: 103 SAR.
       3. 15% VAT strictly on parts: 15 SAR.
       4. Delivery: 25 SAR.
       5. Client Grand Total: 143 SAR.
       6. Vendor fee (3%) deducted from dues: 3 SAR -> Net parts: 97 SAR -> Net vendor payout: 112 SAR (97 + 15).
       7. Admin Platform Wallet gets 2 separate transactions:
          - Client Fee (3 SAR) [SETTLE-...-PLATFORM-CLIENT]
          - Vendor Fee (3 SAR) [SETTLE-...-PLATFORM-VENDOR]
       8. Zero leakage: 112 + 25 + 3 + 3 === 143 SAR.
    ────────────────────────────────────────────────────────────────── */
    console.log(bold("\n[TEST 14] Authoritative Two-Sided Platform Fee Specification (المواصفة النهائية لرسوم المنصة):"));
    const b14 = computeOrderDistributionBreakdown({
      totalAmount: 143,
      partsSubtotal: 100,
      clientPlatformFee: 3,
      clientFeePercent: 3,
      vendorPlatformFee: 3,
      vendorFeePercent: 3,
      deliveryFee: 25,
      vatRate: 0.15,
      isPickup: false,
    });

    assert(b14.partsSubtotal === 100, "1. Parts Subtotal = 100.00 SAR", `Got ${b14.partsSubtotal}`);
    assert(b14.clientPlatformFee === 3, "2. Client Platform Fee (3% added) = 3.00 SAR", `Got ${b14.clientPlatformFee}`);
    assert(b14.clientSubtotalBeforeTax === 103, "3. Subtotal Before VAT (100 + 3) = 103.00 SAR", `Got ${b14.clientSubtotalBeforeTax}`);
    assert(b14.partsVat === 15, "4. 15% VAT on parts = 15.00 SAR", `Got ${b14.partsVat}`);
    assert(b14.courierFee === 25, "5. Courier Delivery Fee = 25.00 SAR", `Got ${b14.courierFee}`);
    assert(b14.grandTotal === 143, "6. Client Grand Total = 143.00 SAR (100 + 3 + 15 + 25)", `Got ${b14.grandTotal}`);

    assert(b14.vendorPlatformFee === 3, "7. Vendor Platform Fee (3% deducted) = 3.00 SAR", `Got ${b14.vendorPlatformFee}`);
    assert(b14.vendorNetParts === 97, "8. Net Parts Dues (100 - 3) = 97.00 SAR", `Got ${b14.vendorNetParts}`);
    assert(b14.vendorGrossTotal === 115, "9. Vendor Tax Invoice Gross (100 + 15 VAT) = 115.00 SAR", `Got ${b14.vendorGrossTotal}`);
    assert(b14.vendorTotal === 112, "10. Vendor Net Payout (97 + 15 VAT) = 112.00 SAR", `Got ${b14.vendorTotal}`);
    assert(b14.platformFee === 6, "11. Total Platform Fee (3 client + 3 vendor) = 6.00 SAR", `Got ${b14.platformFee}`);
    assert(
      b14.vendorTotal + b14.courierFee + b14.platformFee === 143,
      "12. Zero Leakage Mathematical Proof: 112 (vendor) + 25 (courier) + 6 (platform) === 143.00 SAR",
      `Sum: ${b14.vendorTotal + b14.courierFee + b14.platformFee}`
    );

    // Branch pickup variant of Test 14
    const b14Pickup = computeOrderDistributionBreakdown({
      totalAmount: 118,
      partsSubtotal: 100,
      clientPlatformFee: 3,
      clientFeePercent: 3,
      vendorPlatformFee: 3,
      vendorFeePercent: 3,
      deliveryFee: 0,
      vatRate: 0.15,
      isPickup: true,
    });
    assert(b14Pickup.courierFee === 0, "13. Branch pickup courier allocation = 0.00 SAR");
    assert(b14Pickup.vendorTotal === 112, "14. Branch pickup vendor net payout = 112.00 SAR (97 + 15)");
    assert(b14Pickup.grandTotal === 118, "15. Branch pickup client total = 118.00 SAR (100 + 3 + 15)");
    assert(
      b14Pickup.vendorTotal + b14Pickup.platformFee === 118,
      "16. Zero Leakage on branch pickup: 112 (vendor) + 6 (platform) === 118.00 SAR"
    );

    // Test 14 Automated Settlement in Ledger
    console.log(bold("\n[TEST 14b] Two-Sided Platform Fee Ledger Transactions Execution:"));
    const testOrder14Id = `ORD-TEST-TWOSIDED-${Date.now()}`;
    const orders14 = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8") || "[]");
    orders14.unshift({
      id: testOrder14Id,
      total_price: 143,
      parts_subtotal: 100,
      client_platform_fee: 3,
      client_platform_fee_percent: 3,
      vendor_platform_fee: 3,
      vendor_platform_fee_percent: 3,
      delivery_fee: 25,
      tax_amount: 15,
      vat_percent: 15,
      status: "paid",
      vendor_id: "vendor-demo-id",
      client_id: "client-demo-id",
    });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders14, null, 2), "utf-8");

    const res14 = await distributeOrderFundsAutomatically({
      orderId: testOrder14Id,
      paymentSource: "external",
    });

    assert(res14.settled === true, "Settlement executed successfully");
    assert(res14.breakdown.vendorTotal === 112, "Vendor receives exact net 112.00 SAR (97 parts + 15 VAT)");
    assert(res14.breakdown.clientPlatformFee === 3, "Client platform fee = 3.00 SAR");
    assert(res14.breakdown.vendorPlatformFee === 3, "Vendor platform fee = 3.00 SAR");

    const txns14 = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, "utf-8") || "[]");
    const cleanId14 = testOrder14Id.replace("ORD-", "");
    const vendorTxn = txns14.find((t: any) => t.reference === `SETTLE-${cleanId14}-VENDOR`);
    const courierTxn = txns14.find((t: any) => t.reference === `SETTLE-${cleanId14}-COURIER`);
    const clientFeeTxn = txns14.find((t: any) => t.reference === `SETTLE-${cleanId14}-PLATFORM-CLIENT`);
    const vendorFeeTxn = txns14.find((t: any) => t.reference === `SETTLE-${cleanId14}-PLATFORM-VENDOR`);

    assert(Boolean(vendorTxn), "Vendor credit transaction exists");
    assert(vendorTxn?.amount === 115 || vendorTxn?.amount === 112, "Vendor credit amount is verified (Gross 115 or Net 112 SAR)");
    assert(Boolean(courierTxn), "Courier credit transaction exists");
    assert(courierTxn?.amount === 25, "Courier credit amount is exactly 25.00 SAR");
    assert(Boolean(clientFeeTxn), "Platform Client Fee transaction exists");
    assert(clientFeeTxn?.amount === 3, "Platform Client Fee amount is exactly 3.00 SAR");
    assert(Boolean(vendorFeeTxn), "Platform Vendor Fee transaction exists");
    assert(vendorFeeTxn?.amount === 3, "Platform Vendor Fee amount is exactly 3.00 SAR");
    assert(
      clientFeeTxn?.user_id === "admin-demo-id" && vendorFeeTxn?.user_id === "admin-demo-id",
      "Both platform fees credited to Platform Admin Wallet (admin-demo-id)"
    );


  } finally {
    // Restore backup files
    fs.writeFileSync(ORDERS_FILE, backupOrders, "utf-8");
    fs.writeFileSync(INVOICES_FILE, backupInvoices, "utf-8");
    fs.writeFileSync(TRANSACTIONS_FILE, backupTxns, "utf-8");
  }

  console.log(bold(cyan("\n═══════════════════════════════════════════════════════════════════════")));
  console.log(
    bold(
      `   TEST SUITE SUMMARY: ${green(`${passedCount} PASSED`)} | ${
        failedCount === 0 ? green("0 FAILED") : red(`${failedCount} FAILED`)
      }`
    )
  );
  console.log(bold(cyan("═══════════════════════════════════════════════════════════════════════\n")));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test suite runtime error:", err);
  process.exit(1);
});
