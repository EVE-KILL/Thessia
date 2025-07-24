import type {
    FilterCondition,
    QueryAPIRequest,
    QueryableField,
    SortDirection,
} from "~/shared/helpers/queryAPIHelper";
import {
    and,
    createQuery,
    field,
    or,
    eq,
    ne,
    gt,
    gte,
    lt,
    lte,
    inArray,
    notInArray,
    exists,
} from "~/shared/helpers/queryAPIHelper";

// Types for advanced search filters
export interface LocationFilter {
    type: "system" | "region" | "constellation" | null;
    id: string | null;
    name: string | null;
    securityTypes: string[];
}

export interface EntityFilter {
    id: string;
    name: string;
    role: "victim" | "attacker" | "both"; // Whether this entity appears as victim, attacker, or both
}

// Helper function to create attacker count query using MongoDB $expr and $size
function createAttackerCountQuery(minCount: number): FilterCondition {
    return {
        $expr: {
            $gte: [{ $size: "$attackers" }, minCount],
        },
    } as any; // Cast to any since the QueryAPIHelper doesn't have types for $expr
}

// Helper function to create simple equality conditions without $eq wrapper
function createSimpleEqualityCondition(
    fieldName: QueryableField,
    value: any
): FilterCondition {
    return {
        [fieldName]: value,
    } as any;
}

// Helper function to combine entity conditions based on operator
function combineEntityConditions(
    conditions: FilterCondition[],
    operator: "$or" | "$and" | "$in",
    fieldName?: string,
    values?: string[]
): FilterCondition | null {
    if (conditions.length === 0) return null;

    if (operator === "$in" && fieldName && values) {
        // For $in operator, create a single condition with array of values
        return createSimpleEqualityCondition(
            fieldName as QueryableField,
            values
        );
    } else if (operator === "$and") {
        return conditions.length === 1 ? conditions[0]! : and(conditions);
    } else {
        // default to $or
        return conditions.length === 1 ? conditions[0]! : or(conditions);
    }
}

export interface AdvancedSearchFilters {
    entities: {
        characters: EntityFilter[];
        corporations: EntityFilter[];
        alliances: EntityFilter[];
        ships: EntityFilter[];
        victim: EntityFilter[];
        attacker: EntityFilter[];
        both: EntityFilter[];
        victimOperator: "$or" | "$and" | "$in";
        attackerOperator: "$or" | "$and" | "$in";
        bothOperator: "$or" | "$and" | "$in";
    };
    items: EntityFilter[];
    location: {
        type: "system" | "region" | "constellation" | null;
        value: string | null;
        securityTypes: string[];
    };
    timeFilter: string | null;
    customTimeRange: {
        from: string | null;
        to: string | null;
    };
    attackerCount: string | null;
    attackerType: string | null;
    iskValue: string | null;
    shipCategory: string | null;
}

export interface SearchFacet {
    id: string;
    field: string;
    operator: string;
    value: any;
    displayValue?: string;
    searchTerm?: string;
    searchResults?: any[];
    searchLoading?: boolean;
}

// Constants
export const FIELD_OPTIONS = [
    {
        category: "killmail",
        fields: [
            { value: "killmail_id", label: "killmailId" },
            { value: "kill_time", label: "killTime" },
            { value: "total_value", label: "totalValue" },
            { value: "is_npc", label: "isNpc" },
            { value: "is_solo", label: "isSolo" },
            { value: "war_id", label: "warId" },
        ],
    },
    {
        category: "location",
        fields: [
            { value: "region_id", label: "region" },
            { value: "constellation_id", label: "constellation" },
            { value: "system_id", label: "system" },
            { value: "system_security", label: "systemSecurity" },
        ],
    },
    {
        category: "victim",
        fields: [
            { value: "victim.character_id", label: "victimCharacter" },
            { value: "victim.corporation_id", label: "victimCorporation" },
            { value: "victim.alliance_id", label: "victimAlliance" },
            { value: "victim.faction_id", label: "victimFaction" },
            { value: "victim.ship_id", label: "victimShip" },
            { value: "victim.ship_group_id", label: "victimShipGroup" },
        ],
    },
    {
        category: "attackers",
        fields: [
            { value: "attackers.character_id", label: "attackerCharacter" },
            { value: "attackers.corporation_id", label: "attackerCorporation" },
            { value: "attackers.alliance_id", label: "attackerAlliance" },
            { value: "attackers.faction_id", label: "attackerFaction" },
            { value: "attackers.ship_id", label: "attackerShip" },
            { value: "attackers.ship_group_id", label: "attackerShipGroup" },
            { value: "attackers.weapon_type_id", label: "attackerWeapon" },
        ],
    },
    {
        category: "items",
        fields: [
            { value: "items.type_id", label: "itemType" },
            { value: "items.group_id", label: "itemGroup" },
        ],
    },
];

export const OPERATOR_OPTIONS = [
    { value: "$eq", label: "equal" },
    { value: "$ne", label: "notEqual" },
    { value: "$gt", label: "greaterThan" },
    { value: "$gte", label: "greaterThanOrEqual" },
    { value: "$lt", label: "lessThan" },
    { value: "$lte", label: "lessThanOrEqual" },
    { value: "$in", label: "inArray" },
    { value: "$nin", label: "notInArray" },
    { value: "$exists", label: "exists" },
];

// Alliance Tournament Ship IDs
export const ALLIANCE_TOURNAMENT_SHIP_IDS = [
    2836, 74316, 42246, 32788, 33675, 33397, 32790, 35781, 32207, 74141, 35779,
    60764, 3516, 32209, 33395, 42245, 60765, 26842, 2834, 3518, 33673,
];

// Ship group mappings from killlist API
export const SHIP_GROUP_MAPPINGS = {
    capitals: [547, 485],
    supercarriers: [659],
    titans: [30],
    superCapitals: [659, 30], // Combined supercarriers and titans
    frigates: [324, 893, 25, 831, 237],
    destroyers: [420, 541],
    cruisers: [906, 26, 833, 358, 894, 832, 963],
    battlecruisers: [419, 540],
    battleships: [27, 898, 900],
    freighters: [513, 902],
};

// Helper functions
export function supportsSearch(fieldId: string): boolean {
    const searchableFields = [
        "victim.character_id",
        "victim.corporation_id",
        "victim.alliance_id",
        "victim.faction_id",
        "victim.ship_id",
        "victim.ship_group_id",
        "attackers.character_id",
        "attackers.corporation_id",
        "attackers.alliance_id",
        "attackers.faction_id",
        "attackers.ship_id",
        "attackers.ship_group_id",
        "attackers.weapon_type_id",
        "items.type_id",
        "items.group_id",
        "region_id",
        "constellation_id",
        "system_id",
    ];
    return searchableFields.includes(fieldId);
}

export function getEntityTypeForField(fieldId: string): string {
    if (fieldId.includes("character")) return "character_id";
    if (fieldId.includes("corporation")) return "corporation_id";
    if (fieldId.includes("alliance")) return "alliance_id";
    if (fieldId.includes("faction")) return "faction_id";
    if (fieldId.includes("ship") && !fieldId.includes("group"))
        return "ship_id";
    if (fieldId.includes("ship_group")) return "ship_group_id";
    if (fieldId.includes("weapon")) return "weapon_type_id";
    if (fieldId.includes("type_id")) return "type_id";
    if (fieldId.includes("group_id")) return "group_id";
    if (fieldId === "region_id") return "region_id";
    if (fieldId === "constellation_id") return "constellation_id";
    if (fieldId === "system_id") return "system_id";
    return "unknown";
}

export function getProjection() {
    return {
        killmail_id: 1 as const,
        kill_time: 1 as const,
        kill_time_str: 1 as const,
        total_value: 1 as const,
        is_npc: 1 as const,
        is_solo: 1 as const,
        region_id: 1 as const,
        region_name: 1 as const,
        system_id: 1 as const,
        system_name: 1 as const,
        system_security: 1 as const,
        "victim.character_id": 1 as const,
        "victim.character_name": 1 as const,
        "victim.corporation_id": 1 as const,
        "victim.corporation_name": 1 as const,
        "victim.alliance_id": 1 as const,
        "victim.alliance_name": 1 as const,
        "victim.ship_id": 1 as const,
        "victim.ship_name": 1 as const,
        "attackers.character_id": 1 as const,
        "attackers.character_name": 1 as const,
        "attackers.corporation_id": 1 as const,
        "attackers.corporation_name": 1 as const,
        "attackers.alliance_id": 1 as const,
        "attackers.alliance_name": 1 as const,
        "attackers.ship_id": 1 as const,
        "attackers.ship_name": 1 as const,
    };
}

// Main query building function
export function buildAdvancedSearchQuery(
    filters: AdvancedSearchFilters,
    facets: SearchFacet[],
    sortField: QueryableField,
    sortDirection: SortDirection,
    limit: number,
    skip: number
): QueryAPIRequest {
    const conditions: FilterCondition[] = [];

    // Handle location filters
    if (filters.location.type && filters.location.value) {
        // Specific location selected (system, region, constellation)
        const fieldMap: Record<string, string> = {
            system: "system_id",
            region: "region_id",
            constellation: "constellation_id",
        };
        const locationField = fieldMap[filters.location.type];
        if (locationField) {
            conditions.push(
                createSimpleEqualityCondition(
                    locationField as QueryableField,
                    filters.location.value
                )
            );
        }
    } else if (filters.location.securityTypes.length > 0) {
        // Security type filters
        const securityConditions: FilterCondition[] = [];

        filters.location.securityTypes.forEach((secType) => {
            switch (secType) {
                case "highsec":
                    securityConditions.push(
                        field("system_security", gte(0.45))
                    );
                    break;
                case "lowsec":
                    securityConditions.push(
                        and([
                            field("system_security", lte(0.45)),
                            field("system_security", gte(0)),
                        ])
                    );
                    break;
                case "nullsec":
                    securityConditions.push(field("system_security", lte(0)));
                    break;
                case "wspace":
                    securityConditions.push(
                        and([
                            field("region_id", gte(11000001)),
                            field("region_id", lte(11000033)),
                        ])
                    );
                    break;
                case "abyssal":
                    securityConditions.push(
                        and([
                            field("region_id", gte(12000000)),
                            field("region_id", lte(13000000)),
                        ])
                    );
                    break;
                case "pochven":
                    securityConditions.push(
                        createSimpleEqualityCondition("region_id", 10000070)
                    );
                    break;
            }
        });

        if (securityConditions.length > 0) {
            conditions.push(
                securityConditions.length === 1
                    ? securityConditions[0]!
                    : or(securityConditions)
            );
        }
    }

    // Handle attacker count filters
    if (filters.attackerCount) {
        const count = filters.attackerCount;
        switch (count) {
            case "solo":
                conditions.push(field("is_solo", true));
                break;
            case "≥2":
                conditions.push(createAttackerCountQuery(2));
                break;
            case "≥5":
                conditions.push(createAttackerCountQuery(5));
                break;
            case "≥10":
                conditions.push(createAttackerCountQuery(10));
                break;
            case "≥20":
                conditions.push(createAttackerCountQuery(20));
                break;
            case "≥50":
                conditions.push(createAttackerCountQuery(50));
                break;
            case "≥100":
                conditions.push(createAttackerCountQuery(100));
                break;
            case "≥1000":
                conditions.push(createAttackerCountQuery(1000));
                break;
        }
    } // Handle attacker type filters
    // Handle attacker type filters
    if (filters.attackerType) {
        const type = filters.attackerType;
        switch (type) {
            case "npc":
                conditions.push(field("is_npc", true));
                break;
            case "ganked":
                // More than 10 attackers in highsec (above 0.45 security)
                conditions.push(
                    and([
                        field("system_security", gte(0.45)),
                        createAttackerCountQuery(10),
                    ])
                );
                break;
        }
    }

    // Handle ISK value filters
    if (filters.iskValue) {
        const value = filters.iskValue;
        switch (value) {
            case "≥ 1b":
                conditions.push(field("total_value", gte(1000000000)));
                break;
            case "≥ 5b":
                conditions.push(field("total_value", gte(5000000000)));
                break;
            case "≥ 10b":
                conditions.push(field("total_value", gte(10000000000)));
                break;
            case "≥ 100b":
                conditions.push(field("total_value", gte(100000000000)));
                break;
        }
    }

    // Handle time filters (mutually exclusive: either timeFilter OR customTimeRange)
    if (filters.timeFilter) {
        // Quick filter selected - use predefined ranges
        const now = new Date();
        const value = filters.timeFilter;

        switch (value) {
            case "today":
                // Calculate today start in UTC to avoid timezone issues
                const todayStartUTC = new Date();
                todayStartUTC.setUTCHours(0, 0, 0, 0);
                console.log("Today filter (UTC-based):", {
                    now: now.toISOString(),
                    todayStartUTC: todayStartUTC.toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    localMidnight: new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate()
                    ).toISOString(),
                });
                conditions.push(
                    field("kill_time", gte(todayStartUTC.toISOString()))
                );
                break;
            case "yesterday":
                // Calculate yesterday start and end in UTC
                const yesterdayStartUTC = new Date();
                yesterdayStartUTC.setUTCDate(
                    yesterdayStartUTC.getUTCDate() - 1
                );
                yesterdayStartUTC.setUTCHours(0, 0, 0, 0);

                const yesterdayEndUTC = new Date();
                yesterdayEndUTC.setUTCHours(0, 0, 0, 0);

                conditions.push(
                    and([
                        field(
                            "kill_time",
                            gte(yesterdayStartUTC.toISOString())
                        ),
                        field("kill_time", lt(yesterdayEndUTC.toISOString())),
                    ])
                );
                break;
            case "last24h":
                const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                conditions.push(field("kill_time", gte(last24h.toISOString())));
                break;
            case "last7d":
                const last7d = new Date(
                    now.getTime() - 7 * 24 * 60 * 60 * 1000
                );
                conditions.push(field("kill_time", gte(last7d.toISOString())));
                break;
            case "last30d":
                const last30d = new Date(
                    now.getTime() - 30 * 24 * 60 * 60 * 1000
                );
                conditions.push(field("kill_time", gte(last30d.toISOString())));
                break;
            case "thisWeek":
                // Calculate this week start in UTC (assuming week starts Sunday)
                const thisWeekStartUTC = new Date();
                thisWeekStartUTC.setUTCDate(
                    thisWeekStartUTC.getUTCDate() - thisWeekStartUTC.getUTCDay()
                );
                thisWeekStartUTC.setUTCHours(0, 0, 0, 0);
                conditions.push(
                    field("kill_time", gte(thisWeekStartUTC.toISOString()))
                );
                break;
            case "thisMonth":
                // Calculate this month start in UTC
                const thisMonthStartUTC = new Date();
                thisMonthStartUTC.setUTCDate(1);
                thisMonthStartUTC.setUTCHours(0, 0, 0, 0);
                conditions.push(
                    field("kill_time", gte(thisMonthStartUTC.toISOString()))
                );
                break;
            case "last3m":
                const last3m = new Date(
                    now.getTime() - 90 * 24 * 60 * 60 * 1000
                );
                conditions.push(field("kill_time", gte(last3m.toISOString())));
                break;
        }
    } else if (filters.customTimeRange.from || filters.customTimeRange.to) {
        // Custom time range selected - build range query
        const timeConditions: FilterCondition[] = [];

        if (filters.customTimeRange.from) {
            // Convert datetime-local to ISO string for MongoDB
            const fromDate = new Date(filters.customTimeRange.from);
            timeConditions.push(
                field("kill_time", gte(fromDate.toISOString()))
            );
        }

        if (filters.customTimeRange.to) {
            // Convert datetime-local to ISO string for MongoDB
            const toDate = new Date(filters.customTimeRange.to);
            timeConditions.push(field("kill_time", lte(toDate.toISOString())));
        }

        if (timeConditions.length > 0) {
            conditions.push(
                timeConditions.length === 1
                    ? timeConditions[0]!
                    : and(timeConditions)
            );
        }
    }

    // Handle entity filters with role-based AND logic
    const roleConditions: FilterCondition[] = [];

    // Victim entities (must match if specified)
    if (filters.entities.victim.length > 0) {
        const victimConditions: FilterCondition[] = [];

        for (const entity of filters.entities.victim) {
            const entityType = getEntityTypeForField(entity.type);
            if (filters.entities.victimOperator === "$in") {
                // Group by entity type for $in optimization
                victimConditions.push(
                    field(`victim.${entityType}`, eq(entity.id))
                );
            } else {
                victimConditions.push(
                    createSimpleEqualityCondition(
                        `victim.${entityType}`,
                        entity.id
                    )
                );
            }
        }

        if (victimConditions.length === 1) {
            roleConditions.push(victimConditions[0]!);
        } else if (victimConditions.length > 1) {
            const combined = combineEntityConditions(
                victimConditions,
                filters.entities.victimOperator
            );
            if (combined) roleConditions.push(combined);
        }
    }

    // Attacker entities (must match if specified)
    if (filters.entities.attacker.length > 0) {
        const attackerConditions: FilterCondition[] = [];

        for (const entity of filters.entities.attacker) {
            const entityType = getEntityTypeForField(entity.type);
            if (filters.entities.attackerOperator === "$in") {
                attackerConditions.push(
                    field(`attackers.${entityType}`, eq(entity.id))
                );
            } else {
                attackerConditions.push(
                    createSimpleEqualityCondition(
                        `attackers.${entityType}`,
                        entity.id
                    )
                );
            }
        }

        if (attackerConditions.length === 1) {
            roleConditions.push(attackerConditions[0]!);
        } else if (attackerConditions.length > 1) {
            const combined = combineEntityConditions(
                attackerConditions,
                filters.entities.attackerOperator
            );
            if (combined) roleConditions.push(combined);
        }
    }

    // Both entities (can be either victim or attacker)
    if (filters.entities.both.length > 0) {
        const bothConditions: FilterCondition[] = [];

        for (const entity of filters.entities.both) {
            const entityType = getEntityTypeForField(entity.type);
            // Entity can be either victim or attacker
            bothConditions.push(
                or([
                    createSimpleEqualityCondition(
                        `victim.${entityType}`,
                        entity.id
                    ),
                    createSimpleEqualityCondition(
                        `attackers.${entityType}`,
                        entity.id
                    ),
                ])
            );
        }

        if (bothConditions.length === 1) {
            roleConditions.push(bothConditions[0]!);
        } else if (bothConditions.length > 1) {
            const combined = combineEntityConditions(
                bothConditions,
                filters.entities.bothOperator
            );
            if (combined) roleConditions.push(combined);
        }
    }

    // Add role conditions directly to main conditions (they will all be AND-ed together)
    if (roleConditions.length > 0) {
        conditions.push(...roleConditions);
    }

    // Handle items separately (query pivots like locations)
    if (filters.items && filters.items.length > 0) {
        const itemConditions = filters.items.map((item) =>
            createSimpleEqualityCondition("items.type_id", item.id)
        );

        if (itemConditions.length === 1) {
            conditions.push(itemConditions[0]!);
        } else if (itemConditions.length > 1) {
            conditions.push(or(itemConditions));
        }
    }

    // Handle ship category filters
    // Handle ship category filters
    if (filters.shipCategory) {
        const category = filters.shipCategory;
        switch (category) {
            case "allianceTournamentShips":
                conditions.push(
                    field(
                        "victim.ship_id",
                        inArray(ALLIANCE_TOURNAMENT_SHIP_IDS)
                    )
                );
                break;
            case "capitals":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.capitals)
                    )
                );
                break;
            case "supercarriers":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.supercarriers)
                    )
                );
                break;
            case "titans":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.titans)
                    )
                );
                break;
            case "superCapitals":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.superCapitals)
                    )
                );
                break;
            case "frigates":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.frigates)
                    )
                );
                break;
            case "destroyers":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.destroyers)
                    )
                );
                break;
            case "cruisers":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.cruisers)
                    )
                );
                break;
            case "battlecruisers":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.battlecruisers)
                    )
                );
                break;
            case "battleships":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.battleships)
                    )
                );
                break;
            case "freighters":
                conditions.push(
                    field(
                        "victim.ship_group_id",
                        inArray(SHIP_GROUP_MAPPINGS.freighters)
                    )
                );
                break;
        }
    }

    // Add facet conditions (from main search bar selections)
    for (const facet of facets) {
        if (
            facet.field &&
            facet.operator &&
            facet.value !== null &&
            facet.value !== undefined
        ) {
            if (facet.operator === "$eq") {
                conditions.push(
                    createSimpleEqualityCondition(
                        facet.field as QueryableField,
                        facet.value
                    )
                );
            } else if (facet.operator === "$ne") {
                conditions.push(
                    field(facet.field as QueryableField, ne(facet.value))
                );
            } else if (facet.operator === "$gt") {
                conditions.push(
                    field(facet.field as QueryableField, gt(facet.value))
                );
            } else if (facet.operator === "$gte") {
                conditions.push(
                    field(facet.field as QueryableField, gte(facet.value))
                );
            } else if (facet.operator === "$lt") {
                conditions.push(
                    field(facet.field as QueryableField, lt(facet.value))
                );
            } else if (facet.operator === "$lte") {
                conditions.push(
                    field(facet.field as QueryableField, lte(facet.value))
                );
            } else if (
                facet.operator === "$in" &&
                Array.isArray(facet.value) &&
                facet.value.length > 0
            ) {
                conditions.push(
                    field(facet.field as QueryableField, inArray(facet.value))
                );
            } else if (
                facet.operator === "$nin" &&
                Array.isArray(facet.value) &&
                facet.value.length > 0
            ) {
                conditions.push(
                    field(
                        facet.field as QueryableField,
                        notInArray(facet.value)
                    )
                );
            } else if (facet.operator === "$exists") {
                conditions.push(
                    field(
                        facet.field as QueryableField,
                        exists(Boolean(facet.value))
                    )
                );
            }
        }
    }

    // Build final query
    let filter: FilterCondition | undefined;

    if (conditions.length === 0) {
        filter = undefined;
    } else if (conditions.length === 1) {
        filter = conditions[0]!;
    } else {
        // Check if all conditions are simple field equality conditions
        // If so, we can flatten them instead of wrapping in $and
        const canFlatten = conditions.every((condition) => {
            // Simple equality condition has structure: { fieldName: value }
            const keys = Object.keys(condition);
            return keys.length === 1 && !keys[0]!.startsWith("$");
        });

        if (canFlatten) {
            // Flatten all conditions into a single object
            filter = conditions.reduce((acc, condition) => {
                return { ...acc, ...condition };
            }, {});
        } else {
            // Use $and for complex conditions
            filter = and(conditions);
        }
    }

    const query: QueryAPIRequest = {
        filter,
        options: {
            sort: { [sortField]: sortDirection === "asc" ? 1 : -1 },
            limit,
            skip,
            projection: getProjection(),
        },
    };

    return query;
}

// Quick filter functions
export function createQuickFilterFacet(filterType: string): SearchFacet | null {
    const now = new Date();

    switch (filterType) {
        case "lastHour":
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            return {
                id: `facet-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 5)}`,
                field: "kill_time",
                operator: "$gte",
                value: oneHourAgo,
                searchTerm: "",
                searchResults: [],
                searchLoading: false,
            };

        case "last24Hours":
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return {
                id: `facet-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 5)}`,
                field: "kill_time",
                operator: "$gte",
                value: oneDayAgo,
                searchTerm: "",
                searchResults: [],
                searchLoading: false,
            };

        case "lastWeek":
            const oneWeekAgo = new Date(
                now.getTime() - 7 * 24 * 60 * 60 * 1000
            );
            return {
                id: `facet-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 5)}`,
                field: "kill_time",
                operator: "$gte",
                value: oneWeekAgo,
                searchTerm: "",
                searchResults: [],
                searchLoading: false,
            };

        default:
            return null;
    }
}

// Default empty filters
export function createDefaultFilters(): AdvancedSearchFilters {
    return {
        location: {
            type: null,
            value: null,
            securityTypes: [],
        },
        timeFilter: null,
        customTimeRange: {
            from: null,
            to: null,
        },
        attackerCount: null,
        attackerType: null,
        iskValue: null,
        shipCategory: null,
        entities: {
            characters: [],
            corporations: [],
            alliances: [],
            ships: [],
            victim: [],
            attacker: [],
            both: [],
            victimOperator: "$or",
            attackerOperator: "$or",
            bothOperator: "$or",
        },
        items: [],
    };
}

// Filter options for UI components
export const SECURITY_OPTIONS = [
    { value: "highsec", label: "Highsec" },
    { value: "lowsec", label: "Lowsec" },
    { value: "nullsec", label: "Nullsec" },
    { value: "wspace", label: "W-Space" },
    { value: "abyssal", label: "Abyssal" },
    { value: "pochven", label: "Pochven" },
];

export const ATTACKER_COUNT_OPTIONS = [
    { value: "solo", label: "Solo" },
    { value: "≥2", label: "≥2" },
    { value: "≥5", label: "≥5" },
    { value: "≥10", label: "≥10" },
    { value: "≥20", label: "≥20" },
    { value: "≥50", label: "≥50" },
    { value: "≥100", label: "≥100" },
    { value: "≥1000", label: "≥1000" },
];

export const ATTACKER_TYPE_OPTIONS = [
    { value: "ganked", label: "Ganked" },
    { value: "npc", label: "NPC" },
];

export const KILL_TYPE_OPTIONS = [
    { value: "solo", label: "Solo Kills" },
    { value: "gang", label: "Gang Kills" },
    { value: "npc", label: "NPC Kills" },
    { value: "awox", label: "Awoxing" },
    { value: "padding", label: "Padding" },
];

export const ISK_VALUE_OPTIONS = [
    { value: "≥ 1b", label: "≥ 1B ISK" },
    { value: "≥ 5b", label: "≥ 5B ISK" },
    { value: "≥ 10b", label: "≥ 10B ISK" },
    { value: "≥ 100b", label: "≥ 100B ISK" },
];

export const SHIP_CATEGORY_OPTIONS = [
    { value: "allianceTournamentShips", label: "Alliance Tournament Ships" },
    { value: "capitals", label: "Capitals" },
    { value: "supercarriers", label: "Supercarriers" },
    { value: "titans", label: "Titans" },
    { value: "superCapitals", label: "Super Capitals" },
    { value: "frigates", label: "Frigates" },
    { value: "destroyers", label: "Destroyers" },
    { value: "cruisers", label: "Cruisers" },
    { value: "battlecruisers", label: "Battlecruisers" },
    { value: "battleships", label: "Battleships" },
    { value: "freighters", label: "Freighters" },
];

export const TIME_FILTER_OPTIONS = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last24h", label: "Last 24 Hours" },
    { value: "last7d", label: "Last 7 Days" },
    { value: "last30d", label: "Last 30 Days" },
    { value: "thisWeek", label: "This Week" },
    { value: "thisMonth", label: "This Month" },
    { value: "last3m", label: "Last 3 Months" },
];

export const SORT_FIELD_OPTIONS = [
    { value: "kill_time", label: "Kill Time" },
    { value: "total_value", label: "Total Value (ISK)" },
    { value: "victim.damage_taken", label: "Damage Taken" },
];

export const ENTITY_ROLE_OPTIONS = [
    { value: "victim", label: "Victim" },
    { value: "attacker", label: "Attacker" },
    { value: "both", label: "Both" },
];

// Helper functions for entity management
export function createEntityFilter(
    id: string,
    name: string,
    role: "victim" | "attacker" | "both" = "both"
): EntityFilter {
    return { id, name, role };
}

export function addEntityToFilters(
    filters: AdvancedSearchFilters,
    entityType: "characters" | "corporations" | "alliances" | "ships" | "items",
    entity: EntityFilter
): AdvancedSearchFilters {
    // Check if entity already exists
    const existingIndex = filters.entities[entityType].findIndex(
        (e) => e.id === entity.id
    );

    if (existingIndex >= 0) {
        // Update existing entity
        filters.entities[entityType][existingIndex] = entity;
    } else {
        // Add new entity
        filters.entities[entityType].push(entity);
    }

    return { ...filters };
}

export function removeEntityFromFilters(
    filters: AdvancedSearchFilters,
    entityType: "characters" | "corporations" | "alliances" | "ships" | "items",
    entityId: string
): AdvancedSearchFilters {
    filters.entities[entityType] = filters.entities[entityType].filter(
        (e) => e.id !== entityId
    );
    return { ...filters };
}
