/**
 * Add entity to an existing custom domain - Phase 2
 */
export default defineEventHandler(async (event) => {
    // Only allow POST method
    if (getMethod(event) !== "POST") {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
        });
    }

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
        const domainId = getRouterParam(event, "domain_id");
        const body = await readBody(event);

        // Validate required fields
        if (!body.entity_type || !body.entity_id) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Missing required fields: entity_type, entity_id",
            });
        }

        // Find the domain
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

        // Check if domain would exceed entity limit
        if (domain.entities.length >= 10) {
            throw createError({
                statusCode: 400,
                statusMessage: "Maximum 10 entities allowed per domain",
            });
        }

        // Check if entity already exists in domain
        const entityExists = domain.entities.some(
            (e) =>
                e.entity_type === body.entity_type &&
                e.entity_id === body.entity_id
        );

        if (entityExists) {
            throw createError({
                statusCode: 409,
                statusMessage: "Entity already exists in this domain",
            });
        }

        // Validate entity type
        if (
            !["character", "corporation", "alliance"].includes(body.entity_type)
        ) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Invalid entity type. Must be character, corporation, or alliance",
            });
        }

        // PHASE 2: Remove permission restrictions - allow any public entity
        // Users can now add any character, corporation, or alliance that exists
        // This enables true multi-entity domains for showcasing multiple entities

        // Verify the entity exists
        let entityExists2 = false;
        switch (body.entity_type) {
            case "character":
                entityExists2 = !!(await Characters.findOne({
                    character_id: body.entity_id,
                }));
                break;
            case "corporation":
                entityExists2 = !!(await Corporations.findOne({
                    corporation_id: body.entity_id,
                }));
                break;
            case "alliance":
                entityExists2 = !!(await Alliances.findOne({
                    alliance_id: body.entity_id,
                }));
                break;
        }

        if (!entityExists2) {
            throw createError({
                statusCode: 404,
                statusMessage: `Entity ${body.entity_type} ${body.entity_id} not found`,
            });
        }

        // Create entity configuration
        const entityConfig = {
            entity_type: body.entity_type,
            entity_id: body.entity_id,
            display_name: body.display_name || undefined,
            show_in_nav: body.show_in_nav !== false,
            show_in_stats: body.show_in_stats !== false,
            primary: body.primary === true,
            color_code: body.color_code || undefined,
        };

        // If this is set as primary, unset other primaries
        if (entityConfig.primary) {
            domain.entities.forEach((entity) => {
                entity.primary = false;
            });
        }

        // Add the entity
        domain.entities.push(entityConfig);
        await domain.save();

        // Clear domain cache
        const { clearDomainCache } = await import(
            "../../../../../middleware/domainDetection"
        );
        clearDomainCache(domain.domain);

        return {
            success: true,
            message: "Entity added successfully",
            entity: entityConfig,
        };
    } catch (error: any) {
        console.error("Error adding entity to domain:", error);

        // Re-throw if it's already a createError
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to add entity to domain",
        });
    }
});
