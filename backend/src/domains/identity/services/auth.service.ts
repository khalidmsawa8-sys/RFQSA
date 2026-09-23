import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepositoryPort } from '../ports/user-repository.port';
import { RegisterUserDto, LoginUserDto, VerifyOtpDto } from '../dtos/auth.dto';
import { UserEntity } from '../domain/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterUserDto): Promise<{ user: Partial<UserEntity>; token: string }> {
    const existingEmail = await this.userRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('البريد الإلكتروني مسجل بالفعل');
    }

    const existingPhone = await this.userRepository.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException('رقم الجوال مسجل بالفعل');
    }

    // Assign default Granular Permissions according to Role
    const defaultPermissions = this.getDefaultPermissionsForRole(dto.role);

    const user = await this.userRepository.create({
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      passwordHash: dto.password, // Simple hash/text placeholder for adapter
      isVerified: true,
      isActive: true,
      permissions: defaultPermissions,
      deletedAt: null,
    });

    const token = this.generateJwtToken(user);

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(dto: LoginUserDto): Promise<{ user: Partial<UserEntity>; token: string }> {
    let user = await this.userRepository.findByEmail(dto.identifier);
    if (!user) {
      user = await this.userRepository.findByPhone(dto.identifier);
    }

    if (!user || user.passwordHash !== dto.password) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('الحساب مجمد، يرجى التواصل مع الإدارة');
    }

    const token = this.generateJwtToken(user);
    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findByPhone(dto.phone);
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    // Simulate OTP verification
    if (dto.otp !== '123456' && dto.otp !== '000000') {
      throw new UnauthorizedException('رمز التحقق غير صحيح');
    }

    await this.userRepository.update(user.id, { isVerified: true });
    return { success: true, message: 'تم التحقق بنجاح' };
  }

  private generateJwtToken(user: UserEntity): string {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
    };
    return this.jwtService.sign(payload);
  }

  private getDefaultPermissionsForRole(role: string): string[] {
    switch (role) {
      case 'customer':
        return ['rfq:create', 'rfq:read', 'quote:accept', 'wallet:read', 'wallet:deposit'];
      case 'vendor':
        return ['rfq:read', 'quote:create', 'quote:read', 'wallet:read', 'wallet:withdraw'];
      case 'courier':
        return ['order:read', 'shipment:update', 'wallet:read'];
      case 'admin':
        return ['*'];
      default:
        return [];
    }
  }
}
