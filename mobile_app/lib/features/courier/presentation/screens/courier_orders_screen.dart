import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/features/courier/repositories/courier_repository.dart';
import 'package:rfqsa_mobile/features/courier/models/delivery_task_model.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/app_sidebar_drawer.dart';

/// 1:1 Pixel-Perfect Parity with Web Courier Invoices & Waybills (app/courier/invoices/page.tsx)
class CourierOrdersScreen extends StatefulWidget {
  final CourierRepository courierRepository;

  const CourierOrdersScreen({super.key, required this.courierRepository});

  @override
  State<CourierOrdersScreen> createState() => _CourierOrdersScreenState();
}

class _CourierOrdersScreenState extends State<CourierOrdersScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  List<DeliveryTaskModel> _deliveries = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchWaybills();
  }

  Future<void> _fetchWaybills() async {
    setState(() => _isLoading = true);
    final res = await widget.courierRepository.fetchDeliveries();
    if (res.success && res.data != null) {
      if (mounted) {
        setState(() {
          _deliveries = res.data!.where((d) => !d.isPickupDelivery).toList();
          _isLoading = false;
        });
      }
    } else {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<DeliveryTaskModel> get _filteredWaybills {
    final validDeliveries = _deliveries.where((d) => !d.isPickupDelivery).toList();
    if (_searchQuery.trim().isEmpty) return validDeliveries;
    final q = _searchQuery.toLowerCase().trim();
    return validDeliveries.where((d) =>
        d.orderId.toLowerCase().contains(q) ||
        d.id.toLowerCase().contains(q) ||
        (d.vendorName?.toLowerCase().contains(q) ?? false) ||
        (d.customerName?.toLowerCase().contains(q) ?? false) ||
        d.partsSummary.toLowerCase().contains(q)).toList();
  }

  double get _totalEarned => _deliveries.fold<double>(
        0.0,
        (sum, d) => sum + (d.status == 'DELIVERED' ? (d.deliveryFee > 0 ? d.deliveryFee : 35.0) : 0.0),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFFF3F4F6),
      drawer: const AppSidebarDrawer(currentRoute: AppRouter.courierOrders),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 22),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'بوالص الشحن والفواتير',
              style: TextStyle(color: Colors.white, fontSize: 14.5, fontWeight: FontWeight.w900),
            ),
            Text(
              'إدارة وتتبع بوالص الشحن الإلكترونية وسندات التسليم',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF34D399)),
            onPressed: _fetchWaybills,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchWaybills,
        color: const Color(0xFF1B4D3E),
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            // ── TOP KPI METRIC STRIP ──
            Row(
              children: [
                Expanded(
                  child: _buildKpiCard('إجمالي البوالص', '${_deliveries.length}', const Color(0xFF1E3A8A)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildKpiCard('المسلمة بنجاح', '${_deliveries.where((d) => d.status == 'DELIVERED').length}', const Color(0xFF065F46)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildKpiCard('مجموع العمولات', '${_totalEarned.toStringAsFixed(0)} ر.س', const Color(0xFF059669)),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ── SEARCH BAR ──
            Container(
              height: 42,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: TextField(
                onChanged: (v) => setState(() => _searchQuery = v),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                decoration: const InputDecoration(
                  hintText: 'بحث برقم البوليصة، الطلب، المورد، العميل...',
                  hintStyle: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  prefixIcon: Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 18),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // ── WAYBILLS LIST ──
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator(color: Color(0xFF059669))),
              )
            else if (_filteredWaybills.isEmpty)
              Container(
                margin: const EdgeInsets.symmetric(vertical: 24),
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.receipt_long_outlined, size: 32, color: Color(0xFF94A3B8)),
                    SizedBox(height: 8),
                    Text('لا توجد بوالص شحن مطابقة', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                  ],
                ),
              )
            else
              ..._filteredWaybills.map((w) => _buildWaybillCard(w)),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
        ],
      ),
    );
  }

  Widget _buildWaybillCard(DeliveryTaskModel d) {
    final isDelivered = d.status == 'DELIVERED';
    final waybillNumber = 'WB-2026-${d.shortId.toUpperCase()}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      waybillNumber,
                      style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 11, color: Color(0xFF0F172A)),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDelivered ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isDelivered ? 'مسلمة ✓' : 'جارية',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isDelivered ? const Color(0xFF059669) : const Color(0xFF2563EB),
                      ),
                    ),
                  ),
                ],
              ),
              Text(
                '+${d.deliveryFee.toStringAsFixed(0)} ر.س',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF059669), fontFamily: 'monospace'),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Parties Row
          Row(
            children: [
              const Icon(Icons.store_rounded, size: 14, color: Color(0xFF92400E)),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'المورد: ${d.vendorName ?? "مؤسسة قطع الغيار"}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.person_rounded, size: 14, color: Color(0xFF065F46)),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'العميل: ${d.customerName ?? "العميل المستلم"} (${d.dropoffDistrict ?? "الرياض"})',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Parts Summary
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.inventory_2_outlined, size: 13, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    d.partsSummary,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF475569)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Action Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.pushNamed(
                  context,
                  AppRouter.courierDeliveryDetail,
                  arguments: {'delivery': d},
                );
              },
              icon: const Icon(Icons.description_outlined, size: 14, color: Color(0xFF059669)),
              label: const Text('عرض تفاصيل البوليصة وسند الاستلام', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFA7F3D0)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
