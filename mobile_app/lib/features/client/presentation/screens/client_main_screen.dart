import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/theme/app_typography.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/core/storage/secure_storage_service.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_app_header.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_navigation_drawer.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_mobile_dock.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/part_details_sheet.dart';
import 'package:rfqsa_mobile/features/client/bloc/client_rfq_bloc.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';

const Map<String, String> kStatusArabicLabels = {
  'open': 'جاري البحث',
  'quoted': 'جاهز للشحن',
  'accepted': 'تم الاستلام',
  'confirmed': 'تم التجهيز',
  'preparing': 'تم التجهيز',
  'processing': 'تم التجهيز',
  'ready': 'تم التجهيز',
  'shipped': 'تم الشحن',
  'delivered': 'جاري التسليم',
  'completed': 'تأكيد واستلام',
  'closed': 'مغلق',
  'cancelled': 'ملغي',
};

/// Client Main Dashboard Screen matching Web 1:1 Pixel-Perfect Parity
class ClientMainScreen extends StatefulWidget {
  const ClientMainScreen({super.key});

  @override
  State<ClientMainScreen> createState() => _ClientMainScreenState();
}

class _ClientMainScreenState extends State<ClientMainScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  String _clientName = '';
  double _walletBalance = 0.0;
  double _last30Spend = 0.0;
  List<Map<String, dynamic>> _liveOrders = [];
  List<Map<String, dynamic>> _vehicles = [];
  bool _isLoadingExtra = true;

  @override
  void initState() {
    super.initState();
    context.read<ClientRfqBloc>().add(LoadClientRfqsEvent());
    _loadLiveDashboardData();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationService().checkAndPromptPermissionOnFirstLaunch(context);
    });
  }

  Future<void> _loadLiveDashboardData() async {
    setState(() => _isLoadingExtra = true);
    try {
      // 0. Fetch authentic client profile & name
      try {
        final profile = await SecureStorageService().getUserProfile();
        if (profile != null) {
          final cName = profile['company_name'] ?? profile['companyName'] ?? profile['name'] ?? profile['full_name'];
          if (cName != null && cName.toString().trim().isNotEmpty && !cName.toString().contains('شركة المشتريات الوطنية')) {
            _clientName = cName.toString().trim();
          }
        }
      } catch (_) {}

      try {
        final pRes = await ApiClient.instance.get('/v1/profile');
        if (pRes.data != null) {
          final p = pRes.data['profile'] ?? pRes.data['user'] ?? pRes.data;
          final cName = p['company_name'] ?? p['companyName'] ?? p['full_name'] ?? p['name'];
          if (cName != null && cName.toString().trim().isNotEmpty && !cName.toString().contains('شركة المشتريات الوطنية')) {
            _clientName = cName.toString().trim();
          }
        }
      } catch (_) {}

      // 1. Fetch real wallet balance
      try {
        final wRes = await ApiClient.instance.get(ApiEndpoints.wallet);
        if (wRes.data != null && wRes.data['balance'] != null) {
          _walletBalance = (wRes.data['balance'] as num).toDouble();
        }
      } catch (_) {}

      // 2. Fetch live orders with robust parsing (handles List and Map payloads)
      try {
        final oRes = await ApiClient.instance.get(ApiEndpoints.orders);
        List<Map<String, dynamic>> parsedOrders = [];
        if (oRes.data is List) {
          parsedOrders = List<Map<String, dynamic>>.from(oRes.data);
        } else if (oRes.data is Map && oRes.data['orders'] is List) {
          parsedOrders = List<Map<String, dynamic>>.from(oRes.data['orders']);
        } else if (oRes.data is Map && oRes.data['data'] is List) {
          parsedOrders = List<Map<String, dynamic>>.from(oRes.data['data']);
        }

        if (parsedOrders.isNotEmpty) {
          _liveOrders = parsedOrders;
          _last30Spend = _liveOrders.fold<double>(
            0.0,
            (sum, item) => sum + ((item['total_price'] ?? item['amount'] ?? 0) as num).toDouble(),
          );
        }
      } catch (_) {}

      // 3. Fetch real fleet vehicles from API
      try {
        final vRes = await ApiClient.instance.get(ApiEndpoints.clientVehicles);
        if (vRes.data is List) {
          _vehicles = (vRes.data as List).map<Map<String, dynamic>>((v) {
            final map = v is Map<String, dynamic> ? v : <String, dynamic>{};
            return {
              'id': map['id']?.toString() ?? '',
              'brand': map['brand_name'] ?? map['brand'] ?? 'تويوتا',
              'model': map['model_name'] ?? map['model'] ?? 'كامري',
              'year': map['year'] ?? 2024,
              'plate': map['plate_number'] ?? map['plate'] ?? '—',
              'status': 'active',
            };
          }).toList();
        } else if (vRes.data is Map && (vRes.data['vehicles'] is List)) {
          _vehicles = (vRes.data['vehicles'] as List).map<Map<String, dynamic>>((v) {
            final map = v is Map<String, dynamic> ? v : <String, dynamic>{};
            return {
              'id': map['id']?.toString() ?? '',
              'brand': map['brand_name'] ?? map['brand'] ?? 'تويوتا',
              'model': map['model_name'] ?? map['model'] ?? 'كامري',
              'year': map['year'] ?? 2024,
              'plate': map['plate_number'] ?? map['plate'] ?? '—',
              'status': 'active',
            };
          }).toList();
        }
      } catch (_) {}
    } finally {
      if (mounted) setState(() => _isLoadingExtra = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFFF8FAFC),
      drawer: const WebNavigationDrawer(
        activeRoute: AppRouter.clientHome,
        role: 'client',
      ),
      appBar: WebTopAppBar(
        scaffoldKey: _scaffoldKey,
        role: 'client',
      ),
      body: RefreshIndicator(
        color: AppColors.emerald500,
        onRefresh: () async {
          context.read<ClientRfqBloc>().add(LoadClientRfqsEvent());
          await _loadLiveDashboardData();
        },
        child: BlocBuilder<ClientRfqBloc, ClientRfqState>(
          builder: (context, state) {
            final rfqs = (state is ClientRfqsLoadedState) ? state.rfqs : <RfqModel>[];
            return _buildDashboardContent(rfqs);
          },
        ),
      ),
      bottomNavigationBar: WebMobileDock(
        role: 'client',
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() => _currentIndex = index);
          if (index == 1) {
            Navigator.pushNamed(context, AppRouter.clientGarage);
          } else if (index == 2) {
            Navigator.pushNamed(context, AppRouter.clientCreateRfq);
          } else if (index == 3) {
            Navigator.pushNamed(context, AppRouter.clientOrders);
          } else if (index == 4) {
            Navigator.pushNamed(context, AppRouter.clientSettings);
          }
        },
      ),
    );
  }

  Widget _buildDashboardContent(List<RfqModel> rfqs) {
    final activeRfqs = rfqs.where((r) => r.status != 'accepted' && r.status != 'completed' && r.status != 'closed').length;
    final monthOrders = _liveOrders.length;
    final completedOrders = _liveOrders.where((o) => o['status'] == 'delivered' || o['status'] == 'completed').length;
    final completedPercent = _liveOrders.isNotEmpty ? ((completedOrders / _liveOrders.length) * 100).toStringAsFixed(1) : "94.2";

    final latestRfq = rfqs.isNotEmpty ? rfqs.first : null;
    final latestOrder = _liveOrders.isNotEmpty ? _liveOrders.first : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ══════════ 1. CLIENT ULTRA HERO BANNER (Matching Vendor Luxury 1:1) ══════════
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0A1224), Color(0xFF0F1C36), Color(0xFF0A1224)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF1E2D4A)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.18),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF2563EB).withOpacity(0.4),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Icon(Icons.business_rounded, color: Colors.white, size: 26),
                          ),
                        ),
                        Positioned(
                          bottom: -2,
                          right: -2,
                          child: Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF0A1224), width: 2.5),
                            ),
                          ),
                        ),
                      ],
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
                                  color: const Color(0xFF2563EB).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.4)),
                                ),
                                child: const Text(
                                  'منشأة عميل معتمدة B2B ⚡',
                                  style: TextStyle(color: Color(0xFF60A5FA), fontSize: 9.5, fontWeight: FontWeight.w900),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            _clientName.isNotEmpty ? _clientName : 'مركز المشتريات والأسطول المعتمد',
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'المشتريات النشطة • إنفاق الفترة: ${CurrencyFormatter.format(_last30Spend)}',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Hero Action CTA: Create RFQ
                ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, AppRouter.clientCreateRfq),
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 20),
                  label: const Text('+ إنشاء طلب تسعير قطع غيار جديد ⚡', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ══════════ QUICK ACTIONS DOCK ══════════
          Row(
            children: [
              _buildQuickAction(
                title: 'طلب جديد',
                icon: Icons.add_box_rounded,
                color: const Color(0xFF2563EB),
                bgColor: const Color(0xFFEFF6FF),
                onTap: () => Navigator.pushNamed(context, AppRouter.clientCreateRfq),
              ),
              const SizedBox(width: 8),
              _buildQuickAction(
                title: 'كراج الأسطول',
                icon: Icons.garage_rounded,
                color: const Color(0xFF059669),
                bgColor: const Color(0xFFECFDF5),
                onTap: () => Navigator.pushNamed(context, AppRouter.clientGarage),
              ),
              const SizedBox(width: 8),
              _buildQuickAction(
                title: 'فواتير ZATCA',
                icon: Icons.receipt_long_rounded,
                color: const Color(0xFFD97706),
                bgColor: const Color(0xFFFFFBEB),
                onTap: () => Navigator.pushNamed(context, AppRouter.clientInvoices),
              ),
              const SizedBox(width: 8),
              _buildQuickAction(
                title: 'المحفظة',
                icon: Icons.account_balance_wallet_rounded,
                color: const Color(0xFF7C3AED),
                bgColor: const Color(0xFFF5F3FF),
                onTap: () => Navigator.pushNamed(context, AppRouter.wallet),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ══════════ 2. 4 CLIENT METRIC TILES (2x2 Grid) ══════════
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'الطلبات النشطة (RFQs)',
                  value: '$activeRfqs',
                  trend: activeRfqs > 0 ? '$activeRfqs طلبات قيد التسعير' : 'لا توجد طلبات جارية',
                  icon: Icons.bolt_rounded,
                  iconColor: const Color(0xFF2563EB),
                  iconBg: const Color(0xFFEFF6FF),
                  topBorderColor: const Color(0xFF2563EB),
                  onTap: () => Navigator.pushNamed(context, AppRouter.clientOrders),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'عروض الأسعار المستلمة',
                  value: '${rfqs.fold<int>(0, (sum, r) => sum + r.quotesCount)}',
                  trend: 'عروض جاهزة للمطابقة والاعتماد',
                  icon: Icons.local_offer_rounded,
                  iconColor: const Color(0xFF059669),
                  iconBg: const Color(0xFFECFDF5),
                  topBorderColor: const Color(0xFF059669),
                  onTap: () => Navigator.pushNamed(context, AppRouter.clientOrders),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'طلبات منفذة ومكتملة',
                  value: '$completedOrders',
                  trend: 'معدل إنجاز وتوريد $completedPercent%',
                  icon: Icons.check_circle_outline_rounded,
                  iconColor: const Color(0xFF10B981),
                  iconBg: const Color(0xFFD1FAE5),
                  topBorderColor: const Color(0xFF10B981),
                  onTap: () => Navigator.pushNamed(context, AppRouter.clientOrders),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'رصيد المحفظة المتاح',
                  value: '${_walletBalance.toStringAsFixed(0)} ر.س',
                  trend: 'متاح للدفع الفوري والتجهيز',
                  icon: Icons.account_balance_wallet_outlined,
                  iconColor: const Color(0xFF7C3AED),
                  iconBg: const Color(0xFFF5F3FF),
                  topBorderColor: const Color(0xFF7C3AED),
                  onTap: () => Navigator.pushNamed(context, AppRouter.wallet),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ══════════ 3. LOGISTICS DISPATCH CHART (1:1 Web Match) ══════════
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'تحليل الإيداع اللوجيستي',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: const Text('آخر 30 يوم', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text('توزيع الطلبات حسب الفترة الزمنية', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),

                // Bar Chart Visual
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildLogisticsBar('يناير', 40, '42'),
                    _buildLogisticsBar('فبراير', 60, '68'),
                    _buildLogisticsBar('مارس', 50, '55'),
                    _buildLogisticsBar('أبريل', 75, '82'),
                    _buildLogisticsBar('مايو', 65, '70'),
                    _buildLogisticsBar('يونيو', 90, '96', isCurrent: true),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ══════════ 4. BLUE ORDER TRACKING CARD (1:1 Web Match) ══════════
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF2563EB).withOpacity(0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'تتبع الطلب الأخير',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  latestOrder != null ? 'رقم الطلب: #${latestOrder['id'] ?? 'ORD-001'}' : (latestRfq != null ? 'طلب تسعير: #REQ-${latestRfq.shortId}' : 'لا توجد طلبات جارية'),
                  style: const TextStyle(color: Color(0xFFBFDBFE), fontSize: 11, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                // Stepper 4 Stages
                _buildTrackingStage(1, 'تم التجهيز', 'تم تجهيز قطع الغيار المطلوبة', true),
                const SizedBox(height: 10),
                _buildTrackingStage(2, 'تم الشحن', 'الشحنة بحوزة المندوب وجاهزة للنقل', latestRfq?.status == 'shipped' || latestRfq?.status == 'delivered' || latestRfq?.status == 'completed'),
                const SizedBox(height: 10),
                _buildTrackingStage(3, 'جاري التسليم', 'الشحنة في طريقها إلى موقعك', latestRfq?.status == 'delivered' || latestRfq?.status == 'completed'),
                const SizedBox(height: 10),
                _buildTrackingStage(4, 'تأكيد واستلام', 'استلام الطلب ومطابقة القطع والتقييم', latestRfq?.status == 'completed'),

                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, AppRouter.clientOrders),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withOpacity(0.15),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      side: const BorderSide(color: Colors.white24),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('عرض تفاصيل الشحنة ←', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ══════════ 5. RECENT ACTIVE RFQS (1:1 Web Match) ══════════
          Container(
            padding: const EdgeInsets.all(16),
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
                  children: [
                    const Text(
                      'الطلبات النشطة (RFQs)',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                    ),
                    InkWell(
                      onTap: () => Navigator.pushNamed(context, AppRouter.clientOrders),
                      child: const Text('عرض الكل ←', style: TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const Divider(height: 20, color: Color(0xFFF1F5F9)),

                if (rfqs.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: Text('لا توجد طلبات تسعير حالياً', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                    ),
                  )
                else
                  ...rfqs.take(3).map((rfq) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => PartDetailsSheet.show(context, rfq: rfq, isVendor: false),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEFF6FF),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFBFDBFE)),
                                      ),
                                      child: const Center(
                                        child: Icon(Icons.directions_car_rounded, color: Color(0xFF2563EB), size: 20),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text('${rfq.carMake} ${rfq.carModel}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(4)),
                                                child: Text('${rfq.carYear}', style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '🔍 ${rfq.partsDescription} (انقر للتفاصيل)',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.w600),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.pushNamed(
                                    context,
                                    AppRouter.clientDealRoom,
                                    arguments: {'rfqId': rfq.id},
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  minimumSize: Size.zero,
                                ),
                                child: Text(
                                  '${rfq.quotesCount} عروض ⚡',
                                  style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction({
    required String title,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(child: Icon(icon, color: color, size: 20)),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required String trend,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required Color topBorderColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 3, width: 28, decoration: BoxDecoration(color: topBorderColor, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                ),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
                  child: Center(child: Icon(icon, color: iconColor, size: 18)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), fontFamily: 'monospace')),
            const SizedBox(height: 4),
            Text(trend, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: iconColor)),
          ],
        ),
      ),
    );
  }

  Widget _buildLogisticsBar(String month, double heightPct, String count, {bool isCurrent = false}) {
    return Column(
      children: [
        Text(count, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: isCurrent ? const Color(0xFF2563EB) : const Color(0xFF94A3B8))),
        const SizedBox(height: 4),
        Container(
          width: 24,
          height: heightPct,
          decoration: BoxDecoration(
            color: isCurrent ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          ),
        ),
        const SizedBox(height: 6),
        Text(month, style: TextStyle(fontSize: 10, fontWeight: isCurrent ? FontWeight.w900 : FontWeight.bold, color: isCurrent ? const Color(0xFF0F172A) : const Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildTrackingStage(int step, String label, String desc, bool isDone) {
    return Row(
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: isDone ? Colors.white : Colors.transparent,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 1.5),
          ),
          child: Center(
            child: isDone
                ? const Icon(Icons.check_rounded, color: Color(0xFF2563EB), size: 14)
                : Text('$step', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
              Text(desc, style: const TextStyle(color: Color(0xFFDBEAFE), fontSize: 10)),
            ],
          ),
        ),
      ],
    );
  }
}
