<template>
    <div class="analytics-view">
        <!-- Analytics Header -->
        <div class="analytics-header">
            <div class="header-info">
                <h3 class="analytics-title">{{ t('admin.analytics.esiLogs.title') }}</h3>
                <p class="analytics-description">{{ t('admin.analytics.esiLogs.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="() => refreshData()" class="action-button" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.analytics.refresh') }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="analytics-container">
            <div v-if="pending && !data" class="loading-container">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.analytics.loading') }}</p>
            </div>

            <div v-else-if="error" class="error-container">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.analytics.error') }}</p>
                <p style="font-size: 0.75rem; color: rgb(156, 163, 175); margin-top: 0.5rem;">{{ error }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.analytics.retry') }}
                </button>
            </div>

            <div v-else-if="data && data.success" class="analytics-content">
                <!-- Summary Statistics -->
                <div class="summary-section">
                    <h4 class="section-title">{{ t('admin.analytics.esiLogs.summary') }}</h4>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <Icon name="heroicons:chart-bar" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.totalRequests') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.totalRequests?.toLocaleString() || 0 }}
                                </div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon success-icon">
                                <Icon name="heroicons:check-circle" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.successfulRequests') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.successfulRequests?.toLocaleString() ||
                                    0 }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon error-icon">
                                <Icon name="heroicons:x-circle" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.errorRequests') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.errorRequests?.toLocaleString() || 0 }}
                                </div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <Icon name="heroicons:users" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.uniqueCharacters') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.uniqueCharacters?.toLocaleString() || 0
                                }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon rate-icon">
                                <Icon name="heroicons:chart-pie" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.successRate') }}</div>
                                <div class="stat-value">{{ (data?.data?.summary?.successRate || 0).toFixed(1) }}%</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon items-icon">
                                <Icon name="heroicons:squares-2x2" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.totalItemsFetched') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.totalItemsFetched?.toLocaleString() || 0
                                }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon new-items-icon">
                                <Icon name="heroicons:plus-circle" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.totalNewItems') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.totalNewItems?.toLocaleString() || 0
                                }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon efficiency-icon">
                                <Icon name="heroicons:chart-bar-square" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esiLogs.newItemsRate') }}</div>
                                <div class="stat-value">{{ (data?.data?.summary?.newItemsRate || 0).toFixed(1) }}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Top Data Types -->
                <div v-if="data?.data?.topDataTypes?.length > 0" class="top-data-types-section">
                    <h4 class="section-title">{{ t('admin.analytics.esiLogs.topDataTypes') }}</h4>
                    <div class="data-types-grid">
                        <div v-for="dataType in data.data.topDataTypes" :key="dataType.dataType" class="data-type-card">
                            <div class="data-type-header">
                                <h5 class="data-type-name">{{ getDataTypeName(dataType.dataType) }}</h5>
                                <div class="data-type-badge" :class="getSuccessRateClass(dataType.successRate)">
                                    {{ dataType.successRate.toFixed(1) }}%
                                </div>
                            </div>
                            <div class="data-type-stats">
                                <div class="stat-item">
                                    <span class="stat-label">{{ t('admin.analytics.esiLogs.totalCount') }}</span>
                                    <span class="stat-value">{{ dataType.count.toLocaleString() }}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">{{ t('admin.analytics.esiLogs.successCount') }}</span>
                                    <span class="stat-value success">{{ dataType.successCount.toLocaleString() }}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">{{ t('admin.analytics.esiLogs.errorCount') }}</span>
                                    <span class="stat-value error">{{ dataType.errorCount.toLocaleString() }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filters and Controls -->
                <div class="filters-section">
                    <h4 class="section-title">{{ t('admin.analytics.esiLogs.filters') }}</h4>
                    <div class="filters-grid">
                        <!-- Entries per page -->
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.showEntries') }}</label>
                            <select v-model="limit" class="filter-select">
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="250">250</option>
                            </select>
                        </div>

                        <!-- Data Type Filter -->
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.filterByType') }}</label>
                            <select v-model="selectedDataType" class="filter-select">
                                <option value="all">{{ t('admin.analytics.esiLogs.allTypes') }}</option>
                                <option v-for="dataType in data?.data?.filters?.dataTypes || []" :key="dataType"
                                    :value="dataType">
                                    {{ getDataTypeName(dataType) }}
                                </option>
                            </select>
                        </div>

                        <!-- Source Filter -->
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.filterBySource') }}</label>
                            <select v-model="selectedSource" class="filter-select">
                                <option value="all">{{ t('admin.analytics.esiLogs.allSources') }}</option>
                                <option v-for="source in data?.data?.filters?.sources || []" :key="source"
                                    :value="source">
                                    {{ getSourceName(source) }}
                                </option>
                            </select>
                        </div>

                        <!-- Status Filter -->
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.filterByStatus') }}</label>
                            <select v-model="selectedStatus" class="filter-select">
                                <option value="all">{{ t('admin.analytics.esiLogs.allStatuses') }}</option>
                                <option value="success">{{ t('admin.analytics.esiLogs.success') }}</option>
                                <option value="error">{{ t('admin.analytics.esiLogs.error') }}</option>
                            </select>
                        </div>

                        <!-- Character ID Filter -->
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.characterId') }}</label>
                            <input v-model="characterIdFilter" type="number"
                                :placeholder="t('admin.analytics.esiLogs.characterIdPlaceholder')"
                                class="filter-input" />
                        </div>
                    </div>
                </div>

                <!-- Results Summary -->
                <div v-if="data?.data?.pagination?.total > 0" class="results-summary">
                    {{ t('admin.analytics.esiLogs.showing', {
                        from: ((data.data.pagination.page - 1) * data.data.pagination.limit) + 1,
                        to: Math.min(data.data.pagination.page * data.data.pagination.limit, data.data.pagination.total),
                        total: data.data.pagination.total
                    }) }}
                </div>

                <!-- Logs Table -->
                <div class="logs-section">
                    <div class="logs-table-container">
                        <div v-if="pending" class="table-loading">
                            <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                            <p>{{ t('admin.analytics.loading') }}</p>
                        </div>
                        <div v-else-if="data?.data?.logs?.length === 0" class="empty-state">
                            <Icon name="heroicons:document-text" class="empty-icon" />
                            <p class="empty-text">{{ t('admin.analytics.esiLogs.noLogs') }}</p>
                        </div>
                        <div v-else class="logs-table">
                            <div class="table-header">
                                <div class="header-cell">{{ t('admin.analytics.esiLogs.timestamp') }}</div>
                                <div class="header-cell">{{ t('admin.analytics.esiLogs.character') }}</div>
                                <div class="header-cell">{{ t('admin.analytics.esiLogs.dataType') }}</div>
                                <div class="header-cell">{{ t('admin.analytics.esiLogs.source') }}</div>
                                <div class="header-cell">{{ t('admin.analytics.esiLogs.items') }}</div>
                                <div class="header-cell">{{ t('admin.analytics.esiLogs.newItems') }}</div>
                                <div class="header-cell">{{ t('admin.analytics.esiLogs.status') }}</div>
                            </div>
                            <div class="table-body">
                                <div v-for="log in data?.data?.logs || []" :key="log._id" class="table-row">
                                    <div class="table-cell timestamp-cell">
                                        {{ formatTimestamp(log.timestamp) }}
                                    </div>
                                    <div class="table-cell character-cell">
                                        <!-- Debug: Show the actual data structure -->
                                        <!-- <pre style="font-size: 0.6rem; color: #666; white-space: pre-wrap; max-width: 200px; overflow: hidden;">{{ JSON.stringify(log, null, 2) }}</pre> -->

                                        <div v-if="log.characterId && log.characterId.name" class="character-info">
                                            <Image type="character" :id="log.characterId.character_id"
                                                :alt="log.characterId.name" :size="24" class="character-image" />
                                            <NuxtLink :to="`/character/${log.characterId.character_id}`"
                                                class="character-name">
                                                {{ log.characterId.name }}
                                            </NuxtLink>
                                        </div>
                                        <div v-else class="character-unknown">
                                            {{ t('admin.analytics.esiLogs.unknownCharacter') }}
                                            <!-- Debug info -->
                                            <!-- <small style="display: block; font-size: 0.6rem; color: #666;">
                                                CharID: {{ log.characterId ? 'exists' : 'null' }} |
                                                Name: {{ log.characterId?.name || 'missing' }} |
                                                RawCharId: {{ typeof log.characterId === 'number' ? log.characterId : 'not number' }}
                                            </small> -->
                                        </div>
                                    </div>
                                    <div class="table-cell">
                                        <div class="data-type-badge">{{ getDataTypeName(log.dataType) }}</div>
                                    </div>
                                    <div class="table-cell">
                                        <div class="source-badge">{{ getSourceName(log.source) }}</div>
                                    </div>
                                    <div class="table-cell">
                                        {{ log.itemsReturned || 0 }}
                                    </div>
                                    <div class="table-cell">
                                        <span v-if="log.newItemsCount !== undefined && log.newItemsCount !== null"
                                            class="new-items-count" :class="{ 'has-new-items': log.newItemsCount > 0 }">
                                            {{ log.newItemsCount }}
                                        </span>
                                        <span v-else class="no-data">-</span>
                                    </div>
                                    <div class="table-cell">
                                        <div class="status-badge" :class="log.error ? 'error' : 'success'">
                                            <Icon :name="log.error ? 'heroicons:x-circle' : 'heroicons:check-circle'"
                                                class="status-icon" />
                                            {{ log.error ? t('admin.analytics.esiLogs.error') :
                                                t('admin.analytics.esiLogs.success') }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div v-if="data?.data?.pagination?.pages > 1" class="pagination">
                        <button @click="goToPage(1)" :disabled="page === 1" class="pagination-btn">
                            <Icon name="heroicons:chevron-double-left" class="pagination-icon" />
                        </button>
                        <button @click="goToPage(page - 1)" :disabled="page === 1" class="pagination-btn">
                            <Icon name="heroicons:chevron-left" class="pagination-icon" />
                        </button>

                        <div class="pagination-info">
                            {{ t('admin.analytics.esiLogs.pageInfo', { page: page, total: data.data.pagination.pages })
                            }}
                        </div>

                        <button @click="goToPage(page + 1)" :disabled="page >= data.data.pagination.pages"
                            class="pagination-btn">
                            <Icon name="heroicons:chevron-right" class="pagination-icon" />
                        </button>
                        <button @click="goToPage(data.data.pagination.pages)"
                            :disabled="page >= data.data.pagination.pages" class="pagination-btn">
                            <Icon name="heroicons:chevron-double-right" class="pagination-icon" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface ESILogsResponse {
    success: boolean;
    data: {
        logs: any[];
        pagination: {
            total: number;
            pages: number;
            page: number;
            limit: number;
        };
        filters: {
            dataTypes: string[];
            sources: string[];
        };
        summary: {
            totalRequests: number;
            successfulRequests: number;
            errorRequests: number;
            uniqueCharacters: number;
            totalItemsFetched: number;
            totalNewItems: number;
            successRate: number;
            newItemsRate: number;
        };
        topDataTypes: Array<{
            dataType: string;
            count: number;
            successCount: number;
            errorCount: number;
            successRate: number;
        }>;
        dateRange: {
            startDate: string;
            endDate: string;
        };
    };
}

const { t } = useI18n();

// Reactive state
const page = ref(1);
const limit = ref(50);
const selectedDataType = ref('all');
const selectedSource = ref('all');
const selectedStatus = ref('all');
const characterIdFilter = ref('');

// Debounced character ID filter
const debouncedCharacterId = ref('');

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    params.set('page', page.value.toString());
    params.set('limit', limit.value.toString());

    if (selectedDataType.value !== 'all') {
        params.set('dataType', selectedDataType.value);
    }
    if (selectedSource.value !== 'all') {
        params.set('source', selectedSource.value);
    }
    if (selectedStatus.value !== 'all') {
        params.set('status', selectedStatus.value);
    }
    if (debouncedCharacterId.value.trim()) {
        params.set('characterId', debouncedCharacterId.value.trim());
    }

    return `/api/admin/analytics/esilogs?${params.toString()}`;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData(
    'admin-esi-logs',
    () => $fetch<ESILogsResponse>(apiEndpoint.value),
    {
        lazy: true,
        server: false,
        watch: [apiEndpoint],
    }
);

// Debounced character ID search
const updateDebouncedCharacterId = debounce(() => {
    debouncedCharacterId.value = characterIdFilter.value;
    page.value = 1; // Reset to first page when filter changes
}, 500);

// Watch for filter changes
watch([limit, selectedDataType, selectedSource, selectedStatus], () => {
    page.value = 1; // Reset to first page when filters change
});

watch(characterIdFilter, () => {
    updateDebouncedCharacterId();
});

// Helper functions
const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
        hour12: false,
    }).format(new Date(timestamp));
};

const getDataTypeName = (dataType: string) => {
    const key = `admin.analytics.esiLogs.dataTypes.${dataType}`;
    const translated = t(key);
    return translated !== key ? translated : dataType.replace(/_/g, ' ');
};

const getSourceName = (source: string) => {
    const key = `admin.analytics.esiLogs.sources.${source}`;
    const translated = t(key);
    return translated !== key ? translated : source.replace(/([A-Z])/g, ' $1').trim();
};

const getSuccessRateClass = (rate: number) => {
    if (rate >= 95) return 'success-high';
    if (rate >= 80) return 'success-medium';
    return 'success-low';
};

const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= (data.value?.data?.pagination?.pages || 1)) {
        page.value = newPage;
    }
};

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
</script>

<style scoped>
.analytics-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem;
    gap: 1.5rem;
}

.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.header-info {
    flex: 1;
}

.analytics-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.analytics-description {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.header-actions {
    flex-shrink: 0;
}

.action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background-color: rgb(59, 130, 246);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.action-button:hover:not(:disabled) {
    background-color: rgb(37, 99, 235);
}

.action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

.analytics-container {
    flex: 1;
    overflow-y: auto;
}

.loading-container,
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
}

.loading-icon,
.error-icon {
    width: 2rem;
    height: 2rem;
    color: rgb(156, 163, 175);
}

.loading-text,
.error-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.error-retry {
    padding: 0.5rem 1rem;
    background-color: rgb(59, 130, 246);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
}

.analytics-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1rem;
}

/* Summary Statistics */
.summary-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    padding: 1rem;
}

.stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
}

.stat-icon.success-icon {
    background: rgba(34, 197, 94, 0.2);
}

.stat-icon.error-icon {
    background: rgba(239, 68, 68, 0.2);
}

.stat-icon.rate-icon {
    background: rgba(168, 85, 247, 0.2);
}

.stat-icon.items-icon {
    background: rgba(234, 179, 8, 0.2);
}

.stat-icon.new-items-icon {
    background: rgba(16, 185, 129, 0.2);
}

.stat-icon.efficiency-icon {
    background: rgba(139, 92, 246, 0.2);
}

.stat-icon .icon {
    width: 1.5rem;
    height: 1.5rem;
    color: rgb(96, 165, 250);
}

.success-icon .icon {
    color: rgb(34, 197, 94);
}

.error-icon .icon {
    color: rgb(239, 68, 68);
}

.rate-icon .icon {
    color: rgb(168, 85, 247);
}

.items-icon .icon {
    color: rgb(234, 179, 8);
}

.new-items-icon .icon {
    color: rgb(16, 185, 129);
}

.efficiency-icon .icon {
    color: rgb(139, 92, 246);
}

.stat-info {
    flex: 1;
}

.stat-label {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    margin-bottom: 0.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
}

/* Top Data Types */
.top-data-types-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.data-types-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.data-type-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    padding: 1rem;
}

.data-type-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.data-type-name {
    font-size: 1rem;
    font-weight: 600;
    color: white;
}

.data-type-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
}

.data-type-badge.success-high {
    background: rgb(34, 197, 94);
}

.data-type-badge.success-medium {
    background: rgb(234, 179, 8);
}

.data-type-badge.success-low {
    background: rgb(239, 68, 68);
}

.data-type-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-item .stat-label {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.stat-item .stat-value {
    font-size: 1rem;
    font-weight: 600;
    color: white;
}

.stat-item .stat-value.success {
    color: rgb(34, 197, 94);
}

.stat-item .stat-value.error {
    color: rgb(239, 68, 68);
}

/* Filters */
.filters-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-label {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    font-weight: 500;
}

.filter-select,
.filter-input {
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.filter-select:focus,
.filter-input:focus {
    outline: none;
    border-color: rgb(96, 165, 250);
}

.filter-input::placeholder {
    color: rgb(156, 163, 175);
}

/* Results */
.results-summary {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    margin-bottom: 1rem;
}

.logs-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    overflow: hidden;
}

.logs-table-container {
    min-height: 400px;
}

.table-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    color: rgb(156, 163, 175);
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
}

.empty-icon {
    width: 2rem;
    height: 2rem;
    color: rgb(156, 163, 175);
}

.empty-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.logs-table {
    width: 100%;
}

.table-header {
    display: grid;
    grid-template-columns: 150px 200px 150px 120px 80px 80px 120px;
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgb(55, 55, 55);
    font-weight: 600;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.table-body {
    max-height: 600px;
    overflow-y: auto;
}

.table-row {
    display: grid;
    grid-template-columns: 150px 200px 150px 120px 80px 80px 120px;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid rgba(55, 55, 55, 0.5);
    transition: background-color 0.15s ease-in-out;
}

.table-row:hover {
    background: rgba(0, 0, 0, 0.3);
}

.table-cell {
    font-size: 0.875rem;
    color: white;
    display: flex;
    align-items: center;
}

.timestamp-cell {
    font-family: monospace;
    font-size: 0.75rem;
}

.character-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.character-image {
    width: 24px;
    height: 24px;
    border-radius: 0.25rem;
    flex-shrink: 0;
}

.character-name {
    color: white;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.character-name:hover {
    color: rgb(96, 165, 250);
}

.character-unknown {
    color: rgb(156, 163, 175);
    font-style: italic;
}

.new-items-count {
    font-weight: 600;
    color: rgb(156, 163, 175);
}

.new-items-count.has-new-items {
    color: rgb(34, 197, 94);
}

.no-data {
    color: rgb(156, 163, 175);
    font-style: italic;
}

.data-type-badge,
.source-badge {
    padding: 0.25rem 0.5rem;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: rgb(96, 165, 250);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.status-badge.success {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: rgb(34, 197, 94);
}

.status-badge.error {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: rgb(239, 68, 68);
}

.status-icon {
    width: 0.875rem;
    height: 0.875rem;
}

/* Pagination */
.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-top: 1px solid rgb(55, 55, 55);
}

.pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.25rem;
    color: rgb(96, 165, 250);
    cursor: pointer;
    transition: all 0.15s ease-in-out;
}

.pagination-btn:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.3);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-icon {
    width: 1rem;
    height: 1rem;
}

.pagination-info {
    padding: 0 1rem;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .analytics-view {
        padding: 1rem;
    }

    .analytics-header {
        flex-direction: column;
        gap: 1rem;
    }

    .stats-grid {
        grid-template-columns: 1fr;
    }

    .data-types-grid {
        grid-template-columns: 1fr;
    }

    .filters-grid {
        grid-template-columns: 1fr;
    }

    .table-header,
    .table-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }

    .table-cell {
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(55, 55, 55, 0.3);
    }
}
</style>
