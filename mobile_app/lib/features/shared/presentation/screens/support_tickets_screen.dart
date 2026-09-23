import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';

/// Support Tickets & Direct In-App Chat Assistance Screen
class SupportTicketsScreen extends StatefulWidget {
  final ApiClient apiClient;

  const SupportTicketsScreen({super.key, required this.apiClient});

  @override
  State<SupportTicketsScreen> createState() => _SupportTicketsScreenState();
}

class _SupportTicketsScreenState extends State<SupportTicketsScreen> {
  final List<Map<String, dynamic>> _tickets = [
    {
      'id': 'TCK-104',
      'subject': 'استفسار بخصوص مدة توصيل الشحنة',
      'status': 'answered',
      'category': 'delivery',
      'created_at': '2026-09-17',
      'messages': [
        {'sender': 'client', 'text': 'السلام عليكم، كم تستغرق الشحنة للوصول لحي الملز؟', 'time': '10:30 ص'},
        {'sender': 'support', 'text': 'وعليكم السلام، المندوب استلم الشحنة وفي الطريق إليك خلال 45 دقيقة بإذن الله.', 'time': '10:35 ص'},
      ],
    },
    {
      'id': 'TCK-101',
      'subject': 'طلب إضافة ماركة جديدة لتخصص الحساب',
      'status': 'closed',
      'category': 'account',
      'created_at': '2026-09-15',
      'messages': [
        {'sender': 'vendor', 'text': 'نود تفعيل تخصص سيارات شفروليه وكاديلاك للمؤسسة.', 'time': '02:15 م'},
        {'sender': 'support', 'text': 'تمت مراجعة السجل التجاري وإضافة الماركات بنجاح.', 'time': '03:00 م'},
      ],
    },
  ];

  void _openChatModal(Map<String, dynamic> ticket) {
    final msgController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final messages = ticket['messages'] as List;
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              top: 16,
              left: 16,
              right: 16,
            ),
            child: SizedBox(
              height: MediaQuery.of(ctx).size.height * 0.75,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(ticket['subject'], style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                          Text('تذكرة رقم: #${ticket['id']}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(),
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      itemCount: messages.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final msg = messages[i];
                        final isMe = msg['sender'] != 'support';
                        return Align(
                          alignment: isMe ? Alignment.centerLeft : Alignment.centerRight,
                          child: Container(
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isMe ? AppColors.primary : AppColors.background,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: isMe ? AppColors.primary : AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  msg['text'],
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isMe ? Colors.white : AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  msg['time'],
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: isMe ? Colors.white70 : AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: msgController,
                            decoration: const InputDecoration(
                              hintText: 'اكتب رسالتك للدعم الفني...',
                              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          onPressed: () {
                            if (msgController.text.trim().isEmpty) return;
                            setModalState(() {
                              messages.add({
                                'sender': 'user',
                                'text': msgController.text.trim(),
                                'time': 'الآن',
                              });
                            });
                            msgController.clear();
                          },
                          icon: const Icon(Icons.send_rounded),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('مركز الدعم الفني والمساعدة'),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _tickets.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final t = _tickets[i];
          final isAnswered = t['status'] == 'answered';
          return Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: () => _openChatModal(t),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'تذكرة #${t['id']}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontFamily: 'monospace'),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isAnswered ? AppColors.successSurface : AppColors.background,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: isAnswered ? AppColors.success.withOpacity(0.3) : AppColors.border),
                          ),
                          child: Text(
                            isAnswered ? 'تم الرد ✓' : 'مغلقة',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isAnswered ? AppColors.success : AppColors.textMuted),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t['subject'],
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('تاريخ الإنشاء: ${t['created_at']}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        const Text('اضغط لفتح المحادثة 💬', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
