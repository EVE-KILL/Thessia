import { getCorporation, getCorporationHistory } from "../helpers/ESIData";
import { createQueue } from "../helpers/Queue";

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
    },
  );
}

async function queueUpdateCorporationHistory(corporationId: number, priority = 1) {
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
    },
  );
}

async function updateCorporation(corporationId: number) {
  await getCorporation(corporationId, true);
}

async function updateCorporationHistory(corporationId: number) {
  await getCorporationHistory(corporationId);
}

export {
  queueUpdateCorporation,
  queueUpdateCorporationHistory,
  updateCorporation,
  updateCorporationHistory,
};
