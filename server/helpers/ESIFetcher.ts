// src/helpers/esiFetcher.ts
import { RedisStorage } from "../helpers/Storage";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize the singleton RedisStorage instance
const storage = RedisStorage.getInstance();
const redisClient = storage.getClient();

const ESI_RATE_LIMIT = Number(process.env.ESI_RATE_LIMIT) || 25; // requests per second

async function rateLimit(): Promise<void> {
  const key = "global_rate_limit_counter";
  const count = await redisClient.incr(key);

  // Set the key to expire after 1 second if it's the first increment
  if (count === 1) {
    await redisClient.expire(key, 1);
  }

  // If we've exceeded the limit, wait for the key to expire
  if (count > ESI_RATE_LIMIT) {
    await sleep(1000);
  }
}

async function esiFetcher(url: string, options?: RequestInit): Promise<any> {
  // Check if TQ is offline
  const tqOffline = (await storage.get("tqStatus")) === "offline";
  if (tqOffline) {
    console.warn("TQ is offline. Sleeping for 30 seconds...");
    await sleep(30000);
    throw new Error("TQ is offline, fetcher cannot proceed.");
  }

  // Check if fetcher is paused
  const fetcherPausedUntil = await storage.get("fetcher_paused");
  const fetcherPaused = fetcherPausedUntil && Number(fetcherPausedUntil) > Date.now();
  if (fetcherPaused) {
    const pauseUntil = new Date(Number(fetcherPausedUntil)).toISOString();
    const sleepTime = Number(fetcherPausedUntil) - Date.now();
    console.warn(`Fetcher is paused until ${pauseUntil}. Sleeping for ${sleepTime}ms...`);
    await sleep(sleepTime);
  }

  // Rate limit ESI requests
  await rateLimit();

  // Set the user agent
  const requestOptions: RequestInit = options || {};
  requestOptions.headers = requestOptions.headers || {};
  requestOptions.headers["User-Agent"] =
    "EVE-KILL Nitro/1.0 (michael@karbowiak.dk; +https://github.com/eve-kill/backend; @lilllamah; @Karbowiak)";

  const response = await fetch(url, requestOptions);

  // Extract ESI Headers
  const esiErrorLimitRemain = Number(response.headers.get("X-Esi-Error-Limit-Remain") ?? 100);
  const esiErrorLimitReset = Number(response.headers.get("X-Esi-Error-Limit-Reset") ?? 0);

  if (esiErrorLimitRemain < 100) {
    // Calculate exponential backoff based on remaining errors
    // As errors approach 0, sleep time increases exponentially
    const remainingErrorPercentage = esiErrorLimitRemain / 100;
    const baseTime = 200; // 100ms base
    const maxBackoffFactor = 120; // Maximum power factor

    const backoffFactor = maxBackoffFactor ** (1 - remainingErrorPercentage);
    let sleepTimeInMilliseconds = Math.min(baseTime * backoffFactor, esiErrorLimitReset * 1000);

    // Ensure minimum sleep time of 100ms
    sleepTimeInMilliseconds = Math.max(100, sleepTimeInMilliseconds);

    //console.warn(`ESI backoff: Remaining=${esiErrorLimitRemain}, Reset=${esiErrorLimitReset}s. Sleeping for ${sleepTimeInMilliseconds}ms`);
    await sleep(sleepTimeInMilliseconds);
  }

  // Handle 420 responses by pausing fetches
  if (response.status === 420) {
    const sleepTime = 60;
    console.warn(`Status 420 received. Sleeping for ${sleepTime}s and pausing fetcher.`);

    // Set fetcher_paused so other fetches will pause
    const pauseUntilTimestamp = Date.now() + sleepTime * 1000;
    await storage.set("fetcher_paused", pauseUntilTimestamp.toString());

    await sleep(sleepTime * 1000);
    console.warn(`Status 420: Rate limited. Paused fetcher for ${sleepTime}s.`);

    // Go back to the top and retry the fetch now that we've slept for a bit
    return await esiFetcher(url, requestOptions);
  }

  return await response.json();
}

export { esiFetcher };
