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
            <Tabs :items="tabItems" v-model="activeTabId" class="space-y-4">
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
            </Tabs>
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
import { ref, onMounted, watch } from 'vue';
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

// Use a simple ref instead of a computed property for the active tab
const activeTabId = ref('');

// Watch for changes in route.hash to update activeTabId
watch(() => route.hash, (newHash) => {
    const tabId = newHash.slice(1);
    if (tabItems.some(item => item.id === tabId)) {
        activeTabId.value = tabId;
    } else if (!tabId && tabItems.length > 0) {
        // If hash is empty or invalid, just set the active tab without updating URL
        activeTabId.value = tabItems[0].id;
    }
});

// Watch for changes in activeTabId to update URL hash, but only for user interactions
watch(activeTabId, (newId, oldId) => {
    // Only update the URL if:
    // 1. This isn't the initial value (oldId exists)
    // 2. There was an actual change (newId !== oldId)
    // 3. The URL doesn't already have this hash
    // 4. Either: there's already a hash in the URL, OR the new tab isn't the default
    if (oldId && 
        newId !== oldId && 
        route.hash !== `#${newId}` &&
        (route.hash || newId !== tabItems[0].id)) {
        router.push({ hash: `#${newId}` });
    }
});

// Initialize activeTabId from hash or default without affecting URL
onMounted(() => {
    const hash = route.hash.slice(1);
    const validTab = tabItems.find(item => item.id === hash);
    if (validTab) {
        activeTabId.value = hash;
    } else if (tabItems.length > 0) {
        activeTabId.value = tabItems[0].id;
    }
});
</script>
