import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/features/auth/models/user_model.dart';

/// Granular RBAC Navigation Guard for RFQSA Mobile (1:1 Web Parity with lib/rbac/navigation-guard.ts)
class NavigationGuard {
  /// Evaluates whether a navigation item or route is allowed for the active user.
  static bool isRouteAllowed(String route, UserModel? user) {
    if (user == null) return true; // Graceful fallback

    // 1. Super Admins & Organization Owners have full platform access
    if (user.isOwner || user.isSuperAdmin || user.role == 'admin') return true;
    if (user.roleId == 'client_owner' || user.roleId == 'vendor_owner' || user.roleId == 'platform_super_admin') {
      return true;
    }

    final cleanRoute = route.split('?')[0];

    // 2. Universal routes open to all authenticated organization members & auth routes
    if (cleanRoute == AppRouter.splash ||
        cleanRoute == AppRouter.login ||
        cleanRoute == AppRouter.otp ||
        cleanRoute == AppRouter.clientHome ||
        cleanRoute == AppRouter.vendorHome ||
        cleanRoute == AppRouter.courierHome ||
        cleanRoute == AppRouter.clientSupport ||
        cleanRoute == AppRouter.vendorSupport ||
        cleanRoute == AppRouter.courierSupport ||
        cleanRoute == AppRouter.support ||
        cleanRoute == AppRouter.notifications) {
      return true;
    }

    // 3. RFQ Module (Create & View RFQs)
    if (cleanRoute == AppRouter.clientCreateRfq) {
      return user.hasPermission('rfqs:create');
    }

    // 4. Orders & Deals Module
    if (cleanRoute == AppRouter.clientOrders ||
        cleanRoute == AppRouter.vendorOrders ||
        cleanRoute == AppRouter.clientDealRoom ||
        cleanRoute == AppRouter.clientOrderTracking) {
      return user.hasPermission('orders:view');
    }

    // 5. Fleet & Garage Module (Requires explicit fleet permission)
    if (cleanRoute == AppRouter.clientGarage) {
      return user.hasPermission('fleet:manage');
    }

    // 6. Branch, Location & Map Module
    if (cleanRoute == AppRouter.clientVendorsMap) {
      return user.hasAnyPermission(const [
        'branch:manage_location',
        'rfqs:create',
        'rfqs:view',
      ]);
    }

    // 7. Finance & Tax Invoices Module (ZATCA)
    if (cleanRoute == AppRouter.clientInvoices || cleanRoute == AppRouter.vendorInvoices) {
      return user.hasAnyPermission(const [
        'finance:invoice',
        'finance:view',
      ]);
    }

    // 8. Finance & Wallet Module
    if (cleanRoute == AppRouter.wallet || cleanRoute == AppRouter.courierEarnings) {
      return user.hasAnyPermission(const [
        'finance:view',
        'finance:payment',
        'finance:payout',
      ]);
    }

    // 9. Roles & Team Management Module
    if (cleanRoute == AppRouter.clientRoles || cleanRoute == AppRouter.vendorRoles) {
      return user.hasAnyPermission(const [
        'team:view',
        'team:invite',
        'team:update',
        'team:suspend',
      ]);
    }

    // 10. Organization Profile & Settings Module
    if (cleanRoute == AppRouter.profile ||
        cleanRoute == AppRouter.clientSettings ||
        cleanRoute == AppRouter.vendorSettings ||
        cleanRoute == AppRouter.vendorSpecializations) {
      return user.hasAnyPermission(const [
        'organization:update',
        'org:manage_profile',
        'org:settings',
      ]);
    }

    // 11. Vendor Radar Module
    if (cleanRoute == AppRouter.vendorRadar) {
      return user.hasPermission('quotes:view_radar');
    }

    // 12. Vendor Quote Module
    if (cleanRoute == AppRouter.vendorQuote) {
      return user.hasAnyPermission(const [
        'quotes:create',
        'quotes:update',
      ]);
    }

    // Default: Deny restricted routes if not explicitly matched
    return false;
  }

  /// Human-readable Arabic label for routes (for access denial screens)
  static String getRouteTitle(String route) {
    final cleanRoute = route.split('?')[0];
    switch (cleanRoute) {
      case AppRouter.clientGarage:
        return 'إدارة المركبات (المرآب)';
      case AppRouter.clientInvoices:
      case AppRouter.vendorInvoices:
        return 'الفواتير الضريبية ZATCA';
      case AppRouter.wallet:
      case AppRouter.courierEarnings:
        return 'المحفظة والرصيد';
      case AppRouter.clientRoles:
      case AppRouter.vendorRoles:
        return 'فريق العمل والصلاحيات';
      case AppRouter.clientSettings:
      case AppRouter.vendorSettings:
        return 'إعدادات العضوية والمنشأة';
      case AppRouter.profile:
        return 'الملف المؤسسي';
      case AppRouter.vendorSpecializations:
        return 'ماركات ومجالات التوريد';
      case AppRouter.vendorRadar:
        return 'رادار الطلبات الذكي';
      case AppRouter.clientCreateRfq:
        return 'إنشاء طلب تسعير جديد';
      default:
        return 'هذا القسم';
    }
  }
}
