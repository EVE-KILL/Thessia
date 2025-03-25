import { getAlliance } from "~/server/helpers/ESIData";
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
    },
  );
}

async function updateAlliance(allianceId: number) {
  await getAlliance(allianceId, true);
}

export { queueUpdateAlliance, updateAlliance };
