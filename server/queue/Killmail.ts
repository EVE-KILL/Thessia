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
            attempts: 3,
            backoff: {
                type: 'fixed',
                delay: 5000
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

    // Insert the killmail into the esi killmails table
    let esiKillmail = new KillmailsESI(killmail);
    await esiKillmail.save();

    let processedKillmail = await parseKillmail(killmail);
    let model = new Killmails(processedKillmail);
    await model.save();
}

export { addKillmail, processKillmail, fetchESIKillmail };
