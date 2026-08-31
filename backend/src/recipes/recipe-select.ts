import type { Prisma } from '../../generated/prisma/client';

const mediaOrderBy: Prisma.MediaOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { id: 'asc' },
];

export const recipeSelect = {
  id: true,
  title: true,
  ingredients: true,
  instructions: true,
  authorId: true,
  author: { select: { id: true, name: true } },
  categories: {
    select: { category: { select: { id: true, name: true } } },
    orderBy: { category: { name: 'asc' } },
  },
  media: {
    select: { id: true, url: true, type: true, isPrimary: true },
    orderBy: mediaOrderBy,
  },
  createdAt: true,
  updatedAt: true,
  _count: { select: { favorites: true } },
} as const;

type RawRecipe = {
  _count: { favorites: number };
  categories?: { category: { id: number; name: string } }[];
} & Record<string, unknown>;

export function toRecipeDto<T extends RawRecipe>(recipe: T) {
  const { _count, categories, ...rest } = recipe;
  return {
    ...rest,
    favoritesCount: _count.favorites,
    categories: categories?.map((entry) => entry.category) ?? [],
  };
}
