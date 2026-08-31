import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecipeEventsService } from '../events/recipe-events.service';
import { recipeSelect, toRecipeDto } from '../recipes/recipe-select';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: RecipeEventsService,
  ) {}

  async toggle(recipeId: number, userId: string) {
    const recipeExists = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true },
    });
    if (!recipeExists) throw new NotFoundException('Receita não encontrada');

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.favorite.create({ data: { userId, recipeId } });
    }

    const recipe = await this.prisma.recipe.findUniqueOrThrow({
      where: { id: recipeId },
      select: recipeSelect,
    });
    const dto = toRecipeDto(recipe);
    this.events.emit('recipe.updated', dto);

    return { favorited: !existing, favoritesCount: dto.favoritesCount };
  }

  async findAllForUser(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { recipe: { select: recipeSelect } },
    });
    return favorites.map((favorite) => toRecipeDto(favorite.recipe));
  }
}
