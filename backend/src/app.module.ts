import { Module } from '@nestjs/common';
import { RecipesModule } from './recipes/recipes.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [RecipesModule, DatabaseModule],
})
export class AppModule {}
