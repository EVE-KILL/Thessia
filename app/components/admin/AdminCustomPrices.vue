<template>
    <div class="admin-custom-prices">
        <!-- Header Card -->
        <Card>
            <template #header>
                <div class="header-content">
                    <div class="header-info">
                        <h3 class="header-title">{{ t('admin.customPrices.title') }}</h3>
                        <p class="header-description">{{ t('admin.customPrices.description') }}</p>
                    </div>
                    <div class="header-actions">
                        <button @click="showCreateModal = true" class="action-button create-btn">
                            <Icon name="heroicons:plus" class="action-icon" />
                            {{ t('admin.customPrices.create') }}
                        </button>
                        <button @click="refreshData" class="action-button" :disabled="pending">
                            <Icon name="heroicons:arrow-path" class="action-icon"
                                :class="{ 'animate-spin': pending }" />
                            {{ t('admin.customPrices.refresh') }}
                        </button>
                    </div>
                </div>
            </template>
        </Card>

        <!-- Controls Card -->
        <Card>
            <div class="controls-content">
                <div class="search-container">
                    <Icon name="heroicons:magnifying-glass" class="search-icon" />
                    <input v-model="searchQuery" type="text" :placeholder="t('admin.customPrices.searchPlaceholder')"
                        class="search-input" />
                    <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn">
                        <Icon name="heroicons:x-mark" class="clear-icon" />
                    </button>
                </div>

                <div class="controls-right">
                    <select v-model="pageSize" class="page-size-select" @change="handlePageSizeChange">
                        <option value="10">10 {{ t('admin.customPrices.perPage') }}</option>
                        <option value="25">25 {{ t('admin.customPrices.perPage') }}</option>
                        <option value="50">50 {{ t('admin.customPrices.perPage') }}</option>
                        <option value="100">100 {{ t('admin.customPrices.perPage') }}</option>
                    </select>
                </div>
            </div>
        </Card>

        <!-- Table Card -->
        <Card class="table-card">
            <Table :columns="tableColumns" :items="data?.data || []" :loading="pending"
                :empty-text="t('admin.customPrices.empty')" :skeleton-count="10" striped hover>
                <!-- Item Column -->
                <template #cell-item="{ item }">
                    <div class="item-cell">
                        <div class="item-info">
                            <Image type="type-icon" :id="item.type_id" :alt="item.itemName || `Type ${item.type_id}`"
                                class="item-icon" size="32" />
                            <div class="item-details">
                                <span class="item-name">{{ item.itemName || 'Unknown Item' }}</span>
                                <span class="item-type-id">Type ID: {{ item.type_id }}</span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Type ID Column -->
                <template #cell-type_id="{ item }">
                    <div class="type-id-cell">
                        <span class="type-id">{{ item.type_id }}</span>
                    </div>
                </template>

                <!-- Price Column -->
                <template #cell-price="{ item }">
                    <div class="price-cell">
                        <span class="price">{{ formatIsk(item.price) }}</span>
                    </div>
                </template>

                <!-- Date Column -->
                <template #cell-date="{ item }">
                    <div class="date-cell">
                        <span v-if="item.date" class="date">{{ formatDate(item.date) }}</span>
                        <span v-else class="no-date">-</span>
                    </div>
                </template>

                <!-- Actions Column -->
                <template #cell-actions="{ item }">
                    <div class="actions-cell">
                        <button @click="editPrice(item)" class="action-btn edit-btn">
                            <Icon name="heroicons:pencil" class="action-icon" />
                        </button>
                        <button @click="deletePrice(item)" class="action-btn delete-btn">
                            <Icon name="heroicons:trash" class="action-icon" />
                        </button>
                    </div>
                </template>
            </Table>

            <!-- Pagination Footer -->
            <template #footer v-if="data && data.pagination.totalPages > 1">
                <div class="pagination">
                    <button @click="changePage(1)" :disabled="!data.pagination.hasPrevPage" class="pagination-btn">
                        {{ t('admin.customPrices.first') }}
                    </button>
                    <button @click="changePage(data.pagination.currentPage - 1)"
                        :disabled="!data.pagination.hasPrevPage" class="pagination-btn">
                        {{ t('admin.customPrices.previous') }}
                    </button>
                    <span class="pagination-info">
                        {{ t('admin.customPrices.pageInfo', {
                            current: data.pagination.currentPage, total:
                                data.pagination.totalPages
                        })
                        }}
                    </span>
                    <button @click="changePage(data.pagination.currentPage + 1)"
                        :disabled="!data.pagination.hasNextPage" class="pagination-btn">
                        {{ t('admin.customPrices.next') }}
                    </button>
                    <button @click="changePage(data.pagination.totalPages)" :disabled="!data.pagination.hasNextPage"
                        class="pagination-btn">
                        {{ t('admin.customPrices.last') }}
                    </button>
                </div>
            </template>
        </Card>

        <!-- Create/Edit Modal -->
        <Modal :is-open="showCreateModal"
            :title="editingPrice ? t('admin.customPrices.editPrice') : t('admin.customPrices.createPrice')" size="md"
            @close="closeModal">
            <form @submit.prevent="savePrice" class="price-form">
                <div class="form-group">
                    <label for="item_search" class="form-label">{{ t('admin.customPrices.item') }}</label>
                    <div class="relative w-full">
                        <Search v-model="itemSearchQuery" :placeholder="t('admin.customPrices.searchItemPlaceholder')"
                            :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                            :transform-response="transformSearchResponse" :result-name="(result) => result.name"
                            :min-length="2" wrapper-class="w-full" input-class="w-full"
                            dropdown-class="search-dropdown w-full border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
                            @select="selectItem">
                            <template #results="{ results, selectResult }">
                                <a v-for="result in results" :key="result.id" @click="selectResult(result)"
                                    class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-100 hover:bg-gray-700 border-b border-gray-600 last:border-b-0">
                                    <div class="flex-shrink-0 mr-3">
                                        <Image type="type-icon" :id="result.id" :size="24" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium truncate">{{ result.name }}</div>
                                        <div class="text-xs text-gray-400">Type ID: {{ result.id }}</div>
                                    </div>
                                </a>
                            </template>

                            <template #loading>
                                <div class="px-4 py-2 text-sm text-gray-400">
                                    {{ t('admin.customPrices.searching') }}...
                                </div>
                            </template>

                            <template #no-results>
                                <div class="px-4 py-2 text-sm text-gray-400">
                                    {{ t('admin.customPrices.noResults') }}
                                </div>
                            </template>
                        </Search>
                    </div>
                    <div v-if="selectedItem" class="selected-item">
                        <div class="selected-item-info">
                            <Image type="type-icon" :id="selectedItem.id" :alt="selectedItem.name" size="24"
                                class="selected-item-icon" />
                            <div class="selected-item-details">
                                <span class="selected-item-name">{{ selectedItem.name }}</span>
                                <span class="selected-item-id">Type ID: {{ selectedItem.id }}</span>
                            </div>
                            <button type="button" @click="clearSelectedItem" class="clear-item-btn">
                                <Icon name="heroicons:x-mark" class="clear-icon" />
                            </button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="price" class="form-label">{{ t('admin.customPrices.price') }}</label>
                    <input id="price" v-model.number="formData.price" type="number" step="0.01" min="0"
                        class="form-input" :placeholder="t('admin.customPrices.pricePlaceholder')" required />
                </div>

                <div class="form-group">
                    <label for="date" class="form-label">{{ t('admin.customPrices.date') }} ({{
                        t('admin.customPrices.optional')
                    }})</label>
                    <input id="date" v-model="formData.date" type="date" class="form-input" />
                </div>

                <div class="form-actions">
                    <button type="button" @click="closeModal" class="btn btn-secondary">
                        {{ t('admin.customPrices.cancel') }}
                    </button>
                    <button type="submit" class="btn btn-primary" :disabled="saving">
                        <Icon v-if="saving" name="heroicons:arrow-path" class="btn-icon animate-spin" />
                        {{ editingPrice ? t('admin.customPrices.update') : t('admin.customPrices.create') }}
                    </button>
                </div>
            </form>
        </Modal>

        <!-- Delete Confirmation Modal -->
        <Modal :is-open="showDeleteModal" :title="t('admin.customPrices.deleteConfirmTitle')" size="sm"
            @close="showDeleteModal = false">
            <div class="delete-confirmation">
                <Icon name="heroicons:exclamation-triangle" class="warning-icon" />
                <p>{{ t('admin.customPrices.deleteConfirmMessage') }}</p>
                <div class="confirm-details">
                    <p><strong>{{ t('admin.customPrices.typeId') }}:</strong> {{ priceToDelete?.type_id }}</p>
                    <p><strong>{{ t('admin.customPrices.price') }}:</strong> {{ formatIsk(priceToDelete?.price || 0) }}
                    </p>
                    <p><strong>{{ t('admin.customPrices.date') }}:</strong> {{ formatDate(priceToDelete?.date) }}</p>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" @click="showDeleteModal = false" class="btn btn-secondary">
                    {{ t('admin.customPrices.cancel') }}
                </button>
                <button type="button" @click="confirmDelete" class="btn btn-danger" :disabled="deleting">
                    <Icon v-if="deleting" name="heroicons:arrow-path" class="btn-icon animate-spin" />
                    {{ t('admin.customPrices.delete') }}
                </button>
            </div>
        </Modal>
    </div>
</template>

<script setup lang="ts">
interface CustomPrice {
    _id: string;
    type_id: number;
    price: number;
    date: string | null;
    createdAt: string;
    updatedAt: string;
    itemName?: string;
}

interface CustomPricesResponse {
    success: boolean;
    data: CustomPrice[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        limit: number;
    };
}

const { t } = useI18n();

// Reactive state
const searchQuery = ref('');
const pageSize = ref(25);
const currentPage = ref(1);
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const editingPrice = ref<CustomPrice | null>(null);
const priceToDelete = ref<CustomPrice | null>(null);
const saving = ref(false);
const deleting = ref(false);

// Form data
const formData = reactive({
    type_id: null as number | null,
    price: null as number | null,
    date: null as string | null
});

// Search related
const selectedItem = ref<any>(null);
const itemSearchQuery = ref('');

// Table columns configuration
const tableColumns = computed(() => [
    {
        id: 'item',
        header: t('admin.customPrices.item'),
        sortable: false,
        width: '30%'
    },
    {
        id: 'type_id',
        header: t('admin.customPrices.typeId'),
        sortable: true,
        width: '15%'
    },
    {
        id: 'price',
        header: t('admin.customPrices.price'),
        sortable: true,
        width: '20%'
    },
    {
        id: 'date',
        header: t('admin.customPrices.date'),
        sortable: true,
        width: '15%'
    },
    {
        id: 'actions',
        header: t('admin.customPrices.actions'),
        sortable: false,
        width: '20%'
    }
]);

// Build API query parameters
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    if (searchQuery.value.trim()) {
        params.append('search', searchQuery.value.trim());
    }

    params.append('page', currentPage.value.toString());
    params.append('limit', pageSize.value.toString());
    params.append('sortBy', 'createdAt');
    params.append('sortOrder', 'desc');

    return `/api/admin/customprices?${params.toString()}`;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData<CustomPricesResponse>(
    'admin-custom-prices',
    () => $fetch(apiEndpoint.value),
    {
        lazy: true,
        server: false,
        watch: [apiEndpoint],
        default: () => ({
            success: true,
            data: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalCount: 0,
                hasNextPage: false,
                hasPrevPage: false,
                limit: 25
            }
        })
    }
);

// Watchers for auto-refresh
watch([searchQuery, pageSize], () => {
    currentPage.value = 1;
}, { debounce: 300 });

// Search functions
function transformSearchResponse(response: any): any[] {
    // The search API returns hits array containing all results
    return response.hits || [];
}

function selectItem(item: any): void {
    selectedItem.value = item;
    formData.type_id = Number(item.id);
    itemSearchQuery.value = item.name;
}

function clearSelectedItem(): void {
    selectedItem.value = null;
    formData.type_id = null;
    itemSearchQuery.value = '';
}

// Utility functions
function formatDate(date: string | Date | null): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
}

function formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString();
}

function clearSearch(): void {
    searchQuery.value = '';
}

function handlePageSizeChange(): void {
    currentPage.value = 1;
    refreshData();
}

function changePage(page: number): void {
    currentPage.value = page;
}

// Modal functions
function editPrice(price: CustomPrice): void {
    editingPrice.value = price;
    formData.type_id = price.type_id;
    formData.price = price.price;
    formData.date = price.date ? new Date(price.date).toISOString().split('T')[0] : null;

    // If we have item name, create a selected item object
    if (price.itemName) {
        selectedItem.value = {
            id: price.type_id,
            name: price.itemName
        };
        itemSearchQuery.value = price.itemName;
    }

    showCreateModal.value = true;
}

function deletePrice(price: CustomPrice): void {
    priceToDelete.value = price;
    showDeleteModal.value = true;
}

function closeModal(): void {
    showCreateModal.value = false;
    editingPrice.value = null;
    resetForm();
}

function resetForm(): void {
    formData.type_id = null;
    formData.price = null;
    formData.date = null;
    clearSelectedItem();
}

// CRUD operations
async function savePrice(): Promise<void> {
    if (!selectedItem.value || !formData.price) {
        // Show validation error
        return;
    }

    saving.value = true;
    try {
        const endpoint = editingPrice.value
            ? `/api/admin/customprices/${editingPrice.value._id}`
            : '/api/admin/customprices';

        const method = editingPrice.value ? 'PUT' : 'POST';

        await $fetch(endpoint, {
            method,
            body: {
                type_id: formData.type_id,
                price: formData.price,
                date: formData.date
            }
        });

        closeModal();
        await refreshData();
    } catch (error) {
        console.error('Error saving custom price:', error);
        // You might want to show a toast notification here
    } finally {
        saving.value = false;
    }
}

async function confirmDelete(): Promise<void> {
    if (!priceToDelete.value) return;

    deleting.value = true;
    try {
        await $fetch(`/api/admin/customprices/${priceToDelete.value._id}`, {
            method: 'DELETE'
        });

        showDeleteModal.value = false;
        priceToDelete.value = null;
        await refreshData();
    } catch (error) {
        console.error('Error deleting custom price:', error);
        // You might want to show a toast notification here
    } finally {
        deleting.value = false;
    }
}
</script>

<style scoped>
.admin-custom-prices {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-6);
    height: 100%;
}

/* Header Card */
.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-8);
}

.header-info {
    flex: 1;
}

.header-title {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.header-description {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}

.header-actions {
    display: flex;
    gap: var(--space-4);
    flex-shrink: 0;
}

.action-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    background-color: transparent;
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--duration-fast) ease;
}

.action-button:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
}

.action-button:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
}

.create-btn {
    background-color: var(--color-brand-primary);
    border-color: var(--color-brand-primary);
}

.create-btn:hover:not(:disabled) {
    background-color: var(--color-brand-secondary);
}

.action-icon {
    width: var(--space-4);
    height: var(--space-4);
}

/* Controls Card */
.controls-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
}

.search-container {
    position: relative;
    flex: 1;
    max-width: 24rem;
}

.search-icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    width: var(--space-4);
    height: var(--space-4);
    color: var(--color-text-tertiary);
}

.search-input {
    width: 100%;
    padding: var(--space-2) var(--space-3) var(--space-2) calc(var(--space-4) + var(--space-6));
    background-color: var(--color-surface-secondary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.search-input:focus {
    outline: none;
    border-color: var(--color-brand-primary);
}

.search-clear-btn {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    padding: var(--space-1);
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
}

.clear-icon {
    width: var(--space-3-5);
    height: var(--space-3-5);
}

.controls-right {
    display: flex;
    align-items: center;
    gap: var(--space-4);
}

.page-size-select {
    padding: var(--space-2);
    background-color: var(--color-surface-secondary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

/* Table Card */
.table-card {
    flex: 1;
    overflow: hidden;
}

/* Table Cell Styles */
.type-id-cell,
.price-cell,
.date-cell {
    padding: var(--space-2);
}

.type-id {
    font-family: var(--font-mono);
    font-weight: var(--font-weight-semibold);
}

.price {
    font-weight: var(--font-weight-semibold);
    color: var(--color-success-500);
}

.actions-cell {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
}

.action-btn {
    padding: var(--space-1-5);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    background-color: transparent;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all var(--duration-fast) ease;
}

.action-btn:hover {
    background-color: var(--color-surface-hover);
}

.edit-btn:hover {
    color: var(--color-brand-primary);
    border-color: var(--color-brand-primary);
}

.delete-btn:hover {
    color: var(--color-error-500);
    border-color: var(--color-error-500);
}

.action-icon {
    width: var(--space-3-5);
    height: var(--space-3-5);
}

/* Pagination */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
}

.pagination-btn {
    padding: var(--space-2) var(--space-4);
    background-color: transparent;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--duration-fast) ease;
}

.pagination-btn:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
}

.pagination-btn:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
}

.pagination-info {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}

/* Form Styles */
.price-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.form-label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.form-input {
    padding: var(--space-3);
    background-color: var(--color-surface-secondary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.form-input:focus {
    outline: none;
    border-color: var(--color-brand-primary);
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
    margin-top: var(--space-4);
}

.btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--duration-fast) ease;
}

.btn:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
}

.btn-secondary {
    background-color: transparent;
    border-color: var(--color-border-default);
    color: var(--color-text-primary);
}

.btn-secondary:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
}

.btn-primary {
    background-color: var(--color-brand-primary);
    color: var(--color-text-on-brand);
}

.btn-primary:hover:not(:disabled) {
    background-color: var(--color-brand-secondary);
}

.btn-danger {
    background-color: var(--color-error-500);
    color: var(--color-text-on-error);
}

.btn-danger:hover:not(:disabled) {
    background-color: var(--color-error-600);
}

.btn-icon {
    width: var(--space-4);
    height: var(--space-4);
}

/* Delete confirmation */
.delete-confirmation {
    text-align: center;
}

.warning-icon {
    width: var(--space-12);
    height: var(--space-12);
    color: var(--color-warning-500);
    margin: 0 auto var(--space-4);
}

.confirm-details {
    margin-top: var(--space-4);
    padding: var(--space-4);
    background-color: var(--color-surface-secondary);
    border-radius: var(--radius-md);
    text-align: left;
}

/* Item cell styles */
.item-cell {
    display: flex;
    align-items: center;
}

.item-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

.item-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
}

.item-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.item-name {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}

.item-type-id {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
}

.no-date {
    color: var(--color-text-muted);
    font-style: italic;
}

/* Form styles */
.selected-item {
    margin-top: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-surface-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
}

/* Search component overrides */
:deep(.search-component input) {
    padding: var(--space-3) !important;
    background-color: var(--color-surface-secondary) !important;
    border: 1px solid var(--color-border-default) !important;
    border-radius: var(--radius-md) !important;
    color: var(--color-text-primary) !important;
    font-size: var(--text-sm) !important;
}

:deep(.search-component input:focus) {
    outline: none !important;
    border-color: var(--color-brand-primary) !important;
}

:deep(.search-dropdown) {
    background-color: var(--color-surface-secondary) !important;
    border: 1px solid var(--color-border-default) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: var(--shadow-lg) !important;
}

:deep(.search-dropdown a) {
    color: var(--color-text-secondary) !important;
    background-color: transparent !important;
}

:deep(.search-dropdown a:hover) {
    background-color: var(--color-surface-hover) !important;
    color: var(--color-text-primary) !important;
}

.selected-item-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

.selected-item-icon {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
}

.selected-item-details {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0;
}

.selected-item-name {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.selected-item-id {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
}

.clear-item-btn {
    padding: var(--space-1);
    background: transparent;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
}

.clear-item-btn:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text-primary);
}

.clear-icon {
    width: var(--space-4);
    height: var(--space-4);
}

.confirm-details p {
    margin-bottom: var(--space-2);
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}
</style>
