<template>
    <div class="admin-corporations">
        <div class="corporations-header">
            <div class="header-info">
                <h3 class="corporations-title">{{ t('admin.corporations.title') }}</h3>
                <p class="corporations-description">{{ t('admin.corporations.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="clearSearch" v-if="searchQuery.length > 0" class="action-btn clear-search-btn">
                    <Icon name="heroicons:x-mark" class="action-icon" />
                    {{ t('admin.corporations.clearSearch') }}
                </button>
                <button @click="() => refreshData()" class="action-btn refresh-btn"
                    :disabled="displayPending || isSearchMode">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': displayPending }" />
                    {{ t('admin.corporations.refresh') }}
                </button>
            </div>
        </div>

        <!-- Filters and Search -->
        <div class="filters-section">
            <div class="search-container">
                <div class="search-input-wrapper">
                    <Icon name="heroicons:magnifying-glass" class="search-icon" />
                    <input v-model="searchQuery" type="text"
                        :placeholder="isSearchMode ? t('admin.corporations.searchActive') : t('admin.corporations.search')"
                        class="search-input" :class="{ 'search-active': isSearchMode }" />
                    <button v-if="searchQuery.length > 0" @click="clearSearch" class="clear-search-btn">
                        <Icon name="heroicons:x-mark" class="w-4 h-4" />
                    </button>
                </div>
                <div v-if="isSearchMode" class="search-status">
                    <Icon name="heroicons:magnifying-glass" class="search-status-icon" />
                    <span v-if="searchPending" class="search-status-text">{{ t('search.searching') }}...</span>
                    <span v-else-if="searchResults.length > 0" class="search-status-text">
                        {{ t('admin.corporations.searchResults', { count: searchResults.length }) }}
                    </span>
                    <span v-else class="search-status-text">{{ t('search.noResults') }}</span>
                </div>
            </div>

            <div class="filters-row" v-if="!isSearchMode">
                <select v-model="pageSize" class="page-size-select" :aria-label="'Items per page'"
                    @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.corporations.perPage') }}</option>
                    <option value="25">25 {{ t('admin.corporations.perPage') }}</option>
                    <option value="50">50 {{ t('admin.corporations.perPage') }}</option>
                    <option value="100">100 {{ t('admin.corporations.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="displayPending" class="loading-container">
            <div class="loading-content">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ isSearchMode ? t('search.searching') : t('admin.corporations.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="!isSearchMode && error" class="error-container">
            <div class="error-content">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.corporations.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.corporations.retry') }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-else-if="displayData?.corporations && displayData.corporations.length > 0" class="corporations-content">
            <!-- Corporations List -->
            <div class="corporations-list">
                <div v-for="corporation in displayData.corporations" :key="corporation.corporation_id"
                    class="corporation-card">
                    <!-- Corporation Info -->
                    <div class="corporation-info-section">
                        <div class="corporation-avatar">
                            <Image :type="'corporation'" :id="corporation.corporation_id" :size="64" />
                        </div>
                        <div class="corporation-details">
                            <h4 class="corporation-name">
                                <NuxtLink :to="`/corporation/${corporation.corporation_id}`">
                                    {{ corporation.name || `Corporation ${corporation.corporation_id}` }}
                                </NuxtLink>
                            </h4>
                            <div class="corporation-meta">
                                <div v-if="corporation.ticker" class="corporation-meta-item">
                                    <Icon name="heroicons:hashtag" class="meta-icon" />
                                    <span>{{ corporation.ticker }}</span>
                                </div>
                                <div v-if="corporation.alliance_id" class="corporation-meta-item">
                                    <Icon name="heroicons:shield-check" class="meta-icon" />
                                    <span>Alliance ID: {{ corporation.alliance_id }}</span>
                                </div>
                                <div v-if="corporation.member_count" class="corporation-meta-item">
                                    <Icon name="heroicons:users" class="meta-icon" />
                                    <span>Members: {{ corporation.member_count.toLocaleString() }}</span>
                                </div>
                                <div class="corporation-meta-item">
                                    <Icon name="heroicons:calendar" class="meta-icon" />
                                    <span>Updated: {{ formatDateRelative(corporation.updatedAt) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="corporation-actions-row">
                        <button @click="refreshCorporation(corporation)" class="action-btn-slim refresh-btn">
                            <Icon name="heroicons:arrow-path" class="action-btn-icon" />
                            Refresh
                        </button>
                        <button @click="editCorporation(corporation)" class="action-btn-slim edit-btn">
                            <Icon name="heroicons:pencil-square" class="action-btn-icon" />
                            Edit
                        </button>
                        <button @click="deleteCorporation(corporation)" class="action-btn-slim delete-btn">
                            <Icon name="heroicons:trash" class="action-btn-icon" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-container">
            <div class="empty-content">
                <Icon name="heroicons:building-office-2" class="empty-icon" />
                <h4 class="empty-title">{{ t('admin.corporations.empty') }}</h4>
                <p class="empty-description">{{ t('admin.corporations.noCorporationsFound') }}</p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="!isSearchMode && displayData?.pagination && displayData.pagination.totalPages > 1"
            class="pagination-container">
            <button @click="changePage(1)" :disabled="!displayData.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.corporations.pagination.first') }}
            </button>
            <button @click="changePage(displayData.pagination.currentPage - 1)"
                :disabled="!displayData.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.corporations.pagination.previous') }}
            </button>

            <span class="pagination-info">
                {{ t('admin.corporations.pagination.page', {
                    current: displayData.pagination.currentPage,
                    total: displayData.pagination.totalPages
                }) }}
            </span>

            <button @click="changePage(displayData.pagination.currentPage + 1)"
                :disabled="!displayData.pagination.hasNextPage" class="pagination-btn">
                {{ t('admin.corporations.pagination.next') }}
            </button>
            <button @click="changePage(displayData.pagination.totalPages)"
                :disabled="!displayData.pagination.hasNextPage" class="pagination-btn">
                {{ t('admin.corporations.pagination.last') }}
            </button>
        </div>

        <!-- Edit Modal -->
        <Modal :is-open="showEditModal" :title="`Edit Corporation: ${selectedCorporation?.name}`" size="lg"
            @close="closeModals">
            <div class="edit-form">
                <div class="form-row">
                    <div class="form-field">
                        <label>Name</label>
                        <input v-model="editForm.name" type="text" class="form-input" placeholder="Corporation name" />
                    </div>
                    <div class="form-field">
                        <label>Ticker</label>
                        <input v-model="editForm.ticker" type="text" class="form-input"
                            placeholder="Corporation ticker" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label>Alliance</label>
                        <div v-if="selectedAlliance" class="selected-entity">
                            <span class="entity-name">{{ selectedAlliance.name }}</span>
                            <button @click="clearAlliance" class="clear-entity-btn">
                                <Icon name="heroicons:x-mark" class="w-4 h-4" />
                            </button>
                        </div>
                        <Search v-else v-model="allianceSearchQuery" placeholder="Search for alliance..."
                            :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                            :transform-response="(response) => response.alliances || []" result-key="id"
                            result-name="name" @select="onAllianceSelected" />
                    </div>
                    <div class="form-field">
                        <label>CEO</label>
                        <div v-if="selectedCeo" class="selected-entity">
                            <span class="entity-name">{{ selectedCeo.name }}</span>
                            <button @click="clearCeo" class="clear-entity-btn">
                                <Icon name="heroicons:x-mark" class="w-4 h-4" />
                            </button>
                        </div>
                        <Search v-else v-model="ceoSearchQuery" placeholder="Search for CEO..."
                            :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                            :transform-response="(response) => response.characters || []" result-key="id"
                            result-name="name" @select="onCeoSelected" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label>Member Count</label>
                        <input v-model.number="editForm.member_count" type="number" class="form-input"
                            placeholder="Member count" min="0" />
                    </div>
                    <div class="form-field">
                        <label>Tax Rate (%)</label>
                        <input v-model.number="editForm.tax_rate" type="number" class="form-input"
                            placeholder="Tax rate" min="0" max="100" step="0.1" />
                    </div>
                </div>

                <div class="form-field">
                    <label>Description</label>
                    <textarea v-model="editForm.description" class="form-textarea" placeholder="Corporation description"
                        rows="3"></textarea>
                </div>

                <div class="form-field">
                    <label>URL</label>
                    <input v-model="editForm.url" type="url" class="form-input" placeholder="Corporation URL" />
                </div>

                <div class="form-actions">
                    <button @click="closeModals" class="btn-secondary" :disabled="isLoading">
                        Cancel
                    </button>
                    <button @click="saveCorporationEdit" class="btn-primary" :disabled="isLoading">
                        <Icon v-if="isLoading" name="heroicons:arrow-path" class="animate-spin w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </Modal>

        <!-- Delete Confirmation Modal -->
        <Modal :is-open="showDeleteModal" :title="`Delete Corporation`" size="sm" @close="closeModals">
            <div class="delete-confirmation">
                <div class="warning-icon">
                    <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 text-red-500" />
                </div>
                <p class="delete-message">
                    Are you sure you want to delete the corporation
                    <strong>"{{ selectedCorporation?.name }}"</strong>?
                </p>
                <p class="delete-warning">
                    This action will mark the corporation as deleted. This action cannot be undone.
                </p>
                <div class="form-actions">
                    <button @click="closeModals" class="btn-secondary" :disabled="isLoading">
                        Cancel
                    </button>
                    <button @click="confirmDelete" class="btn-danger" :disabled="isLoading">
                        <Icon v-if="isLoading" name="heroicons:arrow-path" class="animate-spin w-4 h-4" />
                        Delete Corporation
                    </button>
                </div>
            </div>
        </Modal>
    </div>
</template>

<script setup lang="ts">

interface Corporation {
    corporation_id: number;
    name: string;
    ticker?: string;
    description?: string;
    date_founded?: string;
    alliance_id?: number;
    faction_id?: number;
    faction_name?: string;
    ceo_id?: number;
    creator_id?: number;
    home_station_id?: number;
    home_station_name?: string;
    member_count?: number;
    shares?: number;
    tax_rate?: number;
    url?: string;
    deleted?: boolean;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

interface CorporationsResponse {
    corporations: Corporation[];
    stats: {
        total: number;
        active: number;
        deleted: number;
    };
    pagination: {
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        total: number;
    };
}

const { t } = useI18n();

// Reactive state
const currentPage = ref(1);
const pageSize = ref(25);
const searchQuery = ref('');
const searchResults = ref<Corporation[]>([]);
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
        const corporationHits = response?.hits?.filter((hit: any) => hit.type === 'corporation') || [];

        // Transform search results to Corporation format
        searchResults.value = corporationHits.map((hit: any) => ({
            corporation_id: hit.id,
            name: hit.name,
            ticker: hit.ticker || undefined,
            deleted: hit.deleted || false,
            updatedAt: hit.updatedAt || new Date().toISOString(),
            createdAt: hit.updatedAt || new Date().toISOString(),
            // Set other fields as undefined since search API doesn't provide them
            description: undefined,
            date_founded: undefined,
            alliance_id: undefined,
            faction_id: undefined,
            faction_name: undefined,
            ceo_id: undefined,
            creator_id: undefined,
            home_station_id: undefined,
            home_station_name: undefined,
            member_count: undefined,
            shares: undefined,
            tax_rate: undefined,
            url: undefined,
            error: undefined,
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

    return `/api/admin/corporations?${params.toString()}`;
});

// Fetch regular data (only when not in search mode)
const { data, pending, error, refresh: refreshData } = useAsyncData<CorporationsResponse>(
    'admin-corporations',
    () => $fetch(apiEndpoint.value),
    {
        server: false,
        watch: [currentPage, pageSize],
        default: () => ({
            corporations: [],
            stats: { total: 0, active: 0, deleted: 0 },
            pagination: { currentPage: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, total: 0 }
        })
    }
);

// Computed data that shows either search results or regular data
const displayData = computed(() => {
    if (isSearchMode.value) {
        return {
            corporations: searchResults.value,
            stats: {
                total: searchResults.value.length,
                active: searchResults.value.filter(c => !c.deleted).length,
                deleted: searchResults.value.filter(c => c.deleted).length
            },
            pagination: {
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                total: searchResults.value.length
            }
        };
    }
    return data.value || {
        corporations: [],
        stats: { total: 0, active: 0, deleted: 0 },
        pagination: { currentPage: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, total: 0 }
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

// Modal and form state
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedCorporation = ref<Corporation | null>(null);
const isLoading = ref(false);

// Toast notifications
const toast = useToast();

// Edit form state
const editForm = ref({
    name: '',
    ticker: '',
    alliance_id: null as number | null,
    ceo_id: null as number | null,
    member_count: null as number | null,
    tax_rate: null as number | null,
    description: '',
    url: ''
});

// Selected entity state for search components
const selectedAlliance = ref<any>(null);
const selectedCeo = ref<any>(null);

// Search query state for modal search components
const allianceSearchQuery = ref('');
const ceoSearchQuery = ref('');

// Entity selection handlers
const onAllianceSelected = (alliance: any) => {
    selectedAlliance.value = alliance;
    editForm.value.alliance_id = alliance.id;
};

const clearAlliance = () => {
    selectedAlliance.value = null;
    editForm.value.alliance_id = null;
};

const onCeoSelected = (character: any) => {
    selectedCeo.value = character;
    editForm.value.ceo_id = character.id;
};

const clearCeo = () => {
    selectedCeo.value = null;
    editForm.value.ceo_id = null;
};

// Close modals and reset state
const closeModals = () => {
    showEditModal.value = false;
    showDeleteModal.value = false;
    selectedCorporation.value = null;

    // Reset selected entities
    selectedAlliance.value = null;
    selectedCeo.value = null;

    // Reset search queries
    allianceSearchQuery.value = '';
    ceoSearchQuery.value = '';

    // Reset form
    editForm.value = {
        name: '',
        ticker: '',
        alliance_id: null,
        ceo_id: null,
        member_count: null,
        tax_rate: null,
        description: '',
        url: ''
    };
};

const refreshCorporation = async (corporation: Corporation) => {
    try {
        isLoading.value = true;

        const result = await $fetch(`/api/admin/corporations/${corporation.corporation_id}/refresh`, {
            method: 'POST'
        });

        if (result.success) {
            toast.add({
                title: 'Success',
                description: result.message,
                color: 'success'
            });

            if (result.changes && result.changes.length > 0) {
                console.log('Corporation changes detected:', result.changes);
            }

            // Refresh the data
            await refreshData();
        }
    } catch (error: any) {
        console.error('Failed to refresh corporation:', error);
        toast.add({
            title: 'Error',
            description: error.data?.message || 'Failed to refresh corporation data',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

const editCorporation = async (corporation: Corporation) => {
    selectedCorporation.value = corporation;
    isLoading.value = true;

    try {
        // Fetch full corporation data from admin API
        const fullCorporationData = await $fetch(`/api/admin/corporations/${corporation.corporation_id}`) as any;

        // Populate form with full corporation data
        const fullCorporation = fullCorporationData.corporation as any;
        editForm.value = {
            name: fullCorporation.name || '',
            ticker: fullCorporation.ticker || '',
            alliance_id: fullCorporation.alliance_id || null,
            ceo_id: fullCorporation.ceo_id || null,
            member_count: fullCorporation.member_count || null,
            tax_rate: fullCorporation.tax_rate || null,
            description: fullCorporation.description || '',
            url: fullCorporation.url || ''
        };

        // Store the related entity names for display in search components
        selectedAlliance.value = fullCorporationData.names?.allianceName ? {
            id: fullCorporation.alliance_id,
            name: fullCorporationData.names.allianceName,
            type: 'alliance'
        } : null;

        selectedCeo.value = fullCorporationData.names?.ceoName ? {
            id: fullCorporation.ceo_id,
            name: fullCorporationData.names.ceoName,
            type: 'character'
        } : null;

        showEditModal.value = true;
    } catch (error) {
        console.error('Failed to load corporation data:', error);
        toast.add({
            title: 'Error',
            description: 'Failed to load corporation data for editing',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

const saveCorporationEdit = async () => {
    if (!selectedCorporation.value) return;

    try {
        isLoading.value = true;

        const result = await $fetch(`/api/admin/corporations/${selectedCorporation.value.corporation_id}/edit`, {
            method: 'POST',
            body: editForm.value
        });

        if (result.success) {
            toast.add({
                title: 'Success',
                description: result.message,
                color: 'success'
            });

            // Refresh the data and close modal
            await refreshData();
            closeModals();
        }
    } catch (error: any) {
        console.error('Failed to update corporation:', error);
        toast.add({
            title: 'Error',
            description: error.data?.message || 'Failed to update corporation',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

const deleteCorporation = (corporation: Corporation) => {
    selectedCorporation.value = corporation;
    showDeleteModal.value = true;
};

const confirmDelete = async () => {
    if (!selectedCorporation.value) return;

    try {
        isLoading.value = true;

        const result = await $fetch(`/api/admin/corporations/${selectedCorporation.value.corporation_id}/delete`, {
            method: 'POST'
        });

        if (result.success) {
            toast.add({
                title: 'Success',
                description: result.message,
                color: 'success'
            });

            // Refresh the data and close modal
            await refreshData();
            closeModals();
        }
    } catch (error: any) {
        console.error('Failed to delete corporation:', error);
        toast.add({
            title: 'Error',
            description: error.data?.message || 'Failed to delete corporation',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

</script>

<style scoped>
.admin-corporations {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
}

/* Header */
.corporations-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

:global(.light) .corporations-header {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.header-info {
    flex: 1;
}

.corporations-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.light) .corporations-title {
    color: #1e293b;
    background: none;
    -webkit-text-fill-color: initial;
}

.corporations-description {
    color: rgb(156, 163, 175);
    line-height: 1.6;
    font-size: 0.95rem;
}

:global(.light) .corporations-description {
    color: #64748b;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    color: white;
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
    background: linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

:global(.light) .action-btn {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    color: #1e293b;
    border-color: #e2e8f0;
}

:global(.light) .action-btn:hover {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

/* Filters */
.filters-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border-radius: 0.75rem;
    border: 1px solid rgb(63, 63, 70);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin-bottom: 1.5rem;
}

:global(.light) .filters-section {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
}

.search-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 600px;
}

.search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(156, 163, 175);
    z-index: 2;
}

:global(.light) .search-icon {
    color: #64748b;
}

.search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 3rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    color: white;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input.search-active {
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:global(.light) .search-input {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    color: #1e293b;
    border-color: #e2e8f0;
}

:global(.light) .search-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search-btn {
    position: absolute;
    right: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background: rgba(156, 163, 175, 0.1);
    border: none;
    border-radius: 0.25rem;
    color: rgb(156, 163, 175);
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-search-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
}

:global(.light) .clear-search-btn {
    background: rgba(100, 116, 139, 0.1);
    color: #64748b;
}

:global(.light) .clear-search-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.search-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.375rem;
    font-size: 0.875rem;
}

.search-status-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(59, 130, 246);
}

.search-status-text {
    color: rgb(209, 213, 219);
}

:global(.light) .search-status {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.15);
}

:global(.light) .search-status-text {
    color: #374151;
}

.clear-search-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%);
    color: white;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.clear-search-btn:hover {
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
}

.filters-row {
    display: flex;
    gap: 1.25rem;
    align-items: center;
    flex-wrap: wrap;
}

.page-size-select {
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(45, 55, 72) 100%);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    color: white;
    font-size: 0.9rem;
    min-width: 160px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.page-size-select:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:global(.light) .page-size-select {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    color: #1e293b;
    border-color: #e2e8f0;
}

/* Loading/Error States */
.loading-container,
.error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
}

.loading-content,
.error-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
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
    font-size: 1rem;
}

:global(.light) .loading-text,
:global(.light) .error-text {
    color: #64748b;
}

.error-retry {
    padding: 0.5rem 1rem;
    background-color: rgb(239, 68, 68);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.error-retry:hover {
    background-color: rgb(220, 38, 38);
}

/* Corporations List */
.corporations-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.corporation-card {
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgb(63, 63, 70);
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
}

:global(.light) .corporation-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.corporation-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent);
}

:global(.light) .corporation-card::before {
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
}

.corporation-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

/* Corporation Info Section */
.corporation-info-section {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

:global(.light) .corporation-info-section {
    border-bottom-color: #e2e8f0;
}

.corporation-avatar {
    flex-shrink: 0;
}

.corporation-details {
    flex: 1;
    min-width: 0;
}

.corporation-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.light) .corporation-name {
    color: #1e293b;
    background: none;
    -webkit-text-fill-color: initial;
}

.corporation-name a {
    color: inherit;
    text-decoration: none;
    transition: all 0.2s ease;
}

.corporation-name a:hover {
    color: rgb(59, 130, 246);
}

:global(.light) .corporation-name a:hover {
    color: #3b82f6;
}

.corporation-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.corporation-meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

:global(.light) .corporation-meta-item {
    color: #64748b;
}

.meta-icon {
    width: 1rem;
    height: 1rem;
}

/* Action Buttons Row */
.corporation-actions-row {
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

/* Modal Forms */
.edit-form {
    padding: 1rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-field label {
    font-weight: 500;
    color: rgb(209, 213, 219);
    font-size: 0.875rem;
}

:global(.light) .form-field label {
    color: #374151;
}

.form-input,
.form-textarea {
    padding: 0.75rem;
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    background: rgb(31, 41, 55);
    color: white;
    font-size: 0.875rem;
    transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:global(.light) .form-input,
:global(.light) .form-textarea {
    background: white;
    color: #1f2937;
    border-color: #d1d5db;
}

:global(.light) .form-input:focus,
:global(.light) .form-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgb(75, 85, 99);
}

:global(.light) .form-actions {
    border-top-color: #e5e7eb;
}

.btn-primary,
.btn-secondary,
.btn-danger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s;
    cursor: pointer;
    border: none;
}

.btn-primary {
    background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%);
}

.btn-secondary {
    background: linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%);
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background: linear-gradient(135deg, rgb(55, 65, 81) 0%, rgb(31, 41, 55) 100%);
}

.btn-danger {
    background: linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%);
    color: white;
}

.btn-danger:hover:not(:disabled) {
    background: linear-gradient(135deg, rgb(220, 38, 38) 0%, rgb(185, 28, 28) 100%);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Selected Entity Display */
.selected-entity {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: rgb(31, 41, 55);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    color: white;
}

:global(.light) .selected-entity {
    background: white;
    color: #1f2937;
    border-color: #d1d5db;
}

.entity-name {
    font-weight: 500;
}

.clear-entity-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    background: rgb(75, 85, 99);
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
}

.clear-entity-btn:hover {
    background: rgb(107, 114, 128);
}

:global(.light) .clear-entity-btn {
    background: #e5e7eb;
    color: #6b7280;
}

:global(.light) .clear-entity-btn:hover {
    background: #d1d5db;
}

/* Delete Confirmation */
.delete-confirmation {
    padding: 1rem;
    text-align: center;
}

.warning-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
}

.delete-message {
    color: rgb(209, 213, 219);
    margin-bottom: 0.5rem;
    font-size: 1rem;
}

:global(.light) .delete-message {
    color: #374151;
}

.delete-warning {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
}

:global(.light) .delete-warning {
    color: #6b7280;
}
</style>
