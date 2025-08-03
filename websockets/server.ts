#!/usr/bin/env bun
/**
 * EVE-KILL Unified WebSocket Server
 * Serves all WebSocket types behind a single server instance
 *
 * Usage: bun websockets/server.ts
 */

import Redis from "ioredis";
import { type ClientData, type MessageHandler } from "./common";

// Import handlers from individual servers
import { commentsMessageHandler } from "./handlers/comments";
import { killmailConfig, killmailMessageHandler } from "./handlers/killmails";
import { siteConfig, siteMessageHandler } from "./handlers/site";

// Server configuration
const PORT = parseInt(process.env.WS_PORT || "3001");
const HOST = process.env.WS_HOST || "0.0.0.0";
const REDIS_HOST = process.env.REDIS_URI || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || "0");
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "thessia:";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Ping/Pong configuration
const PING_INTERVAL = parseInt(process.env.WS_PING_INTERVAL || "30000"); // 30 seconds
const PING_TIMEOUT = parseInt(process.env.WS_PING_TIMEOUT || "10000"); // 10 seconds
const CONNECTION_CLEANUP_INTERVAL = parseInt(
    process.env.WS_CLEANUP_INTERVAL || "60000"
); // 1 minute

// WebSocket type configuration
interface WebSocketTypeConfig {
    name: string;
    path: string;
    channels: string[];
    requiresTopics: boolean;
    validTopics?: string[];
    partialTopics?: string[];
    messageHandler: MessageHandler;
}

// Define all WebSocket types
const websocketTypes: WebSocketTypeConfig[] = [
    {
        name: "Killmails",
        path: "/killmails",
        channels: ["killmail-broadcasts"],
        requiresTopics: true,
        validTopics: killmailConfig.validTopics,
        partialTopics: killmailConfig.partialTopics,
        messageHandler: killmailMessageHandler,
    },
    {
        name: "Comments",
        path: "/comments",
        channels: ["comments:events"],
        requiresTopics: false,
        messageHandler: commentsMessageHandler,
    },
    {
        name: "Site Events",
        path: "/site",
        channels: ["site:events"],
        requiresTopics: true,
        validTopics: siteConfig.validTopics,
        partialTopics: siteConfig.partialTopics,
        messageHandler: siteMessageHandler,
    },
];

// Global state for all WebSocket types
const clientsByType = new Map<string, Map<any, ClientData>>();
let redisSubscriber: Redis | null = null;
let pingInterval: Timer | null = null;
let cleanupInterval: Timer | null = null;

// Initialize client maps for each type
for (const wsType of websocketTypes) {
    clientsByType.set(wsType.path, new Map());
}

/**
 * Setup Redis subscriber for all channels
 */
async function setupRedisSubscriber(): Promise<void> {
    redisSubscriber = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        db: REDIS_DB,
        keyPrefix: REDIS_KEY_PREFIX,
    });

    redisSubscriber.on("connect", () => {
        console.log("✅ Connected to Redis");
    });

    redisSubscriber.on("error", (error) => {
        console.error("❌ Redis error:", error);
    });

    // Subscribe to all channels
    const allChannels = [
        ...new Set(websocketTypes.flatMap((ws) => ws.channels)),
    ];
    if (allChannels.length > 0) {
        await redisSubscriber.subscribe(...allChannels);
        console.log(
            `🔔 Subscribed to Redis channels: ${allChannels.join(", ")}`
        );
    }

    redisSubscriber.on("message", (channel, message) => {
        try {
            const data = JSON.parse(message);
            const messageData = data.data || data;

            // Find WebSocket types that listen to this channel
            const relevantTypes = websocketTypes.filter((ws) =>
                ws.channels.includes(channel)
            );

            for (const wsType of relevantTypes) {
                broadcastToType(wsType, messageData);
            }
        } catch (error) {
            console.error(`Error parsing ${channel} broadcast:`, error);
        }
    });
}

/**
 * Send ping messages to all connected clients
 */
function sendPingToAllClients(): void {
    let totalPingsSent = 0;
    const now = new Date();

    for (const [path, clients] of clientsByType.entries()) {
        let pingsSentForType = 0;

        for (const [ws, clientData] of clients.entries()) {
            try {
                ws.send(
                    JSON.stringify({
                        type: "ping",
                        timestamp: now.toISOString(),
                    })
                );
                clientData.lastPing = now;
                pingsSentForType++;
                totalPingsSent++;
            } catch (error) {
                console.error(
                    `Error sending ping to client on ${path}:`,
                    error
                );
                // Remove disconnected client
                clients.delete(ws);
            }
        }

        if (pingsSentForType > 0) {
            const wsType = getWebSocketTypeByPath(path);
            console.log(
                `🏓 Sent ping to ${pingsSentForType} client(s) on ${
                    wsType?.name || path
                }`
            );
        }
    }

    if (totalPingsSent > 0) {
        console.log(`🏓 Total pings sent: ${totalPingsSent}`);
    }
}

/**
 * Cleanup unresponsive clients
 */
function cleanupUnresponsiveClients(): void {
    const now = new Date();
    let totalRemovedClients = 0;

    for (const [path, clients] of clientsByType.entries()) {
        const clientsToRemove: any[] = [];

        for (const [ws, clientData] of clients.entries()) {
            // Only check clients that have been pinged
            if (clientData.lastPing) {
                const timeSincePing =
                    now.getTime() - clientData.lastPing.getTime();

                // Only consider a client unresponsive if:
                // 1. We sent a ping more than PING_TIMEOUT ago, AND
                // 2. Either no pong received, OR the last pong was before the last ping
                if (timeSincePing > PING_TIMEOUT) {
                    const hasRecentPong =
                        clientData.lastPong &&
                        clientData.lastPong.getTime() >=
                            clientData.lastPing.getTime();

                    if (!hasRecentPong) {
                        console.log(
                            `🧹 Removing unresponsive client - Last ping: ${clientData.lastPing.toISOString()}, Last pong: ${
                                clientData.lastPong?.toISOString() || "never"
                            }, Time since ping: ${timeSincePing}ms`
                        );
                        clientsToRemove.push(ws);
                    }
                }
            }
        }

        // Remove unresponsive clients
        for (const ws of clientsToRemove) {
            try {
                ws.close(1000, "Unresponsive to ping");
            } catch (error) {
                // Ignore errors when closing
            }
            clients.delete(ws);
            totalRemovedClients++;
        }

        if (clientsToRemove.length > 0) {
            const wsType = getWebSocketTypeByPath(path);
            console.log(
                `🧹 Cleaned up ${
                    clientsToRemove.length
                } unresponsive client(s) on ${wsType?.name || path}`
            );
        }
    }

    if (totalRemovedClients > 0) {
        console.log(
            `🧹 Total unresponsive clients removed: ${totalRemovedClients}`
        );
    }
}

/**
 * Start ping/pong monitoring
 */
function startPingPongMonitoring(): void {
    // Send periodic pings
    pingInterval = setInterval(sendPingToAllClients, PING_INTERVAL);

    // Cleanup unresponsive clients
    cleanupInterval = setInterval(
        cleanupUnresponsiveClients,
        CONNECTION_CLEANUP_INTERVAL
    );

    console.log(
        `🏓 Started ping/pong monitoring - Ping interval: ${PING_INTERVAL}ms, Timeout: ${PING_TIMEOUT}ms`
    );
}

/**
 * Stop ping/pong monitoring
 */
function stopPingPongMonitoring(): void {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }

    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }

    console.log("🏓 Stopped ping/pong monitoring");
}

/**
 * Get WebSocket type config by path
 */
function getWebSocketTypeByPath(path: string): WebSocketTypeConfig | null {
    return websocketTypes.find((ws) => ws.path === path) || null;
}

/**
 * Check if a topic is valid for a WebSocket type
 */
function isValidTopic(wsType: WebSocketTypeConfig, topic: string): boolean {
    if (wsType.messageHandler.isValidTopic) {
        return wsType.messageHandler.isValidTopic(topic);
    }

    // Default validation
    if (wsType.validTopics && wsType.validTopics.includes(topic)) {
        return true;
    }

    if (wsType.partialTopics) {
        return wsType.partialTopics.some((prefix) => topic.startsWith(prefix));
    }

    // If no topic validation is configured, allow 'all'
    return topic === "all";
}

/**
 * Check if message should be sent to a client
 */
function shouldSendToClient(
    wsType: WebSocketTypeConfig,
    data: any,
    clientData: ClientData
): boolean {
    if (wsType.messageHandler.shouldSendToClient) {
        return wsType.messageHandler.shouldSendToClient(data, clientData);
    }

    // Default behavior: send if client has no topics or has 'all' topic
    if (clientData.topics.length === 0) return false;
    return clientData.topics.includes("all");
}

/**
 * Broadcast message to clients of a specific WebSocket type
 */
function broadcastToType(wsType: WebSocketTypeConfig, data: any): void {
    const clients = clientsByType.get(wsType.path);
    if (!clients) return;

    let sentCount = 0;
    const messageType = wsType.messageHandler.getMessageType
        ? wsType.messageHandler.getMessageType(data)
        : "message";
    const logId = wsType.messageHandler.getLogIdentifier
        ? wsType.messageHandler.getLogIdentifier(data)
        : "unknown";

    for (const [ws, clientData] of clients.entries()) {
        if (shouldSendToClient(wsType, data, clientData)) {
            try {
                ws.send(
                    JSON.stringify({
                        type: messageType,
                        data: data,
                    })
                );
                sentCount++;
            } catch (error) {
                console.error("Error sending to client:", error);
                // Remove disconnected client
                clients.delete(ws);
            }
        }
    }

    if (sentCount > 0) {
        console.log(
            `📡 Broadcasted ${wsType.name} ${messageType} ${logId} to ${sentCount} client(s)`
        );
    }
}

/**
 * Handle client subscription for a WebSocket type
 */
function handleSubscription(
    wsType: WebSocketTypeConfig,
    ws: any,
    topics: string[]
): void {
    const clients = clientsByType.get(wsType.path);
    if (!clients) return;

    const clientData = clients.get(ws);
    if (!clientData) return;

    if (!wsType.requiresTopics) {
        // For servers that don't use topics, just acknowledge
        ws.send(
            JSON.stringify({
                type: "subscribed",
                data: { topics: ["all"] },
            })
        );
        return;
    }

    const validTopicsToAdd = topics.filter((topic) =>
        isValidTopic(wsType, topic)
    );
    const invalidTopics = topics.filter(
        (topic) => !isValidTopic(wsType, topic)
    );

    if (invalidTopics.length > 0) {
        ws.send(
            JSON.stringify({
                type: "error",
                message: `Invalid topics: ${invalidTopics.join(", ")}`,
            })
        );
        return;
    }

    // Add to client topics (avoid duplicates)
    for (const topic of validTopicsToAdd) {
        if (!clientData.topics.includes(topic)) {
            clientData.topics.push(topic);
        }
    }

    ws.send(
        JSON.stringify({
            type: "subscribed",
            data: { topics: validTopicsToAdd },
        })
    );

    console.log(
        `📝 ${wsType.name} client subscribed to: ${validTopicsToAdd.join(", ")}`
    );
}

/**
 * Handle client unsubscription for a WebSocket type
 */
function handleUnsubscription(
    wsType: WebSocketTypeConfig,
    ws: any,
    topics: string[]
): void {
    const clients = clientsByType.get(wsType.path);
    if (!clients) return;

    const clientData = clients.get(ws);
    if (!clientData) return;

    for (const topic of topics) {
        const index = clientData.topics.indexOf(topic);
        if (index > -1) {
            clientData.topics.splice(index, 1);
        }
    }

    ws.send(
        JSON.stringify({
            type: "unsubscribed",
            data: { topics },
        })
    );

    console.log(
        `📝 ${wsType.name} client unsubscribed from: ${topics.join(", ")}`
    );
}

/**
 * Handle client messages for a WebSocket type
 */
function handleClientMessage(
    wsType: WebSocketTypeConfig,
    ws: any,
    message: string
): void {
    try {
        let parsedMessage: any;

        try {
            parsedMessage = JSON.parse(message);
        } catch {
            // Handle plain text format (backward compatibility)
            if (wsType.requiresTopics) {
                const topics = message.split(",").map((t) => t.trim());
                parsedMessage = { type: "subscribe", topics };
            } else {
                // For non-topic servers, ignore plain text messages
                return;
            }
        }

        const clients = clientsByType.get(wsType.path);
        if (!clients) return;

        const clientData = clients.get(ws);
        if (!clientData) return;

        switch (parsedMessage.type) {
            case "subscribe":
                handleSubscription(wsType, ws, parsedMessage.topics || []);
                break;

            case "unsubscribe":
                handleUnsubscription(wsType, ws, parsedMessage.topics || []);
                break;

            case "ping":
                clientData.lastPing = new Date();
                console.log(
                    `🏓 Received ping from client, responding with pong`
                );
                // Respond to client ping with pong (including timestamp if provided)
                ws.send(
                    JSON.stringify({
                        type: "pong",
                        timestamp:
                            parsedMessage.timestamp || new Date().toISOString(),
                    })
                );
                break;

            case "pong":
                clientData.lastPong = new Date();
                console.log(
                    `🏓 Received pong from client at ${clientData.lastPong.toISOString()}, last ping was at ${
                        clientData.lastPing?.toISOString() || "never"
                    }`
                );
                // Client responded to our ping - connection is healthy
                break;

            default:
                ws.send(
                    JSON.stringify({
                        type: "error",
                        message: `Unknown message type: ${parsedMessage.type}`,
                    })
                );
        }
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: "error",
                message: `Invalid message format: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
            })
        );
    }
}

/**
 * Get server statistics
 */
function getServerStats() {
    const stats: any = {
        server: "EVE-KILL Unified WebSocket Server",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        redis: redisSubscriber?.status === "ready",
        totalConnections: 0,
        totalSubscriptions: 0,
        websocketTypes: {},
    };

    for (const wsType of websocketTypes) {
        const clients = clientsByType.get(wsType.path);
        if (!clients) continue;

        const connections = clients.size;
        const subscriptions = Array.from(clients.values()).reduce(
            (acc, client) => acc + client.topics.length,
            0
        );

        stats.totalConnections += connections;
        stats.totalSubscriptions += subscriptions;

        stats.websocketTypes[wsType.path] = {
            name: wsType.name,
            path: wsType.path,
            connections,
            subscriptions,
            channels: wsType.channels,
            requiresTopics: wsType.requiresTopics,
            validTopics: wsType.validTopics || [],
            partialTopics: wsType.partialTopics || [],
        };
    }

    return stats;
}

/**
 * Start the unified WebSocket server
 */
async function startServer(): Promise<void> {
    // Setup Redis first
    await setupRedisSubscriber();

    // Create Bun WebSocket server
    const server = Bun.serve({
        port: PORT,
        hostname: HOST,

        // HTTP handler
        fetch(req, server) {
            const url = new URL(req.url);

            // Health check endpoint
            if (url.pathname === "/health") {
                const stats = getServerStats();
                return new Response(
                    JSON.stringify({
                        status: "healthy",
                        ...stats,
                    }),
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": FRONTEND_URL,
                            "Access-Control-Allow-Methods": "GET",
                            "Access-Control-Allow-Headers": "Content-Type",
                        },
                    }
                );
            }

            // Statistics endpoint
            if (url.pathname === "/stats") {
                return new Response(JSON.stringify(getServerStats()), {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": FRONTEND_URL,
                        "Access-Control-Allow-Methods": "GET",
                        "Access-Control-Allow-Headers": "Content-Type",
                    },
                });
            }

            // Root endpoint - server info
            if (url.pathname === "/") {
                const stats = getServerStats();
                return new Response(
                    JSON.stringify({
                        server: "EVE-KILL Unified WebSocket Server",
                        description:
                            "Multi-type WebSocket server for EVE-KILL real-time events",
                        endpoints: {
                            health: "/health",
                            stats: "/stats",
                            websockets: Object.fromEntries(
                                websocketTypes.map((ws) => [
                                    ws.path,
                                    {
                                        name: ws.name,
                                        url: `${ws.path}`,
                                        requiresTopics: ws.requiresTopics,
                                    },
                                ])
                            ),
                        },
                        totalConnections: stats.totalConnections,
                        uptime: stats.uptime,
                    }),
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": FRONTEND_URL,
                            "Access-Control-Allow-Methods": "GET",
                            "Access-Control-Allow-Headers": "Content-Type",
                            "X-Robots-Tag":
                                "noindex, nofollow, noarchive, nosnippet",
                        },
                    }
                );
            }

            // Check if this is a WebSocket upgrade request
            const wsType = getWebSocketTypeByPath(url.pathname);
            if (wsType) {
                // Check for proper WebSocket upgrade headers
                const upgrade = req.headers.get("upgrade");
                const connection = req.headers.get("connection");

                if (
                    upgrade?.toLowerCase() === "websocket" &&
                    connection?.toLowerCase().includes("upgrade")
                ) {
                    const success = server.upgrade(req, {
                        data: {
                            wsType,
                            topics: wsType.requiresTopics ? [] : ["all"],
                            connectedAt: new Date(),
                        },
                    });

                    if (success) {
                        // Bun automatically returns a 101 Switching Protocols
                        return undefined;
                    }
                }

                // If it's a WebSocket path but not a proper upgrade request,
                // return an error indicating WebSocket is required
                return new Response("WebSocket upgrade required", {
                    status: 400,
                    headers: {
                        "Content-Type": "text/plain",
                        "Access-Control-Allow-Origin": FRONTEND_URL,
                        "X-Robots-Tag":
                            "noindex, nofollow, noarchive, nosnippet",
                    },
                });
            }

            // 404 for unknown paths
            return new Response("Not Found", {
                status: 404,
                headers: {
                    "Access-Control-Allow-Origin": FRONTEND_URL,
                    "X-Robots-Tag": "noindex, nofollow",
                },
            });
        },

        // WebSocket handlers
        websocket: {
            // Client connected
            open(ws) {
                const data = ws.data as any;
                const wsType = data.wsType as WebSocketTypeConfig;

                const clientData: ClientData = {
                    topics: data.topics,
                    connectedAt: data.connectedAt,
                    lastPing: undefined,
                    lastPong: undefined,
                };

                const clients = clientsByType.get(wsType.path);
                if (clients) {
                    clients.set(ws, clientData);

                    // Send welcome message
                    const welcomeMessage: any = {
                        type: "info",
                        message: wsType.requiresTopics
                            ? `Welcome to ${wsType.name}! Please subscribe to topics you want to receive.`
                            : `Welcome to ${wsType.name} events!`,
                    };

                    if (wsType.requiresTopics) {
                        welcomeMessage.data = {
                            validTopics: wsType.validTopics,
                            partialTopics: wsType.partialTopics,
                        };
                    }

                    ws.send(JSON.stringify(welcomeMessage));

                    console.log(
                        `✅ Client connected to ${wsType.name} (${clients.size} total on ${wsType.path})`
                    );
                }
            },

            // Message received
            message(ws, message) {
                const data = ws.data as any;
                const wsType = data.wsType as WebSocketTypeConfig;
                const messageStr =
                    typeof message === "string" ? message : message.toString();
                handleClientMessage(wsType, ws, messageStr);
            },

            // Client disconnected
            close(ws, code, reason) {
                const data = ws.data as any;
                const wsType = data.wsType as WebSocketTypeConfig;
                const clients = clientsByType.get(wsType.path);

                if (clients) {
                    clients.delete(ws);
                    console.log(
                        `❌ Client disconnected from ${wsType.name} (${clients.size} total on ${wsType.path}) - Code: ${code}`
                    );
                }
            },
        },
    });

    console.log(
        `🚀 EVE-KILL Unified WebSocket Server running on ${HOST}:${PORT}`
    );
    console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📊 Statistics: http://${HOST}:${PORT}/stats`);
    console.log(`📡 Server info: http://${HOST}:${PORT}/`);
    console.log("\n📡 Available WebSocket endpoints:");

    for (const wsType of websocketTypes) {
        console.log(`   ${wsType.name}: ws://${HOST}:${PORT}${wsType.path}`);
    }

    // Start ping/pong monitoring
    startPingPongMonitoring();

    // Start periodic statistics logging
    setInterval(() => {
        const stats = getServerStats();
        console.log(
            `📊 Server Stats: ${stats.totalConnections} total connections, ${
                stats.totalSubscriptions
            } total subscriptions, Redis: ${stats.redis ? "✅" : "❌"}`
        );
    }, 30000); // Every 30 seconds

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n📡 Received ${signal}, shutting down gracefully...`);

        // Stop ping/pong monitoring
        stopPingPongMonitoring();

        // Close all client connections
        for (const [path, clients] of clientsByType.entries()) {
            for (const [ws] of clients.entries()) {
                try {
                    ws.close(1000, "Server shutting down");
                } catch (error) {
                    // Ignore errors during shutdown
                }
            }
        }

        // Disconnect from Redis
        if (redisSubscriber) {
            await redisSubscriber.disconnect();
        }

        // Stop the server
        server.stop();
        console.log("✅ Graceful shutdown completed");
        process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

// Start the server
startServer().catch((error) => {
    console.error("❌ Failed to start unified WebSocket server:", error);
    process.exit(1);
});
