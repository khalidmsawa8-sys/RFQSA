import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:rfqsa_mobile/core/notifications/notification_service.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';
import 'package:rfqsa_mobile/features/auth/repositories/auth_repository.dart';

/// Centralized AuthBloc managing User Authentication, Session State & Role Routing
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(AuthInitialState()) {
    on<AppStartedEvent>(_onAppStarted);
    on<LoginSubmittedEvent>(_onLoginSubmitted);
    on<SwitchRoleEvent>(_onSwitchRole);
    on<LogoutEvent>(_onLogout);
  }

  Future<void> _onAppStarted(AppStartedEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoadingState());
    final hasSession = await _authRepository.hasValidSession();

    if (hasSession) {
      final cachedUser = await _authRepository.getCachedUser();
      if (cachedUser != null) {
        // Register Push Notification device token for authenticated user
        NotificationService().registerForUser(cachedUser.id);
        emit(AuthenticatedState(user: cachedUser, activeRole: cachedUser.role));
      } else {
        emit(UnauthenticatedState());
      }
    } else {
      emit(UnauthenticatedState());
    }
  }

  Future<void> _onLoginSubmitted(LoginSubmittedEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoadingState());

    final response = await _authRepository.login(
      identifier: event.identifier,
      password: event.password,
    );

    if (response.success && response.data != null) {
      final user = response.data!;
      // Register device token with backend
      NotificationService().registerForUser(user.id);
      emit(AuthenticatedState(user: user, activeRole: user.role));
    } else {
      emit(AuthErrorState(message: response.error ?? 'تعذر تسجيل الدخول، يرجى مراجعة البيانات.'));
    }
  }

  Future<void> _onSwitchRole(SwitchRoleEvent event, Emitter<AuthState> emit) async {
    if (state is AuthenticatedState) {
      final currentUser = (state as AuthenticatedState).user;
      final updatedUser = currentUser.copyWith(role: event.newRole);
      emit(AuthenticatedState(user: updatedUser, activeRole: event.newRole));
    }
  }

  Future<void> _onLogout(LogoutEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoadingState());
    // Invalidate device token from backend to prevent cross-user notification leakage
    await NotificationService().unregisterOnLogout();
    await _authRepository.logout();
    emit(UnauthenticatedState());
  }
}
