<script setup lang="ts">
interface Props {
    userSettings: {
        killmailDelay: number;
        defaultCharacterPage: string;
        defaultCorporationPage: string;
        defaultAlliancePage: string;
    };
    isUpdatingSettings: boolean;
    settingsSuccess: string;
    settingsError: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    updateSettings: [];
    'update:userSettings': [value: {
        killmailDelay: number;
        defaultCharacterPage: string;
        defaultCorporationPage: string;
        defaultAlliancePage: string;
    }];
}>();

// Composables
const { t } = useI18n();

// Available page options for each entity type
const characterPageOptions = [
    { value: "dashboard", label: t("dashboard", "Dashboard") },
    { value: "kills", label: t("kills", "Kills") },
    { value: "losses", label: t("losses", "Losses") },
    { value: "combined", label: t("combined", "Combined") },
    { value: "battles", label: t("battles", "Battles") },
    { value: "corporation-history", label: t("history", "History") },
    { value: "top", label: t("top", "Top") },
    { value: "stats", label: t("stats", "Stats") },
    { value: "achievements", label: t("achievements.title", "Achievements") },
];

const corporationPageOptions = [
    { value: "dashboard", label: t("dashboard", "Dashboard") },
    { value: "kills", label: t("kills", "Kills") },
    { value: "losses", label: t("losses", "Losses") },
    { value: "combined", label: t("combined", "Combined") },
    { value: "battles", label: t("battles", "Battles") },
    { value: "corporation-history", label: t("history", "History") },
    { value: "top", label: t("top", "Top") },
    { value: "stats", label: t("stats", "Stats") },
    { value: "members", label: t("Characters", "Members") },
];

const alliancePageOptions = [
    { value: "dashboard", label: t("dashboard", "Dashboard") },
    { value: "kills", label: t("kills", "Kills") },
    { value: "losses", label: t("losses", "Losses") },
    { value: "combined", label: t("combined", "Combined") },
    { value: "corporationMembers", label: t("corporations", "Corporations") },
    { value: "characterMembers", label: t("characters", "Characters") },
    { value: "top", label: t("top", "Top") },
    { value: "stats", label: t("stats", "Stats") },
    { value: "battles", label: t("battles", "Battles") },
];

// Update functions - Handle select change events
const updateDefaultCharacterPage = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    if (typeof value === 'string') {
        emit('update:userSettings', { ...props.userSettings, defaultCharacterPage: value });
    }
};

const updateDefaultCorporationPage = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    if (typeof value === 'string') {
        emit('update:userSettings', { ...props.userSettings, defaultCorporationPage: value });
    }
};

const updateDefaultAlliancePage = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    if (typeof value === 'string') {
        emit('update:userSettings', { ...props.userSettings, defaultAlliancePage: value });
    }
};
</script>

<template>
    <div class="space-y-6 p-6">
        <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ t("settings.general.title", "General Settings") }}
            </h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ t("settings.general.description", "Configure your general preferences") }}
            </p>
        </div>

        <!-- Default Page Settings -->
        <div class="space-y-6">
            <div>
                <h4 class="text-base font-medium text-gray-900 dark:text-white mb-4">
                    {{ t("settings.defaultPages.title", "Default Page Settings") }}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    {{ t("settings.defaultPages.description") }}
                </p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Character Default Page -->
                    <div class="space-y-2">
                        <label for="defaultCharacterPage"
                            class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.defaultPages.character", "Default Character Page") }}
                        </label>
                        <select id="defaultCharacterPage" :value="userSettings.defaultCharacterPage"
                            @change="updateDefaultCharacterPage"
                            class="custom-select w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option v-for="option in characterPageOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ t("settings.defaultPages.characterDesc", "Default tab when viewing character profiles")
                            }}
                        </p>
                    </div>

                    <!-- Corporation Default Page -->
                    <div class="space-y-2">
                        <label for="defaultCorporationPage"
                            class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.defaultPages.corporation", "Default Corporation Page") }}
                        </label>
                        <select id="defaultCorporationPage" :value="userSettings.defaultCorporationPage"
                            @change="updateDefaultCorporationPage"
                            class="custom-select w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option v-for="option in corporationPageOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ t("settings.defaultPages.corporationDesc") }}
                        </p>
                    </div>

                    <!-- Alliance Default Page -->
                    <div class="space-y-2">
                        <label for="defaultAlliancePage"
                            class="block text-sm font-medium text-gray-900 dark:text-white">
                            {{ t("settings.defaultPages.alliance", "Default Alliance Page") }}
                        </label>
                        <select id="defaultAlliancePage" :value="userSettings.defaultAlliancePage"
                            @change="updateDefaultAlliancePage"
                            class="custom-select w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option v-for="option in alliancePageOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ t("settings.defaultPages.allianceDesc", "Default tab when viewing alliance profiles") }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Save Button -->
            <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <UButton color="primary" :loading="isUpdatingSettings" :disabled="isUpdatingSettings"
                    @click="$emit('updateSettings')">
                    {{ t("common.save", "Save Changes") }}
                </UButton>
            </div>
        </div>

        <!-- Info Note -->
        <div class="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
            <div class="flex">
                <Icon name="lucide:info" class="h-5 w-5 text-blue-400" />
                <div class="ml-3">
                    <p class="text-sm text-blue-700 dark:text-blue-300">
                        {{ t("settings.defaultPages.note") }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom select styling to match other components */
.custom-select {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
}

.custom-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:global(.dark) .custom-select {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
}
</style>
