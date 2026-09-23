import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/client/vehicles/[id]
 * Updates a vehicle owned by the authenticated client.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول" }, { status: 401 });
    }

    const body = await req.json();

    // Verify ownership
    const { data: existing, error: existErr } = await supabase
      .from("client_vehicles")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existErr || !existing) {
      return NextResponse.json({ error: "المركبة غير موجودة أو غير مصرح بتعديلها" }, { status: 404 });
    }

    const allowed = [
      "brand_id",
      "brand_name",
      "model_id",
      "model_name",
      "year",
      "trim",
      "vin",
      "plate_number",
      "color",
      "branch_id",
      "status",
      "is_default",
      "is_favorite",
      "notes",
    ];

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) {
        patch[key] = body[key];
      }
    }

    if (patch.is_default) {
      await supabase
        .from("client_vehicles")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { data: updated, error: updateErr } = await supabase
      .from("client_vehicles")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "فشل تحديث بيانات المركبة: " + updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات المركبة بنجاح",
      vehicle: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/client/vehicles/[id]
 * Soft-deletes a vehicle owned by the client.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول" }, { status: 401 });
    }

    // Soft delete
    const { error: deleteErr } = await supabase
      .from("client_vehicles")
      .update({
        deleted_at: new Date().toISOString(),
        status: "archived",
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteErr) {
      return NextResponse.json({ error: "فشل حذف المركبة: " + deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف وأرشفة المركبة بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
