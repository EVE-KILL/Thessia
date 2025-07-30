import { getAlliance } from "~/server/helpers/ESIData";
import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";

const allianceQueue = createQueue("alliance");

async function queueUpdateAlliance(allianceId: number, priority = 1) {
    await allianceQueue.add(
        "alliance",
        { allianceId: allianceId },
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
    );
}

/**
 * Bulk add multiple alliance update jobs to the queue for improved performance
 */
async function queueBulkUpdateAlliances(
    alliances: Array<{ allianceId: number; priority?: number }>
) {
    if (alliances.length === 0) {
        cliLogger.info("Alliance queue: No alliances to add in bulk");
        return;
    }

    // Convert to BullMQ job format
    const bulkJobs = alliances.map((alliance) => ({
        name: "alliance",
        data: {
            allianceId: alliance.allianceId,
        },
        opts: {
            priority: alliance.priority || 1,
            attempts: 10,
            backoff: {
                type: "fixed" as const,
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        },
    }));

    await allianceQueue.addBulk(bulkJobs);
}

async function updateAlliance(allianceId: number) {
    await getAlliance(allianceId, true);
}

export { queueBulkUpdateAlliances, queueUpdateAlliance, updateAlliance };
