import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeEventsService } from '../events/recipe-events.service';
import { recipeSelect, toRecipeDto } from './recipe-select';
import { sanitizeInstructions } from './sanitize-instructions';

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: RecipeEventsService,
  ) {}

  async findAll(query: { search?: string; categoryIds?: number[] }) {
    const term = query.search?.trim();
    const ids = term
      ? await this.prisma.$queryRaw<{ id: number }[]>`
          SELECT "id" FROM "Recipe"
          WHERE "title" ILIKE ${'%' + term + '%'}
             OR array_to_string("ingredients", ', ') ILIKE ${'%' + term + '%'}
        `
      : null;

    const recipes = await this.prisma.recipe.findMany({
      where: {
        ...(query.categoryIds?.length && {
          categories: { some: { categoryId: { in: query.categoryIds } } },
        }),
        ...(ids && { id: { in: ids.map((row) => row.id) } }),
      },
      select: recipeSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return recipes.map(toRecipeDto);
  }

  async findOne(id: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: recipeSelect,
    });
    if (!recipe) throw new NotFoundException('Receita não encontrada');
    return toRecipeDto(recipe);
  }

  async create(dto: CreateRecipeDto, actor: AuthenticatedUser) {
    const recipe = await this.createOrThrow({
      title: dto.title.trim(),
      ingredients: normalizeIngredients(dto.ingredients),
      instructions: sanitizeInstructions(dto.instructions),
      authorId: actor.id,
      categoryIds: dto.categoryIds ?? [],
    });
    this.emit('recipe.created', recipe);
    return recipe;
  }

  async update(id: number, dto: UpdateRecipeDto, actor: AuthenticatedUser) {
    const current = await this.findOne(id);
    this.assertOwnerOrAdmin(current.authorId, actor);
    const recipe = await this.updateOrThrow(id, {
      ...(dto.title && { title: dto.title.trim() }),
      ...(dto.ingredients && { ingredients: normalizeIngredients(dto.ingredients) }),
      ...(dto.instructions && { instructions: sanitizeInstructions(dto.instructions) }),
      ...(dto.categoryIds !== undefined && { categoryIds: dto.categoryIds }),
    });
    this.emit('recipe.updated', recipe);
    return recipe;
  }

  async remove(id: number, actor: AuthenticatedUser) {
    const recipe = await this.findOne(id);
    this.assertOwnerOrAdmin(recipe.authorId, actor);
    await this.prisma.recipe.delete({ where: { id } });
    this.emit('recipe.deleted', { id });
    return recipe;
  }

  eventsStream() {
    return this.events.stream();
  }

  async assertRecipeOwnerOrAdmin(id: number, actor: AuthenticatedUser) {
    const recipe = await this.findOne(id);
    this.assertOwnerOrAdmin(recipe.authorId, actor);
    return recipe;
  }

  emitUpdated(recipe: object) {
    this.emit('recipe.updated', recipe);
  }

  private async createOrThrow(data: {
    title: string;
    ingredients: string[];
    instructions: string;
    authorId: string;
    categoryIds: number[];
  }) {
    const { categoryIds, ...rest } = data;
    try {
      const recipe = await this.prisma.recipe.create({
        data: {
          ...rest,
          categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        },
        select: recipeSelect,
      });
      return toRecipeDto(recipe);
    } catch (error) {
      throw this.mapCategoryError(error);
    }
  }

  private async updateOrThrow(
    id: number,
    data: {
      title?: string;
      ingredients?: string[];
      instructions?: string;
      categoryIds?: number[];
    },
  ) {
    const { categoryIds, ...rest } = data;
    try {
      const recipe = await this.prisma.recipe.update({
        where: { id },
        data: {
          ...rest,
          ...(categoryIds !== undefined && {
            categories: {
              deleteMany: {},
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }),
        },
        select: recipeSelect,
      });
      return toRecipeDto(recipe);
    } catch (error) {
      throw this.mapCategoryError(error);
    }
  }

  private mapCategoryError(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2003'
    ) {
      return new BadRequestException('Categoria inválida');
    }
    return error;
  }

  private emit(type: string, data: object) {
    this.events.emit(type, data);
  }

  private assertOwnerOrAdmin(
    authorId: string | null,
    actor: AuthenticatedUser,
  ) {
    if (authorId !== actor.id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Você não pode alterar esta receita');
    }
  }
}

function normalizeIngredients(ingredients: string[]) {
  return ingredients.map((ingredient) => ingredient.trim()).filter(Boolean);
}
