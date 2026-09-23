import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/team/members
 * Retrieves all members and pending invitations for the caller's organization.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest({
      requiredPermission: "team:view",
      actionName: "GET_TEAM_MEMBERS",
      resourceType: "team",
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.statusCode || 403 }
      );
    }

    const supabase = await createClient();

    const { data: members, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        user_id,
        email,
        phone,
        full_name,
        role_id,
        custom_permissions,
        explicit_denies,
        status,
        invitation_expires_at,
        created_at,
        last_active_at,
        accepted_at
      `)
      .eq("organization_id", auth.context.organizationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const activeMembers = (members || []).filter((m: any) => m.status !== "revoked");

    return NextResponse.json({
      success: true,
      organizationId: auth.context.organizationId,
      currentUserRole: auth.context.role,
      isOwner: auth.context.isOwner,
      members: activeMembers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
