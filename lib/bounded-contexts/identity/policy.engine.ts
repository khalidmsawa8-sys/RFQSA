/**
 * Enterprise Centralized Policy Engine (v4)
 * Centralizes permission checks for Organization updates, Team management & Security API actions
 */

import { OrganizationMembershipDTO, MembershipRole } from "./identity.types";

export type SystemPermission =
  | "organization:update"
  | "verification:submit"
  | "team:invite"
  | "team:manage"
  | "apikeys:manage"
  | "billing:manage"
  | "security:update";

export const ROLE_DEFAULT_PERMISSIONS: Record<MembershipRole, SystemPermission[]> = {
  owner: [
    "organization:update",
    "verification:submit",
    "team:invite",
    "team:manage",
    "apikeys:manage",
    "billing:manage",
    "security:update",
  ],
  procurement_manager: [
    "organization:update",
    "verification:submit",
    "team:invite",
  ],
  accountant: [
    "billing:manage",
  ],
  staff: [],
};

export class PolicyEngine {
  canExecuteAction(
    membership: OrganizationMembershipDTO,
    requiredPermission: SystemPermission
  ): boolean {
    if (membership.role === "owner") return true;

    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[membership.role] || [];
    if (defaultPerms.includes(requiredPermission)) return true;

    // Check custom explicit permissions
    return membership.custom_permissions.includes(requiredPermission);
  }
}

export const policyEngine = new PolicyEngine();
