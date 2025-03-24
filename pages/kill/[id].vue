<template>
  <KillNavbar />

  <!-- Desktop Layout -->
  <div v-if="!isMobile" class="flex flex-wrap mt-4 gap-4">
    <!-- Left Container -->
    <div class="flex-1 min-w-0 text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
      <!-- Header -->
      <div>
        <div id="information-area" class="flex flex-col md:flex-row justify-around">
          <!-- Fitting Wheel - Increased size container -->
          <div class="w-full flex justify-center items-center">
            <template v-if="!killmail || isLoading">
              <div class="fitting-wheel-skeleton max-w-[600px]">
                <!-- Outer ring skeleton -->
                <div class="skeleton-ring outer-skeleton-ring"></div>
                <!-- Inner ring skeleton -->
                <div class="skeleton-ring inner-skeleton-ring"></div>
                <!-- Ship skeleton -->
                <div class="skeleton-ship">
                  <USkeleton class="h-full w-full rounded-full" />
                </div>
                <!-- Slot skeletons for modules -->
                <div v-for="i in 8" :key="`high-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'top')" class="skeleton-slot"></div>
                <div v-for="i in 8" :key="`mid-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'right')" class="skeleton-slot"></div>
                <div v-for="i in 8" :key="`low-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'bottom')" class="skeleton-slot"></div>
                <div v-for="i in 3" :key="`rig-${i}`" :style="getSkeletonSlotPosition(i-1, 3, 'left')" class="skeleton-slot"></div>
              </div>
            </template>
            <KillFittingWheel v-else :killmail="killmail" :max-width="1000" style="min-width: 500px"/>
          </div>

          <!-- Kill Information - Adjusted width -->
          <div class="information-box ml-0 md:ml-5 mt-4 md:mt-0 w-full md:w-3/5 lg:w-1/2 p-4">
            <template v-if="!killmail || isLoading">
              <div class="grid gap-4">
                <USkeleton class="h-8 w-full" />
                <div class="grid grid-cols-2 gap-4">
                  <USkeleton v-for="i in 6" :key="i" class="h-6" />
                </div>
                <USkeleton class="h-12 w-full" />
                <div class="grid grid-cols-2 gap-2">
                  <USkeleton v-for="i in 4" :key="i" class="h-6" />
                </div>
              </div>
            </template>
            <KillInformationBox v-else />
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px bg-background-700"></div>

      <!-- Body -->
      <div class="p-4 sm:p-6">
        <template v-if="!killmail || isLoading">
          <div class="grid gap-4">
            <div class="flex items-center justify-between">
              <USkeleton class="h-6 w-48" />
              <USkeleton class="h-6 w-24" />
            </div>
            <div class="grid gap-2">
              <div v-for="i in 8" :key="i" class="flex items-center gap-4 p-2">
                <USkeleton class="h-10 w-10 rounded-md" />
                <USkeleton class="h-5 w-48" />
                <USkeleton class="h-5 w-24 ml-auto" />
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
            <USkeleton v-for="i in 2" :key="i" class="h-8 w-24" />
          </div>
        </div>
        <!-- Skeleton content -->
        <div class="p-4">
          <div class="grid gap-4">
            <div v-for="i in 5" :key="i" class="flex items-center gap-4">
              <USkeleton class="h-10 w-10 rounded-full" />
              <div class="grid gap-1 flex-1">
                <USkeleton class="h-5 w-32" />
                <USkeleton class="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>
      </template>
      <UTabs
        v-else
        :items="rightSideTabs"
        :ui="tabsUi"
      >
        <template #comments="{ item }">
          <KillComments />
        </template>

        <template #attackers="{ item }">
          <KillAttackers />
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
          <!-- Use the same fitting wheel skeleton -->
          <div class="fitting-wheel-skeleton mx-auto mb-4">
            <!-- Outer ring skeleton -->
            <div class="skeleton-ring outer-skeleton-ring"></div>
            <!-- Inner ring skeleton -->
            <div class="skeleton-ring inner-skeleton-ring"></div>
            <!-- Ship skeleton -->
            <div class="skeleton-ship">
              <USkeleton class="h-full w-full rounded-full" />
            </div>
            <!-- Slot skeletons for modules -->
            <div v-for="i in 8" :key="`high-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'top')" class="skeleton-slot"></div>
            <div v-for="i in 8" :key="`mid-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'right')" class="skeleton-slot"></div>
            <div v-for="i in 8" :key="`low-${i}`" :style="getSkeletonSlotPosition(i-1, 8, 'bottom')" class="skeleton-slot"></div>
            <div v-for="i in 3" :key="`rig-${i}`" :style="getSkeletonSlotPosition(i-1, 3, 'left')" class="skeleton-slot"></div>
          </div>
        </div>
      </template>
      <UTabs
        v-else
        :items="mobileTabs"
        :ui="tabsUi"
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
    label: 'Comments',
    slot: 'comments',
    icon: 'i-lucide-message-square',
    trailing: commentCount.value ? `(${commentCount.value})` : undefined
  },
  {
    label: 'Attackers',
    slot: 'attackers',
    icon: 'i-lucide-users',
    trailing: killmail.value?.attackers?.length ? `(${killmail.value.attackers.length})` : undefined
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
watch(fetchedKillmail, async (newData) => {
  if (newData) {
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
function getSkeletonSlotPosition(index: number, total: number, position: string): Record<string, string> {
  // Use the same radius as the actual component for consistency
  const radius = 42;
  let angle = 0;

  switch (position) {
    case 'top':
      angle = -125 + (index * 10);
      break;
    case 'right':
      angle = 0 - 35 + (index * 10);
      break;
    case 'bottom':
      angle = 90 - 35 + (index * 10);
      break;
    case 'left':
      angle = 218 - 20 + (index * 10);
      break;
    default:
      angle = 0;
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

/* Skeleton rings */
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

/* Ship skeleton */
.skeleton-ship {
  position: absolute;
  top: 20%;
  left: 20%;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  overflow: hidden;
}

/* Module slot skeletons */
.skeleton-slot {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: rgba(128, 128, 128, 0.2);
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
