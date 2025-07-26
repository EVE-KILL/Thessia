<template>
    <div class="min-h-screen">
        <div v-if="system" class="mx-auto p-4 text-white">
            <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                <div class="flex flex-col gap-2">
                    <h1 class="text-2xl font-bold">{{ system.system_name }}</h1>
                    <div class="text-gray-400 text-sm">
                        System ID: {{ system.system_id }}
                        <span v-if="system.security !== undefined">
                            &mdash; Security: <span :style="{ color: getSecurityStatusColor(system.security) }">{{
                                system.security.toFixed(2) }}</span>
                        </span>
                    </div>
                </div>
            </UCard>
            <Tabs :items="tabItems" v-model="activeTabId" class="space-y-4">
                <template #overview>
                    <div class="tab-content">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/system/${system.system_id}`"
                            :wsFilter="`system.${system.system_id}`" />
                    </div>
                </template>
                <template #battles>
                    <div class="tab-content">
                        <SystemBattles />
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
                <h3 class="text-lg font-medium text-center">System Not Found</h3>
            </template>
            <p>This solar system does not exist or could not be loaded.</p>
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
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import SystemBattles from '~/components/system/SystemBattles.vue';
import KillList from '../../components/common/KillList.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { id } = route.params;

const {
    data: system,
    pending,
    error,
} = await useFetch(`/api/solarsystems/${id}`);

// SEO setup with dynamic content
useSeoMeta({
    title: () => system.value
        ? t('seo.system.title', { systemName: system.value.system_name })
        : t('systemPageTitle'),
    description: () => system.value
        ? t('seo.system.description', { systemName: system.value.system_name })
        : 'EVE Online solar system information and combat activity',
    ogTitle: () => system.value
        ? t('seo.system.title', { systemName: system.value.system_name })
        : t('systemPageTitle'),
    ogDescription: () => system.value
        ? t('seo.system.description', { systemName: system.value.system_name })
        : 'EVE Online solar system information and combat activity',
    ogType: 'website',
    twitterCard: 'summary',
    twitterTitle: () => system.value
        ? t('seo.system.title', { systemName: system.value.system_name })
        : t('systemPageTitle'),
    twitterDescription: () => system.value
        ? t('seo.system.description', { systemName: system.value.system_name })
        : 'EVE Online solar system information and combat activity'
});

const getSecurityStatusColor = (security: number): string => {
    if (security >= 0.5) return "#00FF00";
    if (security >= 0.0) return "#FFFF00";
    if (security >= -5.0) return "#FF8C00";
    return "#FF0000";
};

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
