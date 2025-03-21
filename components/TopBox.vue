<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

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

// Configure table columns without computed wrapper and with explicit IDs
const columns: TableColumn<ITopEntity>[] = [
  {
    key: 'entity',
    id: 'entity',
    label: '', // Remove the label from column since we'll use a dedicated header
    sortable: false,
    class: 'w-full',
    cell: ({ row }) => h('div', { class: 'flex items-center py-1' }, [
      h(resolveComponent('NuxtImg'), {
        src: getImageUrl(row.original),
        loading: 'lazy',
        format: 'webp',
        alt: `${props.type}: ${getEntityDisplayName(row.original)}`,
        class: 'w-7 flex-shrink-0 mr-2'
      }),
      h('div', { class: 'text-sm text-left text-primary-400 truncate min-w-0 overflow-hidden' },
        getEntityDisplayName(row.original))
    ])
  },
  {
    key: 'count',
    id: 'count',
    label: '',  // Remove the label from column
    sortable: false,
    class: 'w-16 text-right', // Fixed width and right alignment
    cell: ({ row }) => h('div', { class: 'text-sm text-right text-background-200 pr-2 whitespace-nowrap' }, row.original.count)
  }
];

// Handle row selection (navigation)
const handleRowClick = (row) => {
  navigateTo(`/${getUrlPath(props.type)}/${getEntityId(row.original)}`);
};

// Add some debug logging
watch(entities, (newEntities) => {
  if (newEntities) {
    console.debug(`TopBox: Got ${newEntities.length} entities for ${props.type}`, newEntities[0]);
  }
});
</script>

<template>
  <div class="pb-5">
    <!-- Dedicated title header -->
    <div class="text-sm font-bold text-center bg-background-900 py-1 rounded-tl-lg rounded-tr-lg border-b border-background-700">
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

    <!-- Entity list with UTable -->
    <template v-else>
      <UTable
        :columns="columns"
        :data="entities || []"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-document-text', label: t('topBox.noData') }"
        :loading-state="{ icon: 'i-heroicons-arrow-path', label: t('common.loading') }"
        :ui="{
          base: 'min-w-full table-fixed bg-transparent text-white',
          thead: 'hidden', /* Hide table header since we have a dedicated header */
          tbody: 'divide-y divide-background-700',
          tr: 'hover:bg-background-800 transition-colors duration-300 cursor-pointer',
          th: 'text-center py-1 px-2 uppercase text-xs font-medium',
          td: 'p-0 text-xs',
          empty: 'py-4 text-center text-background-400',
          loading: 'py-4 text-center',
          root: 'relative overflow-hidden rounded-sm bg-semi-transparent',
        }"
        @select="handleRowClick"
      />
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

:deep(.text-sm) {
  font-size: 0.9rem;
  line-height: 1rem;
}

:deep(.text-xs) {
  font-size: 0.8rem;
  line-height: 1rem;
}

:deep(table) {
  border-collapse: collapse;
  width: 100%;
  table-layout: fixed;
}

:deep(tbody tr) {
  border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
  border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(thead tr) {
  border-bottom: 1px solid rgb(40, 40, 40) !important;
}

:deep(td > div) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Make the first column take up more space */
:deep(th:nth-child(1)), :deep(td:nth-child(1)) {
  width: 80%;
}

/* Make the second column (count) take less space */
:deep(th:nth-child(2)), :deep(td:nth-child(2)) {
  width: 20%;
  text-align: right;
}

/* Additional CSS to ensure table takes full width */
:deep(table) {
  width: 100%;
}
</style>
