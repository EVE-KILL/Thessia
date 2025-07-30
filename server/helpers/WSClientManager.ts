import { RedisStorage } from "./Storage";

// WebSocket client interface
interface WSClient {
    send: (message: string) => void;
    id?: string; // Add unique identifier for tracking
}

// Client info for tracking connection health
interface ClientInfo {
    lastPingSent: number;
    lastPongReceived: number;
    isAlive: boolean;
    topics?: string[]; // For topic-based subscriptions (like killmail routing)
}

// WebSocket type configuration
interface WSTypeConfig {
    channel: string;
    broadcastHandler: (data: any, routingKeys?: string[]) => void;
    requiresTopics?: boolean; // Whether this WS type uses topic-based filtering
}

// Connection health configuration
const PING_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 5000; // 5 seconds to respond to ping
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds

// Generic client management
const clientMaps = new Map<string, Map<WSClient, ClientInfo>>();
const subscriptions = new Map<
    string,
    {
        isSubscribed: boolean;
        unsubscribe: (() => Promise<void>) | null;
        healthCheck: NodeJS.Timeout | null;
    }
>();

// WebSocket type configurations
const wsTypes = new Map<string, WSTypeConfig>();

/**
 * Register a WebSocket type with its configuration
 */
export function registerWSType(typeName: string, config: WSTypeConfig) {
    wsTypes.set(typeName, config);
    clientMaps.set(typeName, new Map<WSClient, ClientInfo>());
    subscriptions.set(typeName, {
        isSubscribed: false,
        unsubscribe: null,
        healthCheck: null,
    });
}

/**
 * Generic subscription initialization
 */
async function initializeSubscription(typeName: string) {
    const typeConfig = wsTypes.get(typeName);
    const subscription = subscriptions.get(typeName);

    if (!typeConfig || !subscription || subscription.isSubscribed) return;

    const redis = RedisStorage.getInstance();

    // Create the subscription callback
    const subscriptionCallback = (message: string) => {
        try {
            const data = JSON.parse(message);

            if (typeName === "killmail") {
                const { killmail, routingKeys } = data;
                typeConfig.broadcastHandler(killmail, routingKeys);
            } else {
                typeConfig.broadcastHandler(data);
            }
        } catch (error) {
            console.error(`Error processing ${typeName} from Redis:`, error);
        }
    };

    // Subscribe to Redis
    await redis.subscribe(typeConfig.channel, subscriptionCallback);

    // Store unsubscribe function for cleanup
    subscription.unsubscribe = async () => {
        await redis.unsubscribe(typeConfig.channel, subscriptionCallback);
    };

    subscription.isSubscribed = true;

    // Start health check
    startHealthCheck(typeName);
}

/**
 * Generic client addition
 */
export function addClient(typeName: string, peer: WSClient, topics?: string[]) {
    const clientMap = clientMaps.get(typeName);
    if (!clientMap) {
        console.error(`WebSocket type '${typeName}' not registered`);
        return;
    }

    // Ensure we're subscribed to Redis when the first client connects
    if (clientMap.size === 0) {
        initializeSubscription(typeName);
    }

    clientMap.set(peer, {
        lastPingSent: Date.now(),
        lastPongReceived: Date.now(),
        isAlive: true,
        topics: topics,
    });
}

/**
 * Generic client removal
 */
export async function removeClient(typeName: string, peer: WSClient) {
    const clientMap = clientMaps.get(typeName);
    const subscription = subscriptions.get(typeName);

    if (!clientMap || !subscription) return;

    clientMap.delete(peer);

    // Clean up Redis subscription if no clients remain
    if (clientMap.size === 0) {
        await cleanupSubscription(typeName);
    }
}

/**
 * Generic pong handler
 */
export function handleClientPong(typeName: string, peer: WSClient) {
    const clientMap = clientMaps.get(typeName);
    if (!clientMap) return;

    const clientInfo = clientMap.get(peer);
    if (clientInfo) {
        clientInfo.lastPongReceived = Date.now();
        clientInfo.isAlive = true;
    }
}

/**
 * Cleanup function for Redis subscriptions
 */
async function cleanupSubscription(typeName: string) {
    const subscription = subscriptions.get(typeName);
    if (!subscription) return;

    if (subscription.unsubscribe) {
        await subscription.unsubscribe();
        subscription.unsubscribe = null;
    }
    subscription.isSubscribed = false;

    if (subscription.healthCheck) {
        clearInterval(subscription.healthCheck);
        subscription.healthCheck = null;
    }
}

/**
 * Generic health check function
 */
function startHealthCheck(typeName: string) {
    const subscription = subscriptions.get(typeName);
    const clientMap = clientMaps.get(typeName);

    if (!subscription || !clientMap || subscription.healthCheck) return;

    subscription.healthCheck = setInterval(() => {
        const now = Date.now();
        const deadClients: WSClient[] = [];

        clientMap.forEach((clientInfo, client) => {
            // Check if client is responsive
            if (
                !clientInfo.isAlive &&
                now - clientInfo.lastPingSent > PING_TIMEOUT
            ) {
                deadClients.push(client);
                return;
            }

            // Send ping if it's time
            if (now - clientInfo.lastPingSent > PING_INTERVAL) {
                try {
                    client.send(
                        JSON.stringify({ type: "ping", timestamp: now })
                    );
                    clientInfo.lastPingSent = now;
                    clientInfo.isAlive = false; // Will be set back to true when pong is received
                } catch (error) {
                    console.error(
                        `Error sending ping to ${typeName} client:`,
                        error
                    );
                    deadClients.push(client);
                }
            }
        });

        // Remove dead clients
        deadClients.forEach((client) => removeClient(typeName, client));
    }, HEALTH_CHECK_INTERVAL);
}

/**
 * Broadcast functions for each type - these will be used by the route files
 */
export function broadcastToKillmailClients(
    killmail: any,
    routingKeys?: string[]
) {
    if (!routingKeys) return;
    const clientMap = clientMaps.get("killmail");
    if (!clientMap) return;

    clientMap.forEach((clientInfo, client) => {
        if (
            clientInfo.topics &&
            clientInfo.topics.some((topic: string) =>
                routingKeys.includes(topic)
            )
        ) {
            try {
                const message = JSON.stringify({
                    type: "killmail",
                    data: killmail,
                });
                client.send(message);
            } catch (error) {
                console.error(
                    "Error sending message to killmail client:",
                    error
                );
                clientInfo.isAlive = false;
            }
        }
    });
}

export function broadcastToCommentClients(commentEvent: any) {
    const clientMap = clientMaps.get("comment");
    if (!clientMap) return;

    clientMap.forEach((clientInfo, client) => {
        try {
            const message =
                typeof commentEvent === "string"
                    ? commentEvent
                    : JSON.stringify(commentEvent);
            client.send(message);
        } catch (error) {
            console.error("Error sending comment event to client:", error);
            clientInfo.isAlive = false;
        }
    });
}

export function broadcastToSiteClients(siteEvent: any) {
    const clientMap = clientMaps.get("site");
    if (!clientMap) return;

    clientMap.forEach((clientInfo, client) => {
        try {
            const message =
                typeof siteEvent === "string"
                    ? siteEvent
                    : JSON.stringify(siteEvent);
            client.send(message);
        } catch (error) {
            console.error("Error sending site event to client:", error);
            clientInfo.isAlive = false;
        }
    });
}

/**
 * Statistics and monitoring functions
 */
export function getClientCount(typeName: string): number {
    const clientMap = clientMaps.get(typeName);
    return clientMap ? clientMap.size : 0;
}

export function getSubscriptionStatus() {
    const status: Record<string, boolean> = {};
    subscriptions.forEach((subscription, typeName) => {
        status[typeName] = subscription.isSubscribed;
    });
    return status;
}

export function getConnectionHealth(typeName: string) {
    const clientMap = clientMaps.get(typeName);
    if (!clientMap) {
        return {
            alive_clients: 0,
            total_clients: 0,
            last_ping_sent: null,
        };
    }

    const now = Date.now();
    let alive_clients = 0;
    let total_clients = clientMap.size;
    let last_ping_sent: number | null = null;

    clientMap.forEach((clientInfo) => {
        if (
            clientInfo.isAlive &&
            now - clientInfo.lastPongReceived < PING_INTERVAL + PING_TIMEOUT
        ) {
            alive_clients++;
        }

        // Track the most recent ping sent
        if (
            last_ping_sent === null ||
            clientInfo.lastPingSent > last_ping_sent
        ) {
            last_ping_sent = clientInfo.lastPingSent;
        }
    });

    return {
        alive_clients,
        total_clients,
        last_ping_sent: last_ping_sent
            ? new Date(last_ping_sent).toISOString()
            : null,
    };
}
