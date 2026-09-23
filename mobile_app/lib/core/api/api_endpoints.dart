/// Canonical API Endpoints mapped 1:1 to the RFQSA Backend
class ApiEndpoints {
  // Authentication & Profile
  static const String login = '/v1/auth/login';
  static const String signup = '/v1/auth/signup';
  static const String permissions = '/v1/account/permissions';
  static const String account = '/v1/account';
  static const String registerDevice = '/v1/notifications/register-device';

  // Client Endpoints
  static const String rfqs = '/rfqs';
  static String rfqDetails(String id) => '/rfqs/$id';
  static String reactivateRfq(String id) => '/api/v1/client/rfqs/$id/reactivate';
  static const String clientVehicles = '/v1/client/vehicles';
  static String clientVehicleDetail(String id) => '/v1/client/vehicles/$id';
  static const String orders = '/v1/orders';
  static String orderDetails(String id) => '/v1/orders/$id';
  static String confirmReceipt(String orderId) => '/v1/client/orders/$orderId/confirm-receipt';

  // Vendor Endpoints
  static const String vendorRadar = '/v1/radar';
  static const String quotes = '/quotes';
  static String quoteDetails(String id) => '/quotes/$id';
  static const String vendorSpecializations = '/v1/vendor/specializations';
  static const String vendorBranches = '/v1/vendor/branches';
  static String updateOrderStatus(String id) => '/v1/vendor/orders/$id/status';

  // Courier Endpoints
  static const String courierDeliveries = '/v1/courier/deliveries';
  static String courierDeliveryDetail(String id) => '/v1/courier/deliveries/$id';
  static String courierTransition(String id) => '/v1/courier/deliveries/$id/transition';
  static String courierUploadPod(String id) => '/v1/courier/deliveries/$id/upload-pod';
  static const String courierSync = '/v1/courier/sync';
  static const String courierWallet = '/v1/courier/wallet';
  static const String courierProfile = '/v1/courier/profile';

  // Shared Endpoints
  static const String wallet = '/v1/wallet';
  static const String walletTransaction = '/v1/wallet/transaction';
  static const String walletTransfer = '/v1/wallet/transfer';
  static const String deliveryCalculate = '/v1/delivery/calculate';
  static const String geocode = '/geocode';
  static const String uploadPartImage = '/upload-part-image';
  static const String support = '/v1/support';
  static String supportMessages(String id) => '/v1/support/$id/messages';
  static const String processNotifications = '/process-notifications';
}
