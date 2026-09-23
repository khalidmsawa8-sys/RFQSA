import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/team/audit
 * Retrieves audit logs for the caller's organization.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest({
      requiredPermission: "audit:view",
      actionName: "GET_AUDIT_LOGS",
      resourceType: "audit_logs",
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.statusCode || 403 }
      );
    }

    const supabase = await createClient();

    let query = supabase
      .from("staff_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!auth.context.isSuperAdmin) {
      query = query.eq("organization_id", auth.context.organizationId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
