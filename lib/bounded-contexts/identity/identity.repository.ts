/**
 * Identity Bounded Context Repository (Enterprise v4)
 * Manages Multi-Org Memberships, Subscriptions, Active Sessions, API Keys & Verification Workflows
 */

import {
  UserIdentityDTO,
  OrganizationDTO,
  OrganizationMembershipDTO,
  SubscriptionEntitlementDTO,
  ActiveSessionDTO,
  ApiKeyDTO,
  ActivityRecordDTO,
} from "./identity.types";

export class IdentityRepository {
  private demoUser: UserIdentityDTO = {
    user_id: "usr-demo-101",
    full_name: "حامد مساوي",
    email: "client@rfqsa.tech",
    phone: "0533196489",
    preferred_language: "ar",
    timezone: "Asia/Riyadh",
    theme: "dark",
    created_at: new Date(Date.now() - 86400000 * 180).toISOString(),
  };

  private clientOrg: OrganizationDTO = {
    id: "org-national-procurement",
    name: "شركة المشتريات الوطنية B2B (مشتريات ورش وأساطيل)",
    cr_number: "1010892182",
    tax_number: "310982718200003",
    iban: "SA4420000001234567890123",
    city: "الرياض",
    address: "طريق الملك فهد - البرج المالي، الدور 14",
    verification_status: "approved",
    verified_badge: true,
    created_at: new Date(Date.now() - 86400000 * 150).toISOString(),
  };

  private vendorOrg: OrganizationDTO = {
    id: "org-vendor-master-parts",
    name: "مؤسسة قطع الغيار المعتمدة (توزيـع وتوريد قطع OEM)",
    cr_number: "1010772910",
    tax_number: "310887192800003",
    iban: "SA9980000009876543210987",
    city: "الرياض - الصناعية القديمة",
    address: "حي الملز - شارع قطع الغيار الرئيسي، مجمع 4",
    verification_status: "approved",
    verified_badge: true,
    created_at: new Date(Date.now() - 86400000 * 200).toISOString(),
  };

  private demoMemberships: OrganizationMembershipDTO[] = [
    {
      id: "mem-1",
      user_id: "usr-demo-101",
      organization_id: "org-national-procurement",
      organization_name: "شركة المشتريات الوطنية B2B",
      role: "owner",
      custom_permissions: ["organization:update", "verification:submit", "team:manage"],
      invitation_status: "accepted",
      joined_at: new Date(Date.now() - 86400000 * 150).toISOString(),
      last_active_at: new Date().toISOString(),
    },
    {
      id: "mem-2",
      user_id: "usr-demo-101",
      organization_id: "org-gold-fleet",
      organization_name: "مؤسسة الأسطول الذهبي للنقليات",
      role: "procurement_manager",
      custom_permissions: ["organization:update"],
      invitation_status: "accepted",
      joined_at: new Date(Date.now() - 86400000 * 60).toISOString(),
      last_active_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
  ];

  private demoSubscription: SubscriptionEntitlementDTO = {
    plan_key: "enterprise_b2b",
    plan_name: "الباقة المؤسسية الشاملة (Enterprise B2B)",
    billing_cycle: "yearly",
    renewal_date: "2027-01-01",
    status: "active",
    max_team_members: 50,
    max_monthly_rfqs: 10000,
    features_unlocked: [
      "كراج الأسطول المؤسسي المتقدم",
      "رادار وتصفية الطلبات التخصصي",
      "تكامل الـ API والـ Webhooks",
      "إدارة الفرق والصلاحيات المخصصة",
      "دعم فني خاص 24/7 عبر الواتساب"
    ]
  };

  private demoSessions: ActiveSessionDTO[] = [
    {
      id: "sess-cur-1",
      device_name: "MacBook Pro 16",
      os: "macOS Sonoma",
      browser: "Chrome 122.0",
      ip_address: "147.93.56.252",
      location: "الرياض، المملكة العربية السعودية",
      is_current: true,
      last_active_at: new Date().toISOString(),
    },
    {
      id: "sess-mob-2",
      device_name: "iPhone 15 Pro",
      os: "iOS 17.4",
      browser: "Safari Mobile",
      ip_address: "95.185.12.80",
      location: "الرياض، المملكة العربية السعودية",
      is_current: false,
      last_active_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    }
  ];

  private demoApiKeys: ApiKeyDTO[] = [
    {
      id: "key-1",
      name: "ERP Integration Key (المحتوى والمشتريات)",
      key_prefix: "rfq_live_sec_99a82...",
      scopes: ["rfq:read", "rfq:write", "fleet:read"],
      created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
      last_used_at: new Date().toISOString(),
    }
  ];

  private demoActivities: ActivityRecordDTO[] = [
    {
      id: "act-1",
      user_name: "حامد مساوي",
      action_title: "تحديث بيانات تواصل المؤسسة وساعات المشتريات",
      category: "organization",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      ip_address: "147.93.56.252",
    },
    {
      id: "act-2",
      user_name: "حامد مساوي",
      action_title: "إيقاف جلسة نشطة على جهاز iPad Air",
      category: "security",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      ip_address: "147.93.56.252",
    },
    {
      id: "act-3",
      user_name: "النظام الآلي",
      action_title: "اعتماد التوثيق والسجل التجاري وتفعيل الوسام الذهبي Verified Badge",
      category: "verification",
      timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
      ip_address: "147.93.56.252",
    }
  ];

  /* ──────────────── Methods ──────────────── */
  async getUserIdentity(): Promise<UserIdentityDTO> {
    return this.demoUser;
  }

  async getOrganization(role: "client" | "vendor" = "client"): Promise<OrganizationDTO> {
    return role === "vendor" ? this.vendorOrg : this.clientOrg;
  }

  async getMemberships(): Promise<OrganizationMembershipDTO[]> {
    return this.demoMemberships;
  }

  async getSubscription(): Promise<SubscriptionEntitlementDTO> {
    return this.demoSubscription;
  }

  async getActiveSessions(): Promise<ActiveSessionDTO[]> {
    return this.demoSessions;
  }

  async getApiKeys(): Promise<ApiKeyDTO[]> {
    return this.demoApiKeys;
  }

  async getActivityLogs(): Promise<ActivityRecordDTO[]> {
    return this.demoActivities;
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    this.demoSessions = this.demoSessions.filter((s) => s.id !== sessionId);
    return true;
  }

  async createApiKey(name: string): Promise<ApiKeyDTO> {
    const newKey: ApiKeyDTO = {
      id: `key-${Date.now()}`,
      name,
      key_prefix: `rfq_live_sec_${Math.random().toString(36).substring(2, 8)}...`,
      scopes: ["rfq:read", "rfq:write"],
      created_at: new Date().toISOString(),
    };
    this.demoApiKeys.unshift(newKey);
    return newKey;
  }
}

export const identityRepository = new IdentityRepository();
