<template>
    <div class="admin-domains">
        <div class="domains-header">
            <div class="header-info">
                <h3 class="domains-title">{{ t('admin.domains.title') }}</h3>
                <p class="domains-description">{{ t('admin.domains.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="() => refreshData()" class="action-btn refresh-btn" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.domains.refresh') }}
                </button>
            </div>
        </div>

        <!-- Filters and Search -->
        <div class="filters-section">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.domains.search')"
                    class="search-input" />
                <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn"
                    :title="t('admin.domains.clearSearch')">
                    <Icon name="heroicons:x-mark" class="clear-icon" />
                </button>
            </div>

            <div class="filters-row">
                <div class="filter-group">
                    <select v-model="statusFilter" class="filter-select">
                        <option value="all">{{ t('admin.domains.allStatuses') }}</option>
                        <option value="pending">{{ t('admin.domains.pending') }}</option>
                        <option value="verified">{{ t('admin.domains.verified') }}</option>
                        <option value="suspended">{{ t('admin.domains.suspended') }}</option>
                    </select>
                </div>
                <div class="filter-group">
                    <select v-model="entityTypeFilter" class="filter-select">
                        <option value="all">{{ t('admin.domains.allEntityTypes') }}</option>
                        <option value="character">{{ t('admin.domains.character') }}</option>
                        <option value="corporation">{{ t('admin.domains.corporation') }}</option>
                        <option value="alliance">{{ t('admin.domains.alliance') }}</option>
                    </select>
                </div>
                <select v-model="pageSize" class="page-size-select" :aria-label="'Items per page'"
                    @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.domains.perPage') }}</option>
                    <option value="25">25 {{ t('admin.domains.perPage') }}</option>
                    <option value="50">50 {{ t('admin.domains.perPage') }}</option>
                    <option value="100">100 {{ t('admin.domains.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="loading-container">
            <div class="loading-content">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.domains.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
            <div class="error-content">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.domains.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.domains.retry') }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-else-if="data?.domains && data.domains.length > 0" class="domains-content">
            <!-- Statistics Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon-container verified">
                        <Icon name="heroicons:check-circle" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.verifiedDomains') }}</div>
                        <div class="stat-value">{{ data.stats.verified }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container pending">
                        <Icon name="heroicons:clock" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.pendingDomains') }}</div>
                        <div class="stat-value">{{ data.stats.pending }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container failed">
                        <Icon name="heroicons:exclamation-triangle" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.suspendedDomains') }}</div>
                        <div class="stat-value">{{ data.stats.suspended || 0 }}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container total">
                        <Icon name="heroicons:globe-alt" class="stat-icon" />
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">{{ t('admin.domains.totalDomains') }}</div>
                        <div class="stat-value">{{ data.stats.total }}</div>
                    </div>
                </div>
            </div>

            <!-- Domains List -->
            <div class="domains-list">
                <div v-for="domain in data.domains" :key="domain._id" class="domain-card">
                    <div class="domain-header">
                        <div class="domain-name">
                            <Icon name="heroicons:globe-alt" class="domain-icon" />
                            <h4 class="domain-title">{{ domain.domain }}</h4>
                            <StatusBadge :status="mapDomainStatus(domain.status)" class="domain-status" />
                        </div>
                        <div class="domain-actions">
                            <button @click="viewDomainDetails(domain)" class="action-btn view-btn">
                                <Icon name="heroicons:eye" class="action-btn-icon" />
                                {{ t('admin.domains.actions.view') }}
                            </button>
                            <button @click="toggleDomainStatus(domain)" class="action-btn status-btn"
                                :class="{ 'active': domain.status === 'verified' }">
                                <Icon :name="domain.status === 'verified' ? 'heroicons:pause' : 'heroicons:play'"
                                    class="action-btn-icon" />
                                {{ domain.status === 'verified' ? t('admin.domains.actions.suspend') :
                                    t('admin.domains.actions.activate')
                                }}
                            </button>
                            <button @click="deleteDomain(domain)" class="action-btn delete-btn">
                                <Icon name="heroicons:trash" class="action-btn-icon" />
                                {{ t('admin.domains.actions.delete') }}
                            </button>
                        </div>
                    </div>

                    <div class="domain-details">
                        <div class="detail-row">
                            <div class="detail-item">
                                <Icon name="heroicons:building-office" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.entity') }}:</span>
                                <span class="detail-value">{{ domain.entity_name }} ({{
                                    formatEntityType(domain.entity_type) }})</span>
                            </div>
                            <div class="detail-item">
                                <Icon name="heroicons:user" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.owner') }}:</span>
                                <NuxtLink :to="`/character/${domain.owner_character_id}`" class="detail-link">
                                    {{ domain.owner_character_name }}
                                </NuxtLink>
                            </div>
                        </div>

                        <div class="detail-row">
                            <div class="detail-item">
                                <Icon name="heroicons:calendar" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.created') }}:</span>
                                <span class="detail-value">{{ formatDate(domain.created_at) }}</span>
                            </div>
                            <div v-if="domain.verified_at" class="detail-item">
                                <Icon name="heroicons:check-circle" class="detail-icon" />
                                <span class="detail-label">{{ t('admin.domains.columns.verified') }}:</span>
                                <span class="detail-value">{{ formatDate(domain.verified_at) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-container">
            <div class="empty-content">
                <Icon name="heroicons:globe-alt" class="empty-icon" />
                <h4 class="empty-title">{{ t('admin.domains.empty') }}</h4>
                <p class="empty-description">{{ t('admin.domains.noDomainsFound') }}</p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="data?.pagination && data.pagination.totalPages > 1" class="pagination-container">
            <button @click="changePage(1)" :disabled="!data.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.domains.pagination.first') }}
            </button>
            <button @click="changePage(data.pagination.currentPage - 1)" :disabled="!data.pagination.hasPrevPage"
                class="pagination-btn">
                {{ t('admin.domains.pagination.previous') }}
            </button>

            <span class="pagination-info">
                {{ t('admin.domains.pagination.page', {
                    current: data.pagination.currentPage,
                    total: data.pagination.totalPages
                }) }}
            </span>

            <button @click="changePage(data.pagination.currentPage + 1)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.domains.pagination.next') }}
            </button>
            <button @click="changePage(data.pagination.totalPages)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.domains.pagination.last') }}
            </button>
        </div>

        <!-- Domain Details Modal -->
        <Modal v-if="selectedDomain" :is-open="showDetailsModal" @close="closeDetailsModal"
            :title="`${t('admin.domains.details.title')} - ${selectedDomain.domain}`" size="lg">
            <div class="domain-details-modal">
                <div class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.basicInfo') }}</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>{{ t('admin.domains.columns.domain') }}:</label>
                            <span>{{ selectedDomain.domain }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.columns.status') }}:</label>
                            <StatusBadge :status="mapDomainStatus(selectedDomain.status)" />
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.entityType') }}:</label>
                            <span>{{ formatEntityType(selectedDomain.entity_type) }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.entityName') }}:</label>
                            <span>{{ selectedDomain.entity_name }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.entityId') }}:</label>
                            <span>{{ selectedDomain.entity_id }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.ownerId') }}:</label>
                            <span>{{ selectedDomain.owner_character_id }}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.verificationInfo') }}</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.verificationMethod') }}:</label>
                            <span>{{ selectedDomain.verification_method || 'Not verified' }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.verificationToken') }}:</label>
                            <span class="verification-token">{{ selectedDomain.verification_token }}</span>
                        </div>
                        <div class="detail-item">
                            <label>{{ t('admin.domains.details.created') }}:</label>
                            <span>{{ formatDate(selectedDomain.created_at) }}</span>
                        </div>
                        <div v-if="selectedDomain.verified_at" class="detail-item">
                            <label>{{ t('admin.domains.details.lastVerified') }}:</label>
                            <span>{{ formatDate(selectedDomain.verified_at) }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="selectedDomain.branding" class="details-section">
                    <h4 class="section-title">{{ t('admin.domains.details.customBranding') }}</h4>
                    <div class="branding-preview">
                        <div v-if="selectedDomain.branding.primary_color" class="branding-item">
                            <label>{{ t('admin.domains.details.primaryColor') }}:</label>
                            <div class="color-preview">
                                <div class="color-swatch"
                                    :style="{ backgroundColor: selectedDomain.branding.primary_color }"></div>
                                <span>{{ selectedDomain.branding.primary_color }}</span>
                            </div>
                        </div>
                        <div v-if="selectedDomain.branding.logo_url" class="branding-item">
                            <label>{{ t('admin.domains.details.logoUrl') }}:</label>
                            <img :src="selectedDomain.branding.logo_url" :alt="selectedDomain.entity_name"
                                class="logo-preview" />
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <button @click="closeDetailsModal" class="btn btn-secondary">
                    {{ t('admin.domains.details.close') }}
                </button>
            </template>
        </Modal>

        <!-- Delete Confirmation Modal -->
        <Modal :is-open="showDeleteModal" @close="showDeleteModal = false"
            :title="t('admin.domains.moderation.deleteDomain')" size="sm">
            <div class="delete-confirmation">
                <Icon name="heroicons:exclamation-triangle" class="warning-icon" />
                <p>{{ t('admin.domains.moderation.deleteDomainConfirm') }}</p>
                <div class="confirm-details">
                    <p><strong>{{ t('admin.domains.columns.domain') }}:</strong> {{ domainToDelete?.domain }}</p>
                    <p><strong>{{ t('admin.domains.columns.entity') }}:</strong> {{ domainToDelete?.entity_name }}</p>
                    <p><strong>{{ t('admin.domains.columns.owner') }}:</strong> {{ domainToDelete?.owner_character_name
                        }}</p>
                </div>
            </div>

            <template #footer>
                <button @click="showDeleteModal = false" class="btn btn-secondary">
                    {{ t('admin.domains.moderation.cancel') }}
                </button>
                <button @click="confirmDeleteDomain" class="btn btn-danger" :disabled="deleting">
                    <Icon v-if="deleting" name="heroicons:arrow-path" class="btn-icon animate-spin" />
                    {{ t('admin.domains.actions.delete') }}
                </button>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">

interface Domain {
    _id: string;
    domain: string;
    entity_type: 'corporation' | 'alliance';
    entity_id: number;
    entity_name: string;
    owner_character_id: number;
    owner_character_name: string;
    status: 'pending' | 'verified' | 'failed' | 'expired';
    verification_method?: string;
    verification_token: string;
    created_at: string;
    verified_at?: string;
    branding?: {
        primary_color?: string;
        logo_url?: string;
        custom_css?: string;
    };
}

interface DomainsResponse {
    domains: Domain[];
    stats: {
        total: number;
        verified: number;
        pending: number;
        failed: number;
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
const statusFilter = ref('all');
const entityTypeFilter = ref('all');
const showDetailsModal = ref(false);
const showDeleteModal = ref(false);
const selectedDomain = ref<Domain | null>(null);
const domainToDelete = ref<Domain | null>(null);
const deleting = ref(false);

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    if (currentPage.value > 1) params.set('page', currentPage.value.toString());
    if (pageSize.value !== 25) params.set('limit', pageSize.value.toString());
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim());
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value);
    if (entityTypeFilter.value !== 'all') params.set('entityType', entityTypeFilter.value);

    return `/api/admin/domains?${params.toString()}`;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData<DomainsResponse>(
    'admin-domains',
    () => $fetch(apiEndpoint.value),
    {
        server: false,
        watch: [currentPage, pageSize, searchQuery, statusFilter, entityTypeFilter],
    }
);

// Methods
const clearSearch = () => {
    searchQuery.value = '';
};

const handlePageSizeChange = () => {
    currentPage.value = 1;
};

const changePage = (page: number) => {
    currentPage.value = page;
};

const formatEntityType = (type: string) => {
    switch (type) {
        case 'character':
            return t('admin.domains.character');
        case 'corporation':
            return t('admin.domains.corporation');
        case 'alliance':
            return t('admin.domains.alliance');
        default:
            return type; // Return as-is if unknown
    }
};

// Map domain status to StatusBadge expected values
const mapDomainStatus = (status: string): 'active' | 'inactive' | 'unverified' | 'suspended' => {
    switch (status) {
        case 'verified':
            return 'active';
        case 'pending':
            return 'unverified';
        case 'suspended':
            return 'suspended';
        case 'failed':
        default:
            return 'inactive';
    }
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
};

const viewDomainDetails = (domain: Domain) => {
    selectedDomain.value = domain;
    showDetailsModal.value = true;
};

const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedDomain.value = null;
};

const toggleDomainStatus = async (domain: Domain) => {
    try {
        const newStatus = domain.status === 'verified' ? 'suspended' : 'verified';
        await $fetch(`/api/admin/domains/${domain._id}/status`, {
            method: 'PATCH',
            body: { status: newStatus }
        });

        // Update local data
        domain.status = newStatus as any;
        await refreshData();
    } catch (error) {
        console.error('Failed to toggle domain status:', error);
    }
};

const deleteDomain = (domain: Domain) => {
    domainToDelete.value = domain;
    showDeleteModal.value = true;
};

const confirmDeleteDomain = async () => {
    if (!domainToDelete.value) return;

    deleting.value = true;
    try {
        await $fetch(`/api/admin/domains/${domainToDelete.value._id}`, {
            method: 'DELETE'
        });

        showDeleteModal.value = false;
        domainToDelete.value = null;
        await refreshData();
    } catch (error) {
        console.error('Failed to delete domain:', error);
    } finally {
        deleting.value = false;
    }
};

// Watch for search input changes with debouncing
let searchTimeout: NodeJS.Timeout;
watch(searchQuery, () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage.value = 1;
    }, 300);
});

// Watch filters
watch([statusFilter, entityTypeFilter], () => {
    currentPage.value = 1;
});
</script>

<style scoped>
.admin-domains {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    height: 100%;
    overflow-y: auto;
}

/* Header */
.domains-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.header-info {
    flex: 1;
}

.domains-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.domains-description {
    color: rgb(156, 163, 175);
    line-height: 1.5;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: rgb(55, 55, 55);
    color: white;
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    background-color: rgb(75, 75, 75);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

/* Filters */
.filters-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.5rem;
    border: 1px solid rgb(55, 55, 55);
}

.search-container {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 400px;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
}

.search-input {
    flex: 1;
    padding: 0.5rem 0.75rem 0.5rem 2.5rem;
    background-color: rgb(55, 55, 55);
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.search-clear-btn {
    position: absolute;
    right: 0.5rem;
    padding: 0.25rem;
    color: rgb(156, 163, 175);
    cursor: pointer;
}

.search-clear-btn:hover {
    color: white;
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.filters-row {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.filter-select,
.page-size-select {
    padding: 0.5rem;
    background-color: rgb(55, 55, 55);
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
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

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
}

.stat-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
}

.stat-icon-container.verified {
    background-color: rgba(34, 197, 94, 0.1);
}

.stat-icon-container.pending {
    background-color: rgba(251, 191, 36, 0.1);
}

.stat-icon-container.failed {
    background-color: rgba(239, 68, 68, 0.1);
}

.stat-icon-container.total {
    background-color: rgba(59, 130, 246, 0.1);
}

.stat-icon {
    width: 1.25rem;
    height: 1.25rem;
}

.stat-icon-container.verified .stat-icon {
    color: rgb(34, 197, 94);
}

.stat-icon-container.pending .stat-icon {
    color: rgb(251, 191, 36);
}

.stat-icon-container.failed .stat-icon {
    color: rgb(239, 68, 68);
}

.stat-icon-container.total .stat-icon {
    color: rgb(59, 130, 246);
}

.stat-info {
    flex: 1;
}

.stat-label {
    display: block;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.stat-value {
    display: block;
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
}

/* Domains List */
.domains-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.domain-card {
    background-color: rgb(31, 31, 31);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.domain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.domain-name {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.domain-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgb(156, 163, 175);
}

.domain-title {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
}

.domain-status {
    margin-left: 0.5rem;
}

.domain-actions {
    display: flex;
    gap: 0.5rem;
}

.action-btn-icon {
    width: 1rem;
    height: 1rem;
}

.view-btn {
    background-color: rgb(59, 130, 246);
}

.view-btn:hover {
    background-color: rgb(37, 99, 235);
}

.status-btn {
    background-color: rgb(251, 191, 36);
    color: rgb(92, 62, 0);
}

.status-btn:hover {
    background-color: rgb(245, 158, 11);
}

.status-btn.active {
    background-color: rgb(34, 197, 94);
    color: white;
}

.status-btn.active:hover {
    background-color: rgb(22, 163, 74);
}

.delete-btn {
    background-color: rgb(239, 68, 68);
}

.delete-btn:hover {
    background-color: rgb(220, 38, 38);
}

/* Domain Details */
.domain-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.detail-row {
    display: flex;
    gap: 2rem;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgb(209, 213, 219);
    font-size: 0.875rem;
}

.detail-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(156, 163, 175);
}

.detail-label {
    color: rgb(156, 163, 175);
}

.detail-value {
    color: white;
}

.detail-link {
    color: rgb(59, 130, 246);
    text-decoration: none;
}

.detail-link:hover {
    text-decoration: underline;
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

.empty-title {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
}

.empty-description {
    color: rgb(156, 163, 175);
    line-height: 1.5;
    max-width: 400px;
}

/* Pagination */
.pagination-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgb(55, 55, 55);
}

.pagination-btn {
    padding: 0.5rem 1rem;
    background-color: rgb(55, 55, 55);
    color: white;
    border: 1px solid rgb(75, 75, 75);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.pagination-btn:hover:not(:disabled) {
    background-color: rgb(75, 75, 75);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-info {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    margin: 0 1rem;
}

/* Modal Styles */
.domain-details-modal {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.details-section {
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.5rem;
    border: 1px solid rgb(55, 55, 55);
}

.section-title {
    color: white;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.detail-grid .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.detail-grid .detail-item label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.detail-grid .detail-item span {
    color: white;
}

.verification-token {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    background-color: rgb(55, 55, 55);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    word-break: break-all;
}

.branding-preview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.branding-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.branding-item label {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    font-weight: 500;
}

.color-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.color-swatch {
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    border: 1px solid rgb(75, 75, 75);
}

.logo-preview {
    max-width: 100px;
    max-height: 50px;
    object-fit: contain;
    border-radius: 0.25rem;
}

.delete-confirmation {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
}

.warning-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(251, 191, 36);
}

.delete-confirmation p {
    color: rgb(209, 213, 219);
    line-height: 1.5;
}

.confirm-details {
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border-radius: 0.375rem;
    border: 1px solid rgb(55, 55, 55);
    text-align: left;
}

.confirm-details p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
}

.btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary {
    background-color: rgb(75, 75, 75);
    color: white;
}

.btn-secondary:hover {
    background-color: rgb(100, 100, 100);
}

.btn-danger {
    background-color: rgb(239, 68, 68);
    color: white;
}

.btn-danger:hover {
    background-color: rgb(220, 38, 38);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-icon {
    width: 1rem;
    height: 1rem;
}

@media (max-width: 768px) {
    .admin-domains {
        padding: 1rem;
    }

    .domains-header {
        flex-direction: column;
        align-items: stretch;
    }

    .filters-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .domain-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .domain-actions {
        justify-content: stretch;
    }

    .domain-actions .action-btn {
        flex: 1;
        justify-content: center;
    }

    .detail-row {
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
