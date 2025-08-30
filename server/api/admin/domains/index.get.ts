export default defineEventHandler(async (event) => {
    // Add cache-control headers to prevent caching
    setResponseHeaders(event, {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });

    // Get the cookie value using the hardcoded cookie name
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find the user by uniqueIdentifier
    const user = await Users.findOne({ uniqueIdentifier: cookie });

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid authentication",
        });
    }

    // Only allow administrators
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Access denied. Administrator privileges required.",
        });
    }

    try {
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 25;
        const search = (query.search as string) || "";
        const status = (query.status as string) || "all";
        const entityType = (query.entityType as string) || "all";

        // Build MongoDB filter
        const filter: any = {};

        // We'll handle search after getting entity info since we need to search by entity names too
        let searchFilter = null;
        if (search) {
            searchFilter = search;
        }

        if (status !== "all") {
            // Map status to model fields
            switch (status) {
                case "verified":
                    filter.verified = true;
                    filter.active = true;
                    break;
                case "pending":
                    filter.verified = false;
                    filter.active = true;
                    break;
                case "suspended":
                    filter.active = false;
                    break;
                case "failed":
                    filter.verified = false;
                    filter.active = false;
                    break;
                case "expired":
                    filter.expires_at = { $lt: new Date() };
                    break;
            }
        }

        if (entityType !== "all") {
            filter.entity_type = entityType;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get domains with pagination (don't use .lean() so we have access to all fields)
        const [domains, totalCount] = await Promise.all([
            CustomDomains.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),
            CustomDomains.countDocuments(filter),
        ]);

        // Get statistics
        const [stats] = await Promise.all([
            CustomDomains.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        verified: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$verified", true] },
                                            { $eq: ["$active", true] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        pending: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$verified", false] },
                                            { $eq: ["$active", true] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        suspended: {
                            $sum: {
                                $cond: [{ $eq: ["$active", false] }, 1, 0],
                            },
                        },
                        failed: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$verified", false] },
                                            { $eq: ["$active", false] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
        ]);

        const domainStats = stats[0] || {
            total: 0,
            verified: 0,
            pending: 0,
            suspended: 0,
            failed: 0,
        };

        // Enhance domains with entity information and owner names
        const enhancedDomains = await Promise.all(
            domains.map(async (domain) => {
                let ownerInfo = null;

                try {
                    // Get owner information
                    ownerInfo = await Characters.findOne(
                        { character_id: domain.owner_character_id },
                        { name: 1, character_id: 1 }
                    );
                } catch (error) {
                    console.error(
                        `Error fetching owner info for domain ${domain.domain}:`,
                        error
                    );
                }

                // Enhance entities array with names if it exists
                let enhancedEntities = [];
                if (domain.entities && Array.isArray(domain.entities)) {
                    enhancedEntities = await Promise.all(
                        domain.entities.map(async (entity) => {
                            let entityData = null;
                            try {
                                switch (entity.entity_type) {
                                    case "character":
                                        entityData = await Characters.findOne(
                                            { character_id: entity.entity_id },
                                            { name: 1, character_id: 1 }
                                        );
                                        break;
                                    case "corporation":
                                        entityData = await Corporations.findOne(
                                            { corporation_id: entity.entity_id },
                                            { name: 1, ticker: 1, corporation_id: 1 }
                                        );
                                        break;
                                    case "alliance":
                                        entityData = await Alliances.findOne(
                                            { alliance_id: entity.entity_id },
                                            { name: 1, ticker: 1, alliance_id: 1 }
                                        );
                                        break;
                                }
                            } catch (error) {
                                console.error(`Error fetching entity info for ${entity.entity_type} ${entity.entity_id}:`, error);
                            }

                            return {
                                entity_type: entity.entity_type,
                                entity_id: entity.entity_id,
                                entity_name: entityData?.name || entity.display_name || `${entity.entity_type} ${entity.entity_id}`,
                                display_name: entity.display_name,
                                show_in_nav: entity.show_in_nav,
                                show_in_stats: entity.show_in_stats,
                                primary: entity.primary,
                                color_code: entity.color_code
                            };
                        })
                    );
                }

                // Get primary entity info for backward compatibility
                const primaryEntity = enhancedEntities.find(e => e.primary) || enhancedEntities[0];

                // Map domain status to display status
                let status = "pending";
                if (domain.verified && domain.active) {
                    status = "verified";
                } else if (!domain.active) {
                    status = "suspended";
                } else if (!domain.verified && !domain.active) {
                    status = "failed";
                } else if (
                    domain.expires_at &&
                    domain.expires_at < new Date()
                ) {
                    status = "expired";
                }

                return {
                    _id: domain._id,
                    domain: domain.domain,
                    // Backward compatibility fields
                    entity_type: primaryEntity?.entity_type || "unknown",
                    entity_id: primaryEntity?.entity_id || 0,
                    entity_name: primaryEntity?.entity_name || "Unknown",
                    owner_character_id: domain.owner_character_id,
                    owner_character_name: ownerInfo?.name || "Unknown",
                    status: status,
                    verification_method: domain.verification_method,
                    verification_token: domain.verification_token,
                    created_at: domain.created_at,
                    verified_at: domain.dns_verified_at,
                    last_accessed: domain.last_accessed,
                    branding: domain.branding,
                    navigation: domain.navigation,
                    entities: enhancedEntities, // Include the enhanced entities array
                };
            })
        );

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            success: true,
            domains: enhancedDomains,
            stats: domainStats,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                total: totalCount,
            },
        };
    } catch (error) {
        console.error("Error fetching admin domains:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch domains",
        });
    }
});
