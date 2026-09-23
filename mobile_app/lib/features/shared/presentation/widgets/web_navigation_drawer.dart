import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/theme/app_typography.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';

/// WebNavigationDrawer: 1:1 Pixel Match for Mobile Web Slide-Out Drawer (components/mobile-nav.tsx)
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
        child: Column(
          children: [
            // ── 1. PROFILE & COMPANY HEADER ──
            _buildProfileHeader(context),

            const Divider(color: Color(0xFF1E293B), height: 1),

            // ── 2. SCROLLABLE NAVIGATION LINKS ──
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                children: _buildNavLinks(context),
              ),
            ),

            const Divider(color: Color(0xFF1E293B), height: 1),

            // ── 3. LOGOUT & FOOTER ──
            _buildFooter(context),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        String fullName = 'شركة المشتريات الوطنية';
        String company = 'مؤسسة مسجلة ومعتمدة';
        String roleBadge = 'عميل معتمد B2B';

        if (state is AuthenticatedState) {
          fullName = state.user.fullName;
          company = state.user.companyName ?? 'منشأة معتمدة';
          if (state.activeRole.toLowerCase() == 'vendor') {
            roleBadge = 'مورد قطع غيار معتمد 🏢';
          } else if (state.activeRole.toLowerCase() == 'courier') {
            roleBadge = 'مندوب توصيل معتمد 🚚';
          }
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
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _buildNavLinks(BuildContext context) {
    if (role == 'vendor') {
      return [
        _buildItem(context, 'نظرة عامة', Icons.dashboard_rounded, AppRouter.vendorHome),
        _buildItem(context, 'رادار الطلبات الذكي', Icons.bolt_rounded, AppRouter.vendorRadar, badgeText: 'رادار حي ⚡', badgeColor: AppColors.amber),
        _buildItem(context, 'الطلبات والمبيعات', Icons.shopping_bag_rounded, AppRouter.vendorOrders),
        _buildItem(context, 'الفواتير الضريبية', Icons.receipt_long_rounded, AppRouter.vendorInvoices),
        _buildItem(context, 'المحفظة والأرباح', Icons.account_balance_wallet_rounded, AppRouter.wallet),
        _buildItem(context, 'تخصصات قطع الغيار', Icons.category_rounded, AppRouter.vendorSpecializations),
        _buildItem(context, 'الملف التجاري', Icons.person_rounded, AppRouter.profile),
        _buildItem(context, 'فريق العمل والأدوار', Icons.verified_user_rounded, AppRouter.vendorRoles),
        _buildItem(context, 'الدعم والمساعدة', Icons.support_agent_rounded, AppRouter.vendorSupport),
        _buildItem(context, 'إعدادات العضوية والفرع', Icons.settings_rounded, AppRouter.vendorSettings, badgeText: '⚙️', badgeColor: AppColors.primary),
      ];
    } else if (role == 'courier') {
      return [
        _buildItem(context, 'لوحة مهام التوصيل', Icons.dashboard_rounded, AppRouter.courierHome),
        _buildItem(context, 'المهام والشحنات الميدانية', Icons.local_shipping_rounded, AppRouter.courierOrders),
        _buildItem(context, 'سجل الأرباح والمحفظة', Icons.account_balance_wallet_rounded, AppRouter.wallet),
        _buildItem(context, 'الملف الشخصي للمندوب', Icons.person_rounded, AppRouter.profile),
        _buildItem(context, 'الدعم والمساعدة', Icons.support_agent_rounded, AppRouter.courierSupport),
      ];
    } else {
      // Default: Client
      return [
        _buildItem(context, 'نظرة عامة', Icons.dashboard_rounded, AppRouter.clientHome),
        _buildItem(context, 'طلب عرض سعر جديد', Icons.add_circle_outline_rounded, AppRouter.clientCreateRfq, isCta: true),
        _buildItem(context, 'خريطة الموردين المعتمدين', Icons.storefront_rounded, AppRouter.clientVendorsMap, badgeText: 'خريطة 🗺️', badgeColor: AppColors.primary),
        _buildItem(context, 'إدارة المركبات (المرآب)', Icons.directions_car_rounded, AppRouter.clientGarage, badgeText: 'جديد 🚘', badgeColor: AppColors.emerald),
        _buildItem(context, 'إدارة الطلبات والصفقات', Icons.shopping_bag_rounded, AppRouter.clientOrders),
        _buildItem(context, 'الفواتير الضريبية ZATCA', Icons.receipt_long_rounded, AppRouter.clientInvoices),
        _buildItem(context, 'المحفظة والرصيد', Icons.account_balance_wallet_rounded, AppRouter.wallet),
        _buildItem(context, 'الملف المؤسسي', Icons.business_rounded, AppRouter.profile),
        _buildItem(context, 'فريق العمل والصلاحيات', Icons.shield_rounded, AppRouter.clientRoles),
        _buildItem(context, 'الدعم والمساعدة', Icons.support_agent_rounded, AppRouter.clientSupport),
        _buildItem(context, 'إعدادات العضوية والمنشأة', Icons.settings_rounded, AppRouter.clientSettings, badgeText: '⚙️', badgeColor: AppColors.primary),
      ];
    }
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
