import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import type { RegisterDto } from '../auth/dto/register.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: RegisterDto) {
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash: await hash(dto.password, 12),
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.email && { email: dto.email.trim().toLowerCase() }),
          ...(dto.password && { passwordHash: await hash(dto.password, 12) }),
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return user;
  }

  toPublic(user: {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
