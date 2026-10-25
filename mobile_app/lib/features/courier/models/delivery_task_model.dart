import 'package:equatable/equatable.dart';
import 'package:rfqsa_mobile/core/utils/id_utils.dart';

/// Delivery Task Entity mapped 1:1 to `deliveries` table and Courier State Machine
class DeliveryTaskModel extends Equatable {
  final String id;
  final String orderId;
  final String? courierId;
  final String status; // ASSIGNED, EN_ROUTE_PICKUP, ARRIVED_PICKUP, PICKED_UP, EN_ROUTE_DELIVERY, ARRIVED_DELIVERY, DELIVERED, CANCELLED
  final String pickupLocation;
  final String? pickupCity;
  final String dropoffLocation;
  final String? dropoffCity;
  final String? dropoffDistrict;
  final String? vendorName;
  final String? vendorPhone;
  final String? customerName;
  final String? customerPhone;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final double deliveryFee;
  final String partsSummary;
  final List<Map<String, dynamic>> partsItems;
  final String? otpCode;
  final String? podUrl;
  final int deliveryDays;
  final String prepTimeText;
  final DateTime? expectedReadyAt;
  final String? vendorNotes;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const DeliveryTaskModel({
    required this.id,
    required this.orderId,
    this.courierId,
    required this.status,
    required this.pickupLocation,
    this.pickupCity,
    required this.dropoffLocation,
    this.dropoffCity,
    this.dropoffDistrict,
    this.vendorName,
    this.vendorPhone,
    this.customerName,
    this.customerPhone,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.deliveryFee = 35.0,
    this.partsSummary = 'قطع غيار صيانة دورية معتمدة',
    this.partsItems = const [],
    this.otpCode,
    this.podUrl,
    this.deliveryDays = 1,
    this.prepTimeText = 'خلال 24 ساعة (تجهيز فوري)',
    this.expectedReadyAt,
    this.vendorNotes,
    required this.createdAt,
    this.updatedAt,
  });

  factory DeliveryTaskModel.fromJson(Map<String, dynamic> json) {
    // Determine parts summary text
    String summary = json['parts_summary']?.toString() ?? '';
    if (summary.isEmpty && json['parts_items'] is List && (json['parts_items'] as List).isNotEmpty) {
      final items = json['parts_items'] as List;
      summary = items.whereType<Map>().map((i) {
        final name = i['name'] ?? i['part_name'] ?? 'قطعة';
        final qty = i['quantity'] ?? 1;
        return '$name ($qty)';
      }).join('، ');
    }
    if (summary.isEmpty) {
      summary = json['title']?.toString() ?? 'قطع غيار صيانة معتمدة';
    }

    // Parse parts items safely
    List<Map<String, dynamic>> itemsList = [];
    if (json['parts_items'] is List) {
      for (final item in (json['parts_items'] as List)) {
        if (item is Map) {
          try {
            itemsList.add(Map<String, dynamic>.from(item));
          } catch (_) {}
        }
      }
    }

    // Safe coordinates parsing
    double? pickupLat;
    double? pickupLng;
    if (json['pickup_coords'] is Map) {
      pickupLat = double.tryParse(json['pickup_coords']['lat']?.toString() ?? '');
      pickupLng = double.tryParse(json['pickup_coords']['lng']?.toString() ?? '');
    }
    pickupLat ??= (json['pickup_lat'] != null ? double.tryParse(json['pickup_lat'].toString()) : null) ?? 24.7136;
    pickupLng ??= (json['pickup_lng'] != null ? double.tryParse(json['pickup_lng'].toString()) : null) ?? 46.6753;

    double? dropoffLat;
    double? dropoffLng;
    if (json['dropoff_coords'] is Map) {
      dropoffLat = double.tryParse(json['dropoff_coords']['lat']?.toString() ?? '');
      dropoffLng = double.tryParse(json['dropoff_coords']['lng']?.toString() ?? '');
    }
    dropoffLat ??= (json['dropoff_lat'] != null ? double.tryParse(json['dropoff_lat'].toString()) : null) ?? 24.7236;
    dropoffLng ??= (json['dropoff_lng'] != null ? double.tryParse(json['dropoff_lng'].toString()) : null) ?? 46.6853;

    // Vendor and Client safe names & phones
    String? vName = json['vendor_name']?.toString();
    String? vPhone = json['vendor_phone']?.toString();
    if (json['vendor'] is Map) {
      vName ??= json['vendor']['company_name']?.toString() ?? json['vendor']['full_name']?.toString();
      vPhone ??= json['vendor']['phone']?.toString();
    }
    vName ??= 'مؤسسة قطع الغيار المعتمدة';
    vPhone ??= '0551122334';

    String? cName = json['client_name']?.toString() ?? json['customer_name']?.toString();
    String? cPhone = json['recipient_phone']?.toString() ??
        json['recipientPhone']?.toString() ??
        json['client_phone']?.toString() ??
        json['customer_phone']?.toString();
    if (json['client'] is Map) {
      cName ??= json['client']['company_name']?.toString() ?? json['client']['full_name']?.toString();
      cPhone ??= json['client']['phone']?.toString();
    }
    cName ??= 'أحمد العتيبي';
    cPhone ??= json['phone']?.toString() ?? '0501234567';

    return DeliveryTaskModel(
      id: json['id']?.toString() ?? '',
      orderId: json['order_id']?.toString() ?? json['orderId']?.toString() ?? 'ORD-5501',
      courierId: json['courier_id']?.toString(),
      status: (json['delivery_status']?.toString() ?? json['status']?.toString() ?? 'ASSIGNED').toUpperCase(),
      pickupLocation: json['pickup_address']?.toString() ?? json['pickup_location']?.toString() ?? 'موقع المورد - شارع الضباب، الرياض',
      pickupCity: json['pickup_city']?.toString() ?? 'الرياض',
      dropoffLocation: json['dropoff_address']?.toString() ?? json['dropoff_location']?.toString() ?? 'موقع العميل - حي الروضة، الرياض',
      dropoffCity: json['dropoff_city']?.toString() ?? 'الرياض',
      dropoffDistrict: json['dropoff_district']?.toString() ?? 'حي الروضة',
      vendorName: vName,
      vendorPhone: vPhone,
      customerName: cName,
      customerPhone: cPhone,
      pickupLat: pickupLat,
      pickupLng: pickupLng,
      dropoffLat: dropoffLat,
      dropoffLng: dropoffLng,
      deliveryFee: double.tryParse(json['delivery_fee_earned']?.toString() ?? json['delivery_fee']?.toString() ?? '35') ?? 35.0,
      partsSummary: summary,
      partsItems: itemsList,
      otpCode: json['otp_code']?.toString() ?? json['otp']?.toString(),
      podUrl: json['pod_photo_url']?.toString() ?? json['pod_url']?.toString(),
      deliveryDays: int.tryParse(json['delivery_days']?.toString() ?? '1') ?? 1,
      prepTimeText: json['prep_time_text']?.toString() ??
          (int.tryParse(json['delivery_days']?.toString() ?? '1') == 2
              ? 'خلال 48 ساعة (يومان)'
              : (int.tryParse(json['delivery_days']?.toString() ?? '1') != null && int.parse(json['delivery_days'].toString()) > 2
                  ? 'خلال ${json['delivery_days']} أيام عمل'
                  : 'خلال 24 ساعة (تجهيز فوري)')),
      expectedReadyAt: json['estimated_ready_at'] != null
          ? DateTime.tryParse(json['estimated_ready_at'].toString())
          : (json['expected_ready_at'] != null
              ? DateTime.tryParse(json['expected_ready_at'].toString())
              : null),
      vendorNotes: json['vendor_notes']?.toString() ?? json['notes']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at'].toString()) : null,
    );
  }

  String get shortId => IdUtils.safeShortId(id, prefix: 'DEL-');

  String get deliveryStatus => status;
  double get deliveryFeeEarned => deliveryFee;
  String get pickupAddress => pickupLocation;
  String get dropoffAddress => dropoffLocation;
  String get clientName => customerName ?? 'العميل المستلم';

  // Vendor Readiness & Timer Helpers
  bool get isReadyForPickup {
    if (isPickedUp || isEnRouteDelivery || isArrivedDelivery || isDelivered) return true;
    if (expectedReadyAt == null) return true;
    return DateTime.now().isAfter(expectedReadyAt!);
  }

  Duration get remainingPrepDuration {
    if (expectedReadyAt == null) return Duration.zero;
    final now = DateTime.now();
    if (now.isAfter(expectedReadyAt!)) return Duration.zero;
    return expectedReadyAt!.difference(now);
  }

  // Status helper properties matching DELIVERY_STATUS_META
  bool get isDelivered => status == 'DELIVERED';
  bool get isCancelled => status == 'CANCELLED';
  bool get isAssigned => status == 'ASSIGNED';
  bool get isEnRoutePickup => status == 'EN_ROUTE_PICKUP' || status == 'ACCEPTED';
  bool get isArrivedPickup => status == 'ARRIVED_PICKUP' || status == 'AT_PICKUP';
  bool get isPickedUp => status == 'PICKED_UP';
  bool get isEnRouteDelivery => status == 'EN_ROUTE_DELIVERY' || status == 'IN_TRANSIT';
  bool get isArrivedDelivery => status == 'ARRIVED_DELIVERY';

  bool get isPickupDelivery =>
      pickupLocation.contains('استلام من الفرع') ||
      dropoffLocation.contains('استلام من الفرع') ||
      dropoffLocation.contains('استلام من فرع') ||
      (deliveryFee == 0 && (dropoffLocation.contains('فرع') || pickupLocation.contains('فرع')));

  String get statusArabicLabel {
    switch (status) {
      case 'ASSIGNED':
        return 'بانتظار قبول المهمة';
      case 'EN_ROUTE_PICKUP':
      case 'ACCEPTED':
        return 'في الطريق للمورد';
      case 'ARRIVED_PICKUP':
      case 'AT_PICKUP':
        return 'وصل للمورد';
      case 'PICKED_UP':
        return 'تم استلام الشحنة';
      case 'EN_ROUTE_DELIVERY':
      case 'IN_TRANSIT':
        return 'جاري التوصيل للعميل';
      case 'ARRIVED_DELIVERY':
        return 'وصل لموقع العميل';
      case 'DELIVERED':
        return 'تم التسليم بنجاح ✓';
      case 'CANCELLED':
        return 'ملغية';
      default:
        return 'مُسند للمندوب';
    }
  }

  @override
  List<Object?> get props => [id, orderId, status, courierId, deliveryFee, podUrl];
}
