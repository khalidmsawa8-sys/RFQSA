import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/api/api_response.dart';
import 'package:rfqsa_mobile/core/storage/secure_storage_service.dart';
import 'package:rfqsa_mobile/features/auth/models/user_model.dart';

/// Authentication Repository interacting with Backend APIs and Local Secure Storage
class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;

  AuthRepository({
    required ApiClient apiClient,
    required SecureStorageService storageService,
  })  : _apiClient = apiClient,
        _storageService = storageService;

  /// Perform Login via Email / Phone / RefCode + Password
  Future<ApiResponse<UserModel>> login({
    required String identifier,
    required String password,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.login,
      data: {
        'identifier': identifier.trim(),
        'password': password.trim(),
      },
      fromJson: (data) => UserModel.fromJson(data as Map<String, dynamic>),
    );

    if (response.success && response.data != null) {
      final user = response.data!;
      // Save session securely
      await _storageService.saveAuthToken(user.id); // Or bearer token
      await _storageService.saveUserId(user.id);
      await _storageService.saveUserRole(user.role);
      await _storageService.saveUserProfile(user.toJson());
    }

    return response;
  }

  /// Fetch Current Verified User Profile & Permissions from Backend
  Future<ApiResponse<UserModel>> fetchCurrentPermissions() async {
    final response = await _apiClient.get(
      ApiEndpoints.permissions,
      fromJson: (data) => UserModel.fromJson(data as Map<String, dynamic>),
    );

    if (response.success && response.data != null) {
      final user = response.data!;
      await _storageService.saveUserRole(user.role);
      await _storageService.saveUserProfile(user.toJson());
    }

    return response;
  }

  /// Register Device FCM Token on Backend
  Future<void> registerDeviceToken(String fcmToken, String platform) async {
    await _storageService.saveFcmToken(fcmToken);
    try {
      await _apiClient.post(
        ApiEndpoints.registerDevice,
        data: {
          'fcm_token': fcmToken,
          'platform': platform,
        },
      );
    } catch (_) {}
  }

  /// Get Cached User Profile
  Future<UserModel?> getCachedUser() async {
    final cached = await _storageService.getUserProfile();
    if (cached != null) {
      return UserModel.fromJson(cached);
    }
    return null;
  }

  /// Check Active Session
  Future<bool> hasValidSession() async {
    return await _storageService.hasValidSession();
  }

  /// Perform Logout
  Future<void> logout() async {
    await _storageService.clearSession();
  }
}
