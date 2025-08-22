<template>
    <div class="rounded bg-background-800 bg-opacity-75 p-6">
        <h2 class="text-xl font-bold mb-4">{{ $t('topFittings') }}</h2>

        <!-- Loading state -->
        <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="i in 6" :key="i" class="p-4 rounded-md bg-background-700 bg-opacity-50">
                <USkeleton class="h-16 mb-2" />
                <USkeleton class="h-4 w-3/4 mb-1" />
                <USkeleton class="h-3 w-1/2" />
            </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8">
            <div class="text-amber-500 dark:text-amber-400">
                <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 mx-auto mb-2" />
                <p class="text-sm">{{ $t('errorLoadingFittings') }}</p>
                <button @click="retryLoad"
                    class="mt-2 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors">
                    {{ $t('retry') }}
                </button>
            </div>
        </div>

        <!-- No data state -->
        <div v-else-if="!fittings || fittings.length === 0" class="text-center py-8">
            <div class="text-gray-500 dark:text-gray-400">
                <UIcon name="i-lucide-package" class="w-8 h-8 mx-auto mb-2" />
                <p class="text-sm">{{ $t('noFittingsFound') }}</p>
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
});

// Interface for fitting data
interface Fitting {
    killmail_id: number;
    killmail_hash: string;
    svg: string;
}

// Reactive state
const fittings = ref<Fitting[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Only load when component is actually mounted and item is available
const loadFittings = async () => {
    if (!props.item?.type_id) return;

    isLoading.value = true;
    error.value = null;

    try {
        const data = await $fetch<Fitting[]>(`/api/fitting/${props.item.type_id}/svg?limit=10`);
        fittings.value = data || [];
    } catch (err) {
        console.error('Error loading fittings:', err);
        error.value = 'Failed to load fittings';
        fittings.value = [];
    } finally {
        isLoading.value = false;
    }
};

// Retry function
const retryLoad = () => {
    loadFittings();
};

// Load fittings on mount and when item changes
onMounted(() => {
    if (props.item?.type_id) {
        // Add a small delay to let the main page load first
        setTimeout(loadFittings, 100);
    }
});

// Watch for item changes
watch(() => props.item?.type_id, (newTypeId) => {
    if (newTypeId) {
        loadFittings();
    }
});

// Generate eveship.fit URL
function generateEveShipFitUrl(killmailId: number, killmailHash: string): string {
    return `https://eveship.fit/?fit=killmail:${killmailId}/${killmailHash}`;
}
</script>

<style scoped>
.fitting-svg {
    /* Remove height constraints and centering - let SVG display naturally */
    width: 100%;
    overflow: visible;
    /* Ensure no clipping */
}

.fitting-svg :deep(svg) {
    width: 100%;
    height: 50px;
    /* Fixed height matching the generated SVG */
    display: block;
    /* Remove any inline spacing */
}
</style>

<style scoped>
.fitting-svg {
    /* Remove height constraints and centering - let SVG display naturally */
    width: 100%;
    overflow: visible;
    /* Ensure no clipping */
}

.fitting-svg :deep(svg) {
    width: 100%;
    height: 50px;
    /* Fixed height matching the generated SVG */
    display: block;
    /* Remove any inline spacing */
}
</style>
