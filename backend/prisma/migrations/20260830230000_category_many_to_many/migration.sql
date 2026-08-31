-- Convert Recipe <-> Category from a single optional category_id column
-- into an explicit many-to-many join table, preserving existing assignments.

CREATE TABLE "recipe_category" (
    "recipe_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_category_pkey" PRIMARY KEY ("recipe_id", "category_id")
);

CREATE INDEX "recipe_category_category_id_idx" ON "recipe_category"("category_id");

ALTER TABLE "recipe_category"
    ADD CONSTRAINT "recipe_category_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_category"
    ADD CONSTRAINT "recipe_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "recipe_category" ("recipe_id", "category_id")
SELECT "id", "category_id" FROM "recipe" WHERE "category_id" IS NOT NULL;

ALTER TABLE "recipe" DROP CONSTRAINT "recipe_category_id_fkey";
DROP INDEX "recipe_category_id_idx";
ALTER TABLE "recipe" DROP COLUMN "category_id";
