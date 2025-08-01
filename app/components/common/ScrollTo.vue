<template>
    <div class="scroll-to-button" :style="{ bottom: `${bottomOffset}px` }">
        <UButton :icon="icon" color="neutral" variant="solid" size="sm" :aria-label="ariaLabel || title" :title="title"
            @click="scrollToTarget" />
    </div>
</template>

<script setup lang="ts">

const props = defineProps({
    targetSelector: { type: String, required: true },
    icon: { type: String, default: 'lucide:message-square' },
    title: { type: String, default: 'Scroll to target' },
    ariaLabel: { type: String, default: '' },
    offset: { type: Number, default: 0 },
    bottomOffset: { type: Number, default: 20 },
});

const scrollToTarget = () => {
    if (!import.meta.client) return;
    const el = document.querySelector(props.targetSelector) as HTMLElement;
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (props.offset) window.scrollBy({ top: props.offset, behavior: 'smooth' });
    }
};
</script>

<style scoped>
.scroll-to-button {
    position: fixed;
    right: 20px;
    z-index: 40;
    opacity: 0.7;
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.scroll-to-button:hover {
    opacity: 1;
    transform: scale(1.1);
}
</style>
