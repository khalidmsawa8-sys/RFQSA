import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEFAULT_DELIVERY_RULES,
  DeliveryPricingRule,
  DeliveryAuditLog,
} from "@/lib/delivery-engine";
import {
  getServerDeliveryRules,
  saveServerDeliveryRules,
  getServerDeliveryAuditLogs,
  saveServerDeliveryAuditLog,
} from "@/lib/delivery-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/delivery/rules
 * Returns active delivery pricing rules and recent audit logs
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAudit = searchParams.get("include_audit") === "true";

    const rules = getServerDeliveryRules();
    const auditLogs = includeAudit ? getServerDeliveryAuditLogs() : [];

    return NextResponse.json({
      success: true,
      rules,
      audit_logs: auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch delivery rules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/delivery/rules
 * Create, update, or delete a delivery pricing rule (Protected: Admin Only)
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rfq_session")?.value;

    // Security Verification: Admin Only
    const isAdmin = sessionCookie === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "غير مصرح: هذه العملية تتطلب صلاحيات إدارة منصة رفق" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, rule, rule_id } = body;

    let rules = getServerDeliveryRules();
    const adminUser = {
      id: "admin-demo-id",
      name: "المدير العام للمنصة",
    };

    if (action === "create") {
      if (!rule?.city || typeof rule.base_fee !== "number") {
        return NextResponse.json(
          { success: false, error: "يرجى تحديد اسم المدينة والسعر الأساسي بشكل صحيح" },
          { status: 400 }
        );
      }

      // Check duplicate city
      const existing = rules.find(
        (r) => r.city.trim().toLowerCase() === rule.city.trim().toLowerCase()
      );
      if (existing) {
        return NextResponse.json(
          { success: false, error: `توجد قاعدة تسعير مسجلة مسبقاً لمدينة (${rule.city})` },
          { status: 400 }
        );
      }

      // If set as default, unset other defaults
      if (rule.is_default) {
        rules = rules.map((r) => ({ ...r, is_default: false }));
      }

      const newRule: DeliveryPricingRule = {
        id: `rule-${Date.now()}`,
        city: rule.city.trim(),
        base_fee: Math.max(0, Number(rule.base_fee) || 25),
        base_distance_km: Math.max(1, Number(rule.base_distance_km) || 15),
        extra_fee_per_km: Math.max(0, Number(rule.extra_fee_per_km) || 1.5),
        intercity_fee: Math.max(0, Number(rule.intercity_fee) || 45),
        min_fee: Math.max(0, Number(rule.min_fee) || Number(rule.base_fee) || 25),
        estimated_delivery_hours: Math.max(1, Number(rule.estimated_delivery_hours) || 24),
        is_active: rule.is_active !== false,
        is_default: Boolean(rule.is_default),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: adminUser.name,
      };

      rules.push(newRule);
      saveServerDeliveryRules(rules);

      // Audit Log
      const auditLog: DeliveryAuditLog = {
        id: `audit-${Date.now()}`,
        rule_id: newRule.id,
        city: newRule.city,
        user_id: adminUser.id,
        user_name: adminUser.name,
        action_type: "create",
        old_values: null,
        new_values: newRule,
        created_at: new Date().toISOString(),
      };
      saveServerDeliveryAuditLog(auditLog);

      return NextResponse.json({ success: true, rule: newRule, rules });
    }

    if (action === "update") {
      if (!rule?.id) {
        return NextResponse.json(
          { success: false, error: "معرف القاعدة مطلوب للتعديل" },
          { status: 400 }
        );
      }

      const index = rules.findIndex((r) => r.id === rule.id);
      if (index === -1) {
        return NextResponse.json(
          { success: false, error: "قاعدة التسعير غير موجودة" },
          { status: 404 }
        );
      }

      const oldRule = rules[index];

      // If set as default, unset other defaults
      if (rule.is_default) {
        rules = rules.map((r) => (r.id === rule.id ? r : { ...r, is_default: false }));
      }

      const updatedRule: DeliveryPricingRule = {
        ...oldRule,
        city: rule.city ? rule.city.trim() : oldRule.city,
        base_fee: typeof rule.base_fee === "number" ? Math.max(0, rule.base_fee) : oldRule.base_fee,
        base_distance_km:
          typeof rule.base_distance_km === "number"
            ? Math.max(1, rule.base_distance_km)
            : oldRule.base_distance_km,
        extra_fee_per_km:
          typeof rule.extra_fee_per_km === "number"
            ? Math.max(0, rule.extra_fee_per_km)
            : oldRule.extra_fee_per_km,
        intercity_fee:
          typeof rule.intercity_fee === "number"
            ? Math.max(0, rule.intercity_fee)
            : oldRule.intercity_fee,
        min_fee: typeof rule.min_fee === "number" ? Math.max(0, rule.min_fee) : oldRule.min_fee,
        estimated_delivery_hours:
          typeof rule.estimated_delivery_hours === "number"
            ? Math.max(1, rule.estimated_delivery_hours)
            : oldRule.estimated_delivery_hours,
        is_active: typeof rule.is_active === "boolean" ? rule.is_active : oldRule.is_active,
        is_default: typeof rule.is_default === "boolean" ? rule.is_default : oldRule.is_default,
        updated_at: new Date().toISOString(),
      };

      rules[index] = updatedRule;
      saveServerDeliveryRules(rules);

      // Audit Log
      const auditLog: DeliveryAuditLog = {
        id: `audit-${Date.now()}`,
        rule_id: updatedRule.id,
        city: updatedRule.city,
        user_id: adminUser.id,
        user_name: adminUser.name,
        action_type: "update",
        old_values: oldRule,
        new_values: updatedRule,
        created_at: new Date().toISOString(),
      };
      saveServerDeliveryAuditLog(auditLog);

      return NextResponse.json({ success: true, rule: updatedRule, rules });
    }

    if (action === "delete") {
      const targetId = rule_id || rule?.id;
      if (!targetId) {
        return NextResponse.json({ success: false, error: "معرف القاعدة مطلوب" }, { status: 400 });
      }

      const oldRule = rules.find((r) => r.id === targetId);
      if (!oldRule) {
        return NextResponse.json({ success: false, error: "القاعدة غير موجودة" }, { status: 404 });
      }

      if (oldRule.is_default) {
        return NextResponse.json(
          { success: false, error: "لا يمكن حذف القاعدة الافتراضية للنظام" },
          { status: 400 }
        );
      }

      rules = rules.filter((r) => r.id !== targetId);
      saveServerDeliveryRules(rules);

      // Audit Log
      const auditLog: DeliveryAuditLog = {
        id: `audit-${Date.now()}`,
        rule_id: targetId,
        city: oldRule.city,
        user_id: adminUser.id,
        user_name: adminUser.name,
        action_type: "delete",
        old_values: oldRule,
        new_values: null,
        created_at: new Date().toISOString(),
      };
      saveServerDeliveryAuditLog(auditLog);

      return NextResponse.json({ success: true, rules });
    }

    if (action === "reset_defaults") {
      rules = DEFAULT_DELIVERY_RULES;
      saveServerDeliveryRules(rules);

      const auditLog: DeliveryAuditLog = {
        id: `audit-${Date.now()}`,
        city: "إعادة تعيين القواعد الافتراضية",
        user_id: adminUser.id,
        user_name: adminUser.name,
        action_type: "update",
        old_values: null,
        new_values: null,
        created_at: new Date().toISOString(),
      };
      saveServerDeliveryAuditLog(auditLog);

      return NextResponse.json({ success: true, rules });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update delivery rules" },
      { status: 500 }
    );
  }
}
