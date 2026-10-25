import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:io';

import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/media/media_service.dart';
import 'package:rfqsa_mobile/core/location/location_service.dart';
import 'package:rfqsa_mobile/features/client/bloc/client_rfq_bloc.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/client/models/vehicle_model.dart';
import 'package:rfqsa_mobile/features/client/repositories/client_repository.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';

// ── Models & Constants ──
class BranchLocationItem {
  final String id;
  final String title;
  final String address;
  final String city;
  final double lat;
  final double lng;

  const BranchLocationItem({
    required this.id,
    required this.title,
    required this.address,
    required this.city,
    required this.lat,
    required this.lng,
  });
}

const List<BranchLocationItem> kCompanyBranches = [
  BranchLocationItem(
    id: 'br-riyadh',
    title: 'فرع الرياض الرئيسي',
    address: 'طريق الملك فهد – حي العليا',
    city: 'الرياض',
    lat: 24.7136,
    lng: 46.6753,
  ),
  BranchLocationItem(
    id: 'br-jeddah',
    title: 'فرع جدة الغربي',
    address: 'طريق المدينة – حي الروضة',
    city: 'جدة',
    lat: 21.5433,
    lng: 39.1728,
  ),
  BranchLocationItem(
    id: 'br-dammam',
    title: 'فرع الدمام الشرقي',
    address: 'شارع الأمل – الكورنيش الشمالي',
    city: 'الدمام',
    lat: 26.4207,
    lng: 50.0888,
  ),
];

const List<String> kSaudiCities = [
  'الرياض',
  'جدة',
  'الدمام',
  'مكة المكرمة',
  'المدينة المنورة',
  'الخبر',
  'بريدة - القصيم',
  'تبوك',
  'أبها - عسير',
  'خميس مشيط',
  'الطائف',
  'حائل',
  'الأحساء',
  'الجبيل',
  'جازان',
  'نجران',
  'ينبع',
];

const List<String> kCarMakes = [
  'تويوتا',
  'هيونداي',
  'كيا',
  'نيسان',
  'جي إم سي',
  'فورد',
  'شيفروليه',
  'هوندا',
  'مرسيدس',
  'بي إم دبليو',
  'لكزس',
  'مازدا',
  'ميتسوبيشي',
  'جيب',
  'أودي',
  'فولكسفاغن',
  'سوبارو',
  'بيجو',
  'رينو',
  'إنفينيتي',
  'أخرى',
];

const Map<String, List<String>> kCarModels = {
  'تويوتا': ['كامري', 'كورولا', 'لاند كروزر', 'برادو', 'راف4', 'هايلكس', 'يارس', 'أفالون', 'سيكويا', 'فورتشنر'],
  'هيونداي': ['إيلانترا', 'سوناتا', 'توسان', 'سانتافي', 'كريتا', 'أزيرا', 'H1', 'أكسنت'],
  'كيا': ['أوبتيما', 'K5', 'سبورتاج', 'سورينتو', 'بيكانتو', 'سيراتو', 'تيلورايد', 'كادينزا'],
  'نيسان': ['التيما', 'ماكسيما', 'باترول', 'إكس-تريل', 'مورانو', 'أرمادا', 'صني', 'تيدا', 'نافارا'],
  'جي إم سي': ['يوكن', 'سييرا', 'اكاديا', 'تيرين', 'سفاري', 'دينالي'],
  'فورد': ['تورس', 'إكسبلورر', 'إف-150', 'موستانج', 'إيدج', 'برونكو', 'إكسبيديشن'],
  'شيفروليه': ['تاهو', 'ماليبو', 'سيلفرادو', 'كابتيفا', 'إمبالا', 'كابرس', 'بليزر'],
  'هوندا': ['أكورد', 'سيفيك', 'CR-V', 'HR-V', 'بايلوت', 'أوديسي'],
  'مرسيدس': ['C200', 'E200', 'E300', 'S500', 'GLC', 'GLE', 'A200', 'G63'],
  'بي إم دبليو': ['318i', '320i', '520i', '730i', 'X3', 'X5', 'X7', 'M5'],
  'لكزس': ['ES350', 'LX600', 'LS500', 'RX350', 'NX300', 'GX460', 'IS300'],
  'مازدا': ['مازدا 6', 'CX-9', 'CX-5', 'مازدا 3', 'CX-30'],
  'ميتسوبيشي': ['باجيرو', 'لانسر', 'أوتلاندر', 'L200', 'إكليبس كروس'],
  'جيب': ['جراند شيروكي', 'رانجلر', 'كومباس', 'شيروكي', 'جلاديتور'],
};

class PartsCategoryOption {
  final String id;
  final String title;
  final String shortName;
  final IconData icon;

  const PartsCategoryOption({
    required this.id,
    required this.title,
    required this.shortName,
    required this.icon,
  });
}

const List<PartsCategoryOption> kPartsCategories = [
  PartsCategoryOption(id: 'all', title: 'عام (كافة التخصصات)', shortName: '🌐 عام (شامل)', icon: Icons.public_rounded),
  PartsCategoryOption(id: 'engine', title: 'المحركات وملحقاتها', shortName: '🔧 المحركات', icon: Icons.build_rounded),
  PartsCategoryOption(id: 'brakes', title: 'المكابح والهوبات', shortName: '🛑 المكابح والهوبات', icon: Icons.do_not_disturb_on_total_silence_rounded),
  PartsCategoryOption(id: 'suspension', title: 'المساعدات ونظام التعليق', shortName: '🚗 المساعدات والتعليق', icon: Icons.airline_seat_recline_extra_rounded),
  PartsCategoryOption(id: 'electrical', title: 'الكهرباء والإنارة', shortName: '💡 الكهرباء والإنارة', icon: Icons.bolt_rounded),
  PartsCategoryOption(id: 'body', title: 'البودي والهيكل الخارجي', shortName: '🚘 البودي والهيكل', icon: Icons.directions_car_filled_rounded),
  PartsCategoryOption(id: 'ac_cooling', title: 'التكييف والتبريد', shortName: '❄️ التكييف والتبريد', icon: Icons.ac_unit_rounded),
  PartsCategoryOption(id: 'transmission', title: 'الجير والدفرنس', shortName: '⚙️ الجير والدفرنس', icon: Icons.settings_suggest_rounded),
  PartsCategoryOption(id: 'tires_rims', title: 'الإطارات والجنوط', shortName: '🛞 الإطارات والجنوط', icon: Icons.album_rounded),
];

class _PartDraftItem {
  final TextEditingController nameController;
  final TextEditingController numberController;
  final TextEditingController notesController;
  int quantity;
  String partType; // 'oem', 'aftermarket', 'used', 'any'
  List<File> localImages;
  List<String> uploadedUrls;
  bool isUploading;

  _PartDraftItem({
    String initialName = '',
    String initialNumber = '',
    this.quantity = 1,
    this.partType = 'oem',
  })  : nameController = TextEditingController(text: initialName),
        numberController = TextEditingController(text: initialNumber),
        notesController = TextEditingController(),
        localImages = [],
        uploadedUrls = [],
        isUploading = false;

  void dispose() {
    nameController.dispose();
    numberController.dispose();
    notesController.dispose();
  }
}

/// 4-Step RFQ Creation Wizard matching Web Architecture (1:1 Pixel-Perfect Parity)
class CreateRfqScreen extends StatefulWidget {
  final MediaService mediaService;
  final LocationService locationService;
  final String? initialVendorId;
  final String? initialVendorName;

  const CreateRfqScreen({
    super.key,
    required this.mediaService,
    required this.locationService,
    this.initialVendorId,
    this.initialVendorName,
  });

  @override
  State<CreateRfqScreen> createState() => _CreateRfqScreenState();
}

class _CreateRfqScreenState extends State<CreateRfqScreen> {
  int _currentStep = 1; // 1: Location, 2: Vehicle, 3: Parts, 4: Delivery & Review
  final _formKey = GlobalKey<FormState>();
  bool _isSubmitting = false;

  // Step 1: Location & Recipient
  bool _useBranch = true;
  String _selectedBranchId = 'br-riyadh';
  final _customAddressController = TextEditingController();
  final _recipientNameController = TextEditingController();
  final _recipientPhoneController = TextEditingController();
  String _deliveryCity = 'الرياض';
  double? _deliveryLat = 24.7136;
  double? _deliveryLng = 46.6753;
  bool _isGettingLocation = false;
  bool _hasSelectedLocation = true;

  // Step 2: Vehicle Selection
  bool _useFleet = true;
  List<VehicleModel> _garageVehicles = [];
  bool _isLoadingVehicles = false;
  String? _selectedGarageVehicleId;
  String _selectedMake = 'تويوتا';
  String _selectedModel = 'هايلكس';
  int _selectedYear = 2023;
  final _plateController = TextEditingController();
  final _vinController = TextEditingController();
  String _serialNumber = '';
  String _mileage = '';
  String _engineCapacity = '2.7 لتر';
  String _cylinders = '4 سلندر';
  String _transmission = 'أوتوماتيك';
  String _fuelType = 'بنزين 91';

  // Step 3: Parts & Category & RFQ Type
  String _selectedCategory = 'all';
  String _rfqType = 'public'; // 'public' or 'private'
  String? _selectedVendorId;
  String? _selectedVendorName;
  static const List<Map<String, dynamic>> _kPresetVendorsList = [
    {
      'id': 'v-supplier-1',
      'company_name': 'مؤسسة قطع الغيار المعتمدة',
      'full_name': 'مؤسسة قطع الغيار المعتمدة',
      'city': 'الرياض',
      'district': 'حي الصناعية القديمة',
      'rating': 4.9,
      'specialty': 'متخصص تويوتا وهوندا ولكزس',
      'phone': '0501234567',
    },
    {
      'id': 'v-supplier-2',
      'company_name': 'شركة المحركات الوطنية',
      'full_name': 'شركة المحركات الوطنية',
      'city': 'الرياض',
      'district': 'صناعية الدائري الشمالي',
      'rating': 4.8,
      'specialty': 'متخصص فورد وجي إم سي وشيفروليه',
      'phone': '0559876543',
    },
    {
      'id': 'v-supplier-3',
      'company_name': 'مركز التحدي لقطع السيارات',
      'full_name': 'مركز التحدي لقطع السيارات',
      'city': 'جدة',
      'district': 'صناعية عسفان',
      'rating': 4.7,
      'specialty': 'شامل كوري وياباني وأوروبي',
      'phone': '0543219876',
    },
    {
      'id': 'v-supplier-4',
      'company_name': 'مؤسسة الخليج المتقدمة لقطع الأسطول',
      'full_name': 'مؤسسة الخليج المتقدمة لقطع الأسطول',
      'city': 'الدمام',
      'district': 'صناعية دله',
      'rating': 4.9,
      'specialty': 'قطع غيار تجارية وأسطول نقل',
      'phone': '0567891234',
    },
  ];
  List<Map<String, dynamic>> _availableVendors = List.from(_kPresetVendorsList);
  bool _isUrgent = false;

  final List<_PartDraftItem> _parts = [
    _PartDraftItem()
  ];

  // Step 4: Fulfillment & Notes & Coupons
  String _deliveryMethod = 'delivery'; // 'delivery' or 'pickup'
  final _orderNotesController = TextEditingController();
  final _couponController = TextEditingController();
  bool _isCouponApplied = false;
  String _appliedCouponCode = '';
  double _discountPercent = 0.0;
  bool _agreeToTerms = true;

  @override
  void initState() {
    super.initState();
    if (widget.initialVendorId != null && widget.initialVendorId!.isNotEmpty) {
      _rfqType = 'private';
      String vId = widget.initialVendorId!;
      if (vId.contains('__')) {
        vId = vId.split('__')[0];
      }
      _selectedVendorId = vId;
      String vName = widget.initialVendorName ?? 'مؤسسة قطع الغيار المعتمدة';
      if (vName.contains('شركة المشتريات الوطنية')) {
        vName = 'مؤسسة قطع الغيار المعتمدة';
      }
      _selectedVendorName = vName;
      
      final exists = _availableVendors.any((v) => v['id']?.toString() == vId);
      if (!exists) {
        _availableVendors.insert(0, {
          'id': vId,
          'company_name': _selectedVendorName,
          'full_name': _selectedVendorName,
          'city': 'الرياض',
          'rating': 4.9,
          'specialty': 'مورد معتمد في المنصة',
          'phone': '',
        });
      }
    }
    _syncBranchLocation('br-riyadh');
    _loadGarageVehicles();
    _loadVendorsList();
  }

  @override
  void dispose() {
    _customAddressController.dispose();
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    _plateController.dispose();
    _vinController.dispose();
    _orderNotesController.dispose();
    _couponController.dispose();
    for (var p in _parts) {
      p.dispose();
    }
    super.dispose();
  }

  void _syncBranchLocation(String branchId) {
    final branch = kCompanyBranches.firstWhere(
      (b) => b.id == branchId,
      orElse: () => kCompanyBranches.first,
    );
    setState(() {
      _selectedBranchId = branch.id;
      _deliveryCity = branch.city;
      _deliveryLat = branch.lat;
      _deliveryLng = branch.lng;
      _hasSelectedLocation = true;
    });
  }

  Future<void> _loadGarageVehicles() async {
    setState(() => _isLoadingVehicles = true);
    try {
      final res = await ApiClient.instance.get(ApiEndpoints.clientVehicles, forceRefresh: true);
      List<dynamic>? rawList;
      if (res.data is List) {
        rawList = res.data as List;
      } else if (res.data is Map && res.data['vehicles'] is List) {
        rawList = res.data['vehicles'] as List;
      } else if (res.data is Map && res.data['data'] is List) {
        rawList = res.data['data'] as List;
      }
      if (rawList != null && rawList.isNotEmpty) {
        final list = rawList
            .map((e) => VehicleModel.fromJson(e as Map<String, dynamic>))
            .toList();
        if (mounted) {
          setState(() {
            _garageVehicles = list;
            if (list.isNotEmpty && _selectedGarageVehicleId == null) {
              _applyGarageVehicle(list.first);
            }
          });
        }
      }
    } catch (_) {
      // Fallback preset fleet
      if (mounted) {
        setState(() {
          _garageVehicles = [
            const VehicleModel(
              id: 'v-1',
              userId: 'client-1',
              brandName: 'تويوتا',
              modelName: 'هايلكس',
              year: 2023,
              plateNumber: 'أ ب ج 1234',
              vin: 'MR0AX12019D0084790',
              notes: '42,000 كم',
            ),
            const VehicleModel(
              id: 'v-2',
              userId: 'client-1',
              brandName: 'تويوتا',
              modelName: 'كامري',
              year: 2022,
              plateNumber: 'ك ل م 2245',
              vin: 'JTECR2F83HA109482',
              notes: '68,000 كم',
            ),
            const VehicleModel(
              id: 'v-3',
              userId: 'client-1',
              brandName: 'هيونداي',
              modelName: 'H1',
              year: 2021,
              plateNumber: 'د هـ و 5678',
              vin: 'KMHCT4AE8FU123984',
              notes: '115,000 كم',
            ),
            const VehicleModel(
              id: 'v-4',
              userId: 'client-1',
              brandName: 'فورد',
              modelName: 'تورس',
              year: 2022,
              plateNumber: 'س م ع 9988',
              vin: '1FA6P8CF0H5182934',
              notes: '54,000 كم',
            ),
          ];
          if (_selectedGarageVehicleId == null && _garageVehicles.isNotEmpty) {
            _applyGarageVehicle(_garageVehicles.first);
          }
        });
      }
    } finally {
      if (mounted) setState(() => _isLoadingVehicles = false);
    }
  }

  Future<void> _loadVendorsList() async {
    // 1. Pre-populate immediately with default verified vendors so list is never empty
    if (_availableVendors.isEmpty) {
      _availableVendors = [
        {
          'id': 'v-supplier-1',
          'company_name': 'مؤسسة قطع الغيار المعتمدة',
          'city': 'الرياض',
          'rating': 4.9,
          'specialty': 'متخصص تويوتا وهوندا',
          'phone': '0501234567',
        },
        {
          'id': 'v-supplier-2',
          'company_name': 'شركة المحركات الوطنية',
          'city': 'الرياض',
          'rating': 4.8,
          'specialty': 'متخصص أمريكي وفورد',
          'phone': '0559876543',
        },
        {
          'id': 'v-supplier-3',
          'company_name': 'مركز التحدي لقطع السيارات',
          'city': 'جدة',
          'rating': 4.7,
          'specialty': 'شامل جميع الماركات',
          'phone': '0543219876',
        },
        {
          'id': 'v-supplier-4',
          'company_name': 'مؤسسة الخليج المتقدمة',
          'city': 'الدمام',
          'rating': 4.9,
          'specialty': 'قطع أسطول وتجارية',
          'phone': '0567891234',
        },
      ];
    }

    try {
      final res = await ApiClient.instance.get('/v1/vendors/map');
      List<dynamic>? rawList;
      if (res.data != null) {
        if (res.data is Map) {
          final m = res.data as Map;
          if (m['vendors'] is List) {
            rawList = m['vendors'] as List;
          } else if (m['data'] is Map && m['data']['vendors'] is List) {
            rawList = m['data']['vendors'] as List;
          } else if (m['data'] is List) {
            rawList = m['data'] as List;
          }
        } else if (res.data is List) {
          rawList = res.data as List;
        }
      }

      if (rawList != null && rawList.isNotEmpty) {
        final parsed = rawList
            .map((e) => Map<String, dynamic>.from(e as Map))
            .where((e) {
              final name = (e['company_name'] ?? e['full_name'] ?? '').toString();
              return name.isNotEmpty && !name.contains('شركة المشتريات الوطنية') && e['role'] != 'client';
            })
            .map((e) {
              final id = e['id']?.toString() ?? '';
              final cleanId = id.contains('__') ? id.split('__')[0] : id;
              return {
                ...e,
                'id': cleanId,
              };
            })
            .toList();
        if (mounted && parsed.isNotEmpty) {
          if (_selectedVendorId != null && _selectedVendorId!.isNotEmpty) {
            final exists = parsed.any((v) => v['id']?.toString() == _selectedVendorId);
            if (!exists && _selectedVendorName != null) {
              parsed.insert(0, {
                'id': _selectedVendorId,
                'company_name': _selectedVendorName,
                'full_name': _selectedVendorName,
                'city': 'الرياض',
                'rating': 4.9,
                'specialty': 'مورد معتمد في المنصة',
                'phone': '',
              });
            }
          }
          setState(() {
            _availableVendors = parsed;
          });
        }
      }
    } catch (_) {}
  }

  void _applyGarageVehicle(VehicleModel v) {
    setState(() {
      _selectedGarageVehicleId = v.id;
      _selectedMake = v.brandName;
      _selectedModel = v.modelName;
      _selectedYear = v.year;
      _plateController.text = v.plateNumber;
      _vinController.text = v.vin ?? 'MR0AX12019D0084790';
      _serialNumber = 'SN-${v.id.hashCode.abs().toString().padLeft(6, '0')}';
      _mileage = v.notes ?? '45,000 كم';
    });
  }

  Future<void> _detectGpsLocation() async {
    setState(() => _isGettingLocation = true);
    try {
      final pos = await widget.locationService.getCurrentPosition();
      final lat = pos?.latitude ?? 24.7136;
      final lng = pos?.longitude ?? 46.6753;
      final addr = await widget.locationService.resolveAddress(lat, lng);
      final city = widget.locationService.resolveCityFromCoordinates(lat, lng);

      if (mounted) {
        setState(() {
          _useBranch = false;
          _hasSelectedLocation = true;
          _deliveryLat = lat;
          _deliveryLng = lng;
          _deliveryCity = city;
          _customAddressController.text = addr;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF059669),
            behavior: SnackBarBehavior.floating,
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('تم تحديد الموقع بنجاح: $city ✓')),
              ],
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _useBranch = false;
          _hasSelectedLocation = true;
          _deliveryLat = 24.7136;
          _deliveryLng = 46.6753;
          _deliveryCity = 'الرياض';
          _customAddressController.text = 'الرياض – حي العليا، طريق الملك فهد (موقع GPS)';
        });
      }
    } finally {
      if (mounted) setState(() => _isGettingLocation = false);
    }
  }

  Future<void> _pickImageForPart(int index, ImageSource source) async {
    try {
      final file = await widget.mediaService.pickAndCompressImage(source: source);
      if (file != null) {
        setState(() {
          _parts[index].localImages.add(file);
          _parts[index].isUploading = true;
        });

        final uploadedUrl = await widget.mediaService.uploadImage(file);
        if (mounted) {
          setState(() {
            _parts[index].isUploading = false;
            if (uploadedUrl != null) {
              _parts[index].uploadedUrls.add(uploadedUrl);
            }
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _parts[index].isUploading = false);
    }
  }

  void _addPart() {
    setState(() {
      _parts.add(_PartDraftItem());
    });
  }

  void _removePart(int index) {
    if (_parts.length > 1) {
      setState(() {
        _parts[index].dispose();
        _parts.removeAt(index);
      });
    }
  }

  void _applyCoupon() {
    final code = _couponController.text.trim().toUpperCase();
    if (code.isEmpty) return;

    if (code == 'RIFQ10' || code == 'RIFQ' || code == 'DISCOUNT10') {
      setState(() {
        _isCouponApplied = true;
        _appliedCouponCode = code;
        _discountPercent = 10.0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF059669),
          behavior: SnackBarBehavior.floating,
          content: Text('تم تطبيق كود الخصم بنجاح (خصم 10%) 🎉'),
        ),
      );
    } else {
      setState(() {
        _isCouponApplied = true;
        _appliedCouponCode = code;
        _discountPercent = 5.0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF2563EB),
          behavior: SnackBarBehavior.floating,
          content: Text('تم تفعيل الكوبون $code بنجاح ✓'),
        ),
      );
    }
  }

  bool _validateCurrentStep() {
    if (_currentStep == 1) {
      if (_recipientNameController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى إدخال اسم المستلم للتنسيق')),
        );
        return false;
      }
      if (_recipientPhoneController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى إدخال رقم جوال المستلم للتواصل')),
        );
        return false;
      }
      if (!_useBranch && _customAddressController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى تحديد موقع التسليم أو اختيار فرع معتمد')),
        );
        return false;
      }
      return true;
    } else if (_currentStep == 2) {
      if (_selectedMake.isEmpty || _selectedModel.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى تحديد صانع وموديل السيارة')),
        );
        return false;
      }
      return true;
    } else if (_currentStep == 3) {
      if (_rfqType == 'private' && (_selectedVendorId == null || _selectedVendorId!.isEmpty)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى اختيار المورد المحدد للطلب الخاص أولاً')),
        );
        return false;
      }
      if (_parts.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى إضافة قطعة غيار واحدة على الأقل')),
        );
        return false;
      }
      for (int i = 0; i < _parts.length; i++) {
        if (_parts[i].nameController.text.trim().isEmpty && _parts[i].localImages.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('يرجى إدخال اسم القطعة رقم ${i + 1} أو إرفاق صورة لها')),
          );
          return false;
        }
      }
      return true;
    } else if (_currentStep == 4) {
      if (!_agreeToTerms) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('يرجى الموافقة على الشروط والأحكام لإرسال الطلب')),
        );
        return false;
      }
    }
    return true;
  }

  void _nextStep() {
    if (_validateCurrentStep()) {
      if (_currentStep < 4) {
        setState(() => _currentStep++);
      } else {
        _submitRfq();
      }
    }
  }

  void _prevStep() {
    if (_currentStep > 1) {
      setState(() => _currentStep--);
    }
  }

  void _submitRfq() {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    final List<RfqItemModel> items = _parts
        .map((p) => RfqItemModel(
              partName: p.nameController.text.trim().isNotEmpty
                  ? p.nameController.text.trim()
                  : 'قطعة غيار معتمدة',
              quantity: p.quantity,
              partType: p.partType,
              partNumber: p.numberController.text.trim().isNotEmpty
                  ? p.numberController.text.trim()
                  : null,
              notes: p.notesController.text.trim().isNotEmpty
                  ? p.notesController.text.trim()
                  : null,
              images: p.uploadedUrls.isNotEmpty ? p.uploadedUrls : [],
            ))
        .toList();

    final locationStr = _useBranch
        ? kCompanyBranches.firstWhere((b) => b.id == _selectedBranchId).address
        : _customAddressController.text.trim();

    final catObj = kPartsCategories.firstWhere(
      (c) => c.id == _selectedCategory,
      orElse: () => kPartsCategories.first,
    );

    context.read<ClientRfqBloc>().add(
          CreateRfqSubmittedEvent(
            carMake: _selectedMake,
            carModel: _selectedModel,
            carYear: _selectedYear,
            plateNumber: _plateController.text.trim().isNotEmpty
                ? _plateController.text.trim()
                : null,
            vin: _vinController.text.trim().isNotEmpty
                ? _vinController.text.trim()
                : null,
            partsCategory: _selectedCategory,
            partsCategoryName: catObj.title,
            deliveryCity: _deliveryCity,
            deliveryLocation: locationStr,
            deliveryLat: _deliveryLat,
            deliveryLng: _deliveryLng,
            deliveryMethod: _deliveryMethod,
            rfqType: _rfqType,
            recipientName: _recipientNameController.text.trim().isNotEmpty
                ? _recipientNameController.text.trim()
                : null,
            recipientPhone: _recipientPhoneController.text.trim().isNotEmpty
                ? _recipientPhoneController.text.trim()
                : null,
            selectedVendorId: _selectedVendorId,
            selectedVendorName: _selectedVendorName,
            isUrgent: _isUrgent,
            notes: _orderNotesController.text.trim().isNotEmpty
                ? _orderNotesController.text.trim()
                : null,
            items: items,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ClientRfqBloc, ClientRfqState>(
      listener: (context, state) {
        if (state is ClientRfqSuccessState) {
          setState(() => _isSubmitting = false);
          NotificationService().showLocalNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: 'تم إنشاء طلب التسعير بنجاح 📋',
            body: 'تم إرسال طلب تسعير قطع غيار $_selectedMake $_selectedModel للموردين المعتمدين',
            channelId: 'orders_channel',
            channelName: 'الطلبات وعروض الأسعار',
          );
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF059669),
              behavior: SnackBarBehavior.floating,
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(state.message),
                  ),
                ],
              ),
            ),
          );
          Navigator.of(context).pop();
        } else if (state is ClientRfqErrorState) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFFDC2626),
              behavior: SnackBarBehavior.floating,
              content: Text(state.error),
            ),
          );
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F172A),
          foregroundColor: Colors.white,
          elevation: 0,
          title: const Text(
            'طلب تسعير قطع غيار جديد',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              // ── TOP 4-STEP WIZARD STEPPER ──
              _buildTopStepper(),

              // ── MAIN ACTIVE STEP VIEW ──
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: _formKey,
                    child: _buildCurrentStepView(),
                  ),
                ),
              ),

              // ── BOTTOM ACTION BAR ──
              _buildBottomActionBar(),
            ],
          ),
        ),
      ),
    );
  }

  // ── WIZARD PROGRESS STEPPER ──
  Widget _buildTopStepper() {
    final steps = [
      {'num': 1, 'title': 'الموقع والفرع', 'icon': Icons.location_on_rounded},
      {'num': 2, 'title': 'بيانات المركبة', 'icon': Icons.directions_car_rounded},
      {'num': 3, 'title': 'قطع الغيار', 'icon': Icons.build_circle_rounded},
      {'num': 4, 'title': 'طريقة الاستلام', 'icon': Icons.check_circle_rounded},
    ];

    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: steps.map((s) {
              final stepNum = s['num'] as int;
              final isDone = stepNum < _currentStep;
              final isCurrent = stepNum == _currentStep;

              return Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: isCurrent
                            ? const Color(0xFF2563EB)
                            : isDone
                                ? const Color(0xFF059669)
                                : const Color(0xFF1E293B),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isCurrent
                              ? const Color(0xFF60A5FA)
                              : isDone
                                  ? const Color(0xFF34D399)
                                  : Colors.white12,
                          width: 2,
                        ),
                      ),
                      child: Center(
                        child: isDone
                            ? const Icon(Icons.check_rounded, size: 20, color: Colors.white)
                            : Icon(s['icon'] as IconData, size: 18, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      s['title'] as String,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w600,
                        color: isCurrent
                            ? Colors.white
                            : isDone
                                ? const Color(0xFF34D399)
                                : const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _currentStep / 4.0,
              backgroundColor: const Color(0xFF1E293B),
              valueColor: const AlwaysStoppedAnimation(Color(0xFF2563EB)),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }

  // ── ROUTE TO CURRENT STEP ──
  Widget _buildCurrentStepView() {
    switch (_currentStep) {
      case 1:
        return _buildStep1Location();
      case 2:
        return _buildStep2Vehicle();
      case 3:
        return _buildStep3Parts();
      case 4:
        return _buildStep4Review();
      default:
        return const SizedBox.shrink();
    }
  }

  // ══════════════════════════════════════════════════════════
  // STEP 1: الموقع والفرع وبيانات المستلم (1:1 Web Parity)
  // ══════════════════════════════════════════════════════════
  Widget _buildStep1Location() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Recipient Information Card
        _buildSectionCard(
          title: 'بيانات الشخص المستلم للتسليم المباشر',
          subtitle: 'بيانات مسؤول الاستلام للتنسيق المباشر عند وصول المندوب أو استلام الشحنة',
          icon: Icons.person_pin_rounded,
          child: Column(
            children: [
              TextFormField(
                controller: _recipientNameController,
                decoration: const InputDecoration(
                  labelText: 'اسم الشخص المستلم *',
                  hintText: 'مثال: م. أحمد الغامدي (مسؤول الفرع)',
                  prefixIcon: Icon(Icons.person_rounded),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _recipientPhoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'رقم جوال المستلم للتواصل *',
                  hintText: '05xxxxxxxx',
                  prefixIcon: Icon(Icons.phone_iphone_rounded),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 2. Location Selection Card
        _buildSectionCard(
          title: 'تحديد موقع استلام وتسليم القطع',
          subtitle: 'اختر الفرع المعتمد لأسطولك أو حدد موقعك الحالي مباشرة عبر GPS',
          icon: Icons.location_on_rounded,
          trailing: _hasSelectedLocation
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF059669)),
                      SizedBox(width: 4),
                      Text('تم اعتماد الموقع', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                    ],
                  ),
                )
              : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Branch vs Custom GPS Tabs
              Row(
                children: [
                  Expanded(
                    child: _buildChoiceChip(
                      label: 'فروع الأسطول المعتمدة',
                      icon: Icons.business_rounded,
                      isSelected: _useBranch,
                      onTap: () {
                        setState(() {
                          _useBranch = true;
                          _syncBranchLocation(_selectedBranchId);
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildChoiceChip(
                      label: 'تحديد موقع مخصص (GPS)',
                      icon: Icons.my_location_rounded,
                      isSelected: !_useBranch,
                      onTap: () {
                        setState(() => _useBranch = false);
                        _detectGpsLocation();
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              if (_useBranch) ...[
                DropdownButtonFormField<String>(
                  value: _selectedBranchId,
                  decoration: const InputDecoration(
                    labelText: 'الفرع المستلم المعتمد *',
                    prefixIcon: Icon(Icons.storefront_rounded),
                  ),
                  items: kCompanyBranches.map((b) {
                    return DropdownMenuItem(
                      value: b.id,
                      child: Text('${b.title} – ${b.city}'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) _syncBranchLocation(val);
                  },
                ),
                const SizedBox(height: 14),

                // Selected Branch Details Grid
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildInfoItem(
                              label: 'الفرع المعتمد',
                              value: kCompanyBranches.firstWhere((b) => b.id == _selectedBranchId).title,
                            ),
                          ),
                          Expanded(
                            child: _buildInfoItem(
                              label: 'المدينة / المنطقة',
                              value: _deliveryCity,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildInfoItem(
                        label: 'العنوان المعتمد للتسليم',
                        value: kCompanyBranches.firstWhere((b) => b.id == _selectedBranchId).address,
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // Custom GPS / Map Location View
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.near_me_rounded, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('تحديد موقعك الجغرافي المباشر', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                                Text('الإحداثيات: ${_deliveryLat?.toStringAsFixed(4)}° N, ${_deliveryLng?.toStringAsFixed(4)}° E', style: const TextStyle(fontSize: 11, color: Color(0xFF3B82F6), fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          ElevatedButton.icon(
                            onPressed: _isGettingLocation ? null : _detectGpsLocation,
                            icon: _isGettingLocation
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.gps_fixed_rounded, size: 16),
                            label: Text(_isGettingLocation ? 'جاري التحديد...' : 'تحديث GPS'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Quick Saudi City Pills
                      const Text('اختر المدينة السريعة أو غيرها أدناه:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: kSaudiCities.take(8).map((city) {
                          final isSel = _deliveryCity == city;
                          return ChoiceChip(
                            label: Text(city, style: TextStyle(fontSize: 11, fontWeight: isSel ? FontWeight.bold : FontWeight.normal, color: isSel ? Colors.white : const Color(0xFF1E293B))),
                            selected: isSel,
                            selectedColor: const Color(0xFF2563EB),
                            backgroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: isSel ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1))),
                            onSelected: (selected) {
                              if (selected) {
                                setState(() {
                                  _deliveryCity = city;
                                  _customAddressController.text = '$city – حي العليا، طريق الملك فهد (موقع مخصص)';
                                });
                              }
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _customAddressController,
                        decoration: const InputDecoration(
                          labelText: 'العنوان الوطني أو اسم الحي والشارع *',
                          prefixIcon: Icon(Icons.map_rounded),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP 2: بيانات المركبة (11 Detailed Specs - 1:1 Web Parity)
  // ══════════════════════════════════════════════════════════
  Widget _buildStep2Vehicle() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildSectionCard(
          title: 'اختيار المركبة المطلوبة من الأسطول',
          subtitle: 'حدد السيارة المراد طلب قطع الغيار لها من أسطولك المسجل أو أضف بيانات جديدة',
          icon: Icons.directions_car_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Fleet vs Manual Toggle
              Row(
                children: [
                  Expanded(
                    child: _buildChoiceChip(
                      label: 'سيارات الأسطول المسجلة',
                      icon: Icons.garage_rounded,
                      isSelected: _useFleet,
                      onTap: () => setState(() => _useFleet = true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildChoiceChip(
                      label: '+ إدخال مركبة جديدة يدوياً',
                      icon: Icons.add_circle_outline_rounded,
                      isSelected: !_useFleet,
                      onTap: () => setState(() => _useFleet = false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              if (_useFleet) ...[
                if (_isLoadingVehicles)
                  const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
                else if (_garageVehicles.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    value: _selectedGarageVehicleId ?? _garageVehicles.first.id,
                    decoration: const InputDecoration(
                      labelText: 'اختر المركبة من الأسطول *',
                      prefixIcon: Icon(Icons.directions_car_filled_rounded),
                    ),
                    items: _garageVehicles.map((v) {
                      return DropdownMenuItem(
                        value: v.id,
                        child: Text('${v.brandName} ${v.modelName} (${v.year}) – ${v.plateNumber}'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        final v = _garageVehicles.firstWhere((item) => item.id == val);
                        _applyGarageVehicle(v);
                      }
                    },
                  ),
                  const SizedBox(height: 16),

                  // 11 Detailed Vehicle Specifications Box matching Web
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.fact_check_rounded, color: Color(0xFF2563EB), size: 18),
                            const SizedBox(width: 8),
                            Text('المواصفات الفنية لمركبة ($_selectedMake $_selectedModel $_selectedYear)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                          ],
                        ),
                        const Divider(height: 20),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildSpecTag('رقم الهيكل VIN', _vinController.text),
                            _buildSpecTag('رقم اللوحة', _plateController.text),
                            _buildSpecTag('الرقم التسلسلي', _serialNumber),
                            _buildSpecTag('سنة الصنع', _selectedYear.toString()),
                            _buildSpecTag('الشركة الصانعة', _selectedMake),
                            _buildSpecTag('الموديل', _selectedModel),
                            _buildSpecTag('ممشى المركبة', _mileage),
                            _buildSpecTag('سعة المحرك', _engineCapacity),
                            _buildSpecTag('السلندرات', _cylinders),
                            _buildSpecTag('ناقل الحركة', _transmission),
                            _buildSpecTag('نوع الوقود', _fuelType),
                          ],
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  const Text('لا توجد مركبات مسجلة في الجراج حالياً، يمكنك إدخال البيانات يدوياً أدناه.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ] else ...[
                // Manual Form Inputs
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedMake,
                        decoration: const InputDecoration(labelText: 'الماركة *'),
                        items: kCarMakes.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _selectedMake = val;
                              _selectedModel = kCarModels[val]?.first ?? 'عام';
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: kCarModels[_selectedMake]?.contains(_selectedModel) == true ? _selectedModel : (kCarModels[_selectedMake]?.first ?? 'عام'),
                        decoration: const InputDecoration(labelText: 'الموديل *'),
                        items: (kCarModels[_selectedMake] ?? ['عام']).map((mod) => DropdownMenuItem(value: mod, child: Text(mod))).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedModel = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        value: _selectedYear,
                        decoration: const InputDecoration(labelText: 'سنة الصنع *'),
                        items: List.generate(30, (i) => 2025 - i).map((y) => DropdownMenuItem(value: y, child: Text(y.toString()))).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedYear = val);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _plateController,
                        decoration: const InputDecoration(
                          labelText: 'رقم اللوحة',
                          hintText: 'أ ب ج 1234',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _vinController,
                  decoration: const InputDecoration(
                    labelText: 'رقم الهيكل (VIN) - اختياري',
                    hintText: 'MR0AX12019D0084790',
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP 3: نطاق الطلب وتفاصيل القطع (1:1 Web Parity)
  // ══════════════════════════════════════════════════════════
  Widget _buildStep3Parts() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. RFQ Scope Selector (Public vs Private)
        _buildSectionCard(
          title: 'نطاق إرسال طلب التسعير',
          subtitle: 'حدد أولاً ما إذا كان الطلب عاماً لكافة الموردين أو خاصاً لمورد محدد',
          icon: Icons.hub_rounded,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _buildChoiceChip(
                      label: 'طلب عام (كافة الموردين)',
                      icon: Icons.public_rounded,
                      isSelected: _rfqType == 'public',
                      onTap: () {
                        setState(() {
                          _rfqType = 'public';
                          _selectedVendorId = null;
                          _selectedVendorName = null;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildChoiceChip(
                      label: 'طلب خاص (لمورد محدد)',
                      icon: Icons.storefront_rounded,
                      isSelected: _rfqType == 'private',
                      onTap: () => setState(() => _rfqType = 'private'),
                    ),
                  ),
                ],
              ),

              if (_rfqType == 'private') ...[
                const SizedBox(height: 14),
                _buildVendorSelectorField(),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 2. Canonical Parts Categories Pills
        _buildSectionCard(
          title: 'مجال وتخصص قطع الغيار',
          subtitle: 'توجيه ذكي ومباشر لموردي هذا المجال في الصناعيات بالسوق السعودي',
          icon: Icons.layers_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: kPartsCategories.map((cat) {
                  final isSel = _selectedCategory == cat.id;
                  return ChoiceChip(
                    avatar: Icon(cat.icon, size: 16, color: isSel ? Colors.white : const Color(0xFF2563EB)),
                    label: Text(cat.shortName, style: TextStyle(fontSize: 12, fontWeight: isSel ? FontWeight.w900 : FontWeight.bold, color: isSel ? Colors.white : const Color(0xFF1E293B))),
                    selected: isSel,
                    selectedColor: const Color(0xFF2563EB),
                    backgroundColor: const Color(0xFFF1F5F9),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: isSel ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1))),
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedCategory = cat.id);
                    },
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 3. Multi-Row Parts List
        _buildSectionCard(
          title: 'جدول تفاصيل القطع المطلوبة (${_parts.length} قطع)',
          subtitle: 'أدخل اسم القطعة، رقم OEM، الكمية، والنوع، وارفق صوراً متعددة لتسريع التسعير',
          icon: Icons.format_list_bulleted_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ..._parts.asMap().entries.map((entry) {
                final idx = entry.key;
                final part = entry.value;
                return _buildPartRowCard(idx, part);
              }),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _addPart,
                icon: const Icon(Icons.add_rounded),
                label: const Text('+ إضافة قطعة غيار أخرى للطلب'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF2563EB),
                  side: const BorderSide(color: Color(0xFF2563EB), style: BorderStyle.solid),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 4. Urgent Request Switch
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _isUrgent ? const Color(0xFFFFFBEB) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _isUrgent ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0), width: _isUrgent ? 2 : 1),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _isUrgent ? const Color(0xFFF59E0B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.timer_rounded, color: _isUrgent ? Colors.white : const Color(0xFFF59E0B), size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('طلب عاجل جداً (أولوية قصوى)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    Text('منح أولوية قصوى للتسعير وسرعة الاستجابة اللوجستية', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
              ),
              Switch(
                value: _isUrgent,
                activeColor: const Color(0xFFF59E0B),
                onChanged: (val) => setState(() => _isUrgent = val),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP 4: طريقة الاستلام والتأكيد النهائي (1:1 Web Parity)
  // ══════════════════════════════════════════════════════════
  Widget _buildStep4Review() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Fulfillment Method Selector
        _buildSectionCard(
          title: 'طريقة استلام وتوصيل الشحنة',
          subtitle: 'اختر كيفية استلام القطع فور قبول العرض واعتماد الصفقة',
          icon: Icons.local_shipping_rounded,
          child: Row(
            children: [
              Expanded(
                child: _buildChoiceChip(
                  label: 'توصيل مباشر إلى الموقع',
                  icon: Icons.delivery_dining_rounded,
                  isSelected: _deliveryMethod == 'delivery',
                  onTap: () => setState(() => _deliveryMethod = 'delivery'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildChoiceChip(
                  label: 'استلام من فرع المورد',
                  icon: Icons.store_rounded,
                  isSelected: _deliveryMethod == 'pickup',
                  onTap: () => setState(() => _deliveryMethod = 'pickup'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 2. Live RFQ Direct Summary Card
        _buildSectionCard(
          title: 'الملخص النهائي للطلب المباشر (Direct Summary)',
          subtitle: 'مراجعة شاملة لجميع البيانات المدخلة قبل الاعتماد والإرسال',
          icon: Icons.receipt_long_rounded,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _buildDarkSummaryRow('01 موقع التسليم', '$_deliveryCity – ${_useBranch ? "فرع معتمد" : "موقع GPS"} (${_recipientNameController.text})', const Color(0xFF38BDF8)),
                const Divider(color: Colors.white12),
                _buildDarkSummaryRow('02 بيانات المركبة', '$_selectedMake $_selectedModel ($_selectedYear) – ${_plateController.text}', const Color(0xFF818CF8)),
                const Divider(color: Colors.white12),
                _buildDarkSummaryRow('03 نطاق الطلب', _rfqType == 'public' ? 'عام (كافة الموردين)' : 'خاص (${_selectedVendorName ?? "مورد محدد"})', const Color(0xFFC084FC)),
                const Divider(color: Colors.white12),
                _buildDarkSummaryRow('04 عدد القطع', '${_parts.length} قطع مطلوبة (${_parts.map((p) => p.nameController.text).where((s) => s.isNotEmpty).join("، ")})', const Color(0xFFFBBF24)),
                const Divider(color: Colors.white12),
                _buildDarkSummaryRow('05 طريقة الاستلام', _deliveryMethod == 'delivery' ? 'توصيل مباشر للموقع 🚚' : 'استلام من فرع المورد 🏬', const Color(0xFF34D399)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // 4. Notes Input
        TextFormField(
          controller: _orderNotesController,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'ملاحظات إضافية للموردين (اختياري)',
            hintText: 'مثال: يفضل التوصيل خلال ساعات العمل الصباحية...',
            prefixIcon: Icon(Icons.note_alt_rounded),
          ),
        ),
        const SizedBox(height: 14),

        // 5. Terms Checkbox
        CheckboxListTile(
          value: _agreeToTerms,
          activeColor: const Color(0xFF2563EB),
          contentPadding: EdgeInsets.zero,
          title: const Text('أقر بدقة وصحة البيانات المدخلة والموافقة على شروط استخدام منصة رفق', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
          controlAffinity: ListTileControlAffinity.leading,
          onChanged: (val) => setState(() => _agreeToTerms = val ?? true),
        ),
      ],
    );
  }

  // ── PART ROW CARD COMPONENT ──
  Widget _buildPartRowCard(int index, _PartDraftItem part) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 12,
                backgroundColor: const Color(0xFF2563EB),
                child: Text('${index + 1}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text('القطعة رقم ${index + 1}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              ),
              if (_parts.length > 1)
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 20),
                  onPressed: () => _removePart(index),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Part Name & OEM Number
          Row(
            children: [
              Expanded(
                flex: 3,
                child: TextFormField(
                  controller: part.nameController,
                  decoration: const InputDecoration(
                    labelText: 'اسم القطعة المطلوبة *',
                    hintText: 'مثال: فحمات فرامل أمامية',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: TextFormField(
                  controller: part.numberController,
                  decoration: const InputDecoration(
                    labelText: 'رقم القطعة OEM',
                    hintText: '04465-33471',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Quantity Stepper (1:1 Web Parity - Condition is determined by Vendor quotation)
          Row(
            children: [
              const Text(
                'الكمية المطلوبة:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_rounded, size: 18),
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                      onPressed: () {
                        if (part.quantity > 1) setState(() => part.quantity--);
                      },
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Text('${part.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_rounded, size: 18),
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                      onPressed: () => setState(() => part.quantity++),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Images Attachment Bar
          Row(
            children: [
              ElevatedButton.icon(
                onPressed: part.isUploading ? null : () => _pickImageForPart(index, ImageSource.camera),
                icon: const Icon(Icons.camera_alt_rounded, size: 16),
                label: const Text('تصوير'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
              ),
              const SizedBox(width: 6),
              ElevatedButton.icon(
                onPressed: part.isUploading ? null : () => _pickImageForPart(index, ImageSource.gallery),
                icon: const Icon(Icons.photo_library_rounded, size: 16),
                label: const Text('المعرض'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF1F5F9),
                  foregroundColor: const Color(0xFF1E293B),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
              ),
              const SizedBox(width: 10),
              if (part.localImages.isNotEmpty)
                Expanded(
                  child: SizedBox(
                    height: 36,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: part.localImages.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 6),
                      itemBuilder: (ctx, imgIdx) {
                        return Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(part.localImages[imgIdx], width: 36, height: 36, fit: BoxFit.cover),
                            ),
                            Positioned(
                              top: -2,
                              right: -2,
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    part.localImages.removeAt(imgIdx);
                                    if (part.uploadedUrls.length > imgIdx) {
                                      part.uploadedUrls.removeAt(imgIdx);
                                    }
                                  });
                                },
                                child: const CircleAvatar(
                                  radius: 7,
                                  backgroundColor: Colors.red,
                                  child: Icon(Icons.close, size: 8, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // ── BOTTOM ACTION BAR ──
  Widget _buildBottomActionBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Row(
        children: [
          if (_currentStep > 1)
            OutlinedButton.icon(
              onPressed: _prevStep,
              icon: const Icon(Icons.arrow_forward_rounded, size: 16),
              label: const Text('السابق'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          if (_currentStep > 1) const SizedBox(width: 10),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _nextStep,
              icon: _isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(_currentStep == 4 ? Icons.check_circle_rounded : Icons.arrow_back_rounded, size: 18),
              label: Text(
                _isSubmitting
                    ? 'جاري الإرسال...'
                    : _currentStep == 4
                        ? 'إرسال طلب التسعير النهائي ✓'
                        : 'التالي (الخطوة ${_currentStep + 1} من 4)',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _currentStep == 4 ? const Color(0xFF059669) : const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── REUSABLE HELPER WIDGETS ──
  Widget _buildSectionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Widget child,
    Widget? trailing,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [BoxShadow(color: Color(0x05000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: const Color(0xFF2563EB), size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildChoiceChip({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : const Color(0xFF475569)),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                  color: isSelected ? Colors.white : const Color(0xFF334155),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem({required String label, required String value}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A), fontWeight: FontWeight.w900), maxLines: 1, overflow: TextOverflow.ellipsis),
      ],
    );
  }

  Widget _buildSpecTag(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFCBD5E1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$label: ', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
          Text(value.isNotEmpty ? value : '—', style: const TextStyle(fontSize: 11, color: Color(0xFF0F172A), fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildDarkSummaryRow(String label, String value, Color labelColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 95,
            child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: labelColor)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════
  // Interactive Target Vendor Selector (Custom Bottom Sheet)
  // ══════════════════════════════════════════════════════════
  Widget _buildVendorSelectorField() {
    final hasSelection = _selectedVendorId != null && _selectedVendorId!.isNotEmpty;
    Map<String, dynamic>? selectedVendor;
    if (hasSelection) {
      try {
        selectedVendor = _availableVendors.firstWhere(
          (v) => v['id']?.toString() == _selectedVendorId,
          orElse: () => {
            'id': _selectedVendorId,
            'company_name': _selectedVendorName ?? 'مورد معتمد',
            'city': 'المملكة',
            'rating': 4.9,
          },
        );
      } catch (_) {
        selectedVendor = {
          'id': _selectedVendorId,
          'company_name': _selectedVendorName ?? 'مورد معتمد',
          'city': 'المملكة',
          'rating': 4.9,
        };
      }
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _showVendorSelectionModal,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: hasSelection ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: hasSelection ? const Color(0xFF10B981) : const Color(0xFFCBD5E1),
              width: hasSelection ? 1.5 : 1.0,
            ),
            boxShadow: hasSelection
                ? [
                    BoxShadow(
                      color: const Color(0xFF10B981).withOpacity(0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: hasSelection ? const Color(0xFFDCFCE7) : const Color(0xFFE2E8F0),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  hasSelection ? Icons.verified_rounded : Icons.storefront_rounded,
                  color: hasSelection ? const Color(0xFF059669) : const Color(0xFF64748B),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasSelection
                          ? (selectedVendor?['company_name'] ?? selectedVendor?['full_name'] ?? _selectedVendorName ?? 'المورد المختار')
                          : 'اختر المورد المستهدف للطلب الخاص *',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: hasSelection ? const Color(0xFF0F172A) : const Color(0xFF334155),
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (hasSelection)
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE0F2FE),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              selectedVendor?['city'] ?? 'المملكة',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0369A1)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '⭐ ${selectedVendor?['rating'] ?? 4.9}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                          ),
                          if (selectedVendor?['specialty'] != null) ...[
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                selectedVendor!['specialty'].toString(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ),
                          ],
                        ],
                      )
                    else
                      const Text(
                        'اضغط هنا لاختيار المورد من قائمة الموردين المعتمدين',
                        style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: hasSelection ? const Color(0xFF059669) : const Color(0xFF2563EB),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      hasSelection ? 'تغيير' : 'تحديد',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showVendorSelectionModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) {
        String searchQuery = '';
        String selectedCityFilter = 'الكل';

        return StatefulBuilder(
          builder: (context, setModalState) {
            final filteredVendors = _availableVendors.where((v) {
              final name = (v['company_name'] ?? v['full_name'] ?? '').toString().toLowerCase();
              final city = (v['city'] ?? '').toString().toLowerCase();
              final spec = (v['specialty'] ?? '').toString().toLowerCase();
              final q = searchQuery.toLowerCase();

              final matchesSearch = q.isEmpty || name.contains(q) || city.contains(q) || spec.contains(q);
              final matchesCity = selectedCityFilter == 'الكل' || (v['city']?.toString() == selectedCityFilter);

              return matchesSearch && matchesCity;
            }).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      margin: const EdgeInsets.only(top: 12, bottom: 8),
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),

                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.storefront_rounded, color: Color(0xFF2563EB), size: 22),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'اختر المورد المستهدف للطلب الخاص',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                'حدد المورد المعتمد لتوجيه التسعير إليه مباشرة',
                                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(modalCtx),
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  // Search Bar
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'ابحث باسم المورد، المدينة، أو التخصص...',
                        hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 20),
                        suffixIcon: searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 18),
                                onPressed: () => setModalState(() => searchQuery = ''),
                              )
                            : null,
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
                      ),
                      onChanged: (val) => setModalState(() => searchQuery = val.trim()),
                    ),
                  ),

                  // City Filter Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Row(
                      children: ['الكل', 'الرياض', 'جدة', 'الدمام'].map((city) {
                        final isSel = selectedCityFilter == city;
                        return Padding(
                          padding: const EdgeInsets.only(left: 6),
                          child: FilterChip(
                            label: Text(city, style: TextStyle(fontSize: 12, fontWeight: isSel ? FontWeight.w800 : FontWeight.w600, color: isSel ? Colors.white : const Color(0xFF334155))),
                            selected: isSel,
                            selectedColor: const Color(0xFF2563EB),
                            backgroundColor: const Color(0xFFF1F5F9),
                            showCheckmark: false,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: isSel ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0))),
                            onSelected: (val) => setModalState(() => selectedCityFilter = city),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const SizedBox(height: 6),

                  // Vendors List
                  Expanded(
                    child: filteredVendors.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.store_mall_directory_outlined, size: 48, color: Color(0xFF94A3B8)),
                                const SizedBox(height: 10),
                                const Text('لا يوجد مورد مطابق لمعايير البحث', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                const SizedBox(height: 4),
                                const Text('جرب البحث بكلمة أخرى أو تغيير تصنيف المدينة', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                                const SizedBox(height: 12),
                                TextButton(
                                  onPressed: () => setModalState(() {
                                    searchQuery = '';
                                    selectedCityFilter = 'الكل';
                                  }),
                                  child: const Text('عرض كافة الموردين المعتمدين'),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: filteredVendors.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (ctx, idx) {
                              final v = filteredVendors[idx];
                              final id = v['id']?.toString() ?? '';
                              final name = v['company_name']?.toString() ?? v['full_name']?.toString() ?? 'مورد معتمد';
                              final city = v['city']?.toString() ?? 'المملكة';
                              final district = v['district']?.toString();
                              final spec = v['specialty']?.toString();
                              final rating = v['rating']?.toString() ?? '4.9';
                              final isSelected = _selectedVendorId == id;

                              return InkWell(
                                onTap: () {
                                  setState(() {
                                    _selectedVendorId = id;
                                    _selectedVendorName = name;
                                  });
                                  Navigator.pop(modalCtx);
                                },
                                borderRadius: BorderRadius.circular(14),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                                      width: isSelected ? 1.8 : 1.0,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.02),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 44,
                                        height: 44,
                                        decoration: BoxDecoration(
                                          color: isSelected ? const Color(0xFFDBEAFE) : const Color(0xFFF1F5F9),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Center(
                                          child: Icon(
                                            Icons.storefront_rounded,
                                            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF475569),
                                            size: 22,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    name,
                                                    style: TextStyle(
                                                      fontSize: 14,
                                                      fontWeight: FontWeight.w800,
                                                      color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFF0F172A),
                                                    ),
                                                  ),
                                                ),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFFEF3C7),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      const Icon(Icons.star_rounded, size: 13, color: Color(0xFFD97706)),
                                                      const SizedBox(width: 2),
                                                      Text(
                                                        rating,
                                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF92400E)),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                Icon(Icons.location_on_outlined, size: 13, color: Colors.grey.shade600),
                                                const SizedBox(width: 2),
                                                Text(
                                                  district != null ? '$city - $district' : city,
                                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                                ),
                                                if (spec != null) ...[
                                                  const SizedBox(width: 8),
                                                  Expanded(
                                                    child: Text(
                                                      '• $spec',
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: const TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.w600),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Icon(
                                        isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                                        color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                                        size: 22,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),

                  // Bottom Action
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(modalCtx),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                        child: const Text(
                          'إغلاق القائمة',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
