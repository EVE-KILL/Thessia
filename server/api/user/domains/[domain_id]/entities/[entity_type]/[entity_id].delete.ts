/**
 * Remove entity from a custom domain - Phase 2
 */
export default defineEventHandler(async (event) => {
    // Only allow DELETE method
    if (getMethod(event) !== "DELETE") {
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
        const entityType = getRouterParam(event, "entity_type");
        const entityId = parseInt(getRouterParam(event, "entity_id") || "0");

        if (!entityId || !entityType) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid entity parameters",
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

        // Check if this would leave no entities
        if (domain.entities.length <= 1) {
            throw createError({
                statusCode: 400,
                statusMessage: "Cannot remove last entity from domain",
            });
        }

        // Find and remove the entity
        const entityIndex = domain.entities.findIndex(
            (e) => e.entity_type === entityType && e.entity_id === entityId
        );

        if (entityIndex === -1) {
            throw createError({
                statusCode: 404,
                statusMessage: "Entity not found in domain",
            });
        }

        const removedEntity = domain.entities[entityIndex];
        const wasPrimary = removedEntity.primary;

        // Remove the entity
        domain.entities.splice(entityIndex, 1);

        // If we removed the primary entity, make the first remaining entity primary
        if (wasPrimary && domain.entities.length > 0) {
            domain.entities[0].primary = true;
        }

        await domain.save();

        // Clear domain cache
        const { clearDomainCache } = await import(
            "../../../../../../middleware/domainDetection"
        );
        clearDomainCache(domain.domain);

        return {
            success: true,
            message: "Entity removed successfully",
            removed_entity: removedEntity,
            new_primary: wasPrimary ? domain.entities[0] : undefined,
        };
    } catch (error: any) {
        console.error("Error removing entity from domain:", error);

        // Re-throw if it's already a createError
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to remove entity from domain",
        });
    }
});
