<template>
    <div :class="componentClasses" :style="componentStyles"
        class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-gray-300 font-semibold">{{ title }}</h3>
            <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        </div>

        <div class="text-2xl font-bold text-white mb-1">
            <template v-if="isLoading">
                <div class="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </template>
            <template v-else>
                {{ displayValue }}
            </template>
        </div>

        <div class="text-gray-400 text-sm">
            {{ timeRangeText }}
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DomainDashboardComponentProps } from '../types';

interface Props extends DomainDashboardComponentProps {
    /** Custom title for the box */
    title?: string;
    /** Show raw number instead of formatted */
    showRawNumber?: boolean;
    /** Custom icon SVG path */
    iconPath?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Total Kills',
    timeRange: '7d',
    showRawNumber: false,
    size: 'md'
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

// Component-specific classes - rename to match template usage
const componentClasses = computed(() => {
    const sizeClasses = {
        'sm': 'p-4',
        'md': 'p-6',
        'lg': 'p-8'
    };

    return [
        baseClasses.value,
        'domain-dashboard-total-kills-box',
        sizeClasses[props.size],
        props.customClass
    ].filter(Boolean).join(' ');
});

// Display value - either raw or formatted
const displayValue = computed(() => {
    const totalKills = componentData.value?.totalKills || 0;
    return props.showRawNumber ? totalKills.toLocaleString() : formatNumber(totalKills);
});

// Time range text
const timeRangeText = computed(() => {
    return `Last ${getTimeRangeLabel(props.timeRange || '7d')}`;
});

// All variables are automatically available in template with <script setup>
</script>

<style scoped>
.domain-dashboard-total-kills-box {
    /* Component-specific styles */
    transition: all 0.3s ease;
}

.domain-dashboard-total-kills-box:hover {
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
