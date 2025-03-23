<template>
  <KillNavbar />

  <!-- Wrap entire content in ClientOnly to prevent hydration issues -->
  <ClientOnly>
    <!-- Desktop Layout -->
    <div v-if="!isMobile" class="flex flex-wrap mt-4 gap-4">
      <!-- Left Container -->
      <div class="flex-1 min-w-0 text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
        <!-- Header -->
        <div class="px-4 py-3">
          <div id="information-area" class="flex flex-wrap md:flex-nowrap justify-around">
            <!-- Fitting Wheel - Fixed width container -->
            <div class="w-full flex justify-center items-center">
              <KillFittingWheel :killmail="killmail" />
            </div>

            <!-- Kill Information -->
            <div class="information-box ml-0 md:ml-5 mt-4 md:mt-0 w-full md:w-2/3">
              <KillInformationBox/>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="h-px bg-background-700"></div>

        <!-- Body -->
        <div class="p-4 sm:p-6">
          <KillItems />
        </div>
      </div>

      <!-- Right Container -->
      <div class="w-full md:w-2/5 lg:w-1/3 xl:max-w-md text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
        <UTabs
          v-if="killmail"
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
        <UTabs
          v-if="killmail"
          :items="mobileTabs"
          :ui="tabsUi"
        >
          <!-- Fitting Wheel Tab -->
          <template #fitting="{ item }">
            <div class="p-4 flex justify-center">
              <KillFittingWheel v-if="killmail" :key="killmail.killmail_id" :killmail="killmail" />
            </div>
          </template>

          <!-- Items Tab -->
          <template #items="{ item }">
            <div class="p-4">
              <KillItems v-if="killmail" :killmail="killmail" />
            </div>
          </template>

          <!-- Info Tab -->
          <template #info="{ item }">
            <div class="p-4">
              <KillInformationBox v-if="killmail" :killmail="killmail" />
            </div>
          </template>

          <!-- Attackers Tab -->
          <template #attackers="{ item }">
            <div class="p-4">
              <KillAttackers v-if="killmail" :attackers="killmail.attackers" />
            </div>
          </template>

          <!-- Comments Tab -->
          <template #comments="{ item }">
            <div class="p-4">
              <KillComments :identifier="`kill:${killmail.killmail_id}`" @count="updateCommentCount" />
            </div>
          </template>
        </UTabs>
      </div>
    </div>

    <!-- Fallback content for server-side rendering -->
    <template #fallback>
      <div class="mt-4 bg-background-900 rounded-md overflow-hidden p-4">
        <div class="loading-container flex justify-center items-center" style="height: 300px;">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { IKillmail } from '~/server/interfaces/IKillmail';

const route = useRoute();
const killmail = ref<IKillmail | null>(null);
const sibling = ref<IKillmail | null>(null);
const commentCount = ref(0);

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

// Use top-level composable for killmail data - make it client-side only
const { data: fetchedKillmail } = useAsyncData(
  () => route.params.id ? $fetch(`/api/killmail/${route.params.id[0]}`) : null,
  {
    watch: [() => route.params.id],
    server: false, // Disable server-side rendering for this call
    immediate: true
  }
);

// Watch for changes in the fetched killmail data
watch(fetchedKillmail, async (newData) => {
  if (newData) {
    killmail.value = newData as IKillmail;

    try {
      // Fetch sibling killmail if it exists
      const siblingResponse = await $fetch(`/api/killmail/${route.params.id[0]}/sibling`);

      if (siblingResponse && Array.isArray(siblingResponse) && siblingResponse.length > 0) {
        const siblingData = await $fetch(`/api/killmail/${siblingResponse[0]}`);
        sibling.value = siblingData as IKillmail;
      } else {
        sibling.value = null;
      }
    } catch (error) {
      console.error('Error fetching sibling killmail:', error);
      sibling.value = null;
    }
  }
}, { immediate: true });

// Update comment count from child component
function updateCommentCount(count: number) {
  commentCount.value = count;
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

/* Add loading spinner styles */
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(150, 150, 150, 0.3);
  border-radius: 50%;
  border-top-color: rgba(150, 150, 150, 0.8);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
