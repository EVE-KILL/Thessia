import { nitroApp } from "nitropack/runtime/internal/app";
import { cliLogger } from "~/server/helpers/Logger";
import { RequestStats } from "~/server/models/RequestStats";
import type { IRequestStats } from "~/server/interfaces/IRequestStats";

// In-memory storage for request data
const inMemoryStorage: IRequestStats[] = [];

/**
 * Parse user agent to extract browser, OS and device information
 * Simple implementation - in a production app, you might want to use a library like ua-parser-js
 */
const parseUserAgent = (
    userAgent: string
): { browser: string; os: string; device: string } => {
    // Default values
    const result = {
        browser: "Unknown",
        os: "Unknown",
        device: "Unknown",
    };

    if (!userAgent) return result;

    // Browser detection
    if (userAgent.includes("Firefox/")) {
        result.browser = "Firefox";
    } else if (userAgent.includes("Edg/")) {
        result.browser = "Edge";
    } else if (userAgent.includes("Chrome/")) {
        result.browser = "Chrome";
    } else if (
        userAgent.includes("Safari/") &&
        !userAgent.includes("Chrome/")
    ) {
        result.browser = "Safari";
    } else if (userAgent.includes("MSIE ") || userAgent.includes("Trident/")) {
        result.browser = "Internet Explorer";
    }

    // OS detection
    if (userAgent.includes("Windows")) {
        result.os = "Windows";
    } else if (userAgent.includes("Mac OS X")) {
        result.os = "macOS";
    } else if (userAgent.includes("Linux")) {
        result.os = "Linux";
    } else if (userAgent.includes("Android")) {
        result.os = "Android";
    } else if (
        userAgent.includes("iOS") ||
        userAgent.includes("iPhone") ||
        userAgent.includes("iPad")
    ) {
        result.os = "iOS";
    }

    // Device detection
    if (userAgent.includes("Mobile")) {
        result.device = "Mobile";
    } else if (userAgent.includes("Tablet")) {
        result.device = "Tablet";
    } else {
        result.device = "Desktop";
    }

    return result;
};

// Function to flush data to the database
async function flushRequestStats() {
    if (inMemoryStorage.length > 0) {
        try {
            // Clone the current storage and clear it
            const batchToFlush = [...inMemoryStorage];
            inMemoryStorage.length = 0;

            // Insert the batch into MongoDB
            await RequestStats.insertMany(batchToFlush);
            cliLogger.info(`[RequestStats] Flushed ${batchToFlush.length} request entries to the database`);
        } catch (err) {
            cliLogger.error(`[RequestStats] Failed to flush request stats: ${err}`);
            // If we failed to save, put the items back in memory
            // But to avoid memory leaks, we'll limit the buffer size
            if (inMemoryStorage.length < 10000) {
                inMemoryStorage.push(...batchToFlush);
            } else {
                cliLogger.warn(`[RequestStats] In-memory storage limit reached, some requests will not be logged`);
            }
        }
    }
}

// Helper function to determine if a request is an API request
function isApiRequest(url: string): boolean {
    return url.startsWith('/api/');
}

// Set up the timer to flush the data every 10 seconds
let flushInterval: NodeJS.Timer | null = null;

export default defineNitroPlugin(() => {
    // Set up the flush interval
    if (!flushInterval) {
        flushInterval = setInterval(flushRequestStats, 10000);
    }

    // Add a hook for every incoming request
    nitroApp.hooks.hook("request", (event) => {
        // Skip certain paths that might cause too much data or aren't interesting
        const url = event.node.req.url || "";
        if (
            url.startsWith("/_nuxt") ||
            url.startsWith("/favicon.ico") ||
            url.startsWith("/__vite") ||
            url.startsWith("/__nuxt") ||
            url.startsWith("/_ipx") ||
            url.startsWith("/_healthcheck") ||
            url.startsWith("/auth") ||
            url.startsWith("/map.png") ||
            url.startsWith("/favicon")
        ) {
            return;
        }

        const requestIp = getRequestIP(event, { xForwardedFor: true });
        // Check if we even have a request IP before we do anything else.
        if (!requestIp) {
            return;
        }

        const userAgent = event.node.req.headers["user-agent"] || "Unknown";
        const method = event.node.req.method || "GET";
        const referer = event.node.req.headers["referer"] || "";

        // Parse user agent for additional information
        const { browser, os, device } = parseUserAgent(userAgent);

        // Check if this is an API request
        const isApi = isApiRequest(url);

        // Create a new request stats entry
        const requestEntry: IRequestStats = {
            ip: requestIp,
            userAgent,
            browser,
            os,
            device,
            url,
            method,
            statusCode: 200, // Will be updated later if possible
            referer,
            timestamp: new Date(),
            isApi, // Add flag to distinguish API requests
        };

        // Store in memory buffer
        inMemoryStorage.push(requestEntry);
    });

    // Update the status code after the response is sent (if possible)
    nitroApp.hooks.hook("afterResponse", (event, { body, status }) => {
        // Find the last entry for this request and update its status code
        // This is a simplistic approach - in a real app you might want to use request ID
        const lastIndex = inMemoryStorage.findIndex(
            entry => entry.ip === getRequestIP(event, { xForwardedFor: true }) &&
                entry.url === event.node.req.url
        );

        if (lastIndex !== -1) {
            inMemoryStorage[lastIndex].statusCode = status;
        }
    });
});
