import { getCorporation, getCorporationHistory } from "../helpers/ESIData";
import { cliLogger } from "../helpers/Logger";
import { createQueue } from "../helpers/Queue";
import { Alliances } from "../models/Alliances";
import { queueUpdateAlliance } from "../queue/Alliance";

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
    const corporationData = await getCorporation(corporationId, true);

    // Check if the alliance exists, if not queue it for update
    if (corporationData.alliance_id && corporationData.alliance_id > 0) {
        try {
            const alliance = await Alliances.findOne({
                alliance_id: corporationData.alliance_id,
            });

            if (!alliance) {
                await queueUpdateAlliance(corporationData.alliance_id, 2); // Higher priority
                cliLogger.info(
                    `Queued alliance ${corporationData.alliance_id} for corporation ${corporationId}`
                );
            }
        } catch (error) {
            cliLogger.error(
                `Error checking/queuing alliance for corporation ${corporationId}: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }
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
