/**
 * Common WebSocket Server Infrastructure
 * Shared functionality for all EVE-KILL WebSocket servers
 */

import Redis from "ioredis";

// Configuration interface
export interface WebSocketServerConfig {
    port: number;
    host: string;
    redis: {
        host: string;
        port: number;
        password?: string;
        db: number;
        keyPrefix: string;
    };
    cors: {
        origin: string;
    };
    channels: string[]; // Redis channels to subscribe to
    serverName: string; // For logging and health checks
    requiresTopics?: boolean; // Whether this server uses topic-based routing
    validTopics?: string[]; // Valid fixed topics
    partialTopics?: string[]; // Valid topic prefixes
}

// Client data interface
export interface ClientData {
    topics: string[];
    connectedAt: Date;
    lastPing?: Date;
    lastPong?: Date;
}

// Message types
export interface WebSocketMessage {
    type:
        | "subscribe"
        | "unsubscribe"
        | "ping"
        | "pong"
        | "info"
        | "error"
        | "subscribed"
        | "unsubscribed";
    message?: string;
    topics?: string[];
    data?: any;
}

// Routing and validation functions interface
export interface MessageHandler {
    isValidTopic?: (topic: string) => boolean;
    generateRoutingKeys?: (data: any) => string[];
    shouldSendToClient?: (data: any, clientData: ClientData) => boolean;
    getMessageType?: (data: any) => string;
    getLogIdentifier?: (data: any) => string;
}

// WebSocket server class
export class CommonWebSocketServer {
    private config: WebSocketServerConfig;
    private clients = new Map<any, ClientData>();
    private redisSubscriber: Redis | null = null;
    private messageHandler: MessageHandler;
    private server: any = null;

    constructor(
        config: WebSocketServerConfig,
        messageHandler: MessageHandler = {}
    ) {
        this.config = config;
        this.messageHandler = messageHandler;
    }

    /**
     * Setup Redis subscriber
     */
    private async setupRedisSubscriber(): Promise<void> {
        this.redisSubscriber = new Redis({
            host: this.config.redis.host,
            port: this.config.redis.port,
            password: this.config.redis.password,
            db: this.config.redis.db,
            keyPrefix: this.config.redis.keyPrefix,
        });

        this.redisSubscriber.on("connect", () => {
            console.log("✅ Connected to Redis");
        });

        this.redisSubscriber.on("error", (error) => {
            console.error("❌ Redis error:", error);
        });

        // Subscribe to all configured channels
        if (this.config.channels.length > 0) {
            await this.redisSubscriber.subscribe(...this.config.channels);
            console.log(
                `🔔 Subscribed to Redis channels: ${this.config.channels.join(
                    ", "
                )}`
            );
        }

        this.redisSubscriber.on("message", (channel, message) => {
            try {
                const data = JSON.parse(message);
                const messageData = data.data || data;
                this.broadcastMessage(messageData, channel);
            } catch (error) {
                console.error(`Error parsing ${channel} broadcast:`, error);
            }
        });
    }

    /**
     * Check if a topic is valid
     */
    private isValidTopic(topic: string): boolean {
        if (this.messageHandler.isValidTopic) {
            return this.messageHandler.isValidTopic(topic);
        }

        // Default validation
        if (
            this.config.validTopics &&
            this.config.validTopics.includes(topic)
        ) {
            return true;
        }

        if (this.config.partialTopics) {
            return this.config.partialTopics.some((prefix) =>
                topic.startsWith(prefix)
            );
        }

        // If no topic validation is configured, allow 'all'
        return topic === "all";
    }

    /**
     * Check if message should be sent to a client
     */
    private shouldSendToClient(data: any, clientData: ClientData): boolean {
        if (this.messageHandler.shouldSendToClient) {
            return this.messageHandler.shouldSendToClient(data, clientData);
        }

        // Default behavior: send if client has no topics or has 'all' topic
        if (clientData.topics.length === 0) return false;
        return clientData.topics.includes("all");
    }

    /**
     * Broadcast message to relevant clients
     */
    private broadcastMessage(data: any, channel?: string): void {
        let sentCount = 0;
        const messageType = this.messageHandler.getMessageType
            ? this.messageHandler.getMessageType(data)
            : "message";
        const logId = this.messageHandler.getLogIdentifier
            ? this.messageHandler.getLogIdentifier(data)
            : "unknown";

        for (const [ws, clientData] of this.clients.entries()) {
            if (this.shouldSendToClient(data, clientData)) {
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
                    this.clients.delete(ws);
                }
            }
        }

        if (sentCount > 0) {
            console.log(
                `📡 Broadcasted ${messageType} ${logId} to ${sentCount} client(s)`
            );
        }
    }

    /**
     * Handle client subscription
     */
    private handleSubscription(ws: any, topics: string[]): void {
        const clientData = this.clients.get(ws);
        if (!clientData) return;

        if (!this.config.requiresTopics) {
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
            this.isValidTopic(topic)
        );
        const invalidTopics = topics.filter(
            (topic) => !this.isValidTopic(topic)
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

        console.log(`📝 Client subscribed to: ${validTopicsToAdd.join(", ")}`);
    }

    /**
     * Handle client unsubscription
     */
    private handleUnsubscription(ws: any, topics: string[]): void {
        const clientData = this.clients.get(ws);
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

        console.log(`📝 Client unsubscribed from: ${topics.join(", ")}`);
    }

    /**
     * Handle client messages
     */
    private handleClientMessage(ws: any, message: string): void {
        try {
            let parsedMessage: any;

            try {
                parsedMessage = JSON.parse(message);
            } catch {
                // Handle plain text format (backward compatibility)
                if (this.config.requiresTopics) {
                    const topics = message.split(",").map((t) => t.trim());
                    parsedMessage = { type: "subscribe", topics };
                } else {
                    // For non-topic servers, ignore plain text messages
                    return;
                }
            }

            const clientData = this.clients.get(ws);
            if (!clientData) return;

            switch (parsedMessage.type) {
                case "subscribe":
                    this.handleSubscription(ws, parsedMessage.topics || []);
                    break;

                case "unsubscribe":
                    this.handleUnsubscription(ws, parsedMessage.topics || []);
                    break;

                case "ping":
                    clientData.lastPing = new Date();
                    ws.send(JSON.stringify({ type: "pong" }));
                    break;

                case "pong":
                    clientData.lastPong = new Date();
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
    public getStats() {
        const totalTopics = Array.from(this.clients.values()).reduce(
            (acc, client) => acc + client.topics.length,
            0
        );

        return {
            connections: this.clients.size,
            totalSubscriptions: totalTopics,
            redisStatus: this.redisSubscriber?.status === "ready",
            uptime: process.uptime(),
            validTopics: this.config.validTopics || [],
            partialTopics: this.config.partialTopics || [],
            channels: this.config.channels,
            serverName: this.config.serverName,
        };
    }

    /**
     * Start the WebSocket server
     */
    public async start(): Promise<void> {
        // Setup Redis first
        await this.setupRedisSubscriber();

        // Create Bun WebSocket server
        this.server = Bun.serve<ClientData>({
            port: this.config.port,
            hostname: this.config.host,

            // HTTP handler
            fetch: (req, server) => {
                const url = new URL(req.url);

                // Health check endpoint
                if (url.pathname === "/health") {
                    return new Response(
                        JSON.stringify({
                            status: "healthy",
                            timestamp: new Date().toISOString(),
                            ...this.getStats(),
                        }),
                        {
                            headers: {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin":
                                    this.config.cors.origin,
                                "Access-Control-Allow-Methods": "GET",
                                "Access-Control-Allow-Headers": "Content-Type",
                            },
                        }
                    );
                }

                // Upgrade WebSocket connections
                const success = server.upgrade(req, {
                    data: {
                        topics: [],
                        connectedAt: new Date(),
                    },
                });

                if (success) {
                    // Bun automatically returns a 101 Switching Protocols
                    return undefined;
                }

                // Handle regular HTTP requests
                return new Response(
                    `EVE-KILL ${this.config.serverName} WebSocket Server`,
                    {
                        headers: {
                            "Access-Control-Allow-Origin":
                                this.config.cors.origin,
                            "Access-Control-Allow-Methods":
                                "GET, POST, OPTIONS",
                            "Access-Control-Allow-Headers": "Content-Type",
                        },
                    }
                );
            },

            // WebSocket handlers
            websocket: {
                // Client connected
                open: (ws) => {
                    const clientData: ClientData = {
                        topics: this.config.requiresTopics ? [] : ["all"],
                        connectedAt: new Date(),
                    };

                    this.clients.set(ws, clientData);

                    // Send welcome message
                    const welcomeMessage: any = {
                        type: "info",
                        message: this.config.requiresTopics
                            ? "Welcome! Please subscribe to topics you want to receive."
                            : `Welcome to ${this.config.serverName} events!`,
                    };

                    if (this.config.requiresTopics) {
                        welcomeMessage.data = {
                            validTopics: this.config.validTopics,
                            partialTopics: this.config.partialTopics,
                        };
                    }

                    ws.send(JSON.stringify(welcomeMessage));

                    console.log(
                        `✅ Client connected to ${this.config.serverName} (${this.clients.size} total)`
                    );
                },

                // Message received
                message: (ws, message) => {
                    const messageStr =
                        typeof message === "string"
                            ? message
                            : message.toString();
                    this.handleClientMessage(ws, messageStr);
                },

                // Client disconnected
                close: (ws, code, reason) => {
                    this.clients.delete(ws);
                    console.log(
                        `❌ Client disconnected from ${this.config.serverName} (${this.clients.size} total) - Code: ${code}`
                    );
                },

                // Handle errors
                error: (ws, error) => {
                    console.error(
                        `WebSocket error on ${this.config.serverName}:`,
                        error
                    );
                    this.clients.delete(ws);
                },
            },
        });

        console.log(
            `🚀 ${this.config.serverName} WebSocket server running on ${this.config.host}:${this.config.port}`
        );
        console.log(
            `🔗 Health check: http://${this.config.host}:${this.config.port}/health`
        );
        console.log(
            `📡 WebSocket endpoint: ws://${this.config.host}:${this.config.port}`
        );

        // Start periodic statistics logging
        this.startStatsLogging();
    }

    /**
     * Start periodic statistics logging
     */
    private startStatsLogging(): void {
        setInterval(() => {
            const stats = this.getStats();
            console.log(
                `📊 ${this.config.serverName} Stats: ${
                    stats.connections
                } connections, ${
                    stats.totalSubscriptions
                } total subscriptions, Redis: ${
                    stats.redisStatus ? "✅" : "❌"
                }`
            );
        }, 30000); // Every 30 seconds
    }

    /**
     * Graceful shutdown
     */
    public async shutdown(signal: string): Promise<void> {
        console.log(
            `\n📡 ${this.config.serverName} received ${signal}, shutting down gracefully...`
        );

        // Close all client connections
        for (const [ws] of this.clients.entries()) {
            try {
                ws.close(1000, "Server shutting down");
            } catch (error) {
                // Ignore errors during shutdown
            }
        }

        // Disconnect from Redis
        if (this.redisSubscriber) {
            await this.redisSubscriber.disconnect();
        }

        // Stop the server
        if (this.server) {
            this.server.stop();
        }

        console.log(`✅ ${this.config.serverName} graceful shutdown completed`);
    }

    /**
     * Setup graceful shutdown handlers
     */
    public setupGracefulShutdown(): void {
        const shutdown = (signal: string) => {
            this.shutdown(signal).then(() => {
                process.exit(0);
            });
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    }
}

/**
 * Environment configuration helper
 */
export function getEnvironmentConfig(defaults: {
    port: number;
    serverName: string;
}): Omit<
    WebSocketServerConfig,
    "channels" | "requiresTopics" | "validTopics" | "partialTopics"
> {
    return {
        port: parseInt(process.env.WS_PORT || defaults.port.toString()),
        host: process.env.WS_HOST || "0.0.0.0",
        redis: {
            host: process.env.REDIS_URI || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || "0"),
            keyPrefix: process.env.REDIS_KEY_PREFIX || "thessia:",
        },
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
        },
        serverName: defaults.serverName,
    };
}
