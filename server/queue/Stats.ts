import { createQueue } from '~/server/helpers/Queue';
import { calculateAllStats } from '~/server/helpers/Stats';
import { IStatsDocument, StatsType } from '~/server/interfaces/IStats';
import { Stats } from '~/server/models/Stats';
import { cliLogger } from "~/server/helpers/Logger";

const statsQueue = createQueue('stats');

/**
 * Validates that entity type and ID are valid before adding to the queue
 */
function validateStatsEntity(entityType: StatsType | undefined, entityId: number | undefined): boolean {
    const validTypes = ['character_id', 'corporation_id', 'alliance_id'];
    
    // Check type validity
    if (!entityType || !validTypes.includes(entityType)) {
        cliLogger.warn(`Stats queue: Skipping invalid entity type: ${entityType}`);
        return false;
    }
    
    // Check ID validity
    if (entityId === undefined || entityId === null || isNaN(entityId) || entityId <= 0) {
        cliLogger.warn(`Stats queue: Skipping invalid entity ID: ${entityId} for type ${entityType}`);
        return false;
    }
    
    return true;
}

async function addStatsJob(entityType: StatsType, entityId: number, days: number, priority = 1) {
    // Validate before adding to queue
    if (!validateStatsEntity(entityType, entityId)) {
        cliLogger.info(`Stats queue: Discarded invalid stats job (type: ${entityType}, id: ${entityId})`);
        return; // Skip adding to queue
    }

    await statsQueue.add(
        'stats',
        { entityType, entityId, days },
        {
            priority: priority,
            attempts: 10,
            backoff: {
                type: "fixed",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        }
    )
}

async function processStats(
    entityType: StatsType,
    entityId: number,
    days: number
): Promise<IStatsDocument | null> {
    // Validate before processing
    if (!validateStatsEntity(entityType, entityId)) {
        cliLogger.info(`Stats processor: Discarded invalid stats calculation (type: ${entityType}, id: ${entityId})`);
        return null; // Return null to indicate no processing was done
    }

    const stats = await calculateAllStats(entityType, entityId, days);
    const model = new Stats(stats);

    try {
        await model.save();
    } catch (error) {
        await Stats.updateOne({ type: entityType, id: entityId, days }, stats);
    } finally {
        await Stats.updateOne(
            { type: entityType, id: entityId, days },
            { $set: { updatedAt: new Date() } },
            { upsert: true }
        );
    }

    return stats;
}

export { addStatsJob, processStats };
