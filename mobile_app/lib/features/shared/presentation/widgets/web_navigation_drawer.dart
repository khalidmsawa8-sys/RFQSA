import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/navigation/navigation_guard.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';
import 'package:rfqsa_mobile/features/auth/models/user_model.dart';

class _DrawerItemConfig {
  final String title;
  final IconData icon;
  final String route;
  final String? badgeText;
  final Color? badgeColor;
  final bool isCta;

  const _DrawerItemConfig({
    required this.title,
    required this.icon,
    required this.route,
    this.badgeText,
    this.badgeColor,
    this.isCta = false,
  });
}

/// WebNavigationDrawer: 1:1 Pixel Match for Mobile Web Slide-Out Drawer (components/mobile-nav.tsx)
/// Fully Enforces Granular RBAC Permissions (Zero-Regression & Strict Parity with Web)
class WebNavigationDrawer extends StatelessWidget {
  final String activeRoute;
  final String role; // 'client', 'vendor', 'courier'

  const WebNavigationDrawer({
    super.key,
    required this.activeRoute,
    this.role = 'client',
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFF0F172A), // Dark Slate
      surfaceTintColor: Colors.transparent,
      width: MediaQuery.of(context).size.width * 0.82,
      child: SafeArea(
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            final user = (state is AuthenticatedState) ? state.user : null;
            final effectiveRole = (state is AuthenticatedState) ? state.activeRole.toLowerCase() : role.toLowerCase();

            return Column(
              children: [
                // ── 1. PROFILE & COMPANY HEADER ──
                _buildProfileHeader(context, user, effectiveRole),

                const Divider(color: Color(0xFF1E293B), height: 1),

                // ── 2. SCROLLABLE NAVIGATION LINKS (RBAC GUARDED) ──
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    children: _buildNavLinks(context, user, effectiveRole),
                  ),
                ),

                const Divider(color: Color(0xFF1E293B), height: 1),

                // ── 3. LOGOUT & FOOTER ──
                _buildFooter(context),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, UserModel? user, String effectiveRole) {
    String fullName = user?.fullName ?? 'شركة المشتريات الوطنية';
    String company = user?.companyName ?? 'مؤسسة مسجلة ومعتمدة';
    
    // Authoritative role badge resolution
    String roleBadge;
    if (user != null && user.roleNameAr != null && user.roleNameAr!.trim().isNotEmpty) {
      roleBadge = user.roleNameAr!.trim();
    } else if (user != null && user.roleId != null) {
      roleBadge = getRoleDisplayTitle(user.roleId, null);
    } else if (effectiveRole == 'vendor') {
      roleBadge = 'مورد قطع غيار معتمد 🏢';
    } else if (effectiveRole == 'courier') {
      roleBadge = 'مندوب توصيل معتمد 🚚';
    } else {
      roleBadge = 'عميل معتمد B2B';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.primaryBorder.withOpacity(0.4), width: 1.5),
            ),
            child: Center(
              child: Text(
                fullName.isNotEmpty ? fullName.substring(0, 1) : 'ر',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  company,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: AppColors.emeraldSurface.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.emerald.withOpacity(0.4)),
                  ),
                  child: Text(
                    roleBadge,
                    style: const TextStyle(
                      color: AppColors.emerald,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildNavLinks(BuildContext context, UserModel? user, String effectiveRole) {
    List<_DrawerItemConfig> candidateItems = [];

    if (effectiveRole == 'vendor') {
      candidateItems = const [
        _DrawerItemConfig(title: 'نظرة عامة', icon: Icons.dashboard_rounded, route: AppRouter.vendorHome),
        _DrawerItemConfig(title: 'رادار الطلبات الذكي', icon: Icons.bolt_rounded, route: AppRouter.vendorRadar, badgeText: 'رادار حي ⚡', badgeColor: AppColors.amber),
        _DrawerItemConfig(title: 'الطلبات والمبيعات', icon: Icons.shopping_bag_rounded, route: AppRouter.vendorOrders),
        _DrawerItemConfig(title: 'الفواتير الضريبية', icon: Icons.receipt_long_rounded, route: AppRouter.vendorInvoices),
        _DrawerItemConfig(title: 'المحفظة والأرباح', icon: Icons.account_balance_wallet_rounded, route: AppRouter.wallet),
        _DrawerItemConfig(title: 'تخصصات قطع الغيار', icon: Icons.category_rounded, route: AppRouter.vendorSpecializations),
        _DrawerItemConfig(title: 'الملف التجاري', icon: Icons.person_rounded, route: AppRouter.profile),
        _DrawerItemConfig(title: 'فريق العمل والأدوار', icon: Icons.verified_user_rounded, route: AppRouter.vendorRoles),
        _DrawerItemConfig(title: 'الدعم والمساعدة', icon: Icons.support_agent_rounded, route: AppRouter.vendorSupport),
        _DrawerItemConfig(title: 'إعدادات العضوية والفرع', icon: Icons.settings_rounded, route: AppRouter.vendorSettings, badgeText: '⚙️', badgeColor: AppColors.primary),
      ];
    } else if (effectiveRole == 'courier') {
      candidateItems = const [
        _DrawerItemConfig(title: 'لوحة مهام التوصيل', icon: Icons.dashboard_rounded, route: AppRouter.courierHome),
        _DrawerItemConfig(title: 'المهام والشحنات الميدانية', icon: Icons.local_shipping_rounded, route: AppRouter.courierOrders),
        _DrawerItemConfig(title: 'سجل الأرباح والمحفظة', icon: Icons.account_balance_wallet_rounded, route: AppRouter.wallet),
        _DrawerItemConfig(title: 'الملف الشخصي للمندوب', icon: Icons.person_rounded, route: AppRouter.profile),
        _DrawerItemConfig(title: 'الدعم والمساعدة', icon: Icons.support_agent_rounded, route: AppRouter.courierSupport),
      ];
    } else {
      // Default: Client
      candidateItems = const [
        _DrawerItemConfig(title: 'نظرة عامة', icon: Icons.dashboard_rounded, route: AppRouter.clientHome),
        _DrawerItemConfig(title: 'طلب عرض سعر جديد', icon: Icons.add_circle_outline_rounded, route: AppRouter.clientCreateRfq, isCta: true),
        _DrawerItemConfig(title: 'خريطة الموردين المعتمدين', icon: Icons.storefront_rounded, route: AppRouter.clientVendorsMap, badgeText: 'خريطة 🗺️', badgeColor: AppColors.primary),
        _DrawerItemConfig(title: 'إدارة المركبات (المرآب)', icon: Icons.directions_car_rounded, route: AppRouter.clientGarage, badgeText: 'جديد 🚘', badgeColor: AppColors.emerald),
        _DrawerItemConfig(title: 'إدارة الطلبات والصفقات', icon: Icons.shopping_bag_rounded, route: AppRouter.clientOrders),
        _DrawerItemConfig(title: 'الفواتير الضريبية ZATCA', icon: Icons.receipt_long_rounded, route: AppRouter.clientInvoices),
        _DrawerItemConfig(title: 'المحفظة والرصيد', icon: Icons.account_balance_wallet_rounded, route: AppRouter.wallet),
        _DrawerItemConfig(title: 'الملف المؤسسي', icon: Icons.business_rounded, route: AppRouter.profile),
        _DrawerItemConfig(title: 'فريق العمل والصلاحيات', icon: Icons.shield_rounded, route: AppRouter.clientRoles),
        _DrawerItemConfig(title: 'الدعم والمساعدة', icon: Icons.support_agent_rounded, route: AppRouter.clientSupport),
        _DrawerItemConfig(title: 'إعدادات العضوية والمنشأة', icon: Icons.settings_rounded, route: AppRouter.clientSettings, badgeText: '⚙️', badgeColor: AppColors.primary),
      ];
    }

    // Filter items using Granular NavigationGuard
    final List<Widget> navWidgets = [];
    for (final item in candidateItems) {
      if (NavigationGuard.isRouteAllowed(item.route, user)) {
        navWidgets.add(
          _buildItem(
            context,
            item.title,
            item.icon,
            item.route,
            badgeText: item.badgeText,
            badgeColor: item.badgeColor,
            isCta: item.isCta,
          ),
        );
      }
    }

    return navWidgets;
  }

  Widget _buildItem(
    BuildContext context,
    String title,
    IconData icon,
    String route, {
    String? badgeText,
    Color? badgeColor,
    bool isCta = false,
  }) {
    final isSelected = activeRoute == route;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.pop(context); // Close Drawer
            if (!isSelected) {
              Navigator.pushReplacementNamed(context, route);
            }
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFF1E293B)
                  : isCta
                      ? AppColors.primary.withOpacity(0.12)
                      : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              border: isSelected
                  ? Border.all(color: AppColors.primary.withOpacity(0.5))
                  : isCta
                      ? Border.all(color: AppColors.primary.withOpacity(0.3))
                      : null,
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 19,
                  color: isSelected
                      ? AppColors.primaryLight
                      : isCta
                          ? AppColors.primaryLight
                          : const Color(0xFF94A3B8),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: isSelected
                          ? Colors.white
                          : isCta
                              ? Colors.white
                              : const Color(0xFFCBD5E1),
                      fontSize: 13,
                      fontWeight: isSelected || isCta ? FontWeight.w800 : FontWeight.w600,
                    ),
                  ),
                ),
                if (badgeText != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: (badgeColor ?? AppColors.primary).withOpacity(0.18),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      badgeText,
                      style: TextStyle(
                        color: badgeColor ?? AppColors.primaryLight,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Logout Button
          InkWell(
            onTap: () => _showLogoutConfirmDialog(context),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.error.withOpacity(0.3)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.logout_rounded, color: AppColors.error, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'تسجيل الخروج من الحساب',
                    style: TextStyle(
                      color: AppColors.error,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'منصة رِفْق v2.0 • المملكة العربية السعودية',
            style: TextStyle(
              color: Colors.white.withOpacity(0.35),
              fontSize: 10,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutConfirmDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppColors.error),
            SizedBox(width: 8),
            Text('تأكيد تسجيل الخروج', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          ],
        ),
        content: const Text(
          'هل أنت متأكد من رغبتك في تسجيل الخروج؟ سيتم إلغاء تنشيط الإشعارات على هذا الجهاز حتى تسجيل الدخول مجدداً.',
          style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx); // close dialog
              Navigator.pop(context); // close drawer
              context.read<AuthBloc>().add(LogoutEvent());
              Navigator.pushReplacementNamed(context, AppRouter.login);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('تسجيل الخروج', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}
