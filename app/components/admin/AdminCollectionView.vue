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
    padding: 1.5rem;
    gap: 1.5rem;
}

.collection-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.header-info {
    flex: 1;
}

.collection-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.collection-description {
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

.collection-controls {
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

.controls-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.page-size-select {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.cards-container {
    flex: 1;
    overflow-y: auto;
}

.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
    padding: 1rem 0;
}

.document-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    overflow: hidden;
    transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.document-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgb(55, 55, 55);
}

.card-id {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.id-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(96, 165, 250);
}

.id-text {
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.card-actions {
    display: flex;
    gap: 0.5rem;
}

.card-content {
    padding: 1rem;
}

.field-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
}

.field-row:last-child {
    margin-bottom: 0;
}

.field-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(156, 163, 175);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.field-value {
    color: rgb(209, 213, 219);
    font-size: 0.875rem;
    word-break: break-word;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid transparent;
    transition: all 0.15s ease-in-out;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.field-value:hover {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgb(96, 165, 250);
}

.view-icon {
    width: 0.875rem;
    height: 0.875rem;
    color: rgb(96, 165, 250);
    flex-shrink: 0;
    margin-left: 0.5rem;
}

.show-more-container {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgb(55, 55, 55);
}

.show-more-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgb(59, 130, 246);
    border-radius: 0.25rem;
    color: rgb(96, 165, 250);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    width: 100%;
    justify-content: center;
}

.show-more-btn:hover {
    background: rgba(59, 130, 246, 0.2);
}

.chevron-icon {
    width: 0.875rem;
    height: 0.875rem;
}

.expanded-content {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgb(55, 55, 55);
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
}

.modal-content {
    background: rgb(17, 24, 39);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
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
    padding: 1rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.modal-title {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
}

.modal-close {
    padding: 0.25rem;
    background: none;
    border: none;
    color: rgb(156, 163, 175);
    cursor: pointer;
    border-radius: 0.25rem;
    transition: color 0.15s ease-in-out;
}

.modal-close:hover {
    color: white;
}

.close-icon {
    width: 1.25rem;
    height: 1.25rem;
}

.modal-body {
    flex: 1;
    overflow: auto;
    padding: 1rem;
}

.modal-value {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.25rem;
    padding: 1rem;
    color: rgb(209, 213, 219);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
}

.modal-footer {
    padding: 1rem;
    border-top: 1px solid rgb(55, 55, 55);
    display: flex;
    justify-content: flex-end;
}

.copy-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: rgb(59, 130, 246);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.copy-btn:hover {
    background-color: rgb(37, 99, 235);
}

.copy-icon {
    width: 0.875rem;
    height: 0.875rem;
}

.edit-modal {
    max-width: 900px;
    max-height: 90vh;
}

.edit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.edit-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
}

.edit-input,
.edit-textarea {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    transition: border-color 0.15s ease-in-out;
}

.edit-input:focus,
.edit-textarea:focus {
    outline: none;
    border-color: rgb(96, 165, 250);
}

.edit-readonly {
    background: rgba(0, 0, 0, 0.5);
    color: rgb(156, 163, 175);
    cursor: not-allowed;
}

.edit-textarea {
    resize: vertical;
    min-height: 80px;
}

.cancel-btn {
    padding: 0.75rem 1.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
}

.cancel-btn:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgb(96, 165, 250);
}

.save-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background-color: rgb(34, 197, 94);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.save-btn:hover:not(:disabled) {
    background-color: rgb(22, 163, 74);
}

.save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.save-icon {
    width: 0.875rem;
    height: 0.875rem;
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
    width: 3rem;
    height: 3rem;
    color: rgb(245, 158, 11);
}

.warning-text {
    color: rgb(209, 213, 219);
    font-size: 1rem;
    margin: 0;
}

.document-preview {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    padding: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875rem;
    color: rgb(209, 213, 219);
    text-align: left;
    width: 100%;
}

.delete-confirm-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background-color: rgb(239, 68, 68);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.delete-confirm-btn:hover:not(:disabled) {
    background-color: rgb(220, 38, 38);
}

.delete-confirm-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.delete-icon {
    width: 0.875rem;
    height: 0.875rem;
}

.action-btn {
    padding: 0.375rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
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

.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 0;
}

.pagination-btn {
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.pagination-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgb(96, 165, 250);
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

/* Responsive adjustments */
@media (max-width: 768px) {
    .collection-view {
        padding: 1rem;
    }

    .collection-header {
        flex-direction: column;
        gap: 1rem;
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
        padding: 0.5rem;
    }

    .modal-content {
        max-height: 90vh;
    }
}
</style>
