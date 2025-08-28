/**
 * Get a single domain by domain_id owned by the authenticated user
 */
export default defineEventHandler(async (event) => {
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

    const domainId = getRouterParam(event, "id");
    if (!domainId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain ID is required",
        });
    }

    try {
        // Find the domain and verify ownership
        const domain = await CustomDomains.findOne({
            domain_id: domainId,
            owner_character_id: user.characterId,
        });

        if (!domain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        // Enhance domain with entity information
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

        // Convert to plain object and include verification token for the domain owner
        const domainObj = domain.toObject();

        return {
            success: true,
            domain: {
                ...domainObj,
                verification_token: domain.verification_token, // Include for domain owner
                entities_info: entitiesInfo, // Multi-entity information
                primary_entity:
                    entitiesInfo.find((e) => e._config.primary) ||
                    entitiesInfo[0], // Primary entity

                // Legacy single entity info for backward compatibility (using primary)
                entity_info:
                    entitiesInfo.find((e) => e._config.primary) ||
                    entitiesInfo[0],
            },
        };
    } catch (error) {
        console.error("Error fetching domain:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch domain",
        });
    }
});
