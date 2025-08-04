<template>
    <div class="api-keys-view">
        <!-- API Keys Header -->
        <div class="api-keys-header">
            <div class="header-info">
                <h3 class="api-keys-title">{{ t('admin.apiKeys.title') }}</h3>
                <p class="api-keys-description">{{ t('admin.apiKeys.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="showCreateModal = true" class="action-button primary">
                    <Icon name="heroicons:plus" class="action-icon" />
                    {{ t('admin.apiKeys.createNew') }}
                </button>
                <button @click="() => refreshData()" class="action-button" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.apiKeys.refresh') }}
                </button>
            </div>
        </div>

        <!-- API Keys Controls -->
        <div class="api-keys-controls">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.apiKeys.search')"
                    class="search-input" />
                <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn"
                    :title="t('admin.apiKeys.clearSearch')">
                    <Icon name="heroicons:x-mark" class="clear-icon" />
                </button>
            </div>

            <div class="controls-right">
                <div class="filter-toggle">
                    <button @click="showActiveOnly = !showActiveOnly" class="filter-btn"
                        :class="{ 'active': showActiveOnly }">
                        <Icon name="heroicons:shield-check" class="filter-icon" />
                        {{ t('admin.apiKeys.activeOnly') }}
                    </button>
                </div>
                <select v-model="pageSize" class="page-size-select" @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.apiKeys.perPage') }}</option>
                    <option value="25">25 {{ t('admin.apiKeys.perPage') }}</option>
                    <option value="50">50 {{ t('admin.apiKeys.perPage') }}</option>
                    <option value="100">100 {{ t('admin.apiKeys.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- API Keys Grid -->
        <div class="api-keys-container">
            <div v-if="pending" class="loading-container">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.apiKeys.loading') }}</p>
            </div>

            <div v-else-if="error" class="error-container">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.apiKeys.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.apiKeys.retry') }}
                </button>
            </div>

            <div v-else-if="data && data.data.length > 0" class="api-keys-grid">
                <div v-for="apiKey in data.data" :key="apiKey._id" class="api-key-card">
                    <!-- API Key Header -->
                    <div class="api-key-header">
                        <div class="api-key-avatar">
                            <div class="key-icon-container">
                                <Icon name="heroicons:key" class="key-icon" />
                            </div>
                            <div v-if="apiKey.active" class="active-badge">
                                <Icon name="heroicons:check-circle" class="active-icon" />
                            </div>
                        </div>
                        <div class="api-key-info">
                            <h4 class="api-key-name">{{ apiKey.name }}</h4>
                            <div class="api-key-id">ID: {{ apiKey._id.slice(-8) }}</div>
                            <div class="api-key-created">
                                {{ t('admin.apiKeys.created') }}: {{ formatDate(apiKey.createdAt) }}
                            </div>
                        </div>
                    </div>

                    <!-- API Key Details -->
                    <div class="api-key-details">
                        <!-- API Key Stats -->
                        <div class="api-key-stats">
                            <div class="stat-item">
                                <Icon name="heroicons:user" class="stat-icon" />
                                <span class="stat-label">{{ t('admin.apiKeys.createdBy') }}:</span>
                                <span class="stat-value">{{ apiKey.createdByName }}</span>
                            </div>
                            <div class="stat-item">
                                <Icon name="heroicons:shield-check" class="stat-icon" />
                                <span class="stat-label">{{ t('admin.apiKeys.status.label') }}:</span>
                                <span class="stat-value"
                                    :class="{ 'text-green-400': apiKey.active, 'text-red-400': !apiKey.active }">
                                    {{ apiKey.active ? t('admin.apiKeys.status.active') :
                                        t('admin.apiKeys.status.inactive') }}
                                </span>
                            </div>
                            <div class="stat-item">
                                <Icon name="heroicons:clock" class="stat-icon" />
                                <span class="stat-label">{{ t('admin.apiKeys.lastUsed') }}:</span>
                                <span class="stat-value" :class="{ 'text-yellow-400': !apiKey.lastUsed }">
                                    {{ apiKey.lastUsed ? formatDate(apiKey.lastUsed) : t('admin.apiKeys.neverUsed') }}
                                </span>
                            </div>
                        </div>

                        <!-- Description Summary -->
                        <div class="description-summary" v-if="apiKey.description">
                            <div class="description-header">
                                <Icon name="heroicons:information-circle" class="description-icon" />
                                <span>{{ t('admin.apiKeys.description') }}</span>
                            </div>
                            <div class="description-content">
                                {{ apiKey.description }}
                            </div>
                        </div>
                    </div>

                    <!-- API Key Actions -->
                    <div class="api-key-actions">
                        <button @click="toggleApiKeyStatus(apiKey)" class="action-btn toggle-btn"
                            :class="{ 'active': apiKey.active }">
                            <Icon :name="apiKey.active ? 'heroicons:pause' : 'heroicons:play'"
                                class="action-btn-icon" />
                            {{ apiKey.active ? t('admin.apiKeys.deactivate') : t('admin.apiKeys.activate') }}
                        </button>
                        <button @click="editApiKey(apiKey)" class="action-btn edit-btn">
                            <Icon name="heroicons:pencil" class="action-btn-icon" />
                            {{ t('admin.apiKeys.editAction') }}
                        </button>
                        <button @click="deleteApiKey(apiKey)" class="action-btn delete-btn">
                            <Icon name="heroicons:trash" class="action-btn-icon" />
                            {{ t('admin.apiKeys.deleteAction') }}
                        </button>
                    </div>
                </div>
            </div>

            <div v-else class="empty-state">
                <Icon name="heroicons:key" class="empty-icon" />
                <h4 class="empty-title">{{ t('admin.apiKeys.empty.title') }}</h4>
                <p class="empty-description">{{ t('admin.apiKeys.empty.description') }}</p>
                <button @click="showCreateModal = true" class="empty-action">
                    {{ t('admin.apiKeys.createFirst') }}
                </button>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="data && data.pagination.totalPages > 1" class="pagination">
            <button @click="goToPage(1)" :disabled="currentPage === 1" class="pagination-btn first">
                <Icon name="heroicons:chevron-double-left" class="pagination-icon" />
            </button>
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-btn prev">
                <Icon name="heroicons:chevron-left" class="pagination-icon" />
            </button>

            <div class="pagination-info">
                <span>{{ t('admin.apiKeys.pagination.page') }} {{ currentPage }} {{ t('admin.apiKeys.pagination.of') }}
                    {{ data.pagination.totalPages }}</span>
                <span class="total-count">({{ data.pagination.total }} {{ t('admin.apiKeys.pagination.total') }})</span>
            </div>

            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === data.pagination.totalPages"
                class="pagination-btn next">
                <Icon name="heroicons:chevron-right" class="pagination-icon" />
            </button>
            <button @click="goToPage(data.pagination.totalPages)" :disabled="currentPage === data.pagination.totalPages"
                class="pagination-btn last">
                <Icon name="heroicons:chevron-double-right" class="pagination-icon" />
            </button>
        </div>

        <!-- Create API Key Modal -->
        <Modal :is-open="showCreateModal" @close="closeCreateModal" :title="t('admin.apiKeys.create.title')" size="lg">
            <form @submit.prevent="createApiKey" class="modal-form">
                <div class="form-group">
                    <label for="apiKeyName" class="form-label">{{ t('admin.apiKeys.create.name') }} *</label>
                    <input id="apiKeyName" v-model="createForm.name" type="text" class="form-input"
                        :placeholder="t('admin.apiKeys.create.namePlaceholder')" required />
                </div>

                <div class="form-group">
                    <label for="apiKeyDescription" class="form-label">{{ t('admin.apiKeys.create.description')
                    }}</label>
                    <textarea id="apiKeyDescription" v-model="createForm.description" class="form-textarea"
                        :placeholder="t('admin.apiKeys.create.descriptionPlaceholder')" rows="3"></textarea>
                </div>
            </form>

            <template #footer>
                <button type="button" @click="closeCreateModal" class="btn btn-secondary">
                    {{ t('admin.apiKeys.create.cancel') }}
                </button>
                <button @click="createApiKey" :disabled="creatingKey || !createForm.name.trim()"
                    class="btn btn-primary">
                    <Icon v-if="creatingKey" name="heroicons:arrow-path" class="btn-icon animate-spin" />
                    <Icon v-else name="heroicons:plus" class="btn-icon" />
                    {{ creatingKey ? t('admin.apiKeys.create.creating') : t('admin.apiKeys.create.create') }}
                </button>
            </template>
        </Modal>

        <!-- Edit API Key Modal -->
        <Modal :is-open="showEditModal" @close="closeEditModal" :title="t('admin.apiKeys.edit.title')" size="lg">
            <form @submit.prevent="updateApiKey" class="modal-form">
                <div class="form-group">
                    <label for="editApiKeyName" class="form-label">{{ t('admin.apiKeys.edit.name') }} *</label>
                    <input id="editApiKeyName" v-model="editForm.name" type="text" class="form-input" required />
                </div>

                <div class="form-group">
                    <label for="editApiKeyDescription" class="form-label">{{ t('admin.apiKeys.edit.description')
                    }}</label>
                    <textarea id="editApiKeyDescription" v-model="editForm.description" class="form-textarea"
                        rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label checkbox-label">
                        <input v-model="editForm.active" type="checkbox" class="form-checkbox" />
                        <span class="checkbox-text">{{ t('admin.apiKeys.edit.active') }}</span>
                    </label>
                </div>
            </form>

            <template #footer>
                <button type="button" @click="closeEditModal" class="btn btn-secondary">
                    {{ t('admin.apiKeys.edit.cancel') }}
                </button>
                <button @click="updateApiKey" :disabled="updatingKey || !editForm.name.trim()" class="btn btn-primary">
                    <Icon v-if="updatingKey" name="heroicons:arrow-path" class="btn-icon animate-spin" />
                    <Icon v-else name="heroicons:check" class="btn-icon" />
                    {{ updatingKey ? t('admin.apiKeys.edit.updating') : t('admin.apiKeys.edit.update') }}
                </button>
            </template>
        </Modal>

        <!-- Success Modal for New API Key -->
        <Modal :is-open="showSuccessModal" @close="closeSuccessModal" :title="t('admin.apiKeys.success.title')"
            size="lg">
            <div class="success-content">
                <Icon name="heroicons:check-circle" class="success-icon" />
                <p class="success-message">{{ t('admin.apiKeys.success.message') }}</p>

                <div class="api-key-display">
                    <label class="api-key-label">{{ t('admin.apiKeys.success.apiKey') }}</label>
                    <div class="api-key-container">
                        <input ref="apiKeyInput" v-model="newApiKey" type="text" class="api-key-input" readonly />
                        <button @click="copyApiKey" class="copy-btn" :title="t('admin.apiKeys.success.copy')">
                            <Icon :name="copied ? 'heroicons:check' : 'heroicons:clipboard'" class="copy-icon" />
                        </button>
                    </div>
                </div>

                <div class="warning-message">
                    <Icon name="heroicons:exclamation-triangle" class="warning-icon" />
                    <p>{{ t('admin.apiKeys.success.warning') }}</p>
                </div>
            </div>

            <template #footer>
                <button @click="closeSuccessModal" class="btn btn-primary">
                    {{ t('admin.apiKeys.success.close') }}
                </button>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import Modal from '~/components/common/Modal.vue';

interface ApiKey {
    _id: string;
    name: string;
    description?: string;
    active: boolean;
    lastUsed?: string;
    createdBy: number;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}

interface ApiKeysResponse {
    success: boolean;
    data: ApiKey[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

const { t } = useI18n();

// Reactive state
const searchQuery = ref("");
const showActiveOnly = ref(false);
const pageSize = ref(25);
const currentPage = ref(1);

// Modal states
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showSuccessModal = ref(false);

// Form states
const createForm = ref({
    name: "",
    description: "",
});

const editForm = ref({
    _id: "",
    name: "",
    description: "",
    active: true,
});

// Loading states
const creatingKey = ref(false);
const updatingKey = ref(false);

// Success state
const newApiKey = ref("");
const copied = ref(false);
const apiKeyInput = ref<HTMLInputElement>();

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    if (searchQuery.value.trim()) {
        params.append("search", searchQuery.value.trim());
    }

    if (showActiveOnly.value) {
        params.append("active", "true");
    }

    params.append("page", currentPage.value.toString());
    params.append("limit", pageSize.value.toString());

    return `/api/admin/apikeys?${params.toString()}`;
});

// Data fetching
const { data, pending, error, refresh: refreshData } = useAsyncData<ApiKeysResponse>(
    "admin-api-keys",
    () => $fetch(apiEndpoint.value),
    {
        lazy: true,
        server: false,
        watch: [apiEndpoint],
    }
);

// Methods
const clearSearch = () => {
    searchQuery.value = "";
    currentPage.value = 1;
};

const handlePageSizeChange = () => {
    currentPage.value = 1;
};

const goToPage = (page: number) => {
    currentPage.value = page;
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
};

// Create API Key
const closeCreateModal = () => {
    showCreateModal.value = false;
    createForm.value = {
        name: "",
        description: "",
    };
};

const createApiKey = async () => {
    if (!createForm.value.name.trim()) return;

    creatingKey.value = true;

    try {
        const response = await $fetch<{ success: boolean, data: { key: string }, message: string }>("/api/admin/apikeys", {
            method: "POST",
            body: {
                name: createForm.value.name.trim(),
                description: createForm.value.description.trim(),
            },
        });

        if (response.success) {
            newApiKey.value = response.data.key;
            showCreateModal.value = false;
            showSuccessModal.value = true;
            createForm.value = { name: "", description: "" };
            await refreshData();
        }
    } catch (error: any) {
        console.error("Failed to create API key:", error);
        // You could add a toast notification here
    } finally {
        creatingKey.value = false;
    }
};

// Edit API Key
const editApiKey = (apiKey: ApiKey) => {
    editForm.value = {
        _id: apiKey._id,
        name: apiKey.name,
        description: apiKey.description || "",
        active: apiKey.active,
    };
    showEditModal.value = true;
};

const closeEditModal = () => {
    showEditModal.value = false;
    editForm.value = {
        _id: "",
        name: "",
        description: "",
        active: true,
    };
};

const updateApiKey = async () => {
    if (!editForm.value.name.trim()) return;

    updatingKey.value = true;

    try {
        const response = await $fetch(`/api/admin/apikeys/${editForm.value._id}`, {
            method: "PATCH",
            body: {
                name: editForm.value.name.trim(),
                description: editForm.value.description.trim(),
                active: editForm.value.active,
            },
        });

        if (response.success) {
            showEditModal.value = false;
            await refreshData();
        }
    } catch (error: any) {
        console.error("Failed to update API key:", error);
    } finally {
        updatingKey.value = false;
    }
};

// Toggle API Key Status
const toggleApiKeyStatus = async (apiKey: ApiKey) => {
    try {
        const response = await $fetch(`/api/admin/apikeys/${apiKey._id}`, {
            method: "PATCH",
            body: {
                active: !apiKey.active,
            },
        });

        if (response.success) {
            await refreshData();
        }
    } catch (error: any) {
        console.error("Failed to toggle API key status:", error);
    }
};

// Delete API Key
const deleteApiKey = async (apiKey: ApiKey) => {
    if (!confirm(t('admin.apiKeys.delete.confirm', { name: apiKey.name }))) {
        return;
    }

    try {
        const response = await $fetch(`/api/admin/apikeys/${apiKey._id}`, {
            method: "DELETE",
        });

        if (response.success) {
            await refreshData();
        }
    } catch (error: any) {
        console.error("Failed to delete API key:", error);
    }
};

// Success Modal
const closeSuccessModal = () => {
    showSuccessModal.value = false;
    newApiKey.value = "";
    copied.value = false;
};

const copyApiKey = async () => {
    if (apiKeyInput.value) {
        try {
            await navigator.clipboard.writeText(newApiKey.value);
            copied.value = true;
            setTimeout(() => {
                copied.value = false;
            }, 2000);
        } catch (error) {
            // Fallback for older browsers
            apiKeyInput.value.select();
            document.execCommand('copy');
            copied.value = true;
            setTimeout(() => {
                copied.value = false;
            }, 2000);
        }
    }
};

// Watch for search changes to reset page
watch(searchQuery, () => {
    currentPage.value = 1;
});

watch(showActiveOnly, () => {
    currentPage.value = 1;
});
</script>

<style scoped>
.admin-api-keys {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-6);
    min-height: 100vh;
    background: transparent;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
}

.title-section h1 {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin: 0;
}

.subtitle {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-top: var(--space-1);
}

.header-actions {
    display: flex;
    gap: var(--space-3);
    align-items: center;
}

/* Use our global button styles */
.btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: var(--color-brand-primary);
    border-color: var(--color-brand-primary);
    color: white;
}

.btn-primary:hover {
    background: #2563eb;
    border-color: #2563eb;
}

.btn-secondary {
    background: var(--color-bg-secondary);
    border-color: var(--color-border-medium);
    color: var(--color-text-secondary);
}

.btn-secondary:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border-dark);
    color: var(--color-text-primary);
}

.btn-danger {
    background: var(--color-error);
    border-color: var(--color-error);
    color: white;
}

.btn-danger:hover {
    background: #dc2626;
    border-color: #dc2626;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.controls-section {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
}

.controls-grid {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--space-4);
    align-items: end;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.form-label {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
}

.form-input,
.form-select {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.form-input:focus,
.form-select:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px var(--color-border-focus-light);
}

.form-input::placeholder {
    color: var(--color-text-tertiary);
}

.data-section {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-medium);
}

.section-title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin: 0;
}

.results-count {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

/* Continue with more efficient table styles... */
.table-container {
    overflow: auto;
    max-height: 70vh;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th {
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-weight: var(--font-medium);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border-medium);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
}

.data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
    vertical-align: middle;
}

.data-table tr:hover td {
    background: var(--color-bg-hover);
}

/* Significantly shortened styles using our design system */

/* Component-specific overrides only */
.cell-content {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.api-key-name {
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
}

.api-key-description {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
}

.api-key-code {
    font-family: 'Courier New', monospace;
    background: var(--color-bg-primary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-medium);
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
}

.status-active {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-inactive {
    background: rgba(156, 163, 175, 0.2);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-light);
}

.status-indicator {
    width: var(--space-2);
    height: var(--space-2);
    border-radius: var(--radius-full);
    background: currentColor;
}

.date-text {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
}

.api-key-display {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-top: var(--space-4);
}

.api-key-value {
    font-family: 'Courier New', monospace;
    background: var(--color-bg-secondary);
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: #22c55e;
    border: 1px solid var(--color-border-medium);
    word-break: break-all;
}

.api-key-warning {
    display: flex;
    align-items: start;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: var(--space-3);
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-md);
}

.warning-text {
    font-size: var(--text-sm);
    color: #f59e0b;
    line-height: var(--line-height-relaxed);
}

/* Responsive */
@media (max-width: 768px) {
    .admin-api-keys {
        padding: var(--space-4);
    }

    .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-4);
    }

    .controls-grid {
        grid-template-columns: 1fr;
        gap: var(--space-4);
    }

    .data-table {
        min-width: 600px;
    }
}
</style>
