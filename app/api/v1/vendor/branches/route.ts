import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVendorBranches, saveVendorBranch } from "@/lib/vendor-branches";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchParams = req.nextUrl.searchParams;
    const requestedVendorId = searchParams.get("vendor_id");
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const vendorId = requestedVendorId || (user?.role === "vendor" ? user?.id : null) || cookieUserId || user?.id || "vendor-demo-id";
    const branches = await getVendorBranches(vendorId);

    return NextResponse.json({
      success: true,
      branches,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "فشل جلب قائمة الفروع" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const body = await req.json();
    const vendorId = body.vendor_id || (user?.role === "vendor" ? user?.id : null) || cookieUserId || user?.id || "vendor-demo-id";

    if (!body.name?.trim() || !body.city?.trim() || !body.address?.trim()) {
      return NextResponse.json(
        { success: false, error: "اسم الفرع والمدينة والعنوان حقول مطلوبة" },
        { status: 400 }
      );
    }

    const result = await saveVendorBranch(vendorId, {
      id: body.id,
      name: body.name.trim(),
      city: body.city.trim(),
      district: body.district?.trim() || "",
      address: body.address.trim(),
      latitude: Number(body.latitude) || 24.7136,
      longitude: Number(body.longitude) || 46.6753,
      contact_name: body.contact_name?.trim() || "",
      contact_phone: body.contact_phone?.trim() || "",
      is_main: Boolean(body.is_main),
      is_active: body.is_active !== false,
      accepts_pickup: body.accepts_pickup !== false,
      business_hours: body.business_hours || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "فشل حفظ الفرع" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      branch: result.branch,
      message: "تم حفظ بيانات الفرع بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const vendorId = user?.id || "vendor-demo-id";
    const body = await req.json().catch(() => ({}));
    const branchId = req.nextUrl.searchParams.get("id") || body.id || body.branch_id;

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "معرف الفرع مطلوب للحذف" },
        { status: 400 }
      );
    }

    const { deleteVendorBranch } = await import("@/lib/vendor-branches");
    const res = await deleteVendorBranch(vendorId, branchId);

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "فشل حذف الفرع" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف الفرع بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const vendorId = user?.id || "vendor-demo-id";
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف الفرع مطلوب" },
        { status: 400 }
      );
    }

    if (action === "set_main") {
      const { setMainVendorBranch } = await import("@/lib/vendor-branches");
      const res = await setMainVendorBranch(vendorId, id);
      if (!res.success) {
        return NextResponse.json(
          { success: false, error: res.error || "فشل تعيين الفرع الرئيسي" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "تم تعيين الفرع الرئيسي بنجاح",
      });
    }

    return NextResponse.json({
      success: false,
      error: "إجراء غير معروف",
    }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
