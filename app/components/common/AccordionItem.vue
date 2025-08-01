<script setup lang="ts">
const props = defineProps<{
    label: string;
    content: string;
    icon?: string;
    isOpen?: boolean;
    itemKey?: string;
}>();

const isExpanded = ref(false);
const route = useRoute();

// Check if this item should be opened based on URL hash
onMounted(() => {
    if (route.hash && route.hash.slice(1) === props.itemKey) {
        isExpanded.value = true;
        // Scroll to the element after a short delay to ensure it's rendered
        nextTick(() => {
            const element = document.getElementById(props.itemKey || '');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
});

// Watch for route changes to handle hash navigation
watch(() => route.hash, (newHash) => {
    if (newHash && newHash.slice(1) === props.itemKey) {
        isExpanded.value = true;
        nextTick(() => {
            const element = document.getElementById(props.itemKey || '');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
});

const toggle = () => {
    isExpanded.value = !isExpanded.value;

    // Update URL hash when opening an accordion item
    if (isExpanded.value && props.itemKey) {
        // Use navigateTo to update the hash without causing a page reload
        navigateTo(`#${props.itemKey}`, { replace: true });
    }
};
</script>

<template>
    <div :id="itemKey" class="border-b border-gray-700/50 last:border-b-0">
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
