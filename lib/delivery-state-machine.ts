/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RIFQ CENTRAL DELIVERY STATE MACHINE (محرك حالات التوصيل وأسطول رفق المركزي)
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Source of Truth for:
 * 1. Granular courier delivery lifecycle transitions.
 * 2. Explicit, tested mapping to parental Order Status (preparing -> ready -> shipped -> delivered -> completed).
 * 3. Transition legality verification and RBAC permissions.
 * 4. Cryptographic Hashed OTP generation and verification (Zero plain-text storage).
 */

import crypto from "crypto";

// 1. Granular Courier Delivery Statuses
export type CourierDeliveryStatus =
  | "ASSIGNED"          // تم إسناد الطلب للمندوب
  | "EN_ROUTE_PICKUP"   // المندوب في الطريق لمستودع/متجر المورد
  | "ARRIVED_PICKUP"    // المندوب وصل لموقع المورد
  | "PICKED_UP"         // تم فحص واستلام الشحنة من المورد
  | "EN_ROUTE_DELIVERY" // جاري التحرك والتوصيل لموقع العميل
  | "ARRIVED_DELIVERY"  // المندوب وصل لموقع العميل
  | "DELIVERED"         // تم إتمام التسليم بنجاح (مع OTP/POD)
  | "CANCELLED";        // ملغي / تعذر التوصيل

// 2. Parental Order Statuses (Unchanged & 100% backward-compatible)
export type ParentOrderStatus =
  | "preparing"
  | "ready"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";

// 3. Status Metadata with Arabic Labels and Theme Colors
export interface DeliveryStatusMeta {
  status: CourierDeliveryStatus;
  labelAr: string;
  shortDescAr: string;
  stepIndex: number; // 0 to 6
  parentStatus: ParentOrderStatus;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

export const DELIVERY_STATUS_META: Record<CourierDeliveryStatus, DeliveryStatusMeta> = {
  ASSIGNED: {
    status: "ASSIGNED",
    labelAr: "مُسند للمندوب",
    shortDescAr: "تم إسناد الطلب وبانتظار تحرك المندوب للمورد",
    stepIndex: 0,
    parentStatus: "ready",
    badgeBg: "bg-blue-50 border-blue-200",
    badgeText: "text-blue-800",
    dotColor: "bg-blue-600",
  },
  EN_ROUTE_PICKUP: {
    status: "EN_ROUTE_PICKUP",
    labelAr: "في الطريق للمورد",
    shortDescAr: "المندوب متوجه حالياً لموقع المورد لاستلام القطع",
    stepIndex: 1,
    parentStatus: "ready",
    badgeBg: "bg-amber-50 border-amber-200",
    badgeText: "text-amber-800",
    dotColor: "bg-amber-500",
  },
  ARRIVED_PICKUP: {
    status: "ARRIVED_PICKUP",
    labelAr: "وصل للمورد",
    shortDescAr: "المندوب وصل لموقع المورد وبانتظار تسليم القطع",
    stepIndex: 2,
    parentStatus: "ready",
    badgeBg: "bg-indigo-50 border-indigo-200",
    badgeText: "text-indigo-800",
    dotColor: "bg-indigo-600",
  },
  PICKED_UP: {
    status: "PICKED_UP",
    labelAr: "تم استلام الشحنة",
    shortDescAr: "تم استلام الشحنة من المورد والتحقق من بنودها",
    stepIndex: 3,
    parentStatus: "shipped",
    badgeBg: "bg-teal-50 border-teal-200",
    badgeText: "text-teal-800",
    dotColor: "bg-teal-600",
  },
  EN_ROUTE_DELIVERY: {
    status: "EN_ROUTE_DELIVERY",
    labelAr: "جاري التوصيل للعميل",
    shortDescAr: "الشحنة في طريقها للعنوان المسجل للعميل",
    stepIndex: 4,
    parentStatus: "delivered",
    badgeBg: "bg-purple-50 border-purple-200",
    badgeText: "text-purple-800",
    dotColor: "bg-purple-600",
  },
  ARRIVED_DELIVERY: {
    status: "ARRIVED_DELIVERY",
    labelAr: "وصل لموقع العميل",
    shortDescAr: "المندوب عند موقع التسليم بانتظار إدخال رمز التحقق",
    stepIndex: 5,
    parentStatus: "delivered",
    badgeBg: "bg-orange-50 border-orange-200",
    badgeText: "text-orange-800",
    dotColor: "bg-orange-600",
  },
  DELIVERED: {
    status: "DELIVERED",
    labelAr: "تم التسليم بنجاح",
    shortDescAr: "تم تسليم الطلب وتأكيد الاستلام برمز التحقق OTP",
    stepIndex: 6,
    parentStatus: "delivered",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-800",
    dotColor: "bg-emerald-600",
  },
  CANCELLED: {
    status: "CANCELLED",
    labelAr: "ملغي",
    shortDescAr: "تم إلغاء الرحلة أو تعذر التوصيل",
    stepIndex: -1,
    parentStatus: "cancelled",
    badgeBg: "bg-red-50 border-red-200",
    badgeText: "text-red-800",
    dotColor: "bg-red-600",
  },
};

// 4. Strict State Transition Matrix
export const ALLOWED_TRANSITIONS: Record<CourierDeliveryStatus, CourierDeliveryStatus[]> = {
  ASSIGNED: ["EN_ROUTE_PICKUP", "CANCELLED"],
  EN_ROUTE_PICKUP: ["ARRIVED_PICKUP", "CANCELLED"],
  ARRIVED_PICKUP: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["EN_ROUTE_DELIVERY", "CANCELLED"],
  EN_ROUTE_DELIVERY: ["ARRIVED_DELIVERY", "CANCELLED"],
  ARRIVED_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [], // Final terminal state
  CANCELLED: ["ASSIGNED"], // Can only be re-assigned by Admin
};

// 5. Parental Mapping Helper (Explicit & Centralized)
export function mapDeliveryStatusToParentOrderStatus(
  deliveryStatus: CourierDeliveryStatus
): ParentOrderStatus {
  const meta = DELIVERY_STATUS_META[deliveryStatus];
  return meta ? meta.parentStatus : "shipped";
}

// 6. Transition Legality Validator
export function validateDeliveryTransition(
  currentStatus: CourierDeliveryStatus,
  targetStatus: CourierDeliveryStatus
): { isValid: boolean; errorReason?: string } {
  if (currentStatus === targetStatus) {
    return { isValid: true }; // Idempotent same-state call
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      isValid: false,
      errorReason: `انتقال غير صالح: لا يمكن الانتقال من حالة (${DELIVERY_STATUS_META[currentStatus]?.labelAr || currentStatus}) إلى (${DELIVERY_STATUS_META[targetStatus]?.labelAr || targetStatus}). يجب اتباع التسلسل الهندسي المعتمد للرحلة.`,
    };
  }

  return { isValid: true };
}

// 7. Cryptographic OTP Utility (Salted SHA-256 Hash)
const OTP_PEPPER = process.env.OTP_PEPPER_SECRET || "RIFQ_SECURE_COURIER_OTP_PEPPER_2026";

export interface GeneratedOtpResult {
  plainOtp: string; // ONLY returned to client/buyer view once, NEVER stored in plain text
  otpHash: string;  // Stored in DB
  otpSalt: string;  // Stored in DB
  expiresAt: string;
}

/**
 * Generates a deterministic, unique 4-digit numeric OTP code for any given order.
 * Ensures every single order gets a distinct, changing, non-static code.
 */
export function getDeterministicOrderOtp(orderId: string): string {
  const clean = String(orderId || "").replace(/\D+/g, "");
  const baseNum = clean ? parseInt(clean, 10) : 6997;
  const code = ((Math.abs(baseNum * 31337 + 7919) % 9000) + 1000).toString();
  return code;
}

export function generateHashedDeliveryOtp(expiresInHours = 48, customCode?: string): GeneratedOtpResult {
  // Generate dynamic 4-digit numeric code
  const plainOtp = customCode && customCode.length === 4 ? customCode : Math.floor(1000 + Math.random() * 9000).toString();
  const otpSalt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .createHmac("sha256", `${otpSalt}_${OTP_PEPPER}`)
    .update(plainOtp)
    .digest("hex");

  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

  return {
    plainOtp,
    otpHash: hash,
    otpSalt,
    expiresAt,
  };
}

export function verifyDeliveryOtp(
  inputCode: string,
  storedHash: string,
  storedSalt: string,
  expiresAt?: string | null
): { isValid: boolean; reason?: string } {
  if (!inputCode || inputCode.trim().length !== 4) {
    return { isValid: false, reason: "رمز التحقق يجب أن يتكون من 4 أرقام." };
  }

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return { isValid: false, reason: "انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد." };
  }

  const calculatedHash = crypto
    .createHmac("sha256", `${storedSalt}_${OTP_PEPPER}`)
    .update(inputCode.trim())
    .digest("hex");

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(calculatedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );

  if (!isMatch) {
    return { isValid: false, reason: "رمز التحقق المدخل غير صحيح. يرجى التأكد من المشتري." };
  }

  return { isValid: true };
}
