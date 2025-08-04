<template>
    <div class="users-view">
        <!-- Users Header -->
        <div class="users-header">
            <div class="header-info">
                <h3 class="users-title">{{ t('admin.users.title') }}</h3>
                <p class="users-description">{{ t('admin.users.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="() => refreshData()" class="action-button" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.users.refresh') }}
                </button>
            </div>
        </div>

        <!-- Users Controls -->
        <div class="users-controls">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.users.search')" class="search-input" />
                <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn"
                    :title="t('admin.users.clearSearch')">
                    <Icon name="heroicons:x-mark" class="clear-icon" />
                </button>
            </div>

            <div class="controls-right">
                <div class="filter-toggle">
                    <button @click="showAdminsOnly = !showAdminsOnly" class="filter-btn"
                        :class="{ 'active': showAdminsOnly }">
                        <Icon name="heroicons:shield-check" class="filter-icon" />
                        {{ t('admin.users.adminsOnly') }}
                    </button>
                </div>
                <select v-model="pageSize" class="page-size-select" @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.users.perPage') }}</option>
                    <option value="25">25 {{ t('admin.users.perPage') }}</option>
                    <option value="50">50 {{ t('admin.users.perPage') }}</option>
                    <option value="100">100 {{ t('admin.users.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Users Grid -->
        <div class="users-container">
            <div v-if="pending" class="loading-container">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.users.loading') }}</p>
            </div>

            <div v-else-if="error" class="error-container">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.users.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.users.retry') }}
                </button>
            </div>

            <div v-else-if="data && data.data.length > 0" class="users-grid">
                <Card v-for="(user, index) in filteredUsers" :key="index" variant="elevated" size="md">
                    <template #header>
                        <div class="user-header-content">
                            <div class="user-avatar">
                                <img :src="`https://images.evetech.net/characters/${user.characterId}/portrait?size=64`"
                                    :alt="user.characterName" class="character-image" @error="handleImageError" />
                                <div v-if="user.administrator" class="admin-badge">
                                    <Icon name="heroicons:shield-check" class="admin-icon" />
                                </div>
                            </div>
                            <div class="user-info">
                                <NuxtLink :to="`/character/${user.characterId}`" class="character-name-link">
                                    <h4 class="character-name">{{ user.characterName }}</h4>
                                </NuxtLink>
                                <div class="character-id">ID: {{ user.characterId }}</div>
                                <div class="last-active">
                                    {{ t('admin.users.lastChecked') }}: {{ formatDate(user.lastChecked) }}
                                </div>
                            </div>
                        </div>
                    </template>

                    <template #body>
                        <!-- User Stats -->
                        <div class="user-stats">
                            <div class="stat-item">
                                <Icon name="heroicons:key" class="stat-icon" />
                                <span class="stat-label">{{ t('admin.users.scopes') }}:</span>
                                <span class="stat-value">{{ getUserScopesCount(user.scopes) }}</span>
                            </div>
                            <div class="stat-item">
                                <Icon name="heroicons:calendar" class="stat-icon" />
                                <span class="stat-label">{{ t('admin.users.tokenExpires') }}:</span>
                                <span class="stat-value"
                                    :class="{ 'text-red-400': isTokenExpired(user.dateExpiration) }">
                                    {{ formatDate(user.dateExpiration) }}
                                </span>
                            </div>
                            <div class="stat-item">
                                <Icon name="heroicons:building-office" class="stat-icon" />
                                <span class="stat-label">{{ t('admin.users.canFetchCorp') }}:</span>
                                <span class="stat-value"
                                    :class="user.canFetchCorporationKillmails ? 'text-green-400' : 'text-red-400'">
                                    {{ user.canFetchCorporationKillmails ? t('admin.users.yes') : t('admin.users.no') }}
                                </span>
                            </div>
                        </div>

                        <!-- Settings Summary -->
                        <div class="settings-summary" v-if="user.settings && user.settings.length > 0">
                            <div class="settings-header">
                                <Icon name="heroicons:cog-6-tooth" class="settings-icon" />
                                <span>{{ t('admin.users.settings') }}</span>
                            </div>
                            <div class="settings-list">
                                <div v-for="setting in user.settings" :key="setting.key" class="setting-item">
                                    <span class="setting-key">{{ setting.key }}:</span>
                                    <span class="setting-value">{{ formatSettingValue(setting.value) }}</span>
                                </div>
                            </div>
                        </div>
                    </template>

                    <template #actions>
                        <button @click="viewUserDetails(user)" class="action-btn view-btn">
                            <Icon name="heroicons:eye" class="action-btn-icon" />
                            {{ t('admin.users.viewDetails') }}
                        </button>
                        <button @click="toggleAdminStatus(user)" class="action-btn admin-btn"
                            :class="{ 'admin-active': user.administrator }">
                            <Icon name="heroicons:shield-check" class="action-btn-icon" />
                            {{ user.administrator ? t('admin.users.removeAdmin') : t('admin.users.makeAdmin') }}
                        </button>
                    </template>
                </Card>
            </div>

            <div v-else class="empty-state">
                <Icon name="heroicons:users" class="empty-icon" />
                <p class="empty-text">{{ t('admin.users.empty') }}</p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="data && data.pagination.totalPages > 1" class="pagination">
            <button @click="changePage(1)" :disabled="!data.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.users.first') }}
            </button>
            <button @click="changePage(data.pagination.currentPage - 1)" :disabled="!data.pagination.hasPrevPage"
                class="pagination-btn">
                {{ t('admin.users.prev') }}
            </button>

            <span class="pagination-info">
                {{ t('admin.users.pageInfo', {
                    current: data.pagination.currentPage,
                    total: data.pagination.totalPages
                }) }}
            </span>

            <button @click="changePage(data.pagination.currentPage + 1)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.users.next') }}
            </button>
            <button @click="changePage(data.pagination.totalPages)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.users.last') }}
            </button>
        </div>

        <!-- User Details Modal -->
        <div v-if="showUserModal" class="modal-overlay" @click="closeUserModal">
            <div class="modal-content user-modal" @click.stop>
                <div class="modal-header">
                    <h3 class="modal-title">{{ selectedUser?.characterName }} - {{ t('admin.users.userDetails') }}</h3>
                    <button @click="closeUserModal" class="modal-close">
                        <Icon name="heroicons:x-mark" class="close-icon" />
                    </button>
                </div>
                <div class="modal-body">
                    <div v-if="selectedUser" class="user-detail-content">
                        <!-- Character Section -->
                        <div class="detail-section">
                            <h4 class="section-title">{{ t('admin.users.characterInfo') }}</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>{{ t('admin.users.characterId') }}:</label>
                                    <span>{{ selectedUser.characterId }}</span>
                                </div>
                                <div class="detail-item">
                                    <label>{{ t('admin.users.characterName') }}:</label>
                                    <span>{{ selectedUser.characterName }}</span>
                                </div>
                                <div class="detail-item">
                                    <label>{{ t('admin.users.ownerHash') }}:</label>
                                    <span class="hash-value">{{ selectedUser.characterOwnerHash }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Token Section -->
                        <div class="detail-section">
                            <h4 class="section-title">{{ t('admin.users.tokenInfo') }}</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>{{ t('admin.users.tokenType') }}:</label>
                                    <span>{{ selectedUser.tokenType }}</span>
                                </div>
                                <div class="detail-item">
                                    <label>{{ t('admin.users.expires') }}:</label>
                                    <span :class="{ 'text-red-400': isTokenExpired(selectedUser.dateExpiration) }">
                                        {{ formatDate(selectedUser.dateExpiration) }}
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <label>{{ t('admin.users.lastChecked') }}:</label>
                                    <span>{{ formatDate(selectedUser.lastChecked) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Scopes Section -->
                        <div class="detail-section">
                            <h4 class="section-title">{{ t('admin.users.scopes') }} ({{
                                getUserScopesCount(selectedUser.scopes) }})
                            </h4>
                            <div class="scopes-list">
                                <span v-for="scope in getUserScopesArray(selectedUser.scopes)" :key="scope"
                                    class="scope-tag">
                                    {{ scope }}
                                </span>
                            </div>
                        </div>

                        <!-- Settings Section -->
                        <div class="detail-section" v-if="selectedUser.settings && selectedUser.settings.length > 0">
                            <h4 class="section-title">{{ t('admin.users.userSettings') }}</h4>
                            <div class="settings-detail">
                                <div v-for="setting in selectedUser.settings" :key="setting.key"
                                    class="setting-detail-item">
                                    <label>{{ setting.key }}:</label>
                                    <span>{{ formatSettingValue(setting.value) }}</span>
                                    <span class="setting-updated">{{ formatDate(setting.updatedAt) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface UsersResponse {
    success: boolean;
    data: any[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        limit: number;
    };
    meta: {
        searchTerm: string | null;
        adminsOnly: boolean;
        sortField: string;
        order: string;
        timestamp: string;
    };
}

const { t } = useI18n();

// Reactive state
const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const pageSize = ref(25);
const currentPage = ref(1);
const sortField = ref('lastChecked');
const sortOrder = ref<'asc' | 'desc'>('desc');
const showAdminsOnly = ref(false);

// Modal state
const showUserModal = ref(false);
const selectedUser = ref<any>(null);

// Helper function to handle scopes data
const getUserScopesCount = (scopes: any): number => {
    if (!scopes) return 0;
    if (typeof scopes === 'string') {
        return scopes.trim() ? scopes.split(' ').length : 0;
    }
    if (Array.isArray(scopes)) {
        return scopes.length;
    }
    return 0;
};

const getUserScopesArray = (scopes: any): string[] => {
    if (!scopes) return [];
    if (typeof scopes === 'string') {
        return scopes.trim() ? scopes.split(' ') : [];
    }
    if (Array.isArray(scopes)) {
        return scopes;
    }
    return [];
};

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams({
        page: currentPage.value.toString(),
        limit: pageSize.value.toString(),
        sortField: sortField.value,
        order: sortOrder.value,
    });

    if (debouncedSearchQuery.value.trim()) {
        params.set('search', debouncedSearchQuery.value.trim());
    }

    if (showAdminsOnly.value) {
        params.set('adminsOnly', 'true');
    }

    return `/api/admin/users?${params.toString()}`;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData(
    'admin-users',
    () => $fetch<UsersResponse>(apiEndpoint.value),
    {
        lazy: true,
        server: false,
        watch: [currentPage, pageSize, sortField, sortOrder, showAdminsOnly],
    }
);

// Debounced search functionality similar to navbar search
// Create a debounced function that updates the search query used by the API
const updateDebouncedSearch = debounce(() => {
    debouncedSearchQuery.value = searchQuery.value;
    currentPage.value = 1; // Reset to first page on search
}, 500);

// Watch the immediate search input and debounce the actual API search
watch(searchQuery, () => {
    updateDebouncedSearch();
});

// Watch the debounced search query to trigger API calls
watch(debouncedSearchQuery, () => {
    refreshData();
});

// Filtered users - now handled server-side via API
const filteredUsers = computed(() => {
    return data.value?.data || [];
});

// Helper functions
const changePage = (page: number) => {
    currentPage.value = page;
};

const handlePageSizeChange = () => {
    currentPage.value = 1;
};

const clearSearch = () => {
    searchQuery.value = '';
    debouncedSearchQuery.value = '';
    currentPage.value = 1;
};

const formatDate = (date: string | Date): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString();
};

const isTokenExpired = (date: string | Date): boolean => {
    if (!date) return true;
    return new Date(date) < new Date();
};

const formatSettingValue = (value: any): string => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    img.src = '/images/default-avatar.png'; // Fallback image
};

// Modal functions
const viewUserDetails = (user: any) => {
    selectedUser.value = user;
    showUserModal.value = true;
};

const closeUserModal = () => {
    showUserModal.value = false;
    selectedUser.value = null;
};

const toggleAdminStatus = async (user: any) => {
    try {
        const response = await $fetch(`/api/admin/users/${user.characterId}`, {
            method: 'PATCH',
            body: {
                action: 'toggleAdmin'
            }
        });

        if (response.success) {
            // Update the user in the local data
            user.administrator = response.user.administrator;
            // Optionally refresh the data to ensure consistency
            // await refreshData();
        }
    } catch (error) {
        console.error('Failed to toggle admin status:', error);
        // You could add toast notification here
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
.users-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-6);
    gap: var(--space-6);
}

.users-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
}

.header-info {
    flex: 1;
}

.users-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.users-description {
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

.users-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.search-container {
    position: relative;
    flex: 1;
    max-width: 400px;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
}

.search-input {
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.search-input:focus {
    outline: none;
    border-color: rgb(96, 165, 250);
}

.search-input::placeholder {
    color: rgb(156, 163, 175);
}

.search-clear-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgb(156, 163, 175);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.15s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-clear-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.controls-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.filter-toggle {
    display: flex;
    align-items: center;
}

.filter-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
}

.filter-btn.active {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgb(59, 130, 246);
    color: rgb(96, 165, 250);
}

.filter-btn:hover {
    border-color: rgb(96, 165, 250);
}

.filter-icon {
    width: 1rem;
    height: 1rem;
}

.page-size-select {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.users-container {
    flex: 1;
    overflow-y: auto;
}

.loading-container,
.error-container,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
}

.loading-icon,
.error-icon,
.empty-icon {
    width: 2rem;
    height: 2rem;
    color: rgb(156, 163, 175);
}

.loading-text,
.error-text,
.empty-text {
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

.users-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
    gap: var(--space-6);
    padding: var(--space-4) 0;
}

.user-header-content {
    display: flex;
    align-items: center;
    gap: var(--space-4);
}

.user-avatar {
    position: relative;
    flex-shrink: 0;
}

.character-image {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid var(--color-border-light);
}

.admin-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: var(--color-success);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.admin-icon {
    width: 12px;
    height: 12px;
    color: var(--color-text-inverse);
}

.user-info {
    flex: 1;
    min-width: 0;
}

.character-name {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.character-name-link {
    text-decoration: none;
    color: inherit;
    transition: color var(--duration-150) ease-in-out;
}

.character-name-link:hover .character-name {
    color: var(--color-brand-primary);
}

.character-id,
.last-active {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-0-5);
}


.user-stats {
    margin-bottom: var(--space-4);
}

.stat-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
}

.stat-icon {
    width: var(--space-4);
    height: var(--space-4);
    color: var(--color-brand-primary);
    flex-shrink: 0;
}

.stat-label {
    color: var(--color-text-tertiary);
    min-width: 0;
}

.stat-value {
    color: var(--color-text-primary);
    font-weight: var(--font-medium);
}

.settings-summary {
    margin-bottom: var(--space-4);
}

.settings-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
}

.settings-icon {
    width: var(--space-4);
    height: var(--space-4);
    color: var(--color-brand-primary);
}

.settings-list {
    background: var(--color-surface-alpha-subtle);
    border-radius: var(--radius-base);
    padding: var(--space-2);
}

.setting-item {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    margin-bottom: var(--space-1);
}

.setting-key {
    color: var(--color-text-tertiary);
}

.setting-value {
    color: var(--color-text-primary);
}

.action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: none;
    border-radius: var(--radius-base);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--duration-150) ease-in-out;
    flex: 1;
    justify-content: center;
}

.view-btn {
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
}

.view-btn:hover {
    background-color: var(--color-primary-dark);
}

.admin-btn {
    background-color: var(--color-surface-alpha-medium);
    color: var(--color-text-tertiary);
}

.admin-btn:hover {
    background-color: var(--color-surface-alpha);
}

.admin-btn.admin-active {
    background-color: var(--color-success);
    color: var(--color-text-inverse);
}

.admin-btn.admin-active:hover {
    background-color: var(--color-success-dark);
}

.action-btn-icon {
    width: var(--text-sm);
    height: var(--text-sm);
}

.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-4) 0;
}

.pagination-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--duration-150) ease-in-out;
}

.pagination-btn:hover:not(:disabled) {
    background: var(--color-surface-alpha-medium);
    border-color: var(--color-border-focus);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-info {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
    margin: 0 var(--space-4);
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--space-4);
}

.modal-content {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.user-modal {
    max-width: 900px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
}

.modal-title {
    color: var(--color-text-primary);
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
}

.modal-close {
    padding: var(--space-1);
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-base);
    transition: color var(--duration-150) ease-in-out;
}

.modal-close:hover {
    color: var(--color-text-primary);
}

.close-icon {
    width: var(--space-5);
    height: var(--space-5);
}

.modal-body {
    flex: 1;
    overflow: auto;
    padding: var(--space-4);
}

.user-detail-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
}

.detail-section {
    background: var(--color-surface-alpha-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
}

.section-title {
    color: var(--color-text-primary);
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
    padding-bottom: var(--space-2);
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-4);
}

.detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.detail-item label {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
}

.detail-item span {
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.hash-value {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: var(--text-xs);
    word-break: break-all;
}

.scopes-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
}

.scope-tag {
    background: var(--color-brand-primary-alpha);
    border: 1px solid var(--color-brand-primary);
    border-radius: var(--radius-base);
    padding: var(--space-1) var(--space-2);
    color: var(--color-brand-primary);
    font-size: var(--text-xs);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
}

.settings-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

.setting-detail-item {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-2);
    background: var(--color-surface-alpha);
    border-radius: var(--radius-base);
}

.setting-detail-item label {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
}

.setting-detail-item span {
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.setting-updated {
    color: var(--color-text-tertiary) !important;
    font-size: var(--text-xs) !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .users-view {
        padding: var(--space-4);
    }

    .users-header {
        flex-direction: column;
        gap: var(--space-4);
    }

    .users-controls {
        flex-direction: column;
        align-items: stretch;
    }

    .search-container {
        max-width: none;
    }

    .users-grid {
        grid-template-columns: 1fr;
    }

    .user-card {
        min-width: 0;
    }

    .detail-grid {
        grid-template-columns: 1fr;
    }

    .setting-detail-item {
        grid-template-columns: 1fr;
        gap: var(--space-2);
    }
}
</style>
