import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../domain/entities/user.entity';

export class RegisterUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'البريد الإلكتروني' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email!: string;

  @ApiProperty({ example: '+966500000000', description: 'رقم الجوال بالتنسيق الدولي' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'رقم الجوال غير صحيح' })
  phone!: string;

  @ApiProperty({ example: 'P@ssword123', description: 'كلمة المرور' })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن لا تقل عن 8 أحرف' })
  password!: string;

  @ApiProperty({ example: 'customer', enum: ['customer', 'vendor', 'courier'] })
  @IsEnum(['customer', 'vendor', 'courier'], { message: 'نوع الحساب غير صالح' })
  role!: UserRole;
}

export class LoginUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'البريد الإلكتروني أو رقم الجوال' })
  @IsNotEmpty({ message: 'حقل التسجيل مطلوب' })
  identifier!: string;

  @ApiProperty({ example: 'P@ssword123', description: 'كلمة المرور' })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  password!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+966500000000' })
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123456', description: 'رمز التحقق OTP' })
  @IsString()
  @MinLength(4)
  otp!: string;
}
