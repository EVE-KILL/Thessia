/*
  Warnings:

  - You are about to drop the column `item_name` on the `celestials` table. All the data in the column will be lost.
  - You are about to drop the column `region_name` on the `celestials` table. All the data in the column will be lost.
  - You are about to drop the column `solar_system_name` on the `celestials` table. All the data in the column will be lost.
  - You are about to drop the column `type_name` on the `celestials` table. All the data in the column will be lost.
  - You are about to drop the column `character_name` on the `character_achievements` table. All the data in the column will be lost.
  - You are about to drop the column `alliance_name` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `character_name` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `corporation_name` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `character_name` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."celestials_item_name_idx";

-- DropIndex
DROP INDEX "public"."character_achievements_character_name_idx";

-- DropIndex
DROP INDEX "public"."users_character_name_idx";

-- AlterTable
ALTER TABLE "public"."celestials" DROP COLUMN "item_name",
DROP COLUMN "region_name",
DROP COLUMN "solar_system_name",
DROP COLUMN "type_name";

-- AlterTable
ALTER TABLE "public"."character_achievements" DROP COLUMN "character_name";

-- AlterTable
ALTER TABLE "public"."comments" DROP COLUMN "alliance_name",
DROP COLUMN "character_name",
DROP COLUMN "corporation_name";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "character_name";
