import { Global, Module } from '@nestjs/common';
import { RecipeEventsService } from './recipe-events.service';

@Global()
@Module({
  providers: [RecipeEventsService],
  exports: [RecipeEventsService],
})
export class RecipeEventsModule {}
