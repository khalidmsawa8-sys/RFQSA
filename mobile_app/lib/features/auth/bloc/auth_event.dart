import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

class AppStartedEvent extends AuthEvent {}

class LoginSubmittedEvent extends AuthEvent {
  final String identifier;
  final String password;

  const LoginSubmittedEvent({required this.identifier, required this.password});

  @override
  List<Object?> get props => [identifier, password];
}

class SwitchRoleEvent extends AuthEvent {
  final String newRole;

  const SwitchRoleEvent({required this.newRole});

  @override
  List<Object?> get props => [newRole];
}

class LogoutEvent extends AuthEvent {}
