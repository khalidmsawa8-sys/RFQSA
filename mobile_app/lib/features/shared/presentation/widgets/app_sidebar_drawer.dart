import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';

/// Exact 1:1 Match of the Official RIFQ Web Platform Sidebar Drawer
class AppSidebarDrawer extends StatelessWidget {
  final String currentRoute;

  const AppSidebarDrawer({super.key, this.currentRoute = ''});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFF070E1E), // Luxury Dark Navy / Slate from Web
      child: SafeArea(
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            final user = (state is AuthenticatedState) ? state.user : null;
            final role = (state is AuthenticatedState) ? state.activeRole.toLowerCase() : 'client';
            final isClient = role == 'client';
            final isVendor = role == 'vendor';
            final isCourier = role == 'courier';

            final entityName = user?.fullName ??
                (isVendor
                    ? 'مؤسسة قطع الغيار المعتمدة'
                    : isCourier
                        ? 'مندوب التوصيل المعتمد'
                        : 'شركة المشتريات الوطنية');

            final entitySubtitle = isVendor
                ? 'مالك المتجر / شريك مفوض'
                : isCourier
                    ? 'مندوب مرخص / أسطول التوصيل'
                    : 'المالك / المدير العام';

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── 1. TOP LOGO BRAND HEADER ──
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Center(
                              child: Icon(Icons.all_inclusive_rounded, color: Color(0xFF00C49F), size: 24),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Text(
                                'رِفق',
                                style: TextStyle(
                                  color: Color(0xFF0F172A),
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5,
                                  height: 1.1,
                                ),
                              ),
                              Text(
                                'RIFQ',
                                style: TextStyle(
                                  color: Color(0xFF2563EB),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 2.0,
                                  height: 1.0,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 22),
                      ),
                    ],
                  ),
                ),

                // ── 2. USER / ENTITY PROFILE PILL CARD ──
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
                  child: InkWell(
                    onTap: () {
                      Navigator.pop(context);
                      if (isCourier) {
                        Navigator.pushNamed(context, AppRouter.courierProfile);
                      } else {
                        Navigator.pushNamed(context, AppRouter.profile);
                      }
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F1C36),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E2D4A), width: 1.2),
                      ),
                      child: Row(
                        children: [
                          // Avatar Icon with Active Dot
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: isVendor
                                      ? const Color(0xFF00A86B)
                                      : isCourier
                                          ? const Color(0xFF0284C7)
                                          : const Color(0xFF3B82F6),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Center(
                                  child: isClient
                                      ? const Text(
                                          'ش',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 20,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        )
                                      : Icon(
                                          isVendor
                                              ? Icons.storefront_rounded
                                              : Icons.local_shipping_rounded,
                                          color: Colors.white,
                                          size: 24,
                                        ),
                                ),
                              ),
                              Positioned(
                                bottom: -2,
                                right: -2,
                                child: Container(
                                  width: 12,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: const Color(0xFF0F1C36), width: 2),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        entityName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(
                                      Icons.verified_rounded,
                                      color: Color(0xFF00C49F),
                                      size: 16,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF10B981),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 5),
                                    Text(
                                      entitySubtitle,
                                      style: const TextStyle(
                                        color: Color(0xFF34D399),
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // ── 3. LIST OF NAVIGATION ITEMS ──
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    children: [
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        child: Text(
                          'القائمة الرئيسية',
                          style: TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),

                      // ──────── CLIENT MENU ────────
                      if (isClient) ...[
                        _buildNavItem(
                          context,
                          icon: Icons.grid_view_rounded,
                          label: 'نظرة عامة',
                          route: AppRouter.clientHome,
                          isActive: currentRoute == AppRouter.clientHome,
                        ),
                        _buildClientCtaItem(
                          context,
                          label: 'طلب عرض سعر جديد',
                          route: AppRouter.clientCreateRfq,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.storefront_outlined,
                          label: 'خريطة الموردين والفروع',
                          route: AppRouter.clientVendorsMap,
                          isActive: currentRoute == AppRouter.clientVendorsMap,
                          badge: '🗺️',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.directions_car_filled_outlined,
                          label: 'إدارة المركبات',
                          route: AppRouter.clientGarage,
                          isActive: currentRoute == AppRouter.clientGarage,
                          badge: '🚗',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.shopping_bag_outlined,
                          label: 'إدارة الطلبات',
                          route: AppRouter.clientOrders,
                          isActive: currentRoute == AppRouter.clientOrders,
                          badge: 'مباشر',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.receipt_long_outlined,
                          label: 'الفواتير الضريبية',
                          route: AppRouter.clientInvoices,
                          isActive: currentRoute == AppRouter.clientInvoices,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.account_balance_wallet_outlined,
                          label: 'المحفظة والرصيد',
                          route: AppRouter.wallet,
                          isActive: currentRoute == AppRouter.wallet,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.person_outline_rounded,
                          label: 'الملف المؤسسي',
                          route: AppRouter.profile,
                          isActive: currentRoute == AppRouter.profile,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.shield_outlined,
                          label: 'الأدوار وفريق العمل',
                          route: AppRouter.clientRoles,
                          isActive: currentRoute == AppRouter.clientRoles,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.help_outline_rounded,
                          label: 'الدعم والمساعدة',
                          route: AppRouter.clientSupport,
                          isActive: currentRoute == AppRouter.clientSupport,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.settings_outlined,
                          label: 'إعدادات العضوية',
                          route: AppRouter.clientSettings,
                          isActive: currentRoute == AppRouter.clientSettings,
                          badge: '⚙',
                        ),
                      ],

                      // ──────── VENDOR MENU ────────
                      if (isVendor) ...[
                        _buildNavItem(
                          context,
                          icon: Icons.grid_view_rounded,
                          label: 'نظرة عامة',
                          route: AppRouter.vendorHome,
                          isActive: currentRoute == AppRouter.vendorHome,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.bolt_rounded,
                          label: 'رادار الطلبات الذكي',
                          route: AppRouter.vendorRadar,
                          isActive: currentRoute == AppRouter.vendorRadar,
                          badge: 'ذكي ⚡',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.storefront_outlined,
                          label: 'موقع الفرع والاستلام',
                          route: AppRouter.vendorSettings,
                          isActive: currentRoute == AppRouter.vendorSettings,
                          badge: 'خريطة 📍',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.shopping_bag_outlined,
                          label: 'الطلبات والمبيعات',
                          route: AppRouter.vendorOrders,
                          isActive: currentRoute == AppRouter.vendorOrders,
                          badge: 'نشط',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.receipt_long_outlined,
                          label: 'الفواتير الضريبية',
                          route: AppRouter.vendorInvoices,
                          isActive: currentRoute == AppRouter.vendorInvoices,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.account_balance_wallet_outlined,
                          label: 'المحفظة والأرباح',
                          route: AppRouter.wallet,
                          isActive: currentRoute == AppRouter.wallet,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.person_outline_rounded,
                          label: 'الملف التجاري',
                          route: AppRouter.profile,
                          isActive: currentRoute == AppRouter.profile,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.shield_outlined,
                          label: 'الأدوار وفريق العمل',
                          route: AppRouter.vendorRoles,
                          isActive: currentRoute == AppRouter.vendorRoles,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.help_outline_rounded,
                          label: 'الدعم والمساعدة',
                          route: AppRouter.vendorSupport,
                          isActive: currentRoute == AppRouter.vendorSupport,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.settings_outlined,
                          label: 'إعدادات العضوية',
                          route: AppRouter.vendorSettings,
                          isActive: currentRoute == AppRouter.vendorSettings,
                          badge: '⚙',
                        ),
                      ],

                      // ──────── COURIER MENU ────────
                      if (isCourier) ...[
                        _buildNavItem(
                          context,
                          icon: Icons.inventory_2_outlined,
                          label: 'المهام والشحنات الجارية',
                          route: AppRouter.courierHome,
                          isActive: currentRoute == AppRouter.courierHome,
                          badge: 'مباشر ⚡',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.receipt_long_outlined,
                          label: 'بوالص الشحن والفواتير',
                          route: AppRouter.courierOrders,
                          isActive: currentRoute == AppRouter.courierOrders,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.account_balance_wallet_outlined,
                          label: 'المحفظة وسحب الأرباح',
                          route: AppRouter.courierEarnings,
                          isActive: currentRoute == AppRouter.courierEarnings,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.person_outline_rounded,
                          label: 'الملف المهني والرخصة',
                          route: AppRouter.courierProfile,
                          isActive: currentRoute == AppRouter.courierProfile,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.headset_mic_outlined,
                          label: 'طوارئ ودعم المندوب',
                          route: AppRouter.courierSupport,
                          isActive: currentRoute == AppRouter.courierSupport,
                          badge: '24/7 🚨',
                        ),
                      ],
                    ],
                  ),
                ),

                // ── 4. FOOTER: PLATFORM STATUS & LOGOUT ──
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF060B18),
                    border: Border(top: BorderSide(color: Color(0xFF1E293B), width: 1)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.show_chart_rounded, color: Color(0xFF00C49F), size: 16),
                              SizedBox(width: 6),
                              Text(
                                'حالة المنصة:',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const Text(
                            'متصل 100% 🟢',
                            style: TextStyle(
                              color: Color(0xFF00C49F),
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          context.read<AuthBloc>().add(LogoutEvent());
                          Navigator.pushNamedAndRemoveUntil(context, AppRouter.login, (r) => false);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFEF4444),
                          side: const BorderSide(color: Color(0xFF334155)),
                          minimumSize: const Size.fromHeight(38),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.logout_rounded, size: 16),
                        label: const Text('تسجيل الخروج', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  /// Single Navigation Menu Item with Badge
  Widget _buildNavItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String route,
    required bool isActive,
    String? badge,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 3),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF00A86B).withOpacity(0.18) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: isActive
            ? Border.all(color: const Color(0xFF00A86B).withOpacity(0.4), width: 1)
            : null,
      ),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
        leading: Icon(
          icon,
          color: isActive ? const Color(0xFF00C49F) : const Color(0xFF94A3B8),
          size: 19,
        ),
        title: Text(
          label,
          style: TextStyle(
            color: isActive ? const Color(0xFF00C49F) : const Color(0xFFCBD5E1),
            fontSize: 12.5,
            fontWeight: isActive ? FontWeight.w900 : FontWeight.w700,
          ),
        ),
        trailing: badge != null
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF334155), width: 0.8),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              )
            : null,
        onTap: () {
          Navigator.pop(context); // Close Drawer
          if (!isActive) {
            Navigator.pushNamed(context, route);
          }
        },
      ),
    );
  }

  /// Big Vibrant Client CTA Button: "طلب عرض سعر جديد ✨ +"
  Widget _buildClientCtaItem(
    BuildContext context, {
    required String label,
    required String route,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF00A86B), Color(0xFF00C49F)],
          begin: Alignment.centerRight,
          end: Alignment.centerLeft,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00A86B).withOpacity(0.35),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.pop(context);
            Navigator.pushNamed(context, route);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add_rounded, color: Colors.white, size: 18),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
