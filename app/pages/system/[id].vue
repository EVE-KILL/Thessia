<template>
    <div class="min-h-screen">
        <!-- Always show loading until both hydrated AND data is ready -->
        <div v-if="pending || !system" class="mx-auto p-4">
            <USkeleton class="h-32 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
        </div>

        <!-- Main content - only show when data is ready -->
        <div v-else-if="system" class="mx-auto p-4 text-white">
            <div class="system-header rounded-lg overflow-hidden mb-6 bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 border border-gray-300 dark:border-gray-800">
                <!-- System summary section with image and basic info -->
                <div class="p-6">
                    <div class="flex flex-col md:flex-row gap-6">
                        <!-- Left: System image -->
                        <div class="system-image-container">
                            <div class="space-y-3">
                                <Image type="system" :id="(system as any)?.system_id"
                                    :alt="`System: ${(system as any)?.system_name}`"
                                    class="system-image rounded-lg shadow-lg w-32 h-32" size="128" />
                                
                                <!-- Constellation and Region images moved here -->
                                <div v-if="(system as any)?.constellation_id || (system as any)?.region_id" 
                                    class="flex gap-2">
                                    <NuxtLink v-if="(system as any)?.constellation_id" :to="`/constellation/${(system as any)?.constellation_id}`"
                                        class="block">
                                        <Image type="constellation" :id="(system as any)?.constellation_id"
                                            :alt="`Constellation: ${(system as any)?.constellation_name}`"
                                            class="rounded-lg w-12 h-12" size="64" />
                                    </NuxtLink>

                                    <NuxtLink v-if="(system as any)?.region_id" :to="`/region/${(system as any)?.region_id}`"
                                        class="block">
                                        <Image type="region" :id="(system as any)?.region_id"
                                            :alt="`Region: ${getRegionName((system as any)?.region_name)}`"
                                            class="rounded-lg w-12 h-12" size="64" />
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>

                        <!-- Right: System details -->
                        <div class="flex-grow">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <!-- Left column: Basic system info -->
                                <div class="system-info">
                                    <div class="mb-3">
                                        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                            {{ (system as any)?.system_name }}
                                        </h1>
                                        
                                        <!-- System type badges - moved up behind name -->
                                        <div class="flex flex-wrap gap-1 mt-2">
                                            <span v-if="(system as any)?.corridor" 
                                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
                                                <UIcon name="i-lucide-arrow-right" class="w-3 h-3 mr-1" />
                                                Corridor
                                            </span>
                                            <span v-if="(system as any)?.hub" 
                                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-md">
                                                <UIcon name="i-lucide-network" class="w-3 h-3 mr-1" />
                                                Hub
                                            </span>
                                            <span v-if="(system as any)?.fringe" 
                                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-md">
                                                <UIcon name="i-lucide-compass" class="w-3 h-3 mr-1" />
                                                Fringe
                                            </span>
                                            <span v-if="(system as any)?.international" 
                                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md">
                                                <UIcon name="i-lucide-globe-2" class="w-3 h-3 mr-1" />
                                                International
                                            </span>
                                            <span v-if="(system as any)?.regional" 
                                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md">
                                                <UIcon name="i-lucide-external-link" class="w-3 h-3 mr-1" />
                                                Regional
                                            </span>
                                            <span v-if="(system as any)?.border" 
                                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md">
                                                <UIcon name="i-lucide-map-pin" class="w-3 h-3 mr-1" />
                                                Border
                                            </span>
                                        </div>
                                    </div>

                                    <!-- System basic details -->
                                    <div class="space-y-2 text-sm">
                                        <div v-if="(system as any)?.region_name" class="flex items-center gap-2">
                                            <Image type="region" :id="(system as any)?.region_id" class="w-4 h-4" size="32" />
                                            <span class="text-gray-600 dark:text-gray-400">Region:</span>
                                            <NuxtLink :to="`/region/${(system as any)?.region_id}`"
                                                class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                {{ getRegionName((system as any)?.region_name) }}
                                            </NuxtLink>
                                        </div>

                                        <div v-if="(system as any)?.constellation_name" class="flex items-center gap-2">
                                            <Image type="constellation" :id="(system as any)?.constellation_id" class="w-4 h-4" size="32" />
                                            <span class="text-gray-600 dark:text-gray-400">Constellation:</span>
                                            <NuxtLink :to="`/constellation/${(system as any)?.constellation_id}`"
                                                class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                {{ (system as any)?.constellation_name }}
                                            </NuxtLink>
                                        </div>

                                        <div v-if="(system as any)?.security !== undefined" class="flex items-center gap-2">
                                            <UIcon name="i-lucide-shield" class="flex-shrink-0 w-4 h-4 text-gray-500" />
                                            <span class="text-gray-600 dark:text-gray-400">Security Level:</span>
                                            <span class="font-medium"
                                                :style="{ color: getSecurityStatusColor((system as any)?.security) }">
                                                {{ (system as any)?.security?.toFixed(2) }}
                                            </span>
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <UIcon name="i-lucide-flag" class="flex-shrink-0 w-4 h-4 text-gray-500" />
                                            <span class="text-gray-600 dark:text-gray-400">Sovereignty:</span>
                                            <span class="font-medium text-gray-900 dark:text-gray-300 whitespace-nowrap overflow-visible">
                                                <template v-if="systemSovereignty?.alliance_name && systemSovereignty?.corporation_name">
                                                    {{ systemSovereignty.alliance_name }} ({{ systemSovereignty.corporation_name }})
                                                </template>
                                                <template v-else-if="systemSovereignty?.alliance_name">
                                                    {{ systemSovereignty.alliance_name }}
                                                </template>
                                                <template v-else-if="systemSovereignty?.corporation_name">
                                                    {{ systemSovereignty.corporation_name }}
                                                </template>
                                                <template v-else-if="systemSovereignty?.alliance_id">
                                                    Alliance ID: {{ systemSovereignty.alliance_id }}
                                                </template>
                                                <template v-else-if="systemSovereignty?.faction_id">
                                                    <span class="text-orange-600 dark:text-orange-400">NPC Faction</span>
                                                </template>
                                                <template v-else>
                                                    <span class="text-gray-500 dark:text-gray-400">Unclaimed</span>
                                                </template>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Middle column: System composition -->
                                <div class="system-composition">
                                    <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">System Composition</h3>
                                    
                                    <div class="space-y-2 text-sm">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-globe" class="flex-shrink-0 w-4 h-4 text-blue-500" />
                                                <span class="text-gray-600 dark:text-gray-400">Planets:</span>
                                            </div>
                                            <span class="font-medium text-gray-900 dark:text-gray-300">
                                                {{ getCelestialCount('Planet') }}
                                            </span>
                                        </div>

                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-circle" class="flex-shrink-0 w-4 h-4 text-gray-500" />
                                                <span class="text-gray-600 dark:text-gray-400">Moons:</span>
                                            </div>
                                            <span class="font-medium text-gray-900 dark:text-gray-300">
                                                {{ getCelestialCount('Moon') }}
                                            </span>
                                        </div>

                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-hexagon" class="flex-shrink-0 w-4 h-4 text-yellow-600" />
                                                <span class="text-gray-600 dark:text-gray-400">Belts/Ice:</span>
                                            </div>
                                            <span class="font-medium text-gray-900 dark:text-gray-300">
                                                {{ getCelestialCount(['Asteroid Belt', 'Ice Belt']) }}
                                            </span>
                                        </div>

                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-shield" class="flex-shrink-0 w-4 h-4 text-green-500" />
                                                <span class="text-gray-600 dark:text-gray-400">Security Class:</span>
                                            </div>
                                            <span class="font-medium" 
                                                :style="{ color: getSecurityStatusColor((system as any)?.security || 0) }">
                                                {{ getSecurityClass((system as any)?.security || 0, (system as any)?.security_class) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Activity Stats section (moved from right) -->
                                <div class="activity-stats">
                                    <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Activity Stats</h3>
                                    
                                    <div class="space-y-2 text-sm">
                                        <!-- System jumps -->
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-activity" class="flex-shrink-0 w-4 h-4 text-orange-400" />
                                                <span class="text-gray-600 dark:text-gray-400">Jumps:</span>
                                            </div>
                                            <span class="font-medium text-gray-900 dark:text-gray-300">
                                                {{ systemJumpData?.ship_jumps?.toLocaleString() || '0' }}
                                            </span>
                                        </div>

                                        <!-- Ship kills -->
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-crosshair" class="flex-shrink-0 w-4 h-4 text-red-500" />
                                                <span class="text-gray-600 dark:text-gray-400">Ship Kills:</span>
                                            </div>
                                            <span class="font-medium text-gray-900 dark:text-gray-300">
                                                {{ systemKillData?.ship_kills?.toLocaleString() || '0' }}
                                            </span>
                                        </div>

                                        <!-- NPC kills -->
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-bot" class="flex-shrink-0 w-4 h-4 text-blue-600" />
                                                <span class="text-gray-600 dark:text-gray-400">NPC Kills:</span>
                                            </div>
                                            <span class="font-medium text-gray-900 dark:text-gray-300">
                                                {{ systemKillData?.npc_kills?.toLocaleString() || '0' }}
                                            </span>
                                        </div>

                                        <!-- Pod kills -->
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <UIcon name="i-lucide-skull" class="flex-shrink-0 w-4 h-4 text-purple-600" />
                                                <span class="text-gray-600 dark:text-gray-400">Pod Kills:</span>
                                            </div>
                                            <span class="font-medium text-gray-900 dark:text-gray-300">
                                                {{ systemKillData?.pod_kills?.toLocaleString() || '0' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Tabs :items="tabItems" v-model="activeTabId" class="space-y-4">
                <template #overview>
                    <div class="tab-content">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/system/${(system as any)?.system_id}`"
                            :wsFilter="`system.${(system as any)?.system_id}`" />
                    </div>
                </template>
                <template #info>
                    <div class="tab-content">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Jump Connections -->
                            <div v-if="(system as any)?.jump_connections?.length > 0" class="space-y-4">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <UIcon name="i-lucide-external-link" class="w-5 h-5" />
                                    Jump Connections
                                </h3>
                                <div class="space-y-2">
                                    <div v-for="connection in (system as any)?.jump_connections" :key="connection.stargate_id"
                                        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div class="flex items-center gap-2">
                                            <Image type="system" :id="connection.destination_system_id" class="w-6 h-6" size="64" />
                                            <div>
                                                <NuxtLink :to="`/system/${connection.destination_system_id}`"
                                                    class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                                    {{ connection.destination_system_name }}
                                                </NuxtLink>
                                                <div class="text-xs text-gray-500">via {{ connection.stargate_name }}</div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span v-if="connection.is_regional_jump" 
                                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md">
                                                Regional
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Neighboring Systems -->
                            <div v-if="(system as any)?.neighboring_systems?.length > 0" class="space-y-4">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <UIcon name="i-lucide-map" class="w-5 h-5" />
                                    Neighboring Systems
                                </h3>
                                <div class="space-y-2">
                                    <div v-for="neighbor in (system as any)?.neighboring_systems" :key="neighbor.system_id"
                                        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div class="flex items-center gap-2">
                                            <Image type="system" :id="neighbor.system_id" class="w-6 h-6" size="64" />
                                            <NuxtLink :to="`/system/${neighbor.system_id}`"
                                                class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                                {{ neighbor.system_name }}
                                            </NuxtLink>
                                        </div>
                                        <span v-if="neighbor.security !== undefined"
                                            class="text-sm font-medium"
                                            :style="{ color: getSecurityStatusColor(neighbor.security) }">
                                            {{ neighbor.security?.toFixed(2) }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Celestials -->
                            <div v-if="(system as any)?.celestials?.length > 0" class="space-y-4 lg:col-span-2">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <UIcon name="i-lucide-star" class="w-5 h-5" />
                                    Celestials ({{ (system as any)?.celestials?.length }})
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div v-for="celestial in (system as any)?.celestials" :key="celestial.item_id"
                                        class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                                        <div class="flex-shrink-0">
                                            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="font-medium text-gray-900 dark:text-white truncate">
                                                {{ celestial.item_name }}
                                            </div>
                                            <div class="text-xs text-gray-500 truncate">
                                                {{ celestial.type_name }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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

const getSecurityStatusColor = (security: number): string => {
    if (security >= 0.5) return "#00FF00";
    if (security >= 0.0) return "#FFFF00";
    if (security >= -5.0) return "#FF8C00";
    return "#FF0000";
};

const getSecurityClass = (security: number, securityClass?: string): string => {
    // Use the database security_class if available
    if (securityClass) {
        return securityClass;
    }
    
    // Fallback to security level calculation
    if (security >= 0.5) return "High-Sec";
    if (security >= 0.0) return "Low-Sec";
    return "Null-Sec";
};

const getRegionName = (regionName: any): string => {
    if (typeof regionName === 'object' && regionName !== null) {
        return regionName.en || regionName.en_us || 'Unknown Region';
    }
    return regionName || 'Unknown Region';
};

const getTranslatedName = (name: any): string => {
    if (typeof name === 'object' && name !== null) {
        return name[locale.value] || name.en || name.en_us || 'Unknown';
    }
    return name || 'Unknown';
};

const getCelestialCount = (types: string | string[]): number => {
    if (!system.value || !(system.value as any).celestials) return 0;
    
    const celestials = (system.value as any).celestials;
    const searchTypes = Array.isArray(types) ? types : [types];
    
    return celestials.filter((celestial: any) => {
        return searchTypes.some(type => 
            celestial.type_name?.toLowerCase().includes(type.toLowerCase()) ||
            celestial.item_name?.toLowerCase().includes(type.toLowerCase())
        );
    }).length;
};

const tabItems = [
    { id: "overview", label: t("overview"), icon: "i-lucide-home", slot: "overview" as const },
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
