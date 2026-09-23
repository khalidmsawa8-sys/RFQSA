import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'package:rfqsa_mobile/core/theme/app_theme.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:rfqsa_mobile/features/auth/bloc/auth_state.dart';
import 'package:rfqsa_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:rfqsa_mobile/features/auth/repositories/auth_repository.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  group('LoginScreen Widget Tests', () {
    late MockAuthRepository mockAuthRepository;
    late AuthBloc authBloc;

    setUp(() {
      mockAuthRepository = MockAuthRepository();
      authBloc = AuthBloc(authRepository: mockAuthRepository);
    });

    tearDown(() {
      authBloc.close();
    });

    testWidgets('Renders LoginScreen fields and buttons correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: BlocProvider<AuthBloc>.value(
            value: authBloc,
            child: const LoginScreen(),
          ),
        ),
      );

      expect(find.text('تسجيل الدخول لمنظومة رِفق'), findsOneWidget);
      expect(find.text('رقم الجوال أو البريد أو الكود المرجعي'), findsOneWidget);
      expect(find.text('كلمة المرور'), findsOneWidget);
      expect(find.text('دخول آمن للمنظومة 🚀'), findsOneWidget);
      expect(find.text('حسابات تجريبية سريعة (Demo Profiles):'), findsOneWidget);
    });
  });
}
