/**
 * Get all domains owned by the authenticated user - Phase 2
 */
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

    try {
        // Get user's domains
        const domains = await CustomDomains.find({
            owner_character_id: user.characterId,
        }).sort({ created_at: -1 });

        // PHASE 2: Enhance domains with multi-entity information
        const enhancedDomains = await Promise.all(
            domains.map(async (domain) => {
                const entitiesInfo = [];

                // Get information for all entities in the domain
                for (const entityConfig of domain.entities || []) {
                    let entityInfo = null;

                    try {
                        switch (entityConfig.entity_type) {
                            case "character":
                                entityInfo = await Characters.findOne(
                                    { character_id: entityConfig.entity_id },
                                    { name: 1, character_id: 1 }
                                );
                                break;
                            case "corporation":
                                entityInfo = await Corporations.findOne(
                                    { corporation_id: entityConfig.entity_id },
                                    { name: 1, ticker: 1, corporation_id: 1 }
                                );
                                break;
                            case "alliance":
                                entityInfo = await Alliances.findOne(
                                    { alliance_id: entityConfig.entity_id },
                                    { name: 1, ticker: 1, alliance_id: 1 }
                                );
                                break;
                        }

                        if (entityInfo) {
                            entitiesInfo.push({
                                ...entityInfo.toObject(),
                                _config: entityConfig, // Include entity configuration
                            });
                        }
                    } catch (error) {
                        console.error(
                            `Error fetching entity info for domain ${domain.domain}, entity ${entityConfig.entity_type}:${entityConfig.entity_id}:`,
                            error
                        );
                    }
                }

                // Convert to plain object (verification token now included automatically)
                const domainObj = domain.toObject();

                return {
                    ...domainObj,
                    entities_info: entitiesInfo, // Multi-entity information
                    primary_entity:
                        entitiesInfo.find((e) => e._config.primary) ||
                        entitiesInfo[0], // Primary entity

                    // Legacy single entity info for backward compatibility (using primary)
                    entity_info:
                        entitiesInfo.find((e) => e._config.primary) ||
                        entitiesInfo[0],
                };
            })
        );

        return {
            success: true,
            domains: enhancedDomains,
            total: domains.length,

            // PHASE 2: Basic domain usage statistics
            usage: {
                domains_count: domains.length,
                domains_limit: 10,
                domains_remaining: Math.max(0, 10 - domains.length),
            },
        };
    } catch (error) {
        console.error("Error fetching user domains:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch domains",
        });
    }
});
