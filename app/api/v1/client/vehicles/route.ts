import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/client/vehicles
 * Returns all vehicles owned by the authenticated client.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      // Demo / fallback user support if in local session
      return NextResponse.json({
        success: true,
        vehicles: [],
        authenticated: false,
      });
    }

    const { data: vehicles, error } = await supabase
      .from("client_vehicles")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicles: vehicles || [],
      total: vehicles?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/client/vehicles
 * Creates a new vehicle record for the authenticated client.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول لإضافة مركبة" }, { status: 401 });
    }

    const body = await req.json();
    const {
      brand_id,
      brand_name,
      model_id,
      model_name,
      year,
      trim,
      vin,
      plate_number,
      color = "أبيض",
      branch_id = "br-riyadh",
      is_default = false,
      is_favorite = false,
      notes = "",
    } = body;

    if (!brand_name?.trim() || !model_name?.trim() || !plate_number?.trim()) {
      return NextResponse.json(
        { error: "بيانات المركبة غير مكتملة (الماركة، الموديل، ورقم اللوحة إلزامية)" },
        { status: 400 }
      );
    }

    // If marked as default, unset other defaults for this user
    if (is_default) {
      await supabase
        .from("client_vehicles")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const vehicleRecord = {
      id: crypto.randomUUID(),
      user_id: user.id,
      brand_id: brand_id || "brand-custom",
      brand_name: brand_name.trim(),
      model_id: model_id || "model-custom",
      model_name: model_name.trim(),
      year: Number(year) || new Date().getFullYear(),
      trim: trim?.trim() || null,
      vin: vin?.trim()?.toUpperCase() || null,
      plate_number: plate_number.trim(),
      color: color.trim(),
      branch_id: branch_id.trim(),
      status: "active",
      is_default: Boolean(is_default),
      is_favorite: Boolean(is_favorite),
      notes: notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdVehicle, error: insertErr } = await supabase
      .from("client_vehicles")
      .insert(vehicleRecord)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: "فشل حفظ المركبة: " + insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تمت إضافة المركبة بنجاح",
      vehicle: createdVehicle || vehicleRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
