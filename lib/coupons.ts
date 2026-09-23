/**
 * Promo Codes & Coupons Engine (رفق - RIFQ)
 * Supports targeting either 'delivery' (خصم رسوم التوصيل) or 'subtotal' (خصم إجمالي الفاتورة)
 */

export type CouponTarget = "delivery" | "subtotal";
export type CouponType = "percent" | "fixed";

export interface PromoCode {
  id: string;
  code: string;
  target: CouponTarget; // 'delivery' = خصم رسوم التوصيل | 'subtotal' = خصم إجمالي الفاتورة
  type: CouponType;     // 'percent' = نسبة مئوية | 'fixed' = مبلغ ثابت ر.س
  value: number;
  label: string;
  description?: string;
  min_order_value?: number;
  max_discount_cap?: number;
  is_active: boolean;
  usage_count: number;
  max_uses?: number | null;
  expires_at?: string | null;
  created_at: string;
}

// In-memory persistent cache / fallback seed for instant responsiveness
export const INITIAL_PROMO_CODES: PromoCode[] = [
  {
    id: "promo-1",
    code: "FREESHIP",
    target: "delivery",
    type: "percent",
    value: 100,
    label: "شحن وتوصيل مجاني 100%",
    description: "كود خصم كامل قيمة رسوم التوصيل لأسطول رفق",
    min_order_value: 0,
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "promo-2",
    code: "SHIP50",
    target: "delivery",
    type: "percent",
    value: 50,
    label: "خصم 50% على رسوم الشحن والتوصيل",
    description: "تخفيض نصف رسوم التوصيل",
    min_order_value: 150,
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "promo-3",
    code: "RIFQ10",
    target: "subtotal",
    type: "percent",
    value: 10,
    label: "خصم 10% من إجمالي الفاتورة",
    description: "خصم خاص لعملاء منصة رفق على قيمة القطع",
    min_order_value: 100,
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "promo-4",
    code: "RIFQ15",
    target: "subtotal",
    type: "percent",
    value: 15,
    label: "خصم 15% خاص من إجمالي الفاتورة",
    description: "خصم للطلبات فوق 500 ر.س",
    min_order_value: 500,
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "promo-5",
    code: "WELCOME",
    target: "subtotal",
    type: "percent",
    value: 10,
    label: "خصم ترحيبي 10% من إجمالي الفاتورة",
    description: "خصم للمستخدمين الجدد",
    min_order_value: 50,
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "promo-6",
    code: "SAVE50",
    target: "subtotal",
    type: "fixed",
    value: 50,
    label: "خصم فوري 50 ر.س من إجمالي الفاتورة",
    description: "خصم نقدي مباشر",
    min_order_value: 300,
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "promo-7",
    code: "SAVE100",
    target: "subtotal",
    type: "fixed",
    value: 100,
    label: "خصم فوري 100 ر.س من إجمالي الفاتورة",
    description: "خصم نقدي مباشر للطلبات الكبيرة",
    min_order_value: 1000,
    is_active: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
  },
];

// Global runtime store for updates when Supabase table isn't created yet
let runtimePromoCodes: PromoCode[] = [...INITIAL_PROMO_CODES];

export function getRuntimePromoCodes(): PromoCode[] {
  return runtimePromoCodes;
}

export function setRuntimePromoCodes(codes: PromoCode[]) {
  runtimePromoCodes = codes;
}

export function addRuntimePromoCode(code: PromoCode) {
  runtimePromoCodes = [code, ...runtimePromoCodes.filter((c) => c.code !== code.code)];
}

export function updateRuntimePromoCode(id: string, updates: Partial<PromoCode>) {
  runtimePromoCodes = runtimePromoCodes.map((c) =>
    c.id === id ? { ...c, ...updates } : c
  );
}

export function deleteRuntimePromoCode(id: string) {
  runtimePromoCodes = runtimePromoCodes.filter((c) => c.id !== id);
}

export function incrementRuntimeCouponUsage(codeOrId: string) {
  const targetKey = (codeOrId || "").trim().toUpperCase();
  runtimePromoCodes = runtimePromoCodes.map((c) => {
    if (c.id === codeOrId || c.code.toUpperCase() === targetKey) {
      return { ...c, usage_count: (c.usage_count || 0) + 1 };
    }
    return c;
  });
}

export interface ValidationResult {
  valid: boolean;
  coupon?: PromoCode;
  error?: string;
  discountAmount?: number;
}

/**
 * Validates a coupon code against subtotal and delivery cost.
 */
export function validateCoupon(
  codeStr: string,
  partsSubtotal: number,
  deliveryCost: number,
  customList?: PromoCode[]
): ValidationResult {
  const code = (codeStr || "").trim().toUpperCase();
  if (!code) {
    return { valid: false, error: "يرجى إدخال رمز كود الخصم." };
  }

  const list = customList && customList.length > 0 ? customList : runtimePromoCodes;
  let coupon = list.find((c) => c.code === code);

  // Fallback pattern matcher if not explicitly in table
  if (!coupon) {
    if (code === "FREESHIP" || code === "DELIVERYFREE") {
      coupon = {
        id: "auto-freeship",
        code,
        target: "delivery",
        type: "percent",
        value: 100,
        label: "شحن وتوصيل مجاني 100%",
        is_active: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
      };
    } else if (/^SHIP[0-9]+$/i.test(code)) {
      const pct = parseInt(code.replace(/[^0-9]/g, ""), 10);
      if (pct > 0 && pct <= 100) {
        coupon = {
          id: `auto-${code}`,
          code,
          target: "delivery",
          type: "percent",
          value: pct,
          label: `خصم ${pct}% على رسوم التوصيل`,
          is_active: true,
          usage_count: 0,
          created_at: new Date().toISOString(),
        };
      }
    } else if (/^RIFQ[0-9]+$/i.test(code)) {
      const pct = parseInt(code.replace(/[^0-9]/g, ""), 10);
      if (pct > 0 && pct <= 50) {
        coupon = {
          id: `auto-${code}`,
          code,
          target: "subtotal",
          type: "percent",
          value: pct,
          label: `خصم ${pct}% من إجمالي الفاتورة`,
          is_active: true,
          usage_count: 0,
          created_at: new Date().toISOString(),
        };
      }
    } else if (/^SAVE[0-9]+$/i.test(code)) {
      const amount = parseInt(code.replace(/[^0-9]/g, ""), 10);
      if (amount > 0 && amount <= 500) {
        coupon = {
          id: `auto-${code}`,
          code,
          target: "subtotal",
          type: "fixed",
          value: amount,
          label: `خصم فوري ${amount} ر.س من إجمالي الفاتورة`,
          is_active: true,
          usage_count: 0,
          created_at: new Date().toISOString(),
        };
      }
    }
  }

  if (!coupon) {
    return { valid: false, error: "كود الخصم المدخل غير صالح أو غير موجود." };
  }

  if (!coupon.is_active) {
    return { valid: false, error: "كود الخصم معطل حالياً من قبل الإدارة." };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "انتهت صلاحية كود الخصم المدخل." };
  }

  if (coupon.min_order_value && partsSubtotal < coupon.min_order_value) {
    return {
      valid: false,
      error: `الحد الأدنى لتطبيق هذا الكود هو ${coupon.min_order_value} ر.س من قيمة الطلب.`,
    };
  }

  // Calculate discount amount based on target (delivery vs subtotal)
  let calculatedDiscount = 0;
  if (coupon.target === "delivery") {
    if (deliveryCost <= 0) {
      return { valid: false, error: "رسوم التوصيل مجانية بالفعل لهذا العرض." };
    }
    if (coupon.type === "percent") {
      calculatedDiscount = (deliveryCost * coupon.value) / 100;
    } else {
      calculatedDiscount = Math.min(deliveryCost, coupon.value);
    }
  } else {
    // Subtotal / invoice total target
    if (partsSubtotal <= 0) {
      return { valid: false, error: "لا توجد قطع مقبولة لتطبيق الخصم عليها." };
    }
    if (coupon.type === "percent") {
      calculatedDiscount = (partsSubtotal * coupon.value) / 100;
    } else {
      calculatedDiscount = Math.min(partsSubtotal, coupon.value);
    }

    if (coupon.max_discount_cap && calculatedDiscount > coupon.max_discount_cap) {
      calculatedDiscount = coupon.max_discount_cap;
    }
  }

  return {
    valid: true,
    coupon,
    discountAmount: calculatedDiscount,
  };
}
