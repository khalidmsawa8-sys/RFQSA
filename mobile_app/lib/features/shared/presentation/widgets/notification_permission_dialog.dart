import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';

/// Modal Dialog / Bottom Sheet to politely request Notification Permissions
class NotificationPermissionDialog extends StatelessWidget {
  final bool isPermanentlyDenied;
  final VoidCallback onDismissed;
  final VoidCallback onGranted;

  const NotificationPermissionDialog({
    super.key,
    this.isPermanentlyDenied = false,
    required this.onDismissed,
    required this.onGranted,
  });

  static Future<bool> show(
    BuildContext context, {
    bool isPermanentlyDenied = false,
  }) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => NotificationPermissionDialog(
        isPermanentlyDenied: isPermanentlyDenied,
        onDismissed: () => Navigator.of(ctx).pop(false),
        onGranted: () => Navigator.of(ctx).pop(true),
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Icon Badge with Glowing Ring
          Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primaryBorder, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Center(
                child: Icon(
                  Icons.notifications_active_rounded,
                  color: AppColors.primary,
                  size: 36,
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Title
          Text(
            isPermanentlyDenied ? 'تفعيل الإشعارات من إعدادات الهاتف 🔔' : 'ابقَ على اطلاع دائم بطلباتك وعروضك 🔔',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: AppColors.slateNavy,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),

          // Subtitle
          Text(
            isPermanentlyDenied
                ? 'تم إيقاف صلاحية الإشعارات مسبقاً. يرجى تفعيلها من إعدادات التطبيق في هاتفك لتصلك تنبيهات الرادار والعروض والشحنات في وقتها.'
                : 'تحتاج منصة رفق لصلاحية الإشعارات لتنبيهك فوراً بكل خطوة تشغيلية هامة تهم أعمالك:',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),

          // Benefits List
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                _buildBenefitRow(
                  icon: Icons.radar_rounded,
                  color: AppColors.primary,
                  title: 'رادار طلبات التسعير الفوري',
                  desc: 'تنبيهات صوتية فورية لطلبات قطع الغيار المطابقة لتخصصك',
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: AppColors.borderLight),
                ),
                _buildBenefitRow(
                  icon: Icons.local_offer_rounded,
                  color: AppColors.amber,
                  title: 'وصول عروض الأسعار والصفقات',
                  desc: 'إشعار مباشر عند تقديم أي مورد لعرض سعر أو قبول الصفقة',
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: AppColors.borderLight),
                ),
                _buildBenefitRow(
                  icon: Icons.local_shipping_rounded,
                  color: AppColors.success,
                  title: 'تتبع مسار الشحنة ورمز الاستلام OTP',
                  desc: 'تحديثات حية لموقع المندوب من الاستلام حتى تسليم القطع',
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Primary CTA Button
          ElevatedButton(
            onPressed: () async {
              if (isPermanentlyDenied) {
                await openAppSettings();
                onDismissed();
              } else {
                final granted = await NotificationService().requestNotificationPermissionExplicit();
                if (granted) {
                  onGranted();
                } else {
                  final status = await Permission.notification.status;
                  if (status.isPermanentlyDenied) {
                    await openAppSettings();
                  }
                  onDismissed();
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 15),
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: Text(
              isPermanentlyDenied ? 'فتح إعدادات الهاتف الآن' : 'تفعيل الإشعارات الفورية',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Secondary "Later" Button
          TextButton(
            onPressed: onDismissed,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 10),
              foregroundColor: AppColors.textMuted,
            ),
            child: const Text(
              'تخطي والمتابعة لاحقاً',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBenefitRow({
    required IconData icon,
    required Color color,
    required String title,
    required String desc,
  }) {
    return Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
