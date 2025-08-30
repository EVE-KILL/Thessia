<template>
    <div :class="componentClasses" :style="componentStyles"
        class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-gray-300 font-semibold">{{ props.title }}</h3>
            <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        </div>

        <div class="text-2xl font-bold text-white mb-1">
            <template v-if="isLoading">
                <div class="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </template>
            <template v-else>
                {{ displayValue }}
            </template>
        </div>

        <div class="text-gray-400 text-sm mb-3">
            {{ entityTypeText }}
        </div>

        <!-- Entity breakdown if enabled -->
        <div v-if="props.showBreakdown && !isLoading && entityBreakdown.length > 0" class="space-y-1">
            <div v-for="entity in entityBreakdown" :key="entity.type" class="flex items-center justify-between text-xs">
                <span class="text-gray-400 capitalize">{{ entity.type }}{{ entity.count !== 1 ? 's' : '' }}</span>
                <span class="text-gray-300 font-medium">{{ formatNumber(entity.count) }}</span>
            </div>
        </div>

        <div class="text-gray-400 text-xs mt-3">
            {{ timeRangeText }}
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DomainDashboardComponentProps } from '../types';

interface EntityBreakdown {
    type: string;
    count: number;
}

interface Props extends DomainDashboardComponentProps {
    /** Custom title for the box */
    title?: string;
    /** Entity type to track (characters, corporations, alliances, etc.) */
    entityType?: 'characters' | 'corporations' | 'alliances' | 'all';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Show breakdown by entity type */
    showBreakdown?: boolean;
    /** Activity threshold (minimum kills/activity to be considered active) */
    activityThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Active Entities',
    entityType: 'characters',
    timeRange: '7d',
    size: 'md',
    showBreakdown: false,
    activityThreshold: 1
});

// Use the shared domain dashboard composable
const {
    componentData,
    isLoading,
    formatNumber,
    getTimeRangeLabel,
    componentClasses: baseClasses,
    componentStyles
} = useDomainDashboard(props);

// Component-specific classes
const componentClasses = computed(() => {
    const sizeClasses = {
        'sm': 'p-4',
        'md': 'p-6',
        'lg': 'p-8'
    };

    return [
        baseClasses.value,
        'domain-dashboard-active-entities-box',
        sizeClasses[props.size],
        props.customClass
    ].filter(Boolean).join(' ');
});

// Display value based on entity type
const displayValue = computed(() => {
    if (!componentData.value) return '0';

    const data = componentData.value;

    switch (props.entityType) {
        case 'characters':
            return formatNumber(data.activeCharacters || 0);
        case 'corporations':
            return formatNumber(data.activeCorporations || 0);
        case 'alliances':
            return formatNumber(data.activeAlliances || 0);
        case 'all':
            return formatNumber(
                (data.activeCharacters || 0) +
                (data.activeCorporations || 0) +
                (data.activeAlliances || 0)
            );
        default:
            return formatNumber(data.activeCharacters || 0);
    }
});

// Entity type text
const entityTypeText = computed(() => {
    const labels = {
        'characters': 'active pilots',
        'corporations': 'active corporations',
        'alliances': 'active alliances',
        'all': 'total active entities'
    };

    return labels[props.entityType] || 'active entities';
});

// Entity breakdown for display
const entityBreakdown = computed((): EntityBreakdown[] => {
    if (!componentData.value || props.entityType !== 'all') return [];

    const data = componentData.value;
    const breakdown: EntityBreakdown[] = [];

    if (data.activeCharacters) {
        breakdown.push({ type: 'character', count: data.activeCharacters });
    }
    if (data.activeCorporations) {
        breakdown.push({ type: 'corporation', count: data.activeCorporations });
    }
    if (data.activeAlliances) {
        breakdown.push({ type: 'alliance', count: data.activeAlliances });
    }

    // Sort by count descending
    return breakdown.sort((a, b) => b.count - a.count);
});

// Time range text
const timeRangeText = computed(() => {
    return `Last ${getTimeRangeLabel(props.timeRange || '7d')}`;
});
</script>

<style scoped>
.domain-dashboard-active-entities-box {
    /* Component-specific styles */
    transition: all 0.3s ease;
}

.domain-dashboard-active-entities-box:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Animation for skeleton loading */
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
</style>
