import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/theme/app_theme.dart';
import 'package:rfqsa_mobile/core/routing/app_router.dart';
import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/storage/secure_storage_service.dart';
import 'package:rfqsa_mobile/core/media/media_service.dart';
import 'package:rfqsa_mobile/core/location/location_service.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/features/auth/repositories/auth_repository.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/presentation/screens/role_splash_screen.dart';
import 'package:rfqsa_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:rfqsa_mobile/features/client/repositories/client_repository.dart';
import 'package:rfqsa_mobile/features/client/bloc/client_rfq_bloc.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_main_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/create_rfq_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/my_garage_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_orders_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_invoices_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_vendors_map_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_support_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_roles_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_settings_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_deal_room_screen.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_order_tracking_screen.dart';
import 'package:rfqsa_mobile/features/vendor/repositories/vendor_repository.dart';
import 'package:rfqsa_mobile/features/vendor/bloc/vendor_radar_bloc.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_main_screen.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_radar_screen.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_orders_screen.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_invoices_screen.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_submit_quote_screen.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_specializations_screen.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_settings_screen.dart';
import 'package:rfqsa_mobile/features/vendor/presentation/screens/vendor_support_screen.dart';
import 'package:rfqsa_mobile/features/courier/repositories/courier_repository.dart';
import 'package:rfqsa_mobile/features/courier/presentation/screens/courier_main_screen.dart';
import 'package:rfqsa_mobile/features/courier/presentation/screens/courier_orders_screen.dart';
import 'package:rfqsa_mobile/features/courier/presentation/screens/courier_earnings_screen.dart';
import 'package:rfqsa_mobile/features/courier/presentation/screens/courier_profile_screen.dart';
import 'package:rfqsa_mobile/features/courier/presentation/screens/courier_support_screen.dart';
import 'package:rfqsa_mobile/features/courier/presentation/screens/delivery_detail_screen.dart';
import 'package:rfqsa_mobile/features/courier/presentation/screens/proof_of_delivery_screen.dart';
import 'package:rfqsa_mobile/features/shared/repositories/wallet_repository.dart';
import 'package:rfqsa_mobile/features/shared/presentation/screens/unified_wallet_screen.dart';
import 'package:rfqsa_mobile/features/shared/presentation/screens/profile_screen.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:rfqsa_mobile/features/shared/presentation/screens/notifications_screen.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/courier/models/delivery_task_model.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase Core for FCM Notifications
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase Core init notice: $e');
  }

  // 1. Initialize Core Storage & Network Services
  final storageService = SecureStorageService();
  final apiClient = ApiClient(storageService: storageService);
  final mediaService = MediaService(apiClient: apiClient);
  final locationService = LocationService(apiClient: apiClient);
  final notificationService = NotificationService();

  // Configure Notification Service with Network Client & Storage
  notificationService.configure(
    apiClient: apiClient,
    storageService: storageService,
  );

  try {
    await notificationService.initialize();
  } catch (e) {
    debugPrint('Notification init error: $e');
  }

  // Handle Deep Linking from Push Notifications
  notificationService.setOnNotificationClickListener((route, data) {
    if (appNavigatorKey.currentState != null) {
      appNavigatorKey.currentState!.pushNamed(route, arguments: data);
    }
  });

  // 2. Initialize Repositories
  final authRepository = AuthRepository(apiClient: apiClient, storageService: storageService);
  final clientRepository = ClientRepository(apiClient: apiClient);
  final vendorRepository = VendorRepository(apiClient: apiClient);
  final courierRepository = CourierRepository(apiClient: apiClient);
  final walletRepository = WalletRepository(apiClient: apiClient);

  runApp(
    RfqsaApp(
      authRepository: authRepository,
      clientRepository: clientRepository,
      vendorRepository: vendorRepository,
      courierRepository: courierRepository,
      walletRepository: walletRepository,
      mediaService: mediaService,
      locationService: locationService,
      notificationService: notificationService,
      apiClient: apiClient,
    ),
  );
}

class RfqsaApp extends StatelessWidget {
  final AuthRepository authRepository;
  final ClientRepository clientRepository;
  final VendorRepository vendorRepository;
  final CourierRepository courierRepository;
  final WalletRepository walletRepository;
  final MediaService mediaService;
  final LocationService locationService;
  final NotificationService notificationService;
  final ApiClient apiClient;

  const RfqsaApp({
    super.key,
    required this.authRepository,
    required this.clientRepository,
    required this.vendorRepository,
    required this.courierRepository,
    required this.walletRepository,
    required this.mediaService,
    required this.locationService,
    required this.notificationService,
    required this.apiClient,
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (_) => AuthBloc(authRepository: authRepository)..add(AppStartedEvent()),
        ),
        BlocProvider<ClientRfqBloc>(
          create: (_) => ClientRfqBloc(repository: clientRepository),
        ),
        BlocProvider<VendorRadarBloc>(
          create: (_) => VendorRadarBloc(repository: vendorRepository),
        ),
      ],
      child: MaterialApp(
        navigatorKey: appNavigatorKey,
        title: 'رِفق | RIFQ',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        locale: const Locale('ar', 'SA'),
        supportedLocales: const [
          Locale('ar', 'SA'),
          Locale('en', 'US'),
        ],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        initialRoute: AppRouter.splash,
        onGenerateRoute: (settings) => AppRouter.generateRoute(
          settings,
          screenBuilder: (route, args) => _buildScreen(route, args),
        ),
      ),
    );
  }

  Widget _buildScreen(String route, dynamic args) {
    switch (route) {
      // ──────── AUTH SCREENS ────────
      case AppRouter.splash:
        return const RoleSplashScreen();
      case AppRouter.login:
        return const LoginScreen();

      // ──────── CLIENT SCREENS ────────
      case AppRouter.clientHome:
        return const ClientMainScreen();
      case AppRouter.clientCreateRfq:
        final vendorId = args is Map ? (args['vendorId']?.toString() ?? args['id']?.toString()) : null;
        final vendorName = args is Map ? (args['vendorName']?.toString() ?? args['company_name']?.toString() ?? args['name']?.toString()) : null;
        return CreateRfqScreen(
          mediaService: mediaService,
          locationService: locationService,
          initialVendorId: vendorId,
          initialVendorName: vendorName,
        );
      case AppRouter.clientGarage:
        return MyGarageScreen(clientRepository: clientRepository);
      case AppRouter.clientOrders:
        return ClientOrdersScreen(clientRepository: clientRepository);
      case AppRouter.clientInvoices:
        return const ClientInvoicesScreen();
      case AppRouter.clientVendorsMap:
        return const ClientVendorsMapScreen();
      case AppRouter.clientSupport:
        return const ClientSupportScreen();
      case AppRouter.clientRoles:
        return const ClientRolesScreen(role: 'client');
      case AppRouter.clientSettings:
        return const ClientSettingsScreen();
      case AppRouter.clientDealRoom:
        final rfqId = args is Map ? (args['rfqId']?.toString() ?? args['orderId']?.toString() ?? 'RFQ-8412') : (args is String ? args : 'RFQ-8412');
        final initialRfq = args is Map ? (args['rfq'] as RfqModel?) : null;
        return ClientDealRoomScreen(
          rfqId: rfqId,
          initialRfq: initialRfq,
          clientRepository: clientRepository,
        );
      case AppRouter.clientOrderTracking:
        final orderData = args is Map<String, dynamic> ? args : (args is Map ? Map<String, dynamic>.from(args) : null);
        final orderId = orderData?['orderId']?.toString() ?? orderData?['id']?.toString();
        return ClientOrderTrackingScreen(
          orderData: orderData,
          orderId: orderId,
        );

      // ──────── VENDOR SCREENS ────────
      case AppRouter.vendorHome:
        return const VendorMainScreen();
      case AppRouter.vendorRadar:
        return const VendorRadarScreen();
      case AppRouter.vendorOrders:
        return const VendorOrdersScreen();
      case AppRouter.vendorInvoices:
        return const VendorInvoicesScreen();
      case AppRouter.vendorQuote:
        final rfq = args is Map ? args['rfq'] as RfqModel? : null;
        if (rfq != null) {
          return VendorSubmitQuoteScreen(rfq: rfq);
        }
        return const VendorRadarScreen();
      case AppRouter.vendorSpecializations:
        return VendorSpecializationsScreen(vendorRepository: vendorRepository);
      case AppRouter.vendorRoles:
        return const ClientRolesScreen(role: 'vendor');
      case AppRouter.vendorSettings:
        return const VendorSettingsScreen();
      case AppRouter.vendorSupport:
        return const VendorSupportScreen();

      // ──────── COURIER SCREENS ────────
      case AppRouter.courierHome:
        return CourierMainScreen(courierRepository: courierRepository);
      case AppRouter.courierOrders:
        return CourierOrdersScreen(courierRepository: courierRepository);
      case AppRouter.courierEarnings:
        return const CourierEarningsScreen();
      case AppRouter.courierProfile:
        return const CourierProfileScreen();
      case AppRouter.courierSupport:
        return const CourierSupportScreen();
      case AppRouter.courierDeliveryDetail:
        final delivery = args is Map ? args['delivery'] as DeliveryTaskModel? : null;
        if (delivery == null) return CourierMainScreen(courierRepository: courierRepository);
        return DeliveryDetailScreen(
          delivery: delivery,
          courierRepository: courierRepository,
        );
      case AppRouter.courierPod:
        final delivery = args is Map ? args['delivery'] as DeliveryTaskModel? : null;
        if (delivery == null) return CourierMainScreen(courierRepository: courierRepository);
        return ProofOfDeliveryScreen(
          delivery: delivery,
          courierRepository: courierRepository,
          mediaService: mediaService,
        );

      // ──────── SHARED SCREENS ────────
      case AppRouter.wallet:
        return UnifiedWalletScreen(walletRepository: walletRepository);
      case AppRouter.profile:
        return const ProfileScreen();
      case AppRouter.notifications:
        return NotificationsScreen(apiClient: apiClient);

      default:
        return const RoleSplashScreen();
    }
  }
}
