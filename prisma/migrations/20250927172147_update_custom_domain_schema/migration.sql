-- AlterTable
ALTER TABLE "public"."custom_domains" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "configuration" JSONB,
ADD COLUMN     "dashboard_template" JSONB,
ADD COLUMN     "entities" JSONB,
ADD COLUMN     "navigation" JSONB,
ADD COLUMN     "owner_character_id" INTEGER;
