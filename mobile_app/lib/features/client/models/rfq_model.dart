import 'dart:convert';
import 'package:equatable/equatable.dart';
import 'package:rfqsa_mobile/core/utils/id_utils.dart';
import 'package:rfqsa_mobile/features/client/models/quote_model.dart';

/// RFQ Item Detail Model
class RfqItemModel extends Equatable {
  final String partName;
  final int quantity;
  final String partType; // original, commercial, both
  final String? partNumber;
  final String? notes;
  final List<String> images;
  final String? voiceNoteUrl;
  final String? commercialBrand;

  const RfqItemModel({
    required this.partName,
    this.quantity = 1,
    this.partType = 'original',
    this.partNumber,
    this.notes,
    this.images = const [],
    this.voiceNoteUrl,
    this.commercialBrand,
  });

  factory RfqItemModel.fromJson(Map<String, dynamic> json) {
    List<String> imgList = [];
    if (json['images'] is List) {
      imgList = (json['images'] as List).map((e) => e.toString()).toList();
    } else if (json['image_url'] != null) {
      imgList = [json['image_url'].toString()];
    } else if (json['imageUrl'] != null) {
      imgList = [json['imageUrl'].toString()];
    } else if (json['imagePathname'] != null) {
      imgList = [json['imagePathname'].toString()];
    } else if (json['imagePreview'] != null) {
      imgList = [json['imagePreview'].toString()];
    }

    return RfqItemModel(
      partName: json['partName']?.toString() ??
          json['name']?.toString() ??
          json['part_name']?.toString() ??
          'قطعة غيار معتمدة',
      quantity: int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      partType: json['partType']?.toString() ?? json['part_type']?.toString() ?? 'original',
      partNumber: json['partNumber']?.toString() ?? json['part_number']?.toString(),
      notes: json['notes']?.toString(),
      images: imgList,
      voiceNoteUrl: json['voiceNoteUrl']?.toString() ?? json['voice_note_url']?.toString(),
      commercialBrand: json['commercialBrand']?.toString() ?? json['commercial_brand']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'partName': partName,
      'name': partName,
      'quantity': quantity,
      'partType': partType,
      'part_type': partType,
      'partNumber': partNumber,
      'part_number': partNumber,
      'notes': notes,
      'images': images,
      'voiceNoteUrl': voiceNoteUrl,
      'commercialBrand': commercialBrand,
    };
  }

  String get name => partName;

  @override
  List<Object?> get props => [partName, quantity, partType, partNumber, images];
}

class _VehicleAdapter {
  final String brand;
  final String model;
  final int year;
  final String? plateNumber;
  final String? vin;
  const _VehicleAdapter(this.brand, this.model, this.year, this.plateNumber, this.vin);
}

/// RFQ Master Entity mapped to `rfqs` table
class RfqModel extends Equatable {
  final String id;
  final String clientId;
  final String carMake;
  final String carModel;
  final int carYear;
  final String? plateNumber;
  final String? vin;
  final List<RfqItemModel> items;
  final String deliveryLocation;
  final String deliveryCity;
  final String? deliveryDistrict;
  final double? deliveryLatitude;
  final double? deliveryLongitude;
  final String status; // open, quoted, accepted, closed, cancelled
  final String? clientName;
  final String? clientPhone;
  final String? rfqType;
  final String? targetVendorId;
  final String? targetVendorName;
  final String? deliveryMethod;
  final String? fulfillmentMethod;
  final String? partsCategory;
  final String? partsCategoryName;
  final int quotesCount;
  final List<QuoteModel>? quotes;
  final DateTime createdAt;
  final DateTime? expiresAt;

  const RfqModel({
    required this.id,
    required this.clientId,
    required this.carMake,
    required this.carModel,
    required this.carYear,
    this.plateNumber,
    this.vin,
    required this.items,
    required this.deliveryLocation,
    required this.deliveryCity,
    this.deliveryDistrict,
    this.deliveryLatitude,
    this.deliveryLongitude,
    required this.status,
    this.clientName,
    this.clientPhone,
    this.rfqType,
    this.targetVendorId,
    this.targetVendorName,
    this.deliveryMethod,
    this.fulfillmentMethod,
    this.partsCategory,
    this.partsCategoryName,
    this.quotesCount = 0,
    this.quotes,
    required this.createdAt,
    this.expiresAt,
  });

  factory RfqModel.fromJson(Map<String, dynamic> json) {
    List<RfqItemModel> parsedItems = [];
    final rawDesc = json['parts_description'] ?? json['partsList'] ?? json['parts'];

    if (rawDesc is List) {
      parsedItems = rawDesc.map((e) => RfqItemModel.fromJson(e as Map<String, dynamic>)).toList();
    } else if (rawDesc is String && rawDesc.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawDesc);
        if (decoded is List) {
          parsedItems = decoded.map((e) => RfqItemModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (decoded is Map<String, dynamic>) {
          parsedItems = [RfqItemModel.fromJson(decoded)];
        }
      } catch (_) {
        parsedItems = [RfqItemModel(partName: rawDesc)];
      }
    }

    String? parsedRfqType = json['rfq_type']?.toString() ?? json['rfqType']?.toString();
    String? parsedTargetVendorId = json['target_vendor_id']?.toString() ?? json['targetVendorId']?.toString() ?? json['selectedVendorId']?.toString();
    String? parsedTargetVendorName = json['target_vendor_name']?.toString() ?? json['targetVendorName']?.toString() ?? json['selectedVendorName']?.toString();

    if (rawDesc is String && rawDesc.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawDesc);
        if (decoded is List && decoded.isNotEmpty && decoded[0] is Map) {
          final first = decoded[0] as Map<String, dynamic>;
          parsedRfqType ??= first['rfqType']?.toString() ?? first['rfq_type']?.toString();
          parsedTargetVendorId ??= first['targetVendorId']?.toString() ?? first['target_vendor_id']?.toString();
          parsedTargetVendorName ??= first['targetVendorName']?.toString() ?? first['target_vendor_name']?.toString();
        }
      } catch (_) {}
    } else if (rawDesc is List && rawDesc.isNotEmpty && rawDesc[0] is Map) {
      final first = rawDesc[0] as Map<String, dynamic>;
      parsedRfqType ??= first['rfqType']?.toString() ?? first['rfq_type']?.toString();
      parsedTargetVendorId ??= first['targetVendorId']?.toString() ?? first['target_vendor_id']?.toString();
      parsedTargetVendorName ??= first['targetVendorName']?.toString() ?? first['target_vendor_name']?.toString();
    }

    parsedRfqType ??= (parsedTargetVendorId != null && parsedTargetVendorId.isNotEmpty) ? 'private' : 'public';

    int qCount = 0;
    List<QuoteModel> parsedQuotes = [];
    if (json['quotes'] is List) {
      parsedQuotes = (json['quotes'] as List).map((e) => QuoteModel.fromJson(e as Map<String, dynamic>)).toList();
      qCount = parsedQuotes.length;
    } else if (json['quotes_count'] != null) {
      qCount = int.tryParse(json['quotes_count'].toString()) ?? 0;
    }

    final clientInfo = json['profiles'] ?? json['client'] ?? {};
    final cName = clientInfo['company_name'] ?? clientInfo['full_name'] ?? json['client_name'] ?? json['recipient_name'];
    final cPhone = clientInfo['phone'] ?? json['client_phone'] ?? json['recipient_phone'];

    return RfqModel(
      id: json['id']?.toString() ?? '',
      clientId: json['client_id']?.toString() ?? json['clientId']?.toString() ?? '',
      carMake: json['car_make']?.toString() ?? json['carMake']?.toString() ?? '',
      carModel: json['car_model']?.toString() ?? json['carModel']?.toString() ?? '',
      carYear: int.tryParse(json['car_year']?.toString() ?? json['carYear']?.toString() ?? '2023') ?? 2023,
      plateNumber: json['plate_number']?.toString() ?? json['plateNumber']?.toString(),
      vin: json['vin']?.toString(),
      items: parsedItems,
      deliveryLocation: json['delivery_location']?.toString() ?? json['deliveryLocation']?.toString() ?? 'الرياض',
      deliveryCity: json['delivery_city']?.toString() ?? json['deliveryCity']?.toString() ?? 'الرياض',
      deliveryDistrict: json['delivery_district']?.toString() ?? json['deliveryDistrict']?.toString(),
      deliveryLatitude: json['delivery_latitude'] != null ? double.tryParse(json['delivery_latitude'].toString()) : null,
      deliveryLongitude: json['delivery_longitude'] != null ? double.tryParse(json['delivery_longitude'].toString()) : null,
      status: json['status']?.toString() ?? 'open',
      clientName: cName?.toString(),
      clientPhone: cPhone?.toString(),
      rfqType: parsedRfqType,
      targetVendorId: parsedTargetVendorId,
      targetVendorName: parsedTargetVendorName,
      deliveryMethod: json['delivery_method']?.toString() ?? json['deliveryMethod']?.toString(),
      fulfillmentMethod: json['fulfillment_method']?.toString() ?? json['fulfillmentMethod']?.toString(),
      partsCategory: json['parts_category']?.toString() ?? json['partsCategory']?.toString(),
      partsCategoryName: json['parts_category_name']?.toString() ?? json['partsCategoryName']?.toString(),
      quotesCount: qCount,
      quotes: parsedQuotes.isNotEmpty ? parsedQuotes : null,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
      expiresAt: json['expires_at'] != null ? DateTime.tryParse(json['expires_at'].toString()) : null,
    );
  }

  factory RfqModel.fromOrderJson(Map<String, dynamic> o) {
    final rfq = o['rfqs'] ?? o['rfq'] ?? {};
    final client = o['client'] ?? o['profiles'] ?? {};
    final rawDesc = rfq['parts_description'] ?? o['parts_description'] ?? o['order_items'];

    List<RfqItemModel> items = [];
    if (rawDesc is List) {
      items = rawDesc.map((e) => RfqItemModel.fromJson(e is Map<String, dynamic> ? e : {})).toList();
    } else if (rawDesc is String && rawDesc.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawDesc);
        if (decoded is List) {
          items = decoded.map((e) => RfqItemModel.fromJson(e is Map<String, dynamic> ? e : {})).toList();
        }
      } catch (_) {}
    }
    if (items.isEmpty) {
      items = [
        RfqItemModel(
          partName: rfq['car_make'] != null ? 'قطع غيار صيانة معتمدة لـ ${rfq['car_make']} ${rfq['car_model'] ?? ""}' : 'قطع غيار أمر شراء معتمد',
          quantity: 1,
        ),
      ];
    }

    return RfqModel(
      id: o['id']?.toString() ?? rfq['id']?.toString() ?? '',
      clientId: o['client_id']?.toString() ?? '',
      carMake: rfq['car_make']?.toString() ?? 'تويوتا',
      carModel: rfq['car_model']?.toString() ?? 'كامري',
      carYear: int.tryParse(rfq['car_year']?.toString() ?? '2023') ?? 2023,
      plateNumber: rfq['plate_number']?.toString() ?? '—',
      vin: rfq['vin']?.toString() ?? '—',
      items: items,
      deliveryLocation: rfq['delivery_location']?.toString() ?? o['delivery_address']?.toString() ?? 'الرياض',
      deliveryCity: rfq['delivery_city']?.toString() ?? o['delivery_city']?.toString() ?? 'الرياض',
      status: o['status']?.toString() ?? 'preparing',
      clientName: client['company_name'] ?? client['full_name'] ?? 'شركة المشتريات الوطنية',
      clientPhone: client['phone']?.toString() ?? '0501234567',
      rfqType: 'private',
      createdAt: o['created_at'] != null ? DateTime.tryParse(o['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }

  String get shortId => IdUtils.safeShortId(id, prefix: 'RFQ-');

  List<RfqItemModel> get parts => items;
  String get partsDescription => items.isNotEmpty ? items.map((i) => i.partName).join(' + ') : 'قطع غيار متنوعة';
  _VehicleAdapter get vehicle => _VehicleAdapter(carMake, carModel, carYear, plateNumber, vin);

  bool get isExpired {
    if (status == 'closed' || status == 'cancelled' || status == 'expired') return true;
    if (expiresAt != null) {
      return DateTime.now().isAfter(expiresAt!);
    }
    return DateTime.now().difference(createdAt).inMinutes >= 20;
  }

  @override
  List<Object?> get props => [id, carMake, carModel, carYear, status, quotesCount];
}
