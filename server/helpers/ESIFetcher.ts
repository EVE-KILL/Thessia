import { RedisStorage } from "./Storage";

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
    const fetcherPaused =
        fetcherPausedUntil && Number(fetcherPausedUntil) > Date.now();
    if (fetcherPaused) {
        const pauseUntil = new Date(Number(fetcherPausedUntil)).toISOString();
        const sleepTime = Number(fetcherPausedUntil) - Date.now();
        console.warn(
            `Fetcher is paused until ${pauseUntil}. Sleeping for ${sleepTime}ms...`
        );
        await sleep(sleepTime);
    }

    // Rate limit ESI requests
    await rateLimit();

    // Set the user agent
    const requestOptions: RequestInit = options || {};
    requestOptions.headers = requestOptions.headers || {};
    requestOptions.headers["User-Agent"] =
        "EVE-KILL Nitro/1.0 (michael@karbowiak.dk; +https://github.com/eve-kill/backend; @lilllamah; @Karbowiak)";

    // Set the various headers for ESI
    requestOptions.headers["Accept"] = "application/json";
    // We need to pass a YYYY-mm-dd date for compatibility, for now we hardcode it
    requestOptions.headers["X-Compatibility-Date"] = "2020-01-01";

    const response = await fetch(url, requestOptions);

    // Extract ESI Headers
    const esiErrorLimitRemain = Number(
        response.headers.get("X-Esi-Error-Limit-Remain") ?? 100
    );
    const esiErrorLimitReset = Number(
        response.headers.get("X-Esi-Error-Limit-Reset") ?? 0
    );

    if (esiErrorLimitRemain < 100) {
        // Calculate exponential backoff based on remaining errors
        // As errors approach 0, sleep time increases exponentially
        const remainingErrorPercentage = esiErrorLimitRemain / 100;
        const baseTime = 200; // 100ms base
        const maxBackoffFactor = 120; // Maximum power factor

        const backoffFactor =
            maxBackoffFactor ** (1 - remainingErrorPercentage);
        let sleepTimeInMilliseconds = Math.min(
            baseTime * backoffFactor,
            esiErrorLimitReset * 1000
        );

        // Ensure minimum sleep time of 100ms
        sleepTimeInMilliseconds = Math.max(100, sleepTimeInMilliseconds);

        //console.warn(`ESI backoff: Remaining=${esiErrorLimitRemain}, Reset=${esiErrorLimitReset}s. Sleeping for ${sleepTimeInMilliseconds}ms`);
        await sleep(sleepTimeInMilliseconds);
    }

    // Handle 420 responses by pausing fetches
    if (response.status === 420) {
        const sleepTime = 60;
        console.warn(
            `Status 420 received. Sleeping for ${sleepTime}s and pausing fetcher.`
        );

        // Set fetcher_paused so other fetches will pause
        const pauseUntilTimestamp = Date.now() + sleepTime * 1000;
        await storage.set("fetcher_paused", pauseUntilTimestamp.toString());

        await sleep(sleepTime * 1000);
        console.warn(
            `Status 420: Rate limited. Paused fetcher for ${sleepTime}s.`
        );

        // Go back to the top and retry the fetch now that we've slept for a bit
        return await esiFetcher(url, requestOptions);
    }

    const responseData = await response.json();
    
    // Check if the response contains an error
    if (responseData && typeof responseData === 'object' && responseData.error) {
        // Create a proper error with the ESI error details
        const esiError = new Error(responseData.error);
        esiError.name = 'ESIError';
        (esiError as any).esiResponse = responseData;
        (esiError as any).statusCode = response.status;
        throw esiError;
    }

    return responseData;
}

/**
 * ESI Fetcher with logging for transparency
 * @param url - The ESI URL to fetch
 * @param options - Request options
 * @param logContext - Optional logging context for transparency
 */
async function esiFetcherWithLogging(
    url: string,
    options?: RequestInit,
    logContext?: {
        characterId: number;
        characterName: string;
        dataType: string;
        source: string;
        killmailDelay?: number;
        extractDataIds?: (data: any) => Array<{
            id: number | string;
            hash?: string;
            additionalInfo?: Record<string, any>;
        }>; // Function to extract IDs/identifiers from the fetched data
        checkNewItems?: (
            items: Array<{
                id: number | string;
                hash?: string;
                additionalInfo?: Record<string, any>;
            }>
        ) => Promise<number>; // Function to check how many items are new
    }
): Promise<any> {
    const timestamp = new Date();
    let error = false;
    let errorMessage: string | undefined;
    let itemsReturned: number | undefined;
    let newItemsCount: number | undefined;
    let fetchedData:
        | Array<{
              id: number | string;
              hash?: string;
              additionalInfo?: Record<string, any>;
          }>
        | undefined;
    let result: any;

    try {
        result = await esiFetcher(url, options);

        // Count items returned if it's an array
        if (Array.isArray(result)) {
            itemsReturned = result.length;
        } else if (result && typeof result === "object") {
            itemsReturned = 1;
        }

        // Extract fetched data IDs if extractor function is provided
        if (logContext?.extractDataIds && result) {
            try {
                fetchedData = logContext.extractDataIds(result);

                // Check how many items are new if checker function is provided
                if (logContext?.checkNewItems && fetchedData) {
                    try {
                        newItemsCount = await logContext.checkNewItems(
                            fetchedData
                        );
                    } catch (checkError) {
                        console.warn(
                            "Failed to check new items for ESI log:",
                            checkError
                        );
                    }
                }
            } catch (extractError) {
                console.warn(
                    "Failed to extract data IDs for ESI log:",
                    extractError
                );
            }
        }
    } catch (fetchError: any) {
        error = true;
        errorMessage = fetchError.message || String(fetchError);
        throw fetchError; // Re-throw the error
    } finally {
        // Only log the ESI call if there are new items or if there was an error
        if (
            logContext &&
            (error || (newItemsCount !== undefined && newItemsCount > 0))
        ) {
            try {
                const logEntry: Partial<IESILog> = {
                    characterId: logContext.characterId,
                    characterName: logContext.characterName,
                    endpoint: getEndpointFromUrl(url),
                    dataType: logContext.dataType,
                    itemsReturned,
                    newItemsCount,
                    killmailDelay: logContext.killmailDelay,
                    fetchedData,
                    error,
                    errorMessage,
                    source: logContext.source,
                    timestamp,
                };

                // Save log entry asynchronously to not block the response
                const esiLog = new ESILogs(logEntry);
                esiLog.save().catch((logError) => {
                    console.error("Failed to save ESI log:", logError);
                });
            } catch (logError) {
                console.error("Error creating ESI log entry:", logError);
            }
        }
    }

    return result;
}

/**
 * Extract endpoint name from URL for logging
 */
function getEndpointFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);

        // Remove version (latest, v1, v2, etc.) if present
        if (pathParts[0] && /^(latest|v\d+)$/.test(pathParts[0])) {
            pathParts.shift();
        }

        return pathParts.join("/");
    } catch {
        return url;
    }
}

export { esiFetcher, esiFetcherWithLogging };
