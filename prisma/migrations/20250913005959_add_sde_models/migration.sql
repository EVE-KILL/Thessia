/*
  Warnings:

  - A unique constraint covering the columns `[faction_id]` on the table `factions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `faction_id` to the `factions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `factions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."factions" ADD COLUMN     "corporation_id" INTEGER,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "faction_id" INTEGER NOT NULL,
ADD COLUMN     "icon_id" INTEGER,
ADD COLUMN     "militia_corporation_id" INTEGER,
ADD COLUMN     "race_ids" TEXT,
ADD COLUMN     "size_factor" DOUBLE PRECISION,
ADD COLUMN     "solar_system_id" INTEGER,
ADD COLUMN     "station_count" INTEGER,
ADD COLUMN     "station_system_count" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."regions" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "region_name" TEXT NOT NULL,
    "description" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "z" DOUBLE PRECISION,
    "x_min" DOUBLE PRECISION,
    "x_max" DOUBLE PRECISION,
    "y_min" DOUBLE PRECISION,
    "y_max" DOUBLE PRECISION,
    "z_min" DOUBLE PRECISION,
    "z_max" DOUBLE PRECISION,
    "faction_id" INTEGER,
    "nebula" INTEGER,
    "wormhole_class_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."constellations" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "constellation_id" INTEGER NOT NULL,
    "constellation_name" TEXT NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "z" DOUBLE PRECISION,
    "x_min" DOUBLE PRECISION,
    "x_max" DOUBLE PRECISION,
    "y_min" DOUBLE PRECISION,
    "y_max" DOUBLE PRECISION,
    "z_min" DOUBLE PRECISION,
    "z_max" DOUBLE PRECISION,
    "faction_id" INTEGER,
    "radius" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."solar_systems" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "constellation_id" INTEGER NOT NULL,
    "system_id" INTEGER NOT NULL,
    "system_name" TEXT NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "z" DOUBLE PRECISION,
    "x_min" DOUBLE PRECISION,
    "x_max" DOUBLE PRECISION,
    "y_min" DOUBLE PRECISION,
    "y_max" DOUBLE PRECISION,
    "z_min" DOUBLE PRECISION,
    "z_max" DOUBLE PRECISION,
    "luminosity" DOUBLE PRECISION,
    "border" BOOLEAN NOT NULL DEFAULT false,
    "fringe" BOOLEAN NOT NULL DEFAULT false,
    "corridor" BOOLEAN NOT NULL DEFAULT false,
    "hub" BOOLEAN NOT NULL DEFAULT false,
    "international" BOOLEAN NOT NULL DEFAULT false,
    "regional" BOOLEAN NOT NULL DEFAULT false,
    "is_constellation" BOOLEAN NOT NULL DEFAULT false,
    "security" DOUBLE PRECISION,
    "faction_id" INTEGER,
    "radius" DOUBLE PRECISION,
    "sun_type_id" INTEGER,
    "security_class" TEXT,
    "activity" JSONB,
    "kills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solar_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."celestials" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "constellation_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "orbit_id" INTEGER,
    "region_id" INTEGER NOT NULL,
    "region_name" TEXT NOT NULL,
    "solar_system_id" INTEGER NOT NULL,
    "solar_system_name" TEXT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "type_name" TEXT NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "z" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "celestials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inv_types" (
    "id" SERIAL NOT NULL,
    "type_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "category_id" INTEGER,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "mass" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "capacity" DOUBLE PRECISION,
    "portion_size" INTEGER,
    "packaged_volume" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "race_id" INTEGER,
    "faction_id" INTEGER,
    "base_price" DOUBLE PRECISION,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "market_group_id" INTEGER,
    "icon_id" INTEGER,
    "sound_id" INTEGER,
    "graphic_id" INTEGER,
    "masteries" JSONB,
    "meta_group_id" INTEGER,
    "sof_faction_name" TEXT,
    "traits" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inv_groups" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "group_name" TEXT NOT NULL,
    "icon_id" INTEGER,
    "use_base_price" BOOLEAN NOT NULL DEFAULT false,
    "anchored" BOOLEAN NOT NULL DEFAULT false,
    "anchorable" BOOLEAN NOT NULL DEFAULT false,
    "fittable_non_singleton" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inv_flags" (
    "id" SERIAL NOT NULL,
    "flag_id" INTEGER NOT NULL,
    "flag_name" TEXT NOT NULL,
    "flag_text" TEXT NOT NULL,
    "order_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."races" (
    "id" SERIAL NOT NULL,
    "race_id" INTEGER NOT NULL,
    "race_name" TEXT NOT NULL,
    "description" TEXT,
    "icon_id" INTEGER,
    "short_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bloodlines" (
    "id" SERIAL NOT NULL,
    "bloodline_id" INTEGER NOT NULL,
    "bloodline_name" TEXT NOT NULL,
    "race_id" INTEGER NOT NULL,
    "description" TEXT,
    "male_description" TEXT,
    "female_description" TEXT,
    "ship_type_id" INTEGER,
    "corporation_id" INTEGER,
    "perception" INTEGER,
    "willpower" INTEGER,
    "charisma" INTEGER,
    "memory" INTEGER,
    "intelligence" INTEGER,
    "icon_id" INTEGER,
    "short_description" TEXT,
    "short_male_description" TEXT,
    "short_female_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bloodlines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_region_id_key" ON "public"."regions"("region_id");

-- CreateIndex
CREATE INDEX "regions_region_id_idx" ON "public"."regions"("region_id");

-- CreateIndex
CREATE INDEX "regions_region_name_idx" ON "public"."regions"("region_name");

-- CreateIndex
CREATE INDEX "regions_faction_id_idx" ON "public"."regions"("faction_id");

-- CreateIndex
CREATE UNIQUE INDEX "constellations_constellation_id_key" ON "public"."constellations"("constellation_id");

-- CreateIndex
CREATE INDEX "constellations_region_id_idx" ON "public"."constellations"("region_id");

-- CreateIndex
CREATE INDEX "constellations_constellation_id_idx" ON "public"."constellations"("constellation_id");

-- CreateIndex
CREATE INDEX "constellations_constellation_name_idx" ON "public"."constellations"("constellation_name");

-- CreateIndex
CREATE INDEX "constellations_faction_id_idx" ON "public"."constellations"("faction_id");

-- CreateIndex
CREATE UNIQUE INDEX "solar_systems_system_id_key" ON "public"."solar_systems"("system_id");

-- CreateIndex
CREATE INDEX "solar_systems_region_id_idx" ON "public"."solar_systems"("region_id");

-- CreateIndex
CREATE INDEX "solar_systems_constellation_id_idx" ON "public"."solar_systems"("constellation_id");

-- CreateIndex
CREATE INDEX "solar_systems_system_id_idx" ON "public"."solar_systems"("system_id");

-- CreateIndex
CREATE INDEX "solar_systems_system_name_idx" ON "public"."solar_systems"("system_name");

-- CreateIndex
CREATE INDEX "solar_systems_security_idx" ON "public"."solar_systems"("security");

-- CreateIndex
CREATE INDEX "solar_systems_faction_id_idx" ON "public"."solar_systems"("faction_id");

-- CreateIndex
CREATE INDEX "solar_systems_sun_type_id_idx" ON "public"."solar_systems"("sun_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "celestials_item_id_key" ON "public"."celestials"("item_id");

-- CreateIndex
CREATE INDEX "celestials_item_id_idx" ON "public"."celestials"("item_id");

-- CreateIndex
CREATE INDEX "celestials_region_id_idx" ON "public"."celestials"("region_id");

-- CreateIndex
CREATE INDEX "celestials_constellation_id_idx" ON "public"."celestials"("constellation_id");

-- CreateIndex
CREATE INDEX "celestials_solar_system_id_idx" ON "public"."celestials"("solar_system_id");

-- CreateIndex
CREATE INDEX "celestials_type_id_idx" ON "public"."celestials"("type_id");

-- CreateIndex
CREATE INDEX "celestials_item_name_idx" ON "public"."celestials"("item_name");

-- CreateIndex
CREATE UNIQUE INDEX "inv_types_type_id_key" ON "public"."inv_types"("type_id");

-- CreateIndex
CREATE INDEX "inv_types_type_id_idx" ON "public"."inv_types"("type_id");

-- CreateIndex
CREATE INDEX "inv_types_group_id_idx" ON "public"."inv_types"("group_id");

-- CreateIndex
CREATE INDEX "inv_types_category_id_idx" ON "public"."inv_types"("category_id");

-- CreateIndex
CREATE INDEX "inv_types_race_id_idx" ON "public"."inv_types"("race_id");

-- CreateIndex
CREATE INDEX "inv_types_faction_id_idx" ON "public"."inv_types"("faction_id");

-- CreateIndex
CREATE INDEX "inv_types_published_idx" ON "public"."inv_types"("published");

-- CreateIndex
CREATE UNIQUE INDEX "inv_groups_group_id_key" ON "public"."inv_groups"("group_id");

-- CreateIndex
CREATE INDEX "inv_groups_group_id_idx" ON "public"."inv_groups"("group_id");

-- CreateIndex
CREATE INDEX "inv_groups_category_id_idx" ON "public"."inv_groups"("category_id");

-- CreateIndex
CREATE INDEX "inv_groups_group_name_idx" ON "public"."inv_groups"("group_name");

-- CreateIndex
CREATE INDEX "inv_groups_published_idx" ON "public"."inv_groups"("published");

-- CreateIndex
CREATE UNIQUE INDEX "inv_flags_flag_id_key" ON "public"."inv_flags"("flag_id");

-- CreateIndex
CREATE INDEX "inv_flags_flag_id_idx" ON "public"."inv_flags"("flag_id");

-- CreateIndex
CREATE INDEX "inv_flags_flag_name_idx" ON "public"."inv_flags"("flag_name");

-- CreateIndex
CREATE UNIQUE INDEX "races_race_id_key" ON "public"."races"("race_id");

-- CreateIndex
CREATE INDEX "races_race_id_idx" ON "public"."races"("race_id");

-- CreateIndex
CREATE INDEX "races_race_name_idx" ON "public"."races"("race_name");

-- CreateIndex
CREATE UNIQUE INDEX "bloodlines_bloodline_id_key" ON "public"."bloodlines"("bloodline_id");

-- CreateIndex
CREATE INDEX "bloodlines_bloodline_id_idx" ON "public"."bloodlines"("bloodline_id");

-- CreateIndex
CREATE INDEX "bloodlines_race_id_idx" ON "public"."bloodlines"("race_id");

-- CreateIndex
CREATE INDEX "bloodlines_bloodline_name_idx" ON "public"."bloodlines"("bloodline_name");

-- CreateIndex
CREATE UNIQUE INDEX "factions_faction_id_key" ON "public"."factions"("faction_id");

-- CreateIndex
CREATE INDEX "factions_faction_id_idx" ON "public"."factions"("faction_id");

-- CreateIndex
CREATE INDEX "factions_name_idx" ON "public"."factions"("name");
