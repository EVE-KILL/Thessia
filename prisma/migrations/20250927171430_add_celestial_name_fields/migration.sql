/*
  Warnings:

  - Added the required column `item_name` to the `celestials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region_name` to the `celestials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `solar_system_name` to the `celestials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type_name` to the `celestials` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."celestials" ADD COLUMN     "item_name" TEXT NOT NULL,
ADD COLUMN     "region_name" TEXT NOT NULL,
ADD COLUMN     "solar_system_name" TEXT NOT NULL,
ADD COLUMN     "type_name" TEXT NOT NULL;
