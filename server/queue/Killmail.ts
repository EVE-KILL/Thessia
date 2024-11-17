import { fetchESIKillmail } from '../helpers/ESIData';
import { createQueue } from '../helpers/Queue';
//import { parseKillmail } from '../helpers/KillmailParser';

const killmailQueue = createQueue('killmail');

async function addKillmail(killmailId: number, killmailHash: string) {
    await killmailQueue.add(
        'killmail',
        { killmailId, killmailHash },
        {
            priority: 10,
            attempts: 3,
            backoff: {
                type: 'exponential',
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

    //let processedKillmail = await parseKillmail(killmail);
    //let model = new Killmails(processedKillmail);
    //await model.save();
}

export { addKillmail, processKillmail, fetchESIKillmail };
