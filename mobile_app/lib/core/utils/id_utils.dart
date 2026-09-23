/// Utility for safely formatting IDs without throwing RangeErrors
class IdUtils {
  static String safeShortId(String? rawId, {String? prefix}) {
    if (rawId == null || rawId.isEmpty) return '5501';

    String clean = rawId;
    if (prefix != null && prefix.isNotEmpty && clean.startsWith(prefix)) {
      clean = clean.substring(prefix.length);
    } else {
      clean = clean.replaceFirst(RegExp(r'^(ORD|RFQ|DEL|INV|WB|REQ|LEDG|TKT|PAY|V)-'), '');
    }

    if (clean.length > 8) {
      return clean.substring(0, 8).toUpperCase();
    }
    return clean.toUpperCase();
  }
}
