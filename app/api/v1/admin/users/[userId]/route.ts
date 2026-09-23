import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest, recordAuditEvent } from "@/lib/rbac/rbac-guard.server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/users/[userId]
 * Fetches full user data across all 4 related tabs:
 * 1. Profile & Organization & Role
 * 2. Orders & RFQs
 * 3. Invoices
 * 4. Wallet Balance & Transactions
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const authResult = await authorizeRequest({
      requiredPermission: "admin:manage_users",
      actionName: "VIEW_USER_DETAILS",
      resourceType: "profiles",
      resourceId: userId,
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بالاطلاع على تفاصيل المستخدم" },
        { status: authResult.statusCode || 403 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch User Profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json({ error: "لم يتم العثور على المستخدم المطلوب" }, { status: 404 });
    }

    // 2. Fetch Assigned Role & Organization Membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("role_id, status, organization_id, organizations(*)")
      .eq("user_id", userId)
      .maybeSingle();

    // 3. Fetch Orders & RFQs
    const isClient = profile.role === "client";
    const [ordersRes, rfqsRes, invoicesRes, walletRes] = await Promise.all([
      isClient
        ? supabase
            .from("orders")
            .select("id, status, total_price, created_at, vendor:profiles!orders_vendor_id_fkey(full_name, company_name, ref_code), rfq:rfqs!orders_rfq_id_fkey(car_make, car_model, car_year, plate_number)")
            .eq("client_id", userId)
            .order("created_at", { ascending: false })
            .limit(50)
        : supabase
            .from("orders")
            .select("id, status, total_price, created_at, client:profiles!orders_client_id_fkey(full_name, company_name, ref_code), rfq:rfqs!orders_rfq_id_fkey(car_make, car_model, car_year, plate_number)")
            .eq("vendor_id", userId)
            .order("created_at", { ascending: false })
            .limit(50),

      isClient
        ? supabase
            .from("rfqs")
            .select("id, car_make, car_model, car_year, plate_number, status, created_at, expires_at, quotes(count)")
            .eq("client_id", userId)
            .order("created_at", { ascending: false })
            .limit(50)
        : supabase
            .from("quotes")
            .select("id, rfq_id, total_price, status, created_at, rfq:rfqs!quotes_rfq_id_fkey(car_make, car_model, car_year, plate_number)")
            .eq("vendor_id", userId)
            .order("created_at", { ascending: false })
            .limit(50),

      supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, subtotal, tax_amount, issued_at, type")
        .or(`client_id.eq.${userId},vendor_id.eq.${userId}`)
        .order("issued_at", { ascending: false })
        .limit(50),

      supabase
        .from("wallet_transactions")
        .select("id, type, amount, balance_after, description, reference, created_at, performed_by")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Compute balance from latest wallet transaction
    const latestTx = walletRes.data?.[0];
    const currentBalance = Number(latestTx?.balance_after ?? 0);

    const assignedRoleId = (profile as any)?.role_id || member?.role_id;

    const profileWithEmail = {
      ...profile,
      email: profile.email || (member as any)?.email || (profile.ref_code ? `${profile.ref_code.toLowerCase()}@rfqsa.tech` : ""),
    };

    return NextResponse.json({
      success: true,
      profile: profileWithEmail,
      role: assignedRoleId || (profile.is_admin ? "platform_super_admin" : profile.role === "vendor" ? "vendor_owner" : "client_owner"),
      organization: member?.organizations || null,
      balance: currentBalance,
      orders: ordersRes.data || [],
      rfqs: rfqsRes.data || [],
      invoices: invoicesRes.data || [],
      walletTransactions: walletRes.data || [],
      stats: {
        totalOrders: ordersRes.data?.length || 0,
        totalRfqs: rfqsRes.data?.length || 0,
        totalInvoices: invoicesRes.data?.length || 0,
        totalTransactions: walletRes.data?.length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/admin/users/[userId]
 * Updates user profile details or suspends/activates the account.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const authResult = await authorizeRequest({
      requiredPermission: "admin:manage_users",
      actionName: "UPDATE_USER_PROFILE",
      resourceType: "profiles",
      resourceId: userId,
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بتعديل بيانات المستخدم" },
        { status: authResult.statusCode || 403 }
      );
    }

    const body = await req.json();
    const supabase = await createClient();

    // Fetch existing profile for audit comparison
    const { data: beforeData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!beforeData) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const allowedFields = [
      "full_name",
      "email",
      "phone",
      "company_name",
      "tax_number",
      "commercial_register",
      "national_address",
      "role",
      "is_active",
    ];

    const patchData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        patchData[field] = body[field];
      }
    }

    const { data: updatedProfile, error: updateErr } = await supabase
      .from("profiles")
      .update(patchData)
      .eq("id", userId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "فشل تحديث البيانات: " + updateErr.message }, { status: 500 });
    }

    // Direct persistence to profiles_db.json
    try {
      const pFile = path.join(process.cwd(), "data", "profiles_db.json");
      if (fs.existsSync(pFile)) {
        const list = JSON.parse(fs.readFileSync(pFile, "utf-8"));
        if (Array.isArray(list)) {
          const idx = list.findIndex((p: any) => p.id === userId);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...patchData, updated_at: new Date().toISOString() };
            fs.writeFileSync(pFile, JSON.stringify(list, null, 2), "utf-8");
          }
        }
      }
      if ((globalThis as any).__SHARED_SERVER_PROFILES__) {
        (globalThis as any).__SHARED_SERVER_PROFILES__ = (globalThis as any).__SHARED_SERVER_PROFILES__.map((p: any) =>
          p.id === userId ? { ...p, ...patchData, updated_at: new Date().toISOString() } : p
        );
      }
    } catch (fsErr) {
      console.warn("Could not sync patch to profiles_db.json:", fsErr);
    }

    // Record immutable audit event
    if (authResult.context?.userId) {
      await recordAuditEvent({
        actorUserId: authResult.context.userId,
        actorName: authResult.context.fullName || "مشرف النظام",
        actorRole: authResult.context.role || "platform_super_admin",
        action: patchData.is_active === false ? "SUSPEND_USER" : patchData.is_active === true ? "ACTIVATE_USER" : "UPDATE_USER_PROFILE",
        resourceType: "profiles",
        resourceId: userId,
        targetUserId: userId,
        beforeData,
        afterData: updatedProfile,
        severity: patchData.is_active !== undefined ? "high" : "info",
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات المستخدم بنجاح",
      profile: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/admin/users/[userId]
 * Safe Soft-Deactivation / Suspension:
 * Preserves all financial transactions, invoices, and order history while disabling login access.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const authResult = await authorizeRequest({
      requiredPermission: "admin:manage_users",
      actionName: "DEACTIVATE_USER",
      resourceType: "profiles",
      resourceId: userId,
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بتعطيل حسابات المستخدمين" },
        { status: authResult.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const isPermanent = searchParams.get("permanent") === "true";

    const supabase = await createClient();

    // Prevent deleting the root platform super admin
    if (userId === "admin-demo-id" || userId === "admin") {
      return NextResponse.json(
        { error: "لا يمكن حذف حساب الإدارة الرئيسي للمنصة." },
        { status: 400 }
      );
    }

    // Fetch before data for audit
    const { data: beforeData } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (isPermanent) {
      // 1. Permanent deletion from database files
      const removeFromFile = (filename: string, filterFn: (item: any) => boolean) => {
        try {
          const filePath = path.join(process.cwd(), "data", filename);
          if (fs.existsSync(filePath)) {
            const list = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (Array.isArray(list)) {
              const updated = list.filter(filterFn);
              fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
            }
          }
        } catch (e) {
          console.warn(`Failed to delete from ${filename}:`, e);
        }
      };

      removeFromFile("profiles_db.json", (p: any) => p.id !== userId);
      removeFromFile("organizations_db.json", (o: any) => o.owner_user_id !== userId);
      removeFromFile("organization_members_db.json", (m: any) => m.user_id !== userId);
      removeFromFile("wallet_transactions_db.json", (w: any) => w.user_id !== userId);
      removeFromFile("client_vehicles_db.json", (v: any) => v.client_id !== userId);
      removeFromFile("vendor_branches_db.json", (b: any) => b.vendor_id !== userId);

      // 2. Remove from shared memory
      if ((globalThis as any).__SHARED_SERVER_PROFILES__) {
        (globalThis as any).__SHARED_SERVER_PROFILES__ = (globalThis as any).__SHARED_SERVER_PROFILES__.filter((p: any) => p.id !== userId);
      }
      if ((globalThis as any).__SHARED_SERVER_ORGANIZATIONS__) {
        (globalThis as any).__SHARED_SERVER_ORGANIZATIONS__ = (globalThis as any).__SHARED_SERVER_ORGANIZATIONS__.filter((o: any) => o.owner_user_id !== userId);
      }
      if ((globalThis as any).__SHARED_SERVER_ORG_MEMBERS__) {
        (globalThis as any).__SHARED_SERVER_ORG_MEMBERS__ = (globalThis as any).__SHARED_SERVER_ORG_MEMBERS__.filter((m: any) => m.user_id !== userId);
      }

      // 3. Supabase delete calls
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.from("organizations").delete().eq("owner_user_id", userId);
      await supabase.from("organization_members").delete().eq("user_id", userId);

      // Record immutable audit event
      if (authResult.context?.userId) {
        await recordAuditEvent({
          actorUserId: authResult.context.userId,
          actorName: authResult.context.fullName || "مشرف النظام",
          actorRole: authResult.context.role || "platform_super_admin",
          action: "DELETE_USER_PERMANENT",
          resourceType: "profiles",
          resourceId: userId,
          targetUserId: userId,
          beforeData: beforeData || {},
          afterData: { deleted: true },
          severity: "critical",
        });
      }

      return NextResponse.json({
        success: true,
        message: "تم حذف المستخدم وجميع سجلاته نهائياً بنجاح.",
        deleted: true,
      });
    }

    // Check if user has operational or financial history
    const [{ count: orderCount }, { count: invoiceCount }, { count: walletCount }] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).or(`client_id.eq.${userId},vendor_id.eq.${userId}`),
      supabase.from("invoices").select("id", { count: "exact", head: true }).or(`client_id.eq.${userId},vendor_id.eq.${userId}`),
      supabase.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const hasHistory = (orderCount || 0) > 0 || (invoiceCount || 0) > 0 || (walletCount || 0) > 0;

    // Soft-deactivate the profile (sets is_active = false)
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json({ error: "فشل تعطيل الحساب: " + updateErr.message }, { status: 500 });
    }

    // Also suspend organization membership status
    await supabase
      .from("organization_members")
      .update({ status: "suspended" })
      .eq("user_id", userId);

    // Record immutable audit event
    if (authResult.context?.userId) {
      await recordAuditEvent({
        actorUserId: authResult.context.userId,
        actorName: authResult.context.fullName || "مشرف النظام",
        actorRole: authResult.context.role || "platform_super_admin",
        action: "SUSPEND_USER_SAFE_DEACTIVATION",
        resourceType: "profiles",
        resourceId: userId,
        targetUserId: userId,
        beforeData: beforeData || {},
        afterData: { ...beforeData, is_active: false, status: "suspended", preserved_records: { orderCount, invoiceCount, walletCount } },
        severity: "high",
      });
    }

    return NextResponse.json({
      success: true,
      message: hasHistory
        ? "تم تعطيل الحساب بنجاح مع الحفاظ الكامل على السجلات المالية والتاريخية للطلبات والفواتير."
        : "تم تعطيل حساب المستخدم بنجاح.",
      deactivated: true,
      hasHistory,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
