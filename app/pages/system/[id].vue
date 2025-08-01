<template>
    <div class="min-h-screen">
        <!-- Always show loading until both hydrated AND data is ready -->
        <div v-if="pending || !system" class="mx-auto p-4">
            <USkeleton class="h-32 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
        </div>

        <!-- Main content - only show when data is ready -->
        <div v-else-if="system" class="mx-auto p-4 text-white">
            <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                <div class="flex flex-col gap-2">
                    <h1 class="text-2xl font-bold">{{ (system as any)?.system_name }}</h1>
                    <div class="text-gray-400 text-sm">
                        System ID: {{ (system as any)?.system_id }}
                        <span v-if="(system as any)?.security !== undefined">
                            &mdash; Security: <span
                                :style="{ color: getSecurityStatusColor((system as any)?.security) }">{{
                                    (system as any)?.security?.toFixed(2) }}</span>
                        </span>
                    </div>
                </div>
            </UCard>
            <Tabs :items="tabItems" v-model="activeTabId" class="space-y-4">
                <template #overview>
                    <div class="tab-content">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/system/${(system as any)?.system_id}`"
                            :wsFilter="`system.${(system as any)?.system_id}`" />
                    </div>
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

        <!-- Error State -->
        <UCard v-else-if="error || (system && 'error' in system)"
            class="mx-auto p-4 text-center bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
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
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
// import SystemBattles from '~/components/system/SystemBattles.vue';
import KillList from '../../components/common/KillList.vue';

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
} = useAsyncData(fetchKey.value, () =>
    $fetch(`/api/solarsystems/${id}`), {
    lazy: true,
    server: true,
    watch: [() => route.params.id],
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
