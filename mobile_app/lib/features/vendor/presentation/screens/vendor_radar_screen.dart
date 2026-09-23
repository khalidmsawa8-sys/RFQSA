import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/vendor/bloc/vendor_radar_bloc.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/web_navigation_drawer.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/part_details_sheet.dart';

/// Vendor Radar Live Requests Stream with Audio Chime & Direct Quotation Actions
class VendorRadarScreen extends StatefulWidget {
  const VendorRadarScreen({super.key});

  @override
  State<VendorRadarScreen> createState() => _VendorRadarScreenState();
}

class _VendorRadarScreenState extends State<VendorRadarScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: const WebNavigationDrawer(
        activeRoute: AppRouter.vendorRadar,
        role: 'vendor',
      ),
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
              'رادار الطلبات الذكي (Smart Radar)',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 15,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              'استقبال طلبات التسعير الفورية المتوافقة مع تخصصك',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF00A86B)),
            onPressed: () {
              context.read<VendorRadarBloc>().add(const LoadRadarRfqsEvent());
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          context.read<VendorRadarBloc>().add(const LoadRadarRfqsEvent());
        },
        child: BlocConsumer<VendorRadarBloc, VendorRadarState>(
          listener: (context, state) {
            if (state is VendorQuoteSuccessState) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.success,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            } else if (state is VendorRadarErrorState) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.error),
                  backgroundColor: AppColors.error,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
          builder: (context, state) {
            if (state is VendorRadarLoadingState) {
              return const Center(
                child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Color(0xFF00A86B))),
              );
            }

            if (state is VendorRadarLoadedState) {
              // Radar displays active market requests and direct targeted RFQs
              final rfqs = state.rfqs.where((r) {
                return !r.isExpired && r.status != 'closed' && r.status != 'cancelled';
              }).toList();

              if (rfqs.isEmpty) {
                return _buildEmptyRadar();
              }

              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: rfqs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final rfq = rfqs[index];
                  return _RadarRfqCard(rfq: rfq);
                },
              );
            }

            return _buildEmptyRadar();
          },
        ),
      ),
    );
  }

  Widget _buildEmptyRadar() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.radar_rounded, size: 40, color: Color(0xFF00A86B)),
            ),
            const SizedBox(height: 18),
            const Text(
              'الرادار بانتظار طلبات جديدة',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 6),
            const Text(
              'أنت متصل بالرادار الحي. فور قيام عميل بطلب قطع لماركات تخصصك ستظهر التسعيرة هنا فوراً.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }
}

class _RadarRfqCard extends StatelessWidget {
  final RfqModel rfq;
  const _RadarRfqCard({required this.rfq});

  @override
  Widget build(BuildContext context) {
    final hasQuoted = rfq.status == 'quoted' || (rfq.quotes != null && rfq.quotes!.isNotEmpty);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => PartDetailsSheet.show(
          context,
          rfq: rfq,
          isVendor: true,
          hasQuoted: hasQuoted,
        ),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFA7F3D0), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.directions_car_rounded, color: Color(0xFF059669), size: 20),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${rfq.vehicle.brand} ${rfq.vehicle.model} (${rfq.vehicle.year})',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                            ),
                            Text(
                              'طلب رادار: #${rfq.shortId}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontFamily: 'monospace'),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: (rfq.rfqType == 'private' || (rfq.targetVendorId != null && rfq.targetVendorId!.isNotEmpty))
                            ? const Color(0xFFF3E8FF)
                            : const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: (rfq.rfqType == 'private' || (rfq.targetVendorId != null && rfq.targetVendorId!.isNotEmpty))
                              ? const Color(0xFFD8B4FE)
                              : const Color(0xFFA7F3D0),
                        ),
                      ),
                      child: Text(
                        (rfq.rfqType == 'private' || (rfq.targetVendorId != null && rfq.targetVendorId!.isNotEmpty))
                            ? 'طلب مباشر 🎯'
                            : 'مطابقة 95% ⚡',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: (rfq.rfqType == 'private' || (rfq.targetVendorId != null && rfq.targetVendorId!.isNotEmpty))
                              ? const Color(0xFF7E22CE)
                              : const Color(0xFF059669),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 10),
                
                // Parts Box with Clickable Hint
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.build_circle_outlined, size: 16, color: Color(0xFF059669)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'القطع: ${rfq.parts.map((e) => e.name).join(" ، ")}',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'انقر لعرض تفاصيل ومواصفات القطع والصور 🔍',
                              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF94A3B8)),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 16, color: Color(0xFF64748B)),
                    const SizedBox(width: 4),
                    Text(rfq.deliveryCity.isNotEmpty ? rfq.deliveryCity : 'الرياض', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
                const SizedBox(height: 14),
                Builder(
                  builder: (ctx) {
                    final hasQuoted = rfq.status == 'quoted' || (rfq.quotes != null && rfq.quotes!.isNotEmpty);
                    if (hasQuoted) {
                      return SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF1F5F9),
                            disabledBackgroundColor: const Color(0xFFF1F5F9),
                            disabledForegroundColor: const Color(0xFF94A3B8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            elevation: 0,
                          ),
                          icon: const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF94A3B8), size: 18),
                          label: const Text('✓ تم تقديم العرض مسبقاً', style: TextStyle(fontWeight: FontWeight.w900)),
                        ),
                      );
                    }

                    return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pushNamed(
                            context,
                            AppRouter.vendorQuote,
                            arguments: {'rfq': rfq},
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00A86B),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        icon: const Icon(Icons.edit_note_rounded),
                        label: const Text('تسعير هذا الطلب الآن ⚡', style: TextStyle(fontWeight: FontWeight.w900)),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
