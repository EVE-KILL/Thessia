-- CreateTable
CREATE TABLE "public"."killmails" (
    "id" SERIAL NOT NULL,
    "killmail_id" INTEGER NOT NULL,
    "killmail_hash" TEXT NOT NULL,
    "killmail_time" TIMESTAMP(3) NOT NULL,
    "solar_system_id" INTEGER NOT NULL,
    "constellation_id" INTEGER,
    "region_id" INTEGER,
    "total_value" DECIMAL(20,2),
    "fitting_value" DECIMAL(20,2),
    "ship_value" DECIMAL(20,2),
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "delayed_until" TIMESTAMP(3),
    "processing_error" TEXT,
    "is_npc" BOOLEAN NOT NULL DEFAULT false,
    "is_solo" BOOLEAN NOT NULL DEFAULT false,
    "war_id" INTEGER,
    "dna" TEXT,
    "near" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "killmails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."killmail_victims" (
    "id" SERIAL NOT NULL,
    "killmail_id" INTEGER NOT NULL,
    "character_id" INTEGER,
    "corporation_id" INTEGER,
    "alliance_id" INTEGER,
    "faction_id" INTEGER,
    "ship_type_id" INTEGER NOT NULL,
    "ship_group_id" INTEGER,
    "damage_taken" INTEGER NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "z" DOUBLE PRECISION,

    CONSTRAINT "killmail_victims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."killmail_attackers" (
    "id" SERIAL NOT NULL,
    "killmail_id" INTEGER NOT NULL,
    "character_id" INTEGER,
    "corporation_id" INTEGER,
    "alliance_id" INTEGER,
    "faction_id" INTEGER,
    "ship_type_id" INTEGER,
    "ship_group_id" INTEGER,
    "weapon_type_id" INTEGER,
    "damage_done" INTEGER NOT NULL,
    "final_blow" BOOLEAN NOT NULL DEFAULT false,
    "security_status" DOUBLE PRECISION,

    CONSTRAINT "killmail_attackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."killmail_items" (
    "id" SERIAL NOT NULL,
    "killmail_id" INTEGER NOT NULL,
    "parent_item_id" INTEGER,
    "item_type_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "category_id" INTEGER,
    "flag" INTEGER NOT NULL,
    "singleton" INTEGER NOT NULL,
    "quantity_destroyed" INTEGER NOT NULL DEFAULT 0,
    "quantity_dropped" INTEGER NOT NULL DEFAULT 0,
    "value" DECIMAL(15,2),

    CONSTRAINT "killmail_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "killmails_killmail_id_key" ON "public"."killmails"("killmail_id");

-- CreateIndex
CREATE INDEX "killmails_killmail_time_idx" ON "public"."killmails"("killmail_time");

-- CreateIndex
CREATE INDEX "killmails_processed_idx" ON "public"."killmails"("processed");

-- CreateIndex
CREATE INDEX "killmails_solar_system_id_killmail_time_idx" ON "public"."killmails"("solar_system_id", "killmail_time");

-- CreateIndex
CREATE INDEX "killmails_region_id_killmail_time_idx" ON "public"."killmails"("region_id", "killmail_time");

-- CreateIndex
CREATE INDEX "killmails_constellation_id_killmail_time_idx" ON "public"."killmails"("constellation_id", "killmail_time");

-- CreateIndex
CREATE INDEX "killmails_is_npc_killmail_time_idx" ON "public"."killmails"("is_npc", "killmail_time");

-- CreateIndex
CREATE INDEX "killmails_is_solo_killmail_time_idx" ON "public"."killmails"("is_solo", "killmail_time");

-- CreateIndex
CREATE INDEX "killmails_total_value_killmail_time_idx" ON "public"."killmails"("total_value", "killmail_time");

-- CreateIndex
CREATE INDEX "killmails_war_id_killmail_time_idx" ON "public"."killmails"("war_id", "killmail_time");

-- CreateIndex
CREATE INDEX "killmails_delayed_until_processed_idx" ON "public"."killmails"("delayed_until", "processed");

-- CreateIndex
CREATE UNIQUE INDEX "killmail_victims_killmail_id_key" ON "public"."killmail_victims"("killmail_id");

-- CreateIndex
CREATE INDEX "killmail_victims_character_id_idx" ON "public"."killmail_victims"("character_id");

-- CreateIndex
CREATE INDEX "killmail_victims_corporation_id_idx" ON "public"."killmail_victims"("corporation_id");

-- CreateIndex
CREATE INDEX "killmail_victims_alliance_id_idx" ON "public"."killmail_victims"("alliance_id");

-- CreateIndex
CREATE INDEX "killmail_victims_faction_id_idx" ON "public"."killmail_victims"("faction_id");

-- CreateIndex
CREATE INDEX "killmail_victims_ship_type_id_idx" ON "public"."killmail_victims"("ship_type_id");

-- CreateIndex
CREATE INDEX "killmail_victims_ship_group_id_idx" ON "public"."killmail_victims"("ship_group_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_killmail_id_idx" ON "public"."killmail_attackers"("killmail_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_character_id_idx" ON "public"."killmail_attackers"("character_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_corporation_id_idx" ON "public"."killmail_attackers"("corporation_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_alliance_id_idx" ON "public"."killmail_attackers"("alliance_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_faction_id_idx" ON "public"."killmail_attackers"("faction_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_ship_type_id_idx" ON "public"."killmail_attackers"("ship_type_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_ship_group_id_idx" ON "public"."killmail_attackers"("ship_group_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_weapon_type_id_idx" ON "public"."killmail_attackers"("weapon_type_id");

-- CreateIndex
CREATE INDEX "killmail_attackers_final_blow_idx" ON "public"."killmail_attackers"("final_blow");

-- CreateIndex
CREATE INDEX "killmail_attackers_damage_done_idx" ON "public"."killmail_attackers"("damage_done");

-- CreateIndex
CREATE INDEX "killmail_items_killmail_id_idx" ON "public"."killmail_items"("killmail_id");

-- CreateIndex
CREATE INDEX "killmail_items_item_type_id_idx" ON "public"."killmail_items"("item_type_id");

-- CreateIndex
CREATE INDEX "killmail_items_group_id_idx" ON "public"."killmail_items"("group_id");

-- CreateIndex
CREATE INDEX "killmail_items_category_id_idx" ON "public"."killmail_items"("category_id");

-- CreateIndex
CREATE INDEX "killmail_items_parent_item_id_idx" ON "public"."killmail_items"("parent_item_id");

-- CreateIndex
CREATE INDEX "killmail_items_flag_idx" ON "public"."killmail_items"("flag");
