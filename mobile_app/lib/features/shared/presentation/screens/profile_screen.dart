import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/app_sidebar_drawer.dart';

/// Comprehensive User Profile & Verification Status Screen (1:1 Web Parity)
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text(
          'الملف المؤسسي والإعدادات',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          final user = state is AuthenticatedState ? state.user : null;
          final activeRole = state is AuthenticatedState ? state.activeRole.toLowerCase() : 'client';
          final isClient = activeRole == 'client';
          final isVendor = activeRole == 'vendor';
          final isCourier = activeRole == 'courier';

          final entityName = user?.fullName ??
              (isVendor
                  ? 'مؤسسة قطع الغيار المعتمدة'
                  : isCourier
                      ? 'مندوب التوصيل المعتمد'
                      : 'شركة المشتريات الوطنية');

          final email = user?.email ?? '${activeRole}@rfqsa.tech';

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── 1. PROFILE HEADER CARD ──
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: isVendor
                                    ? [const Color(0xFF059669), const Color(0xFF10B981)]
                                    : isCourier
                                        ? [const Color(0xFF0284C7), const Color(0xFF38BDF8)]
                                        : [const Color(0xFF2563EB), const Color(0xFF1D4ED8)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(22),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF2563EB).withOpacity(0.2),
                                  blurRadius: 12,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                entityName.isNotEmpty ? entityName[0] : 'ر',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: -2,
                            right: -2,
                            child: Container(
                              padding: const EdgeInsets.all(3),
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.verified_rounded,
                                color: Color(0xFF10B981),
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        entityName,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  isVendor
                                      ? Icons.storefront_rounded
                                      : isCourier
                                          ? Icons.local_shipping_rounded
                                          : Icons.business_rounded,
                                  size: 14,
                                  color: const Color(0xFF2563EB),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  _roleLabel(activeRole),
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF1D4ED8),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF059669)),
                                SizedBox(width: 4),
                                Text(
                                  'موثق واثق / نفاذ',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF059669),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // ── 2. ESSENTIAL PLATFORM SETTINGS ──
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                  child: Text(
                    'الخدمات المؤسسية والتوثيق',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF475569),
                    ),
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      _buildSettingsTile(
                        icon: Icons.verified_user_rounded,
                        iconColor: const Color(0xFF059669),
                        title: 'حالة التوثيق والسجل التجاري',
                        subtitle: 'السجل سارٍ حتى 2028-05-20 • موثق رسمياً',
                        badge: 'معتمد 🟢',
                        badgeColor: const Color(0xFFECFDF5),
                        badgeTextColor: const Color(0xFF059669),
                        onTap: () => _showVerificationModal(context, entityName),
                      ),
                      const Divider(height: 1, indent: 60),
                      _buildSettingsTile(
                        icon: Icons.support_agent_rounded,
                        iconColor: const Color(0xFFD97706),
                        title: 'تذاكر الدعم الفني والمساعدة',
                        subtitle: 'فتح تذاكر، متابعة البلاغات والنزاعات 24/7',
                        badge: 'متاح',
                        badgeColor: const Color(0xFFFEF3C7),
                        badgeTextColor: const Color(0xFFB45309),
                        onTap: () {
                          if (isVendor) {
                            Navigator.pushNamed(context, AppRouter.vendorSupport);
                          } else if (isCourier) {
                            Navigator.pushNamed(context, AppRouter.courierSupport);
                          } else {
                            Navigator.pushNamed(context, AppRouter.clientSupport);
                          }
                        },
                      ),
                      const Divider(height: 1, indent: 60),
                      _buildSettingsTile(
                        icon: Icons.account_balance_wallet_rounded,
                        iconColor: const Color(0xFF2563EB),
                        title: 'المحفظة والعمليات المالية',
                        subtitle: 'كشف الحساب، شحن الرصيد والتحويل البنكي',
                        onTap: () => Navigator.pushNamed(context, AppRouter.wallet),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // ── 3. ROLE-SPECIFIC SHORTCUTS ──
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                  child: Text(
                    'إدارة المنشأة والفروع',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF475569),
                    ),
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      if (isClient) ...[
                        _buildSettingsTile(
                          icon: Icons.directions_car_filled_rounded,
                          iconColor: const Color(0xFF0284C7),
                          title: 'كراج أسطول المركبات',
                          subtitle: 'إدارة السيارات وأرقام الهياكل ومواصفاتها',
                          badge: '3 مركبات',
                          onTap: () => Navigator.pushNamed(context, AppRouter.clientGarage),
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildSettingsTile(
                          icon: Icons.shield_rounded,
                          iconColor: const Color(0xFF7C3AED),
                          title: 'فريق العمل وإدارة الصلاحيات (RBAC)',
                          subtitle: 'إدارة مسؤولي المشتريات والمنسقين الميدانيين',
                          onTap: () => Navigator.pushNamed(context, AppRouter.clientRoles),
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildSettingsTile(
                          icon: Icons.store_rounded,
                          iconColor: const Color(0xFF64748B),
                          title: 'بيانات الفروع والتوصيل الافتراضية',
                          subtitle: 'العناوين الوطنية وإحداثيات الفروع الرسمية',
                          onTap: () => Navigator.pushNamed(context, AppRouter.clientSettings),
                        ),
                      ],
                      if (isVendor) ...[
                        _buildSettingsTile(
                          icon: Icons.branding_watermark_rounded,
                          iconColor: const Color(0xFF2563EB),
                          title: 'تخصيص الماركات ونطاق التغطية',
                          subtitle: 'تحديد ماركات السيارات وأنواع القطع المدعومة',
                          onTap: () => Navigator.pushNamed(context, AppRouter.vendorSpecializations),
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildSettingsTile(
                          icon: Icons.storefront_rounded,
                          iconColor: const Color(0xFF059669),
                          title: 'إعدادات متجر قطع الغيار والفرع',
                          subtitle: 'أوقات العمل، السجل التجاري، واستلام الطلبات',
                          onTap: () => Navigator.pushNamed(context, AppRouter.vendorSettings),
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildSettingsTile(
                          icon: Icons.stars_rounded,
                          iconColor: const Color(0xFFD97706),
                          title: 'تقييمات ومراجعات العملاء',
                          subtitle: 'سجل التقييمات ومستوى الرضا من الصفقات المكتملة',
                          badge: '4.9 ★',
                          badgeColor: const Color(0xFFFEF3C7),
                          badgeTextColor: const Color(0xFFB45309),
                          onTap: () => _showVendorReviewsModal(context, entityName),
                        ),
                      ],
                      if (isCourier) ...[
                        _buildSettingsTile(
                          icon: Icons.badge_rounded,
                          iconColor: const Color(0xFF0284C7),
                          title: 'بيانات رخصة القيادة والمركبة',
                          subtitle: 'استمارة المركبة، الفحص الدوري، وتأمين النقل',
                          onTap: () => Navigator.pushNamed(context, AppRouter.courierProfile),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // ── 4. SECURITY & NOTIFICATIONS ──
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                  child: Text(
                    'الأمان والإشعارات',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF475569),
                    ),
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      _buildSettingsTile(
                        icon: Icons.lock_outline_rounded,
                        iconColor: const Color(0xFF0F172A),
                        title: 'تغيير كلمة المرور والأمان',
                        subtitle: 'التحقق الثنائي ومفاتيح الدخول الآمنة',
                        onTap: () => _showSecurityDialog(context),
                      ),
                      const Divider(height: 1, indent: 60),
                      _buildSettingsTile(
                        icon: Icons.notifications_active_outlined,
                        iconColor: const Color(0xFF2563EB),
                        title: 'تفضيلات الإشعارات الفورية',
                        subtitle: 'تنبيهات عروض الأسعار وحالة الشحن والرسائل',
                        onTap: () => _showNotificationsDialog(context),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // ── 5. LOGOUT BUTTON ──
                OutlinedButton.icon(
                  onPressed: () => _showLogoutDialog(context),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(color: Color(0xFFFCA5A5), width: 1.2),
                    backgroundColor: const Color(0xFFFEF2F2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  icon: const Icon(Icons.logout_rounded, color: Color(0xFFDC2626), size: 20),
                  label: const Text(
                    'تسجيل الخروج من الحساب',
                    style: TextStyle(
                      color: Color(0xFFDC2626),
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          );
        },
      ),
    );
  }

  // ──────── KYC & COMMERCIAL REGISTRATION BOTTOM SHEET ────────
  void _showVerificationModal(BuildContext context, String entityName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.verified_user_rounded, color: Color(0xFF059669), size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'حالة التوثيق والسجل التجاري',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'تم التوثيق عبر منصة واثق والنفاذ الوطني',
                            style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Status Banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'المنشأة موثقة ومعتمدة رسمياً (Verified Active)',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF166534)),
                          ),
                          Text(
                            'جميع البيانات مطابقة لوزارة التجارة وهيئة الزكاة والضريبة والجمارك ZATCA',
                            style: TextStyle(fontSize: 11, color: Color(0xFF15803D)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Information Grid
              _buildVerificationRow(
                context,
                title: 'اسم المنشأة المسجل',
                value: entityName,
                icon: Icons.business_rounded,
              ),
              const Divider(height: 12),
              _buildVerificationRow(
                context,
                title: 'رقم السجل التجاري (CR No.)',
                value: '1010789456',
                icon: Icons.numbers_rounded,
                isCopyable: true,
                badge: 'سارٍ حتى 2028-05-20',
              ),
              const Divider(height: 12),
              _buildVerificationRow(
                context,
                title: 'الرقم الضريبي (VAT ID)',
                value: '31045678900003',
                icon: Icons.receipt_rounded,
                isCopyable: true,
                badge: 'معتمد ZATCA',
              ),
              const Divider(height: 12),
              _buildVerificationRow(
                context,
                title: 'العنوان الوطني المعتمد',
                value: 'الرياض - حي الملز - طريق صلاح الدين الأيوبي',
                icon: Icons.location_on_rounded,
              ),
              const SizedBox(height: 16),

              // Verified Documents Box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'المستندات المعتمدة لدى المنصة:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF334155)),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('• مستخرج السجل التجاري الإلكتروني (PDF)', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                        Text('معتمد ✅', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('• شهادة التسجيل في ضريبة القيمة المضافة', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                        Text('معتمد ✅', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('تم إرسال طلب إعادة التحقق وتحديث البيانات عبر واثق بنجاح ✅'),
                            backgroundColor: Color(0xFF059669),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF059669)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: const Icon(Icons.refresh_rounded, color: Color(0xFF059669), size: 18),
                      label: const Text(
                        'تحديث من واثق',
                        style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w900, fontSize: 12.5),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: const Icon(Icons.check_rounded, color: Colors.white, size: 18),
                      label: const Text(
                        'إغلاق',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12.5),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildVerificationRow(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    bool isCopyable = false,
    String? badge,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF64748B)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
            ],
          ),
        ),
        if (badge != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            margin: const EdgeInsets.only(left: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Text(
              badge,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
            ),
          ),
        if (isCopyable)
          IconButton(
            icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFF2563EB)),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: value));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('تم نسخ $value إلى الحافظة بنجاح 📋'),
                  duration: const Duration(seconds: 2),
                  backgroundColor: const Color(0xFF0F172A),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    String? badge,
    Color? badgeColor,
    Color? badgeTextColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Icon(icon, color: iconColor, size: 20),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor ?? const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            badge,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: badgeTextColor ?? const Color(0xFF475569),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  void _showSecurityDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('الأمان وكلمة المرور', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('حسابك محمي بواسطة التوثيق الثنائي عبر الرسائل النصية القصيرة OTP.'),
            SizedBox(height: 12),
            Text('• الدخول الحيوي بالبصمة (Biometrics): مفعل ✅'),
            SizedBox(height: 6),
            Text('• تشفير البيانات: 256-bit SSL / TLS'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إغلاق', style: TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );
  }

  void _showNotificationsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('تفضيلات الإشعارات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('الإشعارات الفورية مفعلة لجميع الأحداث التالية:'),
            SizedBox(height: 10),
            Text('✅ وصول عروض أسعار جديدة'),
            Text('✅ تحديثات حالة الشحن والتسليم والتتبع'),
            Text('✅ إصدار الفواتير الضريبية ZATCA'),
            Text('✅ رسائل غرفة الصفقات وتذاكر الدعم الفني'),
            Text('✅ إيداعات المحفظة وسجل العمليات'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إغلاق', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, AppRouter.notifications);
            },
            icon: const Icon(Icons.notifications_active_rounded, size: 16, color: Colors.white),
            label: const Text('فتح مركز الإشعارات', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D9488),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('تأكيد تسجيل الخروج', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        content: const Text('هل أنت متأكد من رغبتك في تسجيل الخروج من الحساب؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await NotificationService().unregisterOnLogout();
              if (context.mounted) {
                context.read<AuthBloc>().add(LogoutEvent());
                Navigator.pushNamedAndRemoveUntil(context, AppRouter.login, (r) => false);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('تسجيل الخروج', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showVendorReviewsModal(BuildContext context, String vendorName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: const Icon(Icons.stars_rounded, color: Color(0xFFD97706), size: 22),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'تقييمات ومراجعات العملاء',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            'سجل تقييمات صفقات $vendorName',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Rating Summary Banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'متوسط التقييم العام',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Text(
                              '4.9',
                              style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(width: 6),
                            Row(
                              children: List.generate(5, (_) => const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 16)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF059669).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF059669).withOpacity(0.4)),
                      ),
                      child: const Text(
                        'مورد متميز 🛡️',
                        style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'أحدث التقييمات الواردة:',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView(
                  children: [
                    _buildReviewCard(
                      clientName: 'شركة المشتريات الوطنية',
                      carInfo: 'تويوتا كامري 2024 • طلب #ORD-3105',
                      rating: 5,
                      comment: 'القطع أصلية ومطابقة تماماً لرقم الهيكل وتم التجهيز بوقت قياسي وتعامل راقي ومحترف.',
                      date: 'منذ يومين',
                    ),
                    _buildReviewCard(
                      clientName: 'مؤسسة الأسطول السريع',
                      carInfo: 'جي إم سي سييرا 2023 • طلب #ORD-5501',
                      rating: 5,
                      comment: 'التزام ممتاز بالمواصفات وجودة التغليف وسرعة تسليم الشحنة لمندوب النقل.',
                      date: 'منذ 4 أيام',
                    ),
                    _buildReviewCard(
                      clientName: 'مجموعة روافد الخليج',
                      carInfo: 'هيونداي H1 2022 • طلب #ORD-8412',
                      rating: 5,
                      comment: 'سعر منافس وقطع وكالة معتمدة وضمان حقيقي، تجربة ممتازة.',
                      date: 'منذ أسبوع',
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

  Widget _buildReviewCard({
    required String clientName,
    required String carInfo,
    required int rating,
    required String comment,
    required String date,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(clientName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                  Text(carInfo, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                ],
              ),
              Row(
                children: List.generate(5, (idx) {
                  return Icon(
                    idx < rating ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 14,
                    color: const Color(0xFFF59E0B),
                  );
                }),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(comment, style: const TextStyle(fontSize: 11, color: Color(0xFF334155), height: 1.4)),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(date, style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
          ),
        ],
      ),
    );
  }

  String _roleLabel(String role) {
    if (role == 'vendor') return 'مورد معتمد 🏢';
    if (role == 'courier') return 'مندوب توصيل 🚚';
    return 'عميل مشتريات 👤';
  }
}
