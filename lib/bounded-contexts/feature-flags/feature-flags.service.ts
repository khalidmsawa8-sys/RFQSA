/**
 * Feature Flag Service Layer (Enterprise v3)
 * Supports Tenant Level, Role Level, User Level, Percentage Rollout & Expiration Dates
 */

export interface FeatureFlagRule {
  key: string;
  is_enabled: boolean;
  allowed_roles?: ("client" | "vendor" | "admin")[];
  tenant_ids?: string[];
  user_ids?: string[];
  percentage_rollout?: number; // 0 to 100
  expiration_date?: string;
  description: string;
}

export const SYSTEM_FEATURE_FLAGS: Record<string, FeatureFlagRule> = {
  fleet_management: {
    key: "fleet_management",
    is_enabled: true,
    allowed_roles: ["client", "admin"],
    percentage_rollout: 100,
    description: "كراج أسطول المركبات المؤسسي وإدارة الفروع",
  },
  rfq_radar: {
    key: "rfq_radar",
    is_enabled: true,
    allowed_roles: ["vendor", "admin"],
    percentage_rollout: 100,
    description: "رادار وتصفية الطلبات التخصصي المحمول للذكاء الاصطناعي",
  },
  advanced_analytics: {
    key: "advanced_analytics",
    is_enabled: true,
    allowed_roles: ["client", "vendor", "admin"],
    percentage_rollout: 100,
    description: "التحليلات والتقارير المالية المتقدمة",
  },
  vin_decoder_pro: {
    key: "vin_decoder_pro",
    is_enabled: true,
    allowed_roles: ["client", "vendor", "admin"],
    percentage_rollout: 100,
    description: "مفكك الـ VIN التلقائي لقطع السيارات",
  }
};

export class FeatureFlagEngine {
  isFeatureEnabled(
    flagKey: string,
    context?: {
      role?: "client" | "vendor" | "admin";
      tenantId?: string;
      userId?: string;
    }
  ): boolean {
    const flag = SYSTEM_FEATURE_FLAGS[flagKey];
    if (!flag || !flag.is_enabled) return false;

    // 1. Expiration Date Check
    if (flag.expiration_date && new Date(flag.expiration_date) < new Date()) {
      return false;
    }

    // 2. Role Level Check
    if (context?.role && flag.allowed_roles && flag.allowed_roles.length > 0) {
      if (!flag.allowed_roles.includes(context.role)) return false;
    }

    // 3. Tenant Level Check
    if (context?.tenantId && flag.tenant_ids && flag.tenant_ids.length > 0) {
      if (!flag.tenant_ids.includes(context.tenantId)) return false;
    }

    // 4. User Level Check
    if (context?.userId && flag.user_ids && flag.user_ids.length > 0) {
      if (!flag.user_ids.includes(context.userId)) return false;
    }

    return true;
  }
}

export const featureFlagEngine = new FeatureFlagEngine();
