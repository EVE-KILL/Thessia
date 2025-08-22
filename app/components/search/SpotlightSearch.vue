<template>
    <div v-if="isOpen" class="spotlight-overlay" @click="closeSearch" @keydown.escape="closeSearch">
        <div class="spotlight-container" @click.stop>
            <!-- Search Header -->
            <div class="spotlight-header">
                <div class="spotlight-search-wrapper">
                    <UIcon name="lucide:search" class="spotlight-search-icon" />
                    <input ref="searchInput" v-model="searchQuery" type="text" :placeholder="t('searchFor')"
                        class="spotlight-input" @input="handleSearch" @keydown="handleKeydown" />
                    <div class="spotlight-shortcut">
                        <span class="spotlight-key">ESC</span>
                    </div>
                </div>
            </div>

            <!-- Search Results -->
            <div class="spotlight-content" :class="{ 'spotlight-content-loading': isLoading }">
                <!-- Loading State -->
                <div v-if="isLoading" class="spotlight-loading">
                    <div class="spotlight-loading-spinner">
                        <UIcon name="lucide:loader" class="animate-spin" />
                    </div>
                    <p class="spotlight-loading-text">{{ t('search.searching') }}</p>
                </div>

                <!-- Empty State -->
                <div v-else-if="!searchQuery" class="spotlight-empty">
                    <!-- Quick Actions -->
                    <div class="spotlight-quick-actions">
                        <h4 class="spotlight-section-title">{{ t('search.quickActions') }}</h4>
                        <div class="spotlight-quick-grid">
                            <a href="/kills/latest" class="spotlight-quick-item" data-type="latest"
                                @click="closeSearch">
                                <UIcon name="lucide:zap" class="spotlight-quick-icon" />
                                <span>{{ t('latestKills') }}</span>
                            </a>
                            <a href="/kills/big" class="spotlight-quick-item" data-type="big" @click="closeSearch">
                                <UIcon name="lucide:trending-up" class="spotlight-quick-icon" />
                                <span>{{ t('bigKills') }}</span>
                            </a>
                            <a href="/battles" class="spotlight-quick-item" data-type="battles" @click="closeSearch">
                                <UIcon name="lucide:shield" class="spotlight-quick-icon" />
                                <span>{{ t('battles') }}</span>
                            </a>
                            <a href="/stats" class="spotlight-quick-item" data-type="stats" @click="closeSearch">
                                <UIcon name="lucide:bar-chart-3" class="spotlight-quick-icon" />
                                <span>{{ t('stats') }}</span>
                            </a>
                        </div>
                    </div>

                    <!-- Recent Searches and EVE Tools Side by Side -->
                    <div class="spotlight-bottom-sections">
                        <!-- Recent Searches -->
                        <div v-if="recentSearches.length > 0" class="spotlight-recent">
                            <h4 class="spotlight-section-title">{{ t('search.recent') }}</h4>
                            <div class="spotlight-recent-list">
                                <button v-for="(recent, index) in recentSearches" :key="index"
                                    class="spotlight-recent-item" @click="selectRecentSearch(recent)">
                                    <UIcon name="lucide:clock" class="spotlight-recent-icon" />
                                    <span>{{ recent }}</span>
                                    <UIcon name="lucide:x" class="spotlight-recent-remove"
                                        @click.stop="removeRecentSearch(index)" />
                                </button>
                            </div>
                        </div>

                        <!-- EVE Tools -->
                        <div class="spotlight-eve-tools">
                            <h4 class="spotlight-section-title">{{ t('search.eveTools') || 'EVE Tools' }}</h4>
                            <div class="spotlight-eve-tools-grid">
                                <a href="https://evemaps.dotlan.net/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="DOTLAN - EVE Maps & Intel" @click="closeSearch">
                                    <img src="https://evemaps.dotlan.net/favicon.ico" alt="DOTLAN"
                                        class="spotlight-eve-tool-icon">
                                    <span>DOTLAN</span>
                                </a>
                                <a href="https://eveeye.com/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="EVEEye - Interactive Maps" @click="closeSearch">
                                    <img src="https://eveeye.com/img/eveeye.svg" alt="EVEEye"
                                        class="spotlight-eve-tool-icon">
                                    <span>EVEEye</span>
                                </a>
                                <a href="https://evemissioneer.com/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="EVE Missioneer - Mission & Market Intel"
                                    @click="closeSearch">
                                    <img src="https://evemissioneer.com/favicon.png" alt="EVE Missioneer"
                                        class="spotlight-eve-tool-icon">
                                    <span>EVE Missioneer</span>
                                </a>
                                <a href="https://eveship.fit/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="EveShip.fit - Ship Fitting Tool"
                                    @click="closeSearch">
                                    <img src="https://eveship.fit/favicon.ico" alt="EveShip.fit"
                                        class="spotlight-eve-tool-icon">
                                    <span>EveShip.fit</span>
                                </a>
                                <a href="https://everef.net/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="EVERef - Game Reference" @click="closeSearch">
                                    <img src="https://everef.net/favicon.ico" alt="EVERef"
                                        class="spotlight-eve-tool-icon">
                                    <span>EVERef</span>
                                </a>
                                <a href="https://jita.space/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="Jita.Space - Market Analysis"
                                    @click="closeSearch">
                                    <img src="https://www.jita.space/favicon.ico" alt="Jita.Space"
                                        class="spotlight-eve-tool-icon">
                                    <span>Jita.Space</span>
                                </a>
                                <a href="https://evewho.com/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="EVEWho - Character & Corporation Intel"
                                    @click="closeSearch">
                                    <img src="https://evewho.com/favicon.ico" alt="EVEWho"
                                        class="spotlight-eve-tool-icon">
                                    <span>EVEWho</span>
                                </a>
                                <a href="https://zkillboard.com/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="zKillboard - Killmail Database"
                                    @click="closeSearch">
                                    <img src="https://zkillboard.com/img/wreck.png" alt="zKillboard"
                                        class="spotlight-eve-tool-icon">
                                    <span>zKillboard</span>
                                </a>
                                <a href="https://riftforeve.online/" target="_blank" rel="noopener noreferrer"
                                    class="spotlight-eve-tool" title="RIFT Intel Fusion - Intelligence Platform"
                                    @click="closeSearch">
                                    <img src="/images/rift-intel-fusion-tool-256.png" alt="RIFT Intel Fusion"
                                        class="spotlight-eve-tool-icon">
                                    <span>RIFT Intel</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Results -->
                <div v-else-if="!isLoading && searchQuery && results.length === 0" class="spotlight-no-results">
                    <div class="spotlight-no-results-icon">
                        <UIcon name="lucide:search-x" />
                    </div>
                    <h3 class="spotlight-no-results-title">{{ t('search.noResults') }}</h3>
                    <p class="spotlight-no-results-subtitle">
                        {{ t('search.noResultsFor') }} "{{ searchQuery }}"
                    </p>
                </div>

                <!-- Search Results -->
                <div v-else-if="results.length > 0" class="spotlight-results">
                    <!-- Category Summary Buttons -->
                    <div v-if="categorizedResults.length > 0" class="spotlight-category-summary">
                        <button v-for="category in categorizedResults" :key="category.type"
                            class="spotlight-category-button" :data-type="category.type"
                            @click="scrollToCategory(category.type)">
                            <UIcon :name="category.icon" />
                            <span>{{ category.title }}: {{ category.items.length }}</span>
                        </button>
                    </div>

                    <!-- Scrollable Results Container -->
                    <div class="spotlight-results-container">
                        <!-- Results by category -->
                        <div v-for="category in categorizedResults" :key="category.type" class="spotlight-category"
                            :data-category="category.type">
                            <h4 class="spotlight-section-title">
                                <UIcon :name="category.icon" class="spotlight-section-icon" />
                                {{ category.title }} ({{ category.items.length }})
                            </h4>
                            <div class="spotlight-results-list">
                                <a v-for="(result, index) in category.items" :key="result.id" :href="result.url"
                                    class="spotlight-result-item"
                                    :class="{ 'spotlight-result-selected': selectedIndex === getGlobalIndex(category.type, index) }"
                                    @click="selectResult(result, $event)">
                                    <div class="spotlight-result-avatar">
                                        <Image v-if="result.type === 'character'" :id="result.id" type="character"
                                            :size="32" class="spotlight-result-image" />
                                        <Image v-else-if="result.type === 'corporation'" :id="result.id"
                                            type="corporation" :size="32" class="spotlight-result-image" />
                                        <Image v-else-if="result.type === 'alliance'" :id="result.id" type="alliance"
                                            :size="32" class="spotlight-result-image" />
                                        <Image v-else-if="result.type === 'ship'" :id="result.id" type="type-icon"
                                            :size="32" class="spotlight-result-image" />
                                        <Image v-else-if="result.type === 'item'" :id="result.id" type="type-icon"
                                            :size="32" class="spotlight-result-image" />
                                        <img v-else-if="result.type === 'system' || result.type === 'region'"
                                            src="/map.png" alt="Map"
                                            class="spotlight-result-image spotlight-map-image" />
                                        <div v-else class="spotlight-result-fallback">
                                            <UIcon :name="category.icon" />
                                        </div>
                                    </div>
                                    <div class="spotlight-result-content">
                                        <div class="spotlight-result-name">{{ result.name }}</div>
                                        <div class="spotlight-result-meta">{{ result.meta }}</div>
                                    </div>
                                    <UIcon name="lucide:arrow-up-right" class="spotlight-result-arrow" />
                                </a>
                            </div>
                        </div>
                    </div> <!-- End spotlight-results-container -->
                </div>
            </div>

            <!-- Footer -->
            <div class="spotlight-footer">
                <div class="spotlight-footer-shortcuts">
                    <div class="spotlight-shortcut-group">
                        <span class="spotlight-key">↑</span>
                        <span class="spotlight-key">↓</span>
                        <span class="spotlight-key-label">{{ t('search.navigate') }}</span>
                    </div>
                    <div class="spotlight-shortcut-group">
                        <span class="spotlight-key">↵</span>
                        <span class="spotlight-key-label">{{ t('search.select') }}</span>
                    </div>
                    <div class="spotlight-shortcut-group">
                        <span class="spotlight-key">ESC</span>
                        <span class="spotlight-key-label">{{ t('search.close') }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// Explicit imports to avoid auto-import issues in production
import { navigateTo } from '#app';
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Props
interface Props {
    open?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    open: false,
});

// Emits
const emit = defineEmits<{
    close: [];
}>();

// Reactive state
const isOpen = toRef(props, 'open');
const searchQuery = ref('');
const isLoading = ref(false);
const searchInput = ref<HTMLInputElement>();
const selectedIndex = ref(-1);
const results = ref<any[]>([]);

// Recent searches (stored in localStorage)
const recentSearches = ref<string[]>([]);

// Categorized results
const categorizedResults = computed(() => {
    const categories = {
        character: {
            type: 'character',
            title: t('search.characters'),
            icon: 'lucide:user',
            items: results.value.filter(r => r.type === 'character'),
        },
        corporation: {
            type: 'corporation',
            title: t('search.corporations'),
            icon: 'lucide:building',
            items: results.value.filter(r => r.type === 'corporation'),
        },
        alliance: {
            type: 'alliance',
            title: t('search.alliances'),
            icon: 'lucide:users',
            items: results.value.filter(r => r.type === 'alliance'),
        },
        ship: {
            type: 'ship',
            title: t('search.ships'),
            icon: 'lucide:plane',
            items: results.value.filter(r => r.type === 'ship'),
        },
        item: {
            type: 'item',
            title: t('search.items'),
            icon: 'lucide:package',
            items: results.value.filter(r => r.type === 'item'),
        },
        system: {
            type: 'system',
            title: t('search.systems'),
            icon: 'lucide:map-pin',
            items: results.value.filter(r => r.type === 'system'),
        },
        region: {
            type: 'region',
            title: t('search.regions'),
            icon: 'lucide:globe',
            items: results.value.filter(r => r.type === 'region'),
        },
        faction: {
            type: 'faction',
            title: t('search.factions'),
            icon: 'lucide:flag',
            items: results.value.filter(r => r.type === 'faction'),
        },
    };

    // Filter out categories with no items and sort by item count (ascending - least results first)
    return Object.values(categories)
        .filter(cat => cat.items.length > 0)
        .sort((a, b) => a.items.length - b.items.length);
});

// Get global index for keyboard navigation
const getGlobalIndex = (categoryType: string, itemIndex: number) => {
    let globalIndex = 0;
    for (const category of categorizedResults.value) {
        if (category.type === categoryType) {
            return globalIndex + itemIndex;
        }
        globalIndex += category.items.length;
    }
    return -1;
};

// Load recent searches from localStorage
onMounted(() => {
    if (import.meta.client) {
        try {
            const stored = localStorage.getItem('eve-kill-recent-searches');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    recentSearches.value = parsed.slice(0, 5); // Limit to 5 recent searches
                    console.log('Loaded recent searches:', recentSearches.value);
                }
            }
        } catch (error) {
            console.warn('Failed to load recent searches:', error);
            // Reset localStorage if corrupted
            localStorage.removeItem('eve-kill-recent-searches');
        }
    }
});

// Save recent searches to localStorage
const saveRecentSearches = () => {
    if (import.meta.client) {
        try {
            localStorage.setItem('eve-kill-recent-searches', JSON.stringify(recentSearches.value));
            console.log('Saved recent searches:', recentSearches.value);
        } catch (error) {
            console.warn('Failed to save recent searches:', error);
        }
    }
};

// Add to recent searches
const addToRecentSearches = (query: string) => {
    const trimmed = query.trim();
    if (trimmed && trimmed.length >= 2 && !recentSearches.value.includes(trimmed)) {
        recentSearches.value.unshift(trimmed);
        recentSearches.value = recentSearches.value.slice(0, 5); // Keep only 5 most recent
        saveRecentSearches();
        console.log('Added to recent searches:', trimmed);
    }
};

// Remove from recent searches
const removeRecentSearch = (index: number) => {
    recentSearches.value.splice(index, 1);
    saveRecentSearches();
};

// Select recent search
const selectRecentSearch = (query: string) => {
    searchQuery.value = query;
    handleSearch();
};

// Search debouncer
let searchTimeout: ReturnType<typeof setTimeout>;

// Handle search input
const handleSearch = async () => {
    const query = searchQuery.value.trim();

    if (!query) {
        results.value = [];
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            isLoading.value = true;
            selectedIndex.value = -1;

            // Use path parameter instead of query parameter
            const response = await $fetch<{ hits: any[]; entityCounts: any; entityOrder: string[] }>(`/api/search/${encodeURIComponent(query)}`);

            // Add URLs to results based on their type
            const resultsWithUrls = (response?.hits || []).map(result => ({
                ...result,
                url: generateResultUrl(result)
            }));

            results.value = resultsWithUrls;
        } catch (error) {
            console.error('Search error:', error);
            results.value = [];
        } finally {
            isLoading.value = false;
        }
    }, 300);
};

// Handle keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
    const totalResults = results.value.length;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            selectedIndex.value = selectedIndex.value < totalResults - 1 ? selectedIndex.value + 1 : 0;
            break;

        case 'ArrowUp':
            event.preventDefault();
            selectedIndex.value = selectedIndex.value > 0 ? selectedIndex.value - 1 : totalResults - 1;
            break;

        case 'Enter':
            event.preventDefault();
            // If there's only one result, auto-select it
            if (totalResults === 1) {
                selectResult(results.value[0]);
            }
            // Otherwise, select the currently highlighted result
            else if (selectedIndex.value >= 0 && results.value[selectedIndex.value]) {
                selectResult(results.value[selectedIndex.value]);
            }
            break;
    }
};

// Select a result
const selectResult = (result: any, event?: Event) => {
    // Prevent default link navigation since we're handling it programmatically
    if (event) {
        event.preventDefault();
    }

    addToRecentSearches(searchQuery.value);
    closeSearch();
    navigateTo(result.url);
};

// Close search
const closeSearch = () => {
    emit('close');
    searchQuery.value = '';
    results.value = [];
    selectedIndex.value = -1;
};

// Scroll to category
const scrollToCategory = (categoryType: string) => {
    const element = document.querySelector(`[data-category="${categoryType}"]`);
    if (element) {
        // For desktop, use the custom container scrolling
        const container = document.querySelector('.spotlight-results-container');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const offsetTop = elementRect.top - containerRect.top + container.scrollTop;
            container.scrollTo({ top: offsetTop - 20, behavior: 'smooth' });
        }
    }
};

// Generate URL for search result based on type
const generateResultUrl = (result: any) => {
    switch (result.type) {
        case 'character':
            return `/character/${result.id}`;
        case 'corporation':
            return `/corporation/${result.id}`;
        case 'alliance':
            return `/alliance/${result.id}`;
        case 'ship':
        case 'item':
            return `/item/${result.id}`;
        case 'system':
            return `/system/${result.id}`;
        case 'region':
            return `/region/${result.id}`;
        case 'faction':
            return `/faction/${result.id}`;
        default:
            return '#';
    }
};

// Focus input when opened
watch(isOpen, (open) => {
    if (open) {
        nextTick(() => {
            searchInput.value?.focus();
        });
    }
});
</script>

<style scoped>
.spotlight-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 10vh var(--space-4) var(--space-4);
    animation: spotlight-overlay-enter 0.2s ease-out;
}

@keyframes spotlight-overlay-enter {
    from {
        opacity: 0;
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
    }

    to {
        opacity: 1;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }
}

.spotlight-container {
    width: 100%;
    max-width: 42rem;
    background: var(--color-surface-primary);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 4px 25px -4px rgba(0, 0, 0, 0.15),
        0 0 0 1px var(--color-border-secondary);
    overflow: hidden;
    animation: spotlight-container-enter 0.3s ease-out;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

@keyframes spotlight-container-enter {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.spotlight-header {
    padding: var(--space-6);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-secondary);
}

.spotlight-search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.spotlight-search-icon {
    position: absolute;
    left: var(--space-4);
    font-size: var(--text-xl);
    color: var(--color-text-muted);
    pointer-events: none;
}

.spotlight-input {
    width: 100%;
    height: 3.5rem;
    padding: 0 var(--space-12) 0 3.5rem;
    border: none;
    background: var(--color-surface-tertiary);
    border-radius: var(--radius-lg);
    font-size: var(--text-lg);
    color: var(--color-text-primary);
    outline: none;
    transition: background-color 0.2s ease;
}

.spotlight-input:focus {
    background: var(--color-surface-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha);
}

.spotlight-input::placeholder {
    color: var(--color-text-muted);
}

.spotlight-shortcut {
    position: absolute;
    right: var(--space-4);
}

.spotlight-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.spotlight-content-loading {
    overflow: hidden;
}

.spotlight-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    text-align: center;
}

.spotlight-loading-spinner {
    font-size: 2rem;
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
}

.spotlight-loading-text {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
}

.spotlight-empty,
.spotlight-no-results {
    padding: var(--space-8) var(--space-6);
    text-align: center;
}

.spotlight-empty-icon,
.spotlight-no-results-icon {
    font-size: 3rem;
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
}

.spotlight-empty-title,
.spotlight-no-results-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
}

.spotlight-empty-subtitle,
.spotlight-no-results-subtitle {
    color: var(--color-text-muted);
    margin-bottom: var(--space-8);
}

.spotlight-quick-actions,
.spotlight-recent {
    margin-top: var(--space-6);
}

.spotlight-section-title {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: var(--space-3);
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.spotlight-section-icon {
    font-size: var(--text-base);
}

.spotlight-quick-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
}

@media (max-width: 640px) {
    .spotlight-quick-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

.spotlight-quick-item {
    display: flex;
    align-items: center;
    padding: var(--space-3);
    background: var(--color-surface-tertiary);
    border-radius: var(--radius-base);
    text-decoration: none;
    color: var(--color-text-primary);
    transition: all 0.2s ease;
    font-size: var(--text-sm);
    gap: var(--space-2);
}

.spotlight-quick-item:hover {
    background: var(--color-surface-secondary);
    transform: translateY(-1px);
}

/* Colorful quick action buttons */
.spotlight-quick-item[data-type="latest"] {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border: 1px solid #2563eb;
    color: white;
}

.spotlight-quick-item[data-type="big"] {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border: 1px solid #b45309;
    color: white;
}

.spotlight-quick-item[data-type="battles"] {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border: 1px solid #b91c1c;
    color: white;
}

.spotlight-quick-item[data-type="stats"] {
    background: linear-gradient(135deg, #10b981, #059669);
    border: 1px solid #047857;
    color: white;
}

.spotlight-quick-item[data-type]:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.spotlight-quick-icon {
    font-size: var(--text-base);
}

.spotlight-recent-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.spotlight-recent-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-base);
    text-align: left;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: background-color 0.2s ease;
    gap: var(--space-2);
}

.spotlight-recent-item:hover {
    background: var(--color-surface-tertiary);
}

.spotlight-recent-icon {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    flex-shrink: 0;
}

.spotlight-recent-remove {
    margin-left: auto;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    opacity: 0;
    transition: opacity 0.2s ease;
}

.spotlight-recent-item:hover .spotlight-recent-remove {
    opacity: 1;
}

/* Bottom sections side-by-side layout */
.spotlight-bottom-sections {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-6);
    margin-top: var(--space-6);
}

@media (max-width: 768px) {
    .spotlight-bottom-sections {
        grid-template-columns: 1fr;
        gap: var(--space-4);
    }
}

/* EVE Tools Section */
.spotlight-eve-tools-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    margin-top: var(--space-3);
}

.spotlight-eve-tool {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-3) var(--space-2);
    background: var(--color-surface-tertiary);
    border: 1px solid rgba(128, 128, 128, 0.2);
    border-radius: var(--radius-base);
    text-decoration: none;
    color: var(--color-text-primary);
    transition: all 0.3s ease;
    font-size: var(--text-xs);
    font-weight: 500;
    gap: var(--space-2);
    opacity: 1;
    text-align: center;
}

.spotlight-eve-tool:hover {
    background: var(--color-surface-secondary);
    border-color: var(--color-primary-400);
    color: var(--color-primary-600);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:global(.dark) .spotlight-eve-tool {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--color-text-primary);
}

:global(.dark) .spotlight-eve-tool:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--color-primary-500);
    color: var(--color-primary-400);
}

.spotlight-eve-tool-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    opacity: 1;
    transition: opacity 0.3s ease;
}

.spotlight-eve-tool:hover .spotlight-eve-tool-icon {
    opacity: 1;
}

@media (max-width: 640px) {
    .spotlight-eve-tools-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .spotlight-eve-tool {
        padding: var(--space-2);
        font-size: 10px;
    }

    .spotlight-eve-tool-icon {
        width: 16px;
        height: 16px;
    }
}

.spotlight-results {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.spotlight-category-summary {
    position: relative;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    background: var(--color-surface-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
}

:global(.dark) .spotlight-category-summary {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.spotlight-results-container {
    overflow-y: auto;
    max-height: calc(80vh - 300px);
    padding: var(--space-4) 0;
}

.spotlight-category-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

/* Colorful button variants */
.spotlight-category-button[data-type="character"] {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border-color: #2563eb;
    color: white;
}

.spotlight-category-button[data-type="corporation"] {
    background: linear-gradient(135deg, #10b981, #059669);
    border-color: #047857;
    color: white;
}

.spotlight-category-button[data-type="alliance"] {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    border-color: #6d28d9;
    color: white;
}

.spotlight-category-button[data-type="ship"] {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border-color: #b45309;
    color: white;
}

.spotlight-category-button[data-type="item"] {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-color: #b91c1c;
    color: white;
}

.spotlight-category-button[data-type="system"] {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    border-color: #0e7490;
    color: white;
}

.spotlight-category-button[data-type="region"] {
    background: linear-gradient(135deg, #84cc16, #65a30d);
    border-color: #4d7c0f;
    color: white;
}

.spotlight-category-button[data-type="faction"] {
    background: linear-gradient(135deg, #ec4899, #db2777);
    border-color: #be185d;
    color: white;
}

.spotlight-category-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.spotlight-category {
    margin-bottom: var(--space-6);
}

.spotlight-category:first-child {
    margin-top: var(--space-4);
}

.spotlight-category:last-child {
    margin-bottom: 0;
}

.spotlight-category .spotlight-section-title {
    padding: 0 var(--space-6);
    margin-bottom: var(--space-3);
}

.spotlight-results-list {
    display: flex;
    flex-direction: column;
}

.spotlight-result-item {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-6);
    text-decoration: none;
    color: var(--color-text-primary);
    transition: background-color 0.2s ease;
    gap: var(--space-3);
}

.spotlight-result-item:hover,
.spotlight-result-selected {
    background: var(--color-surface-secondary);
}

.spotlight-result-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-base);
    overflow: hidden;
}

.spotlight-result-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.spotlight-map-image {
    filter: brightness(0.8) contrast(1.2);
    object-fit: cover;
}

/* Only apply dark styles when the dark class exists on a parent */
html.dark .spotlight-container .spotlight-map-image {
    filter: brightness(0.6) contrast(1.3) hue-rotate(200deg);
}

.spotlight-result-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-gray-200);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
}

:global(.dark) .spotlight-result-fallback {
    background: var(--color-gray-700);
}

.spotlight-result-content {
    flex: 1;
    min-width: 0;
}

.spotlight-result-name {
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-1);
}

.spotlight-result-meta {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
}

.spotlight-result-arrow {
    flex-shrink: 0;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    opacity: 0;
    transition: opacity 0.2s ease;
}

.spotlight-result-item:hover .spotlight-result-arrow,
.spotlight-result-selected .spotlight-result-arrow {
    opacity: 1;
}

.spotlight-footer {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-secondary);
}

.spotlight-footer-shortcuts {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    flex-wrap: wrap;
}

.spotlight-shortcut-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
}

.spotlight-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    padding: 0 var(--space-1);
    background: var(--color-surface-tertiary);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
    box-shadow: inset 0 -1px 0 var(--color-border-secondary);
}

.spotlight-key-label {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
}
</style>
