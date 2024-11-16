import { addKillmail } from '../server/queue/Killmail';

const queueUrl = 'https://redisq.zkillboard.com/listen.php?queueID=evekill_js';
const queueName = 'killmails';

async function startListener() {
    console.log('Starting redisQ listener');
    while(true) {
        const response = await fetch(queueUrl, {
            headers: { 'User-Agent': 'EVE-KILL' }
        });
        const data = await response.json();

        if (data?.package) {
            const killmailId = data.package.killID;
            const killmailHash = data.package.zkb.hash;

            console.log(`New killmail: ${killmailId} - ${killmailHash}`);
            await addKillmail(killmailId, killmailHash);
        }
    }
}

startListener();
