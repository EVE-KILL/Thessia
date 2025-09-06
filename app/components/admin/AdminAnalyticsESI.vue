<template>
    <div class="analytics-view">
        <!-- Analytics Header -->
        <div class="analytics-header">
            <div class="header-info">
                <h3 class="analytics-title">{{ t('admin.analytics.esi.title') }}</h3>
                <p class="analytics-description">{{ t('admin.analytics.esi.description') }}</p>
            </div>
            <div class="header-actions">
                <button @click="() => refreshData()" class="action-button" :disabled="pending">
                    <Icon name="heroicons:arrow-path" class="action-icon" :class="{ 'animate-spin': pending }" />
                    {{ t('admin.analytics.refresh') }}
                </button>
            </div>
        </div>

        <!-- Search Controls -->
        <div class="analytics-controls">
            <div class="search-container">
                <Icon name="heroicons:magnifying-glass" class="search-icon" />
                <input v-model="searchQuery" type="text" :placeholder="t('admin.analytics.search')"
                    class="search-input" />
                <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn"
                    :title="t('admin.analytics.clearSearch')">
                    <Icon name="heroicons:x-mark" class="clear-icon" />
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="analytics-container">
            <div v-if="pending" class="loading-container">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.analytics.loading') }}</p>
            </div>

            <div v-else-if="error" class="error-container">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.analytics.error') }}</p>
                <p style="font-size: 0.75rem; color: rgb(156, 163, 175); margin-top: 0.5rem;">{{ error }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.analytics.retry') }}
                </button>
            </div>

            <div v-else-if="data && data.success" class="analytics-content">
                <!-- Debug info (remove after testing) -->
                <!-- <pre>{{ JSON.stringify(data, null, 2) }}</pre> -->

                <!-- Summary Statistics -->
                <div class="summary-section">
                    <h4 class="section-title">{{ t('admin.analytics.esi.summary') }}</h4>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <Icon name="heroicons:key" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esi.totalKeys') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.totalKeys || 0 }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon corp-icon">
                                <Icon name="heroicons:building-office" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esi.corporationKeys') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.totalCorporationKeys || 0 }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <Icon name="heroicons:building-storefront" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esi.uniqueCorporations') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.uniqueCorporations || 0 }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon alliance-icon">
                                <Icon name="heroicons:flag" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esi.uniqueAlliances') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.uniqueAlliances || 0 }}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon members-icon">
                                <Icon name="heroicons:users" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esi.membersCovered') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.membersCovered?.toLocaleString() || 0 }}
                                </div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon killmails-icon">
                                <Icon name="heroicons:bolt" class="icon" />
                            </div>
                            <div class="stat-info">
                                <div class="stat-label">{{ t('admin.analytics.esi.newKillmailsLast30Days') }}</div>
                                <div class="stat-value">{{ data?.data?.summary?.newKillmailsLast30Days?.toLocaleString()
                                    || 0 }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Alliances Section -->
                <div class="alliances-section">
                    <h4 class="section-title">
                        {{ t('admin.analytics.esi.alliances') }}
                        <span class="section-count">({{ filteredAlliances.length }})</span>
                    </h4>
                    <div v-if="filteredAlliances.length > 0" class="alliances-grid">
                        <div v-for="alliance in filteredAlliances" :key="alliance.id" class="alliance-card">
                            <div class="alliance-header">
                                <div class="alliance-avatar">
                                    <Image type="alliance" :id="alliance.id" :alt="alliance.name" :size="64"
                                        class="alliance-image" />
                                </div>
                                <div class="alliance-info">
                                    <h5 class="alliance-name">{{ alliance.name }}</h5>
                                    <div class="alliance-stats">
                                        <span class="stat-item">{{ alliance.totalKeys }} {{ t('admin.analytics.keys')
                                        }}</span>
                                        <span class="stat-item">{{ alliance.totalCorporations }} {{
                                            t('admin.analytics.corporations') }}</span>
                                    </div>
                                </div>
                                <div class="completion-badge"
                                    :class="getCompletionClass(alliance.completionPercentage)">
                                    {{ alliance.completionPercentage }}%
                                </div>
                            </div>

                            <div class="alliance-details">
                                <div class="progress-bar">
                                    <div class="progress-fill" :style="`width: ${alliance.completionPercentage}%`">
                                    </div>
                                </div>
                                <div class="progress-text">
                                    {{ alliance.corporationsWithKeys }} / {{ alliance.totalCorporations }} {{
                                        t('admin.analytics.corporationsWithKeys') }}
                                </div>
                            </div>

                            <!-- Missing Corporations -->
                            <div v-if="alliance.missingCorporations.length > 0 || alliance.corporations.length > 0"
                                class="missing-corps">
                                <button @click="toggleMissingCorps(alliance.id)" class="missing-toggle">
                                    <Icon name="heroicons:exclamation-triangle" class="missing-icon" />
                                    {{ alliance.missingCorporations.length }} {{
                                        t('admin.analytics.missingCorporations') }}
                                    <Icon
                                        :name="expandedAlliances.has(alliance.id) ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                                        class="chevron-icon" />
                                </button>
                                <div v-if="expandedAlliances.has(alliance.id)" class="missing-list">
                                    <!-- Corporations We Have Keys For -->
                                    <div v-if="alliance.corporations.length > 0" class="corp-section">
                                        <div class="section-header have-keys">
                                            <Icon name="heroicons:check-circle" class="section-icon" />
                                            {{ t('admin.analytics.haveKeys') }}
                                        </div>
                                        <div v-for="corp in alliance.corporations" :key="corp.id"
                                            class="corp-item have-corp">
                                            <Image type="corporation" :id="corp.id" :alt="corp.name" :size="32"
                                                class="corp-image" />
                                            <span class="corp-name">{{ corp.name }}</span>
                                            <span class="corp-members">{{ corp.memberCount }} {{
                                                t('admin.analytics.members') }}</span>
                                            <div class="corp-key-indicator clickable-key"
                                                @click.stop="openKeyModalForCorp(corp)"
                                                :title="t('admin.analytics.esi.viewKeyDetails')">
                                                <Icon name="heroicons:key" class="key-icon" />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Corporations We Don't Have Keys For -->
                                    <div v-if="alliance.missingCorporations.length > 0" class="corp-section">
                                        <div class="section-header missing-keys">
                                            <Icon name="heroicons:exclamation-triangle" class="section-icon" />
                                            {{ t('admin.analytics.missingKeys') }}
                                        </div>
                                        <div v-for="corp in alliance.missingCorporations" :key="corp.id"
                                            class="corp-item missing-corp">
                                            <Image type="corporation" :id="corp.id" :alt="corp.name" :size="32"
                                                class="corp-image" />
                                            <span class="corp-name">{{ corp.name }}</span>
                                            <span class="corp-members">{{ corp.memberCount }} {{
                                                t('admin.analytics.members') }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty-state">
                        <Icon name="heroicons:flag" class="empty-icon" />
                        <p class="empty-text">{{ t('admin.analytics.esi.noAlliances') }}</p>
                    </div>
                </div>

                <!-- Corporations Section -->
                <div class="corporations-section">
                    <h4 class="section-title">
                        {{ t('admin.analytics.esi.corporations') }}
                        <span class="section-count">({{ filteredCorporations.length }})</span>
                    </h4>
                    <div v-if="filteredCorporations.length > 0" class="corporations-grid">
                        <div v-for="corporation in filteredCorporations" :key="corporation.id" class="corporation-card">
                            <div class="corporation-header">
                                <div class="corporation-avatar">
                                    <Image type="corporation" :id="corporation.id" :alt="corporation.name" :size="48"
                                        class="corporation-image" />
                                    <div v-if="corporation.hasCorpKeys" class="corp-key-badge">
                                        <Icon name="heroicons:key" class="key-icon" />
                                    </div>
                                </div>
                                <div class="corporation-info">
                                    <h5 class="corporation-name">{{ corporation.name }}</h5>
                                    <div class="corporation-stats">
                                        <span class="stat-item">{{ corporation.keyCount }} {{ t('admin.analytics.keys')
                                        }}</span>
                                        <span class="stat-item">{{ corporation.memberCount }} {{
                                            t('admin.analytics.members') }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Corporation Users -->
                            <div class="corporation-users">
                                <button @click="toggleCorpUsers(corporation.id)" class="users-toggle">
                                    <Icon name="heroicons:users" class="users-icon" />
                                    {{ t('admin.analytics.viewUsers') }} ({{ corporation.users.length }})
                                    <Icon
                                        :name="expandedCorporations.has(corporation.id) ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                                        class="chevron-icon" />
                                </button>
                                <div v-if="expandedCorporations.has(corporation.id)" class="users-list">
                                    <div v-for="user in corporation.users" :key="user.characterId" class="corp-user">
                                        <Image type="character" :id="user.characterId" :alt="user.characterName"
                                            :size="32" class="user-image" />
                                        <NuxtLink :to="`/character/${user.characterId}`" class="user-name">
                                            {{ user.characterName }}
                                        </NuxtLink>
                                        <span class="user-scopes">{{ user.scopesCount }} {{ t('admin.analytics.scopes')
                                        }}</span>
                                        <div class="corp-key-indicator clickable-key"
                                            @click.stop="openKeyModal(user.characterId)"
                                            :title="t('admin.analytics.esi.viewKeyDetails')">
                                            <Icon name="heroicons:key" class="key-icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty-state">
                        <Icon name="heroicons:building-storefront" class="empty-icon" />
                        <p class="empty-text">{{ t('admin.analytics.esi.noCorporations') }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ESI Key Details Modal -->
        <Modal :is-open="isKeyModalOpen" :title="t('admin.analytics.esi.keyDetails')" size="xl" @close="closeKeyModal">
            <div v-if="keyDetailsLoading" class="modal-loading">
                <Icon name="heroicons:arrow-path" class="loading-icon animate-spin" />
                <p class="loading-text">{{ t('admin.analytics.loading') }}</p>
            </div>

            <div v-else-if="keyDetailsError" class="modal-error">
                <Icon name="heroicons:exclamation-triangle" class="error-icon" />
                <p class="error-text">{{ t('admin.analytics.error') }}</p>
                <p class="error-details">{{ keyDetailsError }}</p>
            </div>

            <div v-else-if="keyDetails" class="key-details-content">
                <!-- Character Information -->
                <div class="detail-section">
                    <h5 class="detail-title">{{ t('admin.analytics.esi.characterInfo') }}</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.characterName') }}</span>
                            <div class="detail-value character-value">
                                <Image type="character" :id="keyDetails.character?.id" :alt="keyDetails.character?.name"
                                    :size="32" class="character-avatar" />
                                <NuxtLink :to="`/character/${keyDetails.character?.id}`" class="character-link">
                                    {{ keyDetails.character?.name }}
                                </NuxtLink>
                            </div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.characterId') }}</span>
                            <span class="detail-value">{{ keyDetails.character?.id }}</span>
                        </div>
                        <div v-if="keyDetails.character?.securityStatus" class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.securityStatus') }}</span>
                            <span class="detail-value">{{ keyDetails.character.securityStatus.toFixed(2) }}</span>
                        </div>
                        <div v-if="keyDetails.character?.birthday" class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.birthday') }}</span>
                            <span class="detail-value">{{ new Date(keyDetails.character.birthday).toLocaleDateString()
                                }}</span>
                        </div>
                    </div>
                </div>

                <!-- Corporation Information -->
                <div v-if="keyDetails.corporation" class="detail-section">
                    <h5 class="detail-title">{{ t('admin.analytics.esi.corporationInfo') }}</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.corporationName') }}</span>
                            <div class="detail-value corporation-value">
                                <Image type="corporation" :id="keyDetails.corporation.id"
                                    :alt="keyDetails.corporation.name" :size="32" class="corporation-avatar" />
                                <NuxtLink :to="`/corporation/${keyDetails.corporation.id}`" class="corporation-link">
                                    {{ keyDetails.corporation.name }}
                                </NuxtLink>
                                <span v-if="keyDetails.corporation.ticker" class="ticker">[{{
                                    keyDetails.corporation.ticker }}]</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.corporationId') }}</span>
                            <span class="detail-value">{{ keyDetails.corporation.id }}</span>
                        </div>
                        <div v-if="keyDetails.corporation.memberCount" class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.memberCount') }}</span>
                            <span class="detail-value">{{ keyDetails.corporation.memberCount.toLocaleString() }}</span>
                        </div>
                    </div>
                </div>

                <!-- Alliance Information -->
                <div v-if="keyDetails.alliance" class="detail-section">
                    <h5 class="detail-title">{{ t('admin.analytics.esi.allianceInfo') }}</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.allianceName') }}</span>
                            <div class="detail-value alliance-value">
                                <Image type="alliance" :id="keyDetails.alliance.id" :alt="keyDetails.alliance.name"
                                    :size="32" class="alliance-avatar" />
                                <NuxtLink :to="`/alliance/${keyDetails.alliance.id}`" class="alliance-link">
                                    {{ keyDetails.alliance.name }}
                                </NuxtLink>
                                <span v-if="keyDetails.alliance.ticker" class="ticker">&lt;{{ keyDetails.alliance.ticker
                                    }}&gt;</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.allianceId') }}</span>
                            <span class="detail-value">{{ keyDetails.alliance.id }}</span>
                        </div>
                    </div>
                </div>

                <!-- Key Information -->
                <div class="detail-section">
                    <h5 class="detail-title">{{ t('admin.analytics.esi.keyInfo') }}</h5>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.tokenType') }}</span>
                            <span class="detail-value">{{ keyDetails.key.tokenType }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.expirationDate') }}</span>
                            <span class="detail-value" :class="{ 'text-red-400': keyDetails.key.isExpired }">
                                {{ new Date(keyDetails.key.dateExpiration).toLocaleString() }}
                                <span v-if="keyDetails.key.isExpired" class="expired-badge">{{
                                    t('admin.analytics.esi.expired') }}</span>
                                <span v-else-if="keyDetails.key.daysUntilExpiration <= 7" class="warning-badge">
                                    {{ t('admin.analytics.esi.expiresSoon', {
                                        days: keyDetails.key.daysUntilExpiration
                                    }) }}
                                </span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.lastChecked') }}</span>
                            <span class="detail-value">
                                {{ new Date(keyDetails.key.lastChecked).toLocaleString() }}
                                <span class="time-ago">({{ keyDetails.key.daysSinceLastCheck }} {{
                                    t('admin.analytics.esi.daysAgo') }})</span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.corporationKillmails') }}</span>
                            <span class="detail-value">
                                <Icon
                                    :name="keyDetails.key.canFetchCorporationKillmails ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                    :class="keyDetails.key.canFetchCorporationKillmails ? 'text-green-400' : 'text-red-400'"
                                    class="w-5 h-5 inline" />
                                {{ keyDetails.key.canFetchCorporationKillmails ? t('admin.analytics.esi.enabled') :
                                    t('admin.analytics.esi.disabled') }}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.administrator') }}</span>
                            <span class="detail-value">
                                <Icon
                                    :name="keyDetails.key.administrator ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                                    :class="keyDetails.key.administrator ? 'text-green-400' : 'text-gray-400'"
                                    class="w-5 h-5 inline" />
                                {{ keyDetails.key.administrator ? t('admin.analytics.esi.yes') :
                                    t('admin.analytics.esi.no') }}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('admin.analytics.esi.createdAt') }}</span>
                            <span class="detail-value">{{ new Date(keyDetails.key.createdAt).toLocaleString() }}</span>
                        </div>
                    </div>
                </div>

                <!-- Scopes Information -->
                <div class="detail-section">
                    <h5 class="detail-title">{{ t('admin.analytics.esi.scopes') }} ({{ keyDetails.scopes.total }})</h5>
                    <div class="scopes-container">
                        <div v-for="(scopes, category) in keyDetails.scopes.categories" :key="category"
                            v-show="scopes.length > 0" class="scope-category">
                            <h6 class="scope-category-title">{{ t(`admin.analytics.esi.scopeCategory.${category}`) }}
                                ({{ scopes.length }})</h6>
                            <div class="scope-list">
                                <span v-for="scope in scopes" :key="scope" class="scope-tag">{{ scope }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    </div>
</template>

<script setup lang="ts">
interface ESIAnalyticsResponse {
    success: boolean;
    data: {
        summary: {
            totalKeys: number;
            totalCorporationKeys: number;
            uniqueCorporations: number;
            uniqueAlliances: number;
            corporationsWithKeys: number;
            alliancesWithKeys: number;
            membersCovered: number;
            newKillmailsLast30Days: number;
        };
        corporations: any[];
        alliances: any[];
        searchTerm: string | null;
    };
}

const { t } = useI18n();

// Reactive state
const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const expandedAlliances = ref(new Set<number>());
const expandedCorporations = ref(new Set<number>());

// Modal state
const isKeyModalOpen = ref(false);
const selectedCharacterId = ref<number | null>(null);
const keyDetails = ref<any>(null);
const keyDetailsLoading = ref(false);
const keyDetailsError = ref<string | null>(null);

// Computed API endpoint
const apiEndpoint = computed(() => {
    const params = new URLSearchParams();

    if (debouncedSearchQuery.value.trim()) {
        params.set('search', debouncedSearchQuery.value.trim());
    }

    const url = `/api/admin/analytics/esi?${params.toString()}`;
    console.log('API endpoint:', url); // Debug log
    return url;
});

// Fetch data
const { data, pending, error, refresh: refreshData } = useAsyncData(
    'admin-esi-analytics',
    () => $fetch<ESIAnalyticsResponse>(apiEndpoint.value),
    {
        lazy: true,
        server: false,
        watch: [debouncedSearchQuery],
    }
);

// Filtered data
const filteredCorporations = computed(() => {
    return data.value?.data?.corporations || [];
});

const filteredAlliances = computed(() => {
    return data.value?.data?.alliances || [];
});

// Debounced search functionality
const updateDebouncedSearch = debounce(() => {
    debouncedSearchQuery.value = searchQuery.value;
}, 500);

// Watch the immediate search input and debounce the actual API search
watch(searchQuery, () => {
    updateDebouncedSearch();
});

// Helper functions
const clearSearch = () => {
    searchQuery.value = '';
    debouncedSearchQuery.value = '';
};

const getCompletionClass = (percentage: number): string => {
    if (percentage >= 80) return 'completion-high';
    if (percentage >= 50) return 'completion-medium';
    if (percentage >= 20) return 'completion-low';
    return 'completion-none';
};

const toggleMissingCorps = (allianceId: number) => {
    if (expandedAlliances.value.has(allianceId)) {
        expandedAlliances.value.delete(allianceId);
    } else {
        expandedAlliances.value.add(allianceId);
    }
};

const toggleCorpUsers = (corporationId: number) => {
    if (expandedCorporations.value.has(corporationId)) {
        expandedCorporations.value.delete(corporationId);
    } else {
        expandedCorporations.value.add(corporationId);
    }
};

// Modal methods
const openKeyModal = async (characterId: number) => {
    selectedCharacterId.value = characterId;
    isKeyModalOpen.value = true;
    keyDetailsLoading.value = true;
    keyDetailsError.value = null;
    keyDetails.value = null;

    try {
        const response = await $fetch(`/api/admin/analytics/esi/${characterId}`);
        if (response.success) {
            keyDetails.value = response.data;
        } else {
            keyDetailsError.value = 'Failed to load key details';
        }
    } catch (error: any) {
        keyDetailsError.value = error?.data?.statusMessage || error?.message || 'Unknown error occurred';
    } finally {
        keyDetailsLoading.value = false;
    }
};

const openKeyModalForCorp = async (corp: any) => {
    // Find the best user to show - prefer users with corporation killmail access
    const usersWithCorpAccess = corp.users?.filter((user: any) => user.canFetchCorporationKillmails) || [];
    const selectedUser = usersWithCorpAccess.length > 0 ? usersWithCorpAccess[0] : corp.users?.[0];

    if (selectedUser) {
        await openKeyModal(selectedUser.characterId);
    } else {
        keyDetailsError.value = 'No users found for this corporation';
    }
}; const closeKeyModal = () => {
    isKeyModalOpen.value = false;
    selectedCharacterId.value = null;
    keyDetails.value = null;
    keyDetailsError.value = null;
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
.analytics-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem;
    gap: 1.5rem;
}

.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(55, 55, 55);
}

.header-info {
    flex: 1;
}

.analytics-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
}

.analytics-description {
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

.analytics-controls {
    display: flex;
    justify-content: flex-start;
    align-items: center;
}

.search-container {
    position: relative;
    width: 100%;
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

.search-clear-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgb(156, 163, 175);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.15s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-clear-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
}

.clear-icon {
    width: 1rem;
    height: 1rem;
}

.analytics-container {
    flex: 1;
    overflow-y: auto;
}

.loading-container,
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
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

.analytics-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.section-count {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    font-weight: 400;
}

/* Summary Statistics */
.summary-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    padding: 1rem;
}

.stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
}

.stat-icon.corp-icon {
    background: rgba(34, 197, 94, 0.2);
}

.stat-icon.alliance-icon {
    background: rgba(168, 85, 247, 0.2);
}

.stat-icon.members-icon {
    background: rgba(99, 102, 241, 0.2);
}

.stat-icon.killmails-icon {
    background: rgba(245, 158, 11, 0.2);
}

.stat-icon .icon {
    width: 1.5rem;
    height: 1.5rem;
    color: rgb(96, 165, 250);
}

.corp-icon .icon {
    color: rgb(34, 197, 94);
}

.alliance-icon .icon {
    color: rgb(168, 85, 247);
}

.members-icon .icon {
    color: rgb(99, 102, 241);
}

.killmails-icon .icon {
    color: rgb(245, 158, 11);
}

.stat-info {
    flex: 1;
}

.stat-label {
    font-size: 0.875rem;
    color: rgb(156, 163, 175);
    margin-bottom: 0.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
}

/* Alliances */
.alliances-section,
.corporations-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.alliances-grid,
.corporations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
}

.alliance-card,
.corporation-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    overflow: hidden;
}

.alliance-header,
.corporation-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgb(55, 55, 55);
}

.alliance-avatar,
.corporation-avatar {
    position: relative;
    flex-shrink: 0;
}

.alliance-image {
    width: 64px;
    height: 64px;
    border-radius: 0.375rem;
    border: 1px solid rgb(55, 55, 55);
}

.corporation-image {
    width: 48px;
    height: 48px;
    border-radius: 0.375rem;
    border: 1px solid rgb(55, 55, 55);
}

.corp-key-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: rgb(34, 197, 94);
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.corp-key-badge .key-icon {
    width: 10px;
    height: 10px;
    color: white;
}

.alliance-info,
.corporation-info {
    flex: 1;
    min-width: 0;
}

.alliance-name,
.corporation-name {
    font-size: 1rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.alliance-stats,
.corporation-stats {
    display: flex;
    gap: 1rem;
}

.stat-item {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.completion-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
}

.completion-high {
    background: rgb(34, 197, 94);
}

.completion-medium {
    background: rgb(234, 179, 8);
}

.completion-low {
    background: rgb(249, 115, 22);
}

.completion-none {
    background: rgb(239, 68, 68);
}

.alliance-details {
    padding: 1rem;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(55, 55, 55, 0.5);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    background: rgb(59, 130, 246);
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.missing-corps,
.corporation-users {
    border-top: 1px solid rgb(55, 55, 55);
}

.missing-toggle,
.users-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.missing-toggle:hover,
.users-toggle:hover {
    background: rgba(0, 0, 0, 0.3);
}

.missing-icon,
.users-icon,
.chevron-icon {
    width: 1rem;
    height: 1rem;
}

.missing-icon {
    color: rgb(234, 179, 8);
}

.users-icon {
    color: rgb(96, 165, 250);
}

.missing-list,
.users-list {
    padding: 0 1rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.corp-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    margin-bottom: 0.25rem;
}

.section-header.have-keys {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
    border: 1px solid rgba(34, 197, 94, 0.2);
}

.section-header.missing-keys {
    background: rgba(234, 179, 8, 0.1);
    color: rgb(234, 179, 8);
    border: 1px solid rgba(234, 179, 8, 0.2);
}

.section-icon {
    width: 1rem;
    height: 1rem;
}

.corp-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.25rem;
}

.corp-item.have-corp {
    border-left: 3px solid rgb(34, 197, 94);
}

.corp-item.missing-corp {
    border-left: 3px solid rgb(234, 179, 8);
}

.missing-corp,
.corp-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.25rem;
}

.corp-image,
.user-image {
    width: 32px;
    height: 32px;
    border-radius: 0.25rem;
    border: 1px solid rgb(55, 55, 55);
    flex-shrink: 0;
}

.corp-name,
.user-name {
    flex: 1;
    font-size: 0.875rem;
    color: white;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-name:hover {
    color: rgb(96, 165, 250);
}

.corp-members,
.user-scopes {
    font-size: 0.75rem;
    color: rgb(156, 163, 175);
}

.corp-key-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: rgb(34, 197, 94);
    border-radius: 50%;
}

.corp-key-indicator .key-icon {
    width: 12px;
    height: 12px;
    color: white;
    pointer-events: none;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
}

.empty-icon {
    width: 2rem;
    height: 2rem;
    color: rgb(156, 163, 175);
}

.empty-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

/* Clickable key indicator */
.clickable-key {
    cursor: pointer;
    transition: all 0.2s ease-in-out;
}

.clickable-key:hover {
    background: rgb(21, 128, 61);
    transform: scale(1.1);
}

/* Modal styles */
.modal-loading,
.modal-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
}

.loading-icon {
    width: 32px;
    height: 32px;
    color: rgb(59, 130, 246);
}

.loading-text {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.error-icon {
    width: 32px;
    height: 32px;
    color: rgb(239, 68, 68);
}

.error-text {
    color: rgb(239, 68, 68);
    font-weight: 500;
}

.error-details {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    text-align: center;
}

.key-details-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.detail-section {
    border-bottom: 1px solid rgb(55, 65, 81);
    padding-bottom: 1rem;
}

.detail-section:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.detail-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1rem;
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
}

.detail-label {
    font-weight: 500;
    color: rgb(209, 213, 219);
    flex-shrink: 0;
    min-width: 140px;
}

.detail-value {
    color: white;
    text-align: right;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
}

.character-value,
.corporation-value,
.alliance-value {
    justify-content: flex-start;
}

.character-avatar,
.corporation-avatar,
.alliance-avatar {
    border-radius: 50%;
    flex-shrink: 0;
}

.character-link,
.corporation-link,
.alliance-link {
    color: rgb(59, 130, 246);
    text-decoration: none;
    font-weight: 500;
}

.character-link:hover,
.corporation-link:hover,
.alliance-link:hover {
    text-decoration: underline;
}

.ticker {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}

.expired-badge {
    background: rgb(153, 27, 27);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: 0.5rem;
}

.warning-badge {
    background: rgb(161, 98, 7);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: 0.5rem;
}

.time-ago {
    color: rgb(156, 163, 175);
    font-size: 0.75rem;
    margin-left: 0.5rem;
}

.scopes-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.scope-category {
    background: rgb(31, 41, 55);
    border-radius: 0.5rem;
    padding: 1rem;
}

.scope-category-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgb(209, 213, 219);
    margin-bottom: 0.75rem;
    text-transform: capitalize;
}

.scope-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.scope-tag {
    background: rgb(55, 65, 81);
    color: rgb(209, 213, 219);
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-family: monospace;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .analytics-view {
        padding: 1rem;
    }

    .analytics-header {
        flex-direction: column;
        gap: 1rem;
    }

    .stats-grid {
        grid-template-columns: 1fr;
    }

    .alliances-grid,
    .corporations-grid {
        grid-template-columns: 1fr;
    }

    .alliance-header,
    .corporation-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }

    .missing-corp,
    .corp-user {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
}
</style>
