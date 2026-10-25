import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/audio/sound_alert_service.dart';
import 'package:rfqsa_mobile/core/storage/secure_storage_service.dart';
import 'package:rfqsa_mobile/features/shared/presentation/widgets/notification_permission_dialog.dart';

/// Top-level background message handler required by Firebase Messaging
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // FCM automatically handles system tray presentation for messages with a notification payload in background/terminated state.
  if (kDebugMode) {
    print("Background FCM message received: ${message.messageId}");
  }
}

/// Centralized Production Notification Service
/// Handles FCM Push, Android 13+ Runtime Permissions, 6 Sound Channels, In-App Badges & Deep Linking
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  ApiClient? _apiClient;
  SecureStorageService? _storageService;

  final ValueNotifier<int> unreadCountNotifier = ValueNotifier<int>(0);
  void Function(String route, Map<String, dynamic>? data)? _onNotificationClick;

  // Stored pending deep link for cold start / terminated app launch
  String? _pendingRoute;
  Map<String, dynamic>? _pendingRouteData;
  bool _isInitialized = false;

  Timer? _pollingTimer;
  final Set<String> _seenNotificationIds = <String>{};
  bool _isFirstPollingRun = true;
  bool _isPollingActive = false;

  void configure({required ApiClient apiClient, required SecureStorageService storageService}) {
    _apiClient = apiClient;
    _storageService = storageService;
  }

  void setOnNotificationClickListener(void Function(String route, Map<String, dynamic>? data) listener) {
    _onNotificationClick = listener;
    // If a pending notification tap was stored during cold start, fire it now
    if (_pendingRoute != null) {
      final route = _pendingRoute!;
      final data = _pendingRouteData;
      _pendingRoute = null;
      _pendingRouteData = null;
      Future.delayed(const Duration(milliseconds: 300), () {
        listener(route, data);
      });
    }
  }

  /// Initialize Push Notifications & Custom Sound Channels for Android & iOS
  Future<void> initialize() async {
    if (_isInitialized) return;
    _isInitialized = true;

    try {
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: false, // We request explicitly through flow
        requestBadgePermission: false,
        requestSoundPermission: false,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (response) {
          if (response.payload != null) {
            _handlePayload(response.payload!);
          }
        },
      );

      // Create Android Notification Channels (6 Channels for Granular Sound & Importance)
      final androidImplementation = _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

      if (androidImplementation != null) {
        // 0. High Importance Channel matching AndroidManifest default
        await androidImplementation.createNotificationChannel(
          const AndroidNotificationChannel(
            'rfq_high_importance_channel',
            'إشعارات رِفق العامة والمهمة',
            description: 'التنبيهات الفورية العامة لجميع عمليات المنظومة',
            importance: Importance.max,
            playSound: true,
            enableVibration: true,
          ),
        );

        // 1. RFQ Radar Channel (Custom Spare Parts Sound)
        await androidImplementation.createNotificationChannel(
          const AndroidNotificationChannel(
            'rfq_radar_channel',
            'رادار طلبات التسعير',
            description: 'تنبيهات فورية لطلبات قطع الغيار الواردة للموردين',
            importance: Importance.max,
            playSound: true,
            sound: RawResourceAndroidNotificationSound('rfq_alert'),
            enableVibration: true,
          ),
        );

        // 2. Orders Channel
        await androidImplementation.createNotificationChannel(
          const AndroidNotificationChannel(
            'orders_channel',
            'الطلبات وعروض الأسعار',
            description: 'تحديثات عروض الأسعار والصفقات للعملاء والموردين',
            importance: Importance.max,
            playSound: true,
            sound: RawResourceAndroidNotificationSound('rfq_alert'),
            enableVibration: true,
          ),
        );

        // 3. Delivery & Fleet Channel
        await androidImplementation.createNotificationChannel(
          const AndroidNotificationChannel(
            'delivery_channel',
            'الشحن والتوصيل والتتبع',
            description: 'مهام المندوب الميدانية وتحديثات مسار الشحنات للعملاء',
            importance: Importance.max,
            playSound: true,
            enableVibration: true,
          ),
        );

        // 4. Messages & Support Channel
        await androidImplementation.createNotificationChannel(
          const AndroidNotificationChannel(
            'messages_channel',
            'الرسائل والمحادثات',
            description: 'محادثات الدعم الفني وتذاكر العمليات',
            importance: Importance.high,
            playSound: true,
            enableVibration: true,
          ),
        );

        // 5. Payments & Wallet Channel
        await androidImplementation.createNotificationChannel(
          const AndroidNotificationChannel(
            'payments_channel',
            'المحفظة والفواتير الضريبية',
            description: 'تأكيد الحركات المالية وإيداع الأرباح والفواتير',
            importance: Importance.high,
            playSound: true,
          ),
        );

        // 6. System Announcements Channel
        await androidImplementation.createNotificationChannel(
          const AndroidNotificationChannel(
            'system_channel',
            'تنبيهات النظام العامة',
            description: 'إشعارات الصيانة والتحديثات الإدارية',
            importance: Importance.defaultImportance,
            playSound: true,
          ),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        print('Local Notification Init Warning: $e');
      }
    }

    // Initialize Firebase Messaging & Listeners
    try {
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      final messaging = FirebaseMessaging.instance;

      // Request FCM permission immediately on startup
      try {
        await messaging.requestPermission(
          alert: true,
          badge: true,
          sound: true,
          provisional: false,
        );
      } catch (_) {}

      if (!kIsWeb && Platform.isAndroid) {
        try {
          final status = await Permission.notification.status;
          if (!status.isGranted) {
            await Permission.notification.request();
          }
        } catch (_) {}
      }

      // Auto-subscribe to broadcast topics
      try {
        await messaging.subscribeToTopic('all_users');
        await messaging.subscribeToTopic('rfqsa_all');
      } catch (_) {}

      // 1. Fetch Initial Token if already permitted
      final token = await messaging.getToken();
      if (token != null) {
        if (kDebugMode) {
          print('FCM Registration Token: $token');
        }
        await _storageService?.saveFcmToken(token);
        _registerTokenOnBackend(token);
      }

      // 2. Listen to Token Refresh
      messaging.onTokenRefresh.listen((newToken) {
        _storageService?.saveFcmToken(newToken);
        _registerTokenOnBackend(newToken);
      });

      // 3. Foreground Message Handler
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        _handleForegroundMessage(message);
      });

      // 4. Background Message Open Handler
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleRemoteMessageClick(message);
      });

      // 5. Terminated / Cold-Start Launch Check
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleRemoteMessageClick(initialMessage);
      }
    } catch (e) {
      if (kDebugMode) {
        print('FCM Messaging Init Standby / Web mode: $e');
      }
    }

    // Fetch initial unread count
    fetchUnreadCount();
    startActivePolling();
  }

  /// Check whether runtime notification permission is granted
  Future<bool> isPermissionGranted() async {
    try {
      final status = await Permission.notification.status;
      return status.isGranted;
    } catch (_) {
      return false;
    }
  }

  /// Request runtime permission explicitly (Android 13+ POST_NOTIFICATIONS & iOS)
  Future<bool> requestNotificationPermissionExplicit() async {
    try {
      final status = await Permission.notification.request();
      if (status.isGranted) {
        // Also request through Firebase Messaging
        try {
          await FirebaseMessaging.instance.requestPermission(
            alert: true,
            badge: true,
            sound: true,
            provisional: false,
          );
          final token = await FirebaseMessaging.instance.getToken();
          if (token != null) {
            await _storageService?.saveFcmToken(token);
            _registerTokenOnBackend(token);
          }
        } catch (_) {}
        return true;
      }
      return false;
    } catch (e) {
      if (kDebugMode) {
        print('Error requesting notification permission: $e');
      }
      return false;
    }
  }

  /// Polite First-Launch Permission Prompt
  Future<void> checkAndPromptPermissionOnFirstLaunch(BuildContext context) async {
    try {
      final status = await Permission.notification.status;
      if (!status.isGranted) {
        if (context.mounted) {
          await NotificationPermissionDialog.show(
            context,
            isPermanentlyDenied: status.isPermanentlyDenied,
          );
        }
      }
    } catch (_) {}
  }

  /// Register Device Token on Backend
  Future<void> _registerTokenOnBackend(String fcmToken) async {
    try {
      final userId = await _storageService?.getUserId();
      if (_apiClient != null) {
        await _apiClient!.post(
          '/api/v1/notifications/register-device',
          data: {
            'fcm_token': fcmToken,
            'platform': Platform.isIOS ? 'ios' : 'android',
            'userId': userId,
          },
        );
      }
    } catch (e) {
      if (kDebugMode) {
        print('Token registration sync note: $e');
      }
    }
  }

  /// Register current device token for an authenticated user on Login
  Future<void> registerForUser(String userId) async {
    try {
      String? fcmToken;
      try {
        fcmToken = await FirebaseMessaging.instance.getToken();
      } catch (_) {}

      if (fcmToken == null) {
        fcmToken = await _storageService?.getFcmToken();
      }

      if (fcmToken != null && _apiClient != null) {
        await _apiClient!.post(
          '/api/v1/notifications/register-device',
          data: {
            'fcm_token': fcmToken,
            'platform': Platform.isIOS ? 'ios' : 'android',
            'userId': userId,
          },
        );
      }
      fetchUnreadCount();
      startActivePolling();
    } catch (_) {}
  }

  /// Deactivate device token on Logout to prevent cross-user notification leakage
  Future<void> unregisterOnLogout() async {
    try {
      stopActivePolling();
      final fcmToken = await _storageService?.getFcmToken();
      if (fcmToken != null && _apiClient != null) {
        await _apiClient!.delete(
          '/api/v1/notifications/devices?fcm_token=$fcmToken',
        );
      }
      unreadCountNotifier.value = 0;
    } catch (_) {}
  }

  /// Start Foreground/Active 5-Second Real-Time Notification Polling
  void startActivePolling() {
    if (_isPollingActive) return;
    _isPollingActive = true;
    _pollNotifications();
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _pollNotifications();
    });
  }

  /// Stop Polling on logout or sleep
  void stopActivePolling() {
    _isPollingActive = false;
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  /// Polls the central server for live notifications
  Future<void> _pollNotifications() async {
    try {
      final client = _apiClient ?? ApiClient.instance;
      final res = await client.get(
        '/api/v1/notifications?limit=15',
        fromJson: (data) => data as Map<String, dynamic>,
      );

      if (res.success && res.data != null) {
        final list = (res.data!['notifications'] as List<dynamic>?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ?? [];
        final unread = res.data!['unreadCount'] as int? ?? 0;
        unreadCountNotifier.value = unread;

        if (_isFirstPollingRun) {
          for (final n in list) {
            final id = n['id']?.toString() ?? n['notificationId']?.toString();
            if (id != null) _seenNotificationIds.add(id);
          }
          _isFirstPollingRun = false;
          return;
        }

        // Detect new incoming notifications and trigger local chime and system notification
        for (final n in list.reversed) {
          final id = n['id']?.toString() ?? n['notificationId']?.toString();
          if (id != null && !_seenNotificationIds.contains(id)) {
            _seenNotificationIds.add(id);

            final isRead = n['is_read'] == true || n['isRead'] == true;
            if (!isRead) {
              final title = n['title']?.toString() ?? 'إشعار جديد في رفق 🔔';
              final body = n['message']?.toString() ?? n['body']?.toString() ?? 'لديك تحديث جديد في حسابك';
              final type = (n['type'] ?? 'general').toString().toLowerCase();

              String channelId = 'orders_channel';
              String channelName = 'الطلبات وعروض الأسعار';

              if (type == 'new_rfq') {
                channelId = 'rfq_radar_channel';
                channelName = 'رادار طلبات التسعير';
              } else if (type.contains('delivery') || type.contains('courier') || type == 'in_transit' || type == 'arrived' || type == 'delivered') {
                channelId = 'delivery_channel';
                channelName = 'الشحن والتوصيل والتتبع';
              } else if (type == 'wallet_credit' || type == 'invoice' || type == 'payment') {
                channelId = 'payments_channel';
                channelName = 'المحفظة والفواتير الضريبية';
              } else if (type == 'new_message') {
                channelId = 'messages_channel';
                channelName = 'الرسائل والمحادثات';
              }

              showLocalNotification(
                id: id.hashCode,
                title: title,
                body: body,
                channelId: channelId,
                channelName: channelName,
                soundFileName: 'rfq_alert',
                payload: n,
              );
            }
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Polling notifications warning: $e');
      }
    }
  }

  /// Fetch Live Unread Count from Backend Database
  Future<int> fetchUnreadCount() async {
    try {
      if (_apiClient != null) {
        final res = await _apiClient!.get(
          '/api/v1/notifications/unread-count',
          fromJson: (data) => data as Map<String, dynamic>,
        );
        if (res.success && res.data != null) {
          final count = res.data!['unreadCount'] as int? ?? 0;
          unreadCountNotifier.value = count;
          return count;
        }
      }
    } catch (_) {}
    return unreadCountNotifier.value;
  }

  /// Show Local Push Notification with High-Priority Sound & Channel
  Future<void> showLocalNotification({
    required int id,
    required String title,
    required String body,
    String channelId = 'orders_channel',
    String channelName = 'الطلبات وعروض الأسعار',
    String? soundFileName = 'rfq_alert',
    Map<String, dynamic>? payload,
  }) async {
    // Play foreground sound alert
    if (channelId == 'rfq_radar_channel' || soundFileName != null) {
      SoundAlertService().playRfqRadarAlert();
    }

    unreadCountNotifier.value += 1;

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      sound: soundFileName != null ? RawResourceAndroidNotificationSound(soundFileName) : null,
      enableVibration: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      id,
      title,
      body,
      notificationDetails,
      payload: payload != null ? jsonEncode(payload) : null,
    );
  }

  /// Alias for backward compatibility
  Future<void> showRfqNotification({
    required int id,
    required String title,
    required String body,
    Map<String, dynamic>? payload,
  }) async {
    await showLocalNotification(
      id: id,
      title: title,
      body: body,
      channelId: 'rfq_radar_channel',
      channelName: 'رادار طلبات التسعير',
      soundFileName: 'rfq_alert',
      payload: payload,
    );
  }

  void _handleForegroundMessage(RemoteMessage message) {
    final title = message.notification?.title ?? message.data['title'] ?? 'إشعار جديد في رفق 🔔';
    final body = message.notification?.body ?? message.data['body'] ?? message.data['message'] ?? 'لديك تحديث جديد في حسابك';
    final type = (message.data['type'] ?? 'general').toString().toLowerCase();

    String channelId = 'orders_channel';
    String channelName = 'الطلبات وعروض الأسعار';

    if (type == 'new_rfq') {
      channelId = 'rfq_radar_channel';
      channelName = 'رادار طلبات التسعير';
    } else if (type.contains('delivery') || type.contains('courier') || type == 'in_transit' || type == 'arrived' || type == 'delivered') {
      channelId = 'delivery_channel';
      channelName = 'الشحن والتوصيل والتتبع';
    } else if (type == 'wallet_credit' || type == 'invoice' || type == 'payment') {
      channelId = 'payments_channel';
      channelName = 'المحفظة والفواتير الضريبية';
    } else if (type == 'new_message') {
      channelId = 'messages_channel';
      channelName = 'الرسائل والمحادثات';
    }

    showLocalNotification(
      id: message.hashCode,
      title: title,
      body: body,
      channelId: channelId,
      channelName: channelName,
      soundFileName: 'rfq_alert',
      payload: message.data,
    );
  }

  void _handleRemoteMessageClick(RemoteMessage message) {
    _resolveAndNavigate(message.data);
  }

  void _handlePayload(String rawPayload) {
    try {
      final Map<String, dynamic> data = jsonDecode(rawPayload);
      _resolveAndNavigate(data);
    } catch (_) {}
  }

  void _resolveAndNavigate(Map<String, dynamic> data) {
    final type = (data['type'] ?? data['entityType'] ?? '').toString().toLowerCase();
    final rfqId = (data['rfqId'] ?? data['rfq_id'] ?? data['entityId'] ?? '').toString();
    final orderId = (data['orderId'] ?? data['order_id'] ?? data['entityId'] ?? '').toString();
    final deliveryId = (data['deliveryId'] ?? data['delivery_id'] ?? data['entityId'] ?? '').toString();
    final actionUrl = (data['action_url'] ?? data['route'] ?? '').toString();

    String targetRoute = '/notifications';
    Map<String, dynamic> routeParams = {};

    if (type == 'new_rfq' || actionUrl.contains('/vendor/quote') || actionUrl.contains('/vendor/radar')) {
      targetRoute = '/vendor/quote';
      routeParams = {'rfqId': rfqId.isNotEmpty ? rfqId : 'RFQ-1153'};
    } else if (type == 'new_quote' || type == 'quote_accepted' || actionUrl.contains('/client/rfq') || actionUrl.contains('/deal')) {
      targetRoute = '/client/deal-room';
      routeParams = {'orderId': orderId.isNotEmpty ? orderId : rfqId.isNotEmpty ? rfqId : 'ORD-5501'};
    } else if (type.contains('delivery') || actionUrl.contains('/courier/orders') || actionUrl.contains('/tracking')) {
      targetRoute = '/client/order-tracking';
      routeParams = {'orderId': orderId.isNotEmpty ? orderId : deliveryId.isNotEmpty ? deliveryId : 'ORD-4920'};
    } else if (type == 'wallet_credit' || actionUrl.contains('/wallet')) {
      targetRoute = '/wallet';
    } else if (type == 'invoice' || actionUrl.contains('/invoices')) {
      targetRoute = '/client/invoices';
    } else if (type == 'new_message' || actionUrl.contains('/support')) {
      targetRoute = '/support';
    }

    if (_onNotificationClick != null) {
      _onNotificationClick!(targetRoute, routeParams);
    } else {
      _pendingRoute = targetRoute;
      _pendingRouteData = routeParams;
    }
  }
}
