<template>
    <div v-if="fittings && fittings.length > 0" class="rounded bg-background-800 bg-opacity-75">
        <h2 class="text-xl font-bold mb-4">{{ $t('topFittings') }}</h2>

        <!-- Loading state -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="i in 4" :key="i" class="p-4 rounded-md">
                <USkeleton class="h-60" />
            </div>
        </div>

        <!-- Data loaded state -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="fitting in fittings" :key="fitting.killmail_id"
                class="hover:bg-background-700 transition-colors duration-300 rounded-md">
                <a :href="generateEveShipFitUrl(fitting.killmail_id, fitting.killmail_hash)" target="_blank"
                    rel="noopener noreferrer" class="block">
                    <div v-html="fitting.svg" class="fitting-svg"></div>
                </a>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps({
    item: {
        type: Object,
        default: null,
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

// Interface for fitting data
interface Fitting {
    killmail_id: number;
    killmail_hash: string;
    svg: string;
}

// Improved data fetching with proper caching
const { data, pending, error: fetchError } = await useAsyncData(
    () => `item-fittings-${props.item?.type_id}`,
    async () => {
        if (!props.item?.type_id) {
            return [];
        }

        return await $fetch<Fitting[]>(`/api/fitting/${props.item.type_id}?limit=10`);
    },
    {
        lazy: true,
        server: false,
        watch: [() => props.item?.type_id],
        default: () => [],
    },
);

// Reactive fittings data
const fittings = computed(() => data.value || []);

// Generate eveship.fit URL
function generateEveShipFitUrl(killmailId: number, killmailHash: string): string {
    return `https://eveship.fit/?fit=killmail:${killmailId}/${killmailHash}`;
}
</script>

<style scoped>
.fitting-svg :deep(svg) {
    width: 100%;
    height: 100%;
    max-height: 250px;
}
</style>
