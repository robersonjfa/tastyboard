import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AddYoutubeMediaDto } from './dto/add-youtube-media.dto';

@UseGuards(JwtAuthGuard)
@Controller('recipes/:id/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.mediaService.addMedia(id, actor, file);
  }

  @Post('youtube')
  addYoutube(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddYoutubeMediaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.mediaService.addYoutubeMedia(id, actor, dto.url);
  }

  @Delete(':mediaId')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.mediaService.removeMedia(id, mediaId, actor);
  }

  @Patch(':mediaId/primary')
  setPrimary(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.mediaService.setPrimaryMedia(id, mediaId, actor);
  }
}
