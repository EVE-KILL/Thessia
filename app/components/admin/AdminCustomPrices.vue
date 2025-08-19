<template>
    <div class="custom-prices-view">
        <!-- Header -->
        <div class="custom-prices-header">
            <div class="header-info">
                <h3 class="custom-prices-title">{{ t('admin.customPrices.title') }}</h3>
                <p class="custom-prices-description">{{ t('admin.customPrices.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="showCreateModal = true" class="action-button create-btn">
                    <Icon name="heroicons:plus" class="action-icon" />
                    {{ t('admin.customPrices.create') }}
                </button>
                <button @click="refreshData" class="action-button" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.customPrices.refresh') }}
                </button>
            </div>
        </div>

        <!-- Controls -->
        <div class="custom-prices-controls">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.customPrices.searchPlaceholder')"
                    class="search-input" />
                <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn">
                    <Icon name="heroicons:x-mark" class="clear-icon" />
                </button>
            </div>

            <div class="controls-right">
                <select v-model="pageSize" class="page-size-select" :aria-label="t('itemsPerPage')" @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.customPrices.perPage') }}</option>
                    <option value="25">25 {{ t('admin.customPrices.perPage') }}</option>
                    <option value="50">50 {{ t('admin.customPrices.perPage') }}</option>
                    <option value="100">100 {{ t('admin.customPrices.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Table -->
        <div class="custom-prices-table-container">
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
        </div>

        <!-- Pagination -->
        <div v-if="data && data.pagination.totalPages > 1" class="pagination">
            <button @click="changePage(1)" :disabled="!data.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.customPrices.first') }}
            </button>
            <button @click="changePage(data.pagination.currentPage - 1)" :disabled="!data.pagination.hasPrevPage"
                class="pagination-btn">
                {{ t('admin.customPrices.previous') }}
            </button>
            <span class="pagination-info">
                {{ t('admin.customPrices.pageInfo', {
                    current: data.pagination.currentPage, total:
                        data.pagination.totalPages })
                }}
            </span>
            <button @click="changePage(data.pagination.currentPage + 1)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.customPrices.next') }}
            </button>
            <button @click="changePage(data.pagination.totalPages)" :disabled="!data.pagination.hasNextPage"
                class="pagination-btn">
                {{ t('admin.customPrices.last') }}
            </button>
        </div>

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
.custom-prices-view {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    height: 100%;
}

/* Header */
.custom-prices-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
}

.header-info {
    flex: 1;
}

.custom-prices-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.custom-prices-description {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.header-actions {
    display: flex;
    gap: 1rem;
    flex-shrink: 0;
}

.action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    background-color: transparent;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
}

.action-button:hover:not(:disabled) {
    background-color: rgb(55, 55, 55);
}

.action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.create-btn {
    background-color: rgb(59, 130, 246);
    border-color: rgb(59, 130, 246);
}

.create-btn:hover:not(:disabled) {
    background-color: rgb(37, 99, 235);
}

.action-icon {
    width: 1rem;
    height: 1rem;
}

/* Controls */
.custom-prices-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: rgb(31, 31, 31);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
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
    padding: 0.5rem 0.75rem 0.5rem 2.5rem;
    background-color: rgb(23, 23, 23);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.search-input:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
}

.search-clear-btn {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.25rem;
    background: none;
    border: none;
    color: rgb(156, 163, 175);
    cursor: pointer;
}

.clear-icon {
    width: 0.875rem;
    height: 0.875rem;
}

.controls-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.page-size-select {
    padding: 0.5rem;
    background-color: rgb(23, 23, 23);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

/* Table */
.custom-prices-table-container {
    flex: 1;
    overflow: hidden;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
}

/* Table Cell Styles */
.type-id-cell,
.price-cell,
.date-cell,
.created-at-cell,
.updated-at-cell {
    padding: 0.5rem;
}

.type-id {
    font-family: monospace;
    font-weight: 600;
}

.price {
    font-weight: 600;
    color: rgb(34, 197, 94);
}

.actions-cell {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
}

.action-btn {
    padding: 0.375rem;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.25rem;
    background-color: transparent;
    color: rgb(156, 163, 175);
    cursor: pointer;
    transition: all 0.15s ease;
}

.action-btn:hover {
    background-color: rgb(55, 55, 55);
}

.edit-btn:hover {
    color: rgb(59, 130, 246);
    border-color: rgb(59, 130, 246);
}

.delete-btn:hover {
    color: rgb(239, 68, 68);
    border-color: rgb(239, 68, 68);
}

.action-icon {
    width: 0.875rem;
    height: 0.875rem;
}

/* Pagination */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
}

.pagination-btn {
    padding: 0.5rem 1rem;
    background-color: transparent;
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
}

.pagination-btn:hover:not(:disabled) {
    background-color: rgb(55, 55, 55);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-info {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

/* Form Styles */
.price-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-weight: 500;
    color: white;
    font-size: 0.875rem;
}

.form-input {
    padding: 0.75rem;
    background-color: rgb(23, 23, 23);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.form-input:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}

.btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background-color: transparent;
    border-color: rgb(55, 55, 55);
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background-color: rgb(55, 55, 55);
}

.btn-primary {
    background-color: rgb(59, 130, 246);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background-color: rgb(37, 99, 235);
}

.btn-danger {
    background-color: rgb(239, 68, 68);
    color: white;
}

.btn-danger:hover:not(:disabled) {
    background-color: rgb(220, 38, 38);
}

.btn-icon {
    width: 1rem;
    height: 1rem;
}

/* Delete confirmation */
.delete-confirmation {
    text-align: center;
}

.warning-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(245, 158, 11);
    margin: 0 auto 1rem;
}

.confirm-details {
    margin-top: 1rem;
    padding: 1rem;
    background-color: rgb(23, 23, 23);
    border-radius: 0.375rem;
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
    gap: 0.75rem;
}

.item-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.25rem;
    flex-shrink: 0;
}

.item-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.item-name {
    font-weight: 500;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}

.item-type-id {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.no-date {
    color: rgb(107, 114, 128);
    font-style: italic;
}

/* Item cell styles */
.item-cell {
    display: flex;
    align-items: center;
}

.item-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.item-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.25rem;
    flex-shrink: 0;
}

.item-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.item-name {
    font-weight: 500;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}

.item-type-id {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.no-date {
    color: rgb(107, 114, 128);
    font-style: italic;
}

/* Form styles */
.selected-item {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background-color: rgb(30, 30, 30);
    border-radius: 0.375rem;
    border: 1px solid rgb(55, 55, 55);
}

.search-dropdown {
    background-color: rgb(23, 23, 23);
    color: white;
}

/* Override Search component input styling to match form-input */
:deep(.search-component input) {
    padding: 0.75rem !important;
    background-color: rgb(23, 23, 23) !important;
    border: 1px solid rgb(55, 55, 55) !important;
    border-radius: 0.375rem !important;
    color: white !important;
    font-size: 0.875rem !important;
}

:deep(.search-component input:focus) {
    outline: none !important;
    border-color: rgb(59, 130, 246) !important;
}

/* Override Search component dropdown styling to match dark theme */
:deep(.search-dropdown) {
    background-color: rgb(23, 23, 23) !important;
    border: 1px solid rgb(55, 55, 55) !important;
    border-radius: 0.375rem !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1) !important;
}

:deep(.search-dropdown a) {
    color: rgb(243, 244, 246) !important;
    background-color: transparent !important;
}

:deep(.search-dropdown a:hover) {
    background-color: rgb(55, 55, 55) !important;
    color: white !important;
}

.selected-item-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.selected-item-icon {
    width: 24px;
    height: 24px;
    border-radius: 0.25rem;
    flex-shrink: 0;
}

.selected-item-details {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0;
}

.selected-item-name {
    font-weight: 500;
    color: white;
    font-size: 0.875rem;
}

.selected-item-id {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.clear-item-btn {
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: rgb(156, 163, 175);
    cursor: pointer;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.clear-item-btn:hover {
    background-color: rgb(55, 55, 55);
    color: white;
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.form-help {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
    margin-top: 0.25rem;
}

.confirm-details p {
    margin-bottom: 0.5rem;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}
</style>
