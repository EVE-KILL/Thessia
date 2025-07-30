import {
    getCorporation,
    getCorporationHistory,
} from "~/server/helpers/ESIData";
import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";

const corporationQueue = createQueue("corporation");
const corporationHistoryQueue = createQueue("corporationhistory");

async function queueUpdateCorporation(corporationId: number, priority = 1) {
    await corporationQueue.add(
        "corporation",
        { corporationId: corporationId },
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
 * Bulk add multiple corporation update jobs to the queue for improved performance
 */
async function queueBulkUpdateCorporations(
    corporations: Array<{ corporationId: number; priority?: number }>
) {
    if (corporations.length === 0) {
        cliLogger.info("Corporation queue: No corporations to add in bulk");
        return;
    }

    // Convert to BullMQ job format
    const bulkJobs = corporations.map((corporation) => ({
        name: "corporation",
        data: {
            corporationId: corporation.corporationId,
        },
        opts: {
            priority: corporation.priority || 1,
            attempts: 10,
            backoff: {
                type: "fixed" as const,
                delay: 5000, // 5 seconds
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        },
    }));

    await corporationQueue.addBulk(bulkJobs);
    cliLogger.info(
        `Corporation queue: Added ${corporations.length} corporation jobs in bulk`
    );
}

async function queueUpdateCorporationHistory(
    corporationId: number,
    priority = 1
) {
    await corporationHistoryQueue.add(
        "corporationhistory",
        { corporationId: corporationId },
        {
            priority: priority,
            attempts: 10,
            backoff: {
                type: "fixed",
                delay: 5000, // 5 seconds
            },
            removeOnComplete: true,
        }
    );
}

async function updateCorporation(corporationId: number) {
    await getCorporation(corporationId, true);
}

async function updateCorporationHistory(corporationId: number) {
    await getCorporationHistory(corporationId);
}

export {
    queueBulkUpdateCorporations,
    queueUpdateCorporation,
    queueUpdateCorporationHistory,
    updateCorporation,
    updateCorporationHistory,
};
