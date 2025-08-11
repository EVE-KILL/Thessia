import { LRUCache } from "lru-cache";

// Lazy initialization for Redis client to avoid import issues
let redis: any = null;
function getRedisClient() {
    if (!redis) {
        redis = RedisStorage.getInstance().getClient();
    }
    return redis;
}

// Define TTLs for different cache types (in seconds)
const STATIC_DATA_TTL = 86400 * 7; // 7 days for rarely changing data
const ENTITY_DATA_TTL = 3600 * 6; // 6 hours for entities
const PRICE_DATA_TTL = 3600; // 1 hour for prices

// Define cache namespaces for consistent usage
export const CACHE_NAMESPACES = {
    INV_GROUPS: "invGroups",
    INV_TYPES: "invTypes",
    INV_FLAGS: "invFlags",
    FACTIONS: "factions",
    REGIONS: "regions",
    CONSTELLATIONS: "constellations",
    SOLAR_SYSTEMS: "solarSystems",
    CUSTOM_PRICES: "customPrices",
    PRICE: "price",
    CHARACTER: "character",
    CORPORATION: "corporation",
    ALLIANCE: "alliance",
    SHIP_TYPE_LISTS: "shipTypeLists",
};

// Primary cache using Maps or LRU for fast access
export const invGroupsCache = new Map<number, IInvGroup>();
export const invTypesCache = new Map<number, IInvType>();
export const invFlagsCache = new Map<number, IInvFlag>();
export const factionsCache = new Map<number, IFaction>();
export const regionsCache = new Map<number, IRegion>();
export const constellationsCache = new Map<number, IConstellation>();
export const solarSystemsCache = new Map<number, ISolarSystem>();
export const customPriceCache = new Map<number, ICustomPrice>();

// Ship type lists cache for killlist queries
export const shipTypeListsCache = new Map<string, number[]>();

// For the LRU caches for dynamic data
export const priceCache = new LRUCache<string, number>({
    max: 1000000,
    ttl: 1000 * 60 * 60 * 24, // 24 hours
    allowStale: true,
});

export const characterCache = new LRUCache<string, ICharacter>({
    max: 100000,
    ttl: 1000 * 60 * 60 * 6, // 6 hours
    allowStale: true,
});

export const corporationCache = new LRUCache<string, ICorporation>({
    max: 100000,
    ttl: 1000 * 60 * 60 * 6, // 6 hours
    allowStale: true,
});

export const allianceCache = new LRUCache<string, IAlliance>({
    max: 100000,
    ttl: 1000 * 60 * 60 * 6, // 6 hours
    allowStale: true,
});

// Helper functions for Redis cache
const redisCacheKey = (namespace: string, id: string | number) =>
    `cache:${namespace}:${id}`;
const redisHitKey = (namespace: string) => `cache:hits:${namespace}`;
const redisKeysSetKey = (namespace: string) => `cache:keys:${namespace}`;

// Track cache hit in Redis for stats
const trackCacheHit = (namespace: string) => {
    redis
        .incr(redisHitKey(namespace))
        .catch((err) =>
            cliLogger.error(
                `Failed to increment hit counter for ${namespace}:`,
                err
            )
        );
};

// Track cached keys for size stats
const trackCacheKey = (namespace: string, id: string | number) => {
    redis
        .sadd(redisKeysSetKey(namespace), id.toString())
        .catch((err) =>
            cliLogger.error(
                `Failed to track cache key for ${namespace}:${id}`,
                err
            )
        );
};

// Helper to get from Redis cache
const getFromRedis = async <T>(
    namespace: string,
    id: string | number
): Promise<T | null> => {
    try {
        const key = redisCacheKey(namespace, id);
        const data = await getRedisClient().get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        cliLogger.error(`Redis cache error for ${namespace}:${id}`, err);
        return null;
    }
};

// Helper to set in Redis cache
const setInRedis = async <T>(
    namespace: string,
    id: string | number,
    value: T,
    ttl = STATIC_DATA_TTL
): Promise<void> => {
    try {
        const key = redisCacheKey(namespace, id);
        await getRedisClient().set(key, JSON.stringify(value), "EX", ttl);
        trackCacheKey(namespace, id);
    } catch (err) {
        cliLogger.error(`Failed to set in Redis cache ${namespace}:${id}`, err);
    }
};

/**
 * Generic caching function that follows the pattern:
 * 1. Check local cache
 * 2. Check Redis cache
 * 3. Fetch from data source
 * 4. Store in caches
 */
async function getCachedData<T>({
    namespace,
    id,
    localCache,
    fetchData,
    ttl = STATIC_DATA_TTL,
}: {
    namespace: string;
    id: string | number;
    localCache?: Map<number, T> | LRUCache<string, T>;
    fetchData: () => Promise<T | null>;
    ttl?: number;
}): Promise<T | null> {
    // Convert id to string or number as needed by the cache
    const cacheId = typeof id === "string" || !localCache ? id : Number(id);
    const stringId = typeof id === "number" ? String(id) : id;

    // 1. Check local cache first
    if (localCache?.has(cacheId)) {
        trackCacheHit(namespace);
        return localCache.get(cacheId) as T;
    }

    // 2. Check Redis cache
    const redisData = await getFromRedis<T>(namespace, stringId);
    if (redisData !== null) {
        if (localCache) {
            localCache.set(cacheId, redisData);
        }
        trackCacheHit(namespace);
        return redisData;
    }

    // 3. Fetch from data source
    const data = await fetchData();

    // 4. Store in caches if data was found
    if (data !== null) {
        if (localCache) {
            localCache.set(cacheId, data);
        }
        setInRedis(namespace, stringId, data, ttl);
    }

    return data;
}

// Specialized cached lookup functions using the generic pattern
export async function getCachedInvGroup(
    groupId: number
): Promise<IInvGroup | null> {
    return getCachedData<IInvGroup>({
        namespace: CACHE_NAMESPACES.INV_GROUPS,
        id: groupId,
        localCache: invGroupsCache,
        fetchData: () => InvGroups.findOne({ group_id: groupId }),
    });
}

export async function getCachedItem(typeId: number): Promise<IInvType | null> {
    return getCachedData<IInvType>({
        namespace: CACHE_NAMESPACES.INV_TYPES,
        id: typeId,
        localCache: invTypesCache,
        fetchData: () => InvTypes.findOne({ type_id: typeId }),
    });
}

export async function getCachedInvFlag(
    flagId: number
): Promise<IInvFlag | null> {
    return getCachedData<IInvFlag>({
        namespace: CACHE_NAMESPACES.INV_FLAGS,
        id: flagId,
        localCache: invFlagsCache,
        fetchData: () => InvFlags.findOne({ flag_id: flagId }),
    });
}

export async function getCachedFaction(
    factionId: number
): Promise<IFaction | null> {
    return getCachedData<IFaction>({
        namespace: CACHE_NAMESPACES.FACTIONS,
        id: factionId,
        localCache: factionsCache,
        fetchData: () => Factions.findOne({ faction_id: factionId }),
    });
}

export async function getCachedRegion(
    regionId: number
): Promise<IRegion | null> {
    return getCachedData<IRegion>({
        namespace: CACHE_NAMESPACES.REGIONS,
        id: regionId,
        localCache: regionsCache,
        fetchData: () => Regions.findOne({ region_id: regionId }),
    });
}

export async function getCachedConstellation(
    constellationId: number
): Promise<IConstellation | null> {
    return getCachedData<IConstellation>({
        namespace: CACHE_NAMESPACES.CONSTELLATIONS,
        id: constellationId,
        localCache: constellationsCache,
        fetchData: () =>
            Constellations.findOne({ constellation_id: constellationId }),
    });
}

export async function getCachedSolarSystem(
    solarSystemId: number
): Promise<ISolarSystem | null> {
    return getCachedData<ISolarSystem>({
        namespace: CACHE_NAMESPACES.SOLAR_SYSTEMS,
        id: solarSystemId,
        localCache: solarSystemsCache,
        fetchData: () => SolarSystems.findOne({ system_id: solarSystemId }),
    });
}

export async function getCachedCustomPrice(
    typeId: number
): Promise<ICustomPrice | null> {
    return getCachedData<ICustomPrice>({
        namespace: CACHE_NAMESPACES.CUSTOM_PRICES,
        id: typeId,
        localCache: customPriceCache,
        fetchData: () => CustomPrices.findOne({ type_id: typeId }),
        ttl: PRICE_DATA_TTL,
    });
}

export async function getCachedCharacter(
    characterId: number
): Promise<ICharacter | null> {
    return getCachedData<ICharacter>({
        namespace: CACHE_NAMESPACES.CHARACTER,
        id: String(characterId),
        localCache: characterCache,
        fetchData: () => getCharacter(characterId),
        ttl: ENTITY_DATA_TTL,
    });
}

export async function getCachedCorporation(
    corporationId: number
): Promise<ICorporation | null> {
    return getCachedData<ICorporation>({
        namespace: CACHE_NAMESPACES.CORPORATION,
        id: String(corporationId),
        localCache: corporationCache,
        fetchData: () => getCorporation(corporationId),
        ttl: ENTITY_DATA_TTL,
    });
}

export async function getCachedAlliance(
    allianceId: number
): Promise<IAlliance | null> {
    return getCachedData<IAlliance>({
        namespace: CACHE_NAMESPACES.ALLIANCE,
        id: String(allianceId),
        localCache: allianceCache,
        fetchData: () => getAlliance(allianceId),
        ttl: ENTITY_DATA_TTL,
    });
}

export async function getCachedPrice(
    typeId: number,
    killTime: Date
): Promise<number> {
    const key = `${typeId}-${killTime.getTime()}`;
    return (
        getCachedData<number>({
            namespace: CACHE_NAMESPACES.PRICE,
            id: key,
            localCache: priceCache,
            fetchData: async () => {
                const price = await getPrice(typeId, killTime);
                return price;
            },
            ttl: PRICE_DATA_TTL,
        }) || 0
    ); // Default to 0 if no price found
}

// Utility functions for stats
export async function getCacheSize(namespace: string): Promise<number> {
    try {
        const keysSetKey = redisKeysSetKey(namespace);
        return await getRedisClient().scard(keysSetKey);
    } catch (err) {
        cliLogger.error(`Failed to get cache size for ${namespace}:`, err);
        return 0;
    }
}

/**
 * Get ship type IDs for killlist queries (T1, T2, T3, faction)
 */
export async function getShipTypeList(type: string): Promise<number[]> {
    // Check local cache first
    if (shipTypeListsCache.has(type)) {
        return shipTypeListsCache.get(type)!;
    }

    // Define queries for each ship type
    const shipTypeQueries: Record<string, any> = {
        t1: { "dogma_attributes.422.value": 1, category_id: 6 },
        t2: { "dogma_attributes.422.value": 2, category_id: 6 },
        t3: { "dogma_attributes.422.value": 3, category_id: 6 },
        faction: { "dogma_attributes.1692.value": 4, category_id: 6 },
    };

    const query = shipTypeQueries[type];
    if (!query) {
        return [];
    }

    try {
        // Try Redis cache
        const redisKey = redisCacheKey(CACHE_NAMESPACES.SHIP_TYPE_LISTS, type);
        const cachedData = await getRedisClient().get(redisKey);
        
        if (cachedData) {
            const typeIds = JSON.parse(cachedData);
            shipTypeListsCache.set(type, typeIds);
            return typeIds;
        }

        // Fetch from database
        const shipTypes = await InvTypes.find(query, { type_id: 1 }).lean();
        const typeIds = shipTypes.map((ship: any) => ship.type_id);

        // Cache in both local and Redis (TTL: 24 hours since this data rarely changes)
        shipTypeListsCache.set(type, typeIds);
        await getRedisClient().set(redisKey, JSON.stringify(typeIds), "EX", 86400);

        return typeIds;
    } catch (error) {
        cliLogger.error(`Failed to get ship type list for ${type}:`, error);
        return [];
    }
}

export async function getCacheHitCount(namespace: string): Promise<number> {
    try {
        const hitKey = redisHitKey(namespace);
        const count = await getRedisClient().get(hitKey);
        return count ? Number.parseInt(count, 10) : 0;
    } catch (err) {
        cliLogger.error(`Failed to get hit count for ${namespace}:`, err);
        return 0;
    }
}
