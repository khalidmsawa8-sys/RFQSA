import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/core/theme/app_theme.dart';

class NotificationsScreen extends StatefulWidget {
  final ApiClient apiClient;

  const NotificationsScreen({super.key, required this.apiClient});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _activeTab = 'all'; // all, unread, orders, system
  bool _isLoading = true;
  List<Map<String, dynamic>> _notifications = [];
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final res = await widget.apiClient.get(
        '/api/v1/notifications',
        fromJson: (data) => data as Map<String, dynamic>,
      );

      if (res.success && res.data != null) {
        final list = (res.data!['notifications'] as List<dynamic>?)
                ?.map((e) => Map<String, dynamic>.from(e as Map))
                .toList() ??
            [];
        final unread = res.data!['unreadCount'] as int? ?? 0;

        setState(() {
          _notifications = list;
          _unreadCount = unread;
          _isLoading = false;
        });
        NotificationService().unreadCountNotifier.value = unread;
      } else {
        setState(() => _isLoading = false);
      }
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markAsRead(String id, [int? index]) async {
    try {
      await widget.apiClient.patch('/api/v1/notifications/$id/read');
      setState(() {
        if (index != null && index < _notifications.length) {
          _notifications[index]['is_read'] = true;
        } else {
          for (var n in _notifications) {
            if (n['id'] == id) n['is_read'] = true;
          }
        }
        _unreadCount = _notifications.where((n) => n['is_read'] != true).length;
      });
      NotificationService().unreadCountNotifier.value = _unreadCount;
    } catch (_) {}
  }

  Future<void> _markAllAsRead() async {
    try {
      await widget.apiClient.patch('/api/v1/notifications/read-all');
      setState(() {
        for (var n in _notifications) {
          n['is_read'] = true;
        }
        _unreadCount = 0;
      });
      NotificationService().unreadCountNotifier.value = 0;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم تحديد جميع الإشعارات كمقروءة ✓'),
            backgroundColor: Color(0xFF0D9488),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {}
  }

  List<Map<String, dynamic>> get _filteredNotifications {
    if (_activeTab == 'unread') {
      return _notifications.where((n) => n['is_read'] != true).toList();
    } else if (_activeTab == 'orders') {
      return _notifications.where((n) {
        final t = (n['type'] ?? '').toString().toLowerCase();
        return t.contains('rfq') || t.contains('quote') || t.contains('order') || t.contains('deal') || t.contains('delivery');
      }).toList();
    } else if (_activeTab == 'system') {
      return _notifications.where((n) {
        final t = (n['type'] ?? '').toString().toLowerCase();
        return t.contains('announcement') || t.contains('wallet') || t.contains('warning') || t.contains('message');
      }).toList();
    }
    return _notifications;
  }

  String _formatRelativeTime(String? dateStr) {
    if (dateStr == null) return 'الآن';
    try {
      final d = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(d);
      if (diff.inSeconds < 60) return 'الآن';
      if (diff.inMinutes < 60) return 'منذ ${diff.inMinutes} دقيقة';
      if (diff.inHours < 24) return 'منذ ${diff.inHours} ساعة';
      if (diff.inDays == 1) return 'أمس';
      if (diff.inDays < 7) return 'منذ ${diff.inDays} أيام';
      return '${d.year}/${d.month}/${d.day}';
    } catch (_) {
      return 'مؤخراً';
    }
  }

  Map<String, dynamic> _getTypeConfig(String? type) {
    final t = (type ?? '').toLowerCase();
    if (t == 'new_quote') {
      return {
        'icon': Icons.local_offer_rounded,
        'color': const Color(0xFF059669),
        'bg': const Color(0xFFECFDF5),
        'badge': 'عرض سعر جديد',
        'badgeBg': const Color(0xFFD1FAE5),
        'badgeText': const Color(0xFF065F46),
      };
    } else if (t == 'quote_accepted') {
      return {
        'icon': Icons.check_circle_rounded,
        'color': const Color(0xFF047857),
        'bg': const Color(0xFFECFDF5),
        'badge': 'تم قبول العرض',
        'badgeBg': const Color(0xFFD1FAE5),
        'badgeText': const Color(0xFF065F46),
      };
    } else if (t == 'new_rfq') {
      return {
        'icon': Icons.description_rounded,
        'color': const Color(0xFFD97706),
        'bg': const Color(0xFFFFFBEB),
        'badge': 'طلب تسعير جديد',
        'badgeBg': const Color(0xFFFEF3C7),
        'badgeText': const Color(0xFF92400E),
      };
    } else if (t.contains('delivery') || t == 'deal_status_updated') {
      return {
        'icon': Icons.local_shipping_rounded,
        'color': const Color(0xFF2563EB),
        'bg': const Color(0xFFEFF6FF),
        'badge': 'الشحن والتوصيل',
        'badgeBg': const Color(0xFFDBEAFE),
        'badgeText': const Color(0xFF1E40AF),
      };
    } else if (t == 'order_completed') {
      return {
        'icon': Icons.verified_rounded,
        'color': const Color(0xFF0D9488),
        'bg': const Color(0xFFF0FDFA),
        'badge': 'اكتمل الطلب',
        'badgeBg': const Color(0xFFCCFBF1),
        'badgeText': const Color(0xFF115E59),
      };
    } else if (t == 'wallet_credit' || t == 'wallet') {
      return {
        'icon': Icons.account_balance_wallet_rounded,
        'color': const Color(0xFF7C3AED),
        'bg': const Color(0xFFF5F3FF),
        'badge': 'رصيد ومحفظة',
        'badgeBg': const Color(0xFFEDE9FE),
        'badgeText': const Color(0xFF5B21B6),
      };
    } else {
      return {
        'icon': Icons.campaign_rounded,
        'color': const Color(0xFF4F46E5),
        'bg': const Color(0xFFEEF2FF),
        'badge': 'تنويه إداري',
        'badgeBg': const Color(0xFFE0E7FF),
        'badgeText': const Color(0xFF3730A3),
      };
    }
  }

  void _handleNotificationTap(Map<String, dynamic> notification, int index) {
    if (notification['is_read'] != true && notification['id'] != null) {
      _markAsRead(notification['id'], index);
    }

    final type = (notification['type'] ?? '').toString().toLowerCase();
    final rfqId = notification['rfq_id'] ?? notification['rfqId'];
    final orderId = notification['order_id'] ?? notification['orderId'];
    final actionUrl = notification['action_url'] ?? '';

    if (type == 'new_rfq' || actionUrl.contains('/vendor/quote') || actionUrl.contains('/vendor/radar')) {
      Navigator.pushNamed(context, '/vendor/quote', arguments: {'rfqId': rfqId ?? 'RFQ-1153'});
    } else if (type == 'new_quote' || type == 'quote_accepted' || actionUrl.contains('/client/rfq') || actionUrl.contains('/deal')) {
      Navigator.pushNamed(context, '/client/deal-room', arguments: {'orderId': orderId ?? rfqId ?? 'ORD-5501'});
    } else if (type.contains('delivery') || actionUrl.contains('/tracking')) {
      Navigator.pushNamed(context, '/client/order-tracking', arguments: {'orderId': orderId ?? 'ORD-4920'});
    } else if (type == 'wallet_credit' || actionUrl.contains('/wallet')) {
      Navigator.pushNamed(context, '/wallet');
    } else if (type == 'new_message' || actionUrl.contains('/support')) {
      Navigator.pushNamed(context, '/client/support');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.5,
          centerTitle: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D9488).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.notifications_active_rounded, color: Color(0xFF0D9488), size: 18),
              ),
              const SizedBox(width: 10),
              const Text(
                'مركز الإشعارات',
                style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.w900),
              ),
              if (_unreadCount > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$_unreadCount جديد',
                    style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            if (_unreadCount > 0)
              TextButton.icon(
                onPressed: _markAllAsRead,
                icon: const Icon(Icons.done_all_rounded, size: 16, color: Color(0xFF0D9488)),
                label: const Text(
                  'قراءة الكل',
                  style: TextStyle(color: Color(0xFF0D9488), fontSize: 12, fontWeight: FontWeight.w800),
                ),
              ),
          ],
        ),
        body: Column(
          children: [
            // ── Tabs Bar ──
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('all', 'الكل (${_notifications.length})', Icons.inbox_rounded),
                    const SizedBox(width: 8),
                    _buildFilterChip('unread', 'غير المقروءة ($_unreadCount)', Icons.mark_email_unread_rounded),
                    const SizedBox(width: 8),
                    _buildFilterChip('orders', 'الطلبات والعروض', Icons.shopping_bag_rounded),
                    const SizedBox(width: 8),
                    _buildFilterChip('system', 'تنبيهات النظام', Icons.notifications_none_rounded),
                  ],
                ),
              ),
            ),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),

            // ── Notifications List ──
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF0D9488)))
                  : _filteredNotifications.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          color: const Color(0xFF0D9488),
                          onRefresh: _loadNotifications,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                            itemCount: _filteredNotifications.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final item = _filteredNotifications[index];
                              return _buildNotificationCard(item, index);
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String id, String label, IconData icon) {
    final isSelected = _activeTab == id;
    return InkWell(
      onTap: () => setState(() => _activeTab = id),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : const Color(0xFF64748B)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF334155),
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> item, int index) {
    final isRead = item['is_read'] == true;
    final cfg = _getTypeConfig(item['type']);
    final timeStr = _formatRelativeTime(item['created_at']);

    return InkWell(
      onTap: () => _handleNotificationTap(item, index),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: isRead ? Colors.white : const Color(0xFFF0FDF4),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isRead ? const Color(0xFFE2E8F0) : const Color(0xFF86EFAC),
            width: isRead ? 1 : 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isRead ? 0.02 : 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: cfg['bg'] as Color,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(cfg['icon'] as IconData, color: cfg['color'] as Color, size: 20),
            ),
            const SizedBox(width: 12),

            // Content Body
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Row (Badge + Relative Time)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: cfg['badgeBg'] as Color,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          cfg['badge'] as String,
                          style: TextStyle(
                            color: cfg['badgeText'] as Color,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          Text(
                            timeStr,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                          if (!isRead) ...[
                            const SizedBox(width: 6),
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Color(0xFF10B981),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Title
                  Text(
                    item['title'] ?? 'إشعار جديد',
                    style: TextStyle(
                      color: isRead ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
                      fontSize: 13.5,
                      fontWeight: isRead ? FontWeight.w700 : FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),

                  // Message body
                  Text(
                    item['message'] ?? '',
                    style: const TextStyle(
                      color: Color(0xFF475569),
                      fontSize: 12,
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                    ),
                  ),

                  // Action hint
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: const [
                      Text(
                        'عرض التفاصيل ➔',
                        style: TextStyle(color: Color(0xFF0D9488), fontSize: 11.5, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.notifications_off_outlined, size: 48, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 14),
          const Text(
            'لا توجد إشعارات في هذا التبويب',
            style: TextStyle(color: Color(0xFF334155), fontSize: 14.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          const Text(
            'ستظهر هنا جميع التنبيهات التشغيلية وعروض الأسعار',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
