export default defineCachedEventHandler(
    async (event) => {
        try {
            const domain = getRouterParam(event, "domain");

            if (!domain) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Domain parameter is required",
                });
            }

            // Find the domain configuration
            const domainConfig = await CustomDomains.findOne({
                domain: domain,
                active: true,
            }).lean();

            if (!domainConfig) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Domain not found",
                });
            }

            // Fetch entity details from respective collections
            const entityDetails = [];

            for (const entity of domainConfig.entities || []) {
                let entityData = null;

                try {
                    switch (entity.entity_type) {
                        case "alliance":
                            entityData = await Alliances.findOne({
                                alliance_id: entity.entity_id,
                            })
                                .select("alliance_id name")
                                .lean();
                            if (entityData) {
                                entityDetails.push({
                                    entity_type: "alliance",
                                    entity_id: entity.entity_id,
                                    name: entityData.name,
                                    display_name: entityData.name,
                                    primary: entity.primary || false,
                                    show_in_nav: entity.show_in_nav || false,
                                    show_in_stats:
                                        entity.show_in_stats || false,
                                });
                            }
                            break;

                        case "corporation":
                            entityData = await Corporations.findOne({
                                corporation_id: entity.entity_id,
                            })
                                .select("corporation_id name")
                                .lean();
                            if (entityData) {
                                entityDetails.push({
                                    entity_type: "corporation",
                                    entity_id: entity.entity_id,
                                    name: entityData.name,
                                    display_name: entityData.name,
                                    primary: entity.primary || false,
                                    show_in_nav: entity.show_in_nav || false,
                                    show_in_stats:
                                        entity.show_in_stats || false,
                                });
                            }
                            break;

                        case "character":
                            entityData = await Characters.findOne({
                                character_id: entity.entity_id,
                            })
                                .select("character_id name")
                                .lean();
                            if (entityData) {
                                entityDetails.push({
                                    entity_type: "character",
                                    entity_id: entity.entity_id,
                                    name: entityData.name,
                                    display_name: entityData.name,
                                    primary: entity.primary || false,
                                    show_in_nav: entity.show_in_nav || false,
                                    show_in_stats:
                                        entity.show_in_stats || false,
                                });
                            }
                            break;
                    }
                } catch (entityError) {
                    console.error(
                        `Failed to fetch ${entity.entity_type} ${entity.entity_id}:`,
                        entityError
                    );
                    // Add placeholder entry for missing entities
                    entityDetails.push({
                        entity_type: entity.entity_type,
                        entity_id: entity.entity_id,
                        name: `Unknown ${entity.entity_type}`,
                        display_name: `${entity.entity_type
                            .charAt(0)
                            .toUpperCase()}${entity.entity_type.slice(1)} ${
                            entity.entity_id
                        }`,
                        primary: entity.primary || false,
                        show_in_nav: entity.show_in_nav || false,
                        show_in_stats: entity.show_in_stats || false,
                        missing: true,
                    });
                }
            }

            return {
                success: true,
                domain: domain,
                entities: entityDetails,
                total: entityDetails.length,
            };
        } catch (error: any) {
            console.error("Domain entities API error:", error);

            if (error.statusCode) {
                throw error;
            }

            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch domain entities",
            });
        }
    },
    {
        maxAge: 60 * 15, // Cache for 15 minutes (entities don't change frequently)
        staleMaxAge: 60 * 60, // Serve stale for up to 1 hour
        swr: true,
        base: "redis",
        getKey: (event) => {
            const domain = getRouterParam(event, "domain");
            return `domain:entities:${domain}:v1`;
        },
    }
);
