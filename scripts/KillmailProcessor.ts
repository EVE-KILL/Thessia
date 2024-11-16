import type { Job } from 'bullmq';
import { createWorker } from '../server/helpers/Queue';

const worker = createWorker('killmail', (job: Job) => {
    console.log(`Processing killmail ${job.data.killmailId} - ${job.data.killmailHash}`);
});
