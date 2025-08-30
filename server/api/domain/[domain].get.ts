export default defineEventHandler(async (event) => {
    try {
        const domain = getRouterParam(event, "domain") as string;

        if (!domain) {
            throw createError({
                statusCode: 400,
                statusMessage: "Domain parameter is required",
            });
        }

        // Find the domain in the database
        const domainData = await CustomDomains.findOne({
            domain: domain.toLowerCase(),
        }).lean();

        if (!domainData) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        if (!domainData.verified) {
            throw createError({
                statusCode: 403,
                statusMessage: "Domain not verified",
            });
        }

        if (!domainData.active) {
            throw createError({
                statusCode: 403,
                statusMessage: "Domain not active",
            });
        }

        // Return the domain configuration
        return {
            success: true,
            data: {
                domain: domainData.domain,
                owner_character_id: domainData.owner_character_id,
                verified: domainData.verified,
                active: domainData.active,
                entities: domainData.entities || [],
                navigation: domainData.navigation || {},
                configuration: domainData.configuration || {},
                dashboard_template: domainData.dashboard_template || {},
            },
        };
    } catch (error: any) {
        console.error(`[Domain API] Error fetching domain:`, error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
        });
    }
});
