<template>
    <div class="min-h-screen">
        <div v-if="constellation" class="mx-auto p-4 text-white">
            <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                <div class="flex flex-col gap-2">
                    <h1 class="text-2xl font-bold">{{ constellation.constellation_name }}</h1>
                    <div class="text-gray-400 text-sm">
                        Constellation ID: {{ constellation.constellation_id }}
                        <span v-if="constellation.region_id !== undefined">
                            &mdash; Region ID: {{ constellation.region_id }}
                        </span>
                    </div>
                </div>
            </UCard>
            <KillList killlistType="latest" :limit="100"
                :apiEndpoint="`/api/killlist/constellation/${constellation.constellation_id}`"
                :wsFilter="`constellation.${constellation.constellation_id}`" />
        </div>
        <div v-else-if="pending" class="mx-auto p-4">
            <USkeleton class="h-32 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
        </div>
        <UCard v-else class="mx-auto p-4 text-center bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
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

const {
    data: constellation,
    pending,
    error,
} = await useFetch(`/api/constellations/${id}`);

// SEO setup with dynamic content
useSeoMeta({
    title: () => constellation.value
        ? t('seo.constellation.title', { constellationName: constellation.value.constellation_name })
        : t('constellationPageTitle'),
    description: () => constellation.value
        ? t('seo.constellation.description', { constellationName: constellation.value.constellation_name })
        : 'EVE Online constellation information and combat activity',
    ogTitle: () => constellation.value
        ? t('seo.constellation.title', { constellationName: constellation.value.constellation_name })
        : t('constellationPageTitle'),
    ogDescription: () => constellation.value
        ? t('seo.constellation.description', { constellationName: constellation.value.constellation_name })
        : 'EVE Online constellation information and combat activity',
    ogType: 'website',
    twitterCard: 'summary',
    twitterTitle: () => constellation.value
        ? t('seo.constellation.title', { constellationName: constellation.value.constellation_name })
        : t('constellationPageTitle'),
    twitterDescription: () => constellation.value
        ? t('seo.constellation.description', { constellationName: constellation.value.constellation_name })
        : 'EVE Online constellation information and combat activity'
});
</script>
