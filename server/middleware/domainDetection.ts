// Domain detection middleware for custom killboard domains - Phase 2
import type { H3Event } from "h3";
import {
    createError,
    defineEventHandler,
    getHeader,
    getRequestURL,
    setHeader,
} from "h3";
import type {
    IDomainContext,
    IEntityConfig,
} from "../interfaces/ICustomDomain";
import { Alliances } from "../models/Alliances";
import { Characters } from "../models/Characters";
import { Corporations } from "../models/Corporations";
import { CustomDomains } from "../models/CustomDomains";

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
        // Always query by domain only - we'll check verification status later
        const query = { domain: domain.toLowerCase() };

        const config = await CustomDomains.findOne(query).select({
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

        // Cache the result (including null results to avoid repeated DB queries)
        domainCache.set(cacheKey, {
            data: config,
            timestamp: Date.now(),
        });

        return config;
    } catch (error) {
        console.error(`Error fetching domain config for ${domain}:`, error);
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
 * PHASE 2: Get multiple entity data for multi-entity domains
 */
async function getMultipleEntityData(entityConfigs: IEntityConfig[]) {
    const entities: any[] = [];
    let primaryEntity: any = null;

    for (const entityConfig of entityConfigs) {
        const entity = await getEntityData(
            entityConfig.entity_type,
            entityConfig.entity_id
        );
        if (entity) {
            // Enhance entity with display configuration
            const enhancedEntity = {
                ...entity.toObject(),
                _entityConfig: entityConfig, // Add configuration metadata
            };

            entities.push(enhancedEntity);

            // Track primary entity
            if (entityConfig.primary) {
                primaryEntity = enhancedEntity;
            }
        }
    }

    // If no primary found but we have entities, use the first one
    if (!primaryEntity && entities.length > 0) {
        primaryEntity = entities[0];
    }

    return { entities, primaryEntity };
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
    // Only exact localhost matches, not subdomains
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
        return true;
    }

    return false;
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
 * Clear all caches related to a specific domain (middleware + Redis)
 * This clears both the middleware cache and the Redis cached API responses
 */
export async function clearAllDomainCaches(domain: string) {
    // Clear middleware cache (instant)
    clearDomainCache(domain);

    // Clear Redis-cached API responses for this domain (with timeout)
    const clearRedisCache = async () => {
        try {
            const redis = useStorage("redis");

            // Clear specific known cache keys for this domain
            const keysToTry = [
                // Domain entities cache
                `nitro:handlers:api:domain:${domain}:entities.get.json`,

                // Domain stats cache for different time ranges
                `nitro:handlers:api:domain:${domain}:stats.get:timeRange=1d.json`,
                `nitro:handlers:api:domain:${domain}:stats.get:timeRange=7d.json`,
                `nitro:handlers:api:domain:${domain}:stats.get:timeRange=30d.json`,
                `nitro:handlers:api:domain:${domain}:stats.get:timeRange=90d.json`,
                `nitro:handlers:api:domain:${domain}:stats.get:timeRange=all.json`,

                // Domain campaigns cache
                `nitro:handlers:api:domain:${domain}:campaigns.get.json`,

                // Domain killmails cache
                `nitro:handlers:api:domain:${domain}:killmails.get.json`,
            ];

            let clearedCount = 0;
            for (const key of keysToTry) {
                try {
                    const exists = await redis.hasItem(key);
                    if (exists) {
                        await redis.removeItem(key);
                        clearedCount++;
                        console.log(
                            `[Domain Detection] Cleared Redis cache key: ${key}`
                        );
                    }
                } catch (keyError: any) {
                    // Skip individual key errors
                    console.warn(
                        `[Domain Detection] Could not clear key ${key}:`,
                        keyError?.message || keyError
                    );
                }
            }

            console.log(
                `[Domain Detection] Cleared ${clearedCount} Redis cache keys for domain: ${domain}`
            );
        } catch (error) {
            console.error(
                `[Domain Detection] Error clearing Redis caches for domain ${domain}:`,
                error
            );
            throw error;
        }
    };

    // Run Redis clearing with timeout to prevent hanging
    try {
        await Promise.race([
            clearRedisCache(),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error("Redis cache clearing timed out")),
                    5000
                )
            ),
        ]);
    } catch (error: any) {
        console.warn(
            `[Domain Detection] Redis cache clearing failed or timed out for domain ${domain}:`,
            error.message
        );
        // Don't throw - middleware cache clearing still worked
    }
}

/**
 * Enhanced domain detection middleware - Phase 2 with improved error handling
 */
export default defineEventHandler(async (event: H3Event) => {
    // Skip for API routes that don't need domain context (except domain-specific APIs)
    const url = getRequestURL(event);
    if (
        url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/user/domains") &&
        !url.pathname.startsWith("/api/domain/") &&
        !url.pathname.startsWith("/api/domains/")
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
    const userAgent = getHeader(event, "user-agent") || "";

    if (!host) {
        // No host header, set default context
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    // Remove port from host if present
    const cleanHost = host.split(":")[0];

    // Log domain access for debugging
    console.log(
        `[Domain Detection] Checking domain: ${cleanHost}, Path: ${
            url.pathname
        }, User-Agent: ${userAgent.substring(0, 100)}`
    );

    // Check if this is an eve-kill domain
    const isEveKill = isEveKillDomain(cleanHost);

    if (isEveKill) {
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    // This could be a custom domain, check our database
    let domainConfig;
    try {
        domainConfig = await getDomainConfig(cleanHost);
    } catch (error) {
        console.error(
            `[Domain Detection] Database error for domain ${cleanHost}:`,
            error
        );
        // Set error context instead of crashing
        event.context.domainContext = {
            isCustomDomain: true,
            domain: cleanHost,
            error: {
                type: "domain_not_found",
                message: "Database error occurred during domain lookup",
            },
        } as IDomainContext;
        return;
    }

    if (!domainConfig) {
        // Unknown domain - set error context for proper error handling
        console.log(`[Domain Detection] Unknown domain accessed: ${cleanHost}`);
        event.context.domainContext = {
            isCustomDomain: true,
            domain: cleanHost,
            error: {
                type: "domain_not_found",
                message: "Domain not found in system",
            },
        } as IDomainContext;
        return;
    }

    // Enhanced verification and activation checks
    const isLocalhostDomain =
        cleanHost.includes(".localhost") ||
        cleanHost.includes("127.0.0.1") ||
        cleanHost.includes("0.0.0.0");

    // Check domain status in order of precedence

    // 1. Check if domain is suspended first
    if (domainConfig.suspended) {
        console.log(
            `[Domain Detection] Suspended domain accessed: ${cleanHost}, reason: ${domainConfig.suspension_reason}`
        );
        throw createError({
            statusCode: 503,
            statusMessage:
                domainConfig.suspension_reason ||
                "Domain temporarily suspended",
        });
    }

    // 2. Check if domain has expired
    if (domainConfig.expires_at && domainConfig.expires_at < new Date()) {
        console.log(
            `[Domain Detection] Expired domain accessed: ${cleanHost}, expired at: ${domainConfig.expires_at}`
        );
        throw createError({
            statusCode: 410,
            statusMessage: "Domain registration has expired",
        });
    }

    // 3. Check verification status (applies to all domains except localhost in dev)
    if (!domainConfig.verified) {
        console.log(
            `[Domain Detection] Unverified domain accessed: ${cleanHost}, verified: ${domainConfig.verified}`
        );
        event.context.domainContext = {
            isCustomDomain: true,
            domain: cleanHost,
            config: domainConfig,
            error: {
                type: "domain_unverified",
                message: "Domain exists but is not verified",
            },
        } as IDomainContext;
        return;
    }

    // 4. Check activation status (only for non-localhost domains)
    if (!isLocalhostDomain && !domainConfig.active) {
        console.log(
            `[Domain Detection] Inactive domain accessed: ${cleanHost}, active: ${domainConfig.active}`
        );
        event.context.domainContext = {
            isCustomDomain: true,
            domain: cleanHost,
            config: domainConfig,
            error: {
                type: "domain_unverified",
                message: "Domain is not active",
            },
        } as IDomainContext;
        return;
    }

    // 5. Validate entities exist and are configured properly
    if (!domainConfig.entities || domainConfig.entities.length === 0) {
        console.error(
            `[Domain Detection] No entities configured for domain ${cleanHost}`
        );
        event.context.domainContext = {
            isCustomDomain: true,
            domain: cleanHost,
            config: domainConfig,
            error: {
                type: "domain_not_found",
                message: "Domain has no entities configured",
            },
        } as IDomainContext;
        return;
    }

    // PHASE 2: Get multi-entity data with error handling
    let entities, primaryEntity;
    try {
        const entityData = await getMultipleEntityData(domainConfig.entities);
        entities = entityData.entities;
        primaryEntity = entityData.primaryEntity;
    } catch (error) {
        console.error(
            `[Domain Detection] Error fetching entities for domain ${cleanHost}:`,
            error
        );
        event.context.domainContext = {
            isCustomDomain: true,
            domain: cleanHost,
            config: domainConfig,
            error: {
                type: "domain_not_found",
                message: "Error loading domain entities",
            },
        } as IDomainContext;
        return;
    }

    if (!primaryEntity || entities.length === 0) {
        console.error(
            `[Domain Detection] No valid entities found for domain ${cleanHost}: ${
                domainConfig.entities?.length || 0
            } entities configured, ${entities?.length || 0} entities loaded`
        );
        // Set error instead of falling back to normal behavior
        event.context.domainContext = {
            isCustomDomain: true,
            domain: cleanHost,
            config: domainConfig,
            error: {
                type: "domain_not_found",
                message: "Domain entities could not be loaded",
            },
        } as IDomainContext;
        return;
    }

    // PHASE 2: Set up enhanced domain context for the request
    console.log(
        `[Domain Detection] Successfully configured domain: ${cleanHost}, entities: ${entities.length}`
    );
    event.context.domainContext = {
        isCustomDomain: true,
        domain: cleanHost,
        config: domainConfig,

        // Multi-entity support
        entities: entities,
        primaryEntity: primaryEntity,
        entityTypes: entities.map((e: any) => e._entityConfig.entity_type),

        // Legacy single entity support (using primary entity)
        entity: primaryEntity,
        entityType: primaryEntity?._entityConfig?.entity_type,
    } as IDomainContext;

    // Add domain-specific headers
    setHeader(event, "X-Custom-Domain", cleanHost);
    setHeader(
        event,
        "X-Primary-Entity-Type",
        primaryEntity?._entityConfig?.entity_type || "unknown"
    );
    setHeader(
        event,
        "X-Primary-Entity-ID",
        primaryEntity?._entityConfig?.entity_id?.toString() || "unknown"
    );
    setHeader(event, "X-Entity-Count", entities.length.toString());

    // PHASE 2: Simplified cache headers (no more analytics-based logic)
    setHeader(event, "Cache-Control", "public, max-age=1800"); // 30 minutes
});
