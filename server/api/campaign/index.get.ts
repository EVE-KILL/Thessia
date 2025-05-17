import { createError, getQuery } from 'h3';
import url from 'url';
import { Campaigns } from '~/server/models/Campaigns';

/**
 * Helper function to count entities in a query field
 * @param field Query field which may be a single value or an $in array
 * @returns Number of entities
 */
function countEntities(field: any): number {
    if (!field) return 0;
    if (typeof field === 'object' && field.$in && Array.isArray(field.$in)) {
        return field.$in.length;
    }
    return 1;
}

export default defineCachedEventHandler(async (event) => {
    // Parse pagination parameters from the query
    const query = getQuery(event);
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const status = query.status?.toString();
    const search = query.search?.toString();

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid page number' });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid limit value (must be between 1 and 100)' });
    }

    const skip = (page - 1) * limit;

    try {
        // Define fields we want to return in the response
        const projection = {
            _id: 0,
            campaign_id: 1,
            name: 1,
            description: 1,
            startTime: 1,
            endTime: 1,
            creator_id: 1,
            public: 1,
            createdAt: 1,
            updatedAt: 1,
            query: 1 // Include the query for processing filter information
        };

        // Base query - only show public campaigns
        const findQuery: any = { public: true };

        // Apply status filter if provided
        if (status) {
            const now = new Date();

            if (status === 'active') {
                findQuery.$and = [
                    { startTime: { $lte: now } },
                    { $or: [{ endTime: { $gte: now } }, { endTime: null }] }
                ];
            } else if (status === 'upcoming') {
                findQuery.startTime = { $gt: now };
            } else if (status === 'completed') {
                findQuery.endTime = { $lt: now };
            }
        }

        // Apply search filter if provided - search in both name and description
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            // Use $or to search in both fields
            findQuery.$or = [
                { name: new RegExp(searchTerm, 'i') },
                { description: new RegExp(searchTerm, 'i') }
            ];
        }

        // Execute query and count in parallel for efficiency
        const [campaignsData, totalItems] = await Promise.all([
            Campaigns.find(findQuery)
                .sort({ createdAt: -1 }) // Most recent campaigns first
                .skip(skip)
                .limit(limit)
                .select(projection)
                .lean(),

            Campaigns.countDocuments(findQuery)
        ]);

        // Process campaigns to add status and filter counts
        const campaigns = campaignsData.map(campaign => {
            // Calculate campaign status
            const now = new Date();
            let status = 'active';

            if (campaign.startTime > now) {
                status = 'upcoming';
            } else if (campaign.endTime && campaign.endTime < now) {
                status = 'completed';
            }

            // Count filter entities
            const filterCounts = {
                locations: 0,
                attackers: 0,
                victims: 0
            };

            // Count location filters
            if (campaign.query.region_id) filterCounts.locations += countEntities(campaign.query.region_id);
            if (campaign.query.constellation_id) filterCounts.locations += countEntities(campaign.query.constellation_id);
            if (campaign.query.system_id) filterCounts.locations += countEntities(campaign.query.system_id);

            // Count attacker filters
            if (campaign.query['attackers.character_id']) filterCounts.attackers += countEntities(campaign.query['attackers.character_id']);
            if (campaign.query['attackers.corporation_id']) filterCounts.attackers += countEntities(campaign.query['attackers.corporation_id']);
            if (campaign.query['attackers.alliance_id']) filterCounts.attackers += countEntities(campaign.query['attackers.alliance_id']);
            if (campaign.query['attackers.faction_id']) filterCounts.attackers += countEntities(campaign.query['attackers.faction_id']);

            // Count victim filters
            if (campaign.query['victim.character_id']) filterCounts.victims += countEntities(campaign.query['victim.character_id']);
            if (campaign.query['victim.corporation_id']) filterCounts.victims += countEntities(campaign.query['victim.corporation_id']);
            if (campaign.query['victim.alliance_id']) filterCounts.victims += countEntities(campaign.query['victim.alliance_id']);
            if (campaign.query['victim.faction_id']) filterCounts.victims += countEntities(campaign.query['victim.faction_id']);

            // Return enhanced campaign object
            return {
                ...campaign,
                status,
                filterCounts
            };
        });

        const totalPages = Math.ceil(totalItems / limit);

        return {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
            campaigns,
        };
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching campaigns' });
    }
}, {
    maxAge: 300, // 5 minutes cache
    staleMaxAge: -1,
    swr: true,
    base: "redis",
    shouldBypassCache: (event) => {
        return process.env.NODE_ENV !== "production";
    },
    getKey: (event) => {
        // Use url.parse to get query parameters
        const parsedUrl = url.parse(event.node.req.url || '', true);
        const query = parsedUrl.query;
        const page = query?.page ? query.page.toString() : '1';
        const limit = query?.limit ? query.limit.toString() : '20';
        const status = query?.status ? query.status.toString() : 'all';
        const search = query?.search ? query.search.toString() : '';

        // Include search and status in the cache key
        return `campaigns:index:page:${page}:limit:${limit}:status:${status}:search:${search}`;
    }
});
