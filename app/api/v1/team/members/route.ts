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

    let activeMembers: any[] = [];

    if (!error && members && members.length > 0) {
      activeMembers = members.filter((m: any) => m.status !== "revoked");
    } else {
      // Fallback to disk organization_members_db.json
      try {
        const fs = await import("fs");
        const path = await import("path");
        const file = path.join(process.cwd(), "data", "organization_members_db.json");
        let diskMembers: any[] = [];
        if (fs.existsSync(file)) {
          diskMembers = JSON.parse(fs.readFileSync(file, "utf-8"));
        }

        const orgMembers = diskMembers.filter(
          (m: any) => m.organization_id === auth.context?.organizationId || (!m.organization_id && (auth.context?.role?.startsWith("vendor_") ? m.role_id?.startsWith("vendor_") : m.role_id?.startsWith("client_")))
        );

        if (orgMembers.length > 0) {
          activeMembers = orgMembers.filter((m: any) => m.status !== "revoked");
        } else {
          // Default initial owner membership
          const isVendor = auth.context.role?.startsWith("vendor_");
          const defaultMember = {
            id: `mem-${auth.context.userId || (isVendor ? "vendor-owner-01" : "client-owner-01")}`,
            user_id: auth.context.userId,
            organization_id: auth.context.organizationId,
            email: auth.context.email || (isVendor ? "vendor@rfqsa.tech" : "client@rfqsa.tech"),
            phone: "0501234567",
            full_name: auth.context.fullName || (isVendor ? "مالك متجر قطع الغيار" : "مدير مشتريات المنشأة"),
            role_id: isVendor ? "vendor_owner" : "client_owner",
            custom_permissions: ["organization:update", "team:manage", "team:invite"],
            status: "active",
            created_at: new Date().toISOString(),
          };
          diskMembers.push(defaultMember);
          fs.writeFileSync(file, JSON.stringify(diskMembers, null, 2), "utf-8");
          activeMembers = [defaultMember];
        }
      } catch (diskErr) {
        console.warn("[GET /api/v1/team/members] disk fallback error:", diskErr);
      }
    }

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
