import 'dart:async';
import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/core/audio/sound_alert_service.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_navigation_drawer.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_mobile_dock.dart';
import 'package:rfqsa_mobile/features/courier/models/delivery_task_model.dart';
import 'package:rfqsa_mobile/features/courier/repositories/courier_repository.dart';

/// 1:1 Pixel-Perfect Parity with Web Courier Dashboard (app/courier/page.tsx & app/courier/layout.tsx)
/// Includes Realtime Polling, Audible Chimes, High-Importance Push Notifications & 2-Leg Journey Cards.
class CourierMainScreen extends StatefulWidget {
  final CourierRepository courierRepository;

  const CourierMainScreen({super.key, required this.courierRepository});

  @override
  State<CourierMainScreen> createState() => _CourierMainScreenState();
}

class _CourierMainScreenState extends State<CourierMainScreen> with SingleTickerProviderStateMixin {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentNavIndex = 0;
  List<DeliveryTaskModel> _deliveries = [];
  bool _isLoading = true;
  bool _isSpinning = false;
  String _activeTab = 'active'; // 'active' or 'completed'
  String _searchQuery = '';
  bool _onDuty = true;
  bool _soundEnabled = true;

  // Realtime Polling & New Task Alert Detection
  Timer? _pollingTimer;
  Set<String> _knownTaskIds = {};
  DeliveryTaskModel? _newlyAssignedTask;
  bool _showNewTaskBanner = false;

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _loadDeliveries(initial: true);

    // Periodic 12-second background sync for live dispatch alerts
    _pollingTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (_onDuty) {
        _pollDeliveriesSilently();
      }
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadDeliveries({bool initial = false}) async {
    if (!initial) setState(() => _isSpinning = true);
    final res = await widget.courierRepository.fetchDeliveries();

    if (res.success && res.data != null) {
      if (mounted) {
        final validDeliveries = res.data!.where((d) => !d.isPickupDelivery).toList();
        setState(() {
          _deliveries = validDeliveries;
          _isLoading = false;
          _isSpinning = false;
          // Seed known IDs on initial load
          _knownTaskIds = validDeliveries.map((d) => d.id).toSet();
        });
      }
    } else {
      // Fallback demo data matching web seed
      if (_deliveries.isEmpty) {
        _deliveries = _getFallbackDeliveries().where((d) => !d.isPickupDelivery).toList();
        _knownTaskIds = _deliveries.map((d) => d.id).toSet();
      }
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isSpinning = false;
        });
      }
    }
  }

  Future<void> _pollDeliveriesSilently() async {
    final res = await widget.courierRepository.fetchDeliveries();
    if (res.success && res.data != null && mounted) {
      final currentList = res.data!.where((d) => !d.isPickupDelivery).toList();
      final incomingNewTasks = currentList.where((d) => !_knownTaskIds.contains(d.id) && d.status != 'DELIVERED').toList();

      if (incomingNewTasks.isNotEmpty) {
        final newest = incomingNewTasks.first;
        _triggerNewDeliveryAlert(newest);
      }

      setState(() {
        _deliveries = currentList;
        _knownTaskIds = currentList.map((d) => d.id).toSet();
      });
    }
  }

  void _triggerNewDeliveryAlert(DeliveryTaskModel task) {
    if (!_soundEnabled) return;

    // 1. Play distinctive RFQ radar audio chime
    SoundAlertService().playRfqRadarAlert();

    // 2. Trigger high-importance local push notification with vibration
    NotificationService().showRfqNotification(
      id: task.id.hashCode,
      title: '🚨 مهمة توصيل جديدة مسندة إليك!',
      body: 'طلب رقم #${task.orderId} من ${task.vendorName ?? "المورد"} بقيمة +${task.deliveryFee.toStringAsFixed(0)} ر.س',
      payload: {'type': 'delivery_assigned', 'deliveryId': task.id},
    );

    // 3. Show animated top overlay banner inside the app
    setState(() {
      _newlyAssignedTask = task;
      _showNewTaskBanner = true;
    });

    // Auto-dismiss in-app banner after 8 seconds
    Timer(const Duration(seconds: 8), () {
      if (mounted) {
        setState(() => _showNewTaskBanner = false);
      }
    });
  }

  void _testNotificationSound() {
    SoundAlertService().playRfqRadarAlert();
    NotificationService().showRfqNotification(
      id: 999999,
      title: '🔊 تجربة رادار تنبيهات المندوب',
      body: 'نظام التنبيهات الصوتية والإشعارات الفورية يعمل بنجاح وبأعلى كفاءة 🚀',
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('تم تشغيل صوت التنبيه وإرسال إشعار تجريبي بنجاح 🔔'),
        backgroundColor: Color(0xFF059669),
        duration: Duration(seconds: 3),
      ),
    );
  }

  List<DeliveryTaskModel> get _activeDeliveries =>
      _deliveries.where((d) => d.status != 'DELIVERED' && d.status != 'CANCELLED').toList();

  List<DeliveryTaskModel> get _completedDeliveries =>
      _deliveries.where((d) => d.status == 'DELIVERED').toList();

  List<DeliveryTaskModel> get _filteredList {
    final target = _activeTab == 'active' ? _activeDeliveries : _completedDeliveries;
    if (_searchQuery.trim().isEmpty) return target;
    final q = _searchQuery.toLowerCase().trim();
    return target.where((d) =>
        d.orderId.toLowerCase().contains(q) ||
        (d.customerName?.toLowerCase().contains(q) ?? false) ||
        (d.vendorName?.toLowerCase().contains(q) ?? false) ||
        (d.dropoffDistrict?.toLowerCase().contains(q) ?? false) ||
        d.partsSummary.toLowerCase().contains(q)).toList();
  }

  double get _todayEarnings {
    return _completedDeliveries.fold<double>(
      0.0,
      (sum, d) => sum + (d.deliveryFee > 0 ? d.deliveryFee : 35.0),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFFF3F4F6), // Matches Web bg-[#F3F4F6]
      drawer: const WebNavigationDrawer(
        activeRoute: AppRouter.courierHome,
        role: 'courier',
      ),
      
      // ══════════════════════════════════════════════════════════
      // ── TOP HEADER (Matches Web app/courier/layout.tsx #0F172A) ──
      // ══════════════════════════════════════════════════════════
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Container(
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A), // Matches Web sticky header #0F172A
            border: Border(bottom: BorderSide(color: Color(0xFF1E293B), width: 1)),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  // Sidebar Drawer Menu
                  IconButton(
                    icon: const Icon(Icons.menu_rounded, color: Colors.white, size: 22),
                    tooltip: 'القائمة الرئيسية',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => _scaffoldKey.currentState?.openDrawer(),
                  ),
                  const SizedBox(width: 8),

                  // Logo & Portal Badge
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF059669), Color(0xFF0D9488)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(
                      child: Icon(Icons.local_shipping_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Title & Subtitle
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'أسطول رفق',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.2,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3), width: 0.8),
                              ),
                              child: const Text(
                                'بوابة المندوب',
                                style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 9.5, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const Text(
                          'سعيد المطيري (دراجة د هـ 2214)',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),

                  // Notification Center Button with Live Badge
                  ValueListenableBuilder<int>(
                    valueListenable: NotificationService().unreadCountNotifier,
                    builder: (context, unreadCount, _) {
                      return Stack(
                        alignment: Alignment.center,
                        children: [
                          IconButton(
                            onPressed: () => Navigator.pushNamed(context, AppRouter.notifications),
                            icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 20),
                            tooltip: 'مركز الإشعارات',
                            padding: const EdgeInsets.all(4),
                            constraints: const BoxConstraints(),
                          ),
                          if (unreadCount > 0)
                            Positioned(
                              top: 2,
                              right: 2,
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                  color: Color(0xFFEF4444),
                                  shape: BoxShape.circle,
                                ),
                                constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                                child: Text(
                                  '$unreadCount',
                                  style: const TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.w900),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(width: 4),

                  // Notification Sound Test Button
                  IconButton(
                    onPressed: _testNotificationSound,
                    icon: AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        return Icon(
                          Icons.volume_up_rounded,
                          color: _soundEnabled ? Color.lerp(const Color(0xFF34D399), const Color(0xFF10B981), _pulseController.value) : const Color(0xFF64748B),
                          size: 20,
                        );
                      },
                    ),
                    tooltip: 'تجربة صوت الإشعارات والرادار',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 6),

                  // Duty Status Toggle Button (1:1 with Web)
                  InkWell(
                    onTap: () {
                      setState(() => _onDuty = !_onDuty);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(_onDuty ? 'أنت الآن متاح لاستقبال طلبات التوصيل 🟢' : 'تم تغيير حالتك إلى غير متاح 🔴'),
                          duration: const Duration(seconds: 2),
                          backgroundColor: _onDuty ? const Color(0xFF059669) : const Color(0xFFDC2626),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _onDuty ? const Color(0xFF10B981).withOpacity(0.18) : const Color(0xFFF43F5E).withOpacity(0.18),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _onDuty ? const Color(0xFF10B981).withOpacity(0.4) : const Color(0xFFF43F5E).withOpacity(0.4),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedBuilder(
                            animation: _pulseController,
                            builder: (context, child) {
                              return Container(
                                width: 7,
                                height: 7,
                                decoration: BoxDecoration(
                                  color: _onDuty
                                      ? (_pulseController.value > 0.5 ? const Color(0xFF34D399) : const Color(0xFF059669))
                                      : const Color(0xFFFB7185),
                                  shape: BoxShape.circle,
                                ),
                              );
                            },
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _onDuty ? 'متاح للطلب' : 'غير متاح',
                            style: TextStyle(
                              color: _onDuty ? const Color(0xFF6EE7B7) : const Color(0xFFFDA4AF),
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),

      // ══════════════════════════════════════════════════════════
      // ── BODY CONTENT (Max-width phone centered, 1:1 Parity) ──
      // ══════════════════════════════════════════════════════════
      body: RefreshIndicator(
        onRefresh: () => _loadDeliveries(),
        color: const Color(0xFF1B4D3E),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          children: [
            // ── LIVE IN-APP NEW TASK ALERT BANNER ──
            if (_showNewTaskBanner && _newlyAssignedTask != null) ...[
              _buildNewTaskAnimatedBanner(_newlyAssignedTask!),
              const SizedBox(height: 12),
            ],

            // ══════════ 1. QUICK STATS METRIC STRIP (3 CARDS) ══════════
            // Matches Web: grid grid-cols-3 gap-2
            Row(
              children: [
                // Card 1: المهام الجارية
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          'المهام الجارية',
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${_activeDeliveries.length}',
                          style: const TextStyle(
                            color: Color(0xFF1E3A8A), // Web text-blue-900
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Card 2: المكتملة اليوم
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          'المكتملة اليوم',
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${_completedDeliveries.length}',
                          style: const TextStyle(
                            color: Color(0xFF065F46), // Web text-emerald-800
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Card 3: عمولات اليوم (Gradient from-[#1B4D3E] to-[#12362C])
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1B4D3E), Color(0xFF12362C)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF1B4D3E).withOpacity(0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          'عمولات اليوم',
                          style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              _todayEarnings.toStringAsFixed(0),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const SizedBox(width: 3),
                            const Text(
                              'ر.س',
                              style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 10, fontWeight: FontWeight.normal),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ══════════ 2. SEARCH & REFRESH FILTER (1:1 with Web) ══════════
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.015),
                          blurRadius: 3,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: TextField(
                      onChanged: (v) => setState(() => _searchQuery = v),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                      decoration: const InputDecoration(
                        hintText: 'بحث برقم الطلب، اسم العميل، الحي...',
                        hintStyle: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                        prefixIcon: Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 18),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => _loadDeliveries(),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.015),
                          blurRadius: 3,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Center(
                      child: _isSpinning
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF059669)),
                            )
                          : const Icon(Icons.rotate_right_rounded, color: Color(0xFF475569), size: 20),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ══════════ 3. MAIN TAB NAVIGATION (1:1 with Web) ══════════
            // Matches Web: bg-slate-200/70 p-1 rounded-2xl gap-1
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0).withOpacity(0.8),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _activeTab = 'active'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _activeTab == 'active' ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: _activeTab == 'active'
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.06),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'المهام الجارية (${_activeDeliveries.length})',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: _activeTab == 'active' ? FontWeight.w900 : FontWeight.w700,
                              color: _activeTab == 'active' ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _activeTab = 'completed'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _activeTab == 'completed' ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: _activeTab == 'completed'
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.06),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'المكتملة (${_completedDeliveries.length})',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: _activeTab == 'completed' ? FontWeight.w900 : FontWeight.w700,
                              color: _activeTab == 'completed' ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // ══════════ 4. DELIVERIES LIST (1:1 with Web) ══════════
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: Column(
                    children: [
                      CircularProgressIndicator(color: Color(0xFF059669)),
                      SizedBox(height: 12),
                      Text('جاري تحميل المهام...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
              )
            else if (_filteredList.isEmpty)
              _buildEmptyTasksState()
            else
              ..._filteredList.map((delivery) => _build2LegDeliveryCard(delivery)),
          ],
        ),
      ),

      // ══════════════════════════════════════════════════════════
      // ── BOTTOM NAVIGATION (1:1 with Web app/courier/layout.tsx) ──
      // ══════════════════════════════════════════════════════════
      bottomNavigationBar: WebMobileDock(
        role: 'courier',
        currentIndex: _currentNavIndex,
        onTap: (index) {
          setState(() => _currentNavIndex = index);
          if (index == 1) {
            Navigator.pushNamed(context, AppRouter.courierOrders);
          } else if (index == 2) {
            Navigator.pushNamed(context, AppRouter.courierEarnings);
          } else if (index == 3) {
            Navigator.pushNamed(context, AppRouter.courierProfile);
          } else if (index == 4) {
            Navigator.pushNamed(context, AppRouter.courierSupport);
          }
        },
      ),
    );
  }

  Widget _buildNavItem(int index, String label, IconData icon, VoidCallback onTap) {
    final isActive = _currentNavIndex == index;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFFD1FAE5) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: isActive ? const Color(0xFF1B4D3E) : const Color(0xFF64748B),
                size: 19,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: isActive ? FontWeight.w900 : FontWeight.w600,
                color: isActive ? const Color(0xFF1B4D3E) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════
  // ── 2-LEG JOURNEY CARD (Exact 1:1 Parity with Web) ────────
  // ══════════════════════════════════════════════════════════
  Widget _build2LegDeliveryCard(DeliveryTaskModel delivery) {
    final isDelivered = delivery.status == 'DELIVERED';
    final statusMeta = _getStatusMeta(delivery.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24), // Web rounded-3xl
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () {
            Navigator.pushNamed(
              context,
              AppRouter.courierDeliveryDetail,
              arguments: {'delivery': delivery},
            ).then((_) => _loadDeliveries());
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Top Header Row: Order ID + Status Badge + Fee ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        // Order ID Badge (#ORD-XXXX)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0).withOpacity(0.6)),
                          ),
                          child: Text(
                            '#${delivery.orderId}',
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w900,
                              fontSize: 11,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),

                        // Status Badge with Dot
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusMeta.bgColor,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: statusMeta.borderColor, width: 0.8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: statusMeta.dotColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                statusMeta.label,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: statusMeta.textColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Earned Delivery Fee Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Text(
                        '+${(delivery.deliveryFee > 0 ? delivery.deliveryFee : 35).toStringAsFixed(0)} ر.س',
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF065F46),
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // ── 2-Leg Journey Details ──
                // Leg 1: Supplier Pickup
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFEF3C7),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Text(
                            '1',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF92400E)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'الاستلام من المورد:',
                                  style: TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  delivery.vendorName ?? 'مؤسسة قطع الغيار المعتمدة',
                                  style: const TextStyle(fontSize: 9.5, color: Color(0xFF92400E), fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 1.5),
                            Text(
                              delivery.pickupLocation,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),

                // Leg 2: Customer Dropoff
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: const BoxDecoration(
                          color: Color(0xFFD1FAE5),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Text(
                            '2',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF065F46)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'التسليم للعميل:',
                                  style: TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  delivery.customerName ?? 'العميل المستلم',
                                  style: const TextStyle(fontSize: 9.5, color: Color(0xFF065F46), fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 1.5),
                            Text(
                              delivery.dropoffLocation,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // ── Parts Summary & Action Link (Border Top) ──
                Container(
                  padding: const EdgeInsets.only(top: 8),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.inventory_2_outlined, size: 14, color: Color(0xFF94A3B8)),
                            const SizedBox(width: 5),
                            Expanded(
                              child: Text(
                                delivery.partsSummary,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF334155)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Row(
                        children: [
                          Text(
                            isDelivered ? 'عرض التفاصيل' : 'بدء الرحلة',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF065F46), // Web text-emerald-800
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Icon(Icons.chevron_left_rounded, size: 16, color: Color(0xFF065F46)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNewTaskAnimatedBanner(DeliveryTaskModel task) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF10B981), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.notification_important_rounded, color: Color(0xFF34D399), size: 20),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '🚨 مهمة توصيل جديدة مسندة إليك!',
                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900),
                ),
                Text(
                  'طلب #${task.orderId} - استلام من ${task.vendorName ?? "المورد"}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: () {
              setState(() => _showNewTaskBanner = false);
              Navigator.pushNamed(
                context,
                AppRouter.courierDeliveryDetail,
                arguments: {'delivery': task},
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: const Color(0xFF0F172A),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              minimumSize: Size.zero,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('عرض ⚡', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyTasksState() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 24),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
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
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.inventory_2_outlined, size: 24, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 12),
          const Text(
            'لا توجد مهام في هذا التبويب',
            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF1E293B)),
          ),
          const SizedBox(height: 4),
          const Text(
            'ستظهر الشحنات فور إسنادها وتجهيزها من المورد',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  _DeliveryStatusVisual _getStatusMeta(String status) {
    switch (status) {
      case 'ASSIGNED':
        return _DeliveryStatusVisual(
          label: 'مُسند للمندوب',
          bgColor: const Color(0xFFEFF6FF),
          borderColor: const Color(0xFFBFDBFE),
          textColor: const Color(0xFF1E40AF),
          dotColor: const Color(0xFF2563EB),
        );
      case 'EN_ROUTE_PICKUP':
      case 'ACCEPTED':
        return _DeliveryStatusVisual(
          label: 'في الطريق للمورد',
          bgColor: const Color(0xFFFFFBEB),
          borderColor: const Color(0xFFFDE68A),
          textColor: const Color(0xFF92400E),
          dotColor: const Color(0xFFF59E0B),
        );
      case 'ARRIVED_PICKUP':
      case 'AT_PICKUP':
        return _DeliveryStatusVisual(
          label: 'وصل للمورد',
          bgColor: const Color(0xFFEEF2FF),
          borderColor: const Color(0xFFC7D2FE),
          textColor: const Color(0xFF3730A3),
          dotColor: const Color(0xFF4F46E5),
        );
      case 'PICKED_UP':
        return _DeliveryStatusVisual(
          label: 'تم استلام الشحنة',
          bgColor: const Color(0xFFF0FDFA),
          borderColor: const Color(0xFF99F6E4),
          textColor: const Color(0xFF115E59),
          dotColor: const Color(0xFF0D9488),
        );
      case 'EN_ROUTE_DELIVERY':
      case 'IN_TRANSIT':
        return _DeliveryStatusVisual(
          label: 'جاري التوصيل للعميل',
          bgColor: const Color(0xFFFAF5FF),
          borderColor: const Color(0xFFE9D5FF),
          textColor: const Color(0xFF6B21A8),
          dotColor: const Color(0xFF9333EA),
        );
      case 'ARRIVED_DELIVERY':
        return _DeliveryStatusVisual(
          label: 'وصل لموقع العميل',
          bgColor: const Color(0xFFECFEFF),
          borderColor: const Color(0xFFA5F3FC),
          textColor: const Color(0xFF155E75),
          dotColor: const Color(0xFF0891B2),
        );
      case 'DELIVERED':
        return _DeliveryStatusVisual(
          label: 'تم التسليم بنجاح ✓',
          bgColor: const Color(0xFFECFDF5),
          borderColor: const Color(0xFFA7F3D0),
          textColor: const Color(0xFF065F46),
          dotColor: const Color(0xFF059669),
        );
      default:
        return _DeliveryStatusVisual(
          label: 'مُسند للمندوب',
          bgColor: const Color(0xFFEFF6FF),
          borderColor: const Color(0xFFBFDBFE),
          textColor: const Color(0xFF1E40AF),
          dotColor: const Color(0xFF2563EB),
        );
    }
  }

  List<DeliveryTaskModel> _getFallbackDeliveries() {
    return [
      DeliveryTaskModel(
        id: 'DEL-5501',
        orderId: 'ORD-5501',
        status: 'EN_ROUTE_PICKUP',
        pickupLocation: 'مؤسسة اليمامة لقطع الغيار - شارع الضباب، الرياض',
        dropoffLocation: 'حي الروضة - شارع حفصة بنت عمر، الرياض',
        vendorName: 'مؤسسة اليمامة لقطع الغيار',
        vendorPhone: '0551122334',
        customerName: 'فهد القحطاني',
        customerPhone: '0501234567',
        pickupLat: 24.7136,
        pickupLng: 46.6753,
        dropoffLat: 24.7236,
        dropoffLng: 46.6853,
        deliveryFee: 35.0,
        partsSummary: 'فحمات فرامل أمامية وخلفية تويوتا كامري 2024',
        createdAt: DateTime.now(),
      ),
      DeliveryTaskModel(
        id: 'DEL-5502',
        orderId: 'ORD-5502',
        status: 'ASSIGNED',
        pickupLocation: 'شركة ركن الخليج للمحركات - صناعية الشفاء، الرياض',
        dropoffLocation: 'حي الياسمين - شارع القادسية، الرياض',
        vendorName: 'شركة ركن الخليج للمحركات',
        vendorPhone: '0562233445',
        customerName: 'سلطان الدوسري',
        customerPhone: '0543322110',
        pickupLat: 24.6836,
        pickupLng: 46.7053,
        dropoffLat: 24.7836,
        dropoffLng: 46.6453,
        deliveryFee: 45.0,
        partsSummary: 'مساعدات هيدروليك جي إم سي سييرا 2023',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      DeliveryTaskModel(
        id: 'DEL-5503',
        orderId: 'ORD-5503',
        status: 'DELIVERED',
        pickupLocation: 'مركز التقوى لقطع الغيار - حي الملز، الرياض',
        dropoffLocation: 'حي النرجس - طريق أبي بكر الصديق، الرياض',
        vendorName: 'مركز التقوى لقطع الغيار',
        vendorPhone: '0519988776',
        customerName: 'خالد المطيري',
        customerPhone: '0558877665',
        pickupLat: 24.6636,
        pickupLng: 46.7253,
        dropoffLat: 24.8136,
        dropoffLng: 46.6253,
        deliveryFee: 35.0,
        partsSummary: 'دينمو كهرباء أصلي هيونداي سوناتا 2022',
        createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      ),
    ];
  }
}

class _DeliveryStatusVisual {
  final String label;
  final Color bgColor;
  final Color borderColor;
  final Color textColor;
  final Color dotColor;

  _DeliveryStatusVisual({
    required this.label,
    required this.bgColor,
    required this.borderColor,
    required this.textColor,
    required this.dotColor,
  });
}
