<template>
    <MobileFullscreen :open="isOpen" :title="t('search.title', 'Search')" @close="closeSearch">
        <template #header>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ t('search.title', 'Search') }}
            </h2>
        </template>

        <!-- Mobile Search Content -->
        <div class="mobile-search-content">
            <!-- Search Input -->
            <div class="mobile-search-wrapper">
                <UIcon name="lucide:search" class="mobile-search-icon" />
                <input ref="searchInput" v-model="searchQuery" type="text"
                    :placeholder="t('search.placeholder', 'Search characters, corporations, alliances...')"
                    class="mobile-search-input" @input="handleSearch" />
            </div>

            <!-- Mobile Search Results -->
            <div v-if="searchQuery && !isLoading && results.length > 0" class="mobile-search-results">
                <!-- Category Summary Buttons -->
                <div v-if="categorizedResults.length > 0" class="mobile-category-summary">
                    <button v-for="category in categorizedResults" :key="category.type" class="mobile-category-button"
                        :data-type="category.type" @click="scrollToCategory(category.type)">
                        <UIcon :name="category.icon" />
                        <span>{{ category.title }}: {{ category.items.length }}</span>
                    </button>
                </div>

                <!-- Results List -->
                <div class="mobile-results-container">
                    <div v-for="category in categorizedResults" :key="category.type" class="mobile-category"
                        :data-category="category.type">
                        <h4 class="mobile-section-title">
                            <UIcon :name="category.icon" class="mobile-section-icon" />
                            {{ category.title }} ({{ category.items.length }})
                        </h4>
                        <div class="mobile-results-list">
                            <NuxtLink v-for="(result, index) in category.items" :key="result.id" :to="result.url"
                                class="mobile-result-item" @click="selectResult(result)">
                                <div class="mobile-result-avatar">
                                    <Image v-if="result.type === 'character'" :id="result.id" type="character"
                                        :size="40" class="mobile-result-image" />
                                    <Image v-else-if="result.type === 'corporation'" :id="result.id" type="corporation"
                                        :size="40" class="mobile-result-image" />
                                    <Image v-else-if="result.type === 'alliance'" :id="result.id" type="alliance"
                                        :size="40" class="mobile-result-image" />
                                    <Image v-else-if="result.type === 'ship'" :id="result.id" type="type-icon"
                                        :size="40" class="mobile-result-image" />
                                    <Image v-else-if="result.type === 'item'" :id="result.id" type="type-icon"
                                        :size="40" class="mobile-result-image" />
                                    <img v-else-if="result.type === 'system' || result.type === 'region'" src="/map.png"
                                        alt="Map" class="mobile-result-image mobile-map-image" />
                                    <div v-else class="mobile-result-fallback">
                                        <UIcon :name="category.icon" />
                                    </div>
                                </div>
                                <div class="mobile-result-content">
                                    <div class="mobile-result-name">{{ result.name }}</div>
                                    <div class="mobile-result-meta">{{ result.meta }}</div>
                                </div>
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Loading -->
            <div v-else-if="isLoading" class="mobile-loading">
                <USkeleton class="h-4 w-full mb-2" />
                <USkeleton class="h-4 w-3/4" />
            </div>

            <!-- Mobile No Results -->
            <div v-else-if="searchQuery && !isLoading && results.length === 0" class="mobile-no-results">
                <p>{{ t('search.noResults', 'No results found') }}</p>
            </div>

            <!-- Mobile Empty State -->
            <div v-else class="mobile-empty-state">
                <p class="mobile-empty-title">{{ t('search.title', 'Search') }}</p>
                <p class="mobile-empty-subtitle">{{ t('search.subtitle') }}</p>
            </div>
        </div>
    </MobileFullscreen>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import MobileFullscreen from '../common/modal/MobileFullscreen.vue';

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
const results = ref<any[]>([]);

// Focus input when opened
watch(isOpen, (newVal) => {
    if (newVal) {
        nextTick(() => {
            searchInput.value?.focus();
        });
    }
});

// Search function
const handleSearch = async () => {
    if (!searchQuery.value || searchQuery.value.length < 2) {
        results.value = [];
        return;
    }

    isLoading.value = true;
    try {
        const response = await $fetch(`/api/search/${encodeURIComponent(searchQuery.value)}`);
        results.value = response || [];
    } catch (error) {
        console.error('Search error:', error);
        results.value = [];
    } finally {
        isLoading.value = false;
    }
};

// Close search
const closeSearch = () => {
    emit('close');
    searchQuery.value = '';
    results.value = [];
};

// Select result
const selectResult = (result: any) => {
    closeSearch();
    navigateTo(result.url);
};

// Scroll to category
const scrollToCategory = (type: string) => {
    const element = document.querySelector(`[data-category="${type}"]`);
    element?.scrollIntoView({ behavior: 'smooth' });
};

// Debounced search
let searchTimeout: NodeJS.Timeout;
watch(searchQuery, () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 300);
});

// Categorized results computed property
const categorizedResults = computed(() => {
    if (!results.value || results.value.length === 0) return [];

    const categories: Record<string, { type: string; title: string; icon: string; items: any[] }> = {};

    results.value.forEach(result => {
        const type = result.type;
        if (!categories[type]) {
            categories[type] = {
                type,
                title: getTypeTitle(type),
                icon: getTypeIcon(type),
                items: []
            };
        }
        categories[type].items.push(result);
    });

    return Object.values(categories);
});

// Helper functions
const getTypeTitle = (type: string): string => {
    const titles: Record<string, string> = {
        'character': 'Characters',
        'corporation': 'Corporations',
        'alliance': 'Alliances',
        'ship': 'Ships',
        'item': 'Items',
        'system': 'Systems',
        'region': 'Regions',
        'faction': 'Factions'
    };
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
        'character': 'lucide:user',
        'corporation': 'lucide:building',
        'alliance': 'lucide:users',
        'ship': 'lucide:plane',
        'item': 'lucide:package',
        'system': 'lucide:map-pin',
        'region': 'lucide:map-pin',
        'faction': 'lucide:flag'
    };
    return icons[type] || 'lucide:search';
};
</script>

<style scoped>
/* Mobile Search Styles */
.mobile-search-content {
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.mobile-search-wrapper {
    display: flex;
    align-items: center;
    background: #f9f9f9;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
    border: 1px solid #e5e5e5;
}

.mobile-search-icon {
    color: #666;
    margin-right: 12px;
    font-size: 20px;
}

.mobile-search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 16px;
    color: #333;
}

.mobile-search-input::placeholder {
    color: #999;
}

/* Category Summary */
.mobile-category-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
}

.mobile-category-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.mobile-category-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

/* Results Container */
.mobile-results-container {
    flex: 1;
    overflow-y: auto;
}

.mobile-category {
    margin-bottom: 24px;
}

.mobile-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e5e5;
}

.mobile-section-icon {
    color: #667eea;
}

.mobile-results-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.mobile-result-item {
    display: flex;
    align-items: center;
    padding: 12px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    color: inherit;
}

.mobile-result-item:hover {
    background: #f9f9f9;
    border-color: #667eea;
    transform: translateX(2px);
}

.mobile-result-avatar {
    width: 40px;
    height: 40px;
    margin-right: 12px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
}

.mobile-result-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.mobile-map-image {
    width: 24px;
    height: 24px;
}

.mobile-result-fallback {
    color: #666;
    font-size: 18px;
}

.mobile-result-content {
    flex: 1;
}

.mobile-result-name {
    font-weight: 500;
    color: #333;
    margin-bottom: 2px;
}

.mobile-result-meta {
    font-size: 14px;
    color: #666;
    text-transform: capitalize;
}

/* States */
.mobile-loading,
.mobile-no-results,
.mobile-empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #666;
}

.mobile-empty-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
}

.mobile-empty-subtitle {
    color: #666;
}

/* Dark Mode */
:global(.dark) .mobile-search-wrapper {
    background: #374151;
    border-color: #4b5563;
}

:global(.dark) .mobile-search-input {
    color: #f9fafb;
}

:global(.dark) .mobile-search-input::placeholder {
    color: #9ca3af;
}

:global(.dark) .mobile-result-item {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
}

:global(.dark) .mobile-result-item:hover {
    background: #4b5563;
}

:global(.dark) .mobile-section-title {
    color: #f9fafb;
    border-color: #4b5563;
}

:global(.dark) .mobile-result-name {
    color: #f9fafb;
}

:global(.dark) .mobile-result-meta {
    color: #9ca3af;
}

:global(.dark) .mobile-empty-title {
    color: #f9fafb;
}

:global(.dark) .mobile-loading,
:global(.dark) .mobile-no-results,
:global(.dark) .mobile-empty-state {
    color: #9ca3af;
}
</style>
