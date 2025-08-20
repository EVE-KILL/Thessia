<template>
    <div class="min-h-screen">
        <!-- Always show loading until both hydrated AND data is ready -->
        <div v-if="pending || !constellation" class="mx-auto p-4">
            <USkeleton class="h-32 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
        </div>

        <!-- Main content - only show when data is ready -->
        <div v-else-if="constellation" class="mx-auto p-4 text-white">
            <div class="constellation-header rounded-lg overflow-hidden mb-6 bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 border border-gray-300 dark:border-gray-800">
                <!-- Constellation summary section with image and basic info -->
                <div class="p-6">
                    <div class="flex flex-col md:flex-row gap-6">
                        <!-- Left: Constellation image -->
                        <div class="constellation-image-container">
                            <Image type="constellation" :id="(constellation as any).constellation_id"
                                :alt="`Constellation: ${(constellation as any).constellation_name}`"
                                class="constellation-image rounded-lg shadow-lg w-32 h-32" size="128" />
                        </div>

                        <!-- Right: Constellation details -->
                        <div class="flex-grow">
                            <div class="constellation-info">
                                <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                                    {{ (constellation as any).constellation_name }}
                                </h1>

                                <!-- Constellation details -->
                                <div class="constellation-details space-y-2 text-sm">
                                    <div class="flex items-center gap-2">
                                        <UIcon name="i-lucide-hash" class="flex-shrink-0 w-4 h-4 text-gray-500" />
                                        <span class="text-gray-600 dark:text-gray-400">Constellation ID:</span>
                                        <span class="font-medium text-gray-900 dark:text-gray-300">{{ (constellation as any).constellation_id }}</span>
                                    </div>

                                    <div v-if="(constellation as any).region_id !== undefined" class="flex items-center gap-2">
                                        <UIcon name="i-lucide-globe" class="flex-shrink-0 w-4 h-4 text-gray-500" />
                                        <span class="text-gray-600 dark:text-gray-400">Region ID:</span>
                                        <span class="font-medium text-gray-900 dark:text-gray-300">{{ (constellation as any).region_id }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <KillList killlistType="latest" :limit="100"
                :apiEndpoint="`/api/killlist/constellation/${(constellation as any).constellation_id}`"
                :wsFilter="`constellation.${(constellation as any).constellation_id}`" />
        </div>

        <!-- Error State -->
        <UCard v-else-if="error || (constellation && 'error' in constellation)"
            class="mx-auto p-4 text-center bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <template #header>
                <div class="flex justify-center mb-2">
                    <UIcon name="i-lucide-alert-triangle" class="text-amber-500 h-8 w-8" />
                </div>
                <h3 class="text-lg font-medium text-center">Constellation Not Found</h3>
            </template>
            <p>This constellation does not exist or could not be loaded.</p>
            <template #footer>
                <div class="flex justify-center">
                    <UButton icon="i-lucide-arrow-left" variant="ghost" @click="() => { navigateTo('/'); }">
                        Go to Homepage
                    </UButton>
                </div>
            </template>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import KillList from '../../components/common/KillList.vue';

const { t } = useI18n();
const route = useRoute();
const { id } = route.params;

const fetchKey = computed(() => `constellation-${id}`);

const {
    data: constellation,
    pending,
    error,
} = await useFetch(`/api/constellations/${id}`, {
    key: fetchKey,
    server: true,
    lazy: false,  // Don't delay initial render
    default: () => null,
    watch: [() => route.params.id],
});

// SEO setup with dynamic content
useSeoMeta({
    title: () => constellation.value
        ? t('seo.constellation.title', { constellationName: (constellation.value as any).constellation_name })
        : t('constellationPageTitle'),
    description: () => constellation.value
        ? t('seo.constellation.description', { constellationName: (constellation.value as any).constellation_name })
        : 'EVE Online constellation information and combat activity',
    ogTitle: () => constellation.value
        ? t('seo.constellation.title', { constellationName: (constellation.value as any).constellation_name })
        : t('constellationPageTitle'),
    ogDescription: () => constellation.value
        ? t('seo.constellation.description', { constellationName: (constellation.value as any).constellation_name })
        : 'EVE Online constellation information and combat activity',
    ogType: 'website',
    twitterCard: 'summary',
    twitterTitle: () => constellation.value
        ? t('seo.constellation.title', { constellationName: (constellation.value as any).constellation_name })
        : t('constellationPageTitle'),
    twitterDescription: () => constellation.value
        ? t('seo.constellation.description', { constellationName: (constellation.value as any).constellation_name })
        : 'EVE Online constellation information and combat activity'
});
</script>
