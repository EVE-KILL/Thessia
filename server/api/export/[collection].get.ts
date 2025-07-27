import type { Model } from "mongoose";
import { Alliances } from "../../models/Alliances";
import { Battles } from "../../models/Battles";
import { Bloodlines } from "../../models/Bloodlines";
import { Campaigns } from "../../models/Campaigns";
import { Celestials } from "../../models/Celestials";
import { CharacterAchievements } from "../../models/CharacterAchievements";
import { Characters } from "../../models/Characters";
import { Comments } from "../../models/Comments";
import { Constellations } from "../../models/Constellations";
import { Corporations } from "../../models/Corporations";
import { CustomPrices } from "../../models/CustomPrices";
import { Factions } from "../../models/Factions";
import { HistoricalStats } from "../../models/HistoricalStats";
import { InvFlags } from "../../models/InvFlags";
import { InvGroups } from "../../models/InvGroups";
import { InvTypes } from "../../models/InvTypes";
import { Killmails } from "../../models/Killmails";
import { KillmailsESI } from "../../models/KillmailsESI";
import { Prices } from "../../models/Prices";
import { Races } from "../../models/Races";
import { Regions } from "../../models/Regions";
import { SolarSystems } from "../../models/SolarSystems";
import { Stats } from "../../models/Stats";
import { Wars } from "../../models/Wars";
import { checkRateLimit } from "../../utils/rateLimit";

/**
 * Define which collections are allowed for export and their respective models
 */
const ALLOWED_COLLECTIONS: Record<string, Model<any>> = {
    alliances: Alliances,
    battles: Battles,
    bloodlines: Bloodlines,
    campaigns: Campaigns,
    celestials: Celestials,
    characterachievements: CharacterAchievements,
    characters: Characters,
    comments: Comments,
    constellations: Constellations,
    corporations: Corporations,
    customprices: CustomPrices,
    factions: Factions,
    historicalstats: HistoricalStats,
    invflags: InvFlags,
    invgroups: InvGroups,
    invtypes: InvTypes,
    killmails: Killmails,
    killmailsesi: KillmailsESI,
    prices: Prices,
    races: Races,
    regions: Regions,
    solarsystems: SolarSystems,
    stats: Stats,
    wars: Wars,
};

/**
 * Validates and normalizes limit parameter
 * @param limit - Raw limit value from query
 * @returns Normalized limit between 1 and 10000
 */
function normalizeLimit(limit?: string | number): number {
    const MIN_LIMIT = 1;
    const MAX_LIMIT = 10000;

    let parsedLimit: number;

    if (typeof limit === "string") {
        parsedLimit = parseInt(limit, 10);
    } else if (typeof limit === "number") {
        parsedLimit = limit;
    } else {
        parsedLimit = 1000; // Default limit
    }

    if (isNaN(parsedLimit) || parsedLimit < MIN_LIMIT) {
        return MIN_LIMIT;
    }

    if (parsedLimit > MAX_LIMIT) {
        return MAX_LIMIT;
    }

    return parsedLimit;
}

/**
 * Validates MongoDB ObjectId format
 * @param id - The ID to validate
 * @returns True if valid ObjectId format, false otherwise
 */
function isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Extracts client IP address from the event
 * @param event - The H3 event object
 * @returns The client IP address
 */
function getClientIP(event: any): string {
    // Try various headers that might contain the real IP
    const headers = getHeaders(event);

    return (
        headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        headers["x-real-ip"] ||
        headers["cf-connecting-ip"] || // Cloudflare
        headers["x-client-ip"] ||
        event.node.req.socket?.remoteAddress ||
        "127.0.0.1"
    );
}

export interface IExportResult {
    collection: string;
    limit: number;
    after?: string;
    before?: string;
    count: number;
    data: any[];
}

export interface IExportError {
    statusCode: number;
    statusMessage: string;
    error: string;
    retryAfter?: number;
    rateLimitInfo?: any;
}

/**
 * GET /api/export/[collection]
 * Exports data from the specified collection with pagination support
 */
export default defineEventHandler(
    async (event): Promise<IExportResult | IExportError> => {
        const collection = getRouterParam(event, "collection");
        const query = getQuery(event);

        // Validate collection parameter
        if (!collection || typeof collection !== "string") {
            setResponseStatus(event, 400);
            setHeader(event, "Content-Type", "application/json");
            return {
                statusCode: 400,
                statusMessage: "Collection parameter is required",
                error: "Bad Request",
            };
        }

        const collectionLower = collection.toLowerCase();

        // Check if collection is allowed
        if (!ALLOWED_COLLECTIONS[collectionLower]) {
            setResponseStatus(event, 400);
            setHeader(event, "Content-Type", "application/json");
            return {
                statusCode: 400,
                statusMessage: `Collection '${collection}' is not available for export. Available collections: ${Object.keys(
                    ALLOWED_COLLECTIONS
                ).join(", ")}`,
                error: "Bad Request",
            };
        }

        // Get and validate query parameters
        const limit = normalizeLimit(query.limit as string);
        const after = query.after as string;
        const before = query.before as string;

        // Get client IP for rate limiting
        const clientIP = getClientIP(event);

        // Check rate limiting
        const rateLimitResult = await checkRateLimit(clientIP, limit);

        if (!rateLimitResult.allowed) {
            // Set rate limit headers
            setHeader(
                event,
                "X-RateLimit-Limit",
                rateLimitResult.rateLimitInfo.maxRequestsPerSecond.toString()
            );
            setHeader(event, "X-RateLimit-Remaining", "0");
            setHeader(
                event,
                "X-RateLimit-Reset",
                rateLimitResult.rateLimitInfo.resetTime.toString()
            );
            setHeader(
                event,
                "X-RateLimit-Window",
                rateLimitResult.rateLimitInfo.windowMs.toString()
            );
            setHeader(event, "Retry-After", 1);
            setHeader(event, "Content-Type", "application/json");

            // Set status code and return JSON response
            setResponseStatus(event, 429);
            return {
                statusCode: 429,
                statusMessage: `Rate limit exceeded. Maximum ${
                    rateLimitResult.rateLimitInfo.maxRequestsPerSecond
                } requests per second for limit ${limit}. Try again in ${Math.ceil(
                    rateLimitResult.rateLimitInfo.windowMs / 1000
                )} seconds.`,
                error: "Too Many Requests",
                retryAfter: Math.ceil(
                    rateLimitResult.rateLimitInfo.windowMs / 1000
                ),
                rateLimitInfo: rateLimitResult.rateLimitInfo,
            };
        }

        // Validate after/before parameters if provided
        if (after && !isValidObjectId(after)) {
            setResponseStatus(event, 400);
            setHeader(event, "Content-Type", "application/json");
            return {
                statusCode: 400,
                statusMessage:
                    "Invalid after parameter - must be a valid MongoDB ObjectId",
                error: "Bad Request",
            };
        }

        if (before && !isValidObjectId(before)) {
            setResponseStatus(event, 400);
            setHeader(event, "Content-Type", "application/json");
            return {
                statusCode: 400,
                statusMessage:
                    "Invalid before parameter - must be a valid MongoDB ObjectId",
                error: "Bad Request",
            };
        }

        // Cannot use both after and before at the same time
        if (after && before) {
            setResponseStatus(event, 400);
            setHeader(event, "Content-Type", "application/json");
            return {
                statusCode: 400,
                statusMessage:
                    "Cannot use both after and before parameters simultaneously",
                error: "Bad Request",
            };
        }

        const model = ALLOWED_COLLECTIONS[collectionLower];

        try {
            // Get collection count for headers
            const totalCount = await model.estimatedDocumentCount();

            // Build the query filter
            const filter: any = {};

            if (after) {
                filter._id = { $lt: after }; // Get items FROM the specified ID onwards (greater than or equal)
            } else if (before) {
                filter._id = { $gt: before }; // Get items UP TO the specified ID (less than or equal)
            }

            // Execute the query - always use descending order to maintain consistent ordering
            const sortOrder: 1 | -1 = -1; // Always descending (newest first)

            const data = await model
                .find(filter)
                .sort({ _id: sortOrder })
                .limit(limit)
                .lean(); // Use lean() for better performance

            // Set success rate limit headers
            const remaining = Math.max(
                0,
                rateLimitResult.rateLimitInfo.maxBurstRequests -
                    rateLimitResult.rateLimitInfo.requestsInWindow
            );
            setHeader(
                event,
                "X-RateLimit-Limit",
                rateLimitResult.rateLimitInfo.maxRequestsPerSecond.toString()
            );
            setHeader(event, "X-RateLimit-Remaining", remaining.toString());
            setHeader(
                event,
                "X-RateLimit-Reset",
                rateLimitResult.rateLimitInfo.resetTime.toString()
            );
            setHeader(
                event,
                "X-RateLimit-Window",
                rateLimitResult.rateLimitInfo.windowMs.toString()
            );
            setHeader(
                event,
                "X-RateLimit-Whitelisted",
                rateLimitResult.rateLimitInfo.isWhitelisted.toString()
            );

            // Set export-specific headers
            setHeader(event, "X-Export-Collection", collectionLower);
            setHeader(event, "X-Export-Total-Count", totalCount.toString());
            setHeader(event, "X-Export-Returned-Count", data.length.toString());
            setHeader(event, "X-Export-Limit-Used", limit.toString());
            setHeader(event, "X-Export-Max-Limit", "10000");
            setHeader(
                event,
                "X-Export-Rate-For-Limit",
                `${rateLimitResult.rateLimitInfo.maxRequestsPerSecond}/sec`
            );
            setHeader(
                event,
                "X-Export-Efficiency-Score",
                Math.round(
                    (limit / 10000) *
                        rateLimitResult.rateLimitInfo.maxRequestsPerSecond
                ).toString()
            );

            // Set cache headers
            setHeader(
                event,
                "Cache-Control",
                "no-cache, no-store, must-revalidate"
            );
            setHeader(event, "Pragma", "no-cache");
            setHeader(event, "Expires", "0");

            return {
                collection: collectionLower,
                limit,
                after,
                before,
                count: data.length,
                data,
            };
        } catch (error) {
            console.error(
                `Error exporting from collection ${collection}:`,
                error
            );
            setResponseStatus(event, 500);
            setHeader(event, "Content-Type", "application/json");
            return {
                statusCode: 500,
                statusMessage: "Internal server error while exporting data",
                error: "Internal Server Error",
            };
        }
    }
);
