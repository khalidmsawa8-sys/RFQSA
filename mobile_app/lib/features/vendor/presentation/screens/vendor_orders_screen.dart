import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/core/utils/id_utils.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_navigation_drawer.dart';

/// Vendor Orders, Quoted RFQs & Operations Management Screen (1:1 Web Parity)
class VendorOrdersScreen extends StatefulWidget {
  const VendorOrdersScreen({super.key});

  @override
  State<VendorOrdersScreen> createState() => _VendorOrdersScreenState();
}

class _VendorOrdersScreenState extends State<VendorOrdersScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  String _activeTab = 'all'; // all, rfq, active, completed, closed
  String _search = '';
  bool _isLoading = true;

  List<RfqModel> _rfqs = [];
  List<Map<String, dynamic>> _orders = [];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      // Fetch open RFQs and Vendor Orders in parallel
      final rfqsFuture = ApiClient.instance.get(ApiEndpoints.rfqs);
      final ordersFuture = ApiClient.instance.get(ApiEndpoints.orders);

      final results = await Future.wait([rfqsFuture, ordersFuture]);
      final rfqsRes = results[0];
      final ordersRes = results[1];

      List<RfqModel> parsedRfqs = [];
      final rawRfqs = rfqsRes.data is List
          ? rfqsRes.data as List
          : (rfqsRes.data is Map && (rfqsRes.data as Map)['rfqs'] is List)
              ? (rfqsRes.data as Map)['rfqs'] as List
              : (rfqsRes.data is Map && (rfqsRes.data as Map)['data'] is List)
                  ? (rfqsRes.data as Map)['data'] as List
                  : [];
      parsedRfqs = rawRfqs.map((e) => RfqModel.fromJson(e as Map<String, dynamic>)).toList();

      List<Map<String, dynamic>> parsedOrders = [];
      final rawOrders = ordersRes.data is List
          ? ordersRes.data as List
          : (ordersRes.data is Map && (ordersRes.data as Map)['orders'] is List)
              ? (ordersRes.data as Map)['orders'] as List
              : (ordersRes.data is Map && (ordersRes.data as Map)['data'] is List)
                  ? (ordersRes.data as Map)['data'] as List
                  : [];
      parsedOrders = rawOrders.map<Map<String, dynamic>>((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).toList();

      if (mounted) {
        setState(() {
          _rfqs = parsedRfqs;
          _orders = parsedOrders;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── ADVANCE ORDER STATUS (Vendor Workflow 1:1 with Web) ──
  Future<void> _advanceOrderStatus(String orderId, String targetStatus, {String? otpCode}) async {
    try {
      final cleanId = orderId.replaceFirst('ORD-', '').replaceFirst('REQ-', '');
      final res = await ApiClient.instance.post(
        '/v1/vendor/orders/$cleanId/status',
        data: {
          'targetStatus': targetStatus,
          if (otpCode != null) 'otpCode': otpCode.trim(),
        },
      );

      if (res.success) {
        String msg = '✅ تم تحديث حالة الطلب بنجاح';
        if (targetStatus == 'ready' || targetStatus == 'ready_for_pickup') {
          msg = '✅ تم تأكيد جاهزية الطلب للتسليم بنجاح 📦';
        } else if (targetStatus == 'shipped' || targetStatus == 'in_transit') {
          msg = '✅ تم تأكيد تسليم الشحنة لمندوب التوصيل 🚚';
        } else if (targetStatus == 'picked_up' || targetStatus == 'completed') {
          msg = '✅ تم تأكيد استلام الطلب من الفرع بنجاح وإيداع المستحقات بمحفظتك! 🎉';
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg), backgroundColor: const Color(0xFF059669)),
          );
        }
        _fetchData();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(res.message ?? 'تعذر تحديث حالة الطلب'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('حدث خطأ أثناء التحديث: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // ── OTP VERIFICATION DIALOG FOR BRANCH PICKUP ──
  Future<void> _showOtpVerificationDialog(String orderId, String displayId) async {
    final otpController = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.storefront_rounded, color: Color(0xFF059669), size: 22),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'تسليم الطلب من الفرع',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'الرجاء إدخال رمز التحقق OTP المكون من 4 أرقام الذي يظهره العميل على شاشته لتأكيد الاستلام وإيداع المبلغ بمحفظتك.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 4,
                    textAlign: TextAlign.center,
                    autofocus: true,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 12,
                      fontFamily: 'monospace',
                      color: Color(0xFF0F172A),
                    ),
                    decoration: InputDecoration(
                      counterText: '',
                      hintText: '••••',
                      hintStyle: const TextStyle(letterSpacing: 8, color: Color(0xFFCBD5E1)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF059669), width: 2),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('إلغاء', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                ),
                ElevatedButton.icon(
                  onPressed: () async {
                    final code = otpController.text.trim();
                    if (code.length < 4) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('يرجى إدخال الرمز المكون من 4 أرقام كاملة'), backgroundColor: Colors.red),
                      );
                      return;
                    }
                    Navigator.pop(ctx);
                    await _advanceOrderStatus(orderId, 'completed', otpCode: code);
                  },
                  icon: const Icon(Icons.check_circle_rounded, size: 16),
                  label: const Text('تأكيد التسليم بالفرع ✅', style: TextStyle(fontWeight: FontWeight.w900)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _makeCall(String phone) async {
    final cleanPhone = phone.trim().replaceAll(' ', '').replaceAll('-', '');
    if (cleanPhone.isEmpty) return;
    final uri = Uri.parse('tel:$cleanPhone');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (_) {}
  }

  // ── BUILD UNIFIED VENDOR ROWS ──
  List<_UnifiedVendorItem> get _allRows {
    final List<_UnifiedVendorItem> rows = [];

    // Map Orders
    for (final o in _orders) {
      final rawId = o['id']?.toString() ?? '';
      final shortId = IdUtils.safeShortId(rawId, prefix: 'ORD-');
      final rfq = o['rfqs'] ?? o['rfq'] ?? {};
      final client = o['client'] ?? o['profiles'] ?? {};
      final tot = double.tryParse(o['total_price']?.toString() ?? o['total_amount']?.toString() ?? '0') ?? 0.0;
      final st = o['status']?.toString() ?? 'preparing';

      String partsSummary = rfq['parts_description']?.toString() ?? 'قطع غيار سيارات معتمدة';
      try {
        final decoded = jsonDecode(partsSummary);
        if (decoded is List) {
          partsSummary = decoded.map((e) => e['partName'] ?? e['name'] ?? '').join(' ، ');
        }
      } catch (_) {}

      rows.add(_UnifiedVendorItem(
        rawId: rawId,
        displayId: 'ORD-$shortId',
        itemType: 'order',
        carMake: rfq['car_make']?.toString() ?? 'تويوتا',
        carModel: rfq['car_model']?.toString() ?? 'كامري',
        carYear: rfq['car_year']?.toString() ?? '2023',
        plateNumber: rfq['plate_number']?.toString() ?? '—',
        vin: rfq['vin']?.toString() ?? '—',
        partsText: partsSummary,
        partsCount: 1,
        deliveryLocation: rfq['delivery_location']?.toString() ?? 'الرياض',
        clientName: client['company_name'] ?? client['full_name'] ?? 'عميل رفق المعتمد',
        clientPhone: client['phone']?.toString() ?? '0501234567',
        amount: tot,
        status: st,
        createdAt: o['created_at'] != null ? DateTime.tryParse(o['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
        rawOrder: o,
      ));
    }

    // Map RFQs (Targeted Private RFQs, Quoted RFQs, or General Market RFQs)
    for (final rfq in _rfqs) {
      final isPrivateTargeted = rfq.rfqType == 'private' || (rfq.targetVendorId != null && rfq.targetVendorId!.isNotEmpty);
      final hasQuote = rfq.quotes != null && rfq.quotes!.isNotEmpty;
      if (!isPrivateTargeted && !hasQuote) {
        continue;
      }

      final shortId = IdUtils.safeShortId(rfq.id, prefix: 'RFQ-');
      final status = rfq.status;

      rows.add(_UnifiedVendorItem(
        rawId: rfq.id,
        displayId: 'RFQ-$shortId',
        itemType: 'rfq',
        carMake: rfq.carMake,
        carModel: rfq.carModel,
        carYear: rfq.carYear.toString(),
        plateNumber: rfq.plateNumber ?? '—',
        vin: rfq.vin ?? '—',
        partsText: rfq.items.map((e) => e.partName).join(' ، '),
        partsCount: rfq.items.length,
        deliveryLocation: '${rfq.deliveryCity} — ${rfq.deliveryLocation}',
        clientName: rfq.clientName ?? 'شركة مشتريات (عميل B2B)',
        amount: hasQuote ? rfq.quotes!.first.totalPrice : null,
        status: hasQuote ? 'quoted' : (status == 'open' ? 'open' : status),
        createdAt: rfq.createdAt,
        rawRfq: rfq,
      ));
    }

    // Sort newest first
    rows.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return rows;
  }

  // ── KPI COUNTS (1:1 with Web & Client parity) ──
  int get _countRfq => _allRows.where((r) => r.itemType == 'rfq' && (r.status == 'open' || r.status == 'quoted' || r.status == 'pending') && !r.isExpired).length;
  int get _countActive => _allRows.where((r) => r.itemType == 'order' && !['completed', 'closed', 'received', 'cancelled', 'rejected', 'expired'].contains(r.status)).length;
  int get _countCompleted => _allRows.where((r) => r.itemType == 'order' && (r.status == 'completed' || r.status == 'received')).length;
  int get _countClosed => _allRows.where((r) => r.status == 'closed' || r.status == 'expired' || r.status == 'cancelled' || r.status == 'rejected' || (r.itemType == 'rfq' && r.isExpired)).length;
  double get _completedAmount => _allRows
      .where((r) => r.itemType == 'order' && (r.status == 'completed' || r.status == 'received'))
      .fold<double>(0.0, (sum, r) => sum + (r.amount ?? 0.0));

  // ── FILTERED ROWS ──
  List<_UnifiedVendorItem> get _filteredRows {
    final q = _search.trim().toLowerCase();
    return _allRows.where((row) {
      // Tab matching
      if (_activeTab == 'rfq') {
        if (row.itemType != 'rfq' || (row.status != 'open' && row.status != 'quoted' && row.status != 'pending') || row.isExpired) return false;
      }
      if (_activeTab == 'active') {
        if (row.itemType != 'order' || ['completed', 'closed', 'received', 'cancelled', 'rejected', 'expired'].contains(row.status)) return false;
      }
      if (_activeTab == 'completed') {
        if (row.itemType != 'order' || (row.status != 'completed' && row.status != 'received')) return false;
      }
      if (_activeTab == 'closed') {
        if (row.status != 'closed' && row.status != 'expired' && row.status != 'cancelled' && row.status != 'rejected' && !row.isExpired) return false;
      }

      // Search matching
      if (q.isNotEmpty) {
        final match = '${row.displayId} ${row.carMake} ${row.carModel} ${row.plateNumber} ${row.vin} ${row.partsText} ${row.clientName ?? ""}'.toLowerCase();
        if (!match.contains(q)) return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: const WebNavigationDrawer(
        activeRoute: AppRouter.vendorOrders,
        role: 'vendor',
      ),
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
          children: const [
            Text(
              'إدارة الطلبات والمبيعات',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 15,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              'متابعة طلبات التسعير، تنفيذ الأوامر، ومراقبة المبيعات',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF059669)),
            onPressed: _fetchData,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: ElevatedButton.icon(
              onPressed: () => Navigator.pushNamed(context, AppRouter.vendorRadar),
              icon: const Icon(Icons.radar_rounded, size: 16),
              label: const Text('رادار السوق', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
      body: _isLoading && _rfqs.isEmpty && _orders.isEmpty
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
          : RefreshIndicator(
              color: const Color(0xFF059669),
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. KPI Cards Grid
                    _buildVendorKpiCards(),
                    const SizedBox(height: 14),

                    // 2. Tabs Bar + Search Box
                    _buildVendorTabsAndSearch(),
                    const SizedBox(height: 14),

                    // 3. Unified Cards List
                    if (_filteredRows.isEmpty)
                      _buildEmptyState()
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _filteredRows.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (ctx, idx) => _buildUnifiedVendorCard(_filteredRows[idx]),
                      ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
    );
  }

  // ── KPI CARDS GRID (1:1 with Web & Client) ──
  Widget _buildVendorKpiCards() {
    return Column(
      children: [
        Row(
          children: [
            // KPI 1: RFQ Available (Amber)
            Expanded(
              child: _buildVendorKpiCard(
                title: 'طلبات التسعير (RFQ)',
                count: '$_countRfq',
                subtext: 'جاهزة لتقديم عروض الأسعار',
                icon: Icons.description_outlined,
                gradientColors: [const Color(0xFFF59E0B), const Color(0xFFD97706)],
                bgTint: const Color(0xFFFFFBEB),
                borderColor: const Color(0xFFFDE68A),
                isActive: _activeTab == 'rfq',
                onTap: () => setState(() => _activeTab = _activeTab == 'rfq' ? 'all' : 'rfq'),
              ),
            ),
            const SizedBox(width: 10),
            // KPI 2: Active Orders (Blue)
            Expanded(
              child: _buildVendorKpiCard(
                title: 'الطلبات النشطة',
                count: '$_countActive',
                subtext: 'قيد التجهيز والشحن',
                icon: Icons.local_shipping_outlined,
                gradientColors: [const Color(0xFF2563EB), const Color(0xFF1D4ED8)],
                bgTint: const Color(0xFFEFF6FF),
                borderColor: const Color(0xFFBFDBFE),
                isActive: _activeTab == 'active',
                onTap: () => setState(() => _activeTab = _activeTab == 'active' ? 'all' : 'active'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            // KPI 3: Completed Orders (Emerald)
            Expanded(
              child: _buildVendorKpiCard(
                title: 'الطلبات المكتملة',
                count: '$_countCompleted',
                subtext: _completedAmount > 0 ? CurrencyFormatter.format(_completedAmount) : 'أوامر تم استلامها بنجاح',
                icon: Icons.check_circle_outline_rounded,
                gradientColors: [const Color(0xFF059669), const Color(0xFF047857)],
                bgTint: const Color(0xFFECFDF5),
                borderColor: const Color(0xFFA7F3D0),
                isActive: _activeTab == 'completed',
                onTap: () => setState(() => _activeTab = _activeTab == 'completed' ? 'all' : 'completed'),
              ),
            ),
            const SizedBox(width: 10),
            // KPI 4: Closed & Cancelled (Slate)
            Expanded(
              child: _buildVendorKpiCard(
                title: 'المغلقة والملغاة',
                count: '$_countClosed',
                subtext: 'طلبات منتهية أو ملغاة',
                icon: Icons.cancel_outlined,
                gradientColors: [const Color(0xFF475569), const Color(0xFF334155)],
                bgTint: const Color(0xFFF1F5F9),
                borderColor: const Color(0xFFCBD5E1),
                isActive: _activeTab == 'closed',
                onTap: () => setState(() => _activeTab = _activeTab == 'closed' ? 'all' : 'closed'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildVendorKpiCard({
    required String title,
    required String count,
    required String subtext,
    required IconData icon,
    required List<Color> gradientColors,
    required Color bgTint,
    required Color borderColor,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isActive ? bgTint : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive ? gradientColors[0] : borderColor,
            width: isActive ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isActive ? 0.06 : 0.02),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: gradientColors),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: Colors.white, size: 14),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              count,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 2),
            Text(
              subtext,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  // ── VENDOR TABS AND SEARCH (1:1 Web Names) ──
  Widget _buildVendorTabsAndSearch() {
    final tabs = [
      {'key': 'all', 'label': 'الكل (${_allRows.length})'},
      {'key': 'rfq', 'label': 'طلبات التسعير (RFQ) ($_countRfq)'},
      {'key': 'active', 'label': 'الطلبات النشطة ($_countActive)'},
      {'key': 'completed', 'label': 'الطلبات المكتملة ($_countCompleted)'},
      {'key': 'closed', 'label': 'المغلقة والملغاة ($_countClosed)'},
    ];

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          // Horizontal Tabs Pill Bar
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: tabs.map((t) {
                final active = _activeTab == t['key'];
                return Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: GestureDetector(
                    onTap: () => setState(() => _activeTab = t['key'] as String),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: active ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        t['label'] as String,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: active ? Colors.white : const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // Search Input
          TextField(
            onChanged: (val) => setState(() => _search = val),
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              hintText: 'ابحث برقم الطلب، اسم العميل، المركبة، VIN، أو اسم القطعة...',
              hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── UNIFIED VENDOR CARD ──
  Widget _buildUnifiedVendorCard(_UnifiedVendorItem item) {
    final isRfq = item.itemType == 'rfq';
    final isClosedOrCancelled = item.isExpired || item.status == 'closed' || item.status == 'cancelled' || item.status == 'expired';

    return GestureDetector(
      onTap: () {
        if (isRfq) {
          Navigator.pushNamed(
            context,
            AppRouter.vendorSubmitQuote,
            arguments: {'rfq': item.rawRfq},
          );
        } else {
          Navigator.pushNamed(
            context,
            AppRouter.clientOrderTracking,
            arguments: _makeOrderTrackingArgs(item),
          );
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isClosedOrCancelled
                ? const Color(0xFFFECACA)
                : isRfq
                    ? const Color(0xFFFDE68A)
                    : item.status == 'completed'
                        ? const Color(0xFFA7F3D0)
                        : const Color(0xFFCBD5E1),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.025),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Accent Strip
              Container(
                height: 3.5,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isClosedOrCancelled
                        ? [const Color(0xFFEF4444), const Color(0xFFDC2626)]
                        : isRfq
                            ? [const Color(0xFFF59E0B), const Color(0xFFD97706)]
                            : item.status == 'completed'
                                ? [const Color(0xFF059669), const Color(0xFF10B981)]
                                : [const Color(0xFF2563EB), const Color(0xFF4F46E5)],
                  ),
                ),
              ),

              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header: ID + Status
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            '#${item.displayId}',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              '${item.createdAt.year}/${item.createdAt.month.toString().padLeft(2, '0')}/${item.createdAt.day.toString().padLeft(2, '0')}',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                            ),
                            const SizedBox(width: 8),
                            // Status Pill
                            _buildVendorStatusPill(item),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Vehicle Details Row
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.directions_car_rounded, size: 16, color: Color(0xFF2563EB)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${item.carMake} ${item.carModel} (${item.carYear})',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Plate & VIN
                    Padding(
                      padding: const EdgeInsets.only(right: 30),
                      child: Text(
                        'اللوحة: ${item.plateNumber}  •  رقم الهيكل: ${item.vin}',
                        style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontFamily: 'monospace'),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Parts Box
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.build_circle_outlined, size: 16, color: Color(0xFF0284C7)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              item.partsText,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Footer Row: Location / Client & Price
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.business_rounded, size: 13, color: Color(0xFF94A3B8)),
                            const SizedBox(width: 4),
                            Text(
                              item.clientName ?? 'عميل موثق',
                              style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        if (item.amount != null)
                          Text(
                            CurrencyFormatter.format(item.amount!),
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                          )
                        else if (isRfq)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: const Text(
                              'بانتظار تسعيرتك',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                            ),
                          ),
                      ],
                    ),

                    // Stepper if order in progress
                    if (!isRfq && item.status != 'cancelled') ...[
                      const SizedBox(height: 10),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 8),
                      _buildVendorStepper(item.status, isPickup: item.isBranchPickup),
                    ],

                    const SizedBox(height: 10),
                    const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 8),

                    // Actions Row (Clean Full Width, No Headset Clutter)
                    if (isRfq) ...[
                      ElevatedButton.icon(
                        onPressed: isClosedOrCancelled
                            ? null
                            : () {
                                Navigator.pushNamed(
                                  context,
                                  AppRouter.vendorSubmitQuote,
                                  arguments: {'rfq': item.rawRfq},
                                );
                              },
                        icon: Icon(isClosedOrCancelled ? Icons.lock_clock_rounded : Icons.flash_on_rounded, size: 15),
                        label: Text(
                          isClosedOrCancelled ? 'انتهت مهلة هذا الطلب 🔒' : 'تقديم عرض سعر سريع ⚡',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isClosedOrCancelled ? const Color(0xFF94A3B8) : const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFE2E8F0),
                          disabledForegroundColor: const Color(0xFF94A3B8),
                          minimumSize: const Size(double.infinity, 38),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                      ),
                    ] else ...[
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (item.status == 'pending') ...[
                            ElevatedButton.icon(
                              onPressed: () => _advanceOrderStatus(item.rawId, 'preparing'),
                              icon: const Icon(Icons.inventory_2_rounded, size: 14),
                              label: Text(
                                item.isBranchPickup ? 'بدء تجهيز وفحص القطع بالفرع 📦' : 'بدء تجهيز وفحص القطع 📦',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2563EB),
                                foregroundColor: Colors.white,
                                minimumSize: const Size(double.infinity, 38),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                            ),
                          ] else if (item.status == 'preparing' || item.status == 'confirmed') ...[
                            ElevatedButton.icon(
                              onPressed: () => _advanceOrderStatus(
                                item.rawId,
                                item.isBranchPickup ? 'ready_for_pickup' : 'ready',
                              ),
                              icon: const Icon(Icons.check_circle_rounded, size: 14),
                              label: Text(
                                item.isBranchPickup ? 'تأكيد الجاهزية للاستلام من الفرع 🏬' : 'تأكيد جاهزية الطلب للشحن 📦',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2563EB),
                                foregroundColor: Colors.white,
                                minimumSize: const Size(double.infinity, 38),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                            ),
                          ] else if ((item.status == 'ready_for_pickup' || item.status == 'ready') && item.isBranchPickup) ...[
                            ElevatedButton.icon(
                              onPressed: () => _showOtpVerificationDialog(item.rawId, item.displayId),
                              icon: const Icon(Icons.storefront_rounded, size: 14),
                              label: const Text('تسليم القطع للعميل بالفرع (رمز OTP) 🏬', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF059669),
                                foregroundColor: Colors.white,
                                minimumSize: const Size(double.infinity, 38),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                            ),
                          ] else if (item.status == 'ready' && !item.isBranchPickup) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFBBF7D0)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.inventory_2_rounded, size: 16, color: Color(0xFF16A34A)),
                                  SizedBox(width: 6),
                                  Text(
                                    'تم التجهيز • بانتظار استلام مندوب أسطول رفق 🚚',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF15803D)),
                                  ),
                                ],
                              ),
                            ),
                          ] else if (item.status == 'assigned') ...[
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEEF2FF),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFC7D2FE)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.person_pin_circle_rounded, size: 16, color: Color(0xFF4F46E5)),
                                  SizedBox(width: 6),
                                  Text(
                                    'تم إسناد الشحنة لمندوب التوصيل وهو في الطريق إليكم 📍',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF4338CA)),
                                  ),
                                ],
                              ),
                            ),
                          ] else if (item.status == 'shipped' || item.status == 'in_transit') ...[
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFBFDBFE)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.local_shipping_rounded, size: 16, color: Color(0xFF2563EB)),
                                  SizedBox(width: 6),
                                  Text(
                                    'الشحنة في عهدة المندوب وجاري التوصيل للعميل 🚚',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF1E40AF)),
                                  ),
                                ],
                              ),
                            ),
                          ] else if (item.status == 'delivered') ...[
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check_circle_rounded, size: 16, color: Color(0xFF059669)),
                                  SizedBox(width: 6),
                                  Text(
                                    'وصلت الشحنة وبانتظار تأكيد الاستلام من العميل ⏳',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF047857)),
                                  ),
                                ],
                              ),
                            ),
                          ] else if (item.status == 'picked_up') ...[
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.storefront_rounded, size: 16, color: Color(0xFF059669)),
                                  SizedBox(width: 6),
                                  Text(
                                    'تم تسليم القطع للعميل وبانتظار الفحص والتأكيد النهائي ⏳',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF047857)),
                                  ),
                                ],
                              ),
                            ),
                          ] else ...[
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.verified_rounded, size: 16, color: Color(0xFF10B981)),
                                  SizedBox(width: 6),
                                  Text(
                                    'تم اكتمال الطلب واستلام الأرباح بنجاح ✅',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                flex: 3,
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.pushNamed(
                                      context,
                                      AppRouter.clientOrderTracking,
                                      arguments: _makeOrderTrackingArgs(item),
                                    );
                                  },
                                  icon: const Icon(Icons.receipt_long_rounded, size: 14),
                                  label: const Text('تفاصيل الطلب والفاتورة 📄', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF1B4D3E),
                                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                flex: 2,
                                child: ElevatedButton.icon(
                                  onPressed: () => _makeCall(item.clientPhone ?? '0501234567'),
                                  icon: const Icon(Icons.phone_in_talk_rounded, size: 14),
                                  label: const Text('اتصال 📞', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF2563EB),
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Map<String, dynamic> _makeOrderTrackingArgs(_UnifiedVendorItem item) {
    return {
      'orderId': item.rawId,
      'id': item.rawId,
      'status': item.status,
      'total_price': item.amount,
      'client_name': item.clientName,
      'customer_name': item.clientName,
      'client_phone': item.clientPhone,
      'customer_phone': item.clientPhone,
      'vendor_name': 'موقعي المعتمد',
      'parts_description': item.partsText,
      'delivery_location': item.deliveryLocation,
      'is_pickup': item.isBranchPickup,
      'fulfillment_method': item.isBranchPickup ? 'BRANCH_PICKUP' : 'DELIVERY',
      'fulfillment_type': item.isBranchPickup ? 'BRANCH_PICKUP' : 'DELIVERY',
      if (item.rawOrder != null) ...item.rawOrder!,
    };
  }

  // Vendor Status Pill
  Widget _buildVendorStatusPill(_UnifiedVendorItem item) {
    String label = 'مفتوح للتسعير';
    Color bg = const Color(0xFFFFFBEB);
    Color text = const Color(0xFF92400E);
    Color border = const Color(0xFFFDE68A);

    if (item.itemType == 'rfq') {
      if (item.isExpired || item.status == 'closed' || item.status == 'cancelled' || item.status == 'expired') {
        label = 'ملغي (انتهاء المهلة)';
        bg = const Color(0xFFFEF2F2);
        text = const Color(0xFF991B1B);
        border = const Color(0xFFFECACA);
      } else if (item.status == 'quoted') {
        label = 'تم تقديم تسعيرتك';
        bg = const Color(0xFFEFF6FF);
        text = const Color(0xFF1E40AF);
        border = const Color(0xFFBFDBFE);
      } else if (item.status == 'accepted') {
        label = 'تم قبول عرضك';
        bg = const Color(0xFFECFDF5);
        text = const Color(0xFF065F46);
        border = const Color(0xFFA7F3D0);
      }
    } else {
      if (item.status == 'cancelled' || item.status == 'expired' || item.status == 'rejected') {
        label = 'ملغي';
        bg = const Color(0xFFFEF2F2);
        text = const Color(0xFF991B1B);
        border = const Color(0xFFFECACA);
      } else if (item.status == 'preparing' || item.status == 'confirmed' || item.status == 'pending') {
        label = 'بانتظار تجهيز المورد';
        bg = const Color(0xFFFFFBEB);
        text = const Color(0xFF92400E);
        border = const Color(0xFFFDE68A);
      } else if (item.status == 'ready') {
        label = 'تم التجهيز';
        bg = const Color(0xFFEFF6FF);
        text = const Color(0xFF1E40AF);
        border = const Color(0xFFBFDBFE);
      } else if (item.status == 'shipped') {
        label = 'تم الشحن';
        bg = const Color(0xFFEEF2FF);
        text = const Color(0xFF4338CA);
        border = const Color(0xFFC7D2FE);
      } else if (item.status == 'delivered') {
        label = 'جاري التسليم';
        bg = const Color(0xFFF0FDFA);
        text = const Color(0xFF115E59);
        border = const Color(0xFF99F6E4);
      } else if (item.status == 'completed' || item.status == 'received') {
        label = 'مكتمل ومستلم';
        bg = const Color(0xFFECFDF5);
        text = const Color(0xFF065F46);
        border = const Color(0xFFA7F3D0);
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: text, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: text)),
        ],
      ),
    );
  }

  // Vendor Stepper
  Widget _buildVendorStepper(String status, {bool isPickup = false}) {
    int currentStep = 1;
    if (isPickup) {
      if (status == 'preparing' || status == 'processing') currentStep = 2;
      if (status == 'ready' || status == 'ready_for_pickup') currentStep = 3;
      if (status == 'completed' || status == 'received' || status == 'picked_up' || status == 'delivered') currentStep = 4;
    } else {
      if (status == 'ready' || status == 'processing') currentStep = 2;
      if (status == 'shipped' || status == 'delivered') currentStep = 3;
      if (status == 'completed' || status == 'received') currentStep = 4;
    }

    final steps = isPickup
        ? ['تم التأكيد', 'جاري التجهيز', 'جاهز بالفرع 🏬', 'تم الاستلام ✅']
        : ['تجهيز المورد', 'تم التجهيز', 'تم الشحن', 'مكتمل ومستلم'];

    return Row(
      children: List.generate(steps.length, (idx) {
        final stepNum = idx + 1;
        final isDone = stepNum <= currentStep;
        return Expanded(
          child: Row(
            children: [
              Container(
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  color: isDone ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: isDone
                      ? const Icon(Icons.check_rounded, size: 12, color: Colors.white)
                      : Text('$stepNum', style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  steps[idx],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: isDone ? FontWeight.w900 : FontWeight.w600,
                    color: isDone ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          const Icon(Icons.inventory_2_outlined, size: 48, color: Color(0xFF94A3B8)),
          const SizedBox(height: 12),
          const Text(
            'لا توجد عمليات مطابقة في هذا التبويب',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 6),
          const Text(
            'يمكنك متابعة رادار الطلبات الحية وتقديم عروض أسعار تنافسية فوراً',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushNamed(context, AppRouter.vendorRadar),
            icon: const Icon(Icons.radar_rounded, size: 16),
            label: const Text('استعراض رادار الطلبات ⚡'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}

class _UnifiedVendorItem {
  final String rawId;
  final String displayId;
  final String itemType; // rfq, order
  final String carMake;
  final String carModel;
  final String carYear;
  final String plateNumber;
  final String vin;
  final String partsText;
  final int partsCount;
  final String deliveryLocation;
  final String? clientName;
  final String? clientPhone;
  final double? amount;
  final String status;
  final DateTime createdAt;
  final RfqModel? rawRfq;
  final Map<String, dynamic>? rawOrder;

  const _UnifiedVendorItem({
    required this.rawId,
    required this.displayId,
    required this.itemType,
    required this.carMake,
    required this.carModel,
    required this.carYear,
    required this.plateNumber,
    required this.vin,
    required this.partsText,
    required this.partsCount,
    required this.deliveryLocation,
    this.clientName,
    this.clientPhone,
    this.amount,
    required this.status,
    required this.createdAt,
    this.rawRfq,
    this.rawOrder,
  });

  bool get isExpired {
    if (status == 'closed' || status == 'cancelled' || status == 'expired') return true;
    if (rawRfq != null) return rawRfq!.isExpired;
    return false;
  }

  bool get isBranchPickup {
    if (rawOrder == null) return false;
    final rfq = rawOrder?['rfqs'] ?? rawOrder?['rfq'] ?? {};
    final rawFulfillment = (rawOrder?['fulfillment_method'] ??
            rawOrder?['fulfillment_type'] ??
            rfq['fulfillment_method'] ??
            rawOrder?['delivery_method'] ??
            rfq['delivery_method'] ??
            '')
        .toString()
        .toLowerCase();
    final isExplicitDelivery = rawFulfillment == 'delivery' ||
        rawFulfillment == 'courier' ||
        rawFulfillment == 'shipping' ||
        rawOrder?['is_pickup'] == false;
    if (isExplicitDelivery) return false;
    return rawOrder?['is_pickup'] == true ||
        rawFulfillment == 'branch_pickup' ||
        rawFulfillment == 'pickup' ||
        rawFulfillment == 'self_pickup';
  }
}
