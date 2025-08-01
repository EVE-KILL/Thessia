import {
    createError,
    defineEventHandler,
    getMethod,
    getRequestIP,
    readBody,
} from "h3";
import { isbot } from "isbot";
import { cliLogger } from "../../helpers/Logger";
import type { IAccessLog } from "../../interfaces/IAccessLog";
import { AccessLogs } from "../../models/AccessLogs";

export default defineEventHandler(async (event) => {
    // Only allow POST method
    if (getMethod(event) !== "POST") {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    }

    try {
        const body = await readBody(event);
        const { url, referrer, sessionId, timestamp } = body;

        // Validate required fields
        if (!url || !sessionId) {
            throw createError({
                statusCode: 400,
                statusMessage: "Missing required fields: url, sessionId",
            });
        }

        // Extract request information
        const clientIp =
            getRequestIP(event, { xForwardedFor: true }) || "127.0.0.1";
        const userAgent = event.node.req.headers["user-agent"] || "";

        // Create access log entry
        const logEntry: IAccessLog = {
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            method: "GET", // Client-side navigation is conceptually a GET
            url: url,
            httpVersion: "2.0", // Assume HTTP/2 for client-side requests
            userAgent: userAgent,
            clientIp: clientIp,
            referrer: referrer || undefined,
            isBot: isbot(userAgent),
            isApiRequest: false, // Client-side navigation is not an API request
            logType: "client",
            sessionId: sessionId,
            statusCode: 200, // Assume successful navigation
        };

        // Save directly to database
        const logEnt = new AccessLogs(logEntry);
        await logEnt.save();

        return { success: true };
    } catch (error) {
        cliLogger.error(`Error processing client page view: ${error}`);

        // Don't throw error to avoid impacting client-side navigation
        // Just return a generic success to prevent retries
        return { success: false, error: "Internal error" };
    }
});
