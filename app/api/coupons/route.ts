import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PromoCode,
  getRuntimePromoCodes,
  addRuntimePromoCode,
  updateRuntimePromoCode,
  deleteRuntimePromoCode,
  incrementRuntimeCouponUsage,
} from "@/lib/coupons";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: dbCoupons, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(dbCoupons) && dbCoupons.length > 0) {
      return NextResponse.json({ success: true, coupons: dbCoupons });
    }
  } catch (e) {
    // Fallback to runtime store
  }

  return NextResponse.json({ success: true, coupons: getRuntimePromoCodes() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Record coupon usage
    if (body.action === "use" && body.code) {
      const codeStr = String(body.code).trim().toUpperCase();
      try {
        const supabase = await createClient();
        const { data: existing } = await supabase
          .from("promo_codes")
          .select("id, usage_count")
          .eq("code", codeStr)
          .single();
        if (existing) {
          await supabase
            .from("promo_codes")
            .update({ usage_count: (existing.usage_count || 0) + 1 })
            .eq("id", existing.id);
        }
      } catch {}
      incrementRuntimeCouponUsage(codeStr);
      return NextResponse.json({ success: true });
    }

    const {
      code,
      target, // 'delivery' | 'subtotal'
      type,   // 'percent' | 'fixed'
      value,
      label,
      description,
      min_order_value,
      max_discount_cap,
      is_active = true,
      expires_at,
    } = body;

    if (!code || !target || !type || value == null) {
      return NextResponse.json(
        { success: false, error: "جميع الحقول الإلزامية مطلوبة (الكود، جهة الخصم، النوع، القيمة)." },
        { status: 400 }
      );
    }

    // ── Requirement 3: Mandatory Max Discount Cap for Percentage (%) Coupons ──
    if (type === "percent" && (max_discount_cap == null || Number(max_discount_cap) <= 0)) {
      return NextResponse.json(
        { success: false, error: "عند اختيار الخصم كنسبة مئوية (%)، يجب تحديد الحد الأعلى لقيمة الخصم بالريال (إلزامي)." },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const newCoupon: PromoCode = {
      id: `promo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      target: target === "delivery" ? "delivery" : "subtotal",
      type: type === "percent" ? "percent" : "fixed",
      value: Number(value),
      label: label?.trim() || (target === "delivery" ? `خصم ${value}${type === "percent" ? "%" : " ر.س"} على التوصيل` : `خصم ${value}${type === "percent" ? "%" : " ر.س"} من الفاتورة`),
      description: description?.trim() || "",
      min_order_value: min_order_value ? Number(min_order_value) : 0,
      max_discount_cap: max_discount_cap ? Number(max_discount_cap) : undefined,
      is_active: Boolean(is_active),
      usage_count: 0,
      expires_at: expires_at || null,
      created_at: new Date().toISOString(),
    };

    // Save to Supabase if table exists
    try {
      const supabase = await createClient();
      await supabase.from("promo_codes").insert(newCoupon);
    } catch {}

    // Save to runtime store
    addRuntimePromoCode(newCoupon);

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء حفظ كود الخصم." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rawUpdates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف الكود مطلوب." }, { status: 400 });
    }

    const updates: Partial<PromoCode> = { ...rawUpdates };
    if (updates.code) {
      updates.code = String(updates.code).trim().toUpperCase();
    }
    if (updates.value != null) {
      updates.value = Number(updates.value);
    }
    if (updates.min_order_value != null) {
      updates.min_order_value = Number(updates.min_order_value);
    }
    if (updates.max_discount_cap != null) {
      updates.max_discount_cap = Number(updates.max_discount_cap);
    }

    try {
      const supabase = await createClient();
      await supabase.from("promo_codes").update(updates).eq("id", id);
    } catch {}

    updateRuntimePromoCode(id, updates);

    const updated = getRuntimePromoCodes().find((c) => c.id === id);

    return NextResponse.json({ success: true, coupon: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء التحديث." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف الكود مطلوب." }, { status: 400 });
    }

    try {
      const supabase = await createClient();
      await supabase.from("promo_codes").delete().eq("id", id);
    } catch {}

    deleteRuntimePromoCode(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء الحذف." },
      { status: 500 }
    );
  }
}
