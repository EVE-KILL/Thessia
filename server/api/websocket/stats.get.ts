import { RedisStorage } from "~/server/helpers/Storage";

/**
 * WebSocket Statistics API Endpoint
 *
 * Provides real-time statistics about WebSocket connections
 * and Redis subscription status for monitoring purposes.
 */

export default defineEventHandler(async (event) => {
    // Import the client manager to access connection info
    const { getClientCount, getSubscriptionStatus, getConnectionHealth } =
        await import("~/server/helpers/WSClientManager");

    const redis = RedisStorage.getInstance();
    const [redisStats, redisHealth] = await Promise.all([
        redis.getRedisStats(),
        redis.healthCheck(),
    ]);

    // Calculate Redis connection usage details
    const connectionDetails = redis.getConnectionDetails();

    return {
        timestamp: new Date().toISOString(),
        websocket: {
            killmail: {
                clients: getClientCount("killmail"),
                health: getConnectionHealth("killmail"),
            },
            comment: {
                clients: getClientCount("comment"),
                health: getConnectionHealth("comment"),
            },
            site: {
                clients: getClientCount("site"),
                health: getConnectionHealth("site"),
            },
            subscriptions: getSubscriptionStatus(),
        },
        redis: {
            health: redisHealth,
            connection_details: connectionDetails,
            stats: {
                connected_clients:
                    redisStats.clients?.connected_clients || "unknown",
                used_memory: redisStats.memory?.used_memory_human || "unknown",
                total_commands_processed:
                    redisStats.stats?.total_commands_processed || "unknown",
                keyspace_hits: redisStats.stats?.keyspace_hits || "unknown",
                keyspace_misses: redisStats.stats?.keyspace_misses || "unknown",
                total_connections_received:
                    redisStats.stats?.total_connections_received || "unknown",
                rejected_connections:
                    redisStats.stats?.rejected_connections || "unknown",
            },
        },
    };
});
