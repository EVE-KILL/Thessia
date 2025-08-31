<template>
    <div class="admin-characters">
        <div class="characters-header">
            <div class="header-info">
                <h3 class="characters-title">{{ t('admin.characters.title') }}</h3>
                <p class="characters-description">{{ t('admin.characters.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="clearSearch" v-if="searchQuery.length > 0" class="action-btn clear-search-btn">
                    <Icon name="heroicons:x-mark" class="action-icon" />
                    {{ t('admin.characters.clearSearch') }}
                </button>
                <button @click="() => refreshData()" class="action-btn refresh-btn"
                    :disabled="displayPending || isSearchMode">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': displayPending }" />
                    {{ t('admin.characters.refresh') }}
                </button>
            </div>
        </div>

        <!-- Filters and Search -->
        <div class="filters-section">
            <div class="search-container">
                <div class="search-input-wrapper">
                    <Icon name="heroicons:magnifying-glass" class="search-icon" />
                    <input v-model="searchQuery" type="text"
                        :placeholder="isSearchMode ? t('admin.characters.searchActive') : t('admin.characters.search')"
                        class="search-input" :class="{ 'search-active': isSearchMode }" />
                    <button v-if="searchQuery.length > 0" @click="clearSearch" class="clear-search-btn">
                        <Icon name="heroicons:x-mark" class="w-4 h-4" />
                    </button>
                </div>
                <div v-if="isSearchMode" class="search-status">
                    <Icon name="heroicons:magnifying-glass" class="search-status-icon" />
                    <span v-if="searchPending" class="search-status-text">{{ t('search.searching') }}...</span>
                    <span v-else-if="searchResults.length > 0" class="search-status-text">
                        {{ t('admin.characters.searchResults', { count: searchResults.length }) }}
                    </span>
                    <span v-else class="search-status-text">{{ t('search.noResults') }}</span>
                </div>
            </div>

            <div class="filters-row" v-if="!isSearchMode">
                <select v-model="pageSize" class="page-size-select" :aria-label="'Items per page'"
                    @change="handlePageSizeChange">
                    <option value="10">10 {{ t('admin.characters.perPage') }}</option>
                    <option value="25">25 {{ t('admin.characters.perPage') }}</option>
                    <option value="50">50 {{ t('admin.characters.perPage') }}</option>
                    <option value="100">100 {{ t('admin.characters.perPage') }}</option>
                </select>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="displayPending" class="loading-container">
            <div class="loading-content">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ isSearchMode ? t('search.searching') : t('admin.characters.loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="!isSearchMode && error" class="error-container">
            <div class="error-content">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.characters.error') }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.characters.retry') }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-else-if="displayData?.characters && displayData.characters.length > 0" class="characters-content">
            <!-- Characters List -->
            <div class="characters-list">
                <div v-for="character in displayData.characters" :key="character.character_id" class="character-card">
                    <!-- Character Info -->
                    <div class="character-info-section">
                        <div class="character-avatar">
                            <Image :type="'character'" :id="character.character_id" :size="64" />
                        </div>
                        <div class="character-details">
                            <h4 class="character-name">
                                <NuxtLink :to="`/character/${character.character_id}`">
                                    {{ character.name || `Character ${character.character_id}` }}
                                </NuxtLink>
                            </h4>
                            <div class="character-meta">
                                <div v-if="character.corporation_id" class="character-meta-item">
                                    <Icon name="heroicons:building-office-2" class="meta-icon" />
                                    <span>Corp ID: {{ character.corporation_id }}</span>
                                </div>
                                <div v-if="character.alliance_id" class="character-meta-item">
                                    <Icon name="heroicons:shield-check" class="meta-icon" />
                                    <span>Alliance ID: {{ character.alliance_id }}</span>
                                </div>
                                <div class="character-meta-item">
                                    <Icon name="heroicons:calendar" class="meta-icon" />
                                    <span>Updated: {{ formatDateRelative(character.updatedAt) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="character-actions-row">
                        <button @click="refreshCharacter(character)" class="action-btn-slim refresh-btn">
                            <Icon name="heroicons:arrow-path" class="action-btn-icon" />
                            Refresh
                        </button>
                        <button @click="editCharacter(character)" class="action-btn-slim edit-btn">
                            <Icon name="heroicons:pencil-square" class="action-btn-icon" />
                            Edit
                        </button>
                        <button @click="deleteCharacter(character)" class="action-btn-slim delete-btn">
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
                <Icon name="heroicons:user" class="empty-icon" />
                <h4 class="empty-title">{{ t('admin.characters.empty') }}</h4>
                <p class="empty-description">{{ t('admin.characters.noCharactersFound') }}</p>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="!isSearchMode && displayData?.pagination && displayData.pagination.totalPages > 1"
            class="pagination-container">
            <button @click="changePage(1)" :disabled="!displayData.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.characters.pagination.first') }}
            </button>
            <button @click="changePage(displayData.pagination.currentPage - 1)"
                :disabled="!displayData.pagination.hasPrevPage" class="pagination-btn">
                {{ t('admin.characters.pagination.previous') }}
            </button>

            <span class="pagination-info">
                {{ t('admin.characters.pagination.page', {
                    current: displayData.pagination.currentPage,
                    total: displayData.pagination.totalPages
                }) }}
            </span>

            <button @click="changePage(displayData.pagination.currentPage + 1)"
                :disabled="!displayData.pagination.hasNextPage" class="pagination-btn">
                {{ t('admin.characters.pagination.next') }}
            </button>
            <button @click="changePage(displayData.pagination.totalPages)"
                :disabled="!displayData.pagination.hasNextPage" class="pagination-btn">
                {{ t('admin.characters.pagination.last') }}
            </button>
        </div>
    </div>

    <!-- Edit Modal -->
    <Modal :is-open="showEditModal" title="Edit Character" size="lg" @close="closeModals">
        <form @submit.prevent="saveCharacterEdit" class="edit-form">
            <div class="form-group">
                <label class="form-label">Name *</label>
                <input v-model="editForm.name" type="text" class="form-input" required placeholder="Character name" />
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Corporation</label>
                    <Search :api-url="(query: string) => `/api/search/${encodeURIComponent(query)}`"
                        :transform-response="(response) => response?.hits?.filter((hit: any) => hit.type === 'corporation') || []"
                        result-key="id" result-name="name" placeholder="Search corporations..."
                        :model-value="selectedCorporation?.name || ''" @select="onCorporationSelect"
                        @clear="onCorporationClear" :show-clear-button="true" :close-on-select="true" />
                    <div v-if="selectedCorporation" class="selected-entity">
                        Selected: {{ selectedCorporation.name }} ({{ selectedCorporation.id }})
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Alliance</label>
                    <Search :api-url="(query: string) => `/api/search/${encodeURIComponent(query)}`"
                        :transform-response="(response) => response?.hits?.filter((hit: any) => hit.type === 'alliance') || []"
                        result-key="id" result-name="name" placeholder="Search alliances..."
                        :model-value="selectedAlliance?.name || ''" @select="onAllianceSelect" @clear="onAllianceClear"
                        :show-clear-button="true" :close-on-select="true" />
                    <div v-if="selectedAlliance" class="selected-entity">
                        Selected: {{ selectedAlliance.name }} ({{ selectedAlliance.id }})
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Faction</label>
                    <Search :api-url="(query: string) => `/api/search/${encodeURIComponent(query)}`"
                        :transform-response="(response) => response?.hits?.filter((hit: any) => hit.type === 'faction') || []"
                        result-key="id" result-name="name" placeholder="Search factions..."
                        :model-value="selectedFaction?.name || ''" @select="onFactionSelect" @clear="onFactionClear"
                        :show-clear-button="true" :close-on-select="true" />
                    <div v-if="selectedFaction" class="selected-entity">
                        Selected: {{ selectedFaction.name }} ({{ selectedFaction.id }})
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Security Status</label>
                    <input v-model="editForm.security_status" type="number" step="0.01" class="form-input"
                        placeholder="Security status" />
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Birthday</label>
                    <input v-model="editForm.birthday" type="date" class="form-input" />
                </div>
                <div class="form-group">
                    <label class="form-label">Gender</label>
                    <select v-model="editForm.gender" class="form-input">
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Race ID</label>
                    <input v-model="editForm.race_id" type="number" class="form-input" placeholder="Race ID" />
                </div>
                <div class="form-group">
                    <label class="form-label">Bloodline ID</label>
                    <input v-model="editForm.bloodline_id" type="number" class="form-input"
                        placeholder="Bloodline ID" />
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea v-model="editForm.description" class="form-textarea" rows="3"
                    placeholder="Character description"></textarea>
            </div>
        </form>

        <template #footer>
            <button @click="closeModals" type="button" class="btn-secondary" :disabled="isLoading">
                Cancel
            </button>
            <button @click="saveCharacterEdit" type="button" class="btn-primary" :disabled="isLoading">
                <Icon v-if="isLoading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                <span v-else>Save Changes</span>
            </button>
        </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :is-open="showDeleteModal" title="Delete Character" size="sm" @close="closeModals">
        <div class="delete-confirmation">
            <div class="warning-icon flex justify-center mb-4">
                <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 text-red-500" />
            </div>
            <p class="delete-message text-center mb-4">
                Are you sure you want to delete the character
                <strong>{{ selectedCharacter?.name }}</strong>?
            </p>
            <p class="delete-warning text-center text-sm text-gray-600 dark:text-gray-400">
                This action will mark the character as deleted. This action can be undone by editing the character
                record.
            </p>
        </div>

        <template #footer>
            <button @click="closeModals" type="button" class="btn-secondary" :disabled="isLoading">
                Cancel
            </button>
            <button @click="confirmDelete" type="button" class="btn-danger" :disabled="isLoading">
                <Icon v-if="isLoading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                <span v-else>Delete Character</span>
            </button>
        </template>
    </Modal>
</template>

<script setup lang="ts">

interface Character {
    character_id: number;
    name: string;
    description?: string;
    birthday?: string;
    gender?: string;
    race_id?: number;
    security_status?: number;
    bloodline_id?: number;
    corporation_id?: number;
    alliance_id?: number;
    faction_id?: number;
    deleted?: boolean;
    error?: string;
    last_active?: string;
    createdAt: string;
    updatedAt: string;
}

interface CharactersResponse {
    characters: Character[];
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
const toast = useToast();

// Reactive state
const currentPage = ref(1);
const pageSize = ref(25);
const searchQuery = ref('');
const searchResults = ref<Character[]>([]);
const searchPending = ref(false);
const isSearchMode = computed(() => searchQuery.value.trim().length >= 2);

// Modal states
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedCharacter = ref<Character | null>(null);
const isLoading = ref(false);

// Edit form data
const editForm = ref({
    name: '',
    corporation_id: null as number | null,
    alliance_id: null as number | null,
    faction_id: null as number | null,
    security_status: null as number | null,
    birthday: '',
    description: '',
    gender: '',
    race_id: null as number | null,
    bloodline_id: null as number | null,
    ancestry_id: null as number | null,
    title: ''
});

// Selected entities for search components
const selectedCorporation = ref<any>(null);
const selectedAlliance = ref<any>(null);
const selectedFaction = ref<any>(null);

// Search functionality
const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
        searchResults.value = [];
        return;
    }

    searchPending.value = true;
    try {
        const response = await $fetch(`/api/search/${encodeURIComponent(query)}`);
        const characterHits = response?.hits?.filter((hit: any) => hit.type === 'character') || [];

        // Transform search results to Character format
        searchResults.value = characterHits.map((hit: any) => ({
            character_id: hit.id,
            name: hit.name,
            deleted: hit.deleted || false,
            updatedAt: hit.updatedAt || new Date().toISOString(),
            createdAt: hit.updatedAt || new Date().toISOString(),
            // Set other fields as undefined since search API doesn't provide them
            description: undefined,
            birthday: undefined,
            gender: undefined,
            race_id: undefined,
            security_status: undefined,
            bloodline_id: undefined,
            corporation_id: undefined,
            alliance_id: undefined,
            faction_id: undefined,
            error: undefined,
            last_active: undefined,
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

    return `/api/admin/characters?${params.toString()}`;
});

// Fetch regular data (only when not in search mode)
const { data, pending, error, refresh: refreshData } = useAsyncData<CharactersResponse>(
    'admin-characters',
    () => $fetch(apiEndpoint.value),
    {
        server: false,
        watch: [currentPage, pageSize],
        default: () => ({
            characters: [],
            stats: { total: 0, active: 0, deleted: 0 },
            pagination: { currentPage: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, total: 0 }
        })
    }
);

// Computed data that shows either search results or regular data
const displayData = computed(() => {
    if (isSearchMode.value) {
        return {
            characters: searchResults.value,
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
        characters: [],
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

// Helper function to format search result display name
const formatCharacterName = (character: Character) => {
    return character.name;
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

const refreshCharacter = async (character: Character) => {
    if (isLoading.value) return;

    try {
        isLoading.value = true;
        const response = await $fetch(`/api/admin/characters/${character.character_id}/refresh`, {
            method: 'POST'
        });

        if (response.success) {
            // Show success toast
            toast.add({
                title: 'Character Refreshed',
                description: response.message,
                color: 'success'
            });

            // Refresh the data
            if (isSearchMode.value) {
                // If we're in search mode, refresh the search
                await performSearch(searchQuery.value);
            } else {
                // Otherwise refresh the regular data
                await refreshData();
            }
        }
    } catch (error: any) {
        console.error('Error refreshing character:', error);
        toast.add({
            title: 'Refresh Failed',
            description: error?.data?.message || 'Failed to refresh character data',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

// Entity selection handlers for search components
const onCorporationSelect = (result: any) => {
    selectedCorporation.value = result;
    editForm.value.corporation_id = result.id;
};

const onAllianceSelect = (result: any) => {
    selectedAlliance.value = result;
    editForm.value.alliance_id = result.id;
};

const onFactionSelect = (result: any) => {
    selectedFaction.value = result;
    editForm.value.faction_id = result.id;
};

const onCorporationClear = () => {
    selectedCorporation.value = null;
    editForm.value.corporation_id = null;
};

const onAllianceClear = () => {
    selectedAlliance.value = null;
    editForm.value.alliance_id = null;
};

const onFactionClear = () => {
    selectedFaction.value = null;
    editForm.value.faction_id = null;
};

const editCharacter = async (character: Character) => {
    selectedCharacter.value = character;
    isLoading.value = true;

    try {
        // Fetch full character data from admin API
        const fullCharacterData = await $fetch(`/api/admin/characters/${character.character_id}`);

        // Populate form with full character data
        const fullCharacter = fullCharacterData.character as any;
        editForm.value = {
            name: fullCharacter.name || '',
            corporation_id: fullCharacter.corporation_id || null,
            alliance_id: fullCharacter.alliance_id || null,
            faction_id: fullCharacter.faction_id || null,
            security_status: fullCharacter.security_status || null,
            birthday: (fullCharacter.birthday ? new Date(fullCharacter.birthday).toISOString().split('T')[0] : '') as string,
            description: fullCharacter.description || '',
            gender: fullCharacter.gender || '',
            race_id: fullCharacter.race_id || null,
            bloodline_id: fullCharacter.bloodline_id || null,
            ancestry_id: fullCharacter.ancestry_id || null,
            title: fullCharacter.title || ''
        };

        // Store the related entity names for display in search components
        selectedCorporation.value = fullCharacterData.names.corporationName ? {
            id: fullCharacter.corporation_id,
            name: fullCharacterData.names.corporationName,
            type: 'corporation'
        } : null;

        selectedAlliance.value = fullCharacterData.names.allianceName ? {
            id: fullCharacter.alliance_id,
            name: fullCharacterData.names.allianceName,
            type: 'alliance'
        } : null;

        selectedFaction.value = fullCharacterData.names.factionName ? {
            id: fullCharacter.faction_id,
            name: fullCharacterData.names.factionName,
            type: 'faction'
        } : null;

        showEditModal.value = true;
    } catch (error) {
        console.error('Failed to load character data:', error);
        toast.add({
            title: 'Error',
            description: 'Failed to load character data for editing',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

const deleteCharacter = (character: Character) => {
    selectedCharacter.value = character;
    showDeleteModal.value = true;
};

// Modal methods
const closeModals = () => {
    showEditModal.value = false;
    showDeleteModal.value = false;
    selectedCharacter.value = null;
    selectedCorporation.value = null;
    selectedAlliance.value = null;
    selectedFaction.value = null;
    isLoading.value = false;
};

const saveCharacterEdit = async () => {
    if (!selectedCharacter.value || isLoading.value) return;

    try {
        isLoading.value = true;
        const response = await $fetch(`/api/admin/characters/${selectedCharacter.value.character_id}/edit`, {
            method: 'POST',
            body: editForm.value
        });

        if (response.success) {
            toast.add({
                title: 'Character Updated',
                description: 'Character information has been updated successfully',
                color: 'success'
            });
            closeModals();

            // Refresh the data
            if (isSearchMode.value) {
                await performSearch(searchQuery.value);
            } else {
                await refreshData();
            }
        }
    } catch (error: any) {
        console.error('Error updating character:', error);
        toast.add({
            title: 'Update Failed',
            description: error?.data?.message || 'Failed to update character',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

const confirmDelete = async () => {
    if (!selectedCharacter.value || isLoading.value) return;

    try {
        isLoading.value = true;
        const response = await $fetch(`/api/admin/characters/${selectedCharacter.value.character_id}/delete`, {
            method: 'POST'
        });

        if (response.success) {
            toast.add({
                title: 'Character Deleted',
                description: response.message || 'Character has been deleted successfully',
                color: 'success'
            });
            closeModals();

            // Refresh the data
            if (isSearchMode.value) {
                await performSearch(searchQuery.value);
            } else {
                await refreshData();
            }
        }
    } catch (error: any) {
        console.error('Error deleting character:', error);
        toast.add({
            title: 'Delete Failed',
            description: error?.data?.message || 'Failed to delete character',
            color: 'error'
        });
    } finally {
        isLoading.value = false;
    }
};

</script>

<style scoped>
.admin-characters {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    height: 100%;
    overflow-y: auto;
}

/* Header */
.characters-header {
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

:global(.light) .characters-header {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.header-info {
    flex: 1;
}

.characters-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.light) .characters-title {
    color: #1e293b;
    background: none;
    -webkit-text-fill-color: initial;
}

.characters-description {
    color: rgb(156, 163, 175);
    line-height: 1.6;
    font-size: 0.95rem;
}

:global(.light) .characters-description {
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

/* Characters List */
.characters-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.character-card {
    background: linear-gradient(135deg, rgb(31, 31, 31) 0%, rgb(24, 24, 27) 100%);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgb(63, 63, 70);
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
}

:global(.light) .character-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.character-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), transparent);
}

:global(.light) .character-card::before {
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
}

.character-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
}

/* Character Info Section */
.character-info-section {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(63, 63, 70);
}

:global(.light) .character-info-section {
    border-bottom-color: #e2e8f0;
}

.character-avatar {
    flex-shrink: 0;
}

.character-details {
    flex: 1;
    min-width: 0;
}

.character-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.light) .character-name {
    color: #1e293b;
    background: none;
    -webkit-text-fill-color: initial;
}

.character-name a {
    color: inherit;
    text-decoration: none;
    transition: all 0.2s ease;
}

.character-name a:hover {
    color: rgb(59, 130, 246);
}

:global(.light) .character-name a:hover {
    color: #3b82f6;
}

.character-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.character-meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
}

:global(.light) .character-meta-item {
    color: #64748b;
}

.meta-icon {
    width: 1rem;
    height: 1rem;
}

/* Action Buttons Row */
.character-actions-row {
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

/* Form Styles */
.edit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
}

:global(.dark) .form-label {
    color: #d1d5db;
}

.form-input,
.form-textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.2s ease;
}

:global(.dark) .form-input,
:global(.dark) .form-textarea {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
    resize: vertical;
    min-height: 80px;
}

/* Button Styles */
.btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-secondary {
    background: transparent;
    color: #6b7280;
    border: 1px solid #d1d5db;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
}

:global(.dark) .btn-secondary {
    color: #9ca3af;
    border-color: #4b5563;
}

:global(.dark) .btn-secondary:hover:not(:disabled) {
    background: #374151;
    border-color: #6b7280;
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-danger:hover:not(:disabled) {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

.btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Delete confirmation styles */
.delete-confirmation {
    text-align: center;
}

.delete-message {
    font-size: 1rem;
    color: #374151;
    margin-bottom: 0.5rem;
}

:global(.dark) .delete-message {
    color: #d1d5db;
}

.delete-warning {
    font-size: 0.875rem;
    color: #6b7280;
}

:global(.dark) .delete-warning {
    color: #9ca3af;
}

/* Selected entity display */
.selected-entity {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgb(59, 130, 246, 0.1);
    border: 1px solid rgb(59, 130, 246, 0.3);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: rgb(59, 130, 246);
}

:global(.light) .selected-entity {
    background: rgb(59, 130, 246, 0.05);
    border-color: rgb(59, 130, 246, 0.2);
    color: rgb(59, 130, 246);
}
</style>
