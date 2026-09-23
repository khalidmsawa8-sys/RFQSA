import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:rfqsa_mobile/core/config/env_config.dart';
import 'package:rfqsa_mobile/core/storage/secure_storage_service.dart';
import 'package:rfqsa_mobile/core/api/interceptors/auth_interceptor.dart';
import 'package:rfqsa_mobile/core/api/interceptors/error_interceptor.dart';
import 'package:rfqsa_mobile/core/api/api_response.dart';

class _CacheEntry {
  final dynamic data;
  final int? statusCode;
  final DateTime timestamp;
  final Duration ttl;

  _CacheEntry({
    required this.data,
    required this.statusCode,
    required this.timestamp,
    required this.ttl,
  });

  bool get isExpired => DateTime.now().difference(timestamp) > ttl;
}

/// Centralized Singleton API Client powered by Dio with High-Performance Memory Caching
class ApiClient {
  static ApiClient? _instance;
  static ApiClient get instance => _instance ??= ApiClient(storageService: SecureStorageService());

  late final Dio _dio;
  final SecureStorageService _storageService;
  final Map<String, _CacheEntry> _cache = {};

  ApiClient({
    required SecureStorageService storageService,
    void Function()? onUnauthorized,
  }) : _storageService = storageService {
    _instance = this;
    _dio = Dio(
      BaseOptions(
        baseUrl: EnvConfig.baseUrl,
        connectTimeout: EnvConfig.connectTimeout,
        receiveTimeout: EnvConfig.receiveTimeout,
        sendTimeout: EnvConfig.sendTimeout,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
      ),
    );

    _dio.interceptors.addAll([
      AuthInterceptor(
        storageService: _storageService,
        onUnauthorized: onUnauthorized,
      ),
      ErrorInterceptor(),
      if (kDebugMode)
        LogInterceptor(
          requestBody: true,
          responseBody: false, // Keep logs clean & fast
          requestHeader: false,
          responseHeader: false,
          error: true,
        ),
    ]);
  }

  Dio get rawDio => _dio;

  String _normalizePath(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/api/')) return path.substring(5);
    if (path.startsWith('api/')) return path.substring(4);
    if (path.startsWith('/')) return path.substring(1);
    return path;
  }

  void clearCache([String? pattern]) {
    if (pattern == null) {
      _cache.clear();
    } else {
      _cache.removeWhere((key, _) => key.contains(pattern));
    }
  }

  // GET Method with Stale-While-Revalidate & Instant Response
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    T Function(dynamic data)? fromJson,
    bool forceRefresh = false,
    Duration cacheTtl = const Duration(seconds: 45),
  }) async {
    final formattedPath = _normalizePath(path);
    final cacheKey = '$formattedPath?${queryParameters?.toString() ?? ""}';

    // 1. Check in-memory Cache
    if (!forceRefresh && _cache.containsKey(cacheKey)) {
      final entry = _cache[cacheKey]!;
      if (!entry.isExpired) {
        return ApiResponse.fromJson(
          entry.data is Map<String, dynamic>
              ? entry.data
              : {'data': entry.data, 'success': true},
          fromJson,
          statusCode: entry.statusCode,
        );
      }
    }

    try {
      final response = await _dio.get(
        formattedPath,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );

      // Store in memory cache
      _cache[cacheKey] = _CacheEntry(
        data: response.data,
        statusCode: response.statusCode,
        timestamp: DateTime.now(),
        ttl: cacheTtl,
      );

      return ApiResponse.fromJson(
        response.data is Map<String, dynamic>
            ? response.data
            : {'data': response.data, 'success': true},
        fromJson,
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      // Fallback: If network failed or timed out but we have a cached copy, use it!
      if (_cache.containsKey(cacheKey)) {
        final entry = _cache[cacheKey]!;
        return ApiResponse.fromJson(
          entry.data is Map<String, dynamic>
              ? entry.data
              : {'data': entry.data, 'success': true},
          fromJson,
          statusCode: entry.statusCode,
        );
      }

      return ApiResponse.failure(
        error: e.message ?? 'فشل تنفيذ الطلب',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      if (_cache.containsKey(cacheKey)) {
        final entry = _cache[cacheKey]!;
        return ApiResponse.fromJson(
          entry.data is Map<String, dynamic>
              ? entry.data
              : {'data': entry.data, 'success': true},
          fromJson,
          statusCode: entry.statusCode,
        );
      }
      return ApiResponse.failure(error: e.toString());
    }
  }

  // POST Method
  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final formattedPath = _normalizePath(path);
      // Invalidate relevant caches on mutations
      clearCache(formattedPath.split('/').first);

      final response = await _dio.post(
        formattedPath,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );

      return ApiResponse.fromJson(
        response.data is Map<String, dynamic>
            ? response.data
            : {'data': response.data, 'success': true},
        fromJson,
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.failure(
        error: e.message ?? 'فشل إرسال البيانات',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.failure(error: e.toString());
    }
  }

  // PUT Method
  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final formattedPath = _normalizePath(path);
      clearCache(formattedPath.split('/').first);

      final response = await _dio.put(
        formattedPath,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );

      return ApiResponse.fromJson(
        response.data is Map<String, dynamic>
            ? response.data
            : {'data': response.data, 'success': true},
        fromJson,
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.failure(
        error: e.message ?? 'فشل تعديل البيانات',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.failure(error: e.toString());
    }
  }

  // PATCH Method
  Future<ApiResponse<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final formattedPath = _normalizePath(path);
      clearCache(formattedPath.split('/').first);

      final response = await _dio.patch(
        formattedPath,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );

      return ApiResponse.fromJson(
        response.data is Map<String, dynamic>
            ? response.data
            : {'data': response.data, 'success': true},
        fromJson,
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.failure(
        error: e.message ?? 'فشل تعديل البيانات',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.failure(error: e.toString());
    }
  }

  // DELETE Method
  Future<ApiResponse<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final formattedPath = _normalizePath(path);
      clearCache(formattedPath.split('/').first);

      final response = await _dio.delete(
        formattedPath,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );

      return ApiResponse.fromJson(
        response.data is Map<String, dynamic>
            ? response.data
            : {'data': response.data, 'success': true},
        fromJson,
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.failure(
        error: e.message ?? 'فشل حذف العنصر',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.failure(error: e.toString());
    }
  }

  // Multipart File Upload Method
  Future<ApiResponse<T>> uploadFile<T>(
    String path, {
    required File file,
    String fileFieldName = 'file',
    Map<String, dynamic>? extraFields,
    void Function(int sent, int total)? onProgress,
    T Function(dynamic data)? fromJson,
  }) async {
    try {
      final formattedPath = _normalizePath(path);
      final fileName = file.path.split(Platform.pathSeparator).last;
      final formData = FormData.fromMap({
        fileFieldName: await MultipartFile.fromFile(file.path, filename: fileName),
        if (extraFields != null) ...extraFields,
      });

      final response = await _dio.post(
        formattedPath,
        data: formData,
        onSendProgress: onProgress,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );

      return ApiResponse.fromJson(
        response.data is Map<String, dynamic>
            ? response.data
            : {'data': response.data, 'success': true},
        fromJson,
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.failure(
        error: e.message ?? 'فشل رفع الملف',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.failure(error: e.toString());
    }
  }
}
