import { clearDomainCache } from "../../middleware/domainDetection";
import { getDomainWithCacheCheck } from "../../utils/domainCacheManager";

export default defineEventHandler(async (event) => {
    const query = getQuery(event as any);
    const domainName = query.domain as string;
    const timestamp = query._t; // Cache busting timestamp
    const clearCache = query.clearCache === "true"; // Explicit cache clearing

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

    // Log cache busting requests for debugging (minimal)
    if (timestamp && clearCache) {
        console.log(`[Domain API] Cache bust: ${domainName}`);
    }

    // Clear middleware cache if requested
    if (clearCache) {
        clearDomainCache(domainName);
    }

    // Normalize domain name
    const normalizedDomain = domainName.toLowerCase().trim();

    try {
        // Use database-driven cache check that automatically invalidates on DB changes
        const domainConfig = await getDomainWithCacheCheck(normalizedDomain);

        if (!domainConfig) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
                data: {
                    domain: normalizedDomain,
                    type: "domain_not_found",
                },
            });
        }

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

        // Check if domain is not active or verified
        if (!domainConfig.active || !domainConfig.verified) {
            throw createError({
                statusCode: 403,
                statusMessage: "Domain not verified or not active",
                data: {
                    domain: normalizedDomain,
                    verified: domainConfig.verified,
                    active: domainConfig.active,
                    type: "domain_unverified",
                },
            });
        }

        // Return the complete configuration
        return {
            success: true,
            data: domainConfig,
        };
    } catch (error: any) {
        // Re-throw HTTP errors
        if (error.statusCode) {
            throw error;
        }

        console.error(
            `[Domain Lookup API] Error fetching domain configuration for ${normalizedDomain}:`,
            error
        );
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch domain configuration",
        });
    }
});
