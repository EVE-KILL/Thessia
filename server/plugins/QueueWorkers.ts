// import type { Job } from 'bullmq';
// import { createWorker } from '../helpers/Queue';
// import { processKillmail } from '../queue/Killmail';

export default defineNitroPlugin((nitroApp) => {
    // console.log('✔ Starting queue workers');

    // const killmailQueue = createWorker('killmail', async (job: Job) => {
    //     await processKillmail(job.data.killmailId, job.data.killmailHash);
    // }, {
    //     concurrency: 1
    // }).on('completed', (job: Job) => {
    //     console.log(`Completed job ${job.id}`);
    // }).on('failed', (job: Job, err: Error) => {
    //     console.log(`Job ${job.id} failed with error: ${err.message}`);
    // });
});
