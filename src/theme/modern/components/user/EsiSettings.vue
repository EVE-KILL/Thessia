<script setup lang="ts">
import Table from '~/src/theme/modern/components/common/Table.vue';

interface Props {
    profileData?: any;
    userSettings: { killmailDelay: number };
    isUpdatingSettings?: boolean;
    settingsSuccess?: string;
    settingsError?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    updateSettings: [];
    'update:userSettings': [value: { killmailDelay: number }];
}>();

// Composables
const { t } = useI18n();
const auth = useAuth();

// Format expiration date
const formattedExpirationDate = computed(() => {
    if (!props.profileData?.user?.dateExpiration) return "";

    const date = new Date(props.profileData.user.dateExpiration);
    return `${new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
        hour12: false,
    }).format(date)} UTC`;
});

// Computed property for delay text
const delayText = computed(() => {
    const delay = props.userSettings.killmailDelay;
    if (delay === 0) {
        return t('killmail.delay.instant', 'Instant');
    } else if (delay === 1) {
        return t('killmail.delay.oneHour', '1h');
    } else {
        return `${delay}h`;
    }
});

// Handle killmail delay updates with proper typing
const updateKillmailDelay = (...args: unknown[]) => {
    const value = args[0] as number;
    emit('update:userSettings', { ...props.userSettings, killmailDelay: value });
};

// ESI Logs state
const esiLogs = ref<any[]>([]);
const esiLogsLoading = ref(false);
const esiLogsLimit = ref(10);

// Dropdown options for log limit
const logLimitOptions = [
    { label: '10 entries', value: 10 },
    { label: '50 entries', value: 50 },
    { label: '100 entries', value: 100 },
    { label: '1000 entries', value: 1000 }
];

// Generate placeholder data for now
const generatePlaceholderLogs = (count: number) => {
    const placeholderLogs = [];
    const endpoints = [
        '/characters/{character_id}/killmails/recent/',
        '/corporations/{corporation_id}/killmails/recent/',
        '/characters/{character_id}/',
        '/characters/{character_id}/portrait/',
        '/characters/{character_id}/corporationhistory/'
    ];

    for (let i = 0; i < count; i++) {
        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const randomDelay = Math.floor(Math.random() * 2000) + 50; // 50-2050ms
        const timestamp = new Date(Date.now() - (i * 60000)).toISOString(); // Each entry 1 minute apart

        placeholderLogs.push({
            _id: `placeholder_${i}`,
            endpoint: randomEndpoint,
            method: 'GET',
            delay: randomDelay,
            timestamp
        });
    }
    return placeholderLogs;
};

// Watch for limit changes and refetch data
watch(esiLogsLimit, () => {
    fetchEsiLogs();
});

// Table columns configuration
const esiLogsColumns = [
    {
        id: 'timestamp',
        header: () => t('settings.esiLogs.timestamp', 'Timestamp'),
        width: '25%'
    },
    {
        id: 'endpoint',
        header: () => t('settings.esiLogs.endpoint', 'Endpoint'),
        width: '40%',
        cellClass: 'font-mono text-sm'
    },
    {
        id: 'method',
        header: () => t('settings.esiLogs.method', 'Method'),
        width: '15%'
    },
    {
        id: 'delay',
        header: () => t('settings.esiLogs.delay', 'Delay'),
        width: '20%'
    }
];

// Fetch ESI logs - now fetches last X items from API
const fetchEsiLogs = async () => {
    if (!auth.user?.value) return;

    esiLogsLoading.value = true;
    try {
        const { data } = await $fetch(`/api/user/esilogs?limit=${esiLogsLimit.value}`);
        if (data) {
            esiLogs.value = data.logs || [];
        }
    } catch (error) {
        console.error('Failed to fetch ESI logs:', error);
        // Fallback to placeholder data for development
        esiLogs.value = generatePlaceholderLogs(esiLogsLimit.value);
    } finally {
        esiLogsLoading.value = false;
    }
};

// Format timestamp for display
const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
        hour12: false,
    }).format(new Date(timestamp));
};

// Handle limit change using standard select
const handleLimitChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const newLimit = parseInt(target.value, 10);
    if (!isNaN(newLimit)) {
        esiLogsLimit.value = newLimit;
        fetchEsiLogs();
    }
};

// Load ESI logs on mount
onMounted(() => {
    fetchEsiLogs();
});

// Permission descriptions
const permissionDescriptions: Record<string, string> = {
    publicData: t("permissions.publicData", "Public character info"),
    "esi-killmails.read_killmails.v1": t("permissions.readKillmails", "Personal killmails"),
    "esi-killmails.read_corporation_killmails.v1": t("permissions.readCorporationKillmails", "Corporation killmails"),
};

// Get more user-friendly permission description
const getPermissionDescription = (scope: string) => {
    return permissionDescriptions[scope] || scope;
};

// Handle re-authentication with current scopes
const handleReauthenticate = async () => {
    const currentScopes = props.profileData?.user?.scopes || [];
    const currentDelay = props.userSettings.killmailDelay || 0;
    auth.login("/user/settings", Array.isArray(currentScopes) ? currentScopes : [currentScopes], currentDelay);
};

// Handle re-authentication with default scopes
const handleDefaultScopes = async () => {
    const currentDelay = props.userSettings.killmailDelay || 0;
    auth.login("/user/settings", undefined, currentDelay);
};

// Handle customized scope selection
const handleCustomizeScopes = () => {
    const currentDelay = props.userSettings.killmailDelay || 0;
    const delayParam = currentDelay > 0 ? `&delay=${currentDelay}` : '';
    navigateTo(`/user/login?customize=true&redirect=/user/settings${delayParam}`);
};

// Define all possible permission scopes
const allPermissionScopes = [
    "publicData",
    "esi-killmails.read_killmails.v1",
    "esi-killmails.read_corporation_killmails.v1",
];

// Check if user has a particular scope
const hasScope = (scope: string) => {
    if (!props.profileData?.user?.scopes) return false;
    const scopesArray = props.profileData.user.scopes;
    const scopesString = Array.isArray(scopesArray) ? scopesArray[0] : String(scopesArray);
    return scopesString?.includes(scope) ?? false;
};

// Handle save with toast notifications
const handleSaveSettings = async () => {
    emit('updateSettings');
};
</script>

<template>
    <div class="space-y-6 p-6">
        <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ t("settings.esi.title", "ESI/OAuth Settings") }}
            </h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ t("settings.esi.description", "Manage authentication and killmail settings") }}
            </p>
        </div>

        <!-- Compact Layout: Two Columns -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left Column: Authentication & Killmail Delay -->
            <div class="space-y-4">
                <!-- Authentication Status -->
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-medium text-gray-900 dark:text-white">{{ t("settings.esi.authStatus",
                            "Authentication") }}</h4>
                        <UBadge color="success" variant="soft" size="sm">
                            <Icon name="lucide:check-circle" class="w-3 h-3 mr-1" />
                            {{ t("settings.esi.authenticated", "Active") }}
                        </UBadge>
                    </div>

                    <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {{ t("settings.esi.tokenExpires", "Expires:") }} {{ formattedExpirationDate }}
                    </div>

                    <!-- Compact Re-auth buttons -->
                    <div class="flex flex-wrap gap-2">
                        <UTooltip text="Re-authenticate with your currently granted permissions">
                            <UButton size="sm" variant="outline" @click="handleReauthenticate">
                                {{ t("settings.esi.currentScopes", "Keep Current Permissions") }}
                            </UButton>
                        </UTooltip>
                        <UTooltip text="Re-authenticate with all recommended default permissions">
                            <UButton size="sm" variant="outline" @click="handleDefaultScopes">
                                {{ t("settings.esi.defaultScopes", "Use Default Permissions") }}
                            </UButton>
                        </UTooltip>
                        <UTooltip text="Manually select which permissions to grant">
                            <UButton size="sm" variant="outline" @click="handleCustomizeScopes">
                                {{ t("settings.esi.customizeScopes", "Choose Permissions") }}
                            </UButton>
                        </UTooltip>
                    </div>
                </div>

                <!-- Killmail Delay Section -->
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                        {{ t('killmail.delay.label', 'Killmail Delay') }}
                    </h4>

                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {{ t('killmail.delay.description', 'Delay killmails to protect operations') }}
                    </p>

                    <div class="space-y-3">
                        <USlider :model-value="userSettings.killmailDelay" @update:model-value="updateKillmailDelay"
                            :min="0" :max="72" :step="1" class="w-full" />

                        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>0h</span>
                            <span class="font-medium text-gray-700 dark:text-gray-300">{{ delayText }}</span>
                            <span>72h</span>
                        </div>

                        <div class="text-xs text-blue-600 dark:text-blue-400">
                            <NuxtLink to="/faq#killmail-delays" class="hover:underline">
                                {{ t('killmail.delay.learnMore', 'Learn more') }}
                            </NuxtLink>
                        </div>
                    </div>
                </div>

                <!-- Save Button -->
                <div class="flex justify-end">
                    <UButton color="primary" :loading="isUpdatingSettings" :disabled="isUpdatingSettings"
                        @click="handleSaveSettings">
                        {{ t("common.save", "Save Changes") }}
                    </UButton>
                </div>
            </div>

            <!-- Right Column: Permissions -->
            <div class="space-y-4">
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 class="font-medium text-gray-900 dark:text-white mb-3">
                        {{ t("settings.esi.currentPermissions", "Current Permissions") }}
                    </h4>

                    <div class="space-y-2">
                        <div v-for="scope in allPermissionScopes" :key="scope"
                            class="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {{ getPermissionDescription(scope) }}
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                                    {{ scope }}
                                </div>
                            </div>
                            <Icon :name="hasScope(scope) ? 'lucide:check' : 'lucide:x'" :class="[
                                'h-4 w-4 ml-2 flex-shrink-0',
                                hasScope(scope) ? 'text-green-500' : 'text-red-500'
                            ]" />
                        </div>
                    </div>

                    <div
                        class="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                        {{ t('settings.permissionsNote', 'Re-authenticate to modify permissions') }}
                    </div>
                </div>
            </div>
        </div>

        <!-- ESI Logs Section -->
        <div
            class="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                        {{ t('settings.esiLogs.title', 'ESI API Logs') }}
                    </h3>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {{ t('settings.esiLogs.description') }}
                    </p>
                </div>

                <!-- Limit Selector -->
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t('settings.esiLogs.showEntries', 'Show:') }}
                    </span>
                    <div class="relative w-32">
                        <select :value="esiLogsLimit" @change="handleLimitChange"
                            class="custom-select w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium shadow-sm">
                            <option v-for="option in logLimitOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table Component -->
            <Table :columns="esiLogsColumns" :items="esiLogs" :loading="esiLogsLoading"
                :empty-text="t('settings.esiLogs.noLogs', 'No ESI logs found.')" :skeleton-count="5" density="compact"
                class="mt-4">
                <!-- Timestamp column -->
                <template #cell-timestamp="{ item }">
                    <span class="text-sm text-gray-900 dark:text-white">
                        {{ formatTimestamp((item as any).timestamp) }}
                    </span>
                </template>

                <!-- Endpoint column -->
                <template #cell-endpoint="{ item }">
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-300">
                        {{ (item as any).endpoint }}
                    </span>
                </template>

                <!-- Method column -->
                <template #cell-method="{ item }">
                    <UBadge
                        :color="(item as any).method === 'GET' ? 'success' : (item as any).method === 'POST' ? 'primary' : 'neutral'"
                        variant="soft" size="sm">
                        {{ (item as any).method }}
                    </UBadge>
                </template>

                <!-- Delay column -->
                <template #cell-delay="{ item }">
                    <span class="text-sm text-gray-900 dark:text-white">
                        {{ (item as any).delay }}ms
                    </span>
                </template>
            </Table>
        </div>
    </div>
</template>

<style scoped>
/* Custom select styling to match KillList component */
.custom-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
