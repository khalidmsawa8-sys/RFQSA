export type UserRole = 'customer' | 'vendor' | 'courier' | 'admin';

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly role: UserRole,
    public readonly passwordHash: string,
    public readonly isVerified: boolean,
    public readonly isActive: boolean,
    public readonly permissions: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null = null,
  ) {}

  public hasPermission(permission: string): boolean {
    if (this.role === 'admin') return true;
    return this.permissions.includes(permission);
  }
}
