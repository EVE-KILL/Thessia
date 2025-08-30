<template>
    <div class="container mx-auto py-8 px-4">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
                User Settings (Dynamic System Demo)
            </h1>

            <div class="grid gap-8 lg:grid-cols-2">
                <!-- Dynamic Settings UI -->
                <div>
                    <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Auto-Generated Settings UI
                    </h2>
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <DynamicUserSettings v-if="settingsRegistry" :settings-registry="settingsRegistry" />
                        <div v-else class="flex items-center justify-center py-8">
                            <Icon name="lucide:loader-2" class="w-6 h-6 animate-spin mr-2" />
                            Loading settings...
                        </div>
                    </div>
                </div>

                <!-- Manual Example -->
                <div>
                    <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Manual Settings Usage
                    </h2>
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                        <!-- Example: Using the new flexible getSetting method -->
                        <div>
                            <h3 class="font-medium text-gray-900 dark:text-white mb-2">
                                Current Settings Values
                            </h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Kill Delay:</span>
                                    <span class="font-mono text-gray-900 dark:text-white">
                                        {{ userSettingsStore.getSetting('killmailDelay', 0) }}h
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Default Character Page:</span>
                                    <span class="font-mono text-gray-900 dark:text-white">
                                        {{ userSettingsStore.getSetting('defaultCharacterPage', 'dashboard') }}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Alternating Rows:</span>
                                    <span class="font-mono text-gray-900 dark:text-white">
                                        {{ userSettingsStore.getSetting('killListAlternatingRows', true) }}
                                    </span>
                                </div>

                                <!-- Example of a hypothetical new setting -->
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Dark Mode:</span>
                                    <span class="font-mono text-gray-900 dark:text-white">
                                        {{ userSettingsStore.getSetting('darkMode', false) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Test Adding New Settings -->
                        <div>
                            <h3 class="font-medium text-gray-900 dark:text-white mb-2">
                                Test New Settings
                            </h3>
                            <div class="space-y-3">
                                <button @click="addTestSetting"
                                    class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    :disabled="isAdding">
                                    <Icon v-if="isAdding" name="lucide:loader-2" class="w-4 h-4 animate-spin mr-2" />
                                    Add Test Setting (darkMode)
                                </button>

                                <button @click="addComplexSetting"
                                    class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                    :disabled="isAdding">
                                    <Icon v-if="isAdding" name="lucide:loader-2" class="w-4 h-4 animate-spin mr-2" />
                                    Add Complex Setting (notifications)
                                </button>
                            </div>
                        </div>

                        <!-- Raw Settings Data -->
                        <div>
                            <h3 class="font-medium text-gray-900 dark:text-white mb-2">
                                Raw Settings Data
                            </h3>
                            <pre
                                class="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-40 font-mono">{{ JSON.stringify(userSettingsStore.currentSettings, null, 2) }}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// This page demonstrates the new flexible user settings system

const userSettingsStore = useUserSettingsStore();
const isAdding = ref(false);

// Fetch the settings registry from the backend
const { data: settingsRegistryData } = await useFetch('/api/user/settings-registry', {
    server: false,
    default: () => ({ success: false, data: {} })
});

const settingsRegistry = computed(() => {
    return settingsRegistryData.value?.success ? settingsRegistryData.value.data : null;
});

// Load user settings
await userSettingsStore.fetchSettings();

// Example: Add a test setting dynamically (this would normally be done server-side)
const addTestSetting = async () => {
    try {
        isAdding.value = true;

        // In a real scenario, this would be registered server-side
        // This is just for demonstration
        await userSettingsStore.updateSetting('darkMode', true);

        console.log('Added darkMode setting');
    } catch (error) {
        console.error('Failed to add test setting:', error);
    } finally {
        isAdding.value = false;
    }
};

const addComplexSetting = async () => {
    try {
        isAdding.value = true;

        // Add a complex setting (object/array)
        await userSettingsStore.updateSetting('notifications', {
            email: true,
            push: false,
            frequency: 'daily',
            categories: ['kills', 'wars']
        });

        console.log('Added notifications setting');
    } catch (error) {
        console.error('Failed to add complex setting:', error);
    } finally {
        isAdding.value = false;
    }
};

// SEO
useSeoMeta({
    title: 'User Settings Demo - EVE Kill',
    description: 'Demonstration of the flexible user settings system'
});
</script>
