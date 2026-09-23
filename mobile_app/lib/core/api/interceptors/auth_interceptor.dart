import 'package:dio/dio.dart';
import 'package:rfqsa_mobile/core/storage/secure_storage_service.dart';

/// Interceptor to automatically attach authorization tokens, cookies and session headers
class AuthInterceptor extends Interceptor {
  final SecureStorageService _storageService;
  final void Function()? onUnauthorized;

  AuthInterceptor({
    required SecureStorageService storageService,
    this.onUnauthorized,
  }) : _storageService = storageService;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storageService.getAuthToken();
    var userId = await _storageService.getUserId();
    var userRole = await _storageService.getUserRole() ?? 'client';
    final orgId = await _storageService.getOrgId();

    final profile = await _storageService.getUserProfile();
    var email = profile?['email']?.toString() ?? '';
    final roleId = profile?['roleId']?.toString() ?? profile?['role_id']?.toString() ?? userRole;
    final fullName = profile?['fullName']?.toString() ?? profile?['full_name']?.toString() ?? '';

    // Smart fallback IDs if user is testing directly
    if (userId == null || userId.isEmpty) {
      if (userRole == 'vendor') {
        userId = 'vendor-demo-id';
        email = email.isEmpty ? 'vendor@rfqsa.tech' : email;
      } else if (userRole == 'courier') {
        userId = 'courier-demo-id';
        email = email.isEmpty ? 'courier@rfqsa.tech' : email;
      } else {
        userId = 'client-demo-id';
        email = email.isEmpty ? 'client@rfqsa.tech' : email;
      }
    }

    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    options.headers['x-user-id'] = userId;
    options.headers['x-courier-id'] = userId;
    options.headers['x-user-role'] = userRole;

    if (email.isNotEmpty) {
      options.headers['x-user-email'] = email;
    }

    if (orgId != null && orgId.isNotEmpty) {
      options.headers['x-org-id'] = orgId;
    }

    // Attach Session Cookies for Next.js Server & API Route Handlers
    options.headers['Cookie'] =
        'rfq_session=$userRole; rfq_role=$roleId; rfq_user_id=$userId; rfq_user_email=$email; rfq_user_name=${Uri.encodeComponent(fullName)};';

    options.headers['Accept'] = 'application/json';
    options.headers['Content-Type'] = options.headers['Content-Type'] ?? 'application/json';

    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      onUnauthorized?.call();
    }
    return handler.next(err);
  }
}
