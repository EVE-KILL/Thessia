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
  wsFilter: { type: String, default: 'all' },
  wsDisabled: { type: Boolean, default: false },
  externalKilllistData: { type: Array as PropType<IKillList[]>, default: null },
  limit: { type: Number, default: 100 } // New prop to control default page size
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
// Use the limit prop as the default page size
const selectedPageSize = ref(props.limit);
const currentPage = computed(() => pagination.value.pageIndex + 1);
const totalItems = ref(9999);

// Create query params for API
const queryParams = computed(() => ({
  type: props.killlistType,
  page: currentPage.value,
  limit: selectedPageSize.value
}));

// Determine if we should use external data
const useExternalData = computed(() => props.externalKilllistData !== null);

// Local reactive container for kill list data
const localKilllistData = ref<IKillList[]>([]);

// Fetch kill list data only if not using external data
const { data: fetchedData, pending, error, refresh } = !useExternalData.value
  ? useFetch<IKillList[]>('/api/killlist', {
      key: 'killlist',
      query: queryParams,
      watch: [queryParams]
    })
  : { data: ref(null), pending: ref(false), error: ref(null), refresh: () => Promise.resolve() };

// Combined kill list data - either from props or fetched
const killlistData = computed(() => {
  return useExternalData.value ? props.externalKilllistData : fetchedData.value || [];
});

// Update local data when external data changes
watch(() => props.externalKilllistData, (newData) => {
  if (newData && useExternalData.value) {
    localKilllistData.value = [...newData];
  }
}, { immediate: true });

// Update local data when fetched data changes
watch(fetchedData, (newData) => {
  if (newData && !useExternalData.value) {
    localKilllistData.value = [...newData];
  }
}, { immediate: true });

// Update pagination when page size changes
watch(selectedPageSize, async (newSize) => {
  pagination.value.pageSize = newSize;
  pagination.value.pageIndex = 0;

  // Only attempt to refresh if using fetched data
  if (!useExternalData.value) {
    try {
      await refresh();
    } catch (err) {
      console.error('Error refreshing data after page size change:', err);
    }
  }
});

// WebSocket connection
let socket: WebSocket | null = null;
const isConnected = ref(false);
const wsNewKillCount = ref(0);

// WebSocket pausing functionality
const isWebSocketPaused = ref(false);
const mouseMoveTimer = ref<NodeJS.Timeout | null>(null);
const pendingMessages = ref<IKillmail[]>([]);
const router = useRouter();
const manuallyPaused = ref(false);

// Watch page changes to control WebSocket pausing
watch(() => pagination.value.pageIndex, (newPageIndex) => {
  if (newPageIndex > 0) {
    // Automatically pause on pages > 1
    pauseWebSocket('pagination');
  } else if (!manuallyPaused.value) {
    // Resume on page 1 (unless manually paused)
    resumeWebSocket();
  }
});

// Pause WebSocket processing with reason
const pauseWebSocket = (reason = 'hover') => {
  isWebSocketPaused.value = true;
  if (reason === 'manual') {
    manuallyPaused.value = true;
  }
  console.debug(`WebSocket processing paused (${reason})`);
};

// Resume WebSocket processing
const resumeWebSocket = () => {
  // Don't resume if we're not on page 1
  if (pagination.value.pageIndex > 0) {
    console.debug('Cannot resume WebSocket on pages > 1');
    return;
  }

  isWebSocketPaused.value = false;
  console.debug('WebSocket processing resumed, processing pending messages:', pendingMessages.value.length);

  // Process any pending messages
  if (pendingMessages.value.length > 0 && !useExternalData.value) {
    // Sort by kill time to maintain chronological order
    pendingMessages.value.sort((a, b) =>
      new Date(b.kill_time).getTime() - new Date(a.kill_time).getTime()
    );

    // Process each pending message
    pendingMessages.value.forEach(killmail => {
      processKillmail(killmail);
    });

    // Clear pending messages
    pendingMessages.value = [];
  }
};

// Toggle WebSocket mode (manually pause/resume)
const toggleWebSocketMode = () => {
  if (!isConnected.value || props.wsDisabled) return;

  if (isWebSocketPaused.value) {
    // Only allow toggling on page 1
    if (pagination.value.pageIndex === 0) {
      manuallyPaused.value = false;
      resumeWebSocket();
    }
  } else {
    pauseWebSocket('manual');
  }
};

// Mouse event handlers
const handleMouseEnter = () => {
  if (pagination.value.pageIndex === 0 && !manuallyPaused.value && !props.wsDisabled) {
    pauseWebSocket('hover');
    clearTimeout(mouseMoveTimer.value);
  }
};

const handleMouseLeave = () => {
  if (pagination.value.pageIndex === 0 && !manuallyPaused.value && !props.wsDisabled) {
    resumeWebSocket();
    clearTimeout(mouseMoveTimer.value);
  }
};

const handleMouseMove = () => {
  if (isWebSocketPaused.value && pagination.value.pageIndex === 0 &&
      !manuallyPaused.value && !props.wsDisabled) {
    clearTimeout(mouseMoveTimer.value);
    mouseMoveTimer.value = setTimeout(() => {
      resumeWebSocket();
    }, 10000); // 10 seconds
  }
};

// Function to process a killmail
const processKillmail = (killmail: IKillmail) => {
  const formattedKill = formatKillmail(killmail);

  // This check is redundant now but keeping for safety
  if (killlistData.value && killlistData.value.length > 0 &&
      new Date(formattedKill.kill_time).getTime() <= new Date(killlistData.value[0].kill_time).getTime()) {
    return;
  }

  if (killlistData.value) {
    killlistData.value = [formattedKill, ...killlistData.value];
    wsNewKillCount.value++;
    ensureKillListLimit();
  }
};

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

// Function to check if a killmail is newer than our current newest
const isNewerThanLatestKill = (killmail: IKillmail): boolean => {
  if (!killlistData.value || killlistData.value.length === 0) return true;

  const killmailTime = new Date(killmail.kill_time).getTime();
  const latestKillTime = new Date(killlistData.value[0].kill_time).getTime();

  return killmailTime > latestKillTime;
};

// Establish WebSocket connection
const connectWebSocket = () => {
  // Don't connect if WebSocket is disabled or we're using external data
  if (props.wsDisabled || useExternalData.value) {
    console.debug('WebSocket disabled by props.wsDisabled or using external data');
    return;
  }

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

        // Always check if this killmail is newer before processing or queuing
        if (!isNewerThanLatestKill(killmail)) {
          console.debug('Ignoring killmail as it\'s older than current newest');
          return;
        }

        // If WebSocket is paused, add to pending messages
        if (isWebSocketPaused.value) {
          pendingMessages.value.push(killmail);
          return;
        }

        processKillmail(killmail);
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
  if (process.client && !props.wsDisabled && !useExternalData.value) {
    connectWebSocket();

    // Add router navigation guards to pause WebSocket on page changes
    router.beforeEach((to, from) => {
      if (to.path !== from.path) {
        pauseWebSocket('navigation');
      }
      return true;
    });
  }
});

onBeforeUnmount(() => {
  closeWebSocket();

  // Clear any timers
  if (mouseMoveTimer.value) {
    clearTimeout(mouseMoveTimer.value);
    mouseMoveTimer.value = null;
  }
});

// Update pagination page size based on props.limit
onMounted(() => {
  pagination.value.pageSize = props.limit;
});

// Watch for changes to the limit prop
watch(() => props.limit, (newLimit) => {
  if (selectedPageSize.value !== newLimit) {
    selectedPageSize.value = newLimit;
    pagination.value.pageSize = newLimit;
  }
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

// Responsive design - clean implementation with device module
const device = useDevice();
const isMobile = ref(device.isMobile);

// Client-side detection for dynamic updates
onMounted(() => {
  if (process.client) {
    // Create media query listener for client-side updates
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    // Update isMobile when media query changes
    const handleMediaQueryChange = (e) => {
      isMobile.value = e.matches;
    };

    // Add listener based on browser support
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaQueryChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleMediaQueryChange);
    }

    // Ensure client-side detection matches the current viewport
    isMobile.value = mediaQuery.matches;

    // Clean up
    onBeforeUnmount(() => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaQueryChange);
      } else {
        mediaQuery.removeListener(handleMediaQueryChange);
      }
    });
  }
});

// Force reactive computation by making columns directly reactive
const columns = computed<TableColumn<IKillList>[]>(() => {
  // Force reactivity by referencing the ref value directly in the computation
  const mobile = isMobile.value;
  console.debug('Computing columns based on mobile status:', mobile);
  return mobile ? columnsMobile : columnsDesktop;
});

// Add a watcher to debug when isMobile changes
watch(isMobile, (newValue) => {
  console.debug('isMobile changed to:', newValue);
});

// Desktop Column definitions
const columnsDesktop: TableColumn<IKillList>[] = [
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
        h(resolveComponent('ClientOnly'), {}, {
          default: () => h('div', { class: 'text-background-500' }, formatDate(row.original.kill_time)),
          fallback: () => h('div', { class: 'text-background-500' }, '—')
        }),
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

// Mobile Column definitions - Simplified for mobile view
const columnsMobile: TableColumn<IKillList>[] = [
  {
    accessorKey: 'mobile-view',
    id: 'mobile-view',
    meta: { width: '100%' },
    cell: ({ row }) => {
      return h('div', {
        class: {
          'flex items-center py-3 w-full': true,
          'bg-darkred': isCombinedLoss(row.original)
        }
      }, [
        // Ship Image
        h(resolveComponent('NuxtImg'), {
          src: `https://images.evetech.net/types/${row.original.victim.ship_id}/render?size=64`,
          loading: 'lazy',
          format: 'webp',
          alt: `Ship: ${getLocalizedString(row.original.victim.ship_name, currentLocale.value)}`,
          class: 'rounded w-16 h-16 mr-2'
        }),

        // Victim Info
        h('div', { class: 'flex flex-col justify-center mr-3 min-w-0 flex-grow' }, [
          // Top Line: Victim Name + ISK Value
          h('div', { class: 'flex justify-between items-center' }, [
            h('span', { class: 'text-sm font-medium truncate mr-1' }, row.original.victim.character_name),
            row.original.total_value > 50
              ? h('span', { class: 'text-background-400 text-xs whitespace-nowrap' }, `${formatIsk(row.original.total_value)} ISK`)
              : null
          ]),

          // Middle Line: Victim Corp
          h('span', { class: 'text-background-400 text-xs truncate' }, row.original.victim.corporation_name),

          // Bottom Line: Attacker Name + Location
          h('div', { class: 'flex justify-between items-center' }, [
            h('span', { class: 'text-background-400 text-xs truncate mr-1' },
              row.original.is_npc ? row.original.finalblow.faction_name : row.original.finalblow.character_name),
            h('div', { class: 'text-background-400 text-xs whitespace-nowrap flex items-center' }, [
              h('span', null, row.original.system_name),
              h('span', null, ' ('),
              h('span', { style: `color: ${getSecurityColor(row.original.system_security)}` },
                row.original.system_security.toFixed(1)),
              h('span', null, ')')
            ])
          ]),

          // Last Line: Time + Attacker Count
          h('div', { class: 'flex justify-between items-center mt-1' }, [
            h(resolveComponent('ClientOnly'), {}, {
              default: () => h('span', { class: 'text-background-500 text-xs' }, formatDate(row.original.kill_time)),
              fallback: () => h('span', { class: 'text-background-500 text-xs' }, '—')
            }),
            h('div', { class: 'flex gap-1 items-center' }, [
              h('span', { class: 'text-background-400 text-xs' }, row.original.attackerCount),
              h('img', {
                src: '/images/involved.png',
                alt: `${row.original.attackerCount} Involved`,
                class: 'h-3'
              }),
            ])
          ])
        ])
      ]);
    }
  }
];

// Update column headers when locale changes
watch(locale, () => {
  columnsDesktop.forEach((column, index) => {
    if (column.id === 'ship') {
      columnsDesktop[index].header = t('killList.ship');
    } else if (column.id === 'victim') {
      columnsDesktop[index].header = t('killList.victim');
    } else if (column.id === 'finalBlow') {
      columnsDesktop[index].header = t('killList.finalBlow');
    } else if (column.id === 'location') {
      columnsDesktop[index].header = t('killList.location');
    } else if (column.id === 'details') {
      columnsDesktop[index].header = () => h('div', { class: 'text-right' }, t('killList.details'));
    }
  });
});
</script>

<template>
  <div class="w-full">
    <div class="flex justify-between items-center mb-3 px-2 py-2 bg-background-800 rounded-md">
      <div class="flex items-center">
        <div
          v-if="!wsDisabled && !useExternalData"
          :class="[
            'w-3 h-3 rounded-full mr-2 cursor-pointer',
            !isConnected ? 'bg-red-500' :
            (isWebSocketPaused ? 'bg-yellow-500' : 'bg-green-500')
          ]"
          :title="isConnected
            ? (isWebSocketPaused
                ? t('killList.wsPaused')
                : t('killList.wsConnected'))
            : t('killList.wsDisconnected')"
          @click="toggleWebSocketMode"
        ></div>

        <span
          v-if="wsNewKillCount > 0 && !wsDisabled && !useExternalData"
          class="ml-2 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full cursor-pointer"
          @click="resetNewKillCount"
        >
          +{{ wsNewKillCount }}
        </span>

        <span
          v-if="isWebSocketPaused && pendingMessages.length > 0 && !wsDisabled && !useExternalData"
          class="ml-2 text-xs text-yellow-400"
        >
          {{ pendingMessages.length }} pending
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

    <!-- Mobile Table - Wrapped with event listeners -->
    <div
      v-if="isMobile"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @mousemove="handleMouseMove"
    >
      <UTable
        v-model:pagination="pagination"
        :data="killlistData || []"
        :columns="columnsMobile"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-document-text', label: t('killList.noKills') }"
        :loading-state="{ icon: 'i-heroicons-arrow-path', label: t('killList.loading') }"
        :ui="{
          base: 'min-w-full table-fixed bg-transparent text-white',
          thead: 'hidden', // Always hide header on mobile
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
    </div>

    <!-- Desktop Table - Wrapped with event listeners -->
    <div
      v-else
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @mousemove="handleMouseMove"
    >
      <UTable
        v-model:pagination="pagination"
        :data="killlistData || []"
        :columns="columnsDesktop"
        :loading="pending"
        :empty-state="{ icon: 'i-heroicons-document-text', label: t('killList.noKills') }"
        :loading-state="{ icon: 'i-heroicons-arrow-path', label: t('killList.loading') }"
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
    </div>

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

/* Desktop column sizes */
@media (min-width: 768px) {
  :deep(th:nth-child(1)), :deep(td:nth-child(1)) { width: 20%; }
  :deep(th:nth-child(2)), :deep(td:nth-child(2)) { width: 25%; }
  :deep(th:nth-child(3)), :deep(td:nth-child(3)) { width: 25%; }
  :deep(th:nth-child(4)), :deep(td:nth-child(4)) { width: 15%; }
  :deep(th:nth-child(5)), :deep(td:nth-child(5)) { width: 15%; }
}

/* Mobile optimizations */
@media (max-width: 767px) {
  :deep(td > div) {
    padding: 0.5rem;
  }

  :deep(.text-sm) {
    font-size: 0.9rem;
  }

  :deep(.text-xs) {
    font-size: 0.75rem;
  }
}

:deep(td > div) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
