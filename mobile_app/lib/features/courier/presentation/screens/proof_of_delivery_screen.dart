import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/media/media_service.dart';
import 'package:rfqsa_mobile/features/courier/models/delivery_task_model.dart';
import 'package:rfqsa_mobile/features/courier/repositories/courier_repository.dart';

/// Proof of Delivery (POD) Screen with OTP Verification & Photo Capture
class ProofOfDeliveryScreen extends StatefulWidget {
  final DeliveryTaskModel delivery;
  final CourierRepository courierRepository;
  final MediaService mediaService;

  const ProofOfDeliveryScreen({
    super.key,
    required this.delivery,
    required this.courierRepository,
    required this.mediaService,
  });

  @override
  State<ProofOfDeliveryScreen> createState() => _ProofOfDeliveryScreenState();
}

class _ProofOfDeliveryScreenState extends State<ProofOfDeliveryScreen> {
  final _otpController = TextEditingController();
  File? _podImage;
  String? _uploadedPodUrl;
  bool _isSubmitting = false;
  String? _error;

  Future<void> _capturePodPhoto() async {
    final file = await widget.mediaService.pickAndCompressImage(source: ImageSource.camera);
    if (file != null) {
      setState(() => _podImage = file);
      final url = await widget.mediaService.uploadImage(file);
      if (url != null) {
        setState(() => _uploadedPodUrl = url);
      }
    }
  }

  Future<void> _confirmDelivery() async {
    final otp = _otpController.text.trim();
    if (otp.length != 4) {
      setState(() => _error = 'يرجى إدخال رمز التحقق OTP المكون من 4 أرقام المستلم من العميل.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    final res = await widget.courierRepository.transitionDeliveryStatus(
      deliveryId: widget.delivery.id,
      targetStatus: 'DELIVERED',
      otpCode: otp,
      podPhotoUrl: _uploadedPodUrl,
    );

    setState(() => _isSubmitting = false);

    if (res.success) {
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('تم التسليم بنجاح! 🎉', style: TextStyle(fontWeight: FontWeight.w900)),
            content: const Text('تم توثيق رمز OTP وإيداع عمولة التوصيل في محفظتك فوراً.'),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                },
                child: const Text('العودة للمهام'),
              ),
            ],
          ),
        );
      }
    } else {
      setState(() {
        _error = res.error ?? 'رمز OTP غير صحيح، يرجى التأكد من العميل المستلم.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('إثبات وتسليم الشحنة (POD)'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // OTP Code Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.pin_rounded, color: AppColors.primary, size: 28),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'رمز استلام الشحنة (OTP)',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'اطلب من العميل تزويدك برمز OTP المكون من 4 أرقام الظاهر في غرفة الصفقات لديه:',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: 200,
                      child: TextField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 4,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 10,
                          color: AppColors.primary,
                        ),
                        decoration: const InputDecoration(
                          counterText: '',
                          hintText: '••••',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Photo POD Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'تصوير الشحنة عند التسليم (إثبات التسليم POD)',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'التقط صورة لكرتون القطع أو مع العميل كإثبات رسمي لاكتمال التسليم.',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 14),
                    if (_podImage != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(_podImage!, height: 160, width: double.infinity, fit: BoxFit.cover),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _capturePodPhoto,
                        icon: const Icon(Icons.camera_alt_rounded),
                        label: const Text('فتح الكاميرا والتقاط صورة الإثبات 📸'),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.errorSurface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.error),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_error!, style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: _isSubmitting ? null : _confirmDelivery,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
              child: _isSubmitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)))
                  : const Text('تأكيد وإتمام التسليم النهائي ✅', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );
  }
}
