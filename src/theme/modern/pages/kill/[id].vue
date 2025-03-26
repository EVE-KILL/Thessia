<template>
  <!-- Desktop Layout -->
  <div v-if="!isMobile" class="flex flex-wrap mt-4 gap-4">
    <KillNavbar :killmail="killmail"/>
    <!-- Left Container -->
    <div class="flex-1 min-w-0 text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
      <!-- Header -->
      <div>
        <div id="information-area" class="flex flex-col md:flex-row justify-around">
          <!-- Fitting Wheel - Increased size container -->
          <div class="w-full flex justify-center items-center">
            <template v-if="!killmail || isLoading">
              <div class="fitting-wheel-skeleton max-w-[650px]">
                <!-- Outer ring skeleton -->
                <div class="skeleton-ring outer-skeleton-ring"></div>
                <!-- Inner ring skeleton -->
                <div class="skeleton-ring inner-skeleton-ring"></div>
                <!-- Ship skeleton -->
                <div class="skeleton-ship">
                  <USkeleton class="h-full w-full rounded-full" />
                </div>
                <!-- Slot indicators -->
                <div class="skeleton-indicator high-indicator" :style="getSkeletonSlotPosition('indicator', 'top')">
                  <USkeleton class="h-4 w-4" />
                </div>
                <div class="skeleton-indicator mid-indicator" :style="getSkeletonSlotPosition('indicator', 'right')">
                  <USkeleton class="h-4 w-4" />
                </div>
                <div class="skeleton-indicator low-indicator" :style="getSkeletonSlotPosition('indicator', 'bottom')">
                  <USkeleton class="h-4 w-4" />
                </div>

                <!-- Slot skeletons for modules -->
                <div v-for="i in 8" :key="`high-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'top')" class="skeleton-slot high-slot">
                  <USkeleton class="h-full w-full rounded-full" />
                </div>
                <div v-for="i in 8" :key="`mid-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'right')" class="skeleton-slot mid-slot">
                  <USkeleton class="h-full w-full rounded-full" />
                </div>
                <div v-for="i in 8" :key="`low-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'bottom')" class="skeleton-slot low-slot">
                  <USkeleton class="h-full w-full rounded-full" />
                </div>
                <div v-for="i in 3" :key="`rig-${i}`" :style="getSkeletonSlotPosition(i-1, 3, 'left')" class="skeleton-slot rig-slot">
                  <USkeleton class="h-full w-full rounded-full" />
                </div>
              </div>
            </template>
            <KillFittingWheel v-else :killmail="killmail" :max-width="1000" style="min-width: 550px"/>
          </div>

          <!-- Kill Information - Adjusted width -->
          <div class="information-box ml-0 md:ml-4 md:mt-0 w-full md:w-3/5 lg:w-1/2 max-w-[325px]">
            <template v-if="!killmail || isLoading">
              <div class="grid gap-4">
                <!-- Ship section skeleton -->
                <div class="section p-3 rounded-lg bg-background-800 bg-opacity-30">
                  <div class="flex items-center gap-3">
                    <USkeleton class="h-16 w-16 rounded-md flex-shrink-0" />
                    <div class="flex flex-col gap-2 flex-grow min-w-0">
                      <USkeleton class="h-6 w-full" />
                      <div class="flex justify-between">
                        <USkeleton class="h-5 w-24" />
                        <div class="flex gap-1">
                          <USkeleton class="h-5 w-12 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Victim section skeleton -->
                <div class="section p-3 rounded-lg bg-background-800 bg-opacity-30">
                  <USkeleton class="h-5 w-24 mb-2" />
                  <div class="flex items-start gap-3 mb-2">
                    <div class="relative">
                      <USkeleton class="h-12 w-12 rounded-full" />
                      <USkeleton class="h-8 w-8 rounded-full absolute bottom-[-4px] right-[-4px]" />
                    </div>
                    <div class="flex flex-col gap-1 flex-grow min-w-0">
                      <USkeleton class="h-5 w-32" />
                      <USkeleton class="h-4 w-28" />
                    </div>
                  </div>
                  <div class="flex items-center gap-1 mb-2">
                    <USkeleton class="h-6 w-6 rounded-full" />
                    <USkeleton class="h-4 w-32" />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex items-center gap-1">
                      <USkeleton class="h-4 w-4" />
                      <USkeleton class="h-4 w-full" />
                    </div>
                    <div class="flex items-center gap-1">
                      <USkeleton class="h-4 w-4" />
                      <USkeleton class="h-4 w-full" />
                    </div>
                  </div>
                </div>

                <!-- Details section skeleton -->
                <div class="section p-3 rounded-lg bg-background-800 bg-opacity-30">
                  <div class="grid gap-3">
                    <div class="flex items-start gap-2">
                      <USkeleton class="h-4 w-4 mt-1 flex-shrink-0" />
                      <div class="flex flex-col gap-1 min-w-0">
                        <USkeleton class="h-5 w-40" />
                        <USkeleton class="h-4 w-32" />
                      </div>
                    </div>
                    <div class="flex items-start gap-2">
                      <USkeleton class="h-4 w-4 mt-1 flex-shrink-0" />
                      <div class="flex flex-col gap-1 min-w-0">
                        <div class="flex items-center gap-1">
                          <USkeleton class="h-5 w-28" />
                          <USkeleton class="h-5 w-8 rounded-md" />
                        </div>
                        <USkeleton class="h-4 w-36" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <KillInformationBox v-else :killmail="killmail"/>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="mt-4">
        <template v-if="!killmail || isLoading">
          <div class="custom-table-skeleton">
            <!-- Table header skeleton -->
            <div class="table-header-skeleton">
              <div class="cell image-cell"></div>
              <div class="cell name-cell">
                <USkeleton class="h-5 w-16" />
              </div>
              <div class="cell quantity-cell">
                <USkeleton class="h-5 w-24" />
              </div>
              <div class="cell value-cell">
                <USkeleton class="h-5 w-16" />
              </div>
            </div>

            <!-- Header row -->
            <div class="table-row-skeleton header-row">
              <div class="cell image-cell"></div>
              <div class="cell name-cell">
                <USkeleton class="h-5 w-32" />
              </div>
              <div class="cell quantity-cell"></div>
              <div class="cell value-cell"></div>
            </div>

            <!-- Ship row -->
            <div class="table-row-skeleton">
              <div class="cell image-cell">
                <USkeleton class="h-8 w-8 rounded-md" />
              </div>
              <div class="cell name-cell">
                <USkeleton class="h-5 w-40" />
              </div>
              <div class="cell quantity-cell">
                <USkeleton class="h-5 w-10 rounded-full" />
              </div>
              <div class="cell value-cell">
                <USkeleton class="h-5 w-24" />
              </div>
            </div>

            <!-- Repeat for other sections -->
            <div v-for="section in 3" :key="`section-${section}`">
              <!-- Section header -->
              <div class="table-row-skeleton header-row mt-2">
                <div class="cell image-cell"></div>
                <div class="cell name-cell">
                  <USkeleton class="h-5 w-36" />
                </div>
                <div class="cell quantity-cell"></div>
                <div class="cell value-cell"></div>
              </div>

              <!-- Item rows -->
              <div v-for="i in 3" :key="`item-${section}-${i}`" class="table-row-skeleton">
                <div class="cell image-cell">
                  <USkeleton class="h-6 w-6 rounded-md" />
                </div>
                <div class="cell name-cell">
                  <USkeleton class="h-5 w-48" />
                </div>
                <div class="cell quantity-cell">
                  <div class="flex gap-2">
                    <USkeleton class="h-5 w-8 rounded-full" />
                    <USkeleton class="h-5 w-8 rounded-full" />
                  </div>
                </div>
                <div class="cell value-cell">
                  <USkeleton class="h-5 w-20" />
                </div>
              </div>

              <!-- Subtotal row -->
              <div class="table-row-skeleton value-row">
                <div class="cell image-cell"></div>
                <div class="cell name-cell">
                  <USkeleton class="h-5 w-20" />
                </div>
                <div class="cell quantity-cell">
                  <div class="flex gap-2">
                    <USkeleton class="h-5 w-8 rounded-full" />
                    <USkeleton class="h-5 w-8 rounded-full" />
                  </div>
                </div>
                <div class="cell value-cell">
                  <USkeleton class="h-5 w-24" />
                </div>
              </div>
            </div>

            <!-- Total row -->
            <div class="table-row-skeleton value-row mt-2">
              <div class="cell image-cell"></div>
              <div class="cell name-cell">
                <USkeleton class="h-5 w-16" />
              </div>
              <div class="cell quantity-cell"></div>
              <div class="cell value-cell">
                <USkeleton class="h-5 w-28" />
              </div>
            </div>
          </div>
        </template>
        <KillItems v-else :killmail="killmail" />
      </div>
    </div>

    <!-- Right Container -->
    <div class="w-full md:w-2/5 lg:w-1/3 xl:max-w-md text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
      <template v-if="!killmail || isLoading">
        <!-- Skeleton tabs -->
        <div class="border-b border-background-700">
          <div class="flex gap-4 p-2">
            <USkeleton class="h-8 w-32" />
            <USkeleton class="h-8 w-32" />
          </div>
        </div>
        <!-- Skeleton content for attackers -->
        <div class="p-4">
          <div class="grid gap-4">
            <div v-for="i in 8" :key="i" class="flex items-center gap-3 p-2 border-b border-background-800">
              <div class="relative">
                <USkeleton class="h-10 w-10 rounded-full" />
                <USkeleton class="h-6 w-6 rounded-full absolute -bottom-1 -right-1" />
              </div>
              <div class="grid gap-1 flex-1 min-w-0">
                <div class="flex justify-between">
                  <USkeleton class="h-5 w-32" />
                  <USkeleton class="h-5 w-16" />
                </div>
                <div class="flex justify-between">
                  <USkeleton class="h-4 w-24" />
                  <USkeleton class="h-4 w-12" />
                </div>
                <div class="flex items-center gap-1">
                  <USkeleton class="h-4 w-4 rounded-full" />
                  <USkeleton class="h-4 w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <UTabs
        v-else
        :items="rightSideTabs"
        :ui="tabsUi"
        v-model="defaultDesktopTabIndex"
      >
        <template #comments="{ item }">
          <KillComments :killId="killmail.killmail_id" />
        </template>

        <template #attackers="{ item }">
          <KillAttackers :killmail="killmail" />
        </template>
      </UTabs>
    </div>
  </div>

  <!-- Mobile Layout -->
  <div v-else class="mt-4">
    <div class="text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
      <template v-if="!killmail || isLoading">
        <!-- Skeleton tabs -->
        <div class="border-b border-background-700">
          <div class="flex gap-2 p-2 overflow-x-auto">
            <USkeleton v-for="i in 5" :key="i" class="h-8 w-20 flex-shrink-0" />
          </div>
        </div>
        <!-- Skeleton content -->
        <div class="p-4">
          <!-- Use enhanced fitting wheel skeleton -->
          <div class="fitting-wheel-skeleton mx-auto mb-4">
            <!-- Outer ring skeleton -->
            <div class="skeleton-ring outer-skeleton-ring"></div>
            <!-- Inner ring skeleton -->
            <div class="skeleton-ring inner-skeleton-ring"></div>
            <!-- Ship skeleton -->
            <div class="skeleton-ship">
              <USkeleton class="h-full w-full rounded-full" />
            </div>
            <!-- Slot indicators -->
            <div class="skeleton-indicator high-indicator" :style="getSkeletonSlotPosition('indicator', 'top')">
              <USkeleton class="h-4 w-4" />
            </div>
            <div class="skeleton-indicator mid-indicator" :style="getSkeletonSlotPosition('indicator', 'right')">
              <USkeleton class="h-4 w-4" />
            </div>
            <div class="skeleton-indicator low-indicator" :style="getSkeletonSlotPosition('indicator', 'bottom')">
              <USkeleton class="h-4 w-4" />
            </div>

            <!-- Slot skeletons for modules -->
            <div v-for="i in 8" :key="`mobile-high-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'top')" class="skeleton-slot high-slot">
              <USkeleton class="h-full w-full rounded-full" />
            </div>
            <div v-for="i in 8" :key="`mobile-mid-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'right')" class="skeleton-slot mid-slot">
              <USkeleton class="h-full w-full rounded-full" />
            </div>
            <div v-for="i in 8" :key="`mobile-low-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'bottom')" class="skeleton-slot low-slot">
              <USkeleton class="h-full w-full rounded-full" />
            </div>
            <div v-for="i in 3" :key="`mobile-rig-${i}`" :style="getSkeletonSlotPosition(i-1, 3, 'left')" class="skeleton-slot rig-slot">
              <USkeleton class="h-full w-full rounded-full" />
            </div>
          </div>
        </div>
      </template>
      <UTabs
        v-else
        :items="mobileTabs"
        :ui="tabsUi"
        :default-index="defaultMobileTabIndex"
      >
        <!-- Fitting Wheel Tab -->
        <template #fitting="{ item }">
          <div class="flex justify-center">
            <KillFittingWheel v-if="killmail" :key="killmail.killmail_id" :killmail="killmail" />
          </div>
        </template>

        <!-- Items Tab -->
        <template #items="{ item }">
          <div class="">
            <KillItems v-if="killmail" :killmail="killmail" />
          </div>
        </template>

        <!-- Info Tab -->
        <template #info="{ item }">
          <div class="">
            <KillInformationBox v-if="killmail" :killmail="killmail" />
          </div>
        </template>

        <!-- Attackers Tab -->
        <template #attackers="{ item }">
          <div class="">
            <KillAttackers v-if="killmail" :attackers="killmail.attackers" />
          </div>
        </template>

        <!-- Comments Tab -->
        <template #comments="{ item }">
          <div class="">
            <KillComments :identifier="`kill:${killmail.killmail_id}`" @count="updateCommentCount" />
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IKillmail } from '~/server/interfaces/IKillmail';

const route = useRoute();
const killmail = ref<IKillmail | null>(null);
const sibling = ref<IKillmail | null>(null);
const commentCount = ref(0);
const isLoading = ref(true);

// Responsive layout
const { isMobile } = useResponsive();

// Common UI configuration for tabs
const tabsUi = {
  list: {
    base: 'mb-0 border-b border-background-700',
    background: 'bg-gray-200 dark:bg-gray-900',
    rounded: '',
    shadow: '',
    padding: 'p-0',
    height: 'h-auto',
    width: 'w-full',
    marker: {
      background: 'dark:bg-primary-500 bg-primary-500',
      rounded: 'rounded-none',
      shadow: ''
    }
  },
  tab: {
    base: 'text-sm inline-flex items-center h-10 px-4 cursor-pointer',
    active: 'text-black dark:text-white font-medium',
    inactive: 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
  },
  panel: {
    base: 'p-0 sm:p-0'
  }
};

// Desktop tabs
const rightSideTabs = computed(() => [
  {
    label: 'Attackers',
    slot: 'attackers',
    icon: 'i-lucide-users',
    trailing: killmail.value?.attackers?.length ? `(${killmail.value.attackers.length})` : undefined
  },
  {
    label: 'Comments',
    slot: 'comments',
    icon: 'i-lucide-message-square',
    trailing: commentCount.value ? `(${commentCount.value})` : undefined
  }
]);

// Mobile tabs
const mobileTabs = computed(() => [
  {
    label: 'Fitting',
    slot: 'fitting',
    icon: 'i-lucide-circle'
  },
  {
    label: 'Items',
    slot: 'items',
    icon: 'i-lucide-package'
  },
  {
    label: 'Info',
    slot: 'info',
    icon: 'i-lucide-info'
  },
  {
    label: 'Attackers',
    slot: 'attackers',
    icon: 'i-lucide-users',
    trailing: killmail.value?.attackers?.length ? `(${killmail.value.attackers.length})` : undefined
  },
  {
    label: 'Comments',
    slot: 'comments',
    icon: 'i-lucide-message-square',
    trailing: commentCount.value ? `(${commentCount.value})` : undefined
  }
]);

// Fetch killmail data with useFetch instead of useAsyncData
const { data: fetchedKillmail, pending } = useFetch<IKillmail>(
  () => route.params.id ? `/api/killmail/${route.params.id}` : null,
  {
    key: `killmail-${route.params.id?.[0] || 'none'}`, // Fixed: Use function returning string instead of computed
    watch: [() => route.params.id],
    immediate: true
  }
);

// Track loading state
watch(pending, (newPending) => {
  isLoading.value = newPending;
});

// Watch for changes in the fetched killmail data
watch(fetchedKillmail, async (newData: IKillmail) => {
  if (newData) {
    // SEO
    useSeoMeta({
        title: newData.killmail_id + ' | ' + newData.victim.character_name + ' | ' + newData.victim.ship_name.en + ' | ' + newData.system_name,
        ogImage: 'https://images.evetech.net/types/' + newData.victim.ship_id + '/render?size=512',
        ogTitle: newData.killmail_id + ' | ' + newData.victim.character_name + ' | ' + newData.victim.ship_name.en + ' | ' + newData.system_name,
        ogDescription: `${newData.victim.character_name} lost ${newData.victim.ship_name.en} in ${newData.system_name} to ${newData.attackers[newData.attackers.length - 1].character_name} in ${newData.attackers[newData.attackers.length - 1].ship_name.en} - ${formatIsk(newData.total_value)}`,
        ogType: 'website',
        ogSiteName: 'EVE-KILL',
        ogUrl: 'https://eve-kill.com/kill/' + newData.killmail_id,
        ogLocale: 'en_US',
        twitterCard: 'summary_large_image',
        twitterSite: '@eve_kill',
        twitterTitle: newData.killmail_id + ' | ' + newData.victim.character_name + ' | ' + newData.victim.ship_name.en + ' | ' + newData.system_name,
        twitterDescription: `${newData.victim.character_name} lost ${newData.victim.ship_name.en} in ${newData.system_name} to ${newData.attackers[newData.attackers.length - 1].character_name} in ${newData.attackers[newData.attackers.length - 1].ship_name.en} - ${formatIsk(newData.total_value)}`,
        twitterImage: 'https://images.evetech.net/types/' + newData.victim.ship_id + '/render?size=512',
        twitterImageAlt: newData.victim.ship_name.en,
        twitterImageWidth: '512',
        twitterImageHeight: '512',
        twitterCreator: '@eve_kill',
    })
    killmail.value = newData;

    try {
      // Fetch sibling killmail if it exists using useFetch
      const { data: siblingResponse } = await useFetch<string[]>(
        `/api/killmail/${route.params.id[0]}/sibling`,
        {
          key: `killmail-sibling-${route.params.id[0]}` // Added explicit key
        }
      );

      if (siblingResponse.value && Array.isArray(siblingResponse.value) && siblingResponse.value.length > 0) {
        const { data: siblingData } = await useFetch<IKillmail>(
          `/api/killmail/${siblingResponse.value[0]}`,
          {
            key: `killmail-sibling-data-${siblingResponse.value[0]}` // Added explicit key
          }
        );
        sibling.value = siblingData.value || null;
      } else {
        sibling.value = null;
      }
    } catch (error) {
      console.error('Error fetching sibling killmail:', error);
      sibling.value = null;
    } finally {
      isLoading.value = false;
    }
  }
}, { immediate: true });

// Update comment count from child component
function updateCommentCount(count: number) {
  commentCount.value = count;
}

/**
 * Calculates the position for skeleton slots
 */
function getSkeletonSlotPosition(index: number, position: string): Record<string, string> {
  // Use the same radius as the actual component for consistency
  const radius = 42;
  let angle = 0;

  if (position === 'indicator') {
    switch (index) {
      case 'top':
        angle = -125 - 9;
        break;
      case 'right':
        angle = -35 - 10;
        break;
      case 'bottom':
        angle = 90 - 35 - 10;
        break;
      default:
        angle = 0;
    }
  } else {
    switch (position) {
      case 'top':
        angle = -125 + (index * 10.5);
        break;
      case 'right':
        angle = 0 - 37 + (index * 10.5);
        break;
      case 'bottom':
        angle = 90 - 36 + (index * 10.5);
        break;
      case 'left':
        angle = 218 - 22 + (index * 10.5);
        break;
      default:
        angle = 0;
    }
  }

  const rad = angle * (Math.PI / 180);
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  };
}

// Default tab selections
const defaultDesktopTabIndex = ref('0'); // First tab (Attackers)
const defaultMobileTabIndex = ref('0');  // First tab (Fitting)

// Handle comment fragment navigation
function handleCommentFragment() {
  if (import.meta.client) {
    const fragment = window.location.hash;
    if (fragment && fragment.startsWith('#comment-')) {
      // If we have a comment fragment, switch to the comments tab
      if (isMobile.value) {
        // Comments is the 5th tab (index 4) on mobile
        defaultMobileTabIndex.value = '4';
      } else {
        // Comments is the 2nd tab (index 1) on desktop
        defaultDesktopTabIndex.value = '1';
      }
    }
  }
}

// Update UTabs to use the defaultIndex
watch(() => killmail.value, () => {
  if (killmail.value && import.meta.client) {
    nextTick(() => {
      handleCommentFragment();
    });
  }
}, { immediate: true });

// Listen for hash changes to update tab selection when fragments change
onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('hashchange', handleCommentFragment);
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('hashchange', handleCommentFragment);
  }
});
</script>

<style scoped>
@media (min-width: 768px) {
  .information-box {
    flex: 1;
    flex-basis: 70%;
  }
}

:deep(tbody tr) {
  border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
  border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
  background: light-dark(#e5e7eb, #1a1a1a);
}

/* Fix tab overflow scrolling on mobile */
:deep(.u-tabs-list) {
  overflow-x: auto;
  flex-wrap: nowrap;
  -webkit-overflow-scrolling: touch;
}

/* Consistent font sizes with KillList */
:deep(.text-sm) {
  font-size: 1rem;
  line-height: 1rem;
}

:deep(.text-xs) {
  font-size: 0.8rem;
  line-height: 1rem;
}

/* Mobile specific styles */
@media (max-width: 767px) {
  :deep(.u-tabs-list) {
    justify-content: flex-start;
  }
  :deep(.u-tab-item) {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}

/* Simplified fitting wheel skeleton styles */
.fitting-wheel-skeleton {
  position: relative;
  width: 100%;
  max-width: 600px; /* Increased from 500px */
  height: 0;
  padding-bottom: 100%; /* Maintain 1:1 aspect ratio */
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  background-color: rgba(128, 128, 128, 0.1);
}

.skeleton-ring {
  position: absolute;
  border-radius: 50%;
  background-color: transparent;
}

.outer-skeleton-ring {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 8px solid rgba(128, 128, 128, 0.2);
}

.inner-skeleton-ring {
  top: 15%;
  left: 15%;
  width: 70%;
  height: 70%;
  border: 6px solid rgba(128, 128, 128, 0.15);
}

.skeleton-ship {
  position: absolute;
  top: 20%;
  left: 20%;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  overflow: hidden;
  background-color: rgba(128, 128, 128, 0.1);
}

.skeleton-slot {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: transparent;
}

.skeleton-slot.high-slot {
  border: 1px solid rgba(180, 60, 60, 0.2);
}

.skeleton-slot.mid-slot {
  border: 1px solid rgba(60, 120, 180, 0.2);
}

.skeleton-slot.low-slot {
  border: 1px solid rgba(180, 140, 60, 0.2);
}

.skeleton-slot.rig-slot {
  border: 1px solid rgba(150, 150, 150, 0.2);
}

.skeleton-indicator {
  position: absolute;
  width: 18px;
  height: 18px;
  z-index: 6;
  transform-origin: center;
}

/* Custom table skeleton styles */
.custom-table-skeleton {
  width: 100%;
}

.table-header-skeleton {
  display: grid;
  grid-template-columns: 80px 1fr 120px 120px;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgb(40, 40, 40);
  background-color: rgba(26, 26, 26, 0.5);
}

.table-row-skeleton {
  display: grid;
  grid-template-columns: 80px 1fr 120px 120px;
  padding: 0.4rem 1rem;
  border-bottom: 1px solid rgb(40, 40, 40);
  align-items: center;
}

.table-row-skeleton.header-row {
  background-color: rgba(26, 26, 26, 0.7);
  padding: 0.3rem 1rem;
  height: 2rem;
}

.table-row-skeleton.value-row {
  background-color: rgba(40, 40, 40, 0.3);
  font-weight: 600;
}

.cell.value-cell {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* Responsive adjustments */
@media (max-width: 500px) {
  .skeleton-slot {
    width: 24px;
    height: 24px;
  }
}

@media (max-width: 768px) {
  .fitting-wheel-skeleton {
    max-width: 400px; /* Increased from 300px */
  }
}
</style>
