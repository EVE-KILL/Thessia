<template>
    <div class="stat-card bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ title }}</p>
                <p class="text-2xl font-bold" :class="colorClasses">{{ value }}</p>
            </div>
            <div class="flex-shrink-0">
                <UIcon :name="icon" class="h-8 w-8" :class="iconColorClasses" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    title: string
    value: string | number
    icon: string
    color?: 'red' | 'green' | 'blue' | 'emerald' | 'yellow' | 'purple' | 'gray'
}

const props = withDefaults(defineProps<Props>(), {
    color: 'gray'
})

const colorClasses = computed(() => {
    const colorMap = {
        red: 'text-red-600 dark:text-red-400',
        green: 'text-green-600 dark:text-green-400',
        blue: 'text-blue-600 dark:text-blue-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
        yellow: 'text-yellow-600 dark:text-yellow-400',
        purple: 'text-purple-600 dark:text-purple-400',
        gray: 'text-gray-900 dark:text-gray-100'
    }
    return colorMap[props.color]
})

const iconColorClasses = computed(() => {
    const colorMap = {
        red: 'text-red-500',
        green: 'text-green-500',
        blue: 'text-blue-500',
        emerald: 'text-emerald-500',
        yellow: 'text-yellow-500',
        purple: 'text-purple-500',
        gray: 'text-gray-500'
    }
    return colorMap[props.color]
})
</script>
