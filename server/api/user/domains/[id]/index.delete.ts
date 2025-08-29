import { invalidateUserCache } from "../../../../helpers/domainCache";
import { invalidateDomainCache } from "../../../../utils/domainCacheManager";

export default defineEventHandler(async (event) => {
    try {
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

        // Clear domain cache before deletion
        await invalidateDomainCache(domain.domain);

        // Delete the domain
        await CustomDomains.findOneAndDelete({
            domain_id: domainId,
            owner_character_id: user.characterId,
        });

        // Also invalidate user cache
        await invalidateUserCache(user.characterId.toString());

        return {
            success: true,
            message: "Domain deleted successfully",
            data: {
                id: domainId,
                domain: domain.domain,
                deletedAt: new Date(),
            },
        };
    } catch (error: any) {
        const domainId = getRouterParam(event, "id");
        console.error(`Error deleting domain ${domainId}:`, error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete domain",
        });
    }
});
