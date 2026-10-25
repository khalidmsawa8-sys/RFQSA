import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/theme/app_typography.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';

/// WebTopAppBar: 1:1 Pixel Match for Mobile Web Top App Bar (#0A1224)
class WebTopAppBar extends StatelessWidget implements PreferredSizeWidget {
  final GlobalKey<ScaffoldState> scaffoldKey;
  final String role; // 'client', 'vendor', 'courier'
  final String? customTitle;
  final VoidCallback? onNotificationTap;
  final Widget? trailingAction;
  final Widget? extraAction;

  const WebTopAppBar({
    super.key,
    required this.scaffoldKey,
    this.role = 'client',
    this.customTitle,
    this.onNotificationTap,
    this.trailingAction,
    this.extraAction,
  });

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.headerBackground,
        border: Border(
          bottom: BorderSide(color: AppColors.headerBorder, width: 1),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              // 1. Hamburger Menu Button (Right in RTL)
              InkWell(
                onTap: () {
                  if (scaffoldKey.currentState?.isDrawerOpen ?? false) {
                    scaffoldKey.currentState?.closeDrawer();
                  } else {
                    scaffoldKey.currentState?.openDrawer();
                  }
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.slate800,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.slate700),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.menu_rounded,
                      color: AppColors.emerald,
                      size: 22,
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 12),

              // 2. Brand Logo & Title: رِفْق | RFQSA [B2B]
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'رِفْق',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                'RFQSA',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(width: 5),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppColors.emeraldSurface,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: AppColors.emeraldBorder),
                                ),
                                child: const Text(
                                  'B2B',
                                  style: TextStyle(
                                    color: AppColors.emeraldText,
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            customTitle ?? 'المنظومة الموحدة لقطع الغيار',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.65),
                              fontSize: 9,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // 3. Quick Action CTA Button or Custom Trailing Action
              if (trailingAction != null)
                trailingAction!
              else
                _buildRoleCta(context),

              if (extraAction != null) ...[
                const SizedBox(width: 6),
                extraAction!,
              ],

              const SizedBox(width: 6),

              // 4. Notifications Bell with Live Unread Badge
              ValueListenableBuilder<int>(
                valueListenable: NotificationService().unreadCountNotifier,
                builder: (context, unreadCount, _) {
                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      InkWell(
                        onTap: onNotificationTap ?? () => Navigator.pushNamed(context, AppRouter.notifications),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: AppColors.slate800,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.slate700),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.notifications_none_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                      if (unreadCount > 0)
                        Positioned(
                          top: -3,
                          left: -3,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.error,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.headerBackground, width: 1.5),
                            ),
                            child: Text(
                              unreadCount > 99 ? '99+' : '$unreadCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleCta(BuildContext context) {
    if (role == 'client') {
      return ElevatedButton.icon(
        onPressed: () => Navigator.pushNamed(context, AppRouter.clientCreateRfq),
        icon: const Icon(Icons.add_rounded, size: 14, color: Colors.white),
        label: const Text(
          'طلب جديد',
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    } else if (role == 'vendor') {
      return ElevatedButton.icon(
        onPressed: () => Navigator.pushNamed(context, AppRouter.vendorRadar),
        icon: const Icon(Icons.bolt_rounded, size: 15, color: Colors.white),
        label: const Text(
          'الرادار',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.amber,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    } else {
      return ElevatedButton.icon(
        onPressed: () => Navigator.pushNamed(context, AppRouter.courierOrders),
        icon: const Icon(Icons.local_shipping_rounded, size: 15, color: Colors.white),
        label: const Text(
          'المهام',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emeraldDark,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }
}
