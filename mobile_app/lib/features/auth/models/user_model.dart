import 'package:equatable/equatable.dart';

/// Authoritative User Model received from RFQSA Backend
class UserModel extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? companyName;
  final String role; // client, vendor, courier, admin
  final String? roleId; // client_owner, vendor_owner, courier_driver, platform_super_admin
  final String? phone;
  final String? refCode;
  final String? city;
  final List<String> specializedBrands;
  final bool specializesInAllBrands;
  final double? latitude;
  final double? longitude;
  final bool isActive;

  const UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.companyName,
    required this.role,
    this.roleId,
    this.phone,
    this.refCode,
    this.city,
    this.specializedBrands = const [],
    this.specializesInAllBrands = false,
    this.latitude,
    this.longitude,
    this.isActive = true,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    List<String> brands = [];
    if (json['specialized_brands'] is List) {
      brands = (json['specialized_brands'] as List).map((e) => e.toString()).toList();
    } else if (json['specializedBrands'] is List) {
      brands = (json['specializedBrands'] as List).map((e) => e.toString()).toList();
    }

    return UserModel(
      id: json['id']?.toString() ?? json['userId']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['full_name']?.toString() ?? json['company_name']?.toString() ?? 'مستخدم رفق',
      companyName: json['companyName']?.toString() ?? json['company_name']?.toString(),
      role: (json['role']?.toString() ?? 'client').toLowerCase(),
      roleId: json['roleId']?.toString() ?? json['role_id']?.toString(),
      phone: json['phone']?.toString(),
      refCode: json['refCode']?.toString() ?? json['ref_code']?.toString(),
      city: json['city']?.toString() ?? 'الرياض',
      specializedBrands: brands,
      specializesInAllBrands: json['specializes_in_all_brands'] == true || json['specializesInAllBrands'] == true,
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      isActive: json['is_active'] != false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'companyName': companyName,
      'role': role,
      'roleId': roleId,
      'phone': phone,
      'refCode': refCode,
      'city': city,
      'specialized_brands': specializedBrands,
      'specializes_in_all_brands': specializesInAllBrands,
      'latitude': latitude,
      'longitude': longitude,
      'is_active': isActive,
    };
  }

  UserModel copyWith({
    String? role,
    String? roleId,
    List<String>? specializedBrands,
    bool? specializesInAllBrands,
  }) {
    return UserModel(
      id: id,
      email: email,
      fullName: fullName,
      companyName: companyName,
      role: role ?? this.role,
      roleId: roleId ?? this.roleId,
      phone: phone,
      refCode: refCode,
      city: city,
      specializedBrands: specializedBrands ?? this.specializedBrands,
      specializesInAllBrands: specializesInAllBrands ?? this.specializesInAllBrands,
      latitude: latitude,
      longitude: longitude,
      isActive: isActive,
    );
  }

  @override
  List<Object?> get props => [
        id,
        email,
        fullName,
        role,
        roleId,
        refCode,
        specializedBrands,
        specializesInAllBrands,
      ];
}
