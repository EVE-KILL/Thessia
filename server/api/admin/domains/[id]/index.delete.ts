import { invalidateDomainCache } from "../../../../utils/domainCacheManager";

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

    // Only allow administrators
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Access denied. Administrator privileges required.",
        });
    }

    const domainId = getRouterParam(event, "id");

    try {
        const domain = await CustomDomains.findById(domainId);

        if (!domain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        // Clear domain cache before deletion
        try {
            await invalidateDomainCache(domain.domain);
        } catch (cacheError) {
            console.warn("Failed to clear domain cache:", cacheError);
            // Don't fail the deletion due to cache issues
        }

        await CustomDomains.findByIdAndDelete(domainId);

        return {
            success: true,
            message: `Domain ${domain.domain} deleted successfully by administrator ${user.characterName}`,
        };
    } catch (error) {
        console.error("Error deleting domain:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete domain",
        });
    }
});
