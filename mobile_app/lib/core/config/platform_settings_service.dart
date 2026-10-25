import 'package:flutter/foundation.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';

/// Platform Business & Tax Settings Service
/// Provides live synchronization of commission percentages, VAT, CR, and platform policies
class PlatformSettingsService {
  static final PlatformSettingsService instance = PlatformSettingsService._internal();

  PlatformSettingsService._internal();

  double _clientFeePercent = 5.0;
  double _vendorFeePercent = 6.0;
  double _vatPercent = 15.0;
  String _crNumber = '1010789456';
  String _vatNumber = '310987654300003';
  DateTime? _lastFetch;

  double get clientFeePercent => _clientFeePercent;
  double get vendorFeePercent => _vendorFeePercent;
  double get vatPercent => _vatPercent;
  String get crNumber => _crNumber;
  String get vatNumber => _vatNumber;

  /// Fetches system settings from /v1/settings
  Future<void> fetchSettings({bool force = false}) async {
    if (!force && _lastFetch != null && DateTime.now().difference(_lastFetch!).inMinutes < 5) {
      return;
    }

    try {
      final res = await ApiClient.instance.get('/v1/settings');
      if (res.data != null) {
        final data = res.data['settings'] ?? res.data['data'] ?? res.data;
        if (data != null && data is Map) {
          _clientFeePercent = double.tryParse((data['client_platform_fee_percent'] ?? data['platform_commission_percent'])?.toString() ?? '5') ?? 5.0;
          _vendorFeePercent = double.tryParse((data['vendor_platform_fee_percent'] ?? data['platform_commission_percent'])?.toString() ?? '6') ?? 6.0;
          _vatPercent = double.tryParse(data['vat_percent']?.toString() ?? '15') ?? 15.0;
          if (data['cr_number'] != null) _crNumber = data['cr_number'].toString();
          if (data['vat_number'] != null) _vatNumber = data['vat_number'].toString();
          _lastFetch = DateTime.now();
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('[PlatformSettingsService] fetchSettings error: $e');
      }
    }
  }
}
