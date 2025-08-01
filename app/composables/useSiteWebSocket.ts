import { computed, onMounted, onUnmounted, readonly, ref, watch } from "vue";

interface SiteEvent {
    eventType: string;
    data: any;
    timestamp: number;
    targetUserId?: string;
    targetComponent?: string;
    notificationType?: string;
}

interface SiteWebSocketOptions {
    autoConnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    connectionType?: "notifications" | "components";
}

// Singleton state for different connection types
const wsInstances = new Map<string, WebSocket>();
const connectionStates = new Map<
    string,
    Ref<"disconnected" | "connecting" | "connected" | "error">
>();
const subscriptions = new Map<string, Ref<Set<string>>>();
const eventListeners = new Map<
    string,
    Ref<Map<string, Array<(event: SiteEvent) => void>>>
>();
const reconnectAttempts = new Map<string, number>();
const reconnectTimers = new Map<string, NodeJS.Timeout>();

export const useSiteWebSocket = (options: SiteWebSocketOptions = {}) => {
    const {
        autoConnect = true,
        reconnectInterval = 5000,
        maxReconnectAttempts = 10,
        connectionType = "notifications",
    } = options;

    // Get or create state for this connection type
    if (!connectionStates.has(connectionType)) {
        connectionStates.set(connectionType, ref("disconnected"));
        subscriptions.set(connectionType, ref(new Set()));
        eventListeners.set(connectionType, ref(new Map()));
        reconnectAttempts.set(connectionType, 0);
    }

    const connectionState = connectionStates.get(connectionType)!;
    const connectionSubscriptions = subscriptions.get(connectionType)!;
    const connectionEventListeners = eventListeners.get(connectionType)!;

    const isConnected = computed(() => connectionState.value === "connected");
    const isConnecting = computed(() => connectionState.value === "connecting");
    const hasError = computed(() => connectionState.value === "error");

    /**
     * Subscribe to multiple topics at once
     */
    const subscribeToTopics = (topics: string[]) => {
        if (topics.length === 0) return;

        // Add all topics to our local subscription set
        topics.forEach((topic) => {
            connectionSubscriptions.value.add(topic);
        });

        const ws = wsInstances.get(connectionType);
        if (ws?.readyState === WebSocket.OPEN) {
            // Send the topics as a plain comma-separated string (not JSON)
            const topicsString = topics.join(",");
            ws.send(topicsString);
        }
    };

    /**
     * Subscribe to a specific topic (legacy method, now uses subscribeToTopics)
     */
    const subscribe = (topic: string) => {
        // Don't subscribe if already subscribed
        if (connectionSubscriptions.value.has(topic)) {
            return;
        }

        // Use the new multi-topic subscription method
        subscribeToTopics([topic]);
    };

    /**
     * Unsubscribe from a topic
     */
    const unsubscribe = (topic: string) => {
        connectionSubscriptions.value.delete(topic);

        const ws = wsInstances.get(connectionType);
        if (ws?.readyState === WebSocket.OPEN) {
            // Note: The server doesn't seem to handle unsubscribe messages yet
            // but we'll send them for future compatibility
            const message = {
                type: "unsubscribe",
                topic: topic,
            };
            ws.send(JSON.stringify(message));
        }
    };

    /**
     * Handle incoming messages
     */
    const handleMessage = (message: SiteEvent) => {
        const listeners = connectionEventListeners.value.get(message.eventType);
        if (listeners) {
            listeners.forEach((callback) => {
                try {
                    callback(message);
                } catch (error) {
                    console.error(
                        `Error in site WebSocket event listener (${connectionType}):`,
                        error
                    );
                }
            });
        }

        // Also trigger listeners for 'all' events
        const allListeners = connectionEventListeners.value.get("all");
        if (allListeners) {
            allListeners.forEach((callback) => {
                try {
                    callback(message);
                } catch (error) {
                    console.error(
                        `Error in site WebSocket "all" event listener (${connectionType}):`,
                        error
                    );
                }
            });
        }
    };

    /**
     * Schedule a reconnection attempt
     */
    const scheduleReconnect = () => {
        const currentAttempts = reconnectAttempts.get(connectionType) || 0;

        if (currentAttempts >= maxReconnectAttempts) {
            return;
        }

        const newAttempts = currentAttempts + 1;
        reconnectAttempts.set(connectionType, newAttempts);

        const delay = reconnectInterval * Math.pow(1.5, newAttempts - 1); // Exponential backoff

        const timer = setTimeout(() => {
            connect();
        }, delay);

        reconnectTimers.set(connectionType, timer);
    };

    /**
     * Set up automatic subscriptions for notification connections
     */
    const setupNotificationSubscriptions = () => {
        if (connectionType !== "notifications") return;

        // Get auth information
        const { isAuthenticated, currentUser } = useAuth();

        // Build subscription topics array
        const subscriptionTopics = ["all"];

        // Add user-specific subscription if authenticated
        if (isAuthenticated.value && currentUser.value?.uniqueIdentifier) {
            subscriptionTopics.push(
                `user.${currentUser.value.uniqueIdentifier}`
            );
        }

        // Subscribe to all topics at once using comma-separated format
        subscribeToTopics(subscriptionTopics);

        // Watch for auth changes and reconnect to update subscriptions
        watch(
            [isAuthenticated, currentUser],
            ([authenticated, user], [prevAuthenticated, prevUser]) => {
                // Check if authentication status changed or user identifier changed
                const authChanged = authenticated !== prevAuthenticated;
                const userChanged =
                    user?.uniqueIdentifier !== prevUser?.uniqueIdentifier;

                if (authChanged || userChanged) {
                    // Disconnect and reconnect to refresh subscriptions
                    disconnect();
                    setTimeout(() => {
                        connect();
                    }, 100); // Small delay to ensure clean disconnect
                }
            }
        );
    };

    /**
     * Connect to the site WebSocket
     */
    const connect = () => {
        const instanceKey = connectionType;
        const existingWs = wsInstances.get(instanceKey);

        if (
            existingWs?.readyState === WebSocket.OPEN ||
            connectionState.value === "connecting"
        ) {
            return;
        }

        connectionState.value = "connecting";

        try {
            const protocol =
                window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}/ws/site`;

            const ws = new WebSocket(wsUrl);
            wsInstances.set(instanceKey, ws);

            ws.onopen = () => {
                connectionState.value = "connected";
                reconnectAttempts.set(connectionType, 0);

                // Auto-subscribe based on connection type
                if (connectionType === "notifications") {
                    setupNotificationSubscriptions();
                }

                // Note: Don't re-subscribe to topics here since setupNotificationSubscriptions handles it
                // This prevents duplicate subscriptions
            };

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                // Handle ping/pong heartbeat
                if (msg.type === "ping") {
                    ws.send(
                        JSON.stringify({ type: "pong", timestamp: Date.now() })
                    );
                    return;
                }

                const message: SiteEvent = JSON.parse(event.data);
                handleMessage(message);
            };

            ws.onclose = (event) => {
                connectionState.value = "disconnected";
                wsInstances.delete(instanceKey);

                // Attempt to reconnect if not a normal closure
                if (
                    event.code !== 1000 &&
                    (reconnectAttempts.get(connectionType) || 0) <
                        maxReconnectAttempts
                ) {
                    scheduleReconnect();
                }
            };

            ws.onerror = (error) => {
                connectionState.value = "error";
                console.error(
                    `Site WebSocket (${connectionType}) error:`,
                    error
                );
            };
        } catch (error) {
            connectionState.value = "error";
            console.error(
                `Failed to create site WebSocket connection (${connectionType}):`,
                error
            );
            scheduleReconnect();
        }
    };

    /**
     * Disconnect from the WebSocket
     */
    const disconnect = () => {
        const timer = reconnectTimers.get(connectionType);
        if (timer) {
            clearTimeout(timer);
            reconnectTimers.delete(connectionType);
        }

        const ws = wsInstances.get(connectionType);
        if (ws) {
            ws.close(1000, "User initiated disconnect");
            wsInstances.delete(connectionType);
        }

        connectionState.value = "disconnected";
    };

    /**
     * Add an event listener for a specific event type
     */
    const addEventListener = (
        eventType: string,
        callback: (event: SiteEvent) => void
    ) => {
        if (!connectionEventListeners.value.has(eventType)) {
            connectionEventListeners.value.set(eventType, []);
        }
        connectionEventListeners.value.get(eventType)!.push(callback);

        // Return cleanup function
        return () => {
            removeEventListener(eventType, callback);
        };
    };

    /**
     * Remove an event listener
     */
    const removeEventListener = (
        eventType: string,
        callback: (event: SiteEvent) => void
    ) => {
        const listeners = connectionEventListeners.value.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
            if (listeners.length === 0) {
                connectionEventListeners.value.delete(eventType);
            }
        }
    };

    /**
     * Subscribe to user-specific notifications (for notifications connection only)
     */
    const subscribeToUser = (userId: string | number) => {
        if (connectionType !== "notifications") {
            console.warn(
                "subscribeToUser should only be used with notifications connection type"
            );
            return;
        }
        subscribe(`user.${userId}`);
    };

    /**
     * Subscribe to component-specific notifications
     */
    const subscribeToComponent = (componentName: string) => {
        subscribe(`component.${componentName}`);
    };

    /**
     * Subscribe to all site events (for notifications connection only)
     */
    const subscribeToAll = () => {
        if (connectionType !== "notifications") {
            console.warn(
                "subscribeToAll should only be used with notifications connection type"
            );
            return;
        }
        subscribe("all");
    };

    /**
     * Get current connection status
     */
    const getStatus = () => ({
        connectionType,
        state: connectionState.value,
        isConnected: isConnected.value,
        isConnecting: isConnecting.value,
        hasError: hasError.value,
        subscriptions: Array.from(connectionSubscriptions.value),
        reconnectAttempts: reconnectAttempts.get(connectionType) || 0,
    });

    // Auto-connect on client-side mount if enabled
    onMounted(() => {
        if (import.meta.client && autoConnect) {
            connect();
        }
    });

    // Cleanup on unmount
    onUnmounted(() => {
        disconnect();
    });

    return {
        // Connection management
        connect,
        disconnect,
        isConnected,
        isConnecting,
        hasError,
        getStatus,

        // Subscription management
        subscribe,
        subscribeToTopics,
        unsubscribe,
        subscribeToUser,
        subscribeToComponent,
        subscribeToAll,

        // Event handling
        addEventListener,
        removeEventListener,

        // State
        connectionState: readonly(connectionState),
        subscriptions: readonly(connectionSubscriptions),
    };
};

/**
 * Specialized composable for notification WebSocket connections
 * Automatically subscribes to user notifications and site events
 */
export const useSiteNotifications = (
    options: Omit<SiteWebSocketOptions, "connectionType"> = {}
) => {
    return useSiteWebSocket({
        ...options,
        connectionType: "notifications",
    });
};

/**
 * Specialized composable for component WebSocket connections
 * Used for component-specific real-time updates
 */
export const useComponentWebSocket = (
    options: Omit<SiteWebSocketOptions, "connectionType"> = {}
) => {
    return useSiteWebSocket({
        ...options,
        connectionType: "components",
    });
};
