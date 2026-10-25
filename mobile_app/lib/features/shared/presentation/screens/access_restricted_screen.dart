import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';

/// Professional Access Restricted Screen for RBAC Violation Prevention
class AccessRestrictedScreen extends StatelessWidget {
  final String? featureName;
  final String? requiredRoleOrPermission;

  const AccessRestrictedScreen({
    super.key,
    this.featureName,
    this.requiredRoleOrPermission,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushNamedAndRemoveUntil(context, AppRouter.splash, (route) => false);
            }
          },
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.12),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3), width: 2),
                ),
                child: const Center(
                  child: Icon(Icons.gpp_bad_rounded, color: Color(0xFFEF4444), size: 48),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'عذراً، الصلاحية غير متوفرة',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                featureName != null
                    ? 'ليس لديك الصلاحية المطلوبة للوصول إلى ($featureName). هذا القسم محمي وفق إعدادات منظومة الصلاحيات المؤسسية (RBAC).'
                    : 'حسابك الحالي لا يمتلك الإذن الكافي للوصول إلى هذا القسم. يرجى التواصل مع مالك المنشأة أو مدير الحساب لمنحك الصلاحية.',
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13.5,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (Navigator.canPop(context)) {
                      Navigator.pop(context);
                    } else {
                      Navigator.pushNamedAndRemoveUntil(context, AppRouter.splash, (route) => false);
                    }
                  },
                  icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                  label: const Text('العودة إلى الشاشة السابقة', style: TextStyle(fontWeight: FontWeight.w900)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
