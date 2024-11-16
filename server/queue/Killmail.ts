import { createQueue } from '../helpers/Queue';

const killmailQueue = createQueue('killmail');

async function addKillmail(killmailId: number, killmailHash: string) {
    await killmailQueue.add('killmail', { killmailId, killmailHash });
}

export { addKillmail };
