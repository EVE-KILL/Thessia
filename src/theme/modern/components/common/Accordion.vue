<script setup lang="ts">
interface AccordionItem {
    label: string;
    content: string;
    icon?: string;
    key?: string;
}

defineProps<{
    items: AccordionItem[];
}>();
</script>

<template>
    <div class="divide-y divide-gray-700/50 bg-black/20 rounded-lg">
        <AccordionItem v-for="(item, index) in items" :key="item.key || index" :label="item.label"
            :content="item.content" :icon="item.icon" />
    </div>
</template>
