import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    if (actor.role !== 'ADMIN')
      throw new ForbiddenException(
        'Apenas administradores podem listar usuários',
      );
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    this.assertSelfOrAdmin(id, actor);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertSelfOrAdmin(id, actor);
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    this.assertSelfOrAdmin(id, actor);
    return this.usersService.remove(id);
  }

  private assertSelfOrAdmin(id: string, actor: AuthenticatedUser) {
    if (actor.id !== id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Você não pode alterar este usuário');
    }
  }
}
