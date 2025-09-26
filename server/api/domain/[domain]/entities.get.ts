import { CharacterService, CustomDomainService, AllianceService, CorporationService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        try {
            const domain = getRouterParam(event as any, "domain");

            if (!domain) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Domain parameter is required",
                });
            }

            // Find the domain configuration using service
            const domainConfig = await CustomDomainService.findActiveDomain(domain);

            if (!domainConfig) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Domain not found",
                });
            }

            // Fetch entity details from respective services
            const entityDetails = [];

            for (const entity of domainConfig.entities as any[] || []) {
                let entityData = null;

                try {
                    switch (entity.entity_type) {
                        case "alliance":
                            entityData = await AllianceService.findById(
                                entity.entity_id
                            );
                            if (entityData) {
                                entityDetails.push({
                                    entity_type: "alliance",
                                    entity_id: entity.entity_id,
                                    name: entityData.name,
                                    display_name: entityData.name,
                                    image_url: `https://images.evetech.net/alliances/${entity.entity_id}/logo?size=64`,
                                    primary: entity.primary || false,
                                    show_in_nav: entity.show_in_nav || false,
                                    show_in_stats:
                                        entity.show_in_stats || false,
                                });
                            }
                            break;

                        case "corporation":
                            entityData = await CorporationService.findById(
                                entity.entity_id
                            );
                            if (entityData) {
                                entityDetails.push({
                                    entity_type: "corporation",
                                    entity_id: entity.entity_id,
                                    name: entityData.name,
                                    display_name: entityData.name,
                                    image_url: `https://images.evetech.net/corporations/${entity.entity_id}/logo?size=64`,
                                    primary: entity.primary || false,
                                    show_in_nav: entity.show_in_nav || false,
                                    show_in_stats:
                                        entity.show_in_stats || false,
                                });
                            }
                            break;

                        case "character":
                            entityData = await CharacterService.findById(
                                entity.entity_id
                            );
                            if (entityData) {
                                entityDetails.push({
                                    entity_type: "character",
                                    entity_id: entity.entity_id,
                                    name: entityData.name,
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
                    const imageUrl =
                        entity.entity_type === "character"
                            ? `https://images.evetech.net/characters/${entity.entity_id}/portrait?size=64`
                            : entity.entity_type === "corporation"
                            ? `https://images.evetech.net/corporations/${entity.entity_id}/logo?size=64`
                            : `https://images.evetech.net/alliances/${entity.entity_id}/logo?size=64`;

                    entityDetails.push({
                        entity_type: entity.entity_type,
                        entity_id: entity.entity_id,
                        name: `Unknown ${entity.entity_type}`,
                        display_name: `${entity.entity_type
                            .charAt(0)
                            .toUpperCase()}${entity.entity_type.slice(1)} ${
                            entity.entity_id
                        }`,
                        image_url: imageUrl,
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
        maxAge: 300,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const domain = getRouterParam(event as any, "domain");
            return `domain:entities:${domain}:v1`;
        },
    }
);
