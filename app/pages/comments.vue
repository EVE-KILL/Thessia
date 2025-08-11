<template>
    <div class="p-4 max-w-7xl mx-auto">
        <!-- Page Header -->
        <div
            class="mb-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg shadow-lg border border-amber-200 dark:border-amber-700/30">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('comments.list.title') }}</h1>
                    <p class="text-gray-600 dark:text-gray-300 mt-2">{{ t('comments.list.description') }}</p>
                </div>
            </div>

            <!-- Filters Section -->
            <div class="mt-5 pt-4 border-t border-amber-200 dark:border-amber-700/30">
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <!-- Sort By Filter -->
                    <div class="filter-group">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{
                            t('comments.list.filters.sortBy') }}</label>
                        <select v-model="sortBy" @change="currentPage = 1" class="custom-input w-full">
                            <option value="newest">{{ t('comments.list.filters.sortBy.newest') }}</option>
                            <option value="oldest">{{ t('comments.list.filters.sortBy.oldest') }}</option>
                        </select>
                    </div>

                    <!-- Filter By Type -->
                    <div class="filter-group">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{
                            t('comments.list.filters.filterBy') }}</label>
                        <select v-model="filterType" @change="currentPage = 1; clearEntityFilter()"
                            class="custom-input w-full">
                            <option value="all">{{ t('comments.list.filters.filterBy.all') }}</option>
                            <option value="character">{{ t('comments.list.filters.filterBy.character') }}</option>
                            <option value="corporation">{{ t('comments.list.filters.filterBy.corporation') }}</option>
                            <option value="alliance">{{ t('comments.list.filters.filterBy.alliance') }}</option>
                        </select>
                    </div>

                    <!-- Entity Filter (Character/Corp/Alliance) -->
                    <div v-if="filterType !== 'all'" class="filter-group relative">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ filterType === 'character' ? 'Character' : filterType === 'corporation' ? 'Corporation' :
                                'Alliance' }}
                        </label>
                        <div class="relative">
                            <input v-model="entitySearchTerm" @input="debouncedEntitySearch"
                                @keydown="handleEntityKeyDown" @focus="showEntityDropdown = true"
                                @blur="handleEntityBlur" :placeholder="`Search ${filterType}...`"
                                class="custom-input w-full" />

                            <!-- Selected Entity Display -->
                            <div v-if="selectedEntity"
                                class="mt-2 flex items-center p-2 bg-amber-100 dark:bg-amber-800/30 rounded-md border border-amber-200 dark:border-amber-700/30">
                                <img v-if="filterType !== 'character'"
                                    :src="getEntityImageUrl(selectedEntity, filterType)" :alt="selectedEntity.name"
                                    class="w-6 h-6 rounded mr-2" />
                                <UAvatar v-else
                                    :src="`https://images.evetech.net/characters/${selectedEntity.id}/portrait?size=64`"
                                    :alt="selectedEntity.name" size="xs" class="mr-2" />
                                <span class="flex-grow text-sm text-gray-800 dark:text-gray-200">{{ selectedEntity.name
                                    }}</span>
                                <button @click="clearSelectedEntity"
                                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2">
                                    <UIcon name="lucide:x" class="w-4 h-4" />
                                </button>
                            </div>

                            <!-- Search Results Dropdown -->
                            <div v-if="showEntityDropdown && entitySearchResults.length > 0"
                                class="absolute z-50 w-full mt-1 system-search-dropdown rounded-md shadow-lg max-h-64 overflow-y-auto">
                                <div v-for="(result, index) in entitySearchResults" :key="result.id"
                                    @mousedown.prevent="selectEntity(result)" :class="[
                                        'search-result-item flex items-center px-4 py-2 text-sm cursor-pointer',
                                        selectedEntityIndex === index ? 'search-result-selected' : ''
                                    ]">
                                    <div class="flex-shrink-0 mr-3">
                                        <img v-if="filterType !== 'character'"
                                            :src="getEntityImageUrl(result, filterType)" :alt="result.name"
                                            class="w-8 h-8 rounded" />
                                        <UAvatar v-else
                                            :src="`https://images.evetech.net/characters/${result.id}/portrait?size=64`"
                                            :alt="result.name" size="sm" />
                                    </div>
                                    <div class="flex-grow min-w-0">
                                        <div class="font-medium text-gray-800 dark:text-gray-200 truncate">{{
                                            result.name }}</div>
                                        <div v-if="result.ticker" class="text-xs text-gray-500 dark:text-gray-400">[{{
                                            result.ticker }}]</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Search Field (always on the right) -->
                    <div class="filter-group" :class="filterType === 'all' ? 'lg:col-start-4' : ''">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('search')
                            }}</label>
                        <div class="flex">
                            <input v-model="searchQuery" @keyup.enter="currentPage = 1; performSearch()"
                                :placeholder="t('comments.list.searchPlaceholder')"
                                class="custom-input flex-grow mr-2" />
                            <div class="flex-shrink-0">
                                <UButton v-if="searchQuery" color="neutral" @click="clearSearch"
                                    class="mr-2 hover:scale-105 transition-transform duration-200 cursor-pointer">
                                    <UIcon name="lucide:x" class="w-4 h-4" />
                                </UButton>
                                <UButton color="primary" icon="lucide:search" @click="performSearch"
                                    class="hover:scale-105 transition-transform duration-200 cursor-pointer">
                                    {{ t('search') }}
                                </UButton>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Clear All Filters Button -->
                <div v-if="hasActiveFilters" class="mt-4 flex justify-end">
                    <UButton variant="link" size="sm" @click="clearAllFilters"
                        class="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">
                        <UIcon name="lucide:x" class="w-4 h-4 mr-1" />
                        {{ t('clear_all_filters') }}
                    </UButton>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="space-y-4">
            <!-- Comments Grid with Skeleton -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="i in 12" :key="i" class="comment-card">
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow-lg border-0 h-full flex flex-col">
                        <!-- Comment Header Skeleton -->
                        <div class="flex items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <USkeleton class="w-12 h-12 mr-3" />
                            <div class="flex-grow min-w-0">
                                <USkeleton class="h-4 w-24 mb-1" />
                                <USkeleton class="h-3 w-32" />
                            </div>
                            <USkeleton class="h-3 w-16 ml-2" />
                        </div>

                        <!-- Comment Content Skeleton -->
                        <div class="flex-grow mb-4">
                            <USkeleton class="h-4 w-full mb-2" />
                            <USkeleton class="h-4 w-5/6 mb-2" />
                            <USkeleton class="h-4 w-3/4" />
                        </div>

                        <!-- Comment Actions Skeleton -->
                        <div class="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div class="flex justify-between items-center">
                                <USkeleton class="h-8 w-24" />
                                <USkeleton class="h-8 w-16" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error"
            class="flex flex-col items-center justify-center py-12 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg shadow-lg border-0">
            <UIcon name="lucide:alert-circle" class="w-16 h-16 text-red-500 mb-6" />
            <span class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('error.loading_failed') }}</span>
            <p class="text-gray-600 dark:text-gray-300 mt-2 mb-6 text-center max-w-md">{{ t('comments.list.error') }}
            </p>
            <UButton @click="refreshData" icon="lucide:refresh-cw" color="error" size="lg">
                {{ t('retry') }}
            </UButton>
        </div>

        <!-- No Comments State -->
        <div v-else-if="comments?.length === 0"
            class="flex flex-col items-center justify-center py-12 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg shadow-lg border-0">
            <UIcon name="lucide:message-circle" class="w-16 h-16 text-gray-400 mb-6" />
            <span class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('comments.list.noComments') }}</span>
        </div>

        <!-- Comments List -->
        <div v-else class="space-y-4">
            <!-- Comments Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="comment in comments" :key="comment._id" class="comment-card">
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow-lg border-0 h-full flex flex-col">
                        <!-- Comment Header -->
                        <div class="flex items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <NuxtLink :to="`/character/${comment.characterId}`" class="flex-shrink-0">
                                <UAvatar
                                    :src="`https://images.evetech.net/characters/${comment.characterId}/portrait?size=64`"
                                    :alt="comment.characterName" size="md" class="mr-3" />
                            </NuxtLink>
                            <div class="entity-details flex-grow min-w-0">
                                <NuxtLink :to="`/character/${comment.characterId}`"
                                    class="entity-link entity-name primary block truncate">
                                    {{ comment.characterName }}
                                </NuxtLink>
                                <div class="entity-name secondary text-xs text-gray-500 dark:text-gray-400">
                                    <template v-if="comment.corporationName">
                                        <NuxtLink v-if="comment.corporationId"
                                            :to="`/corporation/${comment.corporationId}`"
                                            class="truncate hover:underline">
                                            {{ comment.corporationName }}
                                        </NuxtLink>
                                        <span v-if="comment.allianceName" class="truncate">
                                            /
                                            <NuxtLink v-if="comment.allianceId" :to="`/alliance/${comment.allianceId}`"
                                                class="truncate hover:underline">
                                                {{ comment.allianceName }}
                                            </NuxtLink>
                                            <span v-else>{{ comment.allianceName }}</span>
                                        </span>
                                    </template>
                                </div>
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {{ formatDate(comment.createdAt) }}
                            </div>
                        </div>

                        <!-- Comment Content -->
                        <div class="flex-grow mb-4">
                            <ClientOnly>
                                <Comment :comment="comment.comment" />
                            </ClientOnly>
                        </div>

                        <!-- Comment Actions -->
                        <div class="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div class="flex justify-between items-center">
                                <UButton :to="getKillmailUrl(comment.killIdentifier)" color="primary" size="sm"
                                    icon="lucide:external-link">
                                    {{ t('settings.comments.viewKillmail') }}
                                </UButton>

                                <div v-if="isAuthenticated && currentUser?.characterId === comment.characterId">
                                    <UButton @click="openDeleteModal(comment)" color="error" variant="soft" size="sm"
                                        icon="lucide:trash-2">
                                        {{ t('settings.comments.delete') }}
                                    </UButton>

                                    <!-- Delete Confirmation Modal -->
                                    <Modal :is-open="showDeleteModal && commentToDelete?._id === comment._id"
                                        :title="t('settings.comments.deleteComment')" @close="closeDeleteModal">
                                        <p class="text-sm text-gray-600 dark:text-gray-300">
                                            {{ t('settings.comments.confirmDeleteMessage') }}
                                        </p>

                                        <template #footer>
                                            <UButton @click="closeDeleteModal" color="primary">
                                                {{ t('common.cancel') }}
                                            </UButton>
                                            <UButton @click="deleteComment" color="error" :loading="isDeleting">
                                                {{ t('settings.comments.delete') }}
                                            </UButton>
                                        </template>
                                    </Modal>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="data && data.pagination.pages > 1" class="mt-8 flex flex-col items-center">
                <div
                    class="bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <UPagination v-model:page="currentPage" :items-per-page="itemsPerPage"
                        :total="data.pagination.total" />
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-3" v-if="data.pagination.total">
                    {{ t('showingResults', {
                        start: ((currentPage - 1) * itemsPerPage) + 1,
                        end: Math.min(currentPage * itemsPerPage, data.pagination.total),
                        total: data.pagination.total
                    }) }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

// i18n setup
const { t } = useI18n();

// Auth setup
const authStore = useAuthStore();
const { isAuthenticated, currentUser } = storeToRefs(authStore);

// SEO setup
useSeoMeta({
    title: () => t('comments.list.title'),
    description: () => t('comments.list.description'),
    ogTitle: () => t('comments.list.title'),
    ogDescription: () => t('comments.list.description'),
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: () => t('comments.list.title'),
    twitterDescription: () => t('comments.list.description')
});

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(24);

// Filter state
const sortBy = ref('newest');
const filterType = ref('all');
const searchQuery = ref('');

// Entity search state
const entitySearchTerm = ref('');
const entitySearchResults = ref<any[]>([]);
const selectedEntity = ref<any>(null);
const showEntityDropdown = ref(false);
const selectedEntityIndex = ref(-1);
const lastEntitySearchTerm = ref('');

// Delete modal state
const showDeleteModal = ref(false);
const commentToDelete = ref<any>(null);
const isDeleting = ref(false);

// Helper to check if any filters are active
const hasActiveFilters = computed(() => {
    return sortBy.value !== 'newest' ||
        filterType.value !== 'all' ||
        selectedEntity.value !== null ||
        searchQuery.value !== '';
});

// Create query params for API
const queryParams = computed(() => {
    const params: any = {
        page: currentPage.value,
        limit: itemsPerPage.value,
        sortBy: 'createdAt',
        sortOrder: sortBy.value === 'oldest' ? 'asc' : 'desc'
    };

    // Add entity filters
    if (selectedEntity.value) {
        if (filterType.value === 'character') {
            params.characterId = selectedEntity.value.id;
        } else if (filterType.value === 'corporation') {
            params.corporationId = selectedEntity.value.id;
        } else if (filterType.value === 'alliance') {
            params.allianceId = selectedEntity.value.id;
        }
    }

    return params;
});

// Fetch comments data
const data = ref<any>(null);
const pending = ref(true);
const error = ref<any>(null);
const isSearchMode = ref(false);

const fetchComments = async () => {
    try {
        pending.value = true;
        error.value = null;

        let response;

        if (searchQuery.value.trim()) {
            // Use search API
            isSearchMode.value = true;
            response = await $fetch('/api/comments/search', {
                query: {
                    q: searchQuery.value.trim(),
                    page: currentPage.value,
                    limit: itemsPerPage.value,
                    sortBy: 'createdAt',
                    sortOrder: sortBy.value === 'oldest' ? 'asc' : 'desc'
                }
            });
        } else {
            // Use regular API with entity filters
            isSearchMode.value = false;
            response = await $fetch('/api/comments', {
                query: queryParams.value
            });
        }

        data.value = response;
    } catch (err) {
        error.value = err;
        console.error('Error fetching comments:', err);
    } finally {
        pending.value = false;
    }
};

// Initial fetch
fetchComments();

// Watch for changes and refetch (but not when just changing entity search term)
watch([queryParams], () => {
    fetchComments();
}, { deep: true });

// Watch for filter type changes to clear entity selection
watch(filterType, () => {
    clearSelectedEntity();
});

// Extract comments from data
const comments = computed(() => data.value?.comments || []);

// Entity search functionality
const searchEntities = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
        entitySearchResults.value = [];
        showEntityDropdown.value = false;
        return;
    }

    if (lastEntitySearchTerm.value === searchTerm) return;
    lastEntitySearchTerm.value = searchTerm;

    try {
        const encoded = encodeURIComponent(searchTerm);
        const { data } = await useFetch(`/api/search/${encoded}`);

        if (data.value && data.value.hits) {
            let results = data.value.hits.filter((hit: any) => hit.type === filterType.value);

            // Sort by date_founded if available
            if (results.length > 0 && results[0].date_founded) {
                results.sort((a: any, b: any) => new Date(b.date_founded).getTime() - new Date(a.date_founded).getTime());
            }

            entitySearchResults.value = results.slice(0, 10);
            showEntityDropdown.value = results.length > 0;
        } else {
            entitySearchResults.value = [];
            showEntityDropdown.value = false;
        }
    } catch (error) {
        console.error("Entity search error:", error);
        entitySearchResults.value = [];
        showEntityDropdown.value = false;
    }
};

// Create debounced search function
let entitySearchTimeout: NodeJS.Timeout;
const debouncedEntitySearch = (event: Event) => {
    const target = event.target as HTMLInputElement;
    clearTimeout(entitySearchTimeout);
    entitySearchTimeout = setTimeout(() => {
        searchEntities(target.value);
    }, 300);
};

// Handle entity selection
const selectEntity = (entity: any) => {
    selectedEntity.value = entity;
    entitySearchTerm.value = entity.name;
    showEntityDropdown.value = false;
    entitySearchResults.value = [];
    selectedEntityIndex.value = -1;
    currentPage.value = 1;
};

// Clear selected entity
const clearSelectedEntity = () => {
    selectedEntity.value = null;
    entitySearchTerm.value = '';
    entitySearchResults.value = [];
    showEntityDropdown.value = false;
    selectedEntityIndex.value = -1;
    currentPage.value = 1;
};

// Handle keyboard navigation for entity search
const handleEntityKeyDown = (e: KeyboardEvent) => {
    if (!entitySearchResults.value || entitySearchResults.value.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedEntityIndex.value = Math.min(selectedEntityIndex.value + 1, entitySearchResults.value.length - 1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedEntityIndex.value = Math.max(selectedEntityIndex.value - 1, -1);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedEntityIndex.value >= 0) {
                selectEntity(entitySearchResults.value[selectedEntityIndex.value]);
            }
            break;
        case 'Escape':
            showEntityDropdown.value = false;
            selectedEntityIndex.value = -1;
            break;
    }
};

// Handle entity search blur
const handleEntityBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
        showEntityDropdown.value = false;
        selectedEntityIndex.value = -1;
    }, 150);
};

// Get entity image URL
const getEntityImageUrl = (entity: any, type: string) => {
    if (type === 'corporation') {
        return `https://images.evetech.net/corporations/${entity.id}/logo?size=64`;
    } else if (type === 'alliance') {
        return `https://images.evetech.net/alliances/${entity.id}/logo?size=64`;
    }
    return '';
};

// Search functionality
const performSearch = () => {
    currentPage.value = 1;
    fetchComments();
};

const clearSearch = () => {
    searchQuery.value = '';
    currentPage.value = 1;
    fetchComments();
};

// Clear filters
const clearEntityFilter = () => {
    clearSelectedEntity();
};

const clearAllFilters = () => {
    sortBy.value = 'newest';
    filterType.value = 'all';
    clearSelectedEntity();
    searchQuery.value = '';
    currentPage.value = 1;
};

// Date formatting
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

// Get killmail URL from identifier
const getKillmailUrl = (killIdentifier: string) => {
    // Extract kill ID from identifier like "kill:123456"
    const killId = killIdentifier.replace('kill:', '');
    return `/kill/${killId}`;
};

// Delete functionality
const openDeleteModal = (comment: any) => {
    commentToDelete.value = comment;
    showDeleteModal.value = true;
};

const closeDeleteModal = () => {
    showDeleteModal.value = false;
    commentToDelete.value = null;
};

const deleteComment = async () => {
    if (!commentToDelete.value) return;

    try {
        isDeleting.value = true;

        const response = await $fetch('/api/comments/delete', {
            method: 'POST',
            body: {
                identifier: commentToDelete.value.identifier
            }
        }) as any;

        if (response.success) {
            // Remove comment from local data
            if (data.value?.comments) {
                data.value.comments = data.value.comments.filter(
                    (c: any) => c.identifier !== commentToDelete.value.identifier
                );
            }

            // Show success toast
            const toast = useToast();
            toast.add({
                title: t('settings.comments.deleteSuccess'),
                description: t('settings.comments.deleteSuccessDesc'),
                color: 'success'
            });

            closeDeleteModal();
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        const toast = useToast();
        toast.add({
            title: t('settings.comments.deleteError'),
            description: t('settings.comments.deleteErrorDesc'),
            color: 'error'
        });
    } finally {
        isDeleting.value = false;
    }
};

// Refresh data function
const refreshData = () => {
    fetchComments();
};
</script>

<style scoped>
.comment-card {
    transition: box-shadow 0.2s;
}

.comment-card:hover {
    box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
}

.entity-link {
    color: #3b82f6;
    text-decoration: none;
}

.entity-link:hover {
    color: #60a5fa;
    text-decoration: underline;
}

.entity-name.primary {
    font-weight: 600;
    font-size: 0.875rem;
    color: #111827;
}

.dark .entity-name.primary {
    color: #f9fafb;
}

.entity-name.secondary {
    font-weight: 400;
    color: #6b7280;
}

.dark .entity-name.secondary {
    color: #9ca3af;
}

/* Filter group styling */
.filter-group {
    position: relative;
}

/* Entity search dropdown styling */
.filter-group .absolute {
    z-index: 50;
}

/* Custom input styling to match campaigncreator */
.custom-input {
    display: block;
    width: 100%;
    height: 38px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
    color: #111827;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    outline: none;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.custom-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.custom-input:disabled {
    background-color: #f3f4f6;
    opacity: 0.7;
    cursor: not-allowed;
}

select.custom-input {
    height: 38px;
    padding: 0.5rem 0.75rem;
    box-sizing: border-box;
}

.dark .custom-input {
    color: #f9fafb;
    background-color: #1f2937;
    border-color: #4b5563;
}

.dark .custom-input:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
}

.dark .custom-input:disabled {
    background-color: #374151;
}

/* Solid background for dropdown menus */
.system-search-dropdown {
    border: 2px solid #ccc;
    background-color: white !important;
    /* Force solid background */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .system-search-dropdown {
    border-color: #4b5563;
    background-color: #1f2937 !important;
    /* Force solid background */
}

.search-result-item {
    color: #111827;
    transition: all 0.15s ease;
}

.search-result-item:hover {
    background-color: #f3f4f6 !important;
    /* Force hover color */
    transform: translateX(2px);
}

/* Better spacing for search results with images */
.search-result-item.flex {
    align-items: center;
    min-height: 40px;
    /* Ensure consistent height for image results */
}

.search-result-item .flex-shrink-0 {
    display: flex;
    align-items: center;
    justify-content: center;
}

.dark .search-result-item {
    color: #f9fafb;
}

.dark .search-result-item:hover {
    background-color: #374151 !important;
    /* Force hover color */
}

.search-result-selected {
    background-color: #e0f2fe !important;
    color: #0369a1 !important;
}

.dark .search-result-selected {
    background-color: #0c4a6e !important;
    color: #7dd3fc !important;
}
</style>
