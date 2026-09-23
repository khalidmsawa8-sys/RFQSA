import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/core/utils/id_utils.dart';
import 'package:rfqsa_mobile/features/client/repositories/client_repository.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_navigation_drawer.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/part_details_sheet.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/support_chat_modal.dart';

/// Unified Client Orders Hub (1:1 Web Parity with app/client/orders/orders-client.tsx)
class ClientOrdersScreen extends StatefulWidget {
  final ClientRepository clientRepository;

  const ClientOrdersScreen({super.key, required this.clientRepository});

  @override
  State<ClientOrdersScreen> createState() => _ClientOrdersScreenState();
}

class _ClientOrdersScreenState extends State<ClientOrdersScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  List<RfqModel> _rfqs = [];
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _activeTab = 'all'; // all, rfq, active, completed, closed

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final rfqsRes = await widget.clientRepository.fetchMyRfqs();
      final ordersRes = await widget.clientRepository.fetchOrders();

      if (mounted) {
        setState(() {
          _rfqs = rfqsRes.data ?? [];
          _orders = ordersRes.data ?? [];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── REACTIVATE RFQ HANDLER (1:1 with Web handleReactivateRfq) ──
  Future<void> _handleReactivateRfq(RfqModel rfq) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.refresh_rounded, color: Color(0xFFD97706)),
            SizedBox(width: 8),
            Text('إعادة تنشيط الطلب', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          ],
        ),
        content: Text(
          'هل ترغب في إعادة طرح طلب التسعير #${rfq.shortId} في سوق الموردين مجدداً لمدة 20 دقيقة إضافية؟',
          style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFD97706),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('نعم، أعد التنشيط 🚀'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final res = await widget.clientRepository.reactivateRfq(rfq.id);
      if (res.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ تم إعادة تنشيط الطلب #${rfq.shortId} بنجاح وطرحه في الرادار'),
            backgroundColor: const Color(0xFF059669),
          ),
        );
        _fetchData();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذر إعادة التنشيط: $e'), backgroundColor: Colors.red),
      );
    }
  }

  // ── UNIFIED ROW BUILDER ──
  List<_UnifiedClientItem> get _allRows {
    final List<_UnifiedClientItem> rows = [];

    // Map RFQs
    for (final rfq in _rfqs) {
      final shortId = IdUtils.safeShortId(rfq.id, prefix: 'RFQ-');
      final displayId = '#REQ-$shortId';
      final hasQuotes = rfq.quotesCount > 0;
      final status = rfq.status;

      // If RFQ is accepted or has a linked order in _orders, convert/treat as active order
      final hasLinkedOrder = _orders.any((o) {
        final ordRfqId = o['rfq_id']?.toString() ?? o['rfqs']?['id']?.toString() ?? '';
        final ordId = o['id']?.toString() ?? '';
        final rawNum = rfq.id.replaceAll(RegExp(r'\D+'), '');
        return ordRfqId == rfq.id || ordId == 'ORD-$rawNum' || ordId == rawNum;
      });

      if (status == 'accepted' || hasLinkedOrder) {
        // If not already in _orders, synthesize an order row for 0ms transition to active orders tab!
        if (!hasLinkedOrder) {
          final rawNum = rfq.id.replaceAll(RegExp(r'\D+'), '');
          final bestQuote = rfq.quotes != null && rfq.quotes!.isNotEmpty ? rfq.quotes!.first : null;
          rows.add(_UnifiedClientItem(
            rawId: 'ORD-$rawNum',
            displayId: '#ORD-$shortId',
            itemType: 'order',
            carMake: rfq.carMake,
            carModel: rfq.carModel,
            carYear: rfq.carYear.toString(),
            plateNumber: rfq.plateNumber ?? '—',
            vin: rfq.vin ?? '—',
            partsText: rfq.items.map((e) => e.partName).join(' ، '),
            partsCount: rfq.items.length,
            deliveryLocation: '${rfq.deliveryCity} — ${rfq.deliveryLocation}',
            quotesCount: 1,
            amount: bestQuote?.totalPrice ?? 402.50,
            status: 'preparing',
            createdAt: rfq.createdAt,
            expiresAt: rfq.expiresAt,
            vendorName: bestQuote?.vendorName ?? 'مؤسسة قطع الغيار المعتمدة',
            rawRfq: rfq,
          ));
        }
        continue; // Skip adding as rfq itemType so it never appears in the RFQ tab!
      }

      rows.add(_UnifiedClientItem(
        rawId: rfq.id,
        displayId: displayId,
        itemType: 'rfq',
        carMake: rfq.carMake,
        carModel: rfq.carModel,
        carYear: rfq.carYear.toString(),
        plateNumber: rfq.plateNumber ?? '—',
        vin: rfq.vin ?? '—',
        partsText: rfq.items.map((e) => e.partName).join(' ، '),
        partsCount: rfq.items.length,
        deliveryLocation: '${rfq.deliveryCity} — ${rfq.deliveryLocation}',
        quotesCount: rfq.quotesCount,
        amount: null,
        status: status,
        createdAt: rfq.createdAt,
        expiresAt: rfq.expiresAt,
        rawRfq: rfq,
      ));
    }

    // Map Orders
    for (final o in _orders) {
      final rfq = o['rfqs'] ?? o['rfq'] ?? {};
      final client = o['client'] ?? {};
      final vendor = o['vendor'] ?? o['profiles'] ?? {};
      final rawId = o['id']?.toString() ?? '';
      final shortId = IdUtils.safeShortId(rawId, prefix: 'ORD-');
      final displayId = '#ORD-$shortId';
      final tot = double.tryParse(o['total_price']?.toString() ?? o['total_amount']?.toString() ?? '0') ?? 0.0;
      final st = o['status']?.toString() ?? 'preparing';

      String partsSummary = rfq['parts_description']?.toString() ?? 'قطع غيار معتمدة';
      try {
        final decoded = jsonDecode(partsSummary);
        if (decoded is List) {
          partsSummary = decoded.map((e) => e['partName'] ?? e['name'] ?? '').join(' ، ');
        }
      } catch (_) {}

      final rawDeliveryFee = o['delivery_fee'];
      final isBranchPickup = o['is_pickup'] == true ||
          o['fulfillment_type'] == 'BRANCH_PICKUP' ||
          o['fulfillment_method'] == 'BRANCH_PICKUP' ||
          o['fulfillment_method'] == 'pickup' ||
          o['delivery_method'] == 'pickup' ||
          o['shipping_method'] == 'pickup' ||
          (rfq['fulfillment_method'] == 'SELF_PICKUP') ||
          (rfq['delivery_method'] == 'pickup') ||
          rawDeliveryFee == 0 ||
          rawDeliveryFee?.toString() == '0.00' ||
          (rfq['delivery_location']?.toString().contains('استلام من الفرع') ?? false) ||
          (rfq['delivery_location']?.toString().contains('فرع') ?? false) ||
          (rfq['delivery_location']?.toString().contains('استلام') ?? false);

      rows.add(_UnifiedClientItem(
        rawId: rawId,
        displayId: displayId,
        itemType: 'order',
        carMake: rfq['car_make']?.toString() ?? 'تويوتا',
        carModel: rfq['car_model']?.toString() ?? 'كامري',
        carYear: rfq['car_year']?.toString() ?? '2023',
        plateNumber: rfq['plate_number']?.toString() ?? '—',
        vin: rfq['vin']?.toString() ?? '—',
        partsText: partsSummary,
        partsCount: 1,
        deliveryLocation: isBranchPickup ? 'استلام من الفرع 🏬' : (rfq['delivery_location']?.toString() ?? 'الرياض'),
        quotesCount: 1,
        amount: tot,
        status: st,
        createdAt: o['created_at'] != null ? DateTime.tryParse(o['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
        vendorName: vendor['company_name'] ?? vendor['full_name'] ?? 'مورد معتمد',
        isPickup: isBranchPickup,
        rawOrder: o,
      ));
    }

    // Sort newest first
    rows.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return rows;
  }

  // ── KPI COUNTS (1:1 with Web) ──
  int get _rfqCount => _allRows.where((r) => r.itemType == 'rfq' && (r.status == 'open' || r.status == 'quoted' || r.status == 'pending') && !r.isExpired).length;
  int get _activeOrdersCount => _allRows.where((r) => r.itemType == 'order' && !['completed', 'closed', 'received', 'cancelled', 'rejected', 'expired'].contains(r.status)).length;
  int get _completedCount => _allRows.where((r) => r.itemType == 'order' && (r.status == 'completed' || r.status == 'received')).length;
  int get _closedCount => _allRows.where((r) => r.status == 'closed' || r.status == 'expired' || r.status == 'cancelled' || r.status == 'rejected' || (r.itemType == 'rfq' && r.isExpired)).length;

  // ── FILTERED ROWS ──
  List<_UnifiedClientItem> get _filteredRows {
    return _allRows.where((row) {
      // Tab filter
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

      // Search filter
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase().trim();
        final matchId = row.displayId.toLowerCase().contains(q) || row.rawId.toLowerCase().contains(q);
        final matchCar = '${row.carMake} ${row.carModel} ${row.carYear}'.toLowerCase().contains(q);
        final matchPlate = row.plateNumber.toLowerCase().contains(q);
        final matchVin = row.vin.toLowerCase().contains(q);
        final matchParts = row.partsText.toLowerCase().contains(q);
        if (!matchId && !matchCar && !matchPlate && !matchVin && !matchParts) return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: const WebNavigationDrawer(
        activeRoute: AppRouter.clientOrders,
        role: 'client',
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
              'إدارة الطلبات والعمليات',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 15,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              'متابعة وإدارة طلبات التسعير النشطة والأوامر التنفيذية في مكان واحد',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF2563EB)),
            onPressed: _fetchData,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: ElevatedButton.icon(
              onPressed: () => Navigator.pushNamed(context, AppRouter.clientCreateRfq),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('طلب عرض سعر جديد', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
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
          ? const Center(
              child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(AppColors.primary)),
            )
          : Stack(
              children: [
                SingleChildScrollView(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ── 1. DYNAMIC TOP 4 KPI SUMMARY CARDS (1:1 with Web) ──
                      _buildKpiSummaryGrid(),
                      const SizedBox(height: 14),

                      // ── 2. SEARCH BAR & EXACT TABS PILL ROW ──
                      _buildFilterAndTabsBar(),
                      const SizedBox(height: 14),

                      // ── 3. LIST OF CARDS ──
                      if (_filteredRows.isEmpty)
                        _buildEmptyState()
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _filteredRows.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, idx) {
                            final item = _filteredRows[idx];
                            return _buildUnifiedCard(item);
                          },
                        ),
                    ],
                  ),
                ),
                if (_isLoading)
                  const Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: LinearProgressIndicator(
                      minHeight: 2.5,
                      backgroundColor: Colors.transparent,
                      valueColor: AlwaysStoppedAnimation(AppColors.primary),
                    ),
                  ),
              ],
            ),
    );
  }

  // ── 4 KPI SUMMARY TILES (1:1 Web Visuals) ──
  Widget _buildKpiSummaryGrid() {
    return Column(
      children: [
        Row(
          children: [
            // KPI 1: RFQs (Amber)
            Expanded(
              child: _buildKpiCard(
                title: 'طلبات التسعير (RFQ)',
                count: '$_rfqCount',
                subtext: 'في انتظار استقبال عروض الأسعار',
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
              child: _buildKpiCard(
                title: 'الطلبات النشطة',
                count: '$_activeOrdersCount',
                subtext: 'أوامر شراء نشطة قيد التجهيز والشحن والتوصيل',
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
              child: _buildKpiCard(
                title: 'الطلبات المكتملة',
                count: '$_completedCount',
                subtext: 'أوامر تم استلامها وإغلاقها بنجاح',
                icon: Icons.check_circle_outline_rounded,
                gradientColors: [const Color(0xFF059669), const Color(0xFF047857)],
                bgTint: const Color(0xFFECFDF5),
                borderColor: const Color(0xFFA7F3D0),
                isActive: _activeTab == 'completed',
                onTap: () => setState(() => _activeTab = _activeTab == 'completed' ? 'all' : 'completed'),
              ),
            ),
            const SizedBox(width: 10),
            // KPI 4: Closed / Cancelled Orders (Slate)
            Expanded(
              child: _buildKpiCard(
                title: 'المغلقة والملغاة',
                count: '$_closedCount',
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

  Widget _buildKpiCard({
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
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  // ── FILTER & TABS BAR (1:1 Web Names) ──
  Widget _buildFilterAndTabsBar() {
    final tabs = [
      {'key': 'all', 'label': 'الكل', 'count': _allRows.length},
      {'key': 'rfq', 'label': 'طلبات التسعير (RFQ)', 'count': _rfqCount},
      {'key': 'active', 'label': 'الطلبات النشطة', 'count': _activeOrdersCount},
      {'key': 'completed', 'label': 'الطلبات المكتملة', 'count': _completedCount},
      {'key': 'closed', 'label': 'المغلقة والملغاة', 'count': _closedCount},
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
          // Tabs Pill Horizontal Row
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
                      child: Row(
                        children: [
                          Text(
                            t['label'] as String,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: active ? Colors.white : const Color(0xFF475569),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: active ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${t['count']}',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.bold,
                                color: active ? Colors.white : const Color(0xFF334155),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // Search Input
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: TextField(
              onChanged: (v) => setState(() => _searchQuery = v),
              style: const TextStyle(fontSize: 11.5),
              decoration: InputDecoration(
                hintText: 'ابحث برقم الطلب، رقم اللوحة، الموديل، VIN، أو اسم القطعة...',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF94A3B8)),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 16),
                        onPressed: () => setState(() => _searchQuery = ''),
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── UNIFIED CARD (Matching Web RFQ & Order Cards) ──
  Widget _buildUnifiedCard(_UnifiedClientItem item) {
    final isRfq = item.itemType == 'rfq';
    final isExpired = isRfq && item.rawRfq?.isExpired == true;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (isRfq && item.rawRfq != null) {
            PartDetailsSheet.show(context, rfq: item.rawRfq!, isVendor: false);
          } else {
            Navigator.pushNamed(
              context,
              AppRouter.clientOrderTracking,
              arguments: _makeOrderTrackingArgs(item),
            );
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isRfq && (item.status == 'open' || item.status == 'quoted')
                  ? const Color(0xFFFDE68A)
                  : const Color(0xFFE2E8F0),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Colored Accent Stripe
              Container(
                height: 3.5,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isRfq
                        ? [const Color(0xFFF59E0B), const Color(0xFFD97706)]
                        : item.status == 'completed'
                            ? [const Color(0xFF059669), const Color(0xFF10B981)]
                            : [const Color(0xFF2563EB), const Color(0xFF3B82F6)],
                  ),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
              ),

              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header: ID + Status Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                              decoration: BoxDecoration(
                                color: isRfq ? const Color(0xFFFFFBEB) : const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isRfq ? const Color(0xFFFDE68A) : const Color(0xFFBFDBFE),
                                ),
                              ),
                              child: Text(
                                item.displayId,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  color: isRfq ? const Color(0xFF92400E) : const Color(0xFF1E40AF),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              DateFormat('dd/MM/yyyy • hh:mm a').format(item.createdAt),
                              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                            ),
                          ],
                        ),

                        // Status Pill
                        _buildStatusPill(item),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Vehicle Info
                    Row(
                      children: [
                        const Icon(Icons.directions_car_rounded, size: 16, color: Color(0xFF2563EB)),
                        const SizedBox(width: 6),
                        Text(
                          '${item.carMake} ${item.carModel} (${item.carYear})',
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Plate & VIN
                    Text(
                      'اللوحة: ${item.plateNumber}  •  رقم الهيكل VIN: ${item.vin}',
                      style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 8),

                    // Parts Summary Box (Clickable to open Full Details Sheet)
                    InkWell(
                      onTap: () {
                        if (isRfq && item.rawRfq != null) {
                          PartDetailsSheet.show(context, rfq: item.rawRfq!, isVendor: false);
                        } else {
                          Navigator.pushNamed(
                            context,
                            AppRouter.clientOrderTracking,
                            arguments: _makeOrderTrackingArgs(item),
                          );
                        }
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.build_circle_outlined, size: 16, color: Color(0xFF2563EB)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.partsText,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    'انقر هنا لعرض كافة تفاصيل ومواصفات القطع والصور 🔍',
                                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF94A3B8)),
                          ],
                        ),
                      ),
                    ),
                const SizedBox(height: 10),

                // Delivery Location / Price / Vendor Info
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF94A3B8)),
                        const SizedBox(width: 4),
                        Text(
                          item.deliveryLocation,
                          style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
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
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${item.quotesCount} عروض مستلمة',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                        ),
                      ),
                  ],
                ),

                // Stepper if order in execution
                if (!isRfq && item.status != 'cancelled') ...[
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 8),
                  _buildOrderStepper(item.status, isPickup: item.isPickup),
                ],

                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 10),

                // Actions Toolbar
                Row(
                  children: [
                    if (isRfq) ...[
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pushNamed(
                              context,
                              AppRouter.clientDealRoom,
                              arguments: {'rfqId': item.rawId},
                            );
                          },
                          icon: const Icon(Icons.gavel_rounded, size: 14),
                          label: const Text('غرفة الصفقات والمقارنة ⚖️', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            elevation: 0,
                          ),
                        ),
                      ),
                      if (isExpired || item.status == 'closed' || item.status == 'cancelled') ...[
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () => _handleReactivateRfq(item.rawRfq!),
                          icon: const Icon(Icons.refresh_rounded, size: 14, color: Color(0xFFD97706)),
                          label: const Text('إعادة تنشيط 🔄', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFFD97706))),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFFFCD34D)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                          ),
                        ),
                      ],
                    ] else ...[
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pushNamed(
                              context,
                              AppRouter.clientOrderTracking,
                              arguments: _makeOrderTrackingArgs(item),
                            );
                          },
                          icon: Icon(item.isPickup ? Icons.storefront_rounded : Icons.map_rounded, size: 14),
                          label: Text(
                            item.isPickup ? 'استلام من الفرع 🏬' : 'تتبع الشحنة',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F172A),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            elevation: 0,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  ),
);
  }

  // Status Pill Helper
  Widget _buildStatusPill(_UnifiedClientItem item) {
    String label = 'بانتظار العروض';
    Color bg = const Color(0xFFFFFBEB);
    Color text = const Color(0xFF92400E);
    Color border = const Color(0xFFFDE68A);

    if (item.itemType == 'rfq') {
      if (item.status == 'quoted') {
        label = 'تم تقديم عروض';
        bg = const Color(0xFFEFF6FF);
        text = const Color(0xFF1E40AF);
        border = const Color(0xFFBFDBFE);
      } else if (item.status == 'accepted') {
        label = 'تم القبول';
        bg = const Color(0xFFECFDF5);
        text = const Color(0xFF065F46);
        border = const Color(0xFFA7F3D0);
      } else if (item.status == 'closed') {
        label = 'مغلق';
        bg = const Color(0xFFF1F5F9);
        text = const Color(0xFF475569);
        border = const Color(0xFFCBD5E1);
      } else if (item.status == 'cancelled' || item.status == 'expired') {
        label = 'ملغي (انتهاء المهلة)';
        bg = const Color(0xFFFEF2F2);
        text = const Color(0xFF991B1B);
        border = const Color(0xFFFECACA);
      }
    } else {
      if (item.status == 'preparing' || item.status == 'confirmed' || item.status == 'pending') {
        label = item.isPickup ? 'تجهيز بالفرع' : 'تم التجهيز';
        bg = const Color(0xFFFFFBEB);
        text = const Color(0xFF92400E);
        border = const Color(0xFFFDE68A);
      } else if (item.status == 'ready' || item.status == 'ready_for_pickup') {
        label = item.isPickup ? 'جاهز بالفرع 🏬' : 'تم الشحن';
        bg = const Color(0xFFEFF6FF);
        text = const Color(0xFF1E40AF);
        border = const Color(0xFFBFDBFE);
      } else if (item.status == 'shipped') {
        label = 'تم الشحن';
        bg = const Color(0xFFEFF6FF);
        text = const Color(0xFF1E40AF);
        border = const Color(0xFFBFDBFE);
      } else if (item.status == 'delivered' || item.status == 'picked_up' || item.status == 'pickup_in_progress') {
        label = item.isPickup ? 'تم الاستلام' : 'جاري التسليم';
        bg = const Color(0xFFF0FDFA);
        text = const Color(0xFF115E59);
        border = const Color(0xFF99F6E4);
      } else if (item.status == 'completed' || item.status == 'received') {
        label = 'تأكيد واستلام';
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

  Map<String, dynamic> _makeOrderTrackingArgs(_UnifiedClientItem item) {
    return {
      'orderId': item.rawId,
      'id': item.rawId,
      'status': item.status,
      'total_price': item.amount,
      'vendor_name': item.vendorName,
      'parts_description': item.partsText,
      'delivery_location': item.deliveryLocation,
      if (item.rawOrder != null) ...item.rawOrder!,
    };
  }

  // Order Stepper Helper
  Widget _buildOrderStepper(String status, {bool isPickup = false}) {
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
        : ['تم التجهيز', 'تم الشحن', 'جاري التسليم', 'تأكيد واستلام'];

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
            'لا توجد طلبات مطابقة في هذا القسم',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 6),
          const Text(
            'يمكنك إنشاء طلب تسعير جديد وسيقوم الموردون المعتمدون بالرد خلال دقائق',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushNamed(context, AppRouter.clientCreateRfq),
            icon: const Icon(Icons.add_rounded, size: 16),
            label: const Text('طلب تسعير جديد 🚀'),
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

class _UnifiedClientItem {
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
  final int quotesCount;
  final double? amount;
  final String status;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final String? vendorName;
  final bool isPickup;
  final RfqModel? rawRfq;
  final Map<String, dynamic>? rawOrder;

  const _UnifiedClientItem({
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
    required this.quotesCount,
    this.amount,
    required this.status,
    required this.createdAt,
    this.expiresAt,
    this.vendorName,
    this.isPickup = false,
    this.rawRfq,
    this.rawOrder,
  });

  bool get isExpired {
    if (status == 'closed' || status == 'cancelled' || status == 'expired') return true;
    if (expiresAt != null) {
      return DateTime.now().isAfter(expiresAt!);
    }
    if (rawRfq != null) {
      return rawRfq!.isExpired;
    }
    return false;
  }
}
