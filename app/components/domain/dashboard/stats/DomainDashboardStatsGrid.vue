<template>
    <!-- Statistics Highlight Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <!-- Total Kills Card -->
        <div
            class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-gray-300 font-semibold">Total Kills</h3>
                <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ numberFormat(stats?.totalKills || 0) }}</div>
            <div class="text-gray-400 text-sm">Last {{ getTimeRangeLabel(timeRange) }}</div>
        </div>

        <!-- Total ISK Destroyed -->
        <div
            class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-gray-300 font-semibold">ISK Destroyed</h3>
                <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                            clip-rule="evenodd" />
                    </svg>
                </div>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ formatIsk(stats?.totalValue || 0) }}</div>
            <div class="text-gray-400 text-sm">Last {{ getTimeRangeLabel(timeRange) }}</div>
        </div>

        <!-- Top Ship Destroyed -->
        <div
            class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-gray-300 font-semibold">Most Destroyed</h3>
                <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                </div>
            </div>
            <div class="text-lg font-bold text-white mb-1">{{ topShipDestroyed?.ship_group_name || 'Loading...' }}</div>
            <div class="text-gray-400 text-sm">{{ topShipDestroyed?.killed || 0 }} destroyed</div>
        </div>

        <!-- Active Entities -->
        <div
            class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-gray-300 font-semibold">Active Entities</h3>
                <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                </div>
            </div>
            <div class="text-2xl font-bold text-white mb-1">{{ entities.length }}</div>
            <div class="text-gray-400 text-sm">Characters, Corps & Alliances</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    domain: string;
    timeRange?: '1d' | '7d' | '14d' | '30d';
    stats?: any;
    entities?: any[];
    currentLocale?: string;
}

const props = withDefaults(defineProps<Props>(), {
    timeRange: '7d',
    entities: () => [],
    currentLocale: 'en'
});

// Use i18n composable for locale
const { locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Helper functions matching original dashboard exactly
const numberFormat = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const formatIsk = (value: number): string => {
    if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(0);
};

const getTimeRangeLabel = (range: string) => {
    const timeRanges = [
        { label: '1d', value: '1d' },
        { label: '7d', value: '7d' },
        { label: '14d', value: '14d' },
        { label: '30d', value: '30d' }
    ];
    const option = timeRanges.find(t => t.value === range);
    return option?.label || range;
};

const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
};

// Top ship destroyed (matching original logic)
const topShipDestroyed = computed(() => {
    const shipStat = props.stats?.shipGroupStats?.[0];
    if (!shipStat) return null;

    return {
        ...shipStat,
        ship_group_name: getLocalizedString(shipStat.ship_group_name, currentLocale.value)
    };
});
</script>
