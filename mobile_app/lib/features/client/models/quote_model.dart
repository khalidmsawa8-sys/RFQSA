import 'package:equatable/equatable.dart';

/// Quote Model mapped to `quotes` table
class QuoteModel extends Equatable {
  final String id;
  final String rfqId;
  final String vendorId;
  final double totalPrice;
  final int deliveryDays;
  final double deliveryCost;
  final String? notes;
  final String status; // pending, accepted, rejected
  final String? vendorName;
  final String? vendorPhone;
  final String? vendorCity;
  final List<dynamic> items;
  final DateTime createdAt;

  const QuoteModel({
    required this.id,
    required this.rfqId,
    required this.vendorId,
    required this.totalPrice,
    this.deliveryDays = 1,
    this.deliveryCost = 0.0,
    this.notes,
    required this.status,
    this.vendorName,
    this.vendorPhone,
    this.vendorCity,
    this.items = const [],
    required this.createdAt,
  });

  factory QuoteModel.fromJson(Map<String, dynamic> json) {
    return QuoteModel(
      id: json['id']?.toString() ?? '',
      rfqId: json['rfq_id']?.toString() ?? '',
      vendorId: json['vendor_id']?.toString() ?? '',
      totalPrice: double.tryParse(json['total_price']?.toString() ?? '0') ?? 0.0,
      deliveryDays: int.tryParse(json['delivery_days']?.toString() ?? '1') ?? 1,
      deliveryCost: double.tryParse((json['delivery_cost'] ?? json['delivery_fee'])?.toString() ?? '0') ?? 0.0,
      notes: json['notes']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      vendorName: json['profiles']?['full_name'] ?? json['profiles']?['company_name'] ?? json['vendor']?['full_name'] ?? 'مؤسسة قطع غيار معتمدة',
      vendorPhone: json['profiles']?['phone'] ?? json['vendor']?['phone'],
      vendorCity: json['profiles']?['city'] ?? 'الرياض',
      items: json['items'] is List ? json['items'] as List : [],
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [id, rfqId, vendorId, totalPrice, status];
}
