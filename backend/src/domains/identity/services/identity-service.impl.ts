import { Injectable } from '@nestjs/common';
import { IdentityServicePort, UserIdentityDto } from '../ports/identity-service.port';
import { UserRepositoryPort } from '../ports/user-repository.port';

@Injectable()
export class IdentityServiceImpl implements IdentityServicePort {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async findById(id: string): Promise<UserIdentityDto | null> {
    const user = await this.userRepository.findById(id);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
    };
  }

  async validateUserToken(token: string): Promise<UserIdentityDto | null> {
    // Port implementation for token validation
    return null;
  }
}
