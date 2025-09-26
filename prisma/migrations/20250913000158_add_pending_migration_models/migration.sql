-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'moderator', 'admin');

-- CreateTable
CREATE TABLE "public"."stats" (
    "id" SERIAL NOT NULL,
    "alliance_id" INTEGER,
    "corporation_id" INTEGER,
    "character_id" INTEGER,
    "type" TEXT NOT NULL,
    "kills_total" INTEGER NOT NULL DEFAULT 0,
    "losses_total" INTEGER NOT NULL DEFAULT 0,
    "isk_destroyed" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "isk_lost" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "efficiency" DOUBLE PRECISION,
    "most_used_ships" JSONB,
    "most_lost_ships" JSONB,
    "most_valuable_kills" JSONB,
    "most_valuable_ships" JSONB,
    "most_valuable_structures" JSONB,
    "top_attackers" JSONB,
    "top_victims" JSONB,
    "activity_by_hour" JSONB,
    "activity_by_day" JSONB,
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_prices" (
    "id" SERIAL NOT NULL,
    "type_id" INTEGER NOT NULL,
    "price" DECIMAL(20,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prices" (
    "id" SERIAL NOT NULL,
    "type_id" INTEGER NOT NULL,
    "average" DECIMAL(20,2),
    "highest" DECIMAL(20,2),
    "lowest" DECIMAL(20,2),
    "region_id" INTEGER NOT NULL,
    "order_count" INTEGER,
    "volume" BIGINT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "kill_identifier" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "character_id" INTEGER NOT NULL,
    "character_name" TEXT NOT NULL,
    "corporation_id" INTEGER NOT NULL,
    "corporation_name" TEXT NOT NULL,
    "alliance_id" INTEGER,
    "alliance_name" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "report_messages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "access_token" TEXT NOT NULL,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "character_id" INTEGER NOT NULL,
    "character_name" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "token_type" TEXT NOT NULL,
    "character_owner_hash" TEXT NOT NULL,
    "unique_identifier" TEXT NOT NULL,
    "last_checked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "can_fetch_corporation_killmails" BOOLEAN NOT NULL DEFAULT true,
    "esi_active" BOOLEAN NOT NULL DEFAULT true,
    "role" "public"."UserRole" NOT NULL DEFAULT 'user',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" SERIAL NOT NULL,
    "key_id" INTEGER NOT NULL,
    "v_code" TEXT NOT NULL,
    "character_id" INTEGER,
    "expires" TIMESTAMP(3),
    "access_mask" BIGINT,
    "type" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sovereignty" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER NOT NULL,
    "alliance_id" INTEGER,
    "corporation_id" INTEGER,
    "faction_id" INTEGER,
    "contested" TEXT,
    "vulnerability_occupancy_level" DOUBLE PRECISION,
    "vulnerable_start_time" TIMESTAMP(3),
    "vulnerable_end_time" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sovereignty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dscans" (
    "id" SERIAL NOT NULL,
    "scan_id" TEXT NOT NULL,
    "character_id" INTEGER,
    "system_id" INTEGER,
    "scan_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dscans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."local_scans" (
    "id" SERIAL NOT NULL,
    "scan_id" TEXT NOT NULL,
    "character_id" INTEGER,
    "system_id" INTEGER,
    "scan_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."saved_queries" (
    "id" SERIAL NOT NULL,
    "query_id" TEXT NOT NULL,
    "user_id" INTEGER,
    "character_id" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "query_data" JSONB NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_domains" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "character_id" INTEGER,
    "alliance_id" INTEGER,
    "corporation_id" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT false,
    "redirect_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stats_alliance_id_key" ON "public"."stats"("alliance_id");

-- CreateIndex
CREATE UNIQUE INDEX "stats_corporation_id_key" ON "public"."stats"("corporation_id");

-- CreateIndex
CREATE UNIQUE INDEX "stats_character_id_key" ON "public"."stats"("character_id");

-- CreateIndex
CREATE INDEX "stats_type_idx" ON "public"."stats"("type");

-- CreateIndex
CREATE INDEX "stats_alliance_id_idx" ON "public"."stats"("alliance_id");

-- CreateIndex
CREATE INDEX "stats_corporation_id_idx" ON "public"."stats"("corporation_id");

-- CreateIndex
CREATE INDEX "stats_character_id_idx" ON "public"."stats"("character_id");

-- CreateIndex
CREATE INDEX "stats_last_calculated_idx" ON "public"."stats"("last_calculated");

-- CreateIndex
CREATE INDEX "custom_prices_type_id_idx" ON "public"."custom_prices"("type_id");

-- CreateIndex
CREATE INDEX "custom_prices_date_idx" ON "public"."custom_prices"("date");

-- CreateIndex
CREATE UNIQUE INDEX "custom_prices_type_id_date_key" ON "public"."custom_prices"("type_id", "date");

-- CreateIndex
CREATE INDEX "prices_type_id_idx" ON "public"."prices"("type_id");

-- CreateIndex
CREATE INDEX "prices_region_id_idx" ON "public"."prices"("region_id");

-- CreateIndex
CREATE INDEX "prices_date_idx" ON "public"."prices"("date");

-- CreateIndex
CREATE UNIQUE INDEX "prices_type_id_region_id_date_key" ON "public"."prices"("type_id", "region_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "comments_identifier_key" ON "public"."comments"("identifier");

-- CreateIndex
CREATE INDEX "comments_kill_identifier_idx" ON "public"."comments"("kill_identifier");

-- CreateIndex
CREATE INDEX "comments_character_id_idx" ON "public"."comments"("character_id");

-- CreateIndex
CREATE INDEX "comments_deleted_idx" ON "public"."comments"("deleted");

-- CreateIndex
CREATE INDEX "comments_reported_idx" ON "public"."comments"("reported");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "public"."comments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_character_id_key" ON "public"."users"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_unique_identifier_key" ON "public"."users"("unique_identifier");

-- CreateIndex
CREATE INDEX "users_character_id_idx" ON "public"."users"("character_id");

-- CreateIndex
CREATE INDEX "users_character_name_idx" ON "public"."users"("character_name");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_last_checked_idx" ON "public"."users"("last_checked");

-- CreateIndex
CREATE INDEX "users_esi_active_idx" ON "public"."users"("esi_active");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_id_key" ON "public"."api_keys"("key_id");

-- CreateIndex
CREATE INDEX "api_keys_character_id_idx" ON "public"."api_keys"("character_id");

-- CreateIndex
CREATE INDEX "api_keys_active_idx" ON "public"."api_keys"("active");

-- CreateIndex
CREATE INDEX "api_keys_type_idx" ON "public"."api_keys"("type");

-- CreateIndex
CREATE UNIQUE INDEX "config_key_key" ON "public"."config"("key");

-- CreateIndex
CREATE INDEX "config_key_idx" ON "public"."config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "sovereignty_system_id_key" ON "public"."sovereignty"("system_id");

-- CreateIndex
CREATE INDEX "sovereignty_alliance_id_idx" ON "public"."sovereignty"("alliance_id");

-- CreateIndex
CREATE INDEX "sovereignty_corporation_id_idx" ON "public"."sovereignty"("corporation_id");

-- CreateIndex
CREATE INDEX "sovereignty_faction_id_idx" ON "public"."sovereignty"("faction_id");

-- CreateIndex
CREATE INDEX "sovereignty_contested_idx" ON "public"."sovereignty"("contested");

-- CreateIndex
CREATE UNIQUE INDEX "dscans_scan_id_key" ON "public"."dscans"("scan_id");

-- CreateIndex
CREATE INDEX "dscans_character_id_idx" ON "public"."dscans"("character_id");

-- CreateIndex
CREATE INDEX "dscans_system_id_idx" ON "public"."dscans"("system_id");

-- CreateIndex
CREATE INDEX "dscans_expires_at_idx" ON "public"."dscans"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "local_scans_scan_id_key" ON "public"."local_scans"("scan_id");

-- CreateIndex
CREATE INDEX "local_scans_character_id_idx" ON "public"."local_scans"("character_id");

-- CreateIndex
CREATE INDEX "local_scans_system_id_idx" ON "public"."local_scans"("system_id");

-- CreateIndex
CREATE INDEX "local_scans_expires_at_idx" ON "public"."local_scans"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_queries_query_id_key" ON "public"."saved_queries"("query_id");

-- CreateIndex
CREATE INDEX "saved_queries_user_id_idx" ON "public"."saved_queries"("user_id");

-- CreateIndex
CREATE INDEX "saved_queries_character_id_idx" ON "public"."saved_queries"("character_id");

-- CreateIndex
CREATE INDEX "saved_queries_public_idx" ON "public"."saved_queries"("public");

-- CreateIndex
CREATE INDEX "saved_queries_name_idx" ON "public"."saved_queries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "public"."custom_domains"("domain");

-- CreateIndex
CREATE INDEX "custom_domains_character_id_idx" ON "public"."custom_domains"("character_id");

-- CreateIndex
CREATE INDEX "custom_domains_alliance_id_idx" ON "public"."custom_domains"("alliance_id");

-- CreateIndex
CREATE INDEX "custom_domains_corporation_id_idx" ON "public"."custom_domains"("corporation_id");

-- CreateIndex
CREATE INDEX "custom_domains_verified_idx" ON "public"."custom_domains"("verified");
