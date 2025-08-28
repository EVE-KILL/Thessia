export default defineEventHandler(async (event) => {
    const query = getQuery(event as any);
    const domainName = query.domain as string;

    if (
        !domainName ||
        typeof domainName !== "string" ||
        domainName.trim().length === 0
    ) {
        throw createError({
            statusCode: 400,
            statusMessage: "Valid domain parameter is required",
        });
    }

    // Normalize domain name
    const normalizedDomain = domainName.toLowerCase().trim();

    // First, try to find an active and verified domain
    const domainConfig = await CustomDomains.findOne({
        domain: normalizedDomain,
        active: true,
        verified: true,
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
        suspended: 1,
        suspension_reason: 1,
        expires_at: 1,
    });

    if (domainConfig) {
        // Check if domain is suspended
        if (domainConfig.suspended) {
            throw createError({
                statusCode: 503,
                statusMessage:
                    domainConfig.suspension_reason ||
                    "Domain temporarily suspended",
            });
        }

        // Check if domain has expired
        if (domainConfig.expires_at && domainConfig.expires_at < new Date()) {
            throw createError({
                statusCode: 410,
                statusMessage: "Domain registration has expired",
            });
        }

        return {
            success: true,
            data: domainConfig,
        };
    }

    // If not found with active+verified, check if domain exists at all
    const anyDomain = await CustomDomains.findOne({
        domain: normalizedDomain,
    }).select({
        domain: 1,
        verified: 1,
        active: 1,
        suspended: 1,
        suspension_reason: 1,
        expires_at: 1,
        owner_character_id: 1,
    });

    if (anyDomain) {
        // Check suspension first
        if (anyDomain.suspended) {
            throw createError({
                statusCode: 503,
                statusMessage:
                    anyDomain.suspension_reason ||
                    "Domain temporarily suspended",
            });
        }

        // Check expiration
        if (anyDomain.expires_at && anyDomain.expires_at < new Date()) {
            throw createError({
                statusCode: 410,
                statusMessage: "Domain registration has expired",
            });
        }

        // Domain exists but is not verified or not active
        throw createError({
            statusCode: 403,
            statusMessage: "Domain not verified or not active",
            data: {
                domain: normalizedDomain,
                verified: anyDomain.verified,
                active: anyDomain.active,
                type: "domain_unverified",
            },
        });
    }

    // Domain doesn't exist at all
    throw createError({
        statusCode: 404,
        statusMessage: "Domain not found",
        data: {
            domain: normalizedDomain,
            type: "domain_not_found",
        },
    });
});
