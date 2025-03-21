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

const columns: TableColumn<ITopEntity>[] = [
  {
    key: 'entity',
    id: 'entity',
    label: '',
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
    label: '',
    sortable: false,
    class: 'w-16 text-right',
    cell: ({ row }) => h('div', { class: 'text-sm text-right text-background-200 pr-2 whitespace-nowrap' }, row.original.count)
  }
];

const handleRowClick = (row) => {
  navigateTo(`/${getUrlPath(props.type)}/${getEntityId(row.original)}`);
};
</script>

<template>
  <div class="pb-5">
    <div class="text-sm font-bold text-center bg-background-900 py-1 rounded-tl-lg rounded-tr-lg border-b border-background-700">
      {{ displayTitle }}
    </div>

    <div v-if="pending" class="text-center py-4 text-background-400">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin mr-2" />
      {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="text-center py-4 text-red-400">
      {{ t('common.error') }}: {{ error.message }}
    </div>

    <div v-else-if="!entities || entities.length === 0" class="text-center py-4 text-background-400">
      {{ t('topBox.noData') }}
    </div>

    <template v-else>
      <UTable
        :columns="columns"
        :data="entities || []"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-document-text', label: t('topBox.noData') }"
        :loading-state="{ icon: 'i-heroicons-arrow-path', label: t('common.loading') }"
        :ui="{
          base: 'min-w-full table-fixed bg-transparent text-white',
          thead: 'hidden',
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
</style>
