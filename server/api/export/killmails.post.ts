import crypto from "crypto";

/**
 * Export Killmails API
 *
 * Accepts POST requests with filter criteria to export killmail_id and killmail_hash
 * filtered by character_ids, corporation_ids, and alliance_ids.
 *
 * Example request:
 * {
 *   "filter": {
 *     "character_ids": [1, 2],
 *     "corporation_ids": [3, 4],
 *     "alliance_ids": [5, 6]
 *   },
 *   "options": {
 *     "limit": 1000,
 *     "skip": 0
 *   }
 * }
 *
 * Returns killmails sorted by kill_time (descending) with pagination info
 */

interface ExportKillmailsRequest {
    filter?: {
        character_ids?: number[];
        corporation_ids?: number[];
        alliance_ids?: number[];
    };
    options?: {
        limit?: number;
        skip?: number;
    };
}

interface ExportKillmailsResponse {
    data: Array<{
        killmail_id: number;
        killmail_hash: string;
    }>;
    pagination: {
        limit: number;
        skip: number;
        returned: number;
        hasMore: boolean;
    };
    total?: number;
}

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 10000;

/**
 * Validates and normalizes limit parameter
 */
function validateLimit(limit?: number): number {
    if (!limit || typeof limit !== "number") {
        return DEFAULT_LIMIT;
    }

    if (limit < 1) {
        return DEFAULT_LIMIT;
    }

    return Math.min(limit, MAX_LIMIT);
}

/**
 * Validates and normalizes skip parameter
 */
function validateSkip(skip?: number): number {
    if (!skip || typeof skip !== "number") {
        return 0;
    }

    return Math.max(0, skip);
}

/**
 * Validates that IDs are valid numbers
 */
function validateIds(ids: any, fieldName: string): number[] {
    if (!Array.isArray(ids)) {
        throw new Error(`${fieldName} must be an array`);
    }

    if (ids.length === 0) {
        throw new Error(`${fieldName} cannot be empty`);
    }

    return ids.map((id, index) => {
        const numId = Number(id);
        if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
            throw new Error(
                `${fieldName}[${index}] must be a positive integer, got: ${id}`
            );
        }
        return numId;
    });
}

/**
 * Builds MongoDB filter from request parameters
 */
function buildFilter(filter?: ExportKillmailsRequest["filter"]): Record<string, any> {
    if (!filter) {
        throw new Error("Filter is required");
    }

    const { character_ids, corporation_ids, alliance_ids } = filter;

    // At least one filter must be provided
    if (!character_ids && !corporation_ids && !alliance_ids) {
        throw new Error(
            "At least one of character_ids, corporation_ids, or alliance_ids must be provided"
        );
    }

    const orConditions: Array<Record<string, any>> = [];

    // Build OR conditions for each entity type (checking both victim and attackers)
    if (character_ids && character_ids.length > 0) {
        const validIds = validateIds(character_ids, "character_ids");
        orConditions.push(
            { "victim.character_id": { $in: validIds } },
            { "attackers.character_id": { $in: validIds } }
        );
    }

    if (corporation_ids && corporation_ids.length > 0) {
        const validIds = validateIds(corporation_ids, "corporation_ids");
        orConditions.push(
            { "victim.corporation_id": { $in: validIds } },
            { "attackers.corporation_id": { $in: validIds } }
        );
    }

    if (alliance_ids && alliance_ids.length > 0) {
        const validIds = validateIds(alliance_ids, "alliance_ids");
        orConditions.push(
            { "victim.alliance_id": { $in: validIds } },
            { "attackers.alliance_id": { $in: validIds } }
        );
    }

    return { $or: orConditions };
}

/**
 * Main handler for export killmails endpoint
 */
export default defineCachedEventHandler(
    async (event: H3Event): Promise<ExportKillmailsResponse> => {
        try {
            // Parse the request body
            const body = (await readBody(event)) as ExportKillmailsRequest;

            if (!body || typeof body !== "object") {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid request body: expected JSON object",
                });
            }

            // Validate and normalize options
            const limit = validateLimit(body.options?.limit);
            const skip = validateSkip(body.options?.skip);

            // Build the MongoDB filter
            const mongoFilter = buildFilter(body.filter);

            // Build the aggregation pipeline
            const pipeline = [
                { $match: mongoFilter },
                { $sort: { kill_time: -1 } },
                { $skip: skip },
                { $limit: limit + 1 }, // Fetch one extra to check if there are more results
                {
                    $project: {
                        _id: 0,
                        killmail_id: 1,
                        killmail_hash: 1,
                    },
                },
            ];

            // Execute the query
            const results = await Killmails.aggregate(pipeline).exec();

            // Check if there are more results
            const hasMore = results.length > limit;
            const data = hasMore ? results.slice(0, limit) : results;

            // Get total count for the filter (optional, for better UX)
            // This is cached separately and only computed if needed
            let total: number | undefined;
            try {
                total = await Killmails.countDocuments(mongoFilter);
            } catch (error) {
                // If count fails, continue without it
                console.error("Error counting documents:", error);
            }

            return {
                data,
                pagination: {
                    limit,
                    skip,
                    returned: data.length,
                    hasMore,
                },
                total,
            };
        } catch (error: any) {
            console.error("Export killmails API error:", error);

            // Check if it's already an H3Error
            if (error.statusCode) {
                throw error;
            }

            // Provide user-friendly error messages
            throw createError({
                statusCode: error.message.includes("must be") ||
                    error.message.includes("cannot be") ||
                    error.message.includes("required")
                    ? 400
                    : 500,
                statusMessage: error.message || "Internal server error",
            });
        }
    },
    {
        maxAge: 600, // 10 minutes cache
        name: "exportKillmails",
        getKey: async (event) => {
            const body = (await readBody(event)) as ExportKillmailsRequest;
            // Generate a hash of the body to use as a cache key
            const hash = crypto.createHash("sha256");
            hash.update(JSON.stringify(body));
            return `export-killmails:${hash.digest("hex")}`;
        },
    }
);
