import { getWar } from "../helpers/ESIData";
import { createQueue } from "../helpers/Queue";

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
    },
  );
}

async function updateWar(warId: number) {
  return await getWar(warId);
}

export { queueUpdateWar, updateWar };
