import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCoupon, PromoCode } from "@/lib/coupons";

export async function POST(req: Request) {
  try {
    const { code, partsSubtotal, deliveryCost } = await req.json();

    if (!code) {
      return NextResponse.json(
        { valid: false, error: "يرجى إدخال رمز كود الخصم." },
        { status: 400 }
      );
    }

    let customList: PromoCode[] | undefined;
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("is_active", true);

      if (Array.isArray(data) && data.length > 0) {
        customList = data;
      }
    } catch {}

    const result = validateCoupon(
      code,
      Number(partsSubtotal || 0),
      Number(deliveryCost || 0),
      customList
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: err.message || "حدث خطأ أثناء فحص الكود." },
      { status: 500 }
    );
  }
}
