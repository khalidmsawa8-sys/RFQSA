import 'dart:io';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/core/audio/sound_alert_service.dart';
import 'package:rfqsa_mobile/features/courier/models/delivery_task_model.dart';
import 'package:rfqsa_mobile/features/courier/repositories/courier_repository.dart';

/// 1:1 Pixel-Perfect Parity with Web Courier Order Execution Page (app/courier/orders/[id]/page.tsx)
/// Features Multi-stage state machine transitions, OTP modal verification, GPS navigation & POD photo capture.
class DeliveryDetailScreen extends StatefulWidget {
  final DeliveryTaskModel delivery;
  final CourierRepository courierRepository;

  const DeliveryDetailScreen({
    super.key,
    required this.delivery,
    required this.courierRepository,
  });

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  late DeliveryTaskModel _task;
  bool _isProcessing = false;
  Map<int, bool> _checkedItems = {};

  // OTP Modal Controller
  final TextEditingController _otpController = TextEditingController();
  String? _otpError;

  // POD Photo
  File? _podPhotoFile;

  @override
  void initState() {
    super.initState();
    _task = widget.delivery;
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _openGoogleMaps(double lat, double lng) async {
    final uri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
    final webUri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else if (await canLaunchUrl(webUri)) {
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _makePhoneCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _advanceStatus(String targetStatus, {String? otp, String? podUrl}) async {
    setState(() => _isProcessing = true);

    final res = await widget.courierRepository.transitionDeliveryStatus(
      deliveryId: _task.id,
      targetStatus: targetStatus,
      otpCode: otp,
      podPhotoUrl: podUrl,
    );

    setState(() => _isProcessing = false);

    if (res.success) {
      if (targetStatus == 'DELIVERED') {
        SoundAlertService().playSuccessTone();
      }
      setState(() {
        _task = DeliveryTaskModel(
          id: _task.id,
          orderId: _task.orderId,
          status: targetStatus,
          pickupLocation: _task.pickupLocation,
          dropoffLocation: _task.dropoffLocation,
          vendorName: _task.vendorName,
          vendorPhone: _task.vendorPhone,
          customerName: _task.customerName,
          customerPhone: _task.customerPhone,
          pickupLat: _task.pickupLat,
          pickupLng: _task.pickupLng,
          dropoffLat: _task.dropoffLat,
          dropoffLng: _task.dropoffLng,
          deliveryFee: _task.deliveryFee,
          partsSummary: _task.partsSummary,
          otpCode: otp ?? _task.otpCode,
          podUrl: podUrl ?? _task.podUrl,
          createdAt: _task.createdAt,
        );
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم تحديث حالة الرحلة إلى: ${_task.statusArabicLabel}'),
            backgroundColor: const Color(0xFF059669),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res.error ?? 'فشل تنفيذ الانتقال'),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    }
  }

  void _showOtpVerificationDialog() {
    _otpController.clear();
    _otpError = null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Center(
                child: Text(
                  'إتمام التسليم وإدخال رمز OTP',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
              ),
              const SizedBox(height: 4),
              const Center(
                child: Text(
                  'يرجى طلب رمز التحقق المكون من 4 أرقام من العميل المستلم',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ),
              const SizedBox(height: 20),

              // OTP Input Box
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _otpError != null ? const Color(0xFFEF4444) : const Color(0xFFCBD5E1),
                    width: 1.5,
                  ),
                ),
                child: TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 6,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 12,
                    fontFamily: 'monospace',
                    color: Color(0xFF0F172A),
                  ),
                  decoration: const InputDecoration(
                    counterText: '',
                    hintText: '• • • •',
                    hintStyle: TextStyle(letterSpacing: 8, color: Color(0xFF94A3B8)),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              if (_otpError != null) ...[
                const SizedBox(height: 8),
                Text(
                  _otpError!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11.5, fontWeight: FontWeight.bold),
                ),
              ],
              const SizedBox(height: 20),

              // Confirm Button
              ElevatedButton(
                onPressed: _isProcessing
                    ? null
                    : () async {
                        final code = _otpController.text.trim();
                        if (code.isEmpty || code.length < 4) {
                          setModalState(() => _otpError = 'يرجى إدخال رمز التحقق المكون من 4 أرقام');
                          return;
                        }
                        Navigator.pop(ctx);
                        await _advanceStatus('DELIVERED', otp: code);
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
                child: _isProcessing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('تأكيد التسليم وإنهاء الرحلة ✅', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickPodPhoto() async {
    try {
      final picker = ImagePicker();
      final photo = await picker.pickImage(source: ImageSource.camera, imageQuality: 80);
      if (photo != null) {
        setState(() => _podPhotoFile = File(photo.path));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم التقاط صورة إثبات التسليم 📸'), backgroundColor: Color(0xFF059669)),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذر فتح الكاميرا: $e'), backgroundColor: const Color(0xFFDC2626)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDelivered = _task.status == 'DELIVERED';

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 22),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'مهمة شحن #${_task.orderId}',
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
            ),
            child: Text(
              '+${_task.deliveryFee.toStringAsFixed(0)} ر.س',
              style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 12, fontWeight: FontWeight.w900, fontFamily: 'monospace'),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── 1. STATUS PROGRESS TRACKER (6 STEPS) ──
            _buildMultiStepTracker(),
            const SizedBox(height: 14),

            // ── 2. LEG 1: PICKUP FROM VENDOR ──
            _buildLegCard(
              legNumber: '1',
              legTitle: 'الاستلام من المورد',
              titleColor: const Color(0xFF92400E),
              circleBg: const Color(0xFFFEF3C7),
              circleTextColor: const Color(0xFF92400E),
              partyName: _task.vendorName ?? 'مؤسسة قطع الغيار المعتمدة',
              phone: _task.vendorPhone ?? '0551122334',
              address: _task.pickupLocation,
              lat: _task.pickupLat ?? 24.7136,
              lng: _task.pickupLng ?? 46.6753,
              isComplete: _task.status != 'ASSIGNED' && _task.status != 'EN_ROUTE_PICKUP' && _task.status != 'ARRIVED_PICKUP',
            ),
            const SizedBox(height: 12),

            // ── 3. LEG 2: DROPOFF TO CLIENT ──
            _buildLegCard(
              legNumber: '2',
              legTitle: 'التسليم للعميل',
              titleColor: const Color(0xFF065F46),
              circleBg: const Color(0xFFD1FAE5),
              circleTextColor: const Color(0xFF065F46),
              partyName: _task.customerName ?? 'العميل المستلم',
              phone: _task.customerPhone ?? '0501234567',
              address: _task.dropoffLocation,
              lat: _task.dropoffLat ?? 24.7236,
              lng: _task.dropoffLng ?? 46.6853,
              isComplete: isDelivered,
            ),
            const SizedBox(height: 14),

            // ── 4. PARTS VERIFICATION CHECKLIST ──
            _buildPartsChecklistCard(),
            const SizedBox(height: 14),

            // ── 5. PROOF OF DELIVERY (POD) CAMERA ATTACHMENT ──
            if (!isDelivered) _buildPodPhotoPickerCard(),
            const SizedBox(height: 20),

            // ── 6. PRIMARY WORKFLOW ACTION BUTTON ──
            _buildWorkflowActionButton(),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMultiStepTracker() {
    final currentStep = _getStepIndex(_task.status);
    final steps = [
      'مُسند',
      'للمورد',
      'وصول',
      'استلام',
      'للعميل',
      'تسليم',
    ];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('مسار تقدم الرحلة', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _task.statusArabicLabel,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(steps.length, (index) {
              final isDone = index <= currentStep;
              final isCurrent = index == currentStep;

              return Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: isDone ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                              shape: BoxShape.circle,
                              border: isCurrent ? Border.all(color: const Color(0xFF059669), width: 2) : null,
                            ),
                            child: Center(
                              child: isDone
                                  ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                                  : Text('${index + 1}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            steps[index],
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: isCurrent ? FontWeight.w900 : FontWeight.w600,
                              color: isCurrent ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (index < steps.length - 1)
                      Container(
                        width: 14,
                        height: 2,
                        color: index < currentStep ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                        margin: const EdgeInsets.only(bottom: 16),
                      ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  int _getStepIndex(String status) {
    switch (status) {
      case 'ASSIGNED':
        return 0;
      case 'EN_ROUTE_PICKUP':
      case 'ACCEPTED':
        return 1;
      case 'ARRIVED_PICKUP':
      case 'AT_PICKUP':
        return 2;
      case 'PICKED_UP':
        return 3;
      case 'EN_ROUTE_DELIVERY':
      case 'IN_TRANSIT':
        return 4;
      case 'ARRIVED_DELIVERY':
      case 'DELIVERED':
        return 5;
      default:
        return 0;
    }
  }

  Widget _buildLegCard({
    required String legNumber,
    required String legTitle,
    required Color titleColor,
    required Color circleBg,
    required Color circleTextColor,
    required String partyName,
    required String phone,
    required String address,
    required double lat,
    required double lng,
    required bool isComplete,
  }) {
    return Container(
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
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(color: circleBg, shape: BoxShape.circle),
                    child: Center(
                      child: Text(
                        legNumber,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: circleTextColor),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    legTitle,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: titleColor),
                  ),
                ],
              ),
              if (isComplete)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: const Text('مكتمل ✓', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Details
          Text(partyName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 3),
          Text(address, style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569))),
          const SizedBox(height: 12),

          // Action Buttons (Maps & Call)
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _openGoogleMaps(lat, lng),
                  icon: const Icon(Icons.navigation_rounded, size: 16, color: Color(0xFF059669)),
                  label: const Text('فتح الخريطة 🗺️', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFA7F3D0)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: () => _makePhoneCall(phone),
                icon: const Icon(Icons.phone_rounded, size: 16, color: Color(0xFF1E293B)),
                label: const Text('اتصال 📞', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPartsChecklistCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.checklist_rounded, color: Color(0xFF1B4D3E), size: 18),
              SizedBox(width: 6),
              Text('مراجعة وتدقيق بنود الشحنة', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _task.partsSummary,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: () => setState(() => _checkedItems[0] = !(_checkedItems[0] ?? false)),
            child: Row(
              children: [
                Checkbox(
                  value: _checkedItems[0] ?? false,
                  activeColor: const Color(0xFF059669),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  onChanged: (v) => setState(() => _checkedItems[0] = v ?? false),
                ),
                const Expanded(
                  child: Text(
                    'تم فحص القطعة وتطابق رقم الهيكل والباركود مع الفاتورة',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPodPhotoPickerCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Icon(
                    _podPhotoFile != null ? Icons.check_circle_rounded : Icons.camera_alt_outlined,
                    color: _podPhotoFile != null ? const Color(0xFF059669) : const Color(0xFF64748B),
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('إثبات التسليم بالصورة (POD)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  Text(
                    _podPhotoFile != null ? 'تم إرفاق الصورة بنجاح ✓' : 'اختياري: تصوير موقع أو توقيع التسليم',
                    style: TextStyle(fontSize: 10, color: _podPhotoFile != null ? const Color(0xFF059669) : const Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ],
          ),
          OutlinedButton(
            onPressed: _pickPodPhoto,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFCBD5E1)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            ),
            child: Text(
              _podPhotoFile != null ? 'تغيير' : 'التقاط 📸',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkflowActionButton() {
    if (_task.status == 'ASSIGNED') {
      return ElevatedButton(
        onPressed: _isProcessing ? null : () => _advanceStatus('EN_ROUTE_PICKUP'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF1E3A8A),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isProcessing
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('قبول المهمة وبدء التوجه للمورد 🏢', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      );
    } else if (_task.status == 'EN_ROUTE_PICKUP' || _task.status == 'ACCEPTED') {
      return ElevatedButton(
        onPressed: _isProcessing ? null : () => _advanceStatus('ARRIVED_PICKUP'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFD97706),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isProcessing
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('وصلت لموقع المورد 📍', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      );
    } else if (_task.status == 'ARRIVED_PICKUP' || _task.status == 'AT_PICKUP') {
      return ElevatedButton(
        onPressed: _isProcessing ? null : () => _advanceStatus('PICKED_UP'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF0D9488),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isProcessing
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('استلمت القطع وتأكدت من سلامتها 📦', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      );
    } else if (_task.status == 'PICKED_UP') {
      return ElevatedButton(
        onPressed: _isProcessing ? null : () => _advanceStatus('EN_ROUTE_DELIVERY'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF7C3AED),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isProcessing
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('بدء التوجه لعنوان العميل 🚀', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      );
    } else if (_task.status == 'EN_ROUTE_DELIVERY' || _task.status == 'IN_TRANSIT') {
      return ElevatedButton(
        onPressed: _isProcessing ? null : () => _advanceStatus('ARRIVED_DELIVERY'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF0891B2),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isProcessing
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('وصلت لموقع العميل 📍', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      );
    } else if (_task.status == 'ARRIVED_DELIVERY') {
      return ElevatedButton(
        onPressed: _showOtpVerificationDialog,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF059669),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: const Text('إدخال رمز التحقق OTP وإتمام التسليم ✅', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      );
    } else {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFECFDF5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFA7F3D0)),
        ),
        child: const Center(
          child: Text('تم تسليم وإغلاق هذه المهمة بنجاح ✓', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF065F46))),
        ),
      );
    }
  }
}
