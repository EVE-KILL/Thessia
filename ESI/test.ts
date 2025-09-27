import { cliLogger } from "../server/helpers/Logger";
import { initMongooseConnection } from "../server/helpers/Mongoose";
import { getCharacterService } from "./services/character";

// Get the character service instance
const characterService = getCharacterService();
let mongooseConnected = false;

async function ensureMongooseConnection() {
    if (!mongooseConnected) {
        try {
            await initMongooseConnection();
            mongooseConnected = true;
        } catch (error) {
            console.error("Failed to connect to MongoDB:", error);
            throw error;
        }
    }
    return mongooseConnected;
}

/**
 * Example usage of the new ESI infrastructure
 */
async function testNewEsiInfrastructure() {
    try {
        // Test character lookup - uses your character ID from the original issue
        const characterId = 90450303; // Replace with a real character ID

        cliLogger.info(`Testing character lookup for ${characterId}`);

        // First call - will fetch from ESI and cache
        const start1 = Date.now();
        const character1 = await characterService.getCharacter(characterId);
        const time1 = Date.now() - start1;

        cliLogger.info(`First call took ${time1}ms`);
        cliLogger.info(`Character: ${character1.name}`);
        cliLogger.info(`Corporation: ${character1.corporation_id}`);
        cliLogger.info(
            `Alliance: ${character1.alliance_id} (${character1.alliance_name})`
        );

        // Second call - should return from database cache
        const start2 = Date.now();
        const character2 = await characterService.getCharacter(characterId);
        const time2 = Date.now() - start2;

        cliLogger.info(`Second call took ${time2}ms (should be much faster)`);

        // Force refresh with 1 hour cache
        const start3 = Date.now();
        const character3 = await characterService.getCharacter(characterId, 1);
        const time3 = Date.now() - start3;

        cliLogger.info(`Force refresh took ${time3}ms`);

        // Test character history
        const history = await characterService.getCharacterHistory(characterId);
        cliLogger.info(
            `Character has ${history.length} corporation history entries`
        );
    } catch (error) {
        cliLogger.error(
            `Test failed: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}

/**
 * Performance comparison test
 */
async function comparePerformance() {
    // This would require importing the old ESIData for comparison
    // but shows the concept of what we could test

    const testCharacters = [90450303, 268946627, 96417025]; // Replace with real IDs

    cliLogger.info("Performance comparison test");

    for (const characterId of testCharacters) {
        const start = Date.now();
        try {
            const character = await characterService.getCharacter(characterId);
            const end = Date.now();
            cliLogger.info(
                `Character ${characterId} (${character.name}): ${end - start}ms`
            );
        } catch (error) {
            cliLogger.error(
                `Failed to fetch character ${characterId}: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }
}

await ensureMongooseConnection();
await testNewEsiInfrastructure();
await comparePerformance();

// Export test functions for use in console commands
export { comparePerformance, testNewEsiInfrastructure };
