import 'package:flutter/material.dart';

/// Centralized Role-Based Router for all Client, Vendor, and Courier Screens
class AppRouter {
  static const String splash = '/';
  static const String login = '/login';
  static const String otp = '/otp';

  // ──────── CLIENT ROUTES ────────
  static const String clientHome = '/client';
  static const String clientCreateRfq = '/client/create-rfq';
  static const String clientGarage = '/client/garage';
  static const String clientOrders = '/client/orders';
  static const String clientInvoices = '/client/invoices';
  static const String clientVendorsMap = '/client/vendors-map';
  static const String clientSupport = '/client/support';
  static const String clientRoles = '/client/roles';
  static const String clientSettings = '/client/settings';
  static const String clientDealRoom = '/client/deal-room';
  static const String clientOrderTracking = '/client/order-tracking';

  // ──────── VENDOR ROUTES ────────
  static const String vendorHome = '/vendor';
  static const String vendorRadar = '/vendor/radar';
  static const String vendorOrders = '/vendor/orders';
  static const String vendorInvoices = '/vendor/invoices';
  static const String vendorQuote = '/vendor/quote';
  static const String vendorSubmitQuote = '/vendor/quote';
  static const String vendorSpecializations = '/vendor/specializations';
  static const String vendorRoles = '/vendor/roles';
  static const String vendorSettings = '/vendor/settings';
  static const String vendorSupport = '/vendor/support';

  // ──────── COURIER ROUTES ────────
  static const String courierHome = '/courier';
  static const String courierOrders = '/courier/orders';
  static const String courierEarnings = '/courier/earnings';
  static const String courierProfile = '/courier/profile';
  static const String courierSupport = '/courier/support';
  static const String courierDeliveryDetail = '/courier/delivery-detail';
  static const String courierPod = '/courier/pod';

  // ──────── SHARED ROUTES ────────
  static const String wallet = '/wallet';
  static const String profile = '/profile';
  static const String support = '/support';
  static const String notifications = '/notifications';

  static Route<dynamic> generateRoute(
    RouteSettings settings, {
    required Widget Function(String route, dynamic arguments) screenBuilder,
  }) {
    final routeName = settings.name ?? splash;
    final args = settings.arguments;

    return MaterialPageRoute(
      settings: settings,
      builder: (context) => screenBuilder(routeName, args),
    );
  }
}
