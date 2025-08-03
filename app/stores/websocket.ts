import { defineStore } from "pinia";

export interface SiteEvent {
    eventType: string;
    data: any;
    timestamp: number;
    targetUserId?: string;
    targetComponent?: string;
    notificationType?: string;
}

export interface WebSocketConnection {
    socket: WebSocket | null;
    state: "disconnected" | "connecting" | "connected" | "error";
    subscriptions: Set<string>;
    eventListeners: Map<string, Array<(event: SiteEvent) => void>>;
    reconnectAttempts: number;
    reconnectTimer: NodeJS.Timeout | null;
}

interface WebSocketStoreState {
    connections: Map<string, WebSocketConnection>;
    defaultOptions: {
        autoConnect: boolean;
        reconnectInterval: number;
        maxReconnectAttempts: number;
    };
}

export const useWebSocketStore = defineStore("websocket", {
    state: (): WebSocketStoreState => ({
        connections: new Map(),
        defaultOptions: {
            autoConnect: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
        },
    }),

    getters: {
        /**
         * Get connection by type
         */
        getConnection: (state) => (connectionType: string) => {
            return state.connections.get(connectionType);
        },

        /**
         * Check if connection is connected
         */
        isConnected: (state) => (connectionType: string) => {
            const connection = state.connections.get(connectionType);
            return connection?.state === "connected";
        },

        /**
         * Get connection state
         */
        getConnectionState: (state) => (connectionType: string) => {
            const connection = state.connections.get(connectionType);
            return connection?.state || "disconnected";
        },

        /**
         * Get all active connections
         */
        activeConnections: (state) => {
            return Array.from(state.connections.entries()).filter(
                ([_, connection]) => connection.state === "connected"
            );
        },
    },

    actions: {
        /**
         * Initialize a connection type
         */
        initializeConnection(connectionType: string) {
            // Only initialize on client side
            if (!import.meta.client) {
                return;
            }

            if (!this.connections.has(connectionType)) {
                this.connections.set(connectionType, {
                    socket: null,
                    state: "disconnected",
                    subscriptions: new Set(),
                    eventListeners: new Map(),
                    reconnectAttempts: 0,
                    reconnectTimer: null,
                });
            }
        },

        /**
         * Connect to WebSocket
         */
        async connect(
            connectionType: string,
            options: {
                autoConnect?: boolean;
                reconnectInterval?: number;
                maxReconnectAttempts?: number;
            } = {}
        ) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            this.initializeConnection(connectionType);
            const connection = this.connections.get(connectionType)!;

            // Don't connect if already connected or connecting
            if (
                connection.state === "connected" ||
                connection.state === "connecting"
            ) {
                return;
            }

            connection.state = "connecting";

            try {
                const authStore = useAuthStore();
                const protocol =
                    window.location.protocol === "https:" ? "wss:" : "ws:";
                const wsUrl = `${protocol}//${window.location.host}/ws`;

                const socket = new WebSocket(wsUrl);
                connection.socket = socket;

                socket.onopen = () => {
                    console.log(`WebSocket connected for ${connectionType}`);
                    connection.state = "connected";
                    connection.reconnectAttempts = 0;

                    // Send authentication if user is logged in
                    if (authStore.isAuthenticated && authStore.currentUser) {
                        socket.send(
                            JSON.stringify({
                                type: "auth",
                                token: authStore.currentUser.uniqueIdentifier,
                            })
                        );
                    }

                    // Send subscriptions
                    if (connection.subscriptions.size > 0) {
                        socket.send(
                            JSON.stringify({
                                type: "subscribe",
                                subscriptions: Array.from(
                                    connection.subscriptions
                                ),
                            })
                        );
                    }
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data) as SiteEvent;
                        this.handleMessage(connectionType, data);
                    } catch (error) {
                        console.error(
                            "Failed to parse WebSocket message:",
                            error
                        );
                    }
                };

                socket.onclose = () => {
                    console.log(`WebSocket disconnected for ${connectionType}`);
                    connection.state = "disconnected";
                    connection.socket = null;

                    // Auto-reconnect if enabled
                    const {
                        autoConnect,
                        reconnectInterval,
                        maxReconnectAttempts,
                    } = {
                        ...this.defaultOptions,
                        ...options,
                    };

                    if (
                        autoConnect &&
                        connection.reconnectAttempts < maxReconnectAttempts
                    ) {
                        connection.reconnectAttempts++;
                        connection.reconnectTimer = setTimeout(() => {
                            this.connect(connectionType, options);
                        }, reconnectInterval);
                    }
                };

                socket.onerror = (error) => {
                    console.error(
                        `WebSocket error for ${connectionType}:`,
                        error
                    );
                    connection.state = "error";
                };
            } catch (error) {
                console.error(
                    `Failed to connect WebSocket for ${connectionType}:`,
                    error
                );
                connection.state = "error";
            }
        },

        /**
         * Disconnect WebSocket
         */
        disconnect(connectionType: string) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            const connection = this.connections.get(connectionType);
            if (!connection) return;

            // Clear reconnect timer
            if (connection.reconnectTimer) {
                clearTimeout(connection.reconnectTimer);
                connection.reconnectTimer = null;
            }

            // Close socket
            if (connection.socket) {
                connection.socket.close();
                connection.socket = null;
            }

            connection.state = "disconnected";
            connection.reconnectAttempts = 0;
        },

        /**
         * Subscribe to events
         */
        subscribe(connectionType: string, subscription: string) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            this.initializeConnection(connectionType);
            const connection = this.connections.get(connectionType)!;

            connection.subscriptions.add(subscription);

            // Send subscription if connected
            if (connection.socket && connection.state === "connected") {
                connection.socket.send(
                    JSON.stringify({
                        type: "subscribe",
                        subscriptions: [subscription],
                    })
                );
            }
        },

        /**
         * Unsubscribe from events
         */
        unsubscribe(connectionType: string, subscription: string) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            const connection = this.connections.get(connectionType);
            if (!connection) return;

            connection.subscriptions.delete(subscription);

            // Send unsubscription if connected
            if (connection.socket && connection.state === "connected") {
                connection.socket.send(
                    JSON.stringify({
                        type: "unsubscribe",
                        subscriptions: [subscription],
                    })
                );
            }
        },

        /**
         * Add event listener
         */
        addEventListener(
            connectionType: string,
            eventType: string,
            callback: (event: SiteEvent) => void
        ) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            this.initializeConnection(connectionType);
            const connection = this.connections.get(connectionType)!;

            if (!connection.eventListeners.has(eventType)) {
                connection.eventListeners.set(eventType, []);
            }

            connection.eventListeners.get(eventType)!.push(callback);
        },

        /**
         * Remove event listener
         */
        removeEventListener(
            connectionType: string,
            eventType: string,
            callback: (event: SiteEvent) => void
        ) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            const connection = this.connections.get(connectionType);
            if (!connection) return;

            const listeners = connection.eventListeners.get(eventType);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }

                // Clean up empty arrays
                if (listeners.length === 0) {
                    connection.eventListeners.delete(eventType);
                }
            }
        },

        /**
         * Handle incoming messages
         */
        handleMessage(connectionType: string, event: SiteEvent) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            const connection = this.connections.get(connectionType);
            if (!connection) return;

            // Call event listeners for this event type
            const listeners = connection.eventListeners.get(event.eventType);
            if (listeners) {
                listeners.forEach((callback) => {
                    try {
                        callback(event);
                    } catch (error) {
                        console.error(
                            "Error in WebSocket event listener:",
                            error
                        );
                    }
                });
            }

            // Call general listeners
            const generalListeners = connection.eventListeners.get("*");
            if (generalListeners) {
                generalListeners.forEach((callback) => {
                    try {
                        callback(event);
                    } catch (error) {
                        console.error(
                            "Error in WebSocket general event listener:",
                            error
                        );
                    }
                });
            }
        },

        /**
         * Send message through WebSocket
         */
        send(connectionType: string, message: any) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            const connection = this.connections.get(connectionType);
            if (connection?.socket && connection.state === "connected") {
                connection.socket.send(JSON.stringify(message));
            }
        },

        /**
         * Clean up all connections
         */
        cleanup() {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            for (const [connectionType] of this.connections) {
                this.disconnect(connectionType);
            }
            this.connections.clear();
        },

        /**
         * Handle authentication state changes
         */
        onAuthChange(isAuthenticated: boolean) {
            // Only work on client side
            if (!import.meta.client) {
                return;
            }

            if (!isAuthenticated) {
                // User logged out, disconnect all connections
                this.cleanup();
            } else {
                // User logged in, reconnect active connections
                for (const [connectionType, connection] of this.connections) {
                    if (
                        connection.state === "disconnected" &&
                        connection.subscriptions.size > 0
                    ) {
                        this.connect(connectionType);
                    }
                }
            }
        },
    },
});
