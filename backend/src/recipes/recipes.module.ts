import { Module } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [RecipesController, MediaController],
  providers: [RecipesService, MediaService],
  exports: [RecipesService],
})
export class RecipesModule {}
