import 'package:equatable/equatable.dart';
import 'package:rfqsa_mobile/features/auth/models/user_model.dart';

abstract class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

class AuthInitialState extends AuthState {}

class AuthLoadingState extends AuthState {}

class AuthenticatedState extends AuthState {
  final UserModel user;
  final String activeRole; // client, vendor, courier, admin

  const AuthenticatedState({required this.user, required this.activeRole});

  @override
  List<Object?> get props => [user, activeRole];
}

class UnauthenticatedState extends AuthState {}

class AuthErrorState extends AuthState {
  final String message;

  const AuthErrorState({required this.message});

  @override
  List<Object?> get props => [message];
}
