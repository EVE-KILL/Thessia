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
                <p class="error-detail">{{ error }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.analytics.retry') }}
                </button>
            </div>

            <div v-else-if="data && data.success" class="analytics-content">
                <!-- Summary Statistics -->
                <Card>
                    <template #header>
                        <h4 class="section-title">{{ t('admin.analytics.esiLogs.summary') }}</h4>
                    </template>
                    <div class="stats-grid">
                        <div v-for="stat in summaryStats" :key="stat.key" class="stat-card">
                            <div class="stat-icon" :class="stat.iconClass">
                                <Icon :name="stat.icon" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ stat.label }}</div>
                                <div class="stat-value">{{ stat.value }}</div>
                            </div>
                        </div>
                    </div>
                </Card>

                <!-- Top Data Types -->
                <Card v-if="data?.data?.topDataTypes?.length > 0">
                    <template #header>
                        <h4 class="section-title">{{ t('admin.analytics.esiLogs.topDataTypes') }}</h4>
                    </template>
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
                </Card>

                <!-- Filters and Controls -->
                <Card>
                    <template #header>
                        <h4 class="section-title">{{ t('admin.analytics.esiLogs.filters') }}</h4>
                    </template>
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.showEntries') }}</label>
                            <select v-model="limit" class="filter-select">
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="250">250</option>
                            </select>
                        </div>
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
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.filterByStatus') }}</label>
                            <select v-model="selectedStatus" class="filter-select">
                                <option value="all">{{ t('admin.analytics.esiLogs.allStatuses') }}</option>
                                <option value="success">{{ t('admin.analytics.esiLogs.success') }}</option>
                                <option value="error">{{ t('admin.analytics.esiLogs.error') }}</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">{{ t('admin.analytics.esiLogs.characterId') }}</label>
                            <input v-model="characterIdFilter" type="number"
                                :placeholder="t('admin.analytics.esiLogs.characterIdPlaceholder')"
                                class="filter-input" />
                        </div>
                    </div>
                </Card>

                <!-- Results Summary -->
                <div v-if="data?.data?.pagination?.total > 0" class="results-summary">
                    {{ t('admin.analytics.esiLogs.showing', {
                        from: ((data.data.pagination.page - 1) * data.data.pagination.limit) + 1,
                        to: Math.min(data.data.pagination.page * data.data.pagination.limit, data.data.pagination.total),
                        total: data.data.pagination.total
                    }) }}
                </div>

                <!-- Logs Table -->
                <Card class="logs-section">
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
                    <template #footer v-if="data?.data?.pagination?.pages > 1">
                        <div class="pagination">
                            <button @click="goToPage(1)" :disabled="page === 1" class="pagination-btn">
                                <Icon name="heroicons:chevron-double-left" class="pagination-icon" />
                            </button>
                            <button @click="goToPage(page - 1)" :disabled="page === 1" class="pagination-btn">
                                <Icon name="heroicons:chevron-left" class="pagination-icon" />
                            </button>
                            <div class="pagination-info">
                                {{ t('admin.analytics.esiLogs.pageInfo', {
                                    page: page, total: data.data.pagination.pages
                                })
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
                    </template>
                </Card>
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

// Summary statistics computed property
const summaryStats = computed(() => {
    if (!data.value?.data?.summary) return [];

    const summary = data.value.data.summary;
    return [
        {
            key: 'totalRequests',
            label: t('admin.analytics.esiLogs.totalRequests'),
            value: summary.totalRequests?.toLocaleString() || '0',
            icon: 'heroicons:chart-bar',
            iconClass: ''
        },
        {
            key: 'successfulRequests',
            label: t('admin.analytics.esiLogs.successfulRequests'),
            value: summary.successfulRequests?.toLocaleString() || '0',
            icon: 'heroicons:check-circle',
            iconClass: 'success-icon'
        },
        {
            key: 'errorRequests',
            label: t('admin.analytics.esiLogs.errorRequests'),
            value: summary.errorRequests?.toLocaleString() || '0',
            icon: 'heroicons:x-circle',
            iconClass: 'error-icon'
        },
        {
            key: 'uniqueCharacters',
            label: t('admin.analytics.esiLogs.uniqueCharacters'),
            value: summary.uniqueCharacters?.toLocaleString() || '0',
            icon: 'heroicons:users',
            iconClass: ''
        },
        {
            key: 'successRate',
            label: t('admin.analytics.esiLogs.successRate'),
            value: `${(summary.successRate || 0).toFixed(1)}%`,
            icon: 'heroicons:chart-pie',
            iconClass: 'rate-icon'
        },
        {
            key: 'totalItemsFetched',
            label: t('admin.analytics.esiLogs.totalItemsFetched'),
            value: summary.totalItemsFetched?.toLocaleString() || '0',
            icon: 'heroicons:squares-2x2',
            iconClass: 'items-icon'
        },
        {
            key: 'totalNewItems',
            label: t('admin.analytics.esiLogs.totalNewItems'),
            value: summary.totalNewItems?.toLocaleString() || '0',
            icon: 'heroicons:plus-circle',
            iconClass: 'new-items-icon'
        },
        {
            key: 'newItemsRate',
            label: t('admin.analytics.esiLogs.newItemsRate'),
            value: `${(summary.newItemsRate || 0).toFixed(1)}%`,
            icon: 'heroicons:chart-bar-square',
            iconClass: 'efficiency-icon'
        }
    ];
});

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
    padding: var(--space-6);
    gap: var(--space-6);
}

.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
}

.header-info {
    flex: 1;
}

.analytics-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.analytics-description {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}

.header-actions {
    flex-shrink: 0;
}

.action-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    background-color: var(--color-brand-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: background-color var(--duration-150) ease-in-out;
}

.action-button:hover:not(:disabled) {
    background-color: var(--color-brand-primary-hover);
}

.action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.action-icon {
    width: var(--space-4);
    height: var(--space-4);
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
    padding: var(--space-12);
    gap: var(--space-4);
}

.loading-icon,
.error-icon {
    width: var(--space-8);
    height: var(--space-8);
    color: var(--color-text-tertiary);
}

.loading-text,
.error-text {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}

.error-detail {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    margin-top: var(--space-2);
}

.error-retry {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-brand-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
}

.analytics-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
}

.section-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-4);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
}

.stat-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    padding: var(--space-4);
}

.stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-12);
    height: var(--space-12);
    background: var(--color-brand-primary-alpha);
    border-radius: var(--radius-lg);
}

.stat-icon.success-icon {
    background: var(--color-success-alpha);
}

.stat-icon.error-icon {
    background: var(--color-danger-alpha);
}

.stat-icon.rate-icon {
    background: var(--color-purple-alpha);
}

.stat-icon.items-icon {
    background: var(--color-warning-alpha);
}

.stat-icon.new-items-icon {
    background: var(--color-success-alpha);
}

.stat-icon.efficiency-icon {
    background: var(--color-purple-alpha);
}

.stat-icon .icon {
    width: var(--space-6);
    height: var(--space-6);
    color: var(--color-brand-primary-light);
}

.success-icon .icon {
    color: var(--color-success);
}

.error-icon .icon {
    color: var(--color-danger);
}

.rate-icon .icon {
    color: var(--color-purple-500);
}

.items-icon .icon {
    color: var(--color-warning);
}

.new-items-icon .icon {
    color: var(--color-success);
}

.efficiency-icon .icon {
    color: var(--color-purple-500);
}

.stat-info {
    flex: 1;
}

.stat-label {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-1);
}

.stat-value {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
}

.data-types-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-4);
}

.data-type-card {
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    padding: var(--space-4);
}

.data-type-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
}

.data-type-name {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
}

.data-type-badge {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-base);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--color-text-inverse);
}

.data-type-badge.success-high {
    background: var(--color-success);
}

.data-type-badge.success-medium {
    background: var(--color-warning);
}

.data-type-badge.success-low {
    background: var(--color-danger);
}

.data-type-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.stat-item .stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
}

.stat-item .stat-value {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
}

.stat-item .stat-value.success {
    color: var(--color-success);
}

.stat-item .stat-value.error {
    color: var(--color-danger);
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.filter-label {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    font-weight: var(--font-medium);
}

.filter-select,
.filter-input {
    padding: var(--space-2);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.filter-select:focus,
.filter-input:focus {
    outline: none;
    border-color: var(--color-border-focus);
}

.filter-input::placeholder {
    color: var(--color-text-tertiary);
}

.results-summary {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-4);
}

.logs-table-container {
    min-height: 400px;
}

.table-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    gap: var(--space-4);
    color: var(--color-text-tertiary);
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    gap: var(--space-4);
}

.empty-icon {
    width: var(--space-8);
    height: var(--space-8);
    color: var(--color-text-tertiary);
}

.empty-text {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}

.logs-table {
    width: 100%;
}

.table-header {
    display: grid;
    grid-template-columns: 150px 200px 150px 120px 80px 80px 120px;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-surface-alpha-medium);
    border-bottom: 1px solid var(--color-border-light);
    font-weight: var(--font-semibold);
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
}

.table-body {
    max-height: 600px;
    overflow-y: auto;
}

.table-row {
    display: grid;
    grid-template-columns: 150px 200px 150px 120px 80px 80px 120px;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border-light-alpha);
    transition: background-color var(--duration-150) ease-in-out;
}

.table-row:hover {
    background: var(--color-surface-alpha);
}

.table-cell {
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
}

.timestamp-cell {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
}

.character-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.character-image {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-base);
    flex-shrink: 0;
}

.character-name {
    color: var(--color-text-primary);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.character-name:hover {
    color: var(--color-brand-primary-light);
}

.character-unknown {
    color: var(--color-text-tertiary);
    font-style: italic;
}

.new-items-count {
    font-weight: var(--font-semibold);
    color: var(--color-text-tertiary);
}

.new-items-count.has-new-items {
    color: var(--color-success);
}

.no-data {
    color: var(--color-text-tertiary);
    font-style: italic;
}

.data-type-badge,
.source-badge {
    padding: var(--space-1) var(--space-2);
    background: var(--color-brand-primary-alpha);
    border: 1px solid var(--color-brand-primary-alpha-border);
    border-radius: var(--radius-base);
    font-size: var(--text-xs);
    color: var(--color-brand-primary-light);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-badge {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-base);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
}

.status-badge.success {
    background: var(--color-success-alpha);
    border: 1px solid var(--color-success-alpha-border);
    color: var(--color-success);
}

.status-badge.error {
    background: var(--color-danger-alpha);
    border: 1px solid var(--color-danger-alpha-border);
    color: var(--color-danger);
}

.status-icon {
    width: var(--space-3-5);
    height: var(--space-3-5);
}

.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-surface-alpha);
    border-top: 1px solid var(--color-border-light);
}

.pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-8);
    height: var(--space-8);
    background: var(--color-brand-primary-alpha);
    border: 1px solid var(--color-brand-primary-alpha-border);
    border-radius: var(--radius-base);
    color: var(--color-brand-primary-light);
    cursor: pointer;
    transition: all var(--duration-150) ease-in-out;
}

.pagination-btn:hover:not(:disabled) {
    background: var(--color-brand-primary-hover-alpha);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-icon {
    width: var(--space-4);
    height: var(--space-4);
}

.pagination-info {
    padding: 0 var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .analytics-view {
        padding: var(--space-4);
    }

    .analytics-header {
        flex-direction: column;
        gap: var(--space-4);
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
        gap: var(--space-2);
    }

    .table-cell {
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-border-light-alpha);
    }
}
</style>
