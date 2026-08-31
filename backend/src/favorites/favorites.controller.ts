import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@UseGuards(JwtAuthGuard)
@Controller()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('recipes/:id/favorite')
  toggle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.favoritesService.toggle(id, actor.id);
  }

  @Get('favorites')
  findAllForUser(@CurrentUser() actor: AuthenticatedUser) {
    return this.favoritesService.findAllForUser(actor.id);
  }
}
