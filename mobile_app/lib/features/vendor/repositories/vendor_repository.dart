import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/api/api_response.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/client/models/quote_model.dart';

/// Vendor Repository for Live Radar Stream, Quotation Submissions & Specializations
class VendorRepository {
  final ApiClient _apiClient;

  VendorRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // 1. Fetch Radar Live RFQs (Filtered Server-Side by Vendor Specializations)
  Future<ApiResponse<List<RfqModel>>> fetchRadarRfqs() async {
    return await _apiClient.get<List<RfqModel>>(
      ApiEndpoints.rfqs,
      fromJson: (data) {
        final List<dynamic> list;
        if (data is List) {
          list = data;
        } else if (data is Map && data['rfqs'] is List) {
          list = data['rfqs'] as List;
        } else if (data is Map && data['data'] is List) {
          list = data['data'] as List;
        } else {
          return <RfqModel>[];
        }

        final results = <RfqModel>[];
        for (final item in list) {
          if (item is Map) {
            try {
              results.add(RfqModel.fromJson(Map<String, dynamic>.from(item)));
            } catch (_) {}
          }
        }
        return results;
      },
    );
  }

  // 2. Submit Quotation for RFQ
  Future<ApiResponse<Map<String, dynamic>>> submitQuote({
    required String rfqId,
    required double totalPrice,
    required int deliveryDays,
    required double deliveryCost,
    String? notes,
    required List<dynamic> items,
    int prepDays = 0,
    int prepHours = 2,
    int prepMinutes = 0,
  }) async {
    final payload = {
      'rfq_id': rfqId,
      'total_price': totalPrice,
      'delivery_days': deliveryDays,
      'delivery_cost': deliveryCost,
      'notes': notes,
      'items': items,
      'delivery_snapshot': {
        'preparation_time': {
          'days': prepDays,
          'hours': prepHours,
          'minutes': prepMinutes,
        },
      },
    };

    return await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.quotes,
      data: payload,
    );
  }

  // 3. Fetch Vendor Specializations
  Future<ApiResponse<List<String>>> fetchSpecializations() async {
    return await _apiClient.get<List<String>>(
      ApiEndpoints.vendorSpecializations,
      fromJson: (data) {
        if (data is Map<String, dynamic> && data['brands'] is List) {
          return (data['brands'] as List).map((e) => e.toString()).toList();
        }
        return [];
      },
    );
  }

  // 4. Update Vendor Specialized Brands
  Future<ApiResponse<void>> updateSpecializations(List<String> brands, bool specializesInAll) async {
    return await _apiClient.post(
      ApiEndpoints.vendorSpecializations,
      data: {
        'brands': brands,
        'specializes_in_all_brands': specializesInAll,
      },
    );
  }
}
