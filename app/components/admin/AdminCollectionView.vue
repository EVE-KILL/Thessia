<template>
    <div class="collection-view">
        <!-- Collection Header -->
        <div class="collection-header">
            <div class="header-info">
                <h3 class="collection-title">{{ collectionDisplayName }}</h3>
                <p class="collection-description">{{ t('admin.collection.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="() => refreshData()" class="action-button" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.collection.refresh') }}
                </button>
            </div>
        </div>

        <!-- Collection Controls -->
        <div class="collection-controls">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.collection.search')"
                    class="search-input" @input="debouncedSearch" />
            </div>

            <div class="controls-right">
                <select v-model="pageSize" class="page-size-select" @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.collection.perPage') }}</option>
                    <option value="25">25 {{ t('admin.collection.perPage') }}</option>
                    <option value="50">50 {{ t('admin.collection.perPage') }}</option>
                    <option value="100">100 {{ t('admin.collection.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Data Cards -->
        <div class="cards-container">
            <div v-if="pending" class="loading-container">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.collection.loading') }}</p>
            </div>

            <div v-else-if="error" class="error-container">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.collection.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.collection.retry') }}
                </button>
            </div>

            <div v-else-if="data && data.data.length > 0" class="cards-grid">
                <div v-for="(document, index) in data.data" :key="index" class="document-card">
                    <!-- Card Header -->
                    <div class="card-header">
                        <div class="card-id">
                            <Icon name="heroicons:document" class="id-icon" />
                            <span class="id-text">{{ formatCellValue(document._id || document.id || `Item ${index + 1}`)
                                }}</span>
                        </div>
                        <div class="card-actions">
                            <button @click="editDocument(document)" class="action-btn edit-btn"
                                :title="t('admin.collection.edit')">
                                <Icon name="heroicons:pencil" class="action-btn-icon" />
                            </button>
                            <button @click="deleteDocument(document)" class="action-btn delete-btn"
                                :title="t('admin.collection.delete')">
                                <Icon name="heroicons:trash" class="action-btn-icon" />
                            </button>
                        </div>
                    </div>

                    <!-- Card Content -->
                    <div class="card-content">
                        <!-- First 5 keys -->
                        <div v-for="(key, keyIndex) in getVisibleKeys(document)" :key="key" class="field-row">
                            <div class="field-label">{{ formatColumnName(key) }}</div>
                            <div class="field-value" @click="showFullValue(document, key)">
                                {{ truncateValue(document[key]) }}
                                <Icon v-if="isValueTruncated(document[key])" name="heroicons:eye" class="view-icon" />
                            </div>
                        </div>

                        <!-- Show More/Less Toggle -->
                        <div v-if="hasMoreKeys(document)" class="show-more-container">
                            <button @click="toggleExpanded(index)" class="show-more-btn">
                                <Icon
                                    :name="expandedCards.has(index) ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                                    class="chevron-icon" />
                                {{ expandedCards.has(index) ? t('admin.collection.showLess') :
                                    t('admin.collection.showMore') }}
                            </button>
                        </div>

                        <!-- Additional keys (expanded) -->
                        <div v-if="expandedCards.has(index)" class="expanded-content">
                            <div v-for="key in getHiddenKeys(document)" :key="key" class="field-row">
                                <div class="field-label">{{ formatColumnName(key) }}</div>
                                <div class="field-value" @click="showFullValue(document, key)">
                                    {{ truncateValue(document[key]) }}
                                    <Icon v-if="isValueTruncated(document[key])" name="heroicons:eye"
                                        class="view-icon" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="empty-state">
                <Icon name="heroicons:document" class="empty-icon" />
                <p class="empty-text">{{ t('admin.collection.empty') }}</p>
            </div>
        </div>

        <!-- Full Value Modal -->
        <div v-if="showModal" class="modal-overlay" @click="closeModal">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3 class="modal-title">{{ modalData.fieldName }}</h3>
                    <button @click="closeModal" class="modal-close">
                        <Icon name="heroicons:x-mark" class="close-icon" />
                    </button>
                </div>
                <div class="modal-body">
                    <pre class="modal-value">{{ formatModalValue(modalData.value) }}</pre>
                </div>
                <div class="modal-footer">
                    <button @click="copyToClipboard" class="copy-btn">
                        <Icon name="heroicons:clipboard-document" class="copy-icon" />
                        {{ t('admin.collection.copy') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit Document Modal -->
        <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
            <div class="modal-content edit-modal" @click.stop>
                <div class="modal-header">
                    <h3 class="modal-title">{{ t('admin.collection.editDocument') }}</h3>
                    <button @click="closeEditModal" class="modal-close">
                        <Icon name="heroicons:x-mark" class="close-icon" />
                    </button>
                </div>
                <div class="modal-body">
                    <div v-if="editData.loading" class="loading-container">
                        <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                        <p class="loading-text">{{ t('admin.collection.loading') }}</p>
                    </div>
                    <div v-else class="edit-form">
                        <div v-for="(value, key) in editData.document" :key="key" class="edit-field">
                            <label class="edit-label">{{ formatColumnName(key) }}</label>
                            <textarea v-if="isComplexValue(value)" v-model="editData.document[key]"
                                class="edit-textarea" :class="{ 'edit-readonly': key === '_id' }"
                                :readonly="key === '_id'" rows="4"></textarea>
                            <input v-else v-model="editData.document[key]" type="text" class="edit-input"
                                :class="{ 'edit-readonly': key === '_id' }" :readonly="key === '_id'" />
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="closeEditModal" class="cancel-btn">
                        {{ t('admin.collection.cancel') }}
                    </button>
                    <button @click="saveDocument" class="save-btn" :disabled="editData.saving">
                        <Icon v-if="editData.saving" name="heroicons:arrow-path" class="save-icon animate-spin" />
                        {{ editData.saving ? t('admin.collection.saving') : t('admin.collection.save') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
            <div class="modal-content delete-modal" @click.stop>
                <div class="modal-header">
                    <h3 class="modal-title">{{ t('admin.collection.confirmDelete') }}</h3>
                    <button @click="closeDeleteModal" class="modal-close">
                        <Icon name="heroicons:x-mark" class="close-icon" />
                    </button>
                </div>
                <div class="modal-body">
                    <div class="delete-warning">
                        <Icon name="heroicons:exclamation-triangle" class="warning-icon" />
                        <p class="warning-text">{{ t('admin.collection.deleteWarning') }}</p>
                        <div class="document-preview">
                            <strong>{{ t('admin.collection.documentId') }}:</strong>
                            {{ deleteData.document._id || deleteData.document.id || 'Unknown' }}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="closeDeleteModal" class="cancel-btn">
                        {{ t('admin.collection.cancel') }}
                    </button>
                    <button @click="confirmDelete" class="delete-confirm-btn" :disabled="deleteData.deleting">
                        <Icon v-if="deleteData.deleting" name="heroicons:arrow-path" class="delete-icon animate-spin" />
                        {{ deleteData.deleting ? t('admin.collection.deleting') :
                            t('admin.collection.confirmDeleteAction') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="data && data.pagination.totalPages > 1" class="pagination">
            <button @click="changePage(1)" :disabled="!data.pagination.hasPrev" class="pagination-btn">
                {{ t('admin.collection.first') }}
            </button>
            <button @click="changePage(data.pagination.page - 1)" :disabled="!data.pagination.hasPrev"
                class="pagination-btn">
                {{ t('admin.collection.prev') }}
            </button>

            <span class="pagination-info">
                {{ t('admin.collection.pageInfo', {
                    current: data.pagination.page,
                    total: data.pagination.totalPages
                }) }}
            </span>

            <button @click="changePage(data.pagination.page + 1)" :disabled="!data.pagination.hasNext"
                class="pagination-btn">
                {{ t('admin.collection.next') }}
            </button>
            <button @click="changePage(data.pagination.totalPages)" :disabled="!data.pagination.hasNext"
                class="pagination-btn">
                {{ t('admin.collection.last') }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    collectionName: string;
    currentPath: string;
}

interface CollectionDocument {
    _id?: string;
    [key: string]: any;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface CollectionResponse {
    success: boolean;
    data: CollectionDocument[];
    pagination: PaginationInfo;
    meta: {
        collection: string;
        sortField: string;
        sortOrder: string;
        searchQuery: string;
    };
}

const props = defineProps<Props>();
const { t } = useI18n();

// Reactive search and pagination state
const searchQuery = ref('');
const pageSize = ref(25);
const currentPage = ref(1);
const sortField = ref('_id');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Card expansion state
const expandedCards = ref(new Set<number>());

// Modal state
const showModal = ref(false);
const modalData = ref({
    fieldName: '',
    value: null as any,
});

// Edit modal state
const showEditModal = ref(false);
const editData = ref({
    document: {} as any,
    originalDocument: {} as any,
    loading: false,
    saving: false,
});

// Delete modal state
const showDeleteModal = ref(false);
const deleteData = ref({
    document: {} as any,
    deleting: false,
});

// Computed collection display name
const collectionDisplayName = computed(() => {
    return props.collectionName
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, str => str.toUpperCase())
        .trim();
});

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams({
        page: currentPage.value.toString(),
        limit: pageSize.value.toString(),
        sort: sortField.value,
        order: sortOrder.value,
    });

    if (searchQuery.value.trim()) {
        params.set('search', searchQuery.value.trim());
    }

    return `/api/admin/database/${props.collectionName}/data?${params.toString()}`;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData(
    `admin-collection-${props.collectionName}`,
    () => $fetch<CollectionResponse>(apiEndpoint.value),
    {
        lazy: true,
        server: false,
        watch: [apiEndpoint],
    }
);

// Card helper methods
const getDocumentKeys = (document: any): string[] => {
    return Object.keys(document).filter(key => key !== '__v');
};

const getVisibleKeys = (document: any): string[] => {
    const keys = getDocumentKeys(document);
    return keys.slice(0, 5);
};

const getHiddenKeys = (document: any): string[] => {
    const keys = getDocumentKeys(document);
    return keys.slice(5);
};

const hasMoreKeys = (document: any): boolean => {
    return getDocumentKeys(document).length > 5;
};

const toggleExpanded = (index: number) => {
    if (expandedCards.value.has(index)) {
        expandedCards.value.delete(index);
    } else {
        expandedCards.value.add(index);
    }
};

// Value formatting and truncation
const truncateValue = (value: any, maxLength: number = 50): string => {
    const formatted = formatCellValue(value);
    if (formatted.length > maxLength) {
        return formatted.substring(0, maxLength) + '...';
    }
    return formatted;
};

const isValueTruncated = (value: any, maxLength: number = 50): boolean => {
    const formatted = formatCellValue(value);
    return formatted.length > maxLength;
};

// Modal methods
const showFullValue = (document: any, key: string) => {
    modalData.value = {
        fieldName: formatColumnName(key),
        value: document[key],
    };
    showModal.value = true;
};

const closeModal = () => {
    showModal.value = false;
    modalData.value = { fieldName: '', value: null };
};

const formatModalValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
};

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(formatModalValue(modalData.value.value));
        // You could add a toast notification here
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
    }
};

// Edit modal functions
const closeEditModal = () => {
    showEditModal.value = false;
    editData.value = {
        document: {},
        originalDocument: {},
        loading: false,
        saving: false,
    };
};

const isComplexValue = (value: any): boolean => {
    return typeof value === 'string' && (value.startsWith('{') || value.startsWith('['));
};

const saveDocument = async () => {
    if (!editData.value.document._id) {
        console.error('No document ID found');
        return;
    }

    editData.value.saving = true;

    try {
        // Prepare the document for saving - parse JSON strings back to objects
        const documentToSave = { ...editData.value.document };

        for (const [key, value] of Object.entries(documentToSave)) {
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                try {
                    documentToSave[key] = JSON.parse(value);
                } catch (parseError) {
                    console.error(`Failed to parse JSON for field ${key}:`, parseError);
                    // Keep as string if JSON parsing fails
                }
            }
        }

        const response = await $fetch(`/api/admin/database/${props.collectionName}/${editData.value.document._id}`, {
            method: 'PUT',
            body: documentToSave,
        });

        if (response.success) {
            // Refresh the data to show updated values
            await refreshData();
            closeEditModal();
        } else {
            console.error('Failed to save document:', response.error);
        }
    } catch (error) {
        console.error('Error saving document:', error);
    } finally {
        editData.value.saving = false;
    }
};

// Delete modal functions
const closeDeleteModal = () => {
    showDeleteModal.value = false;
    deleteData.value = {
        document: {},
        deleting: false,
    };
};

const confirmDelete = async () => {
    if (!deleteData.value.document._id) {
        console.error('No document ID found');
        return;
    }

    deleteData.value.deleting = true;

    try {
        const response = await $fetch(`/api/admin/database/${props.collectionName}/${deleteData.value.document._id}`, {
            method: 'DELETE',
        });

        if (response.success) {
            // Refresh the data to reflect deletion
            await refreshData();
            closeDeleteModal();
        } else {
            console.error('Failed to delete document:', response.error);
        }
    } catch (error) {
        console.error('Error deleting document:', error);
    } finally {
        deleteData.value.deleting = false;
    }
};

// Add keyboard event listener for delete modal
onMounted(() => {
    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && showDeleteModal.value) {
            confirmDelete();
        }
        if (event.key === 'Escape') {
            if (showDeleteModal.value) closeDeleteModal();
            if (showEditModal.value) closeEditModal();
            if (showModal.value) closeModal();
        }
    };

    document.addEventListener('keydown', handleKeydown);

    onUnmounted(() => {
        document.removeEventListener('keydown', handleKeydown);
    });
});

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1; // Reset to first page on search
    expandedCards.value.clear(); // Clear expanded state on search
}, 500);

// Pagination handlers
const changePage = (page: number) => {
    currentPage.value = page;
    expandedCards.value.clear(); // Clear expanded state on page change
};

const handlePageSizeChange = () => {
    currentPage.value = 1; // Reset to first page when changing page size
    expandedCards.value.clear(); // Clear expanded state on page size change
};

// Sorting handler (no longer needed for cards, but keeping for API compatibility)
const handleSort = (column: string) => {
    if (sortField.value === column) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = column;
        sortOrder.value = 'asc';
    }
    currentPage.value = 1; // Reset to first page on sort
    expandedCards.value.clear(); // Clear expanded state on sort
};

// Formatting helpers
const formatColumnName = (column: string): string => {
    return column.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
};

const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && value.length > 50) {
        return value.substring(0, 50) + '...';
    }
    return String(value);
};

// Document actions
const editDocument = (document: any) => {
    editData.value.originalDocument = { ...document };
    // Deep clone and handle JSON serialization for objects
    const clonedDoc = JSON.parse(JSON.stringify(document));

    // Convert objects/arrays to JSON strings for editing
    for (const [key, value] of Object.entries(clonedDoc)) {
        if (typeof value === 'object' && value !== null) {
            clonedDoc[key] = JSON.stringify(value, null, 2);
        }
    }

    editData.value.document = clonedDoc;
    showEditModal.value = true;
};

const deleteDocument = (document: any) => {
    deleteData.value.document = document;
    showDeleteModal.value = true;
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
.collection-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-6);
    gap: var(--space-6);
}

.collection-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
}

.header-info {
    flex: 1;
}

.collection-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.collection-description {
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

.collection-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
}

.search-container {
    position: relative;
    flex: 1;
    max-width: 400px;
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
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-10);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.search-input:focus {
    outline: none;
    border-color: var(--color-border-focus);
}

.search-input::placeholder {
    color: var(--color-text-tertiary);
}

.controls-right {
    display: flex;
    align-items: center;
    gap: var(--space-4);
}

.page-size-select {
    padding: var(--space-3);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.cards-container {
    flex: 1;
    overflow-y: auto;
}

.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: var(--space-4);
    padding: var(--space-4) 0;
}

.document-card {
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: transform var(--duration-150) ease-in-out, box-shadow var(--duration-150) ease-in-out;
}

.document-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg-subtle);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    background: var(--color-surface-alpha-medium);
    border-bottom: 1px solid var(--color-border-light);
}

.card-id {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.id-icon {
    width: var(--space-4);
    height: var(--space-4);
    color: var(--color-brand-primary);
}

.id-text {
    color: var(--color-text-primary);
    font-weight: var(--font-semibold);
    font-size: var(--text-sm);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.card-actions {
    display: flex;
    gap: var(--space-2);
}

.card-content {
    padding: var(--space-4);
}

.field-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
}

.field-row:last-child {
    margin-bottom: 0;
}

.field-label {
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.field-value {
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    word-break: break-word;
    cursor: pointer;
    padding: var(--space-2);
    border-radius: var(--radius-base);
    background: var(--color-surface-alpha-subtle);
    border: 1px solid transparent;
    transition: all var(--duration-150) ease-in-out;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.field-value:hover {
    background: var(--color-surface-alpha-medium);
    border-color: var(--color-border-focus);
}

.view-icon {
    width: var(--text-sm);
    height: var(--text-sm);
    color: var(--color-brand-primary);
    flex-shrink: 0;
    margin-left: var(--space-2);
}

.show-more-container {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-light);
}

.show-more-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-brand-primary-alpha);
    border: 1px solid var(--color-brand-primary);
    border-radius: var(--radius-base);
    color: var(--color-brand-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--duration-150) ease-in-out;
    width: 100%;
    justify-content: center;
}

.show-more-btn:hover {
    background: var(--color-brand-primary-hover-alpha);
}

.chevron-icon {
    width: var(--text-sm);
    height: var(--text-sm);
}

.expanded-content {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-light);
}

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
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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

.modal-value {
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-base);
    padding: var(--space-4);
    color: var(--color-text-primary);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: var(--text-sm);
    line-height: var(--line-height-normal);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
}

.modal-footer {
    padding: var(--space-4);
    border-top: 1px solid var(--color-border-light);
    display: flex;
    justify-content: flex-end;
}

.copy-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-brand-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--duration-150) ease-in-out;
}

.copy-btn:hover {
    background-color: var(--color-brand-primary-hover);
}

.copy-icon {
    width: var(--text-sm);
    height: var(--text-sm);
}

.edit-modal {
    max-width: 900px;
    max-height: 90vh;
}

.edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.edit-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.edit-label {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
}

.edit-input,
.edit-textarea {
    padding: var(--space-3);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    transition: border-color var(--duration-150) ease-in-out;
}

.edit-input:focus,
.edit-textarea:focus {
    outline: none;
    border-color: var(--color-border-focus);
}

.edit-readonly {
    background: var(--color-surface-alpha-medium);
    color: var(--color-text-tertiary);
    cursor: not-allowed;
}

.edit-textarea {
    resize: vertical;
    min-height: 80px;
}

.cancel-btn {
    padding: var(--space-3) var(--space-6);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--duration-150) ease-in-out;
}

.cancel-btn:hover {
    background: var(--color-surface-alpha-medium);
    border-color: var(--color-border-focus);
}

.save-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    background-color: var(--color-success);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--duration-150) ease-in-out;
}

.save-btn:hover:not(:disabled) {
    background-color: var(--color-success-dark);
}

.save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.save-icon {
    width: var(--text-sm);
    height: var(--text-sm);
}

.delete-modal {
    max-width: 500px;
}

.delete-warning {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
}

.warning-icon {
    width: var(--space-12);
    height: var(--space-12);
    color: var(--color-warning);
}

.warning-text {
    color: var(--color-text-secondary);
    font-size: var(--text-base);
    margin: 0;
}

.document-preview {
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    text-align: left;
    width: 100%;
}

.delete-confirm-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    background-color: var(--color-danger);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--duration-150) ease-in-out;
}

.delete-confirm-btn:hover:not(:disabled) {
    background-color: var(--color-danger-dark);
}

.delete-confirm-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.delete-icon {
    width: var(--text-sm);
    height: var(--text-sm);
}

.action-btn {
    padding: var(--space-1-5);
    border: none;
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: background-color var(--duration-150) ease-in-out;
}

.edit-btn {
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
}

.edit-btn:hover {
    background-color: var(--color-primary-dark);
}

.delete-btn {
    background-color: var(--color-danger);
    color: var(--color-text-inverse);
}

.delete-btn:hover {
    background-color: var(--color-danger-dark);
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

.loading-container,
.error-container,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    gap: var(--space-4);
}

.loading-icon,
.error-icon,
.empty-icon {
    width: var(--space-8);
    height: var(--space-8);
    color: var(--color-text-tertiary);
}

.loading-text,
.error-text,
.empty-text {
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
}

.error-retry {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .collection-view {
        padding: var(--space-4);
    }

    .collection-header {
        flex-direction: column;
        gap: var(--space-4);
    }

    .collection-controls {
        flex-direction: column;
        align-items: stretch;
    }

    .search-container {
        max-width: none;
    }

    .cards-grid {
        grid-template-columns: 1fr;
    }

    .document-card {
        min-width: 0;
    }

    .modal-overlay {
        padding: var(--space-2);
    }

    .modal-content {
        max-height: 90vh;
    }
}
</style>
