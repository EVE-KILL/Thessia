import { CharacterService, UserService, CustomDomainService, CorporationService, AllianceService } from "~/server/services";

/**
 * Add an entity to a custom domain
 * Route: POST /api/user/domains/{id}/entities
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

    // Find the user by uniqueIdentifier using service
    const user = await UserService.findByUniqueIdentifier(cookie);

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

    // Find the domain using service
    const domain = await CustomDomainService.findByDomainIdAndOwner(
        domainId,
        user.character_id
    );

    if (!domain) {
        throw createError({
            statusCode: 404,
            statusMessage: "Domain not found or access denied",
        });
    }

    const body = await readBody(event);

    // Validate required fields
    if (!body.entity_type || !body.entity_id) {
        throw createError({
            statusCode: 400,
            statusMessage: "entity_type and entity_id are required",
        });
    }

    // Check if entity already exists
    const existingEntity = domain.entities.find(
        (e: any) =>
            e.entity_type === body.entity_type && e.entity_id === body.entity_id
    );

    if (existingEntity) {
        throw createError({
            statusCode: 409,
            statusMessage: "Entity already exists in this domain",
        });
    }

    // Validate entity exists in game data
    let entityData = null;
    try {
        switch (body.entity_type) {
            case "alliance":
                entityData = await AllianceService.findById(body.entity_id);
                break;
            case "corporation":
                entityData = await CorporationService.findById(body.entity_id);
                break;
            case "character":
                entityData = await CharacterService.findById(body.entity_id);
                break;
        }
    } catch (error) {
        console.error(
            `Error validating ${body.entity_type} ${body.entity_id}:`,
            error
        );
    }

    if (!entityData) {
        throw createError({
            statusCode: 404,
            statusMessage: `${body.entity_type} with ID ${body.entity_id} not found in game data`,
        });
    }

    // Create the new entity
    const newEntity = {
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        show_in_nav: body.show_in_nav !== undefined ? body.show_in_nav : true,
        show_in_stats:
            body.show_in_stats !== undefined ? body.show_in_stats : true,
        primary: body.primary !== undefined ? body.primary : false,
    };

    // If this is set as primary, unset any existing primary entities
    if (newEntity.primary) {
        domain.entities.forEach((entity: any) => {
            entity.primary = false;
        });
    }

    // Add the entity to the domain
    domain.entities.push(newEntity);

    // Save the updated domain
    await domain.save();

    // Clear domain caches since entities changed
    try {
        const { invalidateDomainCache } = await import(
            "../../../../utils/domainCacheManager"
        );
        await invalidateDomainCache(domain.domain);
    } catch (cacheError) {
        console.warn("Failed to clear domain caches:", cacheError);
    }

    return {
        success: true,
        message: "Entity added successfully",
        entity: newEntity,
        entity_name: entityData.name,
        total_entities: domain.entities.length,
    };
});
