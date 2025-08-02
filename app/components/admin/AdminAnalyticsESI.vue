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
                                            <div class="corp-key-indicator">
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
                                        <div v-if="user.canFetchCorporationKillmails" class="corp-key-indicator">
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

// Debug data (remove after testing)
watch(data, (newData) => {
    console.log('ESI Analytics data received:', newData);
    if (newData && !newData.success) {
        console.error('API returned error:', newData);
    }
}, { immediate: true });

watch(error, (newError) => {
    if (newError) {
        console.error('ESI Analytics fetch error:', newError);
    }
}, { immediate: true });

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
