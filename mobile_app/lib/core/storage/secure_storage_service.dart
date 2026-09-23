import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:rfqsa_mobile/core/config/env_config.dart';

/// Centralized Secure Storage Service for Tokens, Keys, and Authenticated Sessions
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  // Auth Token
  Future<void> saveAuthToken(String token) async {
    await _storage.write(key: EnvConfig.tokenKey, value: token);
  }

  Future<String?> getAuthToken() async {
    return await _storage.read(key: EnvConfig.tokenKey);
  }

  // Refresh Token
  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: EnvConfig.refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: EnvConfig.refreshTokenKey);
  }

  // User ID
  Future<void> saveUserId(String userId) async {
    await _storage.write(key: EnvConfig.userIdKey, value: userId);
  }

  Future<String?> getUserId() async {
    return await _storage.read(key: EnvConfig.userIdKey);
  }

  // User Role (client, vendor, courier, admin)
  Future<void> saveUserRole(String role) async {
    await _storage.write(key: EnvConfig.userRoleKey, value: role);
  }

  Future<String?> getUserRole() async {
    return await _storage.read(key: EnvConfig.userRoleKey);
  }

  // Organization ID
  Future<void> saveOrgId(String orgId) async {
    await _storage.write(key: EnvConfig.activeOrgIdKey, value: orgId);
  }

  Future<String?> getOrgId() async {
    return await _storage.read(key: EnvConfig.activeOrgIdKey);
  }

  // User Profile JSON Cache
  Future<void> saveUserProfile(Map<String, dynamic> profile) async {
    await _storage.write(key: EnvConfig.userProfileKey, value: jsonEncode(profile));
  }

  Future<Map<String, dynamic>?> getUserProfile() async {
    final str = await _storage.read(key: EnvConfig.userProfileKey);
    if (str != null && str.isNotEmpty) {
      try {
        return jsonDecode(str) as Map<String, dynamic>;
      } catch (_) {}
    }
    return null;
  }

  // FCM Device Token
  Future<void> saveFcmToken(String token) async {
    await _storage.write(key: EnvConfig.fcmTokenKey, value: token);
  }

  Future<String?> getFcmToken() async {
    return await _storage.read(key: EnvConfig.fcmTokenKey);
  }

  // Clear Session
  Future<void> clearSession() async {
    await _storage.deleteAll();
  }

  // Has Valid Session Check
  Future<bool> hasValidSession() async {
    final token = await getAuthToken();
    final role = await getUserRole();
    return token != null && token.isNotEmpty && role != null && role.isNotEmpty;
  }
}
