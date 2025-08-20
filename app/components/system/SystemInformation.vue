<template>
    <div class="tab-content">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Jump Connections -->
            <div v-if="system?.jump_connections?.length > 0" class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <UIcon name="i-lucide-external-link" class="w-5 h-5" />
                    Jump Connections
                </h3>
                <div class="space-y-2">
                    <div v-for="connection in system.jump_connections" :key="connection.stargate_id"
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
            <div v-if="system?.neighboring_systems?.length > 0" class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <UIcon name="i-lucide-map" class="w-5 h-5" />
                    Neighboring Systems
                </h3>
                <div class="space-y-2">
                    <div v-for="neighbor in system.neighboring_systems" :key="neighbor.system_id"
                        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div class="flex items-center gap-2">
                            <Image type="system" :id="neighbor.system_id" class="w-6 h-6" size="64" />
                            <NuxtLink :to="`/system/${neighbor.system_id}`"
                                class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                {{ neighbor.system_name }}
                            </NuxtLink>
                        </div>
                        <span v-if="neighbor.security !== undefined" class="text-sm font-medium"
                            :style="{ color: getSecurityStatusColor(neighbor.security) }">
                            {{ neighbor.security?.toFixed(2) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Celestials -->
            <div v-if="system?.celestials?.length > 0" class="space-y-4 lg:col-span-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <UIcon name="i-lucide-star" class="w-5 h-5" />
                    Celestials ({{ system.celestials.length }})
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div v-for="celestial in system.celestials" :key="celestial.item_id"
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

<script setup lang="ts">
interface SystemData {
    jump_connections?: Array<{
        stargate_id: number;
        stargate_name: string;
        destination_system_id: number;
        destination_system_name: string;
        is_regional_jump: boolean;
    }>;
    neighboring_systems?: Array<{
        system_id: number;
        system_name: string;
        security?: number;
    }>;
    celestials?: Array<{
        item_id: number;
        item_name: string;
        type_name: string;
    }>;
}

const props = defineProps<{
    system: SystemData;
}>();

const getSecurityStatusColor = (security: number): string => {
    if (security >= 0.5) return "#00FF00";
    if (security >= 0.0) return "#FFFF00";
    if (security >= -5.0) return "#FF8C00";
    return "#FF0000";
};
</script>
