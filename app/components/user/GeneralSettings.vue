<script setup lang="ts">
interface Props {
    userSettings: {
        killmailDelay: number;
        defaultCharacterPage: string;
        defaultCorporationPage: string;
        defaultAlliancePage: string;
        defaultSystemPage: string;
    };
    isUpdatingSettings: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    updateSettings: [];
    'update:userSettings': [value: {
        killmailDelay: number;
        defaultCharacterPage: string;
        defaultCorporationPage: string;
        defaultAlliancePage: string;
        defaultSystemPage: string;
    }];
}>();

// Composables
const { t } = useI18n();
const configStore = useConfigurationStore();
const authStore = useAuthStore();
const toast = useToast();

// ESI Data Management state
const isRefreshingESI = ref(false);

// Page options configuration
const pageOptions = {
    character: [
        { value: "dashboard", label: t("dashboard", "Dashboard") },
        { value: "kills", label: t("kills", "Kills") },
        { value: "losses", label: t("losses", "Losses") },
        { value: "combined", label: t("combined", "Combined") },
        { value: "battles", label: t("battles", "Battles") },
        { value: "corporation-history", label: t("history", "History") },
        { value: "top", label: t("top", "Top") },
        { value: "stats", label: t("stats", "Stats") },
        { value: "achievements", label: t("achievements.title", "Achievements") },
    ],
    corporation: [
        { value: "dashboard", label: t("dashboard", "Dashboard") },
        { value: "kills", label: t("kills", "Kills") },
        { value: "losses", label: t("losses", "Losses") },
        { value: "combined", label: t("combined", "Combined") },
        { value: "battles", label: t("battles", "Battles") },
        { value: "corporation-history", label: t("history", "History") },
        { value: "top", label: t("top", "Top") },
        { value: "stats", label: t("stats", "Stats") },
        { value: "members", label: t("Characters", "Members") },
    ],
    alliance: [
        { value: "dashboard", label: t("dashboard", "Dashboard") },
        { value: "kills", label: t("kills", "Kills") },
        { value: "losses", label: t("losses", "Losses") },
        { value: "combined", label: t("combined", "Combined") },
        { value: "corporationMembers", label: t("corporations", "Corporations") },
        { value: "characterMembers", label: t("characters", "Characters") },
        { value: "top", label: t("top", "Top") },
        { value: "stats", label: t("stats", "Stats") },
        { value: "battles", label: t("battles", "Battles") },
    ],
    system: [
        { value: "overview", label: t("system.overview", "Overview") },
        { value: "kills", label: t("kills", "Kills") },
        { value: "battles", label: t("battles", "Battles") },
    ]
};

// Generic handler for default page updates
const updateDefaultPage = async (pageType: 'character' | 'corporation' | 'alliance' | 'system', value: string) => {
    const settingKeys = {
        character: 'defaultCharacterPage',
        corporation: 'defaultCorporationPage',
        alliance: 'defaultAlliancePage',
        system: 'defaultSystemPage'
    } as const;

    const settingKey = settingKeys[pageType];
    emit('update:userSettings', { ...props.userSettings, [settingKey]: value });
    // Auto-save after updating the setting
    await nextTick();
    emit('updateSettings');
};

// ESI Data Management handlers
const refreshESIData = async () => {
    if (isRefreshingESI.value) return;

    isRefreshingESI.value = true;

    try {
        const { data } = await $fetch('/api/user/refresh-character', {
            method: 'POST'
        });

        // Show success toast with details
        const refreshedItems = [];
        if (data.character) refreshedItems.push('Character');
        if (data.corporation) refreshedItems.push('Corporation');
        if (data.alliance) refreshedItems.push('Alliance');

        if (refreshedItems.length > 0) {
            toast.add({
                title: t('settings.esi.refresh.success', 'ESI Data Refreshed'),
                description: t('settings.esi.refresh.successDesc', `Successfully refreshed: ${refreshedItems.join(', ')}`),
                color: 'success',
                timeout: 5000
            });
        }

        // Show warnings for any errors
        if (data.errors && data.errors.length > 0) {
            toast.add({
                title: t('settings.esi.refresh.partialWarning', 'Partial Refresh'),
                description: t('settings.esi.refresh.partialWarningDesc', 'Some data could not be refreshed. Check console for details.'),
                color: 'warning',
                timeout: 7000
            });
        }
    } catch (error: any) {
        console.error('Failed to refresh ESI data:', error);

        toast.add({
            title: t('settings.esi.refresh.error', 'Refresh Failed'),
            description: error?.data?.message || error?.message || t('settings.esi.refresh.errorDesc', 'Failed to refresh ESI data. Please try again.'),
            color: 'error',
            timeout: 7000
        });
    } finally {
        isRefreshingESI.value = false;
    }
};

// Privacy setting handlers
const updateHideFitting = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.checked;

    try {
        await configStore.setConfiguration('hideFitting', value, {
            characterId: authStore.currentUser.characterId
        });
    } catch (error) {
        console.error('Failed to update hideFitting setting:', error);
        // TODO: Show error toast
    }
};

// Initialize configuration store context when component mounts
onMounted(() => {
    if (authStore.isAuthenticated && authStore.currentUser.characterId) {
        configStore.setContext({
            characterId: authStore.currentUser.characterId,
            corporationId: authStore.currentUser.corporationId,
            allianceId: authStore.currentUser.allianceId
        });
    }
});
</script>

<template>
    <div class="space-y-8">
        <!-- Privacy Settings Card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center space-x-3 mb-6">
                <div class="flex-shrink-0">
                    <Icon name="lucide:shield-check" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ t("settings.privacy.title", "Privacy Settings") }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t("settings.privacy.description", "Control how your killmail data is displayed") }}
                    </p>
                </div>
            </div>

            <!-- Privacy Options -->
            <div class="space-y-4">
                <!-- Hide Fitting Setting -->
                <div class="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div class="flex items-center h-5">
                        <input id="hideFitting" type="checkbox"
                            :checked="configStore.getConfiguration('hideFitting', false)" @change="updateHideFitting"
                            :disabled="configStore.loading"
                            class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <label for="hideFitting" class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.privacy.hideFitting.title") }}
                            <Icon v-if="configStore.loading" name="lucide:loader-2"
                                class="inline w-3 h-3 ml-1 animate-spin text-blue-500" />
                        </label>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {{ t("settings.privacy.hideFitting.description") }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ESI Data Management Card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center space-x-3 mb-6">
                <div class="flex-shrink-0">
                    <Icon name="lucide:refresh-cw" class="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ t("settings.esi.title", "ESI Data Management") }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t("settings.esi.description") }}
                    </p>
                </div>
            </div>

            <!-- ESI Refresh Options -->
            <div class="space-y-4">
                <!-- Refresh Button Section -->
                <div class="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div class="flex-shrink-0">
                        <Icon name="lucide:database" class="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                                    {{ t("settings.esi.refresh.title", "Force Data Refresh") }}
                                </h4>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {{ t("settings.esi.refresh.description") }}
                                </p>
                            </div>
                            <UButton color="warning" variant="solid" size="sm" :loading="isRefreshingESI"
                                :disabled="isRefreshingESI" @click="refreshESIData" class="ml-4 flex-shrink-0">
                                <template v-if="isRefreshingESI">
                                    <Icon name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
                                    {{ t("settings.esi.refresh.refreshing", "Refreshing...") }}
                                </template>
                                <template v-else>
                                    <Icon name="lucide:refresh-cw" class="w-4 h-4 mr-2" />
                                    {{ t("settings.esi.refresh.button", "Refresh Now") }}
                                </template>
                            </UButton>
                        </div>
                    </div>
                </div>

                <!-- Info Section -->
                <div
                    class="flex items-start space-x-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div class="flex-shrink-0">
                        <Icon name="lucide:info" class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs text-blue-800 dark:text-blue-200">
                            {{ t("settings.esi.refresh.note") }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Default Pages Settings Card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center space-x-3 mb-6">
                <div class="flex-shrink-0">
                    <Icon name="lucide:bookmark" class="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ t("settings.defaultPages.title", "Default Page Settings") }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t("settings.defaultPages.description") }}
                    </p>
                </div>
            </div>

            <!-- Default Page Options -->
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                <!-- Character Default Page -->
                <div class="space-y-3">
                    <div class="flex items-center space-x-2">
                        <Icon name="lucide:user" class="h-4 w-4 text-blue-500" />
                        <label for="defaultCharacterPage"
                            class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.defaultPages.character", "Character Pages") }}
                        </label>
                        <Icon v-if="isUpdatingSettings" name="lucide:loader-2"
                            class="h-3 w-3 animate-spin text-blue-500" />
                    </div>
                    <select id="defaultCharacterPage" :value="userSettings.defaultCharacterPage"
                        @change="(e) => updateDefaultPage('character', (e.target as HTMLSelectElement).value)"
                        :disabled="isUpdatingSettings" class="setting-select">
                        <option v-for="option in pageOptions.character" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ t("settings.defaultPages.characterDesc", "Default tab when viewing character profiles") }}
                    </p>
                </div>

                <!-- Corporation Default Page -->
                <div class="space-y-3">
                    <div class="flex items-center space-x-2">
                        <Icon name="lucide:building" class="h-4 w-4 text-purple-500" />
                        <label for="defaultCorporationPage"
                            class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.defaultPages.corporation", "Corporation Pages") }}
                        </label>
                        <Icon v-if="isUpdatingSettings" name="lucide:loader-2"
                            class="h-3 w-3 animate-spin text-blue-500" />
                    </div>
                    <select id="defaultCorporationPage" :value="userSettings.defaultCorporationPage"
                        @change="(e) => updateDefaultPage('corporation', (e.target as HTMLSelectElement).value)"
                        :disabled="isUpdatingSettings" class="setting-select">
                        <option v-for="option in pageOptions.corporation" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ t("settings.defaultPages.corporationDesc", "Default tab when viewing corporation profiles")
                        }}
                    </p>
                </div>

                <!-- Alliance Default Page -->
                <div class="space-y-3">
                    <div class="flex items-center space-x-2">
                        <Icon name="lucide:users" class="h-4 w-4 text-orange-500" />
                        <label for="defaultAlliancePage"
                            class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.defaultPages.alliance", "Alliance Pages") }}
                        </label>
                        <Icon v-if="isUpdatingSettings" name="lucide:loader-2"
                            class="h-3 w-3 animate-spin text-blue-500" />
                    </div>
                    <select id="defaultAlliancePage" :value="userSettings.defaultAlliancePage"
                        @change="(e) => updateDefaultPage('alliance', (e.target as HTMLSelectElement).value)"
                        :disabled="isUpdatingSettings" class="setting-select">
                        <option v-for="option in pageOptions.alliance" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ t("settings.defaultPages.allianceDesc", "Default tab when viewing alliance profiles") }}
                    </p>
                </div>

                <!-- System Default Page -->
                <div class="space-y-3">
                    <div class="flex items-center space-x-2">
                        <Icon name="lucide:map-pin" class="h-4 w-4 text-red-500" />
                        <label for="defaultSystemPage" class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.defaultPages.system", "System Pages") }}
                        </label>
                        <Icon v-if="isUpdatingSettings" name="lucide:loader-2"
                            class="h-3 w-3 animate-spin text-blue-500" />
                    </div>
                    <select id="defaultSystemPage" :value="userSettings.defaultSystemPage"
                        @change="(e) => updateDefaultPage('system', (e.target as HTMLSelectElement).value)"
                        :disabled="isUpdatingSettings" class="setting-select">
                        <option v-for="option in pageOptions.system" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ t("settings.defaultPages.systemDesc", "Default tab when viewing system pages") }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Action Bar -->
        <div
            class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Icon name="lucide:info" class="h-4 w-4" />
                <span>{{ t("settings.autoSave.note", "Settings are automatically saved when changed.") }}</span>
            </div>

            <UButton color="primary" :loading="isUpdatingSettings" :disabled="isUpdatingSettings"
                @click="$emit('updateSettings')" class="transition-all duration-200">
                <template v-if="isUpdatingSettings">
                    <Icon name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
                    {{ t("common.saving", "Saving...") }}
                </template>
                <template v-else>
                    <Icon name="lucide:save" class="w-4 h-4 mr-2" />
                    {{ t("common.save", "Save Changes") }}
                </template>
            </UButton>
        </div>
    </div>
</template>

<style scoped>
.setting-select {
    width: 100%;
    appearance: none;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    padding: 0.625rem 0.75rem;
    padding-right: 2.5rem;
    background-color: white;
    color: #111827;
    font-size: 0.875rem;
    transition: colors 200ms;

    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.75rem center;
    background-repeat: no-repeat;
    background-size: 1.25em 1.25em;
}

.setting-select:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3b82f6;
    border-color: #3b82f6;
}

.setting-select:hover {
    border-color: #9ca3af;
}

.setting-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

:global(.dark) .setting-select {
    border-color: #4b5563;
    background-color: #374151;
    color: #f9fafb;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
}

:global(.dark) .setting-select:hover {
    border-color: #6b7280;
}

/* Card hover effects */
.bg-white {
    transition: all 200ms;
}

.bg-white:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

:global(.dark) .bg-white:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

/* Enhanced focus states for accessibility */
input[type="checkbox"]:focus {
    box-shadow: 0 0 0 2px #f3f4f6, 0 0 0 4px #3b82f6;
}

:global(.dark) input[type="checkbox"]:focus {
    box-shadow: 0 0 0 2px #1f2937, 0 0 0 4px #3b82f6;
}

/* Better spacing for responsive design */
@media (max-width: 1023px) {
    .grid.lg\:grid-cols-2 {
        gap: 1rem;
    }
}

@media (max-width: 1279px) {
    .grid.xl\:grid-cols-4 {
        gap: 1rem;
    }
}
</style>
