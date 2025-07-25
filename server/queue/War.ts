import { getWar } from "~/server/helpers/ESIData";
import { createQueue } from "~/server/helpers/Queue";
import { cliLogger } from "~/server/helpers/Logger";

const warQueue = createQueue("war");

async function queueUpdateWar(warId: number, priority = 1) {
    await warQueue.add(
        "war",
        { warId: warId },
        {
            priority: priority,
            attempts: 10,
            backoff: {
                type: "fixed",
                delay: 5000, // 5 minutes
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        }
    );
}

/**
 * Bulk add multiple war update jobs to the queue for improved performance
 */
async function queueBulkUpdateWars(
    wars: Array<{ warId: number; priority?: number }>
) {
    if (wars.length === 0) {
        cliLogger.info("War queue: No wars to add in bulk");
        return;
    }

    // Convert to BullMQ job format
    const bulkJobs = wars.map((war) => ({
        name: "war",
        data: {
            warId: war.warId,
        },
        opts: {
            priority: war.priority || 1,
            attempts: 10,
            backoff: {
                type: "fixed" as const,
                delay: 5000, // 5 minutes
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        },
    }));

    await warQueue.addBulk(bulkJobs);
    cliLogger.info(`War queue: Added ${wars.length} war jobs in bulk`);
}

async function updateWar(warId: number) {
    return await getWar(warId);
}

export { queueUpdateWar, queueBulkUpdateWars, updateWar };
