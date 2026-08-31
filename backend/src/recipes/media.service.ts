import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecipesService } from './recipes.service';
import { CloudinaryService, CloudinaryResourceType } from '../cloudinary/cloudinary.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { recipeSelect, toRecipeDto } from './recipe-select';

const MAX_FILE_BYTES = 15 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipesService: RecipesService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async addMedia(
    recipeId: number,
    actor: AuthenticatedUser,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo no campo "file"');
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('Arquivo maior que 15MB');
    }
    const resourceType = resourceTypeFor(file.mimetype);

    await this.recipesService.assertRecipeOwnerOrAdmin(recipeId, actor);

    const uploaded = await this.cloudinary.upload(file.buffer, {
      folder: `tastyboard/recipes/${recipeId}`,
      resourceType,
    });

    const existingCount = await this.prisma.media.count({ where: { recipeId } });

    await this.prisma.media.create({
      data: {
        recipeId,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        type: resourceType === 'video' ? 'VIDEO' : 'IMAGE',
        isPrimary: existingCount === 0,
      },
    });

    return this.emitAndReturn(recipeId);
  }

  async addYoutubeMedia(recipeId: number, actor: AuthenticatedUser, rawUrl: string) {
    const videoId = extractYoutubeId(rawUrl);
    if (!videoId) {
      throw new BadRequestException('Informe uma URL válida do YouTube');
    }

    await this.recipesService.assertRecipeOwnerOrAdmin(recipeId, actor);

    const existingCount = await this.prisma.media.count({ where: { recipeId } });

    await this.prisma.media.create({
      data: {
        recipeId,
        url: `https://www.youtube.com/embed/${videoId}`,
        publicId: `youtube:${videoId}`,
        type: 'YOUTUBE',
        isPrimary: existingCount === 0,
      },
    });

    return this.emitAndReturn(recipeId);
  }

  async removeMedia(recipeId: number, mediaId: number, actor: AuthenticatedUser) {
    await this.recipesService.assertRecipeOwnerOrAdmin(recipeId, actor);

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.recipeId !== recipeId) {
      throw new NotFoundException('Mídia não encontrada');
    }

    if (media.type !== 'YOUTUBE') {
      await this.cloudinary
        .destroy(media.publicId, media.type === 'VIDEO' ? 'video' : 'image')
        .catch(() => undefined);
    }
    await this.prisma.media.delete({ where: { id: mediaId } });

    if (media.isPrimary) {
      const next = await this.prisma.media.findFirst({
        where: { recipeId },
        orderBy: { id: 'asc' },
      });
      if (next) {
        await this.prisma.media.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    return this.emitAndReturn(recipeId);
  }

  async setPrimaryMedia(recipeId: number, mediaId: number, actor: AuthenticatedUser) {
    await this.recipesService.assertRecipeOwnerOrAdmin(recipeId, actor);

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.recipeId !== recipeId) {
      throw new NotFoundException('Mídia não encontrada');
    }

    await this.prisma.$transaction([
      this.prisma.media.updateMany({ where: { recipeId }, data: { isPrimary: false } }),
      this.prisma.media.update({ where: { id: mediaId }, data: { isPrimary: true } }),
    ]);

    return this.emitAndReturn(recipeId);
  }

  private async emitAndReturn(recipeId: number) {
    const recipe = await this.prisma.recipe.findUniqueOrThrow({
      where: { id: recipeId },
      select: recipeSelect,
    });
    const dto = toRecipeDto(recipe);
    this.recipesService.emitUpdated(dto);
    return dto;
  }
}

function resourceTypeFor(mimetype: string): CloudinaryResourceType {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  throw new BadRequestException('Somente imagens ou vídeos são aceitos');
}

const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

function extractYoutubeId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
    const match = url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})/);
    if (match) return match[1];
  }

  return null;
}
