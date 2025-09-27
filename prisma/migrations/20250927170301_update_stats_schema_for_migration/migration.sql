/*
  Warnings:

  - You are about to drop the column `activity_by_day` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `activity_by_hour` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `isk_destroyed` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `isk_lost` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `kills_total` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `last_calculated` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `losses_total` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `most_lost_ships` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `most_used_ships` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `most_valuable_kills` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `most_valuable_ships` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `most_valuable_structures` on the `stats` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `stats` table. All the data in the column will be lost.
  - Added the required column `entity_id` to the `stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_type` to the `stats` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."stats_alliance_id_key";

-- DropIndex
DROP INDEX "public"."stats_character_id_key";

-- DropIndex
DROP INDEX "public"."stats_corporation_id_key";

-- DropIndex
DROP INDEX "public"."stats_last_calculated_idx";

-- DropIndex
DROP INDEX "public"."stats_type_idx";

-- AlterTable
ALTER TABLE "public"."stats" DROP COLUMN "activity_by_day",
DROP COLUMN "activity_by_hour",
DROP COLUMN "isk_destroyed",
DROP COLUMN "isk_lost",
DROP COLUMN "kills_total",
DROP COLUMN "last_calculated",
DROP COLUMN "losses_total",
DROP COLUMN "most_lost_ships",
DROP COLUMN "most_used_ships",
DROP COLUMN "most_valuable_kills",
DROP COLUMN "most_valuable_ships",
DROP COLUMN "most_valuable_structures",
DROP COLUMN "type",
ADD COLUMN     "avg_gang_size" DOUBLE PRECISION,
ADD COLUMN     "daily_stats" JSONB,
ADD COLUMN     "entity_id" INTEGER NOT NULL,
ADD COLUMN     "entity_type" TEXT NOT NULL,
ADD COLUMN     "full_stats" JSONB,
ADD COLUMN     "kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_kill_date" TIMESTAMP(3),
ADD COLUMN     "last_loss_date" TIMESTAMP(3),
ADD COLUMN     "losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthly_stats" JSONB,
ADD COLUMN     "most_lost_ship" JSONB,
ADD COLUMN     "most_used_ship" JSONB,
ADD COLUMN     "recent_activity" JSONB,
ADD COLUMN     "ships_lost" JSONB,
ADD COLUMN     "ships_used" JSONB,
ADD COLUMN     "solo_kills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "solo_losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "solo_percentage" DOUBLE PRECISION,
ADD COLUMN     "total_damage_done" DECIMAL(20,2),
ADD COLUMN     "total_damage_received" DECIMAL(20,2),
ADD COLUMN     "total_isk_destroyed" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_isk_lost" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "weekly_stats" JSONB;

-- CreateIndex
CREATE INDEX "stats_entity_type_idx" ON "public"."stats"("entity_type");

-- CreateIndex
CREATE INDEX "stats_entity_id_idx" ON "public"."stats"("entity_id");

-- CreateIndex
CREATE INDEX "stats_last_kill_date_idx" ON "public"."stats"("last_kill_date");

-- CreateIndex
CREATE INDEX "stats_last_loss_date_idx" ON "public"."stats"("last_loss_date");
