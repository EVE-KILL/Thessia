<template>
  <div v-if="fittings && fittings.length > 0" class="w-full p-4 rounded bg-background-800 bg-opacity-75">
    <h2 class="text-xl font-bold mb-4">{{ $t('items.topFittings') }}</h2>

    <!-- Loading state -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="p-4 rounded-md">
        <USkeleton class="w-full h-60" />
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-4 text-red-500">
      {{ $t('common.errorLoading') }}
    </div>

    <!-- Data loaded state -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="fitting in fittings"
        :key="fitting.killmail_id"
        class="hover:bg-background-700 transition-colors duration-300 rounded-md"
      >
        <a
          :href="generateEveShipFitUrl(fitting.killmail_id, fitting.killmail_hash)"
          target="_blank"
          rel="noopener noreferrer"
          class="block"
        >
          <div v-html="fitting.svg" class="w-full fitting-svg"></div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Interface for fitting data
interface Fitting {
  killmail_id: number;
  killmail_hash: string;
  svg: string;
}

// State
const fittings = ref<Fitting[]>([]);
const isLoading = ref(true);
const error = ref(null);

// Fetch fittings data when item is available
const { data, pending, error: fetchError } = await useAsyncData(
  `item-fittings-${props.item?.type_id}`,
  async () => {
    if (!props.item?.type_id) return [];

    try {
      return await $fetch<Fitting[]>(`/api/fitting/${props.item.type_id}?limit=10`);
    } catch (err) {
      error.value = err;
      return [];
    }
  },
  {
    watch: [() => props.item?.type_id],
    server: false,
  }
);

// Set error from fetch error
watch(fetchError, (newError) => {
  if (newError) {
    error.value = newError;
  }
});

// Update loading state whenever props.loading or pending changes
watch([() => props.loading, pending], ([propsLoading, asyncPending]) => {
  isLoading.value = propsLoading || asyncPending;
});

// Update fittings when data changes
watch(data, (newData) => {
  if (newData) {
    fittings.value = newData;
    isLoading.value = false;
  }
}, { immediate: true });

// Generate eveship.fit URL
function generateEveShipFitUrl(killmailId: number, killmailHash: string): string {
  return `https://eveship.fit/?fit=killmail:${killmailId}/${killmailHash}`;
}
</script>

<style scoped>
.fitting-svg :deep(svg) {
  width: 100%;
  height: 100%;
  max-height: 250px;
}
</style>
