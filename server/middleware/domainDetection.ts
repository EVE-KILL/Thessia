// Domain detection middleware for custom killboard domains
import type { H3Event } from "h3";
import type { IDomainContext } from "../interfaces/ICustomDomain";

// Cache for domain configurations to avoid database hits on every request
const domainCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
    data: any;
    timestamp: number;
}

/**
 * Get domain configuration with caching
 */
async function getDomainConfig(domain: string) {
    const cacheKey = `domain:${domain}`;
    const cached = domainCache.get(cacheKey) as CacheEntry;

    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    // Fetch from database
    try {
        // For localhost domains in development, skip verification requirement
        const isLocalhostDomain = domain.includes(".localhost");
        const query = isLocalhostDomain
            ? { domain: domain.toLowerCase() }
            : {
                  domain: domain.toLowerCase(),
                  active: true,
                  verified: true,
              };

        console.log(`🔍 [DB DEBUG] Searching for domain: "${domain}"`);
        console.log(`🔍 [DB DEBUG] Is localhost domain: ${isLocalhostDomain}`);
        console.log(`🔍 [DB DEBUG] Query:`, JSON.stringify(query, null, 2));

        const config = await CustomDomains.findOne(query);
        console.log(`🔍 [DB DEBUG] Found config:`, config ? "YES" : "NO");

        if (config) {
            console.log(`🔍 [DB DEBUG] Config details:`, {
                domain: config.domain,
                entity_type: config.entity_type,
                entity_id: config.entity_id,
                active: config.active,
                verified: config.verified,
            });
        } else {
            // Let's see what's actually in the database
            console.log(
                `🔍 [DB DEBUG] No config found. Let's check what domains exist...`
            );
            const allDomains = await CustomDomains.find({
                domain: domain.toLowerCase(),
            }).limit(5);
            console.log(
                `🔍 [DB DEBUG] All domains with name "${domain.toLowerCase()}":`,
                allDomains.map((d) => ({
                    domain: d.domain,
                    active: d.active,
                    verified: d.verified,
                    _id: d._id,
                }))
            );

            // Also check if there are any domains at all
            const totalDomains = await CustomDomains.countDocuments({});
            console.log(
                `🔍 [DB DEBUG] Total domains in database:`,
                totalDomains
            );
        }

        // Cache the result (including null results to avoid repeated DB queries)
        domainCache.set(cacheKey, {
            data: config,
            timestamp: Date.now(),
        });

        console.log(`🔍 [DB DEBUG] Returning config:`, config ? "YES" : "NO");
        return config;
    } catch (error) {
        console.error(
            `🔍 [DB DEBUG] Error fetching domain config for ${domain}:`,
            error
        );
        return null;
    }
}

/**
 * Get entity data based on type and ID
 */
async function getEntityData(entityType: string, entityId: number) {
    try {
        switch (entityType) {
            case "character":
                return await Characters.findOne({ character_id: entityId });
            case "corporation":
                return await Corporations.findOne({ corporation_id: entityId });
            case "alliance":
                return await Alliances.findOne({ alliance_id: entityId });
            default:
                return null;
        }
    } catch (error) {
        console.error(
            `Error fetching entity data for ${entityType}:${entityId}:`,
            error
        );
        return null;
    }
}

/**
 * Check if domain is eve-kill.com or subdomain
 */
function isEveKillDomain(host: string): boolean {
    if (!host) return false;

    // List of official eve-kill domains
    const eveKillDomains = [
        "eve-kill.com",
        "www.eve-kill.com",
        "api.eve-kill.com",
        "ws.eve-kill.com",
        "images.eve-kill.com",
    ];

    // Check exact matches
    if (eveKillDomains.includes(host.toLowerCase())) {
        return true;
    }

    // Check for localhost and development domains
    // But allow subdomains of localhost to be treated as custom domains
    if (
        host === "localhost" ||
        host.includes("127.0.0.1") ||
        host.includes("0.0.0.0")
    ) {
        return true;
    }

    return false;
}

/**
 * Update domain analytics and rate limiting
 */
async function updateDomainMetrics(domainConfig: any, event: H3Event) {
    if (!domainConfig) return;

    try {
        // Check rate limiting
        if (!domainConfig.checkRateLimit()) {
            throw createError({
                statusCode: 429,
                statusMessage: "Rate limit exceeded for this domain",
            });
        }

        // Increment rate limit counter
        domainConfig.incrementRateLimit();

        // Update analytics if enabled
        if (domainConfig.analytics_enabled) {
            const url = getRequestURL(event);
            await domainConfig.updateAnalytics(url.pathname);
        }

        // Update last accessed time
        domainConfig.last_accessed = new Date();
        await domainConfig.save();
    } catch (error) {
        console.error("Error updating domain metrics:", error);
        // Don't block the request if analytics fail
    }
}

/**
 * Clear domain cache entry
 */
export function clearDomainCache(domain: string) {
    domainCache.delete(`domain:${domain}`);
}

/**
 * Clear all domain cache (useful for admin operations)
 */
export function clearAllDomainCache() {
    domainCache.clear();
}

/**
 * Main domain detection middleware
 */
export default defineEventHandler(async (event: H3Event) => {
    // Skip for API routes that don't need domain context
    const url = getRequestURL(event);
    if (
        url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/user/domains")
    ) {
        return;
    }

    // Skip for static assets
    if (
        url.pathname.match(
            /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/
        )
    ) {
        return;
    }

    const host = getHeader(event, "host");

    // DEBUG: Log all domain detection attempts
    console.log(`🔍 [DOMAIN DEBUG] Request to: ${url.pathname}`);
    console.log(`🔍 [DOMAIN DEBUG] Host header: "${host}"`);

    if (!host) {
        console.log(
            `🔍 [DOMAIN DEBUG] No host header - setting default context`
        );
        // No host header, set default context
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    // Remove port from host if present
    const cleanHost = host.split(":")[0];
    console.log(`🔍 [DOMAIN DEBUG] Clean host: "${cleanHost}"`);

    // Check if this is an eve-kill domain
    const isEveKill = isEveKillDomain(cleanHost);
    console.log(`🔍 [DOMAIN DEBUG] Is eve-kill domain: ${isEveKill}`);

    if (isEveKill) {
        console.log(
            `🔍 [DOMAIN DEBUG] Treating as eve-kill domain - setting default context`
        );
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    console.log(
        `🔍 [DOMAIN DEBUG] Checking for custom domain config in database...`
    );
    // This could be a custom domain, check our database
    const domainConfig = await getDomainConfig(cleanHost);
    console.log(
        `🔍 [DOMAIN DEBUG] getDomainConfig returned:`,
        domainConfig ? "FOUND" : "NULL"
    );
    console.log(`🔍 [DOMAIN DEBUG] domainConfig type:`, typeof domainConfig);
    console.log(`🔍 [DOMAIN DEBUG] domainConfig value:`, domainConfig);
    console.log(
        `🔍 [DOMAIN DEBUG] domainConfig === null:`,
        domainConfig === null
    );
    console.log(
        `🔍 [DOMAIN DEBUG] domainConfig === undefined:`,
        domainConfig === undefined
    );
    console.log(
        `🔍 [DOMAIN DEBUG] Boolean(domainConfig):`,
        Boolean(domainConfig)
    );

    if (!domainConfig) {
        console.log(
            `🔍 [DOMAIN DEBUG] No domain config found - treating as eve-kill domain`
        );
        // Unknown domain, treat as eve-kill.com but log for monitoring
        console.log(`Unknown domain accessed: ${cleanHost}`);
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    console.log(`🔍 [DOMAIN DEBUG] Found domain config:`, {
        domain: domainConfig.domain,
        entity_type: domainConfig.entity_type,
        entity_id: domainConfig.entity_id,
        active: domainConfig.active,
        verified: domainConfig.verified,
        suspended: domainConfig.suspended,
    });

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

    // Get entity data
    const entity = await getEntityData(
        domainConfig.entity_type,
        domainConfig.entity_id
    );

    if (!entity) {
        console.error(
            `Entity not found for domain ${cleanHost}: ${domainConfig.entity_type}:${domainConfig.entity_id}`
        );
        // Fall back to normal eve-kill behavior
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    // Update domain metrics in background
    updateDomainMetrics(domainConfig, event).catch((err) => {
        console.error("Background metrics update failed:", err);
    });

    // Set up domain context for the request
    event.context.domainContext = {
        isCustomDomain: true,
        domain: cleanHost,
        config: domainConfig,
        entity: entity,
        entityType: domainConfig.entity_type,
    } as IDomainContext;

    // Add domain-specific headers
    setHeader(event, "X-Custom-Domain", cleanHost);
    setHeader(event, "X-Entity-Type", domainConfig.entity_type);
    setHeader(event, "X-Entity-ID", domainConfig.entity_id.toString());

    // Set Cache-Control headers for custom domains
    if (domainConfig.analytics_enabled) {
        setHeader(event, "Cache-Control", "public, max-age=300"); // 5 minutes
    } else {
        setHeader(event, "Cache-Control", "public, max-age=3600"); // 1 hour
    }
});
