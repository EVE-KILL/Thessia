<template>
    <div class="space-y-3">
        <h3 class="text-lg font-semibold text-zinc-100">Entity Filters</h3>

        <p class="text-sm text-zinc-400">
            Use the main search above to find entities, then drag them to the appropriate column below:
        </p>

        <!-- Three Column Layout -->
        <div class="grid grid-cols-3 gap-3">
            <!-- Victim Column -->
            <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-red-400 flex items-center gap-1 text-sm">
                        <Icon name="lucide:target" class="w-3 h-3" />
                        Victim
                    </h4>
                    <select :value="filters.entities.victimOperator"
                        @change="updateOperator('victimOperator', ($event.target as HTMLSelectElement).value as '$or' | '$and' | '$in')"
                        class="text-xs bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200">
                        <option value="$or">OR</option>
                        <option value="$and">AND</option>
                        <option value="$in">IN</option>
                    </select>
                </div>

                <div @drop="onDrop($event, 'victim')" @dragover.prevent @dragenter.prevent
                    class="min-h-24 space-y-1 border-2 border-dashed border-zinc-600 rounded-lg p-2 transition-colors"
                    :class="dragOver === 'victim' ? 'border-red-400 bg-red-400/10' : ''">
                    <div v-for="entity in victimEntities" :key="entity.id" draggable="true"
                        @dragstart="onDragStart($event, entity)"
                        class="flex items-center justify-between p-1.5 bg-zinc-700 rounded cursor-move hover:bg-zinc-600 transition-colors">
                        <div class="flex items-center gap-1">
                            <Icon name="lucide:grip-vertical" class="w-3 h-3 text-zinc-400" />
                            <span class="text-zinc-100 text-xs">{{ entity.name }}</span>
                        </div>
                        <button @click="removeEntity(entity.id)"
                            class="text-red-400 hover:text-red-300 transition-colors">
                            <Icon name="lucide:x" class="w-3 h-3" />
                        </button>
                    </div>

                    <div v-if="victimEntities.length === 0" class="text-center text-zinc-500 text-xs py-3">
                        Drop entities here to mark as victims
                    </div>
                </div>
            </div>

            <!-- Both Column -->
            <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-green-400 flex items-center gap-1 text-sm">
                        <Icon name="lucide:users" class="w-3 h-3" />
                        Both
                    </h4>
                    <select :value="filters.entities.bothOperator"
                        @change="updateOperator('bothOperator', ($event.target as HTMLSelectElement).value as '$or' | '$and' | '$in')"
                        class="text-xs bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200">
                        <option value="$or">OR</option>
                        <option value="$and">AND</option>
                        <option value="$in">IN</option>
                    </select>
                </div>

                <div @drop="onDrop($event, 'both')" @dragover.prevent @dragenter.prevent
                    class="min-h-24 space-y-1 border-2 border-dashed border-zinc-600 rounded-lg p-2 transition-colors"
                    :class="dragOver === 'both' ? 'border-green-400 bg-green-400/10' : ''">
                    <div v-for="entity in bothEntities" :key="entity.id" draggable="true"
                        @dragstart="onDragStart($event, entity)"
                        class="flex items-center justify-between p-1.5 bg-zinc-700 rounded cursor-move hover:bg-zinc-600 transition-colors">
                        <div class="flex items-center gap-1">
                            <Icon name="lucide:grip-vertical" class="w-3 h-3 text-zinc-400" />
                            <span class="text-zinc-100 text-xs">{{ entity.name }}</span>
                        </div>
                        <button @click="removeEntity(entity.id)"
                            class="text-red-400 hover:text-red-300 transition-colors">
                            <Icon name="lucide:x" class="w-3 h-3" />
                        </button>
                    </div>

                    <div v-if="bothEntities.length === 0" class="text-center text-zinc-500 text-xs py-3">
                        Drop entities here to search as victim OR attacker
                    </div>
                </div>
            </div>

            <!-- Attacker Column -->
            <div class="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-blue-400 flex items-center gap-1 text-sm">
                        <Icon name="lucide:sword" class="w-3 h-3" />
                        Attacker
                    </h4>
                    <select :value="filters.entities.attackerOperator"
                        @change="updateOperator('attackerOperator', ($event.target as HTMLSelectElement).value as '$or' | '$and' | '$in')"
                        class="text-xs bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-zinc-200">
                        <option value="$or">OR</option>
                        <option value="$and">AND</option>
                        <option value="$in">IN</option>
                    </select>
                </div>

                <div @drop="onDrop($event, 'attacker')" @dragover.prevent @dragenter.prevent
                    class="min-h-24 space-y-1 border-2 border-dashed border-zinc-600 rounded-lg p-2 transition-colors"
                    :class="dragOver === 'attacker' ? 'border-blue-400 bg-blue-400/10' : ''">
                    <div v-for="entity in attackerEntities" :key="entity.id" draggable="true"
                        @dragstart="onDragStart($event, entity)"
                        class="flex items-center justify-between p-1.5 bg-zinc-700 rounded cursor-move hover:bg-zinc-600 transition-colors">
                        <div class="flex items-center gap-1">
                            <Icon name="lucide:grip-vertical" class="w-3 h-3 text-zinc-400" />
                            <span class="text-zinc-100 text-xs">{{ entity.name }}</span>
                        </div>
                        <button @click="removeEntity(entity.id)"
                            class="text-red-400 hover:text-red-300 transition-colors">
                            <Icon name="lucide:x" class="w-3 h-3" />
                        </button>
                    </div>

                    <div v-if="attackerEntities.length === 0" class="text-center text-zinc-500 text-xs py-3">
                        Drop entities here to mark as attackers
                    </div>
                </div>
            </div>
        </div>

        <!-- Clear All Button -->
        <div v-if="hasAnyEntities" class="flex justify-center">
            <button @click="clearAllEntities"
                class="px-3 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors">
                Clear All Entities
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

// Props
interface Props {
    filters: AdvancedSearchFilters
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
    updateFilters: [filters: AdvancedSearchFilters]
    addEntityFromSearch: [entity: any, role: 'victim' | 'attacker' | 'both']
}>()

// Reactive data
const dragOver = ref<'victim' | 'attacker' | 'both' | null>(null)

// Computed
const allEntities = computed(() => {
    return [
        ...props.filters.entities.characters,
        ...props.filters.entities.corporations,
        ...props.filters.entities.alliances,
        ...props.filters.entities.ships,
    ]
})

const victimEntities = computed(() => {
    return props.filters.entities.victim
})

const attackerEntities = computed(() => {
    return props.filters.entities.attacker
})

const bothEntities = computed(() => {
    return props.filters.entities.both
})

const hasAnyEntities = computed(() => {
    return victimEntities.value.length > 0 ||
        attackerEntities.value.length > 0 ||
        bothEntities.value.length > 0
})

// Methods
const onDragStart = (event: DragEvent, entity: EntityFilter) => {
    if (event.dataTransfer) {
        event.dataTransfer.setData('application/json', JSON.stringify(entity))
        event.dataTransfer.effectAllowed = 'move'
    }
}

const onDrop = (event: DragEvent, role: 'victim' | 'attacker' | 'both') => {
    event.preventDefault()
    dragOver.value = null

    if (event.dataTransfer) {
        try {
            const entityData = JSON.parse(event.dataTransfer.getData('application/json'))

            // Check if this is an entity being moved or a new search result
            if (entityData.id && entityData.name) {
                // Create entity object
                const entity = {
                    id: entityData.id,
                    name: entityData.name,
                    type: entityData.type || 'characters' // fallback type
                }

                // Remove from all roles first, then add to target role
                const updatedFilters = {
                    ...props.filters,
                    entities: {
                        ...props.filters.entities,
                        victim: props.filters.entities.victim.filter(e => e.id !== entityData.id),
                        attacker: props.filters.entities.attacker.filter(e => e.id !== entityData.id),
                        both: props.filters.entities.both.filter(e => e.id !== entityData.id),
                        // Add to target role
                        [role]: [...props.filters.entities[role].filter(e => e.id !== entityData.id), entity]
                    }
                }

                emit('updateFilters', updatedFilters)
            }
        } catch (error) {
            console.error('Error processing drop:', error)
        }
    }
}

const removeEntityFromAllRoles = (entityId: string) => {
    const updatedFilters = {
        ...props.filters,
        entities: {
            ...props.filters.entities,
            victim: props.filters.entities.victim.filter(e => e.id !== entityId),
            attacker: props.filters.entities.attacker.filter(e => e.id !== entityId),
            both: props.filters.entities.both.filter(e => e.id !== entityId)
        }
    }

    emit('updateFilters', updatedFilters)
}

const removeEntity = (entityId: string) => {
    removeEntityFromAllRoles(entityId)
}

const clearAllEntities = () => {
    const updatedFilters = {
        ...props.filters,
        entities: {
            characters: [],
            corporations: [],
            alliances: [],
            ships: [],
            victim: [],
            attacker: [],
            both: [],
            victimOperator: '$or' as const,
            attackerOperator: '$or' as const,
            bothOperator: '$or' as const,
        },
        items: []
    }
    emit('updateFilters', updatedFilters)
}

const updateOperator = (operatorType: 'victimOperator' | 'bothOperator' | 'attackerOperator', value: '$or' | '$and' | '$in') => {
    const updatedFilters = {
        ...props.filters,
        entities: {
            ...props.filters.entities,
            [operatorType]: value
        }
    }
    emit('updateFilters', updatedFilters)
}

// Add method to be called from parent when search result is selected
const addSearchResult = (searchResult: any, role: 'victim' | 'attacker' | 'both') => {
    // Items should not be handled here - they're handled separately in the main page
    if (searchResult.type === 'item') {
        console.warn('Items should be handled separately, not as entities')
        return
    }

    const entity = {
        id: searchResult.id.toString(),
        name: searchResult.name,
        type: searchResult.type
    }

    const updatedFilters = {
        ...props.filters,
        entities: {
            ...props.filters.entities,
            [role]: [...props.filters.entities[role], entity]
        }
    }

    emit('updateFilters', updatedFilters)
}

// Expose the addSearchResult method to parent
defineExpose({
    addSearchResult
})
</script>
