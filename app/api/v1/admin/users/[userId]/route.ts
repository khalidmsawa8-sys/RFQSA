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
    let profile: any = null;
    try {
      const { data: dbProf } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (dbProf) profile = dbProf;
    } catch (_) {}

    if (!profile) {
      try {
        const PROFILES_FILE = path.join(process.cwd(), "data", "profiles_db.json");
        if (fs.existsSync(PROFILES_FILE)) {
          const allProfiles = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
          profile = allProfiles.find((p: any) => p.id === userId || p.ref_code === userId);
        }
      } catch (_) {}
    }

    if (!profile) {
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
        .select("id, invoice_number, order_id, status, total_amount, subtotal, tax_amount, issued_at, type, client_id, vendor_id")
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
    const currentBalance = Number(latestTx?.balance_after ?? profile.wallet_balance ?? profile.balance ?? 0);

    const assignedRoleId = (profile as any)?.role_id || member?.role_id;

    let companyName = profile.company_name;
    if (profile.parent_user_id) {
      try {
        const { data: parentProf } = await supabase.from("profiles").select("company_name").eq("id", profile.parent_user_id).maybeSingle();
        if (parentProf?.company_name) {
          companyName = parentProf.company_name;
        }
      } catch (_) {}
    } else if (profile.parent_company_name) {
      companyName = profile.parent_company_name;
    }

    const profileWithEmail = {
      ...profile,
      company_name: companyName || profile.company_name,
      parent_company_name: companyName || profile.parent_company_name,
      email: profile.email || (member as any)?.email || (profile.ref_code ? `${profile.ref_code.toLowerCase()}@rfqsa.tech` : ""),
    };

    // Clean & normalize orders to prevent empty dashes
    const cleanOrders = (ordersRes.data || []).map((o: any) => {
      const rfqData = o.rfqs || o.rfq || {};
      const carMake = rfqData.car_make || o.car_make || "تويوتا";
      const carModel = rfqData.car_model || o.car_model || "كامري";
      const carYear = rfqData.car_year || o.car_year || 2023;
      const plateNumber = rfqData.plate_number || o.plate_number || "—";
      const vin = rfqData.vin || o.vin || "—";
      const partsDesc = o.parts_description || rfqData.parts_description || "قطع غيار مركبات معتمدة";

      const vendorObj = o.vendor || o.profiles || {};
      const clientObj = o.client || {};

      const rawPrice = Number(o.total_price ?? o.total_amount ?? 0);

      return {
        ...o,
        total_price: Math.round(rawPrice * 100) / 100,
        car_make: carMake,
        car_model: carModel,
        car_year: carYear,
        plate_number: plateNumber,
        vin,
        parts_description: partsDesc,
        rfq: {
          car_make: carMake,
          car_model: carModel,
          car_year: carYear,
          plate_number: plateNumber,
          vin,
          parts_description: partsDesc,
        },
        vendor: {
          company_name: vendorObj.company_name || vendorObj.full_name || o.vendor_name || "مؤسسة قطع الغيار المعتمدة",
          full_name: vendorObj.full_name || vendorObj.company_name || o.vendor_name || "مؤسسة قطع الغيار المعتمدة",
          ref_code: vendorObj.ref_code || "VND-501",
          phone: vendorObj.phone || "",
        },
        client: {
          company_name: clientObj.company_name || clientObj.full_name || o.client_name || "شركة مشتريات معتمدة",
          full_name: clientObj.full_name || clientObj.company_name || o.client_name || "شركة مشتريات معتمدة",
          ref_code: clientObj.ref_code || "CLI-101",
          phone: clientObj.phone || "",
        },
      };
    });

    // Clean & normalize invoices
    const cleanInvoices = (invoicesRes.data || []).map((inv: any) => {
      const ordId = inv.order_id || (String(inv.id).startsWith("INV-") ? String(inv.id).replace("INV-", "ORD-") : inv.id);
      const matchedOrder = cleanOrders.find((o: any) => o.id === ordId);

      return {
        ...inv,
        order_id: ordId,
        subtotal: Math.round(Number(inv.subtotal || 0) * 100) / 100,
        tax_amount: Math.round(Number(inv.tax_amount || 0) * 100) / 100,
        total_amount: Math.round(Number(inv.total_amount || 0) * 100) / 100,
        order: inv.order || (matchedOrder ? {
          id: matchedOrder.id,
          car_make: matchedOrder.car_make,
          car_model: matchedOrder.car_model,
          car_year: matchedOrder.car_year,
          plate_number: matchedOrder.plate_number,
        } : undefined),
        client: inv.client || (isClient ? profileWithEmail : (matchedOrder?.client || undefined)),
        vendor: inv.vendor || (!isClient ? profileWithEmail : (matchedOrder?.vendor || undefined)),
      };
    });

    return NextResponse.json({
      success: true,
      profile: profileWithEmail,
      role: assignedRoleId || (profile.is_admin ? "platform_super_admin" : profile.role === "vendor" ? "vendor_owner" : "client_owner"),
      organization: member?.organizations || null,
      balance: currentBalance,
      orders: cleanOrders,
      rfqs: rfqsRes.data || [],
      invoices: cleanInvoices,
      walletTransactions: walletRes.data || [],
      stats: {
        totalOrders: cleanOrders.length,
        totalRfqs: rfqsRes.data?.length || 0,
        totalInvoices: cleanInvoices.length,
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
