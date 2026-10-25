import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/constants/car_constants.dart';
import 'package:rfqsa_mobile/features/vendor/repositories/vendor_repository.dart';

/// Vendor Specialized Brands Management Screen (1:1 Web Parity)
class VendorSpecializationsScreen extends StatefulWidget {
  final VendorRepository vendorRepository;

  const VendorSpecializationsScreen({super.key, required this.vendorRepository});

  @override
  State<VendorSpecializationsScreen> createState() => _VendorSpecializationsScreenState();
}

class _VendorSpecializationsScreenState extends State<VendorSpecializationsScreen> {
  late final List<String> _availableBrands;
  final Set<String> _selectedBrands = {'تويوتا', 'لكزس', 'جي إم سي', 'فورد'};
  String _searchQuery = '';
  bool _specializesInAll = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _availableBrands = kCarMakes.where((m) => m != 'أخرى').toList();
  }

  void _toggleBrand(String brand) {
    setState(() {
      if (_selectedBrands.contains(brand)) {
        _selectedBrands.remove(brand);
      } else {
        _selectedBrands.add(brand);
      }
    });
  }

  void _selectAll() {
    setState(() {
      _selectedBrands.addAll(_availableBrands);
    });
  }

  void _clearAll() {
    setState(() {
      _selectedBrands.clear();
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
    final filteredBrands = _availableBrands.where((brand) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.trim().toLowerCase();
      return brand.toLowerCase().contains(q);
    }).toList();

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
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: AppColors.border),
              ),
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
                      title: const Text(
                        'توفير جميع ماركات السيارات بلا استثناء',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      value: _specializesInAll,
                      onChanged: (val) => setState(() => _specializesInAll = val),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            if (!_specializesInAll) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'الماركات المعتمدة (${_selectedBrands.length} / ${_availableBrands.length}):',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  Row(
                    children: [
                      TextButton.icon(
                        onPressed: _selectAll,
                        icon: const Icon(Icons.select_all_rounded, size: 16),
                        label: const Text('تحديد الكل', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _clearAll,
                        icon: const Icon(Icons.clear_all_rounded, size: 16),
                        label: const Text('إلغاء التحديد', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.grey.shade600,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Search bar
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: 'ابحث عن ماركة سيارة (تويوتا، فورد، تشانجان، رينو..)',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppColors.textSecondary),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: filteredBrands.map((b) {
                  final isSelected = _selectedBrands.contains(b);
                  return FilterChip(
                    label: Text(b),
                    selected: isSelected,
                    selectedColor: AppColors.amber.withOpacity(0.18),
                    checkmarkColor: AppColors.amber,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? const Color(0xFFB45309) : AppColors.textPrimary,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(
                        color: isSelected ? AppColors.amber : AppColors.border,
                        width: isSelected ? 1.5 : 1.0,
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
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)))
                  : const Text('حفظ التخصص وتحديث الرادار ✓', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );
  }
}
