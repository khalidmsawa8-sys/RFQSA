/// Environment & System Configuration for RFQSA Mobile Application
class EnvConfig {
  static const String appName = 'رفق | RFQSA';
  static const String appVersion = '1.0.0';

  // Production API Base URL
  static const String baseUrl = 'https://rfqsa.tech/api/';
  static const String v1BaseUrl = 'https://rfqsa.tech/api/v1/';

  // Supabase Configuration
  static const String supabaseUrl = 'https://srv1868299.hstgr.cloud:8000';
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NTYwMDAsImV4cCI6MjAyNTQzMjAwMH0.rfq_anon_key_production';

  // Network Timeouts (Optimized for instant mobile response)
  static const Duration connectTimeout = Duration(seconds: 6);
  static const Duration receiveTimeout = Duration(seconds: 8);
  static const Duration sendTimeout = Duration(seconds: 12);

  // Storage Keys
  static const String tokenKey = 'rfq_auth_token';
  static const String refreshTokenKey = 'rfq_refresh_token';
  static const String userIdKey = 'rfq_user_id';
  static const String userRoleKey = 'rfq_user_role';
  static const String userProfileKey = 'rfq_user_profile';
  static const String activeOrgIdKey = 'rfq_org_id';
  static const String fcmTokenKey = 'rfq_fcm_token';

  // Sound Channels
  static const String rfqSoundChannelId = 'rfq_high_importance_channel';
  static const String rfqSoundChannelName = 'تنبيهات طلبات قطع الغيار';
  static const String rfqSoundChannelDesc = 'قناة التنبيهات الصوتية الحية لطلبات التسعير الجديدة';
  static const String rfqSoundFileName = 'rfq_alert';
}
