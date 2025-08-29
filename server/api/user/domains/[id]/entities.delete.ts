/**
 * Delete entity from domain using query parameters
 * Route: DELETE /api/user/domains/{id}/entities?entity_type=alliance&entity_id=12345
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

    // Find the domain
    const domain = await CustomDomains.findOne({
        domain_id: domainId,
        owner_character_id: user.characterId,
    });

    if (!domain) {
        throw createError({
            statusCode: 404,
            statusMessage: "Domain not found or access denied",
        });
    }

    const query = getQuery(event);
    const entityType = query.entity_type as string;
    const entityIdStr = query.entity_id as string;

    if (!entityType || !entityIdStr) {
        throw createError({
            statusCode: 400,
            statusMessage: "entity_type and entity_id are required for DELETE",
        });
    }

    const entityId = parseInt(entityIdStr);

    if (isNaN(entityId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "entity_id must be a valid number",
        });
    }

    // Find the entity index
    const entityIndex = domain.entities.findIndex(
        (e: any) => e.entity_type === entityType && e.entity_id === entityId
    );

    if (entityIndex === -1) {
        throw createError({
            statusCode: 404,
            statusMessage: "Entity not found in this domain",
        });
    }

    // Don't allow deleting the last entity
    if (domain.entities.length <= 1) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "Cannot delete the last entity from a domain. A domain must have at least one entity.",
        });
    }

    // Get the entity that will be removed
    const entityToRemove = domain.entities[entityIndex];

    // Remove the entity
    domain.entities.splice(entityIndex, 1);

    // If the removed entity was primary, make the first remaining entity primary
    if (entityToRemove.primary && domain.entities.length > 0) {
        domain.entities[0].primary = true;
    }

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
        message: "Entity removed successfully",
        removed_entity: {
            entity_type: entityType,
            entity_id: entityId,
        },
        total_entities: domain.entities.length,
    };
});
