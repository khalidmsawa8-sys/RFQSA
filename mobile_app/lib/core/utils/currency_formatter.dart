import 'package:intl/intl.dart';

/// Centralized Arabic Currency & Number Formatter
class CurrencyFormatter {
  static final NumberFormat _formatter = NumberFormat('#,##0.00', 'ar_SA');
  static final NumberFormat _intFormatter = NumberFormat('#,##0', 'ar_SA');

  static String format(dynamic amount) {
    if (amount == null) return '0.00 ر.س';
    final num val = amount is num ? amount : (num.tryParse(amount.toString()) ?? 0);
    return '${_formatter.format(val)} ر.س';
  }

  static String formatWithoutSymbol(dynamic amount) {
    if (amount == null) return '0.00';
    final num val = amount is num ? amount : (num.tryParse(amount.toString()) ?? 0);
    return _formatter.format(val);
  }

  static String formatInt(dynamic amount) {
    if (amount == null) return '0';
    final num val = amount is num ? amount : (num.tryParse(amount.toString()) ?? 0);
    return _intFormatter.format(val);
  }
}
