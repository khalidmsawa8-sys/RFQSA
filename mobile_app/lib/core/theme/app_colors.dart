import 'package:flutter/material.dart';

/// RFQSA Official Color Tokens - 100% Matching Web CSS & Tailwind Tokens
class AppColors {
  // Brand Header & Dark Slate Accents (Web Match #0A1224 & #0F172A)
  static const Color headerBackground = Color(0xFF0A1224);
  static const Color headerBorder = Color(0xFF1E293B);
  static const Color slateNavy = Color(0xFF0F172A); // slate-900
  static const Color slate900 = Color(0xFF0F172A);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slateBorder = Color(0xFF334155);

  // Primary Brand Colors (Royal Blue - Web Match #2563EB)
  static const Color primary = Color(0xFF2563EB); // blue-600
  static const Color blue600 = Color(0xFF2563EB);
  static const Color primaryHover = Color(0xFF1D4ED8); // blue-700
  static const Color primaryDark = Color(0xFF1E40AF); // blue-800
  static const Color primaryLight = Color(0xFF3B82F6); // blue-500
  static const Color primarySurface = Color(0xFFEFF6FF); // blue-50
  static const Color primaryBorder = Color(0xFFBFDBFE); // blue-200

  // Secondary Accents: Emerald / B2B Verification (Web Match #10B981 & #059669)
  static const Color emerald = Color(0xFF10B981); // emerald-500
  static const Color emerald500 = Color(0xFF10B981);
  static const Color emeraldDark = Color(0xFF059669); // emerald-600
  static const Color emerald600 = Color(0xFF059669);
  static const Color emeraldSurface = Color(0xFFECFDF5); // emerald-50
  static const Color emeraldBorder = Color(0xFFA7F3D0); // emerald-200
  static const Color emeraldText = Color(0xFF065F46); // emerald-800
  static const Color teal500 = Color(0xFF14B8A6);

  // Secondary Accents: Amber / Pending / Offers (Web Match #D97706)
  static const Color amber = Color(0xFFD97706); // amber-600
  static const Color amber600 = Color(0xFFD97706);
  static const Color amberLight = Color(0xFFF59E0B); // amber-500
  static const Color amber500 = Color(0xFFF59E0B);
  static const Color amberSurface = Color(0xFFFFFBEB); // amber-50
  static const Color amberBorder = Color(0xFFFDE68A); // amber-200
  static const Color amberText = Color(0xFF92400E); // amber-800

  // Secondary Accents: Sky / Radar (Web Match #0284C7)
  static const Color sky = Color(0xFF0284C7); // sky-600
  static const Color skySurface = Color(0xFFF0F9FF); // sky-50
  static const Color skyBorder = Color(0xFFBAE6FD); // sky-200

  // Neutral Backgrounds, Cards & Borders
  static const Color background = Color(0xFFF8FAFC); // slate-50
  static const Color card = Colors.white;
  static const Color border = Color(0xFFE2E8F0); // slate-200
  static const Color borderLight = Color(0xFFF1F5F9); // slate-100
  static const Color inputBackground = Color(0xFFF8FAFC);
  static const Color inputBorder = Color(0xFFCBD5E1);

  // Typography Colors
  static const Color textPrimary = Color(0xFF0F172A); // slate-900
  static const Color textSecondary = Color(0xFF475569); // slate-600
  static const Color textMuted = Color(0xFF64748B); // slate-500
  static const Color textPlaceholder = Color(0xFF94A3B8); // slate-400

  // Status & Feedback Colors
  static const Color success = Color(0xFF10B981);
  static const Color successSurface = Color(0xFFECFDF5);
  static const Color successBorder = Color(0xFFA7F3D0);
  static const Color error = Color(0xFFEF4444); // red-500
  static const Color errorSurface = Color(0xFFFEF2F2); // red-50
  static const Color errorBorder = Color(0xFFFECACA); // red-200
  static const Color warning = Color(0xFFF59E0B); // amber-500
  static const Color warningSurface = Color(0xFFFFFBEB); // amber-50
  static const Color warningBorder = Color(0xFFFDE68A); // amber-200
  static const Color info = Color(0xFF2563EB); // blue-600
  static const Color infoSurface = Color(0xFFEFF6FF); // blue-50
  static const Color infoBorder = Color(0xFFBFDBFE); // blue-200

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
    begin: Alignment.topRight,
    end: Alignment.bottomLeft,
  );

  static const LinearGradient emeraldGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topRight,
    end: Alignment.bottomLeft,
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF0A1224), Color(0xFF0F172A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient orderTrackingGradient = LinearGradient(
    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
    begin: Alignment.topRight,
    end: Alignment.bottomLeft,
  );
}
