import 'package:equatable/equatable.dart';

/// Vehicle Model mapped to backend `client_vehicles` table
class VehicleModel extends Equatable {
  final String id;
  final String userId;
  final String brandName;
  final String modelName;
  final int year;
  final String? trim;
  final String? vin;
  final String plateNumber;
  final String color;
  final bool isDefault;
  final bool isFavorite;
  final String? notes;

  const VehicleModel({
    required this.id,
    required this.userId,
    required this.brandName,
    required this.modelName,
    required this.year,
    this.trim,
    this.vin,
    required this.plateNumber,
    this.color = 'أبيض',
    this.isDefault = false,
    this.isFavorite = false,
    this.notes,
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? json['userId']?.toString() ?? '',
      brandName: json['brand_name']?.toString() ?? json['brandName']?.toString() ?? '',
      modelName: json['model_name']?.toString() ?? json['modelName']?.toString() ?? '',
      year: int.tryParse(json['year']?.toString() ?? '2023') ?? 2023,
      trim: json['trim']?.toString(),
      vin: json['vin']?.toString(),
      plateNumber: json['plate_number']?.toString() ?? json['plateNumber']?.toString() ?? '',
      color: json['color']?.toString() ?? 'أبيض',
      isDefault: json['is_default'] == true || json['isDefault'] == true,
      isFavorite: json['is_favorite'] == true || json['isFavorite'] == true,
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'brand_name': brandName,
      'model_name': modelName,
      'year': year,
      'trim': trim,
      'vin': vin,
      'plate_number': plateNumber,
      'color': color,
      'is_default': isDefault,
      'is_favorite': isFavorite,
      'notes': notes,
    };
  }

  String get displayName => '$brandName $modelName $year';

  @override
  List<Object?> get props => [id, brandName, modelName, year, plateNumber, vin, isDefault];
}
