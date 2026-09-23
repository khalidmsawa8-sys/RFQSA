import 'package:rfqsa_mobile/core/api/api_client.dart';
import 'package:rfqsa_mobile/core/api/api_endpoints.dart';
import 'package:rfqsa_mobile/core/api/api_response.dart';
import 'package:rfqsa_mobile/features/shared/models/wallet_model.dart';

/// Wallet Repository for Balance, Transactions, and Transfers
class WalletRepository {
  final ApiClient _apiClient;

  WalletRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<ApiResponse<WalletModel>> fetchWallet() async {
    return await _apiClient.get<WalletModel>(
      ApiEndpoints.wallet,
      fromJson: (data) => WalletModel.fromJson(data as Map<String, dynamic>),
    );
  }
}
