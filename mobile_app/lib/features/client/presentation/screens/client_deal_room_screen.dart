import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/core/utils/id_utils.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/state_machine/order_state_machine.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_order_tracking_screen.dart';
import 'package:rfqsa_mobile/features/client/bloc/client_rfq_bloc.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/client/models/quote_model.dart';
import 'package:rfqsa_mobile/features/client/repositories/client_repository.dart';

/// Deal Room Screen for Quotes Comparison, Itemized Breakdown, Deal Acceptance & Order Tracking (1:1 Web Parity)
class ClientDealRoomScreen extends StatefulWidget {
  final String rfqId;
  final RfqModel? initialRfq;
  final ClientRepository clientRepository;

  const ClientDealRoomScreen({
    super.key,
    required this.rfqId,
    this.initialRfq,
    required this.clientRepository,
  });

  @override
  State<ClientDealRoomScreen> createState() => _ClientDealRoomScreenState();
}

class _ClientDealRoomScreenState extends State<ClientDealRoomScreen> {
  RfqModel? _rfq;
  Map<String, dynamic>? _order;
  List<QuoteModel> _quotes = [];
  bool _isLoading = true;
  bool _isReactivating = false;
  bool _isConfirmingReceipt = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialRfq != null) {
      _rfq = widget.initialRfq;
      _quotes = widget.initialRfq!.quotes ?? [];
      _isLoading = false;
    }
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    if (_rfq == null && _order == null) {
      setState(() => _isLoading = true);
    }
    final rawId = widget.rfqId;
    final cleanId = rawId.replaceFirst('REQ-', '').replaceFirst('RFQ-', '').replaceFirst('ORD-', '');
    
    // 1. Direct RFQ details fetch
    try {
      final res = await widget.clientRepository.fetchRfqDetails(cleanId);
      if (res.success && res.data != null) {
        if (mounted) {
          setState(() {
            _rfq = res.data!;
            _quotes = res.data!.quotes ?? _quotes;
            _isLoading = false;
          });
        }
        await _fetchQuotesForRfq(res.data!.id);
        return;
      }
    } catch (_) {}

    // 1.1 Try with raw ID
    if (rawId != cleanId) {
      try {
        final res = await widget.clientRepository.fetchRfqDetails(rawId);
        if (res.success && res.data != null) {
          if (mounted) {
            setState(() {
              _rfq = res.data!;
              _quotes = res.data!.quotes ?? _quotes;
              _isLoading = false;
            });
          }
          await _fetchQuotesForRfq(res.data!.id);
          return;
        }
      } catch (_) {}
    }

    // 2. Fallback: Search in Client's list of RFQs
    try {
      final myRfqsRes = await widget.clientRepository.fetchMyRfqs();
      if (myRfqsRes.success && myRfqsRes.data != null && myRfqsRes.data!.isNotEmpty) {
        final found = myRfqsRes.data!.firstWhere(
          (r) =>
              r.id == rawId ||
              r.id == cleanId ||
              r.id == 'REQ-$cleanId' ||
              r.id == 'RFQ-$cleanId' ||
              r.shortId == cleanId ||
              r.id.contains(cleanId),
          orElse: () => myRfqsRes.data!.first,
        );

        if (mounted) {
          setState(() {
            _rfq = found;
            _quotes = found.quotes ?? _quotes;
            _isLoading = false;
          });
        }
        await _fetchQuotesForRfq(found.id);
        return;
      }
    } catch (_) {}

    // 3. If not found as RFQ, try fetching as Order (Deal Room for active deals)
    try {
      final ordRes = await ApiClient.instance.get(ApiEndpoints.orderDetails(cleanId));
      if (ordRes.data != null && ordRes.data['order'] != null) {
        final ord = ordRes.data['order'] as Map<String, dynamic>;
        if (mounted) {
          setState(() {
            _order = ord;
            _isLoading = false;
          });
        }
        return;
      }
    } catch (_) {}

    if (mounted) setState(() => _isLoading = false);
  }

  // ── HELPER: FETCH QUOTES FOR RFQ ──
  Future<void> _fetchQuotesForRfq(String rfqId) async {
    try {
      final cleanId = rfqId.replaceFirst('REQ-', '').replaceFirst('RFQ-', '');
      final res = await ApiClient.instance.get('/quotes?rfq_id=$cleanId');
      List<QuoteModel> quotesList = [];
      if (res.data is Map && res.data['quotes'] is List) {
        quotesList = (res.data['quotes'] as List).map((q) => QuoteModel.fromJson(q as Map<String, dynamic>)).toList();
      } else if (res.data is List) {
        quotesList = (res.data as List).map((q) => QuoteModel.fromJson(q as Map<String, dynamic>)).toList();
      }

      if (quotesList.isNotEmpty && mounted) {
        setState(() {
          _quotes = quotesList;
        });
      }
    } catch (_) {}
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تم نسخ $label بنجاح ($text)'),
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _makeCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _handleReactivate() async {
    if (_rfq == null) return;
    setState(() => _isReactivating = true);
    try {
      final res = await ApiClient.instance.post(ApiEndpoints.reactivateRfq(_rfq!.id));
      if (res.statusCode == 200 || res.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تمت إعادة تنشيط الطلب وبثه للموردين لمدة 24 ساعة إضافية 🚀'),
            backgroundColor: Color(0xFF059669),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchDetails();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذر إعادة التنشيط: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isReactivating = false);
    }
  }

  Future<void> _confirmReceipt() async {
    final orderId = _order?['id']?.toString() ?? widget.rfqId;
    setState(() => _isConfirmingReceipt = true);
    try {
      final res = await ApiClient.instance.post(ApiEndpoints.confirmReceipt(orderId));
      if (res.statusCode == 200 || res.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم تأكيد استلام الشحنة وإغلاق الطلب بنجاح ✅'),
            backgroundColor: Color(0xFF059669),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchDetails();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('فشل تأكيد الاستلام: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isConfirmingReceipt = false);
    }
  }

  void _inspectQuote(QuoteModel q) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _QuoteInspectionModal(
        quote: q,
        rfq: _rfq,
        onAcceptOrder: (acceptedQuote, selectedItems, finalTotal, couponCode) async {
          Navigator.pop(ctx);
          await _processOrderAcceptance(acceptedQuote, selectedItems, finalTotal, couponCode);
        },
      ),
    );
  }

  Future<void> _processOrderAcceptance(
    QuoteModel q,
    List<Map<String, dynamic>> selectedItems,
    double finalTotal,
    String? couponCode,
  ) async {
    setState(() => _isLoading = true);
    final rawNum = widget.rfqId.replaceAll(RegExp(r'\D+'), '');
    final orderId = 'ORD-$rawNum';
    final dealId = 'DEAL-$rawNum';

    try {
      // 1. Create Order via authoritative API
      final orderPayload = {
        'id': orderId,
        'rfq_id': _rfq?.id ?? widget.rfqId,
        'quote_id': q.id,
        'vendor_id': q.vendorId,
        'client_id': 'client-demo-id',
        'status': 'confirmed',
        'total_price': finalTotal,
        'items': selectedItems,
        'deal_id': dealId,
        'coupon_code': couponCode,
      };

      await ApiClient.instance.post(
        ApiEndpoints.orders,
        data: orderPayload,
      );

      // 2. Update quote status to accepted
      try {
        await ApiClient.instance.put(
          '/quotes/${q.id}',
          data: {'status': 'accepted'},
        );
      } catch (_) {}

      // 3. Register coupon usage if applied
      if (couponCode != null && couponCode.isNotEmpty) {
        try {
          await ApiClient.instance.post(
            '/coupons',
            data: {'action': 'use', 'code': couponCode},
          );
        } catch (_) {}
      }

      // 4. Update RFQ status locally and in BLoC
      if (mounted) {
        context.read<ClientRfqBloc>().add(
              AcceptQuoteSubmittedEvent(
                rfqId: _rfq?.id ?? widget.rfqId,
                quoteId: q.id,
                vendorId: q.vendorId,
                totalPrice: finalTotal,
                items: selectedItems,
              ),
            );

        // Show Success Celebration and Navigate to Tracking Screen
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (dialogCtx) => Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            backgroundColor: Colors.white,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      color: Color(0xFFECFDF5),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 40),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'تم قبول العرض وتأكيد الصفقة بنجاح 🎉',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'رقم أمر الشراء: #$orderId\nتم نقل الطلب إلى "الطلبات النشطة" وتعيين مندوب التوصيل.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(dialogCtx); // close dialog
                      // Navigate to Live Order Tracking Screen
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ClientOrderTrackingScreen(
                            orderId: orderId,
                            orderData: orderPayload,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.delivery_dining_rounded, size: 18),
                    label: const Text('متابعة الطلب والتوصيل المباشر 🚚', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('حدث خطأ أثناء تأكيد العرض: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayId = '#REQ-${IdUtils.safeShortId(widget.rfqId, prefix: "RFQ-")}';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'غرفة الصفقات $displayId',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchDetails,
          ),
        ],
      ),
      body: _isLoading && _rfq == null && _order == null
          ? const Center(child: CircularProgressIndicator())
          : _rfq == null && _order == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.search_off_rounded, size: 48, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 12),
                      const Text('تعذر تحميل بيانات الطلب أو تم نقله'),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _fetchDetails, child: const Text('إعادة المحاولة')),
                    ],
                  ),
                )
              : Stack(
                  children: [
                    SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // 1. Vehicle & VIN Info Card
                          _buildVehicleCard(),
                          const SizedBox(height: 14),

                          // 2. Parts Breakdown Card
                          _buildPartsCard(),
                          const SizedBox(height: 16),

                          // 3. Quotes Section or Order Progress
                          if (_order != null)
                            _buildConfirmedOrderSection()
                          else
                            _buildQuotesComparisonSection(),
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
                          valueColor: AlwaysStoppedAnimation(Color(0xFF2563EB)),
                        ),
                      ),
                  ],
                ),
    );
  }

  Widget _buildVehicleCard() {
    final make = _rfq?.carMake ?? _order?['rfqs']?['car_make'] ?? 'تويوتا';
    final model = _rfq?.carModel ?? _order?['rfqs']?['car_model'] ?? 'كامري';
    final year = _rfq?.carYear?.toString() ?? _order?['rfqs']?['car_year']?.toString() ?? '2023';
    final plate = _rfq?.plateNumber ?? _order?['rfqs']?['plate_number'] ?? '—';
    final vin = _rfq?.vin ?? _order?['rfqs']?['vin'] ?? '—';
    final location = _rfq != null ? '${_rfq!.deliveryCity} — ${_rfq!.deliveryLocation}' : (_order?['rfqs']?['delivery_location'] ?? 'الرياض');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.directions_car_rounded, color: Color(0xFF2563EB), size: 22),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$make $model ($year)',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      Text('اللوحة: $plate', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _order != null ? 'صفقة معتمدة 🚀' : (_quotes.isNotEmpty ? '${_quotes.length} عروض مستلمة' : 'بانتظار العروض'),
                  style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),

          // VIN with Copy Action
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.qr_code_rounded, size: 16, color: Color(0xFF64748B)),
                  const SizedBox(width: 6),
                  Text('رقم الهيكل: $vin', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                ],
              ),
              if (vin != '—')
                InkWell(
                  onTap: () => _copyToClipboard(vin, 'رقم الهيكل'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.copy_rounded, size: 12, color: Color(0xFF2563EB)),
                        SizedBox(width: 4),
                        Text('نسخ', style: TextStyle(fontSize: 10, color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on_rounded, size: 16, color: Color(0xFF059669)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'الموقع: $location',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPartsCard() {
    List<RfqItemModel> items = _rfq?.items ?? [];
    if (items.isEmpty && _order != null) {
      final desc = _order?['rfqs']?['parts_description']?.toString() ?? '';
      try {
        final decoded = jsonDecode(desc);
        if (decoded is List) {
          items = decoded.map((e) => RfqItemModel.fromJson(e as Map<String, dynamic>)).toList();
        }
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.build_circle_rounded, color: Color(0xFF2563EB), size: 18),
              SizedBox(width: 6),
              Text(
                'قائمة قطع الغيار المطلوبة',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),

          if (items.isEmpty)
            const Text('قطع غيار معتمدة بالطلب', style: TextStyle(fontSize: 11, color: Color(0xFF64748B)))
          else
            ...items.asMap().entries.map((e) {
              final idx = e.key;
              final item = e.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${idx + 1}',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.partName,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                    ),
                    if (item.partNumber != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item.partNumber!,
                          style: const TextStyle(fontSize: 9.5, fontFamily: 'monospace', color: Color(0xFF475569)),
                        ),
                      ),
                    const SizedBox(width: 8),
                    Text(
                      'الكمية: ${item.quantity}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              );
            }).toList(),
        ],
      ),
    );
  }

  Widget _buildQuotesComparisonSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'عروض الأسعار المستلمة من الموردين',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${_quotes.length} عروض',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (_quotes.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                const Icon(Icons.radar_rounded, size: 48, color: Color(0xFF38BDF8)),
                const SizedBox(height: 12),
                const Text(
                  'جاري استقبال وفحص عروض الأسعار من الموردين...',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'سيصلك إشعار صوتي لحظي فور قيام أي مورد معتمد بتقديم تسعيرة',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _isReactivating ? null : _handleReactivate,
                  icon: _isReactivating
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('إعادة تنشيط الطلب وتنبيه الموردين'),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _quotes.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, idx) {
              final q = _quotes[idx];
              return _buildQuoteCard(q);
            },
          ),
      ],
    );
  }

  Widget _buildQuoteCard(QuoteModel q) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Icon(Icons.storefront_rounded, color: Color(0xFF2563EB), size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              q.vendorName ?? 'مؤسسة قطع الغيار المعتمدة',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.verified_rounded, color: Color(0xFF2563EB), size: 14),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, color: Color(0xFFD97706), size: 14),
                          const SizedBox(width: 2),
                          const Text('4.9', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                          const SizedBox(width: 8),
                          Text('التوصيل: خلال ${q.deliveryDays} يوم', style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      CurrencyFormatter.format(q.totalPrice),
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF059669)),
                    ),
                    const Text('شامل الضريبة', style: TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                  ],
                ),
              ],
            ),
            if (q.notes != null && q.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('ملاحظات: ${q.notes}', style: const TextStyle(fontSize: 10.5, color: Color(0xFF475569))),
              ),
            ],
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 10),

            InkWell(
              onTap: () => _inspectQuote(q),
              borderRadius: BorderRadius.circular(10),
              child: ElevatedButton.icon(
                onPressed: () => _inspectQuote(q),
                icon: const Icon(Icons.check_circle_rounded, size: 16),
                label: const Text('قبول هذا العرض وتأكيد الصفقة 🚀', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _computeFallbackOtp(String id) {
    final clean = id.replaceAll(RegExp(r'\D'), '');
    final n = int.tryParse(clean) ?? 6997;
    return (((n * 31337 + 7919).abs() % 9000) + 1000).toString();
  }

  Widget _buildConfirmedOrderSection() {
    final status = _order?['status']?.toString() ?? 'preparing';
    final totalPrice = double.tryParse(_order?['total_price']?.toString() ?? '') ?? 0.0;
    final rawOtpTarget = _order?['id']?.toString() ?? _order?['order_id']?.toString() ?? widget.rfqId;
    final otp = _order?['otp']?.toString() ?? _order?['otp_code']?.toString() ?? _order?['delivery_otp']?.toString() ?? _computeFallbackOtp(rawOtpTarget);
    final courierName = _order?['courier_name']?.toString() ?? 'مندوب التوصيل السريع';
    final courierPhone = _order?['courier_phone']?.toString() ?? '0501234567';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // OTP Badge
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('رمز استلام الشحنة (سري 🔒)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  SizedBox(height: 2),
                  Text('أعطه للمندوب فقط عند الاستلام', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                ],
              ),
              Text(otp, style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 24, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Order Total Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('إجمالي الفاتورة الإلكترونية:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              Text(CurrencyFormatter.format(totalPrice), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF059669))),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Courier Contact Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              const Icon(Icons.delivery_dining_rounded, color: Color(0xFF2563EB), size: 28),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(courierName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    Text(courierPhone, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => _makeCall(courierPhone),
                icon: const Icon(Icons.phone_rounded, color: Color(0xFF059669)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        if (status != 'completed' && status != 'received') ...[
          if (!OrderStateMachine.canClientConfirmReceipt(status))
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: Color(0xFF2563EB), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      OrderStateMachine.getClientConfirmDisabledReason(status),
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
                    ),
                  ),
                ],
              ),
            ),
          ElevatedButton.icon(
            onPressed: _isConfirmingReceipt ? null : _confirmReceipt,
            icon: _isConfirmingReceipt
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.check_circle_outline_rounded),
            label: const Text('تأكيد استلام وفحص القطع وإغلاق الطلب ✅', style: TextStyle(fontWeight: FontWeight.w900)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE INSPECTION & DETAILS MODAL (1:1 PIXEL PERFECT WITH WEB INSPECTION MODAL)
// ─────────────────────────────────────────────────────────────────────────────

class _QuoteInspectionItem {
  final String partName;
  final String? partNumber;
  final double originalPrice;
  final double commercialPrice;
  final String? commercialBrand;
  final double unitPrice;
  final int quantity;
  final String availability;
  final List<String> images;
  bool isAccepted;
  String chosenType; // 'original' or 'commercial'

  _QuoteInspectionItem({
    required this.partName,
    this.partNumber,
    required this.originalPrice,
    required this.commercialPrice,
    this.commercialBrand,
    required this.unitPrice,
    required this.quantity,
    required this.availability,
    required this.images,
    this.isAccepted = true,
    this.chosenType = 'original',
  });

  bool get isDualPriced => originalPrice > 0 && commercialPrice > 0;

  double get effectivePrice {
    if (chosenType == 'commercial' && commercialPrice > 0) {
      return commercialPrice;
    }
    if (originalPrice > 0) {
      return originalPrice;
    }
    return unitPrice > 0 ? unitPrice : 0.0;
  }
}

class _QuoteInspectionModal extends StatefulWidget {
  final QuoteModel quote;
  final RfqModel? rfq;
  final Function(QuoteModel acceptedQuote, List<Map<String, dynamic>> selectedItems, double finalTotal, String? couponCode) onAcceptOrder;

  const _QuoteInspectionModal({
    required this.quote,
    this.rfq,
    required this.onAcceptOrder,
  });

  @override
  State<_QuoteInspectionModal> createState() => _QuoteInspectionModalState();
}

class _QuoteInspectionModalState extends State<_QuoteInspectionModal> {
  late List<_QuoteInspectionItem> _items;
  final TextEditingController _couponController = TextEditingController();
  Map<String, dynamic>? _appliedCoupon;
  String? _couponError;
  bool _isApplyingCoupon = false;

  @override
  void initState() {
    super.initState();
    _initItems();
  }

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  void _initItems() {
    final rawList = widget.quote.items;
    List<_QuoteInspectionItem> parsed = [];

    if (rawList.isNotEmpty) {
      for (int i = 0; i < rawList.length; i++) {
        final it = rawList[i];
        if (it is Map) {
          final pName = it['part_name']?.toString() ?? it['name']?.toString() ?? 'قطعة غيار';
          final pNum = it['part_number']?.toString();
          final origP = double.tryParse(it['original_price']?.toString() ?? (it['part_type'] == 'original' ? it['unit_price']?.toString() : null) ?? '0') ?? 0.0;
          final commP = double.tryParse(it['commercial_price']?.toString() ?? (it['part_type'] == 'commercial' ? it['unit_price']?.toString() : null) ?? '0') ?? 0.0;
          final commBrand = it['commercial_brand']?.toString() ??
              it['part_brand']?.toString() ??
              it['brand']?.toString() ??
              it['brand_name']?.toString() ??
              it['commercialBrand']?.toString() ??
              it['manufacturer']?.toString();
          final unitP = double.tryParse(it['unit_price']?.toString() ?? it['price']?.toString() ?? '0') ?? (origP > 0 ? origP : (commP > 0 ? commP : 0.0));
          final qty = int.tryParse(it['quantity']?.toString() ?? '1') ?? 1;
          final avail = it['availability']?.toString() ?? 'available';
          final imgs = it['images'] is List ? List<String>.from(it['images']) : (it['image_url'] != null ? [it['image_url'].toString()] : <String>[]);

          String defaultType = 'original';
          if (origP == 0 && commP > 0) defaultType = 'commercial';
          else if (it['part_type'] == 'commercial') defaultType = 'commercial';

          parsed.add(_QuoteInspectionItem(
            partName: pName,
            partNumber: pNum,
            originalPrice: origP,
            commercialPrice: commP,
            commercialBrand: (commBrand != null && commBrand.trim().isNotEmpty) ? commBrand.trim() : null,
            unitPrice: unitP,
            quantity: qty,
            availability: avail,
            images: imgs,
            isAccepted: avail != 'unavailable',
            chosenType: defaultType,
          ));
        }
      }
    }

    if (parsed.isEmpty && widget.rfq != null && widget.rfq!.items.isNotEmpty) {
      final unitAvg = widget.quote.totalPrice / widget.rfq!.items.length;
      for (final r in widget.rfq!.items) {
        parsed.add(_QuoteInspectionItem(
          partName: r.partName,
          partNumber: r.partNumber,
          originalPrice: unitAvg,
          commercialPrice: 0.0,
          unitPrice: unitAvg,
          quantity: r.quantity,
          availability: 'available',
          images: r.images ?? [],
          isAccepted: true,
          chosenType: 'original',
        ));
      }
    }

    if (parsed.isEmpty) {
      parsed.add(_QuoteInspectionItem(
        partName: 'قطع غيار صيانة معتمدة',
        partNumber: null,
        originalPrice: widget.quote.totalPrice,
        commercialPrice: 0.0,
        unitPrice: widget.quote.totalPrice,
        quantity: 1,
        availability: 'available',
        images: [],
        isAccepted: true,
        chosenType: 'original',
      ));
    }

    _items = parsed;
  }

  // Delivery fee from quote or default delivery fleet fee
  double get _deliveryFee {
    if (widget.quote.deliveryCost > 0) return widget.quote.deliveryCost;
    return 25.0; // Standard platform delivery fleet base rate
  }

  double get _partsSubtotal {
    double sum = 0.0;
    for (final it in _items) {
      if (it.isAccepted && it.availability != 'unavailable') {
        sum += it.effectivePrice * it.quantity;
      }
    }
    return sum;
  }

  int get _acceptedCount => _items.where((it) => it.isAccepted && it.availability != 'unavailable').length;

  bool get _areAllAccepted => _items.every((it) => it.availability == 'unavailable' || it.isAccepted);

  void _toggleSelectAll() {
    final next = !_areAllAccepted;
    setState(() {
      for (final it in _items) {
        if (it.availability != 'unavailable') {
          it.isAccepted = next;
        }
      }
    });
  }

  double get _subtotalDiscount {
    if (_appliedCoupon == null || _appliedCoupon!['target'] != 'subtotal') return 0.0;
    final val = double.tryParse(_appliedCoupon!['value']?.toString() ?? '0') ?? 0.0;
    if (_appliedCoupon!['type'] == 'percent') {
      return (_partsSubtotal * val) / 100;
    } else {
      return _partsSubtotal < val ? _partsSubtotal : val;
    }
  }

  double get _deliveryDiscount {
    if (_appliedCoupon == null || _appliedCoupon!['target'] != 'delivery') return 0.0;
    final val = double.tryParse(_appliedCoupon!['value']?.toString() ?? '0') ?? 0.0;
    final deliv = _deliveryFee;
    if (_appliedCoupon!['type'] == 'percent') {
      return (deliv * val) / 100;
    } else {
      return deliv < val ? deliv : val;
    }
  }

  double get _subtotalAfterDiscount => (_partsSubtotal - _subtotalDiscount).clamp(0.0, double.infinity);
  double get _taxAmount => _subtotalAfterDiscount * 0.15;
  double get _effectiveDelivery => (_deliveryFee - _deliveryDiscount).clamp(0.0, double.infinity);
  double get _grandTotal => _subtotalAfterDiscount + _taxAmount + _effectiveDelivery;

  Future<void> _applyCoupon() async {
    final raw = _couponController.text.trim().toUpperCase();
    if (raw.isEmpty) {
      setState(() => _couponError = 'يرجى إدخال رمز كود الخصم أولاً.');
      return;
    }

    setState(() {
      _isApplyingCoupon = true;
      _couponError = null;
    });

    try {
      final subtotal = _partsSubtotal;
      final deliv = _deliveryFee;

      final res = await ApiClient.instance.post(
        '/coupons/validate',
        data: {
          'code': raw,
          'partsSubtotal': subtotal,
          'deliveryCost': deliv,
        },
      );

      if (res.data != null && res.data['valid'] == true && res.data['coupon'] != null) {
        if (mounted) {
          setState(() {
            _appliedCoupon = Map<String, dynamic>.from(res.data['coupon']);
            _couponError = null;
            _isApplyingCoupon = false;
          });
        }
        return;
      }

      if (res.data != null && res.data['error'] != null) {
        if (mounted) {
          setState(() {
            _couponError = res.data['error'].toString();
            _isApplyingCoupon = false;
          });
        }
        return;
      }
    } catch (_) {}

    // Fallback local engine for offline reliability
    final code = raw;
    Map<String, dynamic>? fallback;
    if (code == 'FREESHIP' || code == 'DELIVERYFREE') {
      fallback = {
        'id': 'auto-freeship',
        'code': code,
        'target': 'delivery',
        'type': 'percent',
        'value': 100,
        'label': 'شحن وتوصيل مجاني 100%',
      };
    } else if (code == 'SHIP50') {
      fallback = {
        'id': 'auto-ship50',
        'code': code,
        'target': 'delivery',
        'type': 'percent',
        'value': 50,
        'label': 'خصم 50% على رسوم التوصيل',
      };
    } else if (code == 'RIFQ10') {
      fallback = {
        'id': 'auto-rifq10',
        'code': code,
        'target': 'subtotal',
        'type': 'percent',
        'value': 10,
        'label': 'خصم 10% من إجمالي الفاتورة',
      };
    } else if (code == 'RIFQ15') {
      fallback = {
        'id': 'auto-rifq15',
        'code': code,
        'target': 'subtotal',
        'type': 'percent',
        'value': 15,
        'label': 'خصم 15% من إجمالي الفاتورة',
      };
    } else if (code == 'WELCOME') {
      fallback = {
        'id': 'auto-welcome',
        'code': code,
        'target': 'subtotal',
        'type': 'percent',
        'value': 10,
        'label': 'خصم ترحيبي 10%',
      };
    } else if (code == 'SAVE50') {
      fallback = {
        'id': 'auto-save50',
        'code': code,
        'target': 'subtotal',
        'type': 'fixed',
        'value': 50,
        'label': 'خصم فوري 50 ر.س',
      };
    } else if (code == 'SAVE100') {
      fallback = {
        'id': 'auto-save100',
        'code': code,
        'target': 'subtotal',
        'type': 'fixed',
        'value': 100,
        'label': 'خصم فوري 100 ر.س',
      };
    }

    if (mounted) {
      setState(() {
        if (fallback != null) {
          _appliedCoupon = fallback;
          _couponError = null;
        } else {
          _couponError = 'كود الخصم المدخل غير صالح أو منتهي الصلاحية.';
        }
        _isApplyingCoupon = false;
      });
    }
  }

  void _removeCoupon() {
    setState(() {
      _appliedCoupon = null;
      _couponController.clear();
      _couponError = null;
    });
  }

  void _confirmAndSubmit() {
    final selectedPayload = _items
        .where((it) => it.isAccepted && it.availability != 'unavailable')
        .map((it) => {
              'part_name': it.partName,
              'part_number': it.partNumber,
              'unit_price': it.effectivePrice,
              'quantity': it.quantity,
              'line_total': it.effectivePrice * it.quantity,
              'part_type': it.chosenType,
              'commercial_brand': it.commercialBrand,
              'part_brand': it.commercialBrand,
              'brand': it.commercialBrand,
              'availability': it.availability,
            })
        .toList();

    widget.onAcceptOrder(
      widget.quote,
      selectedPayload,
      _grandTotal,
      _appliedCoupon?['code']?.toString(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vName = widget.quote.vendorName ?? 'مؤسسة قطع الغيار المعتمدة';
    final prepTime = 'ساعتان (تجهيز فوري)';
    final deliveryTime = 'خلال ${widget.quote.deliveryDays} يوم';

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      maxChildSize: 0.96,
      minChildSize: 0.5,
      builder: (ctx, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF8FAFC),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // ── TOP MODAL HANDLE & HEADER ──
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Column(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
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
                            child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF2563EB), size: 20),
                          ),
                          const SizedBox(width: 10),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'فحص وتأكيد عرض السعر المعتمد',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                'رسوم التوصيل، كود الخصم، والملخص المالي',
                                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── MODAL SCROLLABLE CONTENT ──
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. Vendor Profile Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
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
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFBFDBFE)),
                                ),
                                child: const Icon(Icons.storefront_rounded, color: Color(0xFF2563EB), size: 22),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            vName,
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        const Icon(Icons.verified_rounded, color: Color(0xFF2563EB), size: 14),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    const Row(
                                      children: [
                                        Icon(Icons.star_rounded, color: Color(0xFFD97706), size: 14),
                                        SizedBox(width: 2),
                                        Text('4.9', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                                        SizedBox(width: 6),
                                        Text('• مورد معتمد وموثق في رفق', style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.local_shipping_outlined, color: Color(0xFF2563EB), size: 16),
                                      const SizedBox(width: 6),
                                      Text(
                                        'التوصيل: $deliveryTime',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.timer_outlined, color: Color(0xFFD97706), size: 16),
                                      const SizedBox(width: 6),
                                      Text(
                                        'التجهيز: $prepTime',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 2. Parts Selection & Dual Pricing Table
                    Container(
                      padding: const EdgeInsets.all(14),
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
                              const Row(
                                children: [
                                  Icon(Icons.format_list_bulleted_rounded, color: Color(0xFF2563EB), size: 18),
                                  SizedBox(width: 6),
                                  Text(
                                    'قائمة القطع المسعرة',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                              TextButton(
                                onPressed: _toggleSelectAll,
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  visualDensity: VisualDensity.compact,
                                ),
                                child: Text(
                                  _areAllAccepted ? 'إلغاء تحديد الكل' : 'تحديد الكل',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          const SizedBox(height: 8),

                          ..._items.asMap().entries.map((e) {
                            final idx = e.key;
                            final it = e.value;
                            final isUnavailable = it.availability == 'unavailable';

                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: !it.isAccepted || isUnavailable ? const Color(0xFFF8FAFC) : Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: it.isAccepted && !isUnavailable ? const Color(0xFFE2E8F0) : const Color(0xFFF1F5F9),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Checkbox(
                                        value: it.isAccepted && !isUnavailable,
                                        onChanged: isUnavailable
                                            ? null
                                            : (val) {
                                                setState(() {
                                                  it.isAccepted = val ?? true;
                                                });
                                              },
                                        activeColor: const Color(0xFF2563EB),
                                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        visualDensity: VisualDensity.compact,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              it.partName,
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w900,
                                                color: !it.isAccepted || isUnavailable ? const Color(0xFF94A3B8) : const Color(0xFF0F172A),
                                              ),
                                            ),
                                            if (it.partNumber != null && it.partNumber!.isNotEmpty)
                                              Text(
                                                'رقم القطعة: ${it.partNumber}',
                                                style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF64748B)),
                                              ),
                                            if (it.commercialBrand != null && it.commercialBrand!.isNotEmpty) ...[
                                              const SizedBox(height: 3),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFFEF3C7),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: const Color(0xFFFDE68A)),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    const Icon(Icons.label_important_rounded, size: 11, color: Color(0xFFD97706)),
                                                    const SizedBox(width: 3),
                                                    Text(
                                                      'الماركة / الصانع: ${it.commercialBrand}',
                                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            isUnavailable
                                              ? 'غير متوفر'
                                              : '${CurrencyFormatter.format(it.effectivePrice * it.quantity)}',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w900,
                                              color: isUnavailable ? Colors.red : const Color(0xFF059669),
                                            ),
                                          ),
                                          Text(
                                            'الكمية: ${it.quantity}',
                                            style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),

                                  // Dual Pricing Selector (Original vs Commercial)
                                  if (it.isDualPriced && !isUnavailable && it.isAccepted) ...[
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        children: [
                                          const Text('النوع المعروض:', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                          const SizedBox(width: 8),
                                          InkWell(
                                            onTap: () => setState(() => it.chosenType = 'original'),
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: it.chosenType == 'original' ? const Color(0xFF2563EB) : Colors.white,
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(
                                                  color: it.chosenType == 'original' ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                                                ),
                                              ),
                                              child: Text(
                                                'أصلي: ${CurrencyFormatter.format(it.originalPrice)}',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: it.chosenType == 'original' ? Colors.white : const Color(0xFF334155),
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          InkWell(
                                            onTap: () => setState(() => it.chosenType = 'commercial'),
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: it.chosenType == 'commercial' ? const Color(0xFFD97706) : Colors.white,
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(
                                                  color: it.chosenType == 'commercial' ? const Color(0xFFD97706) : const Color(0xFFCBD5E1),
                                                ),
                                              ),
                                              child: Text(
                                                it.commercialBrand != null && it.commercialBrand!.isNotEmpty
                                                    ? 'تجاري (${it.commercialBrand}): ${CurrencyFormatter.format(it.commercialPrice)}'
                                                    : 'تجاري: ${CurrencyFormatter.format(it.commercialPrice)}',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: it.chosenType == 'commercial' ? Colors.white : const Color(0xFF334155),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ] else if (!it.isDualPriced && !isUnavailable && it.isAccepted && (it.chosenType == 'commercial' || (it.commercialBrand != null && it.commercialBrand!.isNotEmpty))) ...[
                                    const SizedBox(height: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFFBEB),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: const Color(0xFFFDE68A)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.verified_rounded, size: 12, color: Color(0xFFD97706)),
                                          const SizedBox(width: 4),
                                          Text(
                                            it.commercialBrand != null && it.commercialBrand!.isNotEmpty
                                                ? 'قطعة تجارية معتمدة - ماركة: ${it.commercialBrand}'
                                                : 'قطعة تجارية معتمدة',
                                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          }).toList(),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 3. Promo Code Section (1:1 with Web Coupon Engine)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFFF8FAFC),
                            _appliedCoupon != null ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                          ],
                          begin: Alignment.topRight,
                          end: Alignment.bottomLeft,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _appliedCoupon != null ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.confirmation_num_outlined, color: Color(0xFF059669), size: 18),
                                  SizedBox(width: 6),
                                  Text(
                                    'كود الخصم وقسائم الشراء',
                                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                              if (_appliedCoupon != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFD1FAE5),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: const Color(0xFFA7F3D0)),
                                  ),
                                  child: const Text(
                                    'تم تفعيل الخصم ✓',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          if (_appliedCoupon == null) ...[
                            Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFCBD5E1)),
                                    ),
                                    child: TextField(
                                      controller: _couponController,
                                      textCapitalization: TextCapitalization.characters,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                      decoration: const InputDecoration(
                                        hintText: 'أدخل كود الخصم (FREESHIP, RIFQ10)...',
                                        hintStyle: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontFamily: 'sans-serif'),
                                        prefixIcon: Icon(Icons.local_offer_outlined, size: 18, color: Color(0xFF94A3B8)),
                                        border: InputBorder.none,
                                        contentPadding: EdgeInsets.symmetric(vertical: 10),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: _isApplyingCoupon ? null : _applyCoupon,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF0F172A),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    elevation: 0,
                                    minimumSize: const Size(60, 42),
                                  ),
                                  child: _isApplyingCoupon
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                      : const Text('تطبيق', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                            if (_couponError != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                _couponError!,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red),
                              ),
                            ],
                          ] else ...[
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 20),
                                      const SizedBox(width: 8),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text(
                                                _appliedCoupon!['code']?.toString() ?? '',
                                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, fontFamily: 'monospace', color: Color(0xFF065F46)),
                                              ),
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: _appliedCoupon!['target'] == 'delivery' ? const Color(0xFFDBEAFE) : const Color(0xFFD1FAE5),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  _appliedCoupon!['target'] == 'delivery' ? 'خصم رسوم التوصيل 🚚' : 'خصم من الفاتورة 🧾',
                                                  style: TextStyle(
                                                    fontSize: 9.5,
                                                    fontWeight: FontWeight.bold,
                                                    color: _appliedCoupon!['target'] == 'delivery' ? const Color(0xFF1E40AF) : const Color(0xFF065F46),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'تم توفير ${CurrencyFormatter.format(_subtotalDiscount + _deliveryDiscount)} (${_appliedCoupon!['label'] ?? ''})',
                                            style: const TextStyle(fontSize: 10.5, color: Color(0xFF047857), fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  TextButton(
                                    onPressed: _removeCoupon,
                                    child: const Text('إلغاء ✕', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 4. Vendor Warranty & Notes Box
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.shield_outlined, color: Color(0xFF9333EA), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'ملاحظات وضمان المورد المعتمد',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  widget.quote.notes != null && widget.quote.notes!.isNotEmpty
                                      ? widget.quote.notes!
                                      : 'القطع تخضع لضمان الجودة والمطابقة المعتمد من المورد عبر منصة رفق.',
                                  style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), height: 1.3),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 5. Final Authoritative Financial Breakdown Card (#0B1528 Dark Theme)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0B1528),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E293B)),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'الملخص المالي النهائي المعتمد',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF064E3B),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '$_acceptedCount قطع مقبولة',
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF34D399)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1, color: Color(0xFF1E293B)),
                          const SizedBox(height: 10),

                          // Parts Subtotal
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('مجموع القطع المقبولة:', style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8))),
                              Text(CurrencyFormatter.format(_partsSubtotal), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                            ],
                          ),

                          // Subtotal Discount Line (if applied)
                          if (_subtotalDiscount > 0) ...[
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.local_offer_outlined, color: Color(0xFF34D399), size: 14),
                                    const SizedBox(width: 4),
                                    Text('خصم الفاتورة (${_appliedCoupon?['code']}):', style: const TextStyle(fontSize: 11.5, color: Color(0xFF34D399), fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                Text('- ${CurrencyFormatter.format(_subtotalDiscount)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF34D399))),
                              ],
                            ),
                          ],

                          const SizedBox(height: 6),
                          // 15% VAT
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('ضريبة القيمة المضافة (15%):', style: TextStyle(fontSize: 11.5, color: Color(0xFF93C5FD))),
                              Text(CurrencyFormatter.format(_taxAmount), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF93C5FD))),
                            ],
                          ),

                          const SizedBox(height: 6),
                          // Delivery Fee (Set by admin/fleet)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('رسوم التوصيل (أسطول رفق):', style: TextStyle(fontSize: 11.5, color: Color(0xFF6EE7B7))),
                              Row(
                                children: [
                                  if (_deliveryDiscount > 0) ...[
                                    Text(
                                      CurrencyFormatter.format(_deliveryFee),
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), decoration: TextDecoration.lineThrough),
                                    ),
                                    const SizedBox(width: 6),
                                  ],
                                  Text(
                                    _effectiveDelivery == 0 && _deliveryDiscount > 0
                                        ? 'مجاني بالكامل 🚚'
                                        : CurrencyFormatter.format(_effectiveDelivery),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w900,
                                      color: _deliveryDiscount > 0 ? const Color(0xFF34D399) : Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),

                          // Delivery Discount Line (if applied)
                          if (_deliveryDiscount > 0) ...[
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.local_shipping_outlined, color: Color(0xFF60A5FA), size: 14),
                                    const SizedBox(width: 4),
                                    Text('خصم كود الشحن (${_appliedCoupon?['code']}):', style: const TextStyle(fontSize: 11.5, color: Color(0xFF60A5FA), fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                Text('- ${CurrencyFormatter.format(_deliveryDiscount)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF60A5FA))),
                              ],
                            ),
                          ],

                          const SizedBox(height: 12),
                          const Divider(height: 1, color: Color(0xFF1E293B)),
                          const SizedBox(height: 10),

                          // Grand Total
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('الإجمالي الكلي النهائي:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
                                  Text(
                                    (_subtotalDiscount + _deliveryDiscount) > 0 ? 'شامل الخصم والضريبة والشحن' : 'شامل الضريبة والشحن',
                                    style: const TextStyle(fontSize: 9.5, color: Color(0xFF34D399), fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              Text(
                                CurrencyFormatter.format(_grandTotal),
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF34D399)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // ── BOTTOM ACTIONS BAR ──
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      child: const Text('إلغاء', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _acceptedCount == 0 ? null : _confirmAndSubmit,
                        icon: const Icon(Icons.check_circle_rounded, size: 18),
                        label: Text(
                          'تأكيد وقبول العرض والدفع 🚀 (${CurrencyFormatter.format(_grandTotal)})',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                          disabledBackgroundColor: const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
