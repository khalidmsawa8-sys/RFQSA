/**
 * Identity & Organization Bounded Context (Enterprise Baseline v4)
 * Multi-Org Memberships, Subscriptions, Policy Engine, API Keys, Sessions & Verification Workflows
 */

export type MembershipRole = "owner" | "procurement_manager" | "accountant" | "staff";

export interface UserIdentityDTO {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  preferred_language: "ar" | "en";
  timezone: string;
  theme: "dark" | "light" | "system";
  created_at: string;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  cr_number: string;
  tax_number: string;
  iban: string;
  logo_url?: string;
  address?: string;
  city: string;
  verification_status: "pending" | "under_review" | "approved" | "rejected" | "expired";
  verified_badge: boolean;
  rejection_reason?: string;
  created_at: string;
}

export interface OrganizationMembershipDTO {
  id: string;
  user_id: string;
  organization_id: string;
  organization_name: string;
  role: MembershipRole;
  custom_permissions: string[];
  invitation_status: "pending" | "accepted" | "declined" | "expired" | "revoked";
  joined_at: string;
  last_active_at: string;
}

export interface SubscriptionEntitlementDTO {
  plan_key: "basic" | "premium_gold" | "enterprise_b2b";
  plan_name: string;
  billing_cycle: "monthly" | "yearly";
  renewal_date: string;
  status: "active" | "trial" | "grace_period" | "cancelled";
  max_team_members: number;
  max_monthly_rfqs: number;
  features_unlocked: string[];
}

export interface ActiveSessionDTO {
  id: string;
  device_name: string;
  os: string;
  browser: string;
  ip_address: string;
  location: string;
  is_current: boolean;
  last_active_at: string;
}

export interface ApiKeyDTO {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

export interface ActivityRecordDTO {
  id: string;
  user_name: string;
  action_title: string;
  category: "security" | "organization" | "team" | "verification" | "billing";
  timestamp: string;
  ip_address: string;
}
