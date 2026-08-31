-- Rename every table, column, enum type, and constraint to lowercase
-- snake_case, matching standard SQL naming conventions, and give every
-- constraint/index an explicit name. Application code is unaffected:
-- Prisma's @map/@@map keep the TypeScript-facing model/field names
-- (camelCase/PascalCase) exactly as they were.

-- Enums
ALTER TYPE "Role" RENAME TO "role";
ALTER TYPE "MediaType" RENAME TO "media_type";

-- Tables
ALTER TABLE "Category" RENAME TO "category";
ALTER TABLE "Favorite" RENAME TO "favorite";
ALTER TABLE "Media" RENAME TO "media";
ALTER TABLE "PasswordResetToken" RENAME TO "password_reset_token";
ALTER TABLE "Recipe" RENAME TO "recipe";
ALTER TABLE "User" RENAME TO "user";

-- Columns: user
ALTER TABLE "user" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";

-- Columns: password_reset_token
ALTER TABLE "password_reset_token" RENAME COLUMN "tokenHash" TO "token_hash";
ALTER TABLE "password_reset_token" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "password_reset_token" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "password_reset_token" RENAME COLUMN "usedAt" TO "used_at";
ALTER TABLE "password_reset_token" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: category
ALTER TABLE "category" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: recipe
ALTER TABLE "recipe" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "recipe" RENAME COLUMN "categoryId" TO "category_id";
ALTER TABLE "recipe" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "recipe" RENAME COLUMN "updatedAt" TO "updated_at";

-- Columns: media
ALTER TABLE "media" RENAME COLUMN "publicId" TO "public_id";
ALTER TABLE "media" RENAME COLUMN "isPrimary" TO "is_primary";
ALTER TABLE "media" RENAME COLUMN "recipeId" TO "recipe_id";
ALTER TABLE "media" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: favorite
ALTER TABLE "favorite" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "favorite" RENAME COLUMN "recipeId" TO "recipe_id";
ALTER TABLE "favorite" RENAME COLUMN "createdAt" TO "created_at";

-- Primary key constraints
ALTER TABLE "category" RENAME CONSTRAINT "Category_pkey" TO "category_pkey";
ALTER TABLE "favorite" RENAME CONSTRAINT "Favorite_pkey" TO "favorite_pkey";
ALTER TABLE "media" RENAME CONSTRAINT "Media_pkey" TO "media_pkey";
ALTER TABLE "password_reset_token" RENAME CONSTRAINT "PasswordResetToken_pkey" TO "password_reset_token_pkey";
ALTER TABLE "recipe" RENAME CONSTRAINT "Recipe_pkey" TO "recipe_pkey";
ALTER TABLE "user" RENAME CONSTRAINT "User_pkey" TO "user_pkey";

-- Foreign key constraints
ALTER TABLE "favorite" RENAME CONSTRAINT "Favorite_recipeId_fkey" TO "favorite_recipe_id_fkey";
ALTER TABLE "favorite" RENAME CONSTRAINT "Favorite_userId_fkey" TO "favorite_user_id_fkey";
ALTER TABLE "media" RENAME CONSTRAINT "Media_recipeId_fkey" TO "media_recipe_id_fkey";
ALTER TABLE "password_reset_token" RENAME CONSTRAINT "PasswordResetToken_userId_fkey" TO "password_reset_token_user_id_fkey";
ALTER TABLE "recipe" RENAME CONSTRAINT "Recipe_categoryId_fkey" TO "recipe_category_id_fkey";
ALTER TABLE "recipe" RENAME CONSTRAINT "Recipe_authorId_fkey" TO "recipe_author_id_fkey";

-- Unique / lookup indexes
ALTER INDEX "Category_name_key" RENAME TO "category_name_key";
ALTER INDEX "Favorite_recipeId_idx" RENAME TO "favorite_recipe_id_idx";
ALTER INDEX "Favorite_userId_recipeId_key" RENAME TO "favorite_user_id_recipe_id_key";
ALTER INDEX "Media_recipeId_idx" RENAME TO "media_recipe_id_idx";
ALTER INDEX "PasswordResetToken_tokenHash_key" RENAME TO "password_reset_token_token_hash_key";
ALTER INDEX "PasswordResetToken_userId_idx" RENAME TO "password_reset_token_user_id_idx";
ALTER INDEX "Recipe_authorId_idx" RENAME TO "recipe_author_id_idx";
ALTER INDEX "Recipe_categoryId_idx" RENAME TO "recipe_category_id_idx";
ALTER INDEX "Recipe_createdAt_idx" RENAME TO "recipe_created_at_idx";
ALTER INDEX "User_createdAt_idx" RENAME TO "user_created_at_idx";
ALTER INDEX "User_email_key" RENAME TO "user_email_key";
