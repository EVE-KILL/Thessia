export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event);
        const domain = query.domain as string;

        if (!domain) {
            throw createError({
                statusCode: 400,
                statusMessage: "Domain parameter is required",
            });
        }

        // Find the domain configuration in the database
        const domainConfig = await CustomDomains.findOne({
            domain: domain.toLowerCase(),
            active: true,
        });

        if (!domainConfig) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        // Enhance domain with entity information
        const entitiesInfo = [];

        // Get information for all entities in the domain
        for (const entityConfig of domainConfig.entities || []) {
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
                    `Error fetching entity info for domain ${domainConfig.domain}, entity ${entityConfig.entity_type}:${entityConfig.entity_id}:`,
                    error
                );
                // Add placeholder for missing entities
                entitiesInfo.push({
                    entity_type: entityConfig.entity_type,
                    entity_id: entityConfig.entity_id,
                    name: `Unknown ${entityConfig.entity_type}`,
                    _config: entityConfig,
                    missing: true,
                });
            }
        }

        // Get owner information
        let ownerInfo = null;
        try {
            ownerInfo = await Characters.findOne(
                { character_id: domainConfig.owner_character_id },
                { name: 1, character_id: 1 }
            );
        } catch (error) {
            console.error(
                `Error fetching owner info for domain ${domainConfig.domain}:`,
                error
            );
        }

        // Convert to plain object and add enhanced information
        const domainObj = domainConfig.toObject();

        const enhancedDomain = {
            ...domainObj,
            entities_info: entitiesInfo, // Multi-entity information
            primary_entity:
                entitiesInfo.find((e) => e._config.primary) || entitiesInfo[0], // Primary entity
            owner_info: ownerInfo, // Owner information

            // Legacy single entity info for backward compatibility (using primary)
            entity_info:
                entitiesInfo.find((e) => e._config.primary) || entitiesInfo[0],
        };

        return {
            success: true,
            data: enhancedDomain,
        };
    } catch (error: any) {
        console.error("Error in domain lookup:", error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
