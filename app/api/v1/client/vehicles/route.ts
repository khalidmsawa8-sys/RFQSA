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
  // 1. Supabase auth
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {}

  // 2. Request header
  const headerUserId = req.headers.get("x-user-id");
  if (headerUserId) return headerUserId;

  // 3. Cookie session
  const cookieUserId = req.cookies.get("rfq_user_id")?.value;
  if (cookieUserId) return cookieUserId;

  return "";
}

/**
 * GET /api/v1/client/vehicles
 * Returns all vehicles owned by the authenticated client.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({
        success: true,
        vehicles: [],
        authenticated: false,
      });
    }

    const allVehicles = loadVehicles();

    // Filter vehicles for this specific user
    let userVehicles = allVehicles.filter(
      (v) =>
        v.user_id === userId ||
        (userId === "client-demo-id" && (v.user_id === "client-demo-id" || !v.user_id))
    );

    // If user has not added custom vehicles yet, present the registered fleet vehicles as baseline
    if (userVehicles.length === 0) {
      userVehicles = allVehicles.filter((v) => v.user_id === "client-demo-id" || !v.user_id);
    }

    // Also try Supabase if available
    try {
      const supabase = await createClient();
      const { data: dbVehicles } = await supabase
        .from("client_vehicles")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (dbVehicles && Array.isArray(dbVehicles) && dbVehicles.length > 0) {
        // Merge without duplicates
        const existingIds = new Set(userVehicles.map((v) => v.id));
        for (const dv of dbVehicles) {
          if (!existingIds.has(dv.id)) {
            userVehicles.push(dv);
            allVehicles.push(dv);
          }
        }
        saveVehicles(allVehicles);
      }
    } catch {}

    // Sort: default vehicles first, then newest
    userVehicles.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return NextResponse.json({
      success: true,
      vehicles: userVehicles,
      total: userVehicles.length,
    });
  } catch (err: any) {
    console.error("GET /api/v1/client/vehicles error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/client/vehicles
 * Creates a new vehicle record for the authenticated client.
 */
export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthUserId(req);

    if (!userId) {
      userId = "client-demo-id";
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

    const allVehicles = loadVehicles();

    // If marked as default, unset other defaults for this user
    if (is_default) {
      allVehicles.forEach((v) => {
        if (v.user_id === userId) v.is_default = false;
      });
    }

    const vehicleId = body.id || `veh-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString();

    const vehicleRecord = {
      id: vehicleId,
      user_id: userId,
      organization_id: "org-client",
      branch_id: branch_id?.trim() || "br-riyadh",
      fleet_id: "fl-default",
      brand_id: brand_id || "brand-custom",
      brand_name: brand_name.trim(),
      model_id: model_id || "model-custom",
      model_name: model_name.trim(),
      year: Number(year) || new Date().getFullYear(),
      trim: trim?.trim() || null,
      vin: vin?.trim()?.toUpperCase() || null,
      plate_number: plate_number.trim(),
      color: color.trim(),
      status: "active",
      is_default: Boolean(is_default),
      is_favorite: Boolean(is_favorite),
      notes: notes?.trim() || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    allVehicles.unshift(vehicleRecord);
    saveVehicles(allVehicles);

    // Try Supabase insert in background if connected
    try {
      const supabase = await createClient();
      await supabase.from("client_vehicles").insert(vehicleRecord);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "تمت إضافة المركبة بنجاح",
      vehicle: vehicleRecord,
    });
  } catch (err: any) {
    console.error("POST /api/v1/client/vehicles error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
