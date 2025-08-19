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
                <select v-model="pageSize" class="page-size-select" :aria-label="t('itemsPerPage')" @change="handlePageSizeChange">
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
    gap: 1.5rem;
    padding: 1.5rem;
    min-height: 100vh;
    background: transparent;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.title-section h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.subtitle {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    margin-top: 0.25rem;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: rgb(59, 130, 246);
    border-color: rgb(59, 130, 246);
    color: white;
}

.btn-primary:hover {
    background: rgb(37, 99, 235);
    border-color: rgb(37, 99, 235);
}

.btn-secondary {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgb(55, 55, 55);
    color: rgb(156, 163, 175);
}

.btn-secondary:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgb(75, 85, 99);
    color: white;
}

.btn-danger {
    background: rgb(239, 68, 68);
    border-color: rgb(239, 68, 68);
    color: white;
}

.btn-danger:hover {
    background: rgb(220, 38, 38);
    border-color: rgb(220, 38, 38);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.controls-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.controls-grid {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 1rem;
    align-items: end;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
}

.form-input,
.form-select {
    padding: 0.5rem 0.75rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.form-input:focus,
.form-select:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
    color: rgb(107, 114, 128);
}

.data-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    overflow: hidden;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgb(55, 55, 55);
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.results-count {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.table-container {
    overflow: auto;
    max-height: 70vh;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th {
    background: rgba(0, 0, 0, 0.5);
    color: rgb(156, 163, 175);
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid rgb(55, 55, 55);
    position: sticky;
    top: 0;
    z-index: 10;
}

.data-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(55, 55, 55, 0.5);
    vertical-align: middle;
}

.data-table tr:hover td {
    background: rgba(0, 0, 0, 0.3);
}

.cell-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.api-key-name {
    font-weight: 500;
    color: white;
}

.api-key-description {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.api-key-code {
    font-family: 'Courier New', monospace;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
    border: 1px solid rgb(55, 55, 55);
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.status-active {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(34, 197, 94);
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-inactive {
    background: rgba(156, 163, 175, 0.2);
    color: rgb(156, 163, 175);
    border: 1px solid rgba(156, 163, 175, 0.3);
}

.status-indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: currentColor;
}

.date-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.actions-cell {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.3);
    color: rgb(156, 163, 175);
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-btn:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgb(75, 85, 99);
    color: white;
}

.action-btn.edit {
    color: rgb(59, 130, 246);
}

.action-btn.edit:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgb(59, 130, 246);
}

.action-btn.delete {
    color: rgb(239, 68, 68);
}

.action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgb(239, 68, 68);
}

.pagination-section {
    display: flex;
    justify-content: between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-top: 1px solid rgb(55, 55, 55);
}

.pagination-info {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

.pagination-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.pagination-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.3);
    color: rgb(156, 163, 175);
    cursor: pointer;
    transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgb(75, 85, 99);
    color: white;
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-btn.active {
    background: rgb(59, 130, 246);
    border-color: rgb(59, 130, 246);
    color: white;
}

.loading-section,
.error-section,
.empty-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
}

.loading-text,
.error-text,
.empty-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    margin-top: 0.5rem;
}

.icon {
    width: 1rem;
    height: 1rem;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
}

.modal-content {
    background: rgba(17, 24, 39, 0.95);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.3);
    color: rgb(156, 163, 175);
    cursor: pointer;
    transition: all 0.2s ease;
}

.modal-close:hover {
    background: rgba(0, 0, 0, 0.5);
    color: white;
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    display: flex;
    justify-content: end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid rgb(55, 55, 55);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group-full {
    grid-column: 1 / -1;
}

.form-textarea {
    padding: 0.5rem 0.75rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
    min-height: 100px;
    resize: vertical;
}

.form-textarea:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea::placeholder {
    color: rgb(107, 114, 128);
}

.form-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.form-checkbox input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.25rem;
    cursor: pointer;
}

.form-checkbox input[type="checkbox"]:checked {
    background: rgb(59, 130, 246);
    border-color: rgb(59, 130, 246);
}

.form-checkbox label {
    font-size: 0.875rem;
    color: white;
    cursor: pointer;
}

.api-key-display {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    padding: 1rem;
    margin-top: 1rem;
}

.api-key-display h4 {
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    margin: 0 0 0.5rem 0;
}

.api-key-value {
    font-family: 'Courier New', monospace;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: rgb(34, 197, 94);
    border: 1px solid rgb(55, 55, 55);
    word-break: break-all;
}

.api-key-warning {
    display: flex;
    align-items: start;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 0.375rem;
}

.warning-icon {
    color: rgb(245, 158, 11);
    flex-shrink: 0;
    margin-top: 0.125rem;
}

.warning-text {
    font-size: 0.875rem;
    color: rgb(245, 158, 11);
    line-height: 1.4;
}

/* Other Legacy styles that need dark theme consistency */
.api-keys-view {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
}

.api-keys-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

@media (min-width: 640px) {
    .api-keys-header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.api-keys-title {
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 700;
    color: white;
}

.api-keys-description {
    color: rgb(156, 163, 175);
}

.action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.3);
    color: rgb(156, 163, 175);
    border: 1px solid rgb(55, 55, 55);
}

.action-button:hover {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
}

.action-button.primary {
    background-color: rgb(59, 130, 246);
    color: white;
    border-color: rgb(59, 130, 246);
}

.action-button.primary:hover {
    background-color: rgb(37, 99, 235);
}

.action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

.api-keys-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
}

@media (min-width: 640px) {
    .api-keys-controls {
        flex-direction: row;
        align-items: center;
    }
}

.search-container {
    position: relative;
    flex: 1;
    max-width: 24rem;
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
    padding-left: 2.5rem;
    padding-right: 2.5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
}

.search-input:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.search-input::placeholder {
    color: rgb(156, 163, 175);
}

.search-clear-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgb(156, 163, 175);
    background: none;
    border: none;
    cursor: pointer;
}

.search-clear-btn:hover {
    color: white;
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.controls-right {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.filter-toggle {
    display: flex;
    gap: 0.5rem;
}

.filter-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    border: 1px solid rgb(55, 55, 55);
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.3);
    color: rgb(156, 163, 175);
}

.filter-btn:hover {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
}

.filter-btn.active {
    background-color: rgb(59, 130, 246);
    color: white;
    border-color: rgb(59, 130, 246);
}

.filter-icon {
    width: 1rem;
    height: 1rem;
}

.page-size-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
}

/* API Keys Grid and Card Styles */
.api-keys-grid {
    display: grid;
    gap: 1.5rem;
    padding: 1rem 0;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
}

.api-key-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    overflow: hidden;
    transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.api-key-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.api-key-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgb(55, 55, 55);
}

.api-key-avatar {
    position: relative;
    flex-shrink: 0;
}

.key-icon-container {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid rgb(55, 55, 55);
    background: rgba(59, 130, 246, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
}

.key-icon {
    width: 24px;
    height: 24px;
    color: rgb(96, 165, 250);
}

.active-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: rgb(34, 197, 94);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.active-icon {
    width: 12px;
    height: 12px;
    color: white;
}

.api-key-info {
    flex: 1;
    min-width: 0;
}

.api-key-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.api-key-id,
.api-key-created {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
    margin-bottom: 0.125rem;
}

.api-key-details {
    padding: 1rem;
}

.api-key-stats {
    margin-bottom: 1rem;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
}

.stat-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(96, 165, 250);
    flex-shrink: 0;
}

.stat-label {
    color: rgb(156, 163, 175);
    min-width: 0;
}

.stat-value {
    color: white;
    font-weight: 500;
}

.text-green-400 {
    color: rgb(34, 197, 94) !important;
}

.text-red-400 {
    color: rgb(239, 68, 68) !important;
}

.text-yellow-400 {
    color: rgb(245, 158, 11) !important;
}

.description-summary {
    margin-bottom: 1rem;
}

.description-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
}

.description-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(96, 165, 250);
}

.description-content {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.25rem;
    padding: 0.5rem;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    line-height: 1.4;
}

.api-key-actions {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgb(55, 55, 55);
}

.api-key-actions .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
    flex: 1;
    justify-content: center;
}

.toggle-btn {
    background-color: rgb(55, 55, 55);
    color: rgb(156, 163, 175);
}

.toggle-btn:hover {
    background-color: rgb(75, 75, 75);
}

.toggle-btn.active {
    background-color: rgb(34, 197, 94);
    color: white;
}

.toggle-btn.active:hover {
    background-color: rgb(22, 163, 74);
}

.edit-btn {
    background-color: rgb(59, 130, 246);
    color: white;
}

.edit-btn:hover {
    background-color: rgb(37, 99, 235);
}

.delete-btn {
    background-color: rgb(239, 68, 68);
    color: white;
}

.delete-btn:hover {
    background-color: rgb(220, 38, 38);
}

.action-btn-icon {
    width: 0.875rem;
    height: 0.875rem;
}

@media (max-width: 768px) {
    .admin-api-keys {
        padding: 1rem;
    }

    .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .header-actions {
        justify-content: start;
    }

    .controls-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .table-container {
        overflow-x: auto;
    }

    .data-table {
        min-width: 600px;
    }

    .modal-content {
        margin: 1rem;
        max-width: none;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .pagination-section {
        flex-direction: column;
        gap: 1rem;
        align-items: center;
    }

    /* API Keys Grid Responsive */
    .api-keys-grid {
        grid-template-columns: 1fr;
    }

    .api-key-actions {
        flex-direction: column;
        gap: 0.5rem;
    }

    .api-key-actions .action-btn {
        flex: none;
    }
}
</style>
