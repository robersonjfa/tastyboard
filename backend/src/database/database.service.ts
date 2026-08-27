import { Injectable, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Recipe } from "../recipes/recipe.type";

type Database = {
  recipes: Recipe[];
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly filePath = join(process.cwd(), "data", "db.json");
  private data: Database = { recipes: [] };

  async onModuleInit() {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const content = await readFile(this.filePath, "utf-8");
      this.data = JSON.parse(content) as Database;
    } catch {
      await this.save();
    }
  }

  get recipes(): Recipe[] {
    return this.data.recipes;
  }

  async save(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
