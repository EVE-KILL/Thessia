interface EntityFilter {
    entity_type: "character" | "corporation" | "alliance";
    entity_id: number;
    entity_name?: string;
    show_in_nav: boolean;
    show_in_stats: boolean;
    primary: boolean;
}

interface QueryOptions {
    timeRange?: "24h" | "7d" | "30d" | "90d" | "all";
    customTimeFrom?: Date;
    customTimeTo?: Date;
    includeLosses?: boolean;
    includeKills?: boolean;
    entityMatchMode?: "any" | "all"; // OR vs AND logic for entities
}

/**
 * Generate MongoDB query for domain entities
 */
export function buildDomainQuery(
    entities: EntityFilter[],
    options: QueryOptions = {}
): Record<string, any> {
    const query: Record<string, any> = {};

    // Time range filter
    const timeFilter = buildTimeFilter(options);
    if (timeFilter) {
        query.kill_time = timeFilter;
    }

    // Entity involvement filter
    const entityFilter = buildEntityFilter(entities, options);
    if (entityFilter) {
        Object.assign(query, entityFilter);
    }

    return query;
}

/**
 * Build time range filter
 */
function buildTimeFilter(options: QueryOptions): Record<string, any> | null {
    if (options.customTimeFrom || options.customTimeTo) {
        const timeFilter: Record<string, any> = {};

        if (options.customTimeFrom) {
            timeFilter.$gte = options.customTimeFrom;
        }

        if (options.customTimeTo) {
            timeFilter.$lte = options.customTimeTo;
        }

        return timeFilter;
    }

    // Default time ranges
    if (options.timeRange) {
        const now = new Date();
        let startTime: Date;

        switch (options.timeRange) {
            case "24h":
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "7d":
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "90d":
                startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case "all":
                return null; // No time filter
            default:
                // Default to 7 days for optimal performance
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Normalize to start of day for better caching
        startTime.setHours(0, 0, 0, 0);

        return { $gte: startTime };
    }

    // Default to 7 days if no time range specified
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return { $gte: sevenDaysAgo };
}

/**
 * Build entity involvement filter
 */
function buildEntityFilter(
    entities: EntityFilter[],
    options: QueryOptions
): Record<string, any> | null {
    if (!entities || entities.length === 0) {
        return null;
    }

    const entityConditions: any[] = [];

    entities.forEach((entity) => {
        const entityRoleConditions: any[] = [];

        // Determine which roles to include based on options
        const includeAsVictim = options.includeLosses !== false; // Default true
        const includeAsAttacker = options.includeKills !== false; // Default true

        if (includeAsVictim) {
            // Entity as victim
            switch (entity.entity_type) {
                case "character":
                    entityRoleConditions.push({
                        "victim.character_id": entity.entity_id,
                    });
                    break;
                case "corporation":
                    entityRoleConditions.push({
                        "victim.corporation_id": entity.entity_id,
                    });
                    break;
                case "alliance":
                    entityRoleConditions.push({
                        "victim.alliance_id": entity.entity_id,
                    });
                    break;
            }
        }

        if (includeAsAttacker) {
            // Entity as attacker
            switch (entity.entity_type) {
                case "character":
                    entityRoleConditions.push({
                        "attackers.character_id": entity.entity_id,
                    });
                    break;
                case "corporation":
                    entityRoleConditions.push({
                        "attackers.corporation_id": entity.entity_id,
                    });
                    break;
                case "alliance":
                    entityRoleConditions.push({
                        "attackers.alliance_id": entity.entity_id,
                    });
                    break;
            }
        }

        if (entityRoleConditions.length > 0) {
            entityConditions.push({ $or: entityRoleConditions });
        }
    });

    if (entityConditions.length === 0) {
        return null;
    }

    // Use AND or OR logic based on entityMatchMode
    if (options.entityMatchMode === "all" && entityConditions.length > 1) {
        // ALL entities must be involved (AND logic) - much more restrictive
        return { $and: entityConditions };
    } else {
        // ANY entity can be involved (OR logic) - default behavior
        if (entityConditions.length === 1) {
            return entityConditions[0];
        } else {
            return { $or: entityConditions };
        }
    }
}

/**
 * Build query specifically for statistics generation (includes additional facets)
 */
export function buildDomainStatsQuery(
    entities: EntityFilter[],
    options: QueryOptions = {}
): {
    query: Record<string, any>;
    facets: string[];
} {
    const query = buildDomainQuery(entities, options);

    // Default facets for domain statistics
    const facets = [
        "totalKills",
        "totalLosses",
        "iskDestroyed",
        "iskLost",
        "efficiency",
        "shipGroupStats",
        "topKillersByCharacter",
        "topVictimsByCharacter",
        "topDamageDealersByCharacter",
        "topKillersByCorporation",
        "topVictimsByCorporation",
        "topKillersByAlliance",
        "topVictimsByAlliance",
        "mostValuableKills",
        "recentBattles",
    ];

    return { query, facets };
}

/**
 * Build query for individual entity within domain context
 */
export function buildEntitySpecificQuery(
    entity: EntityFilter,
    allDomainEntities: EntityFilter[],
    options: QueryOptions = {}
): Record<string, any> {
    // Build query for specific entity but in context of domain time range
    return buildDomainQuery([entity], options);
}

/**
 * Generate cache key for domain query
 */
export async function generateDomainQueryCacheKey(
    domainId: string,
    entities: EntityFilter[],
    options: QueryOptions = {}
): Promise<string> {
    // Create a stable key based on entities and options
    const entityKey = entities
        .map((e) => `${e.entity_type}:${e.entity_id}`)
        .sort()
        .join(",");

    const optionsKey = [
        options.timeRange || "7d",
        options.entityMatchMode || "any",
        options.includeKills !== false ? "kills" : "",
        options.includeLosses !== false ? "losses" : "",
    ]
        .filter(Boolean)
        .join(":");

    // Create hash for consistent key length
    const { createHash } = await import("crypto");
    const content = `${domainId}:${entityKey}:${optionsKey}`;
    const hash = createHash("sha256")
        .update(content)
        .digest("hex")
        .substring(0, 16);

    return `domain:${hash}`;
}

/**
 * Validate and sanitize entities for query building
 */
export function validateDomainEntities(entities: any[]): EntityFilter[] {
    if (!Array.isArray(entities)) {
        return [];
    }

    return entities.filter((entity): entity is EntityFilter => {
        return (
            entity &&
            typeof entity === "object" &&
            ["character", "corporation", "alliance"].includes(
                entity.entity_type
            ) &&
            typeof entity.entity_id === "number" &&
            entity.entity_id > 0
        );
    });
}

/**
 * Build optimized query hints for domain queries
 */
export function getDomainQueryHints(
    query: Record<string, any>
): Record<string, number> | null {
    // Leverage existing index patterns
    if (query.kill_time) {
        if (query.$or && query.$or.length > 0) {
            // Multi-entity query - use kill_time index as primary
            return { kill_time: -1 };
        }

        // Single entity query - try to use compound indexes
        if (query["victim.character_id"]) {
            return { "victim.character_id": 1, kill_time: -1 };
        }
        if (query["victim.corporation_id"]) {
            return { "victim.corporation_id": 1, kill_time: -1 };
        }
        if (query["victim.alliance_id"]) {
            return { "victim.alliance_id": 1, kill_time: -1 };
        }

        // Default to kill_time index
        return { kill_time: -1 };
    }

    return null;
}
