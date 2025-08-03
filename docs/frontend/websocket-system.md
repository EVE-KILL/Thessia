# WebSocket System Documentation

This document covers the WebSocket implementation in Thessia for real-time notifications and live updates.

## Overview

The WebSocket system provides real-time communication between the client and server for:

- Live killmail notifications
- User-specific notifications
- System announcements
- Real-time updates for battles and statistics

## Architecture

The WebSocket system consists of:

1. **WebSocket Store** (`useWebSocketStore`) - Core state management
2. **WebSocket Composables** - Easy-to-use wrappers
3. **Server-side WebSocket Handler** - Backend connection management
4. **Auto-reconnection** - Handles connection drops gracefully

## WebSocket Store

### Connection Management

The store manages multiple WebSocket connections by type:

```typescript
interface WebSocketConnection {
    socket: WebSocket | null;
    state: "disconnected" | "connecting" | "connected" | "error";
    subscriptions: Set<string>;
    eventListeners: Map<string, Array<(event: SiteEvent) => void>>;
    reconnectAttempts: number;
    reconnectTimer: NodeJS.Timeout | null;
}
```

### Event Structure

All WebSocket events follow this structure:

```typescript
interface SiteEvent {
    eventType: string;           // Type of event (e.g., "killmail", "notification")
    data: any;                   // Event payload
    timestamp: number;           // Event timestamp
    targetUserId?: string;       // Target user ID (for user-specific events)
    targetComponent?: string;    // Target component (for component-specific events)
    notificationType?: string;   // Notification type
}
```

## Using WebSocket Composables

### Basic WebSocket Connection

```vue
<script setup lang="ts">
const {
    connectionState,
    isConnected,
    connect,
    disconnect,
    subscribe,
    addEventListener
} = useSiteWebSocket({
    connectionType: 'notifications',
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
});

// Listen for events
onMounted(() => {
    const cleanup = addEventListener('killmail', (event) => {
        console.log('New killmail:', event.data);
    });

    onUnmounted(cleanup);
});
</script>

<template>
    <div class="connection-status">
        <UIcon
            :name="isConnected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'"
            :class="isConnected ? 'text-green-500' : 'text-red-500'"
        />
        {{ connectionState }}
    </div>
</template>
```

### Notifications Composable

For user notifications, use the specialized composable:

```vue
<script setup lang="ts">
const {
    connectionState,
    isConnected,
    subscribeToUserNotifications,
    subscribeToSystemNotifications,
    onNotification,
    onKillmail,
} = useSiteNotifications({
    autoConnect: true,
});

const authStore = useAuthStore();
const toast = useToast();

onMounted(() => {
    // Subscribe to user-specific notifications
    if (authStore.currentUser) {
        subscribeToUserNotifications(authStore.currentUser.characterId);
    }

    // Subscribe to system notifications
    subscribeToSystemNotifications();

    // Handle notifications
    const cleanupNotification = onNotification((notification) => {
        toast.add({
            title: notification.data.title,
            description: notification.data.message,
            icon: notification.data.icon,
        });
    });

    // Handle live killmails
    const cleanupKillmail = onKillmail((killmail) => {
        // Update UI with new killmail
        console.log('Live killmail:', killmail.data);
    });

    onUnmounted(() => {
        cleanupNotification();
        cleanupKillmail();
    });
});
</script>
```

### Component-Specific WebSocket

For component-specific updates:

```vue
<script setup lang="ts">
const {
    connectionState,
    isConnected,
    subscribe,
    addEventListener,
} = useSiteComponents({
    autoConnect: true,
});

onMounted(() => {
    // Subscribe to component-specific updates
    subscribe('killmail-list');
    subscribe('battle-updates');

    // Listen for updates
    const cleanup = addEventListener('update', (event) => {
        if (event.targetComponent === 'killmail-list') {
            // Refresh killmail list
            refreshKillmails();
        }
    });

    onUnmounted(cleanup);
});
</script>
```

## Event Types

### Standard Event Types

| Event Type | Description | Data Structure |
|------------|-------------|----------------|
| `notification` | User notifications | `{ title: string, message: string, icon?: string }` |
| `killmail` | Live killmails | `{ killmailId: number, killmailHash: string, ... }` |
| `system` | System announcements | `{ message: string, type: 'info' \| 'warning' \| 'error' }` |
| `update` | Component updates | `{ component: string, action: string, data: any }` |
| `battle` | Battle updates | `{ battleId: number, status: string, participants: number }` |

### Custom Event Listeners

You can listen for any event type, including wildcards:

```typescript
// Listen for specific events
addEventListener('killmail', handler);

// Listen for all events
addEventListener('*', handler);

// Listen for user-specific events
addEventListener('user_notification', handler);
```

## Server Integration

### Authentication

WebSocket connections are authenticated using the user's unique identifier:

```typescript
// Sent automatically on connection
{
    type: "auth",
    token: authStore.currentUser.uniqueIdentifier
}
```

### Subscriptions

Subscribe to specific event channels:

```typescript
// Subscribe to channels
{
    type: "subscribe",
    subscriptions: ["user:123", "system", "killmail-updates"]
}

// Unsubscribe from channels
{
    type: "unsubscribe",
    subscriptions: ["user:123"]
}
```

## Advanced Usage

### Manual Connection Management

```vue
<script setup lang="ts">
const webSocketStore = useWebSocketStore();

const connectionType = 'custom';

// Initialize connection
webSocketStore.initializeConnection(connectionType);

// Connect with custom options
await webSocketStore.connect(connectionType, {
    autoConnect: false,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
});

// Subscribe to events
webSocketStore.subscribe(connectionType, 'custom-events');

// Add event listener
webSocketStore.addEventListener(connectionType, 'custom-event', (event) => {
    console.log('Custom event:', event);
});

// Send custom message
webSocketStore.send(connectionType, {
    type: 'custom-action',
    data: { foo: 'bar' }
});
</script>
```

### Connection State Monitoring

```vue
<script setup lang="ts">
const webSocketStore = useWebSocketStore();

// Monitor all active connections
const activeConnections = computed(() => webSocketStore.activeConnections);

// Get specific connection state
const notificationState = computed(() =>
    webSocketStore.getConnectionState('notifications')
);

// Check if connected
const isNotificationConnected = computed(() =>
    webSocketStore.isConnected('notifications')
);
</script>

<template>
    <div class="connection-monitor">
        <h3>Active Connections: {{ activeConnections.length }}</h3>

        <div v-for="[type, connection] in activeConnections" :key="type">
            <span>{{ type }}: {{ connection.state }}</span>
            <UIcon
                :name="connection.state === 'connected' ? 'i-lucide-check' : 'i-lucide-x'"
                :class="connection.state === 'connected' ? 'text-green-500' : 'text-red-500'"
            />
        </div>
    </div>
</template>
```

### Handling Authentication Changes

```vue
<script setup lang="ts">
const authStore = useAuthStore();
const webSocketStore = useWebSocketStore();

// Handle auth state changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    webSocketStore.onAuthChange(isAuthenticated);
});
</script>
```

## Best Practices

### 1. Client-Side Only

Always ensure WebSocket operations are client-side only:

```typescript
// ❌ Bad - will cause SSR issues
const ws = useSiteWebSocket();

// ✅ Good - client-side only
if (import.meta.client) {
    const ws = useSiteWebSocket();
}

// ✅ Better - composable handles this internally
const ws = useSiteWebSocket(); // Already has client-side guards
```

### 2. Proper Cleanup

Always clean up event listeners:

```typescript
onMounted(() => {
    const cleanup = addEventListener('event', handler);

    onUnmounted(() => {
        cleanup(); // Important: prevents memory leaks
    });
});
```

### 3. Error Handling

Handle connection errors gracefully:

```vue
<script setup lang="ts">
const { connectionState, connect } = useSiteWebSocket();

// Monitor connection state
watch(connectionState, (state) => {
    if (state === 'error') {
        // Show error notification
        toast.add({
            title: 'Connection Error',
            description: 'Lost connection to server. Retrying...',
            color: 'error'
        });
    } else if (state === 'connected') {
        // Show success notification
        toast.add({
            title: 'Connected',
            description: 'Real-time updates enabled',
            color: 'success'
        });
    }
});
</script>
```

### 4. Subscription Management

Manage subscriptions efficiently:

```typescript
// Subscribe to multiple channels at once
const subscriptions = ['user:123', 'system', 'killmails'];
subscriptions.forEach(sub => subscribe(sub));

// Unsubscribe when component unmounts
onUnmounted(() => {
    subscriptions.forEach(sub => unsubscribe(sub));
});
```

## Troubleshooting

### Connection Issues

```typescript
// Check connection state
console.log('Connection state:', connectionState.value);

// Force reconnect
disconnect();
await nextTick();
connect();

// Check WebSocket support
if (!window.WebSocket) {
    console.error('WebSocket not supported');
}
```

### Event Not Received

```typescript
// Verify subscription
console.log('Subscriptions:', subscriptions.value);

// Check event listener registration
console.log('Event listeners:', connection.value?.eventListeners);

// Test with wildcard listener
addEventListener('*', (event) => {
    console.log('Any event:', event);
});
```

### Authentication Issues

```typescript
// Check authentication status
console.log('Authenticated:', authStore.isAuthenticated);
console.log('User:', authStore.currentUser);

// Manually send auth
send({
    type: 'auth',
    token: authStore.currentUser?.uniqueIdentifier
});
```

### Memory Leaks

```typescript
// Always clean up listeners
const cleanups = [];

onMounted(() => {
    cleanups.push(addEventListener('event1', handler1));
    cleanups.push(addEventListener('event2', handler2));
});

onUnmounted(() => {
    cleanups.forEach(cleanup => cleanup());
});
```

## Configuration

### Default Options

```typescript
const defaultOptions = {
    autoConnect: true,          // Auto-connect on initialization
    reconnectInterval: 5000,    // Reconnect interval in ms
    maxReconnectAttempts: 10,   // Max reconnection attempts
};
```

### Connection Types

| Type | Purpose | Auto-subscriptions |
|------|---------|-------------------|
| `notifications` | User notifications | `user:{userId}`, `system` |
| `components` | Component updates | None |
| `custom` | Custom usage | None |

For more implementation details, see the WebSocket store and composables in `/app/stores/websocket.ts` and `/app/composables/useSiteWebSocket.ts`.
