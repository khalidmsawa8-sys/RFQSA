import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/utils/currency_formatter.dart';
import 'package:rfqsa_mobile/core/utils/id_utils.dart';
import 'package:rfqsa_mobile/features/shared/models/wallet_model.dart';
import 'package:rfqsa_mobile/features/shared/repositories/wallet_repository.dart';

/// Unified Wallet Screen with Distinct Reference & Invoice Numbers matching Web
class UnifiedWalletScreen extends StatefulWidget {
  final WalletRepository walletRepository;

  const UnifiedWalletScreen({super.key, required this.walletRepository});

  @override
  State<UnifiedWalletScreen> createState() => _UnifiedWalletScreenState();
}

class _UnifiedWalletScreenState extends State<UnifiedWalletScreen> {
  WalletModel? _wallet;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchWallet();
  }

  Future<void> _fetchWallet() async {
    setState(() => _isLoading = true);
    final res = await widget.walletRepository.fetchWallet();
    if (res.success && res.data != null) {
      setState(() {
        _wallet = res.data!;
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('المحفظة والحساب المالي'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchWallet,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchWallet,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(AppColors.primary)))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Balance Card (Royal Blue Gradient matching Web)
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'الرصيد المتاح الحالي',
                            style: TextStyle(fontSize: 13, color: Colors.white70, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            CurrencyFormatter.format(_wallet?.balance ?? 0.0),
                            style: const TextStyle(
                              fontSize: 30,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _buildMiniPill(
                                label: 'معلق',
                                value: CurrencyFormatter.format(_wallet?.pendingBalance ?? 0.0),
                              ),
                              const SizedBox(width: 10),
                              _buildMiniPill(
                                label: 'إجمالي العمليات',
                                value: CurrencyFormatter.format(_wallet?.totalEarned ?? 0.0),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),

                    // Section Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'سجل العمليات المالية والفواتير',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
                        ),
                        if (_wallet != null)
                          Text(
                            '${_wallet!.transactions.length} حركة',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Transactions List
                    if (_wallet?.transactions.isEmpty ?? true)
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Center(
                          child: Text(
                            'لا توجد حركات مالية مسجلة بعد.',
                            style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _wallet!.transactions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final tx = _wallet!.transactions[i];
                          final isCredit = tx.type == 'credit' || tx.type == 'delivery_fee' || tx.type == 'deposit';

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: isCredit ? AppColors.successSurface : AppColors.errorSurface,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(
                                        isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                                        color: isCredit ? AppColors.success : AppColors.error,
                                        size: 18,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            tx.description ?? (isCredit ? 'إيداع رصيد / تسليم' : 'سداد صفقة / عمولة'),
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            tx.createdAt != null
                                                ? '${tx.createdAt!.year}/${tx.createdAt!.month}/${tx.createdAt!.day}'
                                                : '—',
                                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      '${isCredit ? "+" : "-"} ${CurrencyFormatter.format(tx.amount.abs())}',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w900,
                                        color: isCredit ? AppColors.success : AppColors.error,
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(height: 16, color: AppColors.borderLight),
                                // Distinct Reference vs Invoice number (Web Parity)
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                         const Text('رقم المرجع: ', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                         Text(
                                           tx.reference ?? 'REF-${IdUtils.safeShortId(tx.id)}',
                                           style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                         ),
                                       ],
                                     ),
                                     Row(
                                       children: [
                                         const Text('رقم الفاتورة: ', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                         Text(
                                           tx.invoiceNumber ?? 'INV-2026-${IdUtils.safeShortId(tx.id)}',
                                           style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                                         ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildMiniPill({required String label, required String value}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
          ),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}
