<script setup lang="ts">
defineProps<{
    label: string;
    content: string;
    icon?: string;
    isOpen?: boolean;
}>();

const isExpanded = ref(false);

const toggle = () => {
    isExpanded.value = !isExpanded.value;
};
</script>

<template>
    <div class="border-b border-gray-700/50 last:border-b-0">
        <button class="w-full flex items-center justify-between py-5 px-2 focus:outline-none text-left" @click="toggle"
            :aria-expanded="isExpanded">
            <div class="flex items-center">
                <UIcon v-if="icon" :name="icon" class="text-primary mr-3 text-xl" />
                <span class="text-xl font-medium">{{ label }}</span>
            </div>
            <UIcon :name="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="text-xl transition-transform duration-200" :class="{ 'rotate-180': isExpanded }" />
        </button>

        <div v-show="isExpanded" class="pb-5 px-2 text-gray-300 space-y-4">
            <div class="pt-2 pl-8" v-html="content"></div>
        </div>
    </div>
</template>

<style scoped>
/* Target links within the accordion content */
:deep(a) {
    color: #00aaff;
    /* Primary color - adjust to match your theme */
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
}

:deep(a:hover) {
    text-decoration: underline;
    opacity: 0.9;
}
</style>
