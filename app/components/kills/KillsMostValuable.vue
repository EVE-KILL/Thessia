<script setup lang="ts">
import { computed } from "vue";

interface IMostValuableKill {
    killmail_id: number;
    total_value: number;
    victim: {
        ship_id: number;
        ship_name: string | Record<string, string>;
        character_id?: number;
        character_name?: string;
        corporation_id?: number;
        corporation_name?: string;
        alliance_id?: number;
        alliance_name?: string;
    };
    final_blow?: {
        character_id?: number;
        character_name?: string;
        ship_id: number;
        ship_name: string | Record<string, string>;
    };
}

const props = defineProps({
    title: { type: String, default: 'Most Valuable Kills' },
    items: { type: Array as PropType<IMostValuableKill[]>, default: () => [] },
    limit: { type: Number, default: 7 },
    loading: { type: Boolean, default: false },
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Helper functions for data formatting and display
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[locale] || obj.en || "";
};

// Format ISK similar to KillList
const formatIsk = (value: number): string => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toString();
};

const getShipName = (item: IMostValuableKill): string => {
    return getLocalizedString(item.victim.ship_name, currentLocale.value);
};

// Handle item click to navigate to kill details
const handleItemClick = (killmailId: number) => {
    navigateTo(`/kill/${killmailId}`);
};

// Responsive design
const { isMobile } = useResponsive();

// Generate link for Table component
const generateKillLink = (item: IMostValuableKill): string | null => {
    if (!item || !item.killmail_id) return null;
    return `/kill/${item.killmail_id}`;
};

// Display items limited by props.limit
const displayItems = computed(() => {
    if (props.loading) return [];
    return props.items.slice(0, props.limit);
});

// Prioritize images in the viewport
const isPriorityImage = (index: number): boolean => {
    return index < 3; // First 3 images are prioritized for immediate loading
};
</script>

<template>
    <div class="flex flex-col min-w-full rounded-lg overflow-hidden">
        <!-- Display error message if no items and not loading -->
        <div v-if="!loading && displayItems.length === 0" class="p-4 text-center text-gray-500 dark:text-gray-400">
            {{ t('noData') }}
        </div>

        <!-- Use our custom Table component with horizontal layout -->
        <Table :columns="[]" :items="displayItems" :loading="loading" :skeleton-count="props.limit"
            :empty-text="t('noData')" :empty-icon="'i-lucide-file-text'" horizontal
            :horizontal-items-per-row="isMobile ? 2 : props.limit" :link-fn="generateKillLink" background="transparent"
            hover>
            <!-- Custom horizontal item template -->
            <template #horizontal-item="{ item, index }">
                <div class="flex flex-col items-center p-2">
                    <Image type="type-render" :id="(item as IMostValuableKill).victim.ship_id"
                        :alt="`Ship: ${getShipName(item as IMostValuableKill)}`"
                        class="rounded w-20 h-20 md:w-24 md:h-24 object-contain mb-2" size="256"
                        :loading="index < 5 ? 'eager' : 'lazy'" :priority="isPriorityImage(index)" />
                    <div class="text-center text-xs mt-1 max-w-full truncate text-gray-900 dark:text-white">
                        {{ getShipName(item as IMostValuableKill) }}
                    </div>
                    <div class="text-center text-xs mt-1 text-gray-500 dark:text-background-300">
                        {{ formatIsk((item as IMostValuableKill).total_value) }} ISK
                    </div>
                    <!-- Show victim name if available -->
                    <div v-if="(item as IMostValuableKill).victim.character_name"
                        class="text-center text-xs mt-1 text-gray-400 dark:text-background-400 truncate max-w-full">
                        {{ (item as IMostValuableKill).victim.character_name }}
                    </div>
                </div>
            </template>

            <!-- Custom horizontal skeleton that matches final layout -->
            <template #horizontal-skeleton>
                <div class="horizontal-grid" :class="[`grid-cols-${isMobile ? 2 : props.limit}`]">
                    <div v-for="i in props.limit" :key="`skeleton-kills-${i}`" class="horizontal-item">
                        <div class="flex flex-col items-center p-2">
                            <div
                                class="rounded w-20 h-20 md:w-24 md:h-24 bg-gray-200 dark:bg-gray-700 animate-pulse mb-2">
                            </div>
                            <div class="h-3 w-16 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div class="h-3 w-12 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div class="h-2 w-14 mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </template>
        </Table>
    </div>
</template>

<style scoped>
/* Match text sizes with other components */
:deep(.text-sm) {
    font-size: 0.9rem;
    line-height: 1rem;
}

:deep(.text-xs) {
    font-size: 0.8rem;
    line-height: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    :deep(.text-sm) {
        font-size: 0.85rem;
    }

    :deep(.text-xs) {
        font-size: 0.75rem;
    }
}

/* Table styles */
:deep(tbody tr) {
    border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
    border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
}

/* Consistent animation timing for all skeleton elements */
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}

/* Fix grid columns for skeleton */
.horizontal-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 5), 1fr);
    gap: 0.75rem;
    padding: 0.5rem;
}

.grid-cols-2 {
    --cols: 2;
}

.grid-cols-3 {
    --cols: 3;
}

.grid-cols-4 {
    --cols: 4;
}

.grid-cols-5 {
    --cols: 5;
}

.grid-cols-6 {
    --cols: 6;
}

.grid-cols-7 {
    --cols: 7;
}
</style>
