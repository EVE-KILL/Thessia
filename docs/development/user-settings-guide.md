# User Settings Development Guide (Flexible System)

This guide explains the new flexible user settings system in EVE Kill. The system has been modernized to support dynamic key/value settings without requiring changes to multiple files.

## Overview

The new user settings system uses a **flexible registry approach** where settings are defined in one central location with validation rules, default values, and metadata. Adding new settings is now as simple as adding an entry to the registry.

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend UI   │    │    Pinia     │    │   Backend API   │
│   Components    │◄──►│    Store     │◄──►│   & Database    │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │                     │
         │                       │                     │
    Vue Templates          Store Actions         MongoDB Storage
    getSetting()           updateSetting()       Flexible Key/Value
```

## Adding a New Setting (Simple!)

### 1. Register Your Setting

**File**: `server/interfaces/IUserSettings.ts`

Simply add your setting to `USER_SETTINGS_REGISTRY`:

```typescript
export const USER_SETTINGS_REGISTRY: IUserSettingsRegistry = {
    // ... existing settings

    // Your new setting - that's it!
    enableNotifications: {
        defaultValue: true,
        category: 'notifications',
        label: 'Enable Email Notifications',
        description: 'Receive email notifications for important events',
        validation: {
            type: 'boolean',
            required: false,
        },
    },

    // More complex example
    theme: {
        defaultValue: 'auto',
        category: 'ui',
        label: 'UI Theme',
        description: 'Choose your preferred color theme',
        validation: {
            type: 'string',
            allowedValues: ['light', 'dark', 'auto'],
            required: false,
        },
    },

    // Number with range validation
    maxResults: {
        defaultValue: 50,
        category: 'display',
        label: 'Maximum Results Per Page',
        description: 'How many items to show per page',
        validation: {
            type: 'number',
            min: 10,
            max: 200,
            required: false,
        },
    },
};
```

### 2. Use in Frontend Components

**That's literally it!** No more interface updates, no more store modifications.

```vue
<script setup>
const userSettingsStore = useUserSettingsStore();

// Get any setting value (with automatic fallback to default)
const enableNotifications = computed(() =>
    userSettingsStore.getSetting('enableNotifications')
);

const theme = computed(() =>
    userSettingsStore.getSetting('theme', 'light') // custom fallback
);

// Update settings
const updateNotifications = async (enabled: boolean) => {
    await userSettingsStore.updateSetting('enableNotifications', enabled);
};

const updateTheme = async (newTheme: string) => {
    await userSettingsStore.updateSetting('theme', newTheme);
};
</script>

<template>
    <div>
        <label>
            <input
                type="checkbox"
                :checked="enableNotifications"
                @change="updateNotifications($event.target.checked)"
            />
            Enable Notifications
        </label>

        <select :value="theme" @change="updateTheme($event.target.value)">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
        </select>
    </div>
</template>
```

## Setting Types & Validation

### Boolean Settings
```typescript
enableFeature: {
    defaultValue: false,
    validation: { type: 'boolean' }
}
```

### String Settings with Options
```typescript
theme: {
    defaultValue: 'auto',
    validation: {
        type: 'string',
        allowedValues: ['light', 'dark', 'auto']
    }
}
```

### Number Settings with Range
```typescript
maxItems: {
    defaultValue: 25,
    validation: {
        type: 'number',
        min: 5,
        max: 100
    }
}
```

### String Settings with Length/Pattern
```typescript
customPrefix: {
    defaultValue: '',
    validation: {
        type: 'string',
        min: 2,        // minimum length
        max: 10,       // maximum length
        pattern: '^[A-Z]+$'  // regex pattern
    }
}
```

### Array Settings
```typescript
favoriteTypes: {
    defaultValue: [],
    validation: {
        type: 'array',
        min: 0,        // minimum array length
        max: 20        // maximum array length
    }
}
```

### Object Settings
```typescript
preferences: {
    defaultValue: {},
    validation: { type: 'object' }
}
```

## Categories for UI Organization

Settings can be grouped by category for better UI organization:

```typescript
// Navigation category
defaultCharacterPage: {
    category: 'navigation',
    // ...
},

// UI category
killListAlternatingRows: {
    category: 'ui',
    // ...
},

// Notifications category
emailAlerts: {
    category: 'notifications',
    // ...
},
```

You can then group settings in your UI:

```vue
<script setup>
const userSettingsStore = useUserSettingsStore();

// Group settings by category (this would be a computed or utility)
const settingsByCategory = computed(() => {
    // This could be a helper function that reads the registry
    // and groups settings by their category
});
</script>
```

## Backend API (Automatic)

The backend automatically:
- ✅ Validates all new settings against their registered rules
- ✅ Provides default values for unset settings
- ✅ Rejects unknown/unregistered settings
- ✅ Stores any valid key/value pair in MongoDB

No changes needed to API endpoints!

## Migration from Old System

The new system is **backward compatible**. All existing settings continue to work, and old UI components can gradually be updated to use the new `getSetting()` method instead of specific getters.

### Old Way (still works):
```vue
<script setup>
const userSettingsStore = useUserSettingsStore();
const killmailDelay = computed(() => userSettingsStore.killmailDelay);
</script>
```

### New Way (preferred):
```vue
<script setup>
const userSettingsStore = useUserSettingsStore();
const killmailDelay = computed(() => userSettingsStore.getSetting('killmailDelay'));
</script>
```

## Complete Example: Adding Dark Mode Toggle

Here's how to add a complete dark mode setting:

### 1. Register the Setting
```typescript
// server/interfaces/IUserSettings.ts
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
```

### 2. Create UI Component
```vue
<!-- app/components/ui/DarkModeToggle.vue -->
<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();

const isDarkMode = computed(() => userSettingsStore.getSetting('darkMode', false));
const isUpdating = ref(false);

const toggleDarkMode = async () => {
    try {
        isUpdating.value = true;
        await userSettingsStore.updateSetting('darkMode', !isDarkMode.value);
    } catch (error) {
        console.error('Failed to update dark mode:', error);
    } finally {
        isUpdating.value = false;
    }
};
</script>

<template>
    <button
        @click="toggleDarkMode"
        :disabled="isUpdating"
        class="flex items-center gap-2 p-2"
    >
        <Icon :name="isDarkMode ? 'lucide:moon' : 'lucide:sun'" />
        {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
    </button>
</template>
```

### 3. Use Anywhere
```vue
<script setup>
const userSettingsStore = useUserSettingsStore();
const darkMode = computed(() => userSettingsStore.getSetting('darkMode'));

// Apply dark mode class to body or root element
watch(darkMode, (isDark) => {
    document.body.classList.toggle('dark', isDark);
}, { immediate: true });
</script>
```

## Benefits of New System

✅ **Simple**: Add settings in one place only
✅ **Flexible**: Support any data type or validation rule
✅ **Type-Safe**: Validation prevents invalid data
✅ **Backward Compatible**: Existing code continues working
✅ **Organized**: Category system for UI grouping
✅ **Self-Documenting**: Built-in labels and descriptions
✅ **Future-Proof**: Easy to extend with new validation types

## Best Practices

1. **Use descriptive keys**: `enableEmailNotifications` not `email`
2. **Add categories**: Group related settings together
3. **Provide good defaults**: Settings should work out-of-the-box
4. **Add descriptions**: Help users understand what settings do
5. **Use appropriate validation**: Prevent invalid values
6. **Test with new users**: Ensure defaults work for fresh accounts

The flexible system eliminates the need for extensive type definitions and multiple file changes, making user settings much more maintainable and extensible!
