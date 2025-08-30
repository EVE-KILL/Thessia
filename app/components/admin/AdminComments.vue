<template>
    <div class="admin-comments-container">
        <!-- Header -->
        <div class="admin-header">
            <div class="header-content">
                <div class="header-text">
                    <h1 class="admin-title">{{ t('admin.comments.title') }}</h1>
                    <p class="admin-description">{{ t('admin.comments.description') }}</p>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="loading-container">
            <div class="loading-spinner"></div>
            <p>{{ t('admin.comments.loading') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
            <div class="error-content">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <h3 class="error-title">{{ t('admin.comments.error.title') }}</h3>
                <p class="error-message">{{ error }}</p>
                <button @click="refresh()" class="error-retry">
                    {{ t('admin.comments.error.retry') }}
                </button>
            </div>
        </div>

        <!-- Comments List -->
        <div v-else-if="data" class="admin-content">
            <!-- Stats -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon-container total">
                        <Icon name="heroicons:chat-bubble-left-right" class="stat-icon" />
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-value">{{ displayStats.total }}</h3>
                        <p class="stat-label">{{ t('admin.comments.stats.total') }}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container recent">
                        <Icon name="heroicons:clock" class="stat-icon" />
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-value">{{ displayStats.today }}</h3>
                        <p class="stat-label">{{ t('admin.comments.stats.today') }}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container week">
                        <Icon name="heroicons:calendar-days" class="stat-icon" />
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-value">{{ displayStats.thisWeek }}</h3>
                        <p class="stat-label">{{ t('admin.comments.stats.thisWeek') }}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-container month">
                        <Icon name="heroicons:chart-bar" class="stat-icon" />
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-value">{{ displayStats.thisMonth }}</h3>
                        <p class="stat-label">{{ t('admin.comments.stats.thisMonth') }}</p>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="filters-section">
                <div class="filters-header">
                    <div class="filters-title">
                        <h3>{{ t('admin.comments.filters.title') }}</h3>
                    </div>
                    <div class="filters-toggles">
                        <label class="toggle-container">
                            <input v-model="showDeleted" type="checkbox" class="toggle-checkbox"
                                @change="updateFilters">
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">{{ t('admin.comments.filters.showDeleted') }}</span>
                        </label>
                    </div>
                </div>
                <div class="filters-grid">
                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.comments.filters.textSearch') }}</label>
                        <div class="search-input-container">
                            <input v-model="textSearchQuery" type="text"
                                :placeholder="t('admin.comments.filters.textSearchPlaceholder')" class="filter-input"
                                :class="{ 'searching': searchInProgress }" />
                            <div v-if="searchInProgress" class="search-spinner">
                                <Icon name="heroicons:arrow-path" class="animate-spin" />
                            </div>
                            <div v-if="textSearchQuery && textSearchQuery.length > 0 && textSearchQuery.length < MIN_SEARCH_LENGTH"
                                class="search-hint">
                                {{ t('admin.comments.filters.minLength', { min: MIN_SEARCH_LENGTH }) }}
                            </div>
                        </div>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.comments.filters.entitySearch') }}</label>
                        <Search v-model="entitySearchQuery"
                            :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                            :transform-response="(data: any) => data?.hits?.filter((hit: any) => ['character', 'corporation', 'alliance'].includes(hit.type)) || []"
                            :result-name="(result: any) => result.name" :min-length="2"
                            :placeholder="t('admin.comments.filters.entitySearchPlaceholder')"
                            input-class="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            dropdown-class="entity-search-dropdown"
                            @select="handleEntitySelect" @clear="handleEntityClear">
                            <template #results="{ results, selectResult }">
                                <a v-for="result in results" :key="result.id" @click="selectResult(result)"
                                    class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-100 hover:bg-gray-700 border-b border-gray-600 last:border-b-0">
                                    <div class="flex-shrink-0 mr-3">
                                        <Image :type="result.type" :id="result.id" :size="24" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium truncate">{{ result.name }}</div>
                                        <div class="text-xs text-gray-400 capitalize">{{ result.type }}</div>
                                    </div>
                                </a>
                            </template>
                            <template #loading>
                                <div class="px-4 py-2 text-sm text-gray-400">
                                    {{ t('admin.comments.filters.searching') }}...
                                </div>
                            </template>
                            <template #no-results>
                                <div class="px-4 py-2 text-sm text-gray-400">
                                    {{ t('admin.comments.filters.noResults') }}
                                </div>
                            </template>
                        </Search>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.comments.filters.timeRange') }}</label>
                        <select v-model="dateFilter" class="filter-select" @change="updateFilters">
                            <option value="all">{{ t('admin.comments.filters.allTime') }}</option>
                            <option value="today">{{ t('admin.comments.filters.today') }}</option>
                            <option value="week">{{ t('admin.comments.filters.thisWeek') }}</option>
                            <option value="month">{{ t('admin.comments.filters.thisMonth') }}</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">{{ t('admin.comments.filters.selectedEntity') }}</label>
                        <div v-if="selectedEntity" class="selected-entity">
                            <span class="entity-name">{{ selectedEntity.name }}</span>
                            <span class="entity-type">{{ selectedEntity.type }}</span>
                            <button @click="handleEntityClear" class="clear-entity-btn">
                                <Icon name="heroicons:x-mark" class="clear-icon" />
                            </button>
                        </div>
                        <div v-else class="no-entity">{{ t('admin.comments.filters.noEntitySelected') }}</div>
                    </div>
                </div>
            </div>

            <!-- Comments List -->
            <div class="comments-list">
                <div v-for="comment in filteredComments" :key="comment._id" class="comment-row">
                    <!-- Comment Display Card -->
                    <div class="comment-display-card" :class="{ 'deleted-comment': comment.deleted }">
                        <div class="comment-header">
                            <div class="comment-author">
                                <NuxtLink v-if="comment.characterId" :to="`/character/${comment.characterId}`"
                                    class="author-link">
                                    <Image :id="comment.characterId" type="character" :size="32"
                                        class="author-avatar" />
                                    <span class="author-name">{{ comment.characterName || 'Unknown Character' }}</span>
                                </NuxtLink>
                                <div v-else class="author-link">
                                    <div class="author-avatar-placeholder"></div>
                                    <span class="author-name">{{ comment.characterName || 'Unknown Character' }}</span>
                                </div>
                                <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                                <div v-if="comment.deleted" class="deleted-badge">
                                    <Icon name="heroicons:trash" class="deleted-icon" />
                                    {{ t('admin.comments.deletedBadge') }}
                                </div>
                            </div>
                            <div v-if="getKillmailId(comment.killIdentifier)" class="comment-killmail">
                                <Icon name="heroicons:document-text" class="killmail-icon" />
                                <span class="killmail-label">{{ t('admin.comments.killmailLabel') }}:</span>
                                <NuxtLink :to="`/killmail/${getKillmailId(comment.killIdentifier)}`"
                                    class="killmail-link">
                                    {{ getKillmailId(comment.killIdentifier) }}
                                </NuxtLink>
                            </div>
                            <div v-else class="comment-killmail">
                                <Icon name="heroicons:document-text" class="killmail-icon" />
                                <span class="killmail-label">{{ t('admin.comments.killmailLabel') }}:</span>
                                <span class="killmail-missing">{{ t('admin.comments.killmailMissing') }}</span>
                            </div>
                        </div>
                        <div class="comment-content">
                            <Comment :comment="comment.comment || ''" />
                        </div>
                    </div>

                    <!-- Comment Actions Card -->
                    <div class="comment-actions-card">
                        <div class="actions-header">
                            <h4 class="actions-title">{{ t('admin.comments.actionsTitle') }}</h4>
                        </div>
                        <div class="actions-content">
                            <div class="action-buttons">
                                <NuxtLink v-if="getKillmailId(comment.killIdentifier)"
                                    :to="`/killmail/${getKillmailId(comment.killIdentifier)}`"
                                    class="action-btn view-btn">
                                    <Icon name="heroicons:eye" class="action-btn-icon" />
                                    {{ t('admin.comments.viewKillmail') }}
                                </NuxtLink>
                                <div v-else class="action-btn view-btn disabled"
                                    :title="t('admin.comments.killmailMissing')">
                                    <Icon name="heroicons:eye-slash" class="action-btn-icon" />
                                    {{ t('admin.comments.noKillmail') }}
                                </div>
                                <template v-if="comment.deleted">
                                    <!-- Actions for deleted comments -->
                                    <button @click="restoreComment(comment)" class="action-btn restore-btn">
                                        <Icon name="heroicons:arrow-path" class="action-btn-icon" />
                                        {{ t('admin.comments.restore') }}
                                    </button>
                                </template>
                                <template v-else>
                                    <!-- Actions for active comments -->
                                    <button @click="editComment(comment)" class="action-btn edit-btn">
                                        <Icon name="heroicons:pencil" class="action-btn-icon" />
                                        {{ t('admin.comments.edit.title') }}
                                    </button>
                                    <button @click="deleteComment(comment)" class="action-btn delete-btn">
                                        <Icon name="heroicons:trash" class="action-btn-icon" />
                                        {{ t('admin.comments.delete.title') }}
                                    </button>
                                </template>
                            </div>
                            <div class="comment-meta">
                                <div class="meta-item">
                                    <span class="meta-label">{{ t('admin.comments.commentId') }}:</span>
                                    <span class="meta-value">{{ comment._id }}</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">{{ t('admin.comments.createdAt') }}:</span>
                                    <span class="meta-value">{{ formatDate(comment.createdAt) }}</span>
                                </div>
                                <div v-if="comment.updatedAt && comment.updatedAt !== comment.createdAt"
                                    class="meta-item">
                                    <span class="meta-label">{{ t('admin.comments.updatedAt') }}:</span>
                                    <span class="meta-value">{{ formatDate(comment.updatedAt) }}</span>
                                </div>
                                <div v-if="comment.corporationName" class="meta-item">
                                    <span class="meta-label">{{ t('admin.comments.corporation') }}:</span>
                                    <span class="meta-value">{{ comment.corporationName }}</span>
                                </div>
                                <div v-if="comment.allianceName" class="meta-item">
                                    <span class="meta-label">{{ t('admin.comments.alliance') }}:</span>
                                    <span class="meta-value">{{ comment.allianceName }}</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">{{ t('admin.comments.status') }}:</span>
                                    <span class="meta-value"
                                        :class="comment.deleted ? 'status-deleted' : 'status-active'">
                                        {{ comment.deleted ? t('admin.comments.statusDeleted') :
                                            t('admin.comments.statusActive') }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Comments -->
                <div v-if="!filteredComments?.length" class="no-comments">
                    <Icon name="heroicons:chat-bubble-left-right" class="no-comments-icon" />
                    <h3 class="no-comments-title">{{ t('admin.comments.noComments.title') }}</h3>
                    <p class="no-comments-message">{{ t('admin.comments.noComments.message') }}</p>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="data.pagination && data.pagination.totalPages > 1" class="pagination-container">
                <div class="pagination">
                    <button @click="goToPage(1)" :disabled="data.pagination.currentPage === 1"
                        class="pagination-btn pagination-first">
                        <Icon name="heroicons:chevron-double-left" class="pagination-icon" />
                    </button>
                    <button @click="goToPage(data.pagination.currentPage - 1)" :disabled="!data.pagination.hasPrevPage"
                        class="pagination-btn pagination-prev">
                        <Icon name="heroicons:chevron-left" class="pagination-icon" />
                    </button>

                    <div class="pagination-info">
                        <span class="pagination-current">{{ data.pagination.currentPage }}</span>
                        <span class="pagination-separator">of</span>
                        <span class="pagination-total">{{ data.pagination.totalPages }}</span>
                    </div>

                    <button @click="goToPage(data.pagination.currentPage + 1)" :disabled="!data.pagination.hasNextPage"
                        class="pagination-btn pagination-next">
                        <Icon name="heroicons:chevron-right" class="pagination-icon" />
                    </button>
                    <button @click="goToPage(data.pagination.totalPages)"
                        :disabled="data.pagination.currentPage === data.pagination.totalPages"
                        class="pagination-btn pagination-last">
                        <Icon name="heroicons:chevron-double-right" class="pagination-icon" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3 class="modal-title">{{ t('admin.comments.edit.title') }}</h3>
                    <button @click="closeEditModal" class="modal-close">
                        <Icon name="heroicons:x-mark" class="modal-close-icon" />
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">{{ t('admin.comments.edit.comment') }}</label>
                        <textarea v-model="editingComment.comment" class="form-textarea" rows="6"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="closeEditModal" class="modal-btn secondary">
                        {{ t('admin.comments.edit.cancel') }}
                    </button>
                    <button @click="saveComment" class="modal-btn primary" :disabled="saving">
                        <Icon v-if="saving" name="heroicons:arrow-path" class="btn-icon spinning" />
                        {{ saving ? t('admin.comments.edit.saving') : t('admin.comments.edit.save') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3 class="modal-title">{{ t('admin.comments.delete.title') }}</h3>
                    <button @click="closeDeleteModal" class="modal-close">
                        <Icon name="heroicons:x-mark" class="modal-close-icon" />
                    </button>
                </div>
                <div class="modal-body">
                    <div class="delete-warning">
                        <Icon name="heroicons:exclamation-triangle" class="warning-icon" />
                        <p>{{ t('admin.comments.delete.warning') }}</p>
                        <div class="comment-preview">
                            <strong>{{ commentToDelete?.character_name }}</strong>
                            <div v-html="commentToDelete?.comment"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="closeDeleteModal" class="modal-btn secondary">
                        {{ t('admin.comments.delete.cancel') }}
                    </button>
                    <button @click="confirmDeleteComment" class="modal-btn danger" :disabled="deleting">
                        <Icon v-if="deleting" name="heroicons:arrow-path" class="btn-icon spinning" />
                        {{ deleting ? t('admin.comments.delete.deleting') : t('admin.comments.delete.confirm') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface SearchResult {
    id: string
    name: string
    type: 'character' | 'corporation' | 'alliance'
}

interface Comment {
    _id: string
    comment: string
    characterId?: number
    characterName?: string
    corporationId?: number
    corporationName?: string
    allianceId?: number
    allianceName?: string
    killIdentifier?: string
    createdAt: string
    updatedAt?: string
    deleted?: boolean
}

interface AdminCommentsResponse {
    comments: Comment[]
    stats: {
        total: number
        today: number
        thisWeek: number
        thisMonth: number
    }
    pagination: {
        currentPage: number
        totalPages: number
        hasNextPage: boolean
        hasPrevPage: boolean
        total: number
    }
}

const { t } = useI18n();

// Reactive state
const textSearchQuery = ref('')
const entitySearchQuery = ref('')
const selectedEntity = ref<SearchResult | null>(null)

// Search configuration
const MIN_SEARCH_LENGTH = 3
const searchInProgress = ref(false)
const searchController = ref<AbortController | null>(null)

const dateFilter = ref('all')
const statusFilter = ref('active')
const showDeleted = ref(false)
const currentPage = ref(1)
const commentsPerPage = ref(25)
const sortBy = ref('createdAt')
const sortOrder = ref('desc')
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingComment = ref<any>({});
const commentToDelete = ref<any>(null);
const saving = ref(false);
const deleting = ref(false);

// Filter and validate comments
const filteredComments = computed<Comment[]>(() => {
    if (!data.value?.comments) return [];

    return data.value.comments.filter((comment: Comment) => {
        // Filter out comments with completely invalid data
        if (!comment || !comment._id || !comment.comment) {
            return false;
        }

        // If not showing deleted, filter out soft-deleted comments (should be handled by API, but double-check)
        if (!showDeleted.value && comment.deleted) {
            return false;
        }

        // Note: Entity filtering is now handled server-side, so we don't need client-side entity filtering

        // Client-side date filtering since API doesn't support it
        if (dateFilter.value !== 'all') {
            const commentDate = new Date(comment.createdAt);
            const now = new Date();

            switch (dateFilter.value) {
                case 'today':
                    const today = new Date(now.setHours(0, 0, 0, 0));
                    if (commentDate < today) {
                        return false;
                    }
                    break;
                case 'week':
                    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (commentDate < thisWeek) {
                        return false;
                    }
                    break;
                case 'month':
                    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    if (commentDate < thisMonth) {
                        return false;
                    }
                    break;
            }
        }

        return true;
    });
});

// Display stats based on filtered results
const displayStats = computed(() => {
    if (!data.value?.stats) {
        return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
    }

    // If no client-side filters are applied, return the server-provided stats
    // (Entity filtering is handled server-side, so selectedEntity doesn't affect this condition)
    if (!textSearchQuery.value && dateFilter.value === 'all') {
        return data.value.stats;
    }

    // Calculate stats based on client-side filtered comments (for date filtering only)
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
        total: filteredComments.value.length,
        today: filteredComments.value.filter((comment: Comment) => new Date(comment.createdAt) >= today).length,
        thisWeek: filteredComments.value.filter((comment: Comment) => new Date(comment.createdAt) >= thisWeek).length,
        thisMonth: filteredComments.value.filter((comment: Comment) => new Date(comment.createdAt) >= thisMonth).length,
    };
});

// Helper function to extract killmail ID from killIdentifier
const getKillmailId = (killIdentifier?: string) => {
    if (!killIdentifier) return null;

    // killIdentifier is in format "kill:129119022"
    const parts = killIdentifier.split(':');
    if (parts.length === 2 && parts[0] === 'kill') {
        return parts[1];
    }

    return null;
};

// Manual data management instead of reactive useFetch
const data = ref<AdminCommentsResponse>({
    comments: [],
    stats: { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
    pagination: { currentPage: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, total: 0 }
});
const pending = ref(false);
const error = ref<string | null>(null);

// Build query parameters function
const buildQueryParams = () => {
    const baseQuery = {
        page: currentPage.value,
        limit: commentsPerPage.value,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        showDeleted: showDeleted.value,
    };

    // Add text search if it meets minimum length requirement
    if (textSearchQuery.value && textSearchQuery.value.length >= MIN_SEARCH_LENGTH) {
        baseQuery.search = textSearchQuery.value;
    }

    // Add entity filtering if an entity is selected
    if (selectedEntity.value) {
        switch (selectedEntity.value.type) {
            case 'character':
                baseQuery.characterId = selectedEntity.value.id;
                break;
            case 'corporation':
                baseQuery.corporationId = selectedEntity.value.id;
                break;
            case 'alliance':
                baseQuery.allianceId = selectedEntity.value.id;
                break;
        }
    }

    return baseQuery;
};

// Manual refresh function
const refresh = async () => {
    pending.value = true;
    error.value = null;

    try {
        const result = await $fetch<AdminCommentsResponse>('/api/admin/comments', {
            query: buildQueryParams(),
        });
        data.value = result;
    } catch (err: any) {
        error.value = err.message || 'Failed to fetch comments';
        console.error('Failed to fetch comments:', err);
    } finally {
        pending.value = false;
    }
};

// Initial load
await refresh();

// Update filters and reset to page 1
const updateFilters = () => {
    currentPage.value = 1;
    refresh();
};

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page;
    refresh();
};

// Edit comment
const editComment = (comment: any) => {
    editingComment.value = { ...comment };
    showEditModal.value = true;
};

const closeEditModal = () => {
    showEditModal.value = false;
    editingComment.value = {};
};

const saveComment = async () => {
    if (!editingComment.value._id || !editingComment.value.comment.trim()) return;

    saving.value = true;
    try {
        await $fetch(`/api/admin/comments/${editingComment.value._id}`, {
            method: 'PUT',
            body: { comment: editingComment.value.comment }
        });

        closeEditModal();
        await refresh();
    } catch (error) {
        console.error('Failed to update comment:', error);
    } finally {
        saving.value = false;
    }
};

// Search and entity handling
const searchTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);

const performDelayedTextSearch = async () => {
    // Clear any existing timeout
    if (searchTimeoutId.value) {
        clearTimeout(searchTimeoutId.value);
        searchTimeoutId.value = null;
    }

    // Cancel previous search if in progress
    if (searchController.value) {
        searchController.value.abort();
        searchController.value = null;
    }

    // Don't search for short queries, but allow clearing (empty string)
    if (textSearchQuery.value.length > 0 && textSearchQuery.value.length < MIN_SEARCH_LENGTH) {
        return;
    }
    
    // Set a new timeout for the actual search
    searchTimeoutId.value = setTimeout(async () => {
        searchInProgress.value = true;
        searchController.value = new AbortController();
        
        try {
            currentPage.value = 1;
            await refresh(); // This will now use textSearchQuery.value in buildQueryParams
        } catch (err: any) {
            // Ignore abort errors
            if (err.name !== 'AbortError') {
                console.error('Search error:', err);
            }
        } finally {
            searchInProgress.value = false;
            searchController.value = null;
            searchTimeoutId.value = null;
        }
    }, 300); // 300ms delay
};

watch(textSearchQuery, (newValue, oldValue) => {
    // Only trigger search if the value actually changed
    if (newValue !== oldValue) {
        // Trigger the timeout-based search
        performDelayedTextSearch();
    }
});

const handleEntitySelect = (entity: SearchResult) => {
    selectedEntity.value = entity
    entitySearchQuery.value = '' // Clear the input after selection
    currentPage.value = 1
    refresh()
}

const handleEntityClear = () => {
    selectedEntity.value = null
    currentPage.value = 1
    refresh()
}

// Delete comment
const deleteComment = (comment: any) => {
    commentToDelete.value = comment;
    showDeleteModal.value = true;
};

const closeDeleteModal = () => {
    showDeleteModal.value = false;
    commentToDelete.value = null;
};

const confirmDeleteComment = async () => {
    if (!commentToDelete.value?._id) return;

    deleting.value = true;
    try {
        await $fetch(`/api/admin/comments/${commentToDelete.value._id}`, {
            method: 'DELETE'
        });

        closeDeleteModal();
        await refresh();
    } catch (error) {
        console.error('Failed to delete comment:', error);
    } finally {
        deleting.value = false;
    }
};

// Restore comment
const restoreComment = async (comment: any) => {
    if (!comment._id) return;

    try {
        await $fetch(`/api/admin/comments/${comment._id}/restore`, {
            method: 'POST'
        });

        await refresh();
    } catch (error) {
        console.error('Failed to restore comment:', error);
    }
};

// Format date helper
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
};

// Cleanup on unmount
onUnmounted(() => {
    if (searchTimeoutId.value) {
        clearTimeout(searchTimeoutId.value);
    }
    if (searchController.value) {
        searchController.value.abort();
    }
});

// Set page title
useSeoMeta({
    title: `${t('admin.comments.title')} - Admin Panel`,
    description: t('admin.comments.description'),
});
</script>

<style scoped>
/* Admin Container */
.admin-comments-container {
    padding: 2rem;
    min-height: 100vh;
    color: white;
}

/* Header */
.admin-header {
    margin-bottom: 2rem;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
}

.header-text h1.admin-title {
    font-size: 2.25rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 0.5rem 0;
}

.admin-description {
    color: rgb(156, 163, 175);
    font-size: 1.125rem;
    margin: 0;
}

/* Loading and Error States */
.loading-container,
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
}

.loading-spinner {
    width: 3rem;
    height: 3rem;
    border: 3px solid rgb(55, 65, 81);
    border-top: 3px solid rgb(59, 130, 246);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.error-content {
    max-width: 24rem;
}

.error-icon {
    width: 4rem;
    height: 4rem;
    color: rgb(239, 68, 68);
    margin-bottom: 1rem;
}

.error-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.error-message {
    color: rgb(156, 163, 175);
    margin-bottom: 2rem;
}

.error-retry {
    padding: 0.75rem 1.5rem;
    background: rgb(239, 68, 68);
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
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
    margin-bottom: 2rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.stat-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

.stat-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    position: relative;
}

.stat-icon-container.total {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.stat-icon-container.recent {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
    border: 1px solid rgba(34, 197, 94, 0.2);
}

.stat-icon-container.week {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%);
    border: 1px solid rgba(251, 191, 36, 0.2);
}

.stat-icon-container.month {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%);
    border: 1px solid rgba(168, 85, 247, 0.2);
}

.stat-icon {
    width: 1.5rem;
    height: 1.5rem;
}

.stat-icon-container.total .stat-icon {
    color: rgb(59, 130, 246);
}

.stat-icon-container.recent .stat-icon {
    color: rgb(34, 197, 94);
}

.stat-icon-container.week .stat-icon {
    color: rgb(251, 191, 36);
}

.stat-icon-container.month .stat-icon {
    color: rgb(168, 85, 247);
}

.stat-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-value {
    font-size: 1.875rem;
    font-weight: 700;
    color: white;
    margin: 0;
    line-height: 1;
}

.stat-label {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    margin: 0;
    font-weight: 500;
}

/* Filters */
.filters-section {
    margin-bottom: 2rem;
}

.filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

.filters-title h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.filters-toggles {
    display: flex;
    gap: 1rem;
}

.toggle-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
}

.toggle-checkbox {
    display: none;
}

.toggle-slider {
    position: relative;
    width: 3rem;
    height: 1.5rem;
    background: rgb(75, 85, 99);
    border-radius: 0.75rem;
    transition: background-color 0.2s ease;
}

.toggle-slider:before {
    content: '';
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s ease;
}

.toggle-checkbox:checked+.toggle-slider {
    background: rgb(59, 130, 246);
}

.toggle-checkbox:checked+.toggle-slider:before {
    transform: translateX(1.5rem);
}

.toggle-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(209, 213, 219);
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgb(209, 213, 219);
}

.filter-input,
.filter-select {
    padding: 0.75rem;
    background: rgb(31, 41, 55);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    color: white;
    font-size: 0.875rem;
    transition: border-color 0.2s ease;
}

.filter-input:focus,
.filter-select:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-input::placeholder {
    color: rgb(107, 114, 128);
}

/* Make sure filter-input class works properly within Search component */
.search-component .filter-input {
    padding: 0.75rem !important;
    background: rgb(31, 41, 55) !important;
    border: 1px solid rgb(75, 85, 99) !important;
    border-radius: 0.5rem !important;
    color: white !important;
    font-size: 0.875rem !important;
    transition: border-color 0.2s ease !important;
    width: 100% !important;
}

.search-component .filter-input:focus {
    outline: none !important;
    border-color: rgb(59, 130, 246) !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

.search-component .filter-input::placeholder {
    color: rgb(107, 114, 128) !important;
}

/* Entity search dropdown styling */
.entity-search-dropdown {
    position: absolute;
    z-index: 50;
    margin-top: 0.25rem;
    width: 100%;
    background: rgb(31, 41, 55);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    max-height: 12rem;
    overflow-y: auto;
}

/* Search Input Container */
.search-input-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.search-input-container .filter-input.searching {
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-spinner {
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgb(59, 130, 246);
}

.search-spinner svg {
    width: 1rem;
    height: 1rem;
}

.search-hint {
    font-size: 0.75rem;
    color: rgb(251, 191, 36);
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 0.375rem;
    padding: 0.5rem;
    margin-top: 0.25rem;
}

/* Selected entity styling */
.selected-entity {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.375rem;
}

.entity-name {
    font-weight: 600;
    color: rgb(59, 130, 246);
}

.entity-type {
    font-size: 0.75rem;
    text-transform: capitalize;
    color: rgb(107, 114, 128);
    background: rgb(31, 41, 55);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
}

.clear-entity-btn {
    background: none;
    border: none;
    color: rgb(107, 114, 128);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    margin-left: auto;
}

.clear-entity-btn:hover {
    color: rgb(239, 68, 68);
    background: rgba(239, 68, 68, 0.1);
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.no-entity {
    color: rgb(107, 114, 128);
    font-style: italic;
    padding: 0.75rem 0;
}

/* Comments List */
.comments-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.comment-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
    align-items: start;
}

.comment-display-card {
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.comment-display-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

.comment-actions-card {
    background: linear-gradient(135deg, rgb(39, 39, 42) 0%, rgb(31, 31, 31) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.comment-actions-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

.comment-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

.comment-author {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.author-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: white;
    transition: color 0.2s ease;
}

.author-link:hover {
    color: rgb(59, 130, 246);
}

.author-avatar {
    border-radius: 50%;
    border: 2px solid rgb(75, 85, 99);
}

.author-avatar-placeholder {
    width: 32px;
    height: 32px;
    background: rgb(75, 85, 99);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    font-weight: 600;
}

.author-avatar-placeholder:before {
    content: '?';
}

.author-name {
    font-weight: 600;
    font-size: 1rem;
}

.comment-date {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.actions-header {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

.actions-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.actions-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.action-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid;
    transition: all 0.2s ease;
    cursor: pointer;
    text-decoration: none;
    justify-content: center;
}

.action-btn-icon {
    width: 1rem;
    height: 1rem;
}

.view-btn {
    background: rgb(16, 185, 129);
    border-color: rgb(16, 185, 129);
    color: white;
}

.view-btn:hover {
    background: rgb(5, 150, 105);
    border-color: rgb(5, 150, 105);
    transform: translateY(-1px);
}

.view-btn.disabled {
    background: rgb(75, 85, 99);
    border-color: rgb(75, 85, 99);
    color: rgb(156, 163, 175);
    cursor: not-allowed;
    pointer-events: none;
}

.view-btn.disabled:hover {
    transform: none;
}

.killmail-missing {
    color: rgb(156, 163, 175);
    font-style: italic;
    font-size: 0.875rem;
}

.edit-btn {
    background: rgb(59, 130, 246);
    border-color: rgb(59, 130, 246);
    color: white;
}

.edit-btn:hover {
    background: rgb(37, 99, 235);
    border-color: rgb(37, 99, 235);
    transform: translateY(-1px);
}

.delete-btn {
    background: rgb(239, 68, 68);
    border-color: rgb(239, 68, 68);
    color: white;
}

.delete-btn:hover {
    background: rgb(220, 38, 38);
    border-color: rgb(220, 38, 38);
    transform: translateY(-1px);
}

.restore-btn {
    background: rgb(251, 191, 36);
    border-color: rgb(251, 191, 36);
    color: rgb(146, 64, 14);
}

.restore-btn:hover {
    background: rgb(245, 158, 11);
    border-color: rgb(245, 158, 11);
    color: rgb(120, 53, 15);
    transform: translateY(-1px);
}

/* Deleted comment styling */
.deleted-comment {
    opacity: 0.7;
    border-color: rgb(239, 68, 68) !important;
    background: linear-gradient(135deg, rgb(39, 24, 24) 0%, rgb(31, 20, 20) 100%) !important;
}

.deleted-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgb(239, 68, 68);
    color: white;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.deleted-icon {
    width: 0.875rem;
    height: 0.875rem;
}

.status-active {
    color: rgb(16, 185, 129) !important;
    font-weight: 600;
}

.status-deleted {
    color: rgb(239, 68, 68) !important;
    font-weight: 600;
}

.comment-meta {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.meta-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(156, 163, 175);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.meta-value {
    font-size: 0.875rem;
    color: rgb(209, 213, 219);
    font-family: monospace;
    word-break: break-all;
}

.comment-content {
    margin-top: 1rem;
}

.comment-killmail {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 0.5rem;
    border: 1px solid rgba(59, 130, 246, 0.2);
    margin-bottom: 1rem;
}

.killmail-icon {
    width: 1rem;
    height: 1rem;
    color: rgb(59, 130, 246);
}

.killmail-label {
    font-weight: 600;
    color: rgb(59, 130, 246);
    font-size: 0.875rem;
}

.killmail-link {
    color: rgb(59, 130, 246);
    text-decoration: none;
    font-weight: 600;
    font-family: monospace;
}

.killmail-link:hover {
    text-decoration: underline;
}

/* Responsive design */
@media (max-width: 1024px) {
    .comment-row {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
}

/* No Comments */
.no-comments {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
}

.no-comments-icon {
    width: 4rem;
    height: 4rem;
    color: rgb(107, 114, 128);
    margin-bottom: 1rem;
}

.no-comments-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.no-comments-message {
    color: rgb(156, 163, 175);
    margin: 0;
}

/* Pagination */
.pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
}

.pagination {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    padding: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    background: transparent;
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.375rem;
    color: rgb(209, 213, 219);
    cursor: pointer;
    transition: all 0.2s ease;
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-btn:not(:disabled):hover {
    background: rgb(59, 130, 246);
    border-color: rgb(59, 130, 246);
    color: white;
}

.pagination-icon {
    width: 1rem;
    height: 1rem;
}

.pagination-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 1rem;
    font-size: 0.875rem;
    color: rgb(209, 213, 219);
}

.pagination-current {
    font-weight: 600;
}

.pagination-separator {
    color: rgb(107, 114, 128);
}

/* Modals */
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
    z-index: 1000;
    padding: 1rem;
}

.modal-content {
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border: 1px solid rgb(63, 63, 70);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    max-width: 32rem;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.5rem 0 1.5rem;
    border-bottom: 1px solid rgb(63, 63, 70);
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
}

.modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0;
}

.modal-close {
    background: none;
    border: none;
    color: rgb(156, 163, 175);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
}

.modal-close:hover {
    color: white;
    background: rgb(55, 65, 81);
}

.modal-close-icon {
    width: 1.5rem;
    height: 1.5rem;
}

.modal-body {
    padding: 0 1.5rem 1.5rem 1.5rem;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem 1.5rem 1.5rem;
    border-top: 1px solid rgb(63, 63, 70);
}

.modal-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 0.375rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.modal-btn.secondary {
    background: rgb(55, 65, 81);
    color: rgb(209, 213, 219);
}

.modal-btn.secondary:hover {
    background: rgb(75, 85, 99);
}

.modal-btn.primary {
    background: rgb(59, 130, 246);
    color: white;
}

.modal-btn.primary:hover {
    background: rgb(37, 99, 235);
}

.modal-btn.danger {
    background: rgb(239, 68, 68);
    color: white;
}

.modal-btn.danger:hover {
    background: rgb(220, 38, 38);
}

.modal-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-icon {
    width: 1rem;
    height: 1rem;
}

.spinning {
    animation: spin 1s linear infinite;
}

/* Form Elements */
.form-group {
    margin-bottom: 1rem;
}

.form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgb(209, 213, 219);
    margin-bottom: 0.5rem;
}

.form-textarea {
    width: 100%;
    padding: 0.75rem;
    background: rgb(31, 41, 55);
    border: 1px solid rgb(75, 85, 99);
    border-radius: 0.5rem;
    color: white;
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    transition: border-color 0.2s ease;
}

.form-textarea:focus {
    outline: none;
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Delete Warning */
.delete-warning {
    text-align: center;
}

.warning-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(251, 191, 36);
    margin-bottom: 1rem;
}

.comment-preview {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 1rem;
    text-align: left;
}

.comment-preview strong {
    color: rgb(251, 191, 36);
    display: block;
    margin-bottom: 0.5rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .filters-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 640px) {
    .admin-comments-container {
        padding: 1rem;
    }

    .stats-grid {
        grid-template-columns: 1fr;
    }

    .filters-grid {
        grid-template-columns: 1fr;
    }

    .comment-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
    }

    .comment-actions {
        align-self: stretch;
        justify-content: flex-end;
    }

    .modal-content {
        margin: 1rem;
        max-width: none;
        width: auto;
    }
}
</style>
