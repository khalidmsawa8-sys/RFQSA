import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';

/// RFQSA Official Typography Tokens (Cairo Font System)
class AppTypography {
  static TextStyle get h1 => GoogleFonts.cairo(
        fontSize: 24,
        fontWeight: FontWeight.w900,
        color: AppColors.textPrimary,
        height: 1.25,
        letterSpacing: -0.5,
      );

  static TextStyle get h2 => GoogleFonts.cairo(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: AppColors.textPrimary,
        height: 1.3,
        letterSpacing: -0.3,
      );

  static TextStyle get h3 => GoogleFonts.cairo(
        fontSize: 17,
        fontWeight: FontWeight.w800,
        color: AppColors.textPrimary,
        height: 1.35,
      );

  static TextStyle get title => GoogleFonts.cairo(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
        height: 1.4,
      );

  static TextStyle get bodyLarge => GoogleFonts.cairo(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
        height: 1.5,
      );

  static TextStyle get bodyMedium => GoogleFonts.cairo(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: AppColors.textSecondary,
        height: 1.5,
      );

  static TextStyle get bodySmall => GoogleFonts.cairo(
        fontSize: 11.5,
        fontWeight: FontWeight.w500,
        color: AppColors.textMuted,
        height: 1.45,
      );

  static TextStyle get caption => GoogleFonts.cairo(
        fontSize: 10,
        fontWeight: FontWeight.w600,
        color: AppColors.textMuted,
        height: 1.4,
      );

  static TextStyle get badge => GoogleFonts.cairo(
        fontSize: 10.5,
        fontWeight: FontWeight.w800,
        height: 1.2,
      );

  static TextStyle get button => GoogleFonts.cairo(
        fontSize: 13.5,
        fontWeight: FontWeight.w800,
        height: 1.2,
      );
}
