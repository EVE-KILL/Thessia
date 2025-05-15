<template>
    <div class="min-h-screen">
        <div v-if="region" class="mx-auto p-4 text-white">
            <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                <div class="flex flex-col gap-2">
                    <h1 class="text-2xl font-bold">{{ region.name?.en || region.name?.en_us || region.name_id ||
                        'Region' }}</h1>
                    <div class="text-gray-400 text-sm">
                        Region ID: {{ region.region_id }}
                    </div>
                </div>
            </UCard>
            <UTabs :items="tabItems" v-model="selectedTabIndex" class="space-y-4">
                <template #overview>
                    <div class="tab-content">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/region/${region.region_id}`"
                            :wsFilter="`region.${region.region_id}`" />
                    </div>
                </template>
                <template #battles>
                    <div class="tab-content">
                        <RegionBattles />
                    </div>
                </template>
            </UTabs>
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
                <h3 class="text-lg font-medium text-center">Region Not Found</h3>
            </template>
            <p>This region does not exist or could not be loaded.</p>
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
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import RegionBattles from '~/components/region/RegionBattles.vue';
import KillList from '../../components/common/KillList.vue';

const route = useRoute();
const router = useRouter();
const { id } = route.params;

const {
    data: region,
    pending,
    error,
} = useFetch(`/api/regions/${id}`);

const { t } = useI18n();
const tabItems = [
    { id: "overview", label: t("overview"), icon: "i-lucide-home", slot: "overview" as const },
    { id: "battles", label: t("battles"), icon: "i-lucide-swords", slot: "battles" as const },
];

const selectedTabIndex = computed({
    get() {
        const hash = route.hash.slice(1);
        const tabIndex = tabItems.findIndex(item => item.id === hash);
        return tabIndex >= 0 ? String(tabIndex) : '0';
    },
    set(newIndex) {
        const index = parseInt(newIndex, 10);
        const tabId = tabItems[index]?.id || 'overview';
        router.push({
            path: `/region/${id}`,
            hash: `#${tabId}`,
        });
    }
});

onMounted(() => {
    if (!route.hash) {
        router.replace({
            path: route.path,
            hash: '#overview'
        }, { preserveState: true });
    }
});
</script>
