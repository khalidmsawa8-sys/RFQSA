/**
 * Granular RBAC Navigation Guard & Feature Visibility Engine
 * Evaluates whether a sidebar item, mobile dock item, or dashboard feature
 * is accessible based on the user's granted permissions.
 */

import { SystemPermission, RoleId } from "./permissions";

/**
 * Checks if a specific navigation path is allowed for a user given their permissions.
 */
export function isNavItemAllowed(
  itemHref: string,
  userPermissions: Set<SystemPermission> | string[] = [],
  isOwner: boolean = false,
  isSuperAdmin: boolean = false
): boolean {
  if (isOwner || isSuperAdmin) return true;

  const perms = userPermissions instanceof Set ? userPermissions : new Set(userPermissions);

  // 1. General pages accessible to all authenticated organization members
  const cleanHref = itemHref.split("?")[0];
  if (
    cleanHref === "/client" ||
    cleanHref === "/vendor" ||
    cleanHref === "/client/support" ||
    cleanHref === "/vendor/support" ||
    cleanHref.includes("/support/")
  ) {
    return true;
  }

  // 2. RFQ Module (Create & View RFQs)
  if (cleanHref === "/client/new-rfq" || cleanHref.includes("/new-rfq")) {
    return perms.has("rfqs:create");
  }

  if (cleanHref === "/client/rfqs" || cleanHref.includes("/rfq/")) {
    return perms.has("rfqs:view") || perms.has("rfqs:create");
  }

  // 3. Quotes & Radar Module (Vendor)
  if (cleanHref === "/vendor/radar" || cleanHref.includes("/radar")) {
    return perms.has("quotes:view_radar");
  }

  // 4. Orders Module
  if (
    cleanHref === "/client/orders" ||
    cleanHref === "/vendor/orders" ||
    cleanHref.includes("/order/") ||
    cleanHref.includes("/deal/")
  ) {
    return perms.has("orders:view");
  }

  // 5. Fleet & Garage Module
  if (cleanHref === "/client/garage" || cleanHref.includes("/garage")) {
    return perms.has("fleet:manage");
  }

  // 6. Branch & Pickup / Map Module
  if (
    cleanHref === "/client/vendors-map" ||
    cleanHref.includes("/vendors-map") ||
    itemHref.includes("pickup_location")
  ) {
    return (
      perms.has("branch:manage_location") ||
      perms.has("rfqs:create") ||
      perms.has("rfqs:view")
    );
  }

  // 7. Finance & Tax Invoices Module
  if (cleanHref === "/client/invoices" || cleanHref === "/vendor/invoices") {
    return perms.has("finance:invoice") || perms.has("finance:view");
  }

  // 8. Finance & Wallet Module
  if (cleanHref === "/client/wallet" || cleanHref === "/vendor/wallet") {
    return (
      perms.has("finance:view") ||
      perms.has("finance:payment") ||
      perms.has("finance:payout")
    );
  }

  // 9. Roles & Team Management Module
  if (cleanHref === "/client/roles" || cleanHref === "/vendor/roles") {
    return (
      perms.has("team:view") ||
      perms.has("team:invite") ||
      perms.has("team:update") ||
      perms.has("team:suspend")
    );
  }

  // 10. Organization Profile & Settings Module
  if (
    cleanHref === "/client/profile" ||
    cleanHref === "/vendor/profile" ||
    cleanHref === "/client/settings" ||
    cleanHref === "/vendor/settings"
  ) {
    return perms.has("organization:update");
  }

  // Default fallback: if not explicitly covered, require at least 1 permission or owner
  return false;
}

/**
 * Human-friendly Arabic labels for roles
 */
export const ROLE_DISPLAY_NAMES_AR: Record<string, string> = {
  platform_super_admin: "المدير العام للمنصة",
  platform_rfq_monitor: "مراقب طلبات التسعير",
  platform_accountant: "المحاسب المالي العام",
  platform_compliance: "مسؤول الامتثال والتحقق",
  platform_support: "مسؤول الدعم والنزاعات",

  client_owner: "المالك / المدير العام",
  client_procurement_manager: "مدير المشتريات",
  client_rfq_supervisor: "مراقب طلبات التسعير والنشاط",
  client_accountant: "محاسب المنشأة",
  client_technician: "فني الورشة / طالب القطع",

  vendor_owner: "مالك المتجر / شريك مفوض",
  vendor_sales_agent: "مسؤول التسعير والمبيعات",
  vendor_warehouse_clerk: "أمين المستودع والتجهيز",
  vendor_accountant: "محاسب المبيعات والفواتير",
};

/**
 * Resolves role Arabic title (including custom roles)
 */
export function getRoleDisplayNameAr(roleId?: string, fallbackName?: string): string {
  if (!roleId) return fallbackName || "عضو فريق العمل";
  if (ROLE_DISPLAY_NAMES_AR[roleId]) return ROLE_DISPLAY_NAMES_AR[roleId];
  if (roleId.includes("custom")) return fallbackName || "دور مخصص معتمد ✨";
  return fallbackName || roleId;
}
