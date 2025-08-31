# User Settings - Modern Implementation Examples

This file provides practical examples of how to use the modernized user settings system.

## 🎯 Quick Start: Adding a New Setting

### Server-Side Registration

```typescript
// server/interfaces/IUserSettings.ts - Add to USER_SETTINGS_REGISTRY

export const USER_SETTINGS_REGISTRY: IUserSettingsRegistry = {
    // ... existing settings

    // Simple boolean toggle
    darkMode: {
        defaultValue: false,
        category: 'ui',
        label: 'Dark Mode',
        description: 'Use dark theme for the interface',
        validation: {
            type: 'boolean',
            required: false,
        },
    },

    // String with limited options
    language: {
        defaultValue: 'en',
        category: 'localization',
        label: 'Language',
        description: 'Interface language',
        validation: {
            type: 'string',
            allowedValues: ['en', 'es', 'fr', 'de', 'ru'],
            required: false,
        },
    },

    // Number with range
    itemsPerPage: {
        defaultValue: 50,
        category: 'display',
        label: 'Items Per Page',
        description: 'Number of items to show per page',
        validation: {
            type: 'number',
            min: 10,
            max: 200,
            required: false,
        },
    },

    // Complex object setting
    notifications: {
        defaultValue: {
            email: true,
            push: false,
            sound: true,
            frequency: 'daily'
        },
        category: 'notifications',
        label: 'Notification Preferences',
        description: 'Configure how you want to receive notifications',
        validation: {
            type: 'object',
            required: false,
        },
    },
};
```

### Frontend Usage

```vue
<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

// Get setting values (with automatic fallbacks)
const darkMode = computed(() => userSettingsStore.getSetting('darkMode', false));
const language = computed(() => userSettingsStore.getSetting('language', 'en'));
const itemsPerPage = computed(() => userSettingsStore.getSetting('itemsPerPage', 50));
const notifications = computed(() => userSettingsStore.getSetting('notifications', {}));

// Update settings
const toggleDarkMode = () => {
    userSettingsStore.updateSetting('darkMode', !darkMode.value);
};

const changeLanguage = (newLang: string) => {
    userSettingsStore.updateSetting('language', newLang);
};

const updateNotifications = (newSettings: any) => {
    userSettingsStore.updateSetting('notifications', newSettings);
};
</script>

<template>
    <!-- Dark mode toggle -->
    <button @click="toggleDarkMode">
        {{ darkMode ? 'Light Mode' : 'Dark Mode' }}
    </button>

    <!-- Language selector -->
    <select :value="language" @change="changeLanguage($event.target.value)">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
    </select>

    <!-- Items per page -->
    <input
        type="number"
        :value="itemsPerPage"
        @input="userSettingsStore.updateSetting('itemsPerPage', Number($event.target.value))"
        min="10"
        max="200"
    />
</template>
```

## 🔧 Programmatic Registration (Server-Side Modules)

If you're building a module/plugin that needs its own settings:

```typescript
// server/modules/my-module/settings.ts
import { registerUserSettings, SettingHelpers } from '../../helpers/SettingsRegistry';

// Register your module's settings
registerUserSettings({
    myModuleEnabled: SettingHelpers.boolean(true, 'Enable My Module', 'Turn on/off my module', 'modules'),

    myModuleApiKey: SettingHelpers.string('', {
        label: 'API Key',
        description: 'Your API key for my module',
        category: 'modules',
        minLength: 10,
        maxLength: 50
    }),

    myModuleRefreshRate: SettingHelpers.number(300, {
        min: 60,
        max: 3600,
        label: 'Refresh Rate (seconds)',
        description: 'How often to refresh data',
        category: 'modules'
    })
});

// Use in your module
export class MyModule {
    async initialize() {
        const userSettings = await UserSettingsHelper.getSettingsForCharacter(userId);

        if (!userSettings.myModuleEnabled) {
            console.log('Module disabled by user');
            return;
        }

        const apiKey = userSettings.myModuleApiKey;
        const refreshRate = userSettings.myModuleRefreshRate;

        // Initialize with user preferences
        this.apiKey = apiKey;
        this.refreshInterval = setInterval(this.refresh, refreshRate * 1000);
    }
}
```

## 🎨 UI Components for Different Setting Types

### Auto-Generated Settings Page

```vue
<!-- app/pages/user/settings.vue -->
<script setup lang="ts">
// Fetch settings registry from backend
const { data: registryData } = await useFetch('/api/user/settings-registry');
const settingsRegistry = computed(() => registryData.value?.data || {});

// Load current user settings
const userSettingsStore = useUserSettingsStore();
await userSettingsStore.fetchSettings();
</script>

<template>
    <div class="settings-page">
        <h1>User Settings</h1>

        <!-- This component auto-generates UI based on the registry -->
        <DynamicUserSettings :settings-registry="settingsRegistry" />
    </div>
</template>
```

### Custom Settings Components

```vue
<!-- app/components/settings/NotificationSettings.vue -->
<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

// Get notification preferences (complex object)
const notifications = computed(() =>
    userSettingsStore.getSetting('notifications', {
        email: true,
        push: false,
        sound: true,
        frequency: 'daily'
    })
);

const updateNotificationSetting = (key: string, value: any) => {
    const updated = { ...notifications.value, [key]: value };
    userSettingsStore.updateSetting('notifications', updated);
};
</script>

<template>
    <div class="notification-settings">
        <h3>Notifications</h3>

        <div class="setting-group">
            <label>
                <input
                    type="checkbox"
                    :checked="notifications.email"
                    @change="updateNotificationSetting('email', $event.target.checked)"
                />
                Email Notifications
            </label>
        </div>

        <div class="setting-group">
            <label>
                <input
                    type="checkbox"
                    :checked="notifications.push"
                    @change="updateNotificationSetting('push', $event.target.checked)"
                />
                Push Notifications
            </label>
        </div>

        <div class="setting-group">
            <label>Frequency:</label>
            <select
                :value="notifications.frequency"
                @change="updateNotificationSetting('frequency', $event.target.value)"
            >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
            </select>
        </div>
    </div>
</template>
```

## 🔍 Advanced Usage Patterns

### Reactive Settings in Composables

```typescript
// app/composables/useTheme.ts
export const useTheme = () => {
    const userSettingsStore = useUserSettingsStore();

    const darkMode = computed(() => userSettingsStore.getSetting('darkMode', false));

    const toggleTheme = () => {
        userSettingsStore.updateSetting('darkMode', !darkMode.value);
    };

    // Apply theme to document
    watchEffect(() => {
        if (process.client) {
            document.documentElement.classList.toggle('dark', darkMode.value);
        }
    });

    return {
        darkMode: readonly(darkMode),
        toggleTheme
    };
};
```

### Settings-Aware Components

```vue
<!-- app/components/data/KillList.vue -->
<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

// Use setting to control UI behavior
const showAlternatingRows = computed(() =>
    userSettingsStore.getSetting('killListAlternatingRows', true)
);

const mutedColors = computed(() =>
    userSettingsStore.getSetting('killListMutedAlternatingRows', false)
);

const itemsPerPage = computed(() =>
    userSettingsStore.getSetting('itemsPerPage', 50)
);

// Apply settings to component behavior
const tableClasses = computed(() => ({
    'alternating-rows': showAlternatingRows.value,
    'muted-colors': mutedColors.value
}));
</script>

<template>
    <div :class="tableClasses">
        <table>
            <!-- Show items based on user's preference -->
            <tr v-for="kill in kills.slice(0, itemsPerPage)" :key="kill.id">
                <!-- Kill data -->
            </tr>
        </table>
    </div>
</template>

<style scoped>
.alternating-rows tbody tr:nth-child(even) {
    background-color: rgba(0, 0, 0, 0.05);
}

.dark .alternating-rows tbody tr:nth-child(even) {
    background-color: rgba(255, 255, 255, 0.05);
}

.muted-colors.alternating-rows tbody tr:nth-child(even) {
    background-color: rgba(0, 0, 0, 0.02);
}

.dark .muted-colors.alternating-rows tbody tr:nth-child(even) {
    background-color: rgba(255, 255, 255, 0.02);
}
</style>
```

### Server-Side Settings Access

```typescript
// server/api/some-endpoint.post.ts
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const characterId = body.characterId;

    // Get user settings in server context
    const userSettings = await UserSettingsHelper.getSettingsForCharacter(characterId);

    if (!userSettings) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User not found'
        });
    }

    // Use settings to customize API behavior
    const itemsPerPage = userSettings.itemsPerPage || 50;
    const language = userSettings.language || 'en';

    // Fetch data according to user preferences
    const results = await fetchPaginatedData(itemsPerPage);
    const localizedResults = await localizeData(results, language);

    return {
        success: true,
        data: localizedResults
    };
});
```

## 🚀 Benefits Comparison

### Old System (Rigid)
```typescript
// ❌ Had to change 6+ files for each new setting
// ❌ Required TypeScript interface updates
// ❌ Hard-coded validation logic
// ❌ No dynamic UI generation
// ❌ Settings scattered across codebase

// Adding a boolean setting required:
// 1. Update IUserSettingsMap interface
// 2. Update DEFAULT_USER_SETTINGS
// 3. Update USER_SETTING_VALIDATION
// 4. Update UserSettings helper validation
// 5. Update frontend UserSettings interface
// 6. Update store getters
// 7. Update UI components manually
```

### New System (Flexible)
```typescript
// ✅ Single registry entry for new settings
// ✅ Automatic validation
// ✅ Dynamic UI generation
// ✅ Type-safe with flexibility
// ✅ Backward compatible

// Adding any setting now only requires:
newSetting: {
    defaultValue: 'any-value-type',
    category: 'ui',
    label: 'Human Label',
    description: 'What this does',
    validation: { type: 'string', allowedValues: ['a', 'b'] }
}

// That's it! ✨
```

## 🎯 Migration Guide

Existing code continues to work:

```typescript
// Old way (still works)
const delay = userSettingsStore.killmailDelay;

// New way (preferred)
const delay = userSettingsStore.getSetting('killmailDelay', 0);

// Gradually migrate components to use the flexible getSetting method
```

The new system provides the same functionality with much less maintenance overhead and unlimited extensibility!
