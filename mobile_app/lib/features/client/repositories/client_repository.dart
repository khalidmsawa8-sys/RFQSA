import 'dart:convert';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/api/api_response.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/client/models/vehicle_model.dart';
import 'package:rfqsa_mobile/features/client/models/quote_model.dart';

/// Client Repository managing RFQs, Vehicles, and Deal Room
class ClientRepository {
  final ApiClient _apiClient;

  ClientRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // 1. Fetch Client RFQs
  Future<ApiResponse<List<RfqModel>>> fetchMyRfqs() async {
    return await _apiClient.get<List<RfqModel>>(
      ApiEndpoints.rfqs,
      fromJson: (data) {
        if (data is List) {
          return data.map((e) => RfqModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (data is Map && data['rfqs'] is List) {
          return (data['rfqs'] as List).map((e) => RfqModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (data is Map && data['data'] is List) {
          return (data['data'] as List).map((e) => RfqModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
  }

  // 2. Fetch Single RFQ Details & Quotes
  Future<ApiResponse<RfqModel>> fetchRfqDetails(String id) async {
    return await _apiClient.get<RfqModel>(
      ApiEndpoints.rfqDetails(id),
      fromJson: (data) => RfqModel.fromJson(data as Map<String, dynamic>),
    );
  }

  // 3. Create New RFQ (1:1 Web Payload Parity)
  Future<ApiResponse<RfqModel>> createRfq({
    required String carMake,
    required String carModel,
    required int carYear,
    String? plateNumber,
    String? vin,
    String partsCategory = 'all',
    String partsCategoryName = 'عام (كافة التخصصات)',
    required List<RfqItemModel> items,
    String rfqType = 'public',
    String? selectedVendorId,
    String? selectedVendorName,
    String? selectedVendorBranchId,
    String deliveryMethod = 'delivery',
    String? notes,
    bool isUrgent = false,
    required String deliveryLocation,
    required String deliveryCity,
    String? deliveryDistrict,
    String? recipientName,
    String? recipientPhone,
    double? deliveryLat,
    double? deliveryLng,
  }) async {
    final formattedParts = items.map((e) => {
      'partName': e.partName,
      'name': e.partName,
      'partNumber': e.partNumber,
      'part_number': e.partNumber,
      'quantity': e.quantity,
      'partType': e.partType,
      'part_type': e.partType,
      'images': e.images,
      'imagePreview': e.images.isNotEmpty ? e.images[0] : null,
      'imagePathname': e.images.isNotEmpty ? e.images[0] : null,
      'notes': e.notes,
      'category': partsCategory,
    }).toList();

    final partsSummaryText = items.map((e) => '${e.partName} (الكمية: ${e.quantity})').join(' ، ');

    final cleanVendorId = selectedVendorId != null && selectedVendorId.contains('__')
        ? selectedVendorId.split('__')[0]
        : selectedVendorId;

    final payload = {
      // CamelCase (Web convention)
      'carMake': carMake,
      'carModel': carModel,
      'carYear': carYear,
      'plateNumber': plateNumber,
      'vin': vin,
      'partsCategory': partsCategory,
      'partsCategoryName': partsCategoryName,
      'partsText': partsSummaryText,
      'partsList': formattedParts,
      'rfqType': rfqType,
      'selectedVendorId': cleanVendorId,
      'selectedVendorName': selectedVendorName,
      'selectedVendorBranchId': selectedVendorBranchId,
      'targetVendorId': cleanVendorId,
      'deliveryMethod': deliveryMethod,
      'fulfillmentMethod': deliveryMethod == 'pickup' ? 'SELF_PICKUP' : 'DELIVERY',
      'notes': notes,
      'isUrgent': isUrgent,
      'locationName': deliveryLocation,
      'deliveryCity': deliveryCity,
      'deliveryDistrict': deliveryDistrict,
      'recipientName': recipientName,
      'recipientPhone': recipientPhone,
      'deliveryLatitude': deliveryLat,
      'deliveryLongitude': deliveryLng,

      // SnakeCase (DB convention)
      'car_make': carMake,
      'car_model': carModel,
      'car_year': carYear,
      'plate_number': plateNumber,
      'parts_category': partsCategory,
      'parts_category_name': partsCategoryName,
      'parts_description': jsonEncode(formattedParts),
      'delivery_location': deliveryLocation,
      'delivery_city': deliveryCity,
      'delivery_district': deliveryDistrict,
      'recipient_name': recipientName,
      'recipient_phone': recipientPhone,
      'delivery_latitude': deliveryLat,
      'delivery_longitude': deliveryLng,
      'status': 'open',
    };

    return await _apiClient.post<RfqModel>(
      ApiEndpoints.rfqs,
      data: payload,
      fromJson: (data) {
        if (data is Map<String, dynamic>) {
          if (data.containsKey('rfq') && data['rfq'] is Map<String, dynamic>) {
            return RfqModel.fromJson(data['rfq'] as Map<String, dynamic>);
          }
          return RfqModel.fromJson(data);
        }
        return RfqModel.fromJson(data as Map<String, dynamic>);
      },
    );
  }

  // 4. Fetch Client Vehicles (My Garage)
  Future<ApiResponse<List<VehicleModel>>> fetchVehicles() async {
    return await _apiClient.get<List<VehicleModel>>(
      ApiEndpoints.clientVehicles,
      fromJson: (data) {
        if (data is List) {
          return data.map((e) => VehicleModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (data is Map && data['vehicles'] is List) {
          return (data['vehicles'] as List).map((e) => VehicleModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (data is Map && data['data'] is List) {
          return (data['data'] as List).map((e) => VehicleModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );
  }

  // 5. Add New Vehicle to Garage
  Future<ApiResponse<VehicleModel>> addVehicle(VehicleModel vehicle) async {
    return await _apiClient.post<VehicleModel>(
      ApiEndpoints.clientVehicles,
      data: vehicle.toJson(),
      fromJson: (data) => VehicleModel.fromJson(data as Map<String, dynamic>),
    );
  }

  // 6. Delete Vehicle from Garage
  Future<ApiResponse<void>> deleteVehicle(String id) async {
    return await _apiClient.delete(ApiEndpoints.clientVehicleDetail(id));
  }

  // 7. Accept Quote & Create Order (Deal Room)
  Future<ApiResponse<Map<String, dynamic>>> acceptQuote({
    required String rfqId,
    required String quoteId,
    required String vendorId,
    required double totalPrice,
    required List<dynamic> items,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.orders,
      data: {
        'rfq_id': rfqId,
        'quote_id': quoteId,
        'vendor_id': vendorId,
        'status': 'confirmed',
        'total_price': totalPrice,
        'items': items,
      },
    );
  }

  // 8. Fetch Client Orders
  Future<ApiResponse<List<Map<String, dynamic>>>> fetchOrders() async {
    return await _apiClient.get<List<Map<String, dynamic>>>(
      ApiEndpoints.orders,
      fromJson: (data) {
        if (data is List) {
          return data.map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).toList();
        } else if (data is Map && data['orders'] is List) {
          return (data['orders'] as List).map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).toList();
        } else if (data is Map && data['data'] is List) {
          return (data['data'] as List).map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).toList();
        }
        return [];
      },
    );
  }

  // 9. Reactivate RFQ
  Future<ApiResponse<Map<String, dynamic>>> reactivateRfq(String id) async {
    return await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.reactivateRfq(id),
    );
  }
}
