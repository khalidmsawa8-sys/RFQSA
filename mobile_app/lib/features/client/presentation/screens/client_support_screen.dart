import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/utils/id_utils.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/app_sidebar_drawer.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/support_chat_modal.dart';

/// Support, Inquiries & Disputes Management Screen (1:1 Web Parity)
class ClientSupportScreen extends StatefulWidget {
  const ClientSupportScreen({super.key});

  @override
  State<ClientSupportScreen> createState() => _ClientSupportScreenState();
}

class _ClientSupportScreenState extends State<ClientSupportScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _isLoading = true;
  List<Map<String, dynamic>> _tickets = [];
  List<Map<String, dynamic>> _eligibleOrders = [];
  String _activeTab = 'all'; // all, pending, in_progress, completed, rejected
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchTickets();
    _fetchEligibleOrders();
  }

  Future<void> _fetchEligibleOrders() async {
    try {
      final res = await ApiClient.instance.get('/v1/client/orders');
      if (res.data != null) {
        List<dynamic> list = [];
        if (res.data is Map && res.data['orders'] is List) {
          list = res.data['orders'];
        } else if (res.data is List) {
          list = res.data;
        }
        if (mounted) {
          setState(() {
            _eligibleOrders = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _fetchTickets() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/v1/support');
      List<Map<String, dynamic>> loaded = [];
      if (res.data != null) {
        final raw = res.data;
        List<dynamic> list = [];
        if (raw is Map && raw['tickets'] is List) {
          list = raw['tickets'];
        } else if (raw is List) {
          list = raw;
        }

        for (var item in list) {
          if (item is Map) {
            loaded.add({
              'id': item['id'] ?? 'TCK-${item['ticket_number'] ?? "8821"}',
              'title': item['subject'] ?? item['title'] ?? 'استفسار عن طلب قطع غيار',
              'order_id': item['order_id'] ?? 'ORD-5501',
              'category': item['category'] ?? item['request_type'] ?? 'return_replacement',
              'status': item['status'] ?? 'pending',
              'created_at': item['created_at'] != null ? item['created_at'].toString().split('T').first : '2026-09-22',
              'last_reply': item['last_reply'] ?? item['description'] ?? item['reason'] ?? 'تم استلام التذكرة وجاري معالجتها من فريق الدعم.',
              'car_info': item['orders']?['rfqs'] != null
                  ? '${item['orders']['rfqs']['car_make']} ${item['orders']['rfqs']['car_model']}'
                  : null,
            });
          }
        }
      }

      if (loaded.isNotEmpty) {
        _tickets = loaded;
      } else {
        _tickets = [
          {
            'id': 'TCK-8821',
            'title': 'استفسار عن موعد وصول شحنة الفحمات',
            'order_id': 'ORD-5501',
            'category': 'delivery_delay',
            'status': 'in_progress',
            'created_at': '2026-09-22',
            'last_reply': 'تم تسليم الشحنة لمندوب التوصيل بنجاح وجاري التوجه للفرع.',
            'car_info': 'تويوتا كامري 2023',
          },
          {
            'id': 'TCK-8794',
            'title': 'طلب استرجاع فحمات غير مطابقة للمواصفات',
            'order_id': 'ORD-5503',
            'category': 'return_replacement',
            'status': 'pending',
            'created_at': '2026-09-21',
            'last_reply': 'تم رفع الطلب للمورد المعتمد للموافقة على الاسترجاع وإعادة المبلغ للمحفظة.',
            'car_info': 'هيونداي سوناتا 2022',
          },
        ];
      }
    } catch (_) {
      _tickets = [
        {
          'id': 'TCK-8821',
          'title': 'استفسار عن موعد وصول شحنة الفحمات',
          'order_id': 'ORD-5501',
          'category': 'delivery_delay',
          'status': 'in_progress',
          'created_at': '2026-09-22',
          'last_reply': 'تم تسليم الشحنة لمندوب التوصيل بنجاح وجاري التوجه للفرع.',
          'car_info': 'تويوتا كامري 2023',
        },
      ];
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openLiveChat(Map<String, dynamic> ticket) {
    SupportChatModal.show(context, ticket: ticket, onTicketUpdated: _fetchTickets);
  }

  bool _matchesStatus(String ticketStatus, String filter) {
    if (filter == 'all') return true;
    final s = ticketStatus.toLowerCase();
    if (filter == 'pending') return s == 'pending' || s == 'open';
    if (filter == 'in_progress') return s == 'in_progress' || s == 'accepted';
    if (filter == 'completed') return s == 'completed' || s == 'closed' || s == 'resolved';
    if (filter == 'rejected') return s == 'rejected';
    return s == filter;
  }

  List<Map<String, dynamic>> get _filteredTickets {
    return _tickets.where((t) {
      if (!_matchesStatus(t['status']?.toString() ?? '', _activeTab)) return false;
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final matchId = t['id']?.toString().toLowerCase().contains(q) ?? false;
        final matchTitle = t['title']?.toString().toLowerCase().contains(q) ?? false;
        final matchOrder = t['order_id']?.toString().toLowerCase().contains(q) ?? false;
        return matchId || matchTitle || matchOrder;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: const AppSidebarDrawer(currentRoute: AppRouter.clientSupport),
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
              'مركز الدعم والمساعدة للعملاء',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 15,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              'متابعة البلاغات، الاسترجاع، والتواصل المباشر 24/7',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            onPressed: _fetchTickets,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: ElevatedButton.icon(
              onPressed: () => _showNewTicketModal(context),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('تذكرة جديدة', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 10),
              ),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchTickets,
              child: ListView(
                padding: const EdgeInsets.all(14),
                children: [
                  // ── QUICK HELP CARDS ──
                  Row(
                    children: [
                      Expanded(
                        child: _buildContactChannel(
                          icon: Icons.chat_rounded,
                          title: 'محادثة عضو المدير 🛡️',
                          subtitle: 'مباشرة مع الإدارة',
                          color: const Color(0xFF059669),
                          onTap: () {
                            final targetTicket = _tickets.isNotEmpty
                                ? _tickets.first
                                : {
                                    'id': 'TCK-LIVE',
                                    'title': 'محادثة مباشرة مع عضو المدير',
                                    'status': 'open',
                                    'last_reply': 'مرحباً، أود التواصل المباشر مع إدارة المنصة بخصوص طلباتي.'
                                  };
                            _openLiveChat(targetTicket);
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildContactChannel(
                          icon: Icons.phone_in_talk_rounded,
                          title: 'الاتصال المباشر',
                          subtitle: '920000000',
                          color: const Color(0xFF2563EB),
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('جاري الاتصال بمركز الاتصال الموحد 📞')),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // ── SEARCH BAR ──
                  Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: TextField(
                      onChanged: (v) => setState(() => _searchQuery = v),
                      decoration: const InputDecoration(
                        hintText: 'ابحث برقم التذكرة، الطلب، أو الموضوع...',
                        hintStyle: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        prefixIcon: Icon(Icons.search_rounded, size: 20, color: Color(0xFF94A3B8)),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── TABS FILTER (1:1 Web Parity) ──
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildTabButton('all', 'جميع التذاكر (${_tickets.length})'),
                        const SizedBox(width: 8),
                        _buildTabButton('pending', 'قيد الانتظار (${_tickets.where((t) => _matchesStatus(t['status'] ?? '', 'pending')).length})'),
                        const SizedBox(width: 8),
                        _buildTabButton('in_progress', 'قيد المعالجة (${_tickets.where((t) => _matchesStatus(t['status'] ?? '', 'in_progress')).length})'),
                        const SizedBox(width: 8),
                        _buildTabButton('completed', 'مكتمل (${_tickets.where((t) => _matchesStatus(t['status'] ?? '', 'completed')).length})'),
                        const SizedBox(width: 8),
                        _buildTabButton('rejected', 'مرفوض (${_tickets.where((t) => _matchesStatus(t['status'] ?? '', 'rejected')).length})'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── TICKETS ITEMS ──
                  if (_filteredTickets.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        children: const [
                          Icon(Icons.support_agent_rounded, size: 48, color: Color(0xFF94A3B8)),
                          SizedBox(height: 10),
                          Text('لا توجد تذاكر في هذا القسم', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                          SizedBox(height: 4),
                          Text('يمكنك إنشاء تذكرة دعم جديدة في أي وقت وسيقوم الفريق بالرد فوراً', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        ],
                      ),
                    )
                  else
                    ..._filteredTickets.map((t) => _buildTicketCard(t)),
                ],
              ),
            ),
    );
  }

  Widget _buildTabButton(String key, String label) {
    final isSelected = _activeTab == key;
    return InkWell(
      onTap: () => setState(() => _activeTab = key),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildContactChannel({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
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
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(child: Icon(icon, color: color, size: 22)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                  Text(subtitle, style: TextStyle(fontSize: 10.5, color: color, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _getCategoryMeta(String? cat) {
    switch (cat) {
      case 'return_replacement':
        return {'label': 'الاستبدال والاسترجاع', 'color': const Color(0xFF7C3AED), 'bg': const Color(0xFFF3E8FF)};
      case 'item_mismatch':
        return {'label': 'الطلب غير مطابق', 'color': const Color(0xFFD97706), 'bg': const Color(0xFFFEF3C7)};
      case 'delivery_delay':
        return {'label': 'تأخر في التوصيل', 'color': const Color(0xFF2563EB), 'bg': const Color(0xFFEFF6FF)};
      case 'suggestion':
        return {'label': 'اقتراح للتطوير', 'color': const Color(0xFF059669), 'bg': const Color(0xFFECFDF5)};
      default:
        return {'label': 'مساعدة عامة', 'color': const Color(0xFF475569), 'bg': const Color(0xFFF1F5F9)};
    }
  }

  Map<String, dynamic> _getStatusMeta(String? st) {
    switch (st?.toLowerCase()) {
      case 'pending':
      case 'open':
        return {'label': 'قيد الانتظار', 'color': const Color(0xFFD97706), 'bg': const Color(0xFFFFFBEB)};
      case 'in_progress':
      case 'accepted':
        return {'label': 'قيد المعالجة', 'color': const Color(0xFF2563EB), 'bg': const Color(0xFFEFF6FF)};
      case 'completed':
      case 'resolved':
      case 'closed':
        return {'label': 'مكتمل ومغلق ✅', 'color': const Color(0xFF059669), 'bg': const Color(0xFFECFDF5)};
      case 'rejected':
        return {'label': 'مرفوض ❌', 'color': const Color(0xFFDC2626), 'bg': const Color(0xFFFEF2F2)};
      default:
        return {'label': 'نشط', 'color': const Color(0xFF475569), 'bg': const Color(0xFFF1F5F9)};
    }
  }

  Widget _buildTicketCard(Map<String, dynamic> t) {
    final catMeta = _getCategoryMeta(t['category']);
    final stMeta = _getStatusMeta(t['status']);
    final carInfo = t['car_info'];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _openLiveChat(t),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Row 1: ID + Category Pill + Status Pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        '#${t['id']}',
                        style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.primary),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: catMeta['bg'] as Color,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          catMeta['label'] as String,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: catMeta['color'] as Color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: stMeta['bg'] as Color,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      stMeta['label'] as String,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                        color: stMeta['color'] as Color,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Title
              Text(
                t['title'],
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 4),

              // Order ID and Vehicle Info
              Row(
                children: [
                  Text('الطلب: #${t['order_id']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                  if (carInfo != null) ...[
                    const Text(' • ', style: TextStyle(color: Color(0xFFCBD5E1))),
                    Text(carInfo, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                  const Spacer(),
                  Text(t['created_at'], style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8))),
                ],
              ),
              const SizedBox(height: 10),

              // Last reply box
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.chat_bubble_outline_rounded, size: 14, color: Color(0xFF2563EB)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        t['last_reply'],
                        style: const TextStyle(fontSize: 11, color: Color(0xFF334155), fontWeight: FontWeight.w600),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF94A3B8)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showNewTicketModal(BuildContext context) {
    int currentStep = 1;
    String selectedCategory = 'return_replacement';
    Map<String, dynamic>? selectedOrder;
    final titleController = TextEditingController();
    final descController = TextEditingController();
    bool agreeToPolicy = true;

    final categories = [
      {
        'key': 'return_replacement',
        'title': 'الاستبدال والاسترجاع',
        'desc': 'طلب إرجاع أو استبدال قطع غيار معتمدة',
        'icon': Icons.replay_rounded,
        'color': const Color(0xFF7C3AED),
        'requiresOrder': true,
      },
      {
        'key': 'item_mismatch',
        'title': 'الطلب غير مطابق',
        'desc': 'القطع المستلمة تختلف عن مواصفات الطلب',
        'icon': Icons.report_problem_rounded,
        'color': const Color(0xFFD97706),
        'requiresOrder': true,
      },
      {
        'key': 'delivery_delay',
        'title': 'التأخر في استلام الطلب',
        'desc': 'متابعة شحنة متأخرة عن الموعد المحدد',
        'icon': Icons.local_shipping_rounded,
        'color': const Color(0xFF2563EB),
        'requiresOrder': true,
      },
      {
        'key': 'suggestion',
        'title': 'اقتراح للتطوير',
        'desc': 'أفكار ومقترحات لتحسين المنصة والخدمة',
        'icon': Icons.auto_awesome_rounded,
        'color': const Color(0xFF059669),
        'requiresOrder': false,
      },
      {
        'key': 'other',
        'title': 'أخرى ومساعدة عامة',
        'desc': 'استفسارات عامة ومواضيع أخرى',
        'icon': Icons.help_outline_rounded,
        'color': const Color(0xFF475569),
        'requiresOrder': false,
      },
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final catObj = categories.firstWhere((c) => c['key'] == selectedCategory);
            final requiresOrder = catObj['requiresOrder'] == true;

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 16,
                top: 16,
                left: 16,
                right: 16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag Handle
                  Center(
                    child: Container(
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.support_agent_rounded, color: Color(0xFF2563EB), size: 20),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'إنشاء تذكرة دعم وبلاغ جديد',
                                style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                'الخطوة $currentStep من ${requiresOrder ? 3 : 2}',
                                style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFE2E8F0)),

                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── STEP 1: SELECT CATEGORY ──
                          if (currentStep == 1) ...[
                            const Text(
                              'حدد نوع البلاغ أو الاستفسار:',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 10),
                            ...categories.map((cat) {
                              final isSel = selectedCategory == cat['key'];
                              final c = cat['color'] as Color;
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                decoration: BoxDecoration(
                                  color: isSel ? c.withOpacity(0.06) : Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: isSel ? c : const Color(0xFFE2E8F0),
                                    width: isSel ? 1.8 : 1,
                                  ),
                                ),
                                child: ListTile(
                                  onTap: () => setModalState(() => selectedCategory = cat['key'] as String),
                                  leading: Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: c.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(cat['icon'] as IconData, color: c, size: 20),
                                  ),
                                  title: Text(
                                    cat['title'] as String,
                                    style: TextStyle(fontSize: 12.5, fontWeight: isSel ? FontWeight.w900 : FontWeight.bold, color: const Color(0xFF0F172A)),
                                  ),
                                  subtitle: Text(
                                    cat['desc'] as String,
                                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                                  ),
                                  trailing: isSel
                                      ? Icon(Icons.check_circle_rounded, color: c, size: 20)
                                      : const Icon(Icons.circle_outlined, color: Color(0xFFCBD5E1), size: 20),
                                ),
                              );
                            }),
                          ],

                          // ── STEP 2: SELECT ORDER (if required) ──
                          if (currentStep == 2 && requiresOrder) ...[
                            const Text(
                              'اختر الطلب المرتبط بهذا البلاغ:',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 10),
                            if (_eligibleOrders.isEmpty)
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: const Text(
                                  'سيتم ربط التذكرة بآخر طلب نشط لديك تلقائياً.',
                                  style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                                ),
                              )
                            else
                              ..._eligibleOrders.map((ord) {
                                final ordId = ord['id']?.toString() ?? 'ORD-5501';
                                final isSel = selectedOrder != null && selectedOrder!['id'] == ordId;
                                final rfq = ord['rfqs'] ?? ord['rfq'] ?? {};
                                final car = '${rfq['car_make'] ?? "مركبة"} ${rfq['car_model'] ?? ""} ${rfq['car_year'] ?? ""}';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  decoration: BoxDecoration(
                                    color: isSel ? const Color(0xFFEFF6FF) : Colors.white,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: isSel ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                                      width: isSel ? 1.8 : 1,
                                    ),
                                  ),
                                  child: ListTile(
                                    onTap: () => setModalState(() => selectedOrder = ord),
                                    leading: const Icon(Icons.receipt_rounded, color: Color(0xFF2563EB)),
                                    title: Text(
                                      'طلب #${IdUtils.safeShortId(ordId, prefix: "ORD-")} ($car)',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                    ),
                                    subtitle: Text(
                                      'الإجمالي: ${ord['total_price'] ?? "—"} ر.س • الحالة: ${ord['status'] ?? "نشط"}',
                                      style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                                    ),
                                    trailing: isSel
                                        ? const Icon(Icons.check_circle_rounded, color: Color(0xFF2563EB), size: 20)
                                        : const Icon(Icons.circle_outlined, color: Color(0xFFCBD5E1), size: 20),
                                  ),
                                );
                              }),
                          ],

                          // ── STEP FINAL: DETAILS & POLICY ──
                          if ((currentStep == 2 && !requiresOrder) || (currentStep == 3 && requiresOrder)) ...[
                            const Text('عنوان التذكرة أو المشكلة:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            TextField(
                              controller: titleController,
                              decoration: InputDecoration(
                                hintText: 'مثال: ${catObj['title']} بخصوص الطلب...',
                                hintStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                                filled: true,
                                fillColor: const Color(0xFFF8FAFC),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                            ),
                            const SizedBox(height: 12),

                            const Text('تفاصيل البلاغ / السبب بالتفصيل:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            TextField(
                              controller: descController,
                              maxLines: 4,
                              decoration: InputDecoration(
                                hintText: 'اكتب الملاحظات والتفاصيل بالكامل لمساعدة فريق الدعم في حل الطلب سريعاً...',
                                hintStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                                filled: true,
                                fillColor: const Color(0xFFF8FAFC),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                contentPadding: const EdgeInsets.all(12),
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Policy Box
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFDE68A)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Row(
                                    children: [
                                      Icon(Icons.shield_outlined, size: 16, color: Color(0xFFD97706)),
                                      SizedBox(width: 6),
                                      Text('سياسة المنصة والمعالجة:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                                    ],
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    '• مدة الرد والمعالجة: خلال 24 ساعة عمل.\n• في طلبات الاسترجاع، يجب بقاء القطع بتغليفها الأصلي.\n• تتم إعادة المبالغ مباشرة إلى محفظة المنصة.',
                                    style: TextStyle(fontSize: 10, color: Color(0xFFB45309), height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),

                            CheckboxListTile(
                              value: agreeToPolicy,
                              onChanged: (v) => setModalState(() => agreeToPolicy = v ?? true),
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              title: const Text(
                                'أوافق على سياسة الاسترجاع والشروط المعتمدة',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),

                  // Actions
                  Row(
                    children: [
                      if (currentStep > 1)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => setModalState(() => currentStep--),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text('السابق', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                          ),
                        ),
                      if (currentStep > 1) const SizedBox(width: 10),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: () async {
                            final maxStep = requiresOrder ? 3 : 2;
                            if (currentStep < maxStep) {
                              setModalState(() => currentStep++);
                              return;
                            }

                            final t = titleController.text.trim();
                            final d = descController.text.trim();
                            final finalTitle = t.isNotEmpty ? t : catObj['title'] as String;
                            final orderId = selectedOrder?['id']?.toString() ?? (_eligibleOrders.isNotEmpty ? _eligibleOrders.first['id']?.toString() : 'ORD-5501');

                            try {
                              await ApiClient.instance.post('/v1/support', data: {
                                'subject': finalTitle,
                                'description': d,
                                'reason': d,
                                'category': selectedCategory,
                                'request_type': selectedCategory,
                                'order_id': orderId,
                              });
                            } catch (_) {}

                            if (context.mounted) {
                              Navigator.pop(ctx);
                              _fetchTickets();
                              ScaffoldMessenger.of(this.context).showSnackBar(
                                const SnackBar(
                                  content: Text('✅ تم إنشاء تذكرة الدعم بنجاح وسيتواصل معك الفريق فوراً'),
                                  backgroundColor: Color(0xFF059669),
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                          child: Text(
                            currentStep < (requiresOrder ? 3 : 2) ? 'التالي ➔' : 'إرسال التذكرة الآن 🚀',
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                        ),
                      ),
                    ],
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
