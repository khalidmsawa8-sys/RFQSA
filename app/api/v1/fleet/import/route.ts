import { NextRequest, NextResponse } from "next/server";
import { fleetRepository } from "@/lib/bounded-contexts/fleet/fleet.repository";
import {
  createApiEnvelope,
  createApiErrorEnvelope,
} from "@/lib/bounded-contexts/types/common.types";
import { BulkImportVehiclesCommand } from "@/lib/bounded-contexts/fleet/fleet.types";

export const dynamic = "force-dynamic";

// Maximum allowable batch size per HTTP request
const MAX_BATCH_SIZE = 1000;

export async function POST(req: NextRequest) {
  try {
    const body: BulkImportVehiclesCommand = await req.json();

    // 1. Basic Structure Validation
    if (!body || !body.import_id || !Array.isArray(body.vehicles)) {
      return NextResponse.json(
        createApiErrorEnvelope([
          {
            code: "INVALID_PAYLOAD",
            message: "بيانات الاستيراد غير مكتملة (import_id ومصفوفة المركبات مطلوبة)",
          },
        ]),
        { status: 400 }
      );
    }

    if (body.vehicles.length === 0) {
      return NextResponse.json(
        createApiErrorEnvelope([
          {
            code: "EMPTY_BATCH",
            message: "لا توجد مركبات في هذه الدفعة للاستيراد",
          },
        ]),
        { status: 400 }
      );
    }

    if (body.vehicles.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        createApiErrorEnvelope([
          {
            code: "BATCH_SIZE_EXCEEDED",
            message: `حجم الدفعة (${body.vehicles.length}) يتجاوز الحد الأقصى المسموح به (${MAX_BATCH_SIZE} سجل)`,
          },
        ]),
        { status: 413 }
      );
    }

    // 2. Organization Boundary & Auth Verification
    const organizationId = body.organization_id || "org-national-procurement";
    const userId = body.user_id || "demo-user-id";
    const duplicateStrategy = body.duplicate_strategy === "skip" ? "skip" : "update";

    // 3. Execute Server-side Bulk Upsert
    const result = await fleetRepository.bulkUpsertVehicles({
      import_id: body.import_id,
      organization_id: organizationId,
      user_id: userId,
      file_name: body.file_name || "fleet_import.xlsx",
      duplicate_strategy: duplicateStrategy,
      create_missing_branches: body.create_missing_branches !== false,
      vehicles: body.vehicles,
    });

    return NextResponse.json(createApiEnvelope(result), { status: 200 });
  } catch (error: any) {
    console.error("Bulk Import Server Error:", error);
    return NextResponse.json(
      createApiErrorEnvelope([
        {
          code: "BULK_IMPORT_EXCEPTION",
          message: error?.message || "حدث خطأ غير متوقع أثناء معالجة استيراد المركبات على السيرفر",
        },
      ]),
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org") || "org-national-procurement";

    const history = await fleetRepository.getImportHistory(org);
    return NextResponse.json(createApiEnvelope(history), { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([
        { code: "HISTORY_QUERY_ERROR", message: "فشل استرجاع سجل عمليات الاستيراد" },
      ]),
      { status: 500 }
    );
  }
}
