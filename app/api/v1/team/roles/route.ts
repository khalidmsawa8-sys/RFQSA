import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";
import { getAllRoles } from "@/lib/rbac/roles-service";
import { RoleScope } from "@/lib/rbac/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/team/roles
 * Returns all active system and custom roles filtered for the caller's scope (client or vendor).
 * Enables Client and Vendor dashboards to dynamically display, inspect, and assign custom roles
 * created by platform administrators.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest({
      actionName: "GET_TEAM_ROLES",
      resourceType: "role_catalog",
    });

    const { searchParams } = new URL(req.url);
    const requestedScope = searchParams.get("scope") as RoleScope | null;

    // Resolve scope from query param or fallback to caller's context
    let resolvedScope: RoleScope = "client";
    if (requestedScope && ["client", "vendor", "platform"].includes(requestedScope)) {
      resolvedScope = requestedScope;
    } else if (auth.context?.role) {
      if (auth.context.role.startsWith("vendor_")) {
        resolvedScope = "vendor";
      } else if (auth.context.role.startsWith("platform_")) {
        resolvedScope = "platform";
      } else {
        resolvedScope = "client";
      }
    }

    const supabase = await createClient();
    const allRoles = await getAllRoles(supabase, { scope: resolvedScope });

    // Filter to ensure strictly matching scope
    const scopedRoles = allRoles.filter((r) => r.scope === resolvedScope);

    return NextResponse.json({
      success: true,
      scope: resolvedScope,
      roles: scopedRoles,
      total: scopedRoles.length,
    });
  } catch (error: any) {
    console.error("GET /api/v1/team/roles error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "فشل جلب قائمة الأدوار" },
      { status: 500 }
    );
  }
}
