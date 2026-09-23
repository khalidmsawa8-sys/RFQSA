export interface UserIdentityDto {
  id: string;
  email: string;
  phone: string;
  role: 'customer' | 'vendor' | 'courier' | 'admin';
  permissions: string[];
}

export abstract class IdentityServicePort {
  abstract findById(id: string): Promise<UserIdentityDto | null>;
  abstract validateUserToken(token: string): Promise<UserIdentityDto | null>;
}
