import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/rbac/rbac-guard.server";
import { createMemberInvitation } from "@/lib/rbac/invitation-service";
import { RoleId } from "@/lib/rbac/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/team/invite
 * Invites a new team member with specified role and optional custom permissions.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest({
      requiredPermission: "team:invite",
      actionName: "INVITE_TEAM_MEMBER",
      resourceType: "team_invitation",
    });

    if (!auth.authorized || !auth.context) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { email, phone, fullName, roleId, customPermissions, password } = body;

    if (!email || !roleId) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني والدور الوظيفي مطلوبان" },
        { status: 400 }
      );
    }

    // Role scope validation (prevent client from assigning vendor roles or platform admin roles)
    const callerRole = auth.context.role;
    const isClient = callerRole.startsWith("client_");
    const isVendor = callerRole.startsWith("vendor_");

    if (isClient && !roleId.startsWith("client_")) {
      return NextResponse.json(
        { success: false, error: "لا يمكن لمنشأة العميل تعيين أدوار خارج نطاق العملاء" },
        { status: 403 }
      );
    }

    if (isVendor && !roleId.startsWith("vendor_")) {
      return NextResponse.json(
        { success: false, error: "لا يمكن لمنشأة المورد تعيين أدوار خارج نطاق الموردين" },
        { status: 403 }
      );
    }

    // Owner Protection: Prevent subordinate staff from inviting another Owner
    if (!auth.context.isOwner && !auth.context.isSuperAdmin && (roleId === "client_owner" || roleId === "vendor_owner")) {
      return NextResponse.json(
        { success: false, error: "فقط مالك المنشأة يستطيع تعيين أدوار قيادية عليا" },
        { status: 403 }
      );
    }

    let targetOrgId = auth.context.organizationId;
    if (body.organizationId && auth.context.isSuperAdmin) {
      targetOrgId = body.organizationId;
    } else if (auth.context.isSuperAdmin && targetOrgId === "org-platform-super-admin") {
      targetOrgId = roleId.startsWith("vendor_") ? "org-vendor-demo-id" : "org-client-demo-id";
    }

    const inviteResult = await createMemberInvitation({
      organizationId: targetOrgId,
      email,
      phone,
      fullName,
      roleId: roleId as RoleId,
      customPermissions,
      password,
      invitedByUserId: auth.context.userId,
      invitedByName: auth.context.fullName,
      invitedByRole: auth.context.role,
    });

    if (!inviteResult.success) {
      return NextResponse.json(
        { success: false, error: inviteResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم إنشاء وإرسال الدعوة بنجاح",
      invitationUrl: inviteResult.invitationUrl,
      memberId: inviteResult.memberId,
      password: inviteResult.password,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
