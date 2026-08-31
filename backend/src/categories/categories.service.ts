import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: { name: dto.name.trim() },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma categoria com este nome');
      }
      throw error;
    }
  }

  async update(id: number, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name: dto.name.trim() },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma categoria com este nome');
      }
      if (this.isMissingRecord(error)) {
        throw new NotFoundException('Categoria não encontrada');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (this.isMissingRecord(error)) {
        throw new NotFoundException('Categoria não encontrada');
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private isMissingRecord(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    );
  }
}
