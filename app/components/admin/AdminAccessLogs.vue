<template>
    <div class="access-logs-container">
        <!-- Header with filters -->
        <div class="access-logs-header">
            <div class="header-content">
                <div class="header-info">
                    <h2 class="header-title">{{ t('admin.accessLogs.title') }}</h2>
                    <p class="header-description">{{ t('admin.accessLogs.description') }}</p>
                </div>
                <div class="header-actions">
                    <button @click="handleRefresh" class="action-button" :disabled="pending">
                        <Icon name="lucide:refresh-cw" class="action-icon" :class="{ 'animate-spin': pending }" />
                        {{ t('admin.actions.refresh') }}
                    </button>
                </div>
            </div>

            <!-- Filters -->
            <div class="filters-section">
                <div class="filters-grid">
                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.accessLogs.search') }}</label>
                        <input v-model="filters.search" type="text" class="filter-input"
                            :placeholder="t('admin.accessLogs.searchPlaceholder')" />
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.accessLogs.method') }}</label>
                        <select v-model="filters.method" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allMethods') }}</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                            <option value="OPTIONS">OPTIONS</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.accessLogs.statusCode') }}</label>
                        <select v-model="filters.statusCode" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allStatus') }}</option>
                            <option value="200">200 (OK)</option>
                            <option value="201">201 (Created)</option>
                            <option value="400">400 (Bad Request)</option>
                            <option value="401">401 (Unauthorized)</option>
                            <option value="403">403 (Forbidden)</option>
                            <option value="404">404 (Not Found)</option>
                            <option value="500">500 (Server Error)</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.accessLogs.apiFilter') }}</label>
                        <select v-model="filters.apiFilter" class="filter-select">
                            <option value="exclude">{{ t('admin.accessLogs.excludeApi') }}</option>
                            <option value="include">{{ t('admin.accessLogs.includeApi') }}</option>
                            <option value="only">{{ t('admin.accessLogs.onlyApi') }}</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.accessLogs.botFilter') }}</label>
                        <select v-model="filters.isBot" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allTraffic') }}</option>
                            <option value="true">{{ t('admin.accessLogs.botTraffic') }}</option>
                            <option value="false">{{ t('admin.accessLogs.humanTraffic') }}</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.accessLogs.systemUrls') }}</label>
                        <select v-model="filters.hideUnderscoreUrls" class="filter-select">
                            <option value="true">{{ t('admin.accessLogs.hideSystemUrls') }}</option>
                            <option value="false">{{ t('admin.accessLogs.showSystemUrls') }}</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.accessLogs.logTypeFilter') }}</label>
                        <select v-model="filters.logType" class="filter-select">
                            <option value="">{{ t('admin.accessLogs.allLogTypes') }}</option>
                            <option value="server">{{ t('admin.accessLogs.serverLogs') }}</option>
                            <option value="client">{{ t('admin.accessLogs.clientLogs') }}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Access Logs Table -->
        <div class="access-logs-table">
            <Table :columns="tableColumns" :items="accessLogs" :loading="pending && initialLoad" :skeleton-count="10"
                :empty-text="t('admin.accessLogs.empty')" empty-icon="lucide:file-text" :row-class="getRowClass">
                <!-- Custom cell content -->
                <template #cell-timestamp="{ item }">
                    <div class="timestamp-cell">
                        <div class="timestamp-date">{{ formatDate((item as AccessLog).timestamp) }}</div>
                        <div class="timestamp-time">{{ formatTime((item as AccessLog).timestamp) }}</div>
                    </div>
                </template>

                <template #cell-method="{ item }">
                    <span class="method-badge" :class="getMethodClass((item as AccessLog).method)">
                        {{ (item as AccessLog).method }}
                    </span>
                </template>

                <template #cell-statusCode="{ item }">
                    <span class="status-badge" :class="getStatusClass((item as AccessLog).statusCode)">
                        {{ (item as AccessLog).statusCode }}
                    </span>
                </template>

                <template #cell-url="{ item }">
                    <div class="url-cell">
                        <div class="url-path" :title="(item as AccessLog).url">{{ (item as AccessLog).url }}</div>
                        <div v-if="(item as AccessLog).endpoint" class="url-endpoint">{{ (item as AccessLog).endpoint }}
                        </div>
                    </div>
                </template>

                <template #cell-responseTime="{ item }">
                    <span class="response-time" :class="getResponseTimeClass((item as AccessLog).responseTime)">
                        {{ (item as AccessLog).responseTime }}ms
                    </span>
                </template>

                <template #cell-clientIp="{ item }">
                    <div class="ip-cell">
                        <span class="ip-address">{{ (item as AccessLog).clientIp }}</span>
                        <div class="ip-flags">
                            <span v-if="(item as AccessLog).isBot" class="flag bot-flag">{{ t('admin.accessLogs.bot')
                            }}</span>
                            <span v-if="(item as AccessLog).isApiRequest" class="flag api-flag">{{
                                t('admin.accessLogs.api') }}</span>
                        </div>
                    </div>
                </template>

                <template #cell-userAgent="{ item }">
                    <div class="user-agent-cell" :title="(item as AccessLog).userAgent">
                        {{ truncateUserAgent((item as AccessLog).userAgent) }}
                    </div>
                </template>

                <!-- Mobile content -->
                <template #mobile-content="{ item }">
                    <div class="mobile-log-content">
                        <div class="mobile-header">
                            <div class="mobile-method-status">
                                <span class="log-type-badge" :class="getLogTypeClass((item as AccessLog).logType)">{{
                                    getLogTypeLabel((item as AccessLog).logType) }}</span>
                                <span class="method-badge" :class="getMethodClass((item as AccessLog).method)">
                                    {{ (item as AccessLog).method }}
                                </span>
                                <span class="status-badge" :class="getStatusClass((item as AccessLog).statusCode)">
                                    {{ (item as AccessLog).statusCode }}
                                </span>
                            </div>
                            <div class="mobile-timestamp">{{ formatDateTime((item as AccessLog).timestamp) }}</div>
                        </div>

                        <div class="mobile-url">{{ (item as AccessLog).url }}</div>

                        <div class="mobile-details">
                            <div class="mobile-detail">
                                <span class="detail-label">{{ t('admin.accessLogs.ip') }}:</span>
                                <span class="detail-value">{{ (item as AccessLog).clientIp }}</span>
                            </div>
                            <div class="mobile-detail">
                                <span class="detail-label">{{ t('admin.accessLogs.responseTime') }}:</span>
                                <span class="detail-value"
                                    :class="getResponseTimeClass((item as AccessLog).responseTime)">{{ (item as
                                        AccessLog).responseTime }}ms</span>
                            </div>
                            <div v-if="(item as AccessLog).isBot || (item as AccessLog).isApiRequest"
                                class="mobile-flags">
                                <span v-if="(item as AccessLog).isBot" class="flag bot-flag">{{
                                    t('admin.accessLogs.bot') }}</span>
                                <span v-if="(item as AccessLog).isApiRequest" class="flag api-flag">{{
                                    t('admin.accessLogs.api') }}</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>

        <!-- Pagination -->
        <div v-if="paginationInfo && paginationInfo.totalPages > 1" class="pagination-section">
            <div class="pagination-info">
                {{ t('admin.accessLogs.showing', {
                    start: (paginationInfo.page - 1) * paginationInfo.limit + 1,
                    end: Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total),
                    total: paginationInfo.total
                }) }}
                <span v-if="accessLogs.length > paginationInfo.limit" class="live-count">
                    ({{ t('admin.accessLogs.liveCount', { count: accessLogs.length }) }})
                </span>
            </div>

            <div class="pagination-controls">
                <button @click="goToPage(1)" :disabled="!paginationInfo.hasPrevPage" class="pagination-button">
                    {{ t('admin.accessLogs.first') }}
                </button>
                <button @click="goToPage(currentPage - 1)" :disabled="!paginationInfo.hasPrevPage"
                    class="pagination-button">
                    {{ t('admin.accessLogs.prev') }}
                </button>
                <span class="pagination-current">
                    {{ t('admin.accessLogs.pageOf', { current: currentPage, total: paginationInfo.totalPages }) }}
                </span>
                <button @click="goToPage(currentPage + 1)" :disabled="!paginationInfo.hasNextPage"
                    class="pagination-button">
                    {{ t('admin.accessLogs.next') }}
                </button>
                <button @click="goToPage(paginationInfo.totalPages)" :disabled="!paginationInfo.hasNextPage"
                    class="pagination-button">
                    {{ t('admin.accessLogs.last') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

// Define types for the access log data
interface AccessLog {
    _id: string;
    timestamp: string;
    method: string;
    url: string;
    endpoint?: string;
    statusCode: number;
    responseTime: number;
    clientIp: string;
    userAgent: string;
    isBot: boolean;
    isApiRequest: boolean;
    logType?: 'server' | 'client';
    sessionId?: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface AccessLogsResponse {
    success: boolean;
    data: AccessLog[];
    pagination: PaginationInfo;
}

// Reactive state
const currentPage = ref(1);
const refreshInterval = ref<NodeJS.Timeout | null>(null);
const accessLogs = ref<AccessLog[]>([]);
const lastTimestamp = ref<string | null>(null);
const initialLoad = ref(true);
const maxLogs = 500; // Maximum logs to keep in memory

// Filters
const filters = reactive({
    search: '',
    method: '',
    statusCode: '',
    isBot: '',
    apiFilter: 'exclude', // 'exclude', 'include', 'only'
    hideUnderscoreUrls: 'true', // Hide URLs starting with _ by default
    logType: '' // 'server', 'client', or '' for all
});

// Computed API endpoint with filters
const apiEndpoint = computed(() => {
    const params = new URLSearchParams({
        page: currentPage.value.toString(),
        limit: '50'
    });

    // Add filters
    if (filters.search) params.append('search', filters.search);
    if (filters.method) params.append('method', filters.method);
    if (filters.statusCode) params.append('statusCode', filters.statusCode);
    if (filters.isBot) params.append('isBot', filters.isBot);
    if (filters.apiFilter) params.append('apiFilter', filters.apiFilter);
    if (filters.hideUnderscoreUrls) params.append('hideUnderscoreUrls', filters.hideUnderscoreUrls);
    if (filters.logType) params.append('logType', filters.logType);

    return `/api/admin/access-logs?${params.toString()}`;
});

// Computed API endpoint for new entries (incremental updates)
const newEntriesEndpoint = computed(() => {
    if (!lastTimestamp.value || initialLoad.value) return null;

    const params = new URLSearchParams({
        since: lastTimestamp.value,
        limit: '100' // Get more for updates
    });

    // Apply same filters for consistency
    if (filters.search) params.append('search', filters.search);
    if (filters.method) params.append('method', filters.method);
    if (filters.statusCode) params.append('statusCode', filters.statusCode);
    if (filters.isBot) params.append('isBot', filters.isBot);
    if (filters.apiFilter) params.append('apiFilter', filters.apiFilter);
    if (filters.hideUnderscoreUrls) params.append('hideUnderscoreUrls', filters.hideUnderscoreUrls);
    if (filters.logType) params.append('logType', filters.logType);

    return `/api/admin/access-logs?${params.toString()}`;
});

// Initial data fetching
const { data: initialData, pending, error, refresh: refreshInitial } = useAsyncData<AccessLogsResponse>(
    'admin-access-logs',
    () => $fetch<AccessLogsResponse>(apiEndpoint.value),
    {
        lazy: true,
        server: false,
        watch: [apiEndpoint]
    }
);

// Computed pagination info from initial data
const paginationInfo = computed(() => initialData.value?.pagination);

// Watch initial data to update our local array
watch(initialData, (newData) => {
    if (newData?.data && newData.data.length > 0) {
        accessLogs.value = [...newData.data];
        lastTimestamp.value = newData.data[0]?.timestamp || null;
        initialLoad.value = false;
    }
});

// Function to fetch new entries incrementally
const fetchNewEntries = async () => {
    if (!newEntriesEndpoint.value || initialLoad.value) return;

    try {
        const response = await $fetch<AccessLogsResponse>(newEntriesEndpoint.value);
        if (response.data && response.data.length > 0) {
            // Add a temporary "new" flag to new entries for styling
            const newEntries = response.data.map(entry => ({ ...entry, isNew: true }));

            // Prepend new entries to the beginning of the array
            accessLogs.value = [...newEntries, ...accessLogs.value];

            // Update last timestamp
            lastTimestamp.value = response.data[0]?.timestamp || lastTimestamp.value;

            // Trim array if it gets too long
            if (accessLogs.value.length > maxLogs) {
                accessLogs.value = accessLogs.value.slice(0, maxLogs);
            }

            // Remove the "new" flag after a short delay
            setTimeout(() => {
                accessLogs.value = accessLogs.value.map(entry => {
                    const { isNew, ...rest } = entry as any;
                    return rest;
                });
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to fetch new entries:', err);
    }
};

// Table columns configuration
const tableColumns = [
    {
        id: 'timestamp',
        header: t('admin.accessLogs.timestamp'),
        width: '80px',
        sortable: false
    },
    {
        id: 'method',
        header: t('admin.accessLogs.method'),
        width: '80px',
        sortable: false
    },
    {
        id: 'statusCode',
        header: t('admin.accessLogs.status'),
        width: '80px',
        sortable: false
    },
    {
        id: 'url',
        header: t('admin.accessLogs.url'),
        width: '300px',
        sortable: false
    },
    {
        id: 'responseTime',
        header: t('admin.accessLogs.responseTime'),
        width: '100px',
        sortable: false
    },
    {
        id: 'clientIp',
        header: t('admin.accessLogs.ip'),
        width: '150px',
        sortable: false
    },
    {
        id: 'userAgent',
        header: t('admin.accessLogs.userAgent'),
        sortable: false
    }
];

// Auto-refresh every second
onMounted(() => {
    // Initial load
    refreshInitial();

    // Set up auto-refresh for new entries
    refreshInterval.value = setInterval(() => {
        fetchNewEntries();
    }, 1000);
});

onUnmounted(() => {
    if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
    }
});

// Watch filters to reset data when filters change
watch([filters], () => {
    currentPage.value = 1;
    initialLoad.value = true;
    accessLogs.value = [];
    lastTimestamp.value = null;
}, { deep: true });

// Helper functions
function handleRefresh() {
    initialLoad.value = true;
    accessLogs.value = [];
    lastTimestamp.value = null;
    refreshInitial();
}

function goToPage(page: number) {
    currentPage.value = page;
}

function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleDateString();
}

function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString();
}

function formatDateTime(timestamp: string) {
    return new Date(timestamp).toLocaleString();
}

function getLogTypeClass(logType?: string) {
    const classes = {
        server: 'log-type-server',
        client: 'log-type-client'
    };
    return classes[logType as keyof typeof classes] || 'log-type-unknown';
}

function getLogTypeLabel(logType?: string) {
    const labels = {
        server: 'SRV',
        client: 'CLI'
    };
    return labels[logType as keyof typeof labels] || 'UNK';
}

function getMethodClass(method: string) {
    const classes = {
        GET: 'method-get',
        POST: 'method-post',
        PUT: 'method-put',
        DELETE: 'method-delete',
        PATCH: 'method-patch',
        OPTIONS: 'method-options'
    };
    return classes[method as keyof typeof classes] || 'method-other';
}

function getStatusClass(statusCode: number) {
    if (statusCode >= 200 && statusCode < 300) return 'status-success';
    if (statusCode >= 300 && statusCode < 400) return 'status-redirect';
    if (statusCode >= 400 && statusCode < 500) return 'status-client-error';
    if (statusCode >= 500) return 'status-server-error';
    return 'status-other';
}

function getResponseTimeClass(responseTime: number) {
    if (responseTime < 100) return 'response-fast';
    if (responseTime < 500) return 'response-medium';
    if (responseTime < 1000) return 'response-slow';
    return 'response-very-slow';
}

function getRowClass(item: AccessLog) {
    const classes = [];

    if (item.statusCode >= 500) classes.push('row-error');
    else if (item.statusCode >= 400) classes.push('row-warning');

    // Add highlight for new entries
    if ((item as any).isNew) classes.push('row-new');

    return classes.join(' ');
}

function truncateUserAgent(userAgent: string) {
    if (userAgent.length > 60) {
        return userAgent.substring(0, 60) + '...';
    }
    return userAgent;
}
</script>

<style scoped>
.access-logs-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
}

/* Header Styles */
.access-logs-header {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
    padding: 1.5rem;
    border: 1px solid rgb(55, 55, 55);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
}

.header-info {
    flex: 1;
}

.header-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.5rem;
}

.header-description {
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

/* Filters Styles */
.filters-section {
    border-top: 1px solid rgb(55, 55, 55);
    padding-top: 1.5rem;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(209, 213, 219);
}

.filter-input,
.filter-select {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.filter-input:focus,
.filter-select:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Table Styles */
.access-logs-table {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
    border: 1px solid rgb(55, 55, 55);
    overflow: hidden;
    flex: 1;
}

/* Custom cell styles */
.timestamp-cell {
    font-size: 0.75rem;
}

.timestamp-date {
    font-weight: 500;
    color: white;
}

.timestamp-time {
    color: rgb(156, 163, 175);
}

.method-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.log-type-badge {
    display: inline-block;
    padding: 0.25rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    margin-right: 0.25rem;
}

.log-type-server {
    background: rgb(99, 102, 241);
    color: white;
}

.log-type-client {
    background: rgb(16, 185, 129);
    color: white;
}

.log-type-unknown {
    background: rgb(107, 114, 128);
    color: white;
}

.method-get {
    background: rgb(34, 197, 94);
    color: white;
}

.method-post {
    background: rgb(59, 130, 246);
    color: white;
}

.method-put {
    background: rgb(245, 158, 11);
    color: white;
}

.method-delete {
    background: rgb(239, 68, 68);
    color: white;
}

.method-patch {
    background: rgb(168, 85, 247);
    color: white;
}

.method-options {
    background: rgb(107, 114, 128);
    color: white;
}

.method-other {
    background: rgb(75, 85, 99);
    color: white;
}

.status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
}

.status-success {
    background: rgb(34, 197, 94);
    color: white;
}

.status-redirect {
    background: rgb(59, 130, 246);
    color: white;
}

.status-client-error {
    background: rgb(245, 158, 11);
    color: white;
}

.status-server-error {
    background: rgb(239, 68, 68);
    color: white;
}

.status-other {
    background: rgb(107, 114, 128);
    color: white;
}

.url-cell {
    font-size: 0.875rem;
}

.url-path {
    color: white;
    font-family: monospace;
    word-break: break-all;
}

.url-endpoint {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    margin-top: 0.25rem;
}

.response-time {
    font-weight: 500;
    font-family: monospace;
}

.response-fast {
    color: rgb(34, 197, 94);
}

.response-medium {
    color: rgb(245, 158, 11);
}

.response-slow {
    color: rgb(251, 146, 60);
}

.response-very-slow {
    color: rgb(239, 68, 68);
}

.ip-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.ip-address {
    font-family: monospace;
    color: white;
}

.ip-flags {
    display: flex;
    gap: 0.25rem;
}

.flag {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
}

.bot-flag {
    background: rgb(239, 68, 68);
    color: white;
}

.api-flag {
    background: rgb(34, 197, 94);
    color: white;
}

.user-agent-cell {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
    font-family: monospace;
    word-break: break-all;
}

/* Row classes */
.row-error {
    background-color: rgba(239, 68, 68, 0.1);
}

.row-warning {
    background-color: rgba(245, 158, 11, 0.1);
}

.row-new {
    background-color: rgba(34, 197, 94, 0.15);
    animation: highlightNew 2s ease-out;
}

@keyframes highlightNew {
    0% {
        background-color: rgba(34, 197, 94, 0.3);
        transform: scale(1.01);
    }

    100% {
        background-color: rgba(34, 197, 94, 0.15);
        transform: scale(1);
    }
}

/* Mobile styles */
.mobile-log-content {
    padding: 1rem;
    border-radius: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
}

.mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.mobile-method-status {
    display: flex;
    gap: 0.5rem;
}

.mobile-timestamp {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.mobile-url {
    font-family: monospace;
    font-size: 0.875rem;
    color: white;
    word-break: break-all;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.25rem;
}

.mobile-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mobile-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.detail-label {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
    font-weight: 500;
}

.detail-value {
    font-size: 0.75rem;
    color: white;
    font-family: monospace;
}

.mobile-flags {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.5rem;
}

/* Pagination Styles */
.pagination-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
    border: 1px solid rgb(55, 55, 55);
}

.pagination-info {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.live-count {
    color: rgb(34, 197, 94);
    font-weight: 500;
    margin-left: 0.5rem;
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pagination-button {
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    color: white;
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.pagination-button:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgb(59, 130, 246);
}

.pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-current {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    color: rgb(209, 213, 219);
    font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .filters-grid {
        grid-template-columns: 1fr;
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .pagination-section {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
}
</style>
