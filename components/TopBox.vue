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
      const entityId = getEntityId(row.original);
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

const handleRowClick = (row) => {
  if (row.original.isLoading) return;
  navigateTo(`/${getUrlPath(props.type)}/${getEntityId(row.original)}`);
};
</script>

<template>
  <div class="pb-5 min-h-[485px]">
    <div class="text-sm font-bold text-center py-1 rounded-tl-lg rounded-tr-lg border-b bg-gray-200 dark:bg-gray-900">
      {{ displayTitle }}
    </div>

    <UTable
      :columns="columns"
      :data="pending ? skeletonRows : (entities || [])"
      :loading="false"
      :empty-state="{ icon: 'i-lucide-file-text', label: t('topBox.noData') }"
      :ui="{
        base: 'min-w-full table-fixed text-black dark:text-white',
        thead: 'hidden',
        tbody: 'divide-y divide-background-700',
        tr: 'hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors duration-300 cursor-pointer',
        th: 'text-left py-1 px-2 uppercase text-xs font-medium bg-gray-200 dark:bg-gray-900',
        td: 'p-0 text-xs',
        empty: 'py-4 text-center text-black dark:text-white',
        loading: 'py-4 text-center',
        root: 'relative overflow-hidden rounded-sm bg-background-900',
      }"
      @select="handleRowClick"
    />

    <div v-if="error" class="text-center py-4 text-red-400">
      {{ t('common.error') }}: {{ error.message }}
    </div>

    <div v-if="!pending && (!entities || entities.length === 0)" class="text-center py-4 text-background-400">
      {{ t('topBox.noData') }}
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
</style>
