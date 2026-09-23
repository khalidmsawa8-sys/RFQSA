import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:rfqsa_mobile/core/api/api_response.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_event.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';
import 'package:rfqsa_mobile/features/auth/models/user_model.dart';
import 'package:rfqsa_mobile/features/auth/repositories/auth_repository.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  group('AuthBloc Unit Tests', () {
    late MockAuthRepository mockAuthRepository;
    late AuthBloc authBloc;

    const testUser = UserModel(
      id: 'client-demo-id',
      email: 'client@rfqsa.tech',
      fullName: 'شركة المشتريات الوطنية',
      role: 'client',
      roleId: 'client_owner',
    );

    setUp(() {
      mockAuthRepository = MockAuthRepository();
      authBloc = AuthBloc(authRepository: mockAuthRepository);
    });

    tearDown(() {
      authBloc.close();
    });

    test('Initial state is AuthInitialState', () {
      expect(authBloc.state, equals(AuthInitialState()));
    });

    blocTest<AuthBloc, AuthState>(
      'Emits [AuthLoadingState, AuthenticatedState] on successful login',
      build: () {
        when(() => mockAuthRepository.login(
              identifier: 'client@rfqsa.tech',
              password: 'password123',
            )).thenAnswer(
          (_) async => ApiResponse<UserModel>(
            success: true,
            data: testUser,
          ),
        );
        return authBloc;
      },
      act: (bloc) => bloc.add(
        const LoginSubmittedEvent(
          identifier: 'client@rfqsa.tech',
          password: 'password123',
        ),
      ),
      expect: () => [
        AuthLoadingState(),
        const AuthenticatedState(user: testUser, activeRole: 'client'),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'Emits [AuthLoadingState, AuthErrorState] on failed login',
      build: () {
        when(() => mockAuthRepository.login(
              identifier: 'invalid@rfqsa.tech',
              password: 'wrong',
            )).thenAnswer(
          (_) async => ApiResponse<UserModel>.failure(
            error: 'بيانات الدخول غير صحيحة',
            statusCode: 400,
          ),
        );
        return authBloc;
      },
      act: (bloc) => bloc.add(
        const LoginSubmittedEvent(
          identifier: 'invalid@rfqsa.tech',
          password: 'wrong',
        ),
      ),
      expect: () => [
        AuthLoadingState(),
        const AuthErrorState(message: 'بيانات الدخول غير صحيحة'),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'SwitchRoleEvent updates the active role without dropping session',
      build: () => authBloc,
      seed: () => const AuthenticatedState(user: testUser, activeRole: 'client'),
      act: (bloc) => bloc.add(const SwitchRoleEvent(newRole: 'vendor')),
      expect: () => [
        AuthenticatedState(
          user: testUser.copyWith(role: 'vendor'),
          activeRole: 'vendor',
        ),
      ],
    );
  });
}
