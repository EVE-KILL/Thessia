import { cliLogger } from "../server/helpers/Logger";
import { Wars } from "../server/models/Wars";
import { queueBulkUpdateWars } from "../server/queue/War";

export default {
    name: "updateWars",
    description: "Update existing wars that aren't done",
    schedule: "0 0 * * *",
    run: async () => {
        const activeWars = await Wars.find({ finished: { $exists: false } });

        cliLogger.info(`ℹ️  Found ${activeWars.length} active wars`);

        // Prepare bulk jobs
        const warJobs = activeWars.map((war) => ({
            warId: war.war_id,
            priority: 1,
        }));

        // Bulk add all war jobs to the queue
        if (warJobs.length > 0) {
            await queueBulkUpdateWars(warJobs);
        }

        cliLogger.info(`ℹ️  Queued ${activeWars.length} wars for update`);
    },
};
