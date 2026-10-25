import 'package:equatable/equatable.dart';

/// Resolves standard default permissions for known enterprise roles when offline or fallback
List<String> getDefaultPermissionsForRole(String roleId) {
  switch (roleId) {
    case 'client_technician':
      return const ['rfqs:create', 'rfqs:view', 'orders:view'];
    case 'client_accountant':
      return const ['finance:view', 'finance:invoice', 'finance:payment', 'finance:export_reports', 'orders:view'];
    case 'client_rfq_supervisor':
      return const ['rfqs:view', 'rfqs:create', 'rfqs:update', 'quotes:view', 'orders:view'];
    case 'client_procurement_manager':
      return const ['rfqs:create', 'rfqs:view', 'rfqs:update', 'quotes:view', 'quotes:accept', 'quotes:reject', 'orders:view', 'fleet:manage'];
    case 'vendor_sales_agent':
      return const ['quotes:view_radar', 'quotes:create', 'quotes:update', 'orders:view', 'team:view', 'team:invite'];
    case 'vendor_warehouse_clerk':
      return const ['orders:view', 'orders:update_status', 'orders:dispatch'];
    case 'vendor_accountant':
      return const ['finance:view', 'finance:invoice', 'finance:export_reports', 'orders:view'];
    default:
      return const [];
  }
}

/// Resolves human-friendly Arabic title for role
String getRoleDisplayTitle(String? roleId, String? explicitName) {
  if (explicitName != null && explicitName.trim().isNotEmpty) {
    return explicitName.trim();
  }
  switch (roleId) {
    case 'client_owner':
      return 'المالك / المدير العام';
    case 'client_procurement_manager':
      return 'مدير المشتريات';
    case 'client_rfq_supervisor':
      return 'مراقب طلبات التسعير والنشاط';
    case 'client_accountant':
      return 'محاسب المنشأة';
    case 'client_technician':
      return 'فني الورشة / طالب القطع';
    case 'vendor_owner':
      return 'مالك المتجر / شريك مفوض';
    case 'vendor_sales_agent':
      return 'مسؤول التسعير والمبيعات';
    case 'vendor_warehouse_clerk':
      return 'أمين المستودع والتجهيز';
    case 'vendor_accountant':
      return 'محاسب المبيعات والفواتير';
    case 'courier_driver':
      return 'مندوب التوصيل المعتمد';
    case 'platform_super_admin':
      return 'المدير العام للمنصة';
    default:
      return 'عضو فريق العمل';
  }
}

/// Authoritative User Model received from RFQSA Backend
class UserModel extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? companyName;
  final String role; // client, vendor, courier, admin
  final String? roleId; // client_owner, vendor_owner, courier_driver, platform_super_admin, client_technician, etc.
  final String? phone;
  final String? refCode;
  final String? city;
  final List<String> specializedBrands;
  final bool specializesInAllBrands;
  final double? latitude;
  final double? longitude;
  final bool isActive;

  // ── Authoritative RBAC & Permission Fields ──
  final List<String> permissions;
  final bool isOwner;
  final bool isSuperAdmin;
  final String? roleNameAr;
  final String? organizationId;
  final String? memberId;

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
    this.permissions = const [],
    this.isOwner = false,
    this.isSuperAdmin = false,
    this.roleNameAr,
    this.organizationId,
    this.memberId,
  });

  /// Check if user has specific permission with automatic Owner / SuperAdmin bypass
  bool hasPermission(String perm) {
    if (isOwner || isSuperAdmin || role == 'admin') return true;
    if (roleId == 'client_owner' || roleId == 'vendor_owner' || roleId == 'platform_super_admin') return true;
    return permissions.contains(perm);
  }

  /// Check if user has ANY of the given permissions
  bool hasAnyPermission(List<String> perms) {
    if (isOwner || isSuperAdmin || role == 'admin') return true;
    if (roleId == 'client_owner' || roleId == 'vendor_owner' || roleId == 'platform_super_admin') return true;
    return perms.any((p) => permissions.contains(p));
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    List<String> brands = [];
    if (json['specialized_brands'] is List) {
      brands = (json['specialized_brands'] as List).map((e) => e.toString()).toList();
    } else if (json['specializedBrands'] is List) {
      brands = (json['specializedBrands'] as List).map((e) => e.toString()).toList();
    }

    final r = (json['role']?.toString() ?? 'client').toLowerCase();
    final rId = json['roleId']?.toString() ?? json['role_id']?.toString();

    // Permissions parsing
    List<String> perms = [];
    if (json['permissions'] is List) {
      perms = (json['permissions'] as List).map((e) => e.toString()).toList();
    } else if (json['permissions'] is Set) {
      perms = (json['permissions'] as Set).map((e) => e.toString()).toList();
    }

    final isSuper = json['isSuperAdmin'] == true ||
        json['is_super_admin'] == true ||
        r == 'admin' ||
        rId == 'platform_super_admin';

    final isOwn = json['isOwner'] == true ||
        json['is_owner'] == true ||
        rId == 'client_owner' ||
        rId == 'vendor_owner' ||
        (perms.isEmpty && (json['id'] == 'client-demo-id' || json['id'] == 'vendor-demo-id'));

    // Populate fallback permissions if empty and user is an employee
    if (perms.isEmpty && !isOwn && !isSuper && rId != null) {
      perms = getDefaultPermissionsForRole(rId);
    }

    final roleAr = json['roleNameAr']?.toString() ??
        json['role_name_ar']?.toString() ??
        getRoleDisplayTitle(rId, null);

    return UserModel(
      id: json['id']?.toString() ?? json['userId']?.toString() ?? json['user_id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['full_name']?.toString() ?? json['company_name']?.toString() ?? 'مستخدم رفق',
      companyName: json['companyName']?.toString() ?? json['company_name']?.toString(),
      role: r,
      roleId: rId,
      phone: json['phone']?.toString(),
      refCode: json['refCode']?.toString() ?? json['ref_code']?.toString(),
      city: json['city']?.toString() ?? 'الرياض',
      specializedBrands: brands,
      specializesInAllBrands: json['specializes_in_all_brands'] == true || json['specializesInAllBrands'] == true,
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      isActive: json['is_active'] != false,
      permissions: perms,
      isOwner: isOwn,
      isSuperAdmin: isSuper,
      roleNameAr: roleAr,
      organizationId: json['organizationId']?.toString() ?? json['organization_id']?.toString(),
      memberId: json['memberId']?.toString() ?? json['member_id']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': id,
      'email': email,
      'fullName': fullName,
      'companyName': companyName,
      'role': role,
      'roleId': roleId,
      'role_id': roleId,
      'phone': phone,
      'refCode': refCode,
      'city': city,
      'specialized_brands': specializedBrands,
      'specializes_in_all_brands': specializesInAllBrands,
      'latitude': latitude,
      'longitude': longitude,
      'is_active': isActive,
      'permissions': permissions,
      'isOwner': isOwner,
      'isSuperAdmin': isSuperAdmin,
      'roleNameAr': roleNameAr,
      'organizationId': organizationId,
      'memberId': memberId,
    };
  }

  UserModel copyWith({
    String? role,
    String? roleId,
    List<String>? specializedBrands,
    bool? specializesInAllBrands,
    List<String>? permissions,
    bool? isOwner,
    bool? isSuperAdmin,
    String? roleNameAr,
    String? organizationId,
    String? memberId,
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
      permissions: permissions ?? this.permissions,
      isOwner: isOwner ?? this.isOwner,
      isSuperAdmin: isSuperAdmin ?? this.isSuperAdmin,
      roleNameAr: roleNameAr ?? this.roleNameAr,
      organizationId: organizationId ?? this.organizationId,
      memberId: memberId ?? this.memberId,
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
        permissions,
        isOwner,
        isSuperAdmin,
        roleNameAr,
        organizationId,
        memberId,
      ];
}
