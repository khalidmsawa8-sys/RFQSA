import { NextRequest, NextResponse } from "next/server";
import { fleetRepository } from "@/lib/bounded-contexts/fleet/fleet.repository";
import { createApiEnvelope, createApiErrorEnvelope } from "@/lib/bounded-contexts/types/common.types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("search") || undefined;
    const organizationId = searchParams.get("org") || "org-national-procurement";
    const status = searchParams.get("status") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const result = await fleetRepository.searchVehicles({
      organization_id: organizationId,
      search_term: searchTerm,
      status,
      page,
      limit,
    });

    return NextResponse.json(
      createApiEnvelope(result.vehicles, {
        pagination: {
          page,
          limit,
          total_records: result.total,
          total_pages: Math.ceil(result.total / limit),
        },
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "FLEET_QUERY_ERROR", message: error?.message || "فشل جلب بيانات أسطول السيارات" }]),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.brand_id || !body.model_id || !body.vin || !body.plate_number) {
      return NextResponse.json(
        createApiErrorEnvelope([{ code: "INVALID_DTO", message: "يرجى تعبئة جميع بيانات المركبة الأساسية (الماركة، الموديل، الـ VIN، ورقم اللوحة)" }]),
        { status: 400 }
      );
    }

    const vehicle = await fleetRepository.createVehicle({
      organization_id: body.organization_id || "org-national-procurement",
      branch_id: body.branch_id || "br-riyadh-main",
      fleet_id: body.fleet_id || "fl-exec-01",
      brand_id: body.brand_id,
      brand_name: body.brand_name || "تويوتا",
      model_id: body.model_id,
      model_name: body.model_name || "كامري",
      year: Number(body.year) || 2023,
      trim: body.trim,
      vin: body.vin,
      plate_number: body.plate_number,
      color: body.color,
      is_default: body.is_default,
      is_favorite: body.is_favorite,
      notes: body.notes,
      user_id: body.user_id || "demo-user-id",
    });

    return NextResponse.json(createApiEnvelope(vehicle), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "FLEET_COMMAND_ERROR", message: error?.message || "فشل إضافة المركبة للكراج" }]),
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("id");

    if (!vehicleId) {
      return NextResponse.json(
        createApiErrorEnvelope([{ code: "MISSING_ID", message: "معرف المركبة مطلوب" }]),
        { status: 400 }
      );
    }

    const success = await fleetRepository.deleteVehicle({
      vehicle_id: vehicleId,
      user_id: "demo-user-id",
    });

    return NextResponse.json(createApiEnvelope({ deleted: success }));
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "FLEET_DELETE_ERROR", message: error?.message || "فشل حذف المركبة" }]),
      { status: 500 }
    );
  }
}
