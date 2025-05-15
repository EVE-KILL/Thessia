<template>
    <div class="corporation-dashboard">
        <UCard class="bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <div v-if="corporationDescription" class="corporation-description" v-html="corporationDescription"></div>
            <div v-else class="empty-description">
                {{ $t('corporation.noDescription') }}
            </div>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEveHtmlParser } from "~/src/theme/modern/composables/useEveHtmlParser";

const props = defineProps<{
    corporation: any
}>();

const { convertEveHtml } = useEveHtmlParser();

// Process corporation description through EVE HTML parser
const corporationDescription = computed(() => {
    if (!props.corporation?.description) return "";
    return convertEveHtml(props.corporation.description);
});
</script>

<style scoped>
.corporation-dashboard {
    width: 100%;
}

.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-title {
    font-size: 1.125rem;
    font-weight: 500;
}

.corporation-description {
    line-height: 1.6;
    font-family: monospace;
    word-break: break-word;
    font-size: 1.4rem;
    padding: 0.5rem;
    overflow-y: auto;
}

.corporation-description :deep(a) {
    color: rgb(99, 102, 241);
    text-decoration: none;
}

.corporation-description :deep(a:hover) {
    text-decoration: underline;
}

.empty-description {
    text-align: center;
    padding: 1rem 0;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
}
</style>
