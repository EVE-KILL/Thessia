<template>
    <div class="space-y-1">
        <!-- Status display (percentage) -->
        <div v-if="showStatus" class="flex justify-end">
            <span class="text-xs text-gray-600 dark:text-gray-400">
                {{ Math.round(value) }}%
            </span>
        </div>

        <!-- Progress bar -->
        <div :class="[
            'relative overflow-hidden bg-gray-200 dark:bg-gray-700',
            sizeClasses
        ]">
            <div :class="[
                'h-full transition-all duration-300 ease-out',
                colorClasses
            ]" :style="{ width: `${Math.min(Math.max(value, 0), 100)}%` }" />
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    value: number;
    showStatus?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    color?: 'primary' | 'green' | 'blue' | 'red' | 'amber' | 'gray';
}

const props = withDefaults(defineProps<Props>(), {
    showStatus: false,
    size: 'md',
    color: 'primary'
});

// Size classes
const sizeClasses = computed(() => {
    const sizes = {
        xs: 'h-1',
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4'
    };
    return sizes[props.size];
});

// Color classes
const colorClasses = computed(() => {
    const colors = {
        primary: 'bg-green-600',
        green: 'bg-green-600',
        blue: 'bg-blue-600',
        red: 'bg-red-600',
        amber: 'bg-amber-600',
        gray: 'bg-gray-600'
    };
    return colors[props.color];
});
</script>
