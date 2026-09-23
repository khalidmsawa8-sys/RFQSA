import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rfqsa_mobile/core/theme/app_colors.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';

/// Interactive Live Chat Thread with Admin / Manager Member (عضو المدير • إدارة المنصة 🛡️)
class SupportChatModal extends StatefulWidget {
  final Map<String, dynamic>? ticket;
  final String? ticketId;
  final String? ticketTitle;
  final String? orderId;
  final String? ticketStatus;
  final VoidCallback? onTicketUpdated;

  const SupportChatModal({
    super.key,
    this.ticket,
    this.ticketId,
    this.ticketTitle,
    this.orderId,
    this.ticketStatus,
    this.onTicketUpdated,
  });

  static Future<void> show(
    BuildContext context, {
    Map<String, dynamic>? ticket,
    String? ticketId,
    String? ticketTitle,
    String? orderId,
    VoidCallback? onTicketUpdated,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SupportChatModal(
        ticket: ticket,
        ticketId: ticketId,
        ticketTitle: ticketTitle,
        orderId: orderId,
        onTicketUpdated: onTicketUpdated,
      ),
    );
  }

  @override
  State<SupportChatModal> createState() => _SupportChatModalState();
}

class _SupportChatModalState extends State<SupportChatModal> {
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  late String _ticketId;
  late String _ticketTitle;
  late String _ticketStatus;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    final t = widget.ticket ?? {};
    _ticketId = widget.ticketId ?? t['id']?.toString() ?? (widget.orderId != null ? 'ORD-${widget.orderId}' : 'TCK-8821');
    _ticketTitle = widget.ticketTitle ?? t['title']?.toString() ?? t['subject']?.toString() ?? (widget.orderId != null ? 'استفسار ودعم بخصوص الطلب #${widget.orderId}' : 'تذكرة دعم مباشر مع الإدارة');
    _ticketStatus = widget.ticketStatus ?? t['status']?.toString() ?? 'open';
    _fetchMessages();

    // Auto-poll messages every 6 seconds for live real-time sync with Admin
    _pollingTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      _fetchMessages(isBackground: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchMessages({bool isBackground = false}) async {
    if (!isBackground) {
      setState(() => _isLoading = true);
    }

    try {
      final cleanId = _ticketId.replaceAll('TCK-', '').replaceAll('DSP-', '');
      final res = await ApiClient.instance.get('/v1/support/$cleanId/messages');
      if (res.data != null && res.data['messages'] is List) {
        final raw = res.data['messages'] as List;
        final list = raw.map((m) => Map<String, dynamic>.from(m as Map)).toList();
        if (mounted) {
          final oldStatus = _ticketStatus;
          setState(() {
            _messages = list;
            if (res.data['ticket'] is Map) {
              final newSt = res.data['ticket']['status']?.toString().toLowerCase().trim();
              if (newSt != null && newSt.isNotEmpty) {
                _ticketStatus = newSt;
              }
            }
          });
          if (oldStatus != _ticketStatus) {
            widget.onTicketUpdated?.call();
          }
          _scrollToBottom();
        }
      }
    } catch (_) {
      // Fallback mock messages if network offline
      if (_messages.isEmpty && mounted) {
        setState(() {
          _messages = [
            {
              'id': 'msg-1',
              'sender_role': 'client',
              'sender_name': 'أنت',
              'message': widget.ticket?['last_reply'] ?? 'مرحباً، أود الاستفسار والمتابعة بخصوص هذه التذكرة.',
              'created_at': DateTime.now().subtract(const Duration(minutes: 15)).toIso8601String(),
            },
            {
              'id': 'msg-2',
              'sender_role': 'staff',
              'sender_name': 'عضو المدير • إدارة المنصة 🛡️',
              'message': 'أهلاً بك، تم استلام طلبك ومراجعته مباشرة من قبل إدارة المنصة. نحن هنا لخدمتك ومتابعة كافة الإجراءات فوراً.',
              'created_at': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
            },
          ];
        });
      }
    } finally {
      if (!isBackground && mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    _msgController.clear();

    final optimisticMsg = {
      'id': 'temp-${DateTime.now().millisecondsSinceEpoch}',
      'sender_role': 'client',
      'sender_name': 'أنت',
      'message': text,
      'created_at': DateTime.now().toIso8601String(),
    };

    setState(() {
      _messages.add(optimisticMsg);
    });
    _scrollToBottom();

    try {
      final cleanId = _ticketId.replaceAll('TCK-', '').replaceAll('DSP-', '');
      await ApiClient.instance.post(
        '/v1/support/$cleanId/messages',
        data: {'message': text, 'message_text': text},
      );
      widget.onTicketUpdated?.call();
      await _fetchMessages(isBackground: true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('تعذر إرسال الرسالة: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final st = _ticketStatus.toLowerCase().trim();
    final isClosed = st == 'closed' || st == 'completed' || st == 'resolved' || st == 'rejected';

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // ── HEADER ──
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(Icons.shield_rounded, color: Color(0xFFF59E0B), size: 24),
                      ),
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
                                  _ticketTitle,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isClosed ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: isClosed ? const Color(0xFFA7F3D0) : const Color(0xFFFCD34D)),
                                ),
                                child: Text(
                                  isClosed ? 'مكتمل ومغلق ✅' : 'عضو المدير متصل 🛡️',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: isClosed ? const Color(0xFF065F46) : const Color(0xFFB45309),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'تذكرة رقم: #$_ticketId • مباشرة مع فريق الإدارة والدعم المركزي',
                            style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ── CHAT MESSAGES BODY ──
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final m = _messages[index];
                      final role = (m['sender_role'] ?? '').toString().toLowerCase();
                      final isAdmin = role == 'staff' || role == 'admin' || (m['sender_name']?.toString().contains('المدير') ?? false);
                      final isMe = !isAdmin;

                      final text = m['message'] ?? m['message_text'] ?? '';
                      final timeStr = m['created_at'] != null
                          ? DateFormat('hh:mm a').format(DateTime.tryParse(m['created_at'].toString()) ?? DateTime.now())
                          : 'الآن';

                      return Align(
                        alignment: isMe ? Alignment.centerLeft : Alignment.centerRight,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                          child: Column(
                            crossAxisAlignment: isMe ? CrossAxisAlignment.start : CrossAxisAlignment.end,
                            children: [
                              // Sender Header Tag
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (isAdmin) ...[
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF0F172A),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.verified_user_rounded, color: Color(0xFFF59E0B), size: 11),
                                          SizedBox(width: 4),
                                          Text(
                                            'عضو المدير • إدارة المنصة 🛡️',
                                            style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w900),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                  ],
                                  Text(
                                    timeStr,
                                    style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),

                              // Message Bubble
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isAdmin
                                      ? Colors.white
                                      : const Color(0xFF2563EB),
                                  borderRadius: BorderRadius.circular(16).copyWith(
                                    bottomLeft: isMe ? const Radius.circular(2) : const Radius.circular(16),
                                    bottomRight: !isMe ? const Radius.circular(2) : const Radius.circular(16),
                                  ),
                                  border: Border.all(
                                    color: isAdmin ? const Color(0xFFE2E8F0) : const Color(0xFF1D4ED8),
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.04),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Text(
                                  text,
                                  style: TextStyle(
                                    fontSize: 13,
                                    height: 1.4,
                                    color: isAdmin ? const Color(0xFF0F172A) : Colors.white,
                                    fontWeight: isAdmin ? FontWeight.w700 : FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // ── INPUT BAR ──
          if (!isClosed)
            Container(
              padding: EdgeInsets.only(
                left: 14,
                right: 14,
                top: 10,
                bottom: MediaQuery.of(context).viewInsets.bottom + 14,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: TextField(
                        controller: _msgController,
                        maxLines: 3,
                        minLines: 1,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        decoration: const InputDecoration(
                          hintText: 'اكتب رسالتك لعضو المدير وفريق الدعم...',
                          hintStyle: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: _isSending ? null : _sendMessage,
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF2563EB).withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Center(
                        child: _isSending
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    st == 'rejected' ? Icons.cancel_rounded : Icons.check_circle_rounded,
                    size: 18,
                    color: st == 'rejected' ? const Color(0xFFDC2626) : const Color(0xFF059669),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    st == 'rejected'
                        ? 'تم رفض وإغلاق هذه التذكرة من قبل الإدارة ❌'
                        : 'تم إغلاق هذه التذكرة وحلها من قبل الإدارة ✅',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: st == 'rejected' ? const Color(0xFF991B1B) : const Color(0xFF065F46),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
