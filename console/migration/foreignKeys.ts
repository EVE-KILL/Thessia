import prisma from "../../lib/prisma";
import { cliLogger } from "../../server/helpers/Logger";

export async function disableForeignKeyChecks() {
    cliLogger.info("Disabling foreign key checks...");
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;
    cliLogger.info("Foreign key checks disabled.");
}

export async function enableForeignKeyChecks() {
    cliLogger.info("Enabling foreign key checks...");
    await prisma.$executeRaw`SET session_replication_role = 'origin';`;
    cliLogger.info("Foreign key checks enabled.");
}
