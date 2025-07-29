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
const esiLogsLimit = ref(50);
const esiLogsPage = ref(1);
const esiLogsPagination = ref({
    total: 0,
    pages: 0,
    page: 1,
    limit: 50
});

// Expanded rows state
const expandedRows = ref<Set<string>>(new Set());

// Filter state
const selectedDataType = ref('all');
const selectedSource = ref('all');
const selectedStatus = ref('all');
const availableDataTypes = ref<string[]>([]);
const availableSources = ref<string[]>([]);

// Dropdown options for log limit
const logLimitOptions = [
    { label: '10 entries', value: 10 },
    { label: '25 entries', value: 25 },
    { label: '50 entries', value: 50 },
    { label: '100 entries', value: 100 },
    { label: '250 entries', value: 250 }
];

// Status options for filtering
const statusOptions = [
    { label: t('settings.esiLogs.allStatuses', 'All Statuses'), value: 'all' },
    { label: t('settings.esiLogs.success', 'Success'), value: 'success' },
    { label: t('settings.esiLogs.error', 'Error'), value: 'error' }
];

// Watch for limit/filter changes and refetch data
watch([esiLogsLimit, selectedDataType, selectedSource, selectedStatus], () => {
    esiLogsPage.value = 1; // Reset to first page when filters change
    fetchEsiLogs();
});

// Watch for page changes
watch(esiLogsPage, () => {
    fetchEsiLogs();
});

// Compact table columns configuration
const esiLogsColumns = [
    {
        id: 'expand',
        header: '',
        width: '48px',
        cellClass: 'text-center'
    },
    {
        id: 'timestamp',
        header: () => t('settings.esiLogs.timestamp', 'Timestamp'),
        width: '20%'
    },
    {
        id: 'dataType',
        header: () => t('settings.esiLogs.dataType', 'Data Type'),
        width: '20%'
    },
    {
        id: 'summary',
        header: () => t('settings.esiLogs.summary', 'Summary'),
        width: '40%'
    },
    {
        id: 'status',
        header: () => t('settings.esiLogs.status', 'Status'),
        width: '20%'
    }
];

// Toggle row expansion
const toggleRowExpansion = (rowId: string) => {
    if (expandedRows.value.has(rowId)) {
        expandedRows.value.delete(rowId);
    } else {
        expandedRows.value.add(rowId);
    }
};

// Check if row is expanded
const isRowExpanded = (rowId: string) => {
    return expandedRows.value.has(rowId);
};

// Get row ID for expansion tracking
const getRowId = (item: any) => {
    return `${item.timestamp}_${item.endpoint}_${item.characterId}`;
};

// Fetch ESI logs from the API with filters
const fetchEsiLogs = async () => {
    if (!auth.user?.value) return;

    esiLogsLoading.value = true;
    try {
        const params = new URLSearchParams({
            limit: esiLogsLimit.value.toString(),
            page: esiLogsPage.value.toString()
        });

        if (selectedDataType.value !== 'all') {
            params.append('dataType', selectedDataType.value);
        }
        if (selectedSource.value !== 'all') {
            params.append('source', selectedSource.value);
        }
        if (selectedStatus.value !== 'all') {
            params.append('status', selectedStatus.value);
        }

        const { data } = await $fetch(`/api/user/esilogs?${params.toString()}`);
        if (data) {
            esiLogs.value = data.logs || [];
            esiLogsPagination.value = data.pagination || {};

            // Update available filter options
            if (data.filters) {
                availableDataTypes.value = data.filters.dataTypes || [];
                availableSources.value = data.filters.sources || [];
            }
        }
    } catch (error) {
        console.error('Failed to fetch ESI logs:', error);
        esiLogs.value = [];
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

// Get friendly data type name
const getDataTypeName = (dataType: string) => {
    const key = `settings.esiLogs.dataTypes.${dataType}`;
    const translated = t(key);
    return translated !== key ? translated : dataType.replace(/_/g, ' ');
};

// Get friendly source name
const getSourceName = (source: string) => {
    const key = `settings.esiLogs.sources.${source}`;
    const translated = t(key);
    return translated !== key ? translated : source.replace(/([A-Z])/g, ' $1').trim();
};

// Handle limit change using standard select
const handleLimitChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const newLimit = parseInt(target.value, 10);
    if (!isNaN(newLimit)) {
        esiLogsLimit.value = newLimit;
    }
};

// Handle filter changes
const handleDataTypeChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    selectedDataType.value = target.value;
};

const handleSourceChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    selectedSource.value = target.value;
};

const handleStatusChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    selectedStatus.value = target.value;
};

// Pagination methods
const goToPage = (page: number) => {
    if (page >= 1 && page <= esiLogsPagination.value.pages) {
        esiLogsPage.value = page;
    }
};

const goToNextPage = () => {
    if (esiLogsPage.value < esiLogsPagination.value.pages) {
        esiLogsPage.value++;
    }
};

const goToPrevPage = () => {
    if (esiLogsPage.value > 1) {
        esiLogsPage.value--;
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
            <!-- Header -->
            <div class="mb-6">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ t('settings.esiLogs.title', 'ESI API Logs') }}
                </h3>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {{ t('settings.esiLogs.description') }}
                </p>
            </div>

            <!-- Filters and Controls -->
            <div class="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <!-- Entries per page -->
                <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t('settings.esiLogs.showEntries', 'Show:') }}
                    </label>
                    <select :value="esiLogsLimit" @change="handleLimitChange"
                        class="custom-select w-32 appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                        <option v-for="option in logLimitOptions" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                </div>

                <!-- Data Type Filter -->
                <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t('settings.esiLogs.filterByType', 'Type:') }}
                    </label>
                    <select :value="selectedDataType" @change="handleDataTypeChange"
                        class="custom-select w-40 appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                        <option value="all">{{ t('settings.esiLogs.allTypes', 'All Types') }}</option>
                        <option v-for="dataType in availableDataTypes" :key="dataType" :value="dataType">
                            {{ getDataTypeName(dataType) }}
                        </option>
                    </select>
                </div>

                <!-- Source Filter -->
                <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t('settings.esiLogs.filterBySource', 'Source:') }}
                    </label>
                    <select :value="selectedSource" @change="handleSourceChange"
                        class="custom-select w-40 appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                        <option value="all">{{ t('settings.esiLogs.allSources', 'All Sources') }}</option>
                        <option v-for="source in availableSources" :key="source" :value="source">
                            {{ getSourceName(source) }}
                        </option>
                    </select>
                </div>

                <!-- Status Filter -->
                <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-600 dark:text-gray-400">
                        {{ t('settings.esiLogs.filterByStatus', 'Status:') }}
                    </label>
                    <select :value="selectedStatus" @change="handleStatusChange"
                        class="custom-select w-32 appearance-none rounded-md border border-gray-300 dark:border-gray-700 pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Results Summary -->
            <div v-if="!esiLogsLoading && esiLogsPagination.total > 0"
                class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {{ t('settings.esiLogs.showing', 'Showing {from} to {to} of {total} entries', {
                    from: ((esiLogsPagination.page - 1) * esiLogsPagination.limit) + 1,
                    to: Math.min(esiLogsPagination.page * esiLogsPagination.limit, esiLogsPagination.total),
                    total: esiLogsPagination.total
                }) }}
            </div>

            <!-- Table Component with Improved Readability -->
            <Table :columns="esiLogsColumns" :items="esiLogs" :loading="esiLogsLoading"
                :empty-text="t('settings.esiLogs.noLogs', 'No ESI logs found.')" :skeleton-count="5" density="compact"
                class="mb-4">

                <!-- Expand button column -->
                <template #cell-expand="{ item }">
                    <UButton v-if="(item as any).fetchedData && (item as any).fetchedData.length > 0" size="xs"
                        variant="ghost"
                        :icon="isRowExpanded(getRowId(item)) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                        @click="toggleRowExpansion(getRowId(item))" class="p-1" />
                </template>

                <!-- Timestamp column -->
                <template #cell-timestamp="{ item }">
                    <span class="text-sm text-gray-900 dark:text-white font-medium">
                        {{ formatTimestamp((item as any).timestamp) }}
                    </span>
                </template>

                <!-- Data Type column -->
                <template #cell-dataType="{ item }">
                    <UBadge color="blue" variant="soft" size="md">
                        {{ getDataTypeName((item as any).dataType) }}
                    </UBadge>
                </template>

                <!-- Summary column - compact info with popovers -->
                <template #cell-summary="{ item }">
                    <UPopover mode="hover" :popper="{ placement: 'top' }">
                        <div class="space-y-2 cursor-help">
                            <!-- Items returned + source -->
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-gray-900 dark:text-white">
                                    {{ (item as any).itemsReturned || 0 }} items
                                </span>
                                <UBadge color="gray" variant="soft" size="sm">
                                    {{ getSourceName((item as any).source) }}
                                </UBadge>
                                <span v-if="(item as any).killmailDelay"
                                    class="text-sm text-orange-600 dark:text-orange-400 font-medium">
                                    {{ (item as any).killmailDelay }}h delay
                                </span>
                            </div>

                            <!-- Endpoint -->
                            <div class="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">
                                {{ (item as any).endpoint }}
                            </div>

                            <!-- Error message if present -->
                            <div v-if="(item as any).error && (item as any).errorMessage"
                                class="text-sm text-red-600 dark:text-red-400 truncate">
                                {{ (item as any).errorMessage }}
                            </div>
                        </div>
                        <template #content>
                            <div class="p-3 max-w-xs">
                                <div class="font-medium text-gray-900 dark:text-white mb-2">
                                    {{ t('settings.esiLogs.fetchedItems', 'Fetched Items') }}
                                </div>
                                <div v-if="(item as any).fetchedData && (item as any).fetchedData.length > 0"
                                    class="space-y-1">
                                    <div v-for="(data, idx) in (item as any).fetchedData.slice(0, 5)" :key="idx"
                                        class="text-sm text-gray-700 dark:text-gray-300">
                                        <span v-if="(item as any).dataType?.includes('killmail')" class="font-mono">
                                            KM {{ data.id }}
                                        </span>
                                        <span v-else class="font-mono">{{ data.id }}</span>
                                    </div>
                                    <div v-if="(item as any).fetchedData.length > 5"
                                        class="text-xs text-gray-500 dark:text-gray-400">
                                        ... and {{ (item as any).fetchedData.length - 5 }} more
                                    </div>
                                </div>
                                <div v-else class="text-sm text-gray-500 dark:text-gray-400">
                                    {{ t('settings.esiLogs.noItemsTracked', 'No items tracked') }}
                                </div>
                            </div>
                        </template>
                    </UPopover>
                </template>

                <!-- Status column -->
                <template #cell-status="{ item }">
                    <UBadge :color="(item as any).error ? 'red' : 'green'" variant="soft" size="md">
                        <Icon :name="(item as any).error ? 'lucide:x-circle' : 'lucide:check-circle'"
                            class="w-4 h-4 mr-1" />
                        {{ (item as any).error ? t('settings.esiLogs.error', 'Error') : t('settings.esiLogs.success',
                            'Success') }}
                    </UBadge>
                </template>
            </Table>

            <!-- Expanded Rows Content (Outside of Table) -->
            <div v-for="(item, index) in esiLogs" :key="index" class="mb-4">
                <div v-if="isRowExpanded(getRowId(item))"
                    class="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div class="space-y-4">
                        <h4 class="text-lg font-medium text-gray-900 dark:text-white">
                            {{ t('settings.esiLogs.fetchedData', 'Fetched Data') }}
                        </h4>

                        <!-- Killmail data with links -->
                        <div v-if="item.dataType?.includes('killmail') && item.fetchedData"
                            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div v-for="(data, dataIndex) in item.fetchedData" :key="dataIndex"
                                class="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="font-medium text-gray-900 dark:text-white">
                                            Killmail {{ data.id }}
                                        </span>
                                        <NuxtLink :to="`/killmail/${data.id}/`"
                                            class="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-medium">
                                            <Icon name="lucide:external-link" class="w-4 h-4 mr-1 inline" />
                                            View
                                        </NuxtLink>
                                    </div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        <div class="font-mono">Hash: {{ data.hash?.substring(0, 16) }}...</div>
                                        <div v-if="data.additionalInfo?.killmail_time">
                                            Time: {{ new Date(data.additionalInfo.killmail_time).toLocaleString() }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Other data types -->
                        <div v-else-if="item.fetchedData" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div v-for="(data, dataIndex) in item.fetchedData" :key="dataIndex"
                                class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                <div class="font-mono text-gray-900 dark:text-white">
                                    {{ data.id }}
                                </div>
                                <div v-if="data.hash" class="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                    {{ data.hash.substring(0, 12) }}...
                                </div>
                            </div>
                        </div>

                        <!-- No data message -->
                        <div v-else class="text-gray-500 dark:text-gray-400">
                            {{ t('settings.esiLogs.noFetchedData', 'No data tracked') }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="esiLogsPagination.pages > 1"
                class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    {{ t('settings.esiLogs.pageOf', 'Page {current} of {total}', {
                        current: esiLogsPagination.page,
                        total: esiLogsPagination.pages
                    }) }}
                </div>

                <div class="flex items-center space-x-2">
                    <UButton size="sm" variant="outline" :disabled="esiLogsPagination.page <= 1" @click="goToPrevPage">
                        <Icon name="lucide:chevron-left" class="w-4 h-4" />
                        Previous
                    </UButton>

                    <!-- Page numbers (show up to 5 pages around current) -->
                    <template v-for="page in Math.min(5, esiLogsPagination.pages)" :key="page">
                        <UButton
                            v-if="Math.abs(page - esiLogsPagination.page) <= 2 || page === 1 || page === esiLogsPagination.pages"
                            size="sm" :variant="page === esiLogsPagination.page ? 'solid' : 'outline'"
                            @click="goToPage(page)">
                            {{ page }}
                        </UButton>
                    </template>

                    <UButton size="sm" variant="outline" :disabled="esiLogsPagination.page >= esiLogsPagination.pages"
                        @click="goToNextPage">
                        Next
                        <Icon name="lucide:chevron-right" class="w-4 h-4" />
                    </UButton>
                </div>
            </div>
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

.custom-select {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
}

/* Better spacing for filter controls */
.filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

/* Improved table cell alignment */
.table-cell-center {
    text-align: center;
}

/* Tooltip positioning */
.group:hover .group-hover\:visible {
    z-index: 50;
}
</style>
