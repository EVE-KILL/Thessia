<script setup lang="ts">

// Define the interface for top entities
interface ITopEntity {
    id: number;
    name: string;
    count: number;
    [key: string]: any; // For any type-specific properties
}

// Define props with defaults
const props = defineProps({
    type: { type: String, default: 'character' },
    limit: { type: Number, default: 10 },
    days: { type: Number, default: 7 },
    title: { type: String, default: '' }
    // Removed translateNames prop
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Computed title based on entity type
const displayTitle = computed(() => {
    if (props.title) return props.title;

    const typeMap = {
        character: t('topBox.characters'),
        corporation: t('topBox.corporations'),
        alliance: t('topBox.alliances'),
        ship: t('topBox.ships'),
        solarsystem: t('topBox.systems'),
        constellation: t('topBox.constellations'),
        region: t('topBox.regions')
    };

    return `${t('topBox.top')} ${props.limit} ${typeMap[props.type] || props.type}`;
});

// Create query params for API
const queryParams = computed(() => ({
    type: props.type + 's',
    limit: props.limit,
    days: props.days
}));

// Fetch data from API
const { data: entities, pending, error } = useFetch<ITopEntity[]>('/api/stats', {
    query: queryParams,
    key: `top-${props.type}-${props.limit}-${props.days}`
});

// Helper function to get localized string - similar to KillList component
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return '';
    return obj[locale] || obj['en'] || '';
};

// Function to get image URL based on entity type
const getImageUrl = (entity: ITopEntity): string => {
    if (!entity) return '/images/unknown.png';

    // Define a mapping of type to ID field
    const idFieldMap = {
        character: 'character_id',
        corporation: 'corporation_id',
        alliance: 'alliance_id',
        ship: 'type_id',
        solarsystem: 'system_id',
        constellation: 'constellation_id',
        region: 'region_id'
    };


    // Get the correct ID field name
    const idField = idFieldMap[props.type];
    const entityId = idField && entity[idField];

    // Debug output to see what we're working with
    console.debug(`Type: ${props.type}, ID Field: ${idField}, Value:`, entityId, 'Entity:', entity);

    if (!entityId) {
        // Fallback to id field if specific field not found
        if (entity.id) {
            console.debug(`Using fallback entity.id: ${entity.id}`);
            return getImageUrlForType(props.type, entity.id);
        }
        return '/images/unknown.png';
    }

    return getImageUrlForType(props.type, entityId);
};

// Helper function to generate the appropriate image URL for a given type and ID
const getImageUrlForType = (type: string, id: number): string => {
    const imageMap = {
        character: `https://images.evetech.net/characters/${id}/portrait?size=64`,
        corporation: `https://images.evetech.net/corporations/${id}/logo?size=64`,
        alliance: `https://images.evetech.net/alliances/${id}/logo?size=64`,
        ship: `https://images.evetech.net/types/${id}/render?size=64`,
        solarsystem: '/map.png',
        constellation: '/map.png',
        region: '/map.png'
    };

    console.log(type, imageMap[type]);

    return imageMap[type] || '/images/unknown.png';
};

// Get display name for entity, with automatic translation support for ships
const getEntityDisplayName = (entity: ITopEntity): string => {
    // Ships always need translation
    if (props.type === 'ship' && typeof entity.name === 'object') {
        return getLocalizedString(entity.name, currentLocale.value);
    }

    // Default case, just return the name
    return entity.name;
};

// Function to get the entity-specific ID based on entity type
const getEntityId = (entity: ITopEntity): number => {
    if (!entity) return 0;

    // Use the same mapping of type to ID field as in getImageUrl
    const idFieldMap = {
        character: 'character_id',
        corporation: 'corporation_id',
        alliance: 'alliance_id',
        ship: 'type_id',
        solarsystem: 'system_id',
        constellation: 'constellation_id',
        region: 'region_id'
    };

    // Get the correct ID field name
    const idField = idFieldMap[props.type];
    const entityId = idField && entity[idField];

    // Fallback to id field if specific field not found
    if (!entityId && entity.id) {
        return entity.id;
    }

    return entityId || 0;
};

// Get the correct URL path based on entity type
const getUrlPath = (type: string): string => {
    // Map certain types to different URL paths
    const urlPathMap = {
        'solarsystem': 'system',
        'ship': 'item'
    };

    return urlPathMap[type] || type;
};
</script>

<template>
    <div class="pb-5">
        <!-- Title bar -->
        <div class="text-sm font-bold text-center bg-background-900">
            {{ displayTitle }}
        </div>

        <!-- Loading state -->
        <div v-if="pending" class="text-center py-4 text-background-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin mr-2" />
            {{ t('common.loading') }}
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-4 text-red-400">
            {{ t('common.error') }}: {{ error.message }}
        </div>

        <!-- Empty state -->
        <div v-else-if="!entities || entities.length === 0" class="text-center py-4 text-background-400">
            {{ t('topBox.noData') }}
        </div>

        <!-- Entity list -->
        <template v-else>
            <NuxtLink
                v-for="entity in entities"
                :key="entity.id"
                :to="`/${getUrlPath(props.type)}/${getEntityId(entity)}`"
                class="grid grid-cols-[1fr_auto] items-center bg-semi-transparent border-b-2 border-background-800 w-full py-1 block no-underline hover:bg-background-800 transition-colors duration-200"
            >
                <div class="flex items-center overflow-hidden">
                    <NuxtImg
                        :src="getImageUrl(entity)"
                        loading="lazy"
                        format="webp"
                        :alt="`${props.type}: ${getEntityDisplayName(entity)}`"
                        class="w-7 flex-shrink-0"
                    />
                    <div class="text-sm text-left text-primary-400 truncate ml-2 min-w-0 overflow-hidden">
                        {{ getEntityDisplayName(entity) }}
                    </div>
                </div>
                <div class="text-sm text-right text-background-200 pr-4 flex-shrink-0 ml-2">
                    {{ entity.count }}
                </div>
            </NuxtLink>
        </template>

        <!-- Footer -->
        <div class="text-sm bg-semi-transparent text-center text-background-300 py-1 rounded-br-lg rounded-bl-lg">
            ({{ t('topBox.killsOver', { days: props.days }) }})
        </div>
    </div>
</template>

<style scoped>
.bg-semi-transparent {
    background-color: rgba(0, 0, 0, 0.4);
}

/* Update hover styles for NuxtLink instead of button */
a.grid:hover {
    background-color: rgba(40, 40, 40, 0.7);
}

/* Use grid with specific column sizing instead of grid-cols-2 */
a.grid {
    grid-template-columns: 1fr auto;
}
</style>
