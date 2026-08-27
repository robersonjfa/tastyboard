import { Injectable } from "@nestjs/common";
import type { Recipe } from "./recipe.type";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class RecipesService {
  constructor(private readonly database: DatabaseService) {}

  findAll(): Recipe[] {
    return this.database.recipes;
  }

  async create(dto: CreateRecipeDto): Promise<Recipe>  {
    const lastId = Math.max(
      0,
      ...this.database.recipes.map((recipe) => recipe.id),
    );

    const recipe: Recipe = {
      id: lastId + 1,
      title: dto.title,
      description: dto.description,
    };

    this.database.recipes.push(recipe);
    await this.database.save();
    return recipe;
  }
}
