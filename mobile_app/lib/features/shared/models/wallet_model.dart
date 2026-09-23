import 'package:equatable/equatable.dart';

/// Transaction Item Model
class TransactionModel extends Equatable {
  final String id;
  final double amount;
  final String type; // credit, debit, payout, delivery_fee
  final String description;
  final String status;
  final String? reference;
  final String? invoiceNumber;
  final DateTime createdAt;

  const TransactionModel({
    required this.id,
    required this.amount,
    required this.type,
    required this.description,
    required this.status,
    this.reference,
    this.invoiceNumber,
    required this.createdAt,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['id']?.toString() ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      type: json['type']?.toString() ?? 'credit',
      description: json['description']?.toString() ?? json['title']?.toString() ?? 'عملية مالية',
      status: json['status']?.toString() ?? 'completed',
      reference: json['reference']?.toString() ?? json['reference_id']?.toString(),
      invoiceNumber: json['invoice_number']?.toString() ?? json['invoice_id']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [id, amount, type, status, reference, invoiceNumber];
}

/// Master Wallet Model
class WalletModel extends Equatable {
  final double balance;
  final double pendingBalance;
  final double totalEarned;
  final double totalSpent;
  final List<TransactionModel> transactions;

  const WalletModel({
    required this.balance,
    this.pendingBalance = 0.0,
    this.totalEarned = 0.0,
    this.totalSpent = 0.0,
    this.transactions = const [],
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    List<TransactionModel> txList = [];
    if (json['transactions'] is List) {
      txList = (json['transactions'] as List).map((e) => TransactionModel.fromJson(e as Map<String, dynamic>)).toList();
    }

    return WalletModel(
      balance: double.tryParse(json['balance']?.toString() ?? json['available_balance']?.toString() ?? '0') ?? 0.0,
      pendingBalance: double.tryParse(json['pending_balance']?.toString() ?? '0') ?? 0.0,
      totalEarned: double.tryParse(json['total_earned']?.toString() ?? '0') ?? 0.0,
      totalSpent: double.tryParse(json['total_spent']?.toString() ?? '0') ?? 0.0,
      transactions: txList,
    );
  }

  @override
  List<Object?> get props => [balance, pendingBalance, totalEarned, totalSpent];
}
