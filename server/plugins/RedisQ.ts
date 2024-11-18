import { addKillmail } from '../queue/Killmail';

export default defineNitroPlugin((nitroApp) => {
    const queueUrl = 'https://redisq.zkillboard.com/listen.php?queueID=evekill_nitro';
    const pollRedisQ = async () => {
        try {
            const response = await fetch(queueUrl, {
                headers: { 'User-Agent': 'EVE-KILL' }
            });
            const data = await response.json();
            if (data?.package) {
                const killmailId = data.package.killID;
                const killmailHash = data.package.zkb.hash;

                //console.log('ℹ️  New killmail:', killmailId, '-', killmailHash);
                await addKillmail(killmailId, killmailHash);
            }
        } catch (error) {
            console.error('Error fetching killmails:', error);
        } finally {
            setTimeout(pollRedisQ, 500);
        }
    };

    console.log('✔ Starting RedisQ listener');
    pollRedisQ();
});
