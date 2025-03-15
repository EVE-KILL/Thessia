import { addKillmail } from "../server/queue/Killmail";

export default {
  name: "redisq",
  description: "Listen to zKillboards redisQ and import killmails from it",
  longRunning: true,
  run: async () => {
    const queueUrl = `https://redisq.zkillboard.com/listen.php?queueID=${process.env.REDISQ_ID}`;
    const pollRedisQ = async () => {
      try {
        const response = await fetch(queueUrl, {
          headers: { "User-Agent": "EVE-KILL" },
        });
        const data = await response.json();
        if (data?.package) {
          const killmailId = data.package.killID;
          const killmailHash = data.package.zkb.hash;

          console.log("ℹ️  New killmail:", killmailId, "-", killmailHash);
          await addKillmail(killmailId, killmailHash, 0, 1);
        }
      } catch (error) {
        console.error("Error fetching killmails:", error);
      } finally {
        setTimeout(pollRedisQ, 500);
      }
    };

    console.log("✔ Starting RedisQ listener");
    pollRedisQ();
  },
};
