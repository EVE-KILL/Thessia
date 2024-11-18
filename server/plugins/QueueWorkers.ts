import type { Job } from 'bullmq';
import { createWorker } from '../helpers/Queue';
import { processKillmail } from '../queue/Killmail';

export default defineNitroPlugin((nitroApp) => {
    console.log('✔ Starting queue workers');

    const killmailQueue = createWorker('killmail', async (job: Job) => {
        await processKillmail(job.data.killmailId, job.data.killmailHash);
    }, {
        concurrency: 1
    }).on('failed', (job: Job | undefined, err: Error) => {
        console.log(`Killmail Parser: ${job?.id} (${job?.data.killmailId}) failed with error: ${err.message} | https://esi.evetech.net/latest/killmails/${job?.data.killmailId}/${job?.data.killmailHash}/`);
    });
});
