<template>
    <div class="flex flex-col p-2 pt-4">
        <!-- System Header Section -->
        <div
            class="rounded-t-lg overflow-hidden bg-gradient-to-b from-gray-100/90 to-gray-200/50 dark:from-gray-900/30 dark:to-gray-900/50 border border-gray-300 dark:border-gray-800">
            <div class="p-6">
                <div class="flex flex-col md:flex-row gap-6">
                    <!-- Left: System Image -->
                    <div class="system-image-container">
                        <Image type="system" :id="system?.system_id" :alt="`System: ${system?.system_name}`"
                            class="system-image rounded-lg shadow-lg w-32 h-32" size="128" />
                    </div>

                    <!-- Center: System Basic Info -->
                    <div class="flex-grow">
                        <div class="mb-3">
                            <div class="flex flex-wrap items-center gap-2">
                                <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                    {{ system?.system_name }}
                                </h1>

                                <!-- System type badges -->
                                <span v-if="system?.corridor"
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
                                    <UIcon name="i-lucide-arrow-right" class="w-3 h-3 mr-1" />
                                    Corridor
                                </span>
                                <span v-if="system?.hub"
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-md">
                                    <UIcon name="i-lucide-network" class="w-3 h-3 mr-1" />
                                    Hub
                                </span>
                                <span v-if="system?.fringe"
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-md">
                                    <UIcon name="i-lucide-compass" class="w-3 h-3 mr-1" />
                                    Fringe
                                </span>
                                <span v-if="system?.international"
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md">
                                    <UIcon name="i-lucide-globe-2" class="w-3 h-3 mr-1" />
                                    International
                                </span>
                                <span v-if="system?.regional"
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md">
                                    <UIcon name="i-lucide-external-link" class="w-3 h-3 mr-1" />
                                    Regional
                                </span>
                                <span v-if="system?.border"
                                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md">
                                    <UIcon name="i-lucide-map-pin" class="w-3 h-3 mr-1" />
                                    Border
                                </span>
                            </div>
                        </div>

                        <!-- System Navigation Links -->
                        <div class="space-y-2 text-sm">
                            <div v-if="system?.region_name" class="flex items-center gap-2">
                                <Image v-if="system.region_id" type="region" :id="system.region_id" class="w-4 h-4"
                                    size="32" />
                                <span class="text-gray-600 dark:text-gray-400">Region:</span>
                                <NuxtLink :to="`/region/${system?.region_id}`"
                                    class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    {{ getRegionName(system?.region_name) }}
                                </NuxtLink>
                            </div>

                            <div v-if="system?.constellation_name" class="flex items-center gap-2">
                                <Image v-if="system.constellation_id" type="constellation" :id="system.constellation_id"
                                    class="w-4 h-4" size="32" />
                                <span class="text-gray-600 dark:text-gray-400">Constellation:</span>
                                <NuxtLink :to="`/constellation/${system?.constellation_id}`"
                                    class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    {{ system?.constellation_name }}
                                </NuxtLink>
                            </div>

                            <div v-if="system?.security !== undefined" class="flex items-center gap-2">
                                <UIcon name="i-lucide-shield" class="flex-shrink-0 w-4 h-4 text-gray-500" />
                                <span class="text-gray-600 dark:text-gray-400">Security Level:</span>
                                <span class="font-medium" :style="{ color: getSecurityStatusColor(system?.security) }">
                                    {{ system?.security?.toFixed(2) }}
                                </span>
                                <span class="text-sm text-gray-500">
                                    ({{ getSecurityClass(system?.security || 0, system?.security_class) }})
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Constellation and Region Images -->
                    <div class="flex flex-row gap-3">
                        <!-- Constellation image -->
                        <div v-if="system?.constellation_id">
                            <NuxtLink :to="`/constellation/${system?.constellation_id}`" class="block">
                                <Image type="constellation" :id="system?.constellation_id"
                                    :alt="`Constellation: ${system?.constellation_name}`" class="rounded-lg w-32 h-32"
                                    size="128" />
                            </NuxtLink>
                        </div>

                        <!-- Region image -->
                        <div v-if="system?.region_id">
                            <NuxtLink :to="`/region/${system?.region_id}`" class="block">
                                <Image type="region" :id="system?.region_id"
                                    :alt="`Region: ${getRegionName(system?.region_name)}`" class="rounded-lg w-32 h-32"
                                    size="128" />
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Metrics Boxes Row - Stats dashboard section -->
        <div
            class="stats-dashboard p-6 bg-gradient-to-b from-gray-200/50 to-gray-100/50 dark:from-gray-900/50 dark:to-black/50 border-l border-r border-b border-gray-300 dark:border-gray-800 rounded-b-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- System Composition -->
                <div class="stat-card">
                    <div class="stat-header">
                        <UIcon name="i-lucide-layers" class="stat-icon text-blue-500" />
                        <h3 class="stat-title text-gray-700 dark:text-gray-200">System Composition</h3>
                    </div>
                    <div class="stat-body">
                        <!-- Security Status -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">Security Status:</div>
                            <div class="stat-value" :style="{ color: getSecurityStatusColor(system?.security ?? 0) }">
                                {{ system?.security?.toFixed(2) ?? 'Unknown' }}
                                ({{ getSecurityClass(system?.security || 0, system?.security_class) }})
                            </div>
                        </div>

                        <!-- Planets -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-globe" class="inline w-4 h-4 mr-1 text-blue-500" />
                                Planets:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ getCelestialCount('Planet') }}
                            </div>
                        </div>

                        <!-- Moons -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-circle" class="inline w-4 h-4 mr-1 text-gray-500" />
                                Moons:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ getCelestialCount('Moon') }}
                            </div>
                        </div>

                        <!-- Belts/Ice -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-hexagon" class="inline w-4 h-4 mr-1 text-yellow-600" />
                                Belts/Ice:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ getCelestialCount(['Asteroid Belt', 'Ice Belt']) }}
                            </div>
                        </div>

                        <!-- Stargates -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-zap" class="inline w-4 h-4 mr-1 text-purple-500" />
                                Stargates:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ getCelestialCount('Stargate') }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Activity Stats -->
                <div class="stat-card">
                    <div class="stat-header">
                        <UIcon name="i-lucide-activity" class="stat-icon text-green-500" />
                        <h3 class="stat-title text-gray-700 dark:text-gray-200">Activity Stats</h3>
                    </div>
                    <!-- Time period indicator -->
                    <div class="text-xs text-gray-500 dark:text-gray-400 text-right mb-3 -mt-1">1h / 24h</div>
                    <div class="stat-body">
                        <!-- Jumps -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-activity" class="inline w-4 h-4 mr-1 text-orange-400" />
                                Jumps:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ jumps?.ship_jumps_1h?.toLocaleString() || '0' }} / {{
                                    jumps?.ship_jumps?.toLocaleString() || '0' }}
                            </div>
                        </div>

                        <!-- Ship Kills -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-crosshair" class="inline w-4 h-4 mr-1 text-red-500" />
                                Ship Kills:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ kills?.ship_kills_1h?.toLocaleString() || '0' }} / {{
                                    kills?.ship_kills?.toLocaleString() || '0' }}
                            </div>
                        </div>

                        <!-- NPC Kills -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-bot" class="inline w-4 h-4 mr-1 text-blue-600" />
                                NPC Kills:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ kills?.npc_kills_1h?.toLocaleString() || '0' }} / {{
                                    kills?.npc_kills?.toLocaleString() || '0' }}
                            </div>
                        </div>

                        <!-- Pod Kills -->
                        <div class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">
                                <UIcon name="i-lucide-skull" class="inline w-4 h-4 mr-1 text-purple-600" />
                                Pod Kills:
                            </div>
                            <div class="stat-value text-gray-900 dark:text-gray-300">
                                {{ kills?.pod_kills_1h?.toLocaleString() || '0' }} / {{
                                    kills?.pod_kills?.toLocaleString() || '0' }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sovereignty -->
                <div class="stat-card">
                    <div class="stat-header">
                        <UIcon name="i-lucide-crown" class="stat-icon text-purple-500" />
                        <h3 class="stat-title text-gray-700 dark:text-gray-200">Sovereignty</h3>
                    </div>
                    <div class="stat-body">
                        <!-- Images at top -->
                        <div v-if="sovereignty?.alliance_id || sovereignty?.corporation_id"
                            class="flex justify-center gap-3 mb-4">
                            <!-- Alliance image -->
                            <div v-if="sovereignty.alliance_id" class="flex flex-col items-center">
                                <Image type="alliance" :id="sovereignty.alliance_id" class="w-16 h-16 rounded"
                                    size="64" />
                            </div>
                            <!-- Corporation image -->
                            <div v-if="sovereignty.corporation_id" class="flex flex-col items-center">
                                <Image type="corporation" :id="sovereignty.corporation_id" class="w-16 h-16 rounded"
                                    size="64" />
                            </div>
                        </div>

                        <!-- Alliance name -->
                        <div v-if="sovereignty?.alliance_id" class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">Alliance:</div>
                            <div class="stat-value text-gray-900 dark:text-gray-300 truncate">
                                {{ sovereignty.alliance_name || `Alliance ID: ${sovereignty.alliance_id}` }}
                            </div>
                        </div>

                        <!-- Corporation name -->
                        <div v-if="sovereignty?.corporation_id" class="stat-row">
                            <div class="stat-label text-gray-600 dark:text-gray-400">Corporation:</div>
                            <div class="stat-value text-gray-900 dark:text-gray-300 truncate">
                                {{ sovereignty.corporation_name || `Corporation ID: ${sovereignty.corporation_id}` }}
                            </div>
                        </div>

                        <!-- NPC Faction or Unclaimed -->
                        <div v-if="!sovereignty?.alliance_id && !sovereignty?.corporation_id"
                            class="flex flex-col items-center text-center">
                            <UIcon name="i-lucide-shield-off" class="w-16 h-16 mb-3 text-gray-400" />
                            <div v-if="sovereignty?.faction_id" class="stat-value text-orange-600 dark:text-orange-400">
                                NPC Faction
                            </div>
                            <div v-else class="stat-value text-gray-500 dark:text-gray-400">
                                Unclaimed
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>


<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

interface SystemData {
    system_id: number;
    system_name: string;
    region_id?: number;
    region_name?: string;
    constellation_id?: number;
    constellation_name?: string;
    security?: number;
    security_class?: string;
    corridor?: boolean;
    hub?: boolean;
    fringe?: boolean;
    international?: boolean;
    regional?: boolean;
    border?: boolean;
    celestials?: Array<{
        item_id: number;
        item_name: string;
        type_name: string;
    }>;
}

interface SovereigntyData {
    alliance_id?: number;
    alliance_name?: string;
    corporation_id?: number;
    corporation_name?: string;
    faction_id?: number;
}

interface ActivityData {
    ship_jumps?: number;
}

interface KillData {
    ship_kills?: number;
    npc_kills?: number;
    pod_kills?: number;
}

const props = defineProps<{
    system: SystemData;
    sovereignty?: SovereigntyData | null;
    jumps?: ActivityData | null;
    kills?: KillData | null;
}>();

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

const getCelestialCount = (types: string | string[]): number => {
    if (!props.system?.celestials) return 0;

    const celestials = props.system.celestials;
    const searchTypes = Array.isArray(types) ? types : [types];

    return celestials.filter((celestial: any) => {
        return searchTypes.some(type =>
            celestial.type_name?.toLowerCase().includes(type.toLowerCase()) ||
            celestial.item_name?.toLowerCase().includes(type.toLowerCase())
        );
    }).length;
};
</script>

<style scoped>
/* Stat card styles matching CharacterTop pattern */
.stat-card {
    border-radius: 8px;
    border: 1px solid rgba(209, 213, 219, 0.5);
    padding: 16px;
    background: transparent;
}

@media (prefers-color-scheme: dark) {
    .stat-card {
        border-color: rgba(75, 85, 99, 0.3);
    }
}

.stat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(209, 213, 219, 0.5);
}

@media (prefers-color-scheme: dark) {
    .stat-header {
        border-color: rgba(75, 85, 99, 0.2);
    }
}

.stat-icon {
    width: 20px;
    height: 20px;
}

.stat-title {
    font-weight: 600;
    font-size: 0.95rem;
}

.stat-label {
    font-size: 0.85rem;
}

.stat-value {
    font-weight: 500;
    font-size: 0.95rem;
}

/* Style for stat rows to ensure horizontal alignment */
.stat-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.stat-row.justify-center {
    justify-content: center;
}
</style>
