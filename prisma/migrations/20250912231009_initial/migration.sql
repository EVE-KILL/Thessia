-- CreateEnum
CREATE TYPE "public"."ProcessingStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "public"."AchievementType" AS ENUM ('pvp', 'pve', 'exploration', 'industry', 'special');

-- CreateEnum
CREATE TYPE "public"."Rarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- CreateTable
CREATE TABLE "public"."alliances" (
    "id" SERIAL NOT NULL,
    "alliance_id" INTEGER NOT NULL,
    "name" TEXT,
    "ticker" TEXT,
    "creator_id" INTEGER,
    "creator_corporation_id" INTEGER,
    "executor_corporation_id" INTEGER,
    "date_founded" TIMESTAMP(3),
    "faction_id" INTEGER,
    "corporation_count" INTEGER,
    "member_count" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alliances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."characters" (
    "id" SERIAL NOT NULL,
    "character_id" INTEGER NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "birthday" TIMESTAMP(3),
    "gender" TEXT,
    "race_id" INTEGER,
    "security_status" DOUBLE PRECISION,
    "bloodline_id" INTEGER,
    "corporation_id" INTEGER,
    "alliance_id" INTEGER,
    "faction_id" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "last_active" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."character_history" (
    "id" SERIAL NOT NULL,
    "character_id" INTEGER NOT NULL,
    "record_id" INTEGER,
    "corporation_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."corporations" (
    "id" SERIAL NOT NULL,
    "corporation_id" INTEGER NOT NULL,
    "name" TEXT,
    "ticker" TEXT,
    "description" TEXT,
    "url" TEXT,
    "date_founded" TIMESTAMP(3),
    "member_count" INTEGER,
    "alliance_id" INTEGER,
    "faction_id" INTEGER,
    "home_station_id" INTEGER,
    "home_station_name" TEXT,
    "shares" BIGINT,
    "tax_rate" DOUBLE PRECISION,
    "creator_id" INTEGER,
    "ceo_id" INTEGER,
    "ceo_name" TEXT,
    "war_eligible" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."corporation_history" (
    "id" SERIAL NOT NULL,
    "corporation_id" INTEGER NOT NULL,
    "record_id" INTEGER,
    "alliance_id" INTEGER,
    "start_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."factions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."battles" (
    "id" SERIAL NOT NULL,
    "battle_id" BIGINT NOT NULL,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_ms" BIGINT,
    "killmails_count" INTEGER NOT NULL,
    "isk_destroyed" DECIMAL(20,2) NOT NULL,
    "main_system_id" INTEGER,
    "main_region_id" INTEGER,
    "systems" JSONB NOT NULL,
    "sides" JSONB NOT NULL,
    "killmail_ids" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" SERIAL NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "query" JSONB NOT NULL,
    "creator_id" INTEGER,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "processing_status" "public"."ProcessingStatus" NOT NULL DEFAULT 'pending',
    "processing_started_at" TIMESTAMP(3),
    "processing_completed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "last_processed_at" TIMESTAMP(3),
    "processed_data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."character_achievement" (
    "id" SERIAL NOT NULL,
    "character_id" INTEGER NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."AchievementType" NOT NULL,
    "points" INTEGER NOT NULL,
    "rarity" "public"."Rarity" NOT NULL,
    "category" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completion_tiers" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "killmail_ids" JSONB,

    CONSTRAINT "character_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."character_achievements" (
    "id" SERIAL NOT NULL,
    "character_id" INTEGER NOT NULL,
    "character_name" TEXT,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "completed_achievements" INTEGER NOT NULL DEFAULT 0,
    "total_achievements" INTEGER NOT NULL DEFAULT 0,
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_processing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."historical_stats" (
    "id" SERIAL NOT NULL,
    "alliance_id" INTEGER NOT NULL,
    "corporation_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "previousCount" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "sum_sec_status" DOUBLE PRECISION,
    "avg_sec_status" DOUBLE PRECISION,
    "pirate_members" INTEGER,
    "carebear_members" INTEGER,
    "neutral_members" INTEGER,
    "change_1d" INTEGER,
    "change_7d" INTEGER,
    "change_14d" INTEGER,
    "change_30d" INTEGER,
    "total_achievement_points" INTEGER,
    "avg_achievement_points" DOUBLE PRECISION,
    "top_achievement_character_id" INTEGER,
    "top_achievement_character_points" INTEGER,
    "historicalCounts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wars" (
    "id" SERIAL NOT NULL,
    "war_id" INTEGER NOT NULL,
    "declared" TIMESTAMP(3) NOT NULL,
    "started" TIMESTAMP(3) NOT NULL,
    "finished" TIMESTAMP(3),
    "retracted" TIMESTAMP(3),
    "mutual" BOOLEAN NOT NULL,
    "open_for_allies" BOOLEAN NOT NULL,
    "aggressor_corporation_id" INTEGER,
    "aggressor_alliance_id" INTEGER,
    "aggressor_isk_destroyed" BIGINT NOT NULL DEFAULT 0,
    "aggressor_ships_killed" INTEGER NOT NULL DEFAULT 0,
    "defender_corporation_id" INTEGER,
    "defender_alliance_id" INTEGER,
    "defender_isk_destroyed" BIGINT NOT NULL DEFAULT 0,
    "defender_ships_killed" INTEGER NOT NULL DEFAULT 0,
    "allies" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alliances_alliance_id_key" ON "public"."alliances"("alliance_id");

-- CreateIndex
CREATE INDEX "alliances_name_idx" ON "public"."alliances"("name");

-- CreateIndex
CREATE INDEX "alliances_ticker_idx" ON "public"."alliances"("ticker");

-- CreateIndex
CREATE INDEX "alliances_creator_id_idx" ON "public"."alliances"("creator_id");

-- CreateIndex
CREATE INDEX "alliances_creator_corporation_id_idx" ON "public"."alliances"("creator_corporation_id");

-- CreateIndex
CREATE INDEX "alliances_executor_corporation_id_idx" ON "public"."alliances"("executor_corporation_id");

-- CreateIndex
CREATE INDEX "alliances_faction_id_idx" ON "public"."alliances"("faction_id");

-- CreateIndex
CREATE INDEX "alliances_deleted_idx" ON "public"."alliances"("deleted");

-- CreateIndex
CREATE INDEX "alliances_createdAt_idx" ON "public"."alliances"("createdAt");

-- CreateIndex
CREATE INDEX "alliances_updatedAt_idx" ON "public"."alliances"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "characters_character_id_key" ON "public"."characters"("character_id");

-- CreateIndex
CREATE INDEX "characters_corporation_id_idx" ON "public"."characters"("corporation_id");

-- CreateIndex
CREATE INDEX "characters_alliance_id_idx" ON "public"."characters"("alliance_id");

-- CreateIndex
CREATE INDEX "characters_faction_id_idx" ON "public"."characters"("faction_id");

-- CreateIndex
CREATE INDEX "characters_last_active_idx" ON "public"."characters"("last_active");

-- CreateIndex
CREATE INDEX "characters_createdAt_idx" ON "public"."characters"("createdAt");

-- CreateIndex
CREATE INDEX "characters_updatedAt_idx" ON "public"."characters"("updatedAt");

-- CreateIndex
CREATE INDEX "characters_name_idx" ON "public"."characters"("name");

-- CreateIndex
CREATE INDEX "character_history_character_id_idx" ON "public"."character_history"("character_id");

-- CreateIndex
CREATE INDEX "character_history_corporation_id_idx" ON "public"."character_history"("corporation_id");

-- CreateIndex
CREATE INDEX "character_history_start_date_idx" ON "public"."character_history"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "corporations_corporation_id_key" ON "public"."corporations"("corporation_id");

-- CreateIndex
CREATE INDEX "corporations_name_idx" ON "public"."corporations"("name");

-- CreateIndex
CREATE INDEX "corporations_ticker_idx" ON "public"."corporations"("ticker");

-- CreateIndex
CREATE INDEX "corporations_alliance_id_idx" ON "public"."corporations"("alliance_id");

-- CreateIndex
CREATE INDEX "corporations_faction_id_idx" ON "public"."corporations"("faction_id");

-- CreateIndex
CREATE INDEX "corporations_ceo_id_idx" ON "public"."corporations"("ceo_id");

-- CreateIndex
CREATE INDEX "corporations_creator_id_idx" ON "public"."corporations"("creator_id");

-- CreateIndex
CREATE INDEX "corporations_deleted_idx" ON "public"."corporations"("deleted");

-- CreateIndex
CREATE INDEX "corporations_createdAt_idx" ON "public"."corporations"("createdAt");

-- CreateIndex
CREATE INDEX "corporations_updatedAt_idx" ON "public"."corporations"("updatedAt");

-- CreateIndex
CREATE INDEX "corporation_history_corporation_id_idx" ON "public"."corporation_history"("corporation_id");

-- CreateIndex
CREATE INDEX "corporation_history_alliance_id_idx" ON "public"."corporation_history"("alliance_id");

-- CreateIndex
CREATE INDEX "corporation_history_start_date_idx" ON "public"."corporation_history"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "battles_battle_id_key" ON "public"."battles"("battle_id");

-- CreateIndex
CREATE INDEX "battles_custom_idx" ON "public"."battles"("custom");

-- CreateIndex
CREATE INDEX "battles_start_time_idx" ON "public"."battles"("start_time");

-- CreateIndex
CREATE INDEX "battles_end_time_idx" ON "public"."battles"("end_time");

-- CreateIndex
CREATE INDEX "battles_start_time_end_time_idx" ON "public"."battles"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "battles_isk_destroyed_idx" ON "public"."battles"("isk_destroyed");

-- CreateIndex
CREATE INDEX "battles_killmails_count_idx" ON "public"."battles"("killmails_count");

-- CreateIndex
CREATE INDEX "battles_main_system_id_idx" ON "public"."battles"("main_system_id");

-- CreateIndex
CREATE INDEX "battles_main_region_id_idx" ON "public"."battles"("main_region_id");

-- CreateIndex
CREATE INDEX "battles_custom_start_time_idx" ON "public"."battles"("custom", "start_time");

-- CreateIndex
CREATE INDEX "battles_createdAt_idx" ON "public"."battles"("createdAt");

-- CreateIndex
CREATE INDEX "battles_updatedAt_idx" ON "public"."battles"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_campaign_id_key" ON "public"."campaigns"("campaign_id");

-- CreateIndex
CREATE INDEX "campaigns_name_idx" ON "public"."campaigns"("name");

-- CreateIndex
CREATE INDEX "campaigns_start_time_idx" ON "public"."campaigns"("start_time");

-- CreateIndex
CREATE INDEX "campaigns_end_time_idx" ON "public"."campaigns"("end_time");

-- CreateIndex
CREATE INDEX "campaigns_creator_id_idx" ON "public"."campaigns"("creator_id");

-- CreateIndex
CREATE INDEX "campaigns_public_idx" ON "public"."campaigns"("public");

-- CreateIndex
CREATE INDEX "character_achievement_character_id_idx" ON "public"."character_achievement"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_achievements_character_id_key" ON "public"."character_achievements"("character_id");

-- CreateIndex
CREATE INDEX "character_achievements_character_name_idx" ON "public"."character_achievements"("character_name");

-- CreateIndex
CREATE INDEX "character_achievements_total_points_idx" ON "public"."character_achievements"("total_points");

-- CreateIndex
CREATE INDEX "character_achievements_completed_achievements_idx" ON "public"."character_achievements"("completed_achievements");

-- CreateIndex
CREATE INDEX "character_achievements_last_calculated_idx" ON "public"."character_achievements"("last_calculated");

-- CreateIndex
CREATE INDEX "character_achievements_needs_processing_idx" ON "public"."character_achievements"("needs_processing");

-- CreateIndex
CREATE INDEX "historical_stats_alliance_id_idx" ON "public"."historical_stats"("alliance_id");

-- CreateIndex
CREATE INDEX "historical_stats_corporation_id_idx" ON "public"."historical_stats"("corporation_id");

-- CreateIndex
CREATE INDEX "historical_stats_date_idx" ON "public"."historical_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "wars_war_id_key" ON "public"."wars"("war_id");

-- CreateIndex
CREATE INDEX "wars_war_id_idx" ON "public"."wars"("war_id");

-- CreateIndex
CREATE INDEX "wars_declared_idx" ON "public"."wars"("declared");

-- CreateIndex
CREATE INDEX "wars_started_idx" ON "public"."wars"("started");

-- CreateIndex
CREATE INDEX "wars_finished_idx" ON "public"."wars"("finished");

-- CreateIndex
CREATE INDEX "wars_aggressor_corporation_id_idx" ON "public"."wars"("aggressor_corporation_id");

-- CreateIndex
CREATE INDEX "wars_aggressor_alliance_id_idx" ON "public"."wars"("aggressor_alliance_id");

-- CreateIndex
CREATE INDEX "wars_defender_corporation_id_idx" ON "public"."wars"("defender_corporation_id");

-- CreateIndex
CREATE INDEX "wars_defender_alliance_id_idx" ON "public"."wars"("defender_alliance_id");
