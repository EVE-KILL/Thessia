<template>
    <div class="user-settings">
        <div v-for="(categorySettings, category) in settingsByCategory" :key="category" class="mb-8">
            <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white capitalize">
                {{ category }} Settings
            </h3>
            <div class="space-y-4">
                <div v-for="setting in categorySettings" :key="setting.key"
                    class="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <!-- Boolean Settings -->
                    <template v-if="setting.validation?.type === 'boolean'">
                        <div class="flex items-center h-5">
                            <input :id="setting.key" type="checkbox"
                                :checked="getSetting(setting.key, setting.defaultValue)"
                                @change="updateSetting(setting.key, ($event.target as HTMLInputElement).checked)"
                                :disabled="isUpdating"
                                class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <label :for="setting.key" class="block text-sm font-medium text-gray-900 dark:text-white">
                                {{ setting.label || setting.key }}
                                <Icon v-if="isUpdating" name="lucide:loader-2"
                                    class="inline w-3 h-3 ml-1 animate-spin text-blue-500" />
                            </label>
                            <p v-if="setting.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ setting.description }}
                            </p>
                        </div>
                    </template>

                    <!-- String Settings with Allowed Values (Select) -->
                    <template v-else-if="setting.validation?.type === 'string' && setting.validation?.allowedValues">
                        <div class="flex-1">
                            <label :for="setting.key"
                                class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {{ setting.label || setting.key }}
                                <Icon v-if="isUpdating" name="lucide:loader-2"
                                    class="inline w-3 h-3 ml-1 animate-spin text-blue-500" />
                            </label>
                            <select :id="setting.key" :value="getSetting(setting.key, setting.defaultValue)"
                                @change="updateSetting(setting.key, ($event.target as HTMLSelectElement).value)"
                                :disabled="isUpdating"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                <option v-for="value in setting.validation.allowedValues" :key="value" :value="value">
                                    {{ value }}
                                </option>
                            </select>
                            <p v-if="setting.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ setting.description }}
                            </p>
                        </div>
                    </template>

                    <!-- String Settings (Text Input) -->
                    <template v-else-if="setting.validation?.type === 'string'">
                        <div class="flex-1">
                            <label :for="setting.key"
                                class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {{ setting.label || setting.key }}
                                <Icon v-if="isUpdating" name="lucide:loader-2"
                                    class="inline w-3 h-3 ml-1 animate-spin text-blue-500" />
                            </label>
                            <input :id="setting.key" type="text" :value="getSetting(setting.key, setting.defaultValue)"
                                @input="updateSetting(setting.key, ($event.target as HTMLInputElement).value)"
                                :disabled="isUpdating" :minlength="setting.validation?.min"
                                :maxlength="setting.validation?.max" :pattern="setting.validation?.pattern"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                            <p v-if="setting.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ setting.description }}
                            </p>
                        </div>
                    </template>

                    <!-- Number Settings -->
                    <template v-else-if="setting.validation?.type === 'number'">
                        <div class="flex-1">
                            <label :for="setting.key"
                                class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {{ setting.label || setting.key }}
                                <Icon v-if="isUpdating" name="lucide:loader-2"
                                    class="inline w-3 h-3 ml-1 animate-spin text-blue-500" />
                            </label>
                            <input :id="setting.key" type="number"
                                :value="getSetting(setting.key, setting.defaultValue)"
                                @input="updateSetting(setting.key, Number(($event.target as HTMLInputElement).value))"
                                :disabled="isUpdating" :min="setting.validation?.min" :max="setting.validation?.max"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
                            <p v-if="setting.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ setting.description }}
                            </p>
                        </div>
                    </template>

                    <!-- Generic/Unknown Settings (JSON Input) -->
                    <template v-else>
                        <div class="flex-1">
                            <label :for="setting.key"
                                class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {{ setting.label || setting.key }} ({{ setting.validation?.type || 'any' }})
                                <Icon v-if="isUpdating" name="lucide:loader-2"
                                    class="inline w-3 h-3 ml-1 animate-spin text-blue-500" />
                            </label>
                            <textarea :id="setting.key"
                                :value="JSON.stringify(getSetting(setting.key, setting.defaultValue), null, 2)"
                                @input="updateJsonSetting(setting.key, ($event.target as HTMLTextAreaElement).value)"
                                :disabled="isUpdating" rows="3"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                                placeholder="JSON format" />
                            <p v-if="setting.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ setting.description }}
                            </p>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface SettingInfo {
    key: string;
    defaultValue: any;
    validation?: {
        type: string;
        min?: number;
        max?: number;
        allowedValues?: any[];
        pattern?: string;
    };
    category?: string;
    label?: string;
    description?: string;
}

interface Props {
    /**
     * Settings registry - should come from the backend settings registry
     * This can be fetched from an API endpoint that returns the registry
     */
    settingsRegistry?: Record<string, SettingInfo>;
}

const props = withDefaults(defineProps<Props>(), {
    settingsRegistry: () => ({})
});

const userSettingsStore = useUserSettingsStore();
const isUpdating = ref(false);

// Get setting value with fallback
const getSetting = (key: string, defaultValue: any) => {
    return userSettingsStore.getSetting(key, defaultValue);
};

// Update setting with debouncing for text inputs
const { debouncedFn: debouncedUpdate } = useDebounceFn(async (key: string, value: any) => {
    try {
        await userSettingsStore.updateSetting(key, value);
    } catch (error) {
        console.error('Failed to update setting:', error);
        // Could show a toast notification here
    }
}, 500);

// Update setting immediately (for checkboxes, selects)
const updateSetting = async (key: string, value: any) => {
    if (typeof value === 'string') {
        // Debounce text inputs
        debouncedUpdate(key, value);
    } else {
        // Update immediately for non-text inputs
        try {
            isUpdating.value = true;
            await userSettingsStore.updateSetting(key, value);
        } catch (error) {
            console.error('Failed to update setting:', error);
            // Could show a toast notification here
        } finally {
            isUpdating.value = false;
        }
    }
};

// Handle JSON settings (arrays, objects)
const updateJsonSetting = (key: string, jsonString: string) => {
    try {
        const value = JSON.parse(jsonString);
        debouncedUpdate(key, value);
    } catch (error) {
        console.warn('Invalid JSON for setting', key, error);
        // Could show validation error
    }
};

// Group settings by category
const settingsByCategory = computed(() => {
    const grouped: Record<string, SettingInfo[]> = {};

    for (const [key, setting] of Object.entries(props.settingsRegistry)) {
        const category = setting.category || 'general';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push({ key, ...setting });
    }

    return grouped;
});
</script>

<style scoped>
.user-settings {
    max-width: 800px;
}
</style>
