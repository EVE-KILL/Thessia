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

        <!-- Quick Navigation -->
        <div v-if="data && data.success" class="quick-nav">
            <button @click="scrollToSection('alliances')" class="nav-btn"
                :class="{ 'active': activeSection === 'alliances' }">
                <Icon name="heroicons:flag" class="nav-icon" />
                {{ t('admin.analytics.esi.alliances') }} ({{ filteredAlliances.length }})
            </button>
            <button @click="scrollToSection('corporations')" class="nav-btn"
                :class="{ 'active': activeSection === 'corporations' }">
                <Icon name="heroicons:building-storefront" class="nav-icon" />
                {{ t('admin.analytics.esi.corporations') }} ({{ filteredCorporations.length }})
            </button>
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
                <p class="error-details">{{ error }}</p>
                <button @click="() => refreshData()" class="error-retry">
                    {{ t('admin.analytics.retry') }}
                </button>
            </div>

            <div v-else-if="data && data.success" class="analytics-content">
                <!-- Summary Statistics -->
                <div class="summary-section">
                    <h4 class="section-title">{{ t('admin.analytics.esi.summary') }}</h4>
                    <div class="stats-grid">
                        <Card variant="default" size="sm" class="summary-statistics">
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <Icon name="heroicons:key" class="icon" />
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">{{ t('admin.analytics.esi.totalKeys') }}</div>
                                    <div class="stat-value">{{ data?.data?.summary?.totalKeys || 0 }}</div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="default" size="sm" class="summary-statistics">
                            <div class="stat-content">
                                <div class="stat-icon corp-icon">
                                    <Icon name="heroicons:building-office" class="icon" />
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">{{ t('admin.analytics.esi.corporationKeys') }}</div>
                                    <div class="stat-value">{{ data?.data?.summary?.totalCorporationKeys || 0 }}
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="default" size="sm" class="summary-statistics">
                            <div class="stat-content">
                                <div class="stat-icon">
                                    <Icon name="heroicons:building-storefront" class="icon" />
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">{{ t('admin.analytics.esi.uniqueCorporations') }}</div>
                                    <div class="stat-value">{{ data?.data?.summary?.uniqueCorporations || 0 }}</div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="default" size="sm" class="summary-statistics">
                            <div class="stat-content">
                                <div class="stat-icon alliance-icon">
                                    <Icon name="heroicons:flag" class="icon" />
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">{{ t('admin.analytics.esi.uniqueAlliances') }}</div>
                                    <div class="stat-value">{{ data?.data?.summary?.uniqueAlliances || 0 }}</div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="default" size="sm" class="summary-statistics">
                            <div class="stat-content">
                                <div class="stat-icon members-icon">
                                    <Icon name="heroicons:users" class="icon" />
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">{{ t('admin.analytics.esi.membersCovered') }}</div>
                                    <div class="stat-value">{{ data?.data?.summary?.membersCovered?.toLocaleString()
                                        || 0 }}
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="default" size="sm" class="summary-statistics">
                            <div class="stat-content">
                                <div class="stat-icon killmails-icon">
                                    <Icon name="heroicons:bolt" class="icon" />
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">{{ t('admin.analytics.esi.newKillmailsLast30Days') }}
                                    </div>
                                    <div class="stat-value">{{
                                        data?.data?.summary?.newKillmailsLast30Days?.toLocaleString()
                                        || 0 }}</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                <!-- Alliances Section -->
                <div id="alliances-section" class="data-section">
                    <h4 class="section-title">
                        {{ t('admin.analytics.esi.alliances') }}
                        <span class="section-count">({{ filteredAlliances.length }})</span>
                    </h4>
                    <div class="data-container">
                        <div v-if="filteredAlliances.length > 0" class="data-grid">
                            <div v-for="alliance in filteredAlliances" :key="alliance.id" class="alliance-wrapper">
                                <Card variant="elevated" size="md">
                                    <template #header>
                                        <div class="entity-header">
                                            <div class="entity-avatar">
                                                <Image type="alliance" :id="alliance.id" :alt="alliance.name" :size="64"
                                                    class="entity-image" />
                                            </div>
                                            <div class="entity-info">
                                                <h5 class="entity-name">{{ alliance.name }}</h5>
                                                <div class="entity-id">ID: {{ alliance.id }}</div>
                                                <div class="entity-stats">
                                                    <span class="stat-item">{{ alliance.totalKeys }} {{
                                                        t('admin.analytics.keys') }}</span>
                                                    <span class="stat-item">{{ alliance.totalCorporations }} {{
                                                        t('admin.analytics.corporations') }}</span>
                                                </div>
                                            </div>
                                            <div class="completion-badge"
                                                :class="getCompletionClass(alliance.completionPercentage)">
                                                {{ alliance.completionPercentage }}%
                                            </div>
                                        </div>
                                    </template>

                                    <template #body>
                                        <div class="progress-section">
                                            <div class="progress-bar">
                                                <div class="progress-fill"
                                                    :style="`width: ${alliance.completionPercentage}%`"></div>
                                            </div>
                                            <div class="progress-text">
                                                {{ alliance.corporationsWithKeys }} / {{ alliance.totalCorporations }}
                                                {{ t('admin.analytics.corporationsWithKeys') }}
                                            </div>
                                        </div>
                                    </template>

                                    <template #actions
                                        v-if="alliance.missingCorporations.length > 0 || alliance.corporations.length > 0">
                                        <button @click="toggleMissingCorps(alliance.id)" class="action-btn expand-btn">
                                            <Icon name="heroicons:exclamation-triangle"
                                                class="action-btn-icon warning-icon" />
                                            {{ t('admin.analytics.viewCorporations') }} ({{
                                                alliance.missingCorporations.length }})
                                            <Icon
                                                :name="expandedAlliances.has(alliance.id) ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                                                class="chevron-icon" />
                                        </button>
                                    </template>
                                </Card>

                                <!-- Expanded content outside of card to prevent layout issues -->
                                <div v-if="expandedAlliances.has(alliance.id)" class="expanded-content-external">
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
                        <div v-else class="empty-state">
                            <Icon name="heroicons:flag" class="empty-icon" />
                            <p class="empty-text">{{ t('admin.analytics.esi.noAlliances') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Section Divider -->
                <div class="section-divider"></div>

                <!-- Corporations Section -->
                <div id="corporations-section" class="data-section">
                    <h4 class="section-title">
                        {{ t('admin.analytics.esi.corporations') }}
                        <span class="section-count">({{ filteredCorporations.length }})</span>
                    </h4>
                    <div class="data-container">
                        <div v-if="filteredCorporations.length > 0" class="data-grid">
                            <div v-for="corporation in filteredCorporations" :key="corporation.id"
                                class="corporation-wrapper">
                                <Card variant="elevated" size="md">
                                    <template #header>
                                        <div class="entity-header">
                                            <div class="entity-avatar">
                                                <Image type="corporation" :id="corporation.id" :alt="corporation.name"
                                                    :size="48" class="entity-image" />
                                                <div v-if="corporation.hasCorpKeys" class="entity-badge">
                                                    <Icon name="heroicons:key" class="badge-icon" />
                                                </div>
                                            </div>
                                            <div class="entity-info">
                                                <h5 class="entity-name">{{ corporation.name }}</h5>
                                                <div class="entity-id">ID: {{ corporation.id }}</div>
                                                <div class="entity-stats">
                                                    <span class="stat-item">{{ corporation.keyCount }} {{
                                                        t('admin.analytics.keys') }}</span>
                                                    <span class="stat-item">{{ corporation.memberCount }} {{
                                                        t('admin.analytics.members') }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>

                                    <template #actions>
                                        <button @click="toggleCorpUsers(corporation.id)" class="action-btn expand-btn">
                                            <Icon name="heroicons:users" class="action-btn-icon primary-icon" />
                                            {{ t('admin.analytics.viewUsers') }} ({{ corporation.users.length }})
                                            <Icon
                                                :name="expandedCorporations.has(corporation.id) ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                                                class="chevron-icon" />
                                        </button>
                                    </template>
                                </Card>

                                <!-- Expanded content outside of card -->
                                <div v-if="expandedCorporations.has(corporation.id)" class="expanded-content-external">
                                    <div v-for="user in corporation.users" :key="user.characterId" class="user-item">
                                        <Image type="character" :id="user.characterId" :alt="user.characterName"
                                            :size="32" class="user-image" />
                                        <NuxtLink :to="`/character/${user.characterId}`" class="user-name">
                                            {{ user.characterName }}
                                        </NuxtLink>
                                        <span class="user-scopes">{{ user.scopesCount }} {{
                                            t('admin.analytics.scopes') }}</span>
                                        <div v-if="user.canFetchCorporationKillmails" class="corp-key-indicator">
                                            <Icon name="heroicons:key" class="key-icon" />
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
const activeSection = ref('alliances');

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

// Navigation functions
const scrollToSection = (section: string) => {
    activeSection.value = section;
    const element = document.getElementById(`${section}-section`);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
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
/* Main Container */
.analytics-view {
    padding: var(--space-6);
    background: var(--color-surface-primary);
    min-height: 100vh;
}

/* Header Section */
.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-8);
    padding: var(--space-6);
    background: var(--color-surface-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-primary);
    box-shadow: var(--shadow-sm);
}

.header-info {
    flex: 1;
}

.analytics-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.analytics-description {
    font-size: var(--text-base);
    color: var(--color-text-muted);
    margin: 0;
}

.header-actions {
    display: flex;
    gap: var(--space-3);
}

.action-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-primary-500);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-normal);
}

.action-button:hover:not(:disabled) {
    background: var(--color-primary-600);
    transform: translateY(-1px);
}

.action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.action-icon {
    width: var(--space-4);
    height: var(--space-4);
}

/* Search Controls */
.analytics-controls {
    margin-bottom: var(--space-6);
}

.search-container {
    position: relative;
    max-width: 400px;
}

.search-input {
    width: 100%;
    padding: var(--space-3) var(--space-4) var(--space-3) var(--space-10);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-md);
    background: var(--color-surface-secondary);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    transition: all var(--transition-normal);
}

.search-input:focus {
    outline: none;
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-alpha-100);
}

.search-icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    width: var(--space-4);
    height: var(--space-4);
    color: var(--color-text-muted);
}

.search-clear-btn {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    padding: var(--space-2);
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
}

.search-clear-btn:hover {
    background: var(--color-surface-tertiary);
    color: var(--color-text-primary);
}

.clear-icon {
    width: var(--space-3);
    height: var(--space-3);
}

/* Quick Navigation */
.quick-nav {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    padding: var(--space-4);
    background: var(--color-surface-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-primary);
    box-shadow: var(--shadow-sm);
}

.nav-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface-tertiary);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-normal);
    text-decoration: none;
}

.nav-btn:hover {
    background: var(--color-surface-primary);
    border-color: var(--color-primary-500);
    color: var(--color-text-primary);
}

.nav-btn.active {
    background: var(--color-primary-500);
    border-color: var(--color-primary-600);
    color: var(--color-text-inverse);
}

.nav-icon {
    width: var(--space-4);
    height: var(--space-4);
}

/* Content Container */
.analytics-container {
    background: var(--color-surface-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-primary);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
}

/* Loading State */
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-16);
    text-align: center;
}

.loading-icon {
    width: var(--space-8);
    height: var(--space-8);
    color: var(--color-primary-500);
    margin-bottom: var(--space-4);
}

.loading-text {
    font-size: var(--text-base);
    color: var(--color-text-muted);
    margin: 0;
}

/* Error State */
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-16);
    text-align: center;
}

.error-icon {
    width: var(--space-8);
    height: var(--space-8);
    color: var(--color-danger-500);
    margin-bottom: var(--space-4);
}

.error-text {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.error-details {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
}

.error-retry {
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary-500);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--transition-normal);
}

.error-retry:hover {
    background: var(--color-primary-600);
}

/* Main Content */
.analytics-content {
    padding: var(--space-6);
}

/* Section Titles */
.section-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-6);
}

.section-count {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-normal);
    color: var(--color-text-muted);
    background: var(--color-surface-tertiary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
}

/* Summary Statistics */
.summary-statistics {
    background: var(--color-surface-alpha-subtle);
}

.summary-section {
    margin-bottom: var(--space-8);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
}

.stat-content {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2);
}

.stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-12);
    height: var(--space-12);
    background: var(--color-primary-alpha-100);
    border-radius: var(--radius-md);
    flex-shrink: 0;
}

.stat-icon.corp-icon {
    background: var(--color-success-alpha-100);
}

.stat-icon.alliance-icon {
    background: var(--color-secondary-alpha-100);
}

.stat-icon.members-icon {
    background: var(--color-info-alpha-100);
}

.stat-icon.killmails-icon {
    background: var(--color-warning-alpha-100);
}

.stat-icon .icon {
    width: var(--space-6);
    height: var(--space-6);
    color: var(--color-primary-600);
}

.corp-icon .icon {
    color: var(--color-success-600);
}

.alliance-icon .icon {
    color: var(--color-secondary-600);
}

.members-icon .icon {
    color: var(--color-info-600);
}

.killmails-icon .icon {
    color: var(--color-warning-600);
}

.stat-info {
    flex: 1;
    min-width: 0;
}

.stat-label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
}

.stat-value {
    font-size: var(--text-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
}

/* Data Section - Single Vertical Layout */
.data-section {
    margin-bottom: var(--space-8);
}

.data-container {
    /* Remove height limits and scrolling */
}

.data-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    padding: var(--space-2) 0;
}

.alliance-wrapper,
.corporation-wrapper {
    display: flex;
    flex-direction: column;
}

/* Section Spacing */
.section-divider {
    margin: var(--space-8) 0;
    border-bottom: 1px solid var(--color-border-secondary);
}

/* Entity Header - For Card header slot */
.entity-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
}

.entity-avatar {
    position: relative;
    flex-shrink: 0;
}

.entity-image {
    border-radius: var(--radius-md);
    border: 2px solid var(--color-border-light);
    object-fit: cover;
}

.entity-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: var(--color-success);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.badge-icon {
    width: 12px;
    height: 12px;
    color: var(--color-text-inverse);
}

.entity-info {
    flex: 1;
    min-width: 0;
}

.entity-name {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.entity-id {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-0-5);
}

.entity-stats {
    display: flex;
    gap: var(--space-3);
}

.stat-item {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
}

.completion-badge {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-inverse);
    flex-shrink: 0;
}

.completion-high {
    background: var(--color-success-500);
}

.completion-medium {
    background: var(--color-warning-500);
}

.completion-low {
    background: var(--color-orange-500);
}

.completion-none {
    background: var(--color-danger-500);
}

.progress-section {
    margin-bottom: var(--space-2);
}

.progress-bar {
    width: 100%;
    height: var(--space-2);
    background: var(--color-surface-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: var(--space-2);
}

.progress-fill {
    height: 100%;
    background: var(--color-primary-500);
    transition: width var(--transition-normal);
}

.progress-text {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
}

.action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    transition: background-color var(--duration-150) ease-in-out;
}

.action-btn:hover {
    background: var(--color-surface-alpha-medium);
}

.action-btn-icon {
    width: var(--space-4);
    height: var(--space-4);
    flex-shrink: 0;
}

.primary-icon {
    color: var(--color-brand-primary);
}

.warning-icon {
    color: var(--color-warning-500);
}

.chevron-icon {
    width: var(--space-4);
    height: var(--space-4);
    margin-left: auto;
    transition: transform var(--transition-fast);
}

/* External Expanded Content */
.expanded-content-external {
    margin-top: 0;
    padding: var(--space-4);
    background: var(--color-surface-alpha-subtle);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    border: 1px solid var(--color-border-primary);
    border-top: none;
    box-shadow: var(--shadow-md);
    max-width: 100%;
    width: 100%;
    overflow: hidden;
    box-sizing: border-box;
}

.corp-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.corp-section:not(:last-child) {
    margin-bottom: var(--space-4);
}

.section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
}

.section-header.have-keys {
    background: var(--color-success-alpha-100);
    color: var(--color-success-600);
    border: 1px solid var(--color-success-alpha-200);
}

.section-header.missing-keys {
    background: var(--color-warning-alpha-100);
    color: var(--color-warning-600);
    border: 1px solid var(--color-warning-alpha-200);
}

.section-icon {
    width: var(--space-4);
    height: var(--space-4);
}

.corp-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    background: var(--color-surface-secondary);
    border-radius: var(--radius-sm);
    min-width: 0;
}

.corp-item.have-corp {
    border-left: 3px solid var(--color-success-500);
}

.corp-item.missing-corp {
    border-left: 3px solid var(--color-warning-500);
}

.corp-image {
    width: var(--space-8);
    height: var(--space-8);
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
}

.corp-name {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    max-width: 200px;
}

.corp-members {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
}

.corp-key-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-5);
    height: var(--space-5);
    background: var(--color-success-500);
    color: var(--color-text-inverse);
    border-radius: var(--radius-full);
    flex-shrink: 0;
}

.key-icon {
    width: var(--space-3);
    height: var(--space-3);
}

/* User Items in Corporation Section */
.user-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    background: var(--color-surface-secondary);
    border-radius: var(--radius-sm);
    min-width: 0;
}

.user-image {
    width: var(--space-8);
    height: var(--space-8);
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
}

.user-name {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color var(--transition-fast);
    min-width: 0;
    max-width: 200px;
}

.user-name:hover {
    color: var(--color-primary-500);
}

.user-scopes {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
}

/* Empty States */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    text-align: center;
}

.empty-icon {
    width: var(--space-12);
    height: var(--space-12);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
}

.empty-text {
    font-size: var(--text-base);
    color: var(--color-text-muted);
    margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
    .analytics-view {
        padding: var(--space-4);
    }

    .analytics-header {
        flex-direction: column;
        gap: var(--space-4);
        align-items: stretch;
    }

    .stats-grid {
        grid-template-columns: 1fr;
    }

    .data-grid {
        grid-template-columns: 1fr;
    }

    .entity-stats {
        flex-direction: column;
        gap: var(--space-1);
    }

    .quick-nav {
        flex-direction: column;
        gap: var(--space-3);
    }

    .nav-btn {
        justify-content: center;
    }
}
</style>
