<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import type { TableColumn } from '~/components/common/Table.vue';
import Table from '~/components/common/Table.vue';
import { useResponsive } from '~/composables/useResponsive';

const { t } = useI18n();
const route = useRoute();
const id = route.params.id as string;

const { data, pending, error } = await useFetch(`/api/tools/dscan/${id}`, {
    key: `dscan-${id}`,
});

// Sort ships by count (descending)
const sortedShips = computed(() => {
    if (!data.value?.ships) return [];

    return Object.entries(data.value.ships)
        .sort((a, b) => b[1] - a[1])
        .map(([ship, count]) => ({ ship, count }));
});

const { isMobile } = useResponsive();

// Simplified table columns - we'll use custom cell templates
const tableColumns = computed((): TableColumn[] => [
    { id: 'ship', header: t('tools.dscan.ship_type'), width: '70%' },
    { id: 'count', header: t('tools.dscan.count'), width: '30%', cellClass: 'count-cell', headerClass: 'text-right' },
]);

const numberOfDisplayColumns = computed(() => {
    if (isMobile.value || sortedShips.value.length <= 15) {
        return 1;
    }
    return 3;
});

const chunkedDisplayShips = computed(() => {
    const ships = sortedShips.value;
    const numCols = numberOfDisplayColumns.value;

    if (numCols === 1 || ships.length === 0) {
        return [ships];
    }

    const result = Array.from({ length: numCols }, () => []);
    const baseChunkSize = Math.floor(ships.length / numCols);
    let remainder = ships.length % numCols;
    let currentIndex = 0;

    for (let i = 0; i < numCols; i++) {
        const chunkSize = baseChunkSize + (remainder > 0 ? 1 : 0);
        result[i] = ships.slice(currentIndex, currentIndex + chunkSize);
        currentIndex += chunkSize;
        if (remainder > 0) {
            remainder--;
        }
    }
    return result.filter(chunk => chunk.length > 0); // Ensure no empty chunks if logic is off
});

console.log('DScan Result:', data.value);

useSeoMeta({
    title: () => t('tools.dscan.result_title'),
    description: () => t('tools.dscan.result_description'),
});
</script>

<template>
    <div>
        <UContainer>
            <div class="my-6 space-y-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">{{ t('tools.dscan.result_title') }}</h1>
                    <UButton to="/tools/dscan" icon="i-heroicons-arrow-left-20-solid" variant="outline">
                        {{ t('general.back') }}
                    </UButton>
                </div>

                <!-- Loading State -->
                <div v-if="pending" class="bg-background-800 p-4 rounded-lg shadow-lg">
                    <div class="flex justify-center p-8">
                        <UIcon name="loader" class="animate-spin h-8 w-8" />
                    </div>
                </div>

                <!-- Error State -->
                <div v-else-if="error" class="bg-background-800 p-4 rounded-lg shadow-lg">
                    <div class="p-4">
                        <UAlert color="error" icon="i-heroicons-exclamation-triangle"
                            :title="t('tools.dscan.error_loading')" />
                    </div>
                </div>

                <!-- Data Display State -->
                <div v-else-if="data && sortedShips.length > 0"
                    class="bg-background-800 rounded-lg shadow-lg overflow-hidden">

                    <!-- Summary Stats Bar -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold">
                                {{ t('tools.dscan.ships_breakdown') }}
                            </h2>
                            <UBadge color="primary" size="lg" class="text-sm font-medium">
                                {{ t('tools.dscan.total_ships', { count: sortedShips.length }) }}
                            </UBadge>
                        </div>
                    </div>

                    <div class="p-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div v-for="(shipChunk, index) in chunkedDisplayShips" :key="index"
                                class="w-full bg-background-700 rounded-lg p-2">
                                <Table :columns="tableColumns" :items="shipChunk" :loading="pending && index === 0"
                                    :empty-text="t('tools.dscan.no_data_in_column')"
                                    :show-header="index === 0 || !isMobile" class="w-full dscan-table">
                                    <!-- Custom template for ship column -->
                                    <template #cell-ship="{ item }">
                                        <div class="ship-cell">
                                            {{ item.ship }}
                                        </div>
                                    </template>

                                    <!-- Custom template for count column with explicit right alignment -->
                                    <template #cell-count="{ item }">
                                        <div class="count-value">
                                            {{ item.count }}
                                        </div>
                                    </template>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Data State -->
                <div v-else class="bg-background-800 p-4 rounded-lg shadow-lg">
                    <div class="p-4">
                        <UAlert icon="i-heroicons-information-circle" :title="t('tools.dscan.no_data')" />
                    </div>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<style scoped>
/* Light/dark mode utility function */
@media (prefers-color-scheme: dark) {
    [style*="light-dark"] {
        --tw-light-dark: var(--tw-dark);
    }
}

@media (prefers-color-scheme: light) {
    [style*="light-dark"] {
        --tw-light-dark: var(--tw-light);
    }
}

/* Table styling to fix alignment issues */
:deep(.dscan-table) {
    width: 100%;
    table-layout: fixed;
}

:deep(.dscan-table th) {
    padding: 0.5rem 0.75rem;
}

:deep(.dscan-table th:last-child) {
    text-align: right;
}

:deep(.ship-cell) {
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

:deep(.count-value) {
    text-align: right;
    width: 100%;
    display: block;
    white-space: nowrap;
}

/* Ensure the count cell aligns right properly */
:deep(th:nth-child(2)),
:deep(td:nth-child(2)) {
    width: 30%;
    text-align: right;
}
</style>
