<template>
    <div class="min-h-screen">
        <!-- Loading State -->
        <div v-if="pending || !system" class="mx-auto p-4">
            <USkeleton class="h-32 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
        </div>

        <!-- Main content - system data -->
        <div v-else-if="system" class="mx-auto p-4 text-gray-900 dark:text-white">
            <!-- System Dashboard Component -->
            <SystemDashboard :system="system as any" :sovereignty="systemSovereignty" :jumps="systemJumpData"
                :kills="systemKillData" />

            <Tabs :items="tabItems" v-model="activeTabId" class="space-y-4">
                <template #overview>
                    <div class="tab-content">
                        <div class="text-center p-8">
                            <div class="max-w-md mx-auto">
                                <UIcon name="i-lucide-construction" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">{{ t('comingSoon') }}
                                </h3>
                                <p class="text-gray-500 dark:text-gray-400">{{ t('systemOverviewComingSoon') }}</p>
                            </div>
                        </div>
                    </div>
                </template>
                <template #kills>
                    <SystemKills :system-id="(system as any)?.system_id" />
                </template>
                <template #info>
                    <SystemInformation :system="system as any" />
                </template>
                <template #battles>
                    <div class="tab-content">
                        <div class="text-center p-8">
                            <p class="text-gray-400">System battles component coming soon...</p>
                        </div>
                    </div>
                </template>
            </Tabs>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import SystemDashboard from '~/components/system/SystemDashboard.vue';
import SystemInformation from '~/components/system/SystemInformation.vue';
import SystemKills from '~/components/system/SystemKills.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { id } = route.params;

// For hydration safety
const isClient = ref(false);

const fetchKey = computed(() => `system-${id}`);

const {
    data: system,
    pending,
    error,
} = await useFetch(`/api/solarsystems/${id}`, {
    key: fetchKey,
    server: true,
    lazy: false,  // Don't delay initial render
    default: () => null,
    watch: [() => route.params.id],
});

// Computed properties for ESI data - now comes from the API
const systemSovereignty = computed(() => {
    return (system.value as any)?.sovereignty || null;
});

const systemJumpData = computed(() => {
    return (system.value as any)?.jumps || null;
});

const systemKillData = computed(() => {
    return (system.value as any)?.kills || null;
});

const sovereigntyStructures = computed(() => {
    // This would need to be added to the API as well if needed
    return [];
});

// SEO setup with dynamic content
useSeoMeta({
    title: () => system.value
        ? t('seo.system.title', { systemName: (system.value as any).system_name })
        : t('systemPageTitle'),
    description: () => system.value
        ? t('seo.system.description', { systemName: (system.value as any).system_name })
        : 'EVE Online solar system information and combat activity',
    ogTitle: () => system.value
        ? t('seo.system.title', { systemName: (system.value as any).system_name })
        : t('systemPageTitle'),
    ogDescription: () => system.value
        ? t('seo.system.description', { systemName: (system.value as any).system_name })
        : 'EVE Online solar system information and combat activity',
    ogType: 'website',
    twitterCard: 'summary',
    twitterTitle: () => system.value
        ? t('seo.system.title', { systemName: (system.value as any).system_name })
        : t('systemPageTitle'),
    twitterDescription: () => system.value
        ? t('seo.system.description', { systemName: (system.value as any).system_name })
        : 'EVE Online solar system information and combat activity'
});

const tabItems = [
    { id: "overview", label: t("overview"), icon: "i-lucide-home", slot: "overview" as const },
    { id: "kills", label: t("kills"), icon: "i-lucide-crosshair", slot: "kills" as const },
    { id: "info", label: t("information"), icon: "i-lucide-info", slot: "info" as const },
    { id: "battles", label: t("battles"), icon: "i-lucide-swords", slot: "battles" as const },
];

// For SSR compatibility, always start with the default tab
// Hash-based initialization will happen after hydration
const activeTabId = ref<string>(tabItems[0]?.id || '');

// Initialize from hash on client-side after hydration
onMounted(() => {
    isClient.value = true;

    nextTick(() => {
        const currentHash = route.hash.slice(1);
        console.log('onMounted - currentHash:', currentHash);

        if (currentHash && tabItems.some(item => item.id === currentHash)) {
            console.log('onMounted - setting activeTabId to hash:', currentHash);
            activeTabId.value = currentHash;
        }
    });
});

// Watch for changes in route.hash to update activeTabId
watch(() => route.hash, (newHash) => {
    if (!isClient.value) return; // Don't run until hydrated

    const hashValue = newHash.slice(1);
    if (hashValue && tabItems.some(item => item.id === hashValue)) {
        activeTabId.value = hashValue;
    } else if (!hashValue && tabItems.length > 0) {
        // If hash is empty or invalid, just set the active tab without updating URL
        activeTabId.value = tabItems[0]?.id || '';
    }
}, { immediate: false }); // Don't run immediately to avoid conflicts with onMounted

// Update URL only when activeTabId changes due to user interaction
watch(activeTabId, (newTabId, oldTabId) => {
    if (!isClient.value) return; // Don't run until hydrated

    // Only update the URL if:
    // 1. This isn't the initial value (oldTabId exists)
    // 2. There was an actual change (newTabId !== oldTabId)
    // 3. The URL doesn't already have this hash
    // 4. Either: there's already a hash in the URL, OR the new tab isn't the default
    if (oldTabId &&
        newTabId !== oldTabId &&
        route.hash !== `#${newTabId}` &&
        (route.hash || newTabId !== (tabItems[0]?.id || ''))) {
        try {
            router.push({ hash: `#${newTabId}` });
        } catch (error) {
            console.warn('Failed to update hash:', error);
        }
    }
}, { flush: 'post' }); // Wait for DOM updates
</script>
