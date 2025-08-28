export default defineCachedEventHandler(
    async (event) => {
        try {
            const query = getQuery(event as any);
            const domainName = query.domain as string;

            if (!domainName) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Domain parameter is required",
                });
            }

            // Find the domain configuration
            const domainConfig = await CustomDomains.findOne({
                domain: domainName,
                active: true,
            }).select({
                domain: 1,
                entity_type: 1,
                entity_id: 1,
                entities: 1,
                branding: 1,
                navigation: 1,
                page_config: 1,
                features: 1,
                verified: 1,
                active: 1,
            });

            if (!domainConfig) {
                // Check if domain exists but is not verified/active
                const unverifiedDomain = await CustomDomains.findOne({
                    domain: domainName,
                }).select({
                    domain: 1,
                    verified: 1,
                    active: 1,
                    owner_character_id: 1,
                });

                if (unverifiedDomain) {
                    // Domain exists but is not verified/active - return special error
                    throw createError({
                        statusCode: 403,
                        statusMessage: "Domain not verified",
                        data: {
                            domain: domainName,
                            verified: unverifiedDomain.verified,
                            active: unverifiedDomain.active,
                            type: "domain_unverified",
                        },
                    });
                }

                // Domain doesn't exist at all
                throw createError({
                    statusCode: 404,
                    statusMessage: "Domain not found",
                });
            }

            return {
                success: true,
                data: domainConfig,
            };
        } catch (error) {
            console.error("Error in domain lookup:", error);

            // Re-throw createError errors as-is
            if (error && typeof error === "object" && "statusCode" in error) {
                throw error;
            }

            throw createError({
                statusCode: 500,
                statusMessage: "Internal server error",
            });
        }
    },
    {
        maxAge: 5,
        staleMaxAge: 0,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event as any);
            return `domain:lookup:${query.domain}`;
        },
    }
);
