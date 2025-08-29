# User Settings Development Guide

This guide explains how to add new user settings to the EVE Kill application, covering the complete flow from backend database storage to frontend UI components.

## Overview

User settings in EVE Kill follow a type-safe, end-to-end architecture that ensures consistency between backend storage, API validation, and frontend consumption. Each setting must be defined in multiple layers to work properly.

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend UI   │    │    Pinia     │    │   Backend API   │
│   Components    │◄──►│    Store     │◄──►│   & Database    │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │                     │
         │                       │                     │
    Vue Templates          Store Actions         MongoDB Storage
    Event Handlers        Getters/Setters       Type Validation
```

## Step-by-Step Implementation

### 1. Backend: Define the Setting Interface

**File**: `server/interfaces/IUserSettings.ts`

First, add your new setting to the `IUserSettingsMap` interface:

```typescript
export interface IUserSettingsMap {
    killmailDelay: number;
    defaultCharacterPage: string;
    defaultCorporationPage: string;
    defaultAlliancePage: string;
    defaultSystemPage: string;
    killListAlternatingRows: boolean;
    killListMutedAlternatingRows: boolean;
    // Add your new setting here
    newSettingName: boolean | string | number;
}
```

**Important**: The interface is strictly typed, so any setting not defined here will be discarded by the database.

### 2. Backend: Add Default Value

In the same file, add your setting to `DEFAULT_USER_SETTINGS`:

```typescript
export const DEFAULT_USER_SETTINGS: IUserSettingsMap = {
    killmailDelay: 0,
    defaultCharacterPage: "dashboard",
    defaultCorporationPage: "dashboard",
    defaultAlliancePage: "dashboard",
    defaultSystemPage: "overview",
    killListAlternatingRows: true,
    killListMutedAlternatingRows: false,
    // Add your default value
    newSettingName: false, // or appropriate default
};
```

### 3. Backend: Add Validation Rules

Still in `IUserSettings.ts`, add validation to `USER_SETTING_VALIDATION`:

```typescript
export const USER_SETTING_VALIDATION = {
    // ... existing validations
    newSettingName: {
        type: "boolean" as const, // or "string" | "number"
        required: false,
        // For strings, add allowedValues if needed:
        // allowedValues: ["option1", "option2", "option3"],
        // For numbers, add min/max if needed:
        // min: 0,
        // max: 100,
    },
} as const;
```

### 4. Backend: Update Validation Logic

**File**: `server/helpers/UserSettings.ts`

Add type checking in the `validateSetting` method (around line 139):

```typescript
private validateSetting(key: UserSettingKey, value: any): boolean {
    const validation = USER_SETTING_VALIDATION[key];
    if (!validation) return true;

    // Add your validation logic
    if (key === "newSettingName") {
        if (typeof value !== "boolean") return false; // or appropriate type
        // Add additional validation if needed
    }
    // ... existing validation logic

    return true;
}
```

### 5. Frontend: Update Store Interface

**File**: `app/stores/userSettings.ts`

Add your setting to the `UserSettings` interface:

```typescript
export interface UserSettings {
    killmailDelay: number;
    defaultCharacterPage: string;
    defaultCorporationPage: string;
    defaultAlliancePage: string;
    defaultSystemPage: string;
    killListAlternatingRows: boolean;
    killListMutedAlternatingRows: boolean;
    // Add your new setting
    newSettingName: boolean;
}
```

### 6. Frontend: Add Store Default

Update `defaultSettings` in the same file:

```typescript
const defaultSettings: UserSettings = {
    killmailDelay: 0,
    defaultCharacterPage: "dashboard",
    defaultCorporationPage: "dashboard",
    defaultAlliancePage: "dashboard",
    defaultSystemPage: "overview",
    killListAlternatingRows: true,
    killListMutedAlternatingRows: false,
    // Add your default (should match backend)
    newSettingName: false,
};
```

### 7. Frontend: Add Store Getter

Add a getter for easy access:

```typescript
getters: {
    // ... existing getters
    newSettingName: (state) => {
        return (
            state.settings?.newSettingName ??
            defaultSettings.newSettingName
        );
    },
}
```

### 8. Frontend: Update UI Component

**File**: `app/components/user/GeneralSettings.vue`

#### Add to Props Interface

```typescript
interface Props {
    userSettings: {
        killmailDelay: number;
        defaultCharacterPage: string;
        defaultCorporationPage: string;
        defaultAlliancePage: string;
        defaultSystemPage: string;
        killListAlternatingRows: boolean;
        killListMutedAlternatingRows: boolean;
        // Add your setting
        newSettingName: boolean;
    };
    isUpdatingSettings: boolean;
}
```

#### Add to Emit Interface

```typescript
const emit = defineEmits<{
    updateSettings: [];
    'update:userSettings': [value: {
        // ... all settings including your new one
        newSettingName: boolean;
    }];
}>();
```

#### Add Event Handler

```typescript
const updateNewSettingName = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.checked; // or target.value for text/select
    emit('update:userSettings', { ...props.userSettings, newSettingName: value });
    await nextTick();
    emit('updateSettings');
};
```

#### Add UI Element to Template

```vue
<template>
    <!-- Add to appropriate settings card -->
    <div class="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
        <div class="flex items-center h-5">
            <input
                id="newSettingName"
                type="checkbox"
                :checked="userSettings.newSettingName"
                @change="updateNewSettingName"
                :disabled="isUpdatingSettings"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
        <div class="flex-1 min-w-0">
            <label for="newSettingName" class="block text-sm font-medium text-gray-900 dark:text-white">
                {{ t("settings.ui.newSetting.title", "New Setting Title") }}
                <Icon v-if="isUpdatingSettings" name="lucide:loader-2"
                    class="inline w-3 h-3 ml-1 animate-spin text-blue-500" />
            </label>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t("settings.ui.newSetting.description", "Description of what this setting does") }}
            </p>
        </div>
    </div>
</template>
```

### 9. Frontend: Use the Setting in Components

To use your setting in any Vue component:

```typescript
<script setup>
const userSettingsStore = useUserSettingsStore();

// Get the setting value
const newSettingValue = computed(() => userSettingsStore.newSettingName);

// Watch for changes
watch(newSettingValue, (newValue) => {
    // React to setting changes
    console.log('Setting changed:', newValue);
});
</script>
```

## Setting Types & Examples

### Boolean Settings
Perfect for toggle switches, checkboxes:
```typescript
// Backend
enableNotifications: boolean;

// Frontend usage
const isEnabled = userSettingsStore.enableNotifications;
```

### String Settings with Validation
For dropdowns, text inputs with limited options:
```typescript
// Backend validation
theme: {
    type: "string" as const,
    allowedValues: ["light", "dark", "auto"],
    required: false,
},

// Frontend
theme: "light" | "dark" | "auto";
```

### Number Settings with Ranges
For sliders, numeric inputs:
```typescript
// Backend validation
maxItems: {
    type: "number" as const,
    min: 1,
    max: 100,
    required: false,
},

// Frontend
maxItems: number;
```

## Testing Your Implementation

### 1. Backend Testing
```bash
# Verify interface compilation
npm run build

# Check API endpoint
curl -X POST localhost:3000/api/user/settings \
  -H "Content-Type: application/json" \
  -d '{"newSettingName": true}'
```

### 2. Frontend Testing
1. Navigate to `/user/settings`
2. Toggle your new setting
3. Refresh the page - setting should persist
4. Check browser dev tools for any console errors
5. Verify the setting works where you're using it

## Common Pitfalls

### ❌ Interface Mismatch
```typescript
// Backend says boolean, frontend says string
// Backend
newSetting: boolean;

// Frontend (WRONG)
newSetting: string; // Will cause type errors and runtime issues
```

### ❌ Missing Default Value
```typescript
// Forgetting to add to DEFAULT_USER_SETTINGS
// Will cause undefined values for new users
```

### ❌ Validation Mismatch
```typescript
// Backend validation too strict for frontend usage
// Backend: allowedValues: ["option1", "option2"]
// Frontend: User can somehow input "option3"
```

### ❌ Missing Store Getter
```typescript
// Components trying to access setting without getter
// Will work but lacks proper fallback handling
```

## Best Practices

1. **Always match types** between backend and frontend interfaces
2. **Test with fresh user accounts** to ensure defaults work
3. **Add validation on both ends** - backend for security, frontend for UX
4. **Use descriptive setting names** that explain their purpose
5. **Group related settings** in the UI for better user experience
6. **Add proper i18n keys** for internationalization support
7. **Consider migration** if changing existing setting types

## Example: Complete Implementation

Here's a complete example of adding a `showAdvancedFeatures` boolean setting:

### Backend (`server/interfaces/IUserSettings.ts`):
```typescript
export interface IUserSettingsMap {
    // ... existing settings
    showAdvancedFeatures: boolean;
}

export const DEFAULT_USER_SETTINGS: IUserSettingsMap = {
    // ... existing defaults
    showAdvancedFeatures: false,
};

export const USER_SETTING_VALIDATION = {
    // ... existing validation
    showAdvancedFeatures: {
        type: "boolean" as const,
        required: false,
    },
} as const;
```

### Backend (`server/helpers/UserSettings.ts`):
```typescript
private validateSetting(key: UserSettingKey, value: any): boolean {
    // ... existing validation
    } else if (key === "showAdvancedFeatures") {
        if (typeof value !== "boolean") return false;
    }
    // ...
}
```

### Frontend (`app/stores/userSettings.ts`):
```typescript
export interface UserSettings {
    // ... existing settings
    showAdvancedFeatures: boolean;
}

const defaultSettings: UserSettings = {
    // ... existing defaults
    showAdvancedFeatures: false,
};

// In getters:
showAdvancedFeatures: (state) => {
    return (
        state.settings?.showAdvancedFeatures ??
        defaultSettings.showAdvancedFeatures
    );
},
```

### Frontend Usage:
```vue
<script setup>
const userSettingsStore = useUserSettingsStore();
const showAdvanced = computed(() => userSettingsStore.showAdvancedFeatures);
</script>

<template>
    <div v-if="showAdvanced" class="advanced-features">
        <!-- Advanced features only shown when enabled -->
    </div>
</template>
```

This guide should help you add any new user setting to the EVE Kill application while maintaining type safety and consistency across the entire stack.
