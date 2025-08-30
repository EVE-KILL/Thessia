<template>
    <div :class="componentClasses" :style="componentStyles"
        class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-gray-300 font-semibold">{{ props.title }}</h3>
            <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
            </div>
        </div>

        <div class="space-y-2">
            <template v-if="isLoading">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div class="flex-1">
                        <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                        <div class="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div v-if="topShip" class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gray-600/30 rounded flex items-center justify-center flex-shrink-0">
                        <img v-if="showShipIcon && topShip.shipTypeIcon" :src="topShip.shipTypeIcon"
                            :alt="topShip.shipTypeName" class="w-6 h-6 object-contain" @error="onImageError">
                        <svg v-else class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-white truncate">
                            {{ topShip.shipTypeName }}
                        </div>
                        <div class="text-xs text-gray-400">
                            {{ formatCount(topShip.count) }} {{ props.countLabel }}
                        </div>
                    </div>
                    <div v-if="showPercentage && topShip.percentage" class="text-xs text-gray-400">
                        {{ topShip.percentage.toFixed(1) }}%
                    </div>
                </div>
                <div v-else class="text-sm text-gray-400 text-center py-2">
                    No data available
                </div>
            </template>
        </div>

        <div class="text-gray-400 text-xs mt-3">
            {{ timeRangeText }}
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DomainDashboardComponentProps } from '../types';

interface Props extends DomainDashboardComponentProps {
    /** Custom title for the box */
    title?: string;
    /** Label for the count (e.g., "kills", "losses") */
    countLabel?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Show ship icon */
    showShipIcon?: boolean;
    /** Show percentage */
    showPercentage?: boolean;
    /** Metric to track (kills, losses, involved) */
    metric?: 'kills' | 'losses' | 'involved';
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Top Ship',
    countLabel: 'kills',
    timeRange: '7d',
    size: 'md',
    showShipIcon: true,
    showPercentage: true,
    metric: 'kills'
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
        'domain-dashboard-top-ship-box',
        sizeClasses[props.size],
        props.customClass
    ].filter(Boolean).join(' ');
});

// Top ship data
const topShip = computed(() => {
    if (!componentData.value?.topShips?.length) return null;

    return componentData.value.topShips[0]; // Get the first (top) ship
});

// Format count with appropriate formatting
const formatCount = (count: number) => {
    return formatNumber(count);
};

// Time range text
const timeRangeText = computed(() => {
    return `Last ${getTimeRangeLabel(props.timeRange || '7d')}`;
});

// Handle image loading errors
function onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
}
</script>

<style scoped>
.domain-dashboard-top-ship-box {
    /* Component-specific styles */
    transition: all 0.3s ease;
}

.domain-dashboard-top-ship-box:hover {
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

/* Image fallback styling */
img {
    transition: opacity 0.2s ease;
}
</style>
