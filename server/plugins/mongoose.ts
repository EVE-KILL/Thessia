import { cliLogger } from "~/server/helpers/Logger";
import { initMongooseConnection } from "~/server/helpers/Mongoose";
import { setupAlliancesSharding } from "~/server/models/Alliances";
import { setupCharactersSharding } from "~/server/models/Characters";
import { setupCorporationsSharding } from "~/server/models/Corporations";
import { setupHistoricalStatsSharding } from "~/server/models/HistoricalStats";
import { setupKillmailsSharding } from "~/server/models/Killmails";
import { setupKillmailsESISharding } from "~/server/models/KillmailsESI";
import { setupPricesSharding } from "~/server/models/Prices";
import { setupStatsSharding } from "~/server/models/Stats";
import { setupWarsSharding } from "~/server/models/Wars";

export default defineNitroPlugin(async () => {
    try {
        const connection = await initMongooseConnection();
        cliLogger.info("✔ Connected to MongoDB");

        // Initialize sharding for all collections
        const collections = [
            { name: "Killmails", setup: setupKillmailsSharding },
            { name: "Stats", setup: setupStatsSharding },
            { name: "HistoricalStats", setup: setupHistoricalStatsSharding },
            { name: "Prices", setup: setupPricesSharding },
            { name: "Wars", setup: setupWarsSharding },
            { name: "KillmailsESI", setup: setupKillmailsESISharding },
            { name: "Corporations", setup: setupCorporationsSharding },
            { name: "Characters", setup: setupCharactersSharding },
            { name: "Alliances", setup: setupAlliancesSharding }
        ];

        for (const collection of collections) {
            const result = await collection.setup();
            if (result) {
                cliLogger.info(`✔ ${collection.name} collection sharding configured`);
            }
        }
    } catch (error) {
        cliLogger.error(`MongoDB initialization error: ${error}`);
    }
});
