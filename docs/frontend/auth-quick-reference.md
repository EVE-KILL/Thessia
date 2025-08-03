# Authentication & User Settings - Quick Reference

This is a quick reference guide for using the authentication system and user settings in Thessia.

## Quick Start

### 1. Check if User is Logged In

```vue
<script setup lang="ts">
const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isAuthenticated);
</script>

<template>
    <div v-if="isLoggedIn">
        Welcome back!
    </div>
    <div v-else>
        <UButton @click="authStore.login()">Login</UButton>
    </div>
</template>
```

### 2. Get Current User Data

```vue
<script setup lang="ts">
const authStore = useAuthStore();
const user = computed(() => authStore.currentUser);
</script>

<template>
    <div v-if="user">
        <img :src="`https://images.evetech.net/characters/${user.characterId}/portrait?size=64`" />
        <span>{{ user.name }}</span>
    </div>
</template>
```

### 3. Protect a Page/Component

```vue
<script setup lang="ts">
// Option 1: Page meta (recommended for pages)
definePageMeta({
    requiresAuth: true,
});

// Option 2: Component guard
const authStore = useAuthStore();

onMounted(async () => {
    if (!authStore.isAuthenticated) {
        await navigateTo('/');
    }
});
</script>
```

### 4. Use User Settings

```vue
<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

// Get specific setting
const killmailDelay = computed(() => userSettingsStore.killmailDelay);
const defaultCharacterPage = computed(() => userSettingsStore.defaultCharacterPage);

// Load settings on mount
onMounted(async () => {
    if (!userSettingsStore.isLoaded) {
        await userSettingsStore.fetchSettings();
    }
});
</script>
```

### 5. Update User Settings

```vue
<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

const updateSettings = async () => {
    try {
        await userSettingsStore.updateSettings({
            killmailDelay: 5,
            defaultCharacterPage: "kills",
            defaultCorporationPage: "dashboard",
            defaultAlliancePage: "members",
        });

        // Show success message
        toast.add({ title: 'Settings saved successfully' });
    } catch (error) {
        // Handle error
        toast.add({ title: 'Failed to save settings', color: 'error' });
    }
};
</script>
```

### 6. Use Default Tab Settings

```vue
<script setup lang="ts">
// For character/corporation/alliance pages
const { defaultTabId } = useDefaultTab('corporation', tabItems);

const activeTabId = ref<string>(tabItems[0]?.id || '');

onMounted(() => {
    // Use user's preferred default tab if no hash in URL
    if (!route.hash) {
        activeTabId.value = defaultTabId.value;
    }
});
</script>
```

## Common Patterns

### Authentication State in Layout

```vue
<!-- app.vue or default.vue -->
<script setup lang="ts">
const authStore = useAuthStore();

// Initialize auth on app start
onMounted(async () => {
    await authStore.initializeAuth();
});
</script>

<template>
    <div>
        <Header />
        <main>
            <slot />
        </main>
        <Footer />
    </div>
</template>
```

### Settings Form Pattern

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

// Sync with store
watch(() => userSettingsStore.settings, (newSettings) => {
    if (newSettings) {
        formSettings.value = { ...newSettings };
    }
}, { immediate: true });

// Save function
const saveSettings = async () => {
    await userSettingsStore.updateSettings(formSettings.value);
};

// Load on mount
onMounted(async () => {
    if (!userSettingsStore.isLoaded) {
        await userSettingsStore.fetchSettings();
    }
});
</script>
```

### Permission-Based UI

```vue
<script setup lang="ts">
const authStore = useAuthStore();

const canModerate = computed(() => authStore.canModerateComments);
const canDelete = computed(() => authStore.canDeleteComments);
const isAdmin = computed(() => authStore.isAdmin);
</script>

<template>
    <div class="actions">
        <UButton>Edit</UButton>
        <UButton v-if="canModerate" variant="outline">Moderate</UButton>
        <UButton v-if="canDelete" variant="ghost" color="red">Delete</UButton>
        <UButton v-if="isAdmin" variant="solid" color="purple">Admin Panel</UButton>
    </div>
</template>
```

## Available User Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `killmailDelay` | `number` | `0` | Delay in minutes before showing killmails |
| `defaultCharacterPage` | `string` | `"dashboard"` | Default tab for character pages |
| `defaultCorporationPage` | `string` | `"dashboard"` | Default tab for corporation pages |
| `defaultAlliancePage` | `string` | `"dashboard"` | Default tab for alliance pages |

## Valid Tab Options

### Character Pages

- `dashboard` - Overview and stats
- `kills` - Character kills
- `losses` - Character losses
- `combined` - Combined kills/losses
- `battles` - Battle participation
- `corporation-history` - Corporation history
- `top` - Top statistics
- `stats` - Detailed statistics
- `achievements` - Character achievements

### Corporation Pages

- `dashboard` - Overview and stats
- `kills` - Corporation kills
- `losses` - Corporation losses
- `combined` - Combined kills/losses
- `battles` - Battle participation
- `members` - Corporation members
- `corporation-history` - Corporation history
- `top` - Top statistics
- `stats` - Detailed statistics

### Alliance Pages

- `dashboard` - Overview and stats
- `kills` - Alliance kills
- `losses` - Alliance losses
- `combined` - Combined kills/losses
- `corporationMembers` - Member corporations
- `characterMembers` - Member characters
- `top` - Top statistics
- `stats` - Detailed statistics
- `battles` - Battle participation

## User Permissions

| Permission | Getter | Description |
|------------|--------|-------------|
| Basic User | `isAuthenticated` | User is logged in |
| Comment Moderator | `canModerateComments` | Can moderate comments |
| Comment Deleter | `canDeleteComments` | Can delete comments |
| Administrator | `isAdmin` | Full admin access |

## Error Handling

```vue
<script setup lang="ts">
const authStore = useAuthStore();
const userSettingsStore = useUserSettingsStore();

// Handle auth errors
watch(() => authStore.error, (error) => {
    if (error) {
        toast.add({
            title: 'Authentication Error',
            description: error,
            color: 'error'
        });
    }
});

// Handle settings errors
watch(() => userSettingsStore.error, (error) => {
    if (error) {
        toast.add({
            title: 'Settings Error',
            description: error,
            color: 'error'
        });
    }
});
</script>
```

## Troubleshooting

### Settings Not Loading

```typescript
// Check if settings are loaded
if (!userSettingsStore.isLoaded) {
    await userSettingsStore.fetchSettings();
}

// Force refresh if needed
await userSettingsStore.fetchSettings(true);
```

### Authentication Issues

```typescript
// Check auth status
await authStore.checkAuth();

// Refresh user data
await authStore.refreshUser();

// Full re-initialization
await authStore.initializeAuth();
```

### Hydration Issues

```vue
<template>
    <ClientOnly>
        <!-- Client-side only content -->
        <div v-if="authStore.isAuthenticated">
            User-specific content
        </div>
    </ClientOnly>
</template>
```

For detailed documentation, see [State Management Guide](./state-management.md).
