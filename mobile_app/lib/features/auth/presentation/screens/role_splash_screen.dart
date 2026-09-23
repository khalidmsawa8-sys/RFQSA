import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:animate_do/animate_do.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';

/// Splash Screen with Dynamic Role Routing Check
class RoleSplashScreen extends StatefulWidget {
  const RoleSplashScreen({super.key});

  @override
  State<RoleSplashScreen> createState() => _RoleSplashScreenState();
}

class _RoleSplashScreenState extends State<RoleSplashScreen> {
  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) async {
        if (state is AuthenticatedState) {
          final role = state.activeRole.toLowerCase();
          // Prompt notification permission if not yet determined
          await NotificationService().checkAndPromptPermissionOnFirstLaunch(context);

          if (!context.mounted) return;
          if (role == 'vendor') {
            Navigator.pushReplacementNamed(context, AppRouter.vendorHome);
          } else if (role == 'courier') {
            Navigator.pushReplacementNamed(context, AppRouter.courierHome);
          } else {
            Navigator.pushReplacementNamed(context, AppRouter.clientHome);
          }
        } else if (state is UnauthenticatedState || state is AuthErrorState) {
          Navigator.pushReplacementNamed(context, AppRouter.login);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A), // Luxury Dark Slate
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FadeInDown(
                duration: const Duration(milliseconds: 800),
                child: Container(
                  width: 96,
                  height: 96,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(26),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.35),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.asset(
                      'assets/images/app_icon.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.directions_car_filled_rounded,
                        size: 48,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              FadeInUp(
                duration: const Duration(milliseconds: 800),
                delay: const Duration(milliseconds: 200),
                child: Column(
                  children: [
                    const Text(
                      'رِفْق | RFQSA',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'المنظومة الموحدة لقطع غيار السيارات بالمملكة',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryLight),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
