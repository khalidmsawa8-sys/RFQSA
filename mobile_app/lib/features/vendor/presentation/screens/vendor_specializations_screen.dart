import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/features/vendor/repositories/vendor_repository.dart';

/// Vendor Specialized Brands Management Screen
class VendorSpecializationsScreen extends StatefulWidget {
  final VendorRepository vendorRepository;

  const VendorSpecializationsScreen({super.key, required this.vendorRepository});

  @override
  State<VendorSpecializationsScreen> createState() => _VendorSpecializationsScreenState();
}

class _VendorSpecializationsScreenState extends State<VendorSpecializationsScreen> {
  final List<String> _availableBrands = [
    'تويوتا',
    'لكزس',
    'نيسان',
    'إنفينيتي',
    'هيونداي',
    'كيا',
    'جينيسيس',
    'جي إم سي',
    'شفروليه',
    'كاديلاك',
    'فورد',
    'لينكولن',
    'هوندا',
    'مازدا',
    'ميتسوبيشي',
    'مرسيدس بنز',
    'بي إم دبليو',
    'أودي',
    'فولكس واجن',
    'بورش',
  ];

  final Set<String> _selectedBrands = {'تويوتا', 'لكزس', 'جي إم سي', 'فورد'};
  bool _specializesInAll = false;
  bool _isSaving = false;

  void _toggleBrand(String brand) {
    setState(() {
      if (_selectedBrands.contains(brand)) {
        _selectedBrands.remove(brand);
      } else {
        _selectedBrands.add(brand);
      }
    });
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    await widget.vendorRepository.updateSpecializations(_selectedBrands.toList(), _specializesInAll);
    setState(() => _isSaving = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تم حفظ ماركات تخصصك بنجاح. سيتم توجيه طلبات الرادار بناءً عليها.'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('ماركات تخصص المورد'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'حدد ماركات السيارات التي توفر قطع غيارها:',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'لن يستقبل رادارك إلا طلبات السيارات المطابقة لتخصصك المعتمد لحماية جودة وسرعة التسعير.',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 14),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      activeColor: AppColors.amber,
                      title: const Text('توفير جميع ماركات السيارات بلا استثناء', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      value: _specializesInAll,
                      onChanged: (val) => setState(() => _specializesInAll = val),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            if (!_specializesInAll) ...[
              const Text(
                'الماركات المعتمدة في تخصصك:',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _availableBrands.map((b) {
                  final isSelected = _selectedBrands.contains(b);
                  return FilterChip(
                    label: Text(b),
                    selected: isSelected,
                    selectedColor: AppColors.amber.withOpacity(0.15),
                    checkmarkColor: AppColors.amber,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.amber : AppColors.textPrimary,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(
                        color: isSelected ? AppColors.amber : AppColors.border,
                      ),
                    ),
                    onSelected: (_) => _toggleBrand(b),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],

            ElevatedButton(
              onPressed: _isSaving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.amber),
              child: _isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)))
                  : const Text('حفظ التخصص وتحديث الرادار ✓', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
