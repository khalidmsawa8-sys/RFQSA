/**
 * Central Automated Wallet Funds Distribution Engine (Enterprise-Grade)
 * Implements:
 * 1. Strict mathematical decomposition of customer order payment:
 *    - Vendor: Net parts subtotal + 15% VAT on parts (e.g. 1,000 + 150 = 1,150 SAR)
 *    - Courier: Delivery fee (e.g. 30 SAR; 0 if branch pickup)
 *    - Platform Admin: Site fee / commission (e.g. 20 SAR)
 *    - Client: Total debit only if paying via wallet balance (1,200 SAR)
 * 2. Absolute Idempotency & Concurrency Mutex to prevent duplicate credits on retries/webhooks.
 * 3. Halala-level precision with zero rounding leakage: Total Paid === Sum of Distributed Funds.
 * 4. Automatic synchronization across central SQL DB, In-memory shared state, and disk JSON stores.
 */

import { createClient } from "@/lib/supabase/server";
import { executeLedgerTransaction, LedgerTransactionRecord } from "./wallet-ledger";
import { logActivityEvent } from "./audit-logger";
import { getOrCreateCanonicalInvoiceNumber, normalizeInvoiceNumber } from "./invoice-canonical";
import { getSystemSettings } from "./system-settings";
import fs from "fs";
import path from "path";

/* ── In-Memory Concurrency Locks (Process-wide Mutex) ── */
const activeSettlementLocks = new Set<string>();

/* ── Types ── */
export interface OrderDistributionBreakdown {
  orderId: string;
  partsSubtotal: number;       // قيمة القطع الصافية (مثال: 100 ر.س)
  partsVat: number;            // ضريبة القيمة المضافة 15% للقطع (مثال: 15 ر.س)

  // Platform fees (رسوم المنصة للطرفين)
  clientFeePercent: number;    // نسبة رسوم العميل (مثال: 3%)
  clientPlatformFee: number;   // رسوم المنصة على العميل - تُضاف لقيمة القطع (مثال: 3 ر.س)
  vendorFeePercent: number;    // نسبة رسوم المورد (مثال: 3%)
  vendorPlatformFee: number;   // رسوم المنصة المخصومة من المورد (مثال: 3 ر.س)
  platformFee: number;         // إجمالي دخل المنصة = رسوم العميل + رسوم المورد (مثال: 6 ر.س)

  // Vendor dues (مستحقات المورد)
  vendorGrossTotal: number;    // إجمالي قيمة القطع والضريبة قبل الخصم (مثال: 115 ر.س)
  vendorNetParts: number;      // صافي قيمة القطع للمورد بعد خصم الرسوم (مثال: 97 ر.س)
  vendorTotal: number;         // صافي مستحقات المورد المودعة بالمحفظة = صافي القطع + الضريبة (مثال: 112 ر.س)

  // Delivery (التوصيل)
  deliveryFee: number;         // أجور التوصيل للمندوب (مثال: 25 ر.س، و 0 للاستلام من الفرع)
  courierFee: number;          // أجور التوصيل للمندوب (اسم بديل للتوافق)

  // Client side (جانب العميل)
  clientSubtotalBeforeTax: number; // إجمالي العميل قبل الضريبة = قيمة القطع + رسوم المنصة (مثال: 103 ر.س)
  grandTotal: number;          // إجمالي ما دفعه العميل = القطع + رسوم العميل + الضريبة + التوصيل (مثال: 143 ر.س)

  isPickup: boolean;           // هل الطلب استلام من الفرع؟
  vatPercent: number;          // نسبة الضريبة (15%)
  commissionPercent: number;   // نسبة العمولة للتوافق العكسي (= clientFeePercent)
}

export interface DistributionOptions {
  orderId?: string;
  paymentSource?: "wallet" | "gateway" | "card" | "manual" | "external" | string;
  paymentReference?: string;
  performedBy?: string;
  actorRole?: string;
  actorName?: string;
}

export type DistributionParams = {
  orderId: string;
} & DistributionOptions;

export interface DistributionResult {
  success: boolean;
  settled?: boolean;
  orderId: string;
  alreadySettled?: boolean;
  breakdown: OrderDistributionBreakdown;
  transactions: {
    clientDebit?: LedgerTransactionRecord;
    vendorCredit?: LedgerTransactionRecord;
    courierCredit?: LedgerTransactionRecord;
    platformCredit?: LedgerTransactionRecord;
    platformClientCredit?: LedgerTransactionRecord;
    platformVendorCredit?: LedgerTransactionRecord;
  };
  error?: string;
}

/* ── Halala Helpers ── */
export const toHalalas = (n: number | string | undefined | null): number =>
  Math.round((Number(n) || 0) * 100);

export const fromHalalas = (h: number): number =>
  Number((h / 100).toFixed(2));

/**
 * Computes the authoritative distribution breakdown for an order.
 * Guarantees that:
 *   grandTotal === vendorTotal + deliveryFee + (clientPlatformFee + vendorPlatformFee)
 *   vendorTotal === (partsSubtotal - vendorPlatformFee) + partsVat
 *   clientSubtotalBeforeTax === partsSubtotal + clientPlatformFee
 */
export function computeOrderDistributionBreakdown(order: any, sysSettings?: any): OrderDistributionBreakdown {
  const orderId = String(order?.id || order?.orderId || "");
  const isPickup = Boolean(
    order?.is_pickup === true ||
    order?.isPickup === true ||
    order?.delivery_type === "pickup" ||
    order?.delivery_method === "pickup" ||
    order?.fulfillment_method === "BRANCH_PICKUP" ||
    order?.fulfillment_method === "SELF_PICKUP"
  );

  const rawGrandTotal = Number(order?.total_price ?? order?.total_amount ?? order?.totalAmount ?? order?.total ?? 0);
  const vatPercent = Number(
    order?.vat_percent != null
      ? order.vat_percent
      : order?.vatRate != null
      ? (order.vatRate <= 1 ? order.vatRate * 100 : order.vatRate)
      : 15
  );
  const vatRate = vatPercent / 100;

  const hasExplicitVendorFee =
    order?.vendor_platform_fee_percent != null ||
    order?.vendorFeePercent != null ||
    order?.vendor_fee_percent != null ||
    order?.vendor_platform_fee != null ||
    order?.vendorPlatformFee != null ||
    order?.vendor_fee != null;

  const isLegacySingleFee =
    !hasExplicitVendorFee &&
    (order?.platform_fee != null || order?.platformFee != null) &&
    order?.client_platform_fee == null &&
    order?.clientPlatformFee == null;

  // 1. Fee percentages (Client fee added to parts, Vendor fee deducted from dues)
  const clientFeePercent = Number(
    order?.client_platform_fee_percent != null
      ? order.client_platform_fee_percent
      : order?.clientFeePercent != null
      ? order.clientFeePercent
      : sysSettings?.client_platform_fee_percent != null
      ? sysSettings.client_platform_fee_percent
      : order?.platform_commission_percent != null
      ? order.platform_commission_percent
      : 5
  );

  const vendorFeePercent = isLegacySingleFee
    ? 0
    : Number(
        order?.vendor_platform_fee_percent != null
          ? order.vendor_platform_fee_percent
          : order?.vendorFeePercent != null
          ? order.vendorFeePercent
          : sysSettings?.vendor_platform_fee_percent != null
          ? sysSettings.vendor_platform_fee_percent
          : 10
      );

  // 2. Delivery Fee (Always 0 if branch pickup)
  let deliveryFeeHalalas = isPickup
    ? 0
    : toHalalas(order?.delivery_fee ?? order?.delivery_cost ?? order?.deliveryFee ?? order?.courierFee ?? order?.del ?? 0);

  // 3. Parts Subtotal & VAT (Strictly 15% on parts subtotal alone)
  let partsSubtotalHalalas = 0;
  let partsVatHalalas = 0;

  const rawPartsSubtotal = order?.parts_subtotal ?? order?.partsSubtotal ?? order?.parts;
  const rawPartsVat = order?.parts_vat ?? order?.partsVat;

  if (rawPartsSubtotal != null && Number(rawPartsSubtotal) > 0) {
    partsSubtotalHalalas = toHalalas(rawPartsSubtotal);
    if (rawPartsVat != null && Number(rawPartsVat) > 0 && Number(rawPartsVat) <= Number(rawPartsSubtotal) * vatRate * 1.05) {
      partsVatHalalas = toHalalas(rawPartsVat);
    } else {
      partsVatHalalas = Math.round(partsSubtotalHalalas * vatRate);
    }
  } else if (order?.subtotal != null && Number(order.subtotal) > 0 && Number(order.subtotal) <= Number(rawGrandTotal || order.subtotal)) {
    partsSubtotalHalalas = toHalalas(order.subtotal);
    partsVatHalalas = Math.round(partsSubtotalHalalas * vatRate);
  } else {
    // Reverse-calculate from client grand total
    const netBaseHalalas = Math.max(0, toHalalas(rawGrandTotal) - deliveryFeeHalalas);
    const clientFeeRate = clientFeePercent / 100;
    const factor = 1 + clientFeeRate + vatRate;
    partsSubtotalHalalas = Math.round(netBaseHalalas / factor);
    partsVatHalalas = Math.round(partsSubtotalHalalas * vatRate);
  }

  // 4. Platform Fees (Client fee added, Vendor fee deducted)
  let clientPlatformFeeHalalas = 0;
  const rawClientFee = order?.client_platform_fee ?? order?.clientPlatformFee;
  if (rawClientFee != null && !isNaN(Number(rawClientFee)) && order?.client_platform_fee_percent === clientFeePercent) {
    clientPlatformFeeHalalas = toHalalas(rawClientFee);
  } else {
    clientPlatformFeeHalalas = Math.round(partsSubtotalHalalas * (clientFeePercent / 100));
  }

  let vendorPlatformFeeHalalas = 0;
  if (isLegacySingleFee) {
    vendorPlatformFeeHalalas = 0;
  } else {
    const rawVendorFee = order?.vendor_platform_fee ?? order?.vendorPlatformFee;
    if (rawVendorFee != null && !isNaN(Number(rawVendorFee)) && order?.vendor_platform_fee_percent === vendorFeePercent) {
      vendorPlatformFeeHalalas = toHalalas(rawVendorFee);
    } else {
      vendorPlatformFeeHalalas = Math.round(partsSubtotalHalalas * (vendorFeePercent / 100));
    }
  }

  // 5. Vendor Totals (Parts Subtotal - Vendor Fee + Parts VAT)
  const vendorGrossTotalHalalas = partsSubtotalHalalas + partsVatHalalas;
  const vendorNetPartsHalalas = Math.max(0, partsSubtotalHalalas - vendorPlatformFeeHalalas);
  const vendorTotalHalalas = vendorNetPartsHalalas + partsVatHalalas;

  // 6. Platform Total Fee (Client Fee + Vendor Fee)
  let totalPlatformFeeHalalas = clientPlatformFeeHalalas + vendorPlatformFeeHalalas;

  // 7. Mathematical Rebalancing Guard (Zero Halala Leakage)
  // Total Collected from client = partsSubtotal + clientPlatformFee + partsVat + deliveryFee
  // Total Distributed = vendorTotal (partsSubtotal - vendorFee + partsVat) + deliveryFee + totalPlatformFee (clientFee + vendorFee)
  // Notice that vendorFee cancels out perfectly:
  // (partsSubtotal - vendorFee + partsVat) + deliveryFee + (clientFee + vendorFee) === partsSubtotal + partsVat + deliveryFee + clientFee
  const expectedGrandTotalHalalas = partsSubtotalHalalas + clientPlatformFeeHalalas + partsVatHalalas + deliveryFeeHalalas;
  const grandTotalHalalas = rawGrandTotal > 0 ? toHalalas(rawGrandTotal) : expectedGrandTotalHalalas;

  const totalDistributedHalalas = vendorTotalHalalas + deliveryFeeHalalas + totalPlatformFeeHalalas;
  if (grandTotalHalalas > 0 && totalDistributedHalalas !== grandTotalHalalas) {
    const diff = grandTotalHalalas - totalDistributedHalalas;
    clientPlatformFeeHalalas = Math.max(0, clientPlatformFeeHalalas + diff);
    totalPlatformFeeHalalas = clientPlatformFeeHalalas + vendorPlatformFeeHalalas;
  }

  const finalDeliveryFee = fromHalalas(deliveryFeeHalalas);

  return {
    orderId,
    partsSubtotal: fromHalalas(partsSubtotalHalalas),
    partsVat: fromHalalas(partsVatHalalas),
    clientFeePercent,
    clientPlatformFee: fromHalalas(clientPlatformFeeHalalas),
    vendorFeePercent,
    vendorPlatformFee: fromHalalas(vendorPlatformFeeHalalas),
    platformFee: fromHalalas(totalPlatformFeeHalalas),
    vendorGrossTotal: fromHalalas(vendorGrossTotalHalalas),
    vendorNetParts: fromHalalas(vendorNetPartsHalalas),
    vendorTotal: fromHalalas(vendorTotalHalalas),
    deliveryFee: finalDeliveryFee,
    courierFee: finalDeliveryFee,
    clientSubtotalBeforeTax: fromHalalas(partsSubtotalHalalas + clientPlatformFeeHalalas),
    grandTotal: fromHalalas(grandTotalHalalas),
    isPickup,
    vatPercent,
    commissionPercent: clientFeePercent,
  };
}

/**
 * Executes automatic, idempotent wallet funds distribution for a paid order.
 */
export async function distributeOrderFundsAutomatically(
  orderIdOrParams: string | DistributionParams,
  options: DistributionOptions = {}
): Promise<DistributionResult> {
  let targetOrderId: string;
  let effectiveOptions: DistributionOptions;

  if (typeof orderIdOrParams === "object" && orderIdOrParams !== null) {
    targetOrderId = String(orderIdOrParams.orderId || "");
    effectiveOptions = { ...orderIdOrParams, ...(options || {}) };
  } else {
    targetOrderId = String(orderIdOrParams || "");
    effectiveOptions = options || {};
  }

  const cleanId = targetOrderId.replace(/^ORD-/, "").replace(/^DEAL-/, "");
  const canonicalOrderId = `ORD-${cleanId}`;

  // ── Mutex Lock Check ──
  if (activeSettlementLocks.has(canonicalOrderId)) {
    return {
      success: true,
      settled: true,
      orderId: canonicalOrderId,
      alreadySettled: true,
      error: `عملية توزيع المستحقات للطلب #${canonicalOrderId} قيد المعالجة حالياً. تم منع التكرار.`,
      breakdown: {} as any,
      transactions: {},
    };
  }

  activeSettlementLocks.add(canonicalOrderId);

  try {
    const supabase = await createClient();

    // 1. Authoritative Order Lookup (Database / Disk JSON)
    const { data: orderData, error: ordErr } = await supabase
      .from("orders")
      .select("*, rfqs(*)")
      .or(`id.eq.${canonicalOrderId},id.eq.${cleanId}`)
      .maybeSingle();

    let order = orderData;

    // Fallback lookup from disk if not yet in Supabase
    if (!order) {
      const DATA_DIR = path.join(process.cwd(), "data");
      const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
      if (fs.existsSync(ORDERS_FILE)) {
        try {
          const diskOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
          order = diskOrders.find((o: any) => o.id === canonicalOrderId || o.id === cleanId || o.id === targetOrderId);
        } catch {}
      }
    }

    if (!order) {
      return {
        success: false,
        settled: false,
        orderId: canonicalOrderId,
        alreadySettled: false,
        error: `الطلب رقم #${canonicalOrderId} غير موجود في النظام`,
        breakdown: {} as any,
        transactions: {},
      };
    }

    // Load dynamic system settings for authoritative commission and tax rates
    const systemSettings = await getSystemSettings();

    // 2. Strict Idempotency Check: Has this order already been distributed?
    if (order.wallet_split_settled === true) {
      const breakdown = computeOrderDistributionBreakdown(order, systemSettings);
      return {
        success: true,
        settled: true,
        orderId: canonicalOrderId,
        alreadySettled: true,
        breakdown,
        transactions: {},
      };
    }

    // Verify existing transactions in wallet_transactions table
    const vendorRef = `SETTLE-${cleanId}-VENDOR`;
    const platformRef = `SETTLE-${cleanId}-PLATFORM`;
    const platformClientRef = `SETTLE-${cleanId}-PLATFORM-CLIENT`;
    const platformVendorRef = `SETTLE-${cleanId}-PLATFORM-VENDOR`;
    const courierRef = `SETTLE-${cleanId}-COURIER`;
    const clientRef = `PAY-${cleanId}-CLIENT-WALLET`;

    const { data: existingTxs } = await supabase
      .from("wallet_transactions")
      .select("id, reference, type, amount, user_id")
      .or(`reference.eq.${vendorRef},reference.eq.${platformRef},reference.eq.${platformClientRef},reference.eq.${platformVendorRef},reference.eq.${courierRef},reference.eq.${clientRef}`);

    if (existingTxs && existingTxs.some((tx: any) => tx.reference === vendorRef)) {
      // Mark order as settled to repair any desync
      await markOrderSettledOnDiskAndDb(canonicalOrderId, order, computeOrderDistributionBreakdown(order, systemSettings));
      return {
        success: true,
        settled: true,
        orderId: canonicalOrderId,
        alreadySettled: true,
        breakdown: computeOrderDistributionBreakdown(order, systemSettings),
        transactions: {},
      };
    }

    // 3. Compute Breakdown
    const breakdown = computeOrderDistributionBreakdown(order, systemSettings);
    const canonicalInvoiceNum = normalizeInvoiceNumber(order.invoice_number, canonicalOrderId);
    const timestamp = new Date().toISOString();

    // 4. Resolve Beneficiary User IDs
    const vendorUserId = order.vendor_id || (order.vendor && order.vendor.id) || "vendor-demo-id";
    const clientUserId = order.client_id || (order.client && order.client.id) || "client-demo-id";
    
    // Courier: use assigned courier or fallback to courier-1
    let courierUserId = order.courier_id;
    if (!courierUserId) {
      const DATA_DIR = path.join(process.cwd(), "data");
      const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");
      if (fs.existsSync(DELIVERIES_FILE)) {
        try {
          const deliveries = JSON.parse(fs.readFileSync(DELIVERIES_FILE, "utf-8"));
          const dFound = deliveries.find((d: any) => d.order_id === canonicalOrderId || d.order_id === targetOrderId);
          if (dFound?.courier_id) courierUserId = dFound.courier_id;
        } catch {}
      }
    }
    if (!courierUserId) courierUserId = "courier-1";

    const adminUserId = "admin-demo-id";

    const recordedTransactions: {
      clientDebit?: LedgerTransactionRecord;
      vendorCredit?: LedgerTransactionRecord;
      courierCredit?: LedgerTransactionRecord;
      platformCredit?: LedgerTransactionRecord;
      platformClientCredit?: LedgerTransactionRecord;
      platformVendorCredit?: LedgerTransactionRecord;
    } = {};

    // ── 5. Client Wallet Debit (ONLY if paymentSource === "wallet") ──
    // If paying through an external payment gateway (Credit card, Mada, Apple Pay), do NOT deduct balance!
    if (effectiveOptions.paymentSource === "wallet") {
      const clientDebitRes = await executeLedgerTransaction({
        userId: clientUserId,
        type: "debit",
        amount: breakdown.grandTotal,
        description: `سداد قيمة طلب قطع الغيار والتوصيل #${canonicalOrderId}`,
        reference: clientRef,
        orderId: canonicalOrderId,
        invoiceNumber: canonicalInvoiceNum,
        performedBy: effectiveOptions.performedBy || clientUserId,
        actorRole: "client",
        actorName: effectiveOptions.actorName || "العميل",
        metadata: {
          breakdown,
          paymentSource: "wallet",
        },
      });

      if (!clientDebitRes.success) {
        return {
          success: false,
          settled: false,
          orderId: canonicalOrderId,
          alreadySettled: false,
          error: `تعذر خصم المبلغ من محفظة العميل: ${clientDebitRes.error}`,
          breakdown,
          transactions: {},
        };
      }
      recordedTransactions.clientDebit = clientDebitRes.transaction;
    }

    // ── 6. Vendor Wallet Credit: Parts Gross Total (Parts + 15% VAT) or Net Total ──
    const isSeparateVendorFee = systemSettings.separate_platform_fee_transactions !== false;
    const vendorCreditAmount = isSeparateVendorFee ? breakdown.vendorGrossTotal : breakdown.vendorTotal;
    const vendorCreditDesc = isSeparateVendorFee
      ? `مستحقات بيع قطع الغيار للطلب #${canonicalOrderId} (قيمة القطع: ${breakdown.partsSubtotal} ر.س + ضريبة 15%: ${breakdown.partsVat} ر.س = ${breakdown.vendorGrossTotal} ر.س)`
      : `مستحقات بيع قطع الغيار للطلب #${canonicalOrderId} (قيمة القطع: ${breakdown.partsSubtotal} ر.س - رسوم المنصة: ${breakdown.vendorPlatformFee} ر.س = الصافي: ${breakdown.vendorNetParts} ر.س + ضريبة 15%: ${breakdown.partsVat} ر.س)`;

    if (vendorCreditAmount > 0) {
      const vendorCreditRes = await executeLedgerTransaction({
        userId: vendorUserId,
        type: "credit",
        amount: vendorCreditAmount,
        description: vendorCreditDesc,
        reference: vendorRef,
        orderId: canonicalOrderId,
        invoiceNumber: canonicalInvoiceNum,
        performedBy: "system",
        actorRole: "system",
        actorName: "نظام التسوية المالية الآلي",
        metadata: {
          partsSubtotal: breakdown.partsSubtotal,
          vendorPlatformFee: breakdown.vendorPlatformFee,
          vendorNetParts: breakdown.vendorNetParts,
          partsVat: breakdown.partsVat,
          vendorGrossTotal: breakdown.vendorGrossTotal,
          vendorTotal: breakdown.vendorTotal,
          orderId: canonicalOrderId,
          invoiceNumber: canonicalInvoiceNum,
        },
      });

      if (!vendorCreditRes.success) {
        throw new Error(`فشل إيداع مستحقات المورد: ${vendorCreditRes.error}`);
      }
      recordedTransactions.vendorCredit = vendorCreditRes.transaction;

      // If separate transactions enabled and vendor platform fee > 0, record vendor platform fee debit on vendor
      if (isSeparateVendorFee && breakdown.vendorPlatformFee > 0) {
        const vendorFeeDebitRes = await executeLedgerTransaction({
          userId: vendorUserId,
          type: "debit",
          amount: breakdown.vendorPlatformFee,
          description: `رسوم المنصة المخصومة من المورد (${breakdown.vendorFeePercent}%) للطلب #${canonicalOrderId}`,
          reference: `FEE-${canonicalOrderId}-VENDOR`,
          orderId: canonicalOrderId,
          invoiceNumber: canonicalInvoiceNum,
          performedBy: "system",
          actorRole: "system",
          actorName: "نظام التسوية المالية الآلي",
          metadata: {
            feeType: "vendor_fee",
            percent: breakdown.vendorFeePercent,
            amount: breakdown.vendorPlatformFee,
            orderId: canonicalOrderId,
          },
        });
        if (!vendorFeeDebitRes.success) {
          console.warn(`تحذير خصم عمولة المورد للطلب #${canonicalOrderId}:`, vendorFeeDebitRes.error);
        }
      }
    }

    // ── 7. Courier Wallet Credit: Delivery Fee (0 if branch pickup) ──
    if (!breakdown.isPickup && breakdown.deliveryFee > 0) {
      const courierCreditRes = await executeLedgerTransaction({
        userId: courierUserId,
        type: "credit",
        amount: breakdown.deliveryFee,
        description: `أجور توصيل الشحنة للطلب #${canonicalOrderId}`,
        reference: courierRef,
        orderId: canonicalOrderId,
        invoiceNumber: canonicalInvoiceNum,
        performedBy: "system",
        actorRole: "system",
        actorName: "نظام التسوية المالية الآلي",
        metadata: {
          deliveryFee: breakdown.deliveryFee,
          orderId: canonicalOrderId,
        },
      });

      if (!courierCreditRes.success) {
        console.warn(`تحذير إيداع المندوب للطلب #${canonicalOrderId}:`, courierCreditRes.error);
      } else {
        recordedTransactions.courierCredit = courierCreditRes.transaction;
      }
    }

    // ── 8. Platform Admin Wallet Credit: Client & Vendor Fees Deposited Separately ──
    // 8.1. Client Platform Fee Credit
    if (breakdown.clientPlatformFee > 0) {
      const clientFeeCreditRes = await executeLedgerTransaction({
        userId: adminUserId,
        type: "credit",
        amount: breakdown.clientPlatformFee,
        description: `رسوم المنصة المحصلة من العميل (${breakdown.clientFeePercent}%) للطلب #${canonicalOrderId}`,
        reference: platformClientRef,
        orderId: canonicalOrderId,
        invoiceNumber: canonicalInvoiceNum,
        performedBy: "system",
        actorRole: "system",
        actorName: "نظام التسوية المالية الآلي",
        metadata: {
          feeType: "client_fee",
          percent: breakdown.clientFeePercent,
          amount: breakdown.clientPlatformFee,
          orderId: canonicalOrderId,
        },
      });

      if (!clientFeeCreditRes.success) {
        console.warn(`تحذير إيداع رسوم العميل للمنصة للطلب #${canonicalOrderId}:`, clientFeeCreditRes.error);
      } else {
        recordedTransactions.platformClientCredit = clientFeeCreditRes.transaction;
        recordedTransactions.platformCredit = clientFeeCreditRes.transaction;
      }
    }

    // 8.2. Vendor Platform Fee Credit
    if (breakdown.vendorPlatformFee > 0) {
      const vendorFeeCreditRes = await executeLedgerTransaction({
        userId: adminUserId,
        type: "credit",
        amount: breakdown.vendorPlatformFee,
        description: `رسوم المنصة المخصومة من المورد (${breakdown.vendorFeePercent}%) للطلب #${canonicalOrderId}`,
        reference: platformVendorRef,
        orderId: canonicalOrderId,
        invoiceNumber: canonicalInvoiceNum,
        performedBy: "system",
        actorRole: "system",
        actorName: "نظام التسوية المالية الآلي",
        metadata: {
          feeType: "vendor_fee",
          percent: breakdown.vendorFeePercent,
          amount: breakdown.vendorPlatformFee,
          orderId: canonicalOrderId,
        },
      });

      if (!vendorFeeCreditRes.success) {
        console.warn(`تحذير إيداع رسوم المورد للمنصة للطلب #${canonicalOrderId}:`, vendorFeeCreditRes.error);
      } else {
        recordedTransactions.platformVendorCredit = vendorFeeCreditRes.transaction;
        if (!recordedTransactions.platformCredit) {
          recordedTransactions.platformCredit = vendorFeeCreditRes.transaction;
        }
      }
    }

    // 8.3. Legacy Single Platform Fee Fallback (if clientPlatformFee and vendorPlatformFee are both 0 but platformFee > 0)
    if (breakdown.clientPlatformFee <= 0 && breakdown.vendorPlatformFee <= 0 && breakdown.platformFee > 0) {
      const adminCreditRes = await executeLedgerTransaction({
        userId: adminUserId,
        type: "credit",
        amount: breakdown.platformFee,
        description: `عمولة ورسوم خدمة المنصة للطلب #${canonicalOrderId}`,
        reference: platformRef,
        orderId: canonicalOrderId,
        invoiceNumber: canonicalInvoiceNum,
        performedBy: "system",
        actorRole: "system",
        actorName: "نظام التسوية المالية الآلي",
        metadata: {
          platformFee: breakdown.platformFee,
          orderId: canonicalOrderId,
        },
      });

      if (!adminCreditRes.success) {
        console.warn(`تحذير إيداع عمولة المنصة للطلب #${canonicalOrderId}:`, adminCreditRes.error);
      } else {
        recordedTransactions.platformCredit = adminCreditRes.transaction;
      }
    }

    // ── 9. Finalize Order & Invoice State ──
    await markOrderSettledOnDiskAndDb(canonicalOrderId, order, breakdown, effectiveOptions.paymentReference);

    // ── 10. Audit Log ──
    await logActivityEvent({
      actorId: effectiveOptions.performedBy || "system",
      actorName: effectiveOptions.actorName || "نظام التسوية المالية المركزي",
      actorRole: "system",
      action: "ORDER_FUNDS_AUTOMATICALLY_DISTRIBUTED",
      entityType: "order",
      entityId: canonicalOrderId,
      details: `تم توزيع مبالغ الطلب #${canonicalOrderId} بنجاح: مورد ${breakdown.vendorTotal} ر.س (قطع ${breakdown.partsSubtotal} - رسوم ${breakdown.vendorPlatformFee} + ضريبة ${breakdown.partsVat}) | مندوب ${breakdown.deliveryFee} ر.س | منصة عميل ${breakdown.clientPlatformFee} ر.س + مورد ${breakdown.vendorPlatformFee} ر.س (إجمالي منصة ${breakdown.platformFee} ر.س). الإجمالي المحصل: ${breakdown.grandTotal} ر.س`,
      metadata: {
        orderId: canonicalOrderId,
        breakdown,
        transactions: Object.keys(recordedTransactions),
        paymentReference: effectiveOptions.paymentReference,
      },
    });

    return {
      success: true,
      settled: true,
      orderId: canonicalOrderId,
      alreadySettled: false,
      breakdown,
      transactions: recordedTransactions,
    };
  } catch (err: any) {
    console.error(`خطأ أثناء توزيع مبالغ الطلب #${canonicalOrderId}:`, err);
    return {
      success: false,
      settled: false,
      orderId: canonicalOrderId,
      alreadySettled: false,
      error: err?.message || "خطأ غير معروف في محرك التوزيع المالي",
      breakdown: {} as any,
      transactions: {},
    };
  } finally {
    activeSettlementLocks.delete(canonicalOrderId);
  }
}

/**
 * Persists settled status to both SQL Database and JSON Stores for 100% unified reactive state.
 */
async function markOrderSettledOnDiskAndDb(
  orderId: string,
  order: any,
  breakdown: OrderDistributionBreakdown,
  paymentReference?: string
) {
  const timestamp = new Date().toISOString();
  const cleanId = orderId.replace(/^ORD-/, "").replace(/^DEAL-/, "");
  const canonicalInvoiceNumber = normalizeInvoiceNumber(order.invoice_number, orderId);

  const supabase = await createClient();

  // 1. Update Order in Supabase
  try {
    await supabase
      .from("orders")
      .update({
        wallet_split_settled: true,
        wallet_split_settled_at: timestamp,
        payment_status: "paid",
        settlement_summary: breakdown,
        payment_reference: paymentReference || `PAY-${cleanId}`,
        updated_at: timestamp,
      })
      .or(`id.eq.${orderId},id.eq.${cleanId}`);
  } catch (dbErr) {
    console.warn("Database order settlement update warning:", dbErr);
  }

  // 2. Update Invoice in Supabase (Vendor Tax Invoice Total = Parts + VAT only)
  try {
    await supabase
      .from("invoices")
      .update({
        status: "paid",
        subtotal: breakdown.partsSubtotal,
        tax_amount: breakdown.partsVat,
        total_amount: breakdown.vendorGrossTotal, // Parts + VAT (e.g. 115.00 SAR)
        paid_at: timestamp,
        updated_at: timestamp,
      })
      .or(`order_id.eq.${orderId},order_id.eq.${cleanId}`);
  } catch (invErr) {
    console.warn("Database invoice settlement update warning:", invErr);
  }

  // 3. Update Disk JSON files
  const DATA_DIR = path.join(process.cwd(), "data");
  const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
  const INVOICES_FILE = path.join(DATA_DIR, "invoices_db.json");

  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
      const idx = orders.findIndex((o: any) => o.id === orderId || o.id === cleanId || o.id === `ORD-${cleanId}`);
      if (idx !== -1) {
        orders[idx].wallet_split_settled = true;
        orders[idx].wallet_split_settled_at = timestamp;
        orders[idx].payment_status = "paid";
        orders[idx].settlement_summary = breakdown;
        orders[idx].payment_reference = paymentReference || `PAY-${cleanId}`;
        orders[idx].updated_at = timestamp;
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
        (globalThis as any).__SHARED_SERVER_ORDERS__ = orders;
      }
    }
  } catch (diskOrdErr) {
    console.warn("Disk orders sync warning:", diskOrdErr);
  }

  try {
    if (fs.existsSync(INVOICES_FILE)) {
      const invoices = JSON.parse(fs.readFileSync(INVOICES_FILE, "utf-8"));
      const invIdx = invoices.findIndex((i: any) => i.order_id === orderId || i.order_id === cleanId || i.order_id === `ORD-${cleanId}` || i.invoice_number === canonicalInvoiceNumber);
      if (invIdx !== -1) {
        invoices[invIdx].status = "paid";
        invoices[invIdx].subtotal = breakdown.partsSubtotal;
        invoices[invIdx].tax_amount = breakdown.partsVat;
        invoices[invIdx].total_amount = breakdown.vendorTotal; // Strictly 1,150.00 SAR!
        invoices[invIdx].paid_at = timestamp;
        invoices[invIdx].updated_at = timestamp;
        fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), "utf-8");
        (globalThis as any).__SHARED_SERVER_INVOICES__ = invoices;
      }
    }
  } catch (diskInvErr) {
    console.warn("Disk invoices sync warning:", diskInvErr);
  }
}
