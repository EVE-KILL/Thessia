<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { IKillList } from '~/interfaces/IKillList';
import type { IKillmail } from '~/interfaces/IKillmail';
import type { IAttacker } from '~/interfaces/IAttacker';
import moment from 'moment';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Define props with defaults
const props = defineProps({
  combinedKillsAndLosses: { type: Boolean, default: false },
  combinedVictimType: { type: String, default: 'character' },
  combinedVictimId: { type: Number, default: null },
  killlistType: { type: String, default: 'latest' },
  wsFilter: { type: String, default: 'all' }
});

// Pagination and display settings
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
});

const pageSizeItems = [
  { label: '10', id: 10 },
  { label: '50', id: 50 },
  { label: '100', id: 100 },
  { label: '250', id: 250 },
  { label: '500', id: 500 },
  { label: '1000', id: 1000 }
];
const selectedPageSize = ref(100);
const currentPage = computed(() => pagination.value.pageIndex + 1);
const totalItems = ref(9999);

// Create query params for API
const queryParams = computed(() => ({
  type: props.killlistType,
  page: currentPage.value,
  limit: selectedPageSize.value
}));

// Fetch kill list data
const { data: killlistData, pending, error, refresh } = useFetch<IKillList[]>('/api/killlist', {
  key: 'killlist',
  query: queryParams,
  watch: [queryParams]
});

// Update pagination when page size changes
watch(selectedPageSize, async (newSize) => {
  pagination.value.pageSize = newSize;
  pagination.value.pageIndex = 0;

  try {
    await refresh();
  } catch (err) {
    console.error('Error refreshing data after page size change:', err);
  }
});

// WebSocket connection
let socket: WebSocket | null = null;
const isConnected = ref(false);
const wsNewKillCount = ref(0);

// Format killmail object to KillList format
const formatKillmail = (killmail: IKillmail): IKillList => {
  const finalBlowAttacker: IAttacker | undefined = killmail.attackers.find(attacker => attacker.final_blow);

  return {
    killmail_id: killmail.killmail_id,
    total_value: killmail.total_value,
    system_id: killmail.system_id,
    system_name: killmail.system_name,
    system_security: killmail.system_security,
    region_id: killmail.region_id,
    region_name: killmail.region_name,
    kill_time: killmail.kill_time,
    attackerCount: killmail.attackers.length,
    commentCount: 0,
    is_npc: killmail.is_npc,
    is_solo: killmail.is_solo,
    victim: {
      ship_id: killmail.victim.ship_id,
      ship_name: killmail.victim.ship_name,
      character_id: killmail.victim.character_id,
      character_name: killmail.victim.character_name,
      corporation_id: killmail.victim.corporation_id,
      corporation_name: killmail.victim.corporation_name,
      alliance_id: killmail.victim.alliance_id || 0,
      alliance_name: killmail.victim.alliance_name || '',
      faction_id: killmail.victim.faction_id || 0,
      faction_name: killmail.victim.faction_name || '',
    },
    finalblow: {
      character_id: finalBlowAttacker?.character_id || 0,
      character_name: finalBlowAttacker?.character_name || '',
      corporation_id: finalBlowAttacker?.corporation_id || 0,
      corporation_name: finalBlowAttacker?.corporation_name || '',
      alliance_id: finalBlowAttacker?.alliance_id || 0,
      alliance_name: finalBlowAttacker?.alliance_name || '',
      faction_id: finalBlowAttacker?.faction_id || 0,
      faction_name: finalBlowAttacker?.faction_name || '',
      ship_group_name: finalBlowAttacker?.ship_group_name || {},
    }
  };
};

// Ensure kill list doesn't exceed selected page size
const ensureKillListLimit = () => {
  if (killlistData.value && killlistData.value.length > selectedPageSize.value) {
    killlistData.value = killlistData.value.slice(0, selectedPageSize.value);
  }
};

// Establish WebSocket connection
const connectWebSocket = () => {
  try {
    if (socket) {
      socket.close();
    }

    socket = new WebSocket('wss://eve-kill.com/killmails');

    socket.addEventListener('open', () => {
      isConnected.value = true;
      wsNewKillCount.value = 0;

      const filterToUse = props.wsFilter === 'latest' ? 'all' : props.wsFilter;
      socket.send(filterToUse);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'killmail') return;

        const killmail: IKillmail = data.data;
        const formattedKill = formatKillmail(killmail);

        if (killlistData.value && killlistData.value.length > 0 &&
            formattedKill.kill_time <= killlistData.value[0].kill_time) {
          return;
        }

        if (killlistData.value) {
          killlistData.value = [formattedKill, ...killlistData.value];
          wsNewKillCount.value++;
          ensureKillListLimit();
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    });

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      isConnected.value = false;
    });

    socket.addEventListener('close', () => {
      isConnected.value = false;
    });
  } catch (err) {
    console.error('Error establishing WebSocket connection:', err);
    isConnected.value = false;
  }
};

// Close WebSocket connection
const closeWebSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
    isConnected.value = false;
  }
};

// Reset new kill counter
const resetNewKillCount = () => {
  wsNewKillCount.value = 0;
};

// Ensure kill list size when page size changes
watch(selectedPageSize, () => {
  ensureKillListLimit();
});

// WebSocket lifecycle management
onMounted(() => {
  if (process.client) {
    connectWebSocket();
  }
});

onBeforeUnmount(() => {
  closeWebSocket();
});

// Helper functions for data formatting
const getLocalizedString = (obj: any, locale: string): string => {
  if (!obj) return '';
  return obj[locale] || obj['en'] || '';
};

const formatIsk = (value: number): string => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toString();
};

const formatDate = (date: string): string => {
  moment.locale(currentLocale.value);
  return moment.utc(date).fromNow();
};

const truncateString = (str: any, num: number): string => {
  const stringifiedStr = String(str || '');
  return stringifiedStr.length <= num ? stringifiedStr : `${stringifiedStr.slice(0, num)}...`;
};

const isCombinedLoss = (kill: any): boolean => {
  return props.combinedKillsAndLosses &&
    kill.victim[`${props.combinedVictimType}_id`] === props.combinedVictimId;
};

const getSecurityColor = (security: number): string => {
  if (security >= 0.9) return '#009868';
  if (security >= 0.8) return '#00cf78';
  if (security >= 0.7) return '#00f088';
  if (security >= 0.6) return '#8bff8b';
  if (security >= 0.5) return '#efef8f';
  if (security >= 0.4) return '#ffcf3f';
  if (security >= 0.3) return '#ff9000';
  if (security >= 0.2) return '#ff5a00';
  if (security >= 0.1) return '#ff2a00';
  return '#ff0000';
};

// Navigation handler
const handleKillClick = (row: any) => {
  navigateTo(`/kill/${row.original.killmail_id}`);
};

// Column definitions
const columns: TableColumn<IKillList>[] = [
  {
    accessorKey: 'ship',
    header: t('killList.ship'),
    id: 'ship',
    meta: { width: '20%' },
    cell: ({ row }) => {
      return h('div', {
        class: { 'flex items-center py-1': true, 'bg-darkred': isCombinedLoss(row.original) }
      }, [
        h(resolveComponent('NuxtImg'), {
          src: `https://images.evetech.net/types/${row.original.victim.ship_id}/render?size=64`,
          loading: 'lazy',
          format: 'webp',
          alt: `Ship: ${getLocalizedString(row.original.victim.ship_name, currentLocale.value)}`,
          class: 'rounded w-10 mx-2'
        }),
        h('div', { class: 'flex flex-col items-start' }, [
          h('span', { class: 'text-sm' },
            truncateString(getLocalizedString(row.original.victim.ship_name, currentLocale.value), 20)),
          row.original.total_value > 50
            ? h('span', { class: 'text-background-400 text-xs' }, `${formatIsk(row.original.total_value)} ISK`)
            : null
        ])
      ]);
    }
  },
  {
    accessorKey: 'victim',
    header: t('killList.victim'),
    id: 'victim',
    meta: { width: '25%' },
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center py-1' }, [
        h(resolveComponent('NuxtImg'), {
          src: `https://images.evetech.net/characters/${row.original.victim.character_id}/portrait?size=64`,
          loading: 'lazy',
          format: 'webp',
          alt: `Character: ${row.original.victim.character_name}`,
          class: 'rounded w-10 mx-2'
        }),
        h('div', { class: 'flex flex-col items-start' }, [
          h('span', { class: 'text-sm' }, row.original.victim.character_name),
          h('span', { class: 'text-background-400 text-xs whitespace-nowrap' },
            truncateString(row.original.victim.corporation_name, 22))
        ])
      ]);
    }
  },
  {
    accessorKey: 'finalBlow',
    header: t('killList.finalBlow'),
    id: 'finalBlow',
    meta: { width: '25%' },
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center py-1 whitespace-nowrap' }, [
        h(resolveComponent('NuxtImg'), {
          src: !row.original.is_npc
            ? `https://images.evetech.net/characters/${row.original.finalblow.character_id}/portrait?size=64`
            : 'https://images.evetech.net/characters/0/portrait?size=128',
          loading: 'lazy',
          format: 'webp',
          alt: !row.original.is_npc ? `Character: ${row.original.finalblow.character_name}` : 'Unknown',
          class: 'rounded w-10 mx-2'
        }),
        h('div', { class: 'flex flex-col items-start' }, [
          h('span', { class: 'text-sm' },
            row.original.is_npc ? row.original.finalblow.faction_name : row.original.finalblow.character_name),
          h('span', { class: 'text-background-400 text-xs' },
            truncateString(getLocalizedString(row.original.finalblow.ship_group_name, currentLocale.value), 22))
        ])
      ]);
    }
  },
  {
    accessorKey: 'location',
    header: t('killList.location'),
    id: 'location',
    meta: { width: '15%' },
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col items-start py-1 text-sm px-2' }, [
        h('span', { class: 'text-sm whitespace-nowrap' },
          getLocalizedString(row.original.region_name, currentLocale.value)),
        h('div', { class: 'text-background-400 text-xs whitespace-nowrap' }, [
          h('span', null, row.original.system_name),
          h('span', null, ' ('),
          h('span', { style: `color: ${getSecurityColor(row.original.system_security)}` },
            row.original.system_security.toFixed(1)),
          h('span', null, ')')
        ])
      ]);
    }
  },
  {
    accessorKey: 'details',
    header: () => h('div', { class: 'text-right' }, t('killList.details')),
    id: 'details',
    meta: { width: '15%' },
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col items-end py-1 text-sm whitespace-nowrap px-2' }, [
        h('div', { class: 'text-background-500' }, formatDate(row.original.kill_time)),
        h('div', { class: 'flex gap-1 items-center' }, [
          h('span', { class: 'text-background-400' }, row.original.attackerCount),
          h('img', {
            src: '/images/involved.png',
            alt: `${row.original.attackerCount} Involved`,
            class: 'h-4'
          }),
          h('span', { class: 'text-background-400' }, row.original.commentCount || 0),
          h('img', { src: '/images/comment.gif', alt: 'Comments', class: 'h-4' })
        ])
      ]);
    }
  }
];

// Update column headers when locale changes
watch(locale, () => {
  columns.forEach((column, index) => {
    if (column.id === 'ship') {
      columns[index].header = t('killList.ship');
    } else if (column.id === 'victim') {
      columns[index].header = t('killList.victim');
    } else if (column.id === 'finalBlow') {
      columns[index].header = t('killList.finalBlow');
    } else if (column.id === 'location') {
      columns[index].header = t('killList.location');
    } else if (column.id === 'details') {
      columns[index].header = () => h('div', { class: 'text-right' }, t('killList.details'));
    }
  });
});
</script>

<template>
  <div class="w-full">
    <div class="flex justify-between items-center mb-3 px-2 py-2 bg-background-800 rounded-md">
      <div class="flex items-center">
        <div
          :class="[
            'w-3 h-3 rounded-full mr-2',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          ]"
          :title="isConnected ? $t('killList.wsConnected') : $t('killList.wsDisconnected')"
        ></div>

        <span
          v-if="wsNewKillCount > 0"
          class="ml-2 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full"
          @click="resetNewKillCount"
        >
          +{{ wsNewKillCount }}
        </span>
      </div>

      <div class="flex items-center">
        <USelect
          v-model="selectedPageSize"
          value-key="id"
          :items="pageSizeItems"
          size="sm"
          class="w-24"
        />
      </div>
    </div>

    <div class="flex justify-between items-center mb-3">
      <button
        class="px-4 py-2 text-sm font-medium text-white bg-background-800 rounded-md hover:bg-background-700 disabled:opacity-50"
        :disabled="pagination.pageIndex === 0"
        @click="pagination.pageIndex = Math.max(0, pagination.pageIndex - 1)"
      >
        {{ $t('common.previous') }}
      </button>
      <span class="text-white">{{ $t('common.page') }} {{ pagination.pageIndex + 1 }}</span>
      <button
        class="px-4 py-2 text-sm font-medium text-white bg-background-800 rounded-md hover:bg-background-700 disabled:opacity-50"
        @click="pagination.pageIndex++"
      >
        {{ $t('common.next') }}
      </button>
    </div>

    <UTable
      v-model:pagination="pagination"
      :data="killlistData || []"
      :columns="columns"
      :loading="pending"
      :empty-state="{ icon: 'i-heroicons-document-text', label: $t('killList.noKills') }"
      :loading-state="{ icon: 'i-heroicons-arrow-path', label: $t('killList.loading') }"
      :ui="{
        base: 'min-w-full table-fixed bg-transparent text-white',
        thead: 'bg-background-800 border-b border-background-700',
        tbody: 'divide-y divide-background-700',
        tr: 'hover:bg-background-800 transition-colors duration-300 cursor-pointer',
        th: 'text-left py-1 px-2 uppercase text-xs font-medium',
        td: 'p-0 text-xs',
        empty: 'py-4 text-center text-background-400',
        loading: 'py-4 text-center',
        root: 'relative overflow-hidden rounded-sm bg-background-900',
      }"
      @select="handleKillClick"
    />

    <div class="flex justify-between items-center mt-3">
      <button
        class="px-4 py-2 text-sm font-medium text-white bg-background-800 rounded-md hover:bg-background-700 disabled:opacity-50"
        :disabled="pagination.pageIndex === 0"
        @click="pagination.pageIndex = Math.max(0, pagination.pageIndex - 1)"
      >
        {{ $t('common.previous') }}
      </button>
      <span class="text-white">{{ $t('common.page') }} {{ pagination.pageIndex + 1 }}</span>
      <button
        class="px-4 py-2 text-sm font-medium text-white bg-background-800 rounded-md hover:bg-background-700 disabled:opacity-50"
        @click="pagination.pageIndex++"
      >
        {{ $t('common.next') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.bg-darkred {
  background-color: rgb(40, 0, 0);
}

:deep(.text-sm) {
  font-size: 1rem;
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

:deep(th:nth-child(1)), :deep(td:nth-child(1)) { width: 20%; }
:deep(th:nth-child(2)), :deep(td:nth-child(2)) { width: 25%; }
:deep(th:nth-child(3)), :deep(td:nth-child(3)) { width: 25%; }
:deep(th:nth-child(4)), :deep(td:nth-child(4)) { width: 15%; }
:deep(th:nth-child(5)), :deep(td:nth-child(5)) { width: 15%; }

:deep(td > div) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
