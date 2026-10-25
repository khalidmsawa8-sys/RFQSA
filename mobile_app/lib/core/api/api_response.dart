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

    T? parsedData;
    String? parseError;

    if (rawData != null && fromJsonT != null) {
      try {
        parsedData = fromJsonT(rawData);
      } catch (err) {
        parseError = err.toString();
      }
    } else if (rawData != null) {
      try {
        parsedData = rawData as T?;
      } catch (err) {
        parseError = err.toString();
      }
    }

    final bool hasError = parseError != null || (!isSuccess && json['error'] != null);

    return ApiResponse<T>(
      success: !hasError && isSuccess,
      message: json['message'] as String?,
      error: parseError ?? json['error']?.toString() ?? json['message']?.toString(),
      data: parsedData,
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
