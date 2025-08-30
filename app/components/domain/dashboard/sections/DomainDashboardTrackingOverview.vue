<template>
    <div class="mb-8">
        <div
            class="bg-gradient-to-r from-gray-900/40 via-gray-800/30 to-gray-900/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-lg font-bold text-white mb-2">Tracking Overview</h3>
                    <p class="text-zinc-400 text-sm">
                        This killboard monitors activity for {{ entities.length }} {{
                            entities.length === 1 ? 'entity' : 'entities' }} in New Eden
                    </p>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-gray-600/30 rounded-lg flex items-center justify-center">
                        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div v-if="entities.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <div v-for="entity in entities" :key="`${entity.entity_type}-${entity.entity_id}`"
                    class="flex items-center space-x-3 bg-gray-800/40 rounded-lg p-3 hover:bg-gray-700/40 transition-colors cursor-pointer group"
                    @click="focusOnEntity(entity)">
                    <!-- Entity Avatar -->
                    <div class="relative flex-shrink-0">
                        <img v-if="entity.image_url" :src="entity.image_url.replace('size=64', 'size=32')"
                            :alt="entity.display_name" :class="[
                                'w-8 h-8 border border-gray-600',
                                entity.entity_type === 'character' ? 'rounded-full' : 'rounded'
                            ]" loading="lazy" @error="handleImageError">
                        <img v-else-if="entity.entity_type === 'character'"
                            :src="`https://images.evetech.net/characters/${entity.entity_id}/portrait?size=32`"
                            :alt="entity.display_name" class="w-8 h-8 rounded-full border border-gray-600"
                            loading="lazy" @error="handleImageError">
                        <img v-else-if="entity.entity_type === 'corporation'"
                            :src="`https://images.evetech.net/corporations/${entity.entity_id}/logo?size=32`"
                            :alt="entity.display_name" class="w-8 h-8 rounded border border-gray-600" loading="lazy"
                            @error="handleImageError">
                        <img v-else-if="entity.entity_type === 'alliance'"
                            :src="`https://images.evetech.net/alliances/${entity.entity_id}/logo?size=32`"
                            :alt="entity.display_name" class="w-8 h-8 rounded border border-gray-600" loading="lazy"
                            @error="handleImageError">
                        <div v-else
                            class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                            {{ entity.entity_type === 'character' ? 'C' : entity.entity_type === 'corporation' ?
                                'Co' : 'A' }}
                        </div>

                        <!-- Primary indicator -->
                        <div v-if="entity.primary"
                            class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-gray-800 rounded-full">
                        </div>

                        <!-- Activity indicator -->
                        <div v-else-if="entityStats[entity.entity_id]?.recent_activity"
                            class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-gray-800 rounded-full">
                        </div>
                    </div>

                    <!-- Entity Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <span
                                class="text-zinc-200 font-medium text-sm truncate group-hover:text-white transition-colors">
                                {{ entity.display_name || `${entity.entity_type} ${entity.entity_id}` }}
                            </span>
                            <span v-if="entity.primary"
                                class="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                Primary
                            </span>
                        </div>
                        <div class="text-xs text-zinc-500 capitalize">
                            {{ entity.entity_type }}
                            <span v-if="entityStats[entity.entity_id]" class="ml-2 text-zinc-400">
                                {{ entityStats[entity.entity_id]?.kills || 0 }} kills
                            </span>
                        </div>
                    </div>

                    <!-- Focus indicator -->
                    <div class="text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7">
                            </path>
                        </svg>
                    </div>
                </div>
            </div>

            <div v-else class="text-center py-6 text-zinc-500">
                No entities configured for tracking
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DomainEntity, EntityStats } from '../types';

// Use shared types
type Entity = DomainEntity;

interface Props {
    /** Domain identifier */
    domain: string;
    /** List of entities being tracked */
    entities?: Entity[];
    /** Statistics for each entity */
    entityStats?: EntityStats;
}

interface Emits {
    (e: 'focus-entity', entity: Entity): void;
}

const props = withDefaults(defineProps<Props>(), {
    entities: () => [],
    entityStats: () => ({})
});

const emit = defineEmits<Emits>();

const focusOnEntity = (entity: Entity) => {
    emit('focus-entity', entity);
};

// Handle image loading errors by hiding the broken image
const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
};
</script>
