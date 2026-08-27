import { Controller, Get, Post, Body } from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";

@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) { }

  @Get()
  findAll() {
    return this.recipesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateRecipeDto) {
    return this.recipesService.create(dto);
  }
}
