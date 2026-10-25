import 'dart:io';
import 'package:uuid/uuid.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/api/api_response.dart';
import 'package:rfqsa_mobile/features/courier/models/delivery_task_model.dart';

/// Centralized Courier Repository for Delivery Transitions, Telemetry, and Proof of Delivery (POD)
class CourierRepository {
  final ApiClient _apiClient;
  final Uuid _uuid = const Uuid();

  CourierRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  // 1. Fetch Assigned Delivery Tasks
  Future<ApiResponse<List<DeliveryTaskModel>>> fetchDeliveries() async {
    return await _apiClient.get<List<DeliveryTaskModel>>(
      ApiEndpoints.courierDeliveries,
      fromJson: (data) {
        final List<dynamic> list;
        if (data is Map && data['deliveries'] is List) {
          list = data['deliveries'] as List;
        } else if (data is List) {
          list = data;
        } else {
          return <DeliveryTaskModel>[];
        }

        final results = <DeliveryTaskModel>[];
        for (final item in list) {
          if (item is Map) {
            try {
              final map = Map<String, dynamic>.from(item);
              results.add(DeliveryTaskModel.fromJson(map));
            } catch (_) {
              // Silently ignore or skip individual malformed task
            }
          }
        }
        return results;
      },
    );
  }

  Future<List<DeliveryTaskModel>> getAssignedDeliveries() async {
    final res = await fetchDeliveries();
    if (res.success && res.data != null) {
      return res.data!;
    }
    return [];
  }

  // 2. Transition Delivery State Machine
  Future<ApiResponse<Map<String, dynamic>>> transitionDeliveryStatus({
    required String deliveryId,
    required String targetStatus,
    String? otpCode,
    String? podPhotoUrl,
    Map<String, dynamic>? telemetry,
  }) async {
    final payload = {
      'targetStatus': targetStatus,
      'idempotencyKey': _uuid.v4(),
      if (otpCode != null) 'otpCode': otpCode,
      if (podPhotoUrl != null) 'podPhotoUrl': podPhotoUrl,
      if (telemetry != null) 'telemetry': telemetry,
      'source': 'online',
    };

    return await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.courierTransition(deliveryId),
      data: payload,
    );
  }

  // 3. Upload POD Photo
  Future<ApiResponse<String>> uploadPodPhoto(String deliveryId, File file) async {
    final res = await _apiClient.uploadFile(
      ApiEndpoints.courierUploadPod(deliveryId),
      file: file,
      fileFieldName: 'file',
    );

    if (res.success && res.data is Map<String, dynamic>) {
      return ApiResponse(
        success: true,
        data: res.data['file_url']?.toString() ?? res.data['podUrl']?.toString() ?? res.data['url']?.toString(),
      );
    }
    return ApiResponse.failure(error: res.error ?? 'فشل رفع صورة إثبات التسليم');
  }

  // 4. Fetch Courier Wallet Data
  Future<ApiResponse<Map<String, dynamic>>> fetchCourierWallet() async {
    return await _apiClient.get<Map<String, dynamic>>(
      ApiEndpoints.courierWallet,
      fromJson: (data) => data is Map<String, dynamic> ? data : {},
    );
  }
}
