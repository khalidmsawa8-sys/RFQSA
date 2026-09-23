import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_spacing.dart';

class WebMobileDock extends StatelessWidget {
  final String role; // 'client' | 'vendor' | 'courier'
  final int currentIndex;
  final Function(int index) onTap;

  const WebMobileDock({
    Key? key,
    required this.role,
    required this.currentIndex,
    required this.onTap,
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
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: _buildItems(context, isDark, isClient, isVendor),
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
  ) {
    if (isClient) {
      return [
        _buildNavItem(0, 'الرئيسية', Icons.dashboard_rounded, isDark),
        _buildNavItem(1, 'المركبات', Icons.directions_car_rounded, isDark),
        _buildCtaButton(context, 2, 'طلب جديد'),
        _buildNavItem(3, 'الطلبات', Icons.shopping_bag_rounded, isDark),
        _buildNavItem(4, 'الإعدادات', Icons.settings_rounded, isDark),
      ];
    } else if (isVendor) {
      return [
        _buildNavItem(0, 'الرئيسية', Icons.dashboard_rounded, isDark),
        _buildNavItem(1, 'الرادار', Icons.bolt_rounded, isDark),
        _buildNavItem(2, 'الطلبات', Icons.shopping_bag_rounded, isDark),
        _buildNavItem(3, 'الأرباح', Icons.account_balance_wallet_rounded, isDark),
        _buildNavItem(4, 'الإعدادات', Icons.settings_rounded, isDark),
      ];
    } else {
      // Courier
      return [
        _buildNavItem(0, 'المهام', Icons.inventory_2_rounded, isDark),
        _buildNavItem(1, 'البوالص', Icons.receipt_long_rounded, isDark),
        _buildNavItem(2, 'المحفظة', Icons.account_balance_wallet_rounded, isDark),
        _buildNavItem(3, 'الملف', Icons.person_rounded, isDark),
        _buildNavItem(4, 'الدعم', Icons.support_agent_rounded, isDark),
      ];
    }
  }

  Widget _buildNavItem(int index, String label, IconData icon, bool isDark) {
    final isSelected = currentIndex == index;
    final activeColor = isDark ? AppColors.emerald500 : const Color(0xFF1B4D3E);
    final inactiveColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return InkWell(
      onTap: () => onTap(index),
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

  Widget _buildCtaButton(BuildContext context, int index, String label) {
    return Transform.translate(
      offset: const Offset(0, -12),
      child: GestureDetector(
        onTap: () => onTap(index),
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
