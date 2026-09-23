import 'package:dio/dio.dart';

/// Centralized Error Interceptor to parse and format meaningful Arabic error messages
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    String readableMessage = 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.';

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        readableMessage = 'انتهت مهلة الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت.';
        break;
      case DioExceptionType.badResponse:
        final statusCode = err.response?.statusCode;
        final responseData = err.response?.data;

        if (responseData is Map<String, dynamic>) {
          if (responseData['error'] != null) {
            readableMessage = responseData['error'].toString();
          } else if (responseData['message'] != null) {
            readableMessage = responseData['message'].toString();
          }
        } else if (statusCode == 404) {
          readableMessage = 'العنصر المطلوب غير موجود على الخادم.';
        } else if (statusCode == 403) {
          readableMessage = 'ليس لديك الصلاحية للقيام بهذا الإجراء.';
        } else if (statusCode == 500) {
          readableMessage = 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً.';
        }
        break;
      case DioExceptionType.cancel:
        readableMessage = 'تم إلغاء الطلب.';
        break;
      case DioExceptionType.connectionError:
        readableMessage = 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.';
        break;
      default:
        readableMessage = 'حدث خطأ في الشبكة، يرجى إعادة المحاولة.';
        break;
    }

    final customizedException = DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      type: err.type,
      error: readableMessage,
      message: readableMessage,
    );

    return handler.next(customizedException);
  }
}
