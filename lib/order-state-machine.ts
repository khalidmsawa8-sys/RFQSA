/**
 * Order Domain State Machine
 * Strictly enforces legal state transitions per fulfillment_method:
 * - DELIVERY
 * - BRANCH_PICKUP
 * 
 * Rejects illegal transitions and unauthorized actor roles on the backend.
 */

export type FulfillmentMethod = "DELIVERY" | "BRANCH_PICKUP";

export type OrderStatus =
  // Initial
  | "PENDING"
  | "PREPARING"
  // Delivery path
  | "READY"
  | "ASSIGNED"
  | "SHIPPING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  // Branch Pickup path
  | "READY_FOR_PICKUP"
  | "PICKUP_IN_PROGRESS"
  | "PICKED_UP"
  // Terminal
  | "AWAITING_CONFIRMATION"
  | "RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export interface StatusMetadata {
  key: OrderStatus;
  labelAr: string;
  badgeCls: string;
  stepIndex: number;
  descriptionAr: string;
}

export const ORDER_STATUS_METADATA: Record<OrderStatus, StatusMetadata> = {
  PENDING: {
    key: "PENDING",
    labelAr: "قيد الانتظار",
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
    stepIndex: 1,
    descriptionAr: "تم إنشاء الطلب وبانتظار بدء تجهيزه من المورد",
  },
  PREPARING: {
    key: "PREPARING",
    labelAr: "تم التجهيز",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    stepIndex: 2,
    descriptionAr: "يقوم المورد حالياً بفحص وتجهيز قطع الغيار المطلوبة",
  },
  READY: {
    key: "READY",
    labelAr: "تم التجهيز",
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200",
    stepIndex: 3,
    descriptionAr: "تم تجهيز الشحنة وهي جاهزة للاستلام من مندوب التوصيل",
  },
  ASSIGNED: {
    key: "ASSIGNED",
    labelAr: "تم تعيين المندوب",
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    stepIndex: 3,
    descriptionAr: "تم إسناد الطلب لمندوب التوصيل للتوجه إلى مستودع المورد",
  },
  SHIPPING: {
    key: "SHIPPING",
    labelAr: "تم الشحن",
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200",
    stepIndex: 4,
    descriptionAr: "المندوب استلم القطع والشحنة في مرحلة النقل",
  },
  OUT_FOR_DELIVERY: {
    key: "OUT_FOR_DELIVERY",
    labelAr: "جاري التسليم",
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200",
    stepIndex: 4,
    descriptionAr: "المندوب في طريقه إلى موقع العميل للتسليم النهائي",
  },
  DELIVERED: {
    key: "DELIVERED",
    labelAr: "جاري التسليم",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stepIndex: 5,
    descriptionAr: "تم تسليم الطلب إلى موقع العميل وبانتظار التأكيد النهائي",
  },
  READY_FOR_PICKUP: {
    key: "READY_FOR_PICKUP",
    labelAr: "جاهز للاستلام من الفرع",
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200",
    stepIndex: 3,
    descriptionAr: "تم تجهيز القطع ويمكن للعميل التوجه لفرع المورد للاستلام",
  },
  PICKUP_IN_PROGRESS: {
    key: "PICKUP_IN_PROGRESS",
    labelAr: "جاري الاستلام من الفرع",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    stepIndex: 4,
    descriptionAr: "العميل متواجد في الفرع ويجري تسليمه القطع",
  },
  PICKED_UP: {
    key: "PICKED_UP",
    labelAr: "تم الاستلام من الفرع",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stepIndex: 5,
    descriptionAr: "تم تسليم القطع للعميل من الفرع بنجاح",
  },
  AWAITING_CONFIRMATION: {
    key: "AWAITING_CONFIRMATION",
    labelAr: "بانتظار تأكيد العميل",
    badgeCls: "bg-yellow-50 text-yellow-800 border-yellow-200",
    stepIndex: 5,
    descriptionAr: "تم التسليم وبانتظار تأكيد العميل أو انقضاء مهلة الفحص",
  },
  RECEIVED: {
    key: "RECEIVED",
    labelAr: "تم تأكيد الاستلام",
    badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-300",
    stepIndex: 6,
    descriptionAr: "أكّد العميل استلام الطلب ومطابقة القطع",
  },
  COMPLETED: {
    key: "COMPLETED",
    labelAr: "تأكيد واستلام",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stepIndex: 6,
    descriptionAr: "اكتملت دورة الطلب بنجاح وتم تحرير المستحقات",
  },
  CANCELLED: {
    key: "CANCELLED",
    labelAr: "ملغي",
    badgeCls: "bg-red-50 text-red-700 border-red-200",
    stepIndex: 0,
    descriptionAr: "تم إلغاء الطلب",
  },
};

/**
 * Maps legacy lowercase statuses to canonical uppercase OrderStatus
 */
export function normalizeStatus(raw?: string | null): OrderStatus {
  if (!raw) return "PENDING";
  const s = raw.trim().toUpperCase();

  // Legacy mappings
  if (s === "PREPARING" || s === "CONFIRMED") return "PREPARING";
  if (s === "READY" || s === "PROCESSING") return "READY";
  if (s === "SHIPPED") return "SHIPPING";
  if (s === "DELIVERED") return "DELIVERED";
  if (s === "COMPLETED" || s === "CLOSED") return "COMPLETED";
  if (s === "CANCELLED" || s === "EXPIRED") return "CANCELLED";

  if (s in ORDER_STATUS_METADATA) {
    return s as OrderStatus;
  }
  return "PENDING";
}

export const normalizeStatusKey = normalizeStatus;

/**
 * Valid transitions by fulfillment method and actor role
 */
export function validateStatusTransition(params: {
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  actorRole: "admin" | "vendor" | "client" | "courier";
}): { allowed: boolean; reason?: string } {
  const { currentStatus, nextStatus, fulfillmentMethod, actorRole } = params;

  // Admin has emergency override
  if (actorRole === "admin") {
    return { allowed: true };
  }

  // Terminal states cannot transition further
  if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
    return { allowed: false, reason: "لا يمكن تعديل حالة طلب مكتمل أو ملغي نهائياً" };
  }

  // Cancel can be initiated from early stages
  if (nextStatus === "CANCELLED") {
    if (["PENDING", "PREPARING", "READY_FOR_PICKUP"].includes(currentStatus)) {
      return { allowed: true };
    }
    return { allowed: false, reason: "لا يمكن إلغاء الطلب بعد بدء مرحلة الشحن أو التسليم" };
  }

  if (fulfillmentMethod === "DELIVERY") {
    // Delivery Workflow
    if (actorRole === "vendor") {
      if (currentStatus === "PENDING" && nextStatus === "PREPARING") return { allowed: true };
      if (currentStatus === "PREPARING" && nextStatus === "READY") return { allowed: true };
      return {
        allowed: false,
        reason: "المورد مسؤول عن: (جاري التجهيز → تم التجهيز للشحن) فقط في طلبات التوصيل",
      };
    }

    if (actorRole === "courier") {
      if (currentStatus === "READY" && (nextStatus === "ASSIGNED" || nextStatus === "SHIPPING")) return { allowed: true };
      if (currentStatus === "ASSIGNED" && nextStatus === "SHIPPING") return { allowed: true };
      if (currentStatus === "SHIPPING" && nextStatus === "OUT_FOR_DELIVERY") return { allowed: true };
      if (currentStatus === "OUT_FOR_DELIVERY" && nextStatus === "DELIVERED") return { allowed: true };
      if (currentStatus === "DELIVERED" && nextStatus === "COMPLETED") return { allowed: true }; // Auto-confirm fallback
      return {
        allowed: false,
        reason: "مندوب التوصيل مسؤول عن: (جاري الشحن ← جاري التسليم ← تم التسليم)",
      };
    }

    if (actorRole === "client") {
      if ((currentStatus === "DELIVERED" || currentStatus === "AWAITING_CONFIRMATION") && (nextStatus === "RECEIVED" || nextStatus === "COMPLETED")) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "العميل يؤكد الاستلام بعد وصول وتوصيل الشحنة فقط",
      };
    }
  } else {
    // BRANCH_PICKUP Workflow
    if (actorRole === "courier") {
      return {
        allowed: false,
        reason: "طلبات الاستلام من الفرع لا تتطلب مندوب توصيل",
      };
    }

    if (actorRole === "vendor") {
      if (currentStatus === "PENDING" && nextStatus === "PREPARING") return { allowed: true };
      if (currentStatus === "PREPARING" && nextStatus === "READY_FOR_PICKUP") return { allowed: true };
      if (currentStatus === "READY_FOR_PICKUP" && nextStatus === "PICKUP_IN_PROGRESS") return { allowed: true };
      if (currentStatus === "PICKUP_IN_PROGRESS" && nextStatus === "PICKED_UP") return { allowed: true };
      if (currentStatus === "PICKED_UP" && nextStatus === "COMPLETED") return { allowed: true };
      return {
        allowed: false,
        reason: "المورد مسؤول عن تحديث حالات التجهيز والاستلام من الفرع",
      };
    }

    if (actorRole === "client") {
      if ((currentStatus === "PICKED_UP" || currentStatus === "READY_FOR_PICKUP") && (nextStatus === "RECEIVED" || nextStatus === "COMPLETED")) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "العميل يؤكد الاستلام بعد استلام القطع من الفرع",
      };
    }
  }

  return { allowed: false, reason: `الانتقال من ${currentStatus} إلى ${nextStatus} غير مسموح لدور ${actorRole}` };
}
