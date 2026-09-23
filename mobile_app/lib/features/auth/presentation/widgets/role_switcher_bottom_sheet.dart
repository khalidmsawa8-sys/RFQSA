import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';

/// Modal Bottom Sheet allowing instantaneous role switching without logging out
class RoleSwitcherBottomSheet extends StatelessWidget {
  const RoleSwitcherBottomSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const RoleSwitcherBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final activeRole = state is AuthenticatedState ? state.activeRole.toLowerCase() : 'client';

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'التبديل بين بوابات المنظومة',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: AppColors.textMuted),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'اختر الواجهة التي ترغب بالعمل عليها حالياً دون الحاجة لتسجيل الخروج:',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 20),

                // 1. Client Card
                _RoleTile(
                  title: 'بوابة العميل (طلب ومتابعة القطع)',
                  subtitle: 'إنشاء طلبات تسعير، مقارنة العروض، وغرفة الصفقات',
                  icon: Icons.person_rounded,
                  color: AppColors.primary,
                  isSelected: activeRole == 'client',
                  onTap: () {
                    context.read<AuthBloc>().add(const SwitchRoleEvent(newRole: 'client'));
                    Navigator.pop(context);
                    Navigator.pushNamedAndRemoveUntil(context, AppRouter.clientHome, (r) => false);
                  },
                ),
                const SizedBox(height: 12),

                // 2. Vendor Card
                _RoleTile(
                  title: 'بوابة المورد (الرادار وعروض الأسعار)',
                  subtitle: 'استقبال طلبات الماركات المتخصصة، التنبيه الصوتي، والتسعير',
                  icon: Icons.storefront_rounded,
                  color: AppColors.amber,
                  isSelected: activeRole == 'vendor',
                  onTap: () {
                    context.read<AuthBloc>().add(const SwitchRoleEvent(newRole: 'vendor'));
                    Navigator.pop(context);
                    Navigator.pushNamedAndRemoveUntil(context, AppRouter.vendorHome, (r) => false);
                  },
                ),
                const SizedBox(height: 12),

                // 3. Courier Card
                _RoleTile(
                  title: 'بوابة المندوب (التوصيل والخرائط)',
                  subtitle: 'مهام الشحن، التوجيه بالخرائط، وإثبات التسليم الرقمي POD',
                  icon: Icons.local_shipping_rounded,
                  color: AppColors.secondary,
                  isSelected: activeRole == 'courier',
                  onTap: () {
                    context.read<AuthBloc>().add(const SwitchRoleEvent(newRole: 'courier'));
                    Navigator.pop(context);
                    Navigator.pushNamedAndRemoveUntil(context, AppRouter.courierHome, (r) => false);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _RoleTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.08) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? color : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isSelected ? color : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle_rounded, color: color, size: 22),
          ],
        ),
      ),
    );
  }
}
