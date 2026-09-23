/**
 * Server-Side Sensitive Data Projection & Sanitization
 * Enforces Least Privilege by projecting DTOs based on effective permissions
 */

import { SystemPermission } from "./permissions";

/**
 * Projects an RFQ record, masking sensitive information (like full VIN)
 * unless the user possesses elevated permissions.
 */
export function projectRfqDTO(
  rfq: any,
  effectivePermissions: Set<SystemPermission>
): any {
  if (!rfq) return rfq;

  const canViewAll = effectivePermissions.has("rfqs:view_all");
  const canManage = effectivePermissions.has("rfqs:manage");
  const canViewFull = canViewAll || canManage || effectivePermissions.has("rfqs:view");

  const sanitized = { ...rfq };

  // Mask VIN if not authorized to see full manufacturing specs
  if (sanitized.vin && !canViewFull) {
    sanitized.vin = `${sanitized.vin.slice(0, 3)}****${sanitized.vin.slice(-4)}`;
  }

  // Mask client phone if not authorized
  if (sanitized.profiles?.phone && !canViewAll) {
    const p = sanitized.profiles.phone;
    sanitized.profiles = {
      ...sanitized.profiles,
      phone: p.length > 4 ? `${p.slice(0, 3)}****${p.slice(-2)}` : "****",
    };
  }

  return sanitized;
}

/**
 * Projects an Order record, masking payout / banking details unless authorized.
 */
export function projectOrderDTO(
  order: any,
  effectivePermissions: Set<SystemPermission>
): any {
  if (!order) return order;

  const canViewFinance = effectivePermissions.has("finance:view");
  const canViewPayout = effectivePermissions.has("finance:payout");

  const sanitized = { ...order };

  // Remove internal profit margins and vendor payout rates from client-facing roles
  if (!canViewPayout && sanitized.vendor_payout_amount !== undefined) {
    delete sanitized.vendor_payout_amount;
  }
  if (!canViewFinance && sanitized.financial_breakdown !== undefined) {
    delete sanitized.financial_breakdown;
  }

  return sanitized;
}
