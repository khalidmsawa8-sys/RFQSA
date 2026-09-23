import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UserRepositoryPort } from './ports/user-repository.port';
import { InMemoryUserRepositoryAdapter } from './adapters/in-memory-user-repository.adapter';
import { IdentityServicePort } from './ports/identity-service.port';
import { IdentityServiceImpl } from './services/identity-service.impl';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-enterprise-rfq-key-2026',
      signOptions: { expiresIn: '15m' }, // Short-lived access tokens
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: UserRepositoryPort,
      useClass: InMemoryUserRepositoryAdapter,
    },
    {
      provide: IdentityServicePort,
      useClass: IdentityServiceImpl,
    },
  ],
  exports: [AuthService, IdentityServicePort, UserRepositoryPort],
})
export class IdentityModule {}
