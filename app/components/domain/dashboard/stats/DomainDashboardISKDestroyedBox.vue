<template>
    <div :class="componentClasses" :style="componentStyles"
        class="bg-gradient-to-br from-gray-900/40 to-gray-800/30 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-gray-300 font-semibold">{{ props.title }}</h3>
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

        <div class="text-2xl font-bold text-white mb-1">
            <template v-if="isLoading">
                <div class="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Currency symbol to append */
    currency?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: 'ISK Destroyed',
    timeRange: '7d',
    showRawNumber: false,
    size: 'md',
    currency: 'ISK'
});

// Use the shared domain dashboard composable
const {
    componentData,
    isLoading,
    formatIsk,
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
        'domain-dashboard-isk-destroyed-box',
        sizeClasses[props.size],
        props.customClass
    ].filter(Boolean).join(' ');
});

// Display value - either raw or formatted ISK
const displayValue = computed(() => {
    const totalValue = componentData.value?.totalValue || 0;
    const formattedValue = props.showRawNumber ?
        totalValue.toLocaleString() :
        formatIsk(totalValue);

    return `${formattedValue} ${props.currency}`;
});

// Time range text
const timeRangeText = computed(() => {
    return `Last ${getTimeRangeLabel(props.timeRange || '7d')}`;
});
</script>

<style scoped>
.domain-dashboard-isk-destroyed-box {
    /* Component-specific styles */
    transition: all 0.3s ease;
}

.domain-dashboard-isk-destroyed-box:hover {
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
