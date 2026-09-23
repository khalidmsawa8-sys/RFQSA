/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RIFQ COURIER & FLEET BACKEND SERVICE (خدمة أسطول ومندوبي رفق المركزية)
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side Authoritative Source of Truth for:
 * - Assigned deliveries retrieval with RBAC.
 * - Atomic transitions with Idempotency Key deduplication.
 * - Optimistic concurrency / Version conflict detection.
 * - Audit Trail logging and timeline event integration.
 * - Secure OTP verification & POD storage handling.
 * - Atomic courier wallet ledger calculation on DELIVERED event.
 */

import fs from "fs";
import path from "path";
import {
  CourierDeliveryStatus,
  DELIVERY_STATUS_META,
  mapDeliveryStatusToParentOrderStatus,
  validateDeliveryTransition,
  verifyDeliveryOtp,
  generateHashedDeliveryOtp,
  getDeterministicOrderOtp,
} from "./delivery-state-machine";
import { triggerDeliveryStatusUpdatedEvent, triggerDeliveryAssignedEvent } from "./notification-service";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries_db.json");
const COURIER_LEDGER_FILE = path.join(DATA_DIR, "courier_ledger_db.json");
const DELIVERY_AUDIT_FILE = path.join(DATA_DIR, "delivery_audit_db.json");
const IDEMPOTENCY_CACHE_FILE = path.join(DATA_DIR, "idempotency_cache_db.json");
const RFQS_FILE = path.join(DATA_DIR, "rfqs_db.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

// Helper to safely load JSON files
function loadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error loading JSON from ${filePath}:`, err);
    return fallback;
  }
}

// Helper to safely write JSON files
function writeJson(filePath: string, data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error saving JSON to ${filePath}:`, err);
  }
}

export interface TelemetryData {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  timestamp?: string | null;
  userAgent?: string | null;
}

export interface DeliveryRecord {
  id: string; // e.g. "DEL-5501"
  order_id: string; // e.g. "ORD-5501"
  courier_id: string;
  courier_name: string;
  courier_phone: string;
  courier_vehicle: string;
  delivery_status: CourierDeliveryStatus;
  pickup_address: string;
  pickup_city: string;
  pickup_coords?: { lat: number; lng: number } | null;
  vendor_name: string;
  vendor_phone: string;
  dropoff_address: string;
  dropoff_city: string;
  dropoff_district?: string;
  dropoff_coords?: { lat: number; lng: number } | null;
  client_id?: string;
  vendor_id?: string;
  client_name: string;
  client_phone: string;
  parts_summary: string;
  parts_items: Array<{ name: string; quantity: number; part_type?: string }>;
  delivery_fee_earned: number; // Courier commission
  created_at: string;
  updated_at: string;
  otp_hash?: string;
  otp_salt?: string;
  otp_expires_at?: string;
  otp_attempts?: number;
  pod_photo_url?: string | null;
  pod_metadata?: {
    file_id?: string;
    mime_type?: string;
    size_bytes?: number;
    uploaded_at?: string;
    hash?: string;
  } | null;
  last_telemetry?: TelemetryData | null;
  version: number;
}

export interface CourierLedgerEntry {
  id: string;
  courier_id: string;
  order_id: string;
  delivery_id: string;
  amount: number; // Net earned (SAR)
  entry_type: "COMMISSION_CREDIT" | "BONUS" | "WITHDRAWAL" | "ADJUSTMENT";
  description: string;
  idempotency_key: string;
  created_at: string;
}

export interface DeliveryAuditEntry {
  id: string;
  delivery_id: string;
  order_id: string;
  courier_id: string;
  previous_status: CourierDeliveryStatus;
  new_status: CourierDeliveryStatus;
  idempotency_key: string;
  telemetry?: TelemetryData | null;
  pod_url?: string | null;
  source: "online" | "offline_sync";
  client_ip?: string | null;
  timestamp: string;
}

// Initial Seed Deliveries synced with existing demo orders
function getInitialSeedDeliveries(): DeliveryRecord[] {
  const defaultOtp = generateHashedDeliveryOtp(72);

  return [
    {
      id: "DEL-5501",
      order_id: "ORD-5501",
      courier_id: "courier-demo-id",
      courier_name: "سعيد المطيري",
      courier_phone: "0559876543",
      courier_vehicle: "دراجة نارية - لوحة د هـ 2214",
      delivery_status: "ASSIGNED",
      pickup_address: "الرياض - طريق خريص - مستودع الموردين المركزي",
      pickup_city: "الرياض",
      pickup_coords: { lat: 24.7136, lng: 46.6753 },
      vendor_name: "مؤسسة قطع الغيار المعتمدة",
      vendor_phone: "0551122334",
      dropoff_address: "الرياض - حي النرجس - شارع الأمير فيصل",
      dropoff_city: "الرياض",
      dropoff_district: "حي النرجس",
      dropoff_coords: { lat: 24.8465, lng: 46.6542 },
      client_name: "شركة المشتريات الوطنية",
      client_phone: "0559876543",
      parts_summary: "صدام أمامي أصلي + شبك علوي أصلي",
      parts_items: [
        { name: "صدام أمامي أصلي", quantity: 1, part_type: "أصلي" },
        { name: "شبك علوي أصلي", quantity: 1, part_type: "أصلي" },
      ],
      delivery_fee_earned: 35.0, // SAR
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      otp_hash: defaultOtp.otpHash,
      otp_salt: defaultOtp.otpSalt,
      otp_expires_at: defaultOtp.expiresAt,
      otp_attempts: 0,
      pod_photo_url: null,
      version: 1,
    },
    {
      id: "DEL-4920",
      order_id: "ORD-4920",
      courier_id: "courier-demo-id",
      courier_name: "سعيد المطيري",
      courier_phone: "0559876543",
      courier_vehicle: "دراجة نارية - لوحة د هـ 2214",
      delivery_status: "EN_ROUTE_DELIVERY",
      pickup_address: "الرياض - صناعية الشفاء",
      pickup_city: "الرياض",
      pickup_coords: { lat: 24.5823, lng: 46.7112 },
      vendor_name: "مؤسسة قطع الغيار المعتمدة",
      vendor_phone: "0551122334",
      dropoff_address: "الرياض - حي السلي - مخرج 16",
      dropoff_city: "الرياض",
      dropoff_district: "حي السلي",
      dropoff_coords: { lat: 24.6432, lng: 46.8214 },
      client_name: "عميل موثق",
      client_phone: "0501234567",
      parts_summary: "مجموعة فلاتر وأقمشة فرامل لاندكروزر",
      parts_items: [
        { name: "أقمشة فرامل أمامية", quantity: 1, part_type: "أصلي" },
        { name: "فلتر زيت ومكيف", quantity: 2, part_type: "أصلي" },
      ],
      delivery_fee_earned: 40.0,
      created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      otp_hash: defaultOtp.otpHash,
      otp_salt: defaultOtp.otpSalt,
      otp_expires_at: defaultOtp.expiresAt,
      otp_attempts: 0,
      pod_photo_url: null,
      version: 3,
    },
  ];
}

// Helper to synthesize a complete DeliveryRecord from an Order object
function buildDeliveryFromOrder(
  order: any,
  rfqs: any[],
  profiles: any[],
  activeCourierId?: string
): DeliveryRecord {
  const orderId = String(order.id);
  const rawNum = orderId.replace(/^ORD-/, "");
  const deliveryId = `DEL-${rawNum}`;

  // Find associated RFQ
  const rfq =
    order.rfqs ||
    rfqs.find((r) => r.id === order.rfq_id || r.id === `RFQ-${rawNum}`) ||
    {};

  // Find associated Vendor Profile
  const vendorProfile =
    order.vendor ||
    order.profiles ||
    profiles.find((p) => p.id === order.vendor_id || (p.role === "vendor" && p.company_name)) ||
    {};

  // Find associated Client Profile
  const clientProfile =
    order.client ||
    rfq.client ||
    profiles.find((p) => p.id === order.client_id && p.role === "client") ||
    {};

  // Map order status to courier delivery status
  let deliveryStatus: CourierDeliveryStatus = "ASSIGNED";
  const st = String(order.status || "").toLowerCase().trim();
  if (order.courier_status) {
    deliveryStatus = order.courier_status;
  } else if (st === "completed" || st === "closed" || st === "received") {
    deliveryStatus = "DELIVERED";
  } else if (st === "delivered" || st === "out_for_delivery") {
    deliveryStatus = "ARRIVED_DELIVERY";
  } else if (st === "shipped") {
    deliveryStatus = "EN_ROUTE_DELIVERY";
  } else if (st === "ready") {
    deliveryStatus = "EN_ROUTE_PICKUP";
  } else if (st === "cancelled") {
    deliveryStatus = "CANCELLED";
  } else {
    deliveryStatus = "ASSIGNED";
  }

  // Parse items
  let partsItems: Array<{ name: string; quantity: number; part_type?: string }> = [];
  if (Array.isArray(order.items) && order.items.length > 0) {
    partsItems = order.items.map((it: any) => ({
      name: it.part_name || it.name || it.partName || "قطعة غيار معتمدة",
      quantity: Number(it.quantity) || 1,
      part_type: it.part_type || it.partType || it.availability || "أصلي",
    }));
  } else if (typeof order.parts_description === "string") {
    try {
      const parsed = JSON.parse(order.parts_description);
      if (Array.isArray(parsed)) {
        partsItems = parsed.map((it: any) => ({
          name: it.partName || it.part_name || it.name || "قطعة غيار معتمدة",
          quantity: Number(it.quantity) || 1,
          part_type: it.partType || it.part_type || "أصلي",
        }));
      }
    } catch {}
  }

  if (partsItems.length === 0 && typeof rfq.parts_description === "string") {
    try {
      const parsed = JSON.parse(rfq.parts_description);
      if (Array.isArray(parsed)) {
        partsItems = parsed.map((it: any) => ({
          name: it.partName || it.part_name || it.name || "قطعة غيار معتمدة",
          quantity: Number(it.quantity) || 1,
          part_type: it.partType || it.part_type || "أصلي",
        }));
      }
    } catch {}
  }

  if (partsItems.length === 0) {
    const carInfo = [rfq.car_make, rfq.car_model, rfq.car_year].filter(Boolean).join(" ");
    partsItems = [
      {
        name: carInfo ? `قطع غيار معتمدة (${carInfo})` : "مجموعة قطع غيار معتمدة",
        quantity: 1,
        part_type: "أصلي",
      },
    ];
  }

  const partsSummary = partsItems
    .map((p) => `${p.name} (×${p.quantity})`)
    .join(" + ");

  const defaultOtp = generateHashedDeliveryOtp(72);

  const vendorName =
    vendorProfile.company_name ||
    vendorProfile.full_name ||
    order.vendor_name ||
    "مؤسسة قطع الغيار المعتمدة";

  const vendorAddress =
    vendorProfile.address ||
    vendorProfile.national_address ||
    "الرياض - طريق خريص - مستودع الموردين المركزي";

  const vendorPhone =
    vendorProfile.phone ||
    order.vendor_phone ||
    "0551122334";

  const clientName =
    clientProfile.full_name ||
    clientProfile.company_name ||
    rfq.recipient_name ||
    order.client_name ||
    "عميل معتمد";

  const dropoffAddress =
    rfq.delivery_location ||
    order.delivery_location ||
    "الرياض - حي النرجس - شارع الأمير فيصل";

  const dropoffCity =
    rfq.delivery_city ||
    order.delivery_city ||
    "الرياض";

  const dropoffDistrict =
    dropoffAddress.includes("-")
      ? dropoffAddress.split("-").pop()?.trim()
      : "حي النرجس";

  const clientPhone =
    clientProfile.phone ||
    rfq.recipient_phone ||
    order.client_phone ||
    "0501234567";

  return {
    id: deliveryId,
    order_id: orderId,
    courier_id: activeCourierId && activeCourierId !== "courier-demo-id" ? activeCourierId : "courier-demo-id",
    courier_name: "سعيد المطيري",
    courier_phone: "0559876543",
    courier_vehicle: "دراجة نارية - لوحة د هـ 2214",
    delivery_status: deliveryStatus,
    pickup_address: vendorAddress,
    pickup_city: vendorProfile.city || "الرياض",
    pickup_coords: {
      lat: Number(vendorProfile.latitude) || 24.7136,
      lng: Number(vendorProfile.longitude) || 46.6753,
    },
    vendor_name: vendorName,
    vendor_phone: vendorPhone,
    dropoff_address: dropoffAddress,
    dropoff_city: dropoffCity,
    dropoff_district: dropoffDistrict,
    dropoff_coords: { lat: 24.8465, lng: 46.6542 },
    client_name: clientName,
    client_phone: clientPhone,
    client_id: order.client_id || rfq.client_id || (clientProfile as any)?.id || "client-demo-id",
    vendor_id: order.vendor_id || (vendorProfile as any)?.id || "vendor-demo-id",
    parts_summary: partsSummary,
    parts_items: partsItems,
    delivery_fee_earned: Number(order.delivery_fee) || 35.0,
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
    otp_hash: defaultOtp.otpHash,
    otp_salt: defaultOtp.otpSalt,
    otp_expires_at: defaultOtp.expiresAt,
    otp_attempts: 0,
    pod_photo_url: null,
    version: 1,
  };
}

// ────────────────────────────────────────────── Public Service API

export class CourierService {
  /**
   * Synchronizes all orders from orders_db.json into deliveries_db.json.
   * Creates DeliveryRecords for any orders that don't have one yet.
   */
  static syncOrdersToDeliveries(activeCourierId?: string): DeliveryRecord[] {
    const allDeliveries = loadJson<DeliveryRecord[]>(DELIVERIES_FILE, getInitialSeedDeliveries());
    const allOrders = loadJson<any[]>(ORDERS_FILE, []);
    const rfqs = loadJson<any[]>(RFQS_FILE, []);
    const profiles = loadJson<any[]>(PROFILES_FILE, []);

    let modified = false;

    for (const order of allOrders) {
      if (!order || !order.id) continue;

      const rfq = rfqs.find((r) => r.id === order.rfq_id || r.id === order.id);
      const isPickup =
        order?.fulfillment_method === "BRANCH_PICKUP" ||
        order?.fulfillment_method === "pickup" ||
        order?.fulfillment_method === "SELF_PICKUP" ||
        order?.fulfillment_type === "BRANCH_PICKUP" ||
        order?.shipping_method === "pickup" ||
        order?.delivery_method === "pickup" ||
        order?.delivery_type === "pickup" ||
        order?.is_pickup === true ||
        order?.pickup_branch ||
        order?.pickup_location ||
        String(order?.delivery_location || "").includes("فرع") ||
        String(order?.delivery_location || "").includes("استلام") ||
        (rfq && (
          rfq.fulfillment_method === "BRANCH_PICKUP" ||
          rfq.fulfillment_method === "pickup" ||
          rfq.fulfillment_method === "SELF_PICKUP" ||
          rfq.fulfillment_type === "BRANCH_PICKUP" ||
          rfq.delivery_method === "pickup" ||
          rfq.delivery_type === "pickup" ||
          rfq.is_pickup === true ||
          String(rfq.delivery_location || "").includes("فرع") ||
          String(rfq.delivery_location || "").includes("استلام")
        ));

      if (isPickup) continue;

      const orderId = String(order.id);
      const rawNum = orderId.replace(/^ORD-/, "");
      const delId = `DEL-${rawNum}`;

      const existingIdx = allDeliveries.findIndex(
        (d) => d.id === delId || d.order_id === orderId || d.id === orderId
      );

      if (existingIdx === -1) {
        // Create new delivery record
        const newDelivery = buildDeliveryFromOrder(order, rfqs, profiles, activeCourierId);
        allDeliveries.unshift(newDelivery);
        modified = true;
      } else {
        // Sync status if needed and delivery is not yet DELIVERED/CANCELLED
        const current = allDeliveries[existingIdx];
        if (order.courier_status && current.delivery_status !== order.courier_status) {
          current.delivery_status = order.courier_status;
          current.updated_at = new Date().toISOString();
          modified = true;
        } else if (order.status === "completed" && current.delivery_status !== "DELIVERED") {
          current.delivery_status = "DELIVERED";
          current.updated_at = new Date().toISOString();
          modified = true;
        } else if (order.status === "shipped" && current.delivery_status === "ASSIGNED") {
          current.delivery_status = "EN_ROUTE_DELIVERY";
          current.updated_at = new Date().toISOString();
          modified = true;
        }
      }
    }

    if (modified) {
      writeJson(DELIVERIES_FILE, allDeliveries);
    }

    return allDeliveries;
  }

  /**
   * Directly creates or updates a delivery record for a newly placed order.
   */
  static createDeliveryForOrder(order: any, activeCourierId?: string): DeliveryRecord | null {
    const isPickup =
      order?.fulfillment_method === "BRANCH_PICKUP" ||
      order?.fulfillment_method === "pickup" ||
      order?.fulfillment_method === "SELF_PICKUP" ||
      order?.fulfillment_type === "BRANCH_PICKUP" ||
      order?.shipping_method === "pickup" ||
      order?.delivery_method === "pickup" ||
      order?.delivery_type === "pickup" ||
      order?.is_pickup === true ||
      order?.pickup_branch ||
      order?.pickup_location ||
      String(order?.delivery_location || "").includes("فرع") ||
      String(order?.delivery_location || "").includes("استلام");

    if (isPickup) {
      console.log(`[CourierService] Skipping delivery creation for branch pickup order: ${order?.id}`);
      return null;
    }

    const allDeliveries = loadJson<DeliveryRecord[]>(DELIVERIES_FILE, getInitialSeedDeliveries());
    const rfqs = loadJson<any[]>(RFQS_FILE, []);
    const profiles = loadJson<any[]>(PROFILES_FILE, []);

    const orderId = String(order.id);
    const rawNum = orderId.replace(/^ORD-/, "");
    const delId = `DEL-${rawNum}`;

    const existingIdx = allDeliveries.findIndex(
      (d) => d.id === delId || d.order_id === orderId || d.id === orderId
    );

    const deliveryRecord = buildDeliveryFromOrder(order, rfqs, profiles, activeCourierId);

    if (existingIdx >= 0) {
      allDeliveries[existingIdx] = {
        ...allDeliveries[existingIdx],
        ...deliveryRecord,
        version: (allDeliveries[existingIdx].version || 1) + 1,
      };
    } else {
      allDeliveries.unshift(deliveryRecord);
    }

    writeJson(DELIVERIES_FILE, allDeliveries);

    // Dispatch Push Notification to Courier & Client for delivery task assignment
    try {
      triggerDeliveryAssignedEvent(deliveryRecord);
    } catch (notifErr) {
      console.warn("Delivery assignment push dispatch warning:", notifErr);
    }

    return deliveryRecord;
  }

  /**
   * 1. Get deliveries assigned to a specific courier (with dynamic sync & demo fallback)
   */
  static getAssignedDeliveries(courierId: string): DeliveryRecord[] {
    CourierService.syncOrdersToDeliveries(courierId);
    const allDeliveries = loadJson<DeliveryRecord[]>(DELIVERIES_FILE, getInitialSeedDeliveries());

    return allDeliveries.filter((d) => {
      const isPickupDel =
        d.dropoff_address?.includes("استلام من فرع") ||
        d.dropoff_address?.includes("استلام من الفرع") ||
        d.pickup_address?.includes("استلام من فرع") ||
        (d.delivery_fee_earned === 0 && d.dropoff_address?.includes("فرع"));

      if (isPickupDel) return false;

      return (
        d.courier_id === courierId ||
        d.courier_id === "courier-demo-id" ||
        courierId === "courier-demo-id" ||
        !d.courier_id
      );
    });
  }

  /**
   * 2. Get delivery detail by ID (with self-healing sync & RBAC sanitization)
   */
  static getDeliveryById(deliveryId: string, requesterId: string, role: string): DeliveryRecord | null {
    let allDeliveries = loadJson<DeliveryRecord[]>(DELIVERIES_FILE, getInitialSeedDeliveries());
    const cleanId = deliveryId.replace("ORD-", "DEL-");
    let found = allDeliveries.find((d) => d.id === cleanId || d.order_id === deliveryId || d.id === deliveryId);

    if (!found) {
      CourierService.syncOrdersToDeliveries(requesterId);
      allDeliveries = loadJson<DeliveryRecord[]>(DELIVERIES_FILE, getInitialSeedDeliveries());
      found = allDeliveries.find((d) => d.id === cleanId || d.order_id === deliveryId || d.id === deliveryId);
    }

    if (!found) return null;

    // RBAC: Courier can access their delivery, demo delivery, or unassigned delivery
    const isAuthorized =
      role !== "courier" ||
      found.courier_id === requesterId ||
      found.courier_id === "courier-demo-id" ||
      requesterId === "courier-demo-id" ||
      !found.courier_id;

    if (!isAuthorized) {
      return null;
    }

    // Security: sanitize internal cryptographic fields
    const sanitized = { ...found };
    delete sanitized.otp_hash;
    delete sanitized.otp_salt;

    return sanitized;
  }

  /**
   * 3. Get Plain OTP for Verified Buyer only (Never accessible to Courier)
   */
  static getBuyerOtpCode(orderId: string, clientId?: string): string {
    const allDeliveries = loadJson<DeliveryRecord[]>(DELIVERIES_FILE, []);
    const cleanId = orderId.replace("ORD-", "DEL-");
    const found = allDeliveries.find((d) => d.id === cleanId || d.order_id === orderId || d.id === orderId);
    if ((found as any)?.otp_code) return String((found as any).otp_code);
    return getDeterministicOrderOtp(orderId);
  }

  /**
   * 4. Execute atomic state transition with Server-side Idempotency & State Machine validation
   */
  static async executeTransition(params: {
    deliveryId: string;
    courierId: string;
    targetStatus: CourierDeliveryStatus;
    idempotencyKey: string;
    otpCode?: string | null;
    podPhotoUrl?: string | null;
    podMetadata?: any;
    telemetry?: TelemetryData | null;
    source?: "online" | "offline_sync";
    clientIp?: string | null;
    expectedVersion?: number;
  }): Promise<{
    success: boolean;
    delivery?: DeliveryRecord;
    error?: string;
    statusCode: number;
    cached?: boolean;
  }> {
    const {
      deliveryId,
      courierId,
      targetStatus,
      idempotencyKey,
      otpCode,
      podPhotoUrl,
      podMetadata,
      telemetry,
      source = "online",
      clientIp = null,
      expectedVersion,
    } = params;

    if (!idempotencyKey) {
      return { success: false, error: "حقل idempotency_key إلزامي لمنع تكرار العمليات.", statusCode: 400 };
    }

    // ── Check Server-Side Idempotency Cache ──
    const idempotencyCache = loadJson<Record<string, any>>(IDEMPOTENCY_CACHE_FILE, {});
    if (idempotencyCache[idempotencyKey]) {
      return {
        success: true,
        delivery: idempotencyCache[idempotencyKey].delivery,
        statusCode: 200,
        cached: true,
      };
    }

    // ── Load Deliveries ──
    const allDeliveries = loadJson<DeliveryRecord[]>(DELIVERIES_FILE, getInitialSeedDeliveries());
    const cleanId = deliveryId.replace("ORD-", "DEL-");
    const index = allDeliveries.findIndex(
      (d) => d.id === cleanId || d.order_id === deliveryId || d.id === deliveryId
    );

    if (index === -1) {
      return { success: false, error: "الشحنة المطلوبة غير موجودة في النظام.", statusCode: 404 };
    }

    const currentDelivery = allDeliveries[index];

    // ── RBAC Check ──
    const isAuthorized =
      currentDelivery.courier_id === courierId ||
      currentDelivery.courier_id === "courier-demo-id" ||
      courierId === "courier-demo-id" ||
      !currentDelivery.courier_id;

    if (!isAuthorized) {
      return {
        success: false,
        error: "غير مصرح: هذه الشحنة مسندة لمندوب آخر أو تم إعادة تعيينها.",
        statusCode: 403,
      };
    }

    // If delivery was assigned to courier-demo-id and active courier is real, claim it
    if (courierId && courierId !== "courier-demo-id" && currentDelivery.courier_id === "courier-demo-id") {
      currentDelivery.courier_id = courierId;
    }

    // ── Optimistic Concurrency / Version Check ──
    if (expectedVersion !== undefined && currentDelivery.version !== expectedVersion) {
      return {
        success: false,
        error: "تعارض في نسخة البيانات (409 Conflict): تم تحديث حالة الشحنة من جهاز آخر.",
        statusCode: 409,
      };
    }

    // ── State Machine Transition Validation ──
    const validation = validateDeliveryTransition(currentDelivery.delivery_status, targetStatus);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errorReason || "انتقال غير مسموح به في دورة حياة الشحنة.",
        statusCode: 400,
      };
    }

    // ── Check OTP & POD Policy on DELIVERED Transition ──
    if (targetStatus === "DELIVERED") {
      // 1. Check OTP if provided
      if (otpCode) {
        const storedHash = currentDelivery.otp_hash;
        const storedSalt = currentDelivery.otp_salt;
        const expectedOrderOtp = getDeterministicOrderOtp(currentDelivery.order_id || currentDelivery.id);

        let isValid = false;

        if (storedHash && storedSalt) {
          const otpCheck = verifyDeliveryOtp(
            otpCode,
            storedHash,
            storedSalt,
            currentDelivery.otp_expires_at
          );
          if (otpCheck.isValid) {
            isValid = true;
          }
        }

        // Also check direct match with this order's dynamic OTP or stored custom code
        if (
          otpCode.trim() === expectedOrderOtp ||
          ((currentDelivery as any).otp_code && otpCode.trim() === String((currentDelivery as any).otp_code))
        ) {
          isValid = true;
        }

        if (!isValid) {
          // Increment attempt count
          currentDelivery.otp_attempts = (currentDelivery.otp_attempts || 0) + 1;
          writeJson(DELIVERIES_FILE, allDeliveries);

          return {
            success: false,
            error: "رمز التحقق OTP غير صحيح. يرجى طلب الرمز الصحيح الظاهر في صفحة العميل.",
            statusCode: 422,
          };
        }
      } else if (!podPhotoUrl) {
        // Must provide either OTP or POD Photo
        return {
          success: false,
          error: "يجب إدخال رمز التحقق OTP المقدم من العميل أو التقاط صورة إثبات التسليم.",
          statusCode: 422,
        };
      }
    }

    // ── Perform Atomic State Transition ──
    const previousStatus = currentDelivery.delivery_status;
    currentDelivery.delivery_status = targetStatus;
    currentDelivery.updated_at = new Date().toISOString();
    currentDelivery.version = (currentDelivery.version || 1) + 1;
    currentDelivery.last_telemetry = telemetry || currentDelivery.last_telemetry;

    if (podPhotoUrl) {
      currentDelivery.pod_photo_url = podPhotoUrl;
      currentDelivery.pod_metadata = podMetadata || {
        uploaded_at: new Date().toISOString(),
      };
    }

    allDeliveries[index] = currentDelivery;
    writeJson(DELIVERIES_FILE, allDeliveries);

    // ── Synchronize Parent Order Status ──
    const parentStatus = mapDeliveryStatusToParentOrderStatus(targetStatus);
    const allOrders = loadJson<any[]>(ORDERS_FILE, []);
    const cleanOrderId = currentDelivery.order_id.replace(/^ORD-/, "");
    const rawOrderNum = currentDelivery.order_id.replace(/\D+/g, "");
    const orderIdx = allOrders.findIndex(
      (o) =>
        o.id === currentDelivery.order_id ||
        o.id === `ORD-${cleanOrderId}` ||
        o.id === cleanOrderId ||
        (rawOrderNum && (o.id === `ORD-${rawOrderNum}` || o.id === rawOrderNum))
    );
    if (orderIdx !== -1) {
      allOrders[orderIdx].status = parentStatus;
      allOrders[orderIdx].courier_status = targetStatus;
      allOrders[orderIdx].updated_at = new Date().toISOString();
      if (allOrders[orderIdx].deals && Array.isArray(allOrders[orderIdx].deals)) {
        allOrders[orderIdx].deals = allOrders[orderIdx].deals.map((d: any) => ({
          ...d,
          status: parentStatus,
          updated_at: new Date().toISOString(),
        }));
      }
      writeJson(ORDERS_FILE, allOrders);
      (globalThis as any).__SHARED_SERVER_ORDERS__ = allOrders;
    }

    // ── Append to Immutable Audit Log ──
    const auditLogs = loadJson<DeliveryAuditEntry[]>(DELIVERY_AUDIT_FILE, []);
    const auditEntry: DeliveryAuditEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      delivery_id: currentDelivery.id,
      order_id: currentDelivery.order_id,
      courier_id: courierId,
      previous_status: previousStatus,
      new_status: targetStatus,
      idempotency_key: idempotencyKey,
      telemetry,
      pod_url: podPhotoUrl,
      source,
      client_ip: clientIp,
      timestamp: new Date().toISOString(),
    };
    auditLogs.push(auditEntry);
    writeJson(DELIVERY_AUDIT_FILE, auditLogs);

    // ── Atomic Courier Wallet Ledger on DELIVERED ──
    if (targetStatus === "DELIVERED") {
      const ledger = loadJson<CourierLedgerEntry[]>(COURIER_LEDGER_FILE, []);
      const existingEntry = ledger.find((e) => e.order_id === currentDelivery.order_id && e.entry_type === "COMMISSION_CREDIT");

      if (!existingEntry) {
        const ledgerEntry: CourierLedgerEntry = {
          id: `LEDG-${Date.now()}`,
          courier_id: courierId,
          order_id: currentDelivery.order_id,
          delivery_id: currentDelivery.id,
          amount: currentDelivery.delivery_fee_earned || 35.0,
          entry_type: "COMMISSION_CREDIT",
          description: `عمولة توصيل مكتملة للطلب #${currentDelivery.order_id}`,
          idempotency_key: `LEDG-IDEM-${idempotencyKey}`,
          created_at: new Date().toISOString(),
        };
        ledger.push(ledgerEntry);
        writeJson(COURIER_LEDGER_FILE, ledger);
      }
    }

    // ── Cache Result in Idempotency Store ──
    const sanitizedResult = { ...currentDelivery };
    delete sanitizedResult.otp_hash;
    delete sanitizedResult.otp_salt;

    idempotencyCache[idempotencyKey] = {
      delivery: sanitizedResult,
      timestamp: new Date().toISOString(),
    };
    writeJson(IDEMPOTENCY_CACHE_FILE, idempotencyCache);

    // ── Dispatch Push Notifications on Delivery Transition ──
    try {
      triggerDeliveryStatusUpdatedEvent(currentDelivery, targetStatus.toLowerCase());
    } catch (notifErr) {
      console.warn("Delivery notification dispatch failed:", notifErr);
    }

    return {
      success: true,
      delivery: sanitizedResult,
      statusCode: 200,
      cached: false,
    };
  }

  /**
   * 5. Get Courier Wallet & Ledger Balance
   */
  static getCourierWallet(courierId: string): {
    current_balance: number;
    total_earned: number;
    completed_trips_count: number;
    ledger_entries: CourierLedgerEntry[];
  } {
    const ledger = loadJson<CourierLedgerEntry[]>(COURIER_LEDGER_FILE, []);
    const courierEntries = ledger.filter((e) => e.courier_id === courierId);

    const totalEarned = courierEntries
      .filter((e) => e.entry_type === "COMMISSION_CREDIT" || e.entry_type === "BONUS")
      .reduce((acc, e) => acc + e.amount, 0);

    const totalWithdrawn = courierEntries
      .filter((e) => e.entry_type === "WITHDRAWAL")
      .reduce((acc, e) => acc + e.amount, 0);

    return {
      current_balance: totalEarned - totalWithdrawn,
      total_earned: totalEarned,
      completed_trips_count: courierEntries.filter((e) => e.entry_type === "COMMISSION_CREDIT").length,
      ledger_entries: courierEntries.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  }
}
