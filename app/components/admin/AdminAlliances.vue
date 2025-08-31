<template>
    <div class="admin-alliances">
        <!-- Header Section -->
        <div class="alliances-header">
            <div class="header-info">
                <h1 class="alliances-title">{{ t('admin.alliances.title') }}</h1>
                <p class="alliances-description">{{ t('admin.alliances.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="clearSearch" v-if="searchQuery.length > 0" class="action-btn clear-search-btn">
                    <Icon name="heroicons:x-mark" class="action-icon" />
                    {{ t('admin.alliances.clearSearch') }}
                </button>
                <button @click="() => refreshData()" class="action-btn" :disabled="displayPending || isSearchMode">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': displayPending }" />
                    {{ t('admin.alliances.refresh') }}
                </button>
            </div>
        </div>

        <!-- Filters and Search -->
        <div class="filters-section">
            <div class="search-container">
                <div class="search-input-wrapper">
                    <Icon name="heroicons:magnifying-glass" class="search-icon" />
                    <input v-model="searchQuery" type="text"
                        :placeholder="isSearchMode ? t('admin.alliances.searchActive') : t('admin.alliances.search')"
                        class="search-input" :class="{ 'search-active': isSearchMode }" />
                    <button v-if="searchQuery.length > 0" @click="clearSearch" class="clear-search-btn">
                        <Icon name="heroicons:x-mark" class="w-4 h-4" />
                    </button>
                </div>
                <div v-if="isSearchMode" class="search-status">
                    <Icon name="heroicons:magnifying-glass" class="search-status-icon" />
                    <span v-if="searchPending" class="search-status-text">{{ t('search.searching') }}...</span>
                    <span v-else-if="searchResults.length > 0" class="search-status-text">
                        {{ t('admin.alliances.searchResults', { count: searchResults.length }) }}
                    </span>
                    <span v-else class="search-status-text">{{ t('search.noResults') }}</span>
                </div>
            </div>
            <div class="filters-row" v-if="!isSearchMode">
                <select v-model="pageSize" class="page-size-select" :aria-label="'Items per page'"
                    @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.alliances.perPage') }}</option>
                    <option value="25">25 {{ t('admin.alliances.perPage') }}</option>
                    <option value="50">50 {{ t('admin.alliances.perPage') }}</option>
                    <option value="100">100 {{ t('admin.alliances.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="displayPending" class="loading-container">
            <div class="loading-content">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ isSearchMode ? t('search.searching') : t('admin.alliances.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="!isSearchMode && error" class="error-container">
            <div class="error-content">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.alliances.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.alliances.retry') }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <!-- Content -->
        <div v-else-if="displayData?.alliances && displayData.alliances.length > 0" class="alliances-content">
            <!-- Alliances List -->
            <div v-if="displayData?.alliances && displayData.alliances.length > 0" class="alliances-list">
                <div v-for="alliance in displayData.alliances" :key="alliance.alliance_id" class="alliance-card">
                    <!-- Alliance Info Section -->
                    <div class="alliance-info-section">
                        <div class="alliance-avatar">
                            <Image :type="'alliance'" :id="alliance.alliance_id" :size="64" />
                        </div>
                        <div class="alliance-details">
                            <h4 class="alliance-name">
                                <NuxtLink :to="`/alliance/${alliance.alliance_id}`">
                                    {{ alliance.name || `Alliance ${alliance.alliance_id}` }}
                                </NuxtLink>
                            </h4>
                            <div class="alliance-meta">
                                <div class="alliance-meta-item">
                                    <Icon name="heroicons:hashtag" class="meta-icon" />
                                    <span>{{ alliance.ticker || '-' }}</span>
                                </div>
                                <div class="alliance-meta-item">
                                    <Icon name="heroicons:building-office-2" class="meta-icon" />
                                    <span>{{ alliance.corporation_count?.toLocaleString() || '0' }} corporations</span>
                                </div>
                                <div class="alliance-meta-item">
                                    <Icon name="heroicons:users" class="meta-icon" />
                                    <span>{{ alliance.member_count?.toLocaleString() || '0' }} members</span>
                                </div>
                                <div v-if="alliance.date_founded" class="alliance-meta-item">
                                    <Icon name="heroicons:calendar" class="meta-icon" />
                                    <span>Founded: {{ formatDateRelative(alliance.date_founded) }}</span>
                                </div>
                                <div class="alliance-meta-item">
                                    <Icon name="heroicons:clock" class="meta-icon" />
                                    <span>Updated: {{ formatDateRelative(alliance.updatedAt) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="alliance-actions-row">
                        <button @click="refreshAlliance(alliance)" class="action-btn-slim refresh-btn">
                            <Icon name="heroicons:arrow-path" class="action-btn-icon" />
                            Refresh
                        </button>
                        <button @click="editAlliance(alliance)" class="action-btn-slim edit-btn">
                            <Icon name="heroicons:pencil-square" class="action-btn-icon" />
                            Edit
                        </button>
                        <button @click="deleteAlliance(alliance)" class="action-btn-slim delete-btn">
                            <Icon name="heroicons:trash" class="action-btn-icon" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-container">
                <div class="empty-content">
                    <Icon name="heroicons:shield-check" class="empty-icon" />
                    <p class="empty-text">{{ t('admin.alliances.noAlliancesFound') }}</p>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="!isSearchMode && displayData?.pagination && displayData.pagination.totalPages > 1"
                class="pagination-container">
                <button @click="changePage(1)" :disabled="!displayData.pagination.hasPrevPage" class="pagination-btn">
                    {{ t('admin.alliances.pagination.first') }}
                </button>
                <button @click="changePage(displayData.pagination.currentPage - 1)"
                    :disabled="!displayData.pagination.hasPrevPage" class="pagination-btn">
                    {{ t('admin.alliances.pagination.previous') }}
                </button>

                <span class="pagination-info">
                    {{ t('admin.alliances.pagination.page', {
                        current: displayData.pagination.currentPage,
                        total: displayData.pagination.totalPages
                    }) }}
                </span>

                <button @click="changePage(displayData.pagination.currentPage + 1)"
                    :disabled="!displayData.pagination.hasNextPage" class="pagination-btn">
                    {{ t('admin.alliances.pagination.next') }}
                </button>
                <button @click="changePage(displayData.pagination.totalPages)"
                    :disabled="!displayData.pagination.hasNextPage" class="pagination-btn">
                    {{ t('admin.alliances.pagination.last') }}
                </button>
            </div>
        </div>

        <!-- Edit Alliance Modal -->
        <Modal :is-open="editModal.isOpen" @close="handleEditCancel" size="lg">
            <template #header>
                <h3>{{ t('admin.alliances.edit.title') }}</h3>
            </template>

            <template #default>
                <div v-if="editModal.alliance" class="modal-form">
                    <div class="form-group">
                        <label for="edit-name">{{ t('admin.alliances.edit.name') }}</label>
                        <input id="edit-name" v-model="editModal.form.name" type="text" class="form-input"
                            :placeholder="t('admin.alliances.edit.namePlaceholder')" />
                    </div>

                    <div class="form-group">
                        <label for="edit-ticker">{{ t('admin.alliances.edit.ticker') }}</label>
                        <input id="edit-ticker" v-model="editModal.form.ticker" type="text" class="form-input"
                            :placeholder="t('admin.alliances.edit.tickerPlaceholder')" />
                    </div>

                    <div class="form-group">
                        <label for="edit-executor-corporation">{{ t('admin.alliances.edit.executorCorporation')
                            }}</label>
                        <Search v-model="editModal.form.executor_corporation_id" type="corporations"
                            :placeholder="t('admin.alliances.edit.executorCorporationPlaceholder')"
                            class="form-search" />
                    </div>

                    <div class="form-group">
                        <label for="edit-creator">{{ t('admin.alliances.edit.creator') }}</label>
                        <Search v-model="editModal.form.creator_id" type="characters"
                            :placeholder="t('admin.alliances.edit.creatorPlaceholder')" class="form-search" />
                    </div>

                    <div class="form-group">
                        <label for="edit-creator-corporation">{{ t('admin.alliances.edit.creatorCorporation') }}</label>
                        <Search v-model="editModal.form.creator_corporation_id" type="corporations"
                            :placeholder="t('admin.alliances.edit.creatorCorporationPlaceholder')"
                            class="form-search" />
                    </div>
                </div>
            </template>

            <template #footer>
                <div class="modal-footer">
                    <button @click="handleEditCancel" class="btn-secondary" :disabled="editModal.pending">
                        {{ t('common.cancel') }}
                    </button>
                    <button @click="handleEditSubmit" class="btn-primary" :disabled="editModal.pending">
                        <Icon v-if="editModal.pending" name="heroicons:arrow-path" class="animate-spin mr-2" />
                        {{ editModal.pending ? t('common.saving') : t('common.save') }}
                    </button>
                </div>
            </template>
        </Modal>

        <!-- Delete Confirmation Modal -->
        <Modal :is-open="deleteModal.isOpen" @close="handleDeleteCancel" size="sm">
            <template #header>
                <h3>{{ t('admin.alliances.delete.title') }}</h3>
            </template>

            <template #default>
                <div v-if="deleteModal.alliance" class="modal-content">
                    <Icon name="heroicons:exclamation-triangle" class="warning-icon" />
                    <p class="warning-text">
                        {{ t('admin.alliances.delete.warning') }}
                    </p>
                    <div class="alliance-info">
                        <strong>{{ deleteModal.alliance.name }}</strong>
                        <span v-if="deleteModal.alliance.ticker" class="ticker">[{{ deleteModal.alliance.ticker
                            }}]</span>
                    </div>
                </div>
            </template>

            <template #footer>
                <div class="modal-footer">
                    <button @click="handleDeleteCancel" class="btn-secondary" :disabled="deleteModal.pending">
                        {{ t('common.cancel') }}
                    </button>
                    <button @click="handleDeleteConfirm" class="btn-danger" :disabled="deleteModal.pending">
                        <Icon v-if="deleteModal.pending" name="heroicons:arrow-path" class="animate-spin mr-2" />
                        {{ deleteModal.pending ? t('admin.alliances.delete.deleting') :
                            t('admin.alliances.delete.confirm') }}
                    </button>
                </div>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">

interface Alliance {
    alliance_id: number;
    name: string;
    ticker?: string;
    creator_id?: number;
    creator_corporation_id?: number;
    executor_corporation_id?: number;
    date_founded?: string;
    faction_id?: number;
    faction_name?: string;
    corporation_count?: number;
    member_count?: number;
    deleted?: boolean;
    createdAt: string;
    updatedAt: string;
}

interface AlliancesResponse {
    alliances: Alliance[];
    pagination: {
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        totalCount: number;
    };
}

interface AllianceDetailResponse {
    success: boolean;
    alliance: Alliance;
}

const { t } = useI18n();
const toast = useToast();

// Modal state
const editModal = ref({
    isOpen: false,
    alliance: null as Alliance | null,
    form: {
        name: '',
        ticker: '',
        executor_corporation_id: '',
        creator_id: '',
        creator_corporation_id: '',
    },
    pending: false,
});

const deleteModal = ref({
    isOpen: false,
    alliance: null as Alliance | null,
    pending: false,
});

// Reactive state
const currentPage = ref(1);
const pageSize = ref(25);
const searchQuery = ref('');
const searchResults = ref<Alliance[]>([]);
const searchPending = ref(false);
const isSearchMode = computed(() => searchQuery.value.trim().length >= 2);

// Search functionality
const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
        searchResults.value = [];
        return;
    }

    searchPending.value = true;
    try {
        const response = await $fetch(`/api/search/${encodeURIComponent(query)}`);
        const allianceHits = response?.hits?.filter((hit: any) => hit.type === 'alliance') || [];

        // Transform search results to Alliance format
        searchResults.value = allianceHits.map((hit: any) => ({
            alliance_id: hit.id,
            name: hit.name,
            ticker: hit.ticker || undefined,
            deleted: hit.deleted || false,
            updatedAt: hit.updatedAt || new Date().toISOString(),
            createdAt: hit.updatedAt || new Date().toISOString(),
            // Set other fields as undefined since search API doesn't provide them
            executor_corporation_id: undefined,
            creator_id: undefined,
            creator_corporation_id: undefined,
            date_founded: undefined,
        }));
    } catch (error) {
        console.error('Search error:', error);
        searchResults.value = [];
    } finally {
        searchPending.value = false;
    }
};

// Watch search query for live search with debounce
watchDebounced(searchQuery, (newQuery: string) => {
    if (newQuery.trim().length >= 2) {
        performSearch(newQuery);
    } else {
        searchResults.value = [];
    }
}, { debounce: 300, maxWait: 1000 });

// Computed API endpoint for regular data fetching (when not searching)
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    if (currentPage.value > 1) params.set('page', currentPage.value.toString());
    if (pageSize.value !== 25) params.set('limit', pageSize.value.toString());

    return `/api/admin/alliances?${params.toString()}`;
});

// Fetch regular data (only when not in search mode)
const { data, pending, error, refresh: refreshData } = useAsyncData<AlliancesResponse>(
    'admin-alliances',
    () => $fetch(apiEndpoint.value),
    {
        server: false,
        watch: [currentPage, pageSize],
        default: () => ({
            alliances: [],
            pagination: { currentPage: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, totalCount: 0 }
        })
    }
);

// Computed data that shows either search results or regular data
const displayData = computed(() => {
    if (isSearchMode.value) {
        return {
            alliances: searchResults.value,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                totalCount: searchResults.value.length
            }
        };
    }
    return data.value || {
        alliances: [],
        pagination: { currentPage: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, totalCount: 0 }
    };
});

// Computed pending state
const displayPending = computed(() => {
    return isSearchMode.value ? searchPending.value : pending.value;
});

// Methods
const clearSearch = () => {
    searchQuery.value = '';
    searchResults.value = [];
};

const handlePageSizeChange = () => {
    currentPage.value = 1;
};

const changePage = (page: number) => {
    currentPage.value = page;
};

const formatDateRelative = (date: string) => {
    return new Date(date).toLocaleDateString();
};

const refreshAlliance = async (alliance: Alliance) => {
    try {
        toast.add({
            id: `refresh-${alliance.alliance_id}`,
            title: t('admin.alliances.refresh.started', { name: alliance.name }),
            icon: 'heroicons:arrow-path',
            color: 'info',
        });

        const response = await $fetch(`/api/admin/alliances/${alliance.alliance_id}/refresh`, {
            method: 'POST'
        });

        if (response.success) {
            toast.add({
                id: `refresh-${alliance.alliance_id}-success`,
                title: response.message,
                description: response.changes && response.changes.length > 0
                    ? response.changes.join(', ')
                    : undefined,
                icon: 'heroicons:check-circle',
                color: 'success',
            });

            // Refresh the data
            if (!isSearchMode.value) {
                await refreshData();
            } else {
                // If in search mode, re-run the search to get updated data
                await performSearch(searchQuery.value);
            }
        }
    } catch (error: any) {
        console.error('Error refreshing alliance:', error);
        toast.add({
            id: `refresh-${alliance.alliance_id}-error`,
            title: t('admin.alliances.refresh.error'),
            description: error.data?.message || error.message || 'Failed to refresh alliance data',
            icon: 'heroicons:exclamation-triangle',
            color: 'error',
        });
    }
};

const editAlliance = async (alliance: Alliance) => {
    try {
        // Fetch full alliance data
        const response = await $fetch<AllianceDetailResponse>(`/api/admin/alliances/${alliance.alliance_id}`);

        if (response.success && response.alliance) {
            editModal.value.alliance = response.alliance;
            editModal.value.form = {
                name: response.alliance.name || '',
                ticker: response.alliance.ticker || '',
                executor_corporation_id: response.alliance.executor_corporation_id?.toString() || '',
                creator_id: response.alliance.creator_id?.toString() || '',
                creator_corporation_id: response.alliance.creator_corporation_id?.toString() || '',
            };
            editModal.value.isOpen = true;
        }
    } catch (error: any) {
        console.error('Error fetching alliance data:', error);
        toast.add({
            id: `edit-fetch-${alliance.alliance_id}-error`,
            title: t('admin.alliances.edit.fetchError'),
            description: error.data?.message || error.message || 'Failed to fetch alliance data',
            icon: 'heroicons:exclamation-triangle',
            color: 'error',
        });
    }
};

const deleteAlliance = (alliance: Alliance) => {
    deleteModal.value.alliance = alliance;
    deleteModal.value.isOpen = true;
};

// Modal handlers
const handleEditSubmit = async () => {
    if (!editModal.value.alliance) return;

    editModal.value.pending = true;

    try {
        // Convert form data, handling empty strings as null
        const formData = {
            name: editModal.value.form.name,
            ticker: editModal.value.form.ticker,
            executor_corporation_id: editModal.value.form.executor_corporation_id ? parseInt(editModal.value.form.executor_corporation_id) : null,
            creator_id: editModal.value.form.creator_id ? parseInt(editModal.value.form.creator_id) : null,
            creator_corporation_id: editModal.value.form.creator_corporation_id ? parseInt(editModal.value.form.creator_corporation_id) : null,
        };

        const response = await $fetch(`/api/admin/alliances/${editModal.value.alliance.alliance_id}/edit`, {
            method: 'POST',
            body: formData
        });

        if (response.success) {
            toast.add({
                id: `edit-${editModal.value.alliance.alliance_id}-success`,
                title: response.message,
                icon: 'heroicons:check-circle',
                color: 'success'
            });

            editModal.value.isOpen = false;

            // Refresh the data
            if (!isSearchMode.value) {
                await refreshData();
            } else {
                // If in search mode, re-run the search to get updated data
                await performSearch(searchQuery.value);
            }
        }
    } catch (error: any) {
        console.error('Error editing alliance:', error);
        toast.add({
            id: `edit-${editModal.value.alliance?.alliance_id}-error`,
            title: t('admin.alliances.edit.error'),
            description: error.data?.message || error.message || 'Failed to edit alliance',
            icon: 'heroicons:exclamation-triangle',
            color: 'error'
        });
    } finally {
        editModal.value.pending = false;
    }
};

const handleEditCancel = () => {
    editModal.value.isOpen = false;
    editModal.value.alliance = null;
    editModal.value.pending = false;
    // Reset form
    editModal.value.form = {
        name: '',
        ticker: '',
        executor_corporation_id: '',
        creator_id: '',
        creator_corporation_id: '',
    };
};

const handleDeleteConfirm = async () => {
    if (!deleteModal.value.alliance) return;

    deleteModal.value.pending = true;

    try {
        const response = await $fetch(`/api/admin/alliances/${deleteModal.value.alliance.alliance_id}/delete`, {
            method: 'POST'
        });

        if (response.success) {
            toast.add({
                id: `delete-${deleteModal.value.alliance.alliance_id}-success`,
                title: response.message,
                icon: 'heroicons:check-circle',
                color: 'success'
            });

            deleteModal.value.isOpen = false;

            // Refresh the data
            if (!isSearchMode.value) {
                await refreshData();
            } else {
                // If in search mode, re-run the search to get updated data
                await performSearch(searchQuery.value);
            }
        }
    } catch (error: any) {
        console.error('Error deleting alliance:', error);
        toast.add({
            id: `delete-${deleteModal.value.alliance?.alliance_id}-error`,
            title: t('admin.alliances.delete.error'),
            description: error.data?.message || error.message || 'Failed to delete alliance',
            icon: 'heroicons:exclamation-triangle',
            color: 'error'
        });
    } finally {
        deleteModal.value.pending = false;
    }
};

const handleDeleteCancel = () => {
    deleteModal.value.isOpen = false;
    deleteModal.value.alliance = null;
    deleteModal.value.pending = false;
};

</script>

<style scoped>
/* Admin Alliances - Following AdminDomains/AdminCharacters styling pattern */
.admin-alliances {
    padding: 2rem;
    background: linear-gradient(135deg, rgb(9, 9, 11) 0%, rgb(24, 24, 27) 50%, rgb(39, 39, 42) 100%);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

:global(.light) .admin-alliances {
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%);
}

/* Header Section */
.alliances-header {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(10px);
}

:global(.light) .alliances-header {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@media (min-width: 768px) {
    .alliances-header {
        flex-direction: row;
        align-items: center;
        gap: 2rem;
    }
}

.header-info {
    flex: 1;
    min-width: 0;
}

.alliances-title {
    font-size: 2.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
}

:global(.light) .alliances-title {
    color: #1e293b;
    background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.alliances-description {
    color: rgb(156, 163, 175);
    line-height: 1.6;
    font-size: 1rem;
    max-width: 600px;
}

:global(.light) .alliances-description {
    color: #64748b;
}

.header-actions {
    display: flex;
    gap: 1rem;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid rgb(82, 82, 91);
    border-radius: 0.5rem;
    background: linear-gradient(135deg, rgba(82, 82, 91, 0.1) 0%, rgba(63, 63, 70, 0.1) 100%);
    color: white;
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    white-space: nowrap;
    backdrop-filter: blur(5px);
}

:global(.light) .action-btn {
    border-color: rgb(203, 213, 225);
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%);
    color: rgb(51, 65, 85);
}

.action-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(82, 82, 91, 0.2) 0%, rgba(63, 63, 70, 0.2) 100%);
    border-color: rgb(113, 113, 122);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

:global(.light) .action-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(203, 213, 225, 0.2) 0%, rgba(226, 232, 240, 0.2) 100%);
    border-color: rgb(148, 163, 184);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
}

.action-icon {
    width: 1.125rem;
    height: 1.125rem;
    flex-shrink: 0;
}

/* Filters Section */
.filters-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(31, 31, 31, 0.8) 0%, rgba(24, 24, 27, 0.8) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
}

:global(.light) .filters-section {
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%);
    border-color: #e2e8f0;
}

@media (min-width: 640px) {
    .filters-section {
        flex-wrap: nowrap;
    }
}

.search-container {
    position: relative;
    flex: 1;
    max-width: 400px;
    min-width: 200px;
}

.filters-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-shrink: 0;
}

.page-size-select {
    padding: 0.75rem 1rem;
    border: 1px solid rgb(82, 82, 91);
    border-radius: 0.5rem;
    background: linear-gradient(135deg, rgba(39, 39, 42, 0.8) 0%, rgba(24, 24, 27, 0.8) 100%);
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    backdrop-filter: blur(5px);
}

:global(.light) .page-size-select {
    border-color: rgb(203, 213, 225);
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%);
    color: rgb(51, 65, 85);
}

.page-size-select:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
}

/* Content Area */
.alliances-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    flex: 1;
    min-height: 0;
}

/* Alliances List */
.alliances-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.alliance-card {
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgb(63, 63, 70);
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
}

:global(.light) .alliance-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.alliance-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent);
}

:global(.light) .alliance-card::before {
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
}

.alliance-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

/* Alliance Info Section */
.alliance-info-section {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

:global(.light) .alliance-info-section {
    border-color: #e2e8f0;
}

.alliance-avatar {
    flex-shrink: 0;
}

.alliance-details {
    flex: 1;
    min-width: 0;
}

.alliance-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.light) .alliance-name {
    color: #1e293b;
    background: none;
    -webkit-text-fill-color: initial;
}

.alliance-name a {
    color: inherit;
    text-decoration: none;
    transition: all 0.2s ease;
}

.alliance-name a:hover {
    color: rgb(59, 130, 246);
}

:global(.light) .alliance-name a:hover {
    color: #3b82f6;
}

.alliance-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.alliance-meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

:global(.light) .alliance-meta-item {
    color: #64748b;
}

.meta-icon {
    width: 1rem;
    height: 1rem;
}

/* Action Buttons Row */
.alliance-actions-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
}

.action-btn-slim {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid rgb(63, 63, 70);
    background: rgb(39, 39, 42);
    color: rgb(209, 213, 219);
    transition: all 0.2s ease;
    cursor: pointer;
    min-height: 2rem;
}

:global(.light) .action-btn-slim {
    background: #ffffff;
    border-color: #d1d5db;
    color: #374151;
}

.action-btn-slim:hover:not(:disabled) {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn-slim:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-btn-icon {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
}

.refresh-btn {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.refresh-btn:hover {
    background: #2563eb;
    border-color: #2563eb;
}

.edit-btn {
    background: #059669;
    color: white;
    border-color: #059669;
}

.edit-btn:hover {
    background: #047857;
    border-color: #047857;
}

.delete-btn {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
}

.delete-btn:hover {
    background: #dc2626;
    border-color: #dc2626;
}

/* States */
.loading-container,
.error-container,
.empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
    color: rgb(156, 163, 175);
    padding: 3rem;
}

:global(.light) .loading-container,
:global(.light) .error-container,
:global(.light) .empty-container {
    color: rgb(100, 116, 139);
}

.loading-content,
.error-content,
.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.loading-icon,
.error-icon,
.empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(59, 130, 246);
}

.error-icon {
    color: rgb(239, 68, 68);
}

.empty-icon {
    color: rgb(156, 163, 175);
}

.loading-text,
.error-text,
.empty-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: white;
    margin: 0;
}

:global(.light) .loading-text,
:global(.light) .error-text,
:global(.light) .empty-title {
    color: rgb(15, 23, 42);
}

.empty-description {
    color: rgb(156, 163, 175);
    margin: 0;
}

:global(.light) .empty-description {
    color: rgb(100, 116, 139);
}

.error-retry,
.empty-action {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s;
    cursor: pointer;
}

.error-retry:hover,
.empty-action:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
}

/* Empty State */
.empty-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
}

.empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(156, 163, 175);
}

:global(.light) .empty-icon {
    color: #64748b;
}

.empty-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: white;
    margin: 0;
}

:global(.light) .empty-title {
    color: #1e293b;
}

.empty-description {
    color: rgb(156, 163, 175);
    margin: 0;
}

:global(.light) .empty-description {
    color: #64748b;
}

/* Pagination */
.pagination-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    margin-top: 1.5rem;
}

:global(.light) .pagination-container {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
}

.pagination-info {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

:global(.light) .pagination-info {
    color: #64748b;
}

.pagination-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    border: 1px solid rgb(75, 85, 99);
    color: white;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    cursor: pointer;
    margin: 0 0.25rem;
}

.pagination-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%);
}

.pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

:global(.light) .pagination-btn {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    color: #1e293b;
    border-color: #e2e8f0;
}

:global(.light) .pagination-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

/* Search input styling */
.search-input {
    position: relative;
    width: 100%;
    max-width: 400px;
}

.search-input input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
}

:global(.dark) .search-input input {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
}

.search-input input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-status {
    font-size: 0.75rem;
    margin-top: 0.25rem;
    color: #6b7280;
}

:global(.dark) .search-status {
    color: #9ca3af;
}

.search-status.searching {
    color: #3b82f6;
}

.search-status.error {
    color: #ef4444;
}

/* Modal Styles - Consistent with AdminCharacters and AdminCorporations */
.modal-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
}

:global(.dark) .form-group label {
    color: #d1d5db;
}

.form-input,
.form-search {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: all 0.2s;
}

:global(.dark) .form-input,
:global(.dark) .form-search {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
}

.form-input:focus,
.form-search:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
}

.btn-primary,
.btn-secondary,
.btn-danger {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s;
    cursor: pointer;
}

.btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: 1px solid #3b82f6;
}

.btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
    background: transparent;
    color: #6b7280;
    border: 1px solid #d1d5db;
}

:global(.dark) .btn-secondary {
    color: #9ca3af;
    border-color: #4b5563;
}

.btn-secondary:hover:not(:disabled) {
    background: #f9fafb;
    color: #374151;
}

:global(.dark) .btn-secondary:hover:not(:disabled) {
    background: #374151;
    color: #f9fafb;
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: 1px solid #ef4444;
}

.btn-danger:hover:not(:disabled) {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
}

.warning-icon {
    width: 3rem;
    height: 3rem;
    color: #f59e0b;
}

.warning-text {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
}

:global(.dark) .warning-text {
    color: #9ca3af;
}

.alliance-info {
    padding: 0.75rem;
    background: #f3f4f6;
    border-radius: 0.375rem;
    font-weight: 500;
}

:global(.dark) .alliance-info {
    background: #374151;
    color: #f9fafb;
}

.alliance-info .ticker {
    color: #6b7280;
    font-weight: normal;
    margin-left: 0.5rem;
}

:global(.dark) .alliance-info .ticker {
    color: #9ca3af;
}
</style>
