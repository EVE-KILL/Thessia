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
            dashboard_template: 1,
        });

        // Convert Mongoose document to plain object to ensure serializability
        const plainConfig = config ? config.toObject() : null;

        // Cache the result (including null results to avoid repeated DB queries)
        domainCache.set(cacheKey, {
            data: plainConfig,
            timestamp: Date.now(),
        });

        return plainConfig;
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
        let entity = null;
        switch (entityType) {
            case "character":
                entity = await Characters.findOne({ character_id: entityId });
                break;
            case "corporation":
                entity = await Corporations.findOne({
                    corporation_id: entityId,
                });
                break;
            case "alliance":
                entity = await Alliances.findOne({ alliance_id: entityId });
                break;
            default:
                return null;
        }

        // Convert Mongoose document to plain object
        return entity ? entity.toObject() : null;
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
                ...entity, // entity is already a plain object from getEntityData
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
            const specificKeys = [
                // Domain lookup API cache
                `nitro:functions:api:domains:lookup.get:${domain}`,

                // Domain entities cache (actual key pattern from defineCachedEventHandler)
                `domain:entities:${domain}:v1`,
            ];

            let clearedCount = 0;

            // Clear specific keys first
            for (const key of specificKeys) {
                try {
                    const exists = await redis.hasItem(key);
                    if (exists) {
                        await redis.removeItem(key);
                        clearedCount++;
                    }
                } catch (keyError: any) {
                    console.warn(
                        `[Domain Detection] Could not clear key ${key}:`,
                        keyError?.message || keyError
                    );
                }
            }

            // Clear wildcard patterns for hashed cache keys
            // These endpoints use SHA256 hashes in their cache keys
            const wildcardPatterns = [
                `domain:stats:*`, // Stats cache (hashed)
                `domain:campaigns:*`, // Campaigns cache (hashed)
                `domain:killmails:*`, // Killmails cache (hashed)
            ];

            // Try to use Redis KEYS command for pattern matching
            try {
                const redisClient = (redis as any).driver?.base?.client;
                if (redisClient?.keys) {
                    for (const pattern of wildcardPatterns) {
                        try {
                            const matchingKeys = await redisClient.keys(
                                pattern
                            );
                            for (const key of matchingKeys) {
                                try {
                                    await redis.removeItem(key);
                                    clearedCount++;
                                } catch (removeError) {
                                    console.warn(
                                        `[Domain Detection] Failed to remove key ${key}:`,
                                        removeError
                                    );
                                }
                            }
                        } catch (patternError) {
                            console.warn(
                                `[Domain Detection] Could not process pattern ${pattern}:`,
                                patternError
                            );
                        }
                    }
                } else {
                    console.warn(
                        `[Domain Detection] Redis KEYS command not available for wildcard clearing`
                    );
                }
            } catch (wildcardError) {
                console.warn(
                    `[Domain Detection] Wildcard cache clearing failed:`,
                    wildcardError
                );
            }
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
 * Generate default template for domains without custom templates
 */
function generateDefaultTemplate(domain: string): string {
    return `<!-- Hero Section -->
<DomainDashboardHeroSection
  domain="${domain}"
  title="EVE Online Killboard"
  welcome-message="Welcome to our EVE Online killboard"
  secondary-message="Track combat operations, analyze statistics, and monitor space battles across New Eden" />

<!-- Main Dashboard Content -->
<div class="dashboard-container">
  <!-- Time Range Selector -->
  <div class="time-range-section">
    <DomainDashboardTimeRangeSelector v-model="selectedTimeRange" />
  </div>

  <!-- Statistics Grid - 4 Key Metrics in Row -->
  <div class="metrics-grid">
    <div class="metrics-grid-item">
      <DomainDashboardTotalKillsBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="Total Kills"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardISKDestroyedBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="ISK Destroyed"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardTopShipBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="Most Destroyed"
        count-label="destroyed"
        :show-ship-icon="true"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardActiveEntitiesBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="Active Entities"
        entity-type="all"
        size="md"
        class="metric-box" />
    </div>
  </div>

  <!-- Tracking Overview -->
  <div class="dashboard-section">
    <DomainDashboardTrackingOverview
      domain="${domain}"
      :entities="entities"
      :entity-stats="entityStats" />
  </div>

  <!-- Campaigns Section -->
  <div class="dashboard-section">
    <DomainDashboardCampaignsSection
      domain="${domain}"
      :campaigns="campaigns" />
  </div>

  <!-- Most Valuable Kills -->
  <div class="dashboard-section">
    <DomainDashboardMostValuableSection
      domain="${domain}"
      :most-valuable-kills="stats?.mostValuableKills?.slice(0, 7) || []"
      :loading="statsLoading"
      :selected-entity="selectedEntityLabel"
      time-range-label="Recent Activity" />
  </div>

  <!-- Ship Analysis -->
  <div class="dashboard-section">
    <DomainDashboardShipAnalysisSection
      domain="${domain}"
      :stats="stats"
      :loading="statsLoading"
      :selected-entity="selectedEntityLabel"
      time-range-label="Combat Analysis" />
  </div>

  <!-- Bottom Section: Kill List (80%) + Top Boxes (20%) -->
  <div class="bottom-grid">
    <!-- Kill List - 80% width -->
    <div class="kill-list-section">
      <DomainDashboardRecentActivitySection
        domain="${domain}"
        :api-endpoint="killmailsEndpoint"
        :selected-entity="selectedEntityLabel"
        title="Recent Killmails"
        description="Latest combat activity and killmail reports" />
    </div>

    <!-- Top Boxes - 20% width -->
    <div class="top-boxes-section">
      <DomainDashboardTopBoxesSection
        domain="${domain}"
        :top-killers-by-character="stats?.topKillersByCharacter || []"
        :top-killers-by-corporation="stats?.topKillersByCorporation || []"
        :top-killers-by-alliance="stats?.topKillersByAlliance || []"
        :loading="statsLoading"
        :days="selectedTimeRangeDays"
        title="Top Performers"
        show-all-categories="true" />
    </div>
  </div>
</div>`;
}

/**
 * Generate default CSS for domains without custom CSS
 */
function generateDefaultCSS(): string {
    return `/* Dashboard Container */
.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    padding-top: 2rem;
}

/* Time Range Section */
.time-range-section {
    margin-bottom: 2rem;
}

/* Metrics Grid Layout - Force Grid Display */
.dashboard-container .metrics-grid {
    display: grid !important;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 4rem;
    align-items: stretch;
}

/* Responsive grid breakpoints */
@media (min-width: 640px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1.5rem;
    }
}

@media (min-width: 1024px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1.5rem;
    }
}

/* Grid items - equal height and proper display */
.dashboard-container .metrics-grid-item {
    display: flex;
    width: 100%;
    min-height: 200px;
}

/* Metric boxes - expand to fill container completely */
.dashboard-container .metric-box,
.dashboard-container .metrics-grid-item > * {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 200px;
}

/* Dashboard sections spacing */
.dashboard-section {
    margin-bottom: 3rem;
}

/* Bottom section - 80/20 split layout */
.bottom-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-top: 2rem;
}

/* Responsive 80/20 split for larger screens */
@media (min-width: 1280px) {
    .bottom-grid {
        grid-template-columns: 4fr 1fr;
        gap: 2rem;
    }
}

/* Kill list section (80% width on large screens) */
.kill-list-section {
    width: 100%;
    min-width: 0;
}

/* Top boxes section (20% width on large screens) */
.top-boxes-section {
    width: 100%;
    min-width: 0;
}`;
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

    // Skip for healthcheck routes (Kubernetes probes, monitoring)
    if (url.pathname.startsWith("/_healthcheck")) {
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
        throw createError({
            statusCode: 503,
            statusMessage:
                domainConfig.suspension_reason ||
                "Domain temporarily suspended",
        });
    }

    // 2. Check if domain has expired
    if (domainConfig.expires_at && domainConfig.expires_at < new Date()) {
        throw createError({
            statusCode: 410,
            statusMessage: "Domain registration has expired",
        });
    }

    // 3. Check verification status (applies to all domains except localhost in dev)
    if (!domainConfig.verified) {
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

    // Prepare dashboard template data for SSR
    let dashboardTemplate;
    if (
        domainConfig.dashboard_template?.enabled &&
        domainConfig.dashboard_template?.html_template
    ) {
        // Use custom template from domain config
        dashboardTemplate = {
            enabled: true,
            template: domainConfig.dashboard_template.html_template,
            customCss: domainConfig.dashboard_template.custom_css || "",
            isDefault: false,
        };
    } else {
        // Generate default template
        dashboardTemplate = {
            enabled: true,
            template: generateDefaultTemplate(cleanHost),
            customCss: generateDefaultCSS(),
            isDefault: true,
        };
    }

    // Create the full domain context
    const fullDomainContext = {
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

        // Dashboard template data (for SSR)
        dashboardTemplate: dashboardTemplate,
    };

    // JSON encode/decode the entire context to ensure complete serialization
    const serializedContext = JSON.parse(JSON.stringify(fullDomainContext));

    event.context.domainContext = serializedContext as IDomainContext;

    // Store domain context in event headers for client access
    setHeader(
        event,
        "X-Domain-Context",
        JSON.stringify({
            isCustomDomain: true,
            domain: cleanHost,
            entities: entities,
            primaryEntity: primaryEntity,
            entityTypes: entities.map((e: any) => e._entityConfig.entity_type),
            dashboardTemplate: dashboardTemplate,
        })
    );

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
