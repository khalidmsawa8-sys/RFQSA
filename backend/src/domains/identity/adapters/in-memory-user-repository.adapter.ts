import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user-repository.port';
import { UserEntity } from '../domain/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemoryUserRepositoryAdapter implements UserRepositoryPort {
  private users: Map<string, UserEntity> = new Map();

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    for (const user of this.users.values()) {
      if (user.phone === phone) return user;
    }
    return null;
  }

  async create(userData: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const id = uuidv4();
    const now = new Date();
    const user = new UserEntity(
      id,
      userData.email,
      userData.phone,
      userData.role,
      userData.passwordHash,
      userData.isVerified,
      userData.isActive,
      userData.permissions || [],
      now,
      now,
      null
    );

    this.users.set(id, user);
    return user;
  }

  async update(id: string, userPartial: Partial<UserEntity>): Promise<UserEntity> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User with ID ${id} not found`);

    const updated = new UserEntity(
      existing.id,
      userPartial.email ?? existing.email,
      userPartial.phone ?? existing.phone,
      userPartial.role ?? existing.role,
      userPartial.passwordHash ?? existing.passwordHash,
      userPartial.isVerified ?? existing.isVerified,
      userPartial.isActive ?? existing.isActive,
      userPartial.permissions ?? existing.permissions,
      existing.createdAt,
      new Date(),
      userPartial.deletedAt !== undefined ? userPartial.deletedAt : existing.deletedAt
    );

    this.users.set(id, updated);
    return updated;
  }
}
