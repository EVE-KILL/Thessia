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
    <div :id="itemKey" class="accordion-item">
        <button class="accordion-button" @click="toggle" :aria-expanded="isExpanded">
            <div class="accordion-header">
                <UIcon v-if="icon" :name="icon" class="accordion-icon" />
                <span class="accordion-label">{{ label }}</span>
            </div>
            <UIcon :name="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="accordion-chevron"
                :class="{ 'rotate-180': isExpanded }" />
        </button>

        <div v-show="isExpanded" class="accordion-content">
            <div class="accordion-body" v-html="content"></div>
        </div>
    </div>
</template>

<style scoped>
.accordion-item {
    border-bottom: 1px solid var(--color-border-light);
}

.accordion-item:last-child {
    border-bottom: none;
}

.accordion-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-2);
    background: none;
    border: none;
    color: var(--color-text-primary);
    text-align: left;
    cursor: pointer;
    transition: var(--duration-200);
}

.accordion-button:focus {
    outline: none;
    background-color: var(--color-bg-hover);
}

.accordion-button:hover {
    background-color: var(--color-bg-hover);
}

.accordion-header {
    display: flex;
    align-items: center;
}

.accordion-icon {
    color: var(--color-brand-primary);
    margin-right: var(--space-3);
    font-size: var(--text-xl);
}

.accordion-label {
    font-size: var(--text-xl);
    font-weight: var(--font-medium);
    color: var(--color-text-primary);
}

.accordion-chevron {
    font-size: var(--text-xl);
    color: var(--color-text-secondary);
    transition: transform var(--duration-200);
}

.accordion-content {
    padding-bottom: var(--space-5);
    padding-left: var(--space-2);
    padding-right: var(--space-2);
    color: var(--color-text-secondary);
}

.accordion-body {
    padding-top: var(--space-2);
    padding-left: var(--space-8);
    line-height: var(--line-height-relaxed);
}

/* Target links within the accordion content */
:deep(a) {
    color: var(--color-brand-primary);
    text-decoration: none;
    font-weight: var(--font-medium);
    transition: all var(--duration-200);
}

:deep(a:hover) {
    text-decoration: underline;
    opacity: 0.9;
}
</style>
