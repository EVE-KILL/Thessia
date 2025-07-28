import { createError, getQuery } from "h3";
import * as url from "url";
import { Battles } from "~/server/models/Battles";
import { determineOptimalIndexHint } from "~/server/utils/indexOptimizer";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event as any);
        const page = parseInt(query.page?.toString() || "1", 10);
        const limit = parseInt(query.limit?.toString() || "20", 10);
        const search = query.search?.toString() || "";
        const filter = query.filter?.toString() || "all"; // 'all' or 'custom'

        if (isNaN(page) || page < 1) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid page number",
            });
        }
        if (isNaN(limit) || limit < 1 || limit > 100) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid limit value (must be between 1 and 100)",
            });
        }

        const skip = (page - 1) * limit;

        try {
            // Build the query object
            const mongoQuery: any = {};

            // Apply filter for custom battles
            if (filter === "custom") {
                mongoQuery.custom = true;
            }

            // Apply search for systems/regions
            if (search && search.length >= 2) {
                const searchRegex = new RegExp(search, "i");
                mongoQuery.$or = [
                    // Search in systems array (new structure)
                    { "systems.system_name": searchRegex },
                    { "systems.region_name.en": searchRegex },
                    { "systems.region_name": searchRegex },
                    // Search in legacy fields for backward compatibility
                    { system_name: searchRegex },
                    { "region_name.en": searchRegex },
                    { region_name: searchRegex },
                ];
            }

            // Define fields we actually need to display in the battles list
            // This significantly reduces the payload size
            const projection = {
                _id: 0,
                battle_id: 1,
                custom: 1,
                start_time: 1,
                end_time: 1,
                duration_ms: 1,
                systems: 1,
                // Legacy system fields for backward compatibility
                system_id: 1,
                system_name: 1,
                system_security: 1,
                region_id: 1,
                region_name: 1,
                // Stats fields
                killmailsCount: 1,
                iskDestroyed: 1,
                // Counts of involved entities
                involved_alliances_count: 1,
                involved_corporations_count: 1,
                involved_characters_count: 1,
                // Arrays needed for counts if the count fields aren't available
                alliancesInvolved: 1,
                corporationsInvolved: 1,
                charactersInvolved: 1,
                // Top entities for display
                top_alliances: { $slice: 10 },
                top_corporations: { $slice: 10 },
                top_ship_types: { $slice: 10 },
            };

            // Determine optimal index hint for the battle query
            const sortOptions = { start_time: -1 };
            const hint = await determineOptimalIndexHint(
                Battles.collection,
                mongoQuery,
                sortOptions,
                "[Battles API]"
            );

            // Execute query and count in parallel, using more efficient methods
            const [battles, totalItems] = await Promise.all([
                // Use a regular find query with sort, skip, limit and projection
                // This is much faster than an aggregation pipeline for simple pagination
                Battles.find(mongoQuery)
                    .sort({ start_time: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select(projection)
                    .hint(hint || { start_time: -1 })
                    .lean(),

                Battles.countDocuments(mongoQuery).hint(
                    hint || { start_time: -1 }
                ),
            ]);

            const totalPages = Math.ceil(totalItems / limit);

            return {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                battles,
            };
        } catch (error) {
            console.error("Error fetching battles:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Internal Server Error fetching battles",
            });
        }
    },
    {
        maxAge: 300,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        shouldBypassCache: (event) => {
            return process.env.NODE_ENV !== "production";
        },
        getKey: (event) => {
            // Use url.parse to get query parameters
            const parsedUrl = url.parse(event.node.req.url || "", true);
            const query = parsedUrl.query;
            const page = query?.page ? query.page.toString() : "1";
            const limit = query?.limit ? query.limit.toString() : "20";
            const search = query?.search ? query.search.toString() : "";
            const filter = query?.filter ? query.filter.toString() : "all";
            return `battles:index:page:${page}:limit:${limit}:search:${search}:filter:${filter}`;
        },
    }
);
