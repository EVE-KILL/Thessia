<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

interface ITopEntity {
    id: number;
    name: string;
    count: number;
    [key: string]: any;
}

const props = defineProps({
    type: { type: String, default: 'character' },
    limit: { type: Number, default: 10 },
    days: { type: Number, default: 7 },
    title: { type: String, default: '' }
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

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

const queryParams = computed(() => ({
    type: props.type + 's',
    limit: props.limit,
    days: props.days
}));

const { data: entities, pending, error } = useFetch<ITopEntity[]>('/api/stats', {
    query: queryParams,
    key: `top-${props.type}-${props.limit}-${props.days}`
});

const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return '';
    return obj[locale] || obj['en'] || '';
};

const getImageUrl = (entity: ITopEntity): string => {
    if (!entity) return '/images/unknown.png';

    const idFieldMap = {
        character: 'character_id',
        corporation: 'corporation_id',
        alliance: 'alliance_id',
        ship: 'type_id',
        solarsystem: 'system_id',
        constellation: 'constellation_id',
        region: 'region_id'
    };

    const idField = idFieldMap[props.type];
    const entityId = idField && entity[idField];

    if (!entityId) {
        if (entity.id) {
            return getImageUrlForType(props.type, entity.id);
        }
        return '/images/unknown.png';
    }

    return getImageUrlForType(props.type, entityId);
};

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

    return imageMap[type] || '/images/unknown.png';
};

const getEntityDisplayName = (entity: ITopEntity): string => {
    if ((props.type === 'ship' || props.type === 'region') && typeof entity.name === 'object') {
        return getLocalizedString(entity.name, currentLocale.value);
    }
    return entity.name;
};

const getEntityId = (entity: ITopEntity): number => {
    if (!entity) return 0;

    const idFieldMap = {
        character: 'character_id',
        corporation: 'corporation_id',
        alliance: 'alliance_id',
        ship: 'type_id',
        solarsystem: 'system_id',
        constellation: 'constellation_id',
        region: 'region_id'
    };

    const idField = idFieldMap[props.type];
    const entityId = idField && entity[idField];

    if (!entityId && entity.id) {
        return entity.id;
    }

    return entityId || 0;
};

const getUrlPath = (type: string): string => {
    const urlPathMap = {
        'solarsystem': 'system',
        'ship': 'item'
    };

    return urlPathMap[type] || type;
};

const generateSkeletonRows = (count: number) => {
  return Array(count).fill(0).map((_, index) => ({
    id: `skeleton-${index}`,
    isLoading: true
  }));
};

const skeletonRows = computed(() => generateSkeletonRows(props.limit));

const columns: TableColumn<ITopEntity>[] = [
  {
    key: 'entity',
    id: 'entity',
    label: '',
    sortable: false,
    class: 'w-full',
    cell: ({ row }) => {
      if (row.original.isLoading) {
        return h('div', { class: 'flex items-center py-1' }, [
          h(resolveComponent('USkeleton'), {
            class: 'w-7 h-7 flex-shrink-0 mr-2 rounded'
          }),
          h(resolveComponent('USkeleton'), {
            class: 'h-4 w-[150px]'
          })
        ]);
      }

      // Determine the image type based on entity type
      const imageTypeMap = {
        'character': 'character',
        'corporation': 'corporation',
        'alliance': 'alliance',
        'ship': 'type-render',
        'solarsystem': null, // Use direct URL for these
        'constellation': null,
        'region': null
      };

      const imageType = imageTypeMap[props.type];
      const entityId = Number(getEntityId(row.original));
      const entityName = getEntityDisplayName(row.original);

      // For entity types not directly supported by the Image component
      if (!imageType) {
        return h('div', { class: 'flex items-center py-1' }, [
          h('img', {
            src: getImageUrl(row.original),
            alt: `${props.type}: ${entityName}`,
            class: 'w-7 flex-shrink-0 mr-2'
          }),
          h('div', { class: 'text-sm text-left text-black dark:text-white truncate min-w-0 overflow-hidden' },
            entityName)
        ]);
      }

      // Use the EVE Image component for supported types
      return h('div', { class: 'flex items-center py-1' }, [
        h(resolveComponent('EveImage'), {
          type: imageType,
          id: entityId,
          alt: `${props.type}: ${entityName}`,
          class: 'w-7 flex-shrink-0 mr-2',
          size: 32,
          format: 'webp'
        }),
        h('div', { class: 'text-sm text-left text-black dark:text-white truncate min-w-0 overflow-hidden' },
          entityName)
      ]);
    }
  },
  {
    key: 'count',
    id: 'count',
    label: '',
    sortable: false,
    class: 'w-16 text-right',
    cell: ({ row }) => {
      if (row.original.isLoading) {
        return h(resolveComponent('USkeleton'), {
          class: 'h-4 w-10 ml-auto mr-2'
        });
      }

      return h('div', { class: 'text-sm text-right text-background-200 pr-2 whitespace-nowrap' }, row.original.count);
    }
  }
];

// Properly handle row click with middle-click support
const generateEntityLink = (item: any): string | null => {
  if (item.isLoading) return null;
  return `/${getUrlPath(props.type)}/${getEntityId(item)}`;
};

// Simplify column definitions - use only entity and count without the title column
const tableColumns = [
  {
    id: 'entity',
    header: displayTitle, // Put the title in the first column header
    headerClass: 'title-header', // Apply title styling to first column
    width: '80%'
  },
  {
    id: 'count',
    header: '',
    headerClass: 'count-header',
    width: '20%',
    cellClass: 'text-right'
  }
];

// Mapping of entity types to image types
const imageTypeMap = {
  'character': 'character',
  'corporation': 'corporation',
  'alliance': 'alliance',
  'ship': 'type-render'
  // Other types will use custom image URLs
};
</script>

<template>
  <div class="pb-5 min-h-[485px]">
    <!-- Use the simplified EkTable with proper styling for header -->
    <Table
      :columns="tableColumns"
      :items="pending ? skeletonRows : (entities || [])"
      :loading="pending"
      :skeleton-count="props.limit"
      :empty-text="t('topBox.noData')"
      :empty-icon="'i-lucide-file-text'"
      :density="'compact'"
      :striped="false"
      :bordered="true"
      :special-header="true"
      background="transparent"
      :link-fn="generateEntityLink"
      header-class="topbox-header"
    >
      <!-- Style the title header directly instead of using a separate column -->
      <template #header-entity>
        <div class="title-text">{{ displayTitle }}</div>
      </template>

      <!-- Keep existing entity and count cell templates -->
      <template #cell-entity="{ item }">
        <div class="flex items-center py-1">
          <!-- Render different images based on entity type -->
          <template v-if="imageTypeMap[props.type]">
            <Image
              :type="imageTypeMap[props.type]"
              :id="getEntityId(item)"
              :alt="`${props.type}: ${getEntityDisplayName(item)}`"
              class="w-7 flex-shrink-0 mr-2"
              size="32"
              format="webp"
            />
          </template>
          <template v-else>
            <img
              :src="getImageUrl(item)"
              :alt="`${props.type}: ${getEntityDisplayName(item)}`"
              class="w-7 flex-shrink-0 mr-2"
            />
          </template>

          <!-- Entity name -->
          <div class="text-sm text-left text-black dark:text-white truncate min-w-0 overflow-hidden">
            {{ getEntityDisplayName(item) }}
          </div>
        </div>
      </template>

      <template #cell-count="{ item }">
        <div class="text-sm text-right text-background-200 pr-2 whitespace-nowrap">
          {{ item.count }}
        </div>
      </template>

      <template #loading="{ index }">
        <div class="body-cell entity w-full">
          <div class="flex items-center py-1">
            <div class="w-7 h-7 flex-shrink-0 mr-2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div class="h-4 w-[150px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div class="body-cell count w-16 text-right">
          <div class="h-4 w-10 ml-auto mr-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </template>
    </Table>

    <div v-if="error" class="text-center py-4 text-red-400">
      {{ t('common.error') }}: {{ error.message }}
    </div>

    <div class="text-sm text-center text-background-300 py-1 rounded-br-lg rounded-bl-lg">
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

:deep(td > div) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(th:nth-child(1)), :deep(td:nth-child(1)) {
  width: 80%;
}

:deep(th:nth-child(2)), :deep(td:nth-child(2)) {
  width: 20%;
  text-align: right;
}

:deep(table) {
  width: 100%;
}

/* Table styles */
:deep(tbody tr) {
  border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
  border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
}

/* Match KillList header styling */
:deep(.table-header) {
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
  padding: 0.5rem 1rem !important;
  font-weight: 600;
}

:deep(.header-cell) {
  font-size: 0.75rem;
  color: light-dark(#4b5563, #9ca3af) !important;
}

/* Ensure header title matches KillList style */
:deep(.table-header-title) {
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
  font-size: 0.75rem !important;
  color: light-dark(#4b5563, #9ca3af) !important;
  font-weight: 600;
  padding: 0.5rem 1rem !important;
  border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

/* Make the header title more prominent */
.top-box-header {
  width: 100%;
  text-align: center;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  color: light-dark(#111827, white) !important;
}

/* Fix header title visibility */
:deep(.table-header-title) {
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
  padding: 0.5rem 1rem !important;
  font-weight: 600 !important;
  border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

/* Override any conflicting styles */
:deep(.table-header-title div) {
  color: light-dark(#111827, white) !important;
  opacity: 1 !important;
}

/* Style for title header and other header-cell elements */
:deep(.title-header) {
  font-size: 0.875rem !important;
  color: light-dark(#111827, white) !important;
  font-weight: 600 !important;
}

:deep(.title-text) {
  width: 100%;
  text-align: center;
  font-weight: 600;
}

/* Style for table header */
:deep(.topbox-header) {
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
  padding: 0.5rem 1rem !important;
  font-weight: 600;
  /* Remove border-bottom to eliminate the line */
  border-bottom: none !important;
}

/* Style for entity and count headers - hide them visually */
:deep(.header-cell:not(.title-header)) {
  display: none;
}

/* Simplified header styling - center the title across the entire header */
:deep(.topbox-header) {
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
  padding: 0.5rem 1rem !important;
  font-weight: 600;
  border-bottom: none !important;
}

/* Make the title header span visually across the entire header */
:deep(.title-header) {
  font-size: 0.875rem !important;
  color: light-dark(#111827, white) !important;
  font-weight: 600 !important;
  text-align: center !important;
}

/* Style the title text itself */
:deep(.title-text) {
  width: 100%;
  text-align: center;
  font-weight: 600;
}

/* Hide the count column header while maintaining structure */
:deep(.count-header) {
  visibility: hidden;
  width: 20%;
}
</style>
