import { computed, onUnmounted, readonly, ref } from "vue";
import type { SiteEvent } from "~/stores/websocket";

export interface SiteWebSocketOptions {
    autoConnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    connectionType?: string;
}

/**
 * Composable for managing WebSocket connections using Pinia store
 */
export const useSiteWebSocket = (options: SiteWebSocketOptions = {}) => {
    // Only initialize on client side
    if (!import.meta.client) {
        return {
            connectionState: readonly(ref("disconnected")),
            isConnected: readonly(ref(false)),
            subscriptions: readonly(ref(new Set())),
            connect: () => {},
            disconnect: () => {},
            subscribe: () => {},
            unsubscribe: () => {},
            addEventListener: () => () => {},
            removeEventListener: () => {},
            send: () => {},
        };
    }

    const {
        autoConnect = true,
        reconnectInterval = 5000,
        maxReconnectAttempts = 10,
        connectionType = "site",
    } = options;

    const webSocketStore = useWebSocketStore();

    // Initialize connection if it doesn't exist
    webSocketStore.initializeConnection(connectionType);

    // Reactive state
    const connectionState = computed(() =>
        webSocketStore.getConnectionState(connectionType)
    );
    const isConnected = computed(() =>
        webSocketStore.isConnected(connectionType)
    );
    const connection = computed(() =>
        webSocketStore.getConnection(connectionType)
    );
    const subscriptions = computed(
        () => connection.value?.subscriptions || new Set()
    );

    /**
     * Connect to WebSocket
     */
    const connect = () => {
        webSocketStore.connect(connectionType, {
            autoConnect,
            reconnectInterval,
            maxReconnectAttempts,
        });
    };

    /**
     * Disconnect from WebSocket
     */
    const disconnect = () => {
        webSocketStore.disconnect(connectionType);
    };

    /**
     * Subscribe to event type
     */
    const subscribe = (eventType: string) => {
        webSocketStore.subscribe(connectionType, eventType);
    };

    /**
     * Unsubscribe from event type
     */
    const unsubscribe = (eventType: string) => {
        webSocketStore.unsubscribe(connectionType, eventType);
    };

    /**
     * Add event listener
     */
    const addEventListener = (
        eventType: string,
        callback: (event: SiteEvent) => void
    ) => {
        webSocketStore.addEventListener(connectionType, eventType, callback);

        // Return cleanup function
        return () => {
            webSocketStore.removeEventListener(
                connectionType,
                eventType,
                callback
            );
        };
    };

    /**
     * Remove event listener
     */
    const removeEventListener = (
        eventType: string,
        callback: (event: SiteEvent) => void
    ) => {
        webSocketStore.removeEventListener(connectionType, eventType, callback);
    };

    /**
     * Send message
     */
    const send = (message: any) => {
        webSocketStore.send(connectionType, message);
    };

    // Auto-connect if enabled
    if (
        autoConnect &&
        !isConnected.value &&
        connectionState.value === "disconnected"
    ) {
        connect();
    }

    // Cleanup on unmount
    onUnmounted(() => {
        // Don't disconnect entirely, just clean up this component's listeners
        // The connection can remain active for other components
    });

    return {
        // State
        connectionState: readonly(connectionState),
        isConnected: readonly(isConnected),
        subscriptions: readonly(subscriptions),

        // Actions
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        addEventListener,
        removeEventListener,
        send,
    };
};

/**
 * Composable specifically for site notifications
 */
export const useSiteNotifications = (
    options: Omit<SiteWebSocketOptions, "connectionType"> = {}
) => {
    const ws = useSiteWebSocket({
        ...options,
        connectionType: "site",
    });

    /**
     * Subscribe to user-specific notifications
     */
    const subscribeToUserNotifications = (userId: string) => {
        ws.subscribe(`user:${userId}`);
    };

    /**
     * Subscribe to system notifications
     */
    const subscribeToSystemNotifications = () => {
        ws.subscribe("system");
    };

    /**
     * Listen for notification events
     */
    const onNotification = (callback: (notification: SiteEvent) => void) => {
        return ws.addEventListener("notification", callback);
    };

    /**
     * Listen for killmail events
     */
    const onKillmail = (callback: (killmail: SiteEvent) => void) => {
        return ws.addEventListener("killmail", callback);
    };

    return {
        ...ws,
        subscribeToUserNotifications,
        subscribeToSystemNotifications,
        onNotification,
        onKillmail,
    };
};

/**
 * Composable for component-specific WebSocket connections
 */
export const useSiteComponents = (
    options: Omit<SiteWebSocketOptions, "connectionType"> = {}
) => {
    return useSiteWebSocket({
        ...options,
        connectionType: "site",
    });
};
