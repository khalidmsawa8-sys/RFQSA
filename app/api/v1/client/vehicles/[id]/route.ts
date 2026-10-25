import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const VEHICLES_FILE = path.join(DATA_DIR, "client_vehicles_db.json");

function loadVehicles(): any[] {
  try {
    if (fs.existsSync(VEHICLES_FILE)) {
      const data = fs.readFileSync(VEHICLES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load client_vehicles_db.json:", e);
  }
  return [];
}

function saveVehicles(vehicles: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(VEHICLES_FILE, JSON.stringify(vehicles, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to save client_vehicles_db.json:", e);
  }
}

async function getAuthUserId(req: NextRequest): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {}

  const headerUserId = req.headers.get("x-user-id");
  if (headerUserId) return headerUserId;

  const cookieUserId = req.cookies.get("rfq_user_id")?.value;
  if (cookieUserId) return cookieUserId;

  return "";
}

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
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول" }, { status: 401 });
    }

    const body = await req.json();
    const allVehicles = loadVehicles();
    const idx = allVehicles.findIndex((v) => v.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: "المركبة غير موجودة" }, { status: 404 });
    }

    const existing = allVehicles[idx];
    if (existing.user_id && existing.user_id !== userId && userId !== "client-demo-id") {
      return NextResponse.json({ error: "غير مصرح بتعديل هذه المركبة" }, { status: 403 });
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

    if (body.is_default) {
      allVehicles.forEach((v) => {
        if (v.user_id === userId) v.is_default = false;
      });
    }

    const updated = {
      ...existing,
      updated_at: new Date().toISOString(),
    };

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updated[key] = body[key];
      }
    }

    allVehicles[idx] = updated;
    saveVehicles(allVehicles);

    // Sync to Supabase in background
    try {
      const supabase = await createClient();
      await supabase.from("client_vehicles").update(updated).eq("id", id);
    } catch {}

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
 * Deletes a vehicle owned by the client.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول" }, { status: 401 });
    }

    const allVehicles = loadVehicles();
    const idx = allVehicles.findIndex((v) => v.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: "المركبة غير موجودة" }, { status: 404 });
    }

    allVehicles.splice(idx, 1);
    saveVehicles(allVehicles);

    // Sync to Supabase in background
    try {
      const supabase = await createClient();
      await supabase.from("client_vehicles").delete().eq("id", id);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "تم حذف المركبة بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
