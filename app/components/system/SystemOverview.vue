<template>
    <div class="tab-content space-y-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Jump Connections -->
            <div v-if="system?.jump_connections && system.jump_connections.length > 0" class="space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <UIcon name="i-lucide-external-link" class="w-5 h-5" />
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">Jump Connections</h3>
                </div>
                
                <div class="space-y-3">
                    <div v-for="(connection, index) in system.jump_connections" :key="connection.stargate_id"
                        class="group relative overflow-hidden bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                        :style="{ animationDelay: `${index * 50}ms` }">
                        
                        <div class="p-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="relative">
                                        <Image type="system" :id="connection.destination_system_id" class="w-10 h-10 rounded-lg shadow-sm" size="64" />
                                        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                            <UIcon name="i-lucide-arrow-right" class="w-2 h-2 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <NuxtLink :to="`/system/${connection.destination_system_id}`"
                                            class="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                            {{ connection.destination_system_name }}
                                        </NuxtLink>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <UIcon name="i-lucide-zap" class="w-3 h-3 inline mr-1" />
                                            {{ connection.stargate_name }}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span v-if="connection.is_regional_jump"
                                        class="inline-flex items-center px-3 py-1 text-xs font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-sm">
                                        <UIcon name="i-lucide-alert-triangle" class="w-3 h-3 mr-1" />
                                        Regional
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Hover effect overlay -->
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                </div>
            </div>

            <!-- Neighboring Systems -->
            <div v-if="system?.neighboring_systems && system.neighboring_systems.length > 0" class="space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                        <UIcon name="i-lucide-map" class="w-5 h-5" />
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">Neighboring Systems</h3>
                </div>
                
                <div class="space-y-3">
                    <div v-for="(neighbor, index) in system.neighboring_systems" :key="neighbor.system_id"
                        class="group relative overflow-hidden bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
                        :style="{ animationDelay: `${index * 50}ms` }">
                        
                        <div class="p-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="relative">
                                        <Image type="system" :id="neighbor.system_id" class="w-10 h-10 rounded-lg shadow-sm" size="64" />
                                        <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center"
                                             :style="{ backgroundColor: getSecurityStatusColor(neighbor.security || 0) }">
                                            <div class="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <NuxtLink :to="`/system/${neighbor.system_id}`"
                                            class="font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200 group-hover:text-green-600 dark:group-hover:text-green-400">
                                            {{ neighbor.system_name }}
                                        </NuxtLink>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <UIcon name="i-lucide-shield" class="w-3 h-3 inline mr-1" />
                                            Security: {{ neighbor.security?.toFixed(2) || 'Unknown' }}
                                        </div>
                                    </div>
                                </div>
                                <div v-if="neighbor.security !== undefined" 
                                     class="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                                     :style="{ backgroundColor: getSecurityStatusColor(neighbor.security) }">
                                    {{ neighbor.security.toFixed(1) }}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Hover effect overlay -->
                        <div class="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Celestials -->
        <div v-if="system?.celestials && system.celestials.length > 0" class="space-y-6">
            <div class="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div class="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                    <UIcon name="i-lucide-star" class="w-5 h-5" />
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                    Celestial Objects
                    <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({{ system?.celestials?.length || 0 }} objects)</span>
                </h3>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div v-for="(celestial, index) in system.celestials" :key="celestial.item_id"
                    class="group relative overflow-hidden bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-md hover:shadow-purple-500/10 hover:-translate-y-1"
                    :style="{ animationDelay: `${index * 25}ms` }">
                    
                    <div class="p-3">
                        <div class="flex items-start gap-3">
                            <div class="flex-shrink-0 mt-0.5">
                                <div class="w-3 h-3 rounded-full shadow-sm"
                                     :style="{ background: getCelestialColor(celestial.type_name) }"></div>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                                    {{ celestial.item_name }}
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                    {{ celestial.type_name }}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hover effect overlay -->
                    <div class="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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

const getCelestialColor = (typeName: string): string => {
    // Create a color scheme for different celestial types
    const colors: Record<string, string> = {
        'Sun': '#FFA500',
        'Planet': '#4A90E2',
        'Moon': '#C0C0C0',
        'Asteroid Belt': '#8B4513',
        'Stargate': '#9B59B6',
        'Station': '#2ECC71',
        'Beacon': '#E74C3C',
        'Wormhole': '#8E44AD',
        'Star': '#F39C12'
    };
    
    // Generate a consistent color based on type name if not in predefined colors
    if (colors[typeName]) {
        return colors[typeName];
    }
    
    // Generate a hash-based color for consistency
    let hash = 0;
    for (let i = 0; i < typeName.length; i++) {
        const char = typeName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 50%)`;
};
</script>
