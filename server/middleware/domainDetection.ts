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
        // For localhost domains in development, skip verification requirement
        const isLocalhostDomain = domain.includes(".localhost");
        const query = isLocalhostDomain
            ? { domain: domain.toLowerCase() }
            : {
                  domain: domain.toLowerCase(),
                  active: true,
                  verified: true,
              };

        const config = await CustomDomains.findOne(query);

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
 * PHASE 2: Update domain last accessed time (simplified - no more analytics/rate limiting)
 */
async function updateDomainAccess(domainConfig: any) {
    if (!domainConfig) return;

    try {
        // Simply update last accessed time
        await domainConfig.updateLastAccessed();
    } catch (error) {
        console.error("Error updating domain access time:", error);
        // Don't block the request if update fails
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
 * Main domain detection middleware - Phase 2
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

    if (!host) {
        // No host header, set default context
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    // Remove port from host if present
    const cleanHost = host.split(":")[0];

    // Check if this is an eve-kill domain
    const isEveKill = isEveKillDomain(cleanHost);

    if (isEveKill) {
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    // This could be a custom domain, check our database
    const domainConfig = await getDomainConfig(cleanHost);

    if (!domainConfig) {
        // Unknown domain, treat as eve-kill.com but log for monitoring
        console.log(`Unknown domain accessed: ${cleanHost}`);
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
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

    // PHASE 2: Get multi-entity data
    const { entities, primaryEntity } = await getMultipleEntityData(
        domainConfig.entities
    );

    if (!primaryEntity || entities.length === 0) {
        console.error(
            `No entities found for domain ${cleanHost}: ${
                domainConfig.entities?.length || 0
            } entities configured`
        );
        // Fall back to normal eve-kill behavior
        event.context.domainContext = {
            isCustomDomain: false,
        } as IDomainContext;
        return;
    }

    // Update domain access in background (simplified - no more analytics/rate limiting)
    updateDomainAccess(domainConfig).catch((err) => {
        console.error("Background access update failed:", err);
    });

    // PHASE 2: Set up enhanced domain context for the request
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
