import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/settings
 * Publicly accessible endpoint providing platform-wide business, tax, and commission policies
 * to clients, vendors, deal rooms, and invoice PDF exporters without exposing confidential keys.
 */
export async function GET() {
  try {
    const settings = await getSystemSettings();

    const publicSettings = {
      vat_percent: Number(settings.vat_percent ?? 15),
      platform_commission_percent: Number(settings.platform_commission_percent ?? 5),
      client_platform_fee_percent: Number(settings.client_platform_fee_percent ?? settings.platform_commission_percent ?? 5),
      vendor_platform_fee_percent: Number(settings.vendor_platform_fee_percent ?? 15),
      vat_number: settings.vat_number || "310987654300003",
      cr_number: settings.cr_number || "1010789456",
      require_vendor_verification: settings.require_vendor_verification !== false,
      allow_customer_cancel_after_quotes: settings.allow_customer_cancel_after_quotes !== false,
      maintenance_mode: Boolean(settings.maintenance_mode),
      maintenance_message: settings.maintenance_message || "",
      rfq_visibility_duration_minutes: Number(settings.rfq_visibility_duration_minutes) || 2880,
      updated_at: settings.updated_at || new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        settings: publicSettings,
        data: publicSettings,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("[api/v1/settings GET] error:", error);
    const fallback = {
      vat_percent: 15,
      platform_commission_percent: 15,
      client_platform_fee_percent: 5,
      vendor_platform_fee_percent: 15,
      vat_number: "310987654300003",
      cr_number: "1010789456",
    };
    return NextResponse.json(
      {
        success: false,
        error: "فشل جلب إعدادات المنصة",
        settings: fallback,
        data: fallback,
      },
      { status: 500 }
    );
  }
}
