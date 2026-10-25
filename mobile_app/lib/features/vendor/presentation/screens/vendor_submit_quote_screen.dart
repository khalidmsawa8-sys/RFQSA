import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/audio/sound_alert_service.dart';
import 'package:rfqsa_mobile/core/config/platform_settings_service.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/vendor/bloc/vendor_radar_bloc.dart';

class _PartQuoteFormItem {
  final TextEditingController originalPriceController;
  final TextEditingController commercialPriceController;
  final TextEditingController commercialBrandController;
  bool isUnavailable;

  _PartQuoteFormItem({
    String initialOriginalPrice = '',
    String initialCommercialPrice = '',
    String initialCommercialBrand = '',
    this.isUnavailable = false,
  })  : originalPriceController = TextEditingController(text: initialOriginalPrice),
        commercialPriceController = TextEditingController(text: initialCommercialPrice),
        commercialBrandController = TextEditingController(text: initialCommercialBrand);

  void dispose() {
    originalPriceController.dispose();
    commercialPriceController.dispose();
    commercialBrandController.dispose();
  }

  double get originalPrice => isUnavailable ? 0.0 : (double.tryParse(originalPriceController.text.trim()) ?? 0.0);
  double get commercialPrice => isUnavailable ? 0.0 : (double.tryParse(commercialPriceController.text.trim()) ?? 0.0);
  bool get hasOrigPrice => originalPrice > 0 && !isUnavailable;
  bool get hasCommPrice => commercialPrice > 0 && !isUnavailable;

  String get selectedType {
    if (isUnavailable) return 'unavailable';
    if (hasOrigPrice && hasCommPrice) return 'both';
    if (hasOrigPrice) return 'original';
    if (hasCommPrice) return 'commercial';
    return 'unavailable';
  }
}

/// Vendor Quotation Submission Screen - 100% Pixel-Perfect Match with Web
class VendorSubmitQuoteScreen extends StatefulWidget {
  final RfqModel rfq;

  const VendorSubmitQuoteScreen({super.key, required this.rfq});

  @override
  State<VendorSubmitQuoteScreen> createState() => _VendorSubmitQuoteScreenState();
}

class _VendorSubmitQuoteScreenState extends State<VendorSubmitQuoteScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();
  late final List<_PartQuoteFormItem> _quoteItems;

  bool _isSubmitting = false;
  bool _vinCopied = false;

  // Preparation Duration State
  int _prepDays = 0;
  int _prepHours = 2;
  int _prepMinutes = 0;

  final double _deliveryFee = 0.0;

  @override
  void initState() {
    super.initState();
    PlatformSettingsService.instance.fetchSettings().then((_) {
      if (mounted) setState(() {});
    });
    _quoteItems = List.generate(
      widget.rfq.items.length,
      (i) {
        return _PartQuoteFormItem(
          initialOriginalPrice: '',
          initialCommercialPrice: '',
          initialCommercialBrand: '',
        );
      },
    );
  }

  @override
  void dispose() {
    _notesController.dispose();
    for (var item in _quoteItems) {
      item.dispose();
    }
    super.dispose();
  }

  // ── Financial Calculations ──
  double get _originalSubtotal {
    double sum = 0.0;
    for (int i = 0; i < widget.rfq.items.length; i++) {
      final it = _quoteItems[i];
      if (!it.isUnavailable && it.hasOrigPrice) {
        sum += it.originalPrice * widget.rfq.items[i].quantity;
      }
    }
    return sum;
  }

  double get _commercialSubtotal {
    double sum = 0.0;
    for (int i = 0; i < widget.rfq.items.length; i++) {
      final it = _quoteItems[i];
      if (!it.isUnavailable && it.hasCommPrice) {
        sum += it.commercialPrice * widget.rfq.items[i].quantity;
      }
    }
    return sum;
  }

  double get _originalTaxAmount => _originalSubtotal * 0.15;
  double get _originalTotalWithTax => _originalSubtotal + _originalTaxAmount;

  double get _commercialTaxAmount => _commercialSubtotal * 0.15;
  double get _commercialTotalWithTax => _commercialSubtotal + _commercialTaxAmount;

  double get _partsSubtotal => _originalSubtotal > 0 ? _originalSubtotal : _commercialSubtotal;
  double get _grandTotal {
    final base = _partsSubtotal > 0 ? _partsSubtotal * 1.15 : 0.0;
    return base + _deliveryFee;
  }

  int get _pricedCount {
    return _quoteItems.where((it) => it.hasOrigPrice || it.hasCommPrice).length;
  }

  String _getFormattedPrepTime(int d, int h, int m) {
    final parts = <String>[];
    if (d > 0) parts.add('$d ${d == 1 ? "يوم" : d == 2 ? "يومان" : d <= 10 ? "أيام" : "يوماً"}');
    if (h > 0) parts.add('$h ${h == 1 ? "ساعة" : h == 2 ? "ساعتان" : h <= 10 ? "ساعات" : "ساعة"}');
    if (m > 0) parts.add('$m ${m == 1 ? "دقيقة" : m == 2 ? "دقيقتان" : m <= 10 ? "دقائق" : "دقيقة"}');

    if (parts.isEmpty) return 'جاهز للتسليم الفوري ⚡';
    return parts.join(' و ');
  }

  void _copyVin() {
    if (widget.rfq.vin != null && widget.rfq.vin!.isNotEmpty) {
      Clipboard.setData(ClipboardData(text: widget.rfq.vin!));
      setState(() => _vinCopied = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تم نسخ رقم الهيكل (VIN) بنجاح 📋'),
          duration: Duration(seconds: 2),
          backgroundColor: Color(0xFF0F172A),
        ),
      );
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _vinCopied = false);
      });
    }
  }

  void _openPrepModal() {
    if (_pricedCount == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('يرجى إدخال سعر واحد على الأقل (أصلي أو تجاري) لقطعة متوفرة قبل المتابعة'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }
    _showPreparationDurationBottomSheet();
  }

  void _showPreparationDurationBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                top: 20,
                left: 20,
                right: 20,
                bottom: MediaQuery.of(modalContext).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Handle Bar
                    Center(
                      child: Container(
                        width: 44,
                        height: 5,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                          ),
                          child: const Icon(Icons.access_time_rounded, color: Color(0xFF059669), size: 24),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'مدة تجهيز وتوفير الطلب',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                'حدد الوقت المتوقع لتجهيز القطع وتسليمها لأسطول / مندوب التوصيل',
                                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(modalContext),
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 3 Steppers: Days / Hours / Minutes
                    Row(
                      children: [
                        // Days
                        Expanded(
                          child: _buildStepperBox(
                            title: 'الأيام',
                            icon: Icons.calendar_today_rounded,
                            iconColor: const Color(0xFF2563EB),
                            value: _prepDays,
                            onDec: () => setModalState(() => _prepDays = (_prepDays - 1).clamp(0, 30)),
                            onInc: () => setModalState(() => _prepDays = (_prepDays + 1).clamp(0, 30)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Hours
                        Expanded(
                          child: _buildStepperBox(
                            title: 'الساعات',
                            icon: Icons.schedule_rounded,
                            iconColor: const Color(0xFFD97706),
                            value: _prepHours,
                            onDec: () => setModalState(() => _prepHours = (_prepHours - 1).clamp(0, 23)),
                            onInc: () => setModalState(() => _prepHours = (_prepHours + 1).clamp(0, 23)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Minutes
                        Expanded(
                          child: _buildStepperBox(
                            title: 'الدقائق',
                            icon: Icons.timer_outlined,
                            iconColor: const Color(0xFF059669),
                            value: _prepMinutes,
                            step: 15,
                            onDec: () => setModalState(() => _prepMinutes = (_prepMinutes - 15).clamp(0, 59)),
                            onInc: () => setModalState(() => _prepMinutes = (_prepMinutes + 15).clamp(0, 59)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Quick Presets
                    const Text('خيارات سريعة ومقترحة:', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildPresetChip('⚡ فوري (30 دقيقة)', 0, 0, 30, setModalState),
                        _buildPresetChip('⏱️ خلال ساعتين', 0, 2, 0, setModalState),
                        _buildPresetChip('📦 نفس اليوم (4 ساعات)', 0, 4, 0, setModalState),
                        _buildPresetChip('📅 خلال 24 ساعة', 1, 0, 0, setModalState),
                        _buildPresetChip('🚛 خلال يومين', 2, 0, 0, setModalState),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Formatted summary box
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: Color(0xFF059669),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.check_rounded, color: Colors.white, size: 14),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('الوقت المعتمد لتجهيز العرض:', style: TextStyle(fontSize: 10.5, color: Color(0xFF065F46), fontWeight: FontWeight.bold)),
                                Text(
                                  _getFormattedPrepTime(_prepDays, _prepHours, _prepMinutes),
                                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF064E3B)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Confirm Action Button
                    ElevatedButton.icon(
                      onPressed: _isSubmitting
                          ? null
                          : () {
                              Navigator.pop(modalContext);
                              _executeFinalSubmission();
                            },
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                      label: const Text(
                        'تأكيد وإرسال العرض نهائياً 🚀',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 3,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildStepperBox({
    required String title,
    required IconData icon,
    required Color iconColor,
    required int value,
    required VoidCallback onDec,
    required VoidCallback onInc,
    int step = 1,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: iconColor, size: 13),
              const SizedBox(width: 4),
              Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              InkWell(
                onTap: onDec,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: const Center(child: Text('-', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16))),
                ),
              ),
              Text(
                '$value',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              InkWell(
                onTap: onInc,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: const Center(child: Text('+', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15))),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPresetChip(String label, int d, int h, int m, StateSetter setModalState) {
    final isSelected = _prepDays == d && _prepHours == h && _prepMinutes == m;
    return InkWell(
      onTap: () {
        setModalState(() {
          _prepDays = d;
          _prepHours = h;
          _prepMinutes = m;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF059669) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFF059669) : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF334155),
          ),
        ),
      ),
    );
  }

  Future<void> _executeFinalSubmission() async {
    setState(() => _isSubmitting = true);

    final itemsPayload = List.generate(widget.rfq.items.length, (i) {
      final reqItem = widget.rfq.items[i];
      final quoteItem = _quoteItems[i];

      final origP = quoteItem.originalPrice;
      final commP = quoteItem.commercialPrice;
      final unitPrice = origP > 0 ? origP : commP;
      final lineTotal = unitPrice * reqItem.quantity;

      return {
        'part_name': reqItem.partName,
        'quantity': reqItem.quantity,
        'unit_price': quoteItem.isUnavailable ? 0.0 : unitPrice,
        'line_total': quoteItem.isUnavailable ? 0.0 : lineTotal,
        'original_price': origP,
        'commercial_price': commP,
        'commercial_brand': quoteItem.commercialBrandController.text.trim(),
        'part_type': quoteItem.selectedType,
        'part_number': reqItem.partNumber ?? '',
        'availability': quoteItem.isUnavailable ? 'unavailable' : 'available',
      };
    });

    final calculatedPrepDays = math.max(1, _prepDays + (_prepHours > 0 || _prepMinutes > 0 ? 1 : 0));
    final prepTimeText = _getFormattedPrepTime(_prepDays, _prepHours, _prepMinutes);

    final combinedNotes = [
      '⏱️ مدة التجهيز: $prepTimeText',
      _notesController.text.trim().isNotEmpty ? '📝 ملاحظات: ${_notesController.text.trim()}' : null,
    ].where((e) => e != null).join(' | ');

    context.read<VendorRadarBloc>().add(
          SubmitVendorQuoteEvent(
            rfqId: widget.rfq.id,
            totalPrice: _grandTotal,
            deliveryDays: calculatedPrepDays,
            deliveryCost: _deliveryFee,
            notes: combinedNotes,
            items: itemsPayload,
            prepDays: _prepDays,
            prepHours: _prepHours,
            prepMinutes: _prepMinutes,
          ),
        );

    // 🔔 1. FIRE REAL DEVICE / SYSTEM TRAY LOCAL NOTIFICATION
    try {
      await NotificationService().showLocalNotification(
        id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
        title: 'تم تقديم عرض سعر جديد! 🚀',
        body: 'تم إرسال عرض سعرك للطلب #${widget.rfq.shortId} بقيمة ${CurrencyFormatter.format(_grandTotal)} بنجاح.',
        channelId: 'orders_channel',
        channelName: 'الطلبات وعروض الأسعار',
        soundFileName: 'rfq_alert',
        payload: {
          'type': 'quote_submitted',
          'rfqId': widget.rfq.id,
          'totalPrice': _grandTotal,
        },
      );
    } catch (_) {}

    // 🔊 2. PLAY SOUND ALERT
    try {
      await SoundAlertService().playSuccessTone();
    } catch (_) {}

    setState(() => _isSubmitting = false);

    // 🌟 3. SHOW 2-SECOND INTERACTIVE SUCCESS PROGRESS MODAL MATCHING WEB
    if (mounted) {
      _showSuccess2SecondModal();
    }
  }

  void _showSuccess2SecondModal() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dlgContext) {
        return _SuccessCountdownDialog(
          shortId: widget.rfq.shortId,
          grandTotal: _grandTotal,
          onComplete: () {
            Navigator.of(dlgContext).pop(); // Close dialog
            Navigator.of(context).pop(); // Go back to orders
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text(
                  'تقديم تسعيرة جديدة',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Text(
                    '#${widget.rfq.shortId}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF065F46)),
                  ),
                ),
              ],
            ),
            const Text(
              'أدخل سعر القطعة في خانة الأصلي أو التجاري مباشرة بكل سهولة',
              style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ────────────────── 1. VEHICLE SPECIFICATIONS HERO CARD ──────────────────
              _buildVehicleSpecsCard(),
              const SizedBox(height: 16),

              // ────────────────── 2. PARTS PRICING TABLE / CARDS ──────────────────
              _buildPartsPricingSection(),
              const SizedBox(height: 16),

              // ────────────────── 3. COMMERCIAL SUMMARY & SUBMIT PANEL ──────────────────
              _buildCommercialSummaryCard(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  // ────────────────── SECTION 1: VEHICLE SPECIFICATIONS ──────────────────
  Widget _buildVehicleSpecsCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x05000000), blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(top: Radius.circular(19)),
              border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Icon(Icons.directions_car_rounded, color: Color(0xFF2563EB), size: 16),
                ),
                const SizedBox(width: 8),
                const Text(
                  'بيانات ومواصفات المركبة المطلوبة',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF1E293B)),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.verified_user_rounded, color: Color(0xFF059669), size: 11),
                      SizedBox(width: 4),
                      Text('مركبة معتمدة', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 4 Grid Metric Cards
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Row(
                  children: [
                    // Box 1: Make & Model
                    Expanded(
                      child: _buildMetricBox(
                        label: 'ماركة وموديل السيارة',
                        value: '${widget.rfq.carMake} ${widget.rfq.carModel}',
                        subtext: 'طراز معتمد وموثق',
                        icon: Icons.directions_car_rounded,
                        iconColor: const Color(0xFF2563EB),
                        iconBg: const Color(0xFFEFF6FF),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Box 2: Year
                    Expanded(
                      child: _buildMetricBox(
                        label: 'سنة الصنع / الموديل',
                        value: '${widget.rfq.carYear}',
                        subtext: 'سنة تصنيع المركبة',
                        icon: Icons.calendar_today_rounded,
                        iconColor: const Color(0xFFD97706),
                        iconBg: const Color(0xFFFFFBEB),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    // Box 3: License Plate
                    Expanded(
                      child: _buildMetricBox(
                        label: 'رقم اللوحة السعودية',
                        value: widget.rfq.plateNumber ?? '—',
                        subtext: '🇸🇦 KSA',
                        icon: Icons.badge_outlined,
                        iconColor: const Color(0xFF059669),
                        iconBg: const Color(0xFFECFDF5),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Box 4: VIN with 1-Click Copy
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('رقم الهيكل (VIN)', style: TextStyle(fontSize: 9.5, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(6)),
                                  child: const Icon(Icons.tag_rounded, color: Color(0xFF4F46E5), size: 12),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    widget.rfq.vin ?? 'غير متوفر',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (widget.rfq.vin != null && widget.rfq.vin!.isNotEmpty)
                                  InkWell(
                                    onTap: _copyVin,
                                    borderRadius: BorderRadius.circular(6),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            _vinCopied ? Icons.check_rounded : Icons.copy_rounded,
                                            size: 10,
                                            color: _vinCopied ? const Color(0xFF059669) : const Color(0xFF475569),
                                          ),
                                          const SizedBox(width: 2),
                                          Text(
                                            _vinCopied ? 'تم' : 'نسخ',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: _vinCopied ? const Color(0xFF059669) : const Color(0xFF475569),
                                            ),
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
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricBox({
    required String label,
    required String value,
    required String subtext,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 9.5, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(6)),
                child: Icon(icon, color: iconColor, size: 12),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            overflow: TextOverflow.ellipsis,
          ),
          Text(subtext, style: const TextStyle(fontSize: 8.5, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }

  // ────────────────── SECTION 2: PARTS PRICING TABLE ──────────────────
  Widget _buildPartsPricingSection() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x05000000), blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(19)),
              border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.receipt_long_rounded, color: Colors.white, size: 17),
                          ),
                          const SizedBox(width: 8),
                          const Flexible(
                            child: Text(
                              'جدول تسعير القطع المطلوبة',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: Text(
                              '${widget.rfq.items.length} قطعة',
                              style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF1D4ED8)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 12),
                          const SizedBox(width: 4),
                          Text(
                            'المسعّرة: $_pricedCount / ${widget.rfq.items.length}',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'أدخل سعر القطعة في خانة الأصلي أو التجاري مباشرة، وسيتم اعتماد الخيار تلقائياً',
                  style: TextStyle(fontSize: 9.5, color: Color(0xFF64748B), height: 1.3),
                ),
              ],
            ),
          ),

          // Items List
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.all(12),
            itemCount: widget.rfq.items.length,
            separatorBuilder: (ctx, i) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) => _buildPartItemCard(i),
          ),

          // Bottom Bar with Totals
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(19)),
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Wrap(
              spacing: 8,
              runSpacing: 6,
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'القطع المسعّرة: $_pricedCount من أصل ${widget.rfq.items.length}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                    ),
                  ],
                ),
                if (_originalSubtotal > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Text(
                      'الأصلي (+15%): ${CurrencyFormatter.format(_originalTotalWithTax)}',
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF1E40AF)),
                    ),
                  ),
                if (_commercialSubtotal > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Text(
                      'التجاري (+15%): ${CurrencyFormatter.format(_commercialTotalWithTax)}',
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF92400E)),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPartItemCard(int idx) {
    final reqItem = widget.rfq.items[idx];
    final quoteItem = _quoteItems[idx];
    final isUnavailable = quoteItem.isUnavailable;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isUnavailable ? const Color(0xFFF8FAFC) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUnavailable
              ? const Color(0xFFCBD5E1)
              : quoteItem.hasOrigPrice && quoteItem.hasCommPrice
                  ? const Color(0xFFA7F3D0)
                  : quoteItem.hasOrigPrice
                      ? const Color(0xFFBFDBFE)
                      : quoteItem.hasCommPrice
                          ? const Color(0xFFFDE68A)
                          : const Color(0xFFE2E8F0),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Part Info & Action
          Row(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text(
                    '#${idx + 1}',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748B)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reqItem.partName,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: isUnavailable ? const Color(0xFF94A3B8) : const Color(0xFF0F172A),
                        decoration: isUnavailable ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    if (reqItem.partNumber != null && reqItem.partNumber!.isNotEmpty)
                      Text(
                        'OEM: ${reqItem.partNumber}',
                        style: const TextStyle(fontSize: 9.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'الكمية: ${reqItem.quantity}',
                  style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
                ),
              ),
              const SizedBox(width: 6),
              InkWell(
                onTap: () {
                  setState(() {
                    quoteItem.isUnavailable = !quoteItem.isUnavailable;
                    if (quoteItem.isUnavailable) {
                      quoteItem.originalPriceController.clear();
                      quoteItem.commercialPriceController.clear();
                    }
                  });
                },
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isUnavailable ? const Color(0xFF0F172A) : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: isUnavailable ? const Color(0xFF0F172A) : const Color(0xFFFECACA)),
                  ),
                  child: Text(
                    isUnavailable ? 'إلغاء الاستبعاد' : '✕ غير متوفر',
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.bold,
                      color: isUnavailable ? Colors.white : const Color(0xFFDC2626),
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Client attached images thumbnail gallery
          if (reqItem.images.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: const [
                Icon(Icons.photo_library_rounded, size: 13, color: Color(0xFF2563EB)),
                SizedBox(width: 4),
                Text('صور مرفقة من العميل (انقر للتكبير 🔍):', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
              ],
            ),
            const SizedBox(height: 6),
            SizedBox(
              height: 60,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: reqItem.images.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (ctx, imgIdx) {
                  final rawUrl = reqItem.images[imgIdx];
                  final cleanUrl = rawUrl.startsWith('/') ? 'https://rfqsa.tech$rawUrl' : rawUrl;
                  return GestureDetector(
                    onTap: () => _showFullImageDialog(cleanUrl),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 60,
                        height: 60,
                        color: const Color(0xFFF1F5F9),
                        child: _renderSingleThumbnail(cleanUrl),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: 12),

          // Row 2: Original OEM Input Tier
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: quoteItem.hasOrigPrice ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: quoteItem.hasOrigPrice ? const Color(0xFFBFDBFE) : const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                // Type Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: quoteItem.hasOrigPrice ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified_user_rounded, color: quoteItem.hasOrigPrice ? Colors.white : const Color(0xFF64748B), size: 12),
                      const SizedBox(width: 4),
                      Text(
                        'أصلي',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: quoteItem.hasOrigPrice ? Colors.white : const Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Price Input
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    controller: quoteItem.originalPriceController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    enabled: !isUnavailable,
                    onChanged: (_) => setState(() {}),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                    decoration: InputDecoration(
                      hintText: 'سعر الأصلي',
                      hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      suffixText: 'ر.س',
                      suffixStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Line Total
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('الإجمالي:', style: TextStyle(fontSize: 8.5, color: Color(0xFF64748B))),
                      Text(
                        quoteItem.hasOrigPrice
                            ? CurrencyFormatter.format(quoteItem.originalPrice * reqItem.quantity)
                            : '—',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: quoteItem.hasOrigPrice ? const Color(0xFF1E40AF) : const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Row 3: Commercial / Alternative Input Tier
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: quoteItem.hasCommPrice ? const Color(0xFFFFFBEB) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: quoteItem.hasCommPrice ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    // Type Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: quoteItem.hasCommPrice ? const Color(0xFFD97706) : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.local_offer_rounded, color: quoteItem.hasCommPrice ? Colors.white : const Color(0xFF64748B), size: 12),
                          const SizedBox(width: 4),
                          Text(
                            'تجاري',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                              color: quoteItem.hasCommPrice ? Colors.white : const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Price Input
                    Expanded(
                      flex: 3,
                      child: TextFormField(
                        controller: quoteItem.commercialPriceController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        enabled: !isUnavailable,
                        onChanged: (_) => setState(() {}),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          hintText: 'سعر التجاري',
                          hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                          suffixText: 'ر.س',
                          suffixStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFD97706), width: 1.5)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Line Total
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('الإجمالي:', style: TextStyle(fontSize: 8.5, color: Color(0xFF64748B))),
                          Text(
                            quoteItem.hasCommPrice
                                ? CurrencyFormatter.format(quoteItem.commercialPrice * reqItem.quantity)
                                : '—',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: quoteItem.hasCommPrice ? const Color(0xFF92400E) : const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                // Commercial Brand Input
                TextFormField(
                  controller: quoteItem.commercialBrandController,
                  enabled: !isUnavailable,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF0F172A)),
                  decoration: InputDecoration(
                    hintText: 'اسم الماركة التجارية (مثال: Denso, Mobis)',
                    hintStyle: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ────────────────── SECTION 3: COMMERCIAL SUMMARY & SUBMIT ──────────────────
  Widget _buildCommercialSummaryCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFF0FDF9), Color(0xFFF8FAFC), Color(0xFFEFF6FF)],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFA7F3D0), width: 1.5),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 16, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF059669),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(color: Color(0x33059669), blurRadius: 8, offset: Offset(0, 2)),
                  ],
                ),
                child: const Icon(Icons.calculate_rounded, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'ملخص العرض التجاري',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF064E3B)),
                    ),
                    Text(
                      'مراجعة مجموع تسعير القطع وإضافة ملاحظات وضمان العرض قبل الإرسال',
                      style: TextStyle(fontSize: 10, color: Color(0xFF047857)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Dual Cards: Original vs Commercial (Stacked vertically for maximum clarity & zero text overflow)
          Column(
            children: [
              // Card 1: Original OEM
              _buildFinancialCard(
                title: 'إجمالي الأصلي (OEM)',
                icon: Icons.verified_user_rounded,
                iconColor: const Color(0xFF2563EB),
                isPriced: _originalSubtotal > 0,
                subtotal: _originalSubtotal,
                tax: _originalTaxAmount,
                totalWithTax: _originalTotalWithTax,
                borderColor: const Color(0xFFBFDBFE),
                bgColor: Colors.white,
                totalColor: const Color(0xFF1E3A8A),
              ),
              const SizedBox(height: 12),
              // Card 2: Commercial / Alternative
              _buildFinancialCard(
                title: 'إجمالي التجاري / البديل',
                icon: Icons.local_offer_rounded,
                iconColor: const Color(0xFFD97706),
                isPriced: _commercialSubtotal > 0,
                subtotal: _commercialSubtotal,
                tax: _commercialTaxAmount,
                totalWithTax: _commercialTotalWithTax,
                borderColor: const Color(0xFFFDE68A),
                bgColor: Colors.white,
                totalColor: const Color(0xFF78350F),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Notes & Terms Textarea
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.notes_rounded, color: Color(0xFF059669), size: 16),
                    SizedBox(width: 6),
                    Text(
                      'ملاحظات وضمان العرض للعميل (اختياري):',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _notesController,
                  maxLines: 2,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(
                    hintText: 'مثال: الضمان 6 أشهر، القطع أصلية وكالة داخل الكرتون المعتمد، توفر فوري...',
                    hintStyle: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Submit Action Button
          ElevatedButton(
            onPressed: _pricedCount == 0 || _isSubmitting ? null : _openPrepModal,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFFCBD5E1),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              elevation: 4,
              shadowColor: const Color(0x44059669),
            ),
            child: _isSubmitting
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                      SizedBox(width: 10),
                      Text('جاري إرسال العرض...', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                    ],
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.rocket_launch_rounded, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'إرسال وتأكيد العرض للعميل 🚀',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required bool isPriced,
    required double subtotal,
    required double tax,
    required double totalWithTax,
    required Color borderColor,
    required Color bgColor,
    required Color totalColor,
  }) {
    final vendorFeePercent = PlatformSettingsService.instance.vendorFeePercent;
    final netPercent = (100.0 - vendorFeePercent).clamp(0.0, 100.0);
    final commissionAmount = subtotal * (vendorFeePercent / 100.0);
    final netAmount = subtotal - commissionAmount;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 1.5),
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
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, color: iconColor, size: 16),
                  const SizedBox(width: 6),
                  Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: isPriced ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isPriced ? '✓ مسعّر' : 'غير مسعّر',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: isPriced ? const Color(0xFF059669) : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: 16, color: Color(0xFFF1F5F9)),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('قيمة القطع:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              Text(
                '${subtotal.toStringAsFixed(2)} ر.س',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('عمولة المنصة (${vendorFeePercent.toStringAsFixed(0)}%):', style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626))),
              Text(
                '-${commissionAmount.toStringAsFixed(2)} ر.س',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFFDC2626)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('صافي مستحقاتك (${netPercent.toStringAsFixed(0)}%):', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
              Text(
                '${netAmount.toStringAsFixed(2)} ر.س',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('الضريبة (15% على القطع):', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              Text(
                '+${tax.toStringAsFixed(2)} ر.س',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('إجمالي العرض للعميل:', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                Text(
                  CurrencyFormatter.format(totalWithTax),
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: totalColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _renderSingleThumbnail(String url) {
    if (url.startsWith('data:image')) {
      try {
        final b64Part = url.split(',').last;
        return Image.memory(base64Decode(b64Part), fit: BoxFit.cover);
      } catch (_) {
        return const Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8));
      }
    }
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8)),
      loadingBuilder: (ctx, child, progress) {
        if (progress == null) return child;
        return const Center(child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)));
      },
    );
  }

  void _showFullImageDialog(String url) {
    showDialog(
      context: context,
      builder: (dlgCtx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            InteractiveViewer(
              panEnabled: true,
              boundaryMargin: const EdgeInsets.all(20),
              minScale: 0.5,
              maxScale: 4.0,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: url.startsWith('data:image')
                    ? Image.memory(base64Decode(url.split(',').last), fit: BoxFit.contain)
                    : Image.network(
                        url,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Container(
                          padding: const EdgeInsets.all(24),
                          color: Colors.white,
                          child: const Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.broken_image_rounded, size: 48, color: Colors.red),
                              SizedBox(height: 8),
                              Text('تعذر تحميل الصورة بدقة كاملة'),
                            ],
                          ),
                        ),
                      ),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: GestureDetector(
                onTap: () => Navigator.of(dlgCtx).pop(),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Colors.black54,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 2-Second Animated Success Dialog matching Web Modal
class _SuccessCountdownDialog extends StatefulWidget {
  final String shortId;
  final double grandTotal;
  final VoidCallback onComplete;

  const _SuccessCountdownDialog({
    required this.shortId,
    required this.grandTotal,
    required this.onComplete,
  });

  @override
  State<_SuccessCountdownDialog> createState() => _SuccessCountdownDialogState();
}

class _SuccessCountdownDialogState extends State<_SuccessCountdownDialog> with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    _animController.forward();

    Timer(const Duration(milliseconds: 2200), () {
      if (mounted) widget.onComplete();
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(color: Color(0x33000000), blurRadius: 24, offset: Offset(0, 8)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF10B981), Color(0xFF14B8A6)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                shape: BoxShape.circle,
                boxShadow: const [
                  BoxShadow(color: Color(0x33059669), blurRadius: 16, offset: Offset(0, 6)),
                ],
              ),
              child: const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 36),
            ),
            const SizedBox(height: 16),

            // Title & Subtitle
            const Text(
              'تم تقديم عرض السعر بنجاح! 🎉',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 6),
            const Text(
              'تم إرسال تسعيرتك للعميل وحفظ تفاصيل القطع والتجهيز، جاري تحويلك تلقائياً إلى صفحة الطلبات...',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 16),

            // Badge Info
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('طلب رقم: #${widget.shortId}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                  Text(CurrencyFormatter.format(widget.grandTotal), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF047857))),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Animated Progress Bar
            AnimatedBuilder(
              animation: _animController,
              builder: (ctx, child) {
                return Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: _animController.value,
                        backgroundColor: const Color(0xFFE2E8F0),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('جاري التوجيه للطلبات...', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                        Text('${(2 - (_animController.value * 2)).ceil()}s', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
