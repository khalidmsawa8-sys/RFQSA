import 'package:flutter/material.dart';
import 'package:rfqsa_mobile/features/client/presentation/screens/client_settings_screen.dart';

/// Vendor Membership & Enterprise Settings Screen (1:1 Web Parity with UnifiedIdentitySettingsView)
class VendorSettingsScreen extends StatelessWidget {
  const VendorSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ClientSettingsScreen(role: 'vendor');
  }
}
