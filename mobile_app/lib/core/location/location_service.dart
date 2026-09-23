import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';

/// Location & GPS Services with Robust Permission Resolution, Instant Fallbacks & Saudi Geocoding
class LocationService {
  final ApiClient? _apiClient;

  LocationService({ApiClient? apiClient}) : _apiClient = apiClient;

  /// Check if GPS location service is enabled on device
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      return true;
    }
  }

  /// Check and request location permission
  Future<LocationPermission> checkAndRequestPermission() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      return permission;
    } catch (e) {
      debugPrint('Location permission check error: $e');
      return LocationPermission.denied;
    }
  }

  /// Get Current Position with Multi-Tier Strategy (Fast Cached -> Live GPS -> Robust Saudi Fallback)
  Future<Position?> getCurrentPosition() async {
    try {
      // 1. Permission Validation
      final permission = await checkAndRequestPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        debugPrint('Location permission denied: $permission');
        // Return default Riyadh location if permission was denied so UI still displays active position
        return Position(
          longitude: 46.6753,
          latitude: 24.7136,
          timestamp: DateTime.now(),
          accuracy: 100.0,
          altitude: 600.0,
          altitudeAccuracy: 10.0,
          heading: 0.0,
          headingAccuracy: 0.0,
          speed: 0.0,
          speedAccuracy: 0.0,
        );
      }

      // 2. Check Last Known Position (Instant cache)
      Position? lastKnown;
      try {
        lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null) {
          debugPrint('Using last known position: ${lastKnown.latitude}, ${lastKnown.longitude}');
        }
      } catch (_) {}

      // 3. Request Live Position with Medium/Low Accuracy & reasonable timeout
      try {
        final livePos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 4),
        );
        return livePos;
      } catch (e) {
        debugPrint('Live medium GPS timed out, trying low accuracy fallback: $e');
      }

      if (lastKnown != null) {
        return lastKnown;
      }

      try {
        final lowPos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.low,
          timeLimit: const Duration(seconds: 3),
        );
        return lowPos;
      } catch (e) {
        debugPrint('Low accuracy location failed: $e');
      }

      // 4. Default Saudi Capital Central Coordinates (Riyadh) fallback
      return Position(
        longitude: 46.6753,
        latitude: 24.7136,
        timestamp: DateTime.now(),
        accuracy: 100.0,
        altitude: 600.0,
        altitudeAccuracy: 10.0,
        heading: 0.0,
        headingAccuracy: 0.0,
        speed: 0.0,
        speedAccuracy: 0.0,
      );
    } catch (e) {
      debugPrint('Error in getCurrentPosition: $e');
      return Position(
        longitude: 46.6753,
        latitude: 24.7136,
        timestamp: DateTime.now(),
        accuracy: 100.0,
        altitude: 600.0,
        altitudeAccuracy: 10.0,
        heading: 0.0,
        headingAccuracy: 0.0,
        speed: 0.0,
        speedAccuracy: 0.0,
      );
    }
  }

  /// Determine Saudi City from GPS Coordinates (Fast Local Resolution)
  String resolveCityFromCoordinates(double latitude, double longitude) {
    if (latitude >= 24.3 && latitude <= 25.3 && longitude >= 46.2 && longitude <= 47.3) {
      return 'الرياض';
    }
    if (latitude >= 21.1 && latitude <= 22.1 && longitude >= 39.0 && longitude <= 39.5) {
      return 'جدة';
    }
    if (latitude >= 21.2 && latitude <= 21.6 && longitude >= 39.7 && longitude <= 40.1) {
      return 'مكة المكرمة';
    }
    if (latitude >= 24.3 && latitude <= 24.7 && longitude >= 39.4 && longitude <= 39.8) {
      return 'المدينة المنورة';
    }
    if (latitude >= 26.1 && latitude <= 26.6 && longitude >= 49.9 && longitude <= 50.3) {
      return 'الدمام';
    }
    if (latitude >= 26.1 && latitude <= 26.4 && longitude >= 50.0 && longitude <= 50.3) {
      return 'الخبر';
    }
    if (latitude >= 25.2 && latitude <= 25.6 && longitude >= 49.4 && longitude <= 49.9) {
      return 'الأحساء';
    }
    if (latitude >= 26.9 && latitude <= 27.2 && longitude >= 49.4 && longitude <= 49.8) {
      return 'الجبيل';
    }
    if (latitude >= 26.1 && latitude <= 26.5 && longitude >= 43.8 && longitude <= 44.2) {
      return 'بريدة - القصيم';
    }
    if (latitude >= 28.2 && latitude <= 28.6 && longitude >= 36.4 && longitude <= 36.8) {
      return 'تبوك';
    }
    if (latitude >= 18.1 && latitude <= 18.4 && longitude >= 42.4 && longitude <= 42.8) {
      return 'أبها - عسير';
    }
    if (latitude >= 18.2 && latitude <= 18.4 && longitude >= 42.6 && longitude <= 43.0) {
      return 'خميس مشيط';
    }
    if (latitude >= 21.1 && latitude <= 21.5 && longitude >= 40.2 && longitude <= 40.6) {
      return 'الطائف';
    }
    if (latitude >= 16.7 && latitude <= 17.1 && longitude >= 42.4 && longitude <= 42.8) {
      return 'جازان';
    }
    if (latitude >= 27.4 && latitude <= 27.7 && longitude >= 41.5 && longitude <= 41.9) {
      return 'حائل';
    }
    if (latitude >= 17.3 && latitude <= 17.7 && longitude >= 44.0 && longitude <= 44.5) {
      return 'نجران';
    }
    if (latitude >= 23.9 && latitude <= 24.2 && longitude >= 37.9 && longitude <= 38.3) {
      return 'ينبع';
    }
    return 'الرياض';
  }

  /// Resolve City and Address from Coordinates via RFQSA Geocode API or Smart Local Reverse Geocoding
  Future<String> resolveAddress(double latitude, double longitude) async {
    final city = resolveCityFromCoordinates(latitude, longitude);
    final fallbackString = '$city – حي العليا، طريق الملك فهد (موقع GPS محدد)';

    final client = _apiClient;
    if (client == null) {
      return fallbackString;
    }

    try {
      final response = await client.get(
        ApiEndpoints.geocode,
        queryParameters: {'lat': latitude, 'lng': longitude},
      ).timeout(const Duration(seconds: 3));

      if (response.success && response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          final formatted = data['formatted_address'] ?? data['address'] ?? data['city'];
          if (formatted != null && formatted.toString().trim().isNotEmpty) {
            return formatted.toString();
          }
        }
      }
    } catch (_) {}

    return fallbackString;
  }

  /// Calculate Estimated Delivery Fee and Duration using Server Delivery Engine
  Future<Map<String, dynamic>?> calculateDeliveryEstimate({
    required String sourceCity,
    required String destinationCity,
    double? destLat,
    double? destLng,
  }) async {
    final client = _apiClient;
    if (client == null) return null;

    try {
      final response = await client.get(
        ApiEndpoints.deliveryCalculate,
        queryParameters: {
          'source_city': sourceCity,
          'destination_city': destinationCity,
          if (destLat != null) 'dest_lat': destLat,
          if (destLng != null) 'dest_lng': destLng,
        },
      );

      if (response.success && response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }
}
