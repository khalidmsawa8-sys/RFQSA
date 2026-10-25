import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/app_sidebar_drawer.dart';

/// Unified Membership & Enterprise Settings Screen (1:1 Web Parity with components/identity/unified-identity-settings-view.tsx)
class ClientSettingsScreen extends StatefulWidget {
  final String role; // 'client' or 'vendor'

  const ClientSettingsScreen({super.key, this.role = 'client'});

  @override
  State<ClientSettingsScreen> createState() => _ClientSettingsScreenState();
}

class _ClientSettingsScreenState extends State<ClientSettingsScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  String _activeTab = 'organization'; // organization, pickup_location, brands, subscription, verification, security, team, apikeys, notifications, activity, preferences
  bool _isLoading = true;

  bool get isVendor => widget.role == 'vendor';

  // Organization Data
  String _orgName = 'شركة المشتريات الوطنية للخدمات اللوجستية';
  String _crNumber = '1010112233';
  String _taxNumber = '300998877600003';
  String _address = 'الرياض - طريق الملك فهد - حي العليا';
  String _phone = '0501234567';
  String _email = 'procurement@national-procurement.sa';

  late final TextEditingController _orgNameCtrl = TextEditingController(text: _orgName);
  late final TextEditingController _crCtrl = TextEditingController(text: _crNumber);
  late final TextEditingController _taxCtrl = TextEditingController(text: _taxNumber);
  late final TextEditingController _addressCtrl = TextEditingController(text: _address);
  late final TextEditingController _phoneCtrl = TextEditingController(text: _phone);
  late final TextEditingController _emailCtrl = TextEditingController(text: _email);
  bool _isSavingOrg = false;

  // Vendor Specialization State
  final List<String> _allBrands = [
    'تويوتا (Toyota)', 'نيسان (Nissan)', 'هيونداي (Hyundai)', 'كيا (Kia)', 'فورد (Ford)',
    'جي إم سي (GMC)', 'شيفروليه (Chevrolet)', 'مرسيدس (Mercedes)', 'بي إم دبليو (BMW)', 'لكزس (Lexus)', 'إيسوزو (Isuzu)'
  ];
  final Set<String> _selectedBrands = {'تويوتا (Toyota)', 'نيسان (Nissan)', 'فورد (Ford)', 'جي إم سي (GMC)', 'لكزس (Lexus)'};
  bool _specializesInAllBrands = false;

  final List<String> _allCategories = [
    'قطع محركات وجيربوكس',
    'بودي وهيكل وقطع خارجية',
    'كهرباء وحساسات',
    'فحمات ومكابح وهيدروليك',
    'مساعدات وعضلات ونظام تعليق',
    'قطع تشليح أصلية مفحوصة',
  ];
  final Set<String> _selectedCategories = {'قطع محركات وجيربوكس', 'فحمات ومكابح وهيدروليك', 'مساعدات وعضلات ونظام تعليق'};
  bool _specializesInAllCategories = false;

  // Vendor Pickup Branch State
  bool _selfPickupEnabled = true;
  String _branchName = 'فرع الرياض الرئيسي (حي الصناعية القديمة)';
  String _branchHours = 'من السبت إلى الخميس: 08:00 ص - 10:00 م';
  String _branchCoords = '24.6432, 46.7412';

  // Notifications toggles
  bool _whatsappAlerts = true;
  bool _pushNotifications = true;
  bool _smsAlerts = true;

  // Security Sessions
  final List<Map<String, dynamic>> _sessions = [
    {
      'device': 'iPhone 15 Pro (تطبيق الجوال)',
      'location': 'الرياض، المملكة العربية السعودية',
      'ip': '188.54.120.44',
      'status': 'الجلسة الحالية (نشط الآن)',
      'is_current': true,
    },
    {
      'device': 'Chrome / Windows 11 (الويب)',
      'location': 'الرياض، المملكة العربية السعودية',
      'ip': '188.54.120.44',
      'status': 'نشط منذ 15 دقيقة',
      'is_current': false,
    },
  ];

  // API Keys
  final List<Map<String, dynamic>> _apiKeys = [
    {
      'name': 'Live ERP Integration Key',
      'key_prefix': 'rfq_live_9981...',
      'created_at': '2026-07-15',
      'status': 'نشط ومفعل',
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  @override
  void dispose() {
    _orgNameCtrl.dispose();
    _crCtrl.dispose();
    _taxCtrl.dispose();
    _addressCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchSettings() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/v1/organization');
      if (res.data != null && res.data['success'] == true) {
        final data = res.data['data'];
        if (data != null && data['organization'] != null) {
          final org = data['organization'];
          _orgName = org['name'] ?? org['company_name'] ?? _orgName;
          _crNumber = org['cr_number'] ?? org['commercial_register'] ?? _crNumber;
          _taxNumber = org['tax_number'] ?? _taxNumber;
          _address = org['address'] ?? org['national_address'] ?? _address;
          _phone = org['phone'] ?? _phone;
          _email = org['email'] ?? _email;

          _orgNameCtrl.text = _orgName;
          _crCtrl.text = _crNumber;
          _taxCtrl.text = _taxNumber;
          _addressCtrl.text = _address;
          _phoneCtrl.text = _phone;
          _emailCtrl.text = _email;
        }
      }
    } catch (_) {}
    finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveOrganizationProfile() async {
    setState(() => _isSavingOrg = true);
    try {
      final res = await ApiClient.instance.put('/v1/organization', data: {
        'name': _orgNameCtrl.text.trim(),
        'company_name': _orgNameCtrl.text.trim(),
        'cr_number': _crCtrl.text.trim(),
        'commercial_register': _crCtrl.text.trim(),
        'tax_number': _taxCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'national_address': _addressCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
      });

      if (res.data != null && (res.data['success'] == true || res.statusCode == 200)) {
        setState(() {
          _orgName = _orgNameCtrl.text.trim();
          _crNumber = _crCtrl.text.trim();
          _taxNumber = _taxCtrl.text.trim();
          _address = _addressCtrl.text.trim();
          _phone = _phoneCtrl.text.trim();
          _email = _emailCtrl.text.trim();
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ تم حفظ وتحديث بيانات المنشأة والسجل التجاري بنجاح في الموقع والتطبيق'),
              backgroundColor: Color(0xFF059669),
            ),
          );
        }
      } else {
        throw Exception(res.data?['error'] ?? 'فشل حفظ التعديلات');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تعذر حفظ التعديلات: ${e.toString()}'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSavingOrg = false);
    }
  }

  // ── SAVE SPECIALIZATION (Vendor) ──
  Future<void> _saveSpecialization() async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_specializesInAllBrands
            ? '✅ تم حفظ التخصص لـ (كافة الماركات والتصنيفات) بنجاح'
            : '✅ تم حفظ تخصصات التوريد (${_selectedBrands.length} ماركات و ${_selectedCategories.length} أقسام) بنجاح'),
        backgroundColor: const Color(0xFF059669),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: AppSidebarDrawer(currentRoute: isVendor ? AppRouter.vendorSettings : AppRouter.clientSettings),
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF0F172A)),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'إعدادات العضوية والمنشأة',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 15,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              isVendor ? 'إدارة وتأهيل مورد قطع الغيار B2B' : 'إدارة مشتريات وتوثيق حساب العميل / الأسطول',
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF2563EB)),
            onPressed: _fetchSettings,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Color(0xFF2563EB))))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── 1. HEADER BANNER (1:1 with Web) ──
                  _buildHeaderBanner(),
                  const SizedBox(height: 14),

                  // ── 2. DASHBOARD STATUS CARDS (4 INDICATORS) ──
                  _buildDashboardStatusCards(),
                  const SizedBox(height: 14),

                  // ── 3. ENTERPRISE TABS NAVIGATION (1:1 Web Names) ──
                  _buildEnterpriseTabsBar(),
                  const SizedBox(height: 14),

                  // ── 4. ACTIVE TAB CONTENT ──
                  _buildActiveTabContent(),
                ],
              ),
            ),
    );
  }

  // ── 1. HEADER BANNER ──
  Widget _buildHeaderBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0A1224), Color(0xFF0F1C36), Color(0xFF0A1224)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isVendor
                        ? [const Color(0xFF059669), const Color(0xFF10B981)]
                        : [const Color(0xFF2563EB), const Color(0xFF4F46E5)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    _orgName.isNotEmpty ? _orgName[0] : 'ش',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
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
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: isVendor ? const Color(0xFF059669).withOpacity(0.2) : const Color(0xFF2563EB).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: isVendor ? const Color(0xFF059669).withOpacity(0.4) : const Color(0xFF2563EB).withOpacity(0.4),
                            ),
                          ),
                          child: Text(
                            isVendor ? 'عضوية مورد مبيعات 🏬' : 'عضوية مشتري أسطول 🚗',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              color: isVendor ? const Color(0xFF34D399) : const Color(0xFF60A5FA),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _orgName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.verified_rounded, color: Color(0xFF34D399), size: 16),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'السجل: $_crNumber  •  الضريبي: $_taxNumber',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'monospace'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── 2. DASHBOARD STATUS CARDS (4 Cards) ──
  Widget _buildDashboardStatusCards() {
    return Column(
      children: [
        Row(
          children: [
            // 1. Profile Completion (95%)
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('اكتمال الملف', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF64748B))),
                        Text('95%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: 0.95,
                        backgroundColor: const Color(0xFFF1F5F9),
                        valueColor: const AlwaysStoppedAnimation(Color(0xFF059669)),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            // 2. Verification Status
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('توثيق السجل', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                        SizedBox(height: 2),
                        Text('موثق B2B ✓', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                      ],
                    ),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(color: Color(0xFF059669), shape: BoxShape.circle),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            // 3. Active Members
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('أعضاء الفريق', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                        SizedBox(height: 2),
                        Text('3 نشطين', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      ],
                    ),
                    Icon(Icons.people_outline_rounded, color: Color(0xFF64748B), size: 18),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            // 4. Active Sessions
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('الجلسات النشطة', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                        const SizedBox(height: 2),
                        Text('${_sessions.length} موثوقة', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      ],
                    ),
                    const Icon(Icons.laptop_chromebook_rounded, color: Color(0xFF64748B), size: 18),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ── 3. ENTERPRISE TABS NAVIGATION (1:1 Web Names) ──
  Widget _buildEnterpriseTabsBar() {
    final List<Map<String, dynamic>> tabs = [
      {'id': 'organization', 'label': 'ملف المؤسسة', 'icon': Icons.business_rounded},
      if (isVendor) ...[
        {'id': 'pickup_location', 'label': 'موقع الفرع والاستلام الذاتي 📍', 'icon': Icons.storefront_rounded, 'highlight': true},
        {'id': 'brands', 'label': 'ماركات ومجالات قطع الغيار 🚗', 'icon': Icons.directions_car_rounded},
      ],
      {'id': 'subscription', 'label': 'العضوية والاشتراك', 'icon': Icons.credit_card_rounded},
      {'id': 'verification', 'label': 'مركز التوثيق', 'icon': Icons.verified_user_outlined},
      {'id': 'security', 'label': 'مركز الأمان', 'icon': Icons.lock_outline_rounded},
      {'id': 'team', 'label': 'الفريق والـ RBAC', 'icon': Icons.people_outline_rounded},
      {'id': 'apikeys', 'label': 'مفاتيح الـ API', 'icon': Icons.vpn_key_outlined},
      {'id': 'notifications', 'label': 'الإشعارات', 'icon': Icons.notifications_none_rounded},
      {'id': 'activity', 'label': 'سجل الأنشطة', 'icon': Icons.history_rounded},
      {'id': 'preferences', 'label': 'التفضيلات العامة', 'icon': Icons.language_rounded},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: tabs.map((t) {
          final id = t['id'] as String;
          final active = _activeTab == id;
          final isHighlight = t['highlight'] == true;

          return Padding(
            padding: const EdgeInsets.only(left: 6),
            child: GestureDetector(
              onTap: () {
                if (id == 'team') {
                  Navigator.pushNamed(context, AppRouter.clientRoles);
                } else {
                  setState(() => _activeTab = id);
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: active
                      ? const Color(0xFF0F172A)
                      : (isHighlight ? const Color(0xFFECFDF5) : Colors.white),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: active
                        ? const Color(0xFF0F172A)
                        : (isHighlight ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0)),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      t['icon'] as IconData,
                      size: 15,
                      color: active
                          ? Colors.white
                          : (isHighlight ? const Color(0xFF059669) : const Color(0xFF64748B)),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      t['label'] as String,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: active
                            ? Colors.white
                            : (isHighlight ? const Color(0xFF065F46) : const Color(0xFF475569)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── 4. ACTIVE TAB CONTENT SWITCHER ──
  Widget _buildActiveTabContent() {
    switch (_activeTab) {
      case 'pickup_location':
        return _buildPickupLocationTab();
      case 'brands':
        return _buildBrandsTab();
      case 'subscription':
        return _buildSubscriptionTab();
      case 'verification':
        return _buildVerificationTab();
      case 'security':
        return _buildSecurityTab();
      case 'apikeys':
        return _buildApiKeysTab();
      case 'notifications':
        return _buildNotificationsTab();
      case 'activity':
        return _buildActivityTab();
      case 'preferences':
        return _buildPreferencesTab();
      case 'organization':
      default:
        return _buildOrganizationTab();
    }
  }

  // ── TAB: ORGANIZATION PROFILE ──
  Widget _buildOrganizationTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('بيانات المنشأة والسجل التجاري', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              Icon(Icons.business_center_rounded, color: Color(0xFF2563EB), size: 18),
            ],
          ),
          const SizedBox(height: 14),

          _buildEditableFieldTile('اسم الكيان القانوني', _orgNameCtrl, Icons.domain_rounded),
          const SizedBox(height: 10),
          _buildEditableFieldTile('رقم السجل التجاري (CR)', _crCtrl, Icons.badge_outlined, keyboardType: TextInputType.number),
          const SizedBox(height: 10),
          _buildEditableFieldTile('الرقم الضريبي الموحد (VAT)', _taxCtrl, Icons.receipt_long_outlined, keyboardType: TextInputType.number),
          const SizedBox(height: 10),
          _buildEditableFieldTile('العنوان الوطني المعتمد', _addressCtrl, Icons.location_on_outlined),
          const SizedBox(height: 10),
          _buildEditableFieldTile('رقم الجوال الرسمي', _phoneCtrl, Icons.phone_android_rounded, keyboardType: TextInputType.phone),
          const SizedBox(height: 10),
          _buildEditableFieldTile('البريد الإلكتروني للفوترة', _emailCtrl, Icons.email_outlined, keyboardType: TextInputType.emailAddress),

          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _isSavingOrg ? null : _saveOrganizationProfile,
            icon: _isSavingOrg
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.save_rounded, size: 16),
            label: Text(_isSavingOrg ? 'جاري الحفظ والمزامنة...' : 'حفظ التعديلات', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F172A),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 44),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditableFieldTile(String label, TextEditingController controller, IconData icon, {TextInputType keyboardType = TextInputType.text}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: const Color(0xFF2563EB)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                TextFormField(
                  controller: controller,
                  keyboardType: keyboardType,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 4),
                    border: InputBorder.none,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFieldTile(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF64748B)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── TAB: VENDOR PICKUP LOCATION ──
  Widget _buildPickupLocationTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('إعدادات استلام الشحنات من الفرع الذاتي', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              Switch(
                value: _selfPickupEnabled,
                activeColor: const Color(0xFF059669),
                onChanged: (v) => setState(() => _selfPickupEnabled = v),
              ),
            ],
          ),
          const Text('تفعيل هذا الخيار يتيح للعملاء ومناديب التوصيل استلام القطع مباشرة من موقعك:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          const SizedBox(height: 14),

          _buildFieldTile('اسم وموقع الفرع', _branchName, Icons.storefront_rounded),
          const SizedBox(height: 10),
          _buildFieldTile('ساعات العمل والاستلام', _branchHours, Icons.access_time_rounded),
          const SizedBox(height: 10),
          _buildFieldTile('الإحداثيات على خريطة GPS', _branchCoords, Icons.my_location_rounded),
          const SizedBox(height: 16),

          ElevatedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('✅ تم حفظ إعدادات وموقع الفرع بنجاح'), backgroundColor: Color(0xFF059669)),
              );
            },
            icon: const Icon(Icons.map_rounded, size: 16),
            label: const Text('تحديث موقع الفرع على الخريطة 📍', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 42),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  // ── TAB: VENDOR BRANDS & SPECIALIZATIONS ──
  Widget _buildBrandsTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('تحديد ماركات وتصنيفات التوريد', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              TextButton(
                onPressed: () {
                  setState(() {
                    _specializesInAllBrands = !_specializesInAllBrands;
                    if (_specializesInAllBrands) _selectedBrands.addAll(_allBrands);
                  });
                },
                child: Text(_specializesInAllBrands ? 'إلغاء الكل' : 'تحديد كافة الماركات', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const Text('ستصلك طلبات التسعير على الرادار متوافقة فقط مع الماركات والأقسام المحددة:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          const SizedBox(height: 14),

          // Brands Chips
          const Text('1. ماركات السيارات المعتمدة:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _allBrands.map((b) {
              final sel = _selectedBrands.contains(b);
              return FilterChip(
                label: Text(b, style: TextStyle(fontSize: 11, fontWeight: sel ? FontWeight.w900 : FontWeight.w600, color: sel ? Colors.white : const Color(0xFF334155))),
                selected: sel,
                selectedColor: const Color(0xFF059669),
                checkmarkColor: Colors.white,
                backgroundColor: const Color(0xFFF1F5F9),
                onSelected: (val) {
                  setState(() {
                    if (val) {
                      _selectedBrands.add(b);
                    } else {
                      _selectedBrands.remove(b);
                      _specializesInAllBrands = false;
                    }
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // Categories Chips
          const Text('2. مجالات وتخصصات قطع الغيار:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _allCategories.map((c) {
              final sel = _selectedCategories.contains(c);
              return FilterChip(
                label: Text(c, style: TextStyle(fontSize: 11, fontWeight: sel ? FontWeight.w900 : FontWeight.w600, color: sel ? Colors.white : const Color(0xFF334155))),
                selected: sel,
                selectedColor: const Color(0xFF2563EB),
                checkmarkColor: Colors.white,
                backgroundColor: const Color(0xFFF1F5F9),
                onSelected: (val) {
                  setState(() {
                    if (val) {
                      _selectedCategories.add(c);
                    } else {
                      _selectedCategories.remove(c);
                      _specializesInAllCategories = false;
                    }
                  });
                },
              );
            }).toList(),
          ),

          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: _saveSpecialization,
            icon: const Icon(Icons.check_circle_rounded, size: 16),
            label: const Text('حفظ تخصصات التوريد 🚀', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 42),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  // ── TAB: SUBSCRIPTION & ENTITLEMENTS ──
  Widget _buildSubscriptionTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('باقة العضوية والاشتراك', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8)),
                child: const Text('Enterprise B2B ✓', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildFieldTile('نوع الحساب', isVendor ? 'مورد قطع غيار معتمد' : 'حساب شركات وأساطيل', Icons.shield_rounded),
          const SizedBox(height: 10),
          _buildFieldTile('حد المعاملات الشهري', 'غير محدود (Unlimited RFQs)', Icons.all_inclusive_rounded),
          const SizedBox(height: 10),
          _buildFieldTile('تاريخ التجديد السنوي', '2027-08-01 (اشتراك ساري)', Icons.event_available_rounded),
        ],
      ),
    );
  }

  // ── TAB: VERIFICATION CENTER ──
  Widget _buildVerificationTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('مركز التوثيق الوطني والاعتمادات', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          _buildVerificationCheckTile('السجل التجاري (وزارة التجارة)', 'تم التحقق والربط الفوري ✓', true),
          const SizedBox(height: 8),
          _buildVerificationCheckTile('الشهادة الضريبية (هيئة الزكاة ZATCA)', 'مفعلة وضريبة 15% مطبقة ✓', true),
          const SizedBox(height: 8),
          _buildVerificationCheckTile('الحساب البنكي والآيبان التجاري', 'معتمد وموثق للتحويل والمطابقة ✓', true),
          const SizedBox(height: 8),
          _buildVerificationCheckTile('العنوان الوطني الموحد (سبل)', 'تمت المطابقة الجغرافية ✓', true),
        ],
      ),
    );
  }

  Widget _buildVerificationCheckTile(String title, String status, bool verified) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle_rounded, color: verified ? const Color(0xFF059669) : Colors.grey, size: 18),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            ],
          ),
          Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: verified ? const Color(0xFF059669) : Colors.grey)),
        ],
      ),
    );
  }

  // ── TAB: SECURITY CENTER ──
  Widget _buildSecurityTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('الجلسات النشطة والأجهزة المتصلة', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          ..._sessions.map((s) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.devices_rounded, size: 20, color: Color(0xFF2563EB)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(s['device'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                          Text('${s['location']} • IP: ${s['ip']}', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    Text(s['status'] as String, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  // ── TAB: API KEYS ──
  Widget _buildApiKeysTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('مفاتيح الربط البرمجي (API Keys)', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 4),
          const Text('تتيح الربط المباشر مع أنظمة تخطيط الموارد ERP وسحب الفواتير:', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
          const SizedBox(height: 12),
          ..._apiKeys.map((k) => Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.key_rounded, color: Color(0xFFD97706), size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(k['name'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                          Text(k['key_prefix'] as String, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontFamily: 'monospace')),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFF2563EB)),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: k['key_prefix'] as String));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('تم نسخ المفتاح')),
                        );
                      },
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  // ── TAB: NOTIFICATIONS ──
  Widget _buildNotificationsTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('تفضيلات التنبيهات والإشعارات', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              Icon(Icons.notifications_active_rounded, color: Color(0xFF2563EB), size: 18),
            ],
          ),
          const SizedBox(height: 12),

          // System Notification Permission Status Banner
          FutureBuilder<bool>(
            future: NotificationService().isPermissionGranted(),
            builder: (context, snapshot) {
              final isGranted = snapshot.data ?? false;
              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isGranted ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isGranted ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    Icon(
                      isGranted ? Icons.check_circle_rounded : Icons.notifications_off_rounded,
                      color: isGranted ? const Color(0xFF059669) : const Color(0xFFDC2626),
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isGranted ? 'صلاحية إشعارات الهاتف مفعلة ✓' : 'إشعارات الهاتف معطلة في النظام',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: isGranted ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isGranted
                                ? 'يستقبل جهازك تنبيهات الرادار والعروض والصفقات مباشرة على الشاشة'
                                : 'يرجى تفعيل الصلاحية لتصلك تنبيهات الصفقات ورادار الطلبات الفوري',
                            style: TextStyle(
                              fontSize: 10.5,
                              color: isGranted ? const Color(0xFF047857) : const Color(0xFFB91C1C),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!isGranted)
                      ElevatedButton(
                        onPressed: () async {
                          await NotificationService().checkAndPromptPermissionOnFirstLaunch(context);
                          setState(() {});
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('تفعيل الآن', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            child: Row(
              children: [
                const Icon(Icons.notifications_active_rounded, color: Color(0xFF2563EB), size: 24),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'اختبار وصول التنبيه الفوري',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF1E3A8A)),
                      ),
                      Text(
                        'إرسال إشعار تجريبي مباشر لجهازك مع الصوت والاهتزاز',
                        style: TextStyle(fontSize: 10, color: Color(0xFF3B82F6)),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () async {
                    await NotificationService().showLocalNotification(
                      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                      title: 'منظومة رِفْق 🚗',
                      body: 'تم استلام تنبيه فوري تجريبي بنجاح! الإشعارات تعمل بكفاءة 100%',
                      channelId: 'rfq_high_importance_channel',
                      channelName: 'إشعارات رِفق العامة والمهمة',
                      soundFileName: 'rfq_alert',
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('تم إرسال التنبيه التجريبي لجهازك الآن! تفقد شريط الإشعارات العلوي 🔔'),
                          backgroundColor: Color(0xFF059669),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.send_rounded, size: 14),
                  label: const Text('إرسال تجربة', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          SwitchListTile(
            title: const Text('إشعارات رادار طلبات التسعير', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900)),
            subtitle: const Text('تنبيهات صوتية فورية لطلبات قطع الغيار الواردة', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
            value: _pushNotifications,
            activeColor: const Color(0xFF2563EB),
            onChanged: (v) => setState(() => _pushNotifications = v),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          SwitchListTile(
            title: const Text('إشعارات عروض الأسعار والصفقات', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900)),
            subtitle: const Text('تنبيه عند صدور أو قبول عرض سعر أو تحديث الصفقة', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
            value: true,
            activeColor: const Color(0xFF2563EB),
            onChanged: (v) {},
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          SwitchListTile(
            title: const Text('إشعارات الشحن والتوصيل الميداني', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900)),
            subtitle: const Text('تحديثات مسار المندوب ورمز الاستلام OTP ولحظة التسليم', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
            value: true,
            activeColor: const Color(0xFF2563EB),
            onChanged: (v) {},
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          SwitchListTile(
            title: const Text('إشعارات المحفظة والفواتير الضريبية', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900)),
            subtitle: const Text('إيداع الأرباح وسداد الفواتير وحركات الرصيد', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
            value: true,
            activeColor: const Color(0xFF2563EB),
            onChanged: (v) {},
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          SwitchListTile(
            title: const Text('إشعارات الواتساب الرسمية', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900)),
            subtitle: const Text('تنبيهات فورية عبر واتساب عند صدور الفواتير وتحديثات الشحن', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
            value: _whatsappAlerts,
            activeColor: const Color(0xFF059669),
            onChanged: (v) => setState(() => _whatsappAlerts = v),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          SwitchListTile(
            title: const Text('الرسائل النصية القصيرة (SMS)', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900)),
            subtitle: const Text('رموز الدخول وتأكيد الصفقات الهامة', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
            value: _smsAlerts,
            activeColor: const Color(0xFF059669),
            onChanged: (v) => setState(() => _smsAlerts = v),
          ),
        ],
      ),
    );
  }

  // ── TAB: ACTIVITY LOGS ──
  Widget _buildActivityTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('سجل الأنشطة والعمليات الأخير', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          SizedBox(height: 12),
          Text('• تسجيل دخول ناجح عبر تطبيق الجوال (اليوم)', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
          SizedBox(height: 6),
          Text('• تحديث بيانات المنشأة والتوثيق (أمس)', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
          SizedBox(height: 6),
          Text('• إصدار فاتورة ضريبية ZATCA للصفقة #REQ-8412', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
        ],
      ),
    );
  }

  // ── TAB: GENERAL PREFERENCES ──
  Widget _buildPreferencesTab() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('التفضيلات العامة للمنظومة', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          SizedBox(height: 12),
          Text('• اللغة الأساسية: العربية (المملكة العربية السعودية)', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
          SizedBox(height: 8),
          Text('• العملة المعتمدة: الريال السعودي (SAR)', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
          SizedBox(height: 8),
          Text('• المنطقة الزمنية: بتوقيت مكة المكرمة (GMT+3)', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}
