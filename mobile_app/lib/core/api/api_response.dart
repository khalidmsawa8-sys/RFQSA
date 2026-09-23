/// Generic API Envelope Model
class ApiResponse<T> {
  final bool success;
  final String? message;
  final String? error;
  final T? data;
  final int? statusCode;

  ApiResponse({
    required this.success,
    this.message,
    this.error,
    this.data,
    this.statusCode,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic data)? fromJsonT, {
    int? statusCode,
  }) {
    final isSuccess = json['success'] == true || json['error'] == null;
    dynamic rawData;

    if (json.containsKey('data')) {
      rawData = json['data'];
    } else if (json.containsKey('user')) {
      rawData = json['user'];
    } else if (json.containsKey('rfqs')) {
      rawData = json['rfqs'];
    } else if (json.containsKey('rfq')) {
      rawData = json['rfq'];
    } else if (json.containsKey('quotes')) {
      rawData = json['quotes'];
    } else if (json.containsKey('orders')) {
      rawData = json['orders'];
    } else if (json.containsKey('order')) {
      rawData = json['order'];
    } else if (json.containsKey('vehicles')) {
      rawData = json['vehicles'];
    } else if (json.containsKey('deliveries')) {
      rawData = json['deliveries'];
    } else if (json.containsKey('delivery')) {
      rawData = json['delivery'];
    } else {
      rawData = json;
    }

    return ApiResponse<T>(
      success: isSuccess,
      message: json['message'] as String?,
      error: json['error']?.toString() ?? json['message']?.toString(),
      data: (rawData != null && fromJsonT != null) ? fromJsonT(rawData) : rawData as T?,
      statusCode: statusCode,
    );
  }

  factory ApiResponse.failure({required String error, int? statusCode}) {
    return ApiResponse<T>(
      success: false,
      error: error,
      statusCode: statusCode,
    );
  }
}
