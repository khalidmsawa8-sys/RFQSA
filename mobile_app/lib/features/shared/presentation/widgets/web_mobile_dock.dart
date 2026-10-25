import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/navigation/navigation_guard.dart';
import '../../../auth/bloc/auth_bloc.dart';
import '../../../auth/bloc/auth_state.dart';
import '../../../auth/models/user_model.dart';

class _DockTabItem {
  final String label;
  final IconData icon;
  final String route;
  final bool isCta;

  const _DockTabItem({
    required this.label,
    required this.icon,
    required this.route,
    this.isCta = false,
  });
}

class WebMobileDock extends StatelessWidget {
  final String role; // 'client' | 'vendor' | 'courier'
  final int currentIndex;
  final Function(int index)? onTap;
  final String? currentRoute;

  const WebMobileDock({
    Key? key,
    required this.role,
    required this.currentIndex,
    this.onTap,
    this.currentRoute,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = role != 'courier';
    final isClient = role == 'client';
    final isVendor = role == 'vendor';

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xF20A1224) : Colors.white.withOpacity(0.95),
        border: Border(
          top: BorderSide(
            color: isDark ? const Color(0x33334155) : const Color(0xFFE2E8F0),
            width: 1,
          ),
        ),
        boxShadow: isDark
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.4),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                )
              ]
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 15,
                  offset: const Offset(0, -2),
                )
              ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              final user = (state is AuthenticatedState) ? state.user : null;
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: _buildItems(context, isDark, isClient, isVendor, user),
              );
            },
          ),
        ),
      ),
    );
  }

  List<Widget> _buildItems(
    BuildContext context,
    bool isDark,
    bool isClient,
    bool isVendor,
    UserModel? user,
  ) {
    List<_DockTabItem> candidates = [];

    if (isClient) {
      candidates = const [
        _DockTabItem(label: 'الرئيسية', icon: Icons.dashboard_rounded, route: AppRouter.clientHome),
        _DockTabItem(label: 'المركبات', icon: Icons.directions_car_rounded, route: AppRouter.clientGarage),
        _DockTabItem(label: 'طلب جديد', icon: Icons.add_rounded, route: AppRouter.clientCreateRfq, isCta: true),
        _DockTabItem(label: 'الطلبات', icon: Icons.shopping_bag_rounded, route: AppRouter.clientOrders),
        _DockTabItem(label: 'الإعدادات', icon: Icons.settings_rounded, route: AppRouter.clientSettings),
      ];
    } else if (isVendor) {
      candidates = const [
        _DockTabItem(label: 'الرئيسية', icon: Icons.dashboard_rounded, route: AppRouter.vendorHome),
        _DockTabItem(label: 'الرادار', icon: Icons.bolt_rounded, route: AppRouter.vendorRadar),
        _DockTabItem(label: 'الطلبات', icon: Icons.shopping_bag_rounded, route: AppRouter.vendorOrders),
        _DockTabItem(label: 'الأرباح', icon: Icons.account_balance_wallet_rounded, route: AppRouter.wallet),
        _DockTabItem(label: 'الإعدادات', icon: Icons.settings_rounded, route: AppRouter.vendorSettings),
      ];
    } else {
      // Courier
      candidates = const [
        _DockTabItem(label: 'المهام', icon: Icons.inventory_2_rounded, route: AppRouter.courierHome),
        _DockTabItem(label: 'البوالص', icon: Icons.receipt_long_rounded, route: AppRouter.courierOrders),
        _DockTabItem(label: 'المحفظة', icon: Icons.account_balance_wallet_rounded, route: AppRouter.wallet),
        _DockTabItem(label: 'الملف', icon: Icons.person_rounded, route: AppRouter.profile),
        _DockTabItem(label: 'الدعم', icon: Icons.support_agent_rounded, route: AppRouter.courierSupport),
      ];
    }

    final filtered = candidates.where((tab) => NavigationGuard.isRouteAllowed(tab.route, user)).toList();

    return List.generate(filtered.length, (idx) {
      final tab = filtered[idx];
      if (tab.isCta) {
        return _buildCtaButton(context, idx, tab.label, tab.route);
      }
      return _buildNavItem(context, idx, tab.label, tab.icon, tab.route, isDark);
    });
  }

  Widget _buildNavItem(
    BuildContext context,
    int index,
    String label,
    IconData icon,
    String route,
    bool isDark,
  ) {
    final isSelected = (currentRoute != null && currentRoute == route) || currentIndex == index;
    final activeColor = isDark ? AppColors.emerald500 : const Color(0xFF1B4D3E);
    final inactiveColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return InkWell(
      onTap: () {
        if (onTap != null) {
          onTap!(index);
        } else {
          if (currentRoute != route) {
            Navigator.pushReplacementNamed(context, route);
          }
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isSelected
                    ? (isDark
                        ? AppColors.emerald500.withOpacity(0.15)
                        : const Color(0xFFD1FAE5))
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 22,
                color: isSelected ? activeColor : inactiveColor,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTypography.caption.copyWith(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                color: isSelected ? activeColor : inactiveColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCtaButton(BuildContext context, int index, String label, String route) {
    return Transform.translate(
      offset: const Offset(0, -12),
      child: GestureDetector(
        onTap: () {
          if (onTap != null) {
            onTap!(index);
          } else {
            Navigator.pushNamed(context, route);
          }
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.emerald500, AppColors.teal500],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                border: Border.all(
                  color: const Color(0xFF0A1224),
                  width: 3.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.emerald500.withOpacity(0.4),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.add_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTypography.caption.copyWith(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                color: AppColors.emerald500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
