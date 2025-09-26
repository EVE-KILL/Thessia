/*
  Warnings:

  - You are about to drop the column `access_mask` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `character_id` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `expires` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `key_id` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `v_code` on the `api_keys` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `api_keys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `api_keys` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."api_keys_character_id_idx";

-- DropIndex
DROP INDEX "public"."api_keys_key_id_key";

-- DropIndex
DROP INDEX "public"."api_keys_type_idx";

-- AlterTable
ALTER TABLE "public"."api_keys" DROP COLUMN "access_mask",
DROP COLUMN "character_id",
DROP COLUMN "expires",
DROP COLUMN "key_id",
DROP COLUMN "type",
DROP COLUMN "v_code",
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "lastUsed" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "public"."api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_createdBy_idx" ON "public"."api_keys"("createdBy");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "public"."api_keys"("key");
