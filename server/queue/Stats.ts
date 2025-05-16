import { createQueue } from '~/server/helpers/Queue';
import { calculateAllStats } from '~/server/helpers/Stats';
import { IStatsDocument, StatsType } from '~/server/interfaces/IStats';
import { Stats } from '~/server/models/Stats';

const statsQueue = createQueue('stats');

async function addStatsJob(entityType: StatsType, entityId: number, days: number, priority = 1) {
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
): Promise<IStatsDocument> {
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
