import { fetchESIKillmail } from '../helpers/ESIData';
import { parseKillmail } from '../helpers/KillmailParser';
import { createQueue } from '../helpers/Queue';

const killmailQueue = createQueue('killmail');

async function addKillmail(killmailId: number, killmailHash: string, priority: number = 1) {
    await killmailQueue.add(
        'killmail',
        { killmailId: killmailId, killmailHash: killmailHash },
        {
            priority: priority,
            attempts: 10,
            backoff: {
                type: 'fixed',
                delay: 10000
            },
            removeOnComplete: true,
        }
    );
}

async function processKillmail(killmailId: number, killmailHash: string) {
    let killmail = await fetchESIKillmail(killmailId, killmailHash);

    if (killmail.error || !killmail.victim) {
        throw new Error(`Error fetching killmail: ${killmail.error}`);
    }

    let processedKillmail = await parseKillmail(killmail);
    let model = new Killmails(processedKillmail);
    try {
        await model.save();
    } catch (error) {
        Killmails.updateOne({ killmail_id: killmailId }, processedKillmail);
    }
}

export { addKillmail, processKillmail, fetchESIKillmail };
