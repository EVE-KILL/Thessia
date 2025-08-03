# Pinia State Management System

This document provides a comprehensive guide to the Pinia-based state management system used in Thessia, covering stores, authentication, user settings, and WebSocket management.

## Table of Contents

1. [Overview](#overview)
2. [Store Architecture](#store-architecture)
3. [Authentication Store](#authentication-store)
4. [User Settings Store](#user-settings-store)
5. [WebSocket Store](#websocket-store)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

Thessia uses [Pinia](https://pinia.vuejs.org/) as its state management solution, providing a modern, TypeScript-friendly approach to managing application state. The system is designed with SSR (Server-Side Rendering) compatibility and client-side hydration safety in mind.

### Key Features

- **Type Safety**: Full TypeScript support with proper type inference
- **SSR Compatible**: Handles server-side rendering without hydration issues
- **Modular Design**: Separate stores for different concerns
- **Auto-imports**: All stores and composables are automatically imported
- **Client-Side Safety**: Proper guards for client-only functionality

## Store Architecture

The application uses three main stores:

```typescript
// Core stores
- authStore (useAuthStore)        // User authentication and session management
- userSettingsStore (useUserSettingsStore) // User preferences and settings
- webSocketStore (useWebSocketStore)      // Real-time WebSocket connections
```

### Store Structure Pattern

All stores follow a consistent pattern:

```typescript
export const useExampleStore = defineStore("storeName", {
    state: () => ({
        // State properties with proper typing
    }),

    getters: {
        // Computed properties with type inference
        // Always include fallbacks for SSR compatibility
    },

    actions: {
        // Async/sync methods for state mutations
        // Include proper error handling
        // Add client-side guards where needed
    },
});
```

## Authentication Store

The authentication store (`useAuthStore`) manages user authentication state, login/logout operations, and user session data.

### Authentication State Properties

```typescript
interface AuthState {
    currentUser: User | null;           // Current authenticated user
    isLoading: boolean;                 // Loading state during auth operations
    error: string | null;               // Authentication errors
    isInitialized: boolean;             // Whether auth has been initialized
    lastAuthCheck: number | null;       // Timestamp of last auth check
}
```

### Authentication Getters

```typescript
// Check if user is authenticated
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Check if user has specific permissions
const canModerateComments = computed(() => authStore.canModerateComments);

// Get current user data
const currentUser = computed(() => authStore.currentUser);
```

### Authentication Actions

```typescript
// Initialize authentication (call once on app startup)
await authStore.initializeAuth();

// Login with EVE SSO
await authStore.login();

// Logout user
await authStore.logout();

// Refresh user data
await authStore.refreshUser();

// Check authentication status
await authStore.checkAuth();
```

### Authentication Usage Examples

#### Basic Authentication Check

```vue
<script setup lang="ts">
const authStore = useAuthStore();

// Reactive authentication state
const isLoggedIn = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.currentUser);
</script>

<template>
    <div v-if="isLoggedIn">
        <p>Welcome, {{ user?.name }}!</p>
        <UButton @click="authStore.logout()">Logout</UButton>
    </div>
    <div v-else>
        <UButton @click="authStore.login()">Login with EVE SSO</UButton>
    </div>
</template>
```

#### Protected Route/Component

```vue
<script setup lang="ts">
// Using page meta for route protection
definePageMeta({
    requiresAuth: true, // This will be handled by auth middleware
});

const authStore = useAuthStore();

// Component-level auth check
onMounted(async () => {
    if (!authStore.isAuthenticated) {
        await navigateTo('/login');
    }
});
</script>
```

#### Permission-Based UI

```vue
<script setup lang="ts">
const authStore = useAuthStore();

const canModerate = computed(() => authStore.canModerateComments);
const canDeleteComments = computed(() => authStore.canDeleteComments);
</script>

<template>
    <div class="comment-actions">
        <UButton v-if="canModerate" variant="outline">
            Moderate Comment
        </UButton>
        <UButton v-if="canDeleteComments" variant="ghost" color="red">
            Delete Comment
        </UButton>
    </div>
</template>
```

## User Settings Store

The user settings store (`useUserSettingsStore`) manages user preferences and configuration options.

### User Settings State Properties

```typescript
interface UserSettings {
    killmailDelay: number;              // Delay before showing killmails (minutes)
    defaultCharacterPage: string;       // Default tab for character pages
    defaultCorporationPage: string;     // Default tab for corporation pages
    defaultAlliancePage: string;        // Default tab for alliance pages
}

interface UserSettingsState {
    settings: UserSettings | null;      // Current user settings
    isLoading: boolean;                 // Loading state
    error: string | null;               // Error messages
    lastFetchTime: number | null;       // Cache timestamp
}
```

### User Settings Getters

```typescript
// Get all settings with defaults
const settings = computed(() => userSettingsStore.currentSettings);

// Individual setting getters
const killmailDelay = computed(() => userSettingsStore.killmailDelay);
const defaultCharacterPage = computed(() => userSettingsStore.defaultCharacterPage);
const defaultCorporationPage = computed(() => userSettingsStore.defaultCorporationPage);
const defaultAlliancePage = computed(() => userSettingsStore.defaultAlliancePage);

// Check if settings are loaded
const isLoaded = computed(() => userSettingsStore.isLoaded);
```

### User Settings Actions

```typescript
// Fetch user settings (with caching)
await userSettingsStore.fetchSettings();

// Force refresh settings (bypass cache)
await userSettingsStore.fetchSettings(true);

// Update user settings
await userSettingsStore.updateSettings({
    killmailDelay: 5,
    defaultCharacterPage: "kills",
    defaultCorporationPage: "dashboard",
    defaultAlliancePage: "members",
});

// Clear settings (on logout)
userSettingsStore.clearSettings();
```

### Usage Examples

#### Settings Form

```vue
<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

// Local form state
const formSettings = ref({
    killmailDelay: 0,
    defaultCharacterPage: "dashboard",
    defaultCorporationPage: "dashboard",
    defaultAlliancePage: "dashboard",
});

// Sync with store when loaded
watch(() => userSettingsStore.settings, (newSettings) => {
    if (newSettings) {
        formSettings.value = { ...newSettings };
    }
}, { immediate: true });

// Save settings
const saveSettings = async () => {
    try {
        await userSettingsStore.updateSettings(formSettings.value);
        // Show success message
    } catch (error) {
        // Handle error
    }
};

// Load settings on mount
onMounted(async () => {
    if (!userSettingsStore.isLoaded) {
        await userSettingsStore.fetchSettings();
    }
});
</script>

<template>
    <form @submit.prevent="saveSettings">
        <UFormGroup label="Killmail Delay (minutes)">
            <UInput
                v-model.number="formSettings.killmailDelay"
                type="number"
                :min="0"
                :max="60"
            />
        </UFormGroup>

        <UFormGroup label="Default Character Page">
            <USelect
                v-model="formSettings.defaultCharacterPage"
                :options="characterPageOptions"
            />
        </UFormGroup>

        <UButton type="submit" :loading="userSettingsStore.isLoading">
            Save Settings
        </UButton>
    </form>
</template>
```

#### Using Default Tab Settings

```vue
<script setup lang="ts">
// Import the default tab composable
const { defaultTabId } = useDefaultTab('character', tabItems);

// Use the default tab for initialization
const activeTabId = ref<string>(tabItems[0]?.id || '');

onMounted(() => {
    // Use user's preferred default tab if no hash is present
    if (!route.hash) {
        activeTabId.value = defaultTabId.value;
    }
});
</script>
```

## WebSocket Store

The WebSocket store (`useWebSocketStore`) manages real-time WebSocket connections for notifications and live updates.

### State Properties

```typescript
interface WebSocketConnection {
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
```

### Key Getters

```typescript
// Get connection by type
const connection = computed(() => webSocketStore.getConnection('notifications'));

// Check connection status
const isConnected = computed(() => webSocketStore.isConnected('notifications'));

// Get connection state
const connectionState = computed(() => webSocketStore.getConnectionState('notifications'));

// Get all active connections
const activeConnections = computed(() => webSocketStore.activeConnections);
```

### Core Actions

```typescript
// Initialize connection
webSocketStore.initializeConnection('notifications');

// Connect to WebSocket
await webSocketStore.connect('notifications', {
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
});

// Subscribe to events
webSocketStore.subscribe('notifications', 'user:123');

// Add event listener
webSocketStore.addEventListener('notifications', 'killmail', (event) => {
    console.log('New killmail:', event.data);
});

// Send message
webSocketStore.send('notifications', { type: 'ping' });

// Disconnect
webSocketStore.disconnect('notifications');
```

### Usage with Composables

#### Basic WebSocket Usage

```vue
<script setup lang="ts">
// Use the WebSocket composable
const {
    connectionState,
    isConnected,
    connect,
    disconnect,
    addEventListener
} = useSiteWebSocket({
    connectionType: 'notifications',
    autoConnect: true,
});

// Listen for events
onMounted(() => {
    const cleanup = addEventListener('killmail', (event) => {
        // Handle killmail event
        console.log('New killmail:', event.data);
    });

    // Cleanup on unmount
    onUnmounted(cleanup);
});
</script>

<template>
    <div>
        <div class="connection-status">
            Status: {{ connectionState }}
            <UIcon
                :name="isConnected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'"
                :class="isConnected ? 'text-green-500' : 'text-red-500'"
            />
        </div>

        <UButton v-if="!isConnected" @click="connect()">
            Connect
        </UButton>
        <UButton v-else @click="disconnect()">
            Disconnect
        </UButton>
    </div>
</template>
```

#### Notifications Composable

```vue
<script setup lang="ts">
// Use the specialized notifications composable
const {
    connectionState,
    isConnected,
    subscribeToUserNotifications,
    onNotification,
    onKillmail,
} = useSiteNotifications({
    autoConnect: true,
});

const authStore = useAuthStore();

onMounted(() => {
    // Subscribe to user notifications
    if (authStore.currentUser) {
        subscribeToUserNotifications(authStore.currentUser.characterId);
    }

    // Listen for notifications
    const cleanupNotification = onNotification((notification) => {
        // Show toast notification
        toast.add({
            title: notification.data.title,
            description: notification.data.message,
        });
    });

    // Listen for killmails
    const cleanupKillmail = onKillmail((killmail) => {
        // Handle new killmail
        console.log('Live killmail:', killmail.data);
    });

    onUnmounted(() => {
        cleanupNotification();
        cleanupKillmail();
    });
});
</script>
```

## Best Practices

### 1. SSR Safety

Always include client-side guards for browser-specific functionality:

```typescript
// ❌ Bad - will cause SSR hydration issues
const webSocket = useWebSocketStore();
webSocket.connect('notifications');

// ✅ Good - client-side only
if (import.meta.client) {
    const webSocket = useWebSocketStore();
    webSocket.connect('notifications');
}
```

### 2. Error Handling

Always wrap store actions in try-catch blocks:

```typescript
const saveUserSettings = async () => {
    try {
        await userSettingsStore.updateSettings(formData.value);
        toast.add({ title: 'Settings saved successfully' });
    } catch (error) {
        console.error('Failed to save settings:', error);
        toast.add({
            title: 'Failed to save settings',
            color: 'error'
        });
    }
};
```

### 3. Reactive State

Use computed properties for reactive store state:

```typescript
// ✅ Good - reactive
const isAuthenticated = computed(() => authStore.isAuthenticated);

// ❌ Bad - not reactive
const isAuthenticated = authStore.isAuthenticated;
```

### 4. Store Initialization

Initialize stores in the correct order and location:

```typescript
// In app.vue or main layout
onMounted(async () => {
    // Initialize auth first
    await authStore.initializeAuth();

    // Then load user settings if authenticated
    if (authStore.isAuthenticated) {
        await userSettingsStore.fetchSettings();
    }
});
```

### 5. Cleanup

Always clean up subscriptions and listeners:

```typescript
onMounted(() => {
    const cleanup = addEventListener('event', handler);

    onUnmounted(() => {
        cleanup();
    });
});
```

## Troubleshooting

### Common Issues

#### 1. Hydration Mismatches

**Problem**: `Text content does not match server-rendered HTML`

**Solution**: Use `ClientOnly` component or client-side guards:

```vue
<template>
    <ClientOnly>
        <div v-if="authStore.isAuthenticated">
            <!-- Client-side only content -->
        </div>
    </ClientOnly>
</template>
```

#### 2. Store Not Initialized

**Problem**: Store state is `null` or `undefined`

**Solution**: Ensure proper initialization:

```typescript
onMounted(async () => {
    if (!userSettingsStore.isLoaded) {
        await userSettingsStore.fetchSettings();
    }
});
```

#### 3. WebSocket Connection Issues

**Problem**: WebSocket not connecting or frequent disconnections

**Solution**: Check client-side guards and connection options:

```typescript
// Ensure client-side only
if (import.meta.client) {
    await webSocketStore.connect('notifications', {
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
    });
}
```

#### 4. Settings Not Persisting

**Problem**: User settings reset after page reload

**Solution**: Ensure settings are properly saved and loaded:

```typescript
// Save settings
await userSettingsStore.updateSettings(newSettings);

// Load on app initialization
await userSettingsStore.fetchSettings();
```

### Debugging Tips

1. **Check Store State**: Use Vue DevTools to inspect store state
2. **Console Logging**: Add logging to actions for debugging
3. **Network Tab**: Check API requests for settings/auth calls
4. **WebSocket Tab**: Monitor WebSocket connections in browser DevTools

### Performance Considerations

1. **Caching**: User settings are cached for 5 minutes
2. **Lazy Loading**: Stores only initialize when first accessed
3. **Connection Pooling**: WebSocket connections are reused across components
4. **Cleanup**: Properly clean up listeners to prevent memory leaks

For more specific implementation details, refer to the individual store files in `/app/stores/`.
