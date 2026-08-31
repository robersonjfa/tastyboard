import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryIds') categoryIds?: string,
  ) {
    return this.recipesService.findAll({
      search,
      categoryIds: categoryIds
        ? categoryIds
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => !Number.isNaN(value))
        : undefined,
    });
  }

  @Sse('events')
  events() {
    return this.recipesService.eventsStream();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recipesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() dto: CreateRecipeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.recipesService.create(dto, actor);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.recipesService.update(id, dto, actor);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.recipesService.remove(id, actor);
  }
}
